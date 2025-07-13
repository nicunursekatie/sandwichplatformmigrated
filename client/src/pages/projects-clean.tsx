import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Calendar, 
  Clock, 
  Target, 
  CheckCircle2, 
  AlertCircle,
  Edit,
  Users,
  FileText,
  MoreVertical
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCelebration, CelebrationToast } from "@/components/celebration-toast";
import { hasPermission, PERMISSIONS } from "@shared/auth-utils";

import { supabase } from '@/lib/supabase';
import { queryClient } from "@/lib/queryClient";

// Updated interfaces based on your actual database schema
interface Project {
  id: number;
  title: string;
  description: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  due_date: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface ProjectAssignment {
  id: number;
  project_id: number;
  user_id: string;
  role: string;
  assigned_at: string;
  assigned_by: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface ProjectTask {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
  created_by: string;
  assigned_users: TaskAssignment[];
}

interface TaskAssignment {
  id: number;
  task_id: number;
  user_id: string;
  status: 'assigned' | 'in_progress' | 'completed';
  completed_at: string | null;
  notes: string | null;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export default function ProjectsClean() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { celebration, hideCelebration } = useCelebration();
  const canEdit = hasPermission(user, PERMISSIONS.MANAGE_PROJECTS);
  const canView = hasPermission(user, PERMISSIONS.VIEW_PROJECTS);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    status: 'planning' as const,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'general',
    due_date: '',
    start_date: '',
    estimated_hours: 0,
    budget: 0
  });

