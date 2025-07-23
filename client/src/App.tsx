import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingState } from "@/components/ui/loading";
import { ErrorBoundary } from "@/components/error-boundary";

import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
import SignupPage from "@/pages/signup";
import NotFound from "@/pages/not-found";
import DataDiagnostics from "@/components/data-diagnostics";
import ProjectsToggle from "@/pages/projects-toggle";
import { ChatInitializer } from "@/components/chat-initializer";

function Router() {
  const { isAuthenticated, isLoading, error } = useAuth();

  // Add debugging for Router component
  console.log('Router: Auth state', { isAuthenticated, isLoading, hasError: !!error });
  
  // Only show loading state for a maximum of 5 seconds
  // After that, assume there's no valid session and show login
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    // If still loading after 5 seconds, show login screen
    const timer = setTimeout(() => {
      if (isLoading) {
        console.log('Router: Auth loading timeout reached, showing login screen');
        setAuthTimeout(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading && !authTimeout) {
    return <LoadingState text="Authenticating..." size="lg" className="min-h-screen" />;
  }

  // Enhanced error handling for authentication issues
  if (error && error.message && !error.message.includes('401')) {
    console.error('[App] Authentication error:', error);
    // For non-401 errors, show error state
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-lg text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">There was a problem verifying your account.</p>
          <button 
            onClick={() => window.location.href = "/api/login"}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If not authenticated, show public routes
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/signup" component={SignupPage} />
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <>
      <ChatInitializer />
      <Switch>
        <Route path="/diagnostics" component={DataDiagnostics} />
        <Route path="/messages">{() => <Dashboard initialSection="messages" />}</Route>
        <Route path="/inbox">{() => <Dashboard initialSection="inbox" />}</Route>
        <Route path="/suggestions">{() => <Dashboard initialSection="suggestions" />}</Route>
        <Route path="/google-sheets">{() => <Dashboard initialSection="google-sheets" />}</Route>
        <Route path="/projects">{() => <ProjectsToggle />}</Route>
        <Route path="/">{() => <Dashboard />}</Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
