// Users tab — phone-first (2026-10). Loaded after admin.js and uses its globals:
// esc, num, ago, money, eng, trained, toast, armed, openAction, openModal, call, load, safeRender,
// USERS, USER_VIEW, SEGMENTS, segTest, initials, rowSignal, trialLeft, flagClass, renderPending,
// renderUserCharts, wireCharts, openUser, closeUser, openReconcile, prValue, PENDING, APPSTORE.
//
// The one rule carried over from the old page: an unknown is never drawn as a zero. Every value
// that can be missing renders "—" with the reason (old app version / not synced / never heard from).

const NEEDS_APP = '2.3.20';
// Extra views the phone list offers alongside the existing segments.
if(!SEGMENTS.some(s=>s.k==='trial3')){
  SEGMENTS.splice(3, 0,
    { k:'trial3', label:'Trial ≤3d', test:u=>real(u) && u.access==='trial' && u.trialDaysLeft!=null && u.trialDaysLeft<=3 },
    { k:'new7',   label:'New 7d',    test:u=>real(u) && !!u.createdAt && Date.now()-Date.parse(u.createdAt) < 7*86400000 });
}
USER_VIEW.sort = USER_VIEW.sort || 'active';
USER_VIEW.tab = USER_VIEW.tab || 'overview';
let PROFILE = null;          // { uid, data } from adminUserProfile
let PROFILE_ERR = null;

// ---------- small pieces ----------
function liveClass(u){
  const t=Date.parse(u.lastActive||'');
  if(!Number.isFinite(t)) return 'n';
  const h=(Date.now()-t)/3600000;
  return h<=24?'g':h<=168?'y':'r';
}
function stageOf(u){
  if(u.movedTo) return {k:'moved', t:'moved'};
  if(u.type==='guest' && !['paid','lifetime','trial','comped'].includes(u.access)) return {k:'guest', t:'guest'};
  return {k:u.access||'free', t:u.access||'free'};
}
function stageChip(u){ const s=stageOf(u); return `<span class="st2 st2-${esc(s.k)}">${esc(s.t)}</span>`; }
function shortDevice(m){
  if(!m) return null;
  const x=String(m);
  if(/^(arm64|x86_64|i386)$/i.test(x)) return 'Simulator';
  return x.replace(/^iPhone/,'iPhone ').replace(/,/, '.');
}
function spark(w, asOf){
  if(!Array.isArray(w) || w.length!==4) return '';
  const max=Math.max(1,...w);
  return `<span class="spark2" title="Workouts per week, last 4 weeks${asOf?' · as of '+esc(String(asOf).slice(0,10)):''}">${
    w.map(v=>`<i style="height:${Math.max(8,Math.round(num(v)/max*100))}%${num(v)?'':';opacity:.25'}"></i>`).join('')}</span>`;
}
function workoutsCell(u){
  if(eng(u)>0) return String(eng(u));
  if(u.authoredInApp===true) return '?';
  if(u.observable!==true) return '—';
  return '0';
}
function mealsCell(u){ return u.loggedMeals==null ? '—' : String(num(u.loggedMeals)); }
function adhCell(u){ return u.adherence==null ? '—' : num(u.adherence)+'%'; }

