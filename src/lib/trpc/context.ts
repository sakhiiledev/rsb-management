import { type NextRequest } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

interface CreateContextOptions {
  req: NextRequest;
  resHeaders: Headers;
}

export async function createTRPCContext({ req }: CreateContextOptions) {
  const session = await getServerAuthSession();
  return {
    db,
    session,
    req,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
