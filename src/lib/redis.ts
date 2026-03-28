import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on("error", (err) => {
    // Suppress ECONNREFUSED errors in non-production (e.g., during build)
    if (process.env.NODE_ENV === "production") {
      console.error("[Redis] Connection error:", err);
    }
  });

  client.on("connect", () => {
    console.log("[Redis] Connected");
  });

  return client;
}

export const redis =
  globalThis.__redis ?? (globalThis.__redis = createRedisClient());

if (process.env.NODE_ENV !== "production") {
  globalThis.__redis = redis;
}
