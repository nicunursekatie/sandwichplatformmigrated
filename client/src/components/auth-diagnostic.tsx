import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthDiagnostic() {
  const { user } = useAuth();
  const [authUser, setAuthUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Get the current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthUser(session?.user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setAuthUser(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Auth Diagnostic</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 font-mono text-sm">
        <div>
          <strong>useAuth() user?.id:</strong> {user?.id || "undefined"}
        </div>
        <div>
          <strong>Supabase auth.user.id:</strong> {authUser?.id || "undefined"}
        </div>
        <div>
          <strong>Session exists:</strong> {session ? "Yes" : "No"}
        </div>
        <div>
          <strong>User email:</strong> {user?.email || authUser?.email || "undefined"}
        </div>
        <div className="text-xs text-muted-foreground mt-4">
          If useAuth() user?.id is different from Supabase auth.user.id, 
          there's a mismatch between the auth context and Supabase auth.
        </div>
      </CardContent>
    </Card>
  );
}