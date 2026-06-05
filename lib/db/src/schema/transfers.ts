import { pgTable, serial, text, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { bankAccountsTable } from "./bankAccounts";
import { beneficiariesTable } from "./beneficiaries";

export const transferStatusEnum = pgEnum("transfer_status", ["pending", "approved", "rejected", "failed"]);

export const transfersTable = pgTable("transfers", {
  id: serial("id").primaryKey(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  fromAccountId: integer("from_account_id").references(() => bankAccountsTable.id),
  beneficiaryId: integer("beneficiary_id").notNull().references(() => beneficiariesTable.id),
  narration: text("narration"),
  status: transferStatusEnum("status").notNull().default("pending"),
  initiatedBy: integer("initiated_by").notNull().references(() => usersTable.id),
  approvedBy: integer("approved_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTransferSchema = createInsertSchema(transfersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfersTable.$inferSelect;
