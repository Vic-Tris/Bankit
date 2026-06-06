import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import customersRouter from "./customers";
import transactionsRouter from "./transactions";
import transfersRouter from "./transfers";
import accountsRouter from "./accounts";
import beneficiariesRouter from "./beneficiaries";
import reportsRouter from "./reports";
import taxRouter from "./tax";
import auditRouter from "./audit";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(customersRouter);
router.use(transactionsRouter);
router.use(transfersRouter);
router.use(accountsRouter);
router.use(beneficiariesRouter);
router.use(reportsRouter);
router.use(taxRouter);
router.use(auditRouter);

export default router;
