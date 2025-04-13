"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Database } from "@/lib/supabase/database.types"; // Import generated types

// Define the type for an invoice based on your DB schema + generated types
type Invoice = Database["public"]["Tables"]["invoices"]["Row"];

export default function InvoiceList({ userId }: { userId: string }) {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("invoices")
          .select("*") // Select all columns
          .eq("user_id", userId)
          .order("uploaded_at", { ascending: false }) // Show newest first
          .limit(20); // Limit results for performance

        if (fetchError) {
          throw fetchError;
        }

        setInvoices(data || []);
      } catch (err: unknown) {
        console.error("Error fetching invoices:", err);
        let message = "Failed to load invoices.";
        if (err instanceof Error) {
          message = err.message;
        } else if (
          typeof err === "object" &&
          err !== null &&
          "message" in err
        ) {
          message = String(err.message);
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();

    // Optional: Set up a real-time subscription to listen for new invoices
    const channel = supabase
      .channel("invoices-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "invoices",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("New invoice received!", payload);
          setInvoices((currentInvoices) => [
            payload.new as Invoice,
            ...currentInvoices,
          ]);
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  if (loading) {
    return <p>Loading invoices...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Recent Invoices</h2>
      <Table>
        <TableCaption>A list of your recently uploaded invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Uploaded</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No invoices uploaded yet.
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  {format(new Date(invoice.uploaded_at), "PPp")}
                </TableCell>
                <TableCell>{invoice.file_name}</TableCell>
                <TableCell>{invoice.vendor}</TableCell>
                <TableCell>
                  {invoice.invoice_date
                    ? format(new Date(invoice.invoice_date + "T00:00:00"), "P")
                    : "N/A"}
                </TableCell>
                <TableCell>
                  {invoice.amount
                    ? `${invoice.amount} ${invoice.currency}`
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      invoice.status === "matched" ? "default" : "secondary"
                    }
                  >
                    {invoice.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
