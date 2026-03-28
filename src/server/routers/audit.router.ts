import { z } from "zod";
import { createTRPCRouter, adminProcedure, managerProcedure } from "@/lib/trpc/trpc";
import { auditService } from "@/services/audit.service";
import { AuditAction } from "@prisma/client";

const auditListSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  resource: z.string().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  actorId: z.string().cuid().optional(),
  from: z.date().optional(),
  to: z.date().optional(),
});

export const auditRouter = createTRPCRouter({
  /**
   * List audit logs (admin only)
   */
  list: adminProcedure.input(auditListSchema).query(async ({ input }) => {
    return auditService.listAuditLogs(input);
  }),

  /**
   * Get a single audit log entry
   */
  getById: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      return auditService.getAuditLogById(input.id);
    }),

  /**
   * Get audit logs for a specific resource record
   */
  forResource: managerProcedure
    .input(
      z.object({
        resource: z.string().min(1),
        resourceId: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      return auditService.getLogsForResource(input.resource, input.resourceId);
    }),
});
