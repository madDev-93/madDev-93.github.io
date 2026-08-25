/* Draft Board — live draft assistant. Data: players.json (built by build-data.mjs).
   State lives in localStorage so a refresh mid-draft loses nothing. */
'use strict';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'draftboard.v1';

const DEFAULT_ROSTER = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BE: 7 };
const FLEX_POS = new Set(['RB', 'WR', 'TE']);
const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'DST', 'K'];

let DATA = null;          // players.json
let P = new Map();        // id -> player
let S = load();           // state
let ui = { tab: 'board', filter: 'ALL', q: '', showTaken: false, limit: 60 };

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.picks) return { teams: 10, slot: 1, roster: { ...DEFAULT_ROSTER }, ...s }; } catch {}
  return { teams: 10, slot: 1, roster: { ...DEFAULT_ROSTER }, picks: [] };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }

// ---- draft math -------------------------------------------------------------------------
const rounds = () => Object.values(S.roster).reduce((a, b) => a + b, 0);
const totalPicks = () => rounds() * S.teams;
function teamAt(pickNo) { // snake
  const r = Math.ceil(pickNo / S.teams), i = (pickNo - 1) % S.teams;
  return r % 2 === 1 ? i + 1 : S.teams - i;
}
const roundOf = (pickNo) => Math.ceil(pickNo / S.teams);
const label = (pickNo) => `${roundOf(pickNo)}.${String(((pickNo - 1) % S.teams) + 1).padStart(2, '0')}`;
const current = () => S.picks.length + 1;
function myPicks() { const out = []; for (let p = 1; p <= totalPicks(); p++) if (teamAt(p) === S.slot) out.push(p); return out; }
function nextMyPick(from = current()) { return myPicks().find((p) => p >= from) ?? null; }
const takenIds = () => new Set(S.picks.map((x) => x.id));
const mine = () => S.picks.filter((x) => x.team === S.slot).map((x) => P.get(x.id)).filter(Boolean);
const available = () => DATA.players.filter((p) => !takenIds().has(p.id));

/* Fill roster slots greedily by projection: starters by position, then FLEX, then bench. */
function fillRoster(list) {
  const slots = [];
  for (const pos of POS_ORDER) for (let i = 0; i < (S.roster[pos] || 0); i++) slots.push({ pos, p: null });
  for (let i = 0; i < (S.roster.BE || 0); i++) slots.push({ pos: 'BE', p: null });
  const left = [...list].sort((a, b) => (b.proj ?? 0) - (a.proj ?? 0));
  for (const s of slots) if (s.pos !== 'FLEX' && s.pos !== 'BE') { const i = left.findIndex((p) => p.pos === s.pos); if (i >= 0) s.p = left.splice(i, 1)[0]; }
  for (const s of slots) if (s.pos === 'FLEX') { const i = left.findIndex((p) => FLEX_POS.has(p.pos)); if (i >= 0) s.p = left.splice(i, 1)[0]; }
  for (const s of slots) if (s.pos === 'BE' && left.length) s.p = left.shift();
  return { slots, extra: left };
}
const starterPoints = (list) => fillRoster(list).slots.filter((s) => s.pos !== 'BE' && s.p).reduce((t, s) => t + (s.p.proj || 0), 0);

/* Recommendation: for each candidate, the roster's projected starter points if I take him now,
   minus what I'd expect to get at that position if I wait for my next pick. "Expected at next
   pick" = best available at the position whose ADP is at/after my next pick number. */
/* Positional lines for a league this size. `starter` = the last starter-quality player (10th QB,
   ~25th RB/WR with FLEX shared, ~12th TE); `waiver` = what a free agent looks like (≈45th RB,
   55th WR, 20th TE/QB) — the honest baseline for BENCH value. Using the starter line for bench
   made every late RB/WR worth exactly 0, which is what let a backup QB sneak in at round 8. */
function baselines() {
  const r = S.roster, t = S.teams, flex = (r.FLEX || 0) * t;
  const starter = { QB: (r.QB || 1) * t, RB: (r.RB || 2) * t + flex * 0.45, WR: (r.WR || 2) * t + flex * 0.45, TE: (r.TE || 1) * t + flex * 0.10, K: (r.K || 1) * t, DST: (r.DST || 1) * t };
  const waiver = { QB: 2 * t, RB: 4.5 * t, WR: 5.5 * t, TE: 2 * t, K: 1.2 * t, DST: 1.2 * t };
  const at = (pos, n) => { const sorted = DATA.players.filter((p) => p.pos === pos && p.proj != null).sort((a, b) => b.proj - a.proj); return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(n) - 1))]?.proj ?? 0; };
  const out = { starter: {}, waiver: {} };
  for (const pos of Object.keys(starter)) { out.starter[pos] = at(pos, starter[pos]); out.waiver[pos] = at(pos, waiver[pos]); }
  out.starter.FLEX = Math.max(out.starter.RB, out.starter.WR, out.starter.TE);
  out.waiver.FLEX = Math.max(out.waiver.RB, out.waiver.WR, out.waiver.TE);
  return out;
}
/* Risk-adjusted projection: a 100-risk player loses 30% of his season (Nacua "questionable" at
   25 → −7.5%, McCaffrey at 65 → −20%). Applied to candidates AND to the alternatives we compare
   them against, so a position isn't "safe to wait on" because its fallback is a hurt rookie. */
