"use strict";

/* ============================================================
   MAPGEN — générateur de plan de lieu tactique PROCÉDURAL.

   Leaf PUR (profil `storage`/`skillcatalog`) : reçoit ses paramètres
   (siteType, graine, accent, titre), ne connaît ni le DOM, ni `App`,
   ni Storage, ni une édition en dur. Il *construit* une géométrie de
   bâtiment jouable — murs, pièces, couloir, portes, grille tactique —
   et la rend en SVG. Déterministe par graine : `{mapSeed, siteType}`
   suffit à régénérer le plan à l'identique (rien de lourd à stocker).

   Contrairement au « Plan du lieu » Pollinations (text-to-image, qui
   *peint* une ambiance non jouable), ce plan est CONSTRUIT : gratuit,
   instantané, possédé par l'app, dérivé du run.

   Modèle : grille de cellules (case 24px ≈ 2 m), empreinte rectangle
   ou en L, COULOIR À DOUBLE RANGÉE desservant les pièces (l'archétype
   du vrai plan de bâtiment). Connexité garantie par construction.

   Palette = hex cyberpunk EN DUR : c'est une scène physique qui ne
   doit pas s'inverser au thème clair. Seul l'accent DA (liseré + ✱)
   est un paramètre, fourni par l'appelant depuis `editionModule.mapAccent`.
   ============================================================ */

