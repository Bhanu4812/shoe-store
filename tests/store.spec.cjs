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
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    fs.mkdirSync(path.join(root, ".qa"), { recursive: true });
    for (const width of [1440, 1100, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const file of [
        "Home page1.html",
        "Collections.html",
        "New Arrivals.html",
        "about.html",
        "Services.html",
        "contact.html",
      ]) {
        await page.goto(base + "/pages/" + encodeURIComponent(file));
        await page.locator("body").waitFor();
        const overflow = await page.evaluate(() =>
          [...document.querySelectorAll("body *")]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width && (r.right > innerWidth + 1 || r.left < -1);
            })
            .map((el) => ({
              tag: el.tagName,
              class: el.className,
              width: el.getBoundingClientRect().width,
              right: el.getBoundingClientRect().right,
            }))
            .slice(0, 12),
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `Overflow: ${file} at ${width}: ${JSON.stringify(overflow)}`,
        );
        assert.equal(
          await page
            .getByRole("link", { name: /^(Login|Sign Up|Sign in)$/i })
            .count(),
          0,
        );
        if (width <= 1100) {
          await page.locator("[data-menu-toggle]").click();
          await page.locator(".primary-nav").waitFor({ state: "visible" });
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          await page.locator("[data-menu-toggle]").click();
        }
      }
      await page.goto(base + "/pages/Collections.html");
      for (const image of await page.locator(".shop-card img").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((img) => img.decode());
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: path.join(root, ".qa", `collection-${width}.png`),
        fullPage: true,
      });
      await page
        .locator("[data-shop-card]")
        .first()
        .getByRole("link", { name: "View Product", exact: true })
        .click();
      assert.equal(await page.locator("#product-details").isVisible(), true);
      assert.equal(
        await page
          .locator("#product-details")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
        true,
      );
      await page.screenshot({
        path: path.join(root, ".qa", `details-${width}.png`),
      });
      await page.keyboard.press("Escape");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      base + "/pages/Collections.html?category=sneakers#products",
    );
    assert.equal(await page.locator("[data-shop-card]:visible").count(), 4);
    await page
      .locator("[data-shop-card]:visible")
      .first()
      .getByRole("link", { name: "View Product", exact: true })
      .click();
    await page.locator("#product-details").waitFor({ state: "visible" });
    await page.locator("[data-detail-add]").click();
    await page
      .locator("#product-details")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page.locator(".header-actions .bag-button").click();
    await page.locator("#cart").waitFor({ state: "visible" });
    assert.equal(await page.locator(".shop-cart-item").count(), 1);
    await page.locator("[data-cart-quantity]").fill("3");
    await page.locator("[data-cart-quantity]").press("Tab");
    assert.match(await page.locator(".shop-cart-total").textContent(), /492/);
    await page
      .locator("#cart")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page.reload();
    assert.equal(await page.locator(".cart-count").textContent(), "3");
    await page.locator(".header-actions .bag-button").click();
    await page.locator("[data-cart-remove]").click();
    assert.match(
      await page.locator("#cart").textContent(),
      /Your bag is empty/,
    );
    await page
      .locator("#cart")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page.goto(base + "/pages/Collections.html?product=aeron-x");
    await page.locator("#product-details").waitFor({ state: "visible" });
    assert.equal(await page.locator("#detail-title").textContent(), "Aeron X");
    await page.keyboard.press("Escape");
    await page.goto(base + "/pages/Collections.html");
    await page.locator("[data-shop-search]").fill("terrain");
    assert.equal(await page.locator("[data-shop-card]:visible").count(), 1);
    await page.locator("[data-shop-search]").fill("unknown shoe");
    assert.equal(await page.locator("[data-shop-empty]").isVisible(), true);
    await page.locator("[data-shop-search]").fill("");
    await page.locator("[data-wishlist]").first().click();
    await page.goto(base + "/pages/Collections.html?wishlist=1#products");
    assert.equal(await page.locator("[data-shop-card]:visible").count(), 1);
    await page.locator("[data-menu-toggle]").click();
    await page.locator(".mobile-rtl-button").click();
    assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.locator(".mobile-menu-utilities [data-theme-toggle]").click();
    await page.locator("[data-menu-toggle]").click();
    await page.goto(base + "/pages/Collections.html");
    await page.locator('[data-shop-add="aero-runner-x1"]').click();
    await page.locator('[data-shop-add="aeron-x"]').click();
    await page.locator(".header-actions .bag-button").click();
    assert.equal(await page.locator(".shop-cart-total").count(), 2);
    assert.equal(await page.locator(".shop-cart-item").count(), 2);
    await page.screenshot({ path: path.join(root, ".qa", "cart-mobile.png") });
    await page.keyboard.press("Escape");
    await page.locator("[data-shop-sort]").selectOption("name");
    assert.equal(
      (await page.locator("[data-shop-card] h3").first().textContent()).trim(),
      "Aero Runner X1",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: six viewport sizes, navigation, details, cart quantities/removal/persistence, search, wishlist and RTL.",
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
