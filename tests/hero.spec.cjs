const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const assert = require("assert/strict");
const root = path.resolve(__dirname, "..");
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
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    for (const [width, height] of [
      [1440, 900],
      [1366, 768],
      [1024, 768],
      [768, 1024],
      [390, 844],
      [320, 568],
    ]) {
      await page.setViewportSize({ width, height });
      for (const name of [
        "Home page1.html",
        "Home page 2.html",
        "about.html",
        "Collections.html",
        "New Arrivals.html",
        "Services.html",
        "contact.html",
      ]) {
        await page.goto(base + "/pages/" + encodeURIComponent(name));
        const hero = page.locator("main > section").first();
        const bounds = await hero.boundingBox();
        assert(
          width <= 760 || bounds.y + bounds.height <= height + 1,
          name + " hero below screen at " + width + "x" + height + ": " + JSON.stringify(bounds),
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
          name + " overflows",
        );
        assert.equal(await page.locator('link[rel="icon"]').count(), 2);
        for (const image of await hero.locator("img").all())
          await image.evaluate((img) => img.decode());
        const spill = await hero.evaluate((el) =>
          [...el.querySelectorAll("h1,p,a")]
            .filter((child) => {
              const r = child.getBoundingClientRect(),
                b = el.getBoundingClientRect();
              return (
                r.width > 0 &&
                (r.bottom > b.bottom + 1 ||
                  r.top < b.top - 1 ||
                  r.right > b.right + 1 ||
                  r.left < b.left - 1)
              );
            })
            .map((el) => ({
              class: el.className,
              rect: el.getBoundingClientRect().toJSON(),
              hero: el.closest("section").getBoundingClientRect().toJSON(),
            })),
        );
        if (spill.length)
          console.log(
            await hero.evaluate((el) => ({
              hero: getComputedStyle(el).gridTemplateRows,
              children: [...el.children].map((c) => ({
                tag: c.tagName,
                rect: c.getBoundingClientRect().toJSON(),
                height: getComputedStyle(c).height,
                min: getComputedStyle(c).minHeight,
                padding: getComputedStyle(c).padding,
              })),
            })),
          );
        assert.deepEqual(spill, [], name + " content outside hero at " + width + "x" + height);
        if (name === "Home page1.html") {
          const logos = page.locator(".shop-brand-strip img");
          assert.equal(await logos.count(), 3);
          for (const image of await logos.all()) await image.evaluate((img) => img.decode());
        }
        await page.screenshot({
          path: ".qa/hero-" + name.replace(/[^a-z0-9]/gi, "-") + "-" + width + ".png",
        });
        if (width <= 1100) await page.locator("[data-menu-toggle]").click();
        await page.locator(".nav-dropdown-toggle").click();
        await page
          .locator("#home-menu")
          .getByRole("link", { name: "Homepage 1", exact: true })
          .waitFor({ state: "visible" });
        assert.equal(
          await page
            .locator("#home-menu")
            .getByRole("link", { name: "Homepage 1", exact: true })
            .isVisible(),
          true,
        );
        assert.equal(
          await page
            .locator("#home-menu")
            .getByRole("link", { name: "Homepage 2", exact: true })
            .isVisible(),
          true,
        );
        await page.keyboard.press("Escape");
        assert.equal(
          await page.locator(".nav-dropdown-toggle").getAttribute("aria-expanded"),
          "false",
        );
      }
    }
    await page.goto(base + "/pages/Home%20page1.html");
    await page.locator("[data-menu-toggle]").click();
    await page.locator(".nav-dropdown-toggle").click();
    await page.locator("#home-menu").getByRole("link", { name: "Homepage 2", exact: true }).click();
    await page.waitForURL("**/Home%20page%202.html");
    assert.equal(await page.locator("h1").innerText(), "A new rhythm.\nEvery step.");
    await page.locator("[data-menu-toggle]").click();
    await page.locator(".nav-dropdown-toggle").click();
    assert.equal(await page.locator('#home-menu a[aria-current="page"]').innerText(), "Homepage 2");
    await page.locator("#home-menu").getByRole("link", { name: "Homepage 1", exact: true }).click();
    await page.waitForURL("**/Home%20page1.html");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: favicon links, brand logos, hero bounds and overflow across seven pages and six screen sizes.",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
