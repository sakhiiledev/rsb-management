import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
  managerProcedure,
} from "@/lib/trpc/trpc";
import { userService } from "@/services/user.service";
import {
  createUserSchema,
  updateUserSchema,
  paginationSchema,
} from "@/lib/validations/user.schema";
import { Role } from "@prisma/client";

export const userRouter = createTRPCRouter({
  /**
   * List users with pagination (admin/manager only)
   */
  list: managerProcedure.input(paginationSchema).query(async ({ input }) => {
    return userService.listUsers(input);
  }),

  /**
   * Get a single user by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      // Members can only read their own profile
      if (
        ctx.session.user.role === Role.MEMBER &&
        ctx.session.user.id !== input.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const user = await userService.getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return user;
    }),

  /**
   * Create a new user (admin only)
   */
  create: adminProcedure
    .input(createUserSchema)
    .mutation(async ({ input, ctx }) => {
      return userService.createUser(input, ctx.session.user.id);
    }),

  /**
   * Update a user
   */
  update: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ input, ctx }) => {
      // Members can only update their own profile (non-role fields)
      if (
        ctx.session.user.role === Role.MEMBER &&
        ctx.session.user.id !== input.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Only admins can change roles
      if (input.role && ctx.session.user.role !== Role.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can change user roles",
        });
      }
      return userService.updateUser(input, ctx.session.user.id);
    }),

  /**
   * Soft-delete a user (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete your own account",
        });
      }
      return userService.deleteUser(input.id, ctx.session.user.id);
    }),

  /**
   * Get the currently authenticated user
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await userService.getUserById(ctx.session.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return user;
  }),
});