/* ---- RNG seedé (déterminisme) ---- */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- Palette (scène physique, hex en dur — ne s'inverse pas au thème) ---- */
const PAL = {
  outside: "#080b10", floor: "#141d27", floorObj: "#20263a", corr: "#0f161e",
  wall: "#04070b", grid: "rgba(120,190,210,0.08)", furnFill: "#1e2c37",
  furnStroke: "#42606e", label: "#8fb4c0", entry: "#57d9a6", door: "#5f8290",
};

/* ---- Mobilier — variantes seedées par type de pièce ---- */
function r(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${PAL.furnFill}" stroke="${PAL.furnStroke}" stroke-width="1"/>`;
}
function c(x, y, rad) {
  return `<circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="${PAL.furnStroke}" stroke-width="1"/>`;
}
function dot(x, y, rad, col) {
  return `<circle cx="${x}" cy="${y}" r="${rad}" fill="${col}"/>`;
}
const FURN = {
  accueil(f, rng) { let s = "", dw = Math.min(f.w - 24, 90); if (rng() < 0.5) { s += r(f.x + 12, f.y + 10, dw, 15); s += c(f.x + 12 + dw * 0.3, f.y + 32, 3.5) + c(f.x + 12 + dw * 0.7, f.y + 32, 3.5); } else { s += `<path d="M${f.x + 12} ${f.y + 26} h${dw} v-14 h-${Math.round(dw * 0.5)}" fill="none" stroke="${PAL.furnStroke}" stroke-width="2.5"/>`; s += c(f.x + f.w - 24, f.y + f.h - 22, 3.5); } return s; },
  bureau(f, rng) { let s = "", cols = f.w > 150 ? 2 : 1, rows = f.h > 150 ? 2 : 1, gx = f.w / (cols + 1), gy = f.h / (rows + 1); for (let i = 1; i <= cols; i++) for (let j = 1; j <= rows; j++) { let x = f.x + gx * i - 20, y = f.y + gy * j - 10; if (x < f.x + 4 || y < f.y + 4) continue; s += r(x, y, 40, 20) + dot(x + 7, y + 5, 1.5, PAL.entry) + c(x + 20, y + 27, 3.5); } return s; },
  direction(f, rng) { let cx = f.x + f.w / 2, s = r(cx - 28, f.y + 12, 56, 24); s += c(cx - 14, f.y + 46, 3.5) + c(cx + 14, f.y + 46, 3.5); s += r(f.x + 10, f.y + f.h - 26, Math.min(48, f.w - 20), 16); return s; },
  serveur(f, rng) { let s = "", n = Math.max(3, Math.floor((f.h - 20) / 20)); for (let i = 0; i < n; i++) { let y = f.y + 12 + i * 20; s += r(f.x + 10, y, 22, 14); if (f.w > 90) s += r(f.x + f.w - 32, y, 22, 14); } return s; },
  coffre(f, rng) { let cx = f.x + f.w / 2, cy = f.y + f.h / 2, sz = Math.min(f.w, f.h, 70) * 0.6; let s = r(cx - sz / 2, cy - sz / 2, sz, sz); s += c(cx, cy, sz * 0.26) + dot(cx + sz * 0.3, cy, 2, PAL.furnStroke); return s; },
  labo(f, rng) { let s = r(f.x + 10, f.y + 12, f.w - 20, 12) + r(f.x + 10, f.y + f.h - 24, f.w - 20, 12), n = Math.max(2, Math.floor(f.w / 40)); for (let i = 0; i < n; i++) s += c(f.x + 26 + i * 38, f.y + f.h / 2, 7); return s; },
  securite(f, rng) { let s = "", n = Math.max(3, Math.floor((f.w - 20) / 18)); for (let i = 0; i < n; i++) s += r(f.x + 10 + i * 18, f.y + 10, 14, 12); s += r(f.x + 12, f.y + f.h - 22, f.w - 24, 12); return s; },
  repos(f, rng) { let s = ""; if (rng() < 0.5) { s += r(f.x + 12, f.y + 12, 44, 22); if (f.w > 110) s += r(f.x + f.w - 56, f.y + 12, 44, 22); s += r(f.x + f.w / 2 - 16, f.y + f.h - 30, 32, 18); } else { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { let x = f.x + 16 + i * (f.w - 56), y = f.y + 14 + j * 30; s += r(x, y, 40, 22); } } return s; },
  stockage(f, rng) { let s = "", cs = 20, cols = Math.floor((f.w - 12) / cs), rows = Math.floor((f.h - 12) / cs); for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { if (rng() < 0.35) continue; s += r(f.x + 8 + i * cs, f.y + 8 + j * cs, cs - 6, cs - 6); } return s; },
  quai(f, rng) { let s = `<rect x="${f.x + 8}" y="${f.y + 8}" width="${f.w - 16}" height="16" rx="1.5" fill="none" stroke="${PAL.entry}" stroke-dasharray="4 4"/>`, cs = 22; for (let i = 0; i < Math.floor((f.w - 16) / cs); i++) for (let j = 0; j < Math.floor((f.h - 38) / cs); j++) { if (rng() < 0.45) continue; s += r(f.x + 10 + i * cs, f.y + 32 + j * cs, cs - 8, cs - 8); } return s; },
  bar(f, rng) { let s = `<path d="M${f.x + 10} ${f.y + 10} h${Math.min(f.w - 32, 72)} v${Math.min(f.h - 32, 44)}" fill="none" stroke="${PAL.furnStroke}" stroke-width="3"/>`; for (let i = 0; i < 4; i++) s += c(f.x + 18 + i * 16, f.y + f.h - 18, 3.5); s += r(f.x + f.w - 40, f.y + f.h - 34, 26, 22); return s; },
  sanitaire(f, rng) { let s = "", n = Math.max(2, Math.floor((f.w - 12) / 22)); for (let i = 0; i < n; i++) s += r(f.x + 8 + i * 22, f.y + 10, 17, f.h * 0.38); return s; },
  couloir() { return ""; },
};
const KL = {
  accueil: "ACCUEIL", bureau: "BUREAUX", direction: "DIRECTION", serveur: "SALLE SERVEUR",
  coffre: "COFFRE", labo: "LABORATOIRE", securite: "SÉCURITÉ", repos: "REPOS",
  stockage: "STOCKAGE", quai: "QUAI", bar: "BAR", sanitaire: "SANITAIRES", couloir: "",
};
/* Types de site mapgen : vocabulaire de pièces + entrée + objectif. */
const SITES = {
  corpo: { label: "un étage de bureau corpo", entry: "accueil", obj: "serveur", pool: ["bureau", "bureau", "bureau", "bureau", "direction", "securite", "repos", "sanitaire", "stockage"] },
  entrepot: { label: "un entrepôt portuaire", entry: "quai", obj: "coffre", pool: ["stockage", "stockage", "stockage", "quai", "bureau", "securite", "repos"] },
  labo: { label: "un laboratoire de R&D", entry: "accueil", obj: "labo", pool: ["labo", "labo", "bureau", "serveur", "securite", "stockage", "repos", "bureau"] },
  club: { label: "l'arrière-salle d'un club", entry: "accueil", obj: "bureau", pool: ["bar", "bar", "repos", "securite", "stockage", "sanitaire", "repos"] },
  residence: { label: "une résidence sécurisée", entry: "accueil", obj: "direction", pool: ["repos", "repos", "repos", "bureau", "bar", "sanitaire", "securite"] },
  clinique: { label: "une clinique clandestine", entry: "accueil", obj: "labo", pool: ["labo", "labo", "repos", "bureau", "stockage", "securite", "sanitaire"] },
};

/* ---- Grille ---- */
const COLS = 26, ROWS = 16, CELL = 24, OX = 18, OY = 18, VOID = -1, CORR = 0;

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* Construit le modèle géométrique (pièces + couloir + portes) — sans rendu. */
function buildModel(siteKey, seedStr) {
  const rng = mulberry32(xmur3(seedStr)());
  const site = SITES[siteKey] || SITES.corpo;
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(VOID));
  const rooms = [];
  const doors = new Set();
  let entrance = null;
  let junction = null, notch = null;

  /* Empreinte : rectangle plein ou L (encoche de coin → 2 sous-rects). */
  let subrects = [];
  if (rng() < 0.5) {
    subrects = [{ c0: 0, r0: 0, c1: COLS - 1, r1: ROWS - 1 }];
  } else {
    const right = rng() < 0.5, top = rng() < 0.5;
    const nw = 6 + Math.floor(rng() * 5), nh = 5 + Math.floor(rng() * 4);
    const nx0 = right ? COLS - nw : 0, nx1 = right ? COLS - 1 : nw - 1;
    const ny0 = top ? 0 : ROWS - nh, ny1 = top ? nh - 1 : ROWS - 1;
    const slab = right ? { c0: 0, r0: 0, c1: nx0 - 1, r1: ROWS - 1 } : { c0: nx1 + 1, r0: 0, c1: COLS - 1, r1: ROWS - 1 };
    const hs = top ? { c0: nx0, r0: ny1 + 1, c1: nx1, r1: ROWS - 1 } : { c0: nx0, r0: 0, c1: nx1, r1: ny0 - 1 };
    subrects = [slab, hs];
    junction = right ? { col: nx0 - 1, rows: [hs.r0, hs.r1] } : { col: nx1, rows: [hs.r0, hs.r1] };
    notch = { c0: nx0, r0: ny0, c1: nx1, r1: ny1 };
  }

  function markRoom(cc0, rr0, cc1, rr1, corridorEdge) {
    const idx = rooms.length;
    const room = { c0: cc0, r0: rr0, c1: cc1, r1: rr1, idx };
    for (let r = rr0; r <= rr1; r++) for (let c = cc0; c <= cc1; c++) grid[r][c] = idx + 1;
    rooms.push(room);
    if (corridorEdge) doors.add(corridorEdge);
    return room;
  }

  /* Tranche une bande longeant le couloir en pièces (largeur 4–6 cases),
     avec split de profondeur occasionnel (pièce avant/arrière). */
  function sliceBand(cA, cB, rStart, rEnd, corridorSide, corridorRow) {
    const horiz = corridorSide === "below" || corridorSide === "above";
    let pos = horiz ? cA : rStart;
    const end = horiz ? cB : rEnd;
    const depth = horiz ? rEnd - rStart + 1 : cB - cA + 1;
    while (pos <= end) {
      let ext = 4 + Math.floor(rng() * 3);
      if (end - (pos + ext - 1) < 4) ext = end - pos + 1;
      const a = pos, b = Math.min(pos + ext - 1, end);
      if (horiz) {
        const mid = Math.floor((a + b) / 2);
        if (depth >= 5 && rng() < 0.28) {
          const fd = 2 + Math.floor(rng() * (depth - 3));
          let front, back;
          if (corridorSide === "below") { const split = rEnd - fd + 1; back = { r0: rStart, r1: split - 1 }; front = { r0: split, r1: rEnd }; doors.add("H:" + (split - 1) + ":" + mid); }
          else { const split = rStart + fd - 1; front = { r0: rStart, r1: split }; back = { r0: split + 1, r1: rEnd }; doors.add("H:" + split + ":" + mid); }
          markRoom(a, back.r0, b, back.r1, null);
          const de = corridorSide === "below" ? "H:" + rEnd + ":" + mid : "H:" + (rStart - 1) + ":" + mid;
          markRoom(a, front.r0, b, front.r1, de);
        } else {
          const de = corridorSide === "below" ? "H:" + rEnd + ":" + mid : "H:" + (rStart - 1) + ":" + mid;
          markRoom(a, rStart, b, rEnd, de);
        }
      } else {
        const mid = Math.floor((a + b) / 2);
        if (depth >= 5 && rng() < 0.28) {
          const fd = 2 + Math.floor(rng() * (depth - 3));
          let front, back;
          if (corridorSide === "right") { const split = cB - fd + 1; back = { c0: cA, c1: split - 1 }; front = { c0: split, c1: cB }; doors.add("V:" + mid + ":" + (split - 1)); }
          else { const split = cA + fd - 1; front = { c0: cA, c1: split }; back = { c0: split + 1, c1: cB }; doors.add("V:" + mid + ":" + split); }
          markRoom(back.c0, a, back.c1, b, null);
          const de = corridorSide === "right" ? "V:" + mid + ":" + cB : "V:" + mid + ":" + (cA - 1);
          markRoom(front.c0, a, front.c1, b, de);
        } else {
          const de = corridorSide === "right" ? "V:" + mid + ":" + cB : "V:" + mid + ":" + (cA - 1);
          markRoom(cA, a, cB, b, de);
        }
      }
      pos = b + 1;
    }
  }

  /* Couloir à double rangée le long du grand axe du sous-rect. */
  function layout(sr) {
    const w = sr.c1 - sr.c0 + 1, h = sr.r1 - sr.r0 + 1;
    if (w >= h) {
      const cr = sr.r0 + Math.max(1, Math.min(h - 2, Math.round(h * (0.4 + 0.2 * rng()))));
      for (let c = sr.c0; c <= sr.c1; c++) grid[cr][c] = CORR;
      if (cr - 1 >= sr.r0) sliceBand(sr.c0, sr.c1, sr.r0, cr - 1, "below", cr);
      if (cr + 1 <= sr.r1) sliceBand(sr.c0, sr.c1, cr + 1, sr.r1, "above", cr);
      sr.mouth = { r: cr, c: sr.c0, o: "V" };
      if (sr.c0 === 0) entrance = entrance || { type: "V", r: cr, c: -1 };
    } else {
      const cc = sr.c0 + Math.max(1, Math.min(w - 2, Math.round(w * (0.4 + 0.2 * rng()))));
      for (let r = sr.r0; r <= sr.r1; r++) grid[r][cc] = CORR;
      if (cc - 1 >= sr.c0) sliceBand(sr.c0, cc - 1, sr.r0, sr.r1, "right", cc);
      if (cc + 1 <= sr.c1) sliceBand(cc + 1, sr.c1, sr.r0, sr.r1, "left", cc);
      sr.mouth = { r: sr.r0, c: cc, o: "H" };
      if (sr.r0 === 0) entrance = entrance || { type: "H", r: -1, c: cc };
    }
  }

  subrects.forEach(layout);
  if (!entrance) { const m = subrects[0].mouth; entrance = m.o === "V" ? { type: "V", r: m.r, c: -1 } : { type: "H", r: -1, c: m.c }; }
  // Porte de jonction pour une empreinte en L (relie les deux sous-rects).
  if (junction) { const rm = Math.round((junction.rows[0] + junction.rows[1]) / 2); doors.add("V:" + rm + ":" + junction.col); }

  /* Attribution des pièces : objectif au point le plus profond, accueil au
     débouché du couloir, reste depuis le pool (sans doublon adjacent). */
  const mouthPx = entrance.type === "V" ? { x: OX, y: OY + (entrance.r + 0.5) * CELL } : { x: OX + (entrance.c + 0.5) * CELL, y: OY };
  rooms.forEach((rm) => { rm.cx = OX + ((rm.c0 + rm.c1 + 1) / 2) * CELL; rm.cy = OY + ((rm.r0 + rm.r1 + 1) / 2) * CELL; });
  let accueil = rooms[0];
  rooms.forEach((rm) => { if (Math.hypot(rm.cx - mouthPx.x, rm.cy - mouthPx.y) < Math.hypot(accueil.cx - mouthPx.x, accueil.cy - mouthPx.y)) accueil = rm; });
  let obj = rooms[0];
  rooms.forEach((rm) => { if (Math.hypot(rm.cx - mouthPx.x, rm.cy - mouthPx.y) > Math.hypot(obj.cx - mouthPx.x, obj.cy - mouthPx.y)) obj = rm; });
  if (obj === accueil && rooms.length > 1) obj = rooms.find((x) => x !== accueil);
  const bag = shuffle(site.pool.slice(), rng);
  let pi = 0, prev = null;
  rooms.forEach((rm) => {
    if (rm === obj) { rm.kind = site.obj; prev = null; return; }
    if (rm === accueil) { rm.kind = site.entry; prev = null; return; }
    let k, tries = 0;
    do { k = bag[pi % bag.length]; pi++; tries++; } while (k === prev && tries < bag.length);
    rm.kind = k; prev = k;
  });

  return { grid, rooms, doors, obj, accueil, entrance, site, notch };
}

