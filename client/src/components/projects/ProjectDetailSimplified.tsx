import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Users,
  CheckCircle,
  Circle,
  Trash2,
  Edit,
  ThumbsUp,
  Calendar,
  Clock,
  User,
  X
} from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";

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

export default function ProjectDetailSimplified({ projectId, onBack }: ProjectDetailProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [kudosMessage, setKudosMessage] = useState("");
  const [selectedTaskForKudos, setSelectedTaskForKudos] = useState<number | null>(null);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    due_date: "",
  });
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

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

      // Fetch assignments separately
      const { data: assignments, error: assignmentError } = await supabase
        .from("project_assignments")
        .select(`
          user_id,
          role,
          user:users(id, email, first_name, last_name)
        `)
        .eq("project_id", projectId)
        .is("deleted_at", null);

      if (assignmentError) throw assignmentError;

      return {
        ...projectData,
        project_assignments: assignments || []
      };
    },
  });

  // Fetch tasks with completions and kudos
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

      // For each task, get assignments, completions and kudos
      const tasksWithDetails = await Promise.all(
        (tasksData || []).map(async (task) => {
          // Get assignments
          const { data: assignments } = await supabase
            .from("task_assignments")
            .select(`
              user_id,
              assigned_at,
              user:users(id, first_name, last_name, email)
            `)
            .eq("task_id", task.id);

          // Get completions
          const { data: completions } = await supabase
            .from("task_completions")
            .select(`
              user_id,
              completed_at,
              user:users(id, first_name, last_name, email)
            `)
            .eq("task_id", task.id)
            .is("deleted_at", null);

          // Get kudos
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

  // Fetch available users for assignment
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

  // Create task mutation
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

  // Toggle task completion
  const toggleTaskCompletionMutation = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: number; isCompleted: boolean }) => {
      if (isCompleted) {
        // Remove completion
        const { error } = await supabase
          .from("task_completions")
          .update({ deleted_at: new Date().toISOString() })
          .eq("task_id", taskId)
          .eq("user_id", user?.id);

        if (error) throw error;
      } else {
        // Add completion
        const { error } = await supabase
          .from("task_completions")
          .insert({
            task_id: taskId,
            user_id: user?.id,
            completed_at: new Date().toISOString(),
          });

        if (error) throw error;

        // Update task status if all assignees completed
        const task = tasks.find((t) => t.id === taskId);
        if (task && task.assignments.length > 0) {
          const completionCount = task.completions.length + 1;
          if (completionCount >= task.assignments.length) {
            await supabase
              .from("project_tasks")
              .update({ status: "done" })
              .eq("id", taskId);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
  });

  // Send kudos
  const sendKudosMutation = useMutation({
    mutationFn: async ({ taskId, message }: { taskId: number; message: string }) => {
      const { error } = await supabase.from("kudos_tracking").insert({
        from_user_id: user?.id,
        to_user_id: null, // Task kudos don't have specific recipient
        target_type: "task",
        target_id: taskId,
        message,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setSelectedTaskForKudos(null);
      setKudosMessage("");
      toast({ title: "Kudos sent!" });
    },
  });

  // Add user to project
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

  const formatUserName = (user: any) => {
    if (!user) return "Unknown";
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email;
  };

  const isTaskCompletedByUser = (task: TaskWithDetails) => {
    return task.completions.some((c) => c.user_id === user?.id);
  };

  const getTaskCompletionPercentage = (task: TaskWithDetails) => {
    if (task.assignments.length === 0) return 0;
    return Math.round((task.completions.length / task.assignments.length) * 100);
  };

  if (projectLoading || tasksLoading) {
    return <div className="p-8 text-center">Loading project...</div>;
  }

  if (!project) {
    return <div className="p-8 text-center">Project not found</div>;
  }

  const projectAssignees = project.project_assignments || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddTask(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
          <Button variant="outline" onClick={() => setShowAddUser(true)}>
            <Users className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Badge className="mt-1">{project.status}</Badge>
            </div>
            <div>
              <Label>Priority</Label>
              <Badge className="mt-1">{project.priority}</Badge>
            </div>
            <div>
              <Label>Team Members</Label>
              <div className="mt-1 space-y-1">
                {projectAssignees.map((assignment: any) => (
                  <div key={assignment.user_id} className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{formatUserName(assignment.user)}</span>
                  </div>
                ))}
              </div>
            </div>
            {project.due_date && (
              <div>
                <Label>Due Date</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {formatDistanceToNow(new Date(project.due_date), { addSuffix: true })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Tasks</h2>
        <div className="space-y-4">
          {tasks.map((task) => {
            const isCompleted = isTaskCompletedByUser(task);
            const completionPercentage = getTaskCompletionPercentage(task);

            return (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            toggleTaskCompletionMutation.mutate({
                              taskId: task.id,
                              isCompleted,
                            })
                          }
                          className="mt-1"
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <div className="flex-1">
                          <h3 className="font-medium">{task.title}</h3>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                      </div>

                      {/* Task metadata */}
                      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                        <Badge variant="outline">{task.priority}</Badge>
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {task.assignments.length} assigned
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {completionPercentage}% complete
                        </div>
                      </div>

                      {/* Completions */}
                      {task.completions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Completed by:</p>
                          <div className="flex flex-wrap gap-2">
                            {task.completions.map((completion) => (
                              <Badge key={completion.user_id} variant="secondary" className="text-xs">
                                {formatUserName(completion.user)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Kudos */}
                      {task.kudos.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Kudos:</p>
                          <div className="space-y-1">
                            {task.kudos.map((kudo, idx) => (
                              <div key={idx} className="text-xs">
                                <ThumbsUp className="w-3 h-3 inline mr-1" />
                                <span className="font-medium">
                                  {formatUserName(kudo.from_user)}:
                                </span>{" "}
                                {kudo.message}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTaskForKudos(task.id)}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Assign To</Label>
              <div className="space-y-2 mt-2">
                {projectAssignees.map((assignment: any) => (
                  <label key={assignment.user_id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
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
                    {formatUserName(assignment.user)}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
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
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddTask(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createTaskMutation.mutate(newTask)}
                disabled={!newTask.title}
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
            <DialogTitle>Add User to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Select User</Label>
            <div className="space-y-2">
              {availableUsers
                .filter(
                  (u) => !projectAssignees.some((a: any) => a.user_id === u.id)
                )
                .map((user) => (
                  <Button
                    key={user.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addUserToProjectMutation.mutate(user.id)}
                  >
                    {formatUserName(user)}
                  </Button>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kudos Dialog */}
      <Dialog
        open={selectedTaskForKudos !== null}
        onOpenChange={(open) => !open && setSelectedTaskForKudos(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Kudos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Message</Label>
              <Textarea
                value={kudosMessage}
                onChange={(e) => setKudosMessage(e.target.value)}
                placeholder="Great job on completing this task!"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedTaskForKudos(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedTaskForKudos && kudosMessage) {
                    sendKudosMutation.mutate({
                      taskId: selectedTaskForKudos,
                      message: kudosMessage,
                    });
                  }
                }}
                disabled={!kudosMessage}
              >
                Send Kudos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}