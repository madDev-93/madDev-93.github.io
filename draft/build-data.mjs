#!/usr/bin/env node
// Builds draft/players.json from public 2026 sources. Run with Node 20+ (global fetch):
//   node draft/build-data.mjs
// Sources (all keyless): ESPN fantasy API (rank/ADP/proj/2025/injury), FantasyPros ECR page
// (consensus rank, pos rank, tier, bye — scraped, the fragile one), FantasyFootballCalculator
// ADP (10-team PPR, last 7 days), nflverse season stats 2023-2025 + 2026 roster crosswalk,
// Sleeper players (age, experience, injury detail). Output is a single trimmed JSON.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SEASON = 2026;
const TEAMS = 10;
const LIMIT = 500;

const POS_BY_ESPN = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
const TEAM_BY_ESPN = { 0: "FA", 1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN", 8: "DET", 9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR", 15: "MIA", 16: "MIN", 17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI", 22: "ARI", 23: "PIT", 24: "LAC", 25: "SF", 26: "SEA", 27: "TB", 28: "WAS", 29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU" };
const normTeam = (t) => ({ LA: "LAR", JAC: "JAX", WSH: "WAS", OAK: "LV", SD: "LAC", STL: "LAR" }[t] || t || "FA");
const key = (name, pos) => `${name.toLowerCase().replace(/[^a-z]/g, "")}|${pos}`;

