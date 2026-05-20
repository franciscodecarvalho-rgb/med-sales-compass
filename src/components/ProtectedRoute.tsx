import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { usePermissions, Permission } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requireRoles?: AppRole[];
  requirePermission?: Permission;
}

export function ProtectedRoute({ children, requireRoles, requirePermission }: Props) {
  const { user, roles, loading } = useAuth();
  const { can, loading: permLoading } = usePermissions();
  const location = useLocation();

  if (loading || (requirePermission && permLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireRoles && requireRoles.length > 0) {
    const hasAny = requireRoles.some((r) => roles.includes(r));
    if (!hasAny) return <Navigate to="/" replace />;
  }

  if (requirePermission && !can(requirePermission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
