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
  mount(container, { nodes = [], edges = [], accent = "#35e0e6", onNodeTap = null } = {}) {
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

    // Arêtes (lignes) + label optionnel.
    for (const e of E) {
      const line = document.createElementNS(NS, "line");
      line.setAttribute("class", "graph-edge");
      line.setAttribute("stroke", accent);
      e._line = line;
      gEdges.appendChild(line);
    }

    // Nœuds : cercle + glyphe + label, chacun dans un <g data-node-id>.
    for (const n of N) {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "graph-node");
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

    const state = { container, svg, W, H, N, E, idx, accent, onNodeTap, raf: 0, alpha: 1, drag: null };
    this._state = state;
    container.appendChild(svg);
    this._wire(state);
    this._loop(state);
  },

  /* ---- Simulation (Fruchterman-Reingold léger, refroidissement) ---- */
  _step(s) {
    const { N, E, W, H } = s;
    const area = W * H;
    const k = Math.sqrt(area / Math.max(1, N.length));
    const disp = N.map(() => ({ x: 0, y: 0 }));

    // Répulsion (toutes paires).
    for (let i = 0; i < N.length; i++) {
      for (let j = i + 1; j < N.length; j++) {
        let dx = N[i].x - N[j].x, dy = N[i].y - N[j].y;
        let d = Math.hypot(dx, dy) || 0.01;
        const f = (k * k) / d;
        const ux = dx / d, uy = dy / d;
        disp[i].x += ux * f; disp[i].y += uy * f;
        disp[j].x -= ux * f; disp[j].y -= uy * f;
      }
    }
    // Attraction (le long des arêtes).
    for (const e of E) {
      const a = N[e.a], b = N[e.b];
      let dx = a.x - b.x, dy = a.y - b.y;
      let d = Math.hypot(dx, dy) || 0.01;
      const f = (d * d) / k;
      const ux = dx / d, uy = dy / d;
      disp[e.a].x -= ux * f; disp[e.a].y -= uy * f;
      disp[e.b].x += ux * f; disp[e.b].y += uy * f;
    }
    // Centrage doux + intégration bornée par alpha.
    const maxMove = k * s.alpha;
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < N.length; i++) {
      const n = N[i];
      if (n.pinned) continue;
      disp[i].x += (cx - n.x) * 0.02 * k * 0.1;
      disp[i].y += (cy - n.y) * 0.02 * k * 0.1;
      let dl = Math.hypot(disp[i].x, disp[i].y) || 0.01;
      const m = Math.min(dl, maxMove);
      n.x += (disp[i].x / dl) * m;
      n.y += (disp[i].y / dl) * m;
      // Garder dans le cadre.
      n.x = Math.max(20, Math.min(W - 20, n.x));
      n.y = Math.max(24, Math.min(H - 28, n.y));
    }
    s.alpha *= 0.96; // refroidissement
  },

  _render(s) {
    for (const e of s.E) {
      const a = s.N[e.a], b = s.N[e.b];
      e._line.setAttribute("x1", a.x); e._line.setAttribute("y1", a.y);
      e._line.setAttribute("x2", b.x); e._line.setAttribute("y2", b.y);
    }
    for (const n of s.N) n._g.setAttribute("transform", `translate(${n.x} ${n.y})`);
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

  /* ---- Pointer : glisser un nœud, tap = clic net ---- */
  _wire(s) {
    const toSvg = (ev) => {
      const pt = s.svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const m = s.svg.getScreenCTM();
      return m ? pt.matrixTransform(m.inverse()) : { x: ev.clientX, y: ev.clientY };
    };
    s.svg.addEventListener("pointerdown", (ev) => {
      const g = ev.target.closest("[data-node-id]");
      if (!g) return;
      const n = s.N[s.idx.get(g.dataset.nodeId)];
      if (!n) return;
      s.drag = { n, moved: false, x0: ev.clientX, y0: ev.clientY };
      n.pinned = true;
      g.setPointerCapture?.(ev.pointerId);
      g.classList.add("dragging");
      this._reheat(s);
    });
    s.svg.addEventListener("pointermove", (ev) => {
      if (!s.drag) return;
      if (Math.hypot(ev.clientX - s.drag.x0, ev.clientY - s.drag.y0) > 4) s.drag.moved = true;
      const p = toSvg(ev);
      s.drag.n.x = p.x; s.drag.n.y = p.y;
      this._reheat(s);
    });
    const end = (ev) => {
      if (!s.drag) return;
      const { n, moved } = s.drag;
      n.pinned = false;
      n._g.classList.remove("dragging");
      s.drag = null;
      if (!moved && typeof s.onNodeTap === "function") s.onNodeTap(n.id);
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