async function get(url, opts = {}, as = "json") {
  const r = await fetch(url, { ...opts, headers: { "user-agent": "Mozilla/5.0 (draft-board build)", ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return as === "json" ? r.json() : r.text();
}
function csv(text) {
  const lines = text.trim().split("\n"); const head = splitCsv(lines[0]);
  return lines.slice(1).map((l) => { const c = splitCsv(l); const o = {}; head.forEach((h, i) => (o[h] = c[i])); return o; });
}
function splitCsv(line) {
  const out = []; let cur = ""; let q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; }
  out.push(cur); return out;
}

// ---- 1. ESPN: ranks, ADP, projection, 2025 actuals, injury -------------------------------
console.error("ESPN…");
const espn = await get(
  `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leaguedefaults/3?view=kona_player_info`,
  { headers: { "x-fantasy-filter": JSON.stringify({ players: { limit: LIMIT, sortDraftRanks: { sortPriority: 100, sortAsc: true, value: "PPR" } } }) } });
const players = new Map();
for (const row of espn.players) {
  const p = row.player; const pos = POS_BY_ESPN[p.defaultPositionId]; if (!pos) continue;
  const proj = p.stats?.find((s) => s.seasonId === SEASON && s.statSourceId === 1 && s.scoringPeriodId === 0);
  const last = p.stats?.find((s) => s.seasonId === SEASON - 1 && s.statSourceId === 0 && s.scoringPeriodId === 0);
  const rec = {
    id: String(p.id), name: p.fullName, pos, team: normTeam(TEAM_BY_ESPN[p.proTeamId]),
    espnRank: p.draftRanksByRankType?.PPR?.rank ?? null,
    adpEspn: p.ownership?.averageDraftPosition ?? null,
    proj: proj ? +(+proj.appliedTotal).toFixed(1) : null,
    projPpg: proj ? +(+proj.appliedAverage).toFixed(2) : null,
    injury: p.injuryStatus && p.injuryStatus !== "ACTIVE" ? p.injuryStatus : null,
    outlook: p.seasonOutlook ? String(p.seasonOutlook).slice(0, 600) : null,
    history: {},
  };
  if (last && last.appliedTotal > 0) rec.history[SEASON - 1] = { pts: +(+last.appliedTotal).toFixed(1), ppg: +(+last.appliedAverage).toFixed(2), games: null };
  players.set(key(rec.name, pos), rec);
}
console.error(`  ${players.size} players`);

// ---- 2. FantasyPros ECR: consensus rank, pos rank, tier, bye ----------------------------
console.error("FantasyPros…");
try {
  const html = await get("https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php", {}, "text");
  const m = html.match(/var ecrData = (\{[\s\S]*?\});\s*\n/);
  if (!m) throw new Error("ecrData not found");
  const ecr = JSON.parse(m[1]);
  let hit = 0;
  for (const e of ecr.players || []) {
    const pos = e.player_position_id === "DST" ? "DST" : e.player_position_id;
    const rec = players.get(key(e.player_name, pos)); if (!rec) continue;
    hit++;
    rec.ecr = e.rank_ecr; rec.ecrAvg = +e.rank_ave; rec.ecrStd = +e.rank_std; rec.ecrMin = e.rank_min; rec.ecrMax = e.rank_max;
    rec.posRank = e.pos_rank; rec.tier = e.tier; rec.bye = e.player_bye_week ? +e.player_bye_week : null;
  }
  console.error(`  matched ${hit} (updated ${ecr.last_updated}, year ${ecr.year})`);
} catch (e) { console.error("  FantasyPros failed — continuing without consensus:", e.message); }

// ---- 3. FFC ADP (10-team PPR, last 7 days) ------------------------------------------------
console.error("FFC ADP…");
try {
  const ffc = await get(`https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=${TEAMS}&year=${SEASON}`);
  let hit = 0;
  for (const f of ffc.players || []) {
    const pos = f.position === "DEF" ? "DST" : f.position;
    const rec = players.get(key(f.name, pos)); if (!rec) continue;
    hit++; rec.adp = +f.adp; rec.adpStd = +f.stdev; rec.adpHigh = +f.high; rec.adpLow = +f.low; rec.bye ??= f.bye ? +f.bye : null;
  }
  console.error(`  matched ${hit} of ${ffc.players?.length} (${ffc.meta?.total_drafts} drafts ${ffc.meta?.start_date}→${ffc.meta?.end_date})`);
} catch (e) { console.error("  FFC failed:", e.message); }

// ---- 4. nflverse: 3-year history via 2026 roster crosswalk --------------------------------
console.error("nflverse…");
try {
  const roster = csv(await get(`https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_${SEASON}.csv`, {}, "text"));
  const byEspn = new Map(roster.filter((r) => r.espn_id).map((r) => [r.espn_id, r]));
  for (const rec of players.values()) {
    const r = byEspn.get(rec.id); if (!r) continue;
    rec.gsis = r.gsis_id; rec.birth = r.birth_date || null; rec.exp = r.years_exp !== "" ? +r.years_exp : null;
  }
  const byGsis = new Map([...players.values()].filter((p) => p.gsis).map((p) => [p.gsis, p]));
  for (const yr of [SEASON - 3, SEASON - 2, SEASON - 1]) {
    const rows = csv(await get(`https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_${yr}.csv`, {}, "text"));
    for (const s of rows) {
      const rec = byGsis.get(s.player_id); if (!rec) continue;
      const g = +s.games, pts = +s.fantasy_points_ppr;
      if (!g) continue;
      rec.history[yr] = { pts: +pts.toFixed(1), ppg: +(pts / g).toFixed(2), games: g };
    }
  }
  console.error(`  crosswalk ${byGsis.size}`);
} catch (e) { console.error("  nflverse failed:", e.message); }

// ---- 5. Sleeper: age, experience, injury detail --------------------------------------------
console.error("Sleeper…");
try {
  const sl = await get("https://api.sleeper.app/v1/players/nfl");
  const byEspn = new Map(); for (const v of Object.values(sl)) if (v.espn_id) byEspn.set(String(v.espn_id), v);
  let hit = 0;
  for (const rec of players.values()) {
    const s = byEspn.get(rec.id); if (!s) continue; hit++;
    rec.age = s.age ?? null; rec.exp ??= s.years_exp ?? null;
    if (s.injury_status) { rec.injury ??= s.injury_status; rec.injuryNote = [s.injury_body_part, s.injury_notes].filter(Boolean).join(" — ") || null; }
  }
  console.error(`  matched ${hit}`);
} catch (e) { console.error("  Sleeper failed:", e.message); }

// ---- 6. Derived: positional rank fallback, composite, risk ---------------------------------
const list = [...players.values()].filter((p) => p.espnRank != null || p.ecr != null);
for (const pos of Object.values(POS_BY_ESPN)) {
  list.filter((p) => p.pos === pos).sort((a, b) => (a.ecr ?? a.espnRank ?? 999) - (b.ecr ?? b.espnRank ?? 999))
    .forEach((p, i) => { p.posRank ??= `${pos}${i + 1}`; p.posIdx = i + 1; });
}
const yrs = [SEASON - 3, SEASON - 2, SEASON - 1];
const seasonStart = new Date(`${SEASON}-09-01`);
for (const p of list) {
  // Sleeper only carries `age` for a third of the pool; the roster file has birth dates for
  // nearly everyone, so derive age at season start from that when Sleeper is silent.
  if (p.age == null && p.birth) { const b = new Date(p.birth); if (!isNaN(b)) p.age = Math.floor((seasonStart - b) / (365.25 * 864e5)); }
  delete p.birth;
  const h = yrs.map((y) => p.history[y]).filter(Boolean);
  const gp = h.reduce((t, x) => t + (x.games || 0), 0), pts = h.reduce((t, x) => t + x.pts, 0);
  p.ppg3 = gp ? +(pts / gp).toFixed(2) : null;
  p.seasons = h.length;
  p.ppgLast = p.history[SEASON - 1]?.ppg ?? null;
  p.gamesLast = p.history[SEASON - 1]?.games ?? null;
  // Risk 0-100. Each term is a reason the ranking could be wrong, not a judgement of talent.
  let risk = 0; const why = [];
  if (p.injury) { risk += p.injury === "INJURY_RESERVE" || p.injury === "OUT" ? 45 : 25; why.push(p.injury.toLowerCase().replace("_", " ")); }
  const ageCap = { RB: 27, WR: 30, TE: 31, QB: 36, K: 40, DST: 99 }[p.pos];
  if (p.age && p.age >= ageCap) { risk += Math.min(30, (p.age - ageCap + 1) * 10); why.push(`age ${p.age}`); }
  if (p.exp === 0 || (p.seasons === 0 && p.exp != null && p.exp <= 1)) { risk += 20; why.push("rookie"); }
  else if (p.gamesLast != null && p.gamesLast < 12) { risk += 15; why.push(`${p.gamesLast} games in ${SEASON - 1}`); }
  if (p.ecrStd != null && p.ecr != null) { const spread = p.ecrStd / Math.max(4, p.ecr * 0.25); if (spread > 1) { risk += Math.min(20, Math.round(spread * 8)); why.push("experts split"); } }
  p.risk = Math.min(100, Math.round(risk)); p.riskWhy = why;
}
// Composite 0-100 within position, from rank consensus + projection + production + durability.
const pct = (arr, v, lowerBetter = false) => { if (v == null || !arr.length) return null; const n = arr.filter((x) => lowerBetter ? x > v : x < v).length; return n / arr.length; };
for (const pos of Object.values(POS_BY_ESPN)) {
  const grp = list.filter((p) => p.pos === pos);
  const ranks = grp.map((p) => p.ecr ?? p.espnRank).filter((x) => x != null);
  const projs = grp.map((p) => p.proj).filter((x) => x != null);
  const ppgs = grp.map((p) => p.ppgLast).filter((x) => x != null);
  const ppg3s = grp.map((p) => p.ppg3).filter((x) => x != null);
  for (const p of grp) {
    const parts = [
      [0.40, pct(ranks, p.ecr ?? p.espnRank, true)],
      [0.25, pct(projs, p.proj)],
      [0.15, pct(ppgs, p.ppgLast)],
      [0.10, pct(ppg3s, p.ppg3)],
      [0.10, 1 - p.risk / 100],
    ].filter(([, v]) => v != null);
    const w = parts.reduce((t, [a]) => t + a, 0);
    p.score = Math.round(parts.reduce((t, [a, v]) => t + a * v, 0) / w * 100);
  }
}
list.sort((a, b) => (a.ecr ?? a.espnRank ?? 999) - (b.ecr ?? b.espnRank ?? 999));
list.forEach((p, i) => (p.rank = i + 1));

const out = {
  built: new Date().toISOString(), season: SEASON, teams: TEAMS, scoring: "PPR",
  sources: ["ESPN fantasy API", "FantasyPros ECR", "FantasyFootballCalculator ADP", "nflverse stats 2023-2025", "Sleeper"],
  players: list.map(({ gsis, outlook, ...p }) => ({ ...p, outlook: outlook || undefined })),
};
mkdirSync(here, { recursive: true });
writeFileSync(join(here, "players.json"), JSON.stringify(out));
console.error(`wrote players.json — ${list.length} players, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
