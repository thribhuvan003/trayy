/**
 * Landing page visual + scroll audit via Playwright.
 * Output: .playwright-screenshots/landing-audit/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, ".playwright-screenshots", "landing-audit");

const baseArg = process.argv.find((argument) => argument.startsWith("--base="));
const BASE =
  baseArg?.slice("--base=".length) ??
  process.env.LANDING_BASE ??
  "http://127.0.0.1:3000";
const browserExecutable = [
  process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && fs.existsSync(candidate));
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "compact", width: 320, height: 568 },
];

const SECTIONS = [
  { id: "hero", selector: "#top", label: "00-hero" },
  { id: "demos", selector: "#demos", label: "01-demos" },
  { id: "walkthrough", selector: "#walkthrough", label: "02-walkthrough" },
  { id: "ledger", selector: "#ledger", label: "03-ledger" },
  { id: "sync", selector: "#sync", label: "04-sync" },
  { id: "trust", selector: "#trust", label: "05-trust" },
  { id: "closing", selector: ".lp-band-close", label: "06-closing" },
  { id: "footer", selector: "footer", label: "07-footer" },
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

/** @param {import('playwright').Page} page */
async function installPerformanceObservers(page) {
  await page.addInitScript(() => {
    window.__trayAuditVitals = { cls: 0, lcp: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__trayAuditVitals.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries.at(-1);
      if (latest) window.__trayAuditVitals.lcp = latest.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
}

/** @param {import('playwright').Page} page */
async function readPerformance(page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    return {
      cls: window.__trayAuditVitals?.cls ?? 0,
      lcpMs: Math.round(window.__trayAuditVitals?.lcp ?? 0),
      ttfbMs: navigation ? Math.round(navigation.responseStart) : null,
      domContentLoadedMs: navigation
        ? Math.round(navigation.domContentLoadedEventEnd)
        : null,
    };
  });
}

/** @param {import('playwright').Page} page */
async function waitForLanding(page) {
  await page.goto(BASE, { waitUntil: "commit", timeout: 120000 });
  await page.waitForSelector("main", { timeout: 90000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(2500);
}

/** @param {import('playwright').Page} page */
async function testLinks(page) {
  const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
    [...new Set(anchors.map((anchor) => anchor.getAttribute("href")).filter(Boolean))]
  );
  const results = [];
  for (const href of hrefs) {
    if (href.startsWith("#")) {
      results.push({
        href,
        ok: await page.locator(href).count().then((count) => count > 0),
        kind: "anchor",
      });
      continue;
    }
    if (!href.startsWith("/") && !href.startsWith("https://github.com/")) continue;
    try {
      const response = await page.request.get(new URL(href, BASE).toString(), {
        timeout: 30_000,
        failOnStatusCode: false,
      });
      results.push({ href, status: response.status(), ok: response.status() < 400, kind: "request" });
    } catch (error) {
      results.push({ href, ok: false, kind: "request", error: String(error) });
    }
  }
  return results;
}

/** @param {import('playwright').Page} page @param {boolean} isMobile */
async function testInteractionAccess(page, isMobile) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const keyboardStops = [];
  for (let index = 0; index < 16; index += 1) {
    await page.keyboard.press("Tab");
    keyboardStops.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        return {
          tag: active?.tagName ?? "",
          text: active?.textContent?.trim().slice(0, 80) ?? "",
          href: active?.getAttribute("href") ?? "",
          focusVisible: active?.matches(":focus-visible") ?? false,
        };
      })
    );
  }
  const touchTargetFailures = isMobile
    ? await page.locator("a[href], button").evaluateAll((elements) =>
        elements.flatMap((element) => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            box.width === 0 ||
            box.height === 0
          ) {
            return [];
          }
          if (box.width >= 44 && box.height >= 44) return [];
          return [{
            text: element.textContent?.trim().slice(0, 80) ?? "",
            width: Math.round(box.width),
            height: Math.round(box.height),
          }];
        })
      )
    : [];
  return {
    keyboardStops,
    keyboardOk: (() => {
      const interactiveStops = keyboardStops.filter(
        (stop) => stop.tag === "A" || stop.tag === "BUTTON"
      );
      return (
        interactiveStops.some((stop) => stop.tag === "A") &&
        interactiveStops.some((stop) => stop.tag === "BUTTON") &&
        interactiveStops.every((stop) => stop.focusVisible)
      );
    })(),
    touchTargetFailures,
  };
}

/** @param {import('playwright').Page} page @param {string} dir */
async function captureSections(page, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const missing = [];
  const hidden = [];

  for (const section of SECTIONS) {
    const loc = page.locator(section.selector).first();
    const visible = await loc.count();
    if (!visible) {
      console.warn(`[miss] ${section.label}: ${section.selector}`);
      missing.push(section.selector);
      continue;
    }
    await loc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const opacity = Number.parseFloat(await loc.evaluate((element) => getComputedStyle(element).opacity));
    if (!Number.isFinite(opacity) || opacity < 0.5) hidden.push(section.selector);
    const box = await loc.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(dir, `${section.label}.png`),
        animations: "disabled",
        timeout: 60_000,
      });
    } else {
      await loc.screenshot({ path: path.join(dir, `${section.label}.png`) });
    }
  }
  return { missing, hidden };
}

