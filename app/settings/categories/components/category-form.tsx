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
import { toast } from "sonner";

const colors = {
  slate: "#64748B",
  gray: "#6B7280",
  zinc: "#71717A",
  neutral: "#737373",
  stone: "#78716C",
  red: "#EF4444",
  orange: "#F97316",
  amber: "#F59E0B",
  yellow: "#EAB308",
  lime: "#84CC16",
  green: "#22C55E",
  emerald: "#10B981",
  teal: "#14B8A6",
  cyan: "#06B6D4",
  sky: "#0EA5E9",
  blue: "#3B82F6",
  indigo: "#6366F1",
  violet: "#8B5CF6",
  purple: "#A855F7",
  fuchsia: "#D946EF",
  pink: "#EC4899",
  rose: "#F43F5E",
};

// Schema for category validation
const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string(),
});

type CategoryFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: {
    id: string;
    name: string;
    color: string;
  };
};

export function CategoryForm({
  onSuccess,
  onCancel,
  initialData,
}: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const form = useForm({
    defaultValues: {
      name: initialData?.name || "",
      color: initialData?.color || "#64748B", // Default to slate
    },
    onSubmit: async ({ value }) => {
      if (!userId) {
        toast.error("You must be logged in to create a category");
        return;
      }

      try {
        setIsSubmitting(true);

        if (initialData?.id) {
          // Update existing category
          const { error } = await supabase
            .from("categories")
            .update({
              name: value.name,
              color: value.color,
              updated_at: new Date().toISOString(),
            })
            .eq("id", initialData.id)
            .eq("user_id", userId);

          if (error) throw error;
        } else {
          // Create new category
          const { error } = await supabase.from("categories").insert({
            name: value.name,
            color: value.color,
            user_id: userId,
          });

          if (error) throw error;
        }

        onSuccess();
      } catch (error) {
        console.error("Error saving category:", error);
        toast.error("Failed to save category");
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
              placeholder="Category name"
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

      <form.Field name="color">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Select
              value={field.state.value}
              onValueChange={field.handleChange}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: field.state.value }}
                  />
                  <SelectValue placeholder="Select a color" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(colors).map(([name, hex]) => (
                  <SelectItem key={name} value={hex}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="capitalize">{name}</span>
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

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !form.state.canSubmit}>
          {initialData ? "Update" : "Create"} Category
        </Button>
      </div>
    </form>
  );
}
