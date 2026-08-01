// Build stamp. Bumped with the ?v= in index.html on every change to this file.
//
// Self-healing cache check. GitHub Pages serves this console with max-age=600 and the
// page is usually left open on a phone, so a shipped fix could sit invisible behind a
// stale copy while the deploy looked perfectly healthy from curl — which is exactly what
// happened with the "On trial" segment. version.json is fetched with cache:'no-store',
// so it is always the truth; if the running build doesn't match it, reload once.
//
// Reloads at most once per tab (sessionStorage guard) — a mismatch that survives the
// reload means the HTML itself is cached, and looping on it would spin forever.
const BUILD = '20260801j';
(async () => {
  try {
    // Guard on the build we are RUNNING, not the one we are moving to. Storing the
    // target meant the comparison could never match on the next load — so in the one
    // case this exists for (index.html itself cached, still requesting the old script)
    // it reloaded on every single page load, forever.
    if (sessionStorage.getItem('qwotaStaleReloadFrom') === BUILD) return;
    const r = await fetch('version.json', { cache: 'no-store' });
    if (!r.ok) return;
    const { build } = await r.json();
    if (build && build !== BUILD) {
      sessionStorage.setItem('qwotaStaleReloadFrom', BUILD);
      location.replace(location.pathname + '?v=' + encodeURIComponent(build));
    }
  } catch { /* offline or blocked — never block the console on a freshness check */ }
})();

// Qwota Admin Console
const firebaseConfig = {
  apiKey: "AIzaSyCG01Gi5u4IA5nvbLYaQjbX5bO3zy2pJ1E",
  authDomain: "qwota-ai-coach.firebaseapp.com",
  projectId: "qwota-ai-coach",
  storageBucket: "qwota-ai-coach.firebasestorage.app",
  messagingSenderId: "7410395296",
  appId: "1:7410395296:web:d48e66a6005fbff16081c5"
};
const ADMIN_UID = "DEPKKHJMilcoJmSnKxb3UxFc5Is2";
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const fns = firebase.functions();
const call = (name) => fns.httpsCallable(name);

// Escape all interpolated data (stored-XSS safe).
function esc(v){ if(v==null) return ''; return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
// Numeric fields are NOT trustworthy just because they're "supposed to be" numbers:
// userData is a client-supplied sync payload, so a hostile client could park markup in
// totalWorkouts/daysOnPlan and land it in this console's innerHTML. Coerce, never interpolate raw.
function num(v, fallback){ const n = Number(v); return Number.isFinite(n) ? n : (fallback===undefined ? 0 : fallback); }

let DATA = null, TAB = 'cockpit';
// App Store figures come from Apple, not Firestore, so they load separately and the
// cockpit paints without waiting on them.
let APPSTORE = null, APPSTORE_STATE = 'idle';
let STALE = false;              // DATA is a last-good snapshot, not a fresh read
let INCLUDE_INTERNAL = false;   // exclude internal/test accounts by default
let USERS = null;               // cached adminUsers list
let USERS_HIDDEN = 0;           // internal accounts the server filtered out of that list
let USERS_NONREAL = 0, USERS_REASONS = {}; // auto-classified non-people
let USER_VIEW = { uid: null, q: '', seg: 'look', limit: 25, showDormant: false };
const $ = (id) => document.getElementById(id);

// ---------- helpers ----------
function toast(msg, isErr){ const t=$('toast'); t.textContent=msg; t.className='toast'+(isErr?' err':''); t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true, 3200); }
function ago(iso){
  if(!iso) return '—';
  const t=new Date(iso).getTime(); if(!Number.isFinite(t)) return '—';
  const s=Math.floor((Date.now()-t)/1000);
  if(s<0){ // future timestamp (trial expiry, scheduled event) — "-5s ago" is nonsense
    const f=-s; if(f<60)return 'in '+f+'s'; if(f<3600)return 'in '+Math.floor(f/60)+'m'; if(f<86400)return 'in '+Math.floor(f/3600)+'h'; return 'in '+Math.floor(f/86400)+'d';
  }
  if(s<60)return s+'s ago'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago';
}
function money(n){ return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

// ---------- data ----------
async function load(){
  $('main').innerHTML = '<div class="loading">Loading console…</div>';
  USERS = null;   // internal-toggle may have changed; refetch on demand
  PENDING = null; // the reconcile queue is live data — Refresh must actually refresh it
  AUDIT = null; CONFIG = null; // an action you just took must show up
  try{
    const res = await call('adminConsole')({ includeInternal: INCLUDE_INTERNAL });
    DATA = res.data;
    STALE = false;
    $('updated').textContent = 'updated just now';
    const ok = DATA.reconcile.ok;
    // Only crit/warn count toward "needs you". An "info" item is, by its own severity,
    // something that does NOT need you — counting it inflated the badge and trained the
    // reader to ignore a number whose whole job is to be believed. Info items still
    // render in the triage list below; they just don't demand attention.
    const att = (DATA.needsAttention||[]).filter(n=>n.severity==='crit'||n.severity==='warn').length;
    $('status').className = 'status'+(ok?'':' bad')+(att?' has-alerts':'');
    $('status-text').textContent = !ok ? 'Reconcile invariant failed'
      : att ? att+' need'+(att===1?'s':'')+' you' : 'All systems normal';
    // Badge the tab so triage is visible from any screen, including the bottom bar.
    const nb = document.querySelector('.nav-item[data-tab="cockpit"]');
    if(nb) nb.innerHTML = 'Cockpit'+(att?`<span class="nbadge">${att}</span>`:'');
    render();
  }catch(e){
    // DATA deliberately keeps the last good snapshot — wiping the dashboard on a transient
    // failure is worse than showing it. But it must never masquerade as fresh: label it
    // stale, and let render()'s null-guard cover the never-loaded-at-all case.
    STALE = !!DATA;
    $('updated').textContent = STALE ? 'stale — last refresh failed' : 'no data';
    $('status').className = 'status bad';
    $('status-text').textContent = 'Refresh failed';
    $('main').innerHTML = '<div class="loading cr">Failed to load: '+esc(e.message)+(STALE?' <span class="d">— showing the last good snapshot on other tabs.</span>':'')+'</div>';
  }
}

// ---------- render ----------
function render(){
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.tab===TAB));
  const m = $('main');
  // Every tab except Users reads DATA. After a failed load it's null, and switching tabs
  // used to throw mid-render, leaving the nav highlighted on a tab that never drew.
  if(!DATA && TAB!=='users'){
    m.innerHTML = '<div class="loading cr">No console data — the last load failed. Hit ↻ to retry.</div>';
    return;
  }
  // Numbers from a snapshot that failed to refresh must say so, not read as live.
  const banner = (DATA && STALE) ? '<div class="card" style="border-color:rgba(245,166,35,.45);margin-bottom:16px"><div class="qsub"><b style="color:var(--warn)">Stale snapshot</b> — the last refresh failed, these numbers are from the previous successful load. Hit ↻ to retry.</div></div>' : '';
  if(TAB==='cockpit'){ m.innerHTML = banner + renderCockpit(); wire(); loadAppStore(); }
  else if(TAB==='money'){ m.innerHTML = banner + renderMoney(); wire(); }
  else if(TAB==='health'){ m.innerHTML = banner + renderHealth(); wire(); loadHealthExtras(); }
  else if(TAB==='users'){ renderUsersTab(); }
}

// ---------- trend helpers ----------
// History is the nightly metrics/{date} series. Absent (or too short) on a fresh
// install, so every consumer degrades to "no trend" rather than drawing a lie.
function series(key){
  const h = (DATA && Array.isArray(DATA.history)) ? DATA.history : [];
  return h.map(d=>Number(d[key])).filter(v=>Number.isFinite(v));
}
function sparkline(vals, color){
  if(vals.length<2) return '';
  const w=100,h=22,mx=Math.max(...vals),mn=Math.min(...vals),rg=(mx-mn)||1;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*w},${(h-2)-((v-mn)/rg)*(h-4)}`);
  const last=pts[pts.length-1].split(',');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.6"
      stroke-linejoin="round" stroke-linecap="round" opacity=".85" vector-effect="non-scaling-stroke"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="2" fill="${color}"/></svg>`;
}
// Delta over the retained window. Returns null when there's nothing to compare to.
function delta(key, fmt){
  const v=series(key);
  if(v.length<2) return null;
  const diff=v[v.length-1]-v[0];
  const cls = diff>0?'up':diff<0?'dn':'flat';
  const sign = diff>0?'▲ ':diff<0?'▼ ':'';
  const txt = diff===0 ? '— flat over '+v.length+'d' : sign+(fmt?fmt(Math.abs(diff)):Math.abs(diff))+' in '+v.length+'d';
  return { cls, txt };
}
function pcard(label, value, key, color, provKey, fmt){
  const d=delta(key, fmt);
  const sub = d ? `<div class="pd ${d.cls}">${esc(d.txt)}</div>`
                : `<div class="pd flat">no history yet</div>`;
  return `<button class="pcard" data-prov="${esc(provKey)}">
    <div class="pl">${esc(label)}</div><div class="pn">${value}</div>${sub}
    ${sparkline(series(key), color)}</button>`;
}

// ---------- chart primitives ----------
// Colours are validated categorical steps (see admin.css). Direct labels always
// accompany them, so a segment is never identified by colour alone.
const CAT = ['var(--c1)','var(--c2)','var(--c3)','var(--c0)'];

/** Composition of a whole, as one segmented bar + a labelled legend. */
function segbar(parts){
  const rows = parts.filter(p=>num(p.v) > 0);
  const total = rows.reduce((t,p)=>t+num(p.v),0);
  if(!total) return '<div class="chart-empty">Nothing to show yet.</div>';
  return `<div class="segbar">${rows.map(p=>{
      const pct = (num(p.v)/total)*100;
      return `<span style="flex:${num(p.v)};background:${p.c}" data-tip="${esc(p.k)}|${num(p.v)} · ${pct.toFixed(0)}% of ${total}"></span>`;
    }).join('')}</div>
    <div class="seglegend">${rows.map(p=>`<span class="li"><span class="sw" style="background:${p.c}"></span>
      ${esc(p.k)} <b>${num(p.v)}</b></span>`).join('')}</div>`;
}