const adj = (p) => (p.proj || 0) * (1 - 0.3 * (p.risk || 0) / 100);
/* Where the room takes him, on the 10-team scale. ESPN's ADP runs long; consensus rank is the
   last resort. `sd` is how spread real drafts are on him — the width of the "is he there?" bell. */
const adpOf = (p) => p.adp ?? (p.adpEspn != null ? p.adpEspn / 1.1 : (p.rank ?? 400));
const sdOf = (p) => Math.max(4, p.adpStd ?? 8);
const Phi = (z) => 0.5 * (1 + Math.tanh(0.7978845608 * (z + 0.044715 * z * z * z)));  // normal CDF, close enough
/* P(still on the board at pick n). ADP is a mean, not a floor: a player with ADP 22 is gone by
   21 about half the time. */
const pAvail = (p, n) => Phi((adpOf(p) - n) / sdOf(p));
/* Expected best risk-adjusted projection among `pool` at pick n: walk the pool best-first and
   take each player's projection weighted by "he's there and nobody better was". */
function expectedBest(pool, n) {
  const sorted = [...pool].sort((a, b) => adj(b) - adj(a));
  let e = 0, pNoneBetter = 1;
  for (const p of sorted) { const pa = pAvail(p, n); e += adj(p) * pa * pNoneBetter; pNoneBetter *= (1 - pa); if (pNoneBetter < 0.01) break; }
  return e;
}
function recommend() {
  const avail = available();
  const have = mine();
  const base = starterPoints(have);
  const cur = current();
  // Horizon for "can I wait?": my next pick — unless it's the very next pick (the turn of the
  // snake), in which case nobody picks in between and the real question is what survives until
  // the pick AFTER that pair.
  const nextAny = nextMyPick(cur + 1);
  const next = nextAny === cur + 1 ? (nextMyPick(cur + 2) ?? nextAny) : nextAny;
  const bl = baselines();
  const count = (pos) => have.filter((x) => x.pos === pos).length;
  const isKD = (p) => p.pos === 'K' || p.pos === 'DST';
  // Caps: one backup QB/TE at most, exactly one K and D/ST.
  const startersOpen = fillRoster(have).slots.filter((s) => !s.p && s.pos !== 'BE' && !['K', 'DST'].includes(s.pos)).length;
  const picksLeft = myPicks().filter((n) => n >= cur).length;
  // A backup QB/TE is a last-four-picks luxury once every starter is filled — never before, and
  // never a third. Exactly one K and D/ST.
  const backupOk = startersOpen === 0 && picksLeft <= 4;
  const capped = (p) => (p.pos === 'QB' && count('QB') >= (S.roster.QB || 1) + (backupOk ? 1 : 0)) || (p.pos === 'TE' && count('TE') >= (S.roster.TE || 1) + (backupOk ? 1 : 0))
    || (p.pos === 'K' && count('K') >= (S.roster.K || 1)) || (p.pos === 'DST' && count('DST') >= (S.roster.DST || 1));
  // K/D-ST: the last two picks, unless nothing else is left to fill.
  const kdAllowed = picksLeft <= 2;
  const byeCount = {}; for (const s of fillRoster(have).slots) if (s.p && s.pos !== 'BE' && s.p.bye) byeCount[s.p.bye] = (byeCount[s.p.bye] || 0) + 1;
  // Candidate pool: the top of the board plus every K/D-ST once they're allowed (they rank ~180+).
  const pool = avail.slice(0, 120).concat(kdAllowed ? avail.filter(isKD) : []);
  const cands = pool.filter((p) => !capped(p) && (kdAllowed || !isKD(p))).map((p) => {
    const gain = starterPoints([...have, p]) - base;      // marginal lineup gain — an upgrade counts only its edge
    let fills = gain > 0 ? filledSlot(have, p) : null;
    // A tight end in the FLEX is a bench-grade outcome in PPR; value him as depth, not a starter.
    if (fills === 'FLEX' && p.pos === 'TE') fills = null;
    const slotPos = fills === 'FLEX' ? 'FLEX' : p.pos;
    let value, opp = 0;
    if (fills) {
      // What the same slot would get if I wait: the expected best at my horizon, minus the
      // incumbent it would have to beat (0 for an empty slot). Waiting is only worth counting
      // while I have spare picks — with 3 starters open and 4 picks left there's no waiting.
      const incumbent = (p.proj || 0) - gain;
      const later = avail.filter((x) => x.id !== p.id && (slotPos === 'FLEX' ? FLEX_POS.has(x.pos) : x.pos === p.pos));
      opp = next ? Math.max(0, expectedBest(later, next) - incumbent) : 0;
      const waitW = Math.max(0, Math.min(1, (picksLeft - startersOpen) / 3));
      const gainAdj = gain - (p.proj || 0) + adj(p);       // same marginal gain, risk-adjusted
      // Floor: a real starter in hand is never worth less than a tenth of his gain — otherwise a
      // round where every fill looks slightly negative gets decided by a zero-value bench tiebreak.
      value = Math.max(gainAdj - opp * waitW, gainAdj * 0.1);
      if (!next) value = adj(p) - bl.waiver[slotPos];       // last pick: no waiting math, just value over a free agent
    } else {
      // Bench: value over a FREE AGENT, discounted. RB/WR depth is real (bye weeks, injuries, FLEX);
      // a backup QB/TE is a luxury for the last few picks only.
      const over = Math.max(0, adj(p) - bl.waiver[p.pos]);
      value = FLEX_POS.has(p.pos) ? over * (startersOpen ? 0.15 : 0.5)
        : over * 0.15;
    }
    // Market discipline: ADP carries what projections don't (replaceability, variance, how the
    // room behaves). Each pick earlier than the room takes him, past a 3-pick grace, costs 2.5 —
    // enough that a QB the room takes at 34 isn't the pick at 20, but can be at 27.
    value -= Math.max(0, adpOf(p) - cur - 3) * 2.5;
    // Bye-week stack: don't put a third starter on the same bye.
    if (p.bye && (byeCount[p.bye] || 0) >= 2 && fills) value -= 8;
    // Consensus as a light tiebreak only.
    value += (p.score - 80) * 0.05;
    const tierDrop = tierDropBefore(p, avail, next);
    return { p, value, gain, opp, tierDrop, fills };
  }).sort((a, b) => b.value - a.value);
  return { cands, next };
}
function filledSlot(have, p) { const after = fillRoster([...have, p]).slots; for (let i = 0; i < after.length; i++) if (after[i].p?.id === p.id) return after[i].pos === 'BE' ? null : `${after[i].pos}${after[i].pos === 'FLEX' ? '' : after.slice(0, i + 1).filter((s) => s.pos === after[i].pos).length}`; return null; }
/* How many projected points the position loses between this player and the best one likely left at my next pick. */
function tierDropBefore(p, avail, next) { if (!next) return 0; const later = avail.filter((x) => x.pos === p.pos && x.id !== p.id); return Math.max(0, adj(p) - expectedBest(later, next)); }

