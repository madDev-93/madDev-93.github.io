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

let DATA = null, TAB = 'cockpit';
let INCLUDE_INTERNAL = false;   // exclude internal/test accounts by default
let USERS = null;               // cached adminUsers list
let USER_VIEW = { uid: null, q: '', type: 'all' };
const $ = (id) => document.getElementById(id);

// ---------- helpers ----------
function toast(msg, isErr){ const t=$('toast'); t.textContent=msg; t.className='toast'+(isErr?' err':''); t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true, 3200); }
function ago(iso){ if(!iso) return '—'; const s=Math.floor((Date.now()-new Date(iso).getTime())/1000); if(s<60)return s+'s ago'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; }
function money(n){ return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

// ---------- data ----------
async function load(){
  $('main').innerHTML = '<div class="loading">Loading console…</div>';
  USERS = null; // internal-toggle may have changed; refetch on demand
  try{
    const res = await call('adminConsole')({ includeInternal: INCLUDE_INTERNAL });
    DATA = res.data;
    $('updated').textContent = 'updated just now';
    const ok = DATA.reconcile.ok;
    $('status').className = 'status'+(ok?'':' bad');
    $('status-text').textContent = ok ? 'All systems normal' : 'Reconcile invariant failed';
    render();
  }catch(e){ $('main').innerHTML = '<div class="loading cr">Failed to load: '+esc(e.message)+'</div>'; }
}

// ---------- render ----------
function render(){
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.tab===TAB));
  const m = $('main');
  if(TAB==='cockpit'){ m.innerHTML = renderCockpit(); wire(); }
  else if(TAB==='money'){ m.innerHTML = renderMoney(); wire(); }
  else if(TAB==='health'){ m.innerHTML = renderHealth(); wire(); }
  else if(TAB==='users'){ renderUsersTab(); }
}

function renderCockpit(){
  const d=DATA, u=d.users, ns=d.northStar, mo=d.money;
  const activationPct = u.registered>0 ? Math.round((ns.activatedUsers/u.registered)*100) : 0;
  const maxF = Math.max(...d.funnel.map(f=>f.count),1);
  return `
  <div class="grid3">
    <div class="card">
      <div class="qlabel"><span class="tick" style="background:var(--info)"></span> Users</div>
      <div class="big">${u.registered}<span style="font-size:15px;color:var(--mut);font-weight:600"> registered</span></div>
      <div class="qsub">${u.guests} guests · ${u.appUsers} app users${u.internalExcluded?` · <span class="d">${u.internalExcluded} internal hidden</span>`:''}</div>
    </div>
    <div class="card">
      <div class="qlabel"><span class="tick" style="background:var(--teal)"></span> North Star · activation</div>
      <div class="big ${activationPct<25?'cr':'ok'}">${activationPct}%</div>
      <div class="qsub">${ns.activatedUsers}/${u.registered} logged a workout · ${ns.totalWorkoutsAll} total · ${ns.avgWorkoutsPerWeek}/wk avg</div>
    </div>
    <div class="card">
      <div class="qlabel"><span class="tick" style="background:var(--warn)"></span> Money</div>
      <div class="big">${money(mo.mrrEstimate)}<span style="font-size:15px;color:var(--mut);font-weight:600"> MRR</span></div>
      <div class="qsub"><b class="ok" style="color:var(--tx)">${mo.payingCount} paying</b> · ${mo.entitledCount} entitled · ${mo.onReverseTrial} on trial</div>
    </div>
  </div>

  <div class="section-t">Activation funnel · % of registered</div>
  <div class="card"><div class="funnel">
    ${d.funnel.map(f=>`<div class="fstage"><span class="nm">${esc(f.stage)}</span>
      <div class="ftrack"><div class="ffill" style="width:${Math.max((f.count/maxF)*100,2)}%"></div></div>
      <span class="v"><b>${f.count}</b> · ${f.pct}%</span></div>`).join('')}
  </div></div>

  ${d.needsAttention.length?`<div class="section-t">Needs attention</div><div class="feed">
    ${d.needsAttention.map(n=>`<div class="row"><span class="sev ${esc(n.severity)}"></span><div><div class="t">${esc(n.title)}</div><div class="d">${esc(n.detail)}</div></div></div>`).join('')}
  </div>`:''}

  <div class="section-t">Operator actions</div>
  <div class="qa">
    <button class="btn" data-act="findUser"><span class="i">◎</span> Find a user</button>
    <button class="btn" data-act="extendTrial"><span class="i">＋</span> Comp / extend trial</button>
    <button class="btn" data-act="forceRefresh"><span class="i">↻</span> Force AI refresh</button>
    <button class="btn" data-act="sendPush"><span class="i">✉</span> Send push</button>
    <button class="btn" data-act="flag"><span class="i">⚑</span> Feature flags</button>
  </div>

  <div class="grid2" style="margin-top:22px">
    <div class="card">
      <div class="qlabel">AI usage · ${d.ai.totalCalls} calls · ${money(d.ai.totalCostUsd)}</div>
      <div class="bars">${aiBars(d.ai.bySurface)}</div>
    </div>
    <div class="card">
      <div class="qlabel">Reverse trial</div>
      <div class="kpis" style="margin-top:12px">
        <div class="kpi"><div class="l">24h</div><div class="n">${mo.reverseTrial.grantsDay}</div></div>
        <div class="kpi"><div class="l">7 days</div><div class="n">${mo.reverseTrial.grantsWeek}</div></div>
        <div class="kpi"><div class="l">active now</div><div class="n">${mo.reverseTrial.activeNow}</div></div>
      </div>
      <div class="note">Active: ${esc(d.active.method)} — DAU ${d.active.dau}, WAU ${d.active.wau}</div>
    </div>
  </div>`;
}

