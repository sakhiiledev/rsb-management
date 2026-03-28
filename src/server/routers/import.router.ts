import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  managerProcedure,
} from "@/lib/trpc/trpc";
import { importService } from "@/services/import.service";
import { Role } from "@prisma/client";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const importRouter = createTRPCRouter({
  /**
   * Step 1: Validate and preview the uploaded file (no DB writes)
   */
  preview: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileType: z.enum(["xlsx", "csv"]),
        // Base64-encoded file content
        fileContent: z.string().max(MAX_FILE_SIZE * 1.4), // base64 overhead
        resource: z.string().min(1), // which entity to import, e.g. "users"
      })
    )
    .mutation(async ({ input, ctx }) => {
      return importService.previewImport(input, ctx.session.user.id);
    }),

  /**
   * Step 2: Confirm the import — kicks off a BullMQ job
   */
  confirm: protectedProcedure
    .input(
      z.object({
        importId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const imp = await importService.getImportById(input.importId);
      if (!imp) throw new TRPCError({ code: "NOT_FOUND" });
      if (imp.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return importService.confirmImport(input.importId, ctx.session.user.id);
    }),

  /**
   * Get import status/details
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      const imp = await importService.getImportById(input.id);
      if (!imp) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        imp.createdById !== ctx.session.user.id &&
        !([Role.ADMIN, Role.MANAGER] as string[]).includes(ctx.session.user.role as string)
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return imp;
    }),

  /**
   * List imports for the current user (all for admin/manager)
   */
  list: managerProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      return importService.listImports(input);
    }),
});
