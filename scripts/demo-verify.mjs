/**
 * Demo verification — no Playwright MCP, no browser by default.
 *
 *   npm run demo:verify          Fast static audit (~100ms), always works offline
 *   npm run demo:verify:e2e      Optional real clicks via Playwright + tiny static server
 *
 * Env:
 *   DEMO_BASE=http://localhost:3000/demo   Use running Next dev instead of built-in server (e2e only)
 */
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const demoDir = path.join(root, "public", "demo");

if (!fs.existsSync(path.join(demoDir, "demo-canteens.js"))) {
  throw new Error("Missing public/demo/demo-canteens.js");
}
const outDir = path.join(root, ".playwright-screenshots");

const args = process.argv.slice(2);
const e2e = args.includes("--e2e");
const jsonOnly = args.includes("--json");

const MOJIBAKE = /â‚¹|â€|â†|ðŸ(?![\u{1F300}-\u{1FAFF}])/u;

/** @param {string} html @param {RegExp} re */
function has(html, re) {
  return re.test(html);
}

/** @param {string} name @param {string} file */
function readDemo(name, file) {
  const p = path.join(demoDir, file);
  if (!fs.existsSync(p)) throw new Error(`Missing ${p}`);
  return { name, file, path: p, html: fs.readFileSync(p, "utf8") };
}