function aiBars(rows){
  if(!rows||!rows.length) return '<div class="qsub d">No AI usage recorded</div>';
  const max=Math.max(...rows.map(r=>r.calls||0),1);
  return rows.map(r=>`<div class="brow"><span>${esc(r.surface)}</span><div class="track"><div class="fill" style="width:${Math.round((r.calls/max)*100)}%"></div></div><span class="v">${r.calls} · ${money(r.costUsd)}</span></div>`).join('');
}

function renderMoney(){
  const mo=DATA.money;
  return `
  <div class="grid3">
    <div class="card"><div class="qlabel">Paying (verified)</div><div class="big ok">${mo.payingCount}</div><div class="qsub">production transactions</div></div>
    <div class="card"><div class="qlabel">MRR estimate</div><div class="big">${money(mo.mrrEstimate)}</div><div class="qsub">monthly + yearly/12 · lifetime one-time excluded</div></div>
    <div class="card"><div class="qlabel">Entitled (isPro)</div><div class="big">${mo.entitledCount}${mo.unverifiedEntitledCount?`<span class="flag">${mo.unverifiedEntitledCount} unverified</span>`:''}</div><div class="qsub">${mo.unverifiedEntitledCount} have no production purchase (likely TestFlight/test)</div></div>
  </div>
  <div class="section-t">By product · production only</div>
  <div class="card"><table><thead><tr><th>Product</th><th class="text-center">Payers</th><th class="text-center">Price</th></tr></thead><tbody>
    ${Object.keys(mo.prices).map(p=>`<tr><td class="mono">${esc(p)}</td><td class="text-center">${mo.byProduct[p]||0}</td><td class="text-center">${money(mo.prices[p])}</td></tr>`).join('')}
  </tbody></table>${mo.sandboxTx?`<div class="note">${mo.sandboxTx} Sandbox transaction(s) excluded from revenue.</div>`:''}</div>
  <div class="section-t">Access breakdown</div>
  <div class="card"><div class="kpis">
    <div class="kpi"><div class="l">Paid</div><div class="n ok">${mo.payingCount}</div></div>
    <div class="kpi"><div class="l">On reverse trial</div><div class="n">${mo.onReverseTrial}</div></div>
    <div class="kpi"><div class="l">Entitled (incl. test)</div><div class="n">${mo.entitledCount}</div></div>
  </div><div class="note">"Paying" and "entitled" are never summed — entitlement includes test/TestFlight and trials.</div></div>`;
}

