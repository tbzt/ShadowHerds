"use strict";

/* ============================================================
   FOUNDATIONGEN — générateur du PLAN DES FONDATIONS (donjon interne
   d'un serveur, lot B2). Leaf PUR, sœur de topologygen.js/mapgen.js :
   reçoit ses paramètres (nœuds déjà projetés, arêtes, graine, accent
   DA, cartouche), ne connaît ni le DOM, ni `App`, ni Storage, ni une
   édition en dur.

   Les 7 nœuds des Fondations sont TOUJOURS les mêmes 7 identités
   (Portail/Archive/Échafaudage/Sécurité/Régie/Centre de contrôle/Nœud
   vide, cf. REFERENCE/FONDATIONS_SERVEUR_BT1.md § 0) — contrairement à
   TopologyGen (dont l'ensemble de nœuds varie par dossier), la
   disposition est donc un donjon FIXE par identité de nœud, pas un
   layout par archétype. `edges` est fourni par l'appelant (résolu par
   édition via `Matrix.foundationEdges`) : [] en SR5 (aucune table au
   livre, pistes narratives — BT1 § 1.d), 12 arêtes fixes en SR6 (BT1
   § 2, squelette entièrement déterminé, rien à tirer au hasard). Les
   arêtes sont rendues NON dirigées : l'orientation (2D6, simple/double
   sens) est un jet de table tenu en direct par le MJ, jamais motorisé
   ici.

   Palette = hex cyberpunk EN DUR, reprise de topologygen.js (même
   famille d'écran Matrice) ; seul l'accent DA est un paramètre.
   RNG seedé partagé via Utils.seededRandom (couche 1), comme les deux
   autres leaves — ici pour un jitter cosmétique seulement (la
   topologie elle-même est fixe, pas tirée).
   ============================================================ */
import { Utils } from "../core/utils.js";

const PAL = {
  bg: "#0b0f14", frame: "#1e2c37",
  node: "#141d27", nodeStroke: "#42606e", nodeTarget: "#20263a",
  label: "#8fb4c0", sub: "#5f7683",
  trail: "#5f8290", trailLong: "#33414d",
};

const W = 620, H = 380, R = 27;

/* Disposition fixe par identité de nœud (donjon à 2 pôles : Archive et
   Centre de contrôle relient chacun 4 nœuds, les 3 nœuds opérationnels
   forment le pont entre les deux ; Portail et Nœud vide en bout de
   chaîne, reliés entre eux par la piste « retour » la plus longue). */
const POS = {
  portail: { x: 70, y: 190 },
  archive: { x: 210, y: 190 },
  echafaudage: { x: 360, y: 80 },
  securite: { x: 400, y: 190 },
  regie: { x: 360, y: 300 },
  controle: { x: 530, y: 190 },
  vide: { x: 580, y: 80 },
};

