import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const beneficiariesTable = pgTable("beneficiaries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBeneficiarySchema = createInsertSchema(beneficiariesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export type Beneficiary = typeof beneficiariesTable.$inferSelect;
