# VELORA Shoe Store

Open `index.html` with VS Code Live Server, or open it directly in a modern browser.

The site uses plain HTML, CSS and JavaScript. Product data is in
`assets/js/products.js`; shopping styles and interactions are in `shop.css` and
`shop.js`. Existing brand pages use the shared `style.css` and `main.js`.

The guest shopping bag and wishlist are saved in browser storage. Cart subtotals
are grouped by currency because the existing catalogue contains USD and INR
prices. Online payment, stock management and checkout are not connected. Product
sizes and material specifications must be confirmed with the store. Legacy login
and registration URLs redirect to the collection.
The existing contact and newsletter forms validate input locally; they need a
service endpoint to send or save submissions.

## Browser checks

Run `npm install`, then `npm test`. The tests use installed Microsoft Edge on
Windows and cover desktop, tablet and mobile layouts, product details, search,
categories, wishlist, cart quantities, removal, persistence, theme and RTL.
Screenshots are written to the ignored `.qa/` directory.
The hero checks cover first-screen fit on all main pages, favicon links and the
homepage brand logos. Brand asset source URLs are recorded in
`assets/images/brands/SOURCES.md`.
`layout-polish.css` controls consistent spacing and equal row endings.
`section-designs.css` adds distinct section layouts and images that fill their frames.
Full-page layout checks cover image loading and aligned
product, team and service cards at four widths.
