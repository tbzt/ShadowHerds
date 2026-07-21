"use strict";

/* ============================================================
   TOPOLOGYGEN — générateur de PLAN DE SERVEUR procédural (lot A).

   Leaf PUR, sœur de mapgen.js : reçoit ses paramètres (archétype,
   nœuds déjà projetés, graine, accent DA, mode d'entrée, cartouche),
   ne connaît ni le DOM, ni `App`, ni Storage, ni une édition en dur.
   Il *construit* le schéma d'architecture externe d'un site — la
   topologie que le MJ voit d'un coup d'œil : par où l'équipe entre,
   comment les serveurs s'enchaînent, où sont les données cibles — et
   le rend en SVG. Déterministe par graine.

   Les nœuds sont DÉJÀ projetés par l'appelant (Servers) depuis les
   serveurs réels : `{ name, badge, isTarget }`. Le leaf ne lit aucun
   objet serveur ni aucun catalogue d'édition — le badge par régime
   (pool A1 / Indice+FW A2 / Indice+ASDF SR5-6) est cuisiné en amont
   via `Matrix.topologyNodeBadge`. Les ARÊTES ne sont pas fournies :
   elles se dérivent de l'archétype × l'ordre des nœuds (une chaîne
   n'a rien à stocker de plus que l'ordre du dossier).

   Palette = hex cyberpunk EN DUR (scène qui ne s'inverse pas au thème
   clair), sœur de mapgen. Seul l'accent DA est un paramètre, fourni
   par l'appelant depuis `editionModule.mapAccent`.

   RNG seedé partagé via Utils.seededRandom (couche 1), comme mapgen.
   ============================================================ */
import { Utils } from "../core/utils.js";

/* ---- Palette (hex en dur, ne s'inverse pas au thème) ---- */
const PAL = {
  bg: "#0b0f14", frame: "#1e2c37",
  node: "#141d27", nodeStroke: "#42606e", nodeTarget: "#20263a",
  label: "#8fb4c0", sub: "#5f7683",
  trail: "#5f8290", trailIdle: "#33414d",
  entry: "#57d9a6", device: "#0f161e", deviceStroke: "#2c3b45",
};

const W = 720, H = 470, BW = 124, BH = 54;