function esc(x) {
  return String(x).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function clip(str, max = 15) {
  str = String(str || "");
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function wrap(inner, nd, activeId, interactive) {
  let s = inner;
  if (nd.id != null && nd.id === activeId) {
    s += `<circle cx="${nd.x.toFixed(1)}" cy="${nd.y.toFixed(1)}" r="${(R + 4).toFixed(1)}" fill="none" stroke="${nd.accent}" stroke-width="1.6"/>`;
  }
  if (interactive && nd.id != null) {
    return `<g data-node="${esc(nd.id)}" tabindex="0" role="button" aria-label="${esc(nd.label)}" style="cursor:pointer">${s}</g>`;
  }
  return s;
}

function nodeCircle(nd, accent, activeId, interactive) {
  const t = nd.isTarget;
  nd.accent = accent;
  let s = `<circle cx="${nd.x.toFixed(1)}" cy="${nd.y.toFixed(1)}" r="${R}" fill="${t ? PAL.nodeTarget : PAL.node}" stroke="${t ? accent : PAL.nodeStroke}" stroke-width="${t ? 1.6 : 1.2}"/>`;
  s += `<text x="${nd.x.toFixed(1)}" y="${(nd.y + R + 16).toFixed(1)}" text-anchor="middle" fill="${t ? accent : PAL.label}" font-size="11" font-weight="500">${esc(clip(nd.label))}</text>`;
  if (t) s += `<text x="${nd.x.toFixed(1)}" y="${(nd.y + R + 30).toFixed(1)}" text-anchor="middle" fill="${accent}" font-size="8" letter-spacing="1.5">✱ CIBLE</text>`;
  return wrap(s, nd, activeId, interactive);
}

/* Arête non dirigée entre deux centres de nœuds, retirée du rayon des
   cercles (posée SOUS les nœuds). Les pistes « longues » (portail↔vide,
   distance > 300) sont pointillées : lien réel mais topologiquement à
   l'écart du corridor central, moins prioritaire à l'œil. */
function edgeLine(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  const x1 = a.x + ux * R, y1 = a.y + uy * R;
  const x2 = b.x - ux * R, y2 = b.y - uy * R;
  const long = d > 300;
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${long ? PAL.trailLong : PAL.trail}" stroke-width="1.6"${long ? ' stroke-dasharray="4 5"' : ""}/>`;
}

function emptySvg(title) {
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="system-ui,sans-serif"><title>Plan des Fondations — vide</title><rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="${PAL.bg}"/><text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="${PAL.sub}" font-size="14">Aucun nœud à disposer.</text><text x="20" y="${H - 20}" fill="${PAL.label}" font-size="13" font-weight="600">${esc(title || "Plan des Fondations")}</text></svg>`;
}

export const FoundationGen = {
  /** Construit le SVG du donjon des Fondations. `nodes` = les 7 nœuds
      déjà projetés (`{ id, label, isTarget? }`, ids ∈ POS) fournis par
      l'appelant depuis `Matrix.foundationNodes(srv)`. `edges` = arêtes
      déjà résolues par édition (`Matrix.foundationEdges(srv)`, [] en
      SR5). `accent` = couleur DA (`editionModule.mapAccent`). */
  build({ nodes = [], edges = [], seed = "", accent = "#35e0e6", title = "", subtitle = "", activeId, interactive = false, fluid = false } = {}) {
    if (!nodes.length) return emptySvg(title);
    const rng = Utils.seededRandom(String(seed) + "#foundation");
    const list = nodes
      .filter((n) => POS[n.id])
      .map((n) => ({
        id: n.id,
        label: n.label,
        isTarget: !!n.isTarget,
        x: POS[n.id].x + (rng() - 0.5) * 8,
        y: POS[n.id].y + (rng() - 0.5) * 8,
      }));
    const byId = new Map(list.map((n) => [n.id, n]));

    const dims = fluid ? "" : `width="${W}" height="${H}" `;
    let s = `<svg ${dims}viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="system-ui,sans-serif">`;
    s += `<title>Plan des Fondations — ${esc(title || "serveur")}</title><desc>Donjon interne de 7 nœuds : leur disposition et, quand la table du livre les fixe, les pistes stables qui les relient.</desc>`;
    s += `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="${PAL.bg}"/>`;
    s += `<rect x="10" y="10" width="${W - 20}" height="${H - (subtitle || title ? 60 : 20)}" rx="6" fill="none" stroke="${PAL.frame}" stroke-width="1"/>`;

    edges.forEach((e) => {
      const a = byId.get(e.from), b = byId.get(e.to);
      if (a && b) s += edgeLine(a, b);
    });
    list.forEach((nd) => { s += nodeCircle(nd, accent, activeId, interactive); });

    if (title || subtitle) {
      const cartY = H - 32;
      s += `<text x="20" y="${cartY + 12}" fill="${PAL.label}" font-size="14" font-weight="600" letter-spacing="0.5">${esc(title || "Plan des Fondations")}</text>`;
      if (subtitle) s += `<text x="20" y="${cartY + 28}" fill="${PAL.sub}" font-size="10.5">${esc(subtitle)}</text>`;
    }
    s += `</svg>`;
    return s;
  },

  /** Enveloppe un SVG en data URL (affichable dans un <img>, exportable). */
  dataUrl(svg) {
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.FoundationGen = FoundationGen;
