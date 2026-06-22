#!/usr/bin/env node
/**
 * Generates fixtures/vibe.jsonl — mock LLM responses for anna-app dev --mock-llm.
 * Run: node scripts/generate-fixture.js
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// ── Website files ──────────────────────────────────────────────────────────

const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StrideShop — Premium Footwear</title>
  <meta name="description" content="Discover premium footwear crafted for performance and style.">
  <link rel="icon" href="public/favicon.svg">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app"></div>
  <script src="screens/home.js"></script>
  <script src="screens/about.js"></script>
  <script src="screens/contact.js"></script>
  <script src="screens/login.js"></script>
  <script src="screens/products.js"></script>
  <script src="screens/cart.js"></script>
  <script src="main.js"></script>
</body>
</html>`;

const styleCss = `:root {
  --primary: #0f172a;
  --secondary: #1e293b;
  --accent: #f59e0b;
  --accent-dark: #d97706;
  --text: #f8fafc;
  --text-muted: #94a3b8;
  --border: #334155;
  --bg: #0f172a;
  --card: #1e293b;
  --radius: 12px;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); min-height: 100vh; }
a { color: var(--accent); text-decoration: none; }

/* NAV */
nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 40px; height: 64px;
  background: rgba(15,23,42,0.95); backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.nav-logo { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.03em; }
.nav-logo span { color: var(--accent); }
.nav-links { display: flex; gap: 28px; align-items: center; }
.nav-links a { color: var(--text-muted); font-size: 14px; font-weight: 500; transition: color .2s; }
.nav-links a:hover { color: var(--text); }
.nav-cart { position: relative; }
.cart-badge {
  position: absolute; top: -8px; right: -8px;
  background: var(--accent); color: #000; border-radius: 50%;
  width: 18px; height: 18px; font-size: 10px; font-weight: 700;
  display: grid; place-items: center;
}
.nav-cta {
  background: var(--accent); color: #000; border: 0; border-radius: 8px;
  padding: 8px 20px; font-size: 14px; font-weight: 700; cursor: pointer; transition: background .2s;
}
.nav-cta:hover { background: var(--accent-dark); }

