import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission, PERMISSIONS } from '@shared/auth-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';

interface SafeAuthWrapperProps {
  children: React.ReactNode;
  requiredPermission?: keyof typeof PERMISSIONS;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

/**
 * Safe wrapper component that ensures all hooks are called before any conditional rendering.
 * This prevents "rendered more hooks than during the previous render" errors.
 * 
 * Usage:
 * <SafeAuthWrapper requiredPermission={PERMISSIONS.MANAGE_USERS}>
 *   <UserManagementComponent />
 * </SafeAuthWrapper>
 */
export function SafeAuthWrapper({ 
  children, 
  requiredPermission, 
  fallback,
  loadingFallback 
}: SafeAuthWrapperProps) {
  const { user, isLoading } = useAuth();

  // Show loading state while auth is loading
  if (isLoading) {
    return loadingFallback || (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Checking authentication status...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Check permission if required
  if (requiredPermission && !hasPermission(user, PERMISSIONS[requiredPermission])) {
    return fallback || (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You don't have permission to access this feature.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
}

/**
 * Hook that ensures safe conditional rendering based on auth state.
 * Always call this hook at the top level of your component.
 * 
 * Usage:
 * const { canAccess, isLoading } = useSafeAuth(PERMISSIONS.MANAGE_USERS);
 * 
 * if (isLoading) return <LoadingSpinner />;
 * if (!canAccess) return <AccessDenied />;
 * 
 * // All hooks above this point are safe
 * const { data } = useQuery(...);
 */
export function useSafeAuth(requiredPermission?: keyof typeof PERMISSIONS) {
  const { user, isLoading } = useAuth();
  
  const canAccess = requiredPermission 
    ? hasPermission(user, PERMISSIONS[requiredPermission])
    : !!user;

  return {
    user,
    isLoading,
    canAccess,
    isAuthenticated: !!user,
  };
} 