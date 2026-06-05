import { pgTable, serial, text, numeric, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const transactionStatusEnum = pgEnum("transaction_status", ["verified", "pending", "failed"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  cplid: text("cplid").notNull().unique(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  customerName: text("customer_name").notNull(),
  customerAccountNumber: text("customer_account_number").notNull(),
  bankName: text("bank_name").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  referenceNumber: text("reference_number").notNull().unique(),
  description: text("description"),
  verifiedBy: integer("verified_by").references(() => usersTable.id),
  verifiedAt: timestamp("verified_at"),
  customerPhone: text("customer_phone"),
  invoiceNumber: text("invoice_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
