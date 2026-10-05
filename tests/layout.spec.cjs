const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const assert = require("assert/strict");
const root = path.resolve(__dirname, "..");
for (const name of fs.readdirSync(path.join(root, 'pages')).filter(name => name.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, 'pages', name), 'utf8');
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);
  if (main) assert.equal([...main[1].matchAll(/<section\b/g)].length, name.startsWith('Home') ? 10 : 6, name + ' section count');
}
const server = http.createServer((req, res) => {
  const file = path.resolve(
    root,
    "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
  );
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".png": "image/png",
      }[path.extname(file)] || "application/octet-stream",
    );
    res.end(data);
  });
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const name of [
        "Home page1.html",
        "Home page 2.html",
        "Collections.html",
        "New Arrivals.html",
        "about.html",
        "Services.html",
        "contact.html",
        "404 page.html",
        "coming soon.html",
      ]) {
        await page.goto(base + "/pages/" + encodeURIComponent(name));
        for (const img of await page.locator("main img").all()) {
          await img.scrollIntoViewIfNeeded();
          await img.evaluate((el) => el.decode());
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          name + " overflow at " + width,
        );
        for (const selector of [
          ".shop-grid .shop-card",
          ".team-editorial__grid .team-profile",
          ".service-offers__grid .service-offer",
        ]) {
          const rects = await page.locator(selector).evaluateAll((els) =>
            els
              .filter((el) => !el.hidden)
              .map((el) => {
                const r = el.getBoundingClientRect();
                return { top: r.top, bottom: r.bottom };
              }),
          );
          for (const rect of rects) {
            const row = rects.filter(
              (other) => Math.abs(other.top - rect.top) < 2,
            );
            assert(
              Math.max(...row.map((r) => r.bottom)) -
                Math.min(...row.map((r) => r.bottom)) <
                2,
              name + " uneven row " + selector + " at " + width,
            );
          }
        }
        for (const img of await page
          .locator(
            ".shop-home-hero > img,.shop-page-hero > img,.about-hero__visual img",
          )
          .all())
          assert.equal(
            await img.evaluate((el) => getComputedStyle(el).objectFit),
            "cover",
          );
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path:
            ".qa/layout-" +
            name.replace(/[^a-z0-9]/gi, "-") +
            "-" +
            width +
            ".png",
          fullPage: true,
        });
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: whole-page image decoding, no overflow, complete hero framing and equal product/team/service row endings at four widths.",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
