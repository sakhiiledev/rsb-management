import { z } from "zod";
import { router, requireRole } from "../trpc/trpc";
import { auditService } from "@/services/audit.service";
import { handleServiceError } from "@/lib/errors";

export const auditRouter = router({
  list: requireRole("ADMIN", "MANAGER")
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        actorId: z.string().optional(),
        resource: z.string().optional(),
        action: z
          .enum(["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "IMPORT", "EXPORT"])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        return await auditService.listLogs(ctx.prisma, input);
      } catch (err) {
        handleServiceError(err);
      }
    }),
});