function whyText(c, next) {
  const bits = [];
  if (c.fills) bits.push(`fills your <b>${esc(c.fills)}</b>`);
  else bits.push('best value on the board for depth');
  if (next) {
    const nextWords = `round ${roundOf(next)}`;
    if (c.tierDrop >= 25) bits.push(`the best ${c.p.pos === 'DST' ? 'D/ST' : c.p.pos} likely left at your next pick (${nextWords}) projects <b>${Math.round(c.tierDrop)} pts</b> lower over the season`);
    else if (c.tierDrop <= 8 && c.gain > 0) bits.push(`${c.p.pos} options should still be there in ${nextWords}, so this is about talent, not scarcity`);
  }
  const adpRef = c.p.adp ?? c.p.adpEspn;
  if (adpRef && adpRef - current() >= 6) bits.push(`this is <b>${Math.round(adpRef - current())} picks</b> before the room usually takes him (ADP ${Math.round(adpRef)}) — a reach, priced in`);
  else if (adpRef && current() - adpRef >= 6) bits.push(`<b>${Math.round(current() - adpRef)} picks</b> past his ADP — a discount`);
  if (c.p.risk >= 40) bits.push(`risk is real: ${esc(c.p.riskWhy.join(', '))}`);
  const s = bits.join('; ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

// ---- actions ----------------------------------------------------------------------------
function take(id) {
  if (current() > totalPicks()) return toast('Draft is complete');
  const team = teamAt(current());
  S.picks.push({ id, team, no: current() }); save(); render();
  const p = P.get(id);
  toast(`${label(current() - 1)} · ${p.name} → ${team === S.slot ? 'you' : 'Team ' + team}`, () => undoPick(S.picks.length - 1));
}
function undoPick(i) { S.picks.splice(i, 1); S.picks.forEach((x, k) => { x.no = k + 1; x.team = teamAt(k + 1); }); save(); render(); }
function resetDraft() { S.picks = []; save(); render(); toast('Draft cleared'); }

let toastT;
function toast(msg, undo) {
  const t = $('toast'); t.innerHTML = esc(msg) + (undo ? '<button id="t-undo">Undo</button>' : ''); t.hidden = false;
  if (undo) $('t-undo').onclick = () => { undo(); t.hidden = true; };
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), undo ? 5000 : 2500);
}

// ---- render ---------------------------------------------------------------------------
const posClass = (pos) => pos === 'DST' ? 'DST' : pos;
const riskClass = (r) => r >= 40 ? 'hi' : r >= 20 ? 'md' : 'lo';
const riskWord = (r) => r >= 40 ? 'High' : r >= 20 ? 'Med' : 'Low';
const fmt = (v, d = 1) => v == null ? '—' : (+v).toFixed(d);