/* HERO */
.hero {
  min-height: 100vh; display: flex; align-items: center;
  background: linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.85) 100%),
              url('https://picsum.photos/seed/running-shoes/1600/900') center/cover no-repeat;
  padding: 80px 40px 40px;
}
.hero-inner { max-width: 1100px; margin: 0 auto; width: 100%; }
.hero-tag {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(245,158,11,.15); color: var(--accent);
  border: 1px solid rgba(245,158,11,.3); border-radius: 999px;
  padding: 6px 16px; font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  margin-bottom: 28px;
}
.hero h1 {
  font-size: clamp(42px, 7vw, 80px); font-weight: 900;
  line-height: 1.0; letter-spacing: -0.04em; margin-bottom: 24px;
}
.hero h1 em { color: var(--accent); font-style: normal; }
.hero p { color: var(--text-muted); font-size: 18px; max-width: 520px; line-height: 1.7; margin-bottom: 40px; }
.hero-actions { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
.btn-primary {
  background: var(--accent); color: #000; border: 0; border-radius: 10px;
  padding: 15px 32px; font-size: 16px; font-weight: 800; cursor: pointer; transition: all .2s;
  display: inline-flex; align-items: center; gap: 8px;
}
.btn-primary:hover { background: var(--accent-dark); transform: translateY(-2px); }
.btn-outline {
  background: transparent; color: var(--text); border: 1.5px solid var(--border); border-radius: 10px;
  padding: 15px 32px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all .2s;
}
.btn-outline:hover { border-color: var(--text-muted); }
.hero-stats { display: flex; gap: 48px; margin-top: 64px; }
.stat-num { font-size: 32px; font-weight: 900; color: var(--accent); }
.stat-label { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

/* SECTION */
.section { padding: 100px 40px; max-width: 1100px; margin: 0 auto; }
.section-tag { color: var(--accent); font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 16px; }
.section h2 { font-size: clamp(28px, 4vw, 44px); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 16px; }
.section-sub { color: var(--text-muted); font-size: 17px; max-width: 560px; line-height: 1.7; margin-bottom: 56px; }

/* FEATURES GRID */
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
.feature-card {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 32px; transition: border-color .2s, transform .2s;
}
.feature-card:hover { border-color: var(--accent); transform: translateY(-4px); }
.feature-icon { font-size: 28px; color: var(--accent); margin-bottom: 20px; }
.feature-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
.feature-card p { color: var(--text-muted); font-size: 14px; line-height: 1.6; }

/* PRODUCTS */
.products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
.product-card {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
  overflow: hidden; transition: transform .2s, box-shadow .2s; cursor: pointer;
}
.product-card:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.product-img { width: 100%; height: 200px; object-fit: cover; }
.product-body { padding: 20px; }
.product-badge {
  display: inline-block; background: rgba(245,158,11,.15); color: var(--accent);
  border-radius: 4px; padding: 3px 8px; font-size: 11px; font-weight: 700;
  letter-spacing: .08em; margin-bottom: 10px;
}
.product-name { font-size: 17px; font-weight: 700; margin-bottom: 6px; }
.product-desc { color: var(--text-muted); font-size: 13px; line-height: 1.5; margin-bottom: 16px; }
.product-footer { display: flex; justify-content: space-between; align-items: center; }
.product-price { font-size: 22px; font-weight: 800; color: var(--accent); }
.add-to-cart {
  background: var(--accent); color: #000; border: 0; border-radius: 8px;
  padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .2s;
  display: flex; align-items: center; gap: 6px;
}
.add-to-cart:hover { background: var(--accent-dark); }

/* FORM STYLES */
.form-group { margin-bottom: 20px; }
.form-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; }
.form-input {
  width: 100%; padding: 13px 16px; background: var(--secondary);
  border: 1px solid var(--border); border-radius: 8px; color: var(--text);
  font: inherit; font-size: 15px; transition: border-color .2s;
}
.form-input:focus { outline: none; border-color: var(--accent); }
.form-input::placeholder { color: var(--text-muted); }

/* TEAM */
.team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
.team-card {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
  overflow: hidden; text-align: center; padding-bottom: 24px;
}
.team-photo { width: 100%; height: 200px; object-fit: cover; filter: grayscale(20%); }
.team-name { font-size: 17px; font-weight: 700; margin: 16px 0 4px; }
.team-role { color: var(--accent); font-size: 13px; font-weight: 600; }

/* CART */
.cart-item {
  display: flex; gap: 20px; align-items: center;
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 20px; margin-bottom: 16px;
}
.cart-item-img { width: 80px; height: 80px; border-radius: 8px; object-fit: cover; }
.cart-item-info { flex: 1; }
.cart-item-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.cart-item-price { color: var(--accent); font-weight: 700; }
.cart-item-remove { color: var(--text-muted); cursor: pointer; font-size: 18px; }
.cart-item-remove:hover { color: #ef4444; }
.cart-total-box {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 28px; margin-top: 24px;
}
.cart-total-row { display: flex; justify-content: space-between; padding: 10px 0; color: var(--text-muted); font-size: 14px; }
.cart-total-row.total { color: var(--text); font-size: 20px; font-weight: 800; border-top: 1px solid var(--border); margin-top: 8px; padding-top: 16px; }

/* FOOTER */
footer {
  background: var(--secondary); border-top: 1px solid var(--border);
  padding: 60px 40px 30px;
}
.footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; max-width: 1100px; margin: 0 auto 40px; }
.footer-brand h3 { font-size: 22px; font-weight: 800; margin-bottom: 12px; }
.footer-brand h3 span { color: var(--accent); }
.footer-brand p { color: var(--text-muted); font-size: 14px; line-height: 1.7; max-width: 260px; margin-bottom: 20px; }
.footer-socials { display: flex; gap: 12px; }
.social-icon {
  width: 38px; height: 38px; border-radius: 8px; border: 1px solid var(--border);
  display: grid; place-items: center; color: var(--text-muted); font-size: 15px;
  transition: all .2s; cursor: pointer;
}
.social-icon:hover { background: var(--accent); color: #000; border-color: var(--accent); }
.footer-col h4 { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 16px; }
.footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.footer-col li a { color: var(--text-muted); font-size: 14px; transition: color .2s; }
.footer-col li a:hover { color: var(--text); }
.footer-bottom { max-width: 1100px; margin: 0 auto; text-align: center; color: var(--text-muted); font-size: 13px; border-top: 1px solid var(--border); padding-top: 28px; }

/* PAGE WRAPPER */
.page { padding-top: 64px; min-height: 100vh; }

/* CONTACT PAGE */
.contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: start; }
.contact-info { display: flex; flex-direction: column; gap: 28px; }
.contact-info-item { display: flex; gap: 16px; align-items: flex-start; }
.contact-info-icon { font-size: 22px; color: var(--accent); width: 28px; flex-shrink: 0; padding-top: 2px; }
.contact-info-item h4 { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
.contact-info-item p { color: var(--text-muted); font-size: 14px; line-height: 1.5; }

/* LOGIN PAGE */
.auth-page { display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }
.auth-visual {
  background: linear-gradient(135deg, rgba(15,23,42,0.7), rgba(30,41,59,0.6)),
              url('https://picsum.photos/seed/luxury-fashion/800/1000') center/cover;
  display: flex; align-items: center; justify-content: center; padding: 60px;
}
.auth-visual-text h2 { font-size: 36px; font-weight: 800; margin-bottom: 12px; }
.auth-visual-text p { color: var(--text-muted); font-size: 16px; line-height: 1.7; }
.auth-form-side { display: flex; align-items: center; justify-content: center; padding: 60px; background: var(--secondary); }
.auth-form-box { width: 100%; max-width: 400px; }
.auth-form-box h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
.auth-form-box p { color: var(--text-muted); margin-bottom: 32px; font-size: 15px; }
.divider { display: flex; align-items: center; gap: 12px; color: var(--text-muted); font-size: 13px; margin: 20px 0; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.btn-google {
  width: 100%; padding: 13px; background: var(--card); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font: inherit; font-size: 15px; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: background .2s;
}
.btn-google:hover { background: var(--border); }`;

const mainJs = `const app = document.getElementById('app');

function nav() {
  return \`<nav>
    <a class="nav-logo" href="#home"><span>Stride</span>Shop</a>
    <div class="nav-links">
      <a href="#home">Home</a>
      <a href="#products"><i class="fa-solid fa-store"></i> Shop</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
      <a href="#cart" class="nav-cart"><i class="fa-solid fa-bag-shopping" style="font-size:18px"></i><span class="cart-badge">3</span></a>
      <button class="nav-cta" onclick="location.hash='login'">Sign In</button>
    </div>
  </nav>\`;
}

function footer() {
  return \`<footer>
    <div class="footer-grid">
      <div class="footer-brand">
        <h3><span>Stride</span>Shop</h3>
        <p>Premium footwear for every stride. Crafted with precision, built for performance and style.</p>
        <div class="footer-socials">
          <div class="social-icon"><i class="fa-brands fa-instagram"></i></div>
          <div class="social-icon"><i class="fa-brands fa-x-twitter"></i></div>
          <div class="social-icon"><i class="fa-brands fa-facebook"></i></div>
          <div class="social-icon"><i class="fa-brands fa-tiktok"></i></div>
        </div>
      </div>
      <div class="footer-col"><h4>Shop</h4><ul>
        <li><a href="#products">All Shoes</a></li><li><a href="#products">Running</a></li>
        <li><a href="#products">Casual</a></li><li><a href="#products">Training</a></li>
      </ul></div>
      <div class="footer-col"><h4>Company</h4><ul>
        <li><a href="#about">About Us</a></li><li><a href="#contact">Contact</a></li>
        <li><a href="#">Careers</a></li><li><a href="#">Press</a></li>
      </ul></div>
      <div class="footer-col"><h4>Support</h4><ul>
        <li><a href="#">FAQ</a></li><li><a href="#">Shipping</a></li>
        <li><a href="#">Returns</a></li><li><a href="#">Size Guide</a></li>
      </ul></div>
    </div>
    <div class="footer-bottom">© 2025 StrideShop. All rights reserved. Made with <i class="fa-solid fa-heart" style="color:var(--accent)"></i> for shoe lovers.</div>
  </footer>\`;
}

function route() {
  const hash = location.hash.replace('#', '') || 'home';
  const renders = {
    home: window.renderHome,
    about: window.renderAbout,
    contact: window.renderContact,
    login: window.renderLogin,
    products: window.renderProducts,
    cart: window.renderCart,
  };
  const fn = renders[hash] || renders.home;
  app.innerHTML = nav() + fn() + footer();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();`;

const homeJs = `window.renderHome = function() {
  return \`<div class="page">
    <div class="hero">
      <div class="hero-inner">
        <div class="hero-tag"><i class="fa-solid fa-bolt"></i> New Collection 2025</div>
        <h1>Run Faster.<br>Look <em>Better.</em><br>Feel Unstoppable.</h1>
        <p>Discover footwear engineered for champions. From track to street, StrideShop delivers premium performance with iconic style.</p>
        <div class="hero-actions">
          <button class="btn-primary" onclick="location.hash='products'">
            <i class="fa-solid fa-bag-shopping"></i> Shop Collection
          </button>
          <button class="btn-outline" onclick="location.hash='about'">Our Story</button>
        </div>
        <div class="hero-stats">
          <div><div class="stat-num">50K+</div><div class="stat-label">Happy Customers</div></div>
          <div><div class="stat-num">200+</div><div class="stat-label">Shoe Styles</div></div>
          <div><div class="stat-num">4.9<i class="fa-solid fa-star" style="font-size:20px;margin-left:2px"></i></div><div class="stat-label">Avg. Rating</div></div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-tag"><i class="fa-solid fa-sparkles"></i> Why StrideShop</div>
      <h2>Built for Performance,<br>Designed for Life</h2>
      <p class="section-sub">Every pair is engineered with premium materials and tested by athletes. Because your feet deserve the best.</p>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon"><i class="fa-solid fa-feather"></i></div>
          <h3>Ultra Lightweight</h3>
          <p>Advanced foam technology that weighs almost nothing, yet absorbs every impact.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fa-solid fa-shield-halved"></i></div>
          <h3>Built to Last</h3>
          <p>Military-grade materials with a 2-year warranty. We stand behind every stitch.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fa-solid fa-truck-fast"></i></div>
          <h3>Free Shipping</h3>
          <p>Free next-day delivery on all orders over $75. Easy 30-day returns.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fa-solid fa-leaf"></i></div>
          <h3>Sustainably Made</h3>
          <p>30% recycled materials in every shoe. Because the planet runs too.</p>
        </div>
      </div>
    </div>
    <div style="background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:80px 40px;text-align:center">
      <div style="max-width:700px;margin:0 auto">
        <p style="color:var(--accent);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px">Limited Time Offer</p>
        <h2 style="font-size:40px;font-weight:900;letter-spacing:-0.03em;margin-bottom:16px">Get 20% Off Your First Order</h2>
        <p style="color:var(--text-muted);font-size:17px;margin-bottom:32px">Sign up for our newsletter and unlock an exclusive discount. No spam, just great deals.</p>
        <div style="display:flex;gap:12px;max-width:420px;margin:0 auto">
          <input placeholder="your@email.com" style="flex:1;padding:13px 16px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font:inherit;font-size:15px" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
          <button class="btn-primary" style="white-space:nowrap">Get 20% Off</button>
        </div>
      </div>
    </div>
  </div>\`;
};`;

const aboutJs = `window.renderAbout = function() {
  return \`<div class="page">
    <div style="background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.9)),url('https://picsum.photos/seed/athlete-training/1600/500') center/cover;padding:120px 40px 80px">
      <div style="max-width:1100px;margin:0 auto">
        <p style="color:var(--accent);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:16px">Our Story</p>
        <h1 style="font-size:clamp(36px,6vw,64px);font-weight:900;letter-spacing:-0.04em;max-width:700px;line-height:1.1">Built by Runners.<br>For Everyone.</h1>
      </div>
    </div>
    <div class="section">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;margin-bottom:80px">
        <div>
          <div class="section-tag">Founded 2018</div>
          <h2>A Passion Project<br>That Became a Movement</h2>
          <p style="color:var(--text-muted);font-size:16px;line-height:1.8;margin-bottom:24px">StrideShop started in a garage in Austin, Texas. Two marathon runners, tired of overpriced shoes that fell apart after 300 miles, decided to build something better.</p>
          <p style="color:var(--text-muted);font-size:16px;line-height:1.8">Today we serve 50,000+ athletes across 40 countries. But we still obsess over every millimeter of cushioning, every thread of material, every gram of weight.</p>
        </div>
        <img src="https://picsum.photos/seed/shoe-design-lab/600/400" style="width:100%;border-radius:16px;object-fit:cover;height:360px">
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-bottom:80px">
        <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:32px;text-align:center">
          <div style="font-size:40px;font-weight:900;color:var(--accent);margin-bottom:8px">50K+</div>
          <div style="color:var(--text-muted);font-size:15px">Athletes worldwide</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:32px;text-align:center">
          <div style="font-size:40px;font-weight:900;color:var(--accent);margin-bottom:8px">40</div>
          <div style="color:var(--text-muted);font-size:15px">Countries served</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:32px;text-align:center">
          <div style="font-size:40px;font-weight:900;color:var(--accent);margin-bottom:8px">200+</div>
          <div style="color:var(--text-muted);font-size:15px">Shoe models</div>
        </div>
      </div>
      <div class="section-tag">Meet the Team</div>
      <h2 style="margin-bottom:48px">The People Behind<br>Every Stride</h2>
      <div class="team-grid">
        <div class="team-card">
          <img src="https://picsum.photos/seed/ceo-portrait/400/300" class="team-photo">
          <div class="team-name">Marcus Reid</div>
          <div class="team-role">Co-founder & CEO</div>
        </div>
        <div class="team-card">
          <img src="https://picsum.photos/seed/cto-tech/400/300" class="team-photo">
          <div class="team-name">Sarah Chen</div>
          <div class="team-role">Co-founder & CTO</div>
        </div>
        <div class="team-card">
          <img src="https://picsum.photos/seed/design-director/400/300" class="team-photo">
          <div class="team-name">James Okafor</div>
          <div class="team-role">Head of Design</div>
        </div>
        <div class="team-card">
          <img src="https://picsum.photos/seed/athlete-ambassador/400/300" class="team-photo">
          <div class="team-name">Priya Nair</div>
          <div class="team-role">Lead Biomechanist</div>
        </div>
      </div>
    </div>
  </div>\`;
};`;

const contactJs = `window.renderContact = function() {
  return \`<div class="page">
    <div class="section">
      <div class="section-tag">Get in Touch</div>
      <h2 style="margin-bottom:16px">We'd Love to<br>Hear From You</h2>
      <p class="section-sub">Questions about sizing? Need help with your order? Our team responds within 2 hours on weekdays.</p>
      <div class="contact-grid">
        <div>
          <h3 style="margin-bottom:28px;font-size:20px;font-weight:700">Send a Message</h3>
          <form onsubmit="event.preventDefault();this.innerHTML='<div style=text-align:center;padding:40px><i class=fa-solid fa-circle-check style=font-size:48px;color:var(--accent);margin-bottom:16px></i><h3>Message Sent!</h3><p style=color:var(--text-muted);margin-top:8px>We will get back to you within 2 hours.</p></div>'">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              <div class="form-group"><label class="form-label">First Name</label><input class="form-input" placeholder="Marcus"></div>
              <div class="form-group"><label class="form-label">Last Name</label><input class="form-input" placeholder="Reid"></div>
            </div>
            <div class="form-group"><label class="form-label">Email Address</label><input type="email" class="form-input" placeholder="you@example.com"></div>
            <div class="form-group"><label class="form-label">Subject</label>
              <select class="form-input"><option>Order Issue</option><option>Return & Exchange</option><option>Product Question</option><option>Partnership</option><option>Other</option></select>
            </div>
            <div class="form-group"><label class="form-label">Message</label><textarea class="form-input" rows="5" placeholder="Tell us how we can help..."></textarea></div>
            <button type="submit" class="btn-primary" style="width:100%;justify-content:center"><i class="fa-solid fa-paper-plane"></i> Send Message</button>
          </form>
        </div>
        <div class="contact-info">
          <div class="contact-info-item">
            <div class="contact-info-icon"><i class="fa-solid fa-location-dot"></i></div>
            <div><h4>Headquarters</h4><p>2847 Barton Springs Rd<br>Austin, TX 78704</p></div>
          </div>
          <div class="contact-info-item">
            <div class="contact-info-icon"><i class="fa-solid fa-envelope"></i></div>
            <div><h4>Email Us</h4><p>support@strideshop.com<br>press@strideshop.com</p></div>
          </div>
          <div class="contact-info-item">
            <div class="contact-info-icon"><i class="fa-solid fa-phone"></i></div>
            <div><h4>Call Us</h4><p>+1 (512) 847-3920<br>Mon–Fri 9AM–6PM CST</p></div>
          </div>
          <div class="contact-info-item">
            <div class="contact-info-icon"><i class="fa-brands fa-instagram"></i></div>
            <div><h4>Social Media</h4><p>@strideshop on Instagram,<br>Twitter, and TikTok</p></div>
          </div>
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px">
            <h4 style="margin-bottom:8px"><i class="fa-solid fa-headset" style="color:var(--accent);margin-right:8px"></i> Live Chat</h4>
            <p style="color:var(--text-muted);font-size:14px;margin-bottom:16px">Available Mon–Fri 9AM–9PM CST. Average response: 4 min.</p>
            <button class="btn-primary" style="width:100%;justify-content:center">Start Live Chat</button>
          </div>
        </div>
      </div>
    </div>
  </div>\`;
};`;

const loginJs = `window.renderLogin = function() {
  return \`<div class="auth-page">
    <div class="auth-visual">
      <div class="auth-visual-text">
        <div style="color:var(--accent);font-size:22px;font-weight:900;margin-bottom:8px"><span>Stride</span>Shop</div>
        <h2>Your next great run<br>starts here.</h2>
        <p>Join 50,000+ athletes who trust StrideShop for their footwear. Exclusive member discounts, early access, and more.</p>
        <div style="display:flex;gap:20px;margin-top:32px">
          <div style="text-align:center"><div style="font-size:24px;font-weight:900;color:var(--accent)">20%</div><div style="font-size:12px;color:var(--text-muted)">Member discount</div></div>
          <div style="text-align:center"><div style="font-size:24px;font-weight:900;color:var(--accent)">Free</div><div style="font-size:12px;color:var(--text-muted)">Shipping always</div></div>
          <div style="text-align:center"><div style="font-size:24px;font-weight:900;color:var(--accent)">VIP</div><div style="font-size:12px;color:var(--text-muted)">Early access</div></div>
        </div>
      </div>
    </div>
    <div class="auth-form-side">
      <div class="auth-form-box">
        <h1>Welcome back</h1>
        <p>Don't have an account? <a href="#" style="color:var(--accent);font-weight:600">Sign up free</a></p>
        <button class="btn-google" onclick="this.textContent='Signing in...'">
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
        <div class="divider">or continue with email</div>
        <form onsubmit="event.preventDefault();location.hash='home'">
          <div class="form-group"><label class="form-label">Email Address</label><input type="email" class="form-input" placeholder="you@example.com" required></div>
          <div class="form-group">
            <label class="form-label" style="display:flex;justify-content:space-between">Password <a href="#" style="font-weight:500;font-size:12px">Forgot?</a></label>
            <input type="password" class="form-input" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn-primary" style="width:100%;justify-content:center;margin-bottom:12px">Sign In <i class="fa-solid fa-arrow-right"></i></button>
        </form>
        <p style="color:var(--text-muted);font-size:12px;text-align:center;margin-top:8px">By continuing, you agree to our Terms of Service and Privacy Policy</p>
      </div>
    </div>
  </div>\`;
};`;

const productsJs = `window.renderProducts = function() {
  const products = [
    { id:1, name:'AirStride Pro X', badge:'Best Seller', price:'$189', img:'running-shoes-red', desc:'Ultra-responsive foam, carbon plate, race-day ready.' },
    { id:2, name:'CloudWalk Casual', badge:'New', price:'$129', img:'white-sneakers', desc:'All-day comfort with a minimalist silhouette.' },
    { id:3, name:'TrailBlazer GTX', badge:'Sale', price:'$159', img:'trail-running', desc:'Waterproof, grippy, built for the toughest terrain.' },
    { id:4, name:'Sprint Elite Carbon', badge:'Limited', price:'$249', img:'carbon-fiber-shoe', desc:'Carbon fiber plate for sub-elite race performance.' },
    { id:5, name:'RecoverSlide X', badge:'New', price:'$79', img:'slide-sandal', desc:'Post-run recovery with orthopaedic support.', },
    { id:6, name:'StrideSport Mid', badge:'', price:'$149', img:'basketball-shoe', desc:'Court-ready ankle support meets street style.' },
  ];
  return \`<div class="page"><div class="section">
    <div class="section-tag"><i class="fa-solid fa-store"></i> Our Collection</div>
    <h2 style="margin-bottom:16px">Find Your Perfect Pair</h2>
    <p class="section-sub">200+ styles engineered for performance and designed to turn heads.</p>
    <div style="display:flex;gap:12px;margin-bottom:40px;flex-wrap:wrap">
      \${['All','Running','Casual','Trail','Carbon','Recovery'].map(c=>\`<button onclick="this.parentElement.querySelectorAll('button').forEach(b=>b.style.background='');this.style.background='var(--accent)';this.style.color='#000'" style="padding:8px 20px;background:var(--card);border:1px solid var(--border);border-radius:999px;color:var(--text);cursor:pointer;font:inherit;font-size:13px;font-weight:600;transition:.2s">\${c}</button>\`).join('')}
    </div>
    <div class="products-grid">
      \${products.map(p=>\`<div class="product-card">
        <img src="https://picsum.photos/seed/\${p.img}/400/250" class="product-img" alt="\${p.name}">
        <div class="product-body">
          \${p.badge?\`<div class="product-badge">\${p.badge}</div>\`:''}
          <div class="product-name">\${p.name}</div>
          <div class="product-desc">\${p.desc}</div>
          <div class="product-footer">
            <div class="product-price">\${p.price}</div>
            <button class="add-to-cart" onclick="this.innerHTML='<i class=fa-solid fa-check></i> Added'"><i class="fa-solid fa-plus"></i> Add</button>
          </div>
        </div>
      </div>\`).join('')}
    </div>
  </div></div>\`;
};`;

const cartJs = `window.renderCart = function() {
  return \`<div class="page"><div class="section">
    <div class="section-tag"><i class="fa-solid fa-bag-shopping"></i> Your Cart</div>
    <h2 style="margin-bottom:40px">Shopping Bag <span style="color:var(--text-muted);font-size:18px;font-weight:500">(3 items)</span></h2>
    <div style="display:grid;grid-template-columns:1fr 360px;gap:40px;align-items:start">
      <div>
        <div class="cart-item">
          <img src="https://picsum.photos/seed/running-shoes-red/160/160" class="cart-item-img">
          <div class="cart-item-info">
            <div class="cart-item-name">AirStride Pro X</div>
            <div style="color:var(--text-muted);font-size:13px;margin-bottom:8px">Size: US 10 · Color: Midnight Black</div>
            <div class="cart-item-price">$189.00</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <select style="background:var(--secondary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--text);font:inherit"><option>Qty: 1</option><option>Qty: 2</option></select>
            <i class="fa-solid fa-xmark cart-item-remove"></i>
          </div>
        </div>
        <div class="cart-item">
          <img src="https://picsum.photos/seed/white-sneakers/160/160" class="cart-item-img">
          <div class="cart-item-info">
            <div class="cart-item-name">CloudWalk Casual</div>
            <div style="color:var(--text-muted);font-size:13px;margin-bottom:8px">Size: US 9 · Color: Cloud White</div>
            <div class="cart-item-price">$129.00</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <select style="background:var(--secondary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--text);font:inherit"><option>Qty: 1</option></select>
            <i class="fa-solid fa-xmark cart-item-remove"></i>
          </div>
        </div>
        <div class="cart-item">
          <img src="https://picsum.photos/seed/trail-running/160/160" class="cart-item-img">
          <div class="cart-item-info">
            <div class="cart-item-name">TrailBlazer GTX</div>
            <div style="color:var(--text-muted);font-size:13px;margin-bottom:8px">Size: US 11 · Color: Forest Green</div>
            <div class="cart-item-price">$159.00</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <select style="background:var(--secondary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--text);font:inherit"><option>Qty: 1</option></select>
            <i class="fa-solid fa-xmark cart-item-remove"></i>
          </div>
        </div>
      </div>
      <div class="cart-total-box">
        <h3 style="margin-bottom:20px;font-size:18px">Order Summary</h3>
        <div class="cart-total-row"><span>Subtotal (3 items)</span><span>$477.00</span></div>
        <div class="cart-total-row"><span>Shipping</span><span style="color:var(--accent)">FREE</span></div>
        <div class="cart-total-row"><span>Tax (8.25%)</span><span>$39.35</span></div>
        <div class="cart-total-row total"><span>Total</span><span>$516.35</span></div>
        <button class="btn-primary" onclick="location.hash='login'" style="width:100%;justify-content:center;margin-top:20px">
          <i class="fa-solid fa-lock"></i> Secure Checkout
        </button>
        <button class="btn-outline" onclick="location.hash='products'" style="width:100%;justify-content:center;margin-top:12px">
          Continue Shopping
        </button>
        <div style="display:flex;justify-content:center;gap:12px;margin-top:16px">
          <i class="fa-brands fa-cc-visa" style="font-size:24px;color:var(--text-muted)"></i>
          <i class="fa-brands fa-cc-mastercard" style="font-size:24px;color:var(--text-muted)"></i>
          <i class="fa-brands fa-paypal" style="font-size:24px;color:var(--text-muted)"></i>
          <i class="fa-brands fa-apple-pay" style="font-size:24px;color:var(--text-muted)"></i>
        </div>
      </div>
    </div>
  </div></div>\`;
};`;

// ── Build fixture ──────────────────────────────────────────────────────────

const filesPayload = JSON.stringify({
  files: [
    { path: "index.html", content: indexHtml },
    { path: "style.css", content: styleCss },
    { path: "main.js", content: mainJs },
    { path: "screens/home.js", content: homeJs },
    { path: "screens/about.js", content: aboutJs },
    { path: "screens/contact.js", content: contactJs },
    { path: "screens/login.js", content: loginJs },
    { path: "screens/products.js", content: productsJs },
    { path: "screens/cart.js", content: cartJs },
  ],
});

// Generic fallback edit response
const editPayload = JSON.stringify({ content: "/* edited by Anna AI mock */" });

const fixtures = [
  // Any /vibe prompt → ecommerce website
  {
    ns: "agent",
    method: "complete",
    result: {
      role: "assistant",
      content: { type: "text", text: filesPayload },
      model: "mock-model",
      stopReason: "endTurn",
    },
  },
];

const outPath = path.join(root, "fixtures", "vibe.jsonl");
writeFileSync(outPath, fixtures.map((f) => JSON.stringify(f)).join("\n") + "\n", "utf8");
console.log(`✓ Wrote ${outPath}`);
console.log(`  Fixture contains ${fixtures.length} response(s).`);
console.log(`\nRun the app with:\n  anna-app dev --mock-llm fixtures/vibe.jsonl`);
