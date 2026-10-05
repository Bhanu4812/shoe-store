const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const pages = fs.readdirSync(path.join(root, "pages")).filter((name) => name.endsWith(".html"));
const widthArgument = process.argv.find((argument) => argument.startsWith("--width="));
const widths = widthArgument
  ? [Number(widthArgument.split("=")[1])]
  : [1440, 1366, 1280, 1024, 900, 768, 600, 480, 390, 360];
const modes = [
  ["light", "ltr"],
  ["dark", "ltr"],
  ["light", "rtl"],
  ["dark", "rtl"],
];
const resultFile = path.join(
  root,
  ".qa",
  widthArgument ? `alignment-results-${widths[0]}.json` : "alignment-results.json",
);
const server = http.createServer((req, res) => {
  const file = path.resolve(
    root,
    "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
  );
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) return res.writeHead(404).end();
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".webp": "image/webp",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
      }[path.extname(file)] || "application/octet-stream",
    );
    res.end(data);
  });
});

(async () => {
  fs.mkdirSync(path.join(root, ".qa"), { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  // QA measures local layouts independently of third-party map availability.
  await page.route("**/*", (route) =>
    route.request().url().startsWith(base) ? route.continue() : route.abort(),
  );
  const failures = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const name of pages) {
        await page.goto(base + "/pages/" + encodeURIComponent(name));
        if (["login.html", "register.html"].includes(name)) {
          await page.waitForURL("**/Collections.html");
          continue;
        }
        await page.evaluate(async () => {
          await Promise.all(
            [...document.querySelectorAll("img")].map(async (img) => {
              img.loading = "eager";
              await img.decode();
            }),
          );
        });
        for (const [theme, dir] of modes) {
          await page.evaluate(
            ({ theme, dir }) => {
              document.documentElement.dataset.theme = theme;
              document.documentElement.dir = dir;
              scrollTo(0, 0);
            },
            { theme, dir },
          );
          const issues = await page.evaluate(() => {
            const problems = [];
            for (const heading of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
              if (Number(getComputedStyle(heading).fontWeight) >= 600)
                problems.push('Heading weight must be below 600: ' + heading.textContent.trim());
            }
            for (const paragraph of document.querySelectorAll('p')) {
              const weight = Number(getComputedStyle(paragraph).fontWeight);
              if (weight < 400 || weight > 550)
                problems.push('Paragraph weight outside 400–550: ' + paragraph.textContent.trim());
            }
            for (const field of document.querySelectorAll('.contact-enquiry__form input:not([type="hidden"]), .contact-enquiry__form textarea')) {
              if (!field.getAttribute('placeholder')) problems.push('Missing form placeholder: ' + field.id);
            }
            const rect = (el) => el.getBoundingClientRect();
            const visible = (el) => {
              const c = getComputedStyle(el),
                r = rect(el);
              const closedDetails = el.closest("details:not([open])");
              return (
                (!closedDetails || el.closest("summary")) &&
                r.width > 0 &&
                r.height > 0 &&
                c.visibility === "visible" &&
                c.display !== "none"
              );
            };
            if (document.documentElement.scrollWidth > innerWidth + 1) {
              const wide = [...document.querySelectorAll("main *")]
                .filter(visible)
                .filter((el) => rect(el).right > innerWidth + 1 || rect(el).left < -1)
                .slice(0, 6)
                .map((el) => el.tagName + "." + el.className);
              problems.push("document overflow: " + wide.join(", "));
            }
            // All content sections share the same guides. Heroes and campaigns have inset frames.
            const container = document.querySelector(".header-shell");
            if (container) {
              const r = rect(container),
                gutter = parseFloat(getComputedStyle(container).paddingInlineStart);
              const expectedLeft = r.left + gutter,
                expectedRight = r.right - gutter;
              for (const section of document.querySelectorAll(".site-main > section")) {
                const s = rect(section),
                  c = getComputedStyle(section);
                const left = s.left + parseFloat(c.paddingLeft),
                  right = s.right - parseFloat(c.paddingRight);
                if (Math.abs(left - expectedLeft) > 1 || Math.abs(right - expectedRight) > 1)
                  problems.push("section guides: " + section.className);
              }
              if (innerWidth <= 700) {
                for (const heading of document.querySelectorAll(
                  ".site-main > :is(.shop-home-hero,.shop-page-hero,.about-hero,.section-daily-poster) :is(h1,h2)",
                )) {
                  const h = rect(heading);
                  if (Math.abs(h.left - expectedLeft) > 1 || Math.abs(h.right - expectedRight) > 1)
                    problems.push("mobile hero copy guides");
                }
              }
              const footer = document.querySelector(".footer-grid");
              if (footer) {
                const f = rect(footer);
                const c = getComputedStyle(footer);
                if (
                  Math.abs(f.left + parseFloat(c.paddingLeft) - expectedLeft) > 1 ||
                  Math.abs(f.right - parseFloat(c.paddingRight) - expectedRight) > 1
                )
                  problems.push("footer guides");
              }
            }
            for (const el of document.querySelectorAll(
              "main :is(h1,h2,h3,p,a,button,input,select,textarea)",
            )) {
              if (!visible(el) || el.closest(".sr-only,.contact-select__native")) continue;
              const r = rect(el);
              if (r.left < -1 || r.right > innerWidth + 1)
                problems.push("off-screen " + el.tagName + "." + el.className);
              const section = el.closest("main > section");
              if (section && !el.closest(".contact-faq__answer")) {
                const s = rect(section);
                if (r.top < s.top - 2 || r.bottom > s.bottom + 2)
                  problems.push(
                    "section spill " +
                      el.tagName +
                      "." +
                      el.className +
                      " " +
                      el.textContent.trim().slice(0, 45) +
                      " in " +
                      section.className +
                      " (" +
                      Math.round(r.bottom - s.bottom) +
                      "px)",
                  );
              }
            }
            for (const selector of [
              ".shop-grid",
              ".team-editorial__grid",
              ".service-offers__grid",
              ".about-values__grid",
              ".shop-added__grid",
              ".section-fit-path ol",
              ".design-process__sequence",
            ]) {
              for (const grid of document.querySelectorAll(selector)) {
                const cards = [...grid.children].filter(visible).map(rect);
                for (const card of cards) {
                  const row = cards.filter((other) => Math.abs(other.top - card.top) < 2);
                  if (
                    Math.max(...row.map((r) => r.bottom)) - Math.min(...row.map((r) => r.bottom)) >
                    2
                  )
                    problems.push("uneven bottoms: " + selector);
                }
              }
            }
            // Product prices and primary actions must also share row baselines.
            for (const grid of document.querySelectorAll(".shop-grid")) {
              const cards = [...grid.querySelectorAll(".shop-card")].filter(visible);
              for (const card of cards) {
                const row = cards.filter((other) => Math.abs(rect(other).top - rect(card).top) < 2);
                for (const selector of ["strong", ".shop-card__actions"]) {
                  const ys = row.map((el) => rect(el.querySelector(selector)).top);
                  if (Math.max(...ys) - Math.min(...ys) > 2)
                    problems.push("product baseline: " + selector);
                }
              }
            }
            return [...new Set(problems)];
          });
          failures.push(...issues.map((issue) => `${name} / ${width} / ${theme} ${dir}: ${issue}`));
          if (
            [1440, 768, 390, 360].includes(width) &&
            (dir === "ltr" || (theme === "dark" && width === 390))
          ) {
            await page.screenshot({
              path: path.join(
                root,
                ".qa",
                `alignment-${name.replace(/[^a-z0-9]/gi, "-")}-${width}-${theme}-${dir}.png`,
              ),
              fullPage: true,
            });
          }
        }
      }
      console.log("Checked all pages at " + width + "px in light/dark and LTR/RTL.");
    }
    // Root entry point remains a working redirect.
    await page.goto(base + "/index.html");
    await page.waitForURL("**/Home%20page1.html");
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "/pages/contact.html");
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "dark";
        document.documentElement.dir = "rtl";
      });
      const form = page.locator("[data-contact-form]");
      await form.getByRole("button", { name: /Send enquiry/i }).click();
      assert.equal(await page.locator("#contact-name").getAttribute("aria-invalid"), "true");
      await page.locator("#contact-name").fill("Layout Test");
      await page.locator("#contact-email").fill("layout-test@example.com");
      await page.locator(".contact-select__trigger").click();
      await page.locator('.contact-select__menu button[data-value="order-support"]').click();
      assert.equal(await page.locator("#contact-order").isVisible(), true);
      await page.locator("#contact-order").fill("TEST-001");
      await page
        .locator("#contact-message")
        .fill("Testing local form validation and responsive controls.");
      await form.getByRole("button", { name: /Send enquiry/i }).click();
      assert.match(await page.locator("[data-contact-status]").textContent(), /Details checked/);
      await page.locator(".contact-select__trigger").focus();
      await page.keyboard.press("ArrowDown");
      assert.equal(await page.locator(".contact-select__menu").isVisible(), true);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".contact-select__menu").isVisible(), false);
      const faqButtons = page.locator(".contact-faq__item button");
      await faqButtons.first().click();
      assert.equal(await faqButtons.first().getAttribute("aria-expanded"), "true");
      await faqButtons.nth(1).click();
      assert.equal(await faqButtons.first().getAttribute("aria-expanded"), "false");
      await page.keyboard.press("Escape");
      assert.equal(await faqButtons.nth(1).getAttribute("aria-expanded"), "false");
      const newsletter = page.locator("[data-newsletter-form]");
      await newsletter.locator("button").click();
      assert.match(await page.locator("[data-newsletter-message]").textContent(), /valid email/);
      await newsletter.locator("input").fill("layout-test@example.com");
      await newsletter.locator("button").click();
      assert.equal(
        await page.locator("[data-newsletter-message]").getAttribute("class"),
        "newsletter-message is-success",
      );

      await page.goto(base + "/pages/Services.html");
      await page.locator('[data-size-unit="US"]').click();
      assert.equal(
        await page.locator('[data-size-unit="US"]').getAttribute("aria-checked"),
        "true",
      );
      await page.locator('[data-size-unit="UK"]').focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await page.locator('[data-size-unit="EU"]').getAttribute("aria-checked"),
        "true",
      );

      // Expanded native details must still finish inside their section.
      for (const name of ["Home page1.html", "New Arrivals.html"]) {
        await page.goto(base + "/pages/" + encodeURIComponent(name));
        await page
          .locator("main details")
          .evaluateAll((items) => items.forEach((item) => (item.open = true)));
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        assert.equal(
          await page.locator("main details").evaluateAll((items) =>
            items.every((item) => {
              const r = item.getBoundingClientRect(),
                s = item.closest("section").getBoundingClientRect();
              return r.bottom <= s.bottom + 1;
            }),
          ),
          true,
        );
      }
      console.log(
        "Verified contact validation, dropdown keyboard controls, FAQ, newsletter, sizing and expanded details at " +
          width +
          "px.",
      );
    }
    await page.goto(base + "/pages/coming%20soon.html");
    await page.locator("[data-coming-form] button").click();
    assert.match(await page.locator("[data-coming-message]").textContent(), /valid email/);
    await page.locator("[data-coming-form] input").fill("layout-test@example.com");
    await page.locator("[data-coming-form] button").click();
    assert.match(await page.locator("[data-coming-message]").textContent(), /on the list/);
    assert.equal(await page.locator("[data-countdown]").getAttribute("aria-label"), "We're live");
    const utilityTheme = await page.locator("html").getAttribute("data-theme");
    await page.locator("[data-auth-theme]").click();
    assert.notEqual(await page.locator("html").getAttribute("data-theme"), utilityTheme);
    await page.locator("[data-auth-rtl]").click();
    assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
    fs.writeFileSync(
      resultFile,
      JSON.stringify({ pages, widths, modes, failures, errors }, null, 2),
    );
    assert.deepEqual(errors, [], "JavaScript errors");
    if (failures.length)
      console.log(
        [...new Set(failures.map((failure) => failure.split(": ").slice(1).join(": ")))].join("\n"),
      );
    assert.equal(failures.length, 0, "Alignment regressions; see .qa/alignment-results.json");
    console.log(
      `PASS: all pages, ${widths.length} breakpoint(s), both themes/directions, container guides, section boundaries, row endings, product baselines and form interactions.`,
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  server.close();
});