/* ---- Rendu SVG ---- */
function px(c, r) { return [OX + c * CELL, OY + r * CELL]; }

function swing(o, r, c, dir, DW) {
  if (o === "V") {
    const x = OX + (c + 1) * CELL, y0 = OY + r * CELL + 3, y1 = OY + (r + 1) * CELL - 3, dx = dir;
    return `<path d="M ${x} ${y1} A ${DW} ${DW} 0 0 ${dir > 0 ? 0 : 1} ${x + dx * DW} ${y0}" fill="none" stroke="${PAL.door}" stroke-width="1"/><line x1="${x}" y1="${y1}" x2="${x + dx * DW}" y2="${y1}" stroke="${PAL.door}" stroke-width="1.5"/>`;
  }
  const y = OY + (r + 1) * CELL, x0 = OX + c * CELL + 3, x1 = OX + (c + 1) * CELL - 3, dy = dir;
  return `<path d="M ${x1} ${y} A ${DW} ${DW} 0 0 ${dir > 0 ? 1 : 0} ${x0} ${y + dy * DW}" fill="none" stroke="${PAL.door}" stroke-width="1"/><line x1="${x1}" y1="${y}" x2="${x1}" y2="${y + dy * DW}" stroke="${PAL.door}" stroke-width="1.5"/>`;
}

