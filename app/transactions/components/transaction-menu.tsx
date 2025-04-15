"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, Check, Tag, ShoppingBag, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
};

type Transaction = {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: string;
  status?: string;
};

interface TransactionMenuProps {
  transactionId: string;
  vendorId?: string | null;
  categoryId?: string | null;
  onUpdate: () => void;
}

export function TransactionMenu({
  transactionId,
  vendorId,
  categoryId,
  onUpdate,
}: TransactionMenuProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch vendors
        const { data: vendorsData, error: vendorsError } = await supabase
          .from("vendors")
          .select("*")
          .order("name");

        if (vendorsError) throw vendorsError;
        setVendors(vendorsData || []);

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();

    // Set up real-time subscriptions
    const channel = supabase
      .channel("menu-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vendors",
        },
        () => {
          console.log("Vendors changed, refreshing...");
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        () => {
          console.log("Categories changed, refreshing...");
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const assignVendor = async (vendor: Vendor | null) => {
    try {
      setLoading(true);

      const updates: {
        vendor_id: string | null;
        updated_at: string;
        category_id?: string | null;
      } = {
        vendor_id: vendor?.id || null,
        updated_at: new Date().toISOString(),
      };

      // If vendor has a category, also assign that category
      if (vendor?.category_id) {
        updates.category_id = vendor.category_id;
      }

      // Optimistically update the UI (Show loading toast)
      const toastId = toast.loading(
        vendor ? `Assigning to ${vendor.name}...` : "Removing vendor..."
      );

      const { error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", transactionId)
        .select();

      if (error) {
        toast.error(error.message || "Failed to assign vendor", {
          id: toastId,
        });
        throw error; // Throw error to be caught by catch block
      }

      toast.success(vendor ? `Assigned to ${vendor.name}` : "Vendor removed", {
        id: toastId,
      });
    } catch (error: any) {
      console.error("Error assigning vendor:", error);
      // Refresh the data to ensure UI is in sync on error
      onUpdate();
    } finally {
      setLoading(false);
    }
  };

  const assignCategory = async (categoryId: string | null) => {
    try {
      setLoading(true);

      const categoryName =
        categories.find((c) => c.id === categoryId)?.name || "None";

      // Optimistically update the UI (Show loading toast)
      const toastId = toast.loading(
        categoryId
          ? `Setting category to ${categoryName}...`
          : "Removing category..."
      );

      const { error } = await supabase
        .from("transactions")
        .update({
          category_id: categoryId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId)
        .select();

      if (error) {
        toast.error(error.message || "Failed to assign category", {
          id: toastId,
        });
        throw error; // Throw error to be caught by catch block
      }

      toast.success(
        categoryId ? `Category set to ${categoryName}` : "Category removed",
        { id: toastId }
      );
    } catch (error: any) {
      console.error("Error assigning category:", error);
      // Refresh the data to ensure UI is in sync on error
      onUpdate();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id);

      if (error) throw error;
      toast.success("Transaction deleted successfully");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to delete transaction");
    }
  };

  const handleIgnore = async (transaction: Transaction) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "ignored" })
        .eq("id", transaction.id);

      if (error) throw error;
      toast.success("Transaction marked as ignored");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to update transaction");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Assign</DropdownMenuLabel>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ShoppingBag className="mr-2 h-4 w-4" />
            <span>Vendor</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => assignVendor(null)}>
              <span>None</span>
              {!vendorId && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {vendors.map((vendor) => (
              <DropdownMenuItem
                key={vendor.id}
                onClick={() => assignVendor(vendor)}
              >
                <span>{vendor.name}</span>
                {vendor.is_subscription && (
                  <Badge className="ml-2 mr-auto bg-green-500 text-white">
                    Subscription
                  </Badge>
                )}
                {vendorId === vendor.id && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Tag className="mr-2 h-4 w-4" />
            <span>Category</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => assignCategory(null)}>
              <span>None</span>
              {!categoryId && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {categories.map((category) => (
              <DropdownMenuItem
                key={category.id}
                onClick={() => assignCategory(category.id)}
              >
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.name}</span>
                {categoryId === category.id && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
