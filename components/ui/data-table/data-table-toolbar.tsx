"use client";

import { useRef } from "react";
import { Table } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableAction {
  label: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "ghost" | "link";
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  filterColumn?: string;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  actions?: DataTableAction[];
}

export function DataTableToolbar<TData>({
  table,
  filterColumn = "name",
  searchPlaceholder = "Filter by name...",
  children,
  actions,
}: DataTableToolbarProps<TData>) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-1 items-center space-x-2">
        {/* Filter by name or email */}
        <div className="relative flex-1 max-w-sm">
          <Input
            ref={inputRef}
            className={cn(
              "h-9 peer min-w-60 ps-9",
              Boolean(table.getColumn(filterColumn)?.getFilterValue()) && "pe-9"
            )}
            value={
              (table.getColumn(filterColumn)?.getFilterValue() ?? "") as string
            }
            onChange={(event) =>
              table.getColumn(filterColumn)?.setFilterValue(event.target.value)
            }
            placeholder={searchPlaceholder}
            type="text"
            aria-label={searchPlaceholder}
          />
          <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
            <Search size={16} aria-hidden="true" />
          </div>
          {Boolean(table.getColumn(filterColumn)?.getFilterValue()) && (
            <button
              className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Clear filter"
              onClick={() => {
                table.getColumn(filterColumn)?.setFilterValue("");
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Additional filters */}
        {children}

        <DataTableViewOptions table={table} />
      </div>

      <div className="flex items-center space-x-2">
        {/* Actions */}
        {actions?.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            size="sm"
            onClick={action.onClick}
            className="h-9"
          >
            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
