import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Users, CheckSquare, Calendar, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Project {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectWithDetails extends Project {
  assignments: Array<{
    user_id: string;
    user: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
    };
  }>;
  task_stats: {
    total: number;
    completed: number;
    total_assignments: number;
    completed_assignments: number;
  };
}

interface ProjectListProps {
  onProjectSelect: (projectId: number) => void;
}

export default function ProjectListSimplified({ onProjectSelect }: ProjectListProps) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    status: "in_progress",
    priority: "medium",
    due_date: "",
  });

  // Fetch all projects with assignments and task stats
  const { data: projects = [], isLoading } = useQuery<ProjectWithDetails[]>({
    queryKey: ["projects-simplified"],
    queryFn: async () => {
      // Get all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      // For each project, get assignments and task stats
      const projectsWithDetails = await Promise.all(
        (projectsData || []).map(async (project) => {
          console.log(`Processing project: ${project.title} (ID: ${project.id})`);
          
          // Get assignments
          const { data: assignments } = await supabase
            .from("project_assignments")
            .select(`
              user_id,
              user:users(id, email, first_name, last_name)
            `)
            .eq("project_id", project.id)
            .is("deleted_at", null);

          // Get detailed task stats with assignments and completions
          const { data: tasks, error: tasksError } = await supabase
            .from("project_tasks")
            .select(`
              id,
              status,
              task_assignments(user_id),
              task_completions(user_id, deleted_at)
            `)
            .eq("project_id", project.id)
            .is("deleted_at", null);
            
          if (tasksError) {
            console.error(`Error fetching tasks for project ${project.id}:`, tasksError);
          }

          let totalAssignments = 0;
          let completedAssignments = 0;
          let tasksCompletelyDone = 0;

          if (tasks) {
            console.log('Project tasks data:', JSON.stringify(tasks, null, 2));
            tasks.forEach(task => {
              const assignmentCount = task.task_assignments?.length || 0;
              // Count distinct users who have completed the task
              const uniqueCompletedUsers = new Set(
                task.task_completions
                  ?.filter(tc => !tc.deleted_at)
                  ?.map(tc => tc.user_id) || []
              ).size;
              
              console.log(`Task ${task.id}: ${assignmentCount} assignments, ${uniqueCompletedUsers} completions`);
              
              totalAssignments += assignmentCount;
              completedAssignments += uniqueCompletedUsers;
              
              // Task is completely done if all assignees have completed it
              if (assignmentCount > 0 && uniqueCompletedUsers === assignmentCount) {
                tasksCompletelyDone++;
              }
            });
          }

          const taskStats = {
            total: tasks?.length || 0,
            completed: tasksCompletelyDone,
            total_assignments: totalAssignments,
            completed_assignments: completedAssignments,
          };
          
          console.log(`Project ${project.title} final stats:`, taskStats);

          return {
            ...project,
            assignments: assignments || [],
            task_stats: taskStats,
          };
        })
      );

      return projectsWithDetails;
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: typeof newProject) => {
      const { data, error } = await supabase
        .from("projects")
        .insert(projectData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-simplified"] });
      setShowCreateDialog(false);
      setNewProject({
        title: "",
        description: "",
        status: "in_progress",
        priority: "medium",
        due_date: "",
      });
      toast({
        title: "Project created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "on_hold":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatAssignees = (assignments: any[]) => {
    if (!assignments || assignments.length === 0) return "Unassigned";
    
    return assignments
      .map((a) => {
        const user = a.user;
        if (user?.first_name && user?.last_name) {
          return `${user.first_name} ${user.last_name}`;
        }
        return user?.email || "Unknown";
      })
      .join(", ");
  };

  // Group projects by status - MUST be before any conditional returns
  const projectsByStatus = useMemo(() => {
    const grouped = {
      in_progress: [] as ProjectWithDetails[],
      on_hold: [] as ProjectWithDetails[],
      completed: [] as ProjectWithDetails[],
    };

    projects.forEach((project) => {
      if (project.status in grouped) {
        grouped[project.status as keyof typeof grouped].push(project);
      } else if (project.status === 'active') {
        // Map 'active' to 'in_progress' for backwards compatibility
        grouped.in_progress.push(project);
      } else {
        // Default to in_progress for any other status
        grouped.in_progress.push(project);
      }
    });

    return grouped;
  }, [projects]);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    in_progress: false,
    on_hold: false,
    completed: true, // Completed section collapsed by default
  });

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const statusLabels = {
    in_progress: "In Progress",
    on_hold: "On Hold",
    completed: "Completed",
  };

  const statusIcons = {
    in_progress: "🚀",
    on_hold: "⏸️",
    completed: "✅",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Projects</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>


      {Object.entries(projectsByStatus).map(([status, statusProjects]) => (
        <div key={status} className="space-y-3">
          <button
            onClick={() => toggleSection(status)}
            className="flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors w-full"
          >
            {collapsedSections[status] ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
            <span>{statusIcons[status as keyof typeof statusIcons]}</span>
            <span>{statusLabels[status as keyof typeof statusLabels]}</span>
            <span className="text-sm font-normal text-muted-foreground">({statusProjects.length})</span>
          </button>

          {!collapsedSections[status] && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 ml-7">
              {statusProjects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-lg transition-all group"
                  onClick={() => onProjectSelect(project.id)}
                >
                  <CardContent className="p-6">
                    {/* Header with title and priority */}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors flex-1">
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-2 ml-3">
                        {project.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">High Priority</Badge>
                        )}
                        {project.priority === 'medium' && (
                          <Badge variant="secondary" className="text-xs">Medium</Badge>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Assignees */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Assigned to</span>
                      </div>
                      <div className="pl-6">
                        {project.assignments.length === 0 ? (
                          <span className="text-gray-400 italic text-sm">No one assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-x-1 gap-y-1">
                            {project.assignments.map((assignment, index) => {
                              const userName = assignment.user?.first_name && assignment.user?.last_name
                                ? `${assignment.user.first_name} ${assignment.user.last_name}`
                                : assignment.user?.email || 'Unknown';
                              return (
                                <React.Fragment key={assignment.user_id}>
                                  <span className="text-sm font-bold text-gray-900">
                                    {userName}
                                  </span>
                                  {index < project.assignments.length - 1 && (
                                    <span className="text-gray-400 mx-1">•</span>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer with due date and progress */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Due date */}
                        {project.due_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className={cn(
                              "text-sm font-medium",
                              new Date(project.due_date) < new Date() ? "text-red-600" : "text-gray-700"
                            )}>
                              {new Date(project.due_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: new Date(project.due_date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Task progress */}
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-gray-700 font-medium">
                            {project.task_stats.completed}/{project.task_stats.total} tasks
                          </span>
                          {project.task_stats.total_assignments > 0 && (
                            <span className="text-xs text-gray-500">
                              {project.task_stats.completed_assignments}/{project.task_stats.total_assignments} assignments
                            </span>
                          )}
                        </div>
                        {project.task_stats.total > 0 && (
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{
                                width: `${(project.task_stats.completed / project.task_stats.total) * 100}%`
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!collapsedSections[status] && statusProjects.length === 0 && (
            <div className="text-center py-8 ml-7 text-muted-foreground text-sm">
              No {statusLabels[status as keyof typeof statusLabels].toLowerCase()} yet
            </div>
          )}
        </div>
      ))}

      {projects.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No projects yet. Create your first project!</p>
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                placeholder="Enter project title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Enter project description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newProject.status}
                  onValueChange={(value) => setNewProject({ ...newProject, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newProject.priority}
                  onValueChange={(value) => setNewProject({ ...newProject, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={newProject.due_date}
                onChange={(e) => setNewProject({ ...newProject, due_date: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createProjectMutation.mutate(newProject)}
                disabled={!newProject.title || createProjectMutation.isPending}
              >
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}