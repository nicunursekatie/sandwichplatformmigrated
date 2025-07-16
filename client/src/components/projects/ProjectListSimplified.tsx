import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Users, CheckSquare, Calendar, AlertCircle } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Projects</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onProjectSelect(project.id)}
          >
            <CardHeader>
              <CardTitle className="line-clamp-1">{project.title}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Status and Priority */}
                <div className="flex gap-2">
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                  <Badge className={getPriorityColor(project.priority)}>
                    {project.priority}
                  </Badge>
                </div>

                {/* Assignees */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {formatAssignees(project.assignments)}
                  </span>
                </div>

                {/* Task Progress */}
                <div className="flex items-center gap-2 text-sm">
                  <CheckSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {project.task_stats.completed} / {project.task_stats.total} tasks
                  </span>
                </div>

                {/* Due Date */}
                {project.due_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Due {formatDistanceToNow(new Date(project.due_date), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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