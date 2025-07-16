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
    status: "active",
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
          // Get assignments
          const { data: assignments } = await supabase
            .from("project_assignments")
            .select(`
              user_id,
              user:users(id, email, first_name, last_name)
            `)
            .eq("project_id", project.id)
            .is("deleted_at", null);

          // Get task stats
          const { data: tasks } = await supabase
            .from("project_tasks")
            .select("status")
            .eq("project_id", project.id)
            .is("deleted_at", null);

          const taskStats = {
            total: tasks?.length || 0,
            completed: tasks?.filter((t) => t.status === "done").length || 0,
          };

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
        status: "active",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  // Group projects by status
  const projectsByStatus = useMemo(() => {
    const grouped = {
      active: [] as ProjectWithDetails[],
      on_hold: [] as ProjectWithDetails[],
      completed: [] as ProjectWithDetails[],
    };

    projects.forEach((project) => {
      if (project.status in grouped) {
        grouped[project.status as keyof typeof grouped].push(project);
      }
    });

    return grouped;
  }, [projects]);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    active: false,
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
    active: "Active Projects",
    on_hold: "On Hold",
    completed: "Completed",
  };

  const statusIcons = {
    active: "🚀",
    on_hold: "⏸️",
    completed: "✅",
  };

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
                  className="cursor-pointer hover:shadow-md transition-all border-l-4"
                  style={{
                    borderLeftColor: project.priority === 'high' ? '#ef4444' : 
                                   project.priority === 'medium' ? '#f97316' : '#22c55e'
                  }}
                  onClick={() => onProjectSelect(project.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base line-clamp-1">{project.title}</CardTitle>
                      {project.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">High</Badge>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {project.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {/* Simplified stats row */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {project.assignments.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" />
                            {project.task_stats.completed}/{project.task_stats.total}
                          </span>
                        </div>
                        {project.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(project.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      {project.task_stats.total > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{
                              width: `${(project.task_stats.completed / project.task_stats.total) * 100}%`
                            }}
                          />
                        </div>
                      )}
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
                    <SelectItem value="active">Active</SelectItem>
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