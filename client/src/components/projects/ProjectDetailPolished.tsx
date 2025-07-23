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
  UserMinus
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Back Link and Title Row */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-blue-700 font-semibold cursor-pointer" onClick={onBack}>
          Back to Projects
        </span>
        <span className="text-2xl font-bold ml-6">{project.title}</span>
        <div className="flex gap-2 ml-4">
          <Badge variant={getStatusColor(project.status)}>{project.status.replace("_", " ")}</Badge>
          <Badge variant={getPriorityColor(project.priority)}>{project.priority}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setShowProjectEdit(true)}>
          <Edit3 className="w-4 h-4" /> Edit Project
        </Button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-blue-200">
          <CardContent className="p-4 flex flex-col gap-2">
            <span className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Project Owner</span>
            <span className="text-lg font-bold">{project.project_assignments[0]?.user ? formatUserName(project.project_assignments[0].user) : "Unassigned"}</span>
            <span className="text-xs text-gray-500">Currently managing this project</span>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="p-4 flex flex-col gap-2">
            <span className="text-xs text-orange-700 font-semibold uppercase tracking-wide">Target Date</span>
            <span className="text-lg font-bold">{project.due_date ? format(new Date(project.due_date), "M/d/yyyy") : "No date set"}</span>
            {project.due_date && <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(project.due_date), { addSuffix: true })}</span>}
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 flex flex-col gap-2">
            <span className="text-xs text-green-700 font-semibold uppercase tracking-wide">Progress</span>
            <span className="text-lg font-bold">{completionPercentage}%</span>
            <Progress value={completionPercentage} className="h-2" />
            <span className="text-xs text-gray-500">{projectStats.completedTasks} of {projectStats.totalTasks} tasks</span>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Section */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">Tasks</h2>
        <Button onClick={() => setShowAddTask(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Task
        </Button>
      </div>
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No tasks yet. Add your first task!</div>
        ) : (
          tasks.map((task) => {
            const isCompleted = isTaskCompletedByUser(task);
            const completionPercentage = getTaskCompletionPercentage(task);
            let cardColor = "bg-white";
            if (task.status === "done") cardColor = "bg-green-50 border-green-200";
            else if (task.status === "in_progress") cardColor = "bg-yellow-50 border-yellow-200";
            else if (task.status === "waiting") cardColor = "bg-gray-50 border-gray-200";
            return (
              <Card key={task.id} className={`border ${cardColor} shadow-sm`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-lg font-semibold ${task.status === "done" ? "line-through text-green-700" : ""}`}>{task.title}</h3>
                      {task.priority && <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>}
                      {task.status && <Badge variant={getStatusColor(task.status)}>{task.status}</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => {
                        setEditingTask(task);
                        setEditTask({
                          title: task.title,
                          description: task.description || "",
                          status: task.status,
                          priority: task.priority,
                          due_date: task.due_date || "",
                        });
                        setEditingAssignees(task.assignments.map(a => a.user_id));
                      }}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Are you sure you want to delete this task?")) deleteTaskMutation.mutate(task.id); }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {task.description && <p className="text-sm text-gray-600 mb-2">{task.description}</p>}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {task.assignments.length > 0 && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {task.assignments.map(a => formatUserName(a.user)).join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">Team Progress: {task.completions.length}/{task.assignments.length}</span>
                    {task.status === "done" && <Badge variant="secondary">Fully Complete</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <Button size="sm" variant="outline" onClick={() => toggleTaskCompletionMutation.mutate({ taskId: task.id, isCompleted: true })}>Mark Incomplete</Button>
                    ) : (
                      <Button size="sm" className="bg-green-600 text-white" onClick={() => toggleTaskCompletionMutation.mutate({ taskId: task.id, isCompleted: false })}>Mark My Portion Complete</Button>
                    )}
                    {task.status === "done" && (
                      <span className="text-xs text-gray-500">Completed {task.completions[0]?.completed_at ? format(new Date(task.completions[0].completed_at), "M/d/yyyy") : ""}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

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
                      <AvatarFallback>{getInitials(assignment.user)}</AvatarFallback>
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
                    <AvatarFallback>{getInitials(user)}</AvatarFallback>
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