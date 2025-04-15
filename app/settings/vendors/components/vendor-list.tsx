"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VendorForm } from "./vendor-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

type Category = {
  id: string;
  name: string;
  color: string;
};

type Vendor = {
  id: string;
  name: string;
  category_id: string | null;
  is_subscription: boolean;
  created_at: string;
  category?: Category;
};

export function VendorList() {
  const router = useRouter();
  const supabase = createClient();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        // Fetch vendors with their associated categories
        const { data, error } = await supabase
          .from("vendors")
          .select(
            `
            *,
            category:categories(id, name, color)
          `
          )
          .order("name");

        if (error) throw error;
        setVendors(data || []);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        toast.error("Failed to load vendors");
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [supabase]);

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      // Check if vendor is in use by any transactions
      const { data: transactionsUsingVendor, error: txError } = await supabase
        .from("transactions")
        .select("id")
        .eq("vendor_id", deletingId)
        .limit(1);

      if (txError) throw txError;

      if (transactionsUsingVendor && transactionsUsingVendor.length > 0) {
        toast.error("Cannot delete vendor that is in use by transactions");
        return;
      }

      // Delete the vendor
      const { error } = await supabase
        .from("vendors")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      setVendors(vendors.filter((v) => v.id !== deletingId));
      toast.success("Vendor deleted successfully");
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast.error("Failed to delete vendor");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="flex justify-center p-8">
          <p className="text-muted-foreground">Loading vendors...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No vendors</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first vendor to start categorizing your transactions
          </p>
          <Button
            onClick={() =>
              setEditingVendor({
                id: "",
                name: "",
                category_id: null,
                is_subscription: false,
                created_at: "",
              })
            }
            className="mt-4"
          >
            <Building2 className="mr-2 h-4 w-4" />
            Add vendor
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {vendors.map((vendor) => (
            <Card
              key={vendor.id}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    {vendor.name}
                    {vendor.is_subscription && (
                      <Badge variant="outline" className="ml-2">
                        Subscription
                      </Badge>
                    )}
                  </h3>
                  {vendor.category && (
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: vendor.category.color }}
                      />
                      <p className="text-sm text-muted-foreground">
                        {vendor.category.name}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {new Date(vendor.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingVendor(vendor)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeletingId(vendor.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Vendor Dialog */}
      <Dialog
        open={!!editingVendor}
        onOpenChange={(open) => !open && setEditingVendor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVendor?.id ? "Edit Vendor" : "Add Vendor"}
            </DialogTitle>
          </DialogHeader>
          <VendorForm
            initialData={
              editingVendor
                ? {
                    id: editingVendor.id,
                    name: editingVendor.name,
                    category_id: editingVendor.category_id || undefined,
                    is_subscription: editingVendor.is_subscription,
                  }
                : undefined
            }
            onSuccess={() => {
              setEditingVendor(null);
              router.refresh();
              toast.success(
                editingVendor?.id
                  ? "Vendor updated successfully"
                  : "Vendor created successfully"
              );
            }}
            onCancel={() => setEditingVendor(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the vendor. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
