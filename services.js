// services.js — list services + tiles from Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = "https://ketluxsokzvlqozcdwxo.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldGx1eHNva3p2bHFvemNkd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAzOTIsImV4cCI6MjA3MDkzNjM5Mn0.NCPCOXJ4vD1PYb_sBgoyA6lSvkiRpb8IlA4X8XnltUs"
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const iconsEl = document.getElementById("svc-icons")
const cardsEl = document.getElementById("svc-cards")

const linkFor = s => `/services/${encodeURIComponent(s.slug)}`

function escapeHtml(str=""){ return String(str)
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#039;") }

async function fetchServices(){
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true })
  return { data, error }
}

function renderTiles(services){
  iconsEl.innerHTML = ""
  for (const s of services){
    const a = document.createElement("a")
    a.className = "svc-tile"
    a.href = linkFor(s)
    const icon = s.icon_svg
      ? `<div class="ic" aria-hidden="true">${s.icon_svg}</div>`
      : `<div class="ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg></div>`
    a.innerHTML = `${icon}<strong>${escapeHtml(s.name)}</strong>`
    a.setAttribute("role","listitem")
    a.setAttribute("aria-label", s.name)
    iconsEl.appendChild(a)
  }
}

function renderCards(services){
  cardsEl.innerHTML = ""
  for (const s of services){
    const wrap = document.createElement("article")
    wrap.className = "service-detail-card"

    const img = document.createElement("div")
    img.className = "service-detail-image"
    img.innerHTML = s.thumb_url ? `<img src="${s.thumb_url}" alt="${escapeHtml(s.name)}">` : ""

    const content = document.createElement("div")
    content.className = "service-detail-content"
    const features = Array.isArray(s.features) && s.features.length
      ? `<ul class="service-features">${s.features.map(f=>`<li>${escapeHtml(f)}</li>`).join("")}</ul>`
      : ""

content.innerHTML = `
  <h3>${escapeHtml(s.name)}</h3>
  <p>${escapeHtml(s.short_desc || "")}</p>
  <div class="long-desc">${s.long_desc || ""}</div>
  ${features}
  <a class="learn" href="${linkFor(s)}">Learn more →</a>
    `

    wrap.appendChild(img)
    wrap.appendChild(content)
    cardsEl.appendChild(wrap)
  }
}

async function render(){
  iconsEl.textContent = "Loading…"
  cardsEl.textContent = "Loading…"
  const { data: services, error } = await fetchServices()
  if (error){ console.error(error); iconsEl.textContent="Error loading services."; cardsEl.textContent=""; return }
  if (!services || services.length === 0){
    iconsEl.innerHTML = `<div class="svc-tile">No services yet.</div>`
    cardsEl.innerHTML = `<p class="muted">Nothing here (yet). Add rows to the “services” table.</p>`
    return
  }
  renderTiles(services)
  renderCards(services)
}

render()
