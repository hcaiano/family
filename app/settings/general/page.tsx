"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { PageLayout } from "../components/page-layout";
import { useForm } from "@tanstack/react-form";

export default function GeneralSettingsPage() {
  const { theme, setTheme } = useTheme();

  const form = useForm({
    defaultValues: {
      theme: theme || "system",
      language: "pt",
    },
    onSubmit: async ({ value }) => {
      setTheme(value.theme);
      // Language selection is coming soon
    },
  });

  return (
    <PageLayout
      title="General Settings"
      subtitle="Manage your application preferences"
    >
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Customize your application experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-6"
          >
            <form.Field name="theme">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Theme</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      field.handleChange(value);
                      setTheme(value);
                    }}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred theme for the application
                  </p>
                </div>
              )}
            </form.Field>

            <form.Field name="language">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Language</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred language (coming soon)
                  </p>
                </div>
              )}
            </form.Field>
          </form>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
