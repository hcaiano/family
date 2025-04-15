"use client";

import { Table } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableToolbar as BaseDataTableToolbar } from "@/components/ui/data-table/data-table-toolbar";

interface TransactionsDataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function TransactionsDataTableToolbar<TData>({
  table,
}: TransactionsDataTableToolbarProps<TData>) {
  return (
    <BaseDataTableToolbar
      table={table}
      filterColumn="description"
      searchPlaceholder="Search transactions..."
    >
      {table.getColumn("status") && (
        <Select
          value={
            (table.getColumn("status")?.getFilterValue() as string) ?? "all"
          }
          onValueChange={(value) =>
            table
              .getColumn("status")
              ?.setFilterValue(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="unmatched">Unmatched</SelectItem>
          </SelectContent>
        </Select>
      )}
    </BaseDataTableToolbar>
  );
}
