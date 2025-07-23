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
import { 
  Plus, 
  Calendar, 
  User, 
  Clock, 
  Target, 
  CheckCircle2, 
  Circle, 
  Pause,
  Play,
  ArrowRight,
  BarChart3,
  AlertCircle,
  Award,
  Trash2,
  Edit,
  Settings
} from "lucide-react";
import sandwichLogo from "@assets/LOGOS/sandwich logo.png";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCelebration, CelebrationToast } from "@/components/celebration-toast";
import { ProjectAssigneeSelector } from "@/components/project-assignee-selector";
import { hasPermission, PERMISSIONS, canEditProject, canDeleteProject } from "@shared/auth-utils";
import type { Project, InsertProject } from "@shared/schema";

export default function ProjectsClean() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { celebration, triggerCelebration, hideCelebration } = useCelebration();
  // Remove old blanket edit permission - now handled per-project basis
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [newProject, setNewProject] = useState<Partial<InsertProject>>({
    title: '',
    description: '',
    status: 'available',
    priority: 'medium',
    category: 'general',
    assigneeName: '',
    dueDate: '',
    startDate: '',
    estimatedHours: 0,
    actualHours: 0,
    budget: ''
  });

  // Fetch all projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Update project status mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest('PATCH', `/api/projects/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ 
        title: "Project updated", 
        description: "Project status has been updated successfully." 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update project status.",
        variant: "destructive" 
      });
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: Partial<InsertProject>) => {
      return await apiRequest('POST', '/api/projects', projectData);
    },
    onSuccess: (data) => {
      // Only invalidate the projects cache once - no need for refetch
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      setShowCreateDialog(false);
      setNewProject({
        title: '',
        description: '',
        status: 'available',
        priority: 'medium',
        category: 'general',
        assigneeName: '',
        dueDate: '',
        startDate: '',
        estimatedHours: 0
      });
      
      toast({ 
        title: "Project created successfully!", 
        description: `"${data.title}" has been added to your Available projects.` 
      });
    },
    onError: (error: any) => {
      console.error('Project creation failed:', error);
      toast({ 
        title: "Error", 
        description: "Failed to create project.",
        variant: "destructive" 
      });
    },
  });

  // Edit project mutation
  const editProjectMutation = useMutation({
    mutationFn: async ({ id, projectData }: { id: number; projectData: Partial<InsertProject> }) => {
      return await apiRequest('PATCH', `/api/projects/${id}`, projectData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowEditDialog(false);
      setEditingProject(null);
      toast({ 
        title: "Project updated successfully!", 
        description: `"${data.title}" has been updated.` 
      });
    },
    onError: (error: any) => {
      console.error('Project update failed:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update project.",
        variant: "destructive" 
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ 
        title: "Project deleted successfully!", 
        description: "The project has been removed from your list." 
      });
    },
    onError: (error: any) => {
      console.error('Project deletion failed:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete project.",
        variant: "destructive" 
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-50 border-green-200";
      case "in_progress": return "text-blue-600 bg-blue-50 border-blue-200";
      case "available": return "text-purple-600 bg-purple-50 border-purple-200";
      case "waiting": return "text-gray-600 bg-gray-50 border-gray-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4" />;
      case "in_progress": return <Play className="w-4 h-4" />;
      case "available": return <Circle className="w-4 h-4" />;
      case "waiting": return <Pause className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const handleProjectClick = (projectId: number) => {
    console.log('Navigating to project:', projectId);
    // Navigate to dashboard with project section
    const newUrl = `/dashboard?section=project-${projectId}`;
    setLocation(newUrl);
    
    // Update the URL in the browser history
    window.history.pushState({}, '', newUrl);
    
    // Trigger the dashboard section change if available
    if ((window as any).dashboardSetActiveSection) {
      (window as any).dashboardSetActiveSection(`project-${projectId}`);
    }
  };

  const handleStatusChange = (projectId: number, newStatus: string) => {
    const project = projects?.find(p => p.id === projectId);
    if (project && canEditProject(user, project)) {
      updateProjectMutation.mutate({ id: projectId, status: newStatus });
    }
  };

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setShowEditDialog(true);
  };

  const handleEditFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      editProjectMutation.mutate({ 
        id: editingProject.id, 
        projectData: {
          title: editingProject.title,
          description: editingProject.description,
          status: editingProject.status,
          priority: editingProject.priority,
          category: editingProject.category,
          assigneeName: editingProject.assigneeName,
          assigneeIds: editingProject.assigneeIds,
          dueDate: editingProject.dueDate,
          estimatedHours: editingProject.estimatedHours,
          budget: editingProject.budget
        }
      });
    }
  };

  const handleDeleteProject = (projectId: number, projectTitle: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    const project = projects?.find(p => p.id === projectId);
    if (project && canDeleteProject(user, project) && confirm(`Are you sure you want to delete "${projectTitle}"? This action cannot be undone.`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const handleMarkComplete = (projectId: number, projectTitle: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    const project = projects?.find(p => p.id === projectId);
    if (project && canEditProject(user, project) && confirm(`Mark "${projectTitle}" as completed?`)) {
      updateProjectMutation.mutate({ id: projectId, status: 'completed' });
      toast({
        title: "Project completed!",
        description: `"${projectTitle}" has been marked as completed.`
      });
    }
  };

  const handleStatusQuickChange = (projectId: number, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    const project = projects?.find(p => p.id === projectId);
    if (project && canEditProject(user, project)) {
      updateProjectMutation.mutate({ id: projectId, status: newStatus });
      toast({
        title: "Status updated",
        description: `Project status changed to ${newStatus.replace('_', ' ')}`
      });
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProject.title?.trim()) {
      // Add creator information to the project
      const projectWithCreator = {
        ...newProject,
        createdBy: user?.id || '',
        createdByName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || ''
      };
      createProjectMutation.mutate(projectWithCreator);
    }
  };

  const resetForm = () => {
    setNewProject({
      title: '',
      description: '',
      status: 'available',
      priority: 'medium',
      category: 'general',
      assigneeName: '',
      dueDate: '',
      startDate: '',
      estimatedHours: 0,
      actualHours: 0,
      budget: ''
    });
  };

  const filterProjectsByStatus = (status: string) => {
    if (status === "active") {
      return projects.filter((project: Project) => project.status === "in_progress");
    }
    return projects.filter((project: Project) => project.status === status);
  };

  const activeProjects = filterProjectsByStatus("active");
  const availableProjects = filterProjectsByStatus("available");
  const waitingProjects = filterProjectsByStatus("waiting");
  const completedProjects = filterProjectsByStatus("completed");

  const renderProjectCard = (project: Project) => (
    <Card 
      key={project.id} 
      className="hover:shadow-md transition-shadow cursor-pointer project-card"
      onClick={() => handleProjectClick(project.id)}
    >
      <CardContent className="p-4">
        {/* Header with title and badges */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-base font-semibold text-slate-900 line-clamp-2 leading-tight">
              {project.title}
            </h3>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
              {project.description}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1 shrink-0">
              <Badge className={`${getPriorityColor(project.priority)} text-xs px-2 py-1 badge`}>
                {project.priority}
              </Badge>
              <Badge variant="outline" className={`${getStatusColor(project.status)} text-xs px-2 py-1 badge`}>
                {getStatusIcon(project.status)}
                <span className="ml-1 capitalize">{project.status.replace('_', ' ')}</span>
              </Badge>
            </div>
            {canEditProject(user, project) && (
              <div className="flex gap-1 ml-1">
                {/* Quick Complete Button for non-completed projects */}
                {project.status !== 'completed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleMarkComplete(project.id, project.title, e)}
                    className="h-8 w-8 p-0 hover:bg-green-50"
                    title="Mark as completed"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </Button>
                )}
                
                {/* Status Change Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8 p-0 hover:bg-gray-50"
                      title="Change status"
                    >
                      <Settings className="h-4 w-4 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem 
                      onClick={(e) => handleStatusQuickChange(project.id, 'available', e)}
                    >
                      <Circle className="w-4 h-4 mr-2 text-purple-600" />
                      Available
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleStatusQuickChange(project.id, 'in_progress', e)}
                    >
                      <Play className="w-4 h-4 mr-2 text-blue-600" />
                      In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleStatusQuickChange(project.id, 'waiting', e)}
                    >
                      <Pause className="w-4 h-4 mr-2 text-gray-600" />
                      Waiting
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleStatusQuickChange(project.id, 'completed', e)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                      Completed
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => handleEditProject(project, e)}
                    >
                      <Edit className="w-4 h-4 mr-2 text-blue-600" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleDeleteProject(project.id, project.title, e)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* Assignment and Date */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center min-w-0">
            <User className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm text-slate-600 truncate min-w-0 flex-1">
              {project.assigneeName ? project.assigneeName.split(', ').slice(0, 2).join(', ') + (project.assigneeName.split(', ').length > 2 ? '...' : '') : 'Unassigned'}
            </span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm text-slate-600">{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No due date'}</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Progress</span>
            <span className="font-medium text-slate-900">{(project as any).progress || 0}%</span>
          </div>
          <Progress value={(project as any).progress || 0} className="h-2 progress-bar" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 card-footer">
          <div className="text-xs text-slate-500">
            Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No date'}
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center">
            <img src={sandwichLogo} alt="Sandwich Logo" className="w-6 h-6 mr-2" />
            Project Management
          </h2>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">Organize and track all team projects</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)} 
          disabled={!hasPermission(user, PERMISSIONS.CREATE_PROJECTS)}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Simple Mobile-First Tab Navigation */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button
            variant={activeTab === "active" ? "default" : "outline"}
            onClick={() => setActiveTab("active")}
            className="flex flex-col items-center p-4 h-16 text-xs"
          >
            <Play className="w-4 h-4 mb-1" />
            <span>Active ({activeProjects.length})</span>
          </Button>
          <Button
            variant={activeTab === "available" ? "default" : "outline"}
            onClick={() => setActiveTab("available")}
            className="flex flex-col items-center p-4 h-16 text-xs"
          >
            <Circle className="w-4 h-4 mb-1" />
            <span>Available ({availableProjects.length})</span>
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button
            variant={activeTab === "waiting" ? "default" : "outline"}
            onClick={() => setActiveTab("waiting")}
            className="flex flex-col items-center p-4 h-16 text-xs"
          >
            <Pause className="w-4 h-4 mb-1" />
            <span>Waiting ({waitingProjects.length})</span>
          </Button>
          <Button
            variant={activeTab === "completed" ? "default" : "outline"}
            onClick={() => setActiveTab("completed")}
            className="flex flex-col items-center p-4 h-16 text-xs"
          >
            <CheckCircle2 className="w-4 h-4 mb-1" />
            <span>Done ({completedProjects.length})</span>
          </Button>
        </div>
      </div>
      
      {/* Project Content */}
      <div className="mt-6">
        {activeTab === "active" && (
          <>
            {activeProjects.length === 0 ? (
              <div className="text-center py-12">
                <Play className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No active projects</h3>
                <p className="text-slate-500">Start working on available projects or create a new one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {activeProjects.map(renderProjectCard)}
              </div>
            )}
          </>
        )}
        
        {activeTab === "available" && (
          <>
            {availableProjects.length === 0 ? (
              <div className="text-center py-12">
                <Circle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No available projects</h3>
                <p className="text-slate-500">All projects are either active or completed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {availableProjects.map(renderProjectCard)}
              </div>
            )}
          </>
        )}
        
        {activeTab === "waiting" && (
          <>
            {waitingProjects.length === 0 ? (
              <div className="text-center py-12">
                <Pause className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No waiting projects</h3>
                <p className="text-slate-500">No projects are currently on hold.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {waitingProjects.map(renderProjectCard)}
              </div>
            )}
          </>
        )}
        
        {activeTab === "completed" && (
          <>
            {completedProjects.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No completed projects</h3>
                <p className="text-slate-500">Completed projects will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {completedProjects.map(renderProjectCard)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Create New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={newProject.title || ''}
                  onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="Enter project title"
                  className="h-11 text-base"
                />
              </div>
              
              <div className="sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProject.description || ''}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe the project goals and requirements"
                  className="text-base"
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={newProject.status} onValueChange={(value) => setNewProject(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newProject.priority} onValueChange={(value) => setNewProject(prev => ({ ...prev, priority: value }))}>
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
                <Select value={newProject.category} onValueChange={(value) => setNewProject(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="fundraising">Fundraising</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <ProjectAssigneeSelector
                  value={newProject.assigneeName || ''}
                  onChange={(value, userIds) => setNewProject(prev => ({ 
                    ...prev, 
                    assigneeName: value,
                    assigneeIds: userIds?.length ? userIds : undefined,
                    assigneeNames: value // Store the display names as well
                  }))}
                  label="Team Members"
                  placeholder="Add team members (multiple allowed)"
                  multiple={true}
                />
              </div>
              
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newProject.startDate || ''}
                  onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newProject.dueDate || ''}
                  onChange={(e) => setNewProject(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min="0"
                  value={newProject.estimatedHours || ''}
                  onChange={(e) => setNewProject(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  type="text"
                  value={newProject.budget || ''}
                  onChange={(e) => setNewProject(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="e.g., $500 or TBD"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createProjectMutation.isPending || !newProject.title?.trim()}
                className="btn-tsp-primary text-white"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingProject?.title || ''}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, title: e.target.value } : null)}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingProject?.description || ''}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editingProject?.status || ''} 
                  onValueChange={(value) => setEditingProject(prev => prev ? { ...prev, status: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select 
                  value={editingProject?.priority || ''} 
                  onValueChange={(value) => setEditingProject(prev => prev ? { ...prev, priority: value } : null)}
                >
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
                <Label htmlFor="edit-category">Category</Label>
                <Select 
                  value={editingProject?.category || ''} 
                  onValueChange={(value) => setEditingProject(prev => prev ? { ...prev, category: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="fundraising">Fundraising</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <ProjectAssigneeSelector
                  value={editingProject?.assigneeName || ''}
                  onChange={(value, userIds) => setEditingProject(prev => prev ? { 
                    ...prev, 
                    assigneeName: value,
                    assigneeIds: userIds?.length ? userIds : undefined,
                    assigneeNames: value // Store the display names as well
                  } : null)}
                  label="Team Members"
                  placeholder="Add team members (multiple allowed)"
                  multiple={true}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={editingProject?.startDate || ''}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-dueDate">Due Date</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editingProject?.dueDate || ''}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-estimatedHours">Estimated Hours</Label>
                <Input
                  id="edit-estimatedHours"
                  type="number"
                  min="0"
                  value={editingProject?.estimatedHours || ''}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, estimatedHours: parseInt(e.target.value) || 0 } : null)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-budget">Budget</Label>
                <Input
                  id="edit-budget"
                  type="text"
                  value={editingProject?.budget || ''}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, budget: e.target.value } : null)}
                  placeholder="e.g., $500 or TBD"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingProject(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={editProjectMutation.isPending || !editingProject?.title?.trim()}
                className="btn-tsp-primary text-white"
              >
                {editProjectMutation.isPending ? "Updating..." : "Update Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}