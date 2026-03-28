import { type PrismaClient, type UserRole, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { auditService } from "./audit.service";
import { type SessionUser } from "@/types";
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).default("MEMBER"),
});

export const updateUserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).optional(),
  isActive: z.boolean().optional(),
});

async function listUsers(prisma: PrismaClient) {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getUserById(prisma: PrismaClient, id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  return user;
}

async function createUser(
  prisma: PrismaClient,
  input: z.infer<typeof createUserSchema>,
  actor: SessionUser
) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A user with this email already exists",
    });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role as UserRole,
        passwordHash,
        createdBy: actor.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    await auditService.createLog(tx, {
      action: "CREATE",
      resource: "User",
      resourceId: user.id,
      actorId: actor.id,
      newValues: { email: user.email, name: user.name, role: user.role },
    });

    return user;
  });
}

async function updateUser(
  prisma: PrismaClient,
  input: z.infer<typeof updateUserSchema>,
  actor: SessionUser
) {
  const existing = await getUserById(prisma, input.id);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.role !== undefined && { role: input.role as UserRole }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await auditService.createLog(tx, {
      action: "UPDATE",
      resource: "User",
      resourceId: input.id,
      actorId: actor.id,
      oldValues: existing as Prisma.InputJsonValue,
      newValues: updated as Prisma.InputJsonValue,
    });

    return updated;
  });
}

async function softDeleteUser(
  prisma: PrismaClient,
  id: string,
  actor: SessionUser
) {
  await getUserById(prisma, id);

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await auditService.createLog(tx, {
      action: "DELETE",
      resource: "User",
      resourceId: id,
      actorId: actor.id,
    });

    return { success: true };
  });
}

export const userService = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  softDeleteUser,
};
