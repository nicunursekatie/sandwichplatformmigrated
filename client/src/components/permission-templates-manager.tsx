import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { 
  Settings, Plus, Edit, Trash2, Save, X, Copy, 
  Shield, Users, FileText, ChevronRight, CheckCircle2,
  Sparkles
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PERMISSIONS } from "@shared/auth-utils";

// Permission categories (same as in the dialog)
const PERMISSION_CATEGORIES = [
  {
    id: "chat",
    label: "Chat & Messaging",
    permissions: [
      { key: PERMISSIONS.GENERAL_CHAT, label: "General Chat" },
      { key: PERMISSIONS.COMMITTEE_CHAT, label: "Committee Chat" },
      { key: PERMISSIONS.HOST_CHAT, label: "Host Chat" },
      { key: PERMISSIONS.DRIVER_CHAT, label: "Driver Chat" },
      { key: PERMISSIONS.RECIPIENT_CHAT, label: "Recipient Chat" },
      { key: "core_team_chat", label: "Core Team Chat" },
      { key: "direct_messages", label: "Direct Messages" },
      { key: "group_messages", label: "Group Messages" },
    ],
  },
  {
    id: "data",
    label: "Data Management",
    permissions: [
      { key: PERMISSIONS.VIEW_RECIPIENTS, label: "View Recipients" },
      { key: PERMISSIONS.MANAGE_RECIPIENTS, label: "Manage Recipients" },
      { key: PERMISSIONS.VIEW_HOSTS, label: "View Hosts" },
      { key: PERMISSIONS.MANAGE_HOSTS, label: "Manage Hosts" },
      { key: PERMISSIONS.VIEW_DRIVERS, label: "View Drivers" },
      { key: PERMISSIONS.MANAGE_DRIVERS, label: "Manage Drivers" },
    ],
  },
  {
    id: "collections",
    label: "Operations",
    permissions: [
      { key: PERMISSIONS.VIEW_COLLECTIONS, label: "View Collections" },
      { key: PERMISSIONS.EDIT_COLLECTIONS, label: "Edit Collections" },
      { key: PERMISSIONS.VIEW_PROJECTS, label: "View Projects" },
      { key: PERMISSIONS.MANAGE_PROJECTS, label: "Manage Projects" },
      { key: PERMISSIONS.VIEW_MEETINGS, label: "View Meetings" },
      { key: PERMISSIONS.EDIT_MEETINGS, label: "Edit Meetings" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    permissions: [
      { key: PERMISSIONS.VIEW_ANALYTICS, label: "View Analytics" },
      { key: PERMISSIONS.VIEW_REPORTS, label: "View Reports" },
      { key: PERMISSIONS.EXPORT_DATA, label: "Export Data" },
    ],
  },
  {
    id: "suggestions",
    label: "Feedback",
    permissions: [
      { key: PERMISSIONS.VIEW_SUGGESTIONS, label: "View Suggestions" },
      { key: PERMISSIONS.SUBMIT_SUGGESTIONS, label: "Submit Suggestions" },
      { key: PERMISSIONS.MANAGE_SUGGESTIONS, label: "Manage Suggestions" },
      { key: PERMISSIONS.RESPOND_TO_SUGGESTIONS, label: "Respond to Suggestions" },
    ],
  },
  {
    id: "work_logs",
    label: "Work Logs",
    permissions: [
      { key: PERMISSIONS.LOG_WORK, label: "Log Work" },
      { key: PERMISSIONS.MANAGE_WORK_LOGS, label: "Manage Work Logs" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    permissions: [
      { key: PERMISSIONS.VIEW_USERS, label: "View Users" },
      { key: PERMISSIONS.MANAGE_USERS, label: "Manage Users" },
      { key: PERMISSIONS.VIEW_COMMITTEE, label: "View Committee" },
      { key: PERMISSIONS.MANAGE_ANNOUNCEMENTS, label: "Manage Announcements" },
    ],
  },
];

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PermissionTemplatesManager() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PermissionTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<PermissionTemplate | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<PermissionTemplate[]>({
    queryKey: ["permission-templates"],
    queryFn: async () => {
      // For now, return hardcoded templates
      // In a real implementation, this would fetch from the database
      return [
        {
          id: "admin",
          name: "Administrator",
          description: "Full system access with all permissions",
          permissions: Object.values(PERMISSIONS).concat(["core_team_chat", "direct_messages", "group_messages"]),
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "committee",
          name: "Committee Member",
          description: "Manage operations and view reports",
          permissions: [
            PERMISSIONS.GENERAL_CHAT,
            PERMISSIONS.COMMITTEE_CHAT,
            PERMISSIONS.VIEW_RECIPIENTS,
            PERMISSIONS.VIEW_HOSTS,
            PERMISSIONS.VIEW_DRIVERS,
            PERMISSIONS.VIEW_COLLECTIONS,
            PERMISSIONS.EDIT_COLLECTIONS,
            PERMISSIONS.VIEW_PROJECTS,
            PERMISSIONS.VIEW_MEETINGS,
            PERMISSIONS.VIEW_ANALYTICS,
            PERMISSIONS.VIEW_REPORTS,
            PERMISSIONS.VIEW_SUGGESTIONS,
            PERMISSIONS.SUBMIT_SUGGESTIONS,
          ],
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "volunteer",
          name: "Volunteer",
          description: "Submit data and participate in chats",
          permissions: [
            PERMISSIONS.GENERAL_CHAT,
            PERMISSIONS.VIEW_COLLECTIONS,
            PERMISSIONS.EDIT_COLLECTIONS,
            PERMISSIONS.VIEW_PROJECTS,
            PERMISSIONS.SUBMIT_SUGGESTIONS,
            PERMISSIONS.LOG_WORK,
          ],
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "viewer",
          name: "Viewer",
          description: "Read-only access to most features",
          permissions: [
            PERMISSIONS.GENERAL_CHAT,
            PERMISSIONS.VIEW_RECIPIENTS,
            PERMISSIONS.VIEW_HOSTS,
            PERMISSIONS.VIEW_DRIVERS,
            PERMISSIONS.VIEW_COLLECTIONS,
            PERMISSIONS.VIEW_PROJECTS,
            PERMISSIONS.VIEW_MEETINGS,
            PERMISSIONS.VIEW_ANALYTICS,
            PERMISSIONS.VIEW_REPORTS,
            PERMISSIONS.VIEW_SUGGESTIONS,
          ],
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; permissions: string[] }) => {
      // In a real implementation, this would save to the database
      toast({
        title: "Template Created",
        description: `"${data.name}" template has been created successfully.`,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string; permissions: string[] }) => {
      // In a real implementation, this would update in the database
      toast({
        title: "Template Updated",
        description: `"${data.name}" template has been updated successfully.`,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
      setEditingTemplate(null);
      resetForm();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      // In a real implementation, this would delete from the database
      toast({
        title: "Template Deleted",
        description: "The template has been deleted successfully.",
      });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
      setDeleteTemplate(null);
    },
  });

  const resetForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setSelectedPermissions([]);
  };

  const handleCreateTemplate = () => {
    if (!templateName || selectedPermissions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a name and select at least one permission.",
        variant: "destructive",
      });
      return;
    }

    createTemplateMutation.mutate({
      name: templateName,
      description: templateDescription,
      permissions: selectedPermissions,
    });
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate || !templateName || selectedPermissions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a name and select at least one permission.",
        variant: "destructive",
      });
      return;
    }

    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      name: templateName,
      description: templateDescription,
      permissions: selectedPermissions,
    });
  };

  const handleEditTemplate = (template: PermissionTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description);
    setSelectedPermissions(template.permissions);
  };

  const handleDuplicateTemplate = (template: PermissionTemplate) => {
    setIsCreateOpen(true);
    setTemplateName(`${template.name} (Copy)`);
    setTemplateDescription(template.description);
    setSelectedPermissions(template.permissions);
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const toggleCategory = (categoryPermissions: string[]) => {
    const allSelected = categoryPermissions.every(p => selectedPermissions.includes(p));
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !categoryPermissions.includes(p)));
    } else {
      setSelectedPermissions(prev => {
        const newPerms = [...prev];
        categoryPermissions.forEach(p => {
          if (!newPerms.includes(p)) {
            newPerms.push(p);
          }
        });
        return newPerms;
      });
    }
  };

  const PermissionSelector = () => (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {PERMISSION_CATEGORIES.map(category => {
          const categoryPermissionKeys = category.permissions.map(p => p.key);
          const selectedCount = categoryPermissionKeys.filter(p => selectedPermissions.includes(p)).length;
          const allSelected = selectedCount === category.permissions.length;

          return (
            <div key={category.id} className="space-y-2">
              <div 
                className="flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => toggleCategory(categoryPermissionKeys)}
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className={`h-4 w-4 transition-transform ${allSelected ? 'rotate-90' : ''}`} />
                  <span className="font-medium">{category.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedCount}/{category.permissions.length}
                  </Badge>
                </div>
                {allSelected && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </div>
              <div className="ml-6 space-y-1">
                {category.permissions.map(permission => (
                  <label
                    key={permission.key}
                    className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-900 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.key)}
                      onChange={() => togglePermission(permission.key)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );

  if (isLoading) {
    return <div>Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Permission Templates
              </CardTitle>
              <CardDescription>
                Manage permission templates for quick role assignment
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {templates.map(template => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.isSystem && (
                          <Badge variant="secondary" className="text-xs">
                            System
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateTemplate(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {!template.isSystem && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTemplate(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Shield className="h-4 w-4" />
                    <span>{template.permissions.length} permissions</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingTemplate(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Permission Template' : 'Create Permission Template'}
            </DialogTitle>
            <DialogDescription>
              Define a reusable set of permissions that can be quickly applied to users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Content Manager"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this role is for..."
                rows={3}
              />
            </div>
            <div>
              <Label>Permissions ({selectedPermissions.length} selected)</Label>
              <div className="mt-2 border rounded-lg p-4">
                <PermissionSelector />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateOpen(false);
              setEditingTemplate(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplate && deleteTemplateMutation.mutate(deleteTemplate.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}