function render() {
  renderSettings(); renderClock(); renderTurn(); renderCounts();
  if (ui.tab === 'board') renderBoard(); if (ui.tab === 'team') renderTeam(); if (ui.tab === 'taken') renderTaken();
  for (const t of document.querySelectorAll('.pane')) t.hidden = t.id !== 'pane-' + ui.tab;
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('on', t.dataset.tab === ui.tab);
  $('foot').innerHTML = `Rankings built ${esc(new Date(DATA.built).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))} · ${esc(DATA.sources.join(' · '))}`;
}
function renderSettings() {
  const t = $('s-teams'), s = $('s-slot');
  t.innerHTML = [8, 10, 12, 14].map((n) => `<option ${n === S.teams ? 'selected' : ''}>${n}</option>`).join('');
  s.innerHTML = Array.from({ length: S.teams }, (_, i) => i + 1).map((n) => `<option ${n === S.slot ? 'selected' : ''}>${n}</option>`).join('');
}
function renderClock() {
  const el = $('clock'); const cur = current(), total = totalPicks();
  if (cur > total) {
    el.className = 'clock done';
    el.innerHTML = `<div class="rnd"><span class="k">Round</span><span class="v">${rounds()}<small>/${rounds()}</small></span></div><div class="who"><span class="k">Draft</span><span class="v">Complete</span><span class="sub">${mine().length} players on your team</span></div>`;
    return;
  }
  const team = teamAt(cur), next = nextMyPick(), until = next - cur, myTurn = until === 0;
  el.className = 'clock' + (myTurn ? ' mine' : '');
  el.innerHTML = `
    <div class="rnd"><span class="k">Round</span><span class="v">${roundOf(cur)}<small>/${rounds()}</small></span></div>
    <div class="who">
      <span class="k">On the clock · pick ${((cur - 1) % S.teams) + 1} of ${S.teams} · #${cur} overall</span>
      <span class="v">${myTurn ? 'Your pick' : 'Team ' + team}</span>
      <span class="sub">${myTurn ? 'after this you pick again ' + (nextMyPick(cur + 1) ? 'in round ' + roundOf(nextMyPick(cur + 1)) : 'never — last one') : "you're up in " + until + (until === 1 ? ' pick' : ' picks') + ' — round ' + roundOf(next) + ', pick ' + (((next - 1) % S.teams) + 1)}</span>
    </div>`;
}
function renderTurn() {
  const el = $('turn'); const cur = current();
  if (cur > totalPicks()) { el.className = 'turn'; el.innerHTML = `<div class="empty"><b>Draft complete.</b> Your roster is on the My team tab; the board stays here if you need to fix a pick.</div>`; return; }
  const myTurn = teamAt(cur) === S.slot; el.className = 'turn' + (myTurn ? ' mine' : '');
  const { cands, next } = recommend(); const top = cands[0]; if (!top) { el.innerHTML = '<div class="empty">No players left.</div>'; return; }
  if (!myTurn) { el.innerHTML = logPanel(cur, cands, next); renderLogResults(); return; }
  const p = top.p;
  el.innerHTML = `
    <div class="turn-h"><span class="eyebrow ${myTurn ? '' : 'q'}">${myTurn ? 'Your pick · best available' : 'If you were picking now'}</span><span class="eyebrow q">${S.picks.length} gone</span></div>
    <div class="rec">
      <div><div class="nm">${esc(p.name)}</div>
        <div class="meta"><span class="pos ${posClass(p.pos)}">${p.pos === 'DST' ? 'D/ST' : p.pos}</span><span>${esc(p.team)}</span><span class="bye">bye ${p.bye ?? '—'}</span><span>${esc(p.posRank)} · ADP ${fmt(p.adp ?? p.adpEspn, 1)}</span></div></div>
      <div class="score"><div class="n">${p.score}</div><div class="k">score</div></div>
    </div>
    <div class="why">${whyText(top, next)}</div>
    <div class="stats">
      <div><div class="k">${DATA.season - 1} PPG</div><div class="v">${fmt(p.ppgLast)}</div></div>
      <div><div class="k">3-yr avg</div><div class="v">${fmt(p.ppg3)}</div></div>
      <div><div class="k">Risk</div><div class="v ${riskClass(p.risk)}">${riskWord(p.risk)}</div></div>
      <div><div class="k">Proj</div><div class="v">${fmt(p.proj, 0)}</div></div>
    </div>
    <div class="actions">
      <button class="btn primary" data-take="${p.id}">${myTurn ? 'Draft to my team' : 'Team ' + teamAt(cur) + ' took him'}</button>
      <button class="btn" data-open="${p.id}">Full card</button>
    </div>
    <div class="alts"><span class="eyebrow q">${myTurn ? "If he's gone" : 'Next best'}</span>
      ${cands.slice(1, 4).map((c, i) => `<button class="alt" data-open="${c.p.id}"><span class="r">${i + 2}</span><div><div class="n">${esc(c.p.name)}<span class="pos ${posClass(c.p.pos)}">${c.p.pos === 'DST' ? 'D/ST' : c.p.pos}</span></div><div class="d">${c.fills ? 'fills ' + esc(c.fills) : 'depth'} · ${Math.round(c.value - top.value)} pts vs top · ADP ${fmt(c.p.adp ?? c.p.adpEspn, 1)}</div></div><span class="s">${c.p.score}</span></button>`).join('')}
    </div>`;
}
/* Between your picks the panel's job is logging what other teams take — fast. Search first,
   then the players most likely to go next (by ADP — the best predictor of what someone ELSE
   does), then whether your own plan is surviving. */
