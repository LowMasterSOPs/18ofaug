// blog.js — Featured + Archive + Single Post Router for /blog and /blog/<slug>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ketluxsokzvlqozcdwxo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldGx1eHNva3p2bHFvemNkd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAzOTIsImV4cCI6MjA3MDkzNjM5Mn0.NCPCOXJ4vD1PYb_sBgoyA6lSvkiRpb8IlA4X8XnltUs";
// NOTE: public anon key; keep RLS enabled on your tables.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- Utilities ---------- */
const $ = (sel) => document.querySelector(sel);
const postsEl    = $("#posts");
const archiveEl  = $("#archive");
const featuredEl = $("#featured");
const singleEl   = $("#single"); // optional container for single-post pages

// Link helper (use slug if present)
const linkFor = (p) => `/blog/${encodeURIComponent(p.slug || String(p.id))}`;

// Nice date formatting
const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
};

// Treat various values as "featured"
const isFeatured = (v) =>
  v === true || v === 1 || v === "1" || (typeof v === "string" && v.toLowerCase() === "true");

// Helper to surface errors
function showError(target, msg, err) {
  console.error(msg, err);
  if (target) {
    target.innerHTML = `<p class="empty">${msg}</p>`;
  }
}

/* ---------- Data ---------- */
async function fetchAllPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("id,slug,title,description,content,main_image_url,published_at,created_at,featured")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });
  return { data, error };
}

async function fetchPostBySlugOrId(key) {
  if (!key) return { data: null, error: new Error("No slug/id supplied") };

  // Try slug
  let { data, error } = await supabase
    .from("posts")
    .select("id,slug,title,content,description,main_image_url,published_at,created_at")
    .eq("slug", key)
    .limit(1);

  if (error) return { data: null, error };
  if (data && data.length) return { data: data[0], error: null };

  // Fallback: numeric id
  if (/^\d+$/.test(key)) {
    return await supabase
      .from("posts")
      .select("id,slug,title,content,description,main_image_url,published_at,created_at")
      .eq("id", Number(key))
      .single();
  }
  return { data: null, error: new Error("Post not found") };
}

/* ---------- Includes (header/footer) ---------- */
async function includePartials({ headerSel = "#header", footerSel = "#footer" } = {}) {
  try {
    const [header, footer] = await Promise.all([
      fetch("/header.html").then(r => (r.ok ? r.text() : "")),
      fetch("/footer.html").then(r => (r.ok ? r.text() : "")),
    ]);
    const h = document.querySelector(headerSel);
    const f = document.querySelector(footerSel);
    if (h) h.innerHTML = header;
    if (f) f.innerHTML = footer;
  } catch (e) {
    console.error("includePartials failed:", e);
  }
}

/* ---------- Archive builder ---------- */
function groupByYearMonth(posts) {
  const buckets = new Map();
  for (const p of posts) {
    const d = p.published_at || p.created_at || null;
    const dt = d ? new Date(d) : null;
    const year = dt ? dt.getFullYear() : "Unknown";
    const month = dt ? dt.toLocaleString("en-GB", { month: "long" }) : "Unsorted";
    if (!buckets.has(year)) buckets.set(year, new Map());
    const m = buckets.get(year);
    if (!m.has(month)) m.set(month, []);
    m.get(month).push(p);
  }
  const sortedYears = [...buckets.entries()].sort((a, b) => {
    const [ya, yb] = [a[0], b[0]];
    if (ya === "Unknown") return 1;
    if (yb === "Unknown") return -1;
    return Number(yb) - Number(ya);
  });
  return new Map(sortedYears);
}