// ---------- list (L1 smart cards) ----------
async function renderUsersTab(){
  const m = $('main');
  if(USER_VIEW.uid){ return renderUserDetail(USER_VIEW.uid); }
  if(!USERS){
    m.innerHTML = '<div class="loading">Loading users…</div>';
    try{ const r=(await call('adminUsers')({ includeInternal: INCLUDE_INTERNAL })).data; USERS=r.users; USERS_HIDDEN=num(r.internalHidden); USERS_NONREAL=num(r.nonUserCount); USERS_REASONS=r.nonUserReasons||{}; }
    catch(e){ m.innerHTML = '<div class="loading cr">'+esc(e.message)+'</div>'; return; }
  }
  if(PENDING===null){ try{ PENDING = (await call('adminListPendingPurchases')({})).data.items; }catch{ PENDING = []; } }
  m.innerHTML = renderPending() + '<div id="u-list">' + renderUserList() + '</div>';
  wireUsers();
}
function redrawUserList(){
  const host = $('u-list'); if(!host) return renderUsersTab();
  host.innerHTML = renderUserList();
  wireUsers();
}
function sortRows(rows){
  const by=USER_VIEW.sort;
  const t=(u)=>{ const x=Date.parse(u.lastActive||''); return Number.isFinite(x)?x:-Infinity; };
  if(by==='trial') return rows.slice().sort((a,b)=>num(a.trialExpiresAt, Infinity)-num(b.trialExpiresAt, Infinity));
  if(by==='workouts') return rows.slice().sort((a,b)=>eng(b)-eng(a));
  return rows.slice().sort((a,b)=>t(b)-t(a));
}
function userCard(u){
  const dev=shortDevice(u.deviceModel);
  const meta=[u.language?esc(u.language):null, dev?esc(dev):null, u.appVersion?'v'+esc(u.appVersion):null,
    u.lastActive?ago(u.lastActive):(u.observable===false?'never heard from':null)].filter(Boolean).join(' · ');
  const tl=u.access==='trial' && u.trialDaysLeft!=null ? Math.max(0,Math.min(1,num(u.trialDaysLeft)/7)) : null;
  return `<button class="ucard${u.internal?' internal-row':''}" data-uid="${esc(u.uid)}">
    <span class="uc-h"><span class="uav2">${esc(initials(u))}<span class="live ${liveClass(u)}"></span></span>
      <span class="uc-mid"><span class="uc-nm">${esc(u.name||(u.type==='guest'?'Anonymous':'No name'))} ${stageChip(u)}</span>
      <span class="uc-sub">${meta||esc(u.email||u.uid.slice(0,14)+'…')}</span></span></span>
    <span class="uc-meta"><span><b>${esc(workoutsCell(u))}</b> workouts</span><span><b>${esc(mealsCell(u))}</b> meals</span><span><b>${esc(adhCell(u))}</b> adh.</span>${spark(u.weeks4, u.weeksAsOf)}</span>
    ${tl!=null?`<span class="uc-cd"><i style="width:${Math.round(tl*100)}%"></i></span>`:''}
    <span class="uc-sig${u.atRisk?' c':(u.access==='trial'&&num(u.trialDaysLeft,99)<=3?' w':'')}">${esc(rowSignal(u))}</span>
  </button>`;
}
function renderUserList(){
  const q = USER_VIEW.q.trim().toLowerCase();
  const seg = USER_VIEW.seg;
  const matchesQ = (u)=>!q || ((u.email||'')+' '+(u.name||'')+' '+u.uid).toLowerCase().includes(q);
  const pool = q ? USERS.filter(u=>matchesQ(u) && (seg==='nonuser' ? !real(u) : real(u))) : USERS.filter(segTest(seg));
  const rows = sortRows(pool);
  const shown = rows.slice(0, USER_VIEW.limit);
  const cnt = (k)=>USERS.filter(segTest(k)).length;
  const dormant = (!q && seg==='look') ? USERS.filter(u=>real(u) && u.type==='guest' && !trained(u)) : [];
  const sortLabel={active:'Last active', trial:'Trial ending', workouts:'Workouts'}[USER_VIEW.sort];
  return `<div class="utoolbar"><input id="u-search" placeholder="Search name / email / UID" value="${esc(USER_VIEW.q)}"></div>
  <div class="uviews"${q?' style="opacity:.45" title="Views do not apply while searching"':''}>
    ${SEGMENTS.filter(sg=>sg.k!=='nonuser').map(sg=>`<button class="uview${!q&&seg===sg.k?' on':''}" data-seg="${esc(sg.k)}">${esc(sg.label)}<b>${cnt(sg.k)}</b></button>`).join('')}
    <button class="uview${INCLUDE_INTERNAL?' on':''}" id="u-internal">Internal${USERS_HIDDEN&&!INCLUDE_INTERNAL?'<b>'+USERS_HIDDEN+'</b>':''}</button>
    <button class="uview${seg==='nonuser'?' on':''}" data-seg="nonuser" style="opacity:.6">Not people<b>${cnt('nonuser')}</b></button>
  </div>
  <div class="usort"><button id="u-sort" class="lnk">Sorted by ${esc(sortLabel)} ▾</button><span>${q?`${rows.length} match${rows.length===1?'':'es'} of ${USERS.length}`:`${rows.length} shown`}</span></div>
  <div class="ugrid">${shown.length?shown.map(userCard).join(''):'<div class="card"><div class="qsub d">No users match.</div></div>'}</div>
  ${rows.length>shown.length?`<button class="loadmore" id="u-more">Showing ${shown.length} of ${rows.length} · Load more</button>`:''}
  ${dormant.length?`<button class="fold" id="u-fold">${USER_VIEW.showDormant?'▾':'▸'} <b>${dormant.length} dormant guests</b> — anonymous, no activity</button>
    ${USER_VIEW.showDormant?`<div class="ugrid" style="margin-top:7px">${dormant.slice(0,50).map(userCard).join('')}</div>`:''}`:''}
  ${q?'':`<details class="card" style="margin-top:14px"><summary>Population &amp; workouts per account</summary><div style="margin-top:10px">${renderUserCharts()}</div></details>`}`;
}
function wireUsers(){
  wireCharts();
  const s=$('u-search'); if(s){ s.oninput=(e)=>{ USER_VIEW.q=e.target.value; USER_VIEW.limit=25; redrawUserList(); const n=$('u-search'); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } }; }
  document.querySelectorAll('.uview[data-seg]').forEach(b=>b.onclick=()=>{ USER_VIEW.seg=b.dataset.seg; USER_VIEW.limit=25; USER_VIEW.showDormant=false; redrawUserList(); });
  const ib=$('u-internal'); if(ib) ib.onclick=()=>toggleInternal();
  const so=$('u-sort'); if(so) so.onclick=()=>{ const order=['active','trial','workouts']; USER_VIEW.sort=order[(order.indexOf(USER_VIEW.sort)+1)%order.length]; redrawUserList(); };
  const more=$('u-more'); if(more) more.onclick=()=>{ USER_VIEW.limit+=50; redrawUserList(); };
  const fold=$('u-fold'); if(fold) fold.onclick=()=>{ USER_VIEW.showDormant=!USER_VIEW.showDormant; redrawUserList(); };
  document.querySelectorAll('.ucard').forEach(r=>r.onclick=()=>{ USER_VIEW.tab='overview'; openUser(r.dataset.uid); });
  document.querySelectorAll('[data-recon]').forEach(b=>b.onclick=()=>openReconcile(b.dataset.recon, b.dataset.prod, b.dataset.exp));
}

// ---------- verdict (H3) — a pure function, first match wins ----------
function lastActiveMs(row){ const t=Date.parse(row.lastActive||''); return Number.isFinite(t)?t:null; }
function activeWithin(row, days){ const t=lastActiveMs(row); return t!=null && Date.now()-t <= days*86400000; }
function lastComeBackAt(prof){
  const p=(prof&&prof.pushes)||[];
  const hit=p.find(x=>x.kind==='reengagement');
  return hit?hit.at:null;
}
function verdictFor(row, prof){
  if(row.movedTo || (prof&&prof.movedTo)) return {k:'moved', text:'Moved to their account', sub:'This guest signed in with Apple; the person lives on the new account.', action:{kind:'open', uid:row.movedTo||prof.movedTo, label:'Open account'}};
  if(row.nonUser) return {k:'nonuser', text:'Test or review account', sub:row.nonUserReason||'', action:null};
  if(row.observable===false) return {k:'unheard', text:'Not heard from yet', sub:'No heartbeat from this account — activity is unknown, not zero.', action:null};
  if(row.observable==null) return {k:'unknown', text:'Activity unavailable right now', sub:'The activity read failed; nothing below is a zero.', action:null};
  if((row.flags||[]).includes('entitled-no-purchase')) return {k:'entitled', text:'Entitled without a purchase', sub:'Pro on the server with no verified purchase or trial.', action:{kind:'tab', tab:'account', label:'Check account'}};
  if(row.access==='churned') return {k:'churned', text:'Cancelled — was paying', sub:`Last active ${ago(row.lastActive)}.`, action:{kind:'push', label:'Send a push', title:'We miss you', body:''}};
  if(row.type==='guest' && trained(row)) return {k:'atrisk', text:'Guest with history — not on an account', sub:engagementClaim(row)+'. A reinstall without an account loses it.', action:{kind:'push', label:'Push: back it up', title:'Keep your progress safe', body:'Sign in with Apple in Settings so your workouts are backed up.'}};
  const tdl=row.trialDaysLeft;
  if(row.access==='trial' && tdl!=null && tdl<=3 && activeWithin(row,7)) return {k:'convert', text:'Likely to convert', sub:`Trial ends in ${tdl} day${tdl===1?'':'s'} · active ${ago(row.lastActive)}.`, action:{kind:'push', label:'Send "keep Pro" nudge', title:'Your Pro trial ends soon', body:'Keep your progress, plans and coach — tap to see your options.'}};
  if(row.access==='trial' && tdl!=null && tdl<=3) return {k:'unused', text:'Trial unused', sub:`Trial ends in ${tdl} day${tdl===1?'':'s'} and they haven't been active this week.`, action:{kind:'extend', label:'Extend 7 days', days:7}};
  const paying = row.access==='paid' || row.access==='lifetime';
  const t=lastActiveMs(row);
  if(paying && t!=null && Date.now()-t > 14*86400000) return {k:'quiet-paying', text:'Paying but gone quiet', sub:`Last active ${ago(row.lastActive)}.`, action:{kind:'push', label:'Send a push', title:'', body:''}};
  if(row.lapsed){
    const cb=lastComeBackAt(prof);
    const recent=cb && Date.now()-Date.parse(cb) < 7*86400000;
    return {k:'lapsed', text:'Lapsed', sub:`Last active ${ago(row.lastActive)}.${cb?` Auto come-back nudge sent ${ago(cb)}.`:''}`, action: recent?null:{kind:'push', label:'Push: come back', title:'', body:''}};
  }
  if(row.silent) return {k:'silent', text:"Hasn't started", sub:'Signed up, never logged a workout here.', action:{kind:'push', label:'Send a push', title:'', body:''}};
  if(activeWithin(row,7)) return {k:'good', text:'Doing well', sub:`Active ${ago(row.lastActive)}.`, action:null};
  return {k:'quiet', text:'Quiet', sub:row.lastActive?`Last active ${ago(row.lastActive)}.`:'', action:null};
}
function stepsFor(row, prof){
  const act=(prof&&prof.docs&&prof.docs.userActivity)||{};
  const known=row.observable===true;
  const onboarded = act.onboardingCompleted===true || (num(act.onboardingStep)>0 && num(act.onboardingStep)>=num(act.onboardingTotal,99));
  return [
    {k:'Onboarded', s: onboarded?'ok':(known?'no':'unk')},
    {k:'First workout', s: trained(row)?'ok':(known?'no':'unk')},
    {k:'Food', s: num(row.loggedMeals)>0?'ok':(row.loggedMeals==null?'unk':'no')},
    {k:'AI', s: num(row.aiCalls)>0?'ok':'no'},
    {k:'Paid', s: (row.access==='paid'||row.access==='lifetime')?'ok':'no'},
  ];
}

