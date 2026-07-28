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
let STALE = false;              // DATA is a last-good snapshot, not a fresh read
let INCLUDE_INTERNAL = false;   // exclude internal/test accounts by default
let USERS = null;               // cached adminUsers list
let USERS_HIDDEN = 0;           // internal accounts the server filtered out of that list
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
  try{
    const res = await call('adminConsole')({ includeInternal: INCLUDE_INTERNAL });
    DATA = res.data;
    STALE = false;
    $('updated').textContent = 'updated just now';
    const ok = DATA.reconcile.ok;
    const att = (DATA.needsAttention||[]).length;
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
  if(TAB==='cockpit'){ m.innerHTML = banner + renderCockpit(); wire(); }
  else if(TAB==='money'){ m.innerHTML = banner + renderMoney(); wire(); }
  else if(TAB==='health'){ m.innerHTML = banner + renderHealth(); wire(); }
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

function renderCockpit(){
  const d=DATA, u=d.users, ns=d.northStar, mo=d.money;
  const activationPct = u.registered>0 ? Math.round((ns.activatedUsers/u.registered)*100) : 0;
  const att = d.needsAttention||[];

  // Triage leads. Numbers are reference; alerts are the reason you opened this.
  const triage = att.length ? att.map((n,i)=>{
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

  return `
  <div class="section-t">Needs you${att.length?` · ${att.length}`:''}</div>
  ${triage}

  <div class="section-t">Pulse</div>
  <div class="pulsegrid">
    ${pcard('Users', num(u.registered), 'registered', 'var(--teal)', 'users')}
    ${pcard('Activation', activationPct+'%', 'activationPct', activationPct<25?'var(--crit)':'var(--teal)', 'activation')}
    ${pcard('MRR', money(mo.mrrEstimate), 'mrr', 'var(--teal)', 'mrr', v=>'$'+v.toFixed(2))}
  </div>
  <div class="qsub d" style="margin-top:8px">${num(u.guests)} guests · ${num(u.appUsers)} app users${u.internalExcluded?` · ${num(u.internalExcluded)} internal hidden`:''} · DAU ${num(d.active.dau)} · WAU ${num(d.active.wau)}</div>

  <div class="section-t">Activation funnel</div>
  <div class="card"><div class="funnel">
    ${d.funnel.map(f=>`<div class="fstage"><span class="nm">${esc(f.stage)}</span>
      <div class="ftrack"><div class="ffill${f.worst?' worst':''}" style="width:${Math.max(num(f.pct),2)}%"></div></div>
      <span class="v"><b>${num(f.count)}</b> · ${num(f.pct)}%</span>
      ${f.dropPct>0?`<span class="drop${f.worst?' worst':''}">↓ ${num(f.dropPct)}% drop from ${esc(f.from!=null?String(f.from):'')}${f.worst?' — the leak is here':''}</span>`:''}
    </div>`).join('')}
  </div></div>

  <div class="section-t">Do</div>
  <div class="qa">
    <button class="btn" data-act="findUser"><span class="i">◎</span> Find a user</button>
    <button class="btn" data-act="extendTrial"><span class="i">＋</span> Comp / extend trial</button>
    <button class="btn" data-act="forceRefresh"><span class="i">↻</span> Force AI refresh</button>
    <button class="btn" data-act="sendPush"><span class="i">✉</span> Send push</button>
    <button class="btn" data-act="flag"><span class="i">⚑</span> Feature flags</button>
    <button class="btn" data-act="snapshot"><span class="i">⧗</span> Snapshot metrics</button>
  </div>

  <div class="grid2" style="margin-top:22px">
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

function aiBars(rows){
  if(!rows||!rows.length) return '<div class="qsub d">No AI usage recorded</div>';
  const max=Math.max(...rows.map(r=>r.calls||0),1);
  return rows.map(r=>`<div class="brow"><span>${esc(r.surface)}</span><div class="track"><div class="fill" style="width:${Math.round((num(r.calls)/max)*100)}%"></div></div><span class="v">${num(r.calls)} · ${money(r.costUsd)}</span></div>`).join('');
}

function renderMoney(){
  const mo=DATA.money;
  return `
  <div class="grid3">
    <div class="card"><div class="qlabel">Paying (verified)</div><div class="big ok">${num(mo.payingCount)}</div><div class="qsub">active production purchases${num(mo.churnedCount)?` · <span class="d">${num(mo.churnedCount)} churned</span>`:''}</div></div>
    <div class="card"><div class="qlabel">MRR estimate</div><div class="big">${money(mo.mrrEstimate)}</div><div class="qsub">monthly + yearly/12 · lifetime one-time excluded · churn removed</div></div>
    <div class="card"><div class="qlabel">Entitled (isPro)</div><div class="big">${mo.entitledCount}${mo.unverifiedEntitledCount?`<span class="flag">${mo.unverifiedEntitledCount} unverified</span>`:''}</div><div class="qsub">${mo.unverifiedEntitledCount} have no production purchase (likely TestFlight/test)</div></div>
  </div>
  <div class="section-t">By product · production only</div>
  <div class="card"><table><thead><tr><th>Product</th><th class="text-center">Payers</th><th class="text-center">Price</th></tr></thead><tbody>
    ${Object.keys(mo.prices).map(p=>`<tr><td class="mono">${esc(p)}</td><td class="text-center">${mo.byProduct[p]||0}</td><td class="text-center">${money(mo.prices[p])}</td></tr>`).join('')}
  </tbody></table>${mo.sandboxTx?`<div class="note">${mo.sandboxTx} Sandbox transaction(s) excluded from revenue.</div>`:''}</div>
  <div class="section-t">Access breakdown</div>
  <div class="card"><div class="kpis">
    <div class="kpi"><div class="l">Paid</div><div class="n ok">${num(mo.payingCount)}</div></div>
    <div class="kpi"><div class="l">Churned</div><div class="n">${num(mo.churnedCount)}</div></div>
    <div class="kpi"><div class="l">Ever paid</div><div class="n">${num(mo.lifetimePayerCount)}</div></div>
    <div class="kpi"><div class="l">On reverse trial</div><div class="n">${num(mo.onReverseTrial)}</div></div>
    <div class="kpi"><div class="l">Entitled (incl. test)</div><div class="n">${num(mo.entitledCount)}</div></div>
  </div><div class="note">"Paying" and "entitled" are never summed — entitlement includes test/TestFlight and trials. A transaction only counts as revenue while the buyer is still entitled: refund/expire moves them to Churned and out of MRR.</div></div>`;
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
    try{ const r=(await call('adminUsers')({ includeInternal: INCLUDE_INTERNAL })).data; USERS=r.users; USERS_HIDDEN=num(r.internalHidden); }
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
const SEGMENTS = [
  { k:'look',    label:'Worth a look', test:u=>!(u.type==='guest' && !num(u.workouts)) },
  { k:'atrisk',  label:'At risk',      test:u=>!!u.atRisk },
  { k:'paid',    label:'Paying',       test:u=>u.access==='paid'||u.access==='lifetime' },
  { k:'lapsed',  label:'Lapsed',       test:u=>!!u.lapsed },
  { k:'silent',  label:'Never trained',test:u=>!!u.silent },
  { k:'all',     label:'Everyone',     test:()=>true },
];
const segTest = (k)=>(SEGMENTS.find(x=>x.k===k)||SEGMENTS[0]).test;

function initials(u){
  const n=(u.name||'').trim();
  if(!n) return '—';
  return n.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}
// What this row is worth knowing for, in one line.
function rowSignal(u){
  const w=num(u.workouts);
  if(!w) return u.type==='guest' ? 'no activity' : 'never trained';
  const bits=[w+' workout'+(w===1?'':'s')];
  if(num(u.adherence)) bits.push(num(u.adherence)+'% adherence');
  else if(num(u.streak)) bits.push(num(u.streak)+'-day streak');
  return bits.join(' · ');
}

function renderUserList(){
  const q = USER_VIEW.q.toLowerCase();
  const seg = USER_VIEW.seg;
  const matchesQ = (u)=>!q || ((u.email||'')+' '+(u.name||'')+' '+u.uid).toLowerCase().includes(q);
  // A search should look at everyone, not just the active segment — you're hunting a
  // specific person, not browsing.
  const pool = q ? USERS.filter(matchesQ) : USERS.filter(segTest(seg));
  const rows = pool;
  const shown = rows.slice(0, USER_VIEW.limit);
  const dormant = (!q && seg==='look') ? USERS.filter(u=>u.type==='guest' && !num(u.workouts)) : [];
  const cnt = (k)=>USERS.filter(segTest(k)).length;

  return `<div class="utoolbar">
    <input id="u-search" placeholder="Search name / email / UID" value="${esc(USER_VIEW.q)}">
  </div>
  <div class="fbar">
    ${SEGMENTS.map(sg=>`<button class="fpill${seg===sg.k?' on':''}" data-seg="${esc(sg.k)}">${esc(sg.label)} <span class="pc">${cnt(sg.k)}</span></button>`).join('')}
    <button class="fpill${INCLUDE_INTERNAL?' on':''}" id="u-internal">Internal${USERS_HIDDEN&&!INCLUDE_INTERNAL?' '+USERS_HIDDEN:''}</button>
  </div>
  ${q?`<div class="qsub d" style="margin:0 2px 10px">Searching all ${USERS.length} accounts · ${rows.length} match${rows.length===1?'':'es'}</div>`:''}

  <div class="ucards">
    ${shown.length?shown.map(u=>`<button class="urow ${u.internal?'internal-row':''}" data-uid="${esc(u.uid)}">
      <span class="uav ${u.atRisk?'risk':(num(u.workouts)>0?'hot':'')}">${esc(initials(u))}</span>
      <span class="umid"><span class="un">${esc(u.name||(u.type==='guest'?'Anonymous':'No name'))}</span>
        <span class="us">${esc(u.email||u.uid.slice(0,14)+'…')}</span>
        <span class="uw">${esc(rowSignal(u))}</span></span>
      <span class="uend"><span class="chip-s ${esc(u.access)}">${esc(u.access)}</span></span>
    </button>`).join(''):'<div class="card"><div class="qsub d">No users match.</div></div>'}
  </div>

  <div class="card" style="padding:0;overflow-x:auto"><table class="utable"><thead><tr>
    <th>User</th><th>Type</th><th>Access</th><th class="text-center">Workouts</th><th class="text-center">Adh.</th><th class="text-center">AI</th><th>Last active</th><th>Signals</th>
  </tr></thead><tbody>
    ${shown.map(u=>`<tr class="clickable ${u.internal?'internal-row':''}" data-uid="${esc(u.uid)}">
      <td><div class="uname">${esc(u.name||(u.type==='guest'?'Anonymous':'—'))}</div><div class="uemail">${esc(u.email||u.uid.slice(0,14))}</div></td>
      <td>${esc(u.type)}${u.internal?' <span class="chip-s internal">internal</span>':''}</td>
      <td><span class="chip-s ${esc(u.access)}">${esc(u.access)}</span></td>
      <td class="text-center ${num(u.workouts)>0?'':'d'}">${num(u.workouts)}</td>
      <td class="text-center ${num(u.adherence)?'':'d'}">${num(u.adherence)?num(u.adherence)+'%':'—'}</td>
      <td class="text-center">${num(u.aiCalls)}</td>
      <td>${u.lastActive?ago(u.lastActive):'—'}</td>
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
      </div>

      <div class="detail-grid" style="margin-top:16px">
        <div><div class="l">Joined</div><div class="v">${a?.createdAt?ago(a.createdAt):'—'}</div></div>
        <div><div class="l">Last active</div><div class="v">${row.lastActive?ago(row.lastActive):'—'}</div></div>
        <div><div class="l">Last synced</div><div class="v">${sup.lastSyncedAt?ago(sup.lastSyncedAt):'—'}</div></div>
        <div><div class="l">Push</div><div class="v ${pushOff?'wn':''}">${pushOff?'No token':'Reachable'}</div></div>
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

    ${renderRich(r.docs)}

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

auth.onAuthStateChanged((user)=>{
  if(user && user.uid===ADMIN_UID){ $('signin').hidden=true; $('shell').hidden=false; load(); }
  else if(user){ $('signin-error').textContent='This account is not an admin.'; auth.signOut(); }
  else { $('signin').hidden=false; $('shell').hidden=true; }
});
