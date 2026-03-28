import { router } from "../trpc/trpc";
import { usersRouter } from "./users";
import { auditRouter } from "./audit";

export const appRouter = router({
  users: usersRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