function renderHealth(){
  const h=DATA.health;
  return `
  <div class="grid3">
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
    try{ USERS = (await call('adminUsers')({ includeInternal: INCLUDE_INTERNAL })).data.users; }
    catch(e){ m.innerHTML = '<div class="loading cr">'+esc(e.message)+'</div>'; return; }
  }
  if(PENDING===null){ try{ PENDING = (await call('adminListPendingPurchases')({})).data.items; }catch{ PENDING = []; } }
  m.innerHTML = renderPending() + renderUserList();
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

function renderUserList(){
  const q = USER_VIEW.q.toLowerCase(), tf = USER_VIEW.type;
  const rows = USERS.filter(u=>{
    if(tf==='registered' && u.type!=='registered') return false;
    if(tf==='guest' && u.type!=='guest') return false;
    if(tf==='paid' && u.access!=='paid') return false;
    if(tf==='flagged' && !u.flags.length) return false;
    if(q){ if(!(((u.email||'')+' '+(u.name||'')+' '+u.uid).toLowerCase().includes(q))) return false; }
    return true;
  });
  return `<div class="utoolbar">
    <input id="u-search" placeholder="Search name / email / UID" value="${esc(USER_VIEW.q)}">
    <select id="u-type">
      <option value="all">All types</option><option value="registered">Registered</option><option value="guest">Guests</option><option value="paid">Paying</option><option value="flagged">Flagged</option>
    </select>
    <span class="qsub">${rows.length} shown${INCLUDE_INTERNAL?'':' · internal hidden'}</span>
  </div>
  <div class="card" style="padding:0;overflow-x:auto"><table class="utable"><thead><tr>
    <th>User</th><th>Type</th><th>Access</th><th class="text-center">Workouts</th><th class="text-center">AI</th><th>Joined</th><th>Last active</th><th>Signals</th>
  </tr></thead><tbody>
    ${rows.map(u=>`<tr class="clickable ${u.internal?'internal-row':''}" data-uid="${esc(u.uid)}">
      <td><div class="uname">${esc(u.name||'—')}</div><div class="uemail">${esc(u.email||u.uid.slice(0,14))}</div></td>
      <td>${esc(u.type)}${u.internal?' <span class="chip-s internal">internal</span>':''}</td>
      <td><span class="chip-s ${esc(u.access)}">${esc(u.access)}</span>${u.paidProduct?'<div class="uemail mono">'+esc(u.paidProduct.replace('com.qwota.pro.',''))+'</div>':''}</td>
      <td class="text-center ${u.workouts>0?'':'d'}">${u.workouts}</td>
      <td class="text-center">${u.aiCalls}</td>
      <td>${u.createdAt?ago(u.createdAt):'—'}</td>
      <td>${u.lastActive?ago(u.lastActive):'—'}</td>
      <td>${u.flags.map(f=>`<span class="chip-s ${(f==='entitled-no-purchase')?'risk':(f==='guest'?'guest':'')}">${esc(f)}</span>`).join('')||'—'}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

function wireUsers(){
  const s=$('u-search'); if(s){ s.oninput=(e)=>{ USER_VIEW.q=e.target.value; $('main').innerHTML=renderUserList(); wireUsers(); const n=$('u-search'); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } }; }
  const t=$('u-type'); if(t){ t.value=USER_VIEW.type; t.onchange=(e)=>{ USER_VIEW.type=e.target.value; $('main').innerHTML=renderUserList(); wireUsers(); }; }
  document.querySelectorAll('.utable tr.clickable').forEach(r=>r.onclick=()=>{ USER_VIEW.uid=r.dataset.uid; renderUsersTab(); });
  document.querySelectorAll('[data-recon]').forEach(b=>b.onclick=()=>openReconcile(b.dataset.recon, b.dataset.prod, b.dataset.exp));
}

function openReconcile(tx, prod, exp){
  openModal('Reconcile purchase', `
    <div class="field"><label>Transaction ID</label><input value="${esc(tx)}" disabled></div>
    <div class="field"><label>Product</label><input value="${esc(prod||'')}" id="rc-prod"></div>
    <div class="field"><label>Grant to user (Firebase UID)</label><input id="rc-uid" placeholder="paste the buyer's UID"></div>
    <div class="qsub">Grants Pro, creates the missing transaction mapping (so future renew/refund/expire attribute automatically), and clears the queue item.</div>
    <button class="btn-primary" id="rc-run" style="margin-top:14px">Grant Pro & reconcile</button><div class="result" id="rc-result"></div>`);
  $('rc-run').onclick=async()=>{
    const uid=$('rc-uid').value.trim(); if(!uid){ $('rc-result').textContent='Enter a UID.'; return; }
    $('rc-run').disabled=true; $('rc-result').textContent='Reconciling…';
    try{
      await call('adminReconcilePurchase')({ originalTransactionId: tx, uid, productId: $('rc-prod').value.trim()||undefined, expiresDate: exp||undefined });
      $('rc-result').textContent='Done — Pro granted.'; toast('Purchase reconciled');
      PENDING=null; USERS=null; $('modal').hidden=true; renderUsersTab();
    }catch(e){ $('rc-run').disabled=false; $('rc-result').textContent=esc(e.message); }
  };
}

// Rich profile + activity view — renders the synced snapshot the server holds
// (full per-workout/meal history lives on-device; this is what synced up).
function kv(label,val){ if(val==null||val===''||val==='—') return ''; return `<div><div class="l">${esc(label)}</div><div class="v">${esc(val)}</div></div>`; }
function card(title, inner){ if(!inner||!inner.trim()) return ''; return `<div class="section-t">${esc(title)}</div><div class="card">${inner}</div>`; }
function renderUserRich(docs){
  const ud=docs.userData||{}, cc=docs.coachingContexts||{}, up=docs.userProfiles||{};
  const p=ud.workoutPreferences||{};
  const streak=ud.habitStreakData||{};
  const kg=v=>v==null?null:Math.round(v*10)/10+' kg';
  // Profile
  const profile=[
    kv('Name', ud.userName||up.name), kv('Age', ud.age), kv('Sex', ud.biologicalSex),
    kv('Experience', ud.experienceLevel), kv('Activity level', ud.activityLevel),
    kv('Primary goal', p.primaryGoal), kv('Goal weight', kg(ud.goalWeightKg)),
    kv('Coaching style', ud.coachingStyle), kv('Timezone', ud.userTimezone),
  ].join('');
  // Training
  const byType=ud.workoutsByType?Object.entries(ud.workoutsByType).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`${esc(t)} ${n}`).join(' · '):'';
  const trainStats=[
    kv('Total workouts', ud.totalWorkouts), kv('Days on plan', ud.daysOnPlan),
    kv('This week', ud.workoutsThisWeek), kv('Workout streak', streak.currentWorkoutStreak),
    kv('Logging streak', streak.currentLoggingStreak),
    kv('Split', p.splitType), kv('Days/week', p.daysPerWeek),
  ].join('');
  const rw=Array.isArray(ud.recentWorkouts)?ud.recentWorkouts.slice(0,8):[];
  const rwTable=rw.length?`<div class="l" style="margin:14px 0 6px">Recent workouts</div><table><thead><tr><th>Workout</th><th>Type</th><th class="text-center">Min</th><th class="text-center">When</th></tr></thead><tbody>${rw.map(w=>`<tr><td>${esc(w.workoutName||'—')}</td><td>${esc(w.activityType||'—')}</td><td class="text-center">${esc(w.durationMinutes??'—')}</td><td class="text-center">${w.daysAgo!=null?esc(w.daysAgo)+'d ago':esc((w.date||'').slice(0,10))}</td></tr>`).join('')}</tbody></table>`:'';
  const prs=Array.isArray(ud.recentPRs)?ud.recentPRs.slice(0,6):[];
  const prList=prs.length?`<div class="l" style="margin:14px 0 6px">Recent PRs</div><div class="qsub">${prs.map(pr=>`${esc(pr.exerciseName)}: <b style="color:var(--tx)">${esc(pr.value)}</b>`).join(' · ')}</div>`:'';
  const training=trainStats?`<div class="detail-grid">${trainStats}</div>${byType?`<div class="qsub" style="margin-top:12px">By type: ${byType}</div>`:''}${rwTable}${prList}`:'';
  // Nutrition
  const nutrition=[
    kv('Target calories', ud.targetCalories), kv('Target protein', ud.targetProtein!=null?ud.targetProtein+'g':null),
    kv('Avg protein', ud.avgDailyProtein!=null?ud.avgDailyProtein+'g':null), kv('Avg carbs', ud.avgDailyCarbs!=null?ud.avgDailyCarbs+'g':null),
    kv('Days logged food', ud.daysLoggedFood),
  ].join('');
  const topFoods=Array.isArray(ud.topFoods)&&ud.topFoods.length?`<div class="qsub" style="margin-top:12px">Top foods: ${ud.topFoods.slice(0,8).map(f=>esc(typeof f==='string'?f:(f.name||f.foodName||''))).filter(Boolean).join(', ')}</div>`:'';
  // AI coach read
  const coach=[
    cc.strengthsAnalysis?`<div class="l" style="margin-bottom:4px">Strengths</div><div class="qsub" style="margin-bottom:12px">${esc(cc.strengthsAnalysis)}</div>`:'',
    cc.areasToImprove?`<div class="l" style="margin-bottom:4px">Areas to improve</div><div class="qsub" style="margin-bottom:12px">${esc(cc.areasToImprove)}</div>`:'',
    cc.recommendedFocus?`<div class="l" style="margin-bottom:4px">Recommended focus</div><div class="qsub" style="margin-bottom:12px">${esc(cc.recommendedFocus)}</div>`:'',
    cc.nutritionConsistency?`<div class="l" style="margin-bottom:4px">Nutrition consistency</div><div class="qsub">${esc(cc.nutritionConsistency)}</div>`:'',
  ].join('');
  return card('Profile',`<div class="detail-grid">${profile}</div>`)
    + card('Training activity', training)
    + card('Nutrition', nutrition?`<div class="detail-grid">${nutrition}</div>${topFoods}`:'')
    + card('AI coach read', coach);
}

async function renderUserDetail(uid){
  const m=$('main');
  const row = (USERS||[]).find(u=>u.uid===uid) || {};
  m.innerHTML='<div class="loading">Loading user…</div>';
  let r; try{ r=(await call('adminLookupUser')({uid})).data; }catch(e){ m.innerHTML='<div class="loading cr">'+esc(e.message)+'</div>'; return; }
  const a=r.auth;
  m.innerHTML=`
    <span class="back-link" id="u-back">← All users</span>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div><div class="big sm">${esc(a?.displayName||row.name||'Unknown')}</div><div class="qsub mono">${esc(a?.email||uid)}</div></div>
        <div>${row.internal?'<span class="chip-s internal">internal</span>':''}<span class="chip-s ${esc(row.access||'free')}">${esc(row.access||'free')}</span></div>
      </div>
      <div class="detail-grid" style="margin-top:18px">
        <div><div class="l">Type</div><div class="v">${esc(row.type||(a?a.providers.join(','):'—'))}</div></div>
        <div><div class="l">Workouts</div><div class="v ${row.workouts>0?'':'d'}">${row.workouts??'—'}</div></div>
        <div><div class="l">Days on plan</div><div class="v">${row.daysOnPlan??'—'}</div></div>
        <div><div class="l">AI usage</div><div class="v">${row.aiCalls??0} calls · ${money(row.aiCost||0)}</div></div>
        <div><div class="l">Joined</div><div class="v">${a?.createdAt?ago(a.createdAt):'—'}</div></div>
        <div><div class="l">Last active</div><div class="v">${row.lastActive?ago(row.lastActive):'—'}</div></div>
        <div><div class="l">Last sign-in</div><div class="v">${a?.lastSignIn?ago(a.lastSignIn):'—'}</div></div>
        <div><div class="l">Paid product</div><div class="v mono">${esc((row.paidProduct||'—').replace('com.qwota.pro.',''))}</div></div>
      </div>
      ${row.flags&&row.flags.length?`<div style="margin-top:14px"><div class="l" style="font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Signals</div>${row.flags.map(f=>`<span class="chip-s ${(f==='entitled-no-purchase')?'risk':(f==='guest'?'guest':'')}">${esc(f)}</span>`).join('')}</div>`:''}
    </div>
    ${renderUserRich(r.docs)}
    <div class="section-t">Data records</div>
    <div class="card"><table><tbody>${Object.entries(r.docs).map(([c,v])=>`<tr><td>${esc(c)}</td><td class="text-center">${v?(Array.isArray(v)?v.length+' record(s)':'<span class="ok">present</span>'):'<span class="d">—</span>'}</td></tr>`).join('')}</tbody></table></div>
    <div class="section-t">Actions</div>
    <div class="qa">
      <button class="btn" data-ua="internal"><span class="i">${row.internal?'✓':'⊘'}</span> ${row.internal?'Unmark internal':'Mark internal / test'}</button>
      <button class="btn" data-ua="extendTrial"><span class="i">＋</span> Extend trial</button>
      <button class="btn" data-ua="forceRefresh"><span class="i">↻</span> Force refresh</button>
      <button class="btn" data-ua="sendPush"><span class="i">✉</span> Send push</button>
    </div>`;
  $('u-back').onclick=()=>{ USER_VIEW.uid=null; renderUsersTab(); };
  document.querySelectorAll('[data-ua]').forEach(b=>b.onclick=async()=>{
    const act=b.dataset.ua;
    if(act==='internal'){ try{ await call('adminSetInternal')({uid, internal: !row.internal}); toast(row.internal?'Unmarked internal':'Marked internal'); USERS=null; USER_VIEW.uid=null; render(); load(); }catch(e){ toast(e.message,true); } return; }
    openAction(act); const el=$('a-uid'); if(el) el.value=uid;
  });
}

// ---------- actions / wiring ----------
function wire(){
  document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>openAction(b.dataset.act));
}

function openModal(title, bodyHtml){ $('modal-title').textContent=title; $('modal-body').innerHTML=bodyHtml; $('modal').hidden=false; }
function closeModal(){ $('modal').hidden=true; }

function openAction(act){
  if(act==='findUser'){ TAB='users'; render(); return; }
  const forms={
    extendTrial:{title:'Comp / extend reverse trial', fields:`<div class="field"><label>User UID</label><input id="a-uid"></div><div class="field"><label>Days</label><input id="a-days" type="number" value="30"></div>`, run:async()=>{const r=await call('adminExtendReverseTrial')({uid:$('a-uid').value.trim(),days:+$('a-days').value}); return 'Extended to '+r.data.expiresAt;}},
    forceRefresh:{title:'Force AI deep-context refresh', fields:`<div class="field"><label>User UID</label><input id="a-uid"></div>`, run:async()=>{await call('adminForceRefresh')({uid:$('a-uid').value.trim()}); return 'Refresh complete.';}},
    sendPush:{title:'Send a push to one user', fields:`<div class="field"><label>User UID</label><input id="a-uid"></div><div class="field"><label>Title</label><input id="a-title"></div><div class="field"><label>Body</label><textarea id="a-body"></textarea></div>`, run:async()=>{await call('adminSendUserPush')({uid:$('a-uid').value.trim(),title:$('a-title').value,body:$('a-body').value}); return 'Push sent.';}},
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
$('internal-toggle').onclick=()=>{
  INCLUDE_INTERNAL=!INCLUDE_INTERNAL;
  const btn=$('internal-toggle');
  btn.textContent=INCLUDE_INTERNAL?'Incl. internal':'Real users only';
  btn.classList.toggle('on',INCLUDE_INTERNAL);
  USERS=null; USER_VIEW.uid=null;
  load();
};
$('modal-close').onclick=closeModal;
$('modal').onclick=(e)=>{ if(e.target===$('modal')) closeModal(); };
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{ TAB=b.dataset.tab; render(); });

auth.onAuthStateChanged((user)=>{
  if(user && user.uid===ADMIN_UID){ $('signin').hidden=true; $('shell').hidden=false; load(); }
  else if(user){ $('signin-error').textContent='This account is not an admin.'; auth.signOut(); }
  else { $('signin').hidden=false; $('shell').hidden=true; }
});
