"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, Check, Tag, ShoppingBag, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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
  }, [supabase]);

  const assignVendor = async (vendor: Vendor | null) => {
    try {
      setLoading(true);

      const updates: {
        vendor_id: string | null;
        updated_at: string;
        category?: string | null;
      } = {
        vendor_id: vendor?.id || null,
        updated_at: new Date().toISOString(),
      };

      // If vendor has a category, also assign that category
      if (vendor?.category_id) {
        updates.category = vendor.category_id;
      }

      const { error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", transactionId);

      if (error) throw error;

      toast.success(vendor ? `Assigned to ${vendor.name}` : "Vendor removed");
      onUpdate();
    } catch (error) {
      console.error("Error assigning vendor:", error);
      toast.error("Failed to assign vendor");
    } finally {
      setLoading(false);
    }
  };

  const assignCategory = async (categoryId: string | null) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("transactions")
        .update({
          category: categoryId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      if (error) throw error;

      const categoryName =
        categories.find((c) => c.id === categoryId)?.name || "None";
      toast.success(
        categoryId ? `Category set to ${categoryName}` : "Category removed"
      );
      onUpdate();
    } catch (error) {
      console.error("Error assigning category:", error);
      toast.error("Failed to assign category");
    } finally {
      setLoading(false);
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
                  <Badge
                    variant="solid"
                    colorScheme="green"
                    className="ml-2 mr-auto"
                  >
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
