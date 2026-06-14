import React from "react";

interface LoadingSkeletonProps {
  type?: "table" | "card" | "form" | "list";
  rows?: number;
}

export const LoadingSkeleton = ({ type = "list", rows = 4 }: LoadingSkeletonProps) => {
  if (type === "table") {
    return (
      <div className="animate-pulse space-y-4 p-5">
        <div className="grid grid-cols-5 gap-4 border-b border-slate-100 pb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-slate-200"></div>
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid grid-cols-5 gap-4 pt-2">
            {Array.from({ length: 5 }).map((_, c) => (
              <div key={c} className={`h-4 rounded ${c === 0 ? "w-3/4" : "w-1/2"} bg-slate-100`}></div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className="animate-pulse rounded-md border border-slate-200 bg-white p-5 space-y-3">
        <div className="h-6 w-1/3 rounded bg-slate-200"></div>
        <div className="h-4 w-2/3 rounded bg-slate-100"></div>
        <div className="h-4 w-1/2 rounded bg-slate-100"></div>
      </div>
    );
  }

  return (
    <div className="animate-pulse space-y-3 p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-slate-200"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-slate-200"></div>
            <div className="h-3 w-1/2 rounded bg-slate-100"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
