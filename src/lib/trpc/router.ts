import { createTRPCRouter } from "@/lib/trpc/trpc";
import { userRouter } from "@/server/routers/user.router";
import { auditRouter } from "@/server/routers/audit.router";
import { importRouter } from "@/server/routers/import.router";

export const appRouter = createTRPCRouter({
  user: userRouter,
  audit: auditRouter,
  import: importRouter,
});

export type AppRouter = typeof appRouter;
