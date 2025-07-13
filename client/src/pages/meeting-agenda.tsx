import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, ListTodo, Plus, Edit, Trash2, CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { supabaseService } from "@/lib/supabase-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@shared/auth-utils";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

interface AgendaItem {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  estimated_duration: number;
  assigned_to: string;
  status: string;
  submitted_by: string;
  submitted_at: string;
}

interface AgendaItemFormData {
  title: string;
  description: string;
  category: string;
  priority: string;
  estimatedDuration: number;
  assignedTo: string;
  status: string;
  submittedBy: string;
}

export default function MeetingAgenda() {
  const { user } = useAuth();
  const canModifyAgenda = user?.role !== 'committee_member';
  const [, setLocation] = useLocation();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    priority: "medium",
    estimatedDuration: 15,
    assignedTo: "",
    status: "pending",
    submittedBy: user?.firstName || "Admin User"
  });
  const { toast } = useToast();

  const { data: agendaItems = [], isLoading } = useQuery<AgendaItem[]>({
    queryKey: ["agenda-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching agenda items:', error);
        return [];
      }
      
      return data || [];
    }
  });

  const createAgendaItemMutation = useMutation({
    mutationFn: async (data: AgendaItemFormData) => {
      const { data: result, error } = await supabase
        .from('agenda_items')
        .insert({
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          estimated_duration: data.estimatedDuration,
          assigned_to: data.assignedTo,
          status: data.status || 'pending',
          submitted_by: data.submittedBy
        });
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-items"] });
      setIsCreating(false);
      setFormData({
        title: "",
        description: "",
        category: "general",
        priority: "medium",
        estimatedDuration: 15,
        assignedTo: "",
        status: "pending",
        submittedBy: user?.firstName || "Admin User"
      });
      toast({
        title: "Agenda item created",
        description: "New agenda item has been added successfully.",
      });
    },
    onError: (error) => {
      console.error("Create agenda item error:", error);
      toast({
        title: "Error",
        description: "Failed to add agenda item. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateAgendaItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AgendaItemFormData> }) => {
      const { data: result, error } = await supabase
        .from('agenda_items')
        .update({
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          estimated_duration: data.estimatedDuration,
          assigned_to: data.assignedTo,
          status: data.status
        })
        .eq('id', id);
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-items"] });
      setEditingId(null);
      toast({
        title: "Agenda item updated",
        description: "Agenda item has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Update agenda item error:", error);
      toast({
        title: "Error",
        description: "Failed to update agenda item. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteAgendaItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('agenda_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-items"] });
      toast({
        title: "Agenda item deleted",
        description: "Agenda item has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Delete agenda item error:", error);
      toast({
        title: "Error",
        description: "Failed to delete agenda item. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAgendaItemMutation.mutate({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      estimatedDuration: formData.estimatedDuration,
      assignedTo: formData.assignedTo,
      status: formData.status,
      submittedBy: formData.submittedBy
    });
  };

  const handleStatusChange = (item: AgendaItem, newStatus: string) => {
    updateAgendaItemMutation.mutate({ 
      id: item.id, 
      data: { status: newStatus } 
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this agenda item?")) {
      deleteAgendaItemMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "postponed": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "rejected": return <Circle className="w-4 h-4 text-red-600" />;
      case "postponed": return <Clock className="w-4 h-4 text-orange-600" />;
      case "pending": return <Circle className="w-4 h-4 text-yellow-600" />;
      default: return <Circle className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const approvedItems = agendaItems.filter((item: AgendaItem) => item.status === "approved").length;
  const pendingItems = agendaItems.filter((item: AgendaItem) => item.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => (window as any).dashboardSetActiveSection?.("meetings")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Meetings Hub
        </Button>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Meetings</span>
          <span>•</span>
          <span className="text-gray-900 dark:text-white font-medium">Agenda</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
            <ListTodo className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Meeting Agenda</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Plan and organize meeting topics and discussions</p>
          </div>
        </div>
        <Button onClick={() => setIsCreating(true)} className="self-start h-10 text-sm">
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">New Agenda Item</span>
          <span className="sm:hidden">New Item</span>
        </Button>
      </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ListTodo className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{agendaItems.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{approvedItems}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{pendingItems}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create Form */}
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle>Create Agenda Item</CardTitle>
                <CardDescription>Add a new topic to the meeting agenda</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Discussion topic or agenda item"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed description of the agenda item"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Submitted By</label>
                    <Input
                      value={formData.submittedBy}
                      onChange={(e) => setFormData({ ...formData, submittedBy: e.target.value })}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createAgendaItemMutation.isPending}>
                      {createAgendaItemMutation.isPending ? "Creating..." : "Create Item"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Agenda Items */}
          <div className="space-y-4">
            {agendaItems.map((item: AgendaItem, index: number) => (
              <Card key={item.id} className={item.status === "approved" ? "border-green-200 bg-green-50 dark:bg-green-900/10" : 
                                            item.status === "rejected" ? "border-red-200 bg-red-50 dark:bg-red-900/10" :
                                            item.status === "postponed" ? "border-orange-200 bg-orange-50 dark:bg-orange-900/10" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0">
                        {getStatusIcon(item.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-3">{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Submitted by: {item.submitted_by}</span>
                          <span>•</span>
                          <span>{new Date(item.submitted_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 ml-4">
                      {item.status === "pending" && canModifyAgenda && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleStatusChange(item, "approved")}
                            disabled={updateAgendaItemMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => handleStatusChange(item, "rejected")}
                            disabled={updateAgendaItemMutation.isPending}
                          >
                            Reject
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-orange-300 text-orange-600 hover:bg-orange-50"
                            onClick={() => handleStatusChange(item, "postponed")}
                            disabled={updateAgendaItemMutation.isPending}
                          >
                            Delay
                          </Button>
                        </div>
                      )}
                      
                      {item.status !== "pending" && canModifyAgenda && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStatusChange(item, "pending")}
                            disabled={updateAgendaItemMutation.isPending}
                          >
                            Reset to Pending
                          </Button>
                        </div>
                      )}
                      
                      {canModifyAgenda && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteAgendaItemMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {agendaItems.length === 0 && !isCreating && (
            <Card>
              <CardContent className="text-center py-12">
                <ListTodo className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No agenda items yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first agenda item to start planning your meeting</p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Item
                </Button>
              </CardContent>
            </Card>
          )}
    </div>
  );
}