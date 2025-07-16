import { Router } from "express";
import { db } from "../db";
import { projects, projectAssignments, users, projectTasks } from "@shared/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

const router = Router();

// Get all projects with assignments in a single query
router.get("/projects-v2", async (req, res) => {
  try {
    // Direct database query for projects with assignments
    const projectsWithAssignments = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        status: projects.status,
        priority: projects.priority,
        dueDate: projects.dueDate,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        assignments: db
          .select({
            userId: projectAssignments.userId,
            role: projectAssignments.role,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(projectAssignments)
          .leftJoin(users, eq(projectAssignments.userId, users.id))
          .where(
            and(
              eq(projectAssignments.projectId, projects.id),
              isNull(projectAssignments.deletedAt)
            )
          )
          .as("assignments"),
      })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .orderBy(desc(projects.createdAt));

    res.json(projectsWithAssignments);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// Get single project with all details
router.get("/projects-v2/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    // Get project
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);
      
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Get assignments
    const assignments = await db
      .select({
        id: projectAssignments.id,
        userId: projectAssignments.userId,
        role: projectAssignments.role,
        assignedAt: projectAssignments.assignedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          displayName: users.displayName,
        },
      })
      .from(projectAssignments)
      .leftJoin(users, eq(projectAssignments.userId, users.id))
      .where(
        and(
          eq(projectAssignments.projectId, projectId),
          isNull(projectAssignments.deletedAt)
        )
      );
    
    // Get tasks count
    const [taskStats] = await db
      .select({
        total: db.raw("COUNT(*)::int"),
        completed: db.raw("COUNT(CASE WHEN status = 'done' THEN 1 END)::int"),
      })
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.projectId, projectId),
          isNull(projectTasks.deletedAt)
        )
      );
    
    res.json({
      ...project,
      assignments,
      taskStats: taskStats || { total: 0, completed: 0 },
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// Create project
router.post("/projects-v2", async (req, res) => {
  try {
    const { assignedUserIds, ...projectData } = req.body;
    
    // Create project
    const [newProject] = await db
      .insert(projects)
      .values(projectData)
      .returning();
    
    // Add assignments if provided
    if (assignedUserIds && assignedUserIds.length > 0) {
      await db.insert(projectAssignments).values(
        assignedUserIds.map((userId: string) => ({
          projectId: newProject.id,
          userId,
          role: "member",
        }))
      );
    }
    
    // Return project with assignments
    const projectWithAssignments = await db
      .select({
        ...projects,
        assignments: db
          .select({
            userId: projectAssignments.userId,
            role: projectAssignments.role,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(projectAssignments)
          .leftJoin(users, eq(projectAssignments.userId, users.id))
          .where(eq(projectAssignments.projectId, newProject.id))
          .as("assignments"),
      })
      .from(projects)
      .where(eq(projects.id, newProject.id))
      .limit(1);
    
    res.json(projectWithAssignments[0]);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// Update project
router.patch("/projects-v2/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { assignedUserIds, ...updates } = req.body;
    
    // Update project
    const [updatedProject] = await db
      .update(projects)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .returning();
    
    if (!updatedProject) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Update assignments if provided
    if (assignedUserIds !== undefined) {
      // Remove old assignments
      await db
        .update(projectAssignments)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(projectAssignments.projectId, projectId),
            isNull(projectAssignments.deletedAt)
          )
        );
      
      // Add new assignments
      if (assignedUserIds.length > 0) {
        await db.insert(projectAssignments).values(
          assignedUserIds.map((userId: string) => ({
            projectId,
            userId,
            role: "member",
          }))
        );
      }
    }
    
    // Return updated project with assignments
    const result = await db
      .select({
        ...projects,
        assignments: db
          .select({
            userId: projectAssignments.userId,
            role: projectAssignments.role,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(projectAssignments)
          .leftJoin(users, eq(projectAssignments.userId, users.id))
          .where(
            and(
              eq(projectAssignments.projectId, projectId),
              isNull(projectAssignments.deletedAt)
            )
          )
          .as("assignments"),
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// Delete project
router.delete("/projects-v2/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    // Soft delete project
    const [deleted] = await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Also soft delete assignments
    await db
      .update(projectAssignments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(projectAssignments.projectId, projectId),
          isNull(projectAssignments.deletedAt)
        )
      );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// Add user to project
router.post("/projects-v2/:id/assignments", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { userId, role = "member" } = req.body;
    
    // Check if assignment already exists
    const existing = await db
      .select()
      .from(projectAssignments)
      .where(
        and(
          eq(projectAssignments.projectId, projectId),
          eq(projectAssignments.userId, userId),
          isNull(projectAssignments.deletedAt)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      return res.status(409).json({ error: "User already assigned to project" });
    }
    
    // Create assignment
    const [assignment] = await db
      .insert(projectAssignments)
      .values({ projectId, userId, role })
      .returning();
    
    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    res.json({
      ...assignment,
      user,
    });
  } catch (error) {
    console.error("Error adding assignment:", error);
    res.status(500).json({ error: "Failed to add assignment" });
  }
});

// Remove user from project
router.delete("/projects-v2/:id/assignments/:userId", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { userId } = req.params;
    
    const [removed] = await db
      .update(projectAssignments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(projectAssignments.projectId, projectId),
          eq(projectAssignments.userId, userId),
          isNull(projectAssignments.deletedAt)
        )
      )
      .returning();
    
    if (!removed) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing assignment:", error);
    res.status(500).json({ error: "Failed to remove assignment" });
  }
});

export default router;