function logPanel(cur, cands, next) {
  void next;
  const team = teamAt(cur);
  const likely = available().filter((p) => p.adp != null || p.adpEspn != null)
    .sort((a, b) => (a.adp ?? a.adpEspn) - (b.adp ?? b.adpEspn)).slice(0, 6);
  const mine1 = nextMyPick(cur);                       // my very next pick — the question the user is asking
  const lasts = (p) => mine1 ? pAvail(p, mine1) >= 0.5 : true;
  const plan = cands.slice(0, 3).map((c) => ({ p: c.p, lasts: lasts(c.p) }));
  const keep = plan.filter((x) => x.lasts);
  // If none of the top three should survive, name the best one who should — and not a reach.
  const fallback = keep.length ? null : cands.slice(3, 25).find((c) => lasts(c.p) && adpOf(c.p) - mine1 <= 6)?.p;
  return `
    <div class="turn-h"><span class="eyebrow q">Who did Team ${team} take?</span><span class="eyebrow q">${S.picks.length} gone</span></div>
    <label class="search inpanel"><span aria-hidden="true">⌕</span><input id="lq" type="search" placeholder="Type a name" autocomplete="off" autocorrect="off" spellcheck="false" value="${esc(ui.lq || '')}"></label>
    <div class="lres" id="lq-res"></div>
    <div class="chipcap"><span class="eyebrow q">Most likely next · press and hold to log</span></div>
    <div class="chips" id="likely">${likely.map((p) => `<button class="chip pick" data-log="${p.id}"><span class="p ${posClass(p.pos)}">${p.pos === 'DST' ? 'D/ST' : p.pos}</span><span class="n">${esc(p.name)}</span><span class="a">${fmt(p.adp ?? p.adpEspn, 1)}</span></button>`).join('')}</div>
    <div class="why plan">${!next ? 'This is the last round.'
      : `Your best options now: ${plan.map((x) => `<b class="${x.lasts ? 'ok' : 'no'}">${esc(x.p.name)}</b>`).join(', ')}` +
        (keep.length ? ` — <b class="ok">${esc(keep[0].p.name)}</b> should still be there at your pick (round ${roundOf(mine1)}).`
          : fallback ? ` — none should last to your pick; likely plan: <b>${esc(fallback.name)}</b>.` : '.')}</div>`;
}
function renderLogResults() {
  const box = $('lq-res'); if (!box) return;
  const q = (ui.lq || '').trim().toLowerCase(); $('likely').hidden = !!q;
  if (!q) { box.innerHTML = ''; return; }
  const hits = available().filter((p) => p.name.toLowerCase().includes(q) || p.team.toLowerCase() === q).slice(0, 6);
  box.innerHTML = hits.length ? hits.map((p) => `<button class="lhit" data-log="${p.id}"><span class="nm">${esc(p.name)}</span><span class="d"><span class="pos ${posClass(p.pos)}">${p.pos === 'DST' ? 'D/ST' : p.pos}</span> ${esc(p.team)} · ${esc(p.posRank)} · ADP ${fmt(p.adp ?? p.adpEspn, 0)}</span><span class="go">Team ${teamAt(current())} took</span></button>`).join('')
    : `<div class="lnone">No available player matches "${esc(q)}".</div><button class="lhit writein" data-writein="${esc(ui.lq.trim())}"><span class="nm">Write in "${esc(ui.lq.trim())}"</span><span class="d">Logs the pick under that name so the order stays right</span><span class="go">Team ${teamAt(current())} took</span></button>`;
}
/* Write-ins live in state, not players.json; give each a minimal player record so the Taken tab,
   My team and counts can render them. Never match them in search or the board. */
function registerWriteIns() {
  for (const [id, name] of Object.entries(S.writeIns || {})) if (!P.has(id)) P.set(id, { id, name, pos: '?', team: '—', rank: '—', posRank: 'write-in', proj: 0, risk: 0, riskWhy: [], history: {}, writeIn: true });
}
function renderCounts() { $('c-board').textContent = available().length; $('c-team').textContent = `${mine().length}/${rounds()}`; $('c-taken').textContent = S.picks.length; }

