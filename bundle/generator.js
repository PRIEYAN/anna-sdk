/**
 * Prompt-driven site generator.
 * Parses the user's description and builds a complete multi-page vanilla JS
 * website — different structure, colors, content, and branding per prompt.
 * Used as the primary generator when Anna LLM is unavailable.
 */

// ── Prompt intelligence ────────────────────────────────────────────────────

function detectCategory(prompt) {
  const p = prompt.toLowerCase();
  if (/coffee|cafe|café|brew|espresso|barista|latte|cappuccino|bakery/.test(p)) return "coffee";
  if (/restaurant|food|dining|pizza|burger|sushi|cuisine|bistro|grill|eatery/.test(p)) return "restaurant";
  if (/portfolio|artist|designer|creative|freelance|photography|illustration|gallery/.test(p)) return "portfolio";
  if (/chat|messag|social|connect|community|real.?time|collaboration/.test(p)) return "saas";
  if (/saas|software|platform|tool|dashboard|productivity|crm|analytics/.test(p)) return "saas";
  if (/blog|news|magazine|article|journal|editorial|media/.test(p)) return "blog";
  if (/fitness|gym|yoga|workout|training|health|wellness/.test(p)) return "fitness";
  return "ecommerce";
}

function extractName(prompt, category) {
  // "called X" / "named X" / "for X" / quoted name
  const explicit = prompt.match(/(?:called|named|for)\s+["']?([A-Z][a-zA-Z0-9\s&'.]{2,28})["']?/i);
  if (explicit) { const raw = explicit[1].trim(); return raw.charAt(0).toUpperCase() + raw.slice(1); }

  const defaults = {
    coffee:     "Morning Brew",
    restaurant: "The Golden Fork",
    portfolio:  "Alex Morgan Studio",
    saas:       "ConnectHub",
    blog:       "Insights Daily",
    fitness:    "PeakForm",
    ecommerce:  "ShopVibe",
  };
  return defaults[category];
}

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Color palettes per category ────────────────────────────────────────────

const PALETTES = {
  coffee:     { bg: "#1a0f0a", card: "#2a1810", border: "#3d2518", accent: "#d4873c", text: "#f5ede6", muted: "#9a7060" },
  restaurant: { bg: "#0d0d0a", card: "#1a1a14", border: "#2e2e22", accent: "#c8a84b", text: "#f5f0e8", muted: "#8a8070" },
  portfolio:  { bg: "#0a0a0f", card: "#14141e", border: "#1e1e2e", accent: "#7c6af5", text: "#e8e8f5", muted: "#7070a0" },
  saas:       { bg: "#060b18", card: "#0d1528", border: "#1a2540", accent: "#3b82f6", text: "#e8f0fc", muted: "#6080b0" },
  blog:       { bg: "#0f0f0f", card: "#1a1a1a", border: "#2a2a2a", accent: "#e85d4a", text: "#f0ede8", muted: "#808080" },
  fitness:    { bg: "#080c10", card: "#101820", border: "#1c2c3c", accent: "#22c55e", text: "#e8f5e8", muted: "#507060" },
  ecommerce:  { bg: "#0f172a", card: "#1e293b", border: "#334155", accent: "#f59e0b", text: "#f8fafc", muted: "#94a3b8" },
};

// ── Picsum keyword map ─────────────────────────────────────────────────────

const IMAGES = {
  coffee:     { hero: "coffee-shop/1600/900", card1: "espresso/400/300", card2: "pastry/400/300", card3: "barista/400/300" },
  restaurant: { hero: "restaurant-dining/1600/900", card1: "gourmet-food/400/300", card2: "chef-kitchen/400/300", card3: "fine-dining/400/300" },
  portfolio:  { hero: "creative-studio/1600/900", card1: "design-work/400/300", card2: "photography/400/300", card3: "art-gallery/400/300" },
  saas:       { hero: "technology-team/1600/900", card1: "software-dashboard/400/300", card2: "collaboration/400/300", card3: "productivity/400/300" },
  blog:       { hero: "writing-desk/1600/900", card1: "journalism/400/300", card2: "editorial/400/300", card3: "magazine/400/300" },
  fitness:    { hero: "gym-workout/1600/900", card1: "athlete-training/400/300", card2: "yoga-studio/400/300", card3: "healthy-lifestyle/400/300" },
  ecommerce:  { hero: "online-shopping/1600/900", card1: "fashion/400/300", card2: "product-design/400/300", card3: "retail/400/300" },
};

// ── Category-specific content ──────────────────────────────────────────────

const CONTENT = {
  coffee: (name) => ({
    tagline: "Artisan Coffee & Pastries",
    desc: `${name} is a specialty coffee shop crafting exceptional brews and homemade pastries in a warm, welcoming atmosphere.`,
    ctaText: "View Our Menu",
    ctaHash: "menu",
    features: [
      { icon: "fa-solid fa-mug-hot", title: "Single Origin Beans", desc: "Sourced from award-winning farms in Ethiopia, Colombia, and Guatemala." },
      { icon: "fa-solid fa-wheat-awn", title: "House-Baked Daily", desc: "Croissants, sourdough, and seasonal pastries made fresh every morning." },
      { icon: "fa-solid fa-wifi", title: "Work-Friendly Space", desc: "Fast WiFi, quiet corners, and plenty of power outlets for remote workers." },
      { icon: "fa-solid fa-leaf", title: "Sustainably Sourced", desc: "100% Fair Trade certified. Our cups taste better because they're ethical." },
    ],
    extraPages: [
      { hash: "menu", label: "Menu", icon: "fa-solid fa-utensils", renderFn: "renderMenu" },
      { hash: "events", label: "Events", icon: "fa-solid fa-calendar", renderFn: "renderEvents" },
    ],
    stats: [{ n: "12+", l: "Origins" }, { n: "4.9★", l: "Rating" }, { n: "8am–9pm", l: "Daily" }],
    primaryBtnText: "See Full Menu",
  }),
  restaurant: (name) => ({
    tagline: "Fine Dining & Modern Cuisine",
    desc: `${name} reimagines classic flavors with modern technique — seasonal ingredients, bold pairings, and an unforgettable dining experience.`,
    ctaText: "Book a Table",
    ctaHash: "reservations",
    features: [
      { icon: "fa-solid fa-star", title: "Michelin-Inspired", desc: "Award-winning dishes crafted by our executive chef with 20+ years of experience." },
      { icon: "fa-solid fa-seedling", title: "Farm to Table", desc: "Locally sourced ingredients from partner farms within 50 miles." },
      { icon: "fa-solid fa-wine-glass", title: "Curated Wine List", desc: "200+ labels from boutique vineyards, hand-picked by our sommelier." },
      { icon: "fa-solid fa-calendar-check", title: "Private Events", desc: "Exclusive dining rooms available for birthdays, corporate events, and more." },
    ],
    extraPages: [
      { hash: "menu", label: "Menu", icon: "fa-solid fa-utensils", renderFn: "renderMenu" },
      { hash: "reservations", label: "Reservations", icon: "fa-solid fa-calendar", renderFn: "renderReservations" },
    ],
    stats: [{ n: "3★", l: "Michelin" }, { n: "200+", l: "Wine labels" }, { n: "5–11pm", l: "Mon–Sat" }],
    primaryBtnText: "Reserve a Table",
  }),
  portfolio: (name) => ({
    tagline: "Creative Direction & Design",
    desc: `${name} — freelance creative specializing in brand identity, digital experiences, and art direction. Available for select projects.`,
    ctaText: "See My Work",
    ctaHash: "work",
    features: [
      { icon: "fa-solid fa-pen-nib", title: "Brand Identity", desc: "From logo to full visual system — building brands that stand out and last." },
      { icon: "fa-solid fa-display", title: "UI/UX Design", desc: "Digital interfaces that are as beautiful as they are intuitive to use." },
      { icon: "fa-solid fa-camera", title: "Art Direction", desc: "Creative strategy and visual storytelling for campaigns and editorial work." },
      { icon: "fa-solid fa-code", title: "Web Development", desc: "Clean, performant front-ends built with modern technologies." },
    ],
    extraPages: [
      { hash: "work", label: "Work", icon: "fa-solid fa-images", renderFn: "renderWork" },
      { hash: "resume", label: "Resume", icon: "fa-solid fa-file-lines", renderFn: "renderResume" },
    ],
    stats: [{ n: "80+", l: "Projects" }, { n: "5 yrs", l: "Experience" }, { n: "Open", l: "For hire" }],
    primaryBtnText: "View Portfolio",
  }),
  saas: (name) => ({
    tagline: "Real-Time Collaboration Platform",
    desc: `${name} brings your team together with instant messaging, smart notifications, and a workspace that moves as fast as you do.`,
    ctaText: "Start Free Trial",
    ctaHash: "login",
    features: [
      { icon: "fa-solid fa-bolt", title: "Real-Time Messaging", desc: "Sub-50ms message delivery. Channels, threads, DMs — all in one place." },
      { icon: "fa-solid fa-shield-halved", title: "Enterprise Security", desc: "End-to-end encryption, SSO, and SOC 2 Type II certified." },
      { icon: "fa-solid fa-puzzle-piece", title: "100+ Integrations", desc: "Connect GitHub, Notion, Figma, Jira, and everything else you use." },
      { icon: "fa-solid fa-chart-line", title: "Smart Analytics", desc: "See how your team communicates and find bottlenecks before they happen." },
    ],
    extraPages: [
      { hash: "pricing", label: "Pricing", icon: "fa-solid fa-tag", renderFn: "renderPricing" },
      { hash: "features", label: "Features", icon: "fa-solid fa-list-check", renderFn: "renderFeatures" },
    ],
    stats: [{ n: "50K+", l: "Teams" }, { n: "99.9%", l: "Uptime" }, { n: "Free", l: "To start" }],
    primaryBtnText: "Get Started Free",
  }),
  blog: (name) => ({
    tagline: "Ideas Worth Reading",
    desc: `${name} publishes longform essays, investigations, and expert commentary on technology, culture, and the ideas shaping our world.`,
    ctaText: "Read Latest",
    ctaHash: "posts",
    features: [
      { icon: "fa-solid fa-pen", title: "Expert Writers", desc: "Contributing editors from The Atlantic, Wired, and MIT Technology Review." },
      { icon: "fa-regular fa-newspaper", title: "Weekly Digest", desc: "Curated reading list delivered every Sunday. No noise, just signal." },
      { icon: "fa-solid fa-podcast", title: "Audio Version", desc: "Every article available as a high-quality audio recording." },
      { icon: "fa-solid fa-users", title: "Member Community", desc: "Exclusive access to author Q&As and reader discussion threads." },
    ],
    extraPages: [
      { hash: "posts", label: "Articles", icon: "fa-solid fa-book-open", renderFn: "renderPosts" },
      { hash: "subscribe", label: "Subscribe", icon: "fa-solid fa-envelope", renderFn: "renderSubscribe" },
    ],
    stats: [{ n: "200K+", l: "Readers" }, { n: "2×/week", l: "New posts" }, { n: "Free", l: "To read" }],
    primaryBtnText: "Start Reading",
  }),
  fitness: (name) => ({
    tagline: "Train Smarter. Live Better.",
    desc: `${name} is where champions are built — expert coaching, science-backed programming, and a community that pushes you to your peak.`,
    ctaText: "Start Training",
    ctaHash: "login",
    features: [
      { icon: "fa-solid fa-dumbbell", title: "Expert Coaching", desc: "Certified trainers with backgrounds in strength, HIIT, and sport science." },
      { icon: "fa-solid fa-chart-bar", title: "Progress Tracking", desc: "Log workouts, track PRs, and visualize your progress over time." },
      { icon: "fa-solid fa-bowl-food", title: "Nutrition Plans", desc: "Custom macro targets and meal plans built around your training goals." },
      { icon: "fa-solid fa-users", title: "Community Challenges", desc: "Monthly challenges, leaderboards, and a community that celebrates every win." },
    ],
    extraPages: [
      { hash: "programs", label: "Programs", icon: "fa-solid fa-fire", renderFn: "renderPrograms" },
      { hash: "coaches", label: "Coaches", icon: "fa-solid fa-user-tie", renderFn: "renderCoaches" },
    ],
    stats: [{ n: "10K+", l: "Members" }, { n: "50+", l: "Programs" }, { n: "Free", l: "First week" }],
    primaryBtnText: "Join Now",
  }),
  ecommerce: (name) => ({
    tagline: "Premium Products, Exceptional Quality",
    desc: `${name} offers a curated selection of premium products designed for those who appreciate quality, style, and performance.`,
    ctaText: "Shop Now",
    ctaHash: "products",
    features: [
      { icon: "fa-solid fa-award", title: "Premium Quality", desc: "Every product rigorously tested and backed by our quality guarantee." },
      { icon: "fa-solid fa-truck-fast", title: "Free Shipping", desc: "Free next-day delivery on orders over $75. Easy 30-day returns." },
      { icon: "fa-solid fa-headset", title: "24/7 Support", desc: "Live chat, phone, and email support. Average response under 3 minutes." },
      { icon: "fa-solid fa-leaf", title: "Sustainably Made", desc: "Carbon-neutral shipping and sustainable packaging on every order." },
    ],
    extraPages: [
      { hash: "products", label: "Shop", icon: "fa-solid fa-store", renderFn: "renderProducts" },
      { hash: "cart", label: "Cart", icon: "fa-solid fa-bag-shopping", renderFn: "renderCart" },
    ],
    stats: [{ n: "50K+", l: "Customers" }, { n: "4.9★", l: "Avg rating" }, { n: "Free", l: "Returns" }],
    primaryBtnText: "Shop Collection",
  }),
};

// ── Extra page generators ──────────────────────────────────────────────────

function renderMenuPage(category, name, c) {
  if (category === "coffee") {
    return `window.renderMenu = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag"><i class="fa-solid fa-mug-hot"></i> Our Menu</div>
  <h2 style="margin-bottom:48px">Crafted With Care</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px">
    <div>
      <h3 style="color:${c.accent};margin-bottom:20px;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Espresso Bar</h3>
      ${["Espresso · $3.50","Americano · $4.00","Flat White · $5.00","Cortado · $4.50","Oat Latte · $5.50","Cold Brew · $5.00"].map(item=>`<div style="display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid ${c.border}"><span>${item.split("·")[0]}</span><span style="color:${c.accent}">${item.split("·")[1]}</span></div>`).join("")}
    </div>
    <div>
      <h3 style="color:${c.accent};margin-bottom:20px;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Bakery</h3>
      ${["Butter Croissant · $4.00","Almond Danish · $4.50","Sourdough Toast · $3.50","Avocado Toast · $9.00","Granola Bowl · $8.00","Seasonal Tart · $5.00"].map(item=>`<div style="display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid ${c.border}"><span>${item.split("·")[0]}</span><span style="color:${c.accent}">${item.split("·")[1]}</span></div>`).join("")}
    </div>
  </div>
</div></div>\`; };`;
  }
  return `window.renderMenu = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag">Menu</div><h2 style="margin-bottom:40px">What We Serve</h2>
  <p style="color:${c.muted}">Our full menu is updated seasonally. Visit us or call to ask about today's specials.</p>
</div></div>\`; };`;
}

function renderExtraPage(fn, category, name, c, img) {
  const pages = {
    renderEvents: () => `window.renderEvents = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag"><i class="fa-solid fa-calendar"></i> Events</div>
  <h2 style="margin-bottom:48px">What's On</h2>
  <div style="display:flex;flex-direction:column;gap:20px">
    ${["Latte Art Workshop — Every Saturday 10am","Cupping Session — 1st Sunday of each month","Live Jazz Evenings — Thursdays 6–9pm","Coffee Origins Talk — Monthly, check socials"].map((ev,i)=>`<div style="background:${c.card};border:1px solid ${c.border};border-radius:12px;padding:24px;display:flex;align-items:center;gap:20px"><div style="background:${c.accent};color:#000;border-radius:10px;width:52px;height:52px;display:grid;place-items:center;font-size:20px;flex-shrink:0"><i class="fa-solid fa-${["star","coffee","music","microphone"][i]}"></i></div><div><h3 style="margin-bottom:4px">${ev.split("—")[0]}</h3><p style="color:${c.muted};font-size:14px">${ev.split("—")[1]?.trim() || "See our socials for dates"}</p></div></div>`).join("")}
  </div>
</div></div>\`; };`,

    renderWork: () => `window.renderWork = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag"><i class="fa-solid fa-images"></i> Selected Work</div>
  <h2 style="margin-bottom:48px">Recent Projects</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px">
    ${[["Brand Identity","Rebranding for a fintech startup — logo, type, full visual system."],["Web Platform","End-to-end UX/UI for a SaaS analytics dashboard."],["Campaign Design","Visual direction for a seasonal product launch."],["Editorial Illustration","Full-page illustrations for a design magazine special issue."],["Packaging Design","Premium packaging system for an artisan food brand."],["Motion Design","Brand animation and social content for a lifestyle brand."]].map(([t,d],i)=>`<div style="overflow:hidden;border-radius:14px;background:${c.card};border:1px solid ${c.border}"><img src="https://picsum.photos/seed/portfolio-project-${i+1}/600/400" style="width:100%;height:200px;object-fit:cover"><div style="padding:20px"><h3 style="margin-bottom:6px">${t}</h3><p style="color:${c.muted};font-size:13px;line-height:1.5">${d}</p></div></div>`).join("")}
  </div>
</div></div>\`; };`,

    renderPricing: () => `window.renderPricing = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag"><i class="fa-solid fa-tag"></i> Pricing</div>
  <h2 style="text-align:center;margin-bottom:12px">Simple, Transparent Pricing</h2>
  <p style="color:${c.muted};text-align:center;margin-bottom:48px">No surprise fees. Cancel anytime.</p>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
    ${[["Free","$0/mo","5 users · 5GB storage · Community support"],["Pro","$12/mo","Unlimited users · 100GB · Priority support · Integrations"],["Enterprise","Custom","Unlimited everything · SLA · Dedicated success manager"]].map(([plan,price,feat],i)=>`<div style="background:${c.card};border:${i===1?`2px solid ${c.accent}`:`1px solid ${c.border}`};border-radius:16px;padding:32px;text-align:center;position:relative">${i===1?`<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:${c.accent};color:#000;border-radius:999px;padding:4px 16px;font-size:11px;font-weight:800;letter-spacing:.08em">MOST POPULAR</div>`:""}
      <h3 style="margin-bottom:8px">${plan}</h3><div style="font-size:36px;font-weight:900;color:${c.accent};margin:16px 0">${price}</div>
      <p style="color:${c.muted};font-size:14px;line-height:1.6;margin-bottom:24px">${feat}</p>
      <button onclick="location.hash='login'" style="width:100%;padding:13px;background:${i===1?c.accent:"transparent"};color:${i===1?"#000":c.text};border:${i===1?"0":`1px solid ${c.border}`};border-radius:8px;cursor:pointer;font:inherit;font-size:15px;font-weight:700">Get started</button>
    </div>`).join("")}
  </div>
</div></div>\`; };`,

    renderPrograms: () => `window.renderPrograms = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag"><i class="fa-solid fa-fire"></i> Programs</div>
  <h2 style="margin-bottom:48px">Train With Purpose</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px">
    ${[["Strength Foundation","12 weeks","Beginner","Build raw strength and muscle. Perfect starting point."],["HIIT Burn","8 weeks","Intermediate","High-intensity interval training for maximum fat loss."],["Athletic Performance","16 weeks","Advanced","Speed, power, and sport-specific conditioning."],["Mobility & Recovery","Ongoing","All levels","Flexibility, foam rolling, and injury prevention."]].map(([name,dur,lvl,desc])=>`<div style="background:${c.card};border:1px solid ${c.border};border-radius:14px;padding:28px"><div style="display:flex;justify-content:space-between;margin-bottom:16px"><span style="background:${c.accent}22;color:${c.accent};padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700">${lvl}</span><span style="color:${c.muted};font-size:13px">${dur}</span></div><h3 style="margin-bottom:8px">${name}</h3><p style="color:${c.muted};font-size:14px;line-height:1.5;margin-bottom:20px">${desc}</p><button onclick="location.hash='login'" style="width:100%;padding:11px;background:${c.accent};color:#000;border:0;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">Start Program</button></div>`).join("")}
  </div>
</div></div>\`; };`,

    renderPosts: () => `window.renderPosts = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag"><i class="fa-solid fa-book-open"></i> Articles</div>
  <h2 style="margin-bottom:48px">Latest Writing</h2>
  <div style="display:flex;flex-direction:column;gap:28px">
    ${[["The Quiet Collapse of Human Attention","Long Reads","An investigation into what smartphones, social algorithms, and notification culture are doing to our ability to focus."],["Building in Public: One Year On","Startup","What we learned sharing every decision, failure, and revenue number publicly for 12 months."],["Why Most AI Products Will Fail","Technology","The gap between impressive demos and useful products is larger than the hype suggests."],["The Return of Third Places","Culture","Coffee shops, libraries, parks: why people are craving spaces that are neither work nor home."]].map(([title,tag,desc])=>`<div style="display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;background:${c.card};border:1px solid ${c.border};border-radius:14px;padding:28px"><div><span style="color:${c.accent};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">${tag}</span><h3 style="margin:10px 0 10px;font-size:20px;font-weight:700;line-height:1.3">${title}</h3><p style="color:${c.muted};font-size:14px;line-height:1.6">${desc}</p></div><button style="background:transparent;border:1px solid ${c.border};border-radius:8px;padding:10px 18px;color:${c.muted};cursor:pointer;font:inherit;font-size:13px;white-space:nowrap">Read →</button></div>`).join("")}
  </div>
</div></div>\`; };`,

    renderFeatures: () => `window.renderFeatures = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag"><i class="fa-solid fa-list-check"></i> Features</div>
  <h2 style="margin-bottom:48px">Everything Your Team Needs</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">
    ${[["fa-comments","Channels & Threads","Organize conversations by topic. Keep discussions focused."],["fa-video","HD Video Calls","One-click calls for up to 200 participants. No installs."],["fa-folder","File Sharing","Drag-and-drop files up to 5GB. Inline preview for 50+ formats."],["fa-bell","Smart Notifications","AI-prioritized alerts. Never miss what matters."],["fa-magnifying-glass","Unified Search","Full-text search across messages, files, and integrations."],["fa-robot","AI Assistant","Summarize threads, draft replies, and automate repetitive tasks."]].map(([icon,title,desc])=>`<div style="background:${c.card};border:1px solid ${c.border};border-radius:12px;padding:24px"><i class="fa-solid ${icon}" style="font-size:24px;color:${c.accent};margin-bottom:16px;display:block"></i><h3 style="margin-bottom:8px;font-size:16px">${title}</h3><p style="color:${c.muted};font-size:13px;line-height:1.5">${desc}</p></div>`).join("")}
  </div>
</div></div>\`; };`,

    renderResume: () => `window.renderResume = function() { return \`<div class="page"><div class="sv-section" style="max-width:720px">
  <div class="sv-tag"><i class="fa-solid fa-file-lines"></i> Resume</div>
  <h2 style="margin-bottom:40px">${name}</h2>
  <h3 style="color:${c.accent};font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:16px">Experience</h3>
  ${[["Senior Creative Director","Pentagram Design · 2021–present","Led brand identity projects for Fortune 500 clients across tech and finance sectors."],["UI/UX Designer","Airbnb Design Studio · 2018–2021","Designed host-facing tools used by 4M+ active hosts worldwide."],["Freelance Designer","Self-employed · 2016–2018","Brand, web, and print design for 30+ startups and small businesses."]].map(([role,org,desc])=>`<div style="padding:24px 0;border-bottom:1px solid ${c.border}"><h3 style="margin-bottom:4px">${role}</h3><div style="color:${c.accent};font-size:13px;margin-bottom:8px">${org}</div><p style="color:${c.muted};font-size:14px;line-height:1.6">${desc}</p></div>`).join("")}
  <h3 style="color:${c.accent};font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin:32px 0 16px">Skills</h3>
  <div style="display:flex;flex-wrap:wrap;gap:10px">${["Figma","Sketch","After Effects","Illustrator","InDesign","HTML/CSS","React","Typography","Motion Design"].map(s=>`<span style="background:${c.card};border:1px solid ${c.border};border-radius:6px;padding:6px 14px;font-size:13px">${s}</span>`).join("")}</div>
</div></div>\`; };`,

    renderReservations: () => `window.renderReservations = function() { return \`<div class="page"><div class="sv-section" style="max-width:600px;margin:0 auto">
  <div class="sv-tag"><i class="fa-solid fa-calendar-check"></i> Reservations</div>
  <h2 style="margin-bottom:12px">Book Your Table</h2>
  <p style="color:${c.muted};margin-bottom:40px">We recommend booking 3–5 days ahead for weekends. Walk-ins welcome based on availability.</p>
  <form onsubmit="event.preventDefault();this.innerHTML='<div style=text-align:center;padding:40px><i class=fa-solid fa-circle-check style=font-size:48px;color:${c.accent};display:block;margin-bottom:16px></i><h3>Table Reserved!</h3><p style=color:${c.muted};margin-top:8px>Confirmation sent to your email. See you soon!</p></div>'">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div><label class="sv-label">Name</label><input class="sv-input" placeholder="Your name"></div>
      <div><label class="sv-label">Party Size</label><select class="sv-input">${[1,2,3,4,5,6,7,8].map(n=>`<option>${n} ${n===1?"guest":"guests"}</option>`).join("")}</select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div><label class="sv-label">Date</label><input type="date" class="sv-input"></div>
      <div><label class="sv-label">Time</label><select class="sv-input">${["5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM","9:00 PM"].map(t=>`<option>${t}</option>`).join("")}</select></div>
    </div>
    <div style="margin-bottom:20px"><label class="sv-label">Special Requests</label><textarea class="sv-input" rows="3" placeholder="Dietary restrictions, celebrations, seating preferences..."></textarea></div>
    <button type="submit" style="width:100%;padding:14px;background:${c.accent};color:#000;border:0;border-radius:10px;font:inherit;font-size:16px;font-weight:800;cursor:pointer">Confirm Reservation</button>
  </form>
</div></div>\`; };`,

    renderProducts: () => `window.renderProducts = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag"><i class="fa-solid fa-store"></i> Shop</div>
  <h2 style="margin-bottom:48px">Our Collection</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:24px">
    ${[["Premium Essential","Best Seller",189,"product-1"],["Signature Edition","New",229,"product-2"],["Classic Series","",149,"product-3"],["Limited Drop","Limited",299,"product-4"],["Core Collection","",129,"product-5"],["Special Reserve","Sale",179,"product-6"]].map(([name,badge,price,seed])=>`<div style="background:${c.card};border:1px solid ${c.border};border-radius:14px;overflow:hidden;transition:.2s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''"><img src="https://picsum.photos/seed/${seed}/400/250" style="width:100%;height:200px;object-fit:cover"><div style="padding:20px">${badge?`<span style="background:${c.accent}22;color:${c.accent};border-radius:4px;padding:3px 8px;font-size:11px;font-weight:700;margin-bottom:10px;display:inline-block">${badge}</span>`:""}<h3 style="margin-bottom:8px">${name}</h3><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:22px;font-weight:800;color:${c.accent}">$${price}</span><button onclick="this.textContent='✓ Added'" style="background:${c.accent};color:#000;border:0;border-radius:8px;padding:9px 18px;font:inherit;font-size:13px;font-weight:700;cursor:pointer">Add to Cart</button></div></div></div>`).join("")}
  </div>
</div></div>\`; };`,

    renderCart: () => `window.renderCart = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag"><i class="fa-solid fa-bag-shopping"></i> Cart</div>
  <h2 style="margin-bottom:40px">Your Cart <span style="color:${c.muted};font-size:18px;font-weight:400">(2 items)</span></h2>
  <div style="display:grid;grid-template-columns:1fr 340px;gap:40px;align-items:start">
    <div style="display:flex;flex-direction:column;gap:16px">
      ${[["Premium Essential","$189.00","product-1"],["Signature Edition","$229.00","product-2"]].map(([n,p,s])=>`<div style="display:flex;gap:20px;align-items:center;background:${c.card};border:1px solid ${c.border};border-radius:14px;padding:20px"><img src="https://picsum.photos/seed/${s}/160/160" style="width:80px;height:80px;border-radius:10px;object-fit:cover"><div style="flex:1"><h3 style="margin-bottom:6px">${n}</h3><div style="color:${c.accent};font-weight:700">${p}</div></div><i class="fa-solid fa-xmark" style="color:${c.muted};cursor:pointer;font-size:18px"></i></div>`).join("")}
    </div>
    <div style="background:${c.card};border:1px solid ${c.border};border-radius:16px;padding:28px">
      <h3 style="margin-bottom:20px">Order Summary</h3>
      ${[["Subtotal","$418.00"],["Shipping","FREE"],["Tax","$34.49"],["Total","$452.49"]].map(([l,v],i)=>`<div style="display:flex;justify-content:space-between;padding:10px 0;${i===3?`border-top:1px solid ${c.border};margin-top:8px;font-size:18px;font-weight:800;color:${c.text}`:`color:${c.muted};font-size:14px`}">${i===1?`<span>${l}</span><span style="color:${c.accent}">${v}</span>`:`<span>${l}</span><span>${v}</span>`}</div>`).join("")}
      <button onclick="location.hash='login'" style="width:100%;padding:14px;background:${c.accent};color:#000;border:0;border-radius:10px;font:inherit;font-size:15px;font-weight:800;cursor:pointer;margin-top:16px;display:flex;align-items:center;justify-content:center;gap:8px"><i class="fa-solid fa-lock"></i> Checkout</button>
    </div>
  </div>
</div></div>\`; };`,

    renderCoaches: () => `window.renderCoaches = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag"><i class="fa-solid fa-user-tie"></i> Our Coaches</div>
  <h2 style="margin-bottom:48px">Meet Your Team</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:24px">
    ${[["Marcus Reid","Strength & Conditioning","NSCA-CSCS · 10 yrs","coach-1"],["Priya Nair","HIIT & Cardio","ACE CPT · 7 yrs","coach-2"],["James Okafor","Mobility & Recovery","NASM CPT · 8 yrs","coach-3"],["Sarah Chen","Nutrition Coach","RD, CSSD · 6 yrs","coach-4"]].map(([n,role,cert,seed])=>`<div style="background:${c.card};border:1px solid ${c.border};border-radius:14px;overflow:hidden;text-align:center"><img src="https://picsum.photos/seed/${seed}-fitness/400/300" style="width:100%;height:200px;object-fit:cover"><div style="padding:20px"><h3 style="margin-bottom:4px">${n}</h3><div style="color:${c.accent};font-size:13px;font-weight:600;margin-bottom:4px">${role}</div><div style="color:${c.muted};font-size:12px">${cert}</div></div></div>`).join("")}
  </div>
</div></div>\`; };`,

    renderSubscribe: () => `window.renderSubscribe = function() { return \`<div class="page"><div class="sv-section" style="max-width:600px;margin:0 auto;text-align:center">
  <div class="sv-tag"><i class="fa-solid fa-envelope"></i> Subscribe</div>
  <h2 style="margin-bottom:16px">Join 200K+ Readers</h2>
  <p style="color:${c.muted};font-size:17px;line-height:1.7;margin-bottom:40px">Two essays a week. No noise, no sponsored content. Just the best writing on ideas that matter.</p>
  <form onsubmit="event.preventDefault();this.innerHTML='<i class=fa-solid fa-circle-check style=font-size:48px;color:${c.accent};display:block;margin-bottom:16px></i><h3>You\\'re in!</h3><p style=color:${c.muted};margin-top:8px>First issue lands in your inbox this Sunday.</p>'">
    <div style="display:flex;gap:12px;max-width:440px;margin:0 auto 20px">
      <input class="sv-input" type="email" placeholder="your@email.com" style="flex:1">
      <button type="submit" style="padding:13px 24px;background:${c.accent};color:#000;border:0;border-radius:8px;font:inherit;font-size:15px;font-weight:800;cursor:pointer;white-space:nowrap">Subscribe Free</button>
    </div>
    <p style="color:${c.muted};font-size:12px">No spam. Unsubscribe anytime. We respect your inbox.</p>
  </form>
  <div style="display:flex;justify-content:center;gap:48px;margin-top:48px">
    ${[["200K+","Subscribers"],["2×/week","New essays"],["No","Ads ever"]].map(([n,l])=>`<div><div style="font-size:28px;font-weight:900;color:${c.accent}">${n}</div><div style="color:${c.muted};font-size:13px">${l}</div></div>`).join("")}
  </div>
</div></div>\`; };`,
  };
  return (pages[fn] || (() => `window.${fn} = function() { return '<div class="page"><div class="sv-section"><h2>Coming soon</h2></div></div>'; };`))();
}

// ── Main generator ─────────────────────────────────────────────────────────

export function generateSite(prompt) {
  const category = detectCategory(prompt);
  const name = extractName(prompt, category);
  const c = PALETTES[category];
  const img = IMAGES[category];
  const data = (CONTENT[category] || CONTENT.ecommerce)(name);
  const { tagline, desc, features, extraPages, stats, primaryBtnText } = data;
  const slug = toSlug(name);

  // ── index.html ──────────────────────────────────────────────────────────
  const allScreens = ["home", "about", "contact", "login", ...extraPages.map(p => p.hash)];
  const scriptTags = allScreens.map(s => `  <script src="screens/${s}.js"></script>`).join("\n");

  const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — ${tagline}</title>
  <meta name="description" content="${desc.slice(0, 155)}">
  <link rel="icon" href="public/favicon.svg">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app"></div>
${scriptTags}
  <script src="main.js"></script>
</body>
</html>`;

  // ── style.css ───────────────────────────────────────────────────────────
  const styleCss = `:root {
  --bg: ${c.bg}; --card: ${c.card}; --border: ${c.border};
  --accent: ${c.accent}; --text: ${c.text}; --muted: ${c.muted};
  --radius: 14px;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); min-height: 100vh; }
a { color: var(--accent); text-decoration: none; }
.page { padding-top: 64px; min-height: 100vh; }
nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 40px; height: 64px;
  background: rgba(${parseInt(c.bg.slice(1,3),16)},${parseInt(c.bg.slice(3,5),16)},${parseInt(c.bg.slice(5,7),16)},0.94);
  backdrop-filter: blur(14px); border-bottom: 1px solid var(--border);
}
.nav-logo { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.03em; }
.nav-logo em { color: var(--accent); font-style: normal; }
.nav-links { display: flex; gap: 24px; align-items: center; }
.nav-links a { color: var(--muted); font-size: 14px; font-weight: 500; transition: color .2s; }
.nav-links a:hover { color: var(--text); }
.nav-cta { background: var(--accent); color: #000; border: 0; border-radius: 8px; padding: 9px 20px; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity .2s; }
.nav-cta:hover { opacity: .85; }
.sv-hero {
  min-height: 100vh; display: flex; align-items: center;
  background: linear-gradient(135deg, rgba(${parseInt(c.bg.slice(1,3),16)},${parseInt(c.bg.slice(3,5),16)},${parseInt(c.bg.slice(5,7),16)},0.92) 0%, rgba(${parseInt(c.card.slice(1,3),16)},${parseInt(c.card.slice(3,5),16)},${parseInt(c.card.slice(5,7),16)},0.85) 100%), url('https://picsum.photos/seed/${img.hero}') center/cover;
  padding: 80px 40px 60px;
}
.sv-hero-inner { max-width: 1100px; margin: 0 auto; width: 100%; }
.sv-tag { display: inline-flex; align-items: center; gap: 8px; background: ${c.accent}22; color: var(--accent); border: 1px solid ${c.accent}44; border-radius: 999px; padding: 6px 16px; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 28px; }
.sv-hero h1 { font-size: clamp(40px, 7vw, 80px); font-weight: 900; letter-spacing: -0.04em; line-height: 1.0; margin-bottom: 24px; }
.sv-hero h1 em { color: var(--accent); font-style: normal; }
.sv-hero p { color: var(--muted); font-size: 18px; max-width: 520px; line-height: 1.75; margin-bottom: 40px; }
.sv-actions { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
.sv-btn { background: var(--accent); color: #000; border: 0; border-radius: 10px; padding: 14px 30px; font: inherit; font-size: 16px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all .2s; }
.sv-btn:hover { opacity: .88; transform: translateY(-2px); }
.sv-btn-ghost { background: transparent; color: var(--text); border: 1.5px solid var(--border); border-radius: 10px; padding: 14px 30px; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; transition: border-color .2s; }
.sv-btn-ghost:hover { border-color: var(--muted); }
.sv-stats { display: flex; gap: 48px; margin-top: 60px; flex-wrap: wrap; }
.sv-stat-n { font-size: 30px; font-weight: 900; color: var(--accent); }
.sv-stat-l { font-size: 12px; color: var(--muted); margin-top: 2px; }
.sv-section { padding: 96px 40px; max-width: 1100px; margin: 0 auto; }
.sv-section h2 { font-size: clamp(26px, 4vw, 44px); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 16px; }
.sv-section-sub { color: var(--muted); font-size: 17px; max-width: 540px; line-height: 1.7; margin-bottom: 56px; }
.sv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 22px; }
.sv-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 30px; transition: border-color .2s, transform .2s; }
.sv-card:hover { border-color: var(--accent); transform: translateY(-4px); }
.sv-card-icon { font-size: 26px; color: var(--accent); margin-bottom: 18px; }
.sv-card h3 { font-size: 17px; font-weight: 700; margin-bottom: 10px; }
.sv-card p { color: var(--muted); font-size: 14px; line-height: 1.65; }
footer { background: var(--card); border-top: 1px solid var(--border); padding: 56px 40px 28px; }
.sv-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; max-width: 1100px; margin: 0 auto 36px; }
.sv-footer-brand h3 { font-size: 20px; font-weight: 800; margin-bottom: 12px; }
.sv-footer-brand h3 em { color: var(--accent); font-style: normal; }
.sv-footer-brand p { color: var(--muted); font-size: 14px; line-height: 1.7; max-width: 240px; margin-bottom: 18px; }
.sv-socials { display: flex; gap: 10px; }
.sv-social { width: 36px; height: 36px; border: 1px solid var(--border); border-radius: 8px; display: grid; place-items: center; color: var(--muted); cursor: pointer; transition: all .2s; }
.sv-social:hover { background: var(--accent); color: #000; border-color: var(--accent); }
.sv-footer-col h4 { font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-bottom: 14px; }
.sv-footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
.sv-footer-col li a { color: var(--muted); font-size: 13px; transition: color .2s; }
.sv-footer-col li a:hover { color: var(--text); }
.sv-footer-bottom { max-width: 1100px; margin: 0 auto; text-align: center; color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); padding-top: 24px; }
.sv-label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 7px; }
.sv-input { width: 100%; padding: 12px 15px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font: inherit; font-size: 14px; transition: border-color .2s; }
.sv-input:focus { outline: none; border-color: var(--accent); }
.sv-input::placeholder { color: var(--muted); }`;

  // ── main.js ─────────────────────────────────────────────────────────────
  const navLinks = [
    { hash: "home", label: "Home" },
    ...extraPages.map(p => ({ hash: p.hash, label: p.label })),
    { hash: "about", label: "About" },
    { hash: "contact", label: "Contact" },
  ];

  const mainJs = `const app = document.getElementById('app');