// ---------- telemetry helpers (per install → one view) ----------
function installsOf(prof){ const t=prof&&prof.docs&&prof.docs.userTelemetry; return t&&t.installs?Object.values(t.installs):[]; }
function currentInstall(prof){ return installsOf(prof).slice().sort((a,b)=>num(b.updatedAt)-num(a.updatedAt))[0]||null; }
function sumCounts(prof, key){
  const out={};
  for(const i of installsOf(prof)) for(const [k,v] of Object.entries(i[key]||{})) out[k]=(out[k]||0)+num(v);
  const ret=prof&&prof.docs&&prof.docs.userTelemetry&&prof.docs.userTelemetry.retired;
  if(ret) for(const [k,v] of Object.entries(ret[key]||{})) out[k]=(out[k]||0)+num(v);
  return out;
}
function allVisits(prof){ return installsOf(prof).flatMap(i=>i.visits||[]).sort((a,b)=>String(b.start).localeCompare(String(a.start))); }
function allBillRecent(prof){ return installsOf(prof).flatMap(i=>i.billRecent||[]).sort((a,b)=>String(b.at).localeCompare(String(a.at))); }
function hasTelemetry(prof){ return installsOf(prof).length>0; }
function needsApp(row){ return `<div class="qsub d">Needs app ${NEEDS_APP} — ${row.appVersion?'this person runs '+esc(row.appVersion):'no app version reported yet'}.</div>`; }

// ---------- profile ----------
async function renderUserDetail(uid){
  const m=$('main');
  m.innerHTML='<div class="loading">Loading user…</div>';
  if(!USERS){
    try{ const r=(await call('adminUsers')({ includeInternal: INCLUDE_INTERNAL })).data; USERS=r.users; USERS_HIDDEN=num(r.internalHidden); USERS_NONREAL=num(r.nonUserCount); USERS_REASONS=r.nonUserReasons||{}; }
    catch(e){ m.innerHTML='<div class="loading cr">Could not load the account list: '+esc(e.message)+'</div>'; return; }
  }
  const row=(USERS||[]).find(u=>u.uid===uid) || null;
  if(!PROFILE || PROFILE.uid!==uid){
    try{ PROFILE={uid, data:(await call('adminUserProfile')({uid})).data}; PROFILE_ERR=null; }
    catch(e){ PROFILE=null; PROFILE_ERR=e.message; }
  }
  if(!PROFILE){ m.innerHTML=`<button class="back-link" id="u-back">← All users</button><div class="loading cr">${esc(PROFILE_ERR||'Could not load this user')}</div>`; $('u-back').onclick=closeUser; return; }
  const prof=PROFILE.data;
  const r=row || {uid, observable:null, flags:[], access:'free', type:'registered'};
  const a=prof.auth||{};
  const isGuest=r.type==='guest' || (a.providers && a.providers.length===0);
  const name=a.displayName || r.name || (isGuest?'Anonymous account':'No name on file');
  const v=verdictFor(r, prof);
  const dev=shortDevice(r.deviceModel);
  const tabs=[['overview','Overview'],['activity','Activity'],['training','Training'],['food','Food'],['ai','AI'],['account','Account']];
  const tab=tabs.some(t=>t[0]===USER_VIEW.tab)?USER_VIEW.tab:'overview';
  const steps=stepsFor(r, prof);

  m.innerHTML=`
    <button class="back-link" id="u-back">← All users</button>
    <div class="hero2 hv-${esc(v.k)}">
      <div class="uc-h"><span class="uav2 lg">${esc(initials(r))}<span class="live ${liveClass(r)}"></span></span>
        <span class="uc-mid"><span class="uc-nm lg">${esc(name)} ${stageChip(r)}</span>
        <span class="uc-sub">${[r.lastActive?'active '+ago(r.lastActive):null, r.language?esc(r.language):null, dev?esc(dev):null, r.appVersion?'v'+esc(r.appVersion):null].filter(Boolean).join(' · ')||esc(a.email||uid)}</span></span></div>
      <div class="verdict"><b>${esc(v.text)}.</b> <span>${esc(v.sub||'')}</span></div>
      <div class="steps">${steps.map(s=>`<i class="sp-${s.s}" title="${esc(s.k)}"></i>`).join('')}</div>
      <div class="steps-l">${steps.map(s=>`<span class="sp-${s.s}">${s.s==='ok'?'✓':s.s==='no'?'✕':'?'} ${esc(s.k)}</span>`).join('')}</div>
      <div class="uc-meta big"><span><b>${esc(workoutsCell(r))}</b> workouts</span><span><b>${esc(mealsCell(r))}</b> meals</span><span><b>${esc(adhCell(r))}</b> adh.</span><span><b>${r.streak!=null?num(r.streak):'—'}</b> streak</span></div>
      <div class="hero-acts">${v.action?`<button class="btn-primary hero-go" id="v-go">${esc(v.action.label)}</button>`:''}<button class="btn more" id="v-more">⋯</button></div>
      <div class="more-menu" id="more-menu" hidden>
        <button class="btn" data-ua="extendTrial">＋ Comp / extend trial</button>
        <button class="btn" data-ua="sendPush" ${prof.support&&prof.support.hasPushToken===false?'disabled title="No push token on file"':''}>✉ Send push</button>
        <button class="btn" data-ua="forceRefresh">↻ Force AI refresh</button>
        <button class="btn" data-ua="note">✎ Add note</button>
        <button class="btn" data-ua="internal">${r.internal?'✓ Unmark internal':'⊘ Mark internal'}</button>
        ${r.nonUserReason==='automated test session'?'<button class="btn" data-ua="untest">↺ Not a test session</button>':''}
      </div>
    </div>
    <div class="ptabs2">${tabs.map(([k,l])=>`<button class="ptab2${k===tab?' on':''}" data-ptab="${k}">${l}</button>`).join('')}</div>
    <div id="ptab-body">${renderProfileTab(tab, r, prof)}</div>
    <div style="height:14px"></div>`;
  wireProfile(uid, r, prof, v);
}