function esc(x) {
  return String(x).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function renderSVG(M, accent, title, subtitle) {
  const g = M.grid, W = 680, H = 470, cartY = OY + ROWS * CELL + 10, DW = CELL - 6;
  const at = (r, c) => (r < 0 || r >= ROWS || c < 0 || c >= COLS ? VOID : g[r][c]);
  const sub = subtitle || M.site.label;
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="system-ui,sans-serif"><title>Plan tactique — ${esc(title || "lieu")}</title><desc>Plan de bâtiment procédural : couloir, pièces, portes, grille tactique.</desc>`;
  s += `<defs><marker id="mapgen-arw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="${PAL.entry}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="${PAL.outside}"/>`;
  M.rooms.forEach((rm) => { const [x, y] = px(rm.c0, rm.r0); s += `<rect x="${x}" y="${y}" width="${(rm.c1 - rm.c0 + 1) * CELL}" height="${(rm.r1 - rm.r0 + 1) * CELL}" fill="${rm === M.obj ? PAL.floorObj : PAL.floor}"/>`; });
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (g[r][c] === CORR) { const [x, y] = px(c, r); s += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${PAL.corr}"/>`; } }
  s += `<g stroke="${PAL.grid}" stroke-width="1">`;
  for (let c = 0; c <= COLS; c++) s += `<line x1="${OX + c * CELL}" y1="${OY}" x2="${OX + c * CELL}" y2="${OY + ROWS * CELL}"/>`;
  for (let r = 0; r <= ROWS; r++) s += `<line x1="${OX}" y1="${OY + r * CELL}" x2="${OX + COLS * CELL}" y2="${OY + r * CELL}"/>`;
  s += `</g>`;
  if (M.notch) { const [nx, ny] = px(M.notch.c0, M.notch.r0); s += `<rect x="${nx}" y="${ny}" width="${(M.notch.c1 - M.notch.c0 + 1) * CELL}" height="${(M.notch.r1 - M.notch.r0 + 1) * CELL}" fill="${PAL.outside}"/>`; }
  M.rooms.forEach((rm) => { const [x, y] = px(rm.c0, rm.r0); const f = { x: x + 5, y: y + 20, w: (rm.c1 - rm.c0 + 1) * CELL - 10, h: (rm.r1 - rm.r0 + 1) * CELL - 26 }; if (f.w > 18 && f.h > 18 && FURN[rm.kind]) s += FURN[rm.kind](f, mulberry32((rm.idx * 2654435761) >>> 0)); });
  let ext = "", extAcc = "", inner = "", swings = "";
  for (let r = 0; r < ROWS; r++) { for (let c = -1; c < COLS; c++) { const L = at(r, c), R = at(r, c + 1); if (L === VOID && R === VOID) continue; const x = OX + (c + 1) * CELL, y0 = OY + r * CELL, y1 = OY + (r + 1) * CELL;
    if ((L === VOID) !== (R === VOID)) { if (M.entrance.type === "V" && M.entrance.r === r && (M.entrance.c === c || (M.entrance.c < 0 && c === -1))) continue;
      ext += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}"/>`; const off = (R !== VOID ? 1 : -1) * 3; extAcc += `<line x1="${x + off}" y1="${y0}" x2="${x + off}" y2="${y1}"/>`;
    } else if (L !== R) { if (M.doors.has("V:" + r + ":" + c)) swings += swing("V", r, c, R === CORR ? 1 : L === CORR ? -1 : 1, DW); else inner += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}"/>`; }
  } }
  for (let c = 0; c < COLS; c++) { for (let r = -1; r < ROWS; r++) { const T = at(r, c), B = at(r + 1, c); if (T === VOID && B === VOID) continue; const y = OY + (r + 1) * CELL, x0 = OX + c * CELL, x1 = OX + (c + 1) * CELL;
    if ((T === VOID) !== (B === VOID)) { if (M.entrance.type === "H" && M.entrance.c === c && (M.entrance.r === r || (M.entrance.r < 0 && r === -1))) continue;
      ext += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>`; const off = (B !== VOID ? 1 : -1) * 3; extAcc += `<line x1="${x0}" y1="${y + off}" x2="${x1}" y2="${y + off}"/>`;
    } else if (T !== B) { if (M.doors.has("H:" + r + ":" + c)) swings += swing("H", r, c, B === CORR ? 1 : T === CORR ? -1 : 1, DW); else inner += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>`; }
  } }
  s += `<g stroke="${PAL.wall}" stroke-width="2.5" stroke-linecap="square">${inner}</g>`;
  s += `<g>${swings}</g>`;
  s += `<g stroke="${PAL.wall}" stroke-width="6" stroke-linecap="square">${ext}</g>`;
  s += `<g stroke="${accent}" stroke-width="1.3" stroke-linecap="square" opacity="0.8">${extAcc}</g>`;
  M.rooms.forEach((rm) => { const lab = KL[rm.kind] || ""; if (!lab || rm.c1 - rm.c0 + 1 < 2) return; const [x, y] = px(rm.c0, rm.r0); s += `<text x="${rm.cx}" y="${y + 15}" text-anchor="middle" fill="${rm === M.obj ? accent : PAL.label}" font-size="10" letter-spacing="1" font-weight="500">${lab}</text>`; });
  s += `<text x="${M.obj.cx}" y="${M.obj.cy + 6}" text-anchor="middle" fill="${accent}" font-size="19" font-weight="700" opacity="0.9">✱</text>`;
  const [, oy] = px(M.obj.c0, M.obj.r0); s += `<text x="${M.obj.cx}" y="${oy + (M.obj.r1 - M.obj.r0 + 1) * CELL - 7}" text-anchor="middle" fill="${accent}" font-size="8" letter-spacing="1.5">OBJECTIF</text>`;
  const e = M.entrance; let ex, ey, ax, ay;
  if (e.type === "V") { ex = OX; ey = OY + (e.r + 0.5) * CELL; ax = ex - 15; ay = ey; s += `<text x="${OX + 4}" y="${ay - 7}" text-anchor="start" fill="${PAL.entry}" font-size="9" letter-spacing="1">ENTRÉE</text>`; }
  else { ex = OX + (e.c + 0.5) * CELL; ey = OY; ax = ex; ay = ey - 15; s += `<text x="${ax}" y="${ay - 4}" text-anchor="middle" fill="${PAL.entry}" font-size="9" letter-spacing="1">ENTRÉE</text>`; }
  s += `<line x1="${ax}" y1="${ay}" x2="${ex}" y2="${ey}" stroke="${PAL.entry}" stroke-width="2" marker-end="url(#mapgen-arw)"/>`;
  s += `<text x="${OX}" y="${cartY + 16}" fill="${PAL.label}" font-size="15" font-weight="600" letter-spacing="0.5">${esc(title || "PLAN DU LIEU")}</text>`;
  s += `<text x="${OX}" y="${cartY + 32}" fill="${PAL.label}" font-size="11" opacity="0.7">${esc(sub)}</text>`;
  const scX = OX + COLS * CELL - 120, scY = cartY + 26;
  s += `<line x1="${scX}" y1="${scY}" x2="${scX + 72}" y2="${scY}" stroke="${PAL.label}" stroke-width="1.5"/>`;
  for (let i = 0; i <= 3; i++) s += `<line x1="${scX + i * 24}" y1="${scY - 3}" x2="${scX + i * 24}" y2="${scY + 3}" stroke="${PAL.label}" stroke-width="1"/>`;
  s += `<text x="${scX + 76}" y="${scY + 4}" fill="${PAL.label}" font-size="10">≈ 6 m · case 2 m</text>`;
  s += `<text x="${scX}" y="${scY - 8}" fill="${PAL.label}" font-size="9" opacity="0.7">ÉCHELLE</text>`;
  s += `</svg>`;
  return s;
}

