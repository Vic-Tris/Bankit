import { format } from "date-fns";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string) {
  return format(new Date(dateString), "MMM d, yyyy HH:mm");
}
