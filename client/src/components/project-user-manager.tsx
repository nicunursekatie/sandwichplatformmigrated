import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, UserPlus, UserMinus, Mail, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, PERMISSIONS } from "@shared/auth-utils";
import type { User, Project } from "@shared/schema";

import { supabase } from '@/lib/supabase';
import { queryClient } from "@/lib/queryClient";
import { sendNotification as sendSupabaseNotification } from '@/lib/notifications';
interface ProjectUserManagerProps {
  project: Project;
  onUpdate?: () => void;
}

interface ProjectAssignment {
  id: number;
  projectId: number;
  userId: string;
  role: string;
  assignedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    role: string;
    permissions: any;
    isActive: boolean;
    profileImageUrl?: string;
    metadata?: any;
    lastLoginAt?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export default function ProjectUserManager({ project, onUpdate }: ProjectUserManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = hasPermission(user, PERMISSIONS.EDIT_COLLECTIONS);
  
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("member");
  const [sendNotification, setSendNotification] = useState(true);

  // Fetch all users for assignment with fresh data
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('first_name', { ascending: true });
      
      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }
      
      // Transform snake_case to camelCase for the interface
      return (data || []).map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        displayName: user.display_name || '',
        role: user.role,
        permissions: user.permissions,
        isActive: user.is_active,
        profileImageUrl: user.profile_image_url,
        metadata: user.metadata,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      })) as User[];
    },
    enabled: canEdit,
    staleTime: 0,
    gcTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Fetch current project assignments with fresh data
  const { data: assignments = [], isLoading } = useQuery<ProjectAssignment[]>({
    queryKey: ["project-assignments", project.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_assignments')
        .select(`
          *,
          user:users(*)
        `)
        .eq('project_id', project.id);
      
      if (error) {
        console.error('Error fetching project assignments:', error);
        return [];
      }
      
      // Transform the data to match the expected interface
      return (data || []).map(assignment => ({
        id: assignment.id,
        projectId: assignment.project_id,
        userId: assignment.user_id,
        role: assignment.role,
        assignedAt: assignment.assigned_at || assignment.created_at,
        user: assignment.user ? {
          id: assignment.user.id,
          email: assignment.user.email,
          firstName: assignment.user.first_name || '',
          lastName: assignment.user.last_name || '',
          displayName: assignment.user.display_name || '',
          role: assignment.user.role,
          permissions: assignment.user.permissions,
          isActive: assignment.user.is_active,
          profileImageUrl: assignment.user.profile_image_url,
          metadata: assignment.user.metadata,
          lastLoginAt: assignment.user.last_login_at,
          createdAt: assignment.user.created_at,
          updatedAt: assignment.user.updated_at
        } : undefined
      })) as ProjectAssignment[];
    },
    staleTime: 0,
    gcTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Add user to project mutation
  const addUserMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string; sendNotification: boolean }) => {
      // First, insert the project assignment
      const { data: assignment, error } = await supabase
        .from('project_assignments')
        .insert({
          project_id: project.id,
          user_id: data.userId,
          role: data.role
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Then send notification if requested
      if (data.sendNotification && assignment) {
        try {
          // Get the assigned user's details
          const assignedUser = allUsers.find(u => u.id === data.userId);
          
          if (assignedUser) {
            // Send notification via Supabase
            await sendSupabaseNotification({
              user_id: data.userId,
              type: 'project_assignment',
              title: 'New Project Assignment',
              body: `You have been assigned to the project: ${project.title}`,
              source_id: user?.id,
              related_type: 'project',
              related_id: project.id
            });
          }
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
          // Don't fail the whole operation if notification fails
        }
      }
      
      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "assignments"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-assignments", project.id] });
      setSelectedUserId("");
      setSelectedRole("member");
      setSendNotification(true);
      toast({ title: "User assigned to project successfully" });
      onUpdate?.();
    },
    onError: () => {
      toast({ title: "Failed to assign user", variant: "destructive" });
    },
  });

  // Remove user from project mutation
  const removeUserMutation = useMutation({
    mutationFn: async (data: { userId: string; sendNotification: boolean }) => {
      // Remove the assignment from database
      const { error } = await supabase
        .from('project_assignments')
        .delete()
        .eq('user_id', data.userId)
        .eq('project_id', project.id);
      
      if (error) {
        throw error;
      }
      
      // Send notification if requested
      if (data.sendNotification) {
        try {
          const removedUser = allUsers.find(u => u.id === data.userId);
          
          if (removedUser) {
            await sendSupabaseNotification({
              user_id: data.userId,
              type: 'project_removal',
              title: 'Removed from Project',
              body: `You have been removed from the project: ${project.title}`,
              source_id: user?.id,
              related_type: 'project',
              related_id: project.id
            });
          }
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
        }
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "assignments"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-assignments", project.id] });
      toast({ title: "User removed from project" });
      onUpdate?.();
    },
    onError: () => {
      toast({ title: "Failed to remove user", variant: "destructive" });
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('project_assignments')
        .update({ role: data.role })
        .eq('user_id', data.userId)
        .eq('project_id', project.id);
      
      if (error) {
        throw error;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "assignments"] });
      queryClient.invalidateQueries({ queryKey: ["project-assignments", project.id] });
      toast({ title: "User role updated" });
      onUpdate?.();
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const handleAddUser = () => {
    if (!selectedUserId) return;
    addUserMutation.mutate({
      userId: selectedUserId,
      role: selectedRole,
      sendNotification
    });
  };

  const handleRemoveUser = (userId: string) => {
    if (confirm("Are you sure you want to remove this user from the project?")) {
      removeUserMutation.mutate({
        userId,
        sendNotification: true
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner": return "bg-purple-500 text-white";
      case "member": return "bg-blue-500 text-white";
      case "viewer": return "bg-gray-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const availableUsers = allUsers.filter(u => 
    !assignments.some(a => a.userId === u.id) && u.isActive
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Project Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-slate-500">Loading team members...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Project Team
            </CardTitle>
            <CardDescription>
              {assignments.length} {assignments.length === 1 ? 'member' : 'members'} assigned
            </CardDescription>
          </div>
          {canEdit && (
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Team
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Manage Project Team</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Add New User Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Add Team Member</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Select User</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose user..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Project Owner</SelectItem>
                            <SelectItem value="member">Team Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-end">
                        <Button 
                          onClick={handleAddUser}
                          disabled={!selectedUserId || addUserMutation.isPending}
                          className="w-full"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add User
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="send-notification"
                        checked={sendNotification}
                        onCheckedChange={(checked) => setSendNotification(checked as boolean)}
                      />
                      <Label htmlFor="send-notification" className="text-sm">
                        Send email notification to user
                      </Label>
                    </div>
                  </div>

                  {/* Current Team Members */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Current Team Members</h3>
                    <div className="space-y-3">
                      {assignments.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          No team members assigned yet
                        </div>
                      ) : (
                        assignments.map((assignment) => {
                          const assignedUser = allUsers.find(u => u.id === assignment.userId);
                          if (!assignedUser) return null;
                          
                          return (
                            <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">
                                    {assignedUser.firstName?.[0]}{assignedUser.lastName?.[0]}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {assignedUser.firstName || ''} {assignedUser.lastName || ''}
                                  </div>
                                  <div className="text-sm text-slate-500">{assignedUser.email}</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Select 
                                  value={assignment.role} 
                                  onValueChange={(newRole) => updateRoleMutation.mutate({
                                    userId: assignment.userId,
                                    role: newRole
                                  })}
                                >
                                  <SelectTrigger className="w-32">
                                    <Badge className={getRoleColor(assignment.role)}>
                                      {assignment.role}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="owner">Owner</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveUser(assignment.userId)}
                                  disabled={removeUserMutation.isPending}
                                >
                                  <UserMinus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No team members assigned</p>
              {canEdit && (
                <p className="text-sm">Click "Manage Team" to add members</p>
              )}
            </div>
          ) : (
            assignments.map((assignment) => {
              const assignedUser = assignment.user || allUsers.find(u => u.id === assignment.userId);
              if (!assignedUser) return null;
              
              return (
                <div key={assignment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {assignedUser.firstName?.[0]}{assignedUser.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">
                        {assignedUser.firstName || ''} {assignedUser.lastName || ''}
                      </div>
                      <div className="text-sm text-slate-500">{assignedUser.email}</div>
                    </div>
                  </div>
                  
                  <Badge className={getRoleColor(assignment.role)}>
                    {assignment.role}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}