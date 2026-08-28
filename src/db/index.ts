import { Pool } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/neon-serverless";

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

const pool = new Pool({ connectionString: databaseUrl });

export const db = drizzle({ client: pool, schema });
export type OwedDatabase = typeof db;
export type OwedTransaction = Parameters<
  Parameters<OwedDatabase["transaction"]>[0]
>[0];
export type DatabaseExecutor = OwedDatabase | OwedTransaction;
