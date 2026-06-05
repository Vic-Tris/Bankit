import { pgTable, serial, text, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bankAccountsTable = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  balance: numeric("balance", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("NGN"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBankAccountSchema = createInsertSchema(bankAccountsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccountsTable.$inferSelect;