function renderBoard() {
  const f = $('filters');
  f.innerHTML = ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST'].map((k) => `<button class="chip ${ui.filter === k ? 'on' : ''}" data-f="${k}">${k === 'DST' ? 'D/ST' : k === 'ALL' ? 'All' : k}</button>`).join('') +
    `<button class="chip tog ${ui.showTaken ? 'on' : ''}" data-tog="1">${ui.showTaken ? 'Hiding none' : 'Show taken'}</button>`;
  const taken = takenIds(); const q = ui.q.trim().toLowerCase(); const cur = current();
  const who = Object.fromEntries(S.picks.map((x) => [x.id, x]));
  let list = DATA.players.filter((p) => {
    if (ui.filter === 'FLEX' ? !FLEX_POS.has(p.pos) : ui.filter !== 'ALL' && p.pos !== ui.filter) return false;
    if (q && !p.name.toLowerCase().includes(q) && !p.team.toLowerCase().includes(q)) return false;
    if (!ui.showTaken && !q && taken.has(p.id)) return false;
    return true;
  });
  const shown = list.slice(0, ui.limit);
  $('rows').innerHTML = (!S.picks.length && !q ? `<div class="note" style="margin:10px 12px 4px"><b>How it works:</b> log each team's pick in the panel above — search or tap a likely name. On your turn the panel shows your best pick. Tap any player here for his full card. Mis-tap? Undo in the toast, or fix it on the Taken tab.</div>` : '') + shown.map((p) => {
    const t = taken.has(p.id), w = who[p.id]; const adp = p.adp ?? p.adpEspn;
    const value = !t && adp != null && cur - adp >= 6;
    return `<button class="row ${riskClass(p.risk)} ${t ? 'taken' : ''} ${w && w.team === S.slot ? 'mine' : ''}" data-open="${p.id}">
      <span class="rk">${p.rank}</span>
      <span style="min-width:0">
        <span class="nm">${esc(p.name)}${w && w.team !== S.slot ? `<span class="who">T${w.team}</span>` : ''}</span>
        <span class="sub"><span class="pos ${posClass(p.pos)}">${p.pos === 'DST' ? 'D/ST' : p.pos}</span><span>${esc(p.team)} · bye ${p.bye ?? '—'} · ${esc(p.posRank)}</span>${p.injury ? `<span style="color:var(--hi)">${esc(p.injury.toLowerCase().replace('_', ' '))}</span>` : ''}</span>
      </span>
      <span class="right"><span class="ppg">${fmt(p.ppgLast)}</span><span class="adp ${value ? 'val' : ''}">${t ? label(w.no) : adp != null ? (value ? 'ADP ' + fmt(adp, 0) + ' · value' : 'ADP ' + fmt(adp, 0)) : 'no ADP'}</span></span>
    </button>`;
  }).join('') + (list.length > ui.limit ? `<button class="more" data-more="1">Show ${Math.min(60, list.length - ui.limit)} more of ${list.length}</button>` : '');
}

function renderTeam() {
  const have = mine(); const { slots } = fillRoster(have); const starters = slots.filter((s) => s.pos !== 'BE');
  const pts = starters.reduce((t, s) => t + (s.p?.proj || 0), 0);
  const byes = {}; for (const s of starters) if (s.p?.bye) (byes[s.p.bye] ||= []).push(s.p.name.split(' ').pop());
  const clash = Object.entries(byes).filter(([, v]) => v.length >= 3);
  const risky = have.filter((p) => p.risk >= 40);
  const row = (s) => `<div class="slot ${s.pos === 'BE' ? 'bench' : ''}"><span class="lab ${s.pos}">${s.pos === 'DST' ? 'D/ST' : s.pos === 'BE' ? 'BE' : s.pos}</span>${s.p ? `<span class="nm">${esc(s.p.name)}<span class="bye">${esc(s.p.team)} · bye ${s.p.bye ?? '—'}</span></span><span class="pts">${fmt(s.p.proj, 0)}</span>` : `<span class="nm open">open</span><span class="pts">—</span>`}</div>`;
  $('pane-team').innerHTML = `
    <div class="team-sum"><div><div class="k">Starters proj</div><div class="v">${Math.round(pts)}</div></div><div><div class="k">Drafted</div><div class="v">${have.length}<small style="font:12px var(--sans);color:var(--muted)"> / ${rounds()}</small></div></div><div><div class="k">Next pick</div><div class="v">${nextMyPick() ? label(nextMyPick()) : '—'}</div></div></div>
    <div class="slots">${starters.map(row).join('')}<div style="height:10px"></div>${slots.filter((s) => s.pos === 'BE').map(row).join('')}<div class="slot bench"><span class="lab">IR</span><span class="nm open">open</span><span class="pts">—</span></div></div>
    ${clash.length ? `<div class="note warn"><b>Bye week pile-up:</b> ${clash.map(([w, v]) => `week ${w} — ${esc(v.join(', '))}`).join('; ')}.</div>` : ''}
    ${risky.length ? `<div class="note"><b>Carrying risk:</b> ${risky.map((p) => `${esc(p.name)} (${esc(p.riskWhy.join(', '))})`).join('; ')}.</div>` : ''}
    ${!have.length ? '<div class="note">Nothing drafted yet. Your picks land here as you take them from the board.</div>' : ''}`;
}
function renderTaken() {
  const el = $('pane-taken');
  if (!S.picks.length) { el.innerHTML = '<div class="note">No picks yet. Tap a player on the board when a team takes them.</div>'; return; }
  el.innerHTML = [...S.picks].reverse().map((x, i) => { const p = P.get(x.id); const idx = S.picks.length - 1 - i; return `<button class="pick ${x.team === S.slot ? 'mine' : ''}" data-undo="${idx}"><span class="no">${label(x.no)}<b>${x.no}</b></span><div><div class="nm">${esc(p?.name)}</div><div class="team">${x.team === S.slot ? 'you' : 'Team ' + x.team} · ${p?.pos === 'DST' ? 'D/ST' : esc(p?.pos)} ${esc(p?.team)}</div></div><span class="x">remove</span></button>`; }).join('') +
    `<div style="padding:12px"><button class="btn ghost danger" id="b-reset" style="width:100%">Clear the whole draft</button></div>`;
}