  // Fetch projects with assignments and tasks
  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      console.log('Fetching projects...');
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      
      console.log('Projects fetched successfully:', data?.length || 0, 'projects');
      return data || [];
    },
    enabled: canView,
    retry: 2,
  });

  // Fetch project assignments
  const { data: projectAssignments = [] } = useQuery<ProjectAssignment[]>({
    queryKey: ["project-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_assignments')
        .select(`
          *,
          user:users(id, email, first_name, last_name)
        `);
      
      if (error) throw error;
      return data || [];
    },
    enabled: canView,
  });

  // Fetch project tasks with assignments
  const { data: projectTasks = [] } = useQuery<ProjectTask[]>({
    queryKey: ["project-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_tasks')
        .select(`
          *,
          assigned_users:task_assignments(
            *,
            user:users(id, email, first_name, last_name)
          )
        `);
      
      if (error) throw error;
      return data || [];
    },
    enabled: canView,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: typeof newProject) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...projectData,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowCreateDialog(false);
      setNewProject({
        title: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        category: 'general',
        due_date: '',
        start_date: '',
        estimated_hours: 0,
        budget: 0
      });
      toast({ 
        title: "Project created", 
        description: "New project has been created successfully." 
      });
    },
  });

  // Update project status mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Project> }) => {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ 
        title: "Project updated", 
        description: "Project has been updated successfully." 
      });
    },
  });

  // Mark task as completed for current user
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status, notes }: { taskId: number; status: string; notes?: string }) => {
      // First check if user has an assignment for this task
      const { data: existingAssignment } = await supabase
        .from('task_assignments')
        .select('id')
        .eq('task_id', taskId)
        .eq('user_id', user?.id)
        .single();

      if (existingAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from('task_assignments')
          .update({
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
            notes
          })
          .eq('id', existingAssignment.id);
        
        if (error) throw error;
      } else {
        // Create new assignment if user marks it as completed
        const { error } = await supabase
          .from('task_assignments')
          .insert({
            task_id: taskId,
            user_id: user?.id,
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
            notes
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      toast({ 
        title: "Task updated", 
        description: "Your task status has been updated." 
      });
    },
  });

  // Helper functions
  const getProjectAssignments = (projectId: number) => {
    return projectAssignments.filter(assignment => assignment.project_id === projectId);
  };

  const getProjectTasks = (projectId: number) => {
    return projectTasks.filter(task => task.project_id === projectId);
  };

  const getTaskCompletionStatus = (task: ProjectTask) => {
    const assignments = task.assigned_users || [];
    const completed = assignments.filter(a => a.status === 'completed').length;
    const total = assignments.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const isUserAssignedToTask = (task: ProjectTask) => {
    return task.assigned_users?.some(assignment => assignment.user_id === user?.id);
  };

  const getUserTaskStatus = (task: ProjectTask) => {
    const userAssignment = task.assigned_users?.find(assignment => assignment.user_id === user?.id);
    return userAssignment?.status || 'not_assigned';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'planning': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProjects = projects.filter(project => {
    switch (activeTab) {
      case 'active': return ['planning', 'in_progress'].includes(project.status);
      case 'completed': return project.status === 'completed';
      case 'my_projects': return getProjectAssignments(project.id).some(a => a.user_id === user?.id);
      default: return true;
    }
  });

  if (!canView) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view projects.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Projects</h3>
          <p className="text-gray-600 mb-4">Unable to load projects from the database.</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["projects"] })}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Manage and track project progress</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Projects</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="my_projects">My Projects</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredProjects.map(project => {
            const assignments = getProjectAssignments(project.id);
            const tasks = getProjectTasks(project.id);
            const completedTasks = tasks.filter(task => {
              const { completed, total } = getTaskCompletionStatus(task);
              return completed === total && total > 0;
            }).length;

            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">{project.title}</CardTitle>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(project.priority)}>
                          {project.priority}
                        </Badge>
                      </div>
                      <CardDescription>{project.description}</CardDescription>
                      
                      {/* Project details */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {project.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due: {new Date(project.due_date).toLocaleDateString()}
                          </div>
                        )}
                        {project.estimated_hours && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {project.estimated_hours}h estimated
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {assignments.length} assigned
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedProject(project)}>
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Project
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => updateProjectMutation.mutate({ 
                                id: project.id, 
                                updates: { status: project.status === 'completed' ? 'in_progress' : 'completed' }
                              })}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Mark as {project.status === 'completed' ? 'In Progress' : 'Completed'}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Assigned Users */}
                  {assignments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Assigned Team</h4>
                      <div className="flex flex-wrap gap-2">
                        {assignments.map(assignment => (
                          <div key={assignment.id} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {assignment.user?.first_name?.[0]}{assignment.user?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {assignment.user?.first_name} {assignment.user?.last_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {assignment.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks Progress */}
                  {tasks.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Tasks Progress</h4>
                        <span className="text-sm text-gray-500">
                          {completedTasks} of {tasks.length} completed
                        </span>
                      </div>
                      <Progress value={(completedTasks / tasks.length) * 100} className="mb-3" />
                      
                      {/* Task List */}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {tasks.map(task => {
                          const { completed, total, percentage } = getTaskCompletionStatus(task);
                          const isAssigned = isUserAssignedToTask(task);
                          const userStatus = getUserTaskStatus(task);

                          return (
                            <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-3 flex-1">
                                {isAssigned && (
                                  <Checkbox
                                    checked={userStatus === 'completed'}
                                    onCheckedChange={(checked) => {
                                      updateTaskStatusMutation.mutate({
                                        taskId: task.id,
                                        status: checked ? 'completed' : 'assigned'
                                      });
                                    }}
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{task.title}</span>
                                    <Badge className={getPriorityColor(task.priority)} variant="outline">
                                      {task.priority}
                                    </Badge>
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {total > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {completed}/{total} done ({Math.round(percentage)}%)
                                  </div>
                                )}
                                {task.due_date && (
                                  <div className="text-xs text-gray-500">
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {filteredProjects.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-600">
                  {activeTab === 'my_projects' 
                    ? "You haven't been assigned to any projects yet."
                    : "No projects match the current filter."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Project Title</Label>
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
                placeholder="Project description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newProject.priority} onValueChange={(value) => 
                  setNewProject({ ...newProject, priority: value as 'low' | 'medium' | 'high' | 'urgent' })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newProject.category}
                  onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                  placeholder="e.g., Development, Marketing"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={newProject.start_date}
                  onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                />
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  value={newProject.estimated_hours}
                  onChange={(e) => setNewProject({ ...newProject, estimated_hours: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({ ...newProject, budget: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => createProjectMutation.mutate(newProject)}>
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Celebration Toast */}
      <CelebrationToast
        isVisible={celebration.isVisible}
        onClose={hideCelebration}
        taskTitle={celebration.taskTitle}
        emoji={celebration.emoji}
        onSendThanks={() => {
          toast({
            title: "Thanks sent!",
            description: "Your appreciation message has been recorded.",
          });
        }}
      />
    </div>
  );
}