import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { transactionsTable } from "./transactions";

export const receiptsTable = pgTable("receipts", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => transactionsTable.id),
  cplid: text("cplid").notNull(),
  customerName: text("customer_name").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull(),
  referenceNumber: text("reference_number").notNull(),
  qrCodeData: text("qr_code_data"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
});

export const insertReceiptSchema = createInsertSchema(receiptsTable).omit({
  id: true,
  issuedAt: true,
});

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receiptsTable.$inferSelect;
