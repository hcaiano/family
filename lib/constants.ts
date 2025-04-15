export const CURRENCIES = [
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "BRL", label: "Brazilian Real (BRL)" },
  { value: "CHF", label: "Swiss Franc (CHF)" },
  { value: "AOA", label: "Angolan Kwanza (AOA)" },
  { value: "CVE", label: "Cape Verdean Escudo (CVE)" },
  { value: "MZN", label: "Mozambican Metical (MZN)" },
] as const;

export const PORTUGUESE_BANKS = [
  { value: "bpi", label: "Banco BPI" },
  { value: "revolut", label: "Revolut" },
] as const;

export type Currency = (typeof CURRENCIES)[number]["value"];
export type BankType = (typeof PORTUGUESE_BANKS)[number]["value"];