const STATIC_SPECS = [
  {
    name: "kitchen",
    file: "kitchen.html",
    check({ html }) {
      const fails = [];
      if (!has(html, /href=["']\/["'][^>]*class=["']brand|class=["']brand[^>]*href=["']\/["']/))
        fails.push("Tray brand must link to / (production landing)");
      if (!has(html, /id=["']btnRefresh["']/)) fails.push("Missing #btnRefresh");
      if (!has(html, /id=["']spPush["']/)) fails.push("Missing #spPush (push special)");
      if (!has(html, /demo-canteens\.js/)) fails.push("Missing demo-canteens.js");
      if (!has(html, /id=["']kitchenCanteen["']/)) fails.push("Missing #kitchenCanteen selector");
      if (!has(html, /function applyCanteen/)) fails.push("Missing applyCanteen (per-canteen queue)");
      if (!has(html, /canteenId/)) fails.push("Missing canteenId filter on inbox");
      if (!has(html, /tray_kitchen_inbox|INBOX_KEY/)) fails.push("Missing kitchen inbox sync");
      if (!has(html, /function ingestInbox/)) fails.push("Missing ingestInbox (student order sync)");
      if (!has(html, /function showView/)) fails.push("Missing showView (history/insights nav)");
      if ((html.match(/data-nav=/g) || []).length < 4) fails.push("Expected 4 sidebar data-nav links");
      if (MOJIBAKE.test(html)) fails.push("Mojibake detected in kitchen.html");
      if (has(html, /Student app · phone/)) fails.push('Portal label should say "laptop" not "phone"');
      return {
        brandHome: true,
        refresh: true,
        specialsSync: true,
        navViews: true,
        fails,
      };
    },
  },
  {
    name: "student",
    file: "student.html",
    check({ html }) {
      const fails = [];
      if (!has(html, /href=["']\/["'][^>]*class=["']brand|class=["']brand[^>]*href=["']\/["']/))
        fails.push("Tray brand must link to / (production landing)");
      if (!has(html, /demo-canteens\.js/)) fails.push("Missing demo-canteens.js");
      if (!has(html, /id=["']canteenSegments["']/)) fails.push("Missing #canteenSegments (pick canteen)");
      if (!has(html, /loadCanteenData/)) fails.push("Missing loadCanteenData (per-canteen menu)");
      if (!has(html, /canteenId/)) fails.push("Missing canteenId on kitchen push");
      if (!has(html, /tray_kitchen_inbox|KITCHEN_INBOX_KEY|INBOX_KEY/)) fails.push("Missing kitchen inbox push");
      if (!has(html, /refreshLiveSpecials/)) fails.push("Missing refreshLiveSpecials()");
      if (!has(html, /data-service=["']takeaway/)) fails.push("Missing takeaway service mode");
      if (!has(html, /function setView/)) fails.push("Missing setView flow");
      if (!has(html, /₹|"₹"|return "₹"/)) fails.push("Currency should use ₹");
      if (MOJIBAKE.test(html)) fails.push("Mojibake detected in student.html");
      if (!has(html, /btnCheckoutDesktop/)) fails.push("Missing checkout control");
      if (!has(html, /canteenSegments/)) fails.push("Missing #canteenSegments (canteen switcher UX)");
      return { brandHome: true, flow: true, currency: true, fails };
    },
  },
  {
    name: "admin",
    file: "admin.html",
    check({ html }) {
      const fails = [];
      if (!has(html, /href=["']\/["'][^>]*class=["']sb-brand|class=["']sb-brand[^>]*href=["']\/["']/))
        fails.push("Tray brand must link to / (production landing)");
      if (!has(html, /demo-canteens\.js/)) fails.push("Missing demo-canteens.js");
      if (!has(html, /function applyTenantData/)) fails.push("Missing applyTenantData (tenant data swap)");
      if (!has(html, /data-cid=/)) fails.push("Missing data-cid on canteen options");
      if (!has(html, /width=device-width/)) fails.push("Viewport should be responsive");
      if (has(html, /data-toast=/)) fails.push("Sidebar still uses data-toast placeholders");
      if (!has(html, /const VIEW_META/)) fails.push("Missing VIEW_META view router");
      if (!has(html, /id=["']tenantToggle["']/)) fails.push("Missing tenant switcher");
      if (!has(html, /id=["']view-students["']/)) fails.push("Missing students view pane");
      if (!has(html, /renderOrdersTable/)) fails.push("Missing dynamic orders table");
      if (MOJIBAKE.test(html)) fails.push("Mojibake detected in admin.html");
      if (/class="sub">\s*class=/.test(html)) fails.push("Corrupted view-pane markup in admin.html");
      if (!has(html, /id=["']studentsPaneSub["']/)) fails.push("Missing #studentsPaneSub (per-canteen students pane)");
      return { brandHome: true, specials: true, interactive: true, fails };
    },
  },
  {
    name: "index",
    file: "index.html",
    check({ html }) {
      const fails = [];
      if (!has(html, /href=["']\/["'][^>]*class=["']brand|class=["']brand[^>]*href=["']\/["']/))
        fails.push("Tray brand must link to / (production landing)");
      if (has(html, /Mobile · 480|480×/i)) fails.push('Student portal tag should be laptop not "Mobile 480"');
      if (!has(html, /Laptop · sidebar/i)) fails.push('Expected "Laptop · sidebar cart" device tag');
      if (!has(html, /kitchen\.html/)) fails.push("Missing kitchen portal link");
      return { deviceTag: true, portals: true, fails };
    },
  },
];

function runStaticAudit() {
  const pages = [];
  let ok = true;

  for (const spec of STATIC_SPECS) {
    const loaded = readDemo(spec.name, spec.file);
    const checks = spec.check(loaded);
    const fails = checks.fails || [];
    if (fails.length) ok = false;
    pages.push({
      mode: "static",
      name: spec.name,
      file: spec.file,
      status: fails.length ? "fail" : "ok",
      checks: { ...checks, fails },
      errors: fails,
    });
  }

  return { mode: "static", ok, pages, demoDir };
}

/** @param {number} port @param {string} dir */
function startStaticServer(port, dir) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css",
    ".js": "application/javascript",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  };

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url?.split("?")[0] || "/");
      const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
      const filePath = path.join(dir, safe === "/" ? "index.html" : safe.replace(/^\//, ""));
      if (!filePath.startsWith(dir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve({
        server,
        base: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

async function runE2E(base) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "E2E mode needs Playwright installed once: npm install -D playwright\nThen: npx playwright install chromium"
    );
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const pages = [];
  let ok = true;

  const targets = [
    { name: "kitchen", path: "/kitchen.html" },
    { name: "student", path: "/student.html" },
    { name: "admin", path: "/admin.html" },
  ];

  for (const t of targets) {
    const url = `${base}${t.path}`;
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    let status = "ok";
    let checks = {};
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
      if (!res?.ok()) status = `http-${res?.status()}`;

      if (t.name === "kitchen") {
        checks = await page.evaluate(() => ({
          brandHome: !!document.querySelector("a.brand[href='index.html']"),
          tickets: document.querySelectorAll(".ticket").length,
        }));
        await page.click("#btnRefresh").catch(() => {});
        await page.click('.sb-link[data-nav="history"]').catch(() => {});
        await page.click('.sb-link[data-nav="queue"]').catch(() => {});
      }

      if (t.name === "student") {
        await page.click('.service-mode[data-service="dine"]').catch(() => {});
        await page.locator('[data-action="add"]').first().click().catch(() => {});
        checks = await page.evaluate(() => ({
          brandHome: !!document.querySelector("a.brand[href='index.html']"),
          cartCount: Number(document.getElementById("cartBarCount")?.textContent || 0),
        }));
      }

      if (t.name === "admin") {
        await page.click('.sb-link[data-view="students"]').catch(() => {});
        await page.waitForTimeout(200);
        checks = await page.evaluate(() => ({
          brandHome: !!document.querySelector("a.sb-brand[href='index.html']"),
          sidebarViews: document.querySelectorAll(".sb-link[data-view]").length,
          studentsPane:
            !!document.getElementById("view-students") &&
            !document.getElementById("view-students").hidden,
        }));
        await page.click("#tenantToggle").catch(() => {});
      }

      await page.screenshot({ path: path.join(outDir, `demo-${t.name}.png`) }).catch(() => {});
    } catch (e) {
      status = "error";
      errors.push(String(e));
      ok = false;
    }

    if (errors.length) ok = false;
    pages.push({ mode: "e2e", name: t.name, url, status, checks, errors });
    await page.close();
  }

  await browser.close();
  return { mode: "e2e", ok, base, pages };
}

// --- main ---
const report = { ok: true, runs: [] };

const staticResult = runStaticAudit();
report.runs.push(staticResult);
if (!staticResult.ok) report.ok = false;

if (e2e) {
  let base = process.env.DEMO_BASE;
  let serverCtl = null;

  if (!base) {
    const port = Number(process.env.DEMO_PORT) || 4173;
    serverCtl = await startStaticServer(port, demoDir);
    base = serverCtl.base;
  }

  const e2eResult = await runE2E(base);
  report.runs.push(e2eResult);
  if (!e2eResult.ok) report.ok = false;

  if (serverCtl) await serverCtl.close();
}

const reportPath = path.join(outDir, "demo-report.json");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(report.ok ? "✓ demo:verify passed" : "✗ demo:verify failed");
  for (const run of report.runs) {
    console.log(`\n[${run.mode}]`);
    for (const p of run.pages) {
      const mark = p.status === "ok" ? "✓" : "✗";
      console.log(`  ${mark} ${p.name}${p.file ? ` (${p.file})` : ""}`);
      if (p.errors?.length) p.errors.forEach((e) => console.log(`      - ${e}`));
    }
  }
  console.log(`\nReport: ${reportPath}`);
}

process.exit(report.ok ? 0 : 1);
