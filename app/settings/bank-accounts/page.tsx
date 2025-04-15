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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageLayout } from "../components/page-layout";
import { useForm } from "@tanstack/react-form";
import { EmptyState } from "@/components/ui/empty-state";
import { BankLogo } from "@/components/bank-logo";

interface BankAccount {
  id: string;
  account_name: string;
  bank_type: string;
  bank_name: string | null;
  account_number_last4: string;
  currency: string;
}

const PORTUGUESE_BANKS = {
  bpi: { value: "bpi", label: "Banco BPI" },
  revolut: { value: "revolut", label: "Revolut" },
} as const;

const CURRENCIES = {
  EUR: { value: "EUR", label: "Euro (EUR)" },
  USD: { value: "USD", label: "US Dollar (USD)" },
  GBP: { value: "GBP", label: "British Pound (GBP)" },
  CHF: { value: "CHF", label: "Swiss Franc (CHF)" },
  JPY: { value: "JPY", label: "Japanese Yen (JPY)" },
  CAD: { value: "CAD", label: "Canadian Dollar (CAD)" },
  AUD: { value: "AUD", label: "Australian Dollar (AUD)" },
} as const;

const banks = Object.values(PORTUGUESE_BANKS);
const currencies = Object.values(CURRENCIES);

const getBankLabel = (bankType: string): string => {
  const bank = banks.find((bank) => bank.value === bankType);
  return bank?.label ?? bankType;
};

const getCurrencyLabel = (currency: string): string => {
  const currencyOption = currencies.find((c) => c.value === currency);
  return currencyOption?.label ?? currency;
};

export default function BankAccountsPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchBankAccounts = useCallback(async () => {
    try {
      const { data: accounts, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBankAccounts(accounts || []);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, [supabase.auth]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchBankAccounts();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchBankAccounts]);

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  const form = useForm({
    defaultValues: {
      account_name: "",
      bank_type: "",
      bank_name: "",
      account_number_last4: "",
      currency: "EUR",
    },
    onSubmit: async ({ value }) => {
      if (!userId) {
        toast.error("You must be logged in to add a bank account");
        return;
      }

      try {
        const data = {
          ...value,
          bank_name: value.bank_type === "other" ? value.bank_name : null,
          user_id: userId,
        };

        const { error } = await supabase.from("bank_accounts").insert([data]);
        if (error) {
          console.error("Supabase error:", error);
          toast.error(`Failed to add bank account: ${error.message}`);
          return;
        }

        toast.success("Bank account added");
        fetchBankAccounts();
        setIsAddDialogOpen(false);
        form.reset();
      } catch (error) {
        console.error("Error:", error);
        toast.error(
          `Failed to add bank account: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
  });

  const deleteBankAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Bank account deleted");
      fetchBankAccounts();
    } catch (error) {
      toast.error("Failed to delete bank account");
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <PageLayout
      title="Bank Accounts"
      subtitle="Manage your bank accounts for importing statements"
      actions={
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Bank Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bank Account</DialogTitle>
              <DialogDescription>
                Add a new bank account to import statements from
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              <form.Field
                name="account_name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Account name is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Account Name</Label>
                    <Input
                      id={field.name}
                      name={field.name}
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

              <form.Field
                name="bank_type"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Bank is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Bank</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((bank) => (
                          <SelectItem key={bank.value} value={bank.value}>
                            {bank.label}
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

              <form.Field
                name="bank_name"
                validators={{
                  onChange: ({ value }) =>
                    form.getFieldValue("bank_type") === "other" && !value
                      ? "Bank name is required"
                      : undefined,
                }}
              >
                {(field) => (
                  <div
                    className={`space-y-2 ${
                      form.getFieldValue("bank_type") !== "other" && "hidden"
                    }`}
                  >
                    <Label htmlFor={field.name}>Bank Name</Label>
                    <Input
                      id={field.name}
                      name={field.name}
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

              <form.Field
                name="account_number_last4"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return "Last 4 digits are required";
                    if (!/^\d{4}$/.test(value))
                      return "Please enter exactly 4 digits";
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Last 4 Digits</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      maxLength={4}
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

              <form.Field
                name="currency"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Primary currency is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Primary Currency</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem
                            key={currency.value}
                            value={currency.value}
                          >
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      The default currency for this account. You can still
                      import statements with transactions in other currencies.
                    </p>
                    {field.state.meta.errors && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Account</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {bankAccounts.length === 0 ? (
        <EmptyState
          title="No bank accounts"
          description="Add your first bank account to start importing statements"
          action={{
            label: "Add Bank Account",
            onClick: () => setIsAddDialogOpen(true),
            icon: Plus,
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {bankAccounts.map((account) => (
            <Card key={account.id} className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <BankLogo bankType={account.bank_type} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBankAccount(account.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity relative z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 mt-4">
                  <CardTitle className="text-xl font-semibold">
                    {account.account_name}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {getBankLabel(account.bank_type)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2 bg-secondary/50 px-3 py-1 rounded-md">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span>****{account.account_number_last4}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      Primary:
                    </span>
                    <span className="text-sm font-medium">
                      {getCurrencyLabel(account.currency)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
