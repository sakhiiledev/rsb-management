import { Queue, Worker, type Job } from "bullmq";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const connection = redis;

// ─── Queue Definitions ──────────────────────────────────────────────────────

export const importQueue = new Queue("import", { connection });
export const exportQueue = new Queue("export", { connection });
export const reportQueue = new Queue("report", { connection });

// ─── Job Payload Types ──────────────────────────────────────────────────────

export interface ImportJobData {
  jobId: string;
  userId: string;
  fileKey: string;
  resource: string;
  rows: Record<string, unknown>[];
}

export interface ExportJobData {
  jobId: string;
  userId: string;
  resource: string;
  filters: Record<string, unknown>;
  format: "csv" | "xlsx";
}

// ─── Workers ────────────────────────────────────────────────────────────────

export function createImportWorker() {
  return new Worker<ImportJobData>(
    "import",
    async (job: Job<ImportJobData>) => {
      logger.info({ jobId: job.data.jobId, resource: job.data.resource }, "Starting import job");
      // Import logic handled per-resource in services
      return { processed: job.data.rows.length };
    },
    { connection }
  );
}

export function createExportWorker() {
  return new Worker<ExportJobData>(
    "export",
    async (job: Job<ExportJobData>) => {
      logger.info({ jobId: job.data.jobId, resource: job.data.resource }, "Starting export job");
      return { format: job.data.format };
    },
    { connection }
  );
}
