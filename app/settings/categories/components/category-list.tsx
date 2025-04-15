"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Tag } from "lucide-react";
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
import { CategoryForm } from "./category-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

type Category = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export function CategoryList() {
  const router = useRouter();
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [supabase]);

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      // Check if category is in use by any vendors
      const { data: vendorsUsingCategory, error: vendorsError } = await supabase
        .from("vendors")
        .select("id")
        .eq("category_id", deletingId)
        .limit(1);

      if (vendorsError) throw vendorsError;

      if (vendorsUsingCategory && vendorsUsingCategory.length > 0) {
        toast.error("Cannot delete category that is in use by vendors");
        return;
      }

      // Delete the category
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      setCategories(categories.filter((cat) => cat.id !== deletingId));
      toast.success("Category deleted successfully");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="flex justify-center p-8">
          <p className="text-muted-foreground">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No categories</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first category to organize your transactions
          </p>
          <Button
            onClick={() =>
              setEditingCategory({
                id: "",
                name: "",
                color: "#000000",
                created_at: "",
              })
            }
            className="mt-4"
          >
            <Tag className="mr-2 h-4 w-4" />
            Add category
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div>
                  <h3 className="font-medium">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(category.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingCategory(category)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeletingId(category.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Category Dialog */}
      <Dialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory?.id ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            initialData={
              editingCategory
                ? {
                    id: editingCategory.id,
                    name: editingCategory.name,
                    color: editingCategory.color,
                  }
                : undefined
            }
            onSuccess={() => {
              setEditingCategory(null);
              router.refresh();
              toast.success(
                editingCategory?.id
                  ? "Category updated successfully"
                  : "Category created successfully"
              );
            }}
            onCancel={() => setEditingCategory(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category. This action cannot be
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
