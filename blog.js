// blog.js — featured + archive + pretty URLs (/blog/<slug>)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = "https://ketluxsokzvlqozcdwxo.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldGx1eHNva3p2bHFvemNkd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAzOTIsImV4cCI6MjA3MDkzNjM5Mn0.NCPCOXJ4vD1PYb_sBgoyA6lSvkiRpb8IlA4X8XnltUs"
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/* data */
async function fetchFeaturedPost() {
  const { data, error } = await supabase
    .from("posts")
    .select("id,slug,title,description,main_image_url,published_at,created_at,featured")
    .eq("featured", true)
    .order("published_at", { ascending:false, nullsFirst:false })
    .order("created_at", { ascending:false, nullsFirst:false })
    .limit(1)
  return { data: data?.[0] ?? null, error }
}
async function fetchAllPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("id,slug,title,description,main_image_url,published_at,created_at,featured")
    .order("published_at", { ascending:false, nullsFirst:false })
    .order("created_at", { ascending:false, nullsFirst:false })
    .order("id", { ascending:false })
  return { data, error }
}

/* includes */
async function includePartials({ headerSel="#header", footerSel="#footer" }={}) {
  try {
    const [header, footer] = await Promise.all([
      fetch("/header.html").then(r=>r.ok?r.text():""),
      fetch("/footer.html").then(r=>r.ok?r.text():"")
    ])
    const h = document.querySelector(headerSel), f = document.querySelector(footerSel)
    if (h) h.innerHTML = header
    if (f) f.innerHTML = footer
  } catch (e) { console.error(e) }
}

/* render */
const postsEl    = document.getElementById("posts")
const archiveEl  = document.getElementById("archive")
const featuredEl = document.getElementById("featured")

const linkFor = p => `/blog/${encodeURIComponent(p.slug || String(p.id))}`

function groupByYearMonth(posts){
  const buckets = new Map()
  for(const p of posts){
    const d = p.published_at || p.created_at || null
    const dt = d ? new Date(d) : null
    const year = dt ? dt.getFullYear() : "Unknown"
    const month = dt ? dt.toLocaleString("en-GB",{ month:"long" }) : "Unsorted"
    if(!buckets.has(year)) buckets.set(year,new Map())
    const m = buckets.get(year)
    if(!m.has(month)) m.set(month,[])
    m.get(month).push(p)
  }
  return new Map([...buckets.entries()].sort((a,b)=>(b[0]+"").localeCompare(a[0]+"")))
}
function buildArchive(posts){
  const grouped = groupByYearMonth(posts)
  archiveEl.innerHTML = ""
  for(const [year, months] of grouped){
    const det = document.createElement("details"); det.open = true
    const sum = document.createElement("summary"); sum.textContent = year; det.appendChild(sum)

    const monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"]
    const ordered = monthNames.filter(m=>months.has(m))
    if(months.has("Unsorted")) ordered.push("Unsorted")

    for(const m of ordered){
      const wrap = document.createElement("div"); wrap.className="month"
      const h4=document.createElement("h4"); h4.textContent=m; wrap.appendChild(h4)
      const ul=document.createElement("ul"); ul.className="archive-list"
      for(const p of months.get(m)){
        const li=document.createElement("li")
        const a=document.createElement("a"); a.href=linkFor(p); a.textContent=p.title||"Untitled"
        li.appendChild(a); ul.appendChild(li)
      }
      wrap.appendChild(ul); det.appendChild(wrap)
    }
    archiveEl.appendChild(det)
  }
}

async function render(){
  postsEl.textContent = "Loading…"
  const [{data:featured},{data:all,error}] = await Promise.all([fetchFeaturedPost(), fetchAllPosts()])
  if (error){ postsEl.textContent="Error loading posts."; return }
  if (!all || all.length===0){
    postsEl.innerHTML=`<p class="empty">No posts yet.</p>`
    archiveEl.innerHTML=`<p class="empty">Nothing to archive… yet.</p>`
    featuredEl.innerHTML=""
    return
  }

  const hero = featured || all[0]
  featuredEl.innerHTML = `
    ${hero.main_image_url ? `<img src="${hero.main_image_url}" alt="">` : ""}
    <div class="featured-content">
      <h2>${hero.title ?? "Untitled"}</h2>
      <p>${hero.description ?? ""}</p>
      <a href="${linkFor(hero)}">Read full post →</a>
    </div>
  `

  buildArchive(all)

  const heroKey = hero.slug ?? hero.id
  const rest = all.filter(p => (p.slug ?? p.id) !== heroKey)
  postsEl.innerHTML = ""
  for(const p of rest){
    const a=document.createElement("a")
    a.className="card"
    a.href=linkFor(p)
    a.innerHTML=`
      ${p.main_image_url ? `<img class="thumb" src="${p.main_image_url}" alt="">` : ""}
      <div class="title">${p.title ?? "Untitled"}</div>
      ${p.description ? `<p class="desc">${p.description}</p>` : ""}
    `
    postsEl.appendChild(a)
  }
}

includePartials()
render()
