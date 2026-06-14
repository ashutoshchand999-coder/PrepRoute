import React, { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const EmptyState = ({
  title = "No results found",
  description = "Try adjusting your search or filters to find what you are looking for.",
  icon = <Inbox className="h-10 w-10 text-slate-300" />,
  action,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
      <div className="mb-4 rounded-full bg-white p-3.5 shadow-sm border border-slate-100">{icon}</div>
      <h3 className="mb-1 text-sm font-semibold text-slate-700">{title}</h3>
      <p className="mb-6 max-w-xs text-xs text-slate-400 font-medium">{description}</p>
      {action}
    </div>
  );
};
