import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="breadcrumbs">
      <Link to="/" className="flex items-center hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((c, i) => (
        <Fragment key={i}>
          <ChevronRight className="h-3 w-3 opacity-60" />
          {c.to && i < items.length - 1 ? (
            <Link to={c.to} className="hover:text-foreground transition-colors">{c.label}</Link>
          ) : (
            <span className={i === items.length - 1 ? "text-foreground font-medium" : ""}>{c.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
