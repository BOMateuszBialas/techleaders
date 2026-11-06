/* Revision 002 of the CommerceOS key-flow prototype: two screens, three variants each.
   All content is fixed, simulated data written in this file (no network, no storage, no user input is echoed).
   Routes: #/home/<a|b|c>/<state> and #/copilot/<a|b|c>/<state>. */
(function () {
  "use strict";

  var SCREENS = {
    home: {
      title: "Storefront home",
      variants: {
        a: "Hero-led",
        b: "Catalog-first",
        c: "Need-led",
      },
      states: [
        ["default", "Default"],
        ["loading", "Loading (skeleton)"],
        ["empty", "Empty store"],
        ["error", "Error: catalog unavailable"],
      ],
    },
    copilot: {
      title: "Commerce Copilot answer",
      variants: {
        a: "Cards with evidence",
        b: "Table first",
        c: "One decision at a time",
      },
      states: [
        ["answer-ai", "Answer: AI-generated"],
        ["answer-not-configured", "Fallback: AI not configured"],
        ["answer-timed-out", "Fallback: AI timed out"],
        ["answer-daily-limit", "Fallback: daily AI limit"],
        ["answer-failed-checks", "Fallback: AI failed our checks"],
        ["empty-store", "Empty store (no data)"],
        ["error-500", "Error: Copilot unavailable"],
      ],
    },
  };

  var VARIANT_NOTES = {
    home: {
      a: "A, hero-led: the entry point is one hero message and its button. Featured products, promo banners and categories follow below.",
      b: "B, catalog-first: no hero. Category list, best sellers and a dense product grid come first; stock is on every card.",
      c: "C, need-led: the entry point is four 'what are you setting up' tiles. Use-case headings are copy hypotheses, not tested wording.",
    },
    copilot: {
      a: "A, cards with evidence: each recommendation is a card with its evidence table, limitation and actions, in order.",
      b: "B, table first: a summary table (priority, key figure, status) comes first; each recommendation's evidence opens below it.",
      c: "C, one decision at a time: a list on the left and one recommendation in full on the right, with previous and next.",
    },
  };

  var PRODUCTS = [
    { slug: "vortex-2", name: "Wireless mouse Vortex 2", category: "Mice", price: 249, stock: 12, featured: true, sold: 31,
      photo: "photos/product-mouse-black.jpg", alt: "Black mouse seen from above" },
    { slug: "k7", name: "Mechanical keyboard K7", category: "Keyboards", price: 449, stock: 3, featured: true, sold: 9,
      photo: "photos/product-keyboard-rgb.jpg", alt: "Keyboard with purple and blue RGB backlight" },
    { slug: "stream-mic", name: "USB microphone Stream", category: "Audio", price: 319, stock: 0, featured: true, sold: 0 },
    { slug: "pad-xl", name: "Desk mat XL", category: "Desk", price: 89, stock: 40, featured: true, sold: 22,
      photo: "photos/category-mouse-pads.jpg", alt: "Desk mat with a mouse on it" },
    { slug: "headset-h3", name: "Headset H3", category: "Audio", price: 199, stock: 5, featured: false, sold: 14,
      photo: "photos/product-headset-black.jpg", alt: "Black over-ear headset seen from above" },
  ];

  var CATEGORY_PHOTOS = {
    Mice: { photo: "photos/category-mice.jpg", alt: "Close-up of a black mouse" },
    Audio: { photo: "photos/category-headsets.jpg", alt: "Person in headphones in a dim room, seen from behind" },
    Desk: { photo: "photos/category-mouse-pads.jpg", alt: "Desk mat with a mouse on it" },
  };

  var WHY = [
    ["Buy without an account", "Guest checkout is always available. An account is optional."],
    ["Stock is checked at checkout", "The price and stock are checked again on the server before an order is placed."],
    ["Keep your reference", "Each order has a reference that finds it later in My orders or by lookup."],
  ];

  var RECS = [
    {
      id: "R1", title: "Restock Keyboard K7 before the weekend", priority: "High", key: "3 left",
      observation: "K7 has 3 units left and sold 9 units in the last 7 days.",
      evidence: [["Units sold, 9–16 Oct", "9"], ["Stock now", "3"]],
      limitation: "Sales and stock only; the demo data has no supplier lead times.",
    },
    {
      id: "R2", title: "Feature Headset H3 next to Keyboard K7 on the home page", priority: "Medium", key: "412 views (fictional)",
      observation: "Headset H3 was viewed often but rarely added to the cart.",
      evidence: [["Product page views (fictional demo data)", "412"], ["Add-to-cart rate (fictional demo data)", "2.1%"]],
      limitation: "Correlation only. The traffic figures are fictional demo data.",
    },
    {
      id: "R3", title: "Review the availability of USB microphone Stream", priority: "Low", key: "0 in stock",
      observation: "The product is out of stock, so it is not selling now.",
      evidence: [["Stock now", "0"], ["Units sold, 9–16 Oct", "0"]],
      limitation: "No cost data in the store, so margin is not evaluated.",
    },
  ];

  var SOURCES = {
    "answer-ai": ["info", "Source: AI-generated (model: demo-model-1). Checked against store data."],
    "answer-not-configured": ["info", "Source: rule-based insights. AI is not configured for this store."],
    "answer-timed-out": ["warning", "Source: rule-based insights. The AI answer timed out."],
    "answer-daily-limit": ["warning", "Source: rule-based insights. The daily AI limit was reached."],
    "answer-failed-checks": ["warning", "Source: rule-based insights. The AI answer failed our checks."],
  };

  var STATUS_LABEL = { "new": "New", saved: "Saved", completed: "Completed", dismissed: "Dismissed" };

  var ui = { theme: "light", selected: 0, statuses: {}, note: "" };

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function price(p) {
    return p + ",00 zł";
  }

  function stockText(p) {
    if (p.stock === 0) return '<span class="stock-out">Out of stock</span>';
    if (p.stock <= 5) return '<span class="stock-low">Only ' + p.stock + " left</span>";
    return '<span class="stock">In stock</span>';
  }

  function photo(p) {
    if (!p.photo) return '<div class="photo"><div class="photo-none">Photo not chosen yet</div></div>';
    return '<div class="photo"><img src="' + p.photo + '" alt="' + esc(p.alt) + '" width="800" height="600" loading="lazy"></div>';
  }

  function addButton(p) {
    if (p.stock === 0) return '<button class="btn btn-secondary" type="button" disabled>Out of stock</button>';
    return '<button class="btn btn-secondary" type="button" data-action="stub">Add to cart</button>';
  }

  function stub(text) {
    return '<a class="btn btn-outline" href="#" data-action="stub" data-text="' + esc(text) + '">' + esc(text) + "</a>";
  }

  function homeHeader() {
    return (
      '<header class="store-header"><div class="wrap store-header-row">' +
      '<a class="brand" href="#/home/a/default"><span class="brand-mark" aria-hidden="true"></span>CommerceOS</a>' +
      '<div class="header-search"><label class="sr-only" for="q">Search products</label>' +
      '<input id="q" type="search" placeholder="Search products" aria-label="Search products">' +
      '<button class="btn btn-ghost-dark" type="button" data-action="stub" data-text="Search is not in this revision">Search</button></div>' +
      '<button class="btn btn-ghost-dark" type="button" data-action="stub" data-text="Cart is not in this revision">Cart (0)</button>' +
      "</div>" +
      '<nav class="wrap store-nav" aria-label="Categories">' +
      '<a href="#" data-action="stub" data-text="Shop all is not in this revision">Shop all</a>' +
      "<a href=\"#\" data-action=\"stub\" data-text=\"Category pages are not in this revision\">Mice</a>" +
      "<a href=\"#\" data-action=\"stub\" data-text=\"Category pages are not in this revision\">Keyboards</a>" +
      "<a href=\"#\" data-action=\"stub\" data-text=\"Category pages are not in this revision\">Audio</a>" +
      "<a href=\"#\" data-action=\"stub\" data-text=\"Category pages are not in this revision\">Desk</a>" +
      "</nav></header>"
    );
  }

  function storeFooter() {
    return (
      '<footer class="store-footer"><div class="wrap store-footer-grid">' +
      "<div><p><strong>CommerceOS demo store</strong></p><p class=\"small\">Fictional company: invented name, no address, no tax number, no contact. Prices and stock are simulated.</p></div>" +
      '<div class="small"><p><a href="#/copilot/a/answer-ai">Owner area: Commerce Copilot</a></p><p>Delivery and returns: [ASSUMPTION AS-01]</p></div>' +
      "</div></footer>"
    );
  }

  function whyBlock(extraClass) {
    var items = WHY.map(function (w) {
      return "<div><dt>" + esc(w[0]) + "</dt><dd>" + esc(w[1]) + "</dd></div>";
    }).join("");
    return '<dl class="why-grid ' + (extraClass || "") + '">' + items + "</dl>";
  }

  function skeletonBlock() {
    return (
      '<div class="skeleton-grid" aria-busy="true"><p class="sr-only">Loading products</p>' +
      '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>' +
      '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div></div>'
    );
  }

  function errorBlock(variant) {
    return (
      '<div class="notice notice-destructive section" role="alert"><p><strong>The catalog is temporarily unavailable.</strong></p>' +
      "<p>Try again in a moment. No products are shown from an old copy.</p>" +
      '<p><a class="btn btn-outline" href="#/home/' + variant + '/default">Try again</a></p></div>'
    );
  }

  function emptyStore() {
    return (
      '<div class="empty section"><h2 class="h2">No categories yet.</h2>' +
      "<p>Products appear here when the owner publishes them.</p></div>"
    );
  }

  /* ---------- Home, variant A: hero-led ---------- */

  function homeA(state) {
    if (state === "error") return errorBlock("a");
    if (state === "empty") return emptyStore();
    if (state === "loading") return skeletonBlock();
    var featured = PRODUCTS.filter(function (p) { return p.featured; });
    var cats = ["Mice", "Keyboards", "Audio", "Desk"];
    var catTiles = cats.map(function (c) {
      var ph = CATEGORY_PHOTOS[c];
      var inner = ph
        ? '<div class="tile-photo"><img src="' + ph.photo + '" alt="' + esc(ph.alt) + '" width="800" height="450" loading="lazy"></div>'
        : '<div class="tile-photo"><div class="photo-none">Photo not chosen yet</div></div>';
      return '<a class="tile" href="#" data-action="stub" data-text="Category pages are not in this revision">' + inner + "<strong>" + c + "</strong><span class=\"small muted\">Browse " + c.toLowerCase() + "</span></a>";
    }).join("");
    return (
      '<section class="hero" aria-labelledby="h-home">' +
      '<div class="hero-text"><p class="eyebrow">Gaming accessories</p>' +
      '<h1 class="h1" id="h-home">Gaming accessories for a desk that works</h1>' +
      "<p>Mice, keyboards, headsets and desk mats. Guest checkout is always available; an account is optional.</p>" +
      '<div class="hero-actions"><a class="btn btn-action" href="#" data-action="stub" data-text="Shop all is not in this revision">Shop all products</a>' +
      '<a class="btn btn-outline" href="#" data-action="stub" data-text="Low-stock list is not in this revision">See low stock</a></div>' +
      '<p class="small muted">Delivery in 1–3 working days [ASSUMPTION AS-01].</p></div>' +
      '<div class="hero-photo"><img src="photos/hero-desk-curved-monitor.jpg" alt="Curved monitor, keyboard, mouse and headset on a desk, seen from above" width="1600" height="1067"></div>' +
      "</section>" +
      '<section class="section" aria-labelledby="h-feat"><div class="section-head"><h2 class="h2" id="h-feat">Featured</h2></div>' +
      '<div class="product-grid">' +
      featured.map(function (p) {
        return '<article class="card">' + photo(p) + '<div class="card-body"><h3 class="h3">' + esc(p.name) + '</h3><p class="price">' + price(p.price) + "</p>" + stockText(p) + '<div class="card-actions">' + addButton(p) + "</div></div></article>";
      }).join("") +
      "</div></section>" +
      '<section class="section" aria-label="Promotions"><div class="banner-grid">' +
      '<article class="banner"><div class="banner-photo"><img src="photos/banner-build-your-setup.jpg" alt="Gaming mouse on a desk next to a keyboard, lit in blue and orange" width="800" height="450" loading="lazy"></div><div class="banner-body"><h3 class="h3">Build your setup</h3><p class="small">Mats and cable trays for a tidy desk.</p>' + stub("Browse desk gear") + "</div></article>" +
      '<article class="banner"><div class="banner-photo"><img src="photos/product-headset-black.jpg" alt="Black over-ear headset seen from above" width="800" height="450" loading="lazy"></div><div class="banner-body"><h3 class="h3">Audio for calls</h3><p class="small">Headsets and microphones for voice chat.</p>' + stub("See audio") + "</div></article>" +
      '<article class="banner"><div class="banner-photo"><div class="photo-none">Photo not chosen yet</div></div><div class="banner-body"><h3 class="h3">Low stock</h3><p class="small">Keyboard K7: 3 units left at the time of the prototype.</p>' + stub("View keyboard") + "</div></article>" +
      "</div></section>" +
      '<section class="section" aria-labelledby="h-cats"><div class="section-head"><h2 class="h2" id="h-cats">Categories</h2></div><div class="tile-grid">' + catTiles + "</div></section>" +
      '<section class="section" aria-labelledby="h-why"><h2 class="h2" id="h-why">Why buy here</h2><div style="margin-top:12px">' + whyBlock() + "</div></section>"
    );
  }

  /* ---------- Home, variant B: catalog-first ---------- */

  function homeB(state) {
    if (state === "error") return errorBlock("b");
    if (state === "empty") return emptyStore();
    if (state === "loading") return skeletonBlock();
    var counts = { All: PRODUCTS.length };
    PRODUCTS.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    var order = ["All", "Mice", "Keyboards", "Audio", "Desk"];
    var chips = order.map(function (c, i) {
      return '<li><a class="chip" href="#" data-action="stub" data-text="Category filter is static in this revision" ' + (i === 0 ? 'aria-current="true"' : "") + ">" + c + " (" + (counts[c] || 0) + ")</a></li>";
    }).join("");
    var sideCats = order.map(function (c) {
      return "<li><span>" + c + "</span><span class=\"muted\">" + (counts[c] || 0) + "</span></li>";
    }).join("");
    var best = PRODUCTS.slice().sort(function (a, b) { return b.sold - a.sold; }).slice(0, 3);
    var bestItems = best.map(function (p) { return "<li>" + esc(p.name) + "</li>"; }).join("");
    var cards = PRODUCTS.map(function (p) {
      return (
        '<article class="dense-card">' + photo(p) +
        "<div><h3 class=\"h3\">" + esc(p.name) + '</h3><p class="price">' + price(p.price) + "</p>" + stockText(p) +
        '<div class="card-actions">' + addButton(p) + "</div></div></article>"
      );
    }).join("");
    return (
      '<section class="toolbar" aria-labelledby="h-home"><h1 class="h2" id="h-home">Shop all products</h1>' +
      '<ul class="chips" aria-label="Categories">' + chips + "</ul></section>" +
      '<div class="dense-layout"><aside aria-label="Filters and best sellers">' +
      '<p class="eyebrow">Categories</p><ul class="side-list" style="margin-top:8px">' + sideCats + "</ul>" +
      '<p class="eyebrow" style="margin-top:20px">Best sellers</p><ol class="rank" style="margin-top:8px">' + bestItems + "</ol>" +
      '<p class="small muted" style="margin-top:12px">Filter and sort are static in this revision.</p></aside>' +
      '<section aria-label="Products"><div class="dense-grid">' + cards + "</div>" +
      '<div class="strip"><p class="eyebrow">Why buy here</p>' + whyBlock("") + "</div></section></div>"
    );
  }

  /* ---------- Home, variant C: need-led ---------- */

  function homeC(state) {
    if (state === "error") return errorBlock("c");
    if (state === "empty") return emptyStore();
    if (state === "loading") return skeletonBlock();
    var tiles = [
      ["Quieter calls", "Headsets and microphones for voice chat.", "2 products, from 199 zł", "Audio"],
      ["Faster, precise typing", "A keyboard with linear switches.", "1 product, 449 zł", "Keyboards"],
      ["A clear desk", "Mats and cable trays.", "1 product, 89 zł", "Desk"],
      ["Accurate aim", "A wireless mouse for a steady grip.", "1 product, 249 zł", "Mice"],
    ].map(function (t) {
      return '<a class="need-tile" href="#" data-action="stub" data-text="Need pages are not in this revision"><strong>' + esc(t[0]) + '</strong><span class="small">' + esc(t[1]) + '</span><span class="small muted">' + esc(t[2]) + "</span></a>";
    }).join("");
    var rows = PRODUCTS.filter(function (p) { return p.slug !== "stream-mic" && p.slug !== "pad-xl"; }).map(function (p) {
      return (
        '<li class="row-item">' + photo(p) + '<div class="row-meta"><h3 class="h3">' + esc(p.name) + "</h3>" +
        '<p class="price">' + price(p.price) + "</p>" + stockText(p) + "</div>" + addButton(p) + "</li>"
      );
    }).join("");
    return (
      '<section class="section" style="margin-top:24px" aria-labelledby="h-home"><h1 class="h1" id="h-home">What are you setting up?</h1>' +
      '<p class="muted" style="margin-top:8px">Pick a need, or start from a product below.</p>' +
      '<div class="need-grid">' + tiles + "</div></section>" +
      '<section class="section" aria-labelledby="h-ready"><div class="section-head"><h2 class="h2" id="h-ready">Ready to order</h2></div>' +
      '<ul class="row-list">' + rows + "</ul>" +
      '<div class="notice notice-info" style="margin-top:12px"><p><strong>Low stock:</strong> Keyboard K7 has 3 units left.</p></div></section>' +
      '<section class="section" aria-labelledby="h-why"><h2 class="h2" id="h-why">Why buy here</h2><div style="margin-top:12px">' + whyBlock() + "</div></section>"
    );
  }

  function homePage(variant, state) {
    var body = variant === "a" ? homeA(state) : variant === "b" ? homeB(state) : homeC(state);
    return homeHeader() + '<main class="wrap">' + body + "</main>" + storeFooter();
  }

  /* ---------- Copilot (owner) ---------- */

  function recStatus(rec) {
    return ui.statuses[rec.id] || "new";
  }

  function recActions(rec) {
    var s = recStatus(rec);
    if (s === "new") {
      return '<button class="btn btn-secondary btn-small" type="button" data-action="rec" data-id="' + rec.id + '" data-to="saved">Save</button>' +
        '<button class="btn btn-outline btn-small" type="button" data-action="rec" data-id="' + rec.id + '" data-to="dismissed">Dismiss</button>';
    }
    if (s === "saved") {
      return '<button class="btn btn-action btn-small" type="button" data-action="rec" data-id="' + rec.id + '" data-to="completed">Mark completed</button>' +
        '<button class="btn btn-outline btn-small" type="button" data-action="rec" data-id="' + rec.id + '" data-to="dismissed">Dismiss</button>';
    }
    return '<span class="small muted">No further actions.</span>';
  }

  function priorityBadge(rec) {
    return '<span class="badge' + (rec.priority === "High" ? " badge-high" : "") + '">' + rec.priority + " priority</span>";
  }

  function statusLine(rec) {
    return '<span class="status-text">Status: ' + STATUS_LABEL[recStatus(rec)] + "</span>";
  }

  function evidenceTable(rec) {
    return (
      '<table class="evidence"><caption class="sr-only">Evidence for ' + esc(rec.title) + '</caption><tbody>' +
      rec.evidence.map(function (e) { return "<tr><th scope=\"row\">" + esc(e[0]) + "</th><td>" + esc(e[1]) + "</td></tr>"; }).join("") +
      "</tbody></table>"
    );
  }

  function answerA() {
    return '<div class="rec-stack">' + RECS.map(function (rec) {
      return (
        '<article class="card rec" aria-labelledby="t-' + rec.id + '"><div class="rec-head">' + priorityBadge(rec) + statusLine(rec) + "</div>" +
        '<h3 class="h3" id="t-' + rec.id + '">' + esc(rec.title) + "</h3><p>" + esc(rec.observation) + "</p>" +
        evidenceTable(rec) + '<p class="small muted">Limit: ' + esc(rec.limitation) + '</p><div class="actions">' + recActions(rec) + "</div></article>"
      );
    }).join("") + "</div>";
  }

  function answerB() {
    var rows = RECS.map(function (rec) {
      return (
        "<tr><td><a href=\"#rec-" + rec.id + "\">" + esc(rec.title) + "</a></td><td>" + esc(rec.priority) + "</td><td>" + esc(rec.key) +
        "</td><td>" + STATUS_LABEL[recStatus(rec)] + "</td></tr>"
      );
    }).join("");
    var details = RECS.map(function (rec) {
      return (
        '<details class="disclosure" id="rec-' + rec.id + '" open><summary><span>' + esc(rec.title) + "</span>" + priorityBadge(rec) + "</summary>" +
        '<div class="disclosure-body"><p>' + esc(rec.observation) + "</p>" + evidenceTable(rec) +
        '<p class="small muted">Limit: ' + esc(rec.limitation) + "</p>" + statusLine(rec) +
        '<div class="actions">' + recActions(rec) + "</div></div></details>"
      );
    }).join("");
    return (
      '<div class="table-wrap"><table class="data-table"><caption class="sr-only">Recommendations, with key figure and status</caption>' +
      "<thead><tr><th scope=\"col\">Recommendation</th><th scope=\"col\">Priority</th><th scope=\"col\">Key figure</th><th scope=\"col\">Status</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>" +
      '<div class="disclosure-stack">' + details + "</div>"
    );
  }

  function answerC() {
    var idx = Math.min(Math.max(ui.selected, 0), RECS.length - 1);
    var rec = RECS[idx];
    var picks = RECS.map(function (r, i) {
      return (
        '<li><button class="pick" type="button" data-action="select" data-index="' + i + '" aria-pressed="' + (i === idx) + '">' +
        "<span>" + (i + 1) + ". " + esc(r.title) + "</span><span class=\"small muted\">" + esc(r.priority) + "</span></button></li>"
      );
    }).join("");
    return (
      '<div class="split"><nav aria-label="Recommendations"><ul class="pick-list">' + picks + "</ul></nav>" +
      '<article class="card rec" aria-live="polite"><div class="rec-head">' + priorityBadge(rec) + statusLine(rec) + "</div>" +
      '<h3 class="h2">' + esc(rec.title) + "</h3><p>" + esc(rec.observation) + "</p>" + evidenceTable(rec) +
      '<p class="small muted">Limit: ' + esc(rec.limitation) + '</p><div class="actions">' + recActions(rec) + "</div></article></div>" +
      '<div class="pager" style="margin-top:12px">' +
      '<button class="btn btn-outline" type="button" data-action="step" data-step="-1"' + (idx === 0 ? " disabled" : "") + ">Previous</button>" +
      '<span class="small muted">Recommendation ' + (idx + 1) + " of " + RECS.length + "</span>" +
      '<button class="btn btn-outline" type="button" data-action="step" data-step="1"' + (idx === RECS.length - 1 ? " disabled" : "") + ">Next</button></div>"
    );
  }

  function answerBody(variant) {
    return variant === "a" ? answerA() : variant === "b" ? answerB() : answerC();
  }

  function copilotPage(variant, state) {
    var suggestions = ["Which products should I restock?", "How are visits from each source converting?", "What sold best last week?"];
    var chips = suggestions.map(function (s) {
      return '<button class="btn btn-outline" type="button" data-action="suggest" data-text="' + esc(s) + '">' + esc(s) + "</button>";
    }).join("");
    var note = ui.note ? '<p class="notice notice-info small" role="status">' + esc(ui.note) + "</p>" : "";
    var answer;
    var sourceNotice = "";
    if (state === "error-500") {
      answer = '<div class="notice notice-destructive" role="alert"><p><strong>Copilot is temporarily unavailable.</strong></p>' +
        '<p><a class="btn btn-outline" href="#/copilot/' + variant + '/answer-ai">Ask again</a></p></div>';
    } else if (state === "empty-store") {
      answer = '<div class="empty"><h2 class="h2">Not enough data yet</h2><p>No paid orders and no traffic in this period.</p></div>';
    } else {
      var src = SOURCES[state];
      sourceNotice = '<div class="notice ' + (src[0] === "warning" ? "" : "notice-info") + '" role="status"><p>' + esc(src[1]) + "</p></div>";
      answer = '<section aria-labelledby="h-rec"><h2 class="h2" id="h-rec">Recommendations</h2><p class="small muted" style="margin:6px 0 12px">Period: 9–16 Oct 2026 (last 7 days). Traffic figures are fictional demo data.</p>' + answerBody(variant) + "</section>";
    }
    return (
      '<div class="admin">' +
      '<aside class="admin-side" aria-label="Owner menu"><p class="brand-admin">CommerceOS admin</p><nav class="admin-nav" aria-label="Admin">' +
      '<a href="#" data-action="stub" data-text="Dashboard is not in this revision">Dashboard</a>' +
      '<a href="#" data-action="stub" data-text="Orders are not in this revision">Orders</a>' +
      '<a href="#/copilot/' + variant + '/answer-ai" aria-current="page">Copilot</a>' +
      '<a href="#/home/a/default">Storefront</a></nav></aside>' +
      '<main class="admin-main"><h1 class="h1" style="font-size:1.75rem">Commerce Copilot</h1>' +
      '<div class="notice notice-info" role="note"><p><strong>Copilot suggests; you decide.</strong> Nothing in the store changes until you act on a recommendation.</p></div>' +
      '<form class="ask" data-form="ask"><label for="cq">Ask about your store</label>' +
      '<div class="ask-row"><input id="cq" type="text" maxlength="500" placeholder="For example: what should I restock?"><button class="btn btn-action" type="submit">Ask</button></div>' +
      '<div class="suggest-row" aria-label="Suggested questions">' + chips + "</div></form>" +
      note + sourceNotice + answer +
      "</main></div>"
    );
  }

  /* ---------- Review bar and routing ---------- */

  function parseRoute() {
    var raw = (window.location.hash || "").replace(/^#\/?/, "");
    var parts = raw.split("/");
    var screen = parts[0] || "home";
    var variant = parts[1] || "a";
    var def = screen === "copilot" ? "answer-ai" : "default";
    var state = parts[2] || def;
    if (!SCREENS[screen] || !SCREENS[screen].variants[variant]) return null;
    var valid = SCREENS[screen].states.some(function (s) { return s[0] === state; });
    if (!valid) state = def;
    return { screen: screen, variant: variant, state: state };
  }

  function reviewBar(route) {
    var screenLinks = Object.keys(SCREENS).map(function (key) {
      var target = key === "home" ? "#/home/" + route.variant + "/default" : "#/copilot/" + route.variant + "/answer-ai";
      var label = key === "home" ? "Storefront home" : "Copilot answer";
      return '<a href="' + target + '"' + (route.screen === key ? ' aria-current="true"' : "") + ">" + label + "</a>";
    }).join("");
    var variantLinks = ["a", "b", "c"].map(function (v) {
      var label = v.toUpperCase() + ": " + SCREENS[route.screen].variants[v];
      return '<a href="#/' + route.screen + "/" + v + "/" + route.state + '"' + (route.variant === v ? ' aria-current="true"' : "") + ">" + label + "</a>";
    }).join("");
    var options = SCREENS[route.screen].states.map(function (s) {
      return '<option value="' + s[0] + '"' + (s[0] === route.state ? " selected" : "") + ">" + esc(s[1]) + "</option>";
    }).join("");
    return (
      '<div class="review-bar" role="region" aria-label="Prototype review controls"><div class="review-inner">' +
      '<div class="review-row"><span class="review-label">Prototype review (not part of the store)</span>' + screenLinks +
      '<button type="button" data-action="theme" aria-pressed="' + (ui.theme === "dark") + '">Dark theme</button>' +
      '<button type="button" data-action="reset">Reset</button></div>' +
      '<div class="review-row"><span class="review-label">Variant</span>' + variantLinks + "</div>" +
      '<div class="review-row"><label for="state-pick" class="review-label">State</label>' +
      '<select id="state-pick" data-action="state">' + options + "</select></div>" +
      '<p class="variant-note">' + esc(VARIANT_NOTES[route.screen][route.variant]) + "</p>" +
      (ui.note ? '<p class="review-status" role="status">' + esc(ui.note) + "</p>" : "") +
      "</div></div>"
    );
  }

  function render() {
    var route = parseRoute();
    var root = document.getElementById("root");
    document.documentElement.classList.toggle("dark", ui.theme === "dark");
    if (!route) {
      root.innerHTML = reviewBar({ screen: "home", variant: "a", state: "default" }) +
        '<main class="wrap unknown-page"><h1 class="h2">Unknown page in this prototype</h1><p>Use the review bar to choose a screen, variant and state.</p>' +
        '<p><a class="btn btn-outline" href="#/home/a/default">Go to the storefront home</a></p></main>';
      return;
    }
    var page = route.screen === "home" ? homePage(route.variant, route.state) : copilotPage(route.variant, route.state);
    root.innerHTML = reviewBar(route) + page;
  }

  function setRecStatus(id, to) {
    ui.statuses[id] = to;
  }

  document.addEventListener("click", function (event) {
    var el = event.target.closest("[data-action]");
    if (!el) return;
    var action = el.getAttribute("data-action");
    if (action === "stub") {
      event.preventDefault();
      ui.note = el.getAttribute("data-text") || "This control is not in this revision.";
      render();
      return;
    }
    if (action === "rec") {
      setRecStatus(el.getAttribute("data-id"), el.getAttribute("data-to"));
      render();
      return;
    }
    if (action === "select") {
      ui.selected = Number(el.getAttribute("data-index"));
      render();
      return;
    }
    if (action === "step") {
      ui.selected = ui.selected + Number(el.getAttribute("data-step"));
      render();
      return;
    }
    if (action === "suggest") {
      event.preventDefault();
      var input = document.getElementById("cq");
      if (input) input.value = el.getAttribute("data-text") || "";
      return;
    }
    if (action === "theme") {
      ui.theme = ui.theme === "dark" ? "light" : "dark";
      render();
      return;
    }
    if (action === "reset") {
      ui = { theme: "light", selected: 0, statuses: {}, note: "" };
      window.location.hash = "#/home/a/default";
      render();
    }
  });

  document.addEventListener("submit", function (event) {
    if (!event.target.matches('form[data-form="ask"]')) return;
    event.preventDefault();
    ui.note = "Prototype: no question is sent. The answer below is a fixed sample, not a live answer.";
    render();
  });

  document.addEventListener("change", function (event) {
    var el = event.target;
    if (el.getAttribute("data-action") !== "state") return;
    var route = parseRoute() || { screen: "home", variant: "a" };
    window.location.hash = "#/" + route.screen + "/" + route.variant + "/" + el.value;
  });

  window.addEventListener("hashchange", function () {
    ui.note = "";
    render();
  });

  render();
})();