/** Ranked magnitudes. `seq` uses one hue light→dark for ordered bands. */
function hbars(rows, opts){
  const list = rows.filter(r=>r.v!=null);
  if(!list.length) return `<div class="chart-empty">${esc((opts&&opts.empty)||'No data yet.')}</div>`;
  const max = Math.max(...list.map(r=>num(r.v)), 1);
  const seq = ['var(--seq1)','var(--seq2)','var(--seq3)','var(--seq4)'];
  return `<div class="hbars">${list.map((r,i)=>{
    const colour = r.c || (opts&&opts.seq ? seq[Math.min(seq.length-1, Math.floor((num(r.v)/max)*(seq.length-1)))] : CAT[i%CAT.length]);
    return `<div class="hbar" data-tip="${esc(r.k)}|${esc(r.label||String(num(r.v)))}">
      <span class="hl">${esc(r.k)}</span>
      <span class="ht">${num(r.v)>0?`<span class="hf" style="width:${Math.max((num(r.v)/max)*100,2)}%;background:${colour}"></span>`:''}</span>
      <span class="hv">${esc(r.label||String(num(r.v)))}</span></div>`;
  }).join('')}</div>`;
}

// One shared tooltip for every chart mark.
function wireCharts(){
  let tip=$('charttip');
  if(!tip){ tip=document.createElement('div'); tip.id='charttip'; document.body.appendChild(tip); }
  const show=(e)=>{
    const el=e.currentTarget, raw=el.dataset.tip||''; const [k,v]=raw.split('|');
    tip.innerHTML=`<div class="tk">${esc(k)}</div><div>${esc(v||'')}</div>`;
    tip.style.display='block';
    const r=el.getBoundingClientRect();
    const x=Math.min(Math.max(8,r.left+r.width/2-tip.offsetWidth/2), innerWidth-tip.offsetWidth-8);
    const top=r.top-tip.offsetHeight-8;
    tip.style.left=x+'px';
    tip.style.top=(top<8 ? r.bottom+8 : top)+'px';
  };
  const hide=()=>{ tip.style.display='none'; };
  document.querySelectorAll('[data-tip]').forEach(el=>{
    el.onmouseenter=show; el.onmouseleave=hide; el.onblur=hide;
    el.onclick=(e)=>{ show(e); setTimeout(hide,2200); };  // touch devices get a tap-to-reveal
  });
}

function renderCockpit(){
  const d=DATA, u=d.users, ns=d.northStar, mo=d.money;
  const activationPct = u.registered>0 ? Math.round((ns.activatedUsers/u.registered)*100) : 0;
  const att = d.needsAttention||[];

  // Triage leads. Numbers are reference; alerts are the reason you opened this.
  // Actionable first, FYIs after — the order you'd want to read them in.
  const rank = {crit:0, warn:1, info:2};
  const ordered = [...att].map((n,i)=>({n,i})).sort((a,b)=>(rank[a.n.severity]??1)-(rank[b.n.severity]??1));
  const triage = ordered.length ? ordered.map(({n,i})=>{
    const sev = esc(n.severity||'warn');
    return `<div class="tri" data-tri="${i}">
      <button class="tri-h"><span class="sevbar ${sev}"></span>
        <span class="tri-t">${esc(n.title)}</span><span class="tri-c">›</span></button>
      <div class="tri-b">
        <p class="tri-d">${esc(n.detail)}</p>
        <div class="acts" data-alertacts="${i}">${alertActions(n)}</div>
        <div class="tri-result" data-res="${i}"></div>
      </div></div>`;
  }).join('') : `<div class="card"><div class="qsub ok">Nothing needs you right now.</div></div>`;

  const dg=d.digest;
  return `
  ${dg?`<div class="card" style="margin-bottom:16px">
    <div class="qlabel"><span class="tick" style="background:var(--teal)"></span>Since ${esc(dg.comparedTo||'the last snapshot')}</div>
    <div class="big sm" style="margin:8px 0 4px">${esc(dg.headline||'')}</div>
    <div class="qsub d">${esc((dg.lines||[]).join(' · '))}</div>
  </div>`:''}
  <div class="section-t">Needs you${att.length?` · ${att.length}`:''}</div>
  ${triage}

  <div class="section-t">Pulse</div>
  <div class="pulsegrid">
    ${pcard('Users', num(u.registered), 'registered', 'var(--teal)', 'users')}
    ${pcard('Activation', activationPct+'%', 'activationPct', activationPct<25?'var(--crit)':'var(--teal)', 'activation')}
    ${pcard('MRR', money(mo.mrrEstimate), 'mrr', 'var(--teal)', 'mrr', v=>'$'+v.toFixed(2))}
  </div>
  <div class="qsub d" style="margin-top:8px">${num(u.guests)} guests · ${num(u.appUsers)} app users${u.internalExcluded?` · ${num(u.internalExcluded)} internal hidden`:''}${num(u.nonUserHidden)?` · ${num(u.nonUserHidden)} not people`:''} · DAU ${num(d.active.dau)} · WAU ${num(d.active.wau)}</div>

  <div class="section-t">Activation funnel</div>
  ${d.coverage?`<div class="card" style="margin-bottom:10px;border-color:rgba(74,158,255,.3)">
    <div class="qsub"><b style="color:var(--info)">What these numbers can see:</b>
    ${num(d.coverage.engagementReporting)} of ${num(u.appUsers)} accounts report workout activity.
    ${num(d.coverage.engagementUnknown)} haven't yet — workout counts only reach the server via the
    heartbeat, and the full profile sync is gated on AI Coach access, so
    <span class="mono">userData</span>-derived figures describe entitled accounts only
    (${num(d.coverage.fullSyncUsers)} synced, ${num(d.coverage.coachedUsers)} with an AI plan).</div>
  </div>`:''}
  <div class="card"><div class="funnel">
    ${d.funnel.map(f=>`<div class="fstage"><span class="nm">${esc(f.stage)}</span>
      <div class="ftrack"><div class="ffill${f.worst?' worst':''}" style="width:${Math.max(num(f.pct),2)}%"></div></div>
      <span class="v"><b>${num(f.count)}</b> · ${num(f.pct)}%</span>
      ${f.dropPct>0?`<span class="drop${f.worst?' worst':''}">↓ ${num(f.dropPct)}% drop from ${esc(f.from!=null?String(f.from):'')}${f.worst?' — the leak is here':''}</span>`:''}
    </div>`).join('')}
  </div></div>

  ${(()=>{
    const ob=d.onboarding||{reporting:0,completed:0,steps:[]};
    if(!ob.reporting) return `<div class="section-t">Where onboarding stalls</div>
      <div class="card"><div class="chart-empty">No onboarding progress reported yet. The app started recording the furthest step reached in the next release — until users are on it, the 84% drop above can't be located to a screen.</div></div>`;
    return `<div class="section-t">Where onboarding stalls</div>
    <div class="card">
      ${hbars(ob.steps.map(x=>({k:x.step, v:num(x.stalled), label:num(x.stalled)+' stalled of '+num(x.reached)})),{seq:true,empty:'Everyone who started, finished.'})}
      <div class="note">${num(ob.completed)} of ${num(ob.reporting)} reporting accounts finished onboarding. Each bar is the furthest screen reached by someone who never completed.${(ob.steps||[]).length>1?' The tallest bar is the screen to fix.':' Only one screen is represented, so this cannot yet localise the drop — it says where people end up, not where they turn back.'}</div>
    </div>`;
  })()}

  <div class="section-t">Do</div>
  <div class="qa">
    <button class="btn" data-act="findUser"><span class="i">◎</span> Find a user</button>
    <button class="btn" data-act="extendTrial"><span class="i">＋</span> Comp / extend trial</button>
    <button class="btn" data-act="forceRefresh"><span class="i">↻</span> Force AI refresh</button>
    <button class="btn" data-act="sendPush"><span class="i">✉</span> Send push</button>
    <button class="btn" data-act="flag"><span class="i">⚑</span> Feature flags</button>
    <button class="btn" data-act="snapshot"><span class="i">⧗</span> Snapshot metrics</button>
  </div>

  ${renderAcquisition()}
  ${renderRetention()}
  ${renderReputation()}

  <div class="grid2" style="margin-top:22px">
    ${renderStability()}
    ${renderPushReach()}
    <div class="card">
      <div class="qlabel">AI usage · ${num(d.ai.totalCalls)} calls · ${money(d.ai.totalCostUsd)}</div>
      <div class="bars">${aiBars(d.ai.bySurface)}</div>
      <div class="note">${esc(d.ai.model||'gemini')} · ${esc(d.ai.rates||'')} · counts every account including internal — spend is spend.</div>
    </div>
    <div class="card">
      <div class="qlabel">Reverse trial</div>
      <div class="kpis" style="margin-top:12px">
        <div class="kpi"><div class="l">24h</div><div class="n">${num(mo.reverseTrial.grantsDay)}</div></div>
        <div class="kpi"><div class="l">7 days</div><div class="n">${num(mo.reverseTrial.grantsWeek)}</div></div>
        <div class="kpi"><div class="l">active now</div><div class="n">${num(mo.reverseTrial.activeNow)}</div></div>
      </div>
      <div class="note">Active-user basis: ${esc(d.active.method)}</div>
    </div>
  </div>`;
}

// Alerts must offer a way to act or verify — never just prose telling you to go elsewhere.
function alertActions(n){
  const t=String(n.title||'');
  if(/Apple notification/i.test(t)) return `<button class="ab p" data-test="appStore">Test delivery</button>
    <button class="ab" data-copy="https://us-central1-qwota-ai-coach.cloudfunctions.net/appStoreNotifications">Copy webhook URL</button>`;
  if(/RevenueCat/i.test(t)) return `<button class="ab p" data-test="revenueCat">Test delivery</button>`;
  if(/unattributed purchase/i.test(t)) return `<button class="ab p" data-go="users">Open the queue</button>`;
  if(/entitled users with no verified purchase/i.test(t)) return `<button class="ab" data-go="users" data-filter="flagged">Show these users</button>`;
  if(/[Rr]everse-trial/.test(t)) return `<button class="ab" data-act2="flag">Feature flags</button>`;
  return '';
}

// Loaded after the cockpit paints — Apple can take a few seconds and this must never
// hold up the numbers that come from Firestore. Fetched once per session unless forced.
async function loadAppStore(force){
  if(APPSTORE_STATE==='loading') return;
  if(APPSTORE && !force) return;
  APPSTORE_STATE='loading';
  try{
    APPSTORE=(await call('adminAppStore')({refresh:!!force})).data;
    APPSTORE_STATE='ready';
  }catch(e){
    APPSTORE_STATE='error';
    console.warn('App Store fetch failed:', e && e.message);
  }
  if(TAB==='cockpit' && DATA){ const m=$('main'); if(m){ m.innerHTML=renderCockpit(); wire(); } }
}

function renderAcquisition(){
  // The half of the funnel the console never had. Without it "growth stalled" is a dead
  // end: you cannot tell whether nobody sees the listing or people see it and don't
  // install, and those need opposite fixes.
  if(APPSTORE_STATE==='loading') return `<div class="section-t">Acquisition</div>
    <div class="card"><div class="chart-empty">Asking App Store Connect…</div></div>`;
  if(APPSTORE_STATE==='error' || !APPSTORE) return `<div class="section-t">Acquisition</div>
    <div class="card"><div class="chart-empty">Couldn't reach App Store Connect. The numbers below the store line are unaffected.</div></div>`;
  const a=APPSTORE;
  const known=(a.days||[]).filter(d=>d.installs!=null);
  const reg7=num((DATA.growth||{}).newRegistered7d);
  // Installs → registrations is the drop nothing else measures. A person who installs
  // and never makes an account is invisible in every other panel on this console.
  const gap = num(a.installs7d) - reg7;
  return `<div class="section-t">Acquisition</div>
  <div class="card">
    <div class="grid2">
      <div><div class="l">First-time installs · 7d</div><div class="big sm">${num(a.installs7d)}</div></div>
      <div><div class="l">New registrations · 7d</div><div class="big sm">${reg7}</div></div>
    </div>
    ${num(a.installs7d)>0?`<div class="qsub" style="margin-top:10px">${gap>0
      ? `<b style="color:var(--warn)">${gap} of ${num(a.installs7d)} installs didn't produce a registered account.</b> They either stayed on the guest path or left before signing in — the store listing is working; what follows the download isn't.`
      : 'Every install this week produced a registered account.'}</div>`:'<div class="qsub" style="margin-top:10px">No installs recorded in the last 7 days — that points at the store listing, not at sign-up.</div>'}
    ${known.length?`<div style="margin-top:14px">${hbars(known.map(d=>({k:d.date.slice(5), v:num(d.installs), label:String(num(d.installs))})),{seq:true,empty:'No install data'})}</div>`:''}
    <div class="note">First-time installs only — re-downloads and updates excluded${num(a.daysKnown7d)&&num(a.daysKnown7d)<7?`, and Apple has reports for only ${num(a.daysKnown7d)} of the last 7 days`:''}. Days with no report are omitted rather than drawn as zero. "Registered" counts Apple sign-ins that survive the not-a-person filter, so a guest who installs and never signs in shows in the gap. ${a.stale?'<b>Stale</b> — the last fetch failed; showing the previous successful read. ':''}${a.cached?'Cached up to an hour.':''}</div>
  </div>`;
}