function wireProfile(uid, r, prof, v){
  $('u-back').onclick=()=>{ PROFILE=null; closeUser(); };
  document.querySelectorAll('[data-ptab]').forEach(b=>b.onclick=()=>{
    USER_VIEW.tab=b.dataset.ptab;
    document.querySelectorAll('.ptab2').forEach(x=>x.classList.toggle('on', x===b));
    $('ptab-body').innerHTML=renderProfileTab(USER_VIEW.tab, r, prof);
    wireTab(uid, r, prof);
  });
  const more=$('v-more'); if(more) more.onclick=()=>{ const mm=$('more-menu'); mm.hidden=!mm.hidden; };
  const go=$('v-go'); if(go) go.onclick=()=>runVerdictAction(uid, v.action);
  document.querySelectorAll('[data-ua]').forEach(b=>b.onclick=async()=>{
    const act=b.dataset.ua;
    if(act==='note'){ USER_VIEW.tab='overview'; renderUserDetail(uid); setTimeout(()=>{ const t=$('note-text'); if(t) t.focus(); }, 50); return; }
    if(act==='internal' || act==='untest'){
      if(!armed(b)) return;
      try{
        if(act==='internal'){ await call('adminSetInternal')({uid, internal: !r.internal}); toast(r.internal?'Unmarked internal':'Marked internal'); }
        else { await call('adminSetTestSession')({uid, testSession:false}); toast('Restored to real users'); }
        PROFILE=null; load();
      }catch(e){ toast(e.message,true); }
      return;
    }
    openAction(act); const el=$('a-uid'); if(el) el.value=uid;
  });
  wireTab(uid, r, prof);
}
function runVerdictAction(uid, act){
  if(!act) return;
  if(act.kind==='open'){ PROFILE=null; openUser(act.uid); return; }
  if(act.kind==='tab'){ USER_VIEW.tab=act.tab; renderUserDetail(uid); return; }
  if(act.kind==='extend'){ openAction('extendTrial'); const u=$('a-uid'); if(u) u.value=uid; const d=$('a-days'); if(d) d.value=String(act.days||7); return; }
  if(act.kind==='push'){ openAction('sendPush'); const u=$('a-uid'); if(u) u.value=uid; const t=$('a-title'); if(t && act.title) t.value=act.title; const b=$('a-body'); if(b && act.body) b.value=act.body; }
}
function wireTab(uid, r, prof){
  const add=$('note-add');
  if(add) add.onclick=async()=>{
    const t=$('note-text'); const text=(t&&t.value||'').trim(); if(!text) return;
    add.disabled=true;
    try{ await call('adminAddNote')({uid, text}); toast('Note saved'); PROFILE=null; renderUserDetail(uid); }
    catch(e){ toast(e.message,true); add.disabled=false; }
  };
  document.querySelectorAll('[data-del-note]').forEach(b=>b.onclick=async()=>{
    if(!armed(b)) return;
    try{ await call('adminDeleteNote')({uid, noteId:b.dataset.delNote}); toast('Note deleted'); PROFILE=null; renderUserDetail(uid); }
    catch(e){ toast(e.message,true); }
  });
  document.querySelectorAll('[data-copy-uid]').forEach(b=>b.onclick=async()=>{
    try{ await navigator.clipboard.writeText(b.dataset.copyUid); toast('UID copied'); }catch{ toast('Copy failed — select it manually', true); }
  });
}

function box(title, inner, right){ if(!inner||!String(inner).trim()) return ''; return `<div class="box2"><div class="bt2">${esc(title)}${right?`<span>${right}</span>`:''}</div>${inner}</div>`; }
function kvs(pairs){ const rows=pairs.filter(p=>p && p[1]!=null && p[1]!=='' ); if(!rows.length) return ''; return `<div class="kv2">${rows.map(([l,v])=>`<span class="l">${esc(l)}</span><span class="v">${v}</span>`).join('')}</div>`; }
const D='<span class="d">—</span>';
const nice=(s)=>String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());

function renderProfileTab(tab, r, prof){
  try{
    if(tab==='activity') return tabActivity(r, prof);
    if(tab==='training') return tabTraining(r, prof);
    if(tab==='food') return tabFood(r, prof);
    if(tab==='ai') return tabAI(r, prof);
    if(tab==='account') return tabAccount(r, prof);
    return tabOverview(r, prof);
  }catch(e){ return `<div class="card"><div class="qsub cr">Could not draw this tab: ${esc(e.message)}</div></div>`; }
}

