import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/supabase/database.types";
import { OpenRouter } from "@/lib/openrouter";

// Initialize OpenRouter client
const openRouter = new OpenRouter(process.env.OPENROUTER_API_KEY!);

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

// Number of transactions to process in each batch
const BATCH_SIZE = 10;

export async function POST(req: NextRequest) {
  // Verify authorization
  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get transactions that need vendor analysis
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .or("ai_analysis_status.is.null,ai_analysis_status.eq.pending")
    .limit(BATCH_SIZE);

  if (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Error fetching transactions" },
      { status: 500 }
    );
  }

  if (!transactions?.length) {
    return NextResponse.json(
      { message: "No transactions to process" },
      { status: 200 }
    );
  }

  // Process each transaction
  for (const transaction of transactions) {
    try {
      // Mark transaction as processing
      await supabase
        .from("transactions")
        .update({ ai_analysis_status: "processing" })
        .eq("id", transaction.id);

      // Prepare prompt for AI analysis
      const prompt = `Given this transaction:
Description: ${transaction.description}
Amount: ${transaction.amount}
Date: ${transaction.transaction_date}

Please analyze this transaction and extract the vendor name. Only respond with the vendor name, nothing else. If you're not confident about the vendor, respond with "NEEDS_REVIEW".`;

      // Call OpenRouter API
      const response = await openRouter.generateText({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [{ role: "user", content: prompt }],
      });

      const vendorName = response.trim();

      if (vendorName === "NEEDS_REVIEW") {
        await supabase
          .from("transactions")
          .update({
            ai_analysis_status: "needs_vendor_review",
          })
          .eq("id", transaction.id);
        continue;
      }

      // Get or create vendor
      const vendor = await getOrCreateVendor(supabase, vendorName, transaction);

      // Update transaction with vendor and mark as completed
      await supabase
        .from("transactions")
        .update({
          vendor_id: vendor.id,
          ai_analysis_status: "completed",
          ai_extracted_vendor: vendorName,
        })
        .eq("id", transaction.id);
    } catch (error) {
      console.error(`Error processing transaction ${transaction.id}:`, error);
      await supabase
        .from("transactions")
        .update({ ai_analysis_status: "error" })
        .eq("id", transaction.id);
    }
  }

  return NextResponse.json(
    { message: "Batch processing completed" },
    { status: 200 }
  );
}

async function getOrCreateVendor(
  supabase: SupabaseClient<Database>,
  name: string,
  transaction: Database["public"]["Tables"]["transactions"]["Row"]
) {
  // Check if vendor exists
  const { data: existingVendors } = await supabase
    .from("vendors")
    .select()
    .eq("user_id", transaction.user_id)
    .ilike("name", name)
    .limit(1);

  if (existingVendors?.length) {
    return existingVendors[0];
  }

  // Create new vendor
  const { data: newVendor, error } = await supabase
    .from("vendors")
    .insert({
      name,
      user_id: transaction.user_id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return newVendor;
}
