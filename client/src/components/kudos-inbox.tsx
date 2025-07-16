import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface KudosRecord {
  id: number;
  sender_id: string;
  recipient_id: string;
  context_type: string;
  context_id: string;
  sent_at: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  task?: {
    id: number;
    title: string;
  };
  project?: {
    id: number;
    title: string;
  };
}

export function KudosInbox() {
  const { user } = useAuth();

  const { data: receivedKudos = [], isLoading } = useQuery({
    queryKey: ["kudos-received", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("kudos_tracking")
        .select(`
          *,
          sender:users!sender_id(id, first_name, last_name, email),
          task:project_tasks!context_id(id, title),
          project:projects!project_tasks.project_id(id, title)
        `)
        .eq("recipient_id", user.id)
        .eq("context_type", "task")
        .order("sent_at", { ascending: false });

      if (error) {
        console.error("Error fetching kudos:", error);
        // Fallback query without joins
        const { data: simpleData, error: simpleError } = await supabase
          .from("kudos_tracking")
          .select(`
            *,
            sender:users!sender_id(id, first_name, last_name, email)
          `)
          .eq("recipient_id", user.id)
          .order("sent_at", { ascending: false });

        if (simpleError) {
          console.error("Error fetching simple kudos:", simpleError);
          return [];
        }

        // Fetch task details separately
        const kudosWithDetails = await Promise.all(
          (simpleData || []).map(async (kudos) => {
            if (kudos.context_type === "task" && kudos.context_id) {
              const { data: taskData } = await supabase
                .from("project_tasks")
                .select("id, title, project_id")
                .eq("id", kudos.context_id)
                .single();

              if (taskData) {
                const { data: projectData } = await supabase
                  .from("projects")
                  .select("id, title")
                  .eq("id", taskData.project_id)
                  .single();

                return {
                  ...kudos,
                  task: taskData,
                  project: projectData,
                };
              }
            }
            return kudos;
          })
        );

        return kudosWithDetails;
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: sentKudos = [] } = useQuery({
    queryKey: ["kudos-sent", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("kudos_tracking")
        .select(`
          *,
          recipient:users!recipient_id(id, first_name, last_name, email)
        `)
        .eq("sender_id", user.id)
        .order("sent_at", { ascending: false });

      if (error) {
        console.error("Error fetching sent kudos:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading kudos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Received Kudos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            Kudos Received
            {receivedKudos.length > 0 && (
              <Badge variant="secondary">{receivedKudos.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {receivedKudos.length === 0 ? (
            <p className="text-muted-foreground text-sm">No kudos received yet</p>
          ) : (
            <div className="space-y-3">
              {receivedKudos.map((kudos) => (
                <div key={kudos.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Heart className="w-5 h-5 text-pink-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">
                        {kudos.sender?.first_name} {kudos.sender?.last_name}
                      </span>{" "}
                      sent you kudos
                      {kudos.task && (
                        <span>
                          {" "}for completing{" "}
                          <span className="font-medium">"{kudos.task.title}"</span>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(kudos.sent_at), { addSuffix: true })}
                      {kudos.project && (
                        <span> • {kudos.project.title}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sent Kudos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Kudos Sent
            {sentKudos.length > 0 && (
              <Badge variant="secondary">{sentKudos.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sentKudos.length === 0 ? (
            <p className="text-muted-foreground text-sm">You haven't sent any kudos yet</p>
          ) : (
            <div className="space-y-3">
              {sentKudos.map((kudos) => (
                <div key={kudos.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Heart className="w-5 h-5 text-pink-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">
                      You sent kudos to{" "}
                      <span className="font-semibold">
                        {kudos.recipient?.first_name} {kudos.recipient?.last_name}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(kudos.sent_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}