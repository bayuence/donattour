import { config } from "dotenv";
import { defineConfig, env } from "@prisma/config";
import path from "path";

// Load environment variables from .env.local since Next.js uses it
config({ path: path.resolve(process.cwd(), ".env.local") });

// ─── Prisma Config ────────────────────────────────────────────
// DATABASE_URL  = Supabase Transaction Pooler (port 6543)
//                 → digunakan app runtime (Next.js queries)
// DIRECT_URL    = Supabase Direct Connection (port 5432)
//                 → digunakan Prisma migrate/db push (DDL)
//
// Cara ambil DIRECT_URL di Supabase:
//   Dashboard → Project Settings → Database
//   → Connection string → URI (Mode: "Direct connection")
//   Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
// ──────────────────────────────────────────────────────────────

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres", // pooler – untuk runtime queries
    // @ts-ignore: directUrl is not yet typed in @prisma/config but required for Supabase
    directUrl: process.env.DIRECT_URL || "postgresql://postgres:postgres@localhost:5432/postgres", // direct – untuk migrate/db push
  },
});