/** @param {import('playwright').Page} page @param {boolean} isMobile */
async function openMobileNavIfNeeded(page, isMobile) {
  if (!isMobile) return;
  const toggle = page.locator(".lp-menu-btn");
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

  for (const href of ["#walkthrough", "#demos", "#trust"]) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    if (isMobile) await openMobileNavIfNeeded(page, true);

    const navLink = isMobile
      ? page.locator(`nav[aria-label="Mobile"] a[href="${href}"]`).first()
      : page.locator(`nav[aria-label="Main"] a[href="${href}"]`).first();

    const before = await page.evaluate(() => window.scrollY);
    await navLink.click({ timeout: 5000 });
    await page.waitForTimeout(2200);
    const after = await page.evaluate(() => window.scrollY);
    const targetTop = await page.evaluate((h) => {
      const el = document.querySelector(h);
      return el ? el.getBoundingClientRect().top + window.scrollY : null;
    }, href);
    const landingOffset = targetTop === null ? null : targetTop - after;
    report.push({
      href,
      before,
      after,
      targetTop,
      landingOffset,
      moved: after > before + 40,
      aligned:
        landingOffset !== null &&
        landingOffset >= 40 &&
        landingOffset <= 160,
    });
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

const browser = await chromium.launch({
  headless: true,
  ...(browserExecutable ? { executablePath: browserExecutable } : {}),
});
const summary = [];

try {
  const warmResponse = await fetch(BASE);
  if (!warmResponse.ok) {
    throw new Error(`Landing warm-up failed with HTTP ${warmResponse.status}`);
  }
  await warmResponse.arrayBuffer();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await installPerformanceObservers(page);
    const logs = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") logs.push(msg.text());
    });

    const dir = path.join(outDir, vp.name);
    await waitForLanding(page);
    const initialPerformance = await readPerformance(page);
    const isMobile = vp.width < 720;
    const sectionReport = await captureSections(page, dir);
    const scrollReport = await testNavScroll(page, dir, isMobile);
    if (vp.name === "desktop") await testSyncScrollScrub(page, dir);
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    const fontStatus = await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.status;
    });
    const axe = await new AxeBuilder({ page }).analyze();
    const interactionAccess = await testInteractionAccess(page, isMobile);
    const linkResults = vp.name === "desktop" ? await testLinks(page) : [];

    summary.push({
      viewport: vp.name,
      missingSections: sectionReport.missing,
      hiddenSections: sectionReport.hidden,
      scrollReport,
      consoleErrors: logs,
      horizontalOverflow,
      fontStatus,
      axeViolations: axe.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
      })),
      keyboardOk: interactionAccess.keyboardOk,
      keyboardStops: interactionAccess.keyboardStops,
      touchTargetFailures: interactionAccess.touchTargetFailures,
      linkResults,
      initialPerformance,
      screenshots: fs.readdirSync(dir),
    });
    await context.close();
  }

  const reducedContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  await installPerformanceObservers(reducedPage);
  const reducedErrors = [];
  reducedPage.on("console", (message) => {
    if (message.type() === "error") reducedErrors.push(message.text());
  });
  await waitForLanding(reducedPage);
  const reducedPerformance = await readPerformance(reducedPage);
  const reducedSections = await reducedPage.evaluate((selectors) => {
    const missing = [];
    const hidden = [];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) {
        missing.push(selector);
      } else if (Number.parseFloat(getComputedStyle(element).opacity) < 0.5) {
        hidden.push(selector);
      }
    }
    return { missing, hidden };
  }, SECTIONS.map((section) => section.selector));
  const reducedDir = path.join(outDir, "reduced-motion");
  fs.mkdirSync(reducedDir, { recursive: true });
  await reducedPage.screenshot({
    path: path.join(reducedDir, "initial.png"),
    animations: "disabled",
    timeout: 60_000,
  });
  summary.push({
    viewport: "reduced-motion",
    missingSections: reducedSections.missing,
    hiddenSections: reducedSections.hidden,
    scrollReport: [],
    consoleErrors: reducedErrors,
    horizontalOverflow: await reducedPage.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ),
    fontStatus: await reducedPage.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.status;
    }),
    axeViolations: (await new AxeBuilder({ page: reducedPage }).analyze()).violations.map(
      (violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
      })
    ),
    keyboardOk: true,
    keyboardStops: [],
    touchTargetFailures: [],
    linkResults: [],
    initialPerformance: reducedPerformance,
    screenshots: fs.readdirSync(reducedDir),
  });
  await reducedContext.close();

  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  const failed = summary.some(
    (result) =>
      result.missingSections.length > 0 ||
      result.hiddenSections.length > 0 ||
      result.consoleErrors.length > 0 ||
      result.horizontalOverflow ||
      result.fontStatus !== "loaded" ||
      result.axeViolations.length > 0 ||
      !result.keyboardOk ||
      result.touchTargetFailures.length > 0 ||
      result.linkResults.some((link) => !link.ok) ||
      result.initialPerformance.cls > 0.1 ||
      result.initialPerformance.lcpMs <= 0 ||
      result.initialPerformance.lcpMs > 3000 ||
      result.scrollReport.some(
        (entry) => !entry.moved || entry.targetTop === null || !entry.aligned
      )
  );
  if (failed) process.exitCode = 1;
} finally {
  await browser.close();
}
