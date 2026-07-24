"use strict";

/* ============================================================
   GRAPH ENGINE — moteur de graphe PUR : layout de forces, rendu
   SVG tokenisé, glisser `pointer` (tactile + souris), tap → callback.
   ------------------------------------------------------------
   NE DÉTIENT AUCUNE VÉRITÉ : reçoit { nodes, edges } déjà projetés
   (GraphProjections), les dispose et les rend. Aucune dépendance à
   l'édition, au store, ni au DOM métier — les couleurs viennent d'un
   accent passé en paramètre (token DA de la vue) + une palette de type
   EN DUR (comme MapGen/TopologyGen). Layout Fruchterman-Reingold léger,
   O(n²) trivial à 15-40 nœuds : la simulation REFROIDIT puis S'ARRÊTE
   (0 CPU au repos) ; un glisser la relance brièvement. Le « feel »
   (juice : soulevé, ressorts voisins, momentum) = phase B2, pas ici.
   VIS-15 B1, cf. PLAN_MOTEUR_GRAPHE_UNIFIE.md.
   ============================================================ */

const NS = "http://www.w3.org/2000/svg";

// Glyphes monochromes par type (vocabulaire établi, jamais d'émoji couleur).
const TYPE_GLYPH = { pj: "◆", pnj: "●", contact: "◈", server: "▤" };

