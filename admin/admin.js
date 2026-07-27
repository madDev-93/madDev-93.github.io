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
const $ = (id) => document.getElementById(id);

// ---------- helpers ----------
function toast(msg, isErr){ const t=$('toast'); t.textContent=msg; t.className='toast'+(isErr?' err':''); t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true, 3200); }
function ago(iso){ if(!iso) return '—'; const s=Math.floor((Date.now()-new Date(iso).getTime())/1000); if(s<60)return s+'s ago'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; }
function money(n){ return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

// ---------- data ----------
async function load(){
  $('main').innerHTML = '<div class="loading">Loading console…</div>';
  try{
    const res = await call('adminConsole')();
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
  if(TAB==='cockpit') m.innerHTML = renderCockpit();
  else if(TAB==='money') m.innerHTML = renderMoney();
  else if(TAB==='users') m.innerHTML = renderUsers();
  else if(TAB==='health') m.innerHTML = renderHealth();
  wire();
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
      <div class="qsub">${u.guests} guests · ${u.appUsers} app users <span class="d">(${u.authTotal} auth)</span></div>
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

function renderUsers(){
  return `
  <div class="card">
    <div class="qlabel">Look up a user</div>
    <div class="field" style="margin-top:12px"><label>Firebase UID</label><input id="lookup-uid" placeholder="paste a UID"/></div>
    <button class="btn-primary" id="lookup-go">Look up</button>
    <div id="lookup-result"></div>
  </div>
  <div class="note">A browsable user list is coming next; for now this is the support/action tool — paste a UID to see everything about a user and act on them.</div>`;
}

// ---------- actions / wiring ----------
function wire(){
  document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>openAction(b.dataset.act));
  const go=$('lookup-go'); if(go) go.onclick=doLookup;
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

async function doLookup(){
  const uid=$('lookup-uid').value.trim(); if(!uid) return;
  const res=$('lookup-result'); res.innerHTML='<div class="qsub">Looking up…</div>';
  try{
    const r=(await call('adminLookupUser')({uid})).data;
    const a=r.auth;
    res.innerHTML = `<div style="margin-top:18px">
      <div class="kpis">
        <div class="kpi"><div class="l">Email</div><div style="font-size:14px">${esc(a?a.email||'—':'no auth (orphan)')}</div></div>
        <div class="kpi"><div class="l">Name</div><div style="font-size:14px">${esc(a?a.displayName||'—':'—')}</div></div>
        <div class="kpi"><div class="l">Providers</div><div style="font-size:14px">${esc(a?(a.providers.join(',')||'anon'):'—')}</div></div>
        <div class="kpi"><div class="l">Created</div><div style="font-size:14px">${a&&a.createdAt?ago(a.createdAt):'—'}</div></div>
      </div>
      <div class="section-t">Documents</div>
      <table><tbody>${Object.entries(r.docs).map(([c,v])=>`<tr><td>${esc(c)}</td><td class="text-center">${v?(Array.isArray(v)?v.length+' record(s)':'<span class="ok">present</span>'):'<span class="d">—</span>'}</td></tr>`).join('')}</tbody></table>
      <div class="qa" style="margin-top:16px">
        <button class="btn" onclick="quickAct('extendTrial','${esc(uid)}')"><span class="i">＋</span> Extend trial</button>
        <button class="btn" onclick="quickAct('forceRefresh','${esc(uid)}')"><span class="i">↻</span> Force refresh</button>
        <button class="btn" onclick="quickAct('sendPush','${esc(uid)}')"><span class="i">✉</span> Send push</button>
      </div></div>`;
  }catch(e){ res.innerHTML='<div class="cr">'+esc(e.message)+'</div>'; }
}
window.quickAct=(act,uid)=>{ openAction(act); const el=$('a-uid'); if(el) el.value=uid; };

// ---------- boot ----------
$('signin-btn').onclick=async()=>{ $('signin-error').textContent=''; try{ await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }catch(e){ $('signin-error').textContent=e.message; } };
$('signout').onclick=()=>auth.signOut();
$('refresh').onclick=load;
$('modal-close').onclick=closeModal;
$('modal').onclick=(e)=>{ if(e.target===$('modal')) closeModal(); };
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{ TAB=b.dataset.tab; render(); });

auth.onAuthStateChanged((user)=>{
  if(user && user.uid===ADMIN_UID){ $('signin').hidden=true; $('shell').hidden=false; load(); }
  else if(user){ $('signin-error').textContent='This account is not an admin.'; auth.signOut(); }
  else { $('signin').hidden=false; $('shell').hidden=true; }
});
