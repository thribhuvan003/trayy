/**
 * Verifies the real App Router demos.
 *
 *   pnpm demo:verify       source and route-contract checks
 *   pnpm demo:verify:e2e   browser checks against a running application
 *
 * Set DEMO_BASE to test another deployment. It defaults to
 * http://127.0.0.1:3000.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const e2e = process.argv.includes("--e2e");
const jsonOnly = process.argv.includes("--json");
const baseArg = process.argv.find((argument) => argument.startsWith("--base="));
const baseUrl = (
  baseArg?.slice("--base=".length) ??
  process.env.DEMO_BASE ??
  "http://127.0.0.1:3000"
).replace(/\/$/, "");
const browserExecutable = [
  process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && fs.existsSync(candidate));

const files = {
  data: "src/app/demo/_lib/data.ts",
  store: "src/app/demo/_lib/store.ts",
  studentPage: "src/app/demo/student/page.tsx",
  student: "src/app/demo/student/student-demo.tsx",
  kitchenPage: "src/app/demo/kitchen/page.tsx",
  kitchen: "src/app/demo/kitchen/kitchen-demo.tsx",
  adminPage: "src/app/demo/admin/page.tsx",
  admin: "src/app/demo/admin/admin-demo.tsx",
  aliases: "src/lib/demo-routes.ts",
  middleware: "src/middleware.ts",
};

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function check(label, condition, failures) {
  if (!condition) failures.push(label);
}

function runSourceAudit() {
  const source = Object.fromEntries(
    Object.entries(files).map(([name, relativePath]) => [name, read(relativePath)])
  );
  const failures = [];

  check("Student demo page must render StudentDemo", /<StudentDemo\s*\/>/.test(source.studentPage), failures);
  check("Kitchen demo page must render KitchenDemo", /<KitchenDemo\s*\/>/.test(source.kitchenPage), failures);
  check("Admin demo page must render AdminDemo", /<AdminDemo\s*\/>/.test(source.adminPage), failures);
  check("Student demo must support adding items", /onClick=\{\(\) => inc\(m\.id\)\}/.test(source.student), failures);
  check("Student demo must support simulated payment", /Simulate UPI success/.test(source.student), failures);
  check("Kitchen demo must support ticket progression", /setStatus\(t, "preparing"\)/.test(source.kitchen), failures);
  check("Kitchen demo must support ready tickets", /setStatus\(t, "ready"\)/.test(source.kitchen), failures);
  check("Admin demo must support stall switching", /switchStall\(x\.id\)/.test(source.admin), failures);
  check(
    "Admin demo clock must have a deterministic hydration value",
    !/useState\(\(\)\s*=>\s*Date\.now\(\)\)/.test(source.admin),
    failures
  );
  check("Demos must share browser state", /localStorage/.test(source.store), failures);
  check("Demo fixtures must include multiple canteens", /DEMO_CANTEEN_IDS/.test(source.data), failures);
  check("Legacy student URL must redirect to the student demo", /"\/c\/aditya\/menu":\s*"\/demo\/student"/.test(source.aliases), failures);
  check("Legacy kitchen URL must redirect to the kitchen demo", /"\/c\/aditya\/kitchen":\s*"\/demo\/kitchen"/.test(source.aliases), failures);
  check("Legacy admin URL must redirect to the admin demo", /"\/c\/aditya\/admin\/dashboard":\s*"\/demo\/admin"/.test(source.aliases), failures);
  check("Middleware must apply exact legacy demo redirects", /getLegacyDemoRedirect\(pathname\)/.test(source.middleware), failures);

  const allDemoSource = [
    source.studentPage,
    source.student,
    source.kitchenPage,
    source.kitchen,
    source.adminPage,
    source.admin,
  ].join("\n");
  check("Demo routes must not contain the retired boot message", !/Opening the counter/i.test(allDemoSource), failures);

  return {
    mode: "source",
    ok: failures.length === 0,
    routes: ["/demo/student", "/demo/kitchen", "/demo/admin"],
    files,
    failures,
  };
}

async function runBrowserAudit() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    ...(browserExecutable ? { executablePath: browserExecutable } : {}),
  });
  const results = [];
  const targets = [
    { name: "student", path: "/demo/student", selector: ".sd-add-btn" },
    { name: "kitchen", path: "/demo/kitchen", selector: ".kd-cta--start" },
    { name: "admin", path: "/demo/admin", selector: ".ad-stall-chip" },
  ];
  const aliases = [
    { path: "/c/aditya/menu", expected: "/demo/student" },
    { path: "/c/aditya/kitchen", expected: "/demo/kitchen" },
    { path: "/c/aditya/admin/dashboard", expected: "/demo/admin" },
  ];

  try {
    for (const target of targets) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      const response = await page.goto(`${baseUrl}${target.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.locator(target.selector).first().waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForTimeout(600);
      let interactionPassed = false;
      let interactionResult = "";
      if (target.name === "student") {
        await page.locator(target.selector).first().click();
        const payButton = page.locator(".sd-pay-btn");
        await payButton.waitFor({ state: "visible", timeout: 5_000 });
        interactionResult = (await payButton.textContent())?.trim() ?? "";
        interactionPassed = /Pay ₹\d+ by UPI/.test(interactionResult);
      } else if (target.name === "kitchen") {
        const startButton = page.locator(target.selector).first();
        const ticket = startButton.locator("xpath=ancestor::article[1]");
        const ticketId = (await ticket.locator(".kd-ticket-id").textContent())?.trim() ?? "";
        await startButton.click();
        await page.locator('.kd-tab[data-seg="cooking"]').click();
        const movedTicket = page.locator(".kd-ticket", { hasText: ticketId });
        const readyButton = movedTicket.locator(".kd-cta--ready");
        await readyButton.waitFor({ state: "visible", timeout: 5_000 });
        interactionResult = (await readyButton.textContent())?.trim() ?? "";
        interactionPassed = ticketId.length > 0 && interactionResult === "READY";
      } else {
        const targetChip = page.locator(target.selector).nth(1);
        const stallName = (await targetChip.textContent())?.trim() ?? "";
        await targetChip.click();
        await page.waitForFunction(
          (name) => {
            const selected = document.querySelector('.ad-stall-chip[aria-selected="true"]');
            const heading = document.querySelector(".ad-head-sub");
            return selected?.textContent?.trim() === name && heading?.textContent?.includes(name);
          },
          stallName,
          { timeout: 5_000 }
        );
        interactionResult = stallName;
        interactionPassed = stallName.length > 0;
      }

      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        bootMessage: document.body.innerText.includes("Opening the counter"),
      }));
      const result = {
        name: target.name,
        path: target.path,
        status: response?.status() ?? null,
        interaction: target.selector,
        interactionPassed,
        interactionResult,
        errors,
        ...metrics,
      };
      result.ok =
        result.status === 200 &&
        result.interactionPassed &&
        errors.length === 0 &&
        !result.overflow &&
        !result.bootMessage;
      results.push(result);
      await context.close();
    }

    for (const alias of aliases) {
      const page = await browser.newPage();
      const response = await page.goto(`${baseUrl}${alias.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const finalPath = new URL(page.url()).pathname;
      results.push({
        name: `alias:${alias.path}`,
        path: alias.path,
        status: response?.status() ?? null,
        finalPath,
        expected: alias.expected,
        ok: response?.status() === 200 && finalPath === alias.expected,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  return {
    mode: "browser",
    baseUrl,
    ok: results.every((result) => result.ok),
    results,
  };
}

const report = e2e ? await runBrowserAudit() : runSourceAudit();
const output = JSON.stringify(report, null, 2);
if (!jsonOnly || !report.ok) console.log(output);
if (!report.ok) process.exitCode = 1;