function nav() {
  const h = location.hash.replace('#','') || 'home';
  return \`<nav>
    <a class="nav-logo" href="#home">${name.split(" ").map((w,i)=>i===0?`<em>${w}</em>`:w).join(" ")}</a>
    <div class="nav-links">
      ${navLinks.map(l=>`<a href="#${l.hash}" style="color:\${h==='${l.hash}'?'var(--text)':'var(--muted)'}">${l.label}</a>`).join("")}
      <button class="nav-cta" onclick="location.hash='login'">${data.ctaText}</button>
    </div>
  </nav>\`;
}

function footer() {
  return \`<footer>
    <div class="sv-footer-grid">
      <div class="sv-footer-brand">
        <h3>${name.split(" ").map((w,i)=>i===0?`<em>${w}</em>`:w).join(" ")}</h3>
        <p>${desc.slice(0, 120)}...</p>
        <div class="sv-socials">
          <div class="sv-social"><i class="fa-brands fa-instagram"></i></div>
          <div class="sv-social"><i class="fa-brands fa-x-twitter"></i></div>
          <div class="sv-social"><i class="fa-brands fa-linkedin-in"></i></div>
        </div>
      </div>
      <div class="sv-footer-col"><h4>Company</h4><ul>
        <li><a href="#about">About</a></li>
        <li><a href="#contact">Contact</a></li>
        <li><a href="#">Careers</a></li>
      </ul></div>
      <div class="sv-footer-col"><h4>Product</h4><ul>
        ${extraPages.map(p=>`<li><a href="#${p.hash}">${p.label}</a></li>`).join("")}
        <li><a href="#">Pricing</a></li>
      </ul></div>
      <div class="sv-footer-col"><h4>Legal</h4><ul>
        <li><a href="#">Privacy</a></li>
        <li><a href="#">Terms</a></li>
        <li><a href="#">Cookies</a></li>
      </ul></div>
    </div>
    <div class="sv-footer-bottom">© 2025 ${name}. All rights reserved.</div>
  </footer>\`;
}

const renders = { home: window.renderHome, about: window.renderAbout, contact: window.renderContact, login: window.renderLogin ${extraPages.map(p=>`, ${p.hash}: window.${p.renderFn}`).join("")} };

function route() {
  const hash = location.hash.replace('#','') || 'home';
  const fn = renders[hash] || renders.home;
  app.innerHTML = nav() + fn() + footer();
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', route);
route();`;

  // ── screens/home.js ─────────────────────────────────────────────────────
  const homeJs = `window.renderHome = function() { return \`<div class="page">
  <div class="sv-hero"><div class="sv-hero-inner">
    <div class="sv-tag"><i class="${features[0].icon}"></i> ${tagline}</div>
    <h1>${name.split(" ").map((w,i)=>i===1?`<em>${w}</em>`:w).join("<br>")}</h1>
    <p>${desc}</p>
    <div class="sv-actions">
      <button class="sv-btn" onclick="location.hash='${data.ctaHash}'"><i class="${features[0].icon}"></i> ${primaryBtnText}</button>
      <button class="sv-btn-ghost" onclick="location.hash='about'">Learn More</button>
    </div>
    <div class="sv-stats">
      ${stats.map(s=>`<div><div class="sv-stat-n">${s.n}</div><div class="sv-stat-l">${s.l}</div></div>`).join("")}
    </div>
  </div></div>
  <div class="sv-section">
    <div class="sv-tag"><i class="fa-solid fa-sparkles"></i> Why ${name.split(" ")[0]}</div>
    <h2>${features.map(f=>f.title).slice(0,2).join(" & ")}</h2>
    <p class="sv-section-sub">${features[0].desc}</p>
    <div class="sv-grid">
      ${features.map(f=>`<div class="sv-card"><div class="sv-card-icon"><i class="${f.icon}"></i></div><h3>${f.title}</h3><p>${f.desc}</p></div>`).join("")}
    </div>
  </div>
  <div style="background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:72px 40px;text-align:center">
    <div style="max-width:640px;margin:0 auto">
      <div class="sv-tag" style="display:inline-flex;margin-bottom:16px"><i class="fa-solid fa-envelope"></i> Stay Updated</div>
      <h2 style="margin-bottom:12px">Get Early Access</h2>
      <p style="color:var(--muted);font-size:16px;margin-bottom:32px">Be the first to hear about new arrivals, events, and exclusive offers.</p>
      <div style="display:flex;gap:12px;max-width:420px;margin:0 auto">
        <input class="sv-input" type="email" placeholder="your@email.com" style="flex:1">
        <button class="sv-btn" style="white-space:nowrap">Subscribe</button>
      </div>
    </div>
  </div>
</div>\`; };`;

  // ── screens/about.js ────────────────────────────────────────────────────
  const aboutJs = `window.renderAbout = function() { return \`<div class="page">
  <div style="background:linear-gradient(135deg,rgba(${parseInt(c.bg.slice(1,3),16)},${parseInt(c.bg.slice(3,5),16)},${parseInt(c.bg.slice(5,7),16)},0.95),rgba(${parseInt(c.card.slice(1,3),16)},${parseInt(c.card.slice(3,5),16)},${parseInt(c.card.slice(5,7),16)},0.88)),url('https://picsum.photos/seed/${img.card1}${"/1600/500"}') center/cover;padding:110px 40px 70px">
    <div style="max-width:1100px;margin:0 auto">
      <div class="sv-tag">Our Story</div>
      <h1 style="font-size:clamp(34px,5vw,60px);font-weight:900;letter-spacing:-0.04em;max-width:620px;line-height:1.1">Behind ${name}</h1>
    </div>
  </div>
  <div class="sv-section">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;margin-bottom:72px">
      <div>
        <div class="sv-tag">Founded 2021</div>
        <h2>Where It All Started</h2>
        <p style="color:var(--muted);font-size:16px;line-height:1.8;margin:16px 0">${desc} We obsess over the details so you don't have to.</p>
        <p style="color:var(--muted);font-size:16px;line-height:1.8">Every decision we make starts with one question: does this genuinely help our customers? That focus has driven us from day one.</p>
      </div>
      <img src="https://picsum.photos/seed/${img.card2}" style="width:100%;border-radius:16px;object-fit:cover;height:340px">
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-bottom:72px">
      ${stats.map(s=>`<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:32px;text-align:center"><div style="font-size:36px;font-weight:900;color:var(--accent);margin-bottom:8px">${s.n}</div><div style="color:var(--muted);font-size:14px">${s.l}</div></div>`).join("")}
    </div>
    <div class="sv-tag">Our Values</div>
    <h2 style="margin-bottom:48px">What Drives Us</h2>
    <div class="sv-grid">
      ${features.map(f=>`<div class="sv-card"><div class="sv-card-icon"><i class="${f.icon}"></i></div><h3>${f.title}</h3><p>${f.desc}</p></div>`).join("")}
    </div>
  </div>
</div>\`; };`;

  // ── screens/contact.js ──────────────────────────────────────────────────
  const contactJs = `window.renderContact = function() { return \`<div class="page"><div class="sv-section">
  <div class="sv-tag"><i class="fa-solid fa-envelope"></i> Get in Touch</div>
  <h2 style="margin-bottom:12px">We'd Love to Hear From You</h2>
  <p class="sv-section-sub">Questions, partnerships, or just a hello — our team responds within a few hours.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:56px">
    <form onsubmit="event.preventDefault();this.innerHTML='<div style=text-align:center;padding:40px><i class=fa-solid fa-circle-check style=font-size:48px;color:var(--accent);display:block;margin-bottom:16px></i><h3>Message Sent!</h3><p style=color:var(--muted);margin-top:8px>We\\'ll get back to you shortly.</p></div>'">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div><label class="sv-label">First Name</label><input class="sv-input" placeholder="Alex"></div>
        <div><label class="sv-label">Last Name</label><input class="sv-input" placeholder="Morgan"></div>
      </div>
      <div style="margin-bottom:14px"><label class="sv-label">Email</label><input type="email" class="sv-input" placeholder="you@example.com"></div>
      <div style="margin-bottom:14px"><label class="sv-label">Subject</label>
        <select class="sv-input"><option>General Enquiry</option><option>Support</option><option>Partnership</option><option>Press</option></select>
      </div>
      <div style="margin-bottom:20px"><label class="sv-label">Message</label><textarea class="sv-input" rows="5" placeholder="How can we help?"></textarea></div>
      <button type="submit" class="sv-btn" style="width:100%;justify-content:center"><i class="fa-solid fa-paper-plane"></i> Send Message</button>
    </form>
    <div style="display:flex;flex-direction:column;gap:24px">
      ${[["fa-solid fa-location-dot","Office","123 Main Street, Suite 400, San Francisco, CA 94105"],["fa-solid fa-envelope","Email","hello@${slug}.com"],["fa-solid fa-phone","Phone","+1 (415) 555-0190 · Mon–Fri 9am–6pm"]].map(([icon,title,val])=>`<div style="display:flex;gap:16px;align-items:flex-start;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:22px"><i class="${icon}" style="font-size:20px;color:var(--accent);width:24px;padding-top:2px;flex-shrink:0"></i><div><h4 style="margin-bottom:4px">${title}</h4><p style="color:var(--muted);font-size:14px;line-height:1.5">${val}</p></div></div>`).join("")}
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px">
        <h4 style="margin-bottom:8px"><i class="fa-solid fa-clock" style="color:var(--accent);margin-right:8px"></i>Live Chat</h4>
        <p style="color:var(--muted);font-size:14px;margin-bottom:16px">Average response time: under 5 minutes on weekdays.</p>
        <button class="sv-btn" style="width:100%;justify-content:center">Start Live Chat</button>
      </div>
    </div>
  </div>
</div></div>\`; };`;

  // ── screens/login.js ─────────────────────────────────────────────────────
  const loginJs = `window.renderLogin = function() { return \`<div style="display:grid;grid-template-columns:1fr 1fr;min-height:100vh">
  <div style="background:linear-gradient(135deg,rgba(${parseInt(c.bg.slice(1,3),16)},${parseInt(c.bg.slice(3,5),16)},${parseInt(c.bg.slice(5,7),16)},0.75),rgba(${parseInt(c.card.slice(1,3),16)},${parseInt(c.card.slice(3,5),16)},${parseInt(c.card.slice(5,7),16)},0.65)),url('https://picsum.photos/seed/${img.card3}${"/800/1000"}') center/cover;display:flex;align-items:center;justify-content:center;padding:60px">
    <div>
      <div style="font-size:20px;font-weight:900;margin-bottom:12px">${name.split(" ").map((w,i)=>i===0?`<span style="color:${c.accent}">${w}</span>`:w).join(" ")}</div>
      <h2 style="font-size:34px;font-weight:900;line-height:1.2;margin-bottom:16px">${tagline}</h2>
      <p style="color:var(--muted);font-size:16px;line-height:1.7;max-width:300px">${desc.slice(0,140)}...</p>
    </div>
  </div>
  <div style="display:flex;align-items:center;justify-content:center;padding:60px;background:var(--card)">
    <div style="width:100%;max-width:380px">
      <h1 style="font-size:26px;font-weight:800;margin-bottom:6px">Welcome back</h1>
      <p style="color:var(--muted);margin-bottom:28px">Don't have an account? <a href="#" style="color:var(--accent);font-weight:600">Sign up</a></p>
      <button onclick="this.textContent='Signing in...'" style="width:100%;padding:13px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:16px">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continue with Google
      </button>
      <div style="display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12px;margin-bottom:16px"><span style="flex:1;height:1px;background:var(--border)"></span>or<span style="flex:1;height:1px;background:var(--border)"></span></div>
      <form onsubmit="event.preventDefault();location.hash='home'">
        <div style="margin-bottom:14px"><label class="sv-label">Email</label><input type="email" class="sv-input" placeholder="you@example.com"></div>
        <div style="margin-bottom:20px"><label class="sv-label" style="display:flex;justify-content:space-between">Password <a href="#" style="font-size:12px;font-weight:500">Forgot?</a></label><input type="password" class="sv-input" placeholder="••••••••"></div>
        <button type="submit" class="sv-btn" style="width:100%;justify-content:center">Sign In <i class="fa-solid fa-arrow-right"></i></button>
      </form>
    </div>
  </div>
</div>\`; };`;

  // ── Extra screens ────────────────────────────────────────────────────────
  const extraScreens = extraPages.map(p => {
    if (p.renderFn === "renderMenu") return renderMenuPage(category, name, c);
    return renderExtraPage(p.renderFn, category, name, c, img);
  });

  // ── Assemble all files ───────────────────────────────────────────────────
  const files = [
    { path: "index.html", content: indexHtml },
    { path: "style.css", content: styleCss },
    { path: "main.js", content: mainJs },
    { path: "screens/home.js", content: homeJs },
    { path: "screens/about.js", content: aboutJs },
    { path: "screens/contact.js", content: contactJs },
    { path: "screens/login.js", content: loginJs },
    ...extraPages.map((p, i) => ({ path: `screens/${p.hash}.js`, content: extraScreens[i] })),
  ];

  return { files };
}
