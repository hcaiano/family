"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";

interface TransactionStats {
  total: number;
  totalAmount: number;
  byCategory: {
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    count: number;
    amount: number;
  }[];
  byVendor: {
    vendorId: string;
    vendorName: string;
    count: number;
    amount: number;
  }[];
  recentTransactions: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    transaction_date: string;
    vendor?: { name: string } | null;
    categories?: { name: string; color: string } | null;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
          router.push("/auth/login");
          return;
        }

        // Fetch all transactions
        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select(
            `
            id, 
            description, 
            amount, 
            currency,
            transaction_date,
            vendor_id,
            category,
            vendor:vendors(id, name),
            categories:categories(id, name, color)
          `
          )
          .eq("user_id", sessionData.session.user.id)
          .order("transaction_date", { ascending: false });

        if (txError) throw txError;

        // Type assertion to help TypeScript understand the structure
        const typedTransactions = transactions as unknown as Array<{
          id: string;
          description: string;
          amount: number;
          currency: string;
          transaction_date: string;
          vendor_id: string | null;
          category: string | null;
          vendor: { id: string; name: string } | null;
          categories: { id: string; name: string; color: string } | null;
        }>;

        // Calculate stats
        const totalAmount =
          typedTransactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;

        // Group by category
        const categoryMap = new Map();
        typedTransactions?.forEach((tx) => {
          if (tx.categories) {
            const categoryId = tx.categories.id;
            if (!categoryMap.has(categoryId)) {
              categoryMap.set(categoryId, {
                categoryId,
                categoryName: tx.categories.name,
                categoryColor: tx.categories.color,
                count: 0,
                amount: 0,
              });
            }
            const category = categoryMap.get(categoryId);
            category.count += 1;
            category.amount += tx.amount;
          }
        });

        // Group by vendor
        const vendorMap = new Map();
        typedTransactions?.forEach((tx) => {
          if (tx.vendor) {
            const vendorId = tx.vendor.id;
            if (!vendorMap.has(vendorId)) {
              vendorMap.set(vendorId, {
                vendorId,
                vendorName: tx.vendor.name,
                count: 0,
                amount: 0,
              });
            }
            const vendor = vendorMap.get(vendorId);
            vendor.count += 1;
            vendor.amount += tx.amount;
          }
        });

        // Get 5 most recent transactions
        const recentTransactions =
          typedTransactions?.slice(0, 5).map((tx) => ({
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            currency: tx.currency,
            transaction_date: tx.transaction_date,
            vendor: tx.vendor,
            categories: tx.categories,
          })) || [];

        setStats({
          total: typedTransactions?.length || 0,
          totalAmount,
          byCategory: Array.from(categoryMap.values()),
          byVendor: Array.from(vendorMap.values()),
          recentTransactions,
        });
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [supabase, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="View your transaction statistics and recent activity"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "EUR",
              }).format(stats?.totalAmount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.byCategory.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 mt-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentTransactions.length === 0 ? (
              <p className="text-muted-foreground">No recent transactions</p>
            ) : (
              <div className="space-y-3">
                {stats?.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <div className="flex text-sm text-muted-foreground gap-2">
                        <span>{formatDate(tx.transaction_date)}</span>
                        {tx.categories && (
                          <div className="flex items-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: tx.categories.color }}
                            />
                            <span>{tx.categories.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p
                      className={
                        tx.amount < 0 ? "text-red-600" : "text-green-600"
                      }
                    >
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: tx.currency,
                      }).format(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.byCategory.length === 0 ? (
              <p className="text-muted-foreground">No categories found</p>
            ) : (
              <div className="space-y-3">
                {stats?.byCategory
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 5)
                  .map((category) => (
                    <div
                      key={category.categoryId}
                      className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.categoryColor }}
                        />
                        <span>{category.categoryName}</span>
                      </div>
                      <p>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "EUR",
                        }).format(category.amount)}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
