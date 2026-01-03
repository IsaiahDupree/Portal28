#!/usr/bin/env npx ts-node
/**
 * Portal28 Health Check Script
 * 
 * Run with: npx ts-node scripts/health-check.ts
 * Or: npm run health-check
 * 
 * Checks:
 * - Required environment variables
 * - Database connection
 * - Required npm packages
 * - Service availability
 */

import { execSync } from "child_process";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, fn: () => { status: "pass" | "fail" | "warn"; message: string }) {
  try {
    const result = fn();
    results.push({ name, ...result });
    const icon = result.status === "pass" ? "✓" : result.status === "warn" ? "⚠" : "✗";
    console.log(`${icon} ${name}: ${result.message}`);
  } catch (error) {
    results.push({ name, status: "fail", message: String(error) });
    console.log(`✗ ${name}: ${error}`);
  }
}

console.log("\n🔍 Portal28 Health Check\n");
console.log("=".repeat(50));

// ============================================
// Environment Variables
// ============================================
console.log("\n📋 Environment Variables\n");

const requiredEnvVars = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", critical: true },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", critical: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", critical: true },
  { key: "NEXT_PUBLIC_SITE_URL", critical: true },
];

const optionalEnvVars = [
  { key: "STRIPE_SECRET_KEY", description: "Stripe payments" },
  { key: "STRIPE_WEBHOOK_SECRET", description: "Stripe webhooks" },
  { key: "NEXT_PUBLIC_META_PIXEL_ID", description: "Meta Pixel tracking" },
  { key: "META_CAPI_ACCESS_TOKEN", description: "Meta CAPI" },
  { key: "RESEND_API_KEY", description: "Email sending" },
  { key: "MUX_TOKEN_ID", description: "Mux video uploads" },
  { key: "MUX_TOKEN_SECRET", description: "Mux video uploads" },
  { key: "MUX_WEBHOOK_SECRET", description: "Mux webhooks" },
  { key: "S3_ACCESS_KEY_ID", description: "S3/R2 file storage" },
  { key: "S3_SECRET_ACCESS_KEY", description: "S3/R2 file storage" },
  { key: "S3_BUCKET_NAME", description: "S3/R2 file storage" },
  { key: "S3_ENDPOINT", description: "S3/R2 endpoint (for R2)" },
  { key: "S3_REGION", description: "S3 region" },
];

for (const envVar of requiredEnvVars) {
  check(`ENV: ${envVar.key}`, () => {
    const value = process.env[envVar.key];
    if (!value) {
      return { status: "fail", message: "Missing (REQUIRED)" };
    }
    return { status: "pass", message: "Set" };
  });
}

for (const envVar of optionalEnvVars) {
  check(`ENV: ${envVar.key}`, () => {
    const value = process.env[envVar.key];
    if (!value) {
      return { status: "warn", message: `Missing (${envVar.description} disabled)` };
    }
    return { status: "pass", message: "Set" };
  });
}

// ============================================
// NPM Packages
// ============================================
console.log("\n📦 Required Packages\n");

const requiredPackages = [
  "@supabase/supabase-js",
  "@supabase/ssr",
  "stripe",
  "resend",
  "@mux/mux-node",
  "zod",
  "@radix-ui/react-dialog",
  "@radix-ui/react-switch",
  "lucide-react",
];

for (const pkg of requiredPackages) {
  check(`Package: ${pkg}`, () => {
    try {
      require.resolve(pkg);
      return { status: "pass", message: "Installed" };
    } catch {
      return { status: "fail", message: "Not installed - run npm install" };
    }
  });
}

// ============================================
// Services
// ============================================
console.log("\n🌐 Services\n");

check("Supabase Local", () => {
  try {
    const result = execSync("curl -s http://127.0.0.1:28321/rest/v1/ -o /dev/null -w '%{http_code}'", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    if (result === "200" || result === "401") {
      return { status: "pass", message: "Running on http://127.0.0.1:28321" };
    }
    return { status: "fail", message: `Unexpected status: ${result}` };
  } catch {
    return { status: "warn", message: "Not running (run: npx supabase start)" };
  }
});

check("Mailpit (Email)", () => {
  try {
    const result = execSync("curl -s http://127.0.0.1:28324/api/v1/messages -o /dev/null -w '%{http_code}'", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    if (result === "200") {
      return { status: "pass", message: "Running on http://127.0.0.1:28324" };
    }
    return { status: "fail", message: `Unexpected status: ${result}` };
  } catch {
    return { status: "warn", message: "Not running (part of Supabase)" };
  }
});

check("Dev Server", () => {
  try {
    const result = execSync("curl -s http://localhost:2828 -o /dev/null -w '%{http_code}'", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    if (result === "200") {
      return { status: "pass", message: "Running on http://localhost:2828" };
    }
    return { status: "warn", message: `Status: ${result} (run: npm run dev)` };
  } catch {
    return { status: "warn", message: "Not running (run: npm run dev)" };
  }
});

// ============================================
// Database
// ============================================
console.log("\n🗄️  Database\n");

check("Database Tables", () => {
  try {
    const result = execSync(
      `curl -s "http://127.0.0.1:28321/rest/v1/" -H "apikey: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}"`,
      { encoding: "utf-8", timeout: 5000 }
    );
    const tables = JSON.parse(result);
    const requiredTables = ["users", "courses", "lessons", "orders", "entitlements"];
    const missingTables = requiredTables.filter(t => !tables.definitions?.[t]);
    if (missingTables.length > 0) {
      return { status: "warn", message: `Missing tables: ${missingTables.join(", ")}` };
    }
    return { status: "pass", message: `${Object.keys(tables.definitions || {}).length} tables found` };
  } catch (error) {
    return { status: "warn", message: "Could not check tables" };
  }
});

// ============================================
// Summary
// ============================================
console.log("\n" + "=".repeat(50));
console.log("\n📊 Summary\n");

const passed = results.filter(r => r.status === "pass").length;
const warnings = results.filter(r => r.status === "warn").length;
const failed = results.filter(r => r.status === "fail").length;

console.log(`✓ Passed:   ${passed}`);
console.log(`⚠ Warnings: ${warnings}`);
console.log(`✗ Failed:   ${failed}`);

if (failed > 0) {
  console.log("\n❌ Health check failed. Fix the issues above before continuing.\n");
  process.exit(1);
}

if (warnings > 0) {
  console.log("\n⚠️  Health check passed with warnings. Some features may be limited.\n");
  process.exit(0);
}

console.log("\n✅ All checks passed! Portal28 is ready.\n");
process.exit(0);