function buildArchive(posts) {
  if (!archiveEl) return;
  const grouped = groupByYearMonth(posts);
  archiveEl.innerHTML = "";
  for (const [year, months] of grouped) {
    const det = document.createElement("details"); det.open = true;
    const sum = document.createElement("summary"); sum.textContent = year; det.appendChild(sum);

    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const ordered = monthNames.filter(m => months.has(m));
    if (months.has("Unsorted")) ordered.push("Unsorted");

    for (const m of ordered) {
      const wrap = document.createElement("div"); wrap.className = "month";
      const h4 = document.createElement("h4"); h4.textContent = m; wrap.appendChild(h4);
      const ul = document.createElement("ul"); ul.className = "archive-list";
      for (const p of months.get(m)) {
        const li = document.createElement("li");
        const a = document.createElement("a"); a.href = linkFor(p); a.textContent = p.title || "Untitled";
        li.appendChild(a); ul.appendChild(li);
      }
      wrap.appendChild(ul); det.appendChild(wrap);
    }
    archiveEl.appendChild(det);
  }
}

/* ---------- Renderers ---------- */
async function renderListPage() {
  if (postsEl) postsEl.textContent = "Loading…";

  const { data: all, error } = await fetchAllPosts();
  if (error) return showError(postsEl, "Error loading posts.", error);

  if (!all || all.length === 0) {
    if (postsEl) postsEl.innerHTML = `<p class="empty">No posts yet.</p>`;
    if (archiveEl) archiveEl.innerHTML = `<p class="empty">Nothing to archive… yet.</p>`;
    if (featuredEl) featuredEl.innerHTML = "";
    return;
  }

  // Hero: prefer first "featured" (true / "TRUE" / 1), else latest
  const hero = all.find(p => isFeatured(p.featured)) || all[0];

  if (featuredEl) {
    featuredEl.innerHTML = `
      ${hero.main_image_url ? `<img src="${hero.main_image_url}" alt="">` : ""}
      <div class="featured-content">
        <h2>${hero.title ?? "Untitled"}</h2>
        ${hero.description ? `<p>${hero.description}</p>` : ""}
        <a href="${linkFor(hero)}">Read full post →</a>
      </div>
    `;
  }

  buildArchive(all);

  // Exclude hero from grid
  const heroKey = hero.slug ?? hero.id;
  const rest = all.filter(p => (p.slug ?? p.id) !== heroKey);

  if (postsEl) postsEl.innerHTML = "";
  for (const p of rest) {
    const a = document.createElement("a");
    a.className = "card";
    a.href = linkFor(p);
    a.innerHTML = `
      ${p.main_image_url ? `<img class="thumb" src="${p.main_image_url}" alt="">` : ""}
      <div class="title">${p.title ?? "Untitled"}</div>
      ${p.description ? `<p class="desc">${p.description}</p>` : ""}
    `;
    postsEl.appendChild(a);
  }
}

async function renderSinglePage(key) {
  const target = singleEl || postsEl;
  if (featuredEl) featuredEl.innerHTML = "";
  if (archiveEl) archiveEl.innerHTML = "";
  if (target) target.textContent = "Loading…";

  const { data: post, error } = await fetchPostBySlugOrId(key);
  if (error || !post) return showError(target, "Post not found.", error);

  const dateStr = fmtDate(post.published_at || post.created_at);
  const heroImg = post.main_image_url ? `<img class="post-hero" src="${post.main_image_url}" alt="">` : "";

  if (target) {
    target.innerHTML = `
      <article class="post">
        ${heroImg}
        <header class="post-header">
          <h1>${post.title ?? "Untitled"}</h1>
          ${dateStr ? `<p class="post-meta">${dateStr}</p>` : ""}
        </header>
        ${post.description ? `<p class="post-desc">${post.description}</p>` : ""}
        <div class="post-body">${post.content ?? ""}</div>
        <p class="back-link"><a href="/blog">← Back to all posts</a></p>
      </article>
    `;
  }
}

/* ---------- Router ---------- */
function getBlogKeyFromPath() {
  const path = window.location.pathname;
  if (path === "/blog" || path === "/blog/") return null;
  if (path.endsWith("/blog.html")) return null;
  const m = path.match(/^\/blog\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function router() {
  await includePartials();
  const key = getBlogKeyFromPath();
  if (key) {
    await renderSinglePage(key);
  } else {
    await renderListPage();
  }
}

// Boot
router();
