import { Router, type IRouter } from "express";
import { eq, ilike, or, desc } from "drizzle-orm";
import { db, customersTable, transactionsTable } from "@workspace/db";
import { requireAuth, requireRole, type JwtPayload } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

function formatCustomer(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    rcNumber: c.rcNumber ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    address: c.address ?? null,
    contactPerson: c.contactPerson ?? null,
    notes: c.notes ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/customers", requireAuth, async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;

  let results;
  if (search) {
    results = await db
      .select()
      .from(customersTable)
      .where(
        or(
          ilike(customersTable.name, `%${search}%`),
          ilike(customersTable.rcNumber, `%${search}%`),
          ilike(customersTable.email, `%${search}%`),
          ilike(customersTable.phone, `%${search}%`),
        ),
      )
      .orderBy(desc(customersTable.createdAt));
  } else {
    results = await db
      .select()
      .from(customersTable)
      .orderBy(desc(customersTable.createdAt));
  }

  res.json(results.map(formatCustomer));
});

router.post(
  "/customers",
  requireAuth,
  requireRole("admin", "account_officer"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const { name, rcNumber, email, phone, address, contactPerson, notes } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Company name is required" });
      return;
    }

    const [customer] = await db
      .insert(customersTable)
      .values({
        name: name.trim(),
        rcNumber: rcNumber?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        contactPerson: contactPerson?.trim() || null,
        notes: notes?.trim() || null,
      })
      .returning();

    await logAudit("CUSTOMER_CREATED", jwtUser, `Created customer ${customer.name}`, req);

    res.status(201).json(formatCustomer(customer));
  },
);

router.get("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid customer ID" });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, id))
    .limit(1);

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.customerId, id))
    .orderBy(desc(transactionsTable.date));

  res.json({
    ...formatCustomer(customer),
    transactions: transactions.map((t) => ({
      id: t.id,
      cplid: t.cplid,
      amount: parseFloat(t.amount),
      status: t.status,
      date: t.date.toISOString(),
      referenceNumber: t.referenceNumber,
    })),
  });
});

router.patch(
  "/customers/:id",
  requireAuth,
  requireRole("admin", "account_officer"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid customer ID" });
      return;
    }

    const { name, rcNumber, email, phone, address, contactPerson, notes } = req.body;
    
    // Fixed: Using partial explicit mapping derived from the table type itself
    const updates: Partial<typeof customersTable.$inferInsert> = { 
      updatedAt: new Date() 
    };

    if (name !== undefined) {
      if (name === null || name.trim() === "") {
        res.status(400).json({ error: "Company name cannot be blank" });
        return;
      }
      updates.name = name.trim();
    }
    
    if (rcNumber !== undefined) updates.rcNumber = rcNumber?.trim() || null;
    if (email !== undefined) updates.email = email?.trim() || null;
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (address !== undefined) updates.address = address?.trim() || null;
    if (contactPerson !== undefined) updates.contactPerson = contactPerson?.trim() || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;

    const [customer] = await db
      .update(customersTable)
      .set(updates)
      .where(eq(customersTable.id, id))
      .returning();

    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    await logAudit("CUSTOMER_UPDATED", jwtUser, `Updated customer ${customer.name}`, req);

    res.json(formatCustomer(customer));
  },
);

router.delete(
  "/customers/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid customer ID" });
      return;
    }

    await db
      .update(transactionsTable)
      .set({ customerId: null })
      .where(eq(transactionsTable.customerId, id));

    const [customer] = await db
      .delete(customersTable)
      .where(eq(customersTable.id, id))
      .returning();

    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    await logAudit("CUSTOMER_DELETED", jwtUser, `Deleted customer ${customer.name}`, req);

    res.json({ message: "Customer deleted" });
  },
);

router.post(
  "/customers/:id/link-transaction",
  requireAuth,
  requireRole("admin", "account_officer"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const customerId = parseInt(req.params.id);
    const { transactionId } = req.body;

    if (isNaN(customerId) || !transactionId) {
      res.status(400).json({ error: "Valid customerId and transactionId required" });
      return;
    }

    const [transaction] = await db
      .update(transactionsTable)
      .set({ customerId })
      .where(eq(transactionsTable.id, transactionId))
      .returning();

    if (!transaction) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    await logAudit(
      "CUSTOMER_TRANSACTION_LINKED",
      jwtUser,
      `Linked transaction ${transaction.cplid} to customer ${customerId}`,
      req,
    );

    res.json({ message: "Transaction linked", cplid: transaction.cplid });
  },
);

export default router;