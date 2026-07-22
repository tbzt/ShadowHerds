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
  mount(container, { nodes = [], edges = [], accent = "#35e0e6", onNodeTap = null, onWeave = null, onBackgroundTap = null } = {}) {
    this.destroy();
    const W = Math.max(320, container.clientWidth || 640);
    const H = Math.max(240, container.clientHeight || 460);

    // Positions initiales : couronne + jitter (déterminisme non requis ici,
    // le layout converge ; MapGen/TopologyGen sont les leaves déterministes).
    const R = Math.min(W, H) * 0.32;
    const N = nodes.map((n, i) => {
      const a = (2 * Math.PI * i) / Math.max(1, nodes.length);
      return {
        ...n,
        x: W / 2 + Math.cos(a) * R + (Math.random() - 0.5) * 12,
        y: H / 2 + Math.sin(a) * R + (Math.random() - 0.5) * 12,
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

    const gEdges = document.createElementNS(NS, "g");
    gEdges.setAttribute("class", "graph-edges");
    const gNodes = document.createElementNS(NS, "g");
    gNodes.setAttribute("class", "graph-nodes");
    svg.appendChild(gEdges);
    svg.appendChild(gNodes);

    // Arêtes (lignes) — estompées si l'un des bouts est hors périmètre (halo).
    for (const e of E) {
      const line = document.createElementNS(NS, "line");
      const dim = N[e.a].inScope === false || N[e.b].inScope === false;
      line.setAttribute("class", dim ? "graph-edge halo" : "graph-edge");
      line.setAttribute("stroke", accent);
      e._line = line;
      gEdges.appendChild(line);
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
      circle.setAttribute("fill", n.type === "pj" && n.pcColor ? n.pcColor : "var(--surface-2, #16202b)");
      circle.setAttribute("stroke", accent);

      const glyph = document.createElementNS(NS, "text");
      glyph.setAttribute("class", "graph-node-glyph");
      glyph.setAttribute("text-anchor", "middle");
      glyph.setAttribute("dy", "0.35em");
      glyph.setAttribute("fill", accent);
      glyph.textContent = TYPE_GLYPH[n.type] || "●";

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
      container, svg, W, H, N, E, idx, accent, onNodeTap, onWeave, onBackgroundTap,
      raf: 0, alpha: 1, drag: null, weave: false, weaving: null, weaveLine,
      selectedId: null, bg: null,
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
    for (const e of s.E) {
      const a = s.N[e.a], b = s.N[e.b];
      e._line.setAttribute("x1", a.x); e._line.setAttribute("y1", a.y);
      e._line.setAttribute("x2", b.x); e._line.setAttribute("y2", b.y);
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
      this._step(s);
      this._render(s);
      // S'arrête au repos (alpha bas et aucun glisser) — 0 CPU.
      if (s.alpha > 0.02 || s.drag) s.raf = requestAnimationFrame(frame);
      else s.raf = 0;
    };
    if (!s.raf) s.raf = requestAnimationFrame(frame);
  },
  _reheat(s) {
    s.alpha = Math.max(s.alpha, 0.3);
    this._loop(s);
  },

  /** Sélectionne un nœud (surbrillance d'accent) ; `null` = désélectionne.
      La sélection est un état de VUE (pas de vérité) : elle est perdue au
      remontage, la vue la repose si besoin. */
  select(id) {
    const s = this._state;
    if (!s) return;
    s.selectedId = id || null;
    for (const n of s.N) n._g.classList.toggle("selected", n.id === s.selectedId);
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

  /* ---- Pointer : glisser un nœud, tap = clic net, tisser un lien ---- */
  _wire(s) {
    const toSvg = (ev) => {
      const pt = s.svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const m = s.svg.getScreenCTM();
      return m ? pt.matrixTransform(m.inverse()) : { x: ev.clientX, y: ev.clientY };
    };
    s.svg.addEventListener("pointerdown", (ev) => {
      const g = ev.target.closest("[data-node-id]");
      if (!g) {
        // Fond (hors nœud) : candidat « tap vide » = désélection (hors tissage,
        // où le fond ne fait rien). Un glisser du fond annule le tap.
        if (!s.weave) s.bg = { x0: ev.clientX, y0: ev.clientY, moved: false };
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
      const p = toSvg(ev);
      if (s.bg && Math.hypot(ev.clientX - s.bg.x0, ev.clientY - s.bg.y0) > 4) s.bg.moved = true;
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
