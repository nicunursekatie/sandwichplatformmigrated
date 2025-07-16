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
  MoreVertical
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
      if (isCompleted) {
        const { error } = await supabase
          .from("task_completions")
          .update({ deleted_at: new Date().toISOString() })
          .eq("task_id", taskId)
          .eq("user_id", user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("task_completions")
          .insert({
            task_id: taskId,
            user_id: user?.id,
            completed_at: new Date().toISOString(),
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
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

      // Find users who completed this task to send kudos to
      const completedUserIds = task.completions.map(c => c.user_id);
      
      // If no one has completed the task, send general kudos
      if (completedUserIds.length === 0) {
        const { error } = await supabase.from("kudos_tracking").insert({
          sender_id: user?.id,
          recipient_id: null,
          context_type: "task",
          context_id: taskId.toString(),
          message_id: null,
        });
        if (error) throw error;
      } else {
        // Send kudos to each user who completed the task
        const kudosInserts = completedUserIds.map(recipientId => ({
          sender_id: user?.id,
          recipient_id: recipientId,
          context_type: "task",
          context_id: taskId.toString(),
          message_id: null,
        }));

        const { error } = await supabase.from("kudos_tracking").insert(kudosInserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setSelectedTaskForKudos(null);
      setKudosMessage("");
      toast({ title: "Kudos sent!" });
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
            <p className="text-muted-foreground max-w-2xl">{project.description}</p>
            <div className="flex items-center gap-4 mt-4">
              <Badge variant={getStatusColor(project.status)}>
                {project.status.replace("_", " ")}
              </Badge>
              <Badge variant={getPriorityColor(project.priority)}>
                {getPriorityIcon(project.priority)}
                {project.priority} priority
              </Badge>
              {project.due_date && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Due {format(new Date(project.due_date), "MMM dd, yyyy")}
                </div>
              )}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowProjectEdit(true)}>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{completionPercentage}%</div>
            <Progress value={completionPercentage} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.completedTasks}/{projectStats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{projectStats.overdueTasks}</div>
            <p className="text-xs text-muted-foreground">tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <Button onClick={() => setShowAddTask(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="todo">
                    To Do ({tasksByStatus.todo.length})
                  </TabsTrigger>
                  <TabsTrigger value="in_progress">
                    In Progress ({tasksByStatus.in_progress.length})
                  </TabsTrigger>
                  <TabsTrigger value="done">
                    Done ({tasksByStatus.done.length})
                  </TabsTrigger>
                </TabsList>

                {["todo", "in_progress", "done"].map((status) => (
                  <TabsContent key={status} value={status} className="space-y-2">
                    {tasksByStatus[status as keyof typeof tasksByStatus].length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No tasks in this status
                      </div>
                    ) : (
                      tasksByStatus[status as keyof typeof tasksByStatus].map((task) => {
                        const isCompleted = isTaskCompletedByUser(task);
                        const completionPercentage = getTaskCompletionPercentage(task);

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "border rounded-lg p-4 transition-all hover:shadow-sm",
                              isCompleted && "bg-muted/50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-lg">
                                      {task.title}
                                    </h4>
                                    {task.description && (
                                      <p className="text-base mt-2 p-3 bg-muted/50 rounded-md border border-muted">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => {
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
                                        <Edit3 className="w-4 h-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedTaskForKudos(task.id);
                                        }}
                                      >
                                        <Heart className="w-4 h-4 mr-2" />
                                        Send Kudos
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => {
                                          if (confirm("Are you sure you want to delete this task?")) {
                                            deleteTaskMutation.mutate(task.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <div className="flex items-center gap-4 text-sm">
                                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                    {task.priority}
                                  </Badge>
                                  {task.due_date && (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(task.due_date), "MMM dd")}
                                    </div>
                                  )}
                                </div>

                                {/* Individual assignee checkboxes */}
                                {task.assignments.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="text-sm font-medium">Assigned to:</div>
                                    <div className="space-y-1">
                                      {task.assignments.map((assignment) => {
                                        const isUserCompleted = task.completions.some(
                                          c => c.user_id === assignment.user_id
                                        );
                                        const isCurrentUser = assignment.user_id === user?.id;
                                        
                                        return (
                                          <div key={assignment.user_id} className="flex items-center gap-2">
                                            <button
                                              onClick={() => {
                                                if (isCurrentUser) {
                                                  toggleTaskCompletionMutation.mutate({
                                                    taskId: task.id,
                                                    isCompleted: isUserCompleted,
                                                  });
                                                }
                                              }}
                                              disabled={!isCurrentUser}
                                              className="flex items-center gap-2"
                                            >
                                              {isUserCompleted ? (
                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                              ) : (
                                                <Circle className={cn(
                                                  "w-4 h-4",
                                                  isCurrentUser
                                                    ? "text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                                    : "text-muted-foreground/50 cursor-not-allowed"
                                                )} />
                                              )}
                                              <span className={cn(
                                                "text-sm",
                                                isUserCompleted && "line-through text-muted-foreground"
                                              )}>
                                                {assignment.user.first_name} {assignment.user.last_name}
                                                {isCurrentUser && " (You)"}
                                              </span>
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {completionPercentage > 0 && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Overall Progress</span>
                                      <span className="font-medium">{completionPercentage}%</span>
                                    </div>
                                    <Progress value={completionPercentage} className="h-1" />
                                  </div>
                                )}

                                {task.kudos.length > 0 && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Heart className="w-3 h-3 text-pink-500" />
                                    {task.kudos.length} kudos
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
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
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
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

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details for {project.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-task-title">Title</Label>
              <Input
                id="edit-task-title"
                value={editTask.title}
                onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            <div>
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                value={editTask.description}
                onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
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
                      checked={editingAssignees.includes(assignment.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingAssignees([...editingAssignees, assignment.user_id]);
                        } else {
                          setEditingAssignees(
                            editingAssignees.filter((id) => id !== assignment.user_id)
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
                <Label htmlFor="edit-task-priority">Priority</Label>
                <Select
                  value={editTask.priority}
                  onValueChange={(value) => setEditTask({ ...editTask, priority: value })}
                >
                  <SelectTrigger id="edit-task-priority">
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
                <Label htmlFor="edit-task-due">Due Date</Label>
                <Input
                  id="edit-task-due"
                  type="date"
                  value={editTask.due_date}
                  onChange={(e) => setEditTask({ ...editTask, due_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-task-status">Status</Label>
              <Select
                value={editTask.status}
                onValueChange={(value) => setEditTask({ ...editTask, status: value })}
              >
                <SelectTrigger id="edit-task-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingTask) {
                    updateTaskMutation.mutate({
                      taskId: editingTask.id,
                      updates: editTask,
                    });
                  }
                }}
                disabled={!editTask.title}
              >
                Update Task
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
                const completedUsers = task.completions.map(c => c.user);
                
                if (completedUsers.length === 0) {
                  return "This kudos will be visible to anyone who completes the task.";
                } else {
                  return (
                    <div>
                      <p>Kudos will be sent to:</p>
                      <ul className="mt-1">
                        {completedUsers.map(user => (
                          <li key={user.id}>• {user.first_name} {user.last_name}</li>
                        ))}
                      </ul>
                    </div>
                  );
                }
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