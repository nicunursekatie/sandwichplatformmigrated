import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  USER_ROLES,
  PERMISSIONS,
  getDefaultPermissionsForRole,
  getRoleDisplayName,
} from "@shared/auth-utils";
import {
  MessageCircle,
  Shield,
  Database,
  Eye,
  Edit,
  UserCog,
  FileText,
  TrendingUp,
  Users,
  Settings,
  ChevronRight,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Copy,
  Sparkles,
  ChevronDown,
  ClipboardList,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
}

interface UserPermissionsDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, role: string, permissions: string[]) => void;
}

// Permission categories with icons and descriptions
const PERMISSION_CATEGORIES = [
  {
    id: "chat",
    label: "Chat & Messaging",
    icon: MessageCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Communication channels and messaging",
    permissions: [
      { key: PERMISSIONS.GENERAL_CHAT, label: "General Chat", description: "Access to general chat room" },
      { key: PERMISSIONS.COMMITTEE_CHAT, label: "Committee Chat", description: "Access to committee chat room" },
      { key: PERMISSIONS.HOST_CHAT, label: "Host Chat", description: "Access to host chat room" },
      { key: PERMISSIONS.DRIVER_CHAT, label: "Driver Chat", description: "Access to driver chat room" },
      { key: PERMISSIONS.RECIPIENT_CHAT, label: "Recipient Chat", description: "Access to recipient chat room" },
      { key: "core_team_chat", label: "Core Team Chat", description: "Access to core team chat room" },
      { key: "direct_messages", label: "Direct Messages", description: "Send and receive direct messages" },
      { key: "group_messages", label: "Group Messages", description: "Create and participate in group messages" },
    ],
  },
  {
    id: "data",
    label: "Data Management",
    icon: Database,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "Manage recipients, hosts, and drivers",
    permissions: [
      { key: PERMISSIONS.VIEW_RECIPIENTS, label: "View Recipients", description: "View recipient information" },
      { key: PERMISSIONS.MANAGE_RECIPIENTS, label: "Manage Recipients", description: "Edit recipient details" },
      { key: PERMISSIONS.VIEW_HOSTS, label: "View Hosts", description: "View host information" },
      { key: PERMISSIONS.MANAGE_HOSTS, label: "Manage Hosts", description: "Edit host details" },
      { key: PERMISSIONS.VIEW_DRIVERS, label: "View Drivers", description: "View driver information" },
      { key: PERMISSIONS.MANAGE_DRIVERS, label: "Manage Drivers", description: "Edit driver details" },
    ],
  },
  {
    id: "collections",
    label: "Operations",
    icon: Settings,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Collections, projects, and meetings",
    permissions: [
      { key: PERMISSIONS.VIEW_COLLECTIONS, label: "View Collections", description: "View collection logs" },
      { key: PERMISSIONS.EDIT_COLLECTIONS, label: "Edit Collections", description: "Submit and edit collection data" },
      { key: PERMISSIONS.VIEW_PROJECTS, label: "View Projects", description: "View project information" },
      { key: PERMISSIONS.MANAGE_PROJECTS, label: "Manage Projects", description: "Create and manage projects" },
      { key: PERMISSIONS.VIEW_MEETINGS, label: "View Meetings", description: "View meeting information" },
      { key: PERMISSIONS.EDIT_MEETINGS, label: "Edit Meetings", description: "Create and edit meetings" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: TrendingUp,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    description: "Dashboards and reporting",
    permissions: [
      { key: PERMISSIONS.VIEW_ANALYTICS, label: "View Analytics", description: "Access analytics dashboards" },
      { key: PERMISSIONS.VIEW_REPORTS, label: "View Reports", description: "Access and generate reports" },
      { key: PERMISSIONS.EXPORT_DATA, label: "Export Data", description: "Export data to external formats" },
    ],
  },
  {
    id: "suggestions",
    label: "Feedback",
    icon: FileText,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    description: "Suggestions and feedback",
    permissions: [
      { key: PERMISSIONS.VIEW_SUGGESTIONS, label: "View Suggestions", description: "View all suggestions" },
      { key: PERMISSIONS.SUBMIT_SUGGESTIONS, label: "Submit Suggestions", description: "Create new suggestions" },
      { key: PERMISSIONS.MANAGE_SUGGESTIONS, label: "Manage Suggestions", description: "Review and update suggestion status" },
      { key: PERMISSIONS.RESPOND_TO_SUGGESTIONS, label: "Respond to Suggestions", description: "Post official responses" },
    ],
  },
  {
    id: "work_logs",
    label: "Work Logs",
    icon: ClipboardList,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    description: "Work logging and time tracking",
    permissions: [
      { key: PERMISSIONS.LOG_WORK, label: "Log Work", description: "Submit work log entries" },
      { key: PERMISSIONS.MANAGE_WORK_LOGS, label: "Manage Work Logs", description: "View and manage all work logs (supervisor access)" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    icon: Shield,
    color: "text-red-600",
    bgColor: "bg-red-50",
    description: "System and user management",
    permissions: [
      { key: PERMISSIONS.VIEW_USERS, label: "View Users", description: "View user list and details" },
      { key: PERMISSIONS.MANAGE_USERS, label: "Manage Users", description: "Edit user roles and permissions" },
      { key: PERMISSIONS.VIEW_COMMITTEE, label: "View Committee", description: "View committee information" },
      { key: PERMISSIONS.MANAGE_ANNOUNCEMENTS, label: "Manage Announcements", description: "Create and edit announcements" },
    ],
  },
];

// Get all permissions flat list
const ALL_PERMISSIONS = PERMISSION_CATEGORIES.flatMap(cat => cat.permissions);

// Predefined role templates with detailed permission breakdowns
const ROLE_TEMPLATES = {
  [USER_ROLES.ADMIN]: {
    label: "Administrator",
    description: "Full system access with all permissions",
    color: "bg-red-100 text-red-800",
    permissions: getDefaultPermissionsForRole(USER_ROLES.ADMIN),
  },
  [USER_ROLES.COMMITTEE_MEMBER]: {
    label: "Committee Member",
    description: "Manage operations and view reports",
    color: "bg-blue-100 text-blue-800",
    permissions: getDefaultPermissionsForRole(USER_ROLES.COMMITTEE_MEMBER),
  },
  [USER_ROLES.VOLUNTEER]: {
    label: "Volunteer",
    description: "Submit data and participate in chats",
    color: "bg-green-100 text-green-800",
    permissions: getDefaultPermissionsForRole(USER_ROLES.VOLUNTEER),
  },
  [USER_ROLES.VIEWER]: {
    label: "Viewer",
    description: "Read-only access to most features",
    color: "bg-gray-100 text-gray-800",
    permissions: getDefaultPermissionsForRole(USER_ROLES.VIEWER),
  },
};

// Helper function to get permission details
const getPermissionDetails = (permissionKey: string) => {
  for (const category of PERMISSION_CATEGORIES) {
    const permission = category.permissions.find(p => p.key === permissionKey);
    if (permission) {
      return { ...permission, category: category.label, categoryIcon: category.icon };
    }
  }
  return null;
};

// Helper function to group permissions by category
const groupPermissionsByCategory = (permissions: string[]) => {
  const grouped: Record<string, Array<{key: string, label: string, description: string}>> = {};
  
  for (const category of PERMISSION_CATEGORIES) {
    const categoryPerms = category.permissions.filter(p => permissions.includes(p.key));
    if (categoryPerms.length > 0) {
      grouped[category.label] = categoryPerms;
    }
  }
  
  return grouped;
};

export function UserPermissionsDialogRedesigned({
  user,
  open,
  onOpenChange,
  onSave,
}: UserPermissionsDialogProps) {
  const [editingRole, setEditingRole] = useState<string>("");
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEditingRole(user.role);
      setEditingPermissions([...user.permissions]);
      setHasChanges(false);
    }
  }, [user]);

  const handleRoleChange = (newRole: string) => {
    setEditingRole(newRole);
    const defaultPerms = getDefaultPermissionsForRole(newRole);
    setEditingPermissions(defaultPerms);
    setHasChanges(true);
  };

  const handlePermissionToggle = (permission: string) => {
    setEditingPermissions((prev) => {
      const newPerms = prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission];
      setHasChanges(true);
      return newPerms;
    });
  };

  const handleCategoryToggle = (categoryPermissions: string[]) => {
    const allSelected = categoryPermissions.every(p => editingPermissions.includes(p));
    
    setEditingPermissions((prev) => {
      if (allSelected) {
        // Deselect all
        return prev.filter((p) => !categoryPermissions.includes(p));
      } else {
        // Select all
        const newPerms = [...prev];
        categoryPermissions.forEach((perm) => {
          if (!newPerms.includes(perm)) {
            newPerms.push(perm);
          }
        });
        return newPerms;
      }
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (user) {
      onSave(user.id, editingRole, editingPermissions);
    }
  };

  const handleApplyTemplate = (role: string) => {
    const template = ROLE_TEMPLATES[role];
    if (template) {
      setEditingPermissions([...template.permissions]);
      setHasChanges(true);
    }
  };

  if (!user) return null;

  const getPermissionStats = () => {
    const total = Object.values(PERMISSIONS).length + 3; // +3 for additional permissions not in PERMISSIONS constant
    const selected = editingPermissions.length;
    const percentage = Math.round((selected / total) * 100);
    return { total, selected, percentage };
  };

  const stats = getPermissionStats();

  // Template Preview Component
  const TemplatePreview = ({ roleKey, template }: { roleKey: string; template: typeof ROLE_TEMPLATES[keyof typeof ROLE_TEMPLATES] }) => {
    const groupedPerms = groupPermissionsByCategory(template.permissions);
    
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Permissions included:</span>
          <Badge variant="secondary">{template.permissions.length} total</Badge>
        </div>
        {Object.entries(groupedPerms).map(([category, perms]) => {
          const categoryInfo = PERMISSION_CATEGORIES.find(c => c.label === category);
          if (!categoryInfo) return null;
          
          return (
            <div key={category} className="space-y-1">
              <div className={`flex items-center gap-2 font-medium ${categoryInfo.color}`}>
                <categoryInfo.icon className="h-3 w-3" />
                {category}
              </div>
              <ul className="ml-5 space-y-0.5 text-gray-600 dark:text-gray-400">
                {perms.map(perm => (
                  <li key={perm.key} className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {perm.label}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <div className="flex h-full">
          {/* Left sidebar with user info */}
          <div className="w-80 bg-gray-50 dark:bg-gray-900 p-6 border-r">
            <div className="space-y-6">
              {/* User Avatar and Info */}
              <div className="text-center">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-semibold mx-auto mb-4">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <h3 className="text-lg font-semibold">{user.firstName} {user.lastName}</h3>
                <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">User Role</Label>
                <Select value={editingRole} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_TEMPLATES).map(([role, template]) => (
                      <SelectItem key={role} value={role}>
                        <div className="space-y-1">
                          <div className="font-medium">{template.label}</div>
                          <div className="text-xs text-gray-500">{template.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Alert className="py-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Changing the role automatically applies the default permissions for that role
                  </AlertDescription>
                </Alert>
              </div>

              {/* Permission Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Current Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {PERMISSION_CATEGORIES.map(category => {
                      const enabledPerms = category.permissions.filter(p => editingPermissions.includes(p.key));
                      if (enabledPerms.length === 0) return null;
                      
                      return (
                        <div key={category.id} className="text-xs">
                          <div className={`flex items-center gap-1 font-medium ${category.color}`}>
                            <category.icon className="h-3 w-3" />
                            {category.label}
                          </div>
                          <div className="ml-4 text-gray-600 dark:text-gray-400">
                            {enabledPerms.length === category.permissions.length 
                              ? "All permissions" 
                              : `${enabledPerms.length} permission${enabledPerms.length > 1 ? 's' : ''}`}
                          </div>
                        </div>
                      );
                    })}
                    {editingPermissions.length === 0 && (
                      <div className="text-xs text-gray-400 italic text-center py-2">
                        No permissions selected
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Templates with Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quick Templates</Label>
                <div className="space-y-2">
                  {Object.entries(ROLE_TEMPLATES).map(([role, template]) => (
                    <HoverCard key={role} openDelay={200}>
                      <HoverCardTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-between group"
                          onClick={() => handleApplyTemplate(role)}
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            {template.label}
                          </span>
                          <Info className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
                        </Button>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" className="w-80 max-h-96 overflow-y-auto">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold">{template.label} Template</h4>
                            <p className="text-sm text-gray-500">{template.description}</p>
                          </div>
                          <Separator />
                          <TemplatePreview roleKey={role} template={template} />
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Edit Permissions</DialogTitle>
              <DialogDescription>
                Configure detailed permissions for this user. Hover over templates to preview included permissions.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Permissions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 p-6 pt-4">
                <ScrollArea className="h-[450px]">
                  <div className="grid grid-cols-2 gap-4">
                    {PERMISSION_CATEGORIES.map((category) => {
                      const categoryPermissionKeys = category.permissions.map((p) => p.key);
                      const selectedCount = categoryPermissionKeys.filter((p) =>
                        editingPermissions.includes(p)
                      ).length;
                      const allSelected = selectedCount === category.permissions.length;
                      const partiallySelected = selectedCount > 0 && selectedCount < category.permissions.length;
                      const Icon = category.icon;

                      return (
                        <Card 
                          key={category.id} 
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            allSelected ? 'ring-2 ring-blue-500' : ''
                          }`}
                        >
                          <CardHeader 
                            className="pb-3"
                            onClick={() => handleCategoryToggle(categoryPermissionKeys)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${category.bgColor}`}>
                                  <Icon className={`h-5 w-5 ${category.color}`} />
                                </div>
                                <div>
                                  <CardTitle className="text-base">{category.label}</CardTitle>
                                  <CardDescription className="text-xs mt-1">
                                    {category.description}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {allSelected && (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                )}
                                {partiallySelected && !allSelected && (
                                  <AlertCircle className="h-5 w-5 text-orange-500" />
                                )}
                                {!allSelected && !partiallySelected && (
                                  <XCircle className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {/* Show actual permissions this user has */}
                            <div className="space-y-1">
                              {selectedCount > 0 ? (
                                <>
                                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    User can:
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                                    {category.permissions
                                      .filter(perm => editingPermissions.includes(perm.key))
                                      .slice(0, 3)
                                      .map(perm => (
                                        <div key={perm.key} className="flex items-center gap-1">
                                          <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                          <span className="truncate">{perm.label}</span>
                                        </div>
                                      ))}
                                    {category.permissions.filter(p => editingPermissions.includes(p.key)).length > 3 && (
                                      <div className="text-gray-500 italic">
                                        +{category.permissions.filter(p => editingPermissions.includes(p.key)).length - 3} more permissions
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="text-xs text-gray-400 italic">
                                  No permissions in this category
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="detailed" className="flex-1 p-6 pt-4">
                <ScrollArea className="h-[450px]">
                  <div className="space-y-6">
                    {PERMISSION_CATEGORIES.map((category) => {
                      const Icon = category.icon;
                      const categoryPermissionKeys = category.permissions.map((p) => p.key);
                      const selectedCount = categoryPermissionKeys.filter((p) =>
                        editingPermissions.includes(p)
                      ).length;

                      return (
                        <div key={category.id} className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${category.bgColor}`}>
                                <Icon className={`h-5 w-5 ${category.color}`} />
                              </div>
                              <div>
                                <h3 className="font-semibold">{category.label}</h3>
                                <p className="text-sm text-gray-500">{category.description}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCategoryToggle(categoryPermissionKeys)}
                            >
                              {selectedCount === category.permissions.length ? "Deselect All" : "Select All"}
                            </Button>
                          </div>
                          
                          <div className="grid gap-2 pl-14">
                            {category.permissions.map(({ key, label, description }) => (
                              <div
                                key={key}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id={key}
                                    checked={editingPermissions.includes(key)}
                                    onCheckedChange={() => handlePermissionToggle(key)}
                                  />
                                  <div>
                                    <Label
                                      htmlFor={key}
                                      className="font-medium cursor-pointer"
                                    >
                                      {label}
                                    </Label>
                                    <p className="text-sm text-gray-500">
                                      {description}
                                    </p>
                                  </div>
                                </div>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(key);
                                        }}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Copy permission key: {key}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <DialogFooter className="p-6 pt-0">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  {hasChanges && (
                    <Alert className="py-1 px-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You have unsaved changes
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!hasChanges}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}