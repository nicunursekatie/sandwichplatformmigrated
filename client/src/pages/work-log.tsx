import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabaseService } from "@/lib/supabase-service";
export default function WorkLogPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  // Check if user has permission to access work logs
  const hasWorkLogPermission = user?.permissions?.includes('log_work') || 
                              user?.role === 'admin' || 
                              user?.role === 'super_admin' ||
                              user?.email === 'mdlouza@gmail.com';

  if (!hasWorkLogPermission) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Access Restricted
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            You don't have permission to access the work log feature.
          </p>
        </div>
      </div>
    );
  }

  const { data: logs = [], refetch, isLoading, error } = useQuery({
    queryKey: ["work-logs"],
    queryFn: async () => {
      console.log("🚀 Work logs query function called");
      const workLogs = await supabaseService.workLog.getAllWorkLogs();
      console.log("🚀 Work logs API response data:", workLogs);
      return workLogs;
    },
    enabled: !!user, // Only fetch when user is authenticated
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache results (TanStack Query v5 uses gcTime instead of cacheTime)
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Ensure logs is always an array
  const safelogs = Array.isArray(logs) ? logs : [];

  const createLog = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      return await supabaseService.workLog.createWorkLog({ 
        description, 
        hours, 
        minutes,
        user_id: user.id,
        date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
      });
    },
    onSuccess: () => {
      setDescription("");
      setHours(0);
      setMinutes(0);
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
      refetch(); // Force refetch to update the list immediately
    },
  });

  const deleteLog = useMutation({
    mutationFn: async (id: number) => {
      return await supabaseService.workLog.deleteWorkLog(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
      refetch(); // Force refetch to update the list immediately
    },
  });

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Log Your Work</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={e => {
              e.preventDefault();
              createLog.mutate();
            }}
            className="space-y-4"
          >
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your work..."
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                <Input
                  type="number"
                  min={0}
                  value={hours}
                  onChange={e => setHours(Number(e.target.value))}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minutes</label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={e => setMinutes(Number(e.target.value))}
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={createLog.isPending}>
              {createLog.isPending ? "Logging..." : "Log Work"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {user?.role === 'admin' || user?.role === 'super_admin' || user?.email === 'mdlouza@gmail.com' 
                ? 'All Work Logs' 
                : 'My Work Logs'
              }
            </CardTitle>
            {(user?.role === 'admin' || user?.role === 'super_admin' || user?.email === 'mdlouza@gmail.com') && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                You can see all work logs as an administrator. Regular users can only see their own logs.
              </p>
            )}
          </CardHeader>
          <CardContent>
            {isLoading && <div className="py-4 text-gray-500">Loading work logs...</div>}
            {error && <div className="py-4 text-red-500">Error loading logs: {error.message}</div>}
            <div className="py-2 text-xs text-gray-400">
              Debug: User ID: {user?.id}, Logs count: {safelogs.length}, Loading: {isLoading ? 'yes' : 'no'}, Error: {error?.message || 'none'}
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="mb-2">
              Refresh Logs
            </Button>
            {!isLoading && !error && (
              <ul className="divide-y">
                {safelogs.length === 0 && <li className="py-4 text-gray-500">No logs yet.</li>}
                {safelogs.map((log: any) => (
                <li key={log.id} className="py-4 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium">{log.description}</div>
                    <div className="text-sm text-gray-500">
                      {log.hours}h {log.minutes}m &middot; {new Date(log.created_at).toLocaleString()}
                      {log.user && (
                        <span className="ml-2 text-blue-600">
                          by {log.user.first_name} {log.user.last_name} ({log.user.email})
                        </span>
                      )}
                    </div>
                  </div>
                  {(user?.role === "super_admin" || user?.role === "admin" || user?.email === 'mdlouza@gmail.com' || log.user_id === user?.id) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteLog.mutate(log.id)}
                      disabled={deleteLog.isPending}
                    >
                      Delete
                    </Button>
                  )}
                </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 