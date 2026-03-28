import { db } from "@/lib/db";
import { AuditAction, Prisma } from "@prisma/client";

interface LogParams {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  actorId?: string;
  userId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface ListParams {
  page: number;
  limit: number;
  resource?: string;
  action?: AuditAction;
  actorId?: string;
  from?: Date;
  to?: Date;
}

export const auditService = {
  async log(params: LogParams) {
    return db.auditLog.create({
      data: {
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        actorId: params.actorId,
        userId: params.userId ?? params.actorId,
        oldValues: params.oldValues
          ? (params.oldValues as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        newValues: params.newValues
          ? (params.newValues as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        metadata: params.metadata
          ? (params.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        createdById: params.actorId,
      },
    });
  },

  async listAuditLogs(params: ListParams) {
    const { page, limit, resource, action, actorId, from, to } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(resource && { resource }),
      ...(action && { action }),
      ...(actorId && { actorId }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const [logs, total] = await db.$transaction([
      db.auditLog.findMany({
        where,
        include: {
          actorUser: {
            select: { id: true, name: true, email: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  },

  async getAuditLogById(id: string) {
    return db.auditLog.findUnique({
      where: { id },
      include: {
        actorUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async getLogsForResource(resource: string, resourceId: string) {
    return db.auditLog.findMany({
      where: { resource, resourceId },
      include: {
        actorUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
