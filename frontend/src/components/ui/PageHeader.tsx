import React, { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  action?: ReactNode;
}

export const PageHeader = ({ title, description, breadcrumbs, action }: PageHeaderProps) => {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.label}>
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-slate-600 transition">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-500">{crumb.label}</span>
                )}
                {idx < breadcrumbs.length - 1 && <span className="text-slate-300">/</span>}
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 font-medium">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
};