// ---- Overview (O1): journey + notes ----
function tabOverview(r, prof){
  const docs=prof.docs||{}, act=docs.userActivity||{}, prefs=docs.notificationPreferences||{}, a=prof.auth||{};
  const cur=currentInstall(prof);
  const ev=[];
  if(a.createdAt) ev.push({at:a.createdAt, t:'Account created', s:(a.providers&&a.providers.length?'Signed in with '+a.providers.join(', ').replace('apple.com','Apple'):'Guest')+(prof.previousUids&&prof.previousUids.length?` · came from ${prof.previousUids.length} guest account${prof.previousUids.length>1?'s':''}`:'')});
  const f=(prof.funnel||[])[0];
  if(f){ const st=f.stages||{}; const order=['opened','getStarted','name','apple','guest','identity']; const reached=order.filter(k=>st[k]);
    if(reached.length) ev.push({at:st[reached[0]], t:'Welcome screens', s:reached.map(nice).join(' → ')}); }
  if(act.onboardingStep!=null || act.onboardingCompleted) ev.push({at:null, t:act.onboardingCompleted?'Onboarding finished':`Onboarding stopped at step ${num(act.onboardingStep)} of ${num(act.onboardingTotal)}`, s:[act.onboardingFlow?nice(act.onboardingFlow)+' flow':null, act.onboardingStepName?'furthest: '+nice(act.onboardingStepName):null].filter(Boolean).join(' · '), ok:!!act.onboardingCompleted});
  const bi=act.billIntro;
  if(bi){ const dp=bi.datePick; const pick=dp==null?null:(dp===-1?'chose "Not yet"':dp===0?'picked today':`picked a day ${dp} day${dp===1?'':'s'} out`);
    ev.push({at:null, t:"Kettle Bill's intro", s:[bi.reachedStep?'reached '+nice(bi.reachedStep):null, pick, bi.mealLogged?'logged a meal':(bi.mealSent?'answered the meal question':null), bi.endReason?'ended: '+nice(bi.endReason):null, bi.seconds!=null?num(bi.seconds)+'s':null].filter(Boolean).join(' · '), ok:bi.endReason==='letsGo'}); }
  const tour=act.tourFirstRun;
  if(tour) ev.push({at:null, t:'Guided tour', s:`${(tour.stepsShown||[]).length} of ${num(tour.total)} steps · ${nice(tour.endReason||'unknown')}${tour.lastStepID?' · last: '+esc(tour.lastStepID):''}`, ok:tour.endReason==='completed'});
  const fw=installsOf(prof).map(i=>i.firstWorkoutAt).filter(Boolean).sort()[0];
  const fm=installsOf(prof).map(i=>i.firstMealAt).filter(Boolean).sort()[0];
  if(fw) ev.push({at:fw, t:'First workout logged in Qwota'});
  else if(act.lastWorkoutAt){
    // lastWorkoutAt counts Apple Health imports too, so say what's actually on record.
    const inApp=r.loggedInApp, imp=r.importedWorkouts;
    const what = inApp!=null ? `${num(inApp)} logged in Qwota${imp?` · ${num(imp)} from Apple Health`:''}` : 'count by source unknown on this app version';
    ev.push({at:null, t:'Workouts on record', s:`${what} · latest ${ago(act.lastWorkoutAt)} · first date needs app ${NEEDS_APP}`, ok: inApp==null?undefined:num(inApp)>0});
  }
  if(fm) ev.push({at:fm, t:'First meal logged'}); else if(act.lastMealAt) ev.push({at:null, t:'Has logged meals', s:'last '+ago(act.lastMealAt)});
  if(prefs.reverseTrialStartedAt) ev.push({at:prefs.reverseTrialStartedAt, t:`Pro trial started${prefs.reverseTrialDays?' · '+num(prefs.reverseTrialDays)+' days':''}`, s:prefs.reverseTrialCohort?nice(prefs.reverseTrialCohort)+' cohort':''});
  if(prefs.reverseTrialExpiresAt) ev.push({at:prefs.reverseTrialExpiresAt, t:Date.parse(prefs.reverseTrialExpiresAt)>Date.now()?'Trial ends':'Trial ended'});
  for(const t of (prof.transactions||[])) if(t.purchaseDate) ev.push({at:t.purchaseDate, t:`Purchased ${esc(String(t.productId||'').replace('com.qwota.pro.',''))}`, s:[t.environment, t.refunded?'refunded':null, t.status==='revoked'?'revoked':null].filter(Boolean).join(' · '), ok:true});
  for(const w of (prof.webhooks||[]).slice(0,10)) if(w.type && !/INITIAL_PURCHASE/.test(w.type)) ev.push({at:w.at, t:nice(String(w.type).toLowerCase().replace(/_/g,' ')), s:String(w.productId||'').replace('com.qwota.pro.','')});
  if(r.lapsed) ev.push({at:r.lastActive, t:'Went quiet', s:'no activity for 21+ days'});
  // Normalise every time to ISO first: Auth returns RFC-1123 strings ("Mon, 27 Jul 2026 …"),
  // which sort as text in the wrong place. Unparseable times drop to the untimed group.
  for(const e of ev){ if(e.at){ const t=Date.parse(e.at); e.at=Number.isFinite(t)?new Date(t).toISOString():null; } }
  // Timed events in order; untimed ones (onboarding, intro, tour) slot in after account creation.
  const timed=ev.filter(e=>e.at).sort((x,y)=>String(x.at).localeCompare(String(y.at)));
  const untimed=ev.filter(e=>!e.at);
  const ordered=timed.length?[timed[0], ...untimed, ...timed.slice(1)]:untimed;
  const journey=ordered.length?`<div class="journey2">${ordered.map(e=>`<div class="js2"><span class="dt2 ${e.ok===false?'y':'g'}"></span><div>${esc(e.t)}${e.s?`<div class="w">${esc(e.s)}</div>`:''}${e.at?`<div class="w">${esc(String(e.at).slice(0,16).replace('T',' '))}</div>`:''}</div></div>`).join('')}</div>`:'<div class="qsub d">Nothing recorded yet.</div>';

  const notes=(docs.adminNotes&&docs.adminNotes.notes)||[];
  const notesHtml=`${notes.slice().reverse().map(n=>`<div class="note2">${esc(n.text)}<div class="w">${esc(String(n.at||'').slice(0,10))} <button class="lnk" data-del-note="${esc(n.id)}">delete</button></div></div>`).join('')}
    <textarea id="note-text" maxlength="1000" rows="2" placeholder="Support facts only. No health guesses."></textarea>
    <button class="btn" id="note-add" style="margin-top:6px">＋ Add note</button>`;
  return box('Journey', journey, cur&&cur.asOf?'':'') + box('Notes', notesHtml, notes.length?String(notes.length):'');
}

