import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requireRoles?: AppRole[];
}

export function ProtectedRoute({ children, requireRoles }: Props) {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
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
    if (!hasAny) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