// ---- sheets --------------------------------------------------------------------------
function openSheet(html) { $('sheet').innerHTML = '<div class="grab"></div><button class="xclose" data-close="1" aria-label="Close">×</button>' + html; $('sheet').hidden = false; $('sheet-bg').hidden = false; }
function closeSheet() { $('sheet').hidden = true; $('sheet-bg').hidden = true; }
function openPlayer(id) {
  const p = P.get(id); const taken = takenIds().has(id); const w = S.picks.find((x) => x.id === id);
  const yrs = Object.keys(p.history).sort();
  openSheet(`
    <h2>${esc(p.name)}</h2>
    <div class="meta"><span class="pos ${posClass(p.pos)}">${p.pos === 'DST' ? 'D/ST' : p.pos}</span><span>${esc(p.team)}</span><span>bye ${p.bye ?? '—'}</span>${p.age ? `<span>age ${p.age}</span>` : ''}${p.exp != null ? `<span>${p.exp === 0 ? 'rookie' : p.exp + ' yr' + (p.exp === 1 ? '' : 's')}</span>` : ''}${p.injury ? `<span style="color:var(--hi)">${esc(p.injury.toLowerCase().replace('_', ' '))}</span>` : ''}</div>
    <div class="grid4">
      <div><div class="k">Overall</div><div class="v">${p.rank}</div></div>
      <div><div class="k">Position</div><div class="v">${esc(p.posRank)}</div></div>
      <div><div class="k">Tier</div><div class="v">${p.tier ?? '—'}</div></div>
      <div><div class="k">Score</div><div class="v" style="color:var(--teal)">${p.score}</div></div>
    </div>
    <h3>Where he goes</h3>
    <div class="grid4">
      <div><div class="k">ADP (10-tm)</div><div class="v">${fmt(p.adp, 1)}</div></div>
      <div><div class="k">ADP range</div><div class="v" style="font-size:13px">${p.adpHigh ? `${p.adpHigh}–${p.adpLow}` : '—'}</div></div>
      <div><div class="k">Experts</div><div class="v" style="font-size:13px">${p.ecrMin ? `${p.ecrMin}–${p.ecrMax}` : '—'}</div></div>
      <div><div class="k">ESPN</div><div class="v">${p.espnRank ?? '—'}</div></div>
    </div>
    <h3>Production</h3>
    <table class="hist"><tr><th>Season</th><th>Games</th><th>PPR pts</th><th>PPG</th></tr>
      ${yrs.length ? yrs.map((y) => `<tr><td>${y}</td><td>${p.history[y].games ?? '—'}</td><td>${fmt(p.history[y].pts, 0)}</td><td>${fmt(p.history[y].ppg)}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:left;color:var(--faint)">No NFL seasons yet</td></tr>'}
      <tr><td>${DATA.season} proj</td><td>17</td><td>${fmt(p.proj, 0)}</td><td>${fmt(p.projPpg)}</td></tr></table>
    <h3>Risk · ${p.risk}/100</h3>
    <div class="risklist">${p.riskWhy.length ? p.riskWhy.map((r) => `<span>${esc(r)}</span>`).join('') : '<span>nothing flagged</span>'}${p.injuryNote ? `<span>${esc(p.injuryNote)}</span>` : ''}</div>
    ${p.outlook ? `<h3>Outlook</h3><p>${esc(p.outlook)}</p>` : ''}
    <div class="row-actions">
      ${taken ? `<button class="btn ghost wide" data-undo-id="${p.id}">Undo — put back on the board (${w ? (w.team === S.slot ? 'you' : 'Team ' + w.team) : ''})</button>`
        : teamAt(current()) === S.slot
          // On your turn the team on the clock is you — one action, not two that do the same thing.
          ? `<button class="btn primary wide" data-take="${p.id}" data-close="1">Draft to my team</button>`
          : `<button class="btn primary" data-take="${p.id}" data-close="1">Team ${teamAt(current())} took him</button><button class="btn ghost" data-take-me="${p.id}">Draft to me out of turn</button>`}
    </div>`);
}
function openSettings() {
  const r = S.roster;
  const field = (k, lab, d) => `<div class="field"><span class="k">${lab}<span class="d">${d}</span></span><span class="stepper"><button data-step="${k}:-1">−</button><span>${r[k]}</span><button data-step="${k}:1">+</button></span></div>`;
  openSheet(`
    <h2>Settings</h2>
    <p>Full PPR is fixed for this league. Teams and your pick slot are in the header.</p>
    <h3>Roster slots</h3>
    ${field('QB', 'QB', 'starting quarterbacks')}${field('RB', 'RB', 'starting running backs')}${field('WR', 'WR', 'starting receivers')}${field('TE', 'TE', 'starting tight ends')}${field('FLEX', 'FLEX', 'RB / WR / TE')}${field('DST', 'D/ST', 'defense')}${field('K', 'K', 'kicker')}${field('BE', 'Bench', 'reserve spots (IR not counted)')}
    <p style="margin-top:12px">Rounds: <b style="color:var(--ink)">${rounds()}</b> · picks in draft: <b style="color:var(--ink)">${totalPicks()}</b></p>
    <h3>Data</h3>
    <p>Built ${esc(new Date(DATA.built).toLocaleString())} from ${esc(DATA.sources.join(', '))}. Score = 40% expert consensus, 25% ${DATA.season} projection, 15% ${DATA.season - 1} PPG, 10% three-year PPG, 10% durability — within position.</p>
    <div class="row-actions"><button class="btn ghost wide" data-close="1">Done</button></div>`);
}

// ---- events -------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.take) { take(b.dataset.take); if (b.dataset.close) closeSheet(); return; }
  if (b.dataset.log) {
    // Chips are press-and-hold (see holdToLog) — a plain tap must never log a pick. Search hits
    // were typed on purpose, so they go straight through.
    if (b.classList.contains('chip')) return;
    ui.lq = ''; take(b.dataset.log); return;
  }
  if (b.dataset.writein != null) {
    // A name that isn't in the pool (obscure player, or a spelling the search can't match) still has
    // to occupy the pick, or every later team number is off by one.
    const name = b.dataset.writein.trim(); if (!name) return;
    const id = 'w:' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + ':' + current();
    S.writeIns = S.writeIns || {}; S.writeIns[id] = name; registerWriteIns(); ui.lq = ''; take(id); return;
  }
  if (b.dataset.takeMe) { S.picks.push({ id: b.dataset.takeMe, team: S.slot, no: current() }); save(); render(); closeSheet(); toast(`${P.get(b.dataset.takeMe).name} → you (out of turn)`); return; }
  if (b.dataset.open) { openPlayer(b.dataset.open); return; }
  if (b.dataset.undo != null) { const x = S.picks[+b.dataset.undo]; undoPick(+b.dataset.undo); toast(`${P.get(x.id).name} back on the board`); return; }
  if (b.dataset.undoId) { const i = S.picks.findIndex((x) => x.id === b.dataset.undoId); if (i >= 0) undoPick(i); closeSheet(); return; }
  if (b.dataset.tab) { ui.tab = b.dataset.tab; render(); return; }
  if (b.dataset.f) { ui.filter = b.dataset.f; ui.limit = 60; renderBoard(); return; }
  if (b.dataset.tog) { ui.showTaken = !ui.showTaken; renderBoard(); return; }
  if (b.dataset.more) { ui.limit += 60; renderBoard(); return; }
  if (b.dataset.step) { const [k, d] = b.dataset.step.split(':'); S.roster[k] = Math.max(k === 'BE' ? 0 : 0, Math.min(k === 'BE' ? 12 : 3, S.roster[k] + +d)); save(); openSettings(); renderClock(); renderCounts(); return; }
  if (b.dataset.close) { closeSheet(); return; }
  if (b.id === 'b-settings') { openSettings(); return; }
  if (b.id === 'b-reset') { if (b.dataset.armed) { resetDraft(); } else { b.dataset.armed = '1'; b.textContent = 'Tap again to clear everything'; setTimeout(() => { b.dataset.armed = ''; b.textContent = 'Clear the whole draft'; }, 4000); } return; }
});
$('sheet-bg').addEventListener('click', closeSheet);
$('s-teams').addEventListener('change', (e) => { S.teams = +e.target.value; if (S.slot > S.teams) S.slot = S.teams; S.picks.forEach((x, k) => (x.team = teamAt(k + 1))); save(); render(); });
$('s-slot').addEventListener('change', (e) => { S.slot = +e.target.value; save(); render(); });
$('q').addEventListener('input', (e) => { ui.q = e.target.value; ui.limit = 60; renderBoard(); });
document.addEventListener('input', (e) => { if (e.target.id === 'lq') { ui.lq = e.target.value; renderLogResults(); } });

// ---- press-and-hold on the likely-pick chips --------------------------------------------
// A big pill next to a search box is easy to brush. Holding for HOLD_MS fills the chip; letting
// go early (or scrolling — the browser fires pointercancel) does nothing.
const HOLD_MS = 2500;
const holdState = { el: null, t: null };
function holdCancel() { const h = holdState; if (!h.el) return; clearTimeout(h.t); h.el.classList.remove('holding'); h.el.style.removeProperty('--hold'); h.el = null; }
document.addEventListener('pointerdown', (e) => {
  const c = e.target.closest('#likely .chip.pick'); if (!c || !c.dataset.log) return;
  holdCancel(); holdState.el = c; c.style.setProperty('--hold', HOLD_MS + 'ms'); c.classList.add('holding');
  holdState.t = setTimeout(() => {
    const id = c.dataset.log; holdCancel();
    if (navigator.vibrate) navigator.vibrate(30);
    ui.lq = ''; take(id);
  }, HOLD_MS);
});
// Release or a scroll (the browser fires pointercancel) ends the hold. No pointerleave/contextmenu
// listeners: they made Chrome's synthetic mouse-event dispatch hang under automation.
for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, () => holdCancel(), true);

// ---- boot ----------------------------------------------------------------------------
(async () => {
  try {
    DATA = await (await fetch('players.json?v=' + Math.floor(Date.now() / 3.6e6))).json();
    DATA.players.forEach((p) => P.set(p.id, p));
    registerWriteIns();
    render();
  } catch (e) {
    $('turn').innerHTML = `<div class="empty">Couldn't load the player data (${esc(e.message)}). Reload, or rebuild players.json.</div>`;
  }
})();
