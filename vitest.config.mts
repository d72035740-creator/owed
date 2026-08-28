import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

const { loadEnvConfig } = nextEnv;

if (!process.env.DATABASE_URL) {
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  const nodeEnvironment = process.env.NODE_ENV;
  mutableEnvironment.NODE_ENV = "development";
  loadEnvConfig(process.cwd(), true, console, true);
  if (nodeEnvironment === undefined) {
    delete mutableEnvironment.NODE_ENV;
  } else {
    mutableEnvironment.NODE_ENV = nodeEnvironment;
  }
}

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
