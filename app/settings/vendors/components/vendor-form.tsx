"use client";

import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// Schema for vendor validation
const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category_id: z.string().optional(),
  is_subscription: z.boolean().default(false),
});

type Category = {
  id: string;
  name: string;
  color: string;
};

type VendorFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: {
    id: string;
    name: string;
    category_id?: string;
    is_subscription?: boolean;
  };
};

export function VendorForm({
  onSuccess,
  onCancel,
  initialData,
}: VendorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    // Fetch categories for the dropdown
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name, color")
          .order("name");

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories");
      }
    };

    fetchCategories();
  }, [supabase]);

  const form = useForm({
    defaultValues: {
      name: initialData?.name || "",
      category_id: initialData?.category_id || "",
      is_subscription: initialData?.is_subscription || false,
    },
    onSubmit: async ({ value }) => {
      if (!userId) {
        toast.error("You must be logged in to create a vendor");
        return;
      }

      try {
        setIsSubmitting(true);

        if (initialData?.id) {
          // Update existing vendor
          const { error } = await supabase
            .from("vendors")
            .update({
              name: value.name,
              category_id: value.category_id || null,
              is_subscription: value.is_subscription,
              updated_at: new Date().toISOString(),
            })
            .eq("id", initialData.id)
            .eq("user_id", userId);

          if (error) throw error;
        } else {
          // Create new vendor
          const { error } = await supabase.from("vendors").insert({
            name: value.name,
            category_id: value.category_id || null,
            is_subscription: value.is_subscription,
            user_id: userId,
          });

          if (error) throw error;
        }

        onSuccess();
      } catch (error) {
        console.error("Error saving vendor:", error);
        toast.error("Failed to save vendor");
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field name="name">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Vendor name"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors[0]}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="category_id">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={field.state.value || ""}
              onValueChange={field.handleChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.state.meta.errors && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors[0]}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="is_subscription">
        {(field) => (
          <div className="flex items-center gap-2 pt-2">
            <Switch
              id="is_subscription"
              checked={field.state.value}
              onCheckedChange={field.handleChange}
            />
            <Label htmlFor="is_subscription">
              Subscription / Recurring Vendor
            </Label>
          </div>
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !form.state.canSubmit}>
          {initialData ? "Update" : "Create"} Vendor
        </Button>
      </div>
    </form>
  );
}