/* Mappe le siteType du catalogue (+ mots-clés du lieu) vers une clé mapgen. */
function siteKeyFor(siteType, lieu) {
  const t = (lieu || "").toLowerCase();
  if (/labo|laborato/.test(t)) return "labo";
  if (/clinique|h[oô]pital|body mall|infirmerie/.test(t)) return "clinique";
  if (/entrep[oô]|dock|quai|cargo|usine|d[eé]p[oô]t|hangar|ferme/.test(t)) return "entrepot";
  if (/club|\bbar\b|penumbra|funhouse|resto|restaurant|loge|casino/.test(t)) return "club";
  if (/penthouse|r[eé]sidence|manoir|villa|appart|penthouse|suite/.test(t)) return "residence";
  const map = { corporatiste: "corpo", industriel: "entrepot", residentiel: "residence", commercial: "club", abandonne: "entrepot", naturel: "corpo" };
  return map[siteType] || "corpo";
}

export const MapGen = {
  /** Construit le SVG d'un plan de lieu tactique. Déterministe par `seed`.
      `accent` = couleur DA (hex), fournie par l'appelant depuis
      `editionModule.mapAccent`. `title`/`subtitle` = cartouche. */
  build({ siteType, seed, accent = "#35e0e6", title = "", subtitle = "", lieu = "" } = {}) {
    const key = siteKeyFor(siteType, lieu);
    const M = buildModel(key, key + "#" + seed);
    return renderSVG(M, accent, title, subtitle);
  },

  /** Enveloppe un SVG en data URL (affichable dans un <img>, exportable). */
  dataUrl(svg) {
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  },

  siteKeyFor,
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.MapGen = MapGen;
