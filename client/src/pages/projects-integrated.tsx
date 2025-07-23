/**
 * Integrated Projects Page
 * 
 * This is the new projects page that uses the imported components but works with the existing data system.
 * It serves as a parallel implementation to the existing projects page, allowing for easy testing and comparison.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Filter,
  SortDesc
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCelebration, CelebrationToast } from "@/components/celebration-toast";
import { hasPermission, PERMISSIONS } from "@shared/auth-utils";

// Import our compatibility hooks and components
import { useProjects, useProjectMutations } from '@/hooks/useProjectsCompat';
import { ProjectCard } from '@/components/projects/integrated/ProjectCard';
import { ProjectAssigneeSelector } from '@/components/projects/integrated/ProjectAssigneeSelector';
import type { Project, InsertProject } from "@shared/schema";
import { projectAdapters } from '@/lib/project-adapters';

export default function ProjectsIntegrated() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { celebration, triggerCelebration, hideCelebration } = useCelebration();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [newProject, setNewProject] = useState<Partial<InsertProject>>({
    title: '',
    description: '',
    status: 'available',
    priority: 'medium',
    category: 'general',
    assigneeName: '',
    dueDate: '',
    startDate: '',
    estimatedHours: 0,
    actualHours: 0,
    budget: ''
  });

  // Use our compatibility hooks
  const { data: projects = [], isLoading } = useProjects();
  const { create: createProject, update: updateProject, remove: deleteProject } = useProjectMutations();

  // Handle project creation
  const handleCreateProject = async () => {
    if (!newProject.title) {
      toast({ 
        title: "Missing information", 
        description: "Project title is required.",
        variant: "destructive" 
      });
      return;
    }

    try {
      await createProject.mutateAsync(newProject);
      
      toast({ 
        title: "Success", 
        description: "Project created successfully." 
      });
      
      // Reset form and close dialog
      setNewProject({
        title: '',
        description: '',
        status: 'available',
        priority: 'medium',
        category: 'general',
        assigneeName: '',
        dueDate: '',
        startDate: '',
        estimatedHours: 0,
        actualHours: 0,
        budget: ''
      });
      setShowCreateDialog(false);
      
      // Show celebration for new project
      triggerCelebration('project-created');
    } catch (error) {
      console.error("Error creating project:", error);
      toast({ 
        title: "Error", 
        description: "Failed to create project. Please try again.",
        variant: "destructive" 
      });
    }
  };

  // Handle project update
  const handleUpdateProject = async () => {
    if (!editingProject || !editingProject.id) return;
    
    try {
      await updateProject.mutateAsync({
        id: editingProject.id,
        ...editingProject
      });
      
      toast({ 
        title: "Success", 
        description: "Project updated successfully." 
      });
      
      // Close dialog
      setEditingProject(null);
      setShowEditDialog(false);
    } catch (error) {
      console.error("Error updating project:", error);
      toast({ 
        title: "Error", 
        description: "Failed to update project. Please try again.",
        variant: "destructive" 
      });
    }
  };

  // Handle project deletion
  const handleDeleteProject = async (id: number) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    try {
      await deleteProject.mutateAsync({ 
        id,
        userId: user?.id
      });
      
      toast({ 
        title: "Success", 
        description: "Project deleted successfully." 
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({ 
        title: "Error", 
        description: "Failed to delete project. Please try again.",
        variant: "destructive" 
      });
    }
  };

  // Filter projects based on active tab
  const filteredProjects = projects.filter(project => {
    if (activeTab === "active") {
      return project.status !== "completed" && project.status !== "cancelled";
    } else if (activeTab === "completed") {
      return project.status === "completed";
    } else if (activeTab === "all") {
      return true;
    }
    return false;
  });

  // Check if user can create projects
  const canCreateProjects = hasPermission(user, PERMISSIONS.PROJECTS.CREATE);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your organization's projects and tasks.
          </p>
        </div>
        
        {canCreateProjects && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        )}
      </div>
      
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        
        {Object.entries({
          active: { title: "Active Projects", description: "Currently active and in-progress projects" },
          completed: { title: "Completed Projects", description: "Successfully completed projects" },
          all: { title: "All Projects", description: "View all projects in the system" }
        }).map(([tab, { title, description }]) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading projects...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No projects found</CardTitle>
                  <CardDescription>
                    {tab === "active" ? "No active projects found." : 
                     tab === "completed" ? "No completed projects found." : 
                     "No projects found in the system."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {canCreateProjects && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Create a new project
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => setLocation(`/projects/${project.id}`)}
                  >
                    <ProjectCard
                      project={project}
                      onEdit={(p) => {
                        setEditingProject(p);
                        setShowEditDialog(true);
                      }}
                      onDelete={handleDeleteProject}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create a new project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                placeholder="Project title"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProject.description || ''}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Project description"
                className="min-h-[100px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newProject.status}
                  onValueChange={(value) => setNewProject({ ...newProject, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newProject.priority}
                  onValueChange={(value) => setNewProject({ ...newProject, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newProject.category}
                onValueChange={(value) => setNewProject({ ...newProject, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="grants">Grants</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>Assign To</Label>
              <ProjectAssigneeSelector
                value={newProject.assigneeName || ''}
                onChange={(value) => setNewProject({ ...newProject, assigneeName: value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newProject.dueDate || ''}
                  onChange={(e) => setNewProject({ ...newProject, dueDate: e.target.value })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newProject.startDate || ''}
                  onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Project Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          
          {editingProject && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingProject.title}
                  onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                  placeholder="Project title"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingProject.description || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  placeholder="Project description"
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editingProject.status}
                    onValueChange={(value) => setEditingProject({ ...editingProject, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={editingProject.priority}
                    onValueChange={(value) => setEditingProject({ ...editingProject, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editingProject.category}
                  onValueChange={(value) => setEditingProject({ ...editingProject, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="grants">Grants</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label>Assign To</Label>
                <ProjectAssigneeSelector
                  value={editingProject.assigneeName || ''}
                  onChange={(value) => setEditingProject({ ...editingProject, assigneeName: value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-dueDate">Due Date</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={editingProject.dueDate || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, dueDate: e.target.value })}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-startDate">Start Date</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={editingProject.startDate || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProject} disabled={updateProject.isPending}>
              {updateProject.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Celebration Toast */}
      <CelebrationToast
        isVisible={celebration !== null}
        onClose={hideCelebration}
        type={celebration || 'project-created'}
      />
    </div>
  );
}
