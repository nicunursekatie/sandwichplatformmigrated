import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCelebration, CelebrationToast } from "@/components/celebration-toast";
import { hasPermission, USER_ROLES, PERMISSIONS, getDefaultPermissionsForRole, getRoleDisplayName } from "@shared/auth-utils";
import { queryClient } from "@/lib/queryClient";
import { supabase } from '@/lib/supabase';
import { 
  Users, Shield, Settings, Key, Award, Megaphone, Trash2, Bug, 
  Search, Filter, ChevronDown, ChevronUp, Mail, Calendar, 
  UserCheck, UserX, MoreVertical, Download, Upload, UserPlus,
  AlertCircle, CheckCircle2, XCircle
} from "lucide-react";
import AnnouncementManager from "@/components/announcement-manager";
import AuthDebug from "@/components/auth-debug";
import { UserPermissionsDialogRedesigned as UserPermissionsDialog } from "@/components/user-permissions-dialog-redesigned";
import PermissionTemplatesManager from "@/components/permission-templates-manager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function UserManagementRedesigned() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { celebration, triggerCelebration, hideCelebration } = useCelebration();
  const [activeTab, setActiveTab] = useState<"users" | "templates" | "announcements" | "auth-debug">("users");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "lastLogin">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }
      
      return (data || []).map(user => ({
        id: user.id,
        email: user.email || '',
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: user.role || 'viewer',
        permissions: user.permissions || [],
        isActive: user.is_active ?? true,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at
      }));
    },
    enabled: hasPermission(currentUser, PERMISSIONS.VIEW_USERS),
  });

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(user => 
        statusFilter === "active" ? user.isActive : !user.isActive
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case "date":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "lastLogin":
          const aLogin = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const bLogin = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          comparison = aLogin - bLogin;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [users, searchQuery, roleFilter, statusFilter, sortBy, sortOrder]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string; permissions: string[] }) => {
      const { error } = await supabase
        .from('users')
        .update({
          role: data.role,
          permissions: data.permissions,
        })
        .eq('id', data.userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User Updated",
        description: "User permissions have been successfully updated.",
      });
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async (data: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('users')
        .update({
          is_active: data.isActive,
        })
        .eq('id', data.userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User Status Updated",
        description: "User status has been successfully changed.",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.refetchQueries({ queryKey: ["users"] });
      toast({
        title: "User Deleted",
        description: "User has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { userIds: string[]; action: string; value?: any }) => {
      if (data.action === "delete") {
        const { error } = await supabase
          .from('users')
          .delete()
          .in('id', data.userIds);
        if (error) throw error;
      } else if (data.action === "activate" || data.action === "deactivate") {
        const { error } = await supabase
          .from('users')
          .update({ is_active: data.action === "activate" })
          .in('id', data.userIds);
        if (error) throw error;
      } else if (data.action === "changeRole") {
        const { error } = await supabase
          .from('users')
          .update({ role: data.value })
          .in('id', data.userIds);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      const actionText = variables.action === "delete" ? "deleted" : 
                        variables.action === "activate" ? "activated" :
                        variables.action === "deactivate" ? "deactivated" : "updated";
      toast({
        title: "Bulk Action Completed",
        description: `${variables.userIds.length} users have been ${actionText}.`,
      });
      setSelectedUsers(new Set());
    },
    onError: (error) => {
      toast({
        title: "Bulk Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasPermission(currentUser, PERMISSIONS.MANAGE_USERS)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You don't have permission to manage users.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case USER_ROLES.COMMITTEE_MEMBER:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case USER_ROLES.VOLUNTEER:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case USER_ROLES.VIEWER:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("users")}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === "users"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Users className="h-4 w-4 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">User Management</span>
            <span className="sm:hidden">Users</span>
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === "templates"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Shield className="h-4 w-4 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Permission Templates</span>
            <span className="sm:hidden">Templates</span>
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === "announcements"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Megaphone className="h-4 w-4 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Announcements</span>
            <span className="sm:hidden">Announce</span>
          </button>
          <button
            onClick={() => setActiveTab("auth-debug")}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === "auth-debug"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Bug className="h-4 w-4 inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Auth Debug</span>
            <span className="sm:hidden">Debug</span>
          </button>
        </nav>
      </div>

      {activeTab === "templates" ? (
        <PermissionTemplatesManager />
      ) : activeTab === "announcements" ? (
        <AnnouncementManager />
      ) : activeTab === "auth-debug" ? (
        <AuthDebug />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Users className="h-6 w-6" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage team members, roles, and permissions
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Import users from CSV</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export user list to CSV</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters and Search */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value={USER_ROLES.ADMIN}>Admin</SelectItem>
                      <SelectItem value={USER_ROLES.COMMITTEE_MEMBER}>Committee</SelectItem>
                      <SelectItem value={USER_ROLES.VOLUNTEER}>Volunteer</SelectItem>
                      <SelectItem value={USER_ROLES.VIEWER}>Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedUsers.size > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bulkUpdateMutation.mutate({
                        userIds: Array.from(selectedUsers),
                        action: "activate"
                      })}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bulkUpdateMutation.mutate({
                        userIds: Array.from(selectedUsers),
                        action: "deactivate"
                      })}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Change Role
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({
                          userIds: Array.from(selectedUsers),
                          action: "changeRole",
                          value: USER_ROLES.ADMIN
                        })}>
                          Set as Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({
                          userIds: Array.from(selectedUsers),
                          action: "changeRole",
                          value: USER_ROLES.COMMITTEE_MEMBER
                        })}>
                          Set as Committee
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({
                          userIds: Array.from(selectedUsers),
                          action: "changeRole",
                          value: USER_ROLES.VOLUNTEER
                        })}>
                          Set as Volunteer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({
                          userIds: Array.from(selectedUsers),
                          action: "changeRole",
                          value: USER_ROLES.VIEWER
                        })}>
                          Set as Viewer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        const confirmDelete = window.confirm(
                          `Are you sure you want to delete ${selectedUsers.size} users? This action cannot be undone.`
                        );
                        if (confirmDelete) {
                          bulkUpdateMutation.mutate({
                            userIds: Array.from(selectedUsers),
                            action: "delete"
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* User Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Users</p>
                      <p className="text-2xl font-bold">{users.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Active</p>
                      <p className="text-2xl font-bold">{users.filter(u => u.isActive).length}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Inactive</p>
                      <p className="text-2xl font-bold">{users.filter(u => !u.isActive).length}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">New This Month</p>
                      <p className="text-2xl font-bold">
                        {users.filter(u => {
                          const createdDate = new Date(u.createdAt);
                          const oneMonthAgo = new Date();
                          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                          return createdDate > oneMonthAgo;
                        }).length}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User List */}
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="p-4 text-left">
                        <Checkbox
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="p-4 text-left">
                        <button
                          className="flex items-center gap-1 font-medium text-sm"
                          onClick={() => {
                            setSortBy("name");
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          }}
                        >
                          User
                          {sortBy === "name" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="p-4 text-left">Role</th>
                      <th className="p-4 text-left">Status</th>
                      <th className="p-4 text-left">
                        <button
                          className="flex items-center gap-1 font-medium text-sm"
                          onClick={() => {
                            setSortBy("lastLogin");
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          }}
                        >
                          Last Login
                          {sortBy === "lastLogin" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="p-4 text-left">
                        <button
                          className="flex items-center gap-1 font-medium text-sm"
                          onClick={() => {
                            setSortBy("date");
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          }}
                        >
                          Joined
                          {sortBy === "date" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => handleSelectUser(user.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {user.isActive ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-500">Inactive</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            {user.lastLoginAt ? (
                              <div>
                                <div>{new Date(user.lastLoginAt).toLocaleDateString()}</div>
                                <div className="text-gray-500">
                                  {new Date(user.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">Never</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const achievements = [
                                        "making a real difference in our mission",
                                        "way to go"
                                      ];
                                      const randomAchievement = achievements[Math.floor(Math.random() * achievements.length)];
                                      const congratsMessage = `${user.firstName} ${user.lastName} - ${randomAchievement}! From ${currentUser?.firstName || 'Admin'}`;
                                      triggerCelebration(congratsMessage);
                                      toast({
                                        title: "Congratulations Sent!",
                                        description: `Celebrated ${user.firstName} ${user.lastName}'s achievements.`,
                                      });
                                    }}
                                  >
                                    <Award className="h-4 w-4 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Send congratulations</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Edit Permissions
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Key className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleUserStatus.mutate({
                                  userId: user.id,
                                  isActive: !user.isActive
                                })}>
                                  {user.isActive ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => {
                                    const confirmDelete = window.confirm(
                                      `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`
                                    );
                                    if (confirmDelete) {
                                      deleteUserMutation.mutate(user.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Empty State */}
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-500">
                  {searchQuery || roleFilter !== "all" || statusFilter !== "all" 
                    ? "Try adjusting your filters or search terms" 
                    : "No users have been added yet"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Celebration Toast */}
      <CelebrationToast
        isVisible={celebration.isVisible}
        onClose={hideCelebration}
        taskTitle={celebration.taskTitle}
        emoji={celebration.emoji}
        onSendThanks={(message: string) => {
          toast({
            title: "Thank you sent!",
            description: "Your appreciation message has been recorded.",
          });
        }}
      />
      
      {/* User Permissions Dialog */}
      <UserPermissionsDialog
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null);
          }
        }}
        onSave={(userId, role, permissions) => {
          updateUserMutation.mutate({ userId, role, permissions });
        }}
      />
    </div>
  );
}