"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryForm } from "@/app/settings/categories/components/category-form";
import { CategoryList } from "@/app/settings/categories/components/category-list";
import { toast } from "sonner";
import { PageLayout } from "../components/page-layout";

export default function CategoriesPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <PageLayout
      title="Categories"
      subtitle="Manage your transaction categories"
      actions={
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      }
    >
      <div className="flex flex-col-reverse md:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Categories List</CardTitle>
            <CardDescription>
              View and manage your transaction categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryList />
          </CardContent>
        </Card>

        {isCreating && (
          <Card className="w-full md:w-1/3">
            <CardHeader>
              <CardTitle>Add New Category</CardTitle>
              <CardDescription>
                Create a new transaction category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryForm
                onSuccess={() => {
                  setIsCreating(false);
                  toast.success("Category created successfully");
                  router.refresh();
                }}
                onCancel={() => setIsCreating(false)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
