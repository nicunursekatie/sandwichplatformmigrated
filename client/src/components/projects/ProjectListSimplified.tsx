import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Users, CheckSquare, Calendar, AlertCircle, ChevronDown, ChevronRight, FolderOpen, MoreVertical, Edit, Trash2, Tag, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Project {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  category?: string; // Added for new_project
  assignee_id?: string; // Added for new_project
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
  progressPercentage?: number; // Added for new_project
  assigneeName?: string; // Added for new_project
  createdAt?: string; // Added for new_project
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
    category: "tech", // Added for new_project
    assignee_id: "me", // Added for new_project
  });

  // New state for filters and sorting
  const [category, setCategory] = useState<string>("all");
  const [myProjectsOnly, setMyProjectsOnly] = useState(false);
  const [sortBy, setSortBy] = useState("alphabetical");
  const [order, setOrder] = useState("az");
  const [sortOrder, setSortOrder] = useState("asc"); // Added for new_project
  const [statusFilter, setStatusFilter] = useState("all"); // Added for new_project
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project>({
    id: 0,
    title: "",
    description: "",
    status: "planning",
    priority: "medium",
    due_date: "",
    category: "tech",
    assignee_id: "me",
  });

  // Helper functions for styling
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "badge-available";
      case "completed":
        return "badge-completed";
      case "planning":
        return "badge-planning";
      case "available":
        return "badge-available";
      default:
        return "badge-planning";
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowEditDialog(true);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (confirm("Are you sure you want to delete this project?")) {
      try {
        await supabase.from('projects').delete().eq('id', projectId);
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        toast({ title: "Project deleted", description: "Project has been successfully deleted." });
      } catch (error) {
        console.error('Error deleting project:', error);
        toast({ 
          title: "Error", 
          description: "Failed to delete project. Please try again.", 
          variant: "destructive" 
        });
      }
    }
  };

  const handleUpdateProject = async () => {
    try {
      await supabase
        .from('projects')
        .update({
          title: editingProject.title,
          description: editingProject.description,
          status: editingProject.status,
          priority: editingProject.priority,
          due_date: editingProject.due_date,
          category: editingProject.category,
          assignee_id: editingProject.assignee_id,
        })
        .eq('id', editingProject.id);
      
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowEditDialog(false);
      toast({ title: "Project updated", description: "Project has been successfully updated." });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update project. Please try again.", 
        variant: "destructive" 
      });
    }
  };

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
            progressPercentage: taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0,
            assigneeName: (() => {
              if (!assignments || assignments.length === 0) return '';
              const assignment = assignments.find(a => a.user_id === "me");
              if (assignment && assignment.user) {
                return `${assignment.user.first_name || ''} ${assignment.user.last_name || ''}`.trim();
              }
              return '';
            })(),
            createdAt: project.created_at,
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
        category: "tech",
        assignee_id: "me",
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
        return { border: "border-green-500", progress: "bg-green-500" };
      case "completed":
        return { border: "border-blue-500", progress: "bg-blue-500" };
      case "on_hold":
        return { border: "border-yellow-500", progress: "bg-yellow-500" };
      default:
        return { border: "border-gray-500", progress: "bg-gray-500" };
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

  // Filter projects based on status filter
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(project => project.status === statusFilter);
    }
    
    // Apply category filter
    if (category !== "all") {
      filtered = filtered.filter(project => project.category === category);
    }
    
    // Apply "My Projects Only" filter
    if (myProjectsOnly) {
      // Assuming 'user' is available in the context or passed as a prop
      // For now, using a placeholder or a dummy user ID if not available
      const userId = "me"; // Placeholder for actual user ID
      filtered = filtered.filter(project => 
        project.assignments.some(assignment => assignment.user_id === userId)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "alphabetical":
          comparison = a.title.localeCompare(b.title);
          break;
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
          break;
        case "progress":
          comparison = (a.progressPercentage || 0) - (b.progressPercentage || 0);
          break;
        default:
          comparison = a.title.localeCompare(b.title);
      }
      
      return sortOrder === "desc" ? -comparison : comparison;
    });
    
    return filtered;
  }, [projects, statusFilter, category, myProjectsOnly, sortBy, sortOrder]);

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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with TSP Brand Styling */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-main-heading text-primary flex items-center gap-3">
            <FolderOpen className="h-8 w-8 text-brand-teal" />
            Projects
          </h1>
          <p className="text-base sm:text-lg font-body text-muted-foreground mt-2">
            Manage and track your team's projects
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="btn-tsp-primary font-sub-heading"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters and Controls with TSP Branding */}
      <div className="space-y-4">
        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="font-sub-heading text-sm">Category:</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="tech">Tech</SelectItem>
                <SelectItem value="events">Events</SelectItem>
                <SelectItem value="grants">Grants</SelectItem>
                <SelectItem value="outreach">Outreach</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {category !== "all" && (
              <Badge 
                variant="secondary" 
                className="badge-planning font-body text-xs cursor-pointer hover:bg-brand-teal-light"
                onClick={() => setCategory("all")}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)} ×
              </Badge>
            )}
          </div>
        </div>

        {/* Sort and Filter Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="font-sub-heading text-sm">Sort by:</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="font-sub-heading text-sm">Order:</Label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">A-Z</SelectItem>
                <SelectItem value="desc">Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Switch
              checked={myProjectsOnly}
              onCheckedChange={setMyProjectsOnly}
              className="data-[state=checked]:bg-brand-teal"
            />
            <Label className="font-body text-sm">My Projects Only</Label>
          </div>
        </div>
      </div>

      {/* Status Tabs with TSP Branding */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger 
            value="all" 
            className="font-sub-heading data-[state=active]:bg-brand-teal data-[state=active]:text-white"
          >
            All ({filteredProjects.length})
          </TabsTrigger>
          <TabsTrigger 
            value="active" 
            className="font-sub-heading data-[state=active]:bg-brand-teal data-[state=active]:text-white"
          >
            Active ({statusCounts.active})
          </TabsTrigger>
          <TabsTrigger 
            value="available" 
            className="font-sub-heading data-[state=active]:bg-brand-teal data-[state=active]:text-white"
          >
            Available ({statusCounts.available})
          </TabsTrigger>
          <TabsTrigger 
            value="completed" 
            className="font-sub-heading data-[state=active]:bg-brand-teal data-[state=active]:text-white"
          >
            Completed ({statusCounts.done})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal mx-auto"></div>
              <p className="font-body text-muted-foreground mt-4">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-sub-heading text-lg text-foreground mb-2">No projects found</h3>
              <p className="font-body text-muted-foreground">
                {statusFilter === "all" 
                  ? "Get started by creating your first project" 
                  : `No ${statusFilter} projects found`}
              </p>
              {statusFilter === "all" && (
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="btn-tsp-primary mt-4 font-sub-heading"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="project-card hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4"
                  style={{
                    borderLeftColor: getStatusColor(project.status).border
                  }}
                  onClick={() => onProjectSelect(project.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="font-sub-heading text-lg text-foreground line-clamp-2 mb-2">
                          {project.title}
                        </CardTitle>
                        <CardDescription className="font-body text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEditProject(project);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Status and Priority Badges */}
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`font-body text-xs ${getStatusBadgeClass(project.status)}`}
                      >
                        {project.status}
                      </Badge>
                      {project.priority && project.priority !== 'normal' && (
                        <Badge 
                          variant="outline" 
                          className={`font-body text-xs ${getPriorityBadgeClass(project.priority)}`}
                        >
                          {project.priority}
                        </Badge>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs text-muted-foreground">Progress</span>
                        <span className="font-sub-heading text-xs text-foreground">
                          {project.progressPercentage || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${project.progressPercentage || 0}%`,
                            backgroundColor: getStatusColor(project.status).progress
                          }}
                        />
                      </div>
                    </div>

                    {/* Project Details */}
                    <div className="space-y-2">
                      {project.category && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span className="font-body text-xs text-muted-foreground capitalize">
                            {project.category}
                          </span>
                        </div>
                      )}
                      
                      {project.due_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="font-body text-xs text-muted-foreground">
                            Due {format(new Date(project.due_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}

                      {project.assignments && project.assignments.length > 0 && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-body text-xs text-muted-foreground">
                            {project.assigneeName || 'Unknown User'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs text-muted-foreground">
                          {format(new Date(project.created_at), 'MMM d, yyyy')}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="font-body text-xs text-brand-teal hover:text-brand-teal-hover hover:bg-brand-teal-light"
                          onClick={(e) => {
                            e.stopPropagation();
                            onProjectSelect(project.id);
                          }}
                        >
                          View Details
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Project Dialog with TSP Branding */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-main-heading text-xl text-foreground">
              Create New Project
            </DialogTitle>
            <DialogDescription className="font-body text-muted-foreground">
              Set up a new project for your team to work on
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-sub-heading text-sm">Title</Label>
                <Input
                  placeholder="Project title"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="font-body"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-sub-heading text-sm">Category</Label>
                <Select value={newProject.category} onValueChange={(value) => setNewProject({ ...newProject, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="grants">Grants</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-sub-heading text-sm">Description</Label>
              <Textarea
                placeholder="Project description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                rows={3}
                className="font-body"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-sub-heading text-sm">Status</Label>
                <Select value={newProject.status} onValueChange={(value) => setNewProject({ ...newProject, status: value })}>
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
              
              <div className="space-y-2">
                <Label className="font-sub-heading text-sm">Priority</Label>
                <Select value={newProject.priority} onValueChange={(value) => setNewProject({ ...newProject, priority: value })}>
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
              
              <div className="space-y-2">
                <Label className="font-sub-heading text-sm">Due Date</Label>
                <Input
                  type="date"
                  value={newProject.due_date}
                  onChange={(e) => setNewProject({ ...newProject, due_date: e.target.value })}
                  className="font-body"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-sub-heading text-sm">Assignee</Label>
              <Select value={newProject.assignee_id || ""} onValueChange={(value) => setNewProject({ ...newProject, assignee_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {/* Assuming 'users' data is available or fetched elsewhere */}
                  {/* For now, using a placeholder or a dummy list */}
                  <SelectItem value="me">Me</SelectItem>
                  <SelectItem value="user1">User 1</SelectItem>
                  <SelectItem value="user2">User 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              className="font-body"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => createProjectMutation.mutate(newProject)}
              disabled={!newProject.title.trim()}
              className="btn-tsp-primary font-sub-heading"
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog with TSP Branding */}
      {/* This section is not part of the original file's edit, so it's commented out */}
      {/*
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-main-heading text-xl text-foreground">
              Edit Project
            </DialogTitle>
            <DialogDescription className="font-body text-muted-foreground">
              Update project details and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-sub-heading text-sm">Title</Label>
                <Input
                  placeholder="Project title"
                  value={editingProject.title}
                  onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                  className="font-body"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-sub-heading text-sm">Category</Label>
                <Select value={editingProject.category} onValueChange={(value) => setEditingProject({ ...editingProject, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="grants">Grants</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-sub-heading text-sm">Description</Label>
              <Textarea
                placeholder="Project description"
                value={editingProject.description}
                onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                rows={3}
                className="font-body"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-sub-heading text-sm">Status</Label>
                <Select value={editingProject.status} onValueChange={(value) => setEditingProject({ ...editingProject, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="font-sub-heading text-sm">Priority</Label>
                <Select value={editingProject.priority} onValueChange={(value) => setEditingProject({ ...editingProject, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="font-sub-heading text-sm">Due Date</Label>
                <Input
                  type="date"
                  value={editingProject.dueDate}
                  onChange={(e) => setEditingProject({ ...editingProject, dueDate: e.target.value })}
                  className="font-body"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-sub-heading text-sm">Assignee</Label>
              <Select value={editingProject.assigneeId || ""} onValueChange={(value) => setEditingProject({ ...editingProject, assigneeId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
              className="font-body"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateProject}
              disabled={!editingProject.title.trim()}
              className="btn-tsp-primary font-sub-heading"
            >
              Update Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}
    </div>
  );
}