// ---- Activity (A2): by visit ----
const TAB_ICON={home:'🏠', workouts:'🏋', nutrition:'🍽', trainer:'🧠', profile:'👤', bill:'💬'};
const PUSH_LABEL={dailySummary:'daily summary', weeklySummary:'weekly summary', reengagement:'come-back nudge', adminPush:'your push', insight:'insight', trialReminder:'trial reminder', reminder:'reminder', weeklyRecapLocal:'weekly recap', workoutTimer:'workout timer', other:'notification'};
const SERVER_KINDS=['dailySummary','weeklySummary','reengagement','adminPush'];
function tabActivity(r, prof){
  const visits=allVisits(prof);
  if(!visits.length){
    const cur=currentInstall(prof);
    if(cur && cur.days30 && cur.days30.length) return box('Days with activity', daysList(cur.days30), 'as of '+esc(String(cur.asOf||'').slice(0,10))) + box('Visits', needsApp(r));
    return box('Visits', needsApp(r));
  }
  const since=prof.pushesSince;
  const sent=(prof.pushes||[]).filter(p=>!since || String(p.at)>=since).length;
  const opened=visits.filter(v=>SERVER_KINDS.includes(v.push) && !v.guessed && (!since || String(v.start)>=since)).length;
  const head=prof.pushes==null?'Push history unavailable right now':(sent?`Opened ${Math.min(opened,sent)} of ${sent} of our pushes${since?' since '+esc(String(since).slice(0,10)):''} (approx.)`:'We haven\'t sent them a push');
  const outside=installsOf(prof).reduce((s,i)=>s+num(i.outsideVisitsW),0);
  let lastDay='';
  const rows=visits.map(v=>{
    const day=String(v.start).slice(0,10);
    const dh=day!==lastDay?`<div class="day2">${esc(day)}</div>`:''; lastDay=day;
    const did=[v.w?`🏋 ${num(v.w)} workout${v.w==1?'':'s'}`:null, v.m?`🍽 ${num(v.m)} meal${v.m==1?'':'s'}`:null, v.bill?`💬 ${num(v.bill)} to Bill`:null].filter(Boolean).join(' · ');
    const min=num(v.sec)>=60?Math.round(num(v.sec)/60)+' min':num(v.sec)+' s';
    return `${dh}<div class="sess2"><div class="sh">${esc(String(v.start).slice(11,16))} <span>${esc(min)}${v.est?' (est.)':''}${v.push?' · from '+esc(PUSH_LABEL[v.push]||v.push)+(v.guessed?' (guessed)':''):''}</span></div>
      <div class="it">${(v.tabs||[]).map(t=>`<span title="${esc(t)}">${TAB_ICON[t]||'·'}</span>`).join(' → ')||'<span class="d">tabs not recorded</span>'}</div>${did?`<div class="it">${did}</div>`:''}</div>`;
  }).join('');
  return `<div class="qsub" style="margin:0 2px 8px">${head}${outside?` · ${outside} workout${outside===1?'':'s'} finished outside a visit (Watch / Live Activity)`:''}</div>` + rows;
}
function daysList(days){
  return `<div class="kv2">${days.slice().reverse().map(d=>`<span class="l">${esc(d.d)}</span><span class="v">${[d.s?d.s+' strength':null, d.r?d.r+' run':null, d.o?d.o+' other':null, d.m?d.m+' meals':null].filter(Boolean).join(' · ')||'—'}</span>`).join('')}</div>`;
}
function grid14(days, key){
  if(!days) return '';
  const set=new Map(days.map(d=>[d.d, d]));
  const cells=[];
  const end=new Date();
  for(let i=13;i>=0;i--){ const dt=new Date(end.getTime()-i*86400000); const k=dt.toISOString().slice(0,10); const d=set.get(k);
    const v=d?(key==='m'?num(d.m):num(d.s)+num(d.r)+num(d.o)):0; cells.push(`<i class="${v>1?'b':v>0?'a':''}" title="${esc(k)}: ${v}"></i>`); }
  return `<div class="heat2">${cells.join('')}</div>`;
}

// ---- Training (T3) ----
function tabTraining(r, prof){
  const docs=prof.docs||{}, up=(docs.userProfiles||{}), p=up.userProfile||{}, wp=up.workoutPreferences||(docs.userData||{}).workoutPreferences||{}, ud=docs.userData||{};
  const kg=v=>v==null?null:Math.round(num(v)*10)/10+' kg';
  const list=v=>Array.isArray(v)&&v.length?v.map(nice).join(', '):null;
  const prof1=kvs([
    ['Goal', esc(nice(wp.primaryGoal||p.fitnessGoal||ud.fitnessGoal||''))||null],
    ['Experience', esc(nice(wp.experienceLevel||ud.experienceLevel||''))||null],
    ['Schedule', (wp.daysPerWeek||p.workoutsPerWeek)?`${num(wp.daysPerWeek||p.workoutsPerWeek)}/wk${wp.preferredDays&&wp.preferredDays.length?' · '+esc(wp.preferredDays.map(d=>nice(d).slice(0,3)).join(' ')):''}`:null],
    ['Split', esc(nice(wp.splitType||''))||null],
    ['Equipment', esc(nice(wp.gymType||''))||null],
    ['Injuries', esc(list(wp.injuryConsiderations)||'')||null],
    ['Avoids', esc(list(wp.avoidExercises)||'')||null],
    ['Weight', (p.weightKg||ud.currentWeightKg)?`${esc(kg(p.weightKg||ud.currentWeightKg))}${(p.goalWeightKg||ud.goalWeightKg)?' → '+esc(kg(p.goalWeightKg||ud.goalWeightKg)):''}`:null],
    ['Activity level', esc(nice(p.activityLevel||ud.activityLevel||''))||null],
    ['Coach style', esc(nice(ud.coachingStyle||''))||null],
  ]);
  const cur=currentInstall(prof);
  let pattern='';
  if(cur && cur.days30){
    const d14=cur.days30.filter(d=>Date.now()-Date.parse(d.d+'T12:00:00Z')<=14*86400000);
    const s=d14.reduce((a,d)=>a+num(d.s),0), rr=d14.reduce((a,d)=>a+num(d.r),0), o=d14.reduce((a,d)=>a+num(d.o),0);
    pattern=box('Last 14 days', grid14(cur.days30,'w')+`<div class="qsub">${s+rr+o} sessions · strength ${s} · runs ${rr} · other ${o}</div>`, 'as of '+esc(String(cur.asOf||'').slice(0,10)));
  } else pattern=box('Last 14 days', needsApp(r));
  const prs=Array.isArray(ud.recentPRs)?ud.recentPRs.slice(0,8):[];
  const prHtml=prs.length?kvs(prs.map(pr=>[pr.exerciseName||'—', esc(prValue(pr))])):'<div class="qsub d">Not synced (AI-coach accounts sync PRs).</div>';
  const rw=Array.isArray(ud.recentWorkouts)?ud.recentWorkouts.slice(0,6):[];
  const rwHtml=rw.length?kvs(rw.map(w=>[w.workoutName||nice(w.activityType)||'Workout', `${num(w.durationMinutes)}m · ${w.daysAgo===0?'today':num(w.daysAgo)+'d ago'}`])):'';
  return box('Who they are as a trainee', prof1||'<div class="qsub d">No training profile synced.</div>') + pattern + box('Personal records', prHtml) + box('Recent workouts', rwHtml);
}

