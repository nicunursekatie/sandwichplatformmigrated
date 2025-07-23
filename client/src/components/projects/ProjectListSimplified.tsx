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
import { Switch } from "@/components/ui/switch";

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

  // New state for filters and sorting
  const [category, setCategory] = useState<string>("all");
  const [myProjectsOnly, setMyProjectsOnly] = useState(false);
  const [sortBy, setSortBy] = useState("alphabetical");
  const [order, setOrder] = useState("az");
  const categoryChips = [
    { label: "Tech", value: "tech" },
    { label: "Events", value: "events" },
    { label: "Grants", value: "grants" },
    { label: "Outreach", value: "outreach" },
  ];

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
              task_completions!task_completions_task_id_fkey(user_id, deleted_at)
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
              
              // For tasks with no assignments but completions, use completions as the assignment count
              const effectiveAssignments = assignmentCount > 0 ? assignmentCount : uniqueCompletedUsers;
              
              totalAssignments += effectiveAssignments;
              completedAssignments += uniqueCompletedUsers;
              
              // Task is completely done if:
              // 1. It has assignments and all are completed, OR
              // 2. It has no assignments but has completions (self-assigned tasks)
              if ((assignmentCount > 0 && uniqueCompletedUsers === assignmentCount) ||
                  (assignmentCount === 0 && uniqueCompletedUsers > 0)) {
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

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];
    if (category !== "all") filtered = filtered.filter(p => (p.category || "").toLowerCase() === category);
    if (myProjectsOnly) filtered = filtered.filter(p => p.assignments.some(a => a.user_id === "me")); // Replace 'me' with actual user id if available
    // Sorting
    if (sortBy === "alphabetical") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    if (order === "za") filtered.reverse();
    return filtered;
  }, [projects, category, myProjectsOnly, sortBy, order]);

  // Status tab counts
  const statusCounts = useMemo(() => {
    return {
      active: filteredProjects.filter(p => p.status === "in_progress" || p.status === "active").length,
      available: filteredProjects.filter(p => p.status === "available").length,
      waiting: filteredProjects.filter(p => p.status === "waiting").length,
      done: filteredProjects.filter(p => p.status === "completed").length,
    };
  }, [filteredProjects]);
  const [activeTab, setActiveTab] = useState("active");

  // Tabbed projects
  const tabProjects = useMemo(() => {
    switch (activeTab) {
      case "active":
        return filteredProjects.filter(p => p.status === "in_progress" || p.status === "active");
      case "available":
        return filteredProjects.filter(p => p.status === "available");
      case "waiting":
        return filteredProjects.filter(p => p.status === "waiting");
      case "done":
        return filteredProjects.filter(p => p.status === "completed");
      default:
        return filteredProjects;
    }
  }, [filteredProjects, activeTab]);

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            Project Management
          </h1>
          <p className="text-gray-600">Organize and track all team projects</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue>{category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryChips.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <Label>Filters:</Label>
          <Button size="sm" variant={category === "all" ? "secondary" : "outline"} onClick={() => setCategory("all")}>All</Button>
          {categoryChips.map(c => (
            <Button key={c.value} size="sm" variant={category === c.value ? "secondary" : "outline"} onClick={() => setCategory(c.value)}>{c.label}</Button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <Label>Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue>{sortBy === "alphabetical" ? "Alphabetical" : sortBy}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <Label>Order</Label>
          <Select value={order} onValueChange={setOrder}>
            <SelectTrigger className="w-32">
              <SelectValue>{order === "az" ? "A-Z / Low-High" : "Z-A / High-Low"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="az">A-Z / Low-High</SelectItem>
              <SelectItem value="za">Z-A / High-Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <Label>My Projects Only</Label>
          <Switch checked={myProjectsOnly} onCheckedChange={setMyProjectsOnly} />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mt-2">
        <Button variant={activeTab === "active" ? "secondary" : "outline"} onClick={() => setActiveTab("active")}>Active ({statusCounts.active})</Button>
        <Button variant={activeTab === "available" ? "secondary" : "outline"} onClick={() => setActiveTab("available")}>Available ({statusCounts.available})</Button>
        <Button variant={activeTab === "waiting" ? "secondary" : "outline"} onClick={() => setActiveTab("waiting")}>Waiting ({statusCounts.waiting})</Button>
        <Button variant={activeTab === "done" ? "secondary" : "outline"} onClick={() => setActiveTab("done")}>Done ({statusCounts.done})</Button>
      </div>

      {/* Project Cards */}
      <div className="grid gap-4 mt-4">
        {tabProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No projects found for this filter.</div>
        ) : (
          tabProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onProjectSelect(project.id)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                    {project.priority && (
                      <Badge variant="outline" className={getPriorityColor(project.priority)}>{project.priority}</Badge>
                    )}
                  </div>
                  {project.due_date && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due: {new Date(project.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{project.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  {project.category && (
                    <Badge variant="secondary" className="text-xs">{project.category}</Badge>
                  )}
                  {project.status && (
                    <Badge variant="outline" className={getStatusColor(project.status)}>{project.status}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{formatAssignees(project.assignments)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Progress:</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${project.task_stats.total > 0 ? (project.task_stats.completed / project.task_stats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-700 font-medium">
                    {project.task_stats.completed}/{project.task_stats.total} tasks
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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