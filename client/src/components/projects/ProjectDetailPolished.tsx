import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Users,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertCircle,
  User,
  Heart,
  Edit3,
  Trash2,
  MoreVertical,
  FileText,
  UserPlus,
  UserMinus,
  CheckSquare,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  project_id: number;
}

interface TaskWithDetails extends Task {
  assignments: Array<{
    user_id: string;
    assigned_at: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  }>;
  completions: Array<{
    user_id: string;
    completed_at: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  }>;
  kudos: Array<{
    sender_id: string;
    recipient_id: string;
    sent_at: string;
    message_id: number | null;
    sender: {
      first_name: string;
      last_name: string;
    };
  }>;
}

interface ProjectDetailProps {
  projectId: number;
  onBack: () => void;
}

export default function ProjectDetailPolished({ projectId, onBack }: ProjectDetailProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showProjectEdit, setShowProjectEdit] = useState(false);
  const [selectedTab, setSelectedTab] = useState("tasks");
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [editingAssignees, setEditingAssignees] = useState<string[]>([]);
  const [selectedTaskForKudos, setSelectedTaskForKudos] = useState<number | null>(null);
  const [kudosMessage, setKudosMessage] = useState("");

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    due_date: "",
  });
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  
  const [editTask, setEditTask] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    due_date: "",
  });

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .is("deleted_at", null)
        .single();

      if (projectError) throw projectError;

      const { data: assignments } = await supabase
        .from("project_assignments")
        .select(`
          user_id,
          role,
          user:users(id, email, first_name, last_name)
        `)
        .eq("project_id", projectId)
        .is("deleted_at", null);

      return {
        ...projectData,
        project_assignments: assignments || []
      };
    },
  });

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const { data: tasksData, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tasksWithDetails = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: assignments } = await supabase
            .from("task_assignments")
            .select(`
              user_id,
              assigned_at,
              user:users(id, first_name, last_name, email)
            `)
            .eq("task_id", task.id);

          const { data: completions } = await supabase
            .from("task_completions")
            .select(`
              user_id,
              completed_at,
              user:users(id, first_name, last_name, email)
            `)
            .eq("task_id", task.id)
            .is("deleted_at", null);

          const { data: kudos } = await supabase
            .from("kudos_tracking")
            .select(`
              sender_id,
              recipient_id,
              sent_at,
              message_id,
              sender:users!sender_id(first_name, last_name)
            `)
            .eq("context_type", "task")
            .eq("context_id", task.id.toString());

          return {
            ...task,
            assignments: assignments || [],
            completions: completions || [],
            kudos: kudos || [],
          };
        })
      );

      return tasksWithDetails;
    },
  });

  // Fetch available users
  const { data: availableUsers = [] } = useQuery({
    queryKey: ["available-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, first_name, last_name")
        .is("deleted_at", null)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
  });

  // Temporarily disable activities until table is created
  const activities: any[] = [];

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: typeof newTask) => {
      const { data: taskResult, error: taskError } = await supabase
        .from("project_tasks")
        .insert({
          ...taskData,
          project_id: projectId,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Create task assignments
      if (selectedAssignees.length > 0) {
        const assignments = selectedAssignees.map((userId) => ({
          task_id: taskResult.id,
          user_id: userId,
        }));

        const { error: assignError } = await supabase
          .from("task_assignments")
          .insert(assignments);

        if (assignError) throw assignError;
      }

      return taskResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setShowAddTask(false);
      setNewTask({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        due_date: "",
      });
      setSelectedAssignees([]);
      toast({ title: "Task created successfully" });
    },
  });

  const toggleTaskCompletionMutation = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: number; isCompleted: boolean }) => {
      if (!user?.id) {
        throw new Error("No authenticated user");
      }
      
      console.log("Toggling task completion:", {
        taskId,
        isCompleted,
        userId: user.id,
      });
      
      if (isCompleted) {
        const { error } = await supabase
          .from("task_completions")
          .update({ deleted_at: new Date().toISOString() })
          .eq("task_id", taskId)
          .eq("user_id", user.id);

        if (error) {
          console.error("Error removing completion:", error);
          throw error;
        }
      } else {
        // First check auth session
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Current auth session:", {
          userId: session?.user?.id,
          userEmail: session?.user?.email,
        });
        
        // Construct user name with fallbacks
        const userName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.email || 'Unknown User';
          
        const { data, error } = await supabase
          .from("task_completions")
          .insert({
            task_id: taskId,
            user_id: user.id,
            user_name: userName,
            completed_at: new Date().toISOString(),
          })
          .select();
          
        if (error) {
          console.error("Error creating completion:", {
            error,
            attemptedUserId: user.id,
            sessionUserId: session?.user?.id,
          });
          throw error;
        }
        console.log("Successfully created completion:", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update task completion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number; updates: typeof editTask }) => {
      // Update task
      const { error: taskError } = await supabase
        .from("project_tasks")
        .update(updates)
        .eq("id", taskId);

      if (taskError) throw taskError;

      // Update assignments if changed
      const currentAssignments = tasks.find(t => t.id === taskId)?.assignments.map(a => a.user_id) || [];
      const toAdd = editingAssignees.filter(id => !currentAssignments.includes(id));
      const toRemove = currentAssignments.filter(id => !editingAssignees.includes(id));

      // Add new assignments
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("task_assignments")
          .insert(toAdd.map(user_id => ({ task_id: taskId, user_id })));
        if (error) throw error;
      }

      // Remove old assignments
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("task_assignments")
          .delete()
          .eq("task_id", taskId)
          .in("user_id", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setEditingTask(null);
      toast({ title: "Task updated successfully" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const { error } = await supabase
        .from("project_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      toast({ title: "Task deleted successfully" });
    },
  });

  const addUserToProjectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("project_assignments").insert({
        project_id: projectId,
        user_id: userId,
        role: "member",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setShowAddUser(false);
      toast({ title: "User added to project" });
    },
  });

  const sendKudosMutation = useMutation({
    mutationFn: async ({ taskId, message }: { taskId: number; message: string }) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error("Task not found");

      // Find users who completed this task (excluding current user)
      const otherCompletedUserIds = task.completions
        .filter(c => c.user_id !== user?.id)
        .map(c => c.user_id);
      
      if (otherCompletedUserIds.length === 0) {
        throw new Error("No other users have completed this task");
      }

      // Send kudos to each user who completed the task (excluding self)
      const kudosInserts = otherCompletedUserIds.map(recipientId => ({
        sender_id: user?.id,
        recipient_id: recipientId,
        context_type: "task",
        context_id: taskId.toString(),
        message_id: null,
      }));

      const { error } = await supabase.from("kudos_tracking").insert(kudosInserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setSelectedTaskForKudos(null);
      setKudosMessage("");
      toast({ title: "Kudos sent!" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting to soft delete project:", projectId);
      
      // Use soft delete by updating deleted_at and deleted_by
      const { data, error } = await supabase
        .from("projects")
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id
        })
        .eq("id", projectId)
        .select();
        
      console.log("Soft delete result:", { data, error });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log("Project soft deleted successfully:", data);
      toast({ title: "Project deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["projects-simplified"] });
      onBack();
    },
    onError: (error: any) => {
      console.error("Failed to delete project:", error);
      toast({ 
        title: "Failed to delete project", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Helper functions
  const formatUserName = (user: any) => {
    if (!user) return "Unknown";
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email;
  };

  const getInitials = (user: any) => {
    if (!user) return "?";
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  const isTaskCompletedByUser = (task: TaskWithDetails) => {
    return task.completions.some((c) => c.user_id === user?.id);
  };

  const getTaskCompletionPercentage = (task: TaskWithDetails) => {
    if (task.assignments.length === 0) return 0;
    return Math.round((task.completions.length / task.assignments.length) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "on_hold":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="w-3 h-3" />;
      case "medium":
        return <Clock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === "todo"),
    "in_progress": tasks.filter(t => t.status === "in_progress"),
    done: tasks.filter(t => t.status === "done"),
  };

  const projectStats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === "done").length,
    overdueTasks: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length,
    teamMembers: project?.project_assignments?.length || 0,
  };

  const completionPercentage = projectStats.totalTasks > 0 
    ? Math.round((projectStats.completedTasks / projectStats.totalTasks) * 100)
    : 0;

  if (projectLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl font-semibold mb-2">Project not found</p>
          <Button onClick={onBack}>Go back</Button>
        </div>
      </div>
    );
  }

  const handleEditTask = (task: TaskWithDetails) => {
    setEditingTask(task);
    setEditTask({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || "",
    });
    setEditingAssignees(task.assignments.map(a => a.user_id));
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      await updateTaskMutation.mutate({
        taskId: editingTask.id,
        updates: editTask,
      });
      setEditingTask(null);
    } catch (error) {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateTask = async () => {
    try {
      await createTaskMutation.mutate(newTask);
      setShowAddTask(false);
      setNewTask({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        due_date: "",
      });
      setSelectedAssignees([]);
    } catch (error) {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditProject = () => {
    setShowProjectEdit(true);
  };

  const handleUpdateProject = async () => {
    if (!project) return;

    try {
      // This part of the original code doesn't update the project object directly.
      // It's a placeholder for a future edit.
      // For now, we'll just close the dialog.
      setShowProjectEdit(false);
      toast({ title: "Project updated successfully" });
    } catch (error) {
      toast({
        title: "Failed to update project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-brand-teal text-white";
      case "completed":
        return "bg-green-600 text-white";
      case "on_hold":
        return "bg-orange-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-600 text-white";
      case "medium":
        return "bg-yellow-600 text-white";
      case "low":
        return "bg-blue-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getTaskStatusBadgeClass = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-gray-600 text-white";
      case "in_progress":
        return "bg-blue-600 text-white";
      case "completed":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const handleTaskStatusChange = async (taskId: number, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
      toast({ title: `Task status updated to ${newStatus}` });
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    } catch (error) {
      toast({
        title: "Failed to update task status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Back Link and Title Row with TSP Branding */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-brand-teal-light">
          <ArrowLeft className="w-4 h-4 text-brand-teal" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-main-heading text-primary mb-2">
            {project.title}
          </h1>
          <div className="flex items-center gap-3">
            <Badge className={`font-body text-sm ${getStatusBadgeClass(project.status)}`}>
              {project.status}
            </Badge>
            {project.priority && project.priority !== 'normal' && (
              <Badge 
                variant="outline" 
                className={`font-body text-sm ${getPriorityBadgeClass(project.priority)}`}
              >
                {project.priority}
              </Badge>
            )}
            {project.category && (
              <Badge variant="secondary" className="font-body text-sm">
                {project.category}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowProjectEdit(true)}
            className="font-body hover:bg-brand-teal-light hover:text-brand-teal"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            onClick={() => setShowAddTask(true)}
            className="btn-tsp-primary font-sub-heading"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Summary Cards with TSP Branding */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-l-4 border-brand-teal">
          <CardHeader className="pb-3">
            <CardTitle className="font-sub-heading text-sm text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Project Owner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-lg text-foreground">
              {project.project_assignments[0]?.user ? formatUserName(project.project_assignments[0].user) : "Unassigned"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-brand-orange">
          <CardHeader className="pb-3">
            <CardTitle className="font-sub-heading text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Target Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-lg text-foreground">
              {project.due_date ? format(new Date(project.due_date), 'MMM d, yyyy') : 'No due date'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-brand-burgundy">
          <CardHeader className="pb-3">
            <CardTitle className="font-sub-heading text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-body text-lg text-foreground">
                  {completionPercentage || 0}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${completionPercentage || 0}%`,
                    backgroundColor: getStatusColor(project.status).progress
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description Section with TSP Branding */}
      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle className="font-sub-heading text-lg text-foreground">
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-muted-foreground leading-relaxed">
              {project.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tasks Section with TSP Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-sub-heading text-lg text-foreground flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Tasks ({tasks.length})
            </CardTitle>
            <Button 
              onClick={() => setShowAddTask(true)}
              className="btn-tsp-primary font-sub-heading"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-sub-heading text-lg text-foreground mb-2">No tasks yet</h3>
              <p className="font-body text-muted-foreground mb-4">
                Get started by adding your first task to this project
              </p>
              <Button 
                onClick={() => setShowAddTask(true)}
                className="btn-tsp-primary font-sub-heading"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card 
                  key={task.id} 
                  className={`transition-all duration-200 hover:shadow-md ${
                    task.status === 'completed' ? 'bg-green-50 border-green-200' :
                    task.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Checkbox
                            checked={task.status === 'completed'}
                            onCheckedChange={(checked) => handleTaskStatusChange(task.id, checked ? 'completed' : 'waiting')}
                            className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                          />
                          <h4 className={`font-sub-heading text-base ${
                            task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}>
                            {task.title}
                          </h4>
                          <Badge className={`font-body text-xs ${getTaskStatusBadgeClass(task.status)}`}>
                            {task.status}
                          </Badge>
                          {task.priority && task.priority !== 'normal' && (
                            <Badge 
                              variant="outline" 
                              className={`font-body text-xs ${getPriorityBadgeClass(task.priority)}`}
                            >
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                        
                        {task.description && (
                          <p className={`font-body text-sm mb-3 ${
                            task.status === 'completed' ? 'text-muted-foreground' : 'text-muted-foreground'
                          }`}>
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {task.assignments.length > 0 && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="font-body">{task.assignments.map(a => formatUserName(a.user)).join(", ")}</span>
                            </div>
                          )}
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span className="font-body">
                                Due {format(new Date(task.due_date), 'MMM d')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTask(task)}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Section */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Team</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowAddUser(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {project.project_assignments.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No team members yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowAddUser(true)}
                >
                  Add first member
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {project.project_assignments.map((assignment: any) => (
                  <div key={assignment.user_id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${assignment.user_id}`} />
                      <AvatarFallback>🥪</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{formatUserName(assignment.user)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{assignment.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.map((activity) => {
                  const getActivityIcon = () => {
                    switch (activity.activity_type) {
                      case 'task_created':
                      case 'task_updated':
                        return <FileText className="w-4 h-4 text-primary" />;
                      case 'task_completed':
                        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
                      case 'member_added':
                      case 'assignee_added':
                        return <UserPlus className="w-4 h-4 text-blue-600" />;
                      case 'member_removed':
                      case 'assignee_removed':
                        return <UserMinus className="w-4 h-4 text-red-600" />;
                      case 'due_date_changed':
                        return <Calendar className="w-4 h-4 text-orange-600" />;
                      case 'priority_changed':
                        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
                      default:
                        return <div className="w-2 h-2 bg-primary rounded-full mt-0.5" />;
                    }
                  };

                  const getActivityDescription = () => {
                    const userName = activity.user ? `${activity.user.first_name} ${activity.user.last_name}` : 'Someone';
                    const targetUserName = activity.target_user ? `${activity.target_user.first_name} ${activity.target_user.last_name}` : '';
                    const taskTitle = activity.task ? activity.task.title : '';

                    switch (activity.activity_type) {
                      case 'task_created':
                        return `${userName} created task "${taskTitle}"`;
                      case 'task_updated':
                        return `${userName} updated task "${taskTitle}"`;
                      case 'task_completed':
                        return `${userName} completed task "${taskTitle}"`;
                      case 'task_uncompleted':
                        return `${userName} reopened task "${taskTitle}"`;
                      case 'member_added':
                        return `${userName} added ${targetUserName} to the project`;
                      case 'assignee_added':
                        return `${userName} assigned ${targetUserName} to "${taskTitle}"`;
                      case 'assignee_removed':
                        return `${userName} unassigned ${targetUserName} from "${taskTitle}"`;
                      case 'due_date_changed':
                        return `${userName} changed due date for "${taskTitle}"`;
                      case 'priority_changed':
                        return `${userName} changed priority for "${taskTitle}" to ${activity.metadata?.new_priority || 'unknown'}`;
                      case 'status_changed':
                        return `${userName} changed status for "${taskTitle}" to ${activity.metadata?.new_status || 'unknown'}`;
                      default:
                        return activity.description || `${userName} made changes`;
                    }
                  };

                  return (
                    <div key={activity.id} className="flex items-start gap-3 text-sm">
                      {getActivityIcon()}
                      <div className="flex-1">
                        <p className="text-sm">{getActivityDescription()}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Fallback to showing recent tasks if no activities yet
                tasks
                  .filter(task => task.status !== 'done')
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 5)
                  .map((task) => (
                    <div key={task.id} className="flex items-start gap-3 text-sm">
                      <FileText className="w-4 h-4 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm">Task "{task.title}" created</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
              )}
              {activities.length === 0 && tasks.filter(task => task.status !== 'done').length === 0 && (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Add a new task to {project.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task description (optional)"
                rows={3}
              />
            </div>
            <div>
              <Label>Assign to</Label>
              <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                {project.project_assignments.map((assignment: any) => (
                  <label key={assignment.user_id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selectedAssignees.includes(assignment.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAssignees([...selectedAssignees, assignment.user_id]);
                        } else {
                          setSelectedAssignees(
                            selectedAssignees.filter((id) => id !== assignment.user_id)
                          );
                        }
                      }}
                    />
                    <span className="text-sm">{formatUserName(assignment.user)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                >
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-due">Due Date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddTask(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createTaskMutation.mutate(newTask)}
                disabled={!newTask.title || createTaskMutation.isPending}
              >
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Select a user to add to this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableUsers
              .filter(
                (u) => !project.project_assignments.some((a: any) => a.user_id === u.id)
              )
              .map((user) => (
                <button
                  key={user.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  onClick={() => addUserToProjectMutation.mutate(user.id)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} />
                    <AvatarFallback>🥪</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{formatUserName(user)}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={showProjectEdit} onOpenChange={setShowProjectEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details for {project.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-project-title">Title</Label>
              <Input
                id="edit-project-title"
                value={project.title}
                onChange={(e) => {
                  // This part of the original code doesn't update the project object directly.
                  // It's a placeholder for a future edit.
                }}
                placeholder="Project title"
              />
            </div>
            <div>
              <Label htmlFor="edit-project-description">Description</Label>
              <Textarea
                id="edit-project-description"
                value={project.description}
                onChange={(e) => {
                  // This part of the original code doesn't update the project object directly.
                  // It's a placeholder for a future edit.
                }}
                placeholder="Project description (optional)"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-project-status">Status</Label>
              <Select
                value={project.status}
                onValueChange={(value) => {
                  // This part of the original code doesn't update the project object directly.
                  // It's a placeholder for a future edit.
                }}
              >
                <SelectTrigger id="edit-project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-project-priority">Priority</Label>
              <Select
                value={project.priority}
                onValueChange={(value) => {
                  // This part of the original code doesn't update the project object directly.
                  // It's a placeholder for a future edit.
                }}
              >
                <SelectTrigger id="edit-project-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-project-due">Due Date</Label>
              <Input
                id="edit-project-due"
                type="date"
                value={project.due_date || ""}
                onChange={(e) => {
                  // This part of the original code doesn't update the project object directly.
                  // It's a placeholder for a future edit.
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowProjectEdit(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // This part of the original code doesn't update the project object directly.
                  // It's a placeholder for a future edit.
                }}
              >
                Update Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kudos Dialog */}
      <Dialog open={selectedTaskForKudos !== null} onOpenChange={(open) => !open && setSelectedTaskForKudos(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Kudos</DialogTitle>
            <DialogDescription>
              Show appreciation for work on this task
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="kudos-message">Message (optional)</Label>
              <Textarea
                id="kudos-message"
                value={kudosMessage}
                onChange={(e) => setKudosMessage(e.target.value)}
                placeholder="Great work on this task!"
                rows={4}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {(() => {
                const task = tasks.find(t => t.id === selectedTaskForKudos);
                if (!task) return null;
                const otherCompletedUsers = task.completions
                  .filter(c => c.user_id !== user?.id)
                  .map(c => c.user);
                
                return (
                  <div>
                    <p>Kudos will be sent to:</p>
                    <ul className="mt-1">
                      {otherCompletedUsers.map(u => (
                        <li key={u.id}>• {u.first_name} {u.last_name}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setSelectedTaskForKudos(null);
                setKudosMessage("");
              }}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedTaskForKudos) {
                    sendKudosMutation.mutate({
                      taskId: selectedTaskForKudos,
                      message: kudosMessage,
                    });
                  }
                }}
              >
                <Heart className="w-4 h-4 mr-2" />
                Send Kudos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}