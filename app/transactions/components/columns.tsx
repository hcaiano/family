"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/utils";
import { TransactionMenu } from "./transaction-menu";

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  transaction_date: string;
  source_bank: "Revolut" | "BPI";
  status: "unmatched" | "matched";
  invoice_id: string | null;
  vendor_id: string | null;
  category_id: string | null;
  vendor?: {
    id: string;
    name: string;
    is_subscription: boolean;
  } | null;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
};

export const columns: ColumnDef<Transaction>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "transaction_date",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {formatDate(row.getValue("transaction_date"))}
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="max-w-[500px] truncate">
        {row.getValue("description")}
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number;
      const currency = row.original.currency;

      return (
        <div className="text-right font-medium">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency,
          }).format(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "vendor",
    header: "Vendor",
    cell: ({ row }) => {
      const vendor = row.original.vendor;
      return vendor ? (
        <div className="flex items-center gap-1">
          <span>{vendor.name}</span>
          {vendor.is_subscription && (
            <Badge variant="outline" className="text-xs h-5">
              Sub
            </Badge>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">Not assigned</span>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.category;
      return category ? (
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span>{category.name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">Not assigned</span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          className={status === "matched" ? "bg-green-500" : "bg-red-500"}
          variant="solid"
        >
          {status === "matched" ? "Matched" : "Unmatched"}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.length === 0 ? true : value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const transaction = row.original;
      return (
        <div className="flex justify-end items-center gap-2">
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              /* TODO: Implement match invoice action */
            }}
          >
            Match
          </Button>
          <TransactionMenu
            transactionId={transaction.id}
            vendorId={transaction.vendor_id}
            categoryId={transaction.category_id}
            onUpdate={() => {}} // Will be provided by the parent
          />
        </div>
      );
    },
    enableHiding: false,
  },
];