// ---- Food (F3) ----
const METHOD_LABEL={quickAddText:'Quick add (text)', quickAddPhoto:'Photo scan', quickAddEdited:'Quick add, edited', form:'Food form', search:'Search', barcode:'Barcode (form)', barcodeScanner:'Barcode scanner', favorite:'Favorites', recent:'Recent', history:'History', mealBuilder:'Meal builder', relog:'Re-log', bill:'Kettle Bill', billIntro:"Bill's intro", coachSuggestion:'Coach suggestion', siri:'Siri', other:'Other'};
function tabFood(r, prof){
  const docs=prof.docs||{}, ud=docs.userData||{}, up=docs.userProfiles||{};
  const methods=sumCounts(prof,'foodMethods');
  const total=Object.values(methods).reduce((a,b)=>a+b,0);
  const removed=installsOf(prof).reduce((s,i)=>s+num(i.aiRemovedItems),0)+num((docs.userTelemetry&&docs.userTelemetry.retired&&docs.userTelemetry.retired.aiRemovedItems)||0);
  const ai=prof.ai||{}, fc=ai.failures||{}, cc=ai.counts||{};
  const scanFail=[['Photo scans', cc.meal_photo, fc.meal_photo], ['Text logs', cc.text_food, fc.text_food]].filter(x=>x[1]!=null);
  const how=hasTelemetry(prof)
    ? (total?`<div class="bars2">${Object.entries(methods).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="r"><span>${esc(METHOD_LABEL[k]||k)}</span><span class="tr"><i style="width:${Math.round(v/Math.max(...Object.values(methods))*100)}%"></i></span><span class="v">${v}</span></div>`).join('')}</div>
        <div class="qsub">${total} meals logged since app ${NEEDS_APP}${removed?` · removed ${removed} AI-suggested item${removed===1?'':'s'} before adding`:''}</div>`:'<div class="qsub d">No meals logged since app '+NEEDS_APP+'.</div>')
    : needsApp(r);
  const fails=scanFail.length?kvs(scanFail.map(([l,c,f])=>[l, `${num(c)} total${f!=null?` · ${num(f)} failed`:''}`])):'';
  const cur=currentInstall(prof);
  const consistency=cur&&cur.days30?box('Logging, last 14 days', grid14(cur.days30,'m')+`<div class="qsub">${cur.days30.filter(d=>num(d.m)>0 && Date.now()-Date.parse(d.d+'T12:00:00Z')<=14*86400000).length} of 14 days with food logged</div>`, 'as of '+esc(String(cur.asOf||'').slice(0,10))):'';
  const diet=kvs([
    ['Targets', ud.targetCalories?`${num(ud.targetCalories)} kcal${ud.targetProtein?' · P'+num(ud.targetProtein):''}`:null],
    ['Avg (14d)', ud.avgDailyCalories?`${num(ud.avgDailyCalories)} kcal · P${num(ud.avgDailyProtein)} C${num(ud.avgDailyCarbs)} F${num(ud.avgDailyFat)}`:null],
    ['Protein vs target', (ud.avgDailyProtein&&ud.targetProtein)?Math.round(num(ud.avgDailyProtein)/num(ud.targetProtein)*100)+'%':null],
    ['Days logged (14d)', ud.daysLoggedFood!=null?num(ud.daysLoggedFood):null],
    ['Diet', esc(nice(ud.dietType||''))||null],
    ['Allergies', Array.isArray(ud.foodAllergies)&&ud.foodAllergies.length?esc(ud.foodAllergies.join(', ')):null],
  ]);
  const top=Array.isArray(ud.topFoods)&&ud.topFoods.length?`<div class="qsub">${ud.topFoods.slice(0,8).map(f=>esc(typeof f==='string'?f:(f.name||f.foodName||''))).filter(Boolean).join(' · ')}</div>`:'';
  return box('How they log', how) + box('AI food calls', fails) + consistency + box('Diet & targets', diet||'<div class="qsub d">Not synced (AI-coach accounts sync nutrition).</div>') + box('Top foods', top);
}

// ---- AI (I3) ----
const TYPE_LABEL={createWorkout:'Built a workout', editWorkout:'Adjusted a workout', saveTemplate:'Saved a routine', logMeal:'Logged a meal', setNutritionGoals:'Changed nutrition goals', setGoals:'Changed goals', editFood:'Edited a food', editExerciseSet:'Edited a set', removeExercise:'Removed an exercise', connectHealth:'Apple Health prompt', navigate:'Opened a screen', setAppSetting:'Changed a setting', reviewMeal:'Meal to review', none:'Answered, no action', unparsed:'Action failed to load'};
const OUTCOME_LABEL={applied:'kept', undone:'undone', failed:'failed', opened:'opened', tapped:'tapped', offered:'offered'};
const ENTRY_LABEL={home:'from Home', workout:'from a workout', trainerTab:'from Trainer', nutrition:'from Nutrition', other:''};
function tabAI(r, prof){
  const docs=prof.docs||{}, cost=docs.aiCostTotals||{};
  const counts=sumCounts(prof,'billCounts');
  const tot=(o)=>Object.entries(counts).filter(([k])=>k.endsWith('.'+o)).reduce((a,[,v])=>a+v,0);
  const recent=allBillRecent(prof);
  const topics=hasTelemetry(prof)
    ? (recent.length?`<div class="tl2">${recent.slice(0,20).map(b=>`<div class="e"><span class="ei">${b.outcome==='undone'?'↩':b.outcome==='failed'?'✕':'💬'}</span><div>${esc(TYPE_LABEL[b.type]||b.type)} → <b>${esc(OUTCOME_LABEL[b.outcome]||b.outcome)}</b><div class="w">${esc(ago(b.at))}${b.entry&&ENTRY_LABEL[b.entry]?' · '+esc(ENTRY_LABEL[b.entry]):''}</div></div></div>`).join('')}</div>`:'<div class="qsub d">No Kettle Bill actions since app '+NEEDS_APP+'.</div>')
    : needsApp(r);
  const totals=hasTelemetry(prof)?kvs([['Turns with an action offered', String(tot('offered'))],['Kept', String(tot('applied'))],['Undone', String(tot('undone'))],['Failed', String(tot('failed'))]]):'';
  const surfaces=cost.surfaces?kvs(Object.entries(cost.surfaces).sort((a,b)=>num(b[1].costUsd)-num(a[1].costUsd)).map(([k,v])=>[nice(k.replace(/_/g,' ')), `${num(v.calls)} · ${money(v.costUsd)}`])):'';
  const ai=prof.ai||{};
  const recentCalls=(ai.recent||[]).slice(0,12);
  const calls=recentCalls.length?`<div class="tl2">${recentCalls.map(c=>`<div class="e"><span class="ei${c.success?'':' cr'}">${c.success?'◉':'✕'}</span><div>${esc(nice(String(c.kind).replace(/_/g,' ')))}${c.insightType?' · '+esc(nice(c.insightType)):''}${c.foodsDetected!=null?' · '+num(c.foodsDetected)+' item(s)':''}${c.success?'':' · <span class="cr">failed</span>'}<div class="w">${esc(ago(c.at))}</div></div></div>`).join('')}</div>`:'<div class="qsub d">No logged AI calls.</div>';
  return `<div class="kp2"><div class="k"><div class="l">AI calls</div><div class="v">${num(cost.callCount)}</div></div><div class="k"><div class="l">AI cost</div><div class="v">${money(cost.totalCostUsd)}</div></div></div>`
    + box('What they use Kettle Bill for', topics, 'topics only, never chat text') + box('Bill actions, all time', totals)
    + box('Cost by feature', surfaces) + box('Recent AI calls', calls, esc((ai.notCaptured||[])[0]||''));
}

// ---- Account (C1) ----
function tabAccount(r, prof){
  const docs=prof.docs||{}, prefs=docs.notificationPreferences||{}, act=docs.userActivity||{}, a=prof.auth||{}, sup=prof.support||{};
  const cur=currentInstall(prof), reach=(cur&&cur.reach)||{};
  const tx=prof.transactions||[];
  const ltv=tx.reduce((s,t)=>s+(t.priceMilliunits?num(t.priceMilliunits)/1000:0),0);
  const comps=(prof.audit||[]).filter(x=>x.action==='comp_trial');
  const yn=(v)=>v===true?'yes':v===false?'no':D;
  const access=kvs([
    ['Access', esc(r.access||'free')],
    ['Trial', prefs.reverseTrialExpiresAt?`${Date.parse(prefs.reverseTrialExpiresAt)>Date.now()?'ends ':'ended '}${esc(String(prefs.reverseTrialExpiresAt).slice(0,16).replace('T',' '))}${prefs.reverseTrialDays?' · '+num(prefs.reverseTrialDays)+'d':''}${prefs.reverseTrialCohort?' · '+esc(prefs.reverseTrialCohort):''}`:null],
    ['Purchases', tx.length?esc(tx.map(t=>String(t.productId||'').replace('com.qwota.pro.','')+(t.refunded?' (refunded)':'')).join(', ')):'none'],
    ['Lifetime value', tx.length?(ltv?money(ltv)+' <span class="d">(observed prices)</span>':'<span class="d">price not observed</span>'):'$0'],
    ['Comps', comps.length?esc(comps.map(c=>`${num(c.days)}d on ${String(c.at||'').slice(0,10)}`).join(', ')):'none'],
    ['Webhook events', (prof.webhooks||[]).length?esc(prof.webhooks.slice(0,4).map(w=>nice(String(w.type||'').toLowerCase().replace(/_/g,' '))).join(', ')):null],
  ]);
  const reachHtml=kvs([
    ['Push token', sup.hasPushToken?'<span class="ok">on file</span>':'<span class="wn">none</span>'],
    ['Notifications allowed', reach.pushAuth?esc(nice(reach.pushAuth)):(hasTelemetry(prof)?D:`<span class="d">needs ${NEEDS_APP}</span>`)],
    ['Daily summary', sup.dailySummaryEnabled?'on':'off'],
    ['Weekly summary', sup.weeklySummaryEnabled?'on':'off'],
    ['Come-back nudges', sup.reEngagementEnabled?'on':'off'],
    ['Reminders', reach.reminders!=null?String(num(reach.reminders)):D],
    ['Apple Health integration', yn(reach.healthIntegration)],
    ['Apple Watch', reach.watchPaired===true?(reach.watchAppInstalled===true?'paired · Qwota installed':reach.watchAppInstalled===false?'paired · app not installed':'paired'):reach.watchPaired===false?'none':D],
  ]);
  const device=kvs([
    ['App', r.appVersion?esc(r.appVersion)+(r.buildNumber?' ('+esc(r.buildNumber)+')':''):D],
    ['Device', r.deviceModel?esc(shortDevice(r.deviceModel))+(r.iosVersion?' · iOS '+esc(r.iosVersion):''):D],
    ['Language', r.language?esc(r.language):D],
    ['Timezone', sup.timezone?esc(sup.timezone):D],
    ['Last heartbeat', sup.lastSeenAt?ago(sup.lastSeenAt):D],
    ['Last sync', sup.lastSyncedAt?ago(sup.lastSyncedAt):D],
    ['Launches', r.sessionLaunches!=null?num(r.sessionLaunches)+(act.uncleanExits?` · ${num(act.uncleanExits)} unclean exits`:''):D],
    ['Installs', r.installCount!=null?num(r.installCount)+' <span class="d">(incl. reinstalls)</span>':D],
  ]);
  const ident=kvs([
    ['Sign-in', a.providers?(a.providers.length?esc(a.providers.join(', ').replace('apple.com','Apple')):'Guest'):'<span class="wn">no Auth record</span>'],
    ['Email', a.email?esc(a.email):null],
    ['Joined', a.createdAt?esc(String(a.createdAt).slice(5,25)):null],
    ['UID', `<span class="mono">${esc(r.uid.slice(0,10))}…</span> <button class="lnk" data-copy-uid="${esc(r.uid)}">copy</button>`],
    ['Guest uids moved in', prof.previousUids&&prof.previousUids.length?String(prof.previousUids.length):null],
    ['Internal', r.internal?'yes':'no'],
  ]);
  const raw=`<details><summary class="qsub">Raw records</summary><div class="kv2" style="margin-top:8px">${Object.entries(docs).map(([c,v])=>`<span class="l">${esc(c)}</span><span class="v">${v?'present':'<span class="d">none</span>'}</span>`).join('')}</div></details>`;
  return box('Access & money', access) + box('Reach', reachHtml) + box('Device', device) + box('Identity', ident+raw);
}
