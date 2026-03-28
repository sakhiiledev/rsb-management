import { Queue } from "bullmq";
import IORedis from "ioredis";

let _connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(
      process.env.BULL_REDIS_URL ?? "redis://localhost:6379",
      {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
      }
    );
  }
  return _connection;
}

let _importQueue: Queue | null = null;
let _exportQueue: Queue | null = null;
let _reportQueue: Queue | null = null;

export function getImportQueue(): Queue {
  if (!_importQueue) {
    _importQueue = new Queue("imports", { connection: getConnection() });
  }
  return _importQueue;
}

export function getExportQueue(): Queue {
  if (!_exportQueue) {
    _exportQueue = new Queue("exports", { connection: getConnection() });
  }
  return _exportQueue;
}

export function getReportQueue(): Queue {
  if (!_reportQueue) {
    _reportQueue = new Queue("reports", { connection: getConnection() });
  }
  return _reportQueue;
}

// Convenience named export (lazy)
export const importQueue = {
  add: (...args: Parameters<Queue["add"]>) =>
    getImportQueue().add(...args),
};
