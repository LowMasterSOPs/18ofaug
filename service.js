// service.js — /services/<slug> page
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = "https://ketluxsokzvlqozcdwxo.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldGx1eHNva3p2bHFvemNkd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAzOTIsImV4cCI6MjA3MDkzNjM5Mn0.NCPCOXJ4vD1PYb_sBgoyA6lSvkiRpb8IlA4X8XnltUs"
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function include(file, target){
  try{ const res = await fetch(file); const html = await res.text(); const el = document.getElementById(target); if(el) el.innerHTML = html; }
  catch(e){ console.error('Include failed:', e) }
}
include('/header.html','header')
include('/footer.html','footer')

function getSlug(){
  const path = location.pathname.replace(/\/+$/,'')
  const m = path.match(/\/services\/(.+)$/)
  return m ? decodeURIComponent(m[1]) : ""
}
function escapeHtml(str=""){ return String(str)
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#039;") }

async function fetchService(slug){
  return supabase.from("services").select("*").eq("slug", slug).single()
}

async function render(){
  const host = document.getElementById("service")
  const slug = getSlug()
  if (!slug){ host.innerHTML = "<p>No service specified.</p>"; return }

  const { data:s, error } = await fetchService(slug)
  if (error || !s){ console.error(error); host.innerHTML = "<p>Service not found.</p>"; return }

  // SEO bits
  document.title = `${s.name} | Signs2Signs`
  const meta = document.querySelector('meta[name="description"]')
  if (meta) meta.setAttribute("content", s.short_desc || s.name || "")

  const features = Array.isArray(s.features) && s.features.length
    ? `<ul class="features">${s.features.map(f=>`<li>${escapeHtml(f)}</li>`).join("")}</ul>`
    : ""

  host.innerHTML = `
    <div class="hero">${s.hero_image_url ? `<img src="${s.hero_image_url}" alt="${escapeHtml(s.name)}">` : ""}</div>
    <h1>${escapeHtml(s.name)}</h1>
    <p class="lede">${escapeHtml(s.short_desc || "")}</p>
        <p class="lede">${escapeHtml(s.long_desc || "")}</p>
    <div class="body">
      ${s.long_desc || "<p>More details coming soon.</p>"}
      ${features}
    </div>
    <p><a href="/services">← Back to all services</a></p>
  `
}

render()
