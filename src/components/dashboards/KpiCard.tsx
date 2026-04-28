import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "primary";
  hint?: string;
}

const variantClasses: Record<NonNullable<KpiCardProps["variant"]>, string> = {
  default: "bg-muted text-foreground",
  primary: "gradient-primary text-primary-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
};

export function KpiCard({ title, value, icon: Icon, variant = "default", hint }: KpiCardProps) {
  const isAlert = variant === "destructive" && Number(value) > 0;
  return (
    <Card className={cn(isAlert && "border-destructive/50 shadow-sm")}>
      <CardContent className="flex items-center justify-between p-5">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{title}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-0.5 truncate">{hint}</div>}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl shrink-0", variantClasses[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
