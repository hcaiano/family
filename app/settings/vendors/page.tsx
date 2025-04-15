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
import { VendorForm } from "./components/vendor-form";
import { VendorList } from "./components/vendor-list";
import { toast } from "sonner";
import { PageLayout } from "../components/page-layout";

export default function VendorsPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <PageLayout
      title="Vendors"
      subtitle="Manage your transaction vendors"
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
            <CardTitle>Vendors List</CardTitle>
            <CardDescription>
              View and manage your transaction vendors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VendorList />
          </CardContent>
        </Card>

        {isCreating && (
          <Card className="w-full md:w-1/3">
            <CardHeader>
              <CardTitle>Add New Vendor</CardTitle>
              <CardDescription>Create a new transaction vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <VendorForm
                onSuccess={() => {
                  setIsCreating(false);
                  toast.success("Vendor created successfully");
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
