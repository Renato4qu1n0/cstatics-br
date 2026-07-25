/* ============================================================
   CSTATICS BRASIL — Validação de integridade dos dados
   Roda com `npm test`. Não precisa de build.
   Pega erros de conteúdo (slug duplicado, campo faltando, from/to
   inexistente, execução apontando para lineup que não existe) ANTES
   de virar página quebrada no ar.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'src', '_data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

let errors = 0;
let checks = 0;
const fail = (msg) => { errors++; console.log('  ✗ ' + msg); };
const ok = () => { checks++; };
const has = (o, k) => o[k] !== undefined && o[k] !== null && o[k] !== '';

// ---- carrega ----
let maps, mapgeo, lineups, executions, tactics, nav, site;
try {
  maps = read('maps.json').maps;
  mapgeo = read('mapgeo.json');
  lineups = read('lineups.json').lineups;
  executions = read('executions.json').executions;
  tactics = read('tactics.json').tactics;
  nav = read('navigation.json');
  site = read('site.json');
} catch (e) {
  console.log('ERRO ao ler/parsear JSON:', e.message);
  process.exit(1);
}

const UTILS = new Set((nav.utilities || []).map((u) => u.slug));
const DIFFS = new Set((nav.difficulties || []).map((d) => d.slug));
const mapSlugs = new Set(maps.map((m) => m.slug));

function uniqueSlugs(list, label) {
  const seen = new Set();
  list.forEach((it) => {
    if (!has(it, 'slug')) return fail(`${label}: item sem slug`);
    if (!/^[a-z0-9-]+$/.test(it.slug)) fail(`${label}: slug inválido "${it.slug}"`);
    if (seen.has(it.slug)) fail(`${label}: slug duplicado "${it.slug}"`); else { seen.add(it.slug); ok(); }
  });
}

function calloutExists(map, key) {
  return mapgeo[map] && mapgeo[map].callouts && mapgeo[map].callouts[key];
}

console.log('\n=== MAPAS ===');
uniqueSlugs(maps, 'maps');
maps.forEach((m) => {
  ['name', 'slug', 'description', 'summary'].forEach((k) => { if (!has(m, k)) fail(`map ${m.slug}: falta "${k}"`); else ok(); });
  if (!has(m, 'logo')) fail(`map ${m.slug}: falta logo`);
  else if (!fs.existsSync(path.join(__dirname, '..', 'src', m.logo.replace(/^\//, '')))) fail(`map ${m.slug}: logo não existe (${m.logo})`); else ok();
});

console.log('\n=== MAPGEO ===');
Object.keys(mapgeo).filter((k) => k !== '_nota').forEach((k) => {
  const g = mapgeo[k];
  if (!mapSlugs.has(k)) fail(`mapgeo "${k}" não corresponde a nenhum mapa`);
  if (!g.callouts || !Object.keys(g.callouts).length) fail(`mapgeo ${k}: sem callouts`); else ok();
  (g.sites || []).forEach((s, i) => { if (!has(s, 'points') || !has(s, 'label')) fail(`mapgeo ${k}: site[${i}] incompleto`); else ok(); });
  (g.objects || []).forEach((o, i) => { if (['x', 'y', 'w', 'h'].some((d) => o[d] === undefined)) fail(`mapgeo ${k}: object[${i}] incompleto`); else ok(); });
});

console.log('\n=== LINEUPS ===');
uniqueSlugs(lineups, 'lineups');
lineups.forEach((l) => {
  ['title', 'map', 'utility', 'side', 'position', 'shortDescription', 'description'].forEach((k) => { if (!has(l, k)) fail(`lineup ${l.slug}: falta "${k}"`); else ok(); });
  if (!mapSlugs.has(l.map)) fail(`lineup ${l.slug}: mapa "${l.map}" inexistente`); else ok();
  if (l.utility && !UTILS.has(l.utility)) fail(`lineup ${l.slug}: utilitária "${l.utility}" inválida`); else ok();
  if (l.side && !['t', 'ct'].includes(l.side)) fail(`lineup ${l.slug}: side "${l.side}" inválido`); else ok();
  if (l.difficulty && !DIFFS.has(l.difficulty)) fail(`lineup ${l.slug}: dificuldade "${l.difficulty}" inválida`); else ok();
  if (!Array.isArray(l.steps) || !l.steps.length) fail(`lineup ${l.slug}: sem passo a passo`); else ok();
  if (has(l, 'from') && !calloutExists(l.map, l.from)) fail(`lineup ${l.slug}: callout "from=${l.from}" não existe em ${l.map}`); else if (has(l, 'from')) ok();
  if (has(l, 'to') && !calloutExists(l.map, l.to)) fail(`lineup ${l.slug}: callout "to=${l.to}" não existe em ${l.map}`); else if (has(l, 'to')) ok();
});

console.log('\n=== EXECUÇÕES ===');
uniqueSlugs(executions, 'executions');
const lineupSlugs = new Set(lineups.map((l) => l.slug));
executions.forEach((e) => {
  ['title', 'map', 'side', 'shortDescription', 'description'].forEach((k) => { if (!has(e, k)) fail(`exec ${e.slug}: falta "${k}"`); else ok(); });
  if (!mapSlugs.has(e.map)) fail(`exec ${e.slug}: mapa "${e.map}" inexistente`); else ok();
  if (!Array.isArray(e.throws) || !e.throws.length) fail(`exec ${e.slug}: sem throws`); else ok();
  (e.throws || []).forEach((t) => {
    if (!lineupSlugs.has(t.lineup)) fail(`exec ${e.slug}: referencia lineup inexistente "${t.lineup}"`); else ok();
    const l = lineups.find((x) => x.slug === t.lineup);
    if (l && l.map !== e.map) fail(`exec ${e.slug}: lineup "${t.lineup}" é de outro mapa (${l.map})`); else if (l) ok();
  });
});

console.log('\n=== TÁTICAS ===');
uniqueSlugs(tactics, 'tactics');
tactics.forEach((t) => {
  ['title', 'map', 'mapSlug', 'side', 'shortDescription', 'description'].forEach((k) => { if (!has(t, k)) fail(`tática ${t.slug}: falta "${k}"`); else ok(); });
  if (t.mapSlug && !mapSlugs.has(t.mapSlug)) fail(`tática ${t.slug}: mapSlug "${t.mapSlug}" inexistente`); else ok();
  if (!Array.isArray(t.steps) || !t.steps.length) fail(`tática ${t.slug}: sem passo a passo`); else ok();
  if (t.side && !['t-side', 'ct-side'].includes(t.side)) fail(`tática ${t.slug}: side "${t.side}" inválido`); else ok();
});

console.log('\n=== SITE ===');
['name', 'url', 'description', 'email'].forEach((k) => { if (!has(site, k)) fail(`site.json: falta "${k}"`); else ok(); });

console.log('\n' + '─'.repeat(48));
console.log(`Verificações: ${checks} | Conteúdo: ${lineups.length} lineups, ${executions.length} execuções, ${tactics.length} táticas, ${maps.length} mapas`);
if (errors) {
  console.log(`\n❌ ${errors} ERRO(S) DE INTEGRIDADE. Corrija antes de publicar.\n`);
  process.exit(1);
}
console.log('\n✅ Tudo íntegro.\n');
