import { type PrismaClient, type AuditAction, Prisma } from "@prisma/client";
import { type PaginatedResult } from "@/types";

interface CreateAuditLogInput {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  actorId: string;
  targetId?: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
}

interface ListLogsInput {
  page: number;
  limit: number;
  actorId?: string;
  resource?: string;
  action?: AuditAction;
}

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

async function createLog(
  prisma: PrismaOrTx,
  input: CreateAuditLogInput
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      ...input,
      createdBy: input.actorId,
    },
  });
}

async function listLogs(
  prisma: PrismaClient,
  input: ListLogsInput
): Promise<PaginatedResult<Prisma.AuditLogGetPayload<{ include: { actor: { select: { id: true; name: true; email: true } } } }>>> {
  const { page, limit, actorId, resource, action } = input;
  const skip = (page - 1) * limit;

  const where = {
    ...(actorId && { actorId }),
    ...(resource && { resource }),
    ...(action && { action }),
  };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export const auditService = { createLog, listLogs };
