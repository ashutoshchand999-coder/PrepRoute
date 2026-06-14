import React, { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T | string;
  sortable?: boolean;
  cell?: (item: T) => ReactNode;
}

interface AppTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  isLoading?: boolean;
  loadingRows?: number;
  emptyState?: ReactNode;
}

export function AppTable<T>({
  columns,
  data,
  sortKey,
  sortOrder,
  onSort,
  isLoading,
  loadingRows = 5,
  emptyState,
}: AppTableProps<T>) {
  const handleSort = (key?: string, sortable?: boolean) => {
    if (sortable && key && onSort) {
      onSort(key);
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full min-w-[760px] text-left text-sm border-collapse">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.header || idx}
                onClick={() => handleSort(col.accessorKey as string, col.sortable)}
                className={`px-5 py-4 font-semibold text-slate-500 ${
                  col.sortable ? "cursor-pointer select-none hover:text-slate-800 transition" : ""
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && col.accessorKey && (
                    <span>
                      {sortKey === col.accessorKey ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: loadingRows }).map((_, rIdx) => (
              <tr key={rIdx} className="animate-pulse">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="px-5 py-4">
                    <div className="h-4 rounded bg-slate-100 w-2/3"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-12">
                {emptyState || (
                  <div className="text-center text-slate-500">No data found.</div>
                )}
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-50/50 transition">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-5 py-4 text-slate-600 font-semibold">
                    {col.cell ? (
                      col.cell(item)
                    ) : col.accessorKey ? (
                      (item[col.accessorKey as keyof T] as unknown as ReactNode)
                    ) : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