export const GraphEngine = {
  _state: null,

  /** Monte un graphe dans `container`. `onNodeTap(id)` est appelé sur un
      tap net (clic sans glisser). Rappeler `mount` remonte proprement. */
  mount(container, { nodes = [], edges = [], accent = "#35e0e6", onNodeTap = null, onWeave = null, onBackgroundTap = null, onEdgeTap = null, static: staticLayout = false, onNodeMoved = null } = {}) {
    this.destroy();
    const W = Math.max(320, container.clientWidth || 640);
    const H = Math.max(240, container.clientHeight || 460);

    // Positions initiales : couronne + jitter (déterminisme non requis ici,
    // le layout converge ; MapGen/TopologyGen sont les leaves déterministes).
    const R = Math.min(W, H) * 0.32;
    const N = nodes.map((n, i) => {
      const a = (2 * Math.PI * i) / Math.max(1, nodes.length);
      // Mode « layout auteur » (static:true) : honorer les x,y fournis — carte
      // heuristique arrangée à la main et PERSISTÉE ; à défaut, couronne.
      const useXY = staticLayout && Number.isFinite(n.x) && Number.isFinite(n.y);
      return {
        ...n,
        x: useXY ? n.x : W / 2 + Math.cos(a) * R + (Math.random() - 0.5) * 12,
        y: useXY ? n.y : H / 2 + Math.sin(a) * R + (Math.random() - 0.5) * 12,
        vx: 0, vy: 0, pinned: false,
      };
    });
    const idx = new Map(N.map((n, i) => [n.id, i]));
    const E = edges
      .map((e) => ({ ...e, a: idx.get(e.from), b: idx.get(e.to) }))
      .filter((e) => e.a != null && e.b != null);

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "graph-svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Marqueur de flèche UNIQUE, réutilisé aux deux bouts (`orient` auto-inversé
    // en tête de trait). `fill: context-stroke` → la pointe hérite la couleur du
    // trait, donc une seule def couvre toutes les couleurs d'arête (Lot 3).
    const defs = document.createElementNS(NS, "defs");
    defs.innerHTML =
      '<marker id="graph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="context-stroke"></path></marker>';
    svg.appendChild(defs);

    // Poches de faction (A3) : couche du fond, SOUS les arêtes/nœuds — une zone
    // colorée par faction, dessinée derrière tout le reste. Remplie par
    // `setPockets` (données) et repositionnée à chaque tick par `_renderPockets`.
    const gPockets = document.createElementNS(NS, "g");
    gPockets.setAttribute("class", "graph-pockets");
    const gEdges = document.createElementNS(NS, "g");
    gEdges.setAttribute("class", "graph-edges");
    const gNodes = document.createElementNS(NS, "g");
    gNodes.setAttribute("class", "graph-nodes");
    const gLabels = document.createElementNS(NS, "g");
    gLabels.setAttribute("class", "graph-edge-labels");
    svg.appendChild(gPockets); // tout au fond
    svg.appendChild(gEdges);
    svg.appendChild(gNodes);
    svg.appendChild(gLabels); // au-dessus : les mots de trait restent lisibles

    // Arêtes : une ligne-cible transparente ÉLARGIE (sélection au doigt d'un
    // trait fin), la ligne visible par-dessus, et un libellé dans gLabels.
    // Estompées si un bout est hors périmètre (halo). Le style (couleur,
    // pointillés, direction, mot) est appliqué par `_applyEdgeStyle` (Lot 3).
    for (const e of E) {
      const dim = N[e.a].inScope === false || N[e.b].inScope === false;
      const hit = document.createElementNS(NS, "line");
      hit.setAttribute("class", "graph-edge-hit");
      hit.setAttribute("data-edge-id", e.id);
      e._hit = hit;
      gEdges.appendChild(hit);

      const line = document.createElementNS(NS, "line");
      line.setAttribute("class", dim ? "graph-edge halo" : "graph-edge");
      e._line = line;
      gEdges.appendChild(line);

      const lbl = document.createElementNS(NS, "text");
      lbl.setAttribute("class", "graph-edge-label");
      lbl.setAttribute("text-anchor", "middle");
      lbl.setAttribute("dy", "-3");
      e._label = lbl;
      gLabels.appendChild(lbl);

      this._applyEdgeStyle(e, accent);
    }

    // Nœuds : cercle + glyphe + label, chacun dans un <g data-node-id>.
    for (const n of N) {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", n.inScope === false ? "graph-node halo" : "graph-node");
      g.setAttribute("data-node-id", n.id);
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", n.label);

      const circle = document.createElementNS(NS, "circle");
      circle.setAttribute("r", "16");
      circle.setAttribute("class", "graph-node-disc");
      // Couleur de nœud = `pcColor` de l'entité, pour TOUT type (Lot 4 : plus
      // réservé aux PJ). Nue → fond neutre. `_disc` mémorisé pour `setNodeColor`.
      circle.setAttribute("fill", n.pcColor || "var(--surface-2, #16202b)");
      circle.setAttribute("stroke", accent);
      n._disc = circle;

      const glyph = document.createElementNS(NS, "text");
      glyph.setAttribute("class", "graph-node-glyph");
      glyph.setAttribute("text-anchor", "middle");
      glyph.setAttribute("dy", "0.35em");
      glyph.setAttribute("fill", accent);
      // Glyphe fourni par la projection (scènes) sinon dérivé du type (entités).
      // Le moteur reste bête : il rend ce qu'on lui donne (contrat « aucune vérité »).
      glyph.textContent = n.glyph || TYPE_GLYPH[n.type] || "●";

      const label = document.createElementNS(NS, "text");
      label.setAttribute("class", "graph-node-label");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dy", "2.4em");
      label.textContent = n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label;

      g.appendChild(circle);
      g.appendChild(glyph);
      g.appendChild(label);
      n._g = g;
      gNodes.appendChild(g);
    }

    // Ligne temporaire de tissage (au-dessus des nœuds, masquée au repos).
    const weaveLine = document.createElementNS(NS, "line");
    weaveLine.setAttribute("class", "graph-weave-line");
    weaveLine.setAttribute("stroke", accent);
    weaveLine.setAttribute("visibility", "hidden");
    svg.appendChild(weaveLine);

    const state = {
      container, svg, W, H, N, E, idx, accent, onNodeTap, onWeave, onBackgroundTap, onEdgeTap,
      staticLayout, onNodeMoved, // mode auteur : pas de simulation ; persiste au lâcher
      raf: 0, alpha: 1, drag: null, weave: false, weaving: null, weaveLine,
      selectedId: null, selectedEdgeId: null, bg: null, edgeTap: null,
      gPockets, pockets: [], // A3 — poches de faction (données + éléments SVG)
      view: { x: 0, y: 0, w: W, h: H }, // fenêtre visible (zoom/déplacement)
      pointers: new Map(), pinch: null, // suivi multi-doigts pour le pincement
    };
    this._state = state;
    container.appendChild(svg);
    this._wire(state);
    this._loop(state);
  },

  /* ---- Simulation : intégration par VITESSE amortie (Verlet-like).
     Les forces nourrissent une vélocité qui décroît par frottement — motion
     lisse, sans le tressautement du déplacement direct plafonné. Force de
     répulsion ET vitesse bornées : aucun nœud ne se téléporte, même très
     proche d'un autre ou pendant un glisser. Le nœud saisi (`pinned`) ne bouge
     que par le pointeur. Refroidit puis s'arrête (0 CPU au repos). ---- */
  _step(s) {
    const { N, E, W, H } = s;
    const n = N.length;
    const k = Math.sqrt((W * H) / Math.max(1, n)); // distance de référence
    const L = k;                 // longueur de lien cible
    const CHARGE = k * k;        // intensité de répulsion
    const FMAX = k * 0.6;        // accélération de répulsion plafonnée
    const SPRING = 0.05;         // raideur des liens
    const CENTER = 0.015;        // rappel au centre
    const DECAY = 0.82;          // rétention de vitesse (frottement)
    const VMAX = k * 0.5;        // vitesse max (anti-téléportation)
    const alpha = s.alpha;
    const ax = new Array(n).fill(0);
    const ay = new Array(n).fill(0);

    // Répulsion (toutes paires) — force ∝ 1/d², plafonnée.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = N[i].x - N[j].x, dy = N[i].y - N[j].y;
        let d2 = dx * dx + dy * dy || 0.01;
        let d = Math.sqrt(d2);
        const f = Math.min(CHARGE / d2, FMAX);
        const ux = dx / d, uy = dy / d;
        ax[i] += ux * f; ay[i] += uy * f;
        ax[j] -= ux * f; ay[j] -= uy * f;
      }
    }
    // Ressorts (liens) — rappel vers la longueur L.
    for (const e of E) {
      const a = N[e.a], b = N[e.b];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.hypot(dx, dy) || 0.01;
      const f = (d - L) * SPRING;
      const ux = dx / d, uy = dy / d;
      ax[e.a] += ux * f; ay[e.a] += uy * f;
      ax[e.b] -= ux * f; ay[e.b] -= uy * f;
    }
    // Centrage + intégration vitesse/frottement (lissée par alpha).
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < n; i++) {
      const nd = N[i];
      if (nd.pinned) { nd.vx = 0; nd.vy = 0; continue; }
      ax[i] += (cx - nd.x) * CENTER;
      ay[i] += (cy - nd.y) * CENTER;
      nd.vx = (nd.vx + ax[i] * alpha) * DECAY;
      nd.vy = (nd.vy + ay[i] * alpha) * DECAY;
      const sp = Math.hypot(nd.vx, nd.vy);
      if (sp > VMAX) { nd.vx = (nd.vx / sp) * VMAX; nd.vy = (nd.vy / sp) * VMAX; }
      nd.x += nd.vx;
      nd.y += nd.vy;
      // Garder dans le cadre (amortir la vitesse au contact pour ne pas coller).
      if (nd.x < 20) { nd.x = 20; nd.vx = 0; } else if (nd.x > W - 20) { nd.x = W - 20; nd.vx = 0; }
      if (nd.y < 24) { nd.y = 24; nd.vy = 0; } else if (nd.y > H - 28) { nd.y = H - 28; nd.vy = 0; }
    }
    s.alpha *= 0.98; // refroidissement
  },

  _render(s) {
    if (s.pockets.length) this._renderPockets(s);
    for (const e of s.E) {
      const a = s.N[e.a], b = s.N[e.b];
      // Rétracter les bouts hors du disque (r≈16) : la flèche se pose au bord
      // du nœud, pas cachée sous lui ; borné pour deux nœuds très proches.
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const pad = Math.min(18, d / 2 - 2);
      const ux = dx / d, uy = dy / d;
      const x1 = a.x + ux * pad, y1 = a.y + uy * pad;
      const x2 = b.x - ux * pad, y2 = b.y - uy * pad;
      e._line.setAttribute("x1", x1); e._line.setAttribute("y1", y1);
      e._line.setAttribute("x2", x2); e._line.setAttribute("y2", y2);
      e._hit.setAttribute("x1", x1); e._hit.setAttribute("y1", y1);
      e._hit.setAttribute("x2", x2); e._hit.setAttribute("y2", y2);
      if (e._label.textContent) {
        e._label.setAttribute("x", (a.x + b.x) / 2);
        e._label.setAttribute("y", (a.y + b.y) / 2);
      }
    }
    for (const n of s.N) {
      // Nœud saisi « soulevé » : léger agrandissement autour de son centre
      // (les enfants sont dessinés à l'origine locale) — il a un poids (B2).
      const lift = s.drag && s.drag.n === n ? " scale(1.14)" : "";
      n._g.setAttribute("transform", `translate(${n.x} ${n.y})${lift}`);
    }
  },

  _loop(s) {
    const frame = () => {
      if (!s.staticLayout) this._step(s); // mode auteur : aucune simulation
      this._render(s);
      // S'arrête au repos — 0 CPU. En mode auteur, seul un glisser en cours
      // anime ; en mode forces, le refroidissement d'alpha décide.
      const keepGoing = s.staticLayout ? !!s.drag : s.alpha > 0.02 || s.drag;
      s.raf = keepGoing ? requestAnimationFrame(frame) : 0;
    };
    if (!s.raf) s.raf = requestAnimationFrame(frame);
  },
  _reheat(s) {
    s.alpha = Math.max(s.alpha, 0.3);
    this._loop(s);
  },

  /** Sélectionne un nœud (surbrillance d'accent) ; `null` = désélectionne.
      La sélection est un état de VUE (pas de vérité) : elle est perdue au
      remontage, la vue la repose si besoin. Nœud et arête sont exclusifs. */
  select(id) {
    const s = this._state;
    if (!s) return;
    s.selectedId = id || null;
    s.selectedEdgeId = null;
    for (const n of s.N) n._g.classList.toggle("selected", n.id === s.selectedId);
    for (const e of s.E) e._line.classList.remove("selected");
  },

  /** A3b — marque/démarque un nœud comme MULTI-sélectionné (construction d'une
      faction). Indépendant de la sélection simple (`select`) : plusieurs nœuds à
      la fois, anneau distinct. Purement visuel (le SET vit dans la vue). */
  setNodeMultiSelected(id, on) {
    const s = this._state;
    if (!s) return;
    const n = s.N.find((x) => x.id === id);
    if (n && n._g) n._g.classList.toggle("multi-selected", !!on);
  },
  /** Efface toutes les multi-sélections (sortie du mode groupe). */
  clearMultiSelected() {
    const s = this._state;
    if (!s) return;
    for (const n of s.N) if (n._g) n._g.classList.remove("multi-selected");
  },

  /** S2 — marque L'ÉTAPE COURANTE de la trame (anneau distinct, pulse CSS).
      Exclusif quand `on` : une seule étape courante à la fois. Purement visuel
      (la vérité vit dans `runtime.currentSceneId`), comme `setNodeMultiSelected`. */
  setNodeCurrent(id, on) {
    const s = this._state;
    if (!s) return;
    if (on) {
      for (const n of s.N) if (n._g) n._g.classList.toggle("current", n.id === id);
    } else {
      const n = s.N.find((x) => x.id === id);
      if (n && n._g) n._g.classList.remove("current");
    }
  },

  /** Met à jour EN PLACE la couleur d'un nœud (Lot 4) — patch visuel immédiat
      sans remontage. `null` = fond neutre par défaut. */
  setNodeColor(id, color) {
    const s = this._state;
    if (!s) return;
    const n = s.N.find((x) => x.id === id);
    if (!n || !n._disc) return;
    n.pcColor = color || null;
    n._disc.setAttribute("fill", n.pcColor || "var(--surface-2, #16202b)");
  },

  /** A3 — pose les POCHES de faction : `list = [{id, color, memberIds}]`. Chaque
      poche est une zone colorée derrière les nœuds, entourant ses membres
      présents. Idempotent : reconstruit la couche `gPockets`. La géométrie
      (enveloppe convexe arrondie) est recalculée à chaque tick par
      `_renderPockets` depuis les positions vivantes des nœuds. */
  setPockets(list) {
    const s = this._state;
    if (!s || !s.gPockets) return;
    s.gPockets.textContent = "";
    s.pockets = [];
    for (const p of list || []) {
      // Ne garder que les membres réellement présents dans ce graphe.
      const ids = (p.memberIds || []).filter((id) => s.idx.has(id));
      if (!ids.length) continue;
      const path = document.createElementNS(NS, "path");
      path.setAttribute("class", "graph-pocket");
      const col = p.color || s.accent;
      path.setAttribute("fill", col);
      path.setAttribute("stroke", col);
      s.gPockets.appendChild(path);
      s.pockets.push({ id: p.id, color: col, ids, _path: path });
    }
    this._renderPockets(s);
  },

  /** Affiche/masque la couche des poches sans la reconstruire. */
  setPocketsVisible(on) {
    const s = this._state;
    if (s && s.gPockets) s.gPockets.setAttribute("visibility", on ? "visible" : "hidden");
  },

  /** Recalcule le tracé de chaque poche depuis les positions courantes de ses
      membres. 1 membre → disque ; 2 → capsule (disque englobant) ; ≥3 →
      enveloppe convexe dilatée puis arrondie (blob lisse). */
  _renderPockets(s) {
    const PAD = 30; // marge autour des disques de nœud (r≈16)
    for (const p of s.pockets) {
      const pts = [];
      for (const id of p.ids) {
        const n = s.N[s.idx.get(id)];
        if (n) pts.push({ x: n.x, y: n.y });
      }
      p._path.setAttribute("d", pts.length ? this._pocketPath(pts, PAD) : "");
    }
  },

  /** Tracé SVG d'une poche autour de `pts`, dilatée de `pad`. */
  _pocketPath(pts, pad) {
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    if (pts.length < 3) {
      // Disque englobant centré sur le barycentre.
      let r = 0;
      for (const p of pts) r = Math.max(r, Math.hypot(p.x - cx, p.y - cy));
      r += pad;
      return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
    }
    // Enveloppe convexe, chaque sommet poussé vers l'extérieur (depuis le
    // barycentre) de `pad`, puis lissée en courbes quadratiques par les milieux.
    const hull = this._convexHull(pts).map((p) => {
      const a = Math.atan2(p.y - cy, p.x - cx);
      return { x: p.x + Math.cos(a) * pad, y: p.y + Math.sin(a) * pad };
    });
    const m = hull.length;
    const mid = (i, j) => ({ x: (hull[i].x + hull[j].x) / 2, y: (hull[i].y + hull[j].y) / 2 });
    let start = mid(0, 1);
    let d = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`;
    for (let i = 0; i < m; i++) {
      const ctrl = hull[(i + 1) % m];
      const end = mid((i + 1) % m, (i + 2) % m);
      d += ` Q ${ctrl.x.toFixed(1)} ${ctrl.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    }
    return d + " Z";
  },

  /** Enveloppe convexe (chaîne monotone d'Andrew), sens horaire. */
  _convexHull(points) {
    const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    if (pts.length < 3) return pts;
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
        lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
        upper.pop();
      upper.push(p);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  },

  /** Sélectionne une ARÊTE (surbrillance) ; `null` = désélectionne. Exclusif
      avec la sélection de nœud. */
  selectEdge(id) {
    const s = this._state;
    if (!s) return;
    s.selectedEdgeId = id || null;
    s.selectedId = null;
    for (const n of s.N) n._g.classList.remove("selected");
    for (const e of s.E) e._line.classList.toggle("selected", e.id === s.selectedEdgeId);
  },

  /** Applique en place le style d'une arête (couleur/pointillés/direction/mot)
      sans remontage — patch visuel immédiat (doctrine « feel » : patcher, pas
      reconstruire). Appelé par la vue après un `RelationsStore.upsert`. */
  updateEdgeStyle(id, style) {
    const s = this._state;
    if (!s) return;
    const e = s.E.find((x) => x.id === id);
    if (!e) return;
    Object.assign(e, style);
    this._applyEdgeStyle(e, s.accent);
  },

  /** Pose couleur/pointillés/flèches/mot sur les éléments SVG d'une arête.
      Couleur nue → accent d'édition ; la flèche hérite la couleur du trait
      (marqueur `context-stroke`). Un seul marqueur, orienté aux deux bouts. */
  _applyEdgeStyle(e, accent) {
    const stroke = e.color || accent;
    e._line.setAttribute("stroke", stroke);
    e._line.style.strokeDasharray = e.dashed ? "6 4" : "";
    const dir = e.dir || "none";
    e._line.setAttribute("marker-end", dir === "forward" || dir === "both" ? "url(#graph-arrow)" : "");
    e._line.setAttribute("marker-start", dir === "back" || dir === "both" ? "url(#graph-arrow)" : "");
    e._label.textContent = e.label || "";
  },

  /** Bascule le mode tissage (créer un lien en tirant). Off = glisser déplace. */
  setWeave(on) {
    const s = this._state;
    if (!s) return;
    s.weave = !!on;
    s.svg.classList.toggle("weaving", s.weave);
  },

  /** Nœud le plus proche du point `p` dans le rayon d'accroche, hors `exclude`. */
  _nodeNear(s, p, exclude) {
    let best = null, bestD = 24; // rayon d'accroche magnétique (unités SVG ≈ px)
    for (const n of s.N) {
      if (n === exclude) continue;
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  },

  /* ---- Vue : zoom & déplacement par VIEWBOX. Piloter le viewBox garde toute
     la conversion pointeur→SVG (getScreenCTM) exacte — glisser de nœud, tissage
     et accroche restent justes sans y toucher. Ratio verrouillé sur W/H ;
     échelle bornée 1×→ZMAX (le layout borne déjà les nœuds au cadre, donc 1×
     montre tout). État ÉPHÉMÈRE : jamais persisté. ---- */
  _applyView(s) {
    const v = s.view;
    s.svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
  },
  _clampView(s) {
    const v = s.view;
    v.x = Math.max(0, Math.min(s.W - v.w, v.x));
    v.y = Math.max(0, Math.min(s.H - v.h, v.y));
  },
  _clientToSvg(s, cx, cy) {
    const pt = s.svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const m = s.svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: cx, y: cy };
  },
  /** Échelle écran→SVG courante (px SVG par px écran), pour convertir un
      déplacement de pointeur en déplacement de vue (respecte le letterbox « meet »). */
  _screenScale(s) {
    const r = s.svg.getBoundingClientRect();
    return Math.min(r.width / s.view.w, r.height / s.view.h) || 1;
  },
  /** Zoome de `factor` (>1 = rapprocher) en gardant fixe le point écran cx,cy. */
  _zoomAt(s, factor, cx, cy) {
    const v = s.view;
    const ZMAX = 5;                       // rapprochement maximum
    const minW = s.W / ZMAX, maxW = s.W;  // 1× = cadre entier (tout visible)
    const p = this._clientToSvg(s, cx, cy);
    const nw = Math.max(minW, Math.min(maxW, v.w / factor));
    const nh = nw * (s.H / s.W);          // ratio verrouillé sur le cadre de base
    const f = v.w / nw;                   // facteur réellement appliqué après bornage
    v.x = p.x - (p.x - v.x) / f;
    v.y = p.y - (p.y - v.y) / f;
    v.w = nw; v.h = nh;
    this._clampView(s);
    this._applyView(s);
  },
  /** Déplace la vue d'un delta ÉCRAN (px), typiquement le mouvement d'un doigt. */
  _panBy(s, dxScreen, dyScreen) {
    const sc = this._screenScale(s);
    s.view.x -= dxScreen / sc;
    s.view.y -= dyScreen / sc;
    this._clampView(s);
    this._applyView(s);
  },
  /** Avorte proprement les gestes simples en cours (avant d'entrer en pincement). */
  _abortGestures(s) {
    if (s.drag) { s.drag.n.pinned = false; s.drag.n._g.classList.remove("dragging"); s.drag = null; }
    if (s.weaving) {
      if (s.weaving.target) s.weaving.target._g.classList.remove("weave-target");
      s.weaveLine.setAttribute("visibility", "hidden");
      s.weaving = null;
    }
    s.bg = null; s.edgeTap = null;
  },

  /* ---- API de vue publique (boutons +/− du coin de canvas) ---- */
  /** Zoome autour du centre visible (facteur >1 rapproche, <1 éloigne). */
  zoomBy(factor) {
    const s = this._state;
    if (!s) return;
    const r = s.svg.getBoundingClientRect();
    this._zoomAt(s, factor, r.left + r.width / 2, r.top + r.height / 2);
  },
  /** Réinitialise la vue au cadre entier (1×). */
  resetView() {
    const s = this._state;
    if (!s) return;
    s.view = { x: 0, y: 0, w: s.W, h: s.H };
    this._applyView(s);
  },

  /* ---- Pointer : glisser un nœud, tap = clic net, tisser un lien ---- */
  _wire(s) {
    const toSvg = (ev) => this._clientToSvg(s, ev.clientX, ev.clientY);
    s.svg.addEventListener("pointerdown", (ev) => {
      s.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (s.pointers.size === 2) {
        // Deux doigts : pincement. On avorte tout geste simple en cours et on
        // mémorise l'écart + le milieu de départ (référence du zoom/déplacement).
        this._abortGestures(s);
        const [a, b] = [...s.pointers.values()];
        s.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        return;
      }
      if (s.pointers.size > 2) return; // 3ᵉ doigt+ : ignoré tant que le pincement dure
      const g = ev.target.closest("[data-node-id]");
      if (!g) {
        // Hors nœud (et hors tissage) : soit un tap d'ARÊTE (sélection pour
        // styler), soit un tap de FOND (désélection ou DÉPLACEMENT si zoomé).
        // Un glisser annule le tap.
        if (!s.weave) {
          const ge = ev.target.closest("[data-edge-id]");
          if (ge) s.edgeTap = { id: ge.dataset.edgeId, x0: ev.clientX, y0: ev.clientY, moved: false };
          else s.bg = { x0: ev.clientX, y0: ev.clientY, lx: ev.clientX, ly: ev.clientY, moved: false };
        }
        return;
      }
      const n = s.N[s.idx.get(g.dataset.nodeId)];
      if (!n) return;
      if (s.weave) {
        // Tissage : tirer un lien depuis ce nœud (la source ne bouge pas).
        // Visuel posé AVANT la capture (best-effort) pour ne pas dépendre d'elle.
        s.weaving = { from: n, target: null };
        const wl = s.weaveLine;
        wl.setAttribute("x1", n.x); wl.setAttribute("y1", n.y);
        wl.setAttribute("x2", n.x); wl.setAttribute("y2", n.y);
        wl.setAttribute("visibility", "visible");
        try { s.svg.setPointerCapture?.(ev.pointerId); } catch {}
        return;
      }
      s.drag = { n, moved: false, x0: ev.clientX, y0: ev.clientY, px: null, py: null, vx: 0, vy: 0 };
      n.pinned = true;
      g.setPointerCapture?.(ev.pointerId);
      g.classList.add("dragging");
      g.parentNode.appendChild(g); // au premier plan (z-order = ordre DOM)
      this._reheat(s);
    });
    s.svg.addEventListener("pointermove", (ev) => {
      if (s.pointers.has(ev.pointerId)) s.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (s.pinch && s.pointers.size >= 2) {
        // Pincement : + d'écart = rapprochement ; le milieu déplace la vue.
        const [a, b] = [...s.pointers.values()];
        const nd = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        this._panBy(s, mx - s.pinch.mx, my - s.pinch.my);
        this._zoomAt(s, nd / s.pinch.d, mx, my);
        s.pinch.d = nd; s.pinch.mx = mx; s.pinch.my = my;
        return;
      }
      const p = toSvg(ev);
      if (s.bg) {
        if (Math.hypot(ev.clientX - s.bg.x0, ev.clientY - s.bg.y0) > 4) s.bg.moved = true;
        if (s.bg.moved) { // glisser le fond = déplacer la vue (utile une fois zoomé)
          this._panBy(s, ev.clientX - s.bg.lx, ev.clientY - s.bg.ly);
          s.bg.lx = ev.clientX; s.bg.ly = ev.clientY;
        }
      }
      if (s.edgeTap && Math.hypot(ev.clientX - s.edgeTap.x0, ev.clientY - s.edgeTap.y0) > 4) s.edgeTap.moved = true;
      if (s.weaving) {
        // Accroche magnétique : au voisinage d'un nœud valide, la ligne saute à
        // son centre et le nœud pulse (« j'accepte ») ; sinon elle suit le doigt.
        const t = this._nodeNear(s, p, s.weaving.from);
        if (t !== s.weaving.target) {
          if (s.weaving.target) s.weaving.target._g.classList.remove("weave-target");
          if (t) t._g.classList.add("weave-target");
          s.weaving.target = t;
        }
        const from = s.weaving.from;
        const q = t ? { x: t.x, y: t.y } : p;
        const wl = s.weaveLine;
        wl.setAttribute("x1", from.x); wl.setAttribute("y1", from.y);
        wl.setAttribute("x2", q.x); wl.setAttribute("y2", q.y);
        return;
      }
      if (!s.drag) return;
      if (Math.hypot(ev.clientX - s.drag.x0, ev.clientY - s.drag.y0) > 4) s.drag.moved = true;
      // Vitesse du glisser, lissée — servira de momentum au lâcher.
      if (s.drag.px != null) {
        s.drag.vx = 0.55 * s.drag.vx + 0.45 * (p.x - s.drag.px);
        s.drag.vy = 0.55 * s.drag.vy + 0.45 * (p.y - s.drag.py);
      }
      s.drag.px = p.x; s.drag.py = p.y;
      s.drag.n.x = p.x; s.drag.n.y = p.y;
      this._reheat(s);
    });
    const end = (ev) => {
      s.pointers.delete(ev.pointerId);
      if (s.pinch) { // en pincement : un doigt lâché en sort, l'autre ne (re)tape rien
        if (s.pointers.size < 2) s.pinch = null;
        return;
      }
      if (s.edgeTap) {
        const et = s.edgeTap;
        s.edgeTap = null;
        if (!et.moved && typeof s.onEdgeTap === "function") s.onEdgeTap(et.id);
        return;
      }
      if (s.bg) {
        const bg = s.bg;
        s.bg = null;
        if (!bg.moved && typeof s.onBackgroundTap === "function") s.onBackgroundTap();
        return;
      }
      if (s.weaving) {
        const { from, target } = s.weaving;
        if (target) target._g.classList.remove("weave-target");
        s.weaveLine.setAttribute("visibility", "hidden");
        s.weaving = null;
        if (target && typeof s.onWeave === "function") s.onWeave(from.id, target.id);
        return;
      }
      if (!s.drag) return;
      const { n, moved, vx, vy } = s.drag;
      n.pinned = false;
      n._g.classList.remove("dragging");
      s.drag = null;
      if (!moved) {
        n.vx = 0; n.vy = 0;
        if (typeof s.onNodeTap === "function") s.onNodeTap(n.id);
      } else {
        // Momentum : le nœud garde l'élan du glisser (borné) puis décélère par
        // frottement et se recale via les ressorts — glisse, pas de snap sec.
        const cap = Math.sqrt((s.W * s.H) / s.N.length) * 0.5;
        const sp = Math.hypot(vx, vy);
        n.vx = sp > cap ? (vx / sp) * cap : vx;
        n.vy = sp > cap ? (vy / sp) * cap : vy;
        // Mode auteur : la position est finale au lâcher (pas de recalage par
        // ressorts) → la persister via le callback de la vue.
        if (s.staticLayout && typeof s.onNodeMoved === "function") s.onNodeMoved(n.id, n.x, n.y);
      }
      this._reheat(s);
    };
    s.svg.addEventListener("pointerup", end);
    s.svg.addEventListener("pointercancel", end);
    // Clavier : Entrée/Espace sur un nœud focalisé = tap.
    s.svg.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      const g = ev.target.closest?.("[data-node-id]");
      if (!g) return;
      ev.preventDefault();
      if (typeof s.onNodeTap === "function") s.onNodeTap(g.dataset.nodeId);
    });
    // Molette : zoom autour du curseur. Non-passif pour bloquer le scroll natif.
    s.svg.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      this._zoomAt(s, ev.deltaY < 0 ? 1.12 : 1 / 1.12, ev.clientX, ev.clientY);
    }, { passive: false });
  },

  destroy() {
    const s = this._state;
    if (!s) return;
    if (s.raf) cancelAnimationFrame(s.raf);
    if (s.svg && s.svg.parentNode) s.svg.parentNode.removeChild(s.svg);
    this._state = null;
  },
};

// Pont couche 5 (voir PLANS/PLAN_MODULES_ES.md).
window.GraphEngine = GraphEngine;
