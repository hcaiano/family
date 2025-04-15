"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PageLayout } from "./components/page-layout";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";

type CompanyInfo = {
  company_name: string;
  nif: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      company_name: "",
      nif: "",
      address: "",
      postal_code: "",
      city: "",
      country: "Portugal",
      email: "",
      phone: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase.from("company_info").upsert(
          {
            user_id: user.id,
            ...value,
          },
          { onConflict: "user_id" }
        );

        if (error) throw error;
        toast.success("Company information saved");
      } catch (error) {
        toast.error("Failed to save company information");
        console.error("Error:", error);
      }
    },
  });

  const fetchCompanyInfo = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("company_info")
        .select("*")
        .single();

      if (error) throw error;

      // Update form with data if available
      if (data) {
        form.setFieldValue("company_name", data.company_name);
        form.setFieldValue("nif", data.nif);
        form.setFieldValue("address", data.address || "");
        form.setFieldValue("postal_code", data.postal_code || "");
        form.setFieldValue("city", data.city || "");
        form.setFieldValue("country", data.country || "Portugal");
        form.setFieldValue("email", data.email || "");
        form.setFieldValue("phone", data.phone || "");
      }
    } catch (err) {
      toast.error("Failed to load company information");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, form]);

  useEffect(() => {
    fetchCompanyInfo();
  }, [fetchCompanyInfo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <PageLayout
      title="Company Information"
      subtitle="Update your company details used in invoices and statements"
    >
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>
            These details will appear on your invoices and statements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <form.Field name="company_name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Company Name</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="nif">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>NIF</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="address">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Address</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="postal_code">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Postal Code</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="city">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>City</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="country">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Country</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="email">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Email</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="phone">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Phone</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="tel"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
