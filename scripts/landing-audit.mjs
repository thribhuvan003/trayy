/**
 * Landing page visual + scroll audit via Playwright.
 * Output: .playwright-screenshots/landing-audit/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, ".playwright-screenshots", "landing-audit");

const BASE = process.env.LANDING_BASE ?? "http://127.0.0.1:3000";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const SECTIONS = [
  { id: "hero", selector: "main", label: "00-hero" },
  { id: "stats", selector: "#stats-heading", label: "01-stats", fallback: "section:has(#stats-heading)" },
  { id: "portals", selector: "#portals", label: "02-portals" },
  { id: "campus", selector: "#campus", label: "03-campus" },
  { id: "trust", selector: "#trust", label: "04-trust" },
  { id: "sync", selector: "#sync", label: "05-sync" },
  { id: "closing", selector: "#closing", label: "06-closing" },
  { id: "footer", selector: "footer", label: "07-footer" },
];

fs.mkdirSync(outDir, { recursive: true });

/** @param {import('playwright').Page} page */
async function waitForLanding(page) {
  await page.goto(BASE, { waitUntil: "commit", timeout: 120000 });
  await page.waitForSelector("main", { timeout: 90000 });
  await page.waitForTimeout(2500);
}

/** @param {import('playwright').Page} page @param {string} dir */
async function captureSections(page, dir) {
  fs.mkdirSync(dir, { recursive: true });

  await page.screenshot({ path: path.join(dir, "full-page.png"), fullPage: true });

  for (const section of SECTIONS) {
    const loc = page.locator(section.selector).first();
    const visible = await loc.count();
    if (!visible) {
      console.warn(`[miss] ${section.label}: ${section.selector}`);
      continue;
    }
    await loc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const box = await loc.boundingBox();
    if (box) {
      const pad = 24;
      await page.screenshot({
        path: path.join(dir, `${section.label}.png`),
        clip: {
          x: Math.max(0, box.x - pad),
          y: Math.max(0, box.y - pad),
          width: Math.min(1440, box.width + pad * 2),
          height: Math.min(box.height + pad * 2, 2000),
        },
      });
    } else {
      await loc.screenshot({ path: path.join(dir, `${section.label}.png`) });
    }
  }
}

/** @param {import('playwright').Page} page @param {boolean} isMobile */
async function openMobileNavIfNeeded(page, isMobile) {
  if (!isMobile) return;
  const toggle = page.locator('button[aria-label="Open menu"]');
  if (await toggle.count()) {
    await toggle.click();
    await page.waitForTimeout(350);
  }
}

/** @param {import('playwright').Page} page @param {string} dir @param {boolean} isMobile */
async function testNavScroll(page, dir, isMobile) {
  const report = [];
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  for (const href of ["#portals", "#campus", "#trust", "#sync"]) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    if (isMobile) await openMobileNavIfNeeded(page, true);

    const navLink = isMobile
      ? page.locator(`nav[aria-label="Mobile navigation"] a[href="${href}"]`).first()
      : page.locator(`nav[aria-label="Main navigation"] a[href="${href}"]`).first();

    const before = await page.evaluate(() => window.scrollY);
    await navLink.click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(2200);
    const after = await page.evaluate(() => window.scrollY);
    const targetTop = await page.evaluate((h) => {
      const el = document.querySelector(h);
      return el ? el.getBoundingClientRect().top + window.scrollY : null;
    }, href);
    report.push({ href, before, after, targetTop, moved: after > before + 40 });
  }

  fs.writeFileSync(path.join(dir, "scroll-report.json"), JSON.stringify(report, null, 2));
  return report;
}

/** @param {import('playwright').Page} page @param {string} dir */
async function testSyncScrollScrub(page, dir) {
  const fractions = [
    ["sync-scrub-00", 0.08],
    ["sync-scrub-33", 0.38],
    ["sync-scrub-66", 0.68],
    ["sync-scrub-100", 0.92],
  ];

  for (const [name, frac] of fractions) {
    const y = await page.evaluate((f) => {
      const el = document.querySelector("#sync");
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const top = window.scrollY + r.top;
      const height = r.height;
      return top + height * f - window.innerHeight * 0.35;
    }, frac);
    await page.evaluate((scrollY) => window.scrollTo(0, Math.max(0, scrollY)), y);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(dir, `${name}.png`) });
  }
}

const browser = await chromium.launch({ headless: true });
const summary = [];

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const logs = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") logs.push(msg.text());
    });

    const dir = path.join(outDir, vp.name);
    await waitForLanding(page);
    await captureSections(page, dir);
    const scrollReport = await testNavScroll(page, dir, vp.name === "mobile");
    if (vp.name === "desktop") await testSyncScrollScrub(page, dir);

    summary.push({
      viewport: vp.name,
      scrollReport,
      consoleErrors: logs,
      screenshots: fs.readdirSync(dir),
    });
    await context.close();
  }

  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}