import { initTRPC, TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { type UserRole } from "@prisma/client";

export async function createTRPCContext(opts: { req: any; res: any }) {
  const session = await getServerSession(opts.req, opts.res, authOptions);
  return {
    prisma,
    session,
    req: opts.req,
    res: opts.res,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;
  logger.info({ path, type, duration, ok: result.ok }, "tRPC call");
  return result;
});

export const router = t.router;
export const publicProcedure = t.procedure.use(loggerMiddleware);

export const protectedProcedure = t.procedure
  .use(loggerMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
      },
    });
  });

export function requireRole(...roles: UserRole[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    const userRole = ctx.session.user.role;
    if (!roles.includes(userRole)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
}
