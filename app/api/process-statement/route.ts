import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import Papa from "papaparse";
import * as xlsx from "xlsx";

interface Transaction {
  transaction_date: string;
  amount: number;
  currency: string;
  description: string;
}

interface TransactionInsert {
  user_id: string;
  bank_account_id: string;
  statement_id: string;
  transaction_date: string;
  amount: number;
  currency: string;
  description: string;
  source_id?: string | null;
  category?: string;
  notes?: string;
  status?: string;
}

interface RequestPayload {
  storagePath: string;
  bankAccountId: string;
}

type ParseResult = {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  [key: string]: unknown;
};

type ProcessedRow = {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  status: string;
  bank_account_id: string;
  statement_id: string;
};

export async function POST(req: Request) {
  console.log("🟢 API: Starting process-statement");

  let supabase;
  let storagePath;

  try {
    // 1. Initialize Supabase Client
    const cookieStore = await cookies();
    console.log("🟢 API: Got cookies");

    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: Partial<ResponseCookie>) {
            cookieStore.set(name, value, options);
          },
          remove(name: string) {
            cookieStore.delete(name);
          },
        },
      }
    );
    console.log("🟢 API: Initialized Supabase client");

    // 2. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log("🟢 API: Auth check result:", {
      user: !!user,
      error: !!authError,
    });

    if (authError || !user) {
      console.log("🔴 API: Unauthorized - no user or auth error");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Get Input
    const payload: RequestPayload = await req.json();
    storagePath = payload.storagePath;
    const { bankAccountId } = payload;
    console.log("🟢 API: Got payload:", { storagePath, bankAccountId });

    if (!storagePath || !bankAccountId) {
      console.log("🔴 API: Missing payload data");
      return NextResponse.json(
        { error: "Missing storagePath or bankAccountId in request body" },
        { status: 400 }
      );
    }

    // Get the bank account
    const { data: bankAccount, error: bankAccountError } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("id", bankAccountId)
      .single();

    if (bankAccountError || !bankAccount) {
      console.error("Error fetching bank account:", bankAccountError);
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    // Verify bank account belongs to user
    if (bankAccount.user_id !== user.id) {
      return NextResponse.json(
        { error: "Bank account does not belong to user" },
        { status: 403 }
      );
    }

    // Create statement record
    const { data: statement, error: statementError } = await supabase
      .from("statements")
      .insert({
        user_id: user.id,
        bank_account_id: bankAccountId,
        storage_path: storagePath,
        status: "parsing",
        filename: storagePath.split("/").pop() || "unknown.xlsx",
        source_bank: bankAccount.bank_type?.toLowerCase() || "other",
        transactions_count: 0,
      })
      .select()
      .single();

    if (statementError) {
      console.error("Error creating statement:", statementError);
      return NextResponse.json(
        {
          error: "Failed to create statement record: " + statementError.message,
        },
        { status: 500 }
      );
    }

    // 4. Download File from Storage
    console.log("🟢 API: Attempting to download file from storage");
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("statements")
      .download(storagePath);

    if (downloadError || !fileBlob) {
      console.error("🔴 API: Error downloading file:", downloadError);
      return NextResponse.json(
        { error: "Failed to download file from storage" },
        { status: 500 }
      );
    }
    console.log("🟢 API: File downloaded successfully");

    // 5. Get Existing Transactions
    const { data: existingDbTransactions, error: fetchError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("bank_account_id", bankAccountId)
      .order("transaction_date", { ascending: false });

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch existing transactions" },
        { status: 500 }
      );
    }

    // 6. Process File Based on Bank Type
    const transactionsToInsert: TransactionInsert[] = [];
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    if (bankAccount.bank_type === "revolut") {
      console.log(`Processing Revolut CSV`);
      const fileContent = await fileBlob.text();
      try {
        const parsedCsv = Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
        });

        // Debug: Log the parsed CSV structure
        console.log("CSV Parse Result:", {
          data: parsedCsv.data.length,
          errors: parsedCsv.errors,
          meta: parsedCsv.meta,
        });

        // Debug: Log the first row to see its structure
        if (parsedCsv.data.length > 0) {
          console.log("First row structure:", parsedCsv.data[0]);
        }

        for (const row of parsedCsv.data as any[]) {
          processedCount++;

          try {
            const completedDate = row["Date completed (UTC)"];
            if (!completedDate) {
              console.warn("Skipping row without completed date");
              errorCount++;
              continue;
            }

            const transactionDate = new Date(completedDate);
            if (isNaN(transactionDate.getTime())) {
              console.warn(
                `Skipping row with invalid date format: ${completedDate}`
              );
              errorCount++;
              continue;
            }
            const transactionDateIso = transactionDate
              .toISOString()
              .split("T")[0];

            const description = row["Description"]?.trim() || "";
            const amountStr = row["Amount"];
            const currency = row["Payment currency"]?.trim();

            if (!currency) {
              console.warn("Skipping row without currency", { row });
              errorCount++;
              continue;
            }

            const amount = parseFloat(amountStr);
            if (isNaN(amount)) {
              console.warn(
                `Skipping row with invalid amount format: ${amountStr}`,
                { row }
              );
              errorCount++;
              continue;
            }

            // Check for duplicates
            const isDuplicate = existingDbTransactions?.some(
              (t: Transaction) =>
                t.transaction_date === transactionDateIso &&
                Math.abs(t.amount - amount) < 0.001 && // Use tolerance for float comparison
                t.currency === currency &&
                t.description === description
            );

            if (isDuplicate) {
              // Clearer logging for duplicates
              console.log(
                `Skipping duplicate transaction: Date=${transactionDateIso}, Amount=${amount}, Desc=${description}`
              );
              skippedCount++;
              continue;
            }

            // Reduced logging: Log only the transaction being added if successful
            transactionsToInsert.push({
              user_id: user.id,
              bank_account_id: bankAccountId,
              statement_id: statement.id,
              transaction_date: transactionDateIso,
              description: description,
              amount: amount,
              currency: currency,
              source_id: storagePath,
            });
          } catch (rowError: any) {
            console.error("Error processing Revolut row:", rowError, { row });
            errorCount++;
          }
        }

        // Log summary counts
        console.log("Revolut Processing Summary:", {
          processedCount,
          skippedCount,
          errorCount,
          transactionsToInsert: transactionsToInsert.length,
        });
      } catch (csvError: any) {
        console.error("Error processing Revolut CSV:", csvError);
        return NextResponse.json(
          { error: "Failed to process Revolut CSV data" },
          { status: 500 }
        );
      }
    } else if (bankAccount.bank_type === "bpi") {
      console.log(`Processing BPI XLSX`);
      const fileBuffer = await fileBlob.arrayBuffer();
      try {
        const workbook = xlsx.read(fileBuffer, { type: "buffer" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Debug: Log sheet information
        console.log("Sheet Names:", workbook.SheetNames);
        console.log("First Sheet Range:", worksheet["!ref"]);

        const jsonData = xlsx.utils.sheet_to_json(worksheet, {
          raw: false, // This will keep numbers as strings
          defval: "", // Default value for empty cells
          range: 15, // Start from row 16 where the actual transactions begin
        });

        // Debug: Log the first few rows to understand the structure
        console.log("First row of data:", JSON.stringify(jsonData[0], null, 2));
        console.log("Total rows found:", jsonData.length);

        for (const row of jsonData as any[]) {
          processedCount++;

          try {
            const dateStr = row["Data Mov."];
            if (!dateStr) {
              console.warn("Skipping row without date", { row });
              errorCount++;
              continue;
            }

            // Parse date (DD-MM-YYYY format)
            const dateParts = dateStr.split("-").map(Number);
            if (dateParts.length !== 3 || dateParts.some(isNaN)) {
              console.warn(`Skipping row with invalid date format: ${dateStr}`);
              errorCount++;
              continue;
            }
            const [day, month, year] = dateParts;
            const transactionDate = new Date(year, month - 1, day);

            if (isNaN(transactionDate.getTime())) {
              console.warn(
                `Skipping row with invalid date construction: ${dateStr}`
              );
              errorCount++;
              continue;
            }
            const transactionDateIso = transactionDate
              .toISOString()
              .split("T")[0];

            const description = row["Descrição do Movimento"]?.trim() || "";

            // Simplified amount/currency parsing (prioritize Montante)
            let parsedAmount: number | undefined = undefined;
            let parsedCurrency: string = "EUR"; // Default BPI currency
            const montanteStr = row["Montante"] || "";
            const valorEurStr = row["Valor em EUR"] || "";

            if (montanteStr) {
              // Regex to handle different decimal separators and optional currency
              const montanteMatch = montanteStr
                .replace(",", ".")
                .match(/(-?)([\d.]+)\s*([A-Z]{3})?/);
              if (montanteMatch) {
                const sign = montanteMatch[1] === "-" ? -1 : 1;
                const amountValue = parseFloat(montanteMatch[2]);
                if (!isNaN(amountValue)) {
                  parsedAmount = sign * amountValue;
                  parsedCurrency = montanteMatch[3] || parsedCurrency; // Use found currency or default EUR
                }
              }
            }

            // Fallback to Valor em EUR if Montante parsing failed or was empty
            if (parsedAmount === undefined && valorEurStr) {
              const amountValue = parseFloat(
                valorEurStr.replace(/\s/g, "").replace(",", ".")
              );
              if (!isNaN(amountValue)) {
                parsedAmount = amountValue;
                parsedCurrency = "EUR"; // Explicitly EUR if using this column
              }
            }

            // Check if amount parsing was successful
            if (parsedAmount === undefined || isNaN(parsedAmount)) {
              console.warn("Skipping row with unparseable amount", {
                montanteStr,
                valorEurStr,
                row,
              });
              errorCount++;
              continue;
            }

            // Check for duplicates
            const isDuplicate = existingDbTransactions?.some(
              (t: Transaction) =>
                t.transaction_date === transactionDateIso &&
                Math.abs(t.amount - parsedAmount!) < 0.001 && // Use tolerance
                t.currency === parsedCurrency &&
                t.description === description
            );

            if (isDuplicate) {
              console.log(
                `Skipping duplicate transaction: Date=${transactionDateIso}, Amount=${parsedAmount}, Desc=${description}`
              );
              skippedCount++;
              continue;
            }

            transactionsToInsert.push({
              user_id: user.id,
              bank_account_id: bankAccountId,
              statement_id: statement.id,
              transaction_date: transactionDateIso,
              description: description,
              amount: parsedAmount,
              currency: parsedCurrency,
              source_id: storagePath,
            });
          } catch (rowError: any) {
            console.error("Error processing BPI row:", rowError, { row });
            errorCount++;
          }
        }
        // Log summary counts
        console.log("BPI Processing Summary:", {
          processedCount,
          skippedCount,
          errorCount,
          transactionsToInsert: transactionsToInsert.length,
        });
      } catch (xlsxError: any) {
        console.error("Error processing BPI XLSX:", xlsxError);
        return NextResponse.json(
          { error: "Failed to process BPI XLSX data" },
          { status: 500 }
        );
      }
    } else {
      console.error(`🔴 Unsupported bank type: ${bankAccount.bank_type}`);
      return NextResponse.json(
        { error: `Unsupported bank type: ${bankAccount.bank_type}` },
        { status: 400 }
      );
    }

    // 7. Insert Transactions & Update Statement Count
    let finalCount = 0;

    try {
      if (transactionsToInsert.length > 0) {
        console.log(
          `🟢 Attempting to insert ${transactionsToInsert.length} transactions...`
        );
        const { data: insertedTransactions, error: insertError } =
          await supabase
            .from("transactions")
            .insert(transactionsToInsert)
            .select("id"); // Only select ID to confirm insertion and count

        if (insertError) {
          // If insertion fails, log the error and return 500 immediately
          console.error("🔴 Error inserting transactions:", insertError);
          // Update statement status to error
          await supabase
            .from("statements")
            .update({ status: "error" })
            .eq("id", statement.id);
          return NextResponse.json(
            {
              error: "Failed to insert transactions",
              details: insertError.message,
            },
            { status: 500 }
          );
        } else {
          finalCount = insertedTransactions?.length || 0;
          console.log(`🟢 Successfully inserted ${finalCount} transactions.`);
        }
      } else {
        // No transactions were prepared for insertion
        console.log(
          "🟡 No new transactions to insert." +
            (errorCount > 0 ? ` Errors during parsing: ${errorCount}.` : "")
        );
        // finalCount remains 0
      }

      // Update statement record
      console.log(
        `🟢 Updating statement ${storagePath} with final count: ${finalCount}`
      );
      const { error: updateError } = await supabase
        .from("statements")
        .update({
          transactions_count: finalCount,
          status: "parsed",
        })
        .eq("id", statement.id);

      if (updateError) {
        console.error(
          `🔴 Failed to update statement transaction count:`,
          updateError
        );
        // Return an error because the count update is critical
        return NextResponse.json(
          { error: `Failed to update statement count: ${updateError.message}` },
          { status: 500 }
        );
      }

      // 8. Return Success Response
      console.log(
        `✅ Processing complete for ${storagePath}. Final Count: ${finalCount}`
      );
      return NextResponse.json({
        message: `Statement processing finished for ${storagePath}.`,
        details: `File parsing: ${processedCount} rows processed, ${finalCount} inserted, ${skippedCount} duplicates skipped, ${errorCount} row parsing errors.`,
        bankType: bankAccount.bank_type,
        transactionCount: finalCount,
        statementId: statement.id,
      });
    } catch (procError: any) {
      // Simplify catch block for processing errors
      console.error(
        "🔴 Error during transaction processing (insert/update):",
        procError
      );
      // Update statement status to error
      await supabase
        .from("statements")
        .update({ status: "error" })
        .eq("id", statement.id);
      return NextResponse.json(
        { error: `Processing error: ${procError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    // Outer catch block remains largely the same
    console.error(`🔴 FATAL Error in process-statement setup:`, error);
    // No status update needed here either
    return NextResponse.json(
      { error: `Fatal processing error: ${error?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
