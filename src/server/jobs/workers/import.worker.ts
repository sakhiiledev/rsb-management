import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { db } from "@/lib/db";
import { auditService } from "@/services/audit.service";
import { logger } from "@/lib/logger";
import { AuditAction, ImportStatus } from "@prisma/client";

const connection = new IORedis(
  process.env.BULL_REDIS_URL ?? "redis://localhost:6379",
  { maxRetriesPerRequest: null }
);

export const importWorker = new Worker(
  "imports",
  async (job: Job<{ importId: string; actorId: string }>) => {
    const { importId, actorId } = job.data;
    logger.info({ importId, jobId: job.id }, "Processing import job");

    const imp = await db.import.findUnique({ where: { id: importId } });
    if (!imp) {
      logger.warn({ importId }, "Import record not found");
      return;
    }

    try {
      // In a real implementation, retrieve raw file from object storage
      // and process rows into the target table inside a transaction.
      // This is the placeholder for the heavy work:
      await db.$transaction(async (tx) => {
        // ... process imp.previewData or full stored data ...
        await tx.import.update({
          where: { id: importId },
          data: { status: ImportStatus.COMPLETED },
        });
      });

      await auditService.log({
        action: AuditAction.IMPORT,
        resource: "Import",
        resourceId: importId,
        actorId,
        newValues: { status: ImportStatus.COMPLETED },
      });

      logger.info({ importId }, "Import completed successfully");
    } catch (err) {
      logger.error({ err, importId }, "Import job failed");

      await db.import.update({
        where: { id: importId },
        data: {
          status: ImportStatus.FAILED,
          errors: [{ message: String(err) }],
        },
      });

      throw err; // Let BullMQ handle retries
    }
  },
  { connection }
);

importWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Import job completed");
});

importWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Import job failed");
});
