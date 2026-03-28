import { z } from "zod";
import { router, protectedProcedure, requireRole } from "../trpc/trpc";
import { userService } from "@/services/user.service";
import { handleServiceError } from "@/lib/errors";
import { createUserSchema, updateUserSchema } from "@/services/user.service";

export const usersRouter = router({
  list: requireRole("ADMIN", "MANAGER").query(async ({ ctx }) => {
    try {
      return await userService.listUsers(ctx.prisma);
    } catch (err) {
      handleServiceError(err);
    }
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      try {
        return await userService.getUserById(ctx.prisma, input.id);
      } catch (err) {
        handleServiceError(err);
      }
    }),

  create: requireRole("ADMIN")
    .input(createUserSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await userService.createUser(ctx.prisma, input, ctx.session.user);
      } catch (err) {
        handleServiceError(err);
      }
    }),

  update: requireRole("ADMIN")
    .input(updateUserSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await userService.updateUser(ctx.prisma, input, ctx.session.user);
      } catch (err) {
        handleServiceError(err);
      }
    }),

  delete: requireRole("ADMIN")
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await userService.softDeleteUser(ctx.prisma, input.id, ctx.session.user);
      } catch (err) {
        handleServiceError(err);
      }
    }),
});
