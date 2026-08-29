import { loadEnvConfig } from "@next/env";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema";

if (typeof window !== "undefined") {
  throw new Error("Database access is restricted to the server");
}

let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
  databaseUrl = process.env.DATABASE_URL;
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for server-side database access");
}

neonConfig.webSocketConstructor = ws;

const globalDatabase = globalThis as typeof globalThis & {
  owedPostgresPool?: Pool;
  owedPostgresPoolHasErrorListener?: boolean;
};

const pool =
  globalDatabase.owedPostgresPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000,
    keepAlive: true,
  });

globalDatabase.owedPostgresPool = pool;

if (!globalDatabase.owedPostgresPoolHasErrorListener) {
  pool.on("error", () => {
    console.error("PostgreSQL pool lost an idle connection");
  });
  globalDatabase.owedPostgresPoolHasErrorListener = true;
}

export const db = drizzle({ client: pool, schema });
export type OwedDatabase = typeof db;
export type OwedTransaction = Parameters<
  Parameters<OwedDatabase["transaction"]>[0]
>[0];
export type DatabaseExecutor = OwedDatabase | OwedTransaction;