function renderReputation(){
  if(!APPSTORE || !(APPSTORE.reviews||[]).length) return '';
  const a=APPSTORE;
  return `<div class="section-t">What people are saying</div>
  <div class="card">
    ${a.recentReviewAverage!=null?`<div class="qlabel">${a.recentReviewAverage.toFixed(1)} ★ across the ${num(a.reviewSampleSize)} most recent review${num(a.reviewSampleSize)===1?'':'s'}</div>`:''}
    <div class="feed" style="margin-top:10px">${a.reviews.map(r=>`<div class="row">
      <span class="sev ${num(r.rating)>=4?'ok':(num(r.rating)>=3?'warn':'crit')}"></span>
      <div style="flex:1;min-width:0">
        <div class="t">${'★'.repeat(Math.max(0,Math.min(5,num(r.rating))))} ${esc(r.title)}</div>
        <div class="d">${esc(r.body)}</div>
      </div>
      <div class="d" style="white-space:nowrap">${esc(String(r.territory||''))}</div>
    </div>`).join('')}</div>
    <div class="note">Apple's API returns recent reviews, not the lifetime star rating — this average describes the sample above, nothing more.</div>
  </div>`;
}

function renderRetention(){
  const r=DATA.retention; if(!r) return '';
  const band=(k,label)=>{
    const b=r[k]||{};
    const pct=b.pct==null?'—':`${num(b.pct)}%`;
    return {k:label, v:num(b.pct), label:`${pct} · ${num(b.retained)} of ${num(b.eligible)}`};
  };
  const rows=[band('d1','Day 1'),band('d7','Day 7'),band('d30','Day 30')];
  const anyEligible=['d1','d7','d30'].some(k=>num((r[k]||{}).eligible)>0);
  const unobs=num((r.d1||{}).unobserved);
  return `<div class="section-t">Retention</div>
  <div class="card">
    ${anyEligible?hbars(rows,{seq:true}):`<div class="chart-empty">Not measurable yet${unobs?` — ${unobs} account(s) predate the heartbeat, so nothing records whether they came back.`:'.'} It fills in as build 569+ rolls out.</div>`}
    ${anyEligible&&unobs?`<div class="qsub" style="margin-top:8px">${unobs} account(s) excluded: they predate the heartbeat, so their return can't be observed either way.</div>`:''}
    <div class="note">Cohorted on when the account was created, measured against the heartbeat's last-seen. Each band only counts accounts that have HAD that long to come back, so a day-old account never drags Day 30 down. Activation says how many ever trained; this says whether the rest bounced immediately or drifted.</div>
  </div>`;
}

function renderStability(){
  const st=DATA.stability;
  if(!st || !num(st.reporting)) return `<div class="card">
    <div class="qlabel">Stability</div>
    <div class="chart-empty" style="margin-top:8px">No sessions reporting yet — it fills in as build 570+ rolls out.</div>
    <div class="note">Crashlytics' crash-free rate has no readable API and no BigQuery export is configured, so the app reports its own: launches, and launches that followed a session which never reached the background.</div>
  </div>`;
  const pct=st.cleanPct;
  const bad=pct!=null && pct<99;
  return `<div class="card"${bad?' style="border-color:rgba(255,92,108,.4)"':''}>
    <div class="qlabel">Clean sessions</div>
    <div class="big sm" style="margin:8px 0 2px">${pct==null?'—':pct+'%'}</div>
    <div class="qsub">${num(st.uncleanExits)} unclean of ${num(st.launches)} launch${num(st.launches)===1?'':'es'} · ${num(st.reporting)} account(s) reporting</div>
    <div class="note">An upper bound on crashes, not a count — a force-quit looks identical from inside the app and inflates it. Crashlytics' own rate isn't readable by any API.</div>
  </div>`;
}

function renderPushReach(){
  const p=DATA.pushReach; if(!p) return '';
  return `<div class="card">
    <div class="qlabel">Push reach</div>
    <div class="big sm" style="margin:8px 0 2px">${num(p.pct)}%</div>
    <div class="qsub">${num(p.reachable)} of ${num(p.total)} accounts have a push token</div>
    <div class="note">Re-engagement is the main retention lever, so this is the ceiling on it — nobody without a token can be brought back by a notification.</div>
  </div>`;
}

function aiBars(rows){
  if(!rows||!rows.length) return '<div class="qsub d">No AI usage recorded</div>';
  const max=Math.max(...rows.map(r=>r.calls||0),1);
  return rows.map(r=>`<div class="brow"><span>${esc(r.surface)}</span><div class="track"><div class="fill" style="width:${Math.round((num(r.calls)/max)*100)}%"></div></div><span class="v">${num(r.calls)} · ${money(r.costUsd)}</span></div>`).join('');
}

function renderMoney(){
  const mo=DATA.money;
  const cutPct=Math.round(num(mo.commissionRate)*100);
  const cut=num(mo.mrrEstimate)-num(mo.netMrrEstimate);
  const tr=mo.trial||{granted:0,converted:0,cohorts:{}};
  const convPct=num(tr.granted)>0?Math.round((num(tr.converted)/num(tr.granted))*100):0;

  return `
  <div class="pulsegrid">
    <div class="pcard"><div class="pl">MRR after Apple</div><div class="pn ok">${money(mo.netMrrEstimate)}</div><div class="pd">${money(mo.mrrEstimate)} gross</div></div>
    <div class="pcard"><div class="pl">Paying</div><div class="pn">${num(mo.payingCount)}</div><div class="pd">${num(mo.churnedCount)} churned</div></div>
    <div class="pcard"><div class="pl">Conversion</div><div class="pn ${num(mo.conversionPct)<5?'cr':''}">${num(mo.conversionPct)}%</div><div class="pd">of registered</div></div>
  </div>

  <div class="section-t">What you actually keep</div>
  <div class="card">
    ${segbar([
      {k:`You keep`, v:num(mo.netMrrEstimate), c:'var(--c1)'},
      {k:`Apple's ${cutPct}%`, v:+cut.toFixed(2), c:'var(--c0)'},
    ])}
    <div class="detail-grid" style="margin-top:16px">
      <div><div class="l">Gross MRR</div><div class="v">${money(mo.mrrEstimate)}</div></div>
      <div><div class="l">Net MRR</div><div class="v ok">${money(mo.netMrrEstimate)}</div></div>
      <div><div class="l">Booked at purchase</div><div class="v">${money(mo.grossBooked)}</div></div>
      <div><div class="l">ARPU · paying</div><div class="v">${money(mo.arpuPaying)}/mo</div></div>
    </div>
    ${num(mo.sbpUpsidePerMonth)>0?`<div class="warnline" style="margin-top:14px"><b>Apple is taking ${cutPct}%.</b>
      The Small Business Program drops that to 15% for under $1M/year — worth ${money(mo.sbpUpsidePerMonth)}/month at today's MRR, and it scales with every sale. Enrolment is a form in App Store Connect.</div>`:''}
    <div class="note">"Booked at purchase" sums each account's first transaction — renewals aren't recorded individually, so it's bookings, not cash collected.</div>
  </div>

  <div class="section-t">Reverse trial · does it convert?</div>
  <div class="card">
    <div class="funnel">
      <div class="fstage"><span class="nm">Trials granted</span><span class="v"><b>${num(tr.granted)}</b></span>
        <div class="ftrack"><div class="ffill" style="width:100%"></div></div></div>
      <div class="fstage"><span class="nm">Went on to pay</span><span class="v"><b>${num(tr.converted)}</b> · ${convPct}%</span>
        <div class="ftrack">${num(tr.converted)>0?`<div class="ffill" style="width:${Math.max(convPct,2)}%"></div>`:''}</div>
        ${num(tr.converted)===0&&num(tr.granted)>0?`<span class="drop worst">↓ 100% drop — no trial has ever converted</span>`:''}</div>
    </div>
    ${Object.keys(tr.cohorts||{}).length?`<div style="margin-top:18px">
      <div class="qlabel">By cohort</div>
      <div style="margin-top:10px">${hbars(Object.entries(tr.cohorts).map(([k,v])=>({k, v:num(v), label:num(v)+' granted'})),{seq:true})}</div>
    </div>`:''}
    <div class="note">Derived: an account that was granted a trial and now holds a production purchase. Nothing writes a conversion flag, so this counts the outcome rather than trusting a field.</div>
  </div>

  <div class="section-t">Where the money comes from</div>
  <div class="card">
    ${segbar(Object.keys(mo.prices).map((p,i)=>({k:p.replace('com.qwota.pro.',''), v:num(mo.byProduct[p]), c:CAT[i%CAT.length]})))}
    <div style="margin-top:18px">${hbars(Object.keys(mo.prices).map(p=>{
      const payers=num(mo.byProduct[p]);
      const contrib = p.endsWith('monthly') ? payers*num(mo.prices[p])
                    : p.endsWith('yearly')  ? payers*num(mo.prices[p])/12 : 0;
      return { k:p.replace('com.qwota.pro.',''), v:contrib, label: contrib?money(contrib)+'/mo':'one-time' };
    }), {seq:true, empty:'No production purchases yet.'})}</div>
    <div class="note">Bar one: how many people are on each plan. Bar two: what each contributes to MRR — lifetime is a one-time charge, so it contributes nothing recurring.${mo.sandboxTx?` ${num(mo.sandboxTx)} Sandbox transaction(s) excluded.`:''}</div>
  </div>

  <div class="section-t">Every purchase</div>
  <div class="card" style="padding:0;overflow-x:auto">
    ${(mo.purchaseLog||[]).length?`<table><thead><tr><th>When</th><th>Plan</th><th class="text-center">Price</th><th>Source</th></tr></thead><tbody>
      ${mo.purchaseLog.map(x=>`<tr>
        <td>${esc((x.purchaseDate||'—').slice(0,10))}</td>
        <td class="mono">${esc(String(x.productId||'—').replace('com.qwota.pro.',''))}</td>
        <td class="text-center">${x.price!=null?money(x.price):'—'}</td>
        <td class="d">${esc(x.source||'app')}${x.attributed?'':' <span class="cr">unattributed</span>'}</td>
      </tr>`).join('')}
    </tbody></table>`:'<div style="padding:16px"><div class="qsub d">No production purchases recorded.</div></div>'}
  </div>

  <div class="section-t">Who has access, and why</div>
  <div class="card">
    ${segbar([
      {k:'Paying', v:num(mo.payingCount), c:'var(--c1)'},
      {k:'On trial', v:num(mo.onReverseTrial), c:'var(--c3)'},
      {k:'Entitled, unverified', v:num(mo.unverifiedEntitledCount), c:'var(--c2)'},
      {k:'Churned', v:num(mo.churnedCount), c:'var(--c0)'},
    ])}
    <div class="note">${num(mo.lifetimePayerCount)} account(s) have ever paid. Never summed into one "Pro" number — entitlement includes TestFlight and trials, and a transaction counts as revenue only while its buyer is still entitled.</div>
  </div>`;
}

function pipeCell(label, p, note){
  const flowing = p.total>0;
  return `<div class="card">
    <div class="qlabel"><span class="tick" style="background:${flowing?'var(--teal)':'var(--warn)'}"></span>${esc(label)}</div>
    <div class="big sm">${flowing?'flowing':'no events'}</div>
    <div class="qsub">${p.total} total · ${p.last24h} in 24h${p.lastAt?` · last ${ago(p.lastAt)}`:''}${p.lastType?` <span class="mono">${esc(p.lastType)}</span>`:''}</div>
    ${note?`<div class="note">${esc(note)}</div>`:''}
  </div>`;
}
function renderFlags(cfg){
  if(!cfg) return '<div class="chart-empty">Loading flags…</div>';
  if(!cfg.flags || !cfg.flags.length) return '<div class="chart-empty">No feature flags set.</div>';
  return `<table><tbody>${cfg.flags.map(f=>`<tr>
      <td class="mono">${esc(f.key)}</td>
      <td class="text-center"><span class="badge ${f.value===true?'on':(f.value===false?'off':'')}">${esc(String(f.value))}</span></td>
    </tr>`).join('')}</tbody></table>
    <div class="note">Read straight from <span class="mono">config/featureFlags</span>. Setting a flag was write-only before — you could turn one on without ever seeing it was already on.</div>`;
}

const AUDIT_LABEL = { comp_trial:'Comped a trial', set_flag:'Changed a flag', force_refresh:'Forced an AI refresh',
  set_internal:'Marked internal', send_push:'Sent a push', reconcile_purchase:'Reconciled a purchase' };
function renderAudit(a){
  if(!a) return '<div class="chart-empty">Loading history…</div>';
  if(!a.items || !a.items.length) return '<div class="chart-empty">Nothing recorded yet. Actions taken from here are logged from now on.</div>';
  return `<div class="feed">${a.items.slice(0,25).map(it=>{
    const d=it.detail||{};
    const extra=[
      d.days!=null?d.days+' days':null,
      d.key!=null?`${d.key} = ${d.value}`:null,
      d.internal!=null?(d.internal?'on':'off'):null,
      d.title?`"${d.title}"`:null,
      d.productId?String(d.productId).replace('com.qwota.pro.',''):null,
    ].filter(Boolean).join(' · ');
    return `<div class="row"><span class="sev info"></span>
      <div style="flex:1;min-width:0">
        <div class="t">${esc(AUDIT_LABEL[it.action]||it.action)}${extra?` <span class="d">${esc(extra)}</span>`:''}</div>
        ${it.uid?`<div class="d mono">${esc(String(it.uid).slice(0,16))}…</div>`:''}
      </div>
      <div class="d" style="white-space:nowrap">${it.at?ago(it.at):'—'}</div></div>`;
  }).join('')}</div>
  <div class="note">Every comp, flag change and push you make from this console — the ledger that used to live in a file on your Desktop.</div>`;
}

// Health-tab extras load after paint; neither blocks the numbers.
async function loadHealthExtras(){
  if(!CONFIG){ try{ CONFIG=(await call('adminGetConfig')({})).data; }catch{ CONFIG={flags:[]}; }
    const b=$('flagbox'); if(b) b.innerHTML=renderFlags(CONFIG); }
  if(!AUDIT){ try{ AUDIT=(await call('adminAuditTrail')({limit:60})).data; }catch{ AUDIT={items:[]}; }
    const b=$('auditbox'); if(b) b.innerHTML=renderAudit(AUDIT); }
}

function renderHealth(){
  const h=DATA.health;
  const pp=DATA.pipeline||{revenueCat:{total:0,last24h:0},appStore:{total:0,last24h:0},pendingQueue:0};
  return `
  <div class="section-t">Purchase pipeline</div>
  <div class="grid3">
    ${pipeCell('RevenueCat webhook', pp.revenueCat, pp.revenueCat.total===0?'Not yet receiving — configure in RC dashboard.':'')}
    ${pipeCell('Apple notifications', pp.appStore, '')}
    <div class="card">
      <div class="qlabel"><span class="tick" style="background:${pp.pendingQueue?'var(--crit)':'var(--teal)'}"></span>Reconcile queue</div>
      <div class="big sm ${pp.pendingQueue?'cr':'ok'}">${pp.pendingQueue}</div>
      <div class="qsub">${pp.pendingQueue?'unattributed — fix in Users':'all purchases attributed'}</div>
    </div>
  </div>
  <div class="grid3" style="margin-top:14px">
    <div class="card"><div class="qlabel">AI failures · 24h</div><div class="big ${h.aiFailures24h?'cr':'ok'}">${h.aiFailures24h}</div></div>
    <div class="card"><div class="qlabel">Console self-check</div><div class="big ${DATA.reconcile.ok?'ok':'cr'}">${DATA.reconcile.ok?'✓':'✗'}</div><div class="qsub">${DATA.reconcile.invariants.filter(i=>i.pass).length}/${DATA.reconcile.invariants.length} invariants pass</div></div>
    <div class="card"><div class="qlabel">AI active users</div><div class="big">${DATA.ai.activeUsers7d}</div><div class="qsub">${DATA.ai.activeUsers24h} in 24h</div></div>
  </div>
  ${(()=>{
    const gb=DATA.guestBursts;
    if(!gb) return '';
    // "Still happening" requires a burst we can attribute to real hardware. Clusters
    // with no device reported are indistinguishable from a dev machine relaunching the
    // app — which is exactly what every recent one turned out to be.
    const confirmed=num(gb.confirmedLast7d)>0;
    const live=num(gb.last7d)>0;
    return `<div class="section-t">Duplicate guest accounts</div>
    <div class="card"${confirmed?' style="border-color:rgba(255,92,108,.4)"':''}>
      <div class="qlabel"><span class="tick" style="background:${confirmed?'var(--crit)':'var(--dim)'}"></span>
        ${confirmed?'Still happening':(live?'Unattributed':'Historic only')}</div>
      <div class="big sm" style="margin:8px 0 2px">${num(gb.duplicates)} duplicate account${num(gb.duplicates)===1?'':'s'}</div>
      <div class="qsub">${num(gb.clusters)} burst${num(gb.clusters)===1?'':'s'} · ${num(gb.last7d)} in the last 7 days${confirmed?` (${num(gb.confirmedLast7d)} on real devices)`:', none on a confirmed real device'} · ${num(gb.last30d)} in 30${gb.mostRecentAt?` · most recent ${ago(gb.mostRecentAt)}`:''}</div>
      ${(gb.recent||[]).length?`<div style="margin-top:14px">${hbars((gb.recent||[]).map(c=>({
        k:String(c.firstAt).slice(0,10), v:num(c.size), label:num(c.size)+' accounts'
      })),{seq:true})}</div>`:''}
      <div class="note">The guest→Apple sign-in loop mints a fresh anonymous account on every failed retry, so each burst is one person hitting a broken sign-in — not new users. A fix is on dev (7fad999); store builds ≤498 still carry it.
      <b>Caveat:</b> internal and simulator-identified accounts are excluded, but a local E2E run on a machine that doesn't report a device fingerprint can still land here. Cross-check the timestamps against your own testing before treating a burst as a real user.</div>
    </div>`;
  })()}

  <div class="section-t">Feature flags · live values</div>
  <div class="card" id="flagbox">${renderFlags(CONFIG)}</div>

  <div class="section-t">What you've done</div>
  <div class="card" id="auditbox">${renderAudit(AUDIT)}</div>

  <div class="section-t">App versions in the field</div>
  <div class="card">${(()=>{
    const cv=DATA.clientVersions||{versions:[],known:0,unknown:0};
    if(!cv.versions.length) return `<div class="chart-empty">No version has been reported yet. The foreground heartbeat started sending build info in the next release — until users are on it, this stays empty.</div>`;
    return hbars(cv.versions.map(v=>({k:v.version, v:num(v.count), label:num(v.count)+' user'+(num(v.count)===1?'':'s')})), {seq:true})
      + `<div class="note">${num(cv.known)} of ${num(cv.known)+num(cv.unknown)} accounts have reported a version. The rest haven't opened a build that sends it.</div>`;
  })()}</div>

  <div class="section-t">Recent errors</div>
  <div class="card">${h.recentErrors.length?`<table><thead><tr><th>When</th><th>Type</th><th>User</th><th>Error</th></tr></thead><tbody>
    ${h.recentErrors.map(e=>`<tr><td>${ago(e.at)}</td><td><span class="badge">${esc(e.type)}</span></td><td class="mono">${esc((e.userId||'—').slice(0,10))}</td><td>${esc(e.error||'—')}</td></tr>`).join('')}
  </tbody></table>`:'<div class="qsub ok">No errors in the last 24h 🎉</div>'}</div>
  <div class="section-t">Self-check invariants</div>
  <div class="card"><table><tbody>${DATA.reconcile.invariants.map(i=>`<tr><td>${esc(i.name)}</td><td class="text-center">${i.pass?'<span class="ok">✓</span>':'<span class="cr">✗</span>'}</td></tr>`).join('')}</tbody></table></div>`;
}

let PENDING = null;
async function renderUsersTab(){
  const m = $('main');
  if(USER_VIEW.uid){ return renderUserDetail(USER_VIEW.uid); }
  if(!USERS){
    m.innerHTML = '<div class="loading">Loading users…</div>';
    try{ const r=(await call('adminUsers')({ includeInternal: INCLUDE_INTERNAL })).data; USERS=r.users; USERS_HIDDEN=num(r.internalHidden); USERS_NONREAL=num(r.nonUserCount); USERS_REASONS=r.nonUserReasons||{}; }
    catch(e){ m.innerHTML = '<div class="loading cr">'+esc(e.message)+'</div>'; return; }
  }
  if(PENDING===null){ try{ PENDING = (await call('adminListPendingPurchases')({})).data.items; }catch{ PENDING = []; } }
  // The pending-purchase banner lives OUTSIDE #u-list so filtering never destroys it.
  m.innerHTML = renderPending() + '<div id="u-list">' + renderUserList() + '</div>';
  wireUsers();
}

// Redraw only the list+toolbar. Typing in the search box used to replace all of #main,
// which silently deleted the "N unattributed purchases" card above it.
function redrawUserList(){
  const host = $('u-list'); if(!host) return renderUsersTab();
  host.innerHTML = renderUserList();
  wireUsers();
}

function renderPending(){
  if(!PENDING || !PENDING.length) return '';
  return `<div class="card" style="border-color:rgba(255,92,108,.4);margin-bottom:16px">
    <div class="qlabel" style="color:var(--crit)"><span class="tick" style="background:var(--crit)"></span>Purchase-sync gap — ${PENDING.length} unattributed purchase${PENDING.length>1?'s':''}</div>
    <div class="qsub" style="margin:8px 0 12px">Apple reported these paid/redeemed transactions but no account claimed them — Pro was never granted. Find the buyer (RevenueCat/ASC by transaction ID) and reconcile so they get access.</div>
    <div class="feed">${PENDING.map(p=>`<div class="row"><div class="sev crit"></div>
      <div style="flex:1">
        <div class="t">${esc((p.productId||'').replace('com.qwota.pro.','')||'purchase')} · ${esc(p.notificationType||'')}</div>
        <div class="d mono">tx ${esc(p.originalTransactionId)}${p.purchaseDate?' · '+esc(p.purchaseDate.slice(0,10)):''}${p.appAccountToken?' · aat '+esc(p.appAccountToken.slice(0,8)):''}</div>
      </div>
      <button class="btn" data-recon="${esc(p.originalTransactionId)}" data-prod="${esc(p.productId||'')}" data-exp="${esc(p.expiresDate||'')}" style="font-size:12.5px;font-weight:600;color:var(--tx);background:var(--raised);border:1px solid var(--line);padding:8px 12px;border-radius:9px">Reconcile</button>
    </div>`).join('')}</div>
  </div>`;
}

function flagClass(f){ return f==='entitled-no-purchase' ? 'risk' : f==='churned' ? 'churned' : f==='guest' ? 'guest' : ''; }

// Segments answer questions the operator actually asks. The old filters (registered /
// guest / paid / flagged) were record properties — "flagged" matched 84 of 86 accounts
// because "guest" and "no-workouts" counted as flags.
// Non-users are excluded from EVERY segment except the one built to inspect them.
// Seeded fixtures, Apple App Review sessions, simulators and never-active anonymous
// installs were sitting in the real-user numbers — one fixture was even reported as
// the most engaged account on the platform.
const real = (u)=>!u.nonUser;
const SEGMENTS = [
  { k:'look',    label:'Worth a look', test:u=>real(u) && !(u.type==='guest' && !num(u.workouts)) },
  { k:'atrisk',  label:'At risk',      test:u=>real(u) && !!u.atRisk },
  { k:'trial',   label:'On trial',    test:u=>real(u) && u.access==='trial' },
  { k:'paid',    label:'Paying',       test:u=>real(u) && (u.access==='paid'||u.access==='lifetime') },
  { k:'lapsed',  label:'Lapsed',       test:u=>real(u) && !!u.lapsed },
  { k:'silent',  label:'Never trained',test:u=>real(u) && !!u.silent },
  { k:'all',     label:'All real',     test:u=>real(u) },
  { k:'nonuser', label:'Not people',   test:u=>!real(u) },
];
const segTest = (k)=>(SEGMENTS.find(x=>x.k===k)||SEGMENTS[0]).test;

function initials(u){
  const n=(u.name||'').trim();
  if(!n) return '—';
  return n.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}
// What this row is worth knowing for, in one line.
function trialLeft(u){
  const exp=num(u.trialExpiresAt, 0);
  if(u.access!=='trial' || !exp) return null;
  const ms=exp-Date.now();
  if(ms<=0) return 'trial ended';
  const days=Math.floor(ms/86400000);
  if(days>=1) return `${days} day${days===1?'':'s'} of trial left`;
  const hours=Math.max(1,Math.floor(ms/3600000));
  return `${hours} hour${hours===1?'':'s'} of trial left`;
}
function rowSignal(u){
  const t=trialLeft(u);
  const w=num(u.workouts);
  if(!w) return [t, u.type==='guest' ? 'no activity' : 'never trained'].filter(Boolean).join(' · ');
  const bits=[w+' workout'+(w===1?'':'s')];
  if(t) bits.unshift(t);
  if(num(u.adherence)) bits.push(num(u.adherence)+'% adherence');
  else if(num(u.streak)) bits.push(num(u.streak)+'-day streak');
  return bits.join(' · ');
}

// Two questions the list can't answer by scrolling: where does the whole population
// sit, and how deep does engagement actually go.
function renderUserCharts(){
  if(!USERS || !USERS.length) return '';
  const R = USERS.filter(real);
  const active   = R.filter(u=>u.type!=='guest' && num(u.workouts)>0).length;
  const atRisk   = R.filter(u=>u.atRisk).length;
  const silent   = R.filter(u=>u.type!=='guest' && !num(u.workouts)).length;
  const dormant  = R.filter(u=>u.type==='guest' && !num(u.workouts)).length;
  const buckets = [
    {k:'none',    v:R.filter(u=>num(u.workouts)===0).length},
    {k:'1–4',     v:R.filter(u=>num(u.workouts)>=1 && num(u.workouts)<5).length},
    {k:'5–19',    v:R.filter(u=>num(u.workouts)>=5 && num(u.workouts)<20).length},
    {k:'20–49',   v:R.filter(u=>num(u.workouts)>=20 && num(u.workouts)<50).length},
    {k:'50+',     v:R.filter(u=>num(u.workouts)>=50).length},
  ];
  return `<div class="card" style="margin-bottom:14px">
    <div class="qlabel">Population · ${R.length} real accounts${USERS.length-R.length?` <span class="d">(${USERS.length-R.length} filtered out)</span>`:''}</div>
    <div style="margin-top:12px">${segbar([
      {k:'Training', v:active,  c:'var(--c1)'},
      {k:'At risk',  v:atRisk,  c:'var(--c2)'},
      {k:'Never trained', v:silent, c:'var(--c3)'},
      {k:'Dormant guests', v:dormant, c:'var(--c0)'},
    ])}</div>
    <div class="qlabel" style="margin-top:20px">Workouts logged · per account</div>
    <div style="margin-top:12px">${hbars(buckets.map(b=>({k:b.k, v:b.v, label:b.v+' user'+(b.v===1?'':'s')})), {seq:true})}</div>
  </div>`;
}

function renderUserList(){
  const q = USER_VIEW.q.toLowerCase();
  const seg = USER_VIEW.seg;
  const matchesQ = (u)=>!q || ((u.email||'')+' '+(u.name||'')+' '+u.uid).toLowerCase().includes(q);
  // A search should look at everyone, not just the active segment — you're hunting a
  // specific person, not browsing.
  // A search still shouldn't resurface fixtures — unless you're in the Not-people segment.
  const pool = q ? USERS.filter(u=>matchesQ(u) && (seg==='nonuser' ? !real(u) : real(u))) : USERS.filter(segTest(seg));
  // The trial list is ordered by who runs out first. num() floors a missing expiry to 0,
  // which would sort unknowns to the top, so absence is pushed to the end explicitly.
  const rows = seg==='trial'
    ? pool.slice().sort((a,b)=>num(a.trialExpiresAt, Infinity)-num(b.trialExpiresAt, Infinity))
    : pool;
  const shown = rows.slice(0, USER_VIEW.limit);
  const dormant = (!q && seg==='look') ? USERS.filter(u=>real(u) && u.type==='guest' && !num(u.workouts)) : [];
  const cnt = (k)=>USERS.filter(segTest(k)).length;

  return `<div class="utoolbar">
    <input id="u-search" placeholder="Search name / email / UID" value="${esc(USER_VIEW.q)}">
  </div>
  <div class="fbar">
    ${SEGMENTS.map(sg=>`<button class="fpill${seg===sg.k?' on':''}" data-seg="${esc(sg.k)}">${esc(sg.label)} <span class="pc">${cnt(sg.k)}</span></button>`).join('')}
    <button class="fpill${INCLUDE_INTERNAL?' on':''}" id="u-internal">Internal${USERS_HIDDEN&&!INCLUDE_INTERNAL?' '+USERS_HIDDEN:''}</button>
  </div>
  ${q?`<div class="qsub d" style="margin:0 2px 10px">Searching all ${USERS.length} accounts · ${rows.length} match${rows.length===1?'':'es'}</div>`:renderUserCharts()}

  <div class="ucards">
    ${shown.length?shown.map(u=>`<button class="urow ${u.internal?'internal-row':''}" data-uid="${esc(u.uid)}">
      <span class="uav ${u.atRisk?'risk':(num(u.workouts)>0?'hot':'')}">${esc(initials(u))}</span>
      <span class="umid"><span class="un">${esc(u.name||(u.type==='guest'?'Anonymous':'No name'))}</span>
        <span class="us">${esc(u.email||u.uid.slice(0,14)+'…')}</span>
        <span class="uw">${esc(rowSignal(u))}</span></span>
      <span class="uend">${u.nonUser?`<span class="chip-s internal">${esc(u.nonUserReason||'not a person')}</span>`:`<span class="chip-s ${esc(u.access)}">${esc(u.access)}</span>`}</span>
    </button>`).join(''):'<div class="card"><div class="qsub d">No users match.</div></div>'}
  </div>

  <div class="card" style="padding:0;overflow-x:auto"><table class="utable"><thead><tr>
    <th>User</th><th>Type</th><th>Access</th><th class="text-center">Workouts</th><th class="text-center">Adh.</th><th class="text-center">AI</th><th>Last active</th><th>Version</th><th>Signals</th>
  </tr></thead><tbody>
    ${shown.map(u=>`<tr class="clickable ${u.internal?'internal-row':''}" data-uid="${esc(u.uid)}">
      <td><div class="uname">${esc(u.name||(u.type==='guest'?'Anonymous':'—'))}</div><div class="uemail">${esc(u.email||u.uid.slice(0,14))}</div></td>
      <td>${esc(u.type)}${u.internal?' <span class="chip-s internal">internal</span>':''}</td>
      <td><span class="chip-s ${esc(u.access)}">${esc(u.access)}</span></td>
      <td class="text-center ${num(u.workouts)>0?'':'d'}">${num(u.workouts)}</td>
      <td class="text-center ${num(u.adherence)?'':'d'}">${num(u.adherence)?num(u.adherence)+'%':'—'}</td>
      <td class="text-center">${num(u.aiCalls)}</td>
      <td>${u.lastActive?ago(u.lastActive):'—'}</td>
      <td class="mono">${u.appVersion?esc(u.appVersion):'—'}</td>
      <td>${u.flags.map(f=>`<span class="chip-s ${flagClass(f)}">${esc(f)}</span>`).join('')||'—'}</td>
    </tr>`).join('')}
  </tbody></table></div>

  ${rows.length>shown.length?`<button class="loadmore" id="u-more">Showing ${shown.length} of ${rows.length} · Load more</button>`:''}
  ${dormant.length?`<button class="fold" id="u-fold">${USER_VIEW.showDormant?'▾':'▸'} <b>${dormant.length} dormant guests</b> — anonymous, no activity</button>
    ${USER_VIEW.showDormant?`<div class="ucards" style="margin-top:7px">${dormant.slice(0,50).map(u=>`
      <button class="urow" data-uid="${esc(u.uid)}"><span class="uav">—</span>
      <span class="umid"><span class="un">Anonymous</span><span class="us">${esc(u.uid.slice(0,14))}…</span></span>
      <span class="uend"><span class="chip-s free">free</span></span></button>`).join('')}</div>`:''}`:''}`;
}

function wireUsers(){
  wireCharts();
  const s=$('u-search'); if(s){ s.oninput=(e)=>{ USER_VIEW.q=e.target.value; USER_VIEW.limit=25; redrawUserList(); const n=$('u-search'); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } }; }
  document.querySelectorAll('.fpill[data-seg]').forEach(b=>b.onclick=()=>{ USER_VIEW.seg=b.dataset.seg; USER_VIEW.limit=25; USER_VIEW.showDormant=false; redrawUserList(); });
  const ib=$('u-internal'); if(ib) ib.onclick=()=>toggleInternal();
  const more=$('u-more'); if(more) more.onclick=()=>{ USER_VIEW.limit+=50; redrawUserList(); };
  const fold=$('u-fold'); if(fold) fold.onclick=()=>{ USER_VIEW.showDormant=!USER_VIEW.showDormant; redrawUserList(); };
  document.querySelectorAll('.utable tr.clickable, .urow').forEach(r=>r.onclick=()=>openUser(r.dataset.uid));
  document.querySelectorAll('[data-recon]').forEach(b=>b.onclick=()=>openReconcile(b.dataset.recon, b.dataset.prod, b.dataset.exp));
}

// Deep-linkable: paste a UID from a support email straight into the address bar.
function openUser(uid){ USER_VIEW.uid=uid; location.hash='#/user/'+uid; renderUsersTab(); }
function closeUser(){ USER_VIEW.uid=null; location.hash=''; renderUsersTab(); }

function openReconcile(tx, prod, exp){
  openModal('Reconcile purchase', `
    <div class="field"><label>Transaction ID</label><input value="${esc(tx)}" disabled></div>
    <div class="field"><label>Product</label><input value="${esc(prod||'')}" id="rc-prod"></div>
    <div class="field"><label>Grant to user (Firebase UID)</label><input id="rc-uid" placeholder="paste the buyer's UID"></div>
    <div class="qsub">Grants Pro, creates the missing transaction mapping (so future renew/refund/expire attribute automatically), and clears the queue item.</div>
    <label class="qsub" style="display:flex;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" id="rc-force" style="width:auto"> Force — reassign a transaction that already belongs to another account</label>
    <button class="btn-primary" id="rc-run" style="margin-top:14px">Grant Pro & reconcile</button><div class="result" id="rc-result"></div>`);
  $('rc-run').onclick=async()=>{
    const uid=$('rc-uid').value.trim(); if(!uid){ $('rc-result').textContent='Enter a UID.'; return; }
    $('rc-run').disabled=true; $('rc-result').textContent='Reconciling…';
    try{
      await call('adminReconcilePurchase')({ originalTransactionId: tx, uid, productId: $('rc-prod').value.trim()||undefined, expiresDate: exp||undefined, force: $('rc-force').checked });
      $('rc-result').textContent='Done — Pro granted.'; toast('Purchase reconciled');
      PENDING=null; USERS=null; $('modal').hidden=true; renderUsersTab();
    }catch(e){ $('rc-run').disabled=false; $('rc-result').textContent=e.message; }
  };
}

// ---------- user detail ----------
function kv(label,val){ if(val==null||val===''||val==='—') return ''; return `<div><div class="l">${esc(label)}</div><div class="v">${esc(val)}</div></div>`; }
function card(title, inner){ if(!inner||!inner.trim()) return ''; return `<div class="section-t">${esc(title)}</div><div class="card">${inner}</div>`; }

// recentPRs carries a `type` (distance / duration / weight) that the old renderer
// ignored, so a run PR printed as 7.458048477315103.
function prValue(pr){
  const v=Number(pr.value); if(!Number.isFinite(v)) return esc(String(pr.value??'—'));
  switch(String(pr.type||'').toLowerCase()){
    case 'distance': return v.toFixed(2)+' km';
    case 'duration': return Math.round(v)+' min';
    case 'weight':   return (Math.round(v*10)/10)+' kg';
    case 'reps':     return Math.round(v)+' reps';
    default:         return String(Math.round(v*100)/100);
  }
}

function renderOnboarding(ud,up){
  const p=ud.workoutPreferences||{};
  const kg=v=>v==null?null:Math.round(Number(v)*10)/10+' kg';
  const list=v=>Array.isArray(v)&&v.length?v.join(', '):null;
  const rows=[
    kv('Name', ud.userName||up.name), kv('Age', ud.age), kv('Sex', ud.biologicalSex),
    kv('Experience', ud.experienceLevel), kv('Activity level', ud.activityLevel),
    kv('Primary goal', p.primaryGoal||ud.fitnessGoal), kv('Goal intensity', ud.goalIntensity),
    kv('Current weight', kg(ud.currentWeightKg)), kv('Goal weight', kg(ud.goalWeightKg)),
    kv('Split', p.splitType), kv('Days / week', p.daysPerWeek),
    kv('Preferred days', list(p.preferredDays)),
    kv('Diet', ud.dietType), kv('Allergies', list(ud.foodAllergies)),
    kv('Dietary prefs', list(ud.dietaryPreferences)),
    kv('Coaching style', ud.coachingStyle),
  ].join('');
  return rows?`<div class="detail-grid">${rows}</div>`:'';
}

// coachingContexts is full of generated content; the old view showed four fields of it.
function renderAIRead(cc){
  const blk=(label,val)=>{
    if(!val) return '';
    const text=Array.isArray(val)?val.filter(Boolean).join(' · '):String(val);
    if(!text.trim()) return '';
    return `<div class="airow"><div class="l">${esc(label)}</div><div class="qsub">${esc(text)}</div></div>`;
  };
  return [
    blk('Strengths', cc.strengthsAnalysis),
    blk('Areas to improve', cc.areasToImprove),
    blk('Recommended focus', cc.recommendedFocus),
    blk('Pattern insights', cc.patternInsights),
    blk('Wow moments', cc.wowMoments),
    blk('Predictions', cc.predictions),
    blk('Strength level', cc.estimatedStrengthLevel),
    blk('Weekday vs weekend', cc.weekdayVsWeekendPattern),
    blk('Nutrition consistency', cc.nutritionConsistency),
    blk('Nutrition insights', cc.nutritionInsights),
    blk('Motivation', cc.motivationalContext),
    blk('Last daily message', cc.dailyNotificationMessage),
  ].join('');
}

// A page of zeroes with no explanation reads as broken. Distinguish "no data" from
// "never uploaded any" — especially for a payer, where it's a signal in itself.
function neverSynced(docs){
  const ud=docs.userData;
  return !ud || !Object.keys(ud).length;
}
function renderRich(docs){
  const ud=docs.userData||{}, cc=docs.coachingContexts||{}, up=docs.userProfiles||{};
  const rw=Array.isArray(ud.recentWorkouts)?ud.recentWorkouts.slice(0,8):[];
  const rwTable=rw.length?`<table><thead><tr><th>Workout</th><th>Type</th><th class="text-center">Min</th><th class="text-center">When</th></tr></thead><tbody>${rw.map(w=>`<tr><td>${esc(w.workoutName||'—')}</td><td>${esc(w.activityType||'—')}</td><td class="text-center">${num(w.durationMinutes)||'—'}</td><td class="text-center">${w.daysAgo!=null?num(w.daysAgo)+'d':esc((w.date||'').slice(0,10))}</td></tr>`).join('')}</tbody></table>`:'';
  const prs=Array.isArray(ud.recentPRs)?ud.recentPRs.slice(0,8):[];
  const prList=prs.length?`<div class="prlist">${prs.map(pr=>`<div><span>${esc(pr.exerciseName||'—')}</span><b>${esc(prValue(pr))}</b></div>`).join('')}</div>`:'';
  const nutrition=[
    kv('Target calories', num(ud.targetCalories)||null), kv('Target protein', ud.targetProtein!=null?num(ud.targetProtein)+'g':null),
    kv('Avg protein', ud.avgDailyProtein!=null?num(ud.avgDailyProtein)+'g':null),
    kv('Avg carbs', ud.avgDailyCarbs!=null?num(ud.avgDailyCarbs)+'g':null),
    kv('Avg calories', num(ud.avgDailyCalories)||null),
    kv('Days logged food', num(ud.daysLoggedFood)||null),
  ].join('');
  const topFoods=Array.isArray(ud.topFoods)&&ud.topFoods.length
    ? `<div class="qsub" style="margin-top:12px">Top foods: ${ud.topFoods.slice(0,8).map(f=>esc(typeof f==='string'?f:(f.name||f.foodName||''))).filter(Boolean).join(', ')}</div>`:'';
  const aiRead=renderAIRead(cc);
  return card('Onboarding & profile', renderOnboarding(ud,up))
    + card('Personal records', prList)
    + card('Recent workouts', rwTable)
    + card('Nutrition', nutrition?`<div class="detail-grid">${nutrition}</div>${topFoods}`:'')
    + (aiRead?`<div class="section-t">What the AI says about them</div><div class="card">${aiRead}</div>`:'');
}

function renderAIActivity(a){
  if(!a) return '<div class="card"><div class="qsub d">Loading AI activity…</div></div>';
  const icon={insight:'✦',meal_photo:'◉',text_food:'✎'};
  const rows=(a.recent||[]).slice(0,15);
  const body=rows.length?`<div class="feed">${rows.map(r=>`<div class="row"><span class="sev ${r.success?'':'crit'}"></span>
      <div style="flex:1;min-width:0">
        <div class="t">${esc(icon[r.kind]||'·')} ${esc(r.detail||r.kind.replace('_',' '))}</div>
        <div class="d">${esc(r.kind.replace('_',' '))}${r.foodsDetected!=null?` · ${num(r.foodsDetected)} item(s)`:''}${r.confidence!=null?` · ${Math.round(num(r.confidence)*100)}% conf`:''}${r.success?'':' · <span class="cr">failed</span>'}</div>
      </div><div class="d" style="white-space:nowrap">${r.at?ago(r.at):'—'}</div></div>`).join('')}</div>`
    : '<div class="qsub d">No AI activity recorded for this user.</div>';
  const c=a.counts||{};
  return `<div class="qsub" style="margin-bottom:10px">${num(c.insight)} insights · ${num(c.meal_photo)} photo scans · ${num(c.text_food)} text logs${a.truncated?' <span class="d">(capped)</span>':''}</div>
    ${body}
    <div class="note">Not captured anywhere server-side: ${esc((a.notCaptured||[]).join('; '))}.</div>`;
}

let AIACT = null;
let AUDIT = null, CONFIG = null;
async function renderUserDetail(uid){
  const m=$('main');
  const row = (USERS||[]).find(u=>u.uid===uid) || {};
  m.innerHTML='<div class="loading">Loading user…</div>';
  let r; try{ r=(await call('adminLookupUser')({uid})).data; }catch(e){ m.innerHTML='<div class="loading cr">'+esc(e.message)+'</div>'; return; }
  const a=r.auth, sup=r.support||{};
  const isGuest=(row.type||'')==='guest' || (a && a.providers && a.providers.length===0);
  // Nobody with months of history is "Unknown". Guests have no name by definition —
  // say what they are and lead with what IS known.
  const name = a?.displayName || row.name || (isGuest ? 'Anonymous account' : 'No name on file');
  const pushOff = sup.hasPushToken===false;

  m.innerHTML=`
    <button class="back-link" id="u-back">← All users</button>
    <div class="card">
      <div class="idtop">
        <div class="uav lg ${row.atRisk?'risk':(num(row.workouts)>0?'hot':'')}">${esc(initials(row))}</div>
        <div style="flex:1;min-width:0">
          <div class="big sm" style="margin:0">${esc(name)}</div>
          <div class="qsub mono" style="overflow-wrap:anywhere">${esc(a?.email||uid)}</div>
          <div class="idchips">
            ${row.internal?'<span class="chip-s internal">internal</span>':''}
            <span class="chip-s ${esc(row.access||'free')}">${esc(row.access||'free')}</span>
            ${(row.flags||[]).map(f=>`<span class="chip-s ${flagClass(f)}">${esc(f)}</span>`).join('')}
          </div>
        </div>
      </div>

      ${row.atRisk?`<div class="warnline"><b>${num(row.workouts)} workouts and ${num(row.daysOnPlan)} days of history on an anonymous account.</b>
        A reinstall loses all of it — and this is the most convertible kind of account you have.</div>`:''}

      <div class="qa" style="margin-top:14px">
        <button class="btn" data-ua="extendTrial"><span class="i">＋</span> Comp / extend trial</button>
        <button class="btn" data-ua="sendPush" ${pushOff?'disabled title="No push token on file — this user cannot be reached"':''}><span class="i">✉</span> ${pushOff?'Send push · unreachable':'Send push'}</button>
        <button class="btn" data-ua="forceRefresh"><span class="i">↻</span> Force AI refresh</button>
        <button class="btn" data-ua="internal"><span class="i">${row.internal?'✓':'⊘'}</span> ${row.internal?'Unmark internal':'Mark internal'}</button>
        ${row.nonUserReason==='automated test session'?`<button class="btn" data-ua="untest"><span class="i">↺</span> Not a test session</button>`:''}
      </div>

      <div class="detail-grid" style="margin-top:16px">
        <div><div class="l">Joined</div><div class="v">${a?.createdAt?ago(a.createdAt):'—'}</div></div>
        <div><div class="l">Last active</div><div class="v">${row.lastActive?ago(row.lastActive):'—'}</div></div>
        <div><div class="l">Last synced</div><div class="v">${sup.lastSyncedAt?ago(sup.lastSyncedAt):'—'}</div></div>
        <div><div class="l">Push</div><div class="v ${pushOff?'wn':''}">${pushOff?'No token':'Reachable'}</div></div>
        <div><div class="l">App version</div><div class="v">${sup.appVersion?esc(sup.appVersion)+(sup.buildNumber?' <span class="d">('+esc(sup.buildNumber)+')</span>':''):'<span class="d">not reported</span>'}</div></div>
        <div><div class="l">Device</div><div class="v">${esc(sup.deviceModel||'—')}${sup.iosVersion?' <span class="d">· iOS '+esc(sup.iosVersion)+'</span>':''}</div></div>
        <div><div class="l">Language</div><div class="v">${esc(sup.language||'—')}</div></div>
        <div><div class="l">Timezone</div><div class="v">${esc(sup.timezone||'—')}</div></div>
        <div><div class="l">AI spend</div><div class="v">${money(row.aiCost||0)} · ${num(row.aiCalls)} calls</div></div>
        <div><div class="l">Paid product</div><div class="v mono">${esc((row.paidProduct||'—').replace('com.qwota.pro.',''))}</div></div>
      </div>
    </div>

    <div class="section-t">Engagement</div>
    <div class="pulsegrid">
      <div class="pcard"><div class="pl">Workouts</div><div class="pn">${num(row.workouts)}</div><div class="pd">${num(row.workoutsThisWeek)} this week</div></div>
      <div class="pcard"><div class="pl">Adherence</div><div class="pn">${num(row.adherence)?num(row.adherence)+'%':'—'}</div><div class="pd">${num(row.streak)}-day streak</div></div>
      <div class="pcard"><div class="pl">Avg session</div><div class="pn">${num(row.avgSessionMinutes)||'—'}</div><div class="pd">minutes · ${num(row.daysOnPlan)}d on plan</div></div>
    </div>

    ${neverSynced(r.docs) ? `<div class="card" style="margin-top:16px;border-color:rgba(74,158,255,.35)">
        <div class="qlabel" style="color:var(--info)"><span class="tick" style="background:var(--info)"></span>Nothing synced yet</div>
        <div class="qsub" style="margin-top:8px">This account has no <span class="mono">userData</span> on the server, so there is no profile, workout history or AI context to show. Everything lives on-device until the app uploads it${row.access==='paid'||row.access==='lifetime'?' — worth a look, since this account has paid':''}.</div>
      </div>` : renderRich(r.docs)}

    <div class="section-t">AI activity</div>
    <div id="aiact">${renderAIActivity(AIACT)}</div>

    <div class="section-t">Everything else</div>
    <details class="card"><summary>Raw records — which Firestore documents exist</summary>
      <table style="margin-top:10px"><tbody>${Object.entries(r.docs).map(([c,v])=>`<tr><td>${esc(c)}</td><td class="text-center">${v?(Array.isArray(v)?v.length+' record(s)':'<span class="ok">present</span>'):'<span class="d">—</span>'}</td></tr>`).join('')}</tbody></table>
    </details>
    <div style="height:10px"></div>`;

  $('u-back').onclick=closeUser;
  document.querySelectorAll('[data-ua]').forEach(b=>b.onclick=async()=>{
    const act=b.dataset.ua;
    if(act==='internal'){ try{ await call('adminSetInternal')({uid, internal: !row.internal}); toast(row.internal?'Unmarked internal':'Marked internal'); load(); }catch(e){ toast(e.message,true); } return; }
    // The test-session flag is set by the CLIENT (automation announces itself), so anyone
    // who can sign in could mark themselves and vanish from every chart. This is the way
    // back — without it a mis-flagged account is invisible with no remedy.
    if(act==='untest'){ try{ await call('adminSetTestSession')({uid, testSession:false}); toast('Restored to real users'); load(); }catch(e){ toast(e.message,true); } return; }
    openAction(act); const el=$('a-uid'); if(el) el.value=uid;
  });

  // AI activity loads after the page paints — it's the slowest query and the least urgent.
  if(!AIACT || AIACT.uid!==uid){
    try{ AIACT=(await call('adminUserAIActivity')({uid})).data; }catch{ AIACT={uid,counts:{},recent:[],notCaptured:[]}; }
    const host=$('aiact'); if(host) host.innerHTML=renderAIActivity(AIACT);
  }
}

// ---------- actions / wiring ----------
function wire(){
  wireCharts();
  document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>openAction(b.dataset.act));
  document.querySelectorAll('[data-tri]').forEach(el=>{
    const h=el.querySelector('.tri-h'); if(h) h.onclick=()=>el.classList.toggle('open');
  });
  document.querySelectorAll('[data-prov]').forEach(b=>b.onclick=()=>openProvenance(b.dataset.prov));
  document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{
    try{ await navigator.clipboard.writeText(b.dataset.copy); toast('URL copied'); }
    catch{ toast('Copy failed — select it manually', true); }
  });
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{
    if(b.dataset.filter) USER_VIEW.type=b.dataset.filter;
    TAB=b.dataset.go; render();
  });
  document.querySelectorAll('[data-act2]').forEach(b=>b.onclick=()=>openAction(b.dataset.act2));
  document.querySelectorAll('[data-test]').forEach(b=>b.onclick=()=>runPipelineTest(b));
}

// Run the alert's own check and report what actually came back, rather than
// leaving the operator to infer a cause the console can't see.
async function runPipelineTest(btn){
  const box = btn.closest('.tri-b').querySelector('.tri-result');
  btn.disabled=true; const label=btn.textContent; btn.textContent='Testing…';
  box.innerHTML = '<div class="tri-r neutral">Probing the endpoint…</div>';
  try{
    const r = (await call('adminTestPipeline')({ which: btn.dataset.test })).data;
    const cls = r.verdict==='delivering' ? 'ok' : r.verdict==='endpoint_problem' ? 'bad' : 'neutral';
    box.innerHTML = `<div class="tri-r ${cls}"><b>${esc(
      r.verdict==='delivering' ? 'Delivering' :
      r.verdict==='endpoint_problem' ? 'Endpoint problem' : 'Healthy, nothing received yet')}</b><br>${esc(r.detail)}
      <br><span class="d">HTTP ${num(r.endpoint&&r.endpoint.status)} · ${num(r.loggedEvents)} event(s) logged</span></div>`;
  }catch(e){ box.innerHTML = '<div class="tri-r bad">'+esc(e.message)+'</div>'; }
  btn.disabled=false; btn.textContent=label;
}

// Every headline number can explain itself. The console's value is that these are
// reconciled — showing the derivation is what makes that claim checkable.
const PROVENANCE = {
  users: ()=>({ t:'Registered users', v:num(DATA.users.registered),
    p:`Firebase Auth is the source of truth, not a Firestore collection. <b>${num(DATA.users.guests)} guests</b> are counted separately — they are anonymous auth records, not registrations.${DATA.users.internalExcluded?` <b>${num(DATA.users.internalExcluded)} internal accounts</b> are hidden.`:''}`,
    s:'auth.listUsers()\n  where providerData includes "apple.com"\n  minus config/adminSettings.internalUids' }),
  activation: ()=>({ t:'Activation', v:(DATA.users.registered>0?Math.round((DATA.northStar.activatedUsers/DATA.users.registered)*100):0)+'%',
    p:`<b>${num(DATA.northStar.activatedUsers)} of ${num(DATA.users.registered)}</b> registered users have logged at least one workout. Guests are excluded from both sides so the denominator matches the numerator.`,
    s:'userData.totalWorkouts > 0\n  ∩ classified "registered"\n  ÷ registered' }),
  mrr: ()=>({ t:'MRR estimate', v:money(DATA.money.mrrEstimate),
    p:`<b>${num(DATA.money.payingCount)} active payers.</b> Monthly at full price, yearly ÷ 12; lifetime is one-time and contributes nothing. A purchase counts only while the buyer is still entitled — ${num(DATA.money.churnedCount)} churned ${num(DATA.money.churnedCount)===1?'payer is':'payers are'} excluded.`,
    s:'transactionMappings\n  where environment == "Production"\n  and status != "revoked"\n  ∩ notificationPreferences.isPro == true' })
};
function openProvenance(key){
  const f=PROVENANCE[key]; if(!f) return;
  let d; try{ d=f(); }catch{ return; }
  const el=document.createElement('div');
  el.className='sheet';
  el.innerHTML=`<div class="sheet-c">
    <div class="sheet-t">${esc(d.t)}</div><div class="sheet-v">${esc(d.v)}</div>
    <p class="sheet-p">${d.p}</p><div class="sheet-s">${esc(d.s)}</div>
    <div class="acts" style="margin-top:14px"><button class="ab p">Got it</button></div></div>`;
  const close=()=>el.remove();
  el.onclick=(e)=>{ if(e.target===el) close(); };
  el.querySelector('.ab').onclick=close;
  document.body.appendChild(el);
}

function openModal(title, bodyHtml){ $('modal-title').textContent=title; $('modal-body').innerHTML=bodyHtml; $('modal').hidden=false; }
function closeModal(){ $('modal').hidden=true; }

function openAction(act){
  if(act==='findUser'){ TAB='users'; render(); return; }
  const forms={
    extendTrial:{title:'Comp / extend reverse trial', fields:`<div class="field"><label>User UID</label><input id="a-uid"></div><div class="field"><label>Days to add</label><input id="a-days" type="number" value="30"></div><div class="qsub">Added on top of any time the user has left — never shortens an existing comp.</div>`, run:async()=>{const r=await call('adminExtendReverseTrial')({uid:$('a-uid').value.trim(),days:+$('a-days').value}); return (r.data.extendedFromExisting?'Added to existing trial — now expires ':'Trial set to expire ')+String(r.data.expiresAt).slice(0,10);}},
    forceRefresh:{title:'Force AI deep-context refresh', fields:`<div class="field"><label>User UID</label><input id="a-uid"></div>`, run:async()=>{await call('adminForceRefresh')({uid:$('a-uid').value.trim()}); return 'Refresh complete.';}},
    sendPush:{title:'Send a push to one user', fields:`<div class="field"><label>User UID</label><input id="a-uid"></div><div class="field"><label>Title</label><input id="a-title"></div><div class="field"><label>Body</label><textarea id="a-body"></textarea></div>`, run:async()=>{await call('adminSendUserPush')({uid:$('a-uid').value.trim(),title:$('a-title').value,body:$('a-body').value}); return 'Push sent.';}},
    snapshot:{title:'Snapshot metrics now', fields:`<div class="qsub">Writes today's row to the <span class="mono">metrics</span> series that powers the sparklines and deltas. The scheduled job runs nightly at 04:05 UTC — use this to seed the series or verify the job.</div>`, run:async()=>{const r=await call('adminSnapshotNow')({}); return 'Snapshot written for '+r.data.date;}},
    flag:{title:'Set a feature flag', fields:`<div class="field"><label>Key</label><input id="a-key" value="reverseTrialEnabled"></div><div class="field"><label>Value</label><select id="a-val"><option value="true">true</option><option value="false">false</option></select></div>`, run:async()=>{const r=await call('adminSetFeatureFlag')({key:$('a-key').value.trim(),value:$('a-val').value==='true'}); return 'Set '+r.data.key+' = '+r.data.value;}},
  };
  const f=forms[act]; if(!f) return;
  openModal(f.title, f.fields+`<button class="btn-primary" id="a-run" style="margin-top:6px">Run</button><div class="result" id="a-result"></div>`);
  $('a-run').onclick=async()=>{ const btn=$('a-run'); btn.disabled=true; btn.textContent='Running…'; try{ const msg=await f.run(); $('a-result').innerHTML='<span class="ok">'+esc(msg)+'</span>'; toast(msg); load(); }catch(e){ $('a-result').innerHTML='<span class="cr">'+esc(e.message)+'</span>'; } finally{ btn.disabled=false; btn.textContent='Run'; } };
}

