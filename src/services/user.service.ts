import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { auditService } from "./audit.service";
import { AuditAction } from "@prisma/client";
import {
  createUserSchema,
  updateUserSchema,
  paginationSchema,
} from "@/lib/validations/user.schema";

// Columns safe to return to the client (never include passwordHash)
const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  image: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} as const;

export const userService = {
  async listUsers(input: z.infer<typeof paginationSchema>) {
    const { page, limit, search } = input;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [users, total] = await db.$transaction([
      db.user.findMany({
        where,
        select: safeUserSelect,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.user.count({ where }),
    ]);

    return { users, total, page, limit };
  },

  async getUserById(id: string) {
    return db.user.findFirst({
      where: { id, deletedAt: null },
      select: safeUserSelect,
    });
  },

  async createUser(
    input: z.infer<typeof createUserSchema>,
    actorId: string
  ) {
    const existing = await db.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A user with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await db.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        role: input.role,
        passwordHash,
        createdById: actorId,
      },
      select: safeUserSelect,
    });

    await auditService.log({
      action: AuditAction.CREATE,
      resource: "User",
      resourceId: user.id,
      actorId,
      newValues: { id: user.id, email: user.email, role: user.role },
    });

    return user;
  },

  async updateUser(
    input: z.infer<typeof updateUserSchema>,
    actorId: string
  ) {
    const existing = await db.user.findFirst({
      where: { id: input.id, deletedAt: null },
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const { id, password, ...rest } = input;

    const updateData: Record<string, unknown> = { ...rest };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: safeUserSelect,
    });

    await auditService.log({
      action: AuditAction.UPDATE,
      resource: "User",
      resourceId: id,
      actorId,
      oldValues: {
        name: existing.name,
        role: existing.role,
        isActive: existing.isActive,
      },
      newValues: { name: user.name, role: user.role, isActive: user.isActive },
    });

    return user;
  },

  async deleteUser(id: string, actorId: string) {
    const existing = await db.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const user = await db.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: safeUserSelect,
    });

    await auditService.log({
      action: AuditAction.DELETE,
      resource: "User",
      resourceId: id,
      actorId,
      oldValues: { email: existing.email, role: existing.role },
    });

    return user;
  },
};
