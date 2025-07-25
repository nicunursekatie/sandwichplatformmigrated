import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ListTodo, Plus, X, Edit, Trash2, Upload, File, ExternalLink, Play, Circle, Pause, CheckCircle2, Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { queryClient } from "@/lib/queryClient";
import type { Project } from "@shared/schema";

interface ProjectListProps {
  onProjectSelect?: (projectId: number) => void;
}

export default function ProjectList({ onProjectSelect }: ProjectListProps = {}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [claimingProjectId, setClaimingProjectId] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [assigneeName, setAssigneeName] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    status: "available",
    priority: "medium",
    category: "general",
    assigneeId: null,
    assigneeName: "",
    dueDate: "",
    startDate: "",
    estimatedHours: "",
    actualHours: "",
    progress: 0,
    notes: "",
    tags: "",
    dependencies: "",
    resources: "",
    milestones: "",
    riskAssessment: "",
    successCriteria: ""
  });
  
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const claimProjectMutation = useMutation({
    mutationFn: async ({ projectId, assigneeName }: { projectId: number; assigneeName: string }) => {
      const { error } = await supabase
        .from('projects')
        .update({ 
          assignee_name: assigneeName,
          status: 'in_progress'
        })
        .eq('id', projectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setClaimingProjectId(null);
      setAssigneeName("");
      toast({
        title: "Project claimed successfully",
        description: "The project has been assigned.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to claim project",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: typeof newProject) => {
      const transformedData = {
        title: projectData.title,
        description: projectData.description || null,
        status: projectData.status,
        priority: projectData.priority,
        category: projectData.category,
        assignee_name: projectData.assigneeName || null,
        due_date: projectData.dueDate || null,
        start_date: projectData.startDate || null,
        estimated_hours: projectData.estimatedHours ? parseInt(projectData.estimatedHours) || null : null,
        actual_hours: projectData.actualHours ? parseInt(projectData.actualHours) || null : null,
        progress_percentage: parseInt(projectData.progress.toString()) || 0,
        notes: projectData.notes || null,
        tags: projectData.tags || null
      };
      
      const { data, error } = await supabase
        .from('projects')
        .insert(transformedData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setNewProject({
        title: "",
        description: "",
        status: "available",
        priority: "medium",
        category: "general",
        assigneeId: null,
        assigneeName: "",
        dueDate: "",
        startDate: "",
        estimatedHours: "",
        actualHours: "",
        progress: 0,
        notes: "",
        tags: "",
        dependencies: "",
        resources: "",
        milestones: "",
        riskAssessment: "",
        successCriteria: ""
      });
      setShowAddForm(false);
      toast({
        title: "Project created successfully",
        description: "The new project has been added to the list.",
      });
    },
    onError: (error) => {
      console.error("Project creation error:", error);
      toast({
        title: "Failed to create project",
        description: "Please check your input and try again.",
        variant: "destructive"
      });
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<Project>) => {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditingProject(null);
      toast({
        title: "Project updated successfully",
        description: "The project has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update project",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .select(); // Add select to get the deleted row back
      
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('No project was deleted - the project may not exist or you may not have permission to delete it');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Project deleted successfully",
        description: "The project has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete project",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a project title.",
        variant: "destructive"
      });
      return;
    }
    createProjectMutation.mutate(newProject);
  };

  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a project title.",
        variant: "destructive"
      });
      return;
    }
    
    const updatedProject = { ...editingProject };
    if (updatedProject.assigneeName && updatedProject.assigneeName.trim() && updatedProject.status === "available") {
      updatedProject.status = "in_progress";
    } else if (!updatedProject.assigneeName && updatedProject.status === "in_progress") {
      updatedProject.status = "available";
    }
    
    updateProjectMutation.mutate(updatedProject);
  };

  const handleDeleteProject = (id: number, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      deleteProjectMutation.mutate(id);
    }
  };

  const handleClaimProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeName.trim()) {
      toast({
        title: "Missing assignee name",
        description: "Please enter the name of the person claiming this project.",
        variant: "destructive"
      });
      return;
    }
    if (claimingProjectId) {
      claimProjectMutation.mutate({ projectId: claimingProjectId, assigneeName });
    }
  };

  const startClaimingProject = (projectId: number) => {
    setClaimingProjectId(projectId);
    setAssigneeName("");
  };

  const startEditingProject = (project: Project) => {
    setEditingProject(project);
    setShowAddForm(false);
  };

  const handleProjectClick = (projectId: number) => {
    if (onProjectSelect) {
      onProjectSelect(projectId);
    } else {
      setLocation(`/projects/${projectId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "in_progress": return "bg-amber-500";
      case "planning": return "bg-blue-500";
      case "completed": return "bg-gray-500";
      default: return "bg-blue-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available": return "px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full";
      case "in_progress": return "px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full";
      case "planning": return "px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full";
      case "completed": return "px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full";
      default: return "px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available": return "Available";
      case "in_progress": return "In Progress";
      case "planning": return "Planning";
      case "completed": return "Completed";
      default: return status;
    }
  };

  const getStatusCounts = () => {
    const counts = {
      active: 0,
      available: 0,
      waiting: 0,
      done: 0
    };
    
    projects.forEach(project => {
      if (project.status === "in_progress" || project.status === "planning") {
        counts.active++;
      } else if (project.status === "available") {
        counts.available++;
      } else if (project.status === "completed") {
        counts.done++;
      } else {
        counts.waiting++;
      }
    });
    
    return counts;
  };

  const statusCounts = getStatusCounts();

  const getFilteredProjects = () => {
    switch (activeFilter) {
      case "active":
        return projects.filter(p => p.status === "in_progress" || p.status === "planning");
      case "available":
        return projects.filter(p => p.status === "available");
      case "waiting":
        return projects.filter(p => p.status !== "in_progress" && p.status !== "planning" && p.status !== "available" && p.status !== "completed");
      case "done":
        return projects.filter(p => p.status === "completed");
      default:
        return projects;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="h-6 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="p-6 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const availableProjects = projects.filter(p => p.status === "available");
  const filteredProjects = getFilteredProjects();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ListTodo className="mr-3 h-8 w-8" />
            Project Management
          </h1>
          <p className="text-gray-600">Organize and track all team projects</p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Status Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveFilter(activeFilter === "active" ? "all" : "active")}
          className={`p-4 rounded-lg shadow-sm transition-all duration-200 ${
            activeFilter === "active" 
              ? "bg-blue-600 text-white transform scale-105" 
              : "bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${activeFilter === "active" ? "text-white" : "text-gray-600"}`}>Active</p>
              <p className={`text-2xl font-bold ${activeFilter === "active" ? "text-white" : "text-gray-900"}`}>{statusCounts.active}</p>
            </div>
            <Play className={`h-8 w-8 ${activeFilter === "active" ? "opacity-80" : "text-gray-400"}`} />
          </div>
        </button>
        
        <button
          onClick={() => setActiveFilter(activeFilter === "available" ? "all" : "available")}
          className={`p-4 rounded-lg shadow-sm transition-all duration-200 ${
            activeFilter === "available" 
              ? "bg-green-600 text-white transform scale-105" 
              : "bg-white border border-gray-200 hover:bg-green-50 hover:border-green-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${activeFilter === "available" ? "text-white" : "text-gray-600"}`}>Available</p>
              <p className={`text-2xl font-bold ${activeFilter === "available" ? "text-white" : "text-gray-900"}`}>{statusCounts.available}</p>
            </div>
            <Circle className={`h-8 w-8 ${activeFilter === "available" ? "opacity-80" : "text-gray-400"}`} />
          </div>
        </button>
        
        <button
          onClick={() => setActiveFilter(activeFilter === "waiting" ? "all" : "waiting")}
          className={`p-4 rounded-lg shadow-sm transition-all duration-200 ${
            activeFilter === "waiting" 
              ? "bg-yellow-600 text-white transform scale-105" 
              : "bg-white border border-gray-200 hover:bg-yellow-50 hover:border-yellow-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${activeFilter === "waiting" ? "text-white" : "text-gray-600"}`}>Waiting</p>
              <p className={`text-2xl font-bold ${activeFilter === "waiting" ? "text-white" : "text-gray-900"}`}>{statusCounts.waiting}</p>
            </div>
            <Pause className={`h-8 w-8 ${activeFilter === "waiting" ? "opacity-80" : "text-gray-400"}`} />
          </div>
        </button>
        
        <button
          onClick={() => setActiveFilter(activeFilter === "done" ? "all" : "done")}
          className={`p-4 rounded-lg shadow-sm transition-all duration-200 ${
            activeFilter === "done" 
              ? "bg-gray-600 text-white transform scale-105" 
              : "bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${activeFilter === "done" ? "text-white" : "text-gray-600"}`}>Done</p>
              <p className={`text-2xl font-bold ${activeFilter === "done" ? "text-white" : "text-gray-900"}`}>{statusCounts.done}</p>
            </div>
            <CheckCircle2 className={`h-8 w-8 ${activeFilter === "done" ? "opacity-80" : "text-gray-400"}`} />
          </div>
        </button>
      </div>

      {/* Available Projects Section */}
      {availableProjects.length > 0 && activeFilter === "all" && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 shadow-sm">
          <div className="px-6 py-4 border-b border-green-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-green-900 flex items-center">
              <ListTodo className="text-green-600 mr-2 w-5 h-5" />
              Available Projects - Ready to Claim!
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-green-700 font-medium bg-green-100 px-2 py-1 rounded-full">
                {availableProjects.length} available
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {availableProjects.map((project) => (
                <div key={project.id} className="bg-white p-4 rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 
                          className="text-base font-semibold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => handleProjectClick(project.id)}
                        >
                          {project.title}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Available
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-slate-600 mb-3 text-sm leading-relaxed">{project.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded">{project.category}</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">{project.priority} priority</span>
                        {project.dueDate && (
                          <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                        )}
                        {project.estimatedHours && (
                          <span>Est: {project.estimatedHours}h</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {claimingProjectId === project.id ? (
                        <div className="text-sm text-green-600 font-medium">Setting up claim...</div>
                      ) : (
                        <Button
                          onClick={() => startClaimingProject(project.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white font-medium"
                        >
                          Claim This Project
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Claim form */}
                  {claimingProjectId === project.id && (
                    <div className="mt-4 pt-4 border-t border-green-200 bg-green-25">
                      <form onSubmit={handleClaimProject} className="flex items-center gap-3">
                        <div className="flex-1">
                          <Label htmlFor="assignee-name" className="text-sm font-medium text-slate-700 mb-1 block">
                            Your name (who is claiming this project):
                          </Label>
                          <Input
                            id="assignee-name"
                            type="text"
                            placeholder="Enter your name"
                            value={assigneeName}
                            onChange={(e) => setAssigneeName(e.target.value)}
                            className="text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2 mt-6">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={claimProjectMutation.isPending || !assigneeName.trim()}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {claimProjectMutation.isPending ? "Claiming..." : "Claim Project"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setClaimingProjectId(null)}
                            disabled={claimProjectMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Projects Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center">
            <ListTodo className="text-blue-500 mr-2 w-5 h-5" />
            {activeFilter === "all" ? "All Projects" : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Projects`}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{filteredProjects.length} {activeFilter === "all" ? "total" : activeFilter}</span>
          </div>
        </div>
        <div className="p-6">
        {/* Add Project Form */}
        {showAddForm && (
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-900">Add New Project</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project-title" className="text-sm font-medium text-slate-700">
                    Project Title
                  </Label>
                  <Input
                    id="project-title"
                    type="text"
                    placeholder="Enter project title"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="project-category" className="text-sm font-medium text-slate-700">
                    Category
                  </Label>
                  <Select 
                    value={newProject.category} 
                    onValueChange={(value) => setNewProject({ ...newProject, category: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="outreach">Outreach</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                      <SelectItem value="fundraising">Fundraising</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="project-priority" className="text-sm font-medium text-slate-700">
                    Priority
                  </Label>
                  <Select 
                    value={newProject.priority} 
                    onValueChange={(value) => setNewProject({ ...newProject, priority: value })}
                  >
                    <SelectTrigger className="mt-1">
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
                  <Label htmlFor="project-status" className="text-sm font-medium text-slate-700">
                    Status
                  </Label>
                  <Select 
                    value={newProject.status} 
                    onValueChange={(value) => setNewProject({ ...newProject, status: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignee-name" className="text-sm font-medium text-slate-700">
                    Assignee Name
                  </Label>
                  <Input
                    id="assignee-name"
                    type="text"
                    placeholder="Person responsible for this project"
                    value={newProject.assigneeName}
                    onChange={(e) => setNewProject({ ...newProject, assigneeName: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="start-date" className="text-sm font-medium text-slate-700">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="due-date" className="text-sm font-medium text-slate-700">
                    Due Date
                  </Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={newProject.dueDate}
                    onChange={(e) => setNewProject({ ...newProject, dueDate: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="estimated-hours" className="text-sm font-medium text-slate-700">
                    Estimated Hours
                  </Label>
                  <Input
                    id="estimated-hours"
                    type="number"
                    placeholder="0"
                    value={newProject.estimatedHours}
                    onChange={(e) => setNewProject({ ...newProject, estimatedHours: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="project-description" className="text-sm font-medium text-slate-700">
                  Description
                </Label>
                <Textarea
                  id="project-description"
                  placeholder="Describe the project details and requirements"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tags" className="text-sm font-medium text-slate-700">
                    Tags (comma-separated)
                  </Label>
                  <Input
                    id="tags"
                    type="text"
                    placeholder="volunteer, urgent, community"
                    value={newProject.tags}
                    onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="dependencies" className="text-sm font-medium text-slate-700">
                    Dependencies
                  </Label>
                  <Input
                    id="dependencies"
                    type="text"
                    placeholder="Other projects or resources needed"
                    value={newProject.dependencies}
                    onChange={(e) => setNewProject({ ...newProject, dependencies: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="resources" className="text-sm font-medium text-slate-700">
                  Required Resources
                </Label>
                <Textarea
                  id="resources"
                  placeholder="Materials, tools, or support needed for this project"
                  value={newProject.resources}
                  onChange={(e) => setNewProject({ ...newProject, resources: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="success-criteria" className="text-sm font-medium text-slate-700">
                  Success Criteria
                </Label>
                <Textarea
                  id="success-criteria"
                  placeholder="How will we know this project is successful?"
                  value={newProject.successCriteria}
                  onChange={(e) => setNewProject({ ...newProject, successCriteria: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-medium text-slate-700">
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information or comments"
                  value={newProject.notes}
                  onChange={(e) => setNewProject({ ...newProject, notes: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  disabled={createProjectMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProjectMutation.isPending || !newProject.title.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleProjectClick(project.id)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {project.title}
                    </h3>
                    <span className={getStatusBadge(project.status)}>
                      {getStatusText(project.status)}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-slate-600 mb-3 text-sm leading-relaxed">{project.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="bg-slate-100 px-2 py-1 rounded">{project.category}</span>
                    <span className="bg-slate-100 px-2 py-1 rounded">{project.priority} priority</span>
                    {project.dueDate && (
                      <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                    )}
                    {project.estimatedHours && (
                      <span>Est: {project.estimatedHours}h</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {project.status === "available" ? (
                    claimingProjectId === project.id ? (
                      <div className="text-sm text-slate-500">Claiming...</div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          startClaimingProject(project.id);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                      >
                        Claim
                      </Button>
                    )
                  ) : project.assigneeName ? (
                    <span className="text-sm text-slate-500">Assigned to {project.assigneeName}</span>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingProject(project);
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id, project.title);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              
              {/* Claim form */}
              {claimingProjectId === project.id && (
                <div className="px-3 pb-3 border-t border-slate-200 bg-slate-25">
                  <form onSubmit={handleClaimProject} className="flex items-center gap-2 pt-3">
                    <div className="flex-1">
                      <Label htmlFor="assignee-name" className="sr-only">
                        Assignee Name
                      </Label>
                      <Input
                        id="assignee-name"
                        type="text"
                        placeholder="Enter assignee name"
                        value={assigneeName}
                        onChange={(e) => setAssigneeName(e.target.value)}
                        className="text-sm"
                        autoFocus
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={claimProjectMutation.isPending || !assigneeName.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {claimProjectMutation.isPending ? "Claiming..." : "Assign"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setClaimingProjectId(null)}
                      disabled={claimProjectMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Edit Project Modal */}
        {editingProject && (
          <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
            <DialogContent className="max-w-2xl" aria-describedby="edit-project-description">
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
              </DialogHeader>
              <p id="edit-project-description" className="text-sm text-slate-600 mb-4">
                Update project details, assignment, and timeline.
              </p>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-title" className="text-sm font-medium text-slate-700">
                      Title
                    </Label>
                    <Input
                      id="edit-title"
                      type="text"
                      placeholder="Project title"
                      value={editingProject.title || ""}
                      onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-status" className="text-sm font-medium text-slate-700">
                      Status
                    </Label>
                    <Select 
                      value={editingProject.status} 
                      onValueChange={(value) => setEditingProject({ ...editingProject, status: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-assignee" className="text-sm font-medium text-slate-700">
                      Assigned To
                    </Label>
                    <Input
                      id="edit-assignee"
                      type="text"
                      placeholder="Assignee name"
                      value={editingProject.assigneeName || ""}
                      onChange={(e) => setEditingProject({ ...editingProject, assigneeName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-due-date" className="text-sm font-medium text-slate-700">
                      Due Date
                    </Label>
                    <Input
                      id="edit-due-date"
                      type="date"
                      value={editingProject.dueDate || ""}
                      onChange={(e) => setEditingProject({ ...editingProject, dueDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-description" className="text-sm font-medium text-slate-700">
                    Description
                  </Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Project description"
                    value={editingProject.description || ""}
                    onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingProject(null)}
                    disabled={updateProjectMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProjectMutation.isPending || !editingProject.title?.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>
    </div>
  );
}