// ---------- boot ----------
$('signin-btn').onclick=async()=>{ $('signin-error').textContent=''; try{ await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }catch(e){ $('signin-error').textContent=e.message; } };
$('signout').onclick=()=>auth.signOut();
$('refresh').onclick=load;
function toggleInternal(){
  INCLUDE_INTERNAL=!INCLUDE_INTERNAL;
  const btn=$('internal-toggle');
  if(btn){ btn.textContent=INCLUDE_INTERNAL?'Incl. internal':'Real users only'; btn.classList.toggle('on',INCLUDE_INTERNAL); }
  USERS=null; USER_VIEW.uid=null; USER_VIEW.limit=25;
  load();
}
$('internal-toggle').onclick=toggleInternal;
$('modal-close').onclick=closeModal;
$('modal').onclick=(e)=>{ if(e.target===$('modal')) closeModal(); };
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{ TAB=b.dataset.tab; render(); });

// Deep link: #/user/<uid> should open that person on a cold load, so a UID pasted
// from a support email works as a URL. Writing the hash without reading it back was
// only half the feature.
function routeFromHash(){
  const m = /^#\/user\/([A-Za-z0-9_-]{6,})$/.exec(location.hash||'');
  if(m){ TAB='users'; USER_VIEW.uid=m[1]; return true; }
  return false;
}
window.addEventListener('hashchange', ()=>{
  const wanted = /^#\/user\/([A-Za-z0-9_-]{6,})$/.exec(location.hash||'');
  const uid = wanted ? wanted[1] : null;
  if(uid !== USER_VIEW.uid){ USER_VIEW.uid = uid; if(uid) TAB='users'; render(); }
});

auth.onAuthStateChanged((user)=>{
  if(user && user.uid===ADMIN_UID){ $('signin').hidden=true; $('shell').hidden=false; routeFromHash(); load(); }
  else if(user){ $('signin-error').textContent='This account is not an admin.'; auth.signOut(); }
  else { $('signin').hidden=false; $('shell').hidden=true; }
});