function esc(x) {
  return String(x).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

/* Tronque un libellé à la largeur d'une boîte. `charW` = largeur moyenne
   d'un caractère à la police visée (nom ≈ 6.3 px à 12 px ; badge ≈ 5.2 px à
   9.5 px — plus petit, donc plus de caractères tiennent). */
function clip(str, w, charW = 6.3) {
  const max = Math.max(4, Math.floor((w - 10) / charW));
  str = String(str || "");
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

/* Point où le rayon partant du centre de la boîte `b` vers (tx,ty)
   croise le bord de la boîte — pour poser les flèches AU bord, pas au
   centre (les boîtes sont peintes par-dessus les arêtes). */
function rectAnchor(b, tx, ty) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const sx = dx ? (b.w / 2) / Math.abs(dx) : Infinity;
  const sy = dy ? (b.h / 2) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return [cx + dx * s, cy + dy * s];
}

/* ---- Disposition par archétype : pose x/y/w/h sur chaque nœud, et
   renvoie la liste des arêtes (paires d'index + sens) + le point
   d'entrée externe. dir : 1 = flèche simple, 2 = double sens, 0 = idle. ---- */
function layout(archetype, nodes, rng) {
  const n = nodes.length;
  const jit = () => (rng() - 0.5) * 12;
  const edges = [];
  let entry; // { x, y } point externe d'où part la flèche d'entrée
  let entryIdx = 0;

  if (archetype === "branch" && n > 1) {
    // Passerelle (nœud 0) à gauche → enfants en éventail à droite.
    const gate = nodes[0];
    Object.assign(gate, { x: 120, y: H / 2 - BH / 2 - 20, w: BW, h: BH });
    const kids = nodes.slice(1);
    const top = 80, bot = 360, step = kids.length > 1 ? (bot - top) / (kids.length - 1) : 0;
    kids.forEach((k, i) => {
      Object.assign(k, { x: 430, y: (kids.length > 1 ? top + i * step : 200) - BH / 2, w: BW, h: BH });
      edges.push({ a: 0, b: i + 1, dir: 1 });
    });
    entry = { x: 40, y: gate.y + BH / 2 };
  } else if (archetype === "wan" && n >= 1) {
    // Serveur central + satellites (serveurs asservis) en anneau.
    const host = nodes[0];
    const cx = n > 1 ? 330 : W / 2, cy = 235;
    Object.assign(host, { x: cx - BW / 2, y: cy - BH / 2, w: BW, h: BH });
    const sats = nodes.slice(1);
    const R = 168;
    sats.forEach((s, i) => {
      const ang = -Math.PI / 2 + (i + 0.5) * (2 * Math.PI / Math.max(sats.length, 1));
      const sw = 108, sh = 48;
      Object.assign(s, { x: cx + Math.cos(ang) * R - sw / 2, y: cy + Math.sin(ang) * R - sh / 2, w: sw, h: sh });
      edges.push({ a: 0, b: i + 1, dir: 2 });
    });
    entry = { x: cx - BW / 2 - 70, y: cy };
  } else if (archetype === "nested" && n >= 1) {
    // Serveurs emboîtés : rectangles concentriques, cible au plus profond.
    nodes.forEach((nd, i) => {
      const pad = i * 46;
      Object.assign(nd, {
        x: 70 + pad, y: 70 + pad * 0.62,
        w: W - 190 - pad * 2, h: H - 150 - pad * 1.24,
        frame: true,
      });
    });
    entry = { x: 20, y: 70 + BH / 2 };
    // Nesting = le chemin ; une petite flèche du bord de chaque cadre
    // vers le suivant est ajoutée au rendu (pas d'arête boîte-à-boîte).
  } else {
    // chain (défaut) : nœuds alignés, chaîne bidirectionnelle.
    const startX = 150, endX = 690, span = endX - startX;
    const bw = Math.max(74, Math.min(BW, (span - (n - 1) * 26) / n));
    const gap = n > 1 ? (span - n * bw) / (n - 1) : 0;
    nodes.forEach((nd, i) => {
      Object.assign(nd, { x: startX + i * (bw + gap), y: H / 2 - BH / 2 - 10 + jit(), w: bw, h: BH });
      if (i > 0) edges.push({ a: i - 1, b: i, dir: 2 });
    });
    entry = { x: 60, y: nodes[0].y + BH / 2 };
  }
  return { edges, entry, entryIdx };
}

/* Surligne le nœud actif (2e contour, sans blur) et — en mode interactif —
   l'enveloppe dans un `<g data-node>` focusable. `data-node` est un simple
   marqueur d'identité : le leaf reste app-agnostique (c'est l'appelant qui
   décide ce que « cliquer un nœud » veut dire, cf. tiroir Matrice A5). */
function wrap(inner, nd, activeId, interactive) {
  let s = inner;
  if (nd.id != null && nd.id === activeId) {
    s += `<rect x="${(nd.x - 3).toFixed(1)}" y="${(nd.y - 3).toFixed(1)}" width="${(nd.w + 6).toFixed(1)}" height="${(nd.h + 6).toFixed(1)}" rx="8" fill="none" stroke="${PAL.entry}" stroke-width="1.6"/>`;
  }
  if (interactive && nd.id != null) {
    return `<g data-node="${esc(nd.id)}" tabindex="0" role="button" aria-label="Serveur ${esc(nd.name)}" style="cursor:pointer">${s}</g>`;
  }
  return s;
}

/* ---- Rendu d'un nœud (boîte + nom + badge + marque cible) ---- */
function nodeBox(nd, accent, activeId, interactive) {
  const cx = nd.x + nd.w / 2;
  const t = nd.isTarget;
  let s = `<rect x="${nd.x.toFixed(1)}" y="${nd.y.toFixed(1)}" width="${nd.w.toFixed(1)}" height="${nd.h.toFixed(1)}" rx="6" fill="${t ? PAL.nodeTarget : PAL.node}" stroke="${t ? accent : PAL.nodeStroke}" stroke-width="${t ? 1.6 : 1.2}"/>`;
  s += `<text x="${cx.toFixed(1)}" y="${(nd.y + 21).toFixed(1)}" text-anchor="middle" fill="${t ? accent : PAL.label}" font-size="12" font-weight="500">${esc(clip(nd.name, nd.w))}</text>`;
  if (nd.badge) s += `<text x="${cx.toFixed(1)}" y="${(nd.y + 37).toFixed(1)}" text-anchor="middle" fill="${PAL.sub}" font-size="9.5">${esc(clip(nd.badge, nd.w, 5.2))}</text>`;
  if (t) s += `<text x="${cx.toFixed(1)}" y="${(nd.y + nd.h - 6).toFixed(1)}" text-anchor="middle" fill="${accent}" font-size="8" letter-spacing="1.5">✱ CIBLE</text>`;
  return wrap(s, nd, activeId, interactive);
}

/* Rendu d'un nœud « cadre » (nested) : rectangle nommé au coin haut-gauche. */
function frameBox(nd, accent, i, activeId, interactive) {
  const t = nd.isTarget;
  let s = `<rect x="${nd.x.toFixed(1)}" y="${nd.y.toFixed(1)}" width="${nd.w.toFixed(1)}" height="${nd.h.toFixed(1)}" rx="7" fill="${t ? PAL.nodeTarget : (i % 2 ? PAL.bg : PAL.node)}" stroke="${t ? accent : PAL.nodeStroke}" stroke-width="${t ? 1.6 : 1.2}"/>`;
  s += `<text x="${(nd.x + 12).toFixed(1)}" y="${(nd.y + 18).toFixed(1)}" fill="${t ? accent : PAL.label}" font-size="11.5" font-weight="500">${esc(clip(nd.name, nd.w - 12))}</text>`;
  if (nd.badge) s += `<text x="${(nd.x + 12).toFixed(1)}" y="${(nd.y + 32).toFixed(1)}" fill="${PAL.sub}" font-size="9">${esc(clip(nd.badge, nd.w - 12, 5))}</text>`;
  if (t) s += `<text x="${(nd.x + 12).toFixed(1)}" y="${(nd.y + 46).toFixed(1)}" fill="${accent}" font-size="8" letter-spacing="1.5">✱ CIBLE</text>`;
  return wrap(s, nd, activeId, interactive);
}

function edgeLine(x1, y1, x2, y2, dir) {
  const end = dir ? ` marker-end="url(#topo-arw)"` : "";
  const start = dir === 2 ? ` marker-start="url(#topo-arw)"` : "";
  const col = dir ? PAL.trail : PAL.trailIdle;
  const dash = dir ? "" : ` stroke-dasharray="4 5"`;
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="2"${dash}${end}${start}/>`;
}

function renderSVG(nodes, meta, accent, entryMode, title, subtitle, archetype, activeId, interactive, fluid) {
  const em = (entryMode && typeof entryMode === "object") ? entryMode : { glyph: "◎", label: "Entrée" };
  // `fluid` (surcouche navigable A5) : pas de width/height fixes → le SVG
  // épouse son conteneur via viewBox (le tiroir Matrice le met à l'échelle).
  const dims = fluid ? "" : `width="${W}" height="${H}" `;
  let s = `<svg ${dims}viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="system-ui,sans-serif">`;
  s += `<title>Plan de serveur — ${esc(title || "site")}</title><desc>Schéma d'architecture : point d'entrée, enchaînement des serveurs et nœud tenant les données cibles.</desc>`;
  s += `<defs><marker id="topo-arw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="${PAL.trail}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></marker>`;
  s += `<marker id="topo-entry" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="${PAL.entry}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="${PAL.bg}"/>`;
  s += `<rect x="10" y="10" width="${W - 20}" height="${H - 60}" rx="6" fill="none" stroke="${PAL.frame}" stroke-width="1"/>`;

  if (archetype === "nested") {
    // Cadres emboîtés du plus grand (extérieur) au plus petit (cible).
    nodes.forEach((nd, i) => { s += frameBox(nd, accent, i, activeId, interactive); });
    // Petite flèche du bord d'un cadre vers le cadre imbriqué suivant.
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      s += edgeLine(b.x - 14, b.y + 12, b.x - 1, b.y + 12, 1);
    }
  } else {
    // Arêtes d'abord (peintes SOUS les boîtes → seul le segment inter-boîtes
    // et la flèche au bord restent visibles), puis les boîtes.
    meta.edges.forEach((e) => {
      const A = nodes[e.a], B = nodes[e.b];
      const [ax, ay] = rectAnchor(A, B.x + B.w / 2, B.y + B.h / 2);
      const [bx, by] = rectAnchor(B, A.x + A.w / 2, A.y + A.h / 2);
      s += edgeLine(ax, ay, bx, by, e.dir);
    });
    // WAN à serveur seul : quelques appareils asservis génériques pour dire le WAN.
    if (archetype === "wan" && nodes.length === 1) {
      const h = nodes[0], cx = h.x + h.w / 2, cy = h.y + h.h / 2;
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + i * (2 * Math.PI / 5), dx = Math.cos(ang), dy = Math.sin(ang);
        const px = cx + dx * 150, py = cy + dy * 150;
        const [ax, ay] = rectAnchor(h, px, py);
        s += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="${PAL.trailIdle}" stroke-width="1.5"/>`;
        s += `<rect x="${(px - 9).toFixed(1)}" y="${(py - 7).toFixed(1)}" width="18" height="14" rx="2" fill="${PAL.device}" stroke="${PAL.deviceStroke}"/>`;
      }
      s += `<text x="${cx.toFixed(1)}" y="${(cy + 150 + 42).toFixed(1)}" text-anchor="middle" fill="${PAL.sub}" font-size="9">appareils asservis</text>`;
    }
    nodes.forEach((nd) => { s += nodeBox(nd, accent, activeId, interactive); });
  }

  // Flèche d'entrée (verte) vers le nœud d'entrée + libellé du mode.
  const en = nodes[meta.entryIdx];
  const [ex, ey] = rectAnchor(en, meta.entry.x, meta.entry.y);
  s += `<line x1="${meta.entry.x.toFixed(1)}" y1="${meta.entry.y.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${PAL.entry}" stroke-width="2" marker-end="url(#topo-entry)"/>`;
  s += `<text x="${meta.entry.x.toFixed(1)}" y="${(meta.entry.y - 9).toFixed(1)}" text-anchor="middle" fill="${PAL.entry}" font-size="10" letter-spacing="0.5">${esc(em.glyph || "◎")} ${esc(em.label || "Entrée")}</text>`;

  // Cartouche.
  const cartY = H - 32;
  s += `<text x="20" y="${cartY + 12}" fill="${PAL.label}" font-size="14" font-weight="600" letter-spacing="0.5">${esc(title || "Plan de serveur")}</text>`;
  if (subtitle) s += `<text x="20" y="${cartY + 28}" fill="${PAL.sub}" font-size="10.5">${esc(subtitle)}</text>`;
  s += `<text x="${W - 20}" y="${cartY + 12}" text-anchor="end" fill="${PAL.sub}" font-size="9">◎/⎇ entrée · ✱ cible · → sens des liens</text>`;
  s += `</svg>`;
  return s;
}

function emptySvg(title, accent) {
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="system-ui,sans-serif"><title>Plan de serveur — vide</title><rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="${PAL.bg}"/><text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="${PAL.sub}" font-size="14">Aucun serveur à disposer dans ce site.</text><text x="20" y="${H - 20}" fill="${PAL.label}" font-size="13" font-weight="600">${esc(title || "Plan de serveur")}</text></svg>`;
}

export const TopologyGen = {
  /** Construit le SVG d'un plan de serveur (schéma d'architecture).
      Déterministe par `seed`. `nodes` = `[{ name, badge, isTarget }]`
      déjà projetés par l'appelant. `accent` = couleur DA (hex), lue sur
      `editionModule.mapAccent`. `entryMode` = `{ glyph, label }` (un
      élément de `Matrix.topologyEntryModes`). `archetype` ∈
      chain|branch|wan|nested (défaut chain). */
  build({ archetype = "chain", nodes = [], seed = "", accent = "#35e0e6", entryMode, title = "", subtitle = "", activeId, interactive = false, fluid = false } = {}) {
    if (!nodes.length) return emptySvg(title, accent);
    // Copie défensive : on pose x/y/w/h sur les nœuds sans muter l'appelant.
    // `id` propagé pour la surcouche navigable A5 (marqueur data-node).
    const list = nodes.map((n) => ({ id: n.id, name: n.name, badge: n.badge, isTarget: !!n.isTarget }));
    const rng = Utils.seededRandom(String(seed) + "#" + archetype);
    const meta = layout(archetype, list, rng);
    return renderSVG(list, meta, accent, entryMode, title, subtitle, archetype, activeId, interactive, fluid);
  },

  /** Enveloppe un SVG en data URL (affichable dans un <img>, exportable). */
  dataUrl(svg) {
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.TopologyGen = TopologyGen;
