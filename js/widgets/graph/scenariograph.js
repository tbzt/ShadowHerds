"use strict";

/* ============================================================
   SCENARIO GRAPH — la lentille « schéma de scènes » (atelier).
   ------------------------------------------------------------
   Éditeur de la carte heuristique d'une trame : nœuds-scènes typés
   + arêtes de transition. Réutilise le MOTEUR `GraphEngine` en mode
   « layout auteur » (`static:true`) — les positions sont arrangées à la
   main et PERSISTÉES (drag → `onNodeMoved` → ScenarioStore), pas un layout
   de forces émergent. Peau distincte du graphe d'entités : glyphe par TYPE
   de scène (◎ accroche · ⌕ repérage · ⚔ action · ❝ sociale · ⑂ décision ·
   ⚑ retombée), fournie par la projection (le moteur reste bête).

   Une vérité, plusieurs lentilles-éditrices : la vérité est `ScenarioStore` ;
   ici on la lit et l'édite, jamais on ne la détient. La vue s'ABONNE au store
   (`subscribe`) pour refléter les écritures EXTERNES (à terme le cockpit S2) ;
   ses propres écritures sont « muettes » (`_apply`) pour ne pas se remonter
   sous les doigts (préserve focus/caret). Positions auteur + persistées ⇒ un
   remontage reproduit exactement la carte (idempotent visuel).

   Bibliothèque autonome (S1) : créer/ouvrir/renommer/supprimer une trame ;
   la liaison trame↔run se fera en S2 (cockpit dans Jouer). Aucun `onclick` :
   délégation `data-scenario-*`. Cf. PLANS/architecture-graphe-scenaristique.md § S1.
   ============================================================ */
import { GraphEngine } from "./graphengine.js";
import { ScenarioTemplates } from "./scenariotemplates.js";
import { ScenarioValidators } from "./scenariovalidators.js";
import { Utils } from "../../core/utils.js";

export const ScenarioGraph = {
  _el: null,
  _scenarioId: null,
  _weave: false,
  _showClues: false, // S4 — calque d'indices superposé (facts + arêtes d'indice)
  _selNode: null,
  _selEdge: null,
  _selInfo: null, // S4 — fait sélectionné
  _selClue: null, // S4 — indice sélectionné
  _warnings: [], // S4b — alertes de robustesse (recalculées à chaque projection)
  _pressureOpen: false, // S5a — panneau d'horloges (Pression) ouvert dans l'inspecteur
  _timelineOpen: false, // S5c — lentille Chronologie (double timeline) ouverte
  _unsub: null,
  _muted: false, // vrai pendant une écriture interne (l'abonnement l'ignore)

  // Les 6 beats transposés à Shadowrun. Glyphes monochromes du vocabulaire
  // établi (◎ = seuil/entrée ; ⚔ = action ; ❝ = dialogue). Édition-NEUTRE.
  _TYPES: [
    { key: "accroche", glyph: "◎", label: "Accroche" },
    { key: "repérage", glyph: "⌕", label: "Repérage" },
    { key: "action", glyph: "⚔", label: "Action" },
    { key: "sociale", glyph: "❝", label: "Sociale" },
    { key: "décision", glyph: "⑂", label: "Décision" },
    { key: "retombée", glyph: "⚑", label: "Retombée" },
  ],
  _KINDS: [
    { key: "libre", label: "Libre" },
    { key: "conditionnelle", label: "Conditionnelle" },
    { key: "evenement", label: "Événement joueur" },
    { key: "temporelle", label: "Temporelle" },
  ],
  // Teinte de l'arête « sortie de secours » (échec) — constante de vue, comme
  // GraphView._EDGE_COLORS : le moteur pose la couleur en attribut (pas de token CSS).
  _HATCH: "#a65a5a",
  // S4 — calque d'indices : glyphe de fait (◆ progression = à atteindre / ◇
  // enrichissement = couleur optionnelle) + teinte d'arête d'indice. Constantes
  // de vue monochromes (le moteur pose la couleur en attribut), édition-neutres.
  _INFO_GLYPH: { progression: "◆", enrichissement: "◇" },
  _CLUE: "#6f9fd8",
  _CLOSED: "#5a6673", // S5a — arête fermée par une horloge (atténuée)
  _ARROW_TINT: { hope: "#2f5a44", fear: "#5a2f2f" }, // S6 — teinte de disque par flèche dramatique
  _ARROWS: [
    { key: "hope", glyph: "↑", label: "Espoir" },
    { key: "", glyph: "—", label: "Neutre" },
    { key: "fear", glyph: "↓", label: "Peur" },
  ],
  _CLOCK_TYPES: [
    { key: "menace", label: "Menace" },
    { key: "alerte", label: "Alerte" },
    { key: "objectif", label: "Objectif" },
  ],
  _CLOCK_ACTIONS: [
    { key: "closeEdge", label: "Ferme une sortie" },
    { key: "openEdge", label: "Rouvre une sortie" },
    { key: "activateNode", label: "Active une étape" },
  ],

  /* ---- Ouverture / fermeture ---- */
  /** `scenarioId` optionnel : ouvrir directement sur cette trame (depuis le
      cockpit « Trame » de Jouer, S2). Sinon, la dernière ouverte / la dernière
      de la liste / aucune. */
  open(scenarioId) {
    const overlay = this._ensure();
    if (scenarioId && ScenarioStore.get(scenarioId)) {
      this._scenarioId = scenarioId;
    } else if (!this._scenarioId || !ScenarioStore.get(this._scenarioId)) {
      const list = ScenarioStore.all();
      this._scenarioId = list.length ? list[list.length - 1].id : null;
    }
    if (!this._unsub) this._unsub = ScenarioStore.subscribe((evt) => this._onStoreEvent(evt));
    overlay.classList.add("open");
    this._renderLibrary();
    this._project();
  },

  hide() {
    if (this._el) this._el.classList.remove("open");
    GraphEngine.destroy();
    if (this._unsub) { this._unsub(); this._unsub = null; }
  },

  /* ---- Écriture interne guardée : ne pas se remonter sur son propre événement. ---- */
  _apply(fn) {
    this._muted = true;
    try { return fn(); }
    finally { this._muted = false; }
  },

  /** Événement du store. Interne (muet) → déjà reflété. Externe sur la trame
      ouverte (cockpit S2, plus tard) → re-projeter (positions auteur = stable). */
  _onStoreEvent(evt) {
    if (this._muted) return;
    if (!evt || evt.scenarioId !== this._scenarioId) return;
    this._renderLibrary();
    this._project();
  },

  /* ============================================================
     PROJECTION — mappe la trame détenue → { nodes, edges } du moteur.
     ============================================================ */
  _project() {
    const overlay = this._el;
    if (!overlay || !overlay.classList.contains("open")) return;
    const split = overlay.querySelector(".graph-split");
    const host = overlay.querySelector('[data-scenario="canvas"]');
    const empty = overlay.querySelector('[data-scenario="empty"]');
    const sc = this._scenarioId ? ScenarioStore.get(this._scenarioId) : null;

    if (!sc) {
      split.hidden = true;
      empty.hidden = false;
      empty.textContent = ScenarioStore.all().length
        ? "Choisissez une trame ci-dessus."
        : "Aucune trame. Créez-en une (＋ Nouvelle trame) pour poser vos étapes.";
      GraphEngine.destroy();
      return;
    }
    split.hidden = false;
    empty.hidden = true;

    const glyphOf = new Map(this._TYPES.map((t) => [t.key, t.glyph]));
    const nodes = sc.sceneNodes.map((n) => ({
      id: n.id,
      type: n.type,
      glyph: glyphOf.get(n.type) || "●",
      label: n.title || "(sans titre)",
      pcColor: this._ARROW_TINT[n.arrow] || null, // S6 — teinte par flèche dramatique
      x: n.x, y: n.y,
    }));
    // S5a — arêtes FERMÉES par une horloge (runtime) : atténuées + « ✕ ».
    const closedEdges = new Set((sc.runtime && sc.runtime.closedEdgeIds) || []);
    const edges = sc.sceneEdges.map((e) => {
      const closed = closedEdges.has(e.id);
      return {
        id: e.id, from: e.from, to: e.to,
        dir: "forward",
        dashed: closed || !!e.isEscapeHatch,
        color: closed ? this._CLOSED : e.isEscapeHatch ? this._HATCH : null,
        label: closed ? (this._edgeLabel(e) ? this._edgeLabel(e) + " ✕" : "✕ fermé") : this._edgeLabel(e),
      };
    });

    // S4 — CALQUE D'INDICES superposé : les faits deviennent des nœuds (glyphe
    // ◆/◇ selon le rôle), chaque (indice, scène d'ancrage) une arête pointillée
    // scène→fait. Indice flottant / via-contact = fait isolé (sa voie s'affiche
    // dans l'inspecteur, pas sur le canvas). Additif : les scènes restent.
    if (this._showClues) {
      const sceneIds = new Set(sc.sceneNodes.map((n) => n.id));
      for (const f of sc.infoNodes) {
        nodes.push({
          id: f.id, type: "info",
          glyph: this._INFO_GLYPH[f.role] || "◇",
          label: f.fact || "(fait sans texte)",
          x: f.x, y: f.y,
        });
      }
      for (const c of sc.clues) {
        for (const sid of c.anchorSceneNodes || []) {
          if (!sceneIds.has(sid)) continue;
          edges.push({
            id: c.id + ":" + sid, from: sid, to: c.toInfoNode,
            dir: "forward", dashed: true, color: this._CLUE,
            label: c.gated ? "jet" : "",
          });
        }
      }
    }
    const accent =
      (typeof App !== "undefined" && App.editionModule && App.editionModule.mapAccent) || "#35e0e6";

    GraphEngine.mount(host, {
      nodes, edges, accent,
      static: true, // layout auteur : x,y honorés + persistés
      onNodeMoved: (id, x, y) => this._onNodeMoved(id, x, y),
      onNodeTap: (id) => this._onNodeTap(id),
      onEdgeTap: (id) => this._onEdgeTap(id),
      onBackgroundTap: () => this._clearInspector(),
      onWeave: (a, b) => this._onWeave(a, b),
    });
    GraphEngine.setWeave(this._weave);

    // Mise en avant de l'ÉTAPE COURANTE (runtime, S2) — l'anneau « current »
    // suit `runtime.currentSceneId` : bifurquer au cockpit ré-éclaire ici.
    const curId = sc.runtime && sc.runtime.currentSceneId;
    if (curId && sc.sceneNodes.some((n) => n.id === curId)) GraphEngine.setNodeCurrent(curId, true);

    // Reposer la sélection si elle survit ; sinon l'invite (le panneau Pression
    // a la priorité — c'est un mode, comme le panneau Robustesse).
    if (this._pressureOpen) this._renderPressure();
    else if (this._timelineOpen) this._renderTimeline();
    else if (this._selNode && sc.sceneNodes.some((n) => n.id === this._selNode)) this._selectNode(this._selNode);
    else if (this._selEdge && sc.sceneEdges.some((e) => e.id === this._selEdge)) this._selectEdge(this._selEdge);
    else if (this._selInfo && sc.infoNodes.some((n) => n.id === this._selInfo)) this._selectInfo(this._selInfo);
    else if (this._selClue && sc.clues.some((c) => c.id === this._selClue)) this._selectClue(this._selClue);
    else this._clearInspector();

    this._updateRobustesse(); // S4b — les alertes suivent l'édition live
  },

  /* ============================================================
     ROBUSTESSE (S4b) — les alertes de conception (lecture pure).
     ============================================================ */
  _updateRobustesse() {
    const sc = this._scenarioId ? ScenarioStore.get(this._scenarioId) : null;
    const factionIds = typeof FactionStore !== "undefined" ? new Set(FactionStore.all().map((f) => f.id)) : null;
    this._warnings = sc ? ScenarioValidators.validate(sc, { factionIds }) : [];
    const b = this._el && this._el.querySelector('[data-scenario-action="robustesse"]');
    if (!b) return;
    const n = this._warnings.length;
    b.textContent = n ? `⚠ Robustesse (${n})` : "✓ Robustesse";
    b.classList.toggle("has-warnings", n > 0);
  },

  _showRobustesse() {
    const panel = this._el && this._el.querySelector('[data-scenario="inspector"]');
    if (!panel) return;
    this._pressureOpen = this._timelineOpen = false;
    this._selNode = this._selEdge = this._selInfo = this._selClue = null;
    GraphEngine.select(null); GraphEngine.selectEdge(null);
    panel.classList.remove("empty");
    const esc = Utils.escHtml;
    const items = this._warnings.length
      ? this._warnings
          .map((w) => `<li class="scenario-robust-item ${w.level}"${w.targetId ? ` data-scenario-robust="${esc(w.targetId)}"` : ""}>${esc(w.message)}</li>`)
          .join("")
      : `<li class="scenario-robust-item ok">Aucune alerte : l'enquête tient (3 indices, sorties de secours, atteignabilité).</li>`;
    panel.innerHTML = `<div class="scenario-inspector">
      <div class="scenario-insp-head">Robustesse de l'enquête</div>
      <ul class="scenario-robust-list">${items}</ul>
      <p class="graph-hint">Touchez une alerte pour surligner le nœud concerné.</p>
    </div>`;
  },

  /** Clic sur une alerte → sélectionne/illumine sa cible (fait ou scène). */
  _gotoWarning(targetId) {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !targetId) return;
    if (sc.infoNodes.some((n) => n.id === targetId) && !this._showClues) {
      this._showClues = true;
      this._reflectClues();
      this._renderToolbar(true);
      this._project();
    }
    this._onNodeTap(targetId);
  },

  /* ============================================================
     PRESSION / HORLOGES (S5a) — panneau de l'inspecteur (mode) : définir des
     horloges et leurs effets. Le REMPLISSAGE se fait au cockpit (Jouer) ; ici
     on POSE la structure. Anneau segmenté réutilisé par le cockpit.
     ============================================================ */
  /** Anneau segmenté d'horloge (SVG pur, sans état) — public : le cockpit
      (play.js) le réutilise. `filled` segments colorés selon `type`. */
  clockRingHtml(segments, filled, type, size = 40) {
    const seg = Math.max(1, segments | 0);
    const r = size / 2 - 2, cx = size / 2, cy = size / 2;
    let slices = "";
    for (let i = 0; i < seg; i++) {
      const on = i < filled ? " filled" : "";
      if (seg === 1) {
        slices += `<circle cx="${cx}" cy="${cy}" r="${r}" class="clock-slice${on}"/>`;
        continue;
      }
      const a0 = (i / seg) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / seg) * 2 * Math.PI - Math.PI / 2;
      const x0 = (cx + r * Math.cos(a0)).toFixed(1), y0 = (cy + r * Math.sin(a0)).toFixed(1);
      const x1 = (cx + r * Math.cos(a1)).toFixed(1), y1 = (cy + r * Math.sin(a1)).toFixed(1);
      const large = a1 - a0 > Math.PI ? 1 : 0;
      slices += `<path d="M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z" class="clock-slice${on}"/>`;
    }
    return `<svg class="clock-ring t-${type || "menace"}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${slices}</svg>`;
  },

  _reflectPressure() {
    const b = this._el && this._el.querySelector('[data-scenario-action="toggle-pressure"]');
    if (b) { b.setAttribute("aria-pressed", String(this._pressureOpen)); b.classList.toggle("active", this._pressureOpen); }
  },
  _reflectTimeline() {
    const b = this._el && this._el.querySelector('[data-scenario-action="toggle-timeline"]');
    if (b) { b.setAttribute("aria-pressed", String(this._timelineOpen)); b.classList.toggle("active", this._timelineOpen); }
  },

  /* ============================================================
     CHRONOLOGIE (S5c) — la DOUBLE timeline (lentille de lecture) : le PASSÉ
     reconstruit (faits par rang `when`, ce que l'enquête exhume) vs le FUTUR
     qui avance (horloges + fronts). Panneau d'inspecteur (mode), lecture seule ;
     un fait est cliquable pour y sauter. Le rang `when` s'édite dans l'inspecteur
     de Fait (S4). Cf. § « Chronologie = DEUX timelines » du plan.
     ============================================================ */
  _renderTimeline() {
    const panel = this._el && this._el.querySelector('[data-scenario="inspector"]');
    const sc = ScenarioStore.get(this._scenarioId);
    if (!panel || !sc) return;
    panel.classList.remove("empty");
    const esc = Utils.escHtml;

    // Passé : faits datés (when) triés ; les non datés listés à part.
    const dated = (sc.infoNodes || []).filter((f) => Number.isFinite(f.when)).sort((a, b) => a.when - b.when);
    const undated = (sc.infoNodes || []).filter((f) => !Number.isFinite(f.when));
    const factItem = (f) => `<li class="scenario-tl-fact ${f.role}" data-scenario-tl="${f.id}">${Number.isFinite(f.when) ? `<span class="scenario-tl-when">${f.when}</span>` : ""}<span class="scenario-info-mark">${this._INFO_GLYPH[f.role] || "◇"}</span> ${esc(f.fact || "(fait)")}</li>`;
    const pastHtml = dated.length || undated.length
      ? `<ol class="scenario-tl-list">${dated.map(factItem).join("")}</ol>` +
        (undated.length ? `<div class="scenario-tl-sub">Non datés (${undated.length})</div><ul class="scenario-tl-list">${undated.map(factItem).join("")}</ul>` : "")
      : `<p class="graph-hint">Aucun fait. Ajoutez des faits (◇ Indices) et donnez-leur un rang temporel pour reconstruire le passé.</p>`;

    // Futur : horloges (remplissage) + fronts (présages révélés).
    const clocks = (sc.clocks || []).map((c) => {
      const fill = ScenarioStore.clockFill(sc, c.id);
      return `<div class="scenario-tl-future-row">${this.clockRingHtml(c.segments, fill, c.type, 26)}<span>${esc(c.title || "(horloge)")}</span><span class="scenario-tl-count">${fill}/${c.segments}</span></div>`;
    }).join("");
    const fronts = (sc.fronts || []).map((f) => {
      const tot = (f.dangers || []).reduce((n, d) => n + (d.grimPortents || []).length, 0);
      const rev = (f.dangers || []).reduce((n, d) => n + ScenarioStore.frontPortent(sc, d.id), 0);
      return `<div class="scenario-tl-future-row"><span class="scenario-front-glyph">⚑</span><span>${esc(f.title || "(front)")}</span><span class="scenario-tl-count">${rev}/${tot}</span></div>`;
    }).join("");
    const futureHtml = clocks || fronts ? clocks + fronts : `<p class="graph-hint">Aucune horloge ni front (⏱ Pression).</p>`;

    panel.innerHTML = `<div class="scenario-inspector">
      <div class="scenario-insp-head">Chronologie</div>
      <div class="scenario-subhead">↤ Passé reconstruit</div>
      ${pastHtml}
      <div class="scenario-subhead">Futur qui avance ↦</div>
      ${futureHtml}
    </div>`;
  },

  _renderPressure() {
    const panel = this._el && this._el.querySelector('[data-scenario="inspector"]');
    const sc = ScenarioStore.get(this._scenarioId);
    if (!panel || !sc) return;
    panel.classList.remove("empty");
    const clocks = sc.clocks || [];
    const fronts = sc.fronts || [];
    const clockRows = clocks.length ? clocks.map((c) => this._clockRowHtml(c, sc)).join("") : `<p class="graph-hint">Une horloge fait monter la pression : à un seuil, elle ferme une sortie ou active une étape.</p>`;
    const frontRows = fronts.length ? fronts.map((f) => this._frontRowHtml(f)).join("") : `<p class="graph-hint">Un front porte une faction et des présages ordonnés qui escaladent (Dungeon World).</p>`;
    panel.innerHTML = `<div class="scenario-inspector">
      <div class="scenario-insp-head">Pression</div>
      <div class="scenario-subhead">⏱ Horloges</div>
      ${clockRows}
      <button type="button" class="scenario-cast-add" data-scenario-clock="add">＋ Horloge</button>
      <div class="scenario-subhead">⚑ Fronts</div>
      ${frontRows}
      <button type="button" class="scenario-cast-add" data-scenario-front="add">＋ Front</button>
      <p class="graph-hint">Le remplissage / l'avancée se font en partie (écran Jouer).</p>
    </div>`;
  },

  /** Options d'un select de faction (FactionStore). Vide → « aucune ». */
  _factionOptions(selected) {
    const esc = Utils.escHtml;
    const facs = typeof FactionStore !== "undefined" ? FactionStore.all() : [];
    return `<option value="">— faction —</option>` +
      facs.map((f) => `<option value="${f.id}"${f.id === selected ? " selected" : ""}>${esc(f.name)}</option>`).join("");
  },

  _frontRowHtml(f) {
    const esc = Utils.escHtml;
    const dangers = (f.dangers || []).map((d) => this._dangerRowHtml(f, d)).join("");
    return `<div class="scenario-front" data-fr="${f.id}">
      <div class="scenario-front-head">
        <span class="scenario-front-glyph" aria-hidden="true">⚑</span>
        <input type="text" class="scenario-front-title" data-scenario-front="title" data-fr="${f.id}" value="${esc(f.title || "")}" placeholder="ex. Les représailles d'une faction" maxlength="60">
        <select data-scenario-front="faction" data-fr="${f.id}">${this._factionOptions(f.factionId)}</select>
        <button type="button" class="scenario-clock-del" data-scenario-front="delete" data-fr="${f.id}" aria-label="Supprimer le front">✕</button>
      </div>
      <div class="scenario-front-dangers">${dangers}
        <button type="button" class="scenario-cast-add" data-scenario-front="danger-add" data-fr="${f.id}">＋ Danger</button>
      </div>
    </div>`;
  },

  _dangerRowHtml(f, d) {
    const esc = Utils.escHtml;
    const portents = (d.grimPortents || []).map((p, i) => `<div class="scenario-portent">
      <span class="scenario-portent-n">${i + 1}.</span>
      <input type="text" data-scenario-front="portent" data-fr="${f.id}" data-dg="${d.id}" data-idx="${i}" value="${esc(p)}" placeholder="présage…" maxlength="80">
      <button type="button" class="scenario-clock-del" data-scenario-front="portent-del" data-fr="${f.id}" data-dg="${d.id}" data-idx="${i}" aria-label="Supprimer le présage">✕</button>
    </div>`).join("");
    return `<div class="scenario-danger" data-fr="${f.id}" data-dg="${d.id}">
      <div class="scenario-danger-head">
        <input type="text" data-scenario-front="danger-impulse" data-fr="${f.id}" data-dg="${d.id}" value="${esc(d.impulse || "")}" placeholder="Impulsion (ce que ça VEUT)" maxlength="70">
        <button type="button" class="scenario-clock-del" data-scenario-front="danger-del" data-fr="${f.id}" data-dg="${d.id}" aria-label="Supprimer le danger">✕</button>
      </div>
      <div class="scenario-portents">${portents}
        <button type="button" class="scenario-portent-add" data-scenario-front="portent-add" data-fr="${f.id}" data-dg="${d.id}">＋ Présage</button>
      </div>
      <input type="text" class="scenario-danger-doom" data-scenario-front="danger-doom" data-fr="${f.id}" data-dg="${d.id}" value="${esc(d.impendingDoom || "")}" placeholder="Échéance (si tout arrive)" maxlength="90">
    </div>`;
  },

  _onFrontControl(el) {
    const k = el.dataset.scenarioFront, fr = el.dataset.fr, dg = el.dataset.dg, idx = parseInt(el.dataset.idx, 10);
    const s = this._scenarioId;
    if (k === "add") this._apply(() => ScenarioStore.addFront(s, {}));
    else if (k === "delete") this._apply(() => ScenarioStore.removeFront(s, fr));
    else if (k === "danger-add") this._apply(() => ScenarioStore.addDanger(s, fr, {}));
    else if (k === "danger-del") this._apply(() => ScenarioStore.removeDanger(s, fr, dg));
    else if (k === "portent-add") this._apply(() => ScenarioStore.addPortent(s, fr, dg, ""));
    else if (k === "portent-del") this._apply(() => ScenarioStore.removePortent(s, fr, dg, idx));
    else return;
    this._renderPressure();
  },
  _onFrontInput(el, isChange) {
    const k = el.dataset.scenarioFront, fr = el.dataset.fr, dg = el.dataset.dg, idx = parseInt(el.dataset.idx, 10);
    const s = this._scenarioId;
    if (k === "title") this._apply(() => ScenarioStore.updateFront(s, fr, { title: el.value }));
    else if (k === "faction" && isChange) this._apply(() => ScenarioStore.updateFront(s, fr, { factionId: el.value || null }));
    else if (k === "danger-impulse") this._apply(() => ScenarioStore.updateDanger(s, fr, dg, { impulse: el.value }));
    else if (k === "danger-doom") this._apply(() => ScenarioStore.updateDanger(s, fr, dg, { impendingDoom: el.value }));
    else if (k === "portent") this._apply(() => ScenarioStore.updatePortent(s, fr, dg, idx, el.value));
  },

  _clockRowHtml(c, sc) {
    const esc = Utils.escHtml;
    const typeOpts = this._CLOCK_TYPES.map((t) => `<option value="${t.key}"${c.type === t.key ? " selected" : ""}>${t.label}</option>`).join("");
    const effects = (c.effects || []).map((e) => this._effectRowHtml(c, e, sc)).join("");
    return `<div class="scenario-clock" data-ck="${c.id}">
      <div class="scenario-clock-head">
        ${this.clockRingHtml(c.segments, ScenarioStore.clockFill(sc, c.id), c.type, 34)}
        <div class="scenario-clock-fields">
          <input type="text" class="scenario-clock-title" data-scenario-clock="title" data-ck="${c.id}" value="${esc(c.title || "")}" placeholder="ex. L'arrivée des renforts" maxlength="60">
          <div class="scenario-clock-meta">
            <select data-scenario-clock="type" data-ck="${c.id}">${typeOpts}</select>
            <label class="scenario-clock-seg">Cases <input type="number" min="1" max="24" data-scenario-clock="segments" data-ck="${c.id}" value="${c.segments}"></label>
            <button type="button" class="scenario-clock-del" data-scenario-clock="delete" data-ck="${c.id}" aria-label="Supprimer l'horloge">✕</button>
          </div>
        </div>
      </div>
      <div class="scenario-clock-effects">${effects}
        <button type="button" class="scenario-cast-add" data-scenario-clock="add-effect" data-ck="${c.id}">＋ Effet au seuil</button>
      </div>
    </div>`;
  },

  _effectRowHtml(c, e, sc) {
    const esc = Utils.escHtml;
    const actOpts = this._CLOCK_ACTIONS.map((a) => `<option value="${a.key}"${e.action === a.key ? " selected" : ""}>${a.label}</option>`).join("");
    // Cible : une étape (activateNode) ou une arête (open/closeEdge).
    let targetOpts;
    if (e.action === "activateNode") {
      targetOpts = sc.sceneNodes.map((n) => `<option value="${n.id}"${e.targetId === n.id ? " selected" : ""}>${esc(n.title || "(sans titre)")}</option>`).join("");
    } else {
      targetOpts = sc.sceneEdges.map((ed) => {
        const a = sc.sceneNodes.find((n) => n.id === ed.from), b = sc.sceneNodes.find((n) => n.id === ed.to);
        const lbl = `${a ? a.title || "?" : "?"} → ${b ? b.title || "?" : "?"}`;
        return `<option value="${ed.id}"${e.targetId === ed.id ? " selected" : ""}>${esc(lbl)}</option>`;
      }).join("");
    }
    return `<div class="scenario-effect" data-ck="${c.id}" data-eff="${e.id}">
      <span class="scenario-effect-at">à <input type="number" min="1" max="${c.segments}" data-scenario-clock="eff-threshold" data-ck="${c.id}" data-eff="${e.id}" value="${e.atThreshold}"></span>
      <select data-scenario-clock="eff-action" data-ck="${c.id}" data-eff="${e.id}">${actOpts}</select>
      <select data-scenario-clock="eff-target" data-ck="${c.id}" data-eff="${e.id}"><option value="">— cible —</option>${targetOpts}</select>
      <button type="button" class="scenario-clock-del" data-scenario-clock="eff-delete" data-ck="${c.id}" data-eff="${e.id}" aria-label="Supprimer l'effet">✕</button>
    </div>`;
  },

  _onClockControl(el) {
    const k = el.dataset.scenarioClock, ck = el.dataset.ck, eff = el.dataset.eff;
    const scId = this._scenarioId;
    if (k === "add") { this._apply(() => ScenarioStore.addClock(scId, { title: "" })); this._renderPressure(); }
    else if (k === "delete") { this._apply(() => ScenarioStore.removeClock(scId, ck)); this._renderPressure(); this._project(); }
    else if (k === "add-effect") { this._apply(() => ScenarioStore.addClockEffect(scId, ck, {})); this._renderPressure(); }
    else if (k === "eff-delete") { this._apply(() => ScenarioStore.removeClockEffect(scId, ck, eff)); this._renderPressure(); this._project(); }
  },
  _onClockInput(el, isChange) {
    const k = el.dataset.scenarioClock, ck = el.dataset.ck, eff = el.dataset.eff;
    const scId = this._scenarioId;
    if (k === "title") this._apply(() => ScenarioStore.updateClock(scId, ck, { title: el.value }));
    else if (k === "type" && isChange) { this._apply(() => ScenarioStore.updateClock(scId, ck, { type: el.value })); this._renderPressure(); }
    else if (k === "segments" && isChange) { this._apply(() => ScenarioStore.updateClock(scId, ck, { segments: el.value })); this._renderPressure(); }
    else if (k === "eff-threshold") this._apply(() => ScenarioStore.updateClockEffect(scId, ck, eff, { atThreshold: el.value }));
    else if (k === "eff-action" && isChange) { this._apply(() => ScenarioStore.updateClockEffect(scId, ck, eff, { action: el.value, targetId: null })); this._renderPressure(); this._project(); }
    else if (k === "eff-target" && isChange) { this._apply(() => ScenarioStore.updateClockEffect(scId, ck, eff, { targetId: el.value || null })); this._project(); }
  },

  /* ---- Dispatch moteur : le canvas mêle scènes et faits ; on désambiguïse par
     lookup d'id (le moteur reste bête). Une arête d'indice a l'id `clueId:sceneId`. ---- */
  _isInfo(id) {
    const sc = ScenarioStore.get(this._scenarioId);
    return !!(sc && sc.infoNodes.some((n) => n.id === id));
  },
  _onNodeMoved(id, x, y) {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    if (this._isInfo(id)) this._apply(() => ScenarioStore.updateInfoNode(sc.id, id, { x, y }));
    else this._apply(() => ScenarioStore.updateSceneNode(sc.id, id, { x, y }));
  },
  _onNodeTap(id) {
    if (this._isInfo(id)) this._selectInfo(id);
    else this._selectNode(id);
  },
  _onEdgeTap(id) {
    if (typeof id === "string" && id.includes(":")) this._selectClue(id.split(":")[0]);
    else this._selectEdge(id);
  },
  /** Tissage : scène↔fait crée un INDICE (ancre) ; scène↔scène une transition ;
      fait↔fait est ignoré (les faits ne se lient pas entre eux dans le modèle). */
  _onWeave(a, b) {
    if (a === b) return;
    const ai = this._isInfo(a), bi = this._isInfo(b);
    if (ai && bi) return;
    if (!ai && !bi) return this._createEdge(a, b);
    // Un bout est un fait : l'autre (scène) devient l'ancre de l'indice.
    const infoId = ai ? a : b;
    const sceneId = ai ? b : a;
    this._createClue(infoId, sceneId);
  },

  _edgeLabel(e) {
    const parts = [];
    if (e.label) parts.push(e.label);
    if (e.gateway === "parallel") parts.push("∥");
    else if (e.gateway === "exclusive") parts.push("⋔");
    if (e.isEscapeHatch && !e.label) parts.push("échec");
    return parts.join(" ");
  },
  _edgeLabelById(id) {
    const sc = ScenarioStore.get(this._scenarioId);
    const e = sc && sc.sceneEdges.find((x) => x.id === id);
    return e ? this._edgeLabel(e) : "";
  },

  /* ============================================================
     BIBLIOTHÈQUE — choisir / créer / renommer / supprimer une trame.
     ============================================================ */
  _renderLibrary() {
    const overlay = this._el;
    if (!overlay) return;
    const sel = overlay.querySelector('[data-scenario-action="pick"]');
    const list = ScenarioStore.all();
    if (sel) {
      sel.innerHTML = list.length
        ? list.map((s) => `<option value="${s.id}"${s.id === this._scenarioId ? " selected" : ""}>${Utils.escHtml(s.title)}</option>`).join("")
        : `<option value="">— aucune trame —</option>`;
    }
    const has = !!(this._scenarioId && ScenarioStore.get(this._scenarioId));
    overlay
      .querySelectorAll('[data-scenario-action="rename"], [data-scenario-action="delete"], [data-scenario-action="save-template"], [data-scenario-action="toggle-weave"], [data-scenario-action="toggle-clues"], [data-scenario-action="toggle-pressure"], [data-scenario-action="toggle-timeline"], [data-scenario-action="robustesse"]')
      .forEach((b) => { b.disabled = !has; });
    this._renderToolbar(has);
    this._reflectWeave();
    this._reflectClues();
    this._reflectPressure();
    this._reflectTimeline();
  },

  _renderToolbar(has) {
    const tb = this._el && this._el.querySelector('[data-scenario="toolbar"]');
    if (!tb) return;
    tb.hidden = !has;
    if (!has) { tb.innerHTML = ""; return; }
    const types = `<span class="scenario-tb-label">Ajouter une étape :</span>` +
      this._TYPES.map((t) => `<button type="button" class="scenario-type-btn" data-scenario-action="add-node" data-type="${t.key}" title="Ajouter : ${t.label}"><span class="scenario-type-glyph">${t.glyph}</span> ${t.label}</button>`).join("");
    // Calque d'indices actif : offrir l'ajout d'un FAIT (S4).
    const info = this._showClues
      ? `<button type="button" class="scenario-type-btn scenario-info-btn" data-scenario-action="add-info" title="Ajouter un fait (caché) à l'enquête"><span class="scenario-type-glyph">◆</span> Fait</button>`
      : "";
    tb.innerHTML = types + info;
  },

  _newScenario() {
    Dialog.prompt({
      title: "Nouvelle trame",
      label: "Titre de la trame",
      placeholder: "ex. Extraction en zone rouge",
      confirmLabel: "Créer",
    }).then((name) => {
      const clean = (name || "").trim();
      if (!clean) return;
      const sys = (typeof App !== "undefined" && App.edition) || null;
      const sc = this._apply(() => ScenarioStore.create({ title: clean, system: sys }));
      if (!sc) return;
      this._scenarioId = sc.id;
      this._selNode = this._selEdge = this._selInfo = this._selClue = null;
      this._renderLibrary();
      this._project();
      if (typeof toast === "function") toast(`Trame « ${sc.title} » créée.`);
    });
  },

  /** S3 — instancie une trame depuis un squelette (ScenarioTemplates). Choisir le
      modèle → nommer → POSER : create(templateOrigin) puis les beats en nœuds et
      les liens en arêtes, en une seule passe muette (`_apply`) pour ne pas se
      remonter sous les doigts. La disposition (flux vertical en zig-zag) est
      assignée ici : c'est un détail de vue, pas de la donnée du modèle. */
  _newFromTemplate() {
    const templates = ScenarioTemplates.all();
    const opts = templates.map((t) => ({
      value: t.id || t.key,
      label: `${ScenarioTemplates.isUser(t) ? "★ " : ""}${t.label} — ${t.desc}`,
    }));
    if (templates.some((t) => ScenarioTemplates.isUser(t)))
      opts.push({ value: "__manage__", label: "⚙ Gérer mes modèles…" });
    Dialog.choose({
      title: "Nouvelle trame depuis un modèle",
      message: "Un squelette pré-typé, à arranger et enrichir ensuite. (★ = vos modèles.)",
      options: opts,
    }).then((key) => {
      if (key === "__manage__") return this._manageTemplates();
      const tpl = key && ScenarioTemplates.get(key);
      if (!tpl) return;
      return Dialog.prompt({
        title: "Nouvelle trame",
        label: "Titre de la trame",
        value: tpl.label,
        confirmLabel: "Créer",
      }).then((name) => {
        const clean = (name || "").trim();
        if (!clean) return;
        const sys = (typeof App !== "undefined" && App.edition) || null;
        const sc = this._apply(() => this._seedFromTemplate(clean, sys, tpl));
        if (!sc) return;
        this._scenarioId = sc.id;
        this._selNode = this._selEdge = this._selInfo = this._selClue = null;
        this._renderLibrary();
        this._project();
        if (sc.sceneNodes[0]) this._selectNode(sc.sceneNodes[0].id);
        if (typeof toast === "function") toast(`Trame « ${sc.title} » créée depuis « ${tpl.label} ».`);
      });
    });
  },

  /** Pose effective d'un modèle (create + nœuds + arêtes). Renvoie le scénario
      créé, ou null. Les liens du modèle référencent les beats par INDEX ; on les
      résout via la table index→id des nœuds fraîchement posés. */
  _seedFromTemplate(title, system, tpl) {
    const sc = ScenarioStore.create({ title, system, templateOrigin: tpl.key || tpl.id });
    if (!sc) return null;
    const ids = tpl.beats.map((b, i) => {
      const node = ScenarioStore.addSceneNode(sc.id, {
        type: b.type,
        title: b.title,
        body: b.body || "",
        templateBeat: b.beat,
        // Modèle user : positions arrangées reportées ; intégré : flux zig-zag.
        x: Number.isFinite(b.x) ? b.x : 140 + (i % 2) * 200,
        y: Number.isFinite(b.y) ? b.y : 80 + i * 90,
      });
      return node ? node.id : null;
    });
    for (const l of tpl.links || []) {
      const from = ids[l.from], to = ids[l.to];
      if (!from || !to) continue;
      ScenarioStore.addSceneEdge(sc.id, {
        from, to,
        kind: l.kind || "libre",
        gateway: l.gateway || null,
        isEscapeHatch: !!l.isEscapeHatch,
        label: l.label || "",
      });
    }
    return sc;
  },

  /* ---- S3b — modèles utilisateur : extraire / enregistrer / gérer ---- */
  /** Squelette d'une trame → forme de modèle (beats + links par index). N'emporte
      QUE la structure (étapes + transitions, positions comprises) : pas les faits,
      indices ni cast — un modèle est un squelette, comme les 3 intégrés. */
  _extractTemplate(sc) {
    const idxOf = new Map(sc.sceneNodes.map((n, i) => [n.id, i]));
    const beats = sc.sceneNodes.map((n, i) => ({
      beat: n.templateBeat || "b" + i,
      type: n.type, title: n.title || "", body: n.body || "",
      x: n.x, y: n.y,
    }));
    const links = sc.sceneEdges
      .filter((e) => idxOf.has(e.from) && idxOf.has(e.to))
      .map((e) => ({
        from: idxOf.get(e.from), to: idxOf.get(e.to),
        kind: e.kind || "libre", gateway: e.gateway || null,
        isEscapeHatch: !!e.isEscapeHatch, label: e.label || "",
      }));
    return { beats, links };
  },
  _saveAsTemplate() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    if (!sc.sceneNodes.length) {
      if (typeof toast === "function") toast("Cette trame n'a aucune étape à modéliser.");
      return;
    }
    Dialog.prompt({ title: "Enregistrer comme modèle", label: "Nom du modèle", value: sc.title, confirmLabel: "Enregistrer" })
      .then((name) => {
        const label = (name || "").trim();
        if (!label) return;
        const { beats, links } = this._extractTemplate(sc);
        const tpl = ScenarioTemplates.saveUser({ label, desc: `${beats.length} étapes, depuis « ${sc.title} »`, beats, links });
        if (tpl && typeof toast === "function") toast(`Modèle « ${label} » enregistré — dispo dans ＋ Depuis un modèle.`);
      });
  },
  /** Gestion des modèles user : choisir → renommer ou supprimer. */
  _manageTemplates() {
    const users = ScenarioTemplates.all().filter((t) => ScenarioTemplates.isUser(t));
    if (!users.length) return;
    Dialog.choose({
      title: "Mes modèles",
      message: "Choisir un modèle à renommer ou supprimer.",
      options: users.map((t) => ({ value: t.id, label: t.label })),
    }).then((id) => {
      const t = id && ScenarioTemplates.get(id);
      if (!t) return;
      Dialog.choose({
        title: t.label,
        options: [
          { value: "rename", label: "Renommer" },
          { value: "delete", label: "Supprimer", danger: true },
        ],
      }).then((act) => {
        if (act === "rename") {
          Dialog.prompt({ title: "Renommer le modèle", value: t.label, confirmLabel: "Renommer" }).then((n) => {
            const clean = (n || "").trim();
            if (clean && ScenarioTemplates.renameUser(id, clean) && typeof toast === "function") toast("Modèle renommé.");
          });
        } else if (act === "delete") {
          Dialog.confirm({ title: "Supprimer le modèle", message: `Supprimer « ${t.label} » ? Les trames déjà créées ne sont pas touchées.`, danger: true, confirmLabel: "Supprimer" })
            .then((ok) => { if (ok && ScenarioTemplates.removeUser(id) && typeof toast === "function") toast("Modèle supprimé."); });
        }
      });
    });
  },

  _renameScenario() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    Dialog.prompt({ title: "Renommer la trame", label: "Titre", value: sc.title, confirmLabel: "Renommer" })
      .then((name) => {
        const clean = (name || "").trim();
        if (!clean) return;
        this._apply(() => ScenarioStore.rename(sc.id, clean));
        this._renderLibrary();
      });
  },

  _deleteScenario() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    Dialog.confirm({
      title: "Supprimer la trame",
      message: `Supprimer « ${sc.title} » et toutes ses scènes ? Définitif.`,
      danger: true,
      confirmLabel: "Supprimer",
    }).then((ok) => {
      if (!ok) return;
      this._apply(() => ScenarioStore.remove(sc.id));
      const list = ScenarioStore.all();
      this._scenarioId = list.length ? list[list.length - 1].id : null;
      this._selNode = this._selEdge = this._selInfo = this._selClue = null;
      this._renderLibrary();
      this._project();
    });
  },

  /* ============================================================
     SCÈNES — ajout, sélection, édition, suppression.
     ============================================================ */
  _addNode(type) {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    // Position de spawn : centre du canvas courant (même repère que le moteur) +
    // léger décalage pour ne pas empiler.
    const host = this._el.querySelector('[data-scenario="canvas"]');
    const W = Math.max(320, (host && host.clientWidth) || 640);
    const H = Math.max(240, (host && host.clientHeight) || 460);
    const x = W / 2 + (Math.random() - 0.5) * 90;
    const y = H / 2 + (Math.random() - 0.5) * 90;
    const node = this._apply(() => ScenarioStore.addSceneNode(sc.id, { type, x, y }));
    this._project(); // remontage stable (positions auteur)
    if (node) this._selectNode(node.id);
  },

  _selectNode(id) {
    GraphEngine.select(id);
    this._pressureOpen = this._timelineOpen = false;
    this._selNode = id;
    this._selEdge = null;
    const sc = ScenarioStore.get(this._scenarioId);
    const n = sc && sc.sceneNodes.find((x) => x.id === id);
    const panel = this._el.querySelector('[data-scenario="inspector"]');
    if (!n || !panel) return;
    panel.classList.remove("empty");
    panel.innerHTML = this._nodeInspectorHtml(n);
  },

  _nodeInspectorHtml(n) {
    const esc = Utils.escHtml;
    const typeOpts = this._TYPES
      .map((t) => `<option value="${t.key}"${t.key === n.type ? " selected" : ""}>${t.glyph} ${t.label}</option>`)
      .join("");
    const curArrow = n.arrow || "";
    const arrowBtns = this._ARROWS
      .map((a) => `<button type="button" class="graph-dir-btn${curArrow === a.key ? " active" : ""}" data-scenario-node="arrow" data-arrow="${a.key}" title="${a.label}" aria-pressed="${curArrow === a.key}">${a.glyph} ${a.label}</button>`)
      .join("");
    return `<div class="scenario-inspector">
      <div class="scenario-insp-head">Étape</div>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Type</span>
        <select data-scenario-node="type">${typeOpts}</select>
      </label>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Titre</span>
        <input type="text" data-scenario-node="title" value="${esc(n.title || "")}" placeholder="ex. Le rendez-vous avec le Johnson" maxlength="80">
      </label>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Description (MJ)</span>
        <textarea data-scenario-node="body" rows="5" placeholder="Ce qui se joue dans cette scène…">${esc(n.body || "")}</textarea>
      </label>
      <div class="graph-edge-field">
        <span class="graph-edge-flabel">Casting</span>
        <div class="scenario-cast-list">${this._castChipsHtml(n)}<button type="button" class="scenario-cast-add" data-scenario-node="cast">＋ Caster</button></div>
        ${(n.castIds || []).length >= 2 ? `<button type="button" class="scenario-cast-link" data-scenario-node="cast-link" title="Créer les liens manquants entre ces personnages sur la carte des Liens">◈ Relier entre eux</button>` : ""}
      </div>
      <div class="graph-edge-field">
        <span class="graph-edge-flabel">Beat dramatique</span>
        <div class="graph-dir-row">${arrowBtns}</div>
        <textarea data-scenario-node="bang" rows="2" placeholder="Le bang : le choix forcé qui met les persos au pied du mur">${esc(n.bang || "")}</textarea>
      </div>
      <button type="button" class="graph-edge-delete" data-scenario-node="delete">Supprimer cette étape</button>
    </div>`;
  },

  /** Puces du cast d'une étape (par RÉFÉRENCE : nom résolu via PnjLookup), chacune
      retirable. Cast = ids d'entités (`castIds`), distinct des convokes du dossier. */
  _castChipsHtml(n) {
    const esc = Utils.escHtml;
    return (n.castIds || [])
      .map((cid) => {
        const loc = typeof PnjLookup !== "undefined" ? PnjLookup.locate(cid) : null;
        const name = loc ? loc.name : "(entité supprimée)";
        return `<span class="scenario-cast-chip">${esc(name)}<button type="button" class="scenario-cast-x" data-scenario-node="cast-remove" data-cid="${esc(cid)}" aria-label="Retirer ${esc(name)}">✕</button></span>`;
      })
      .join("");
  },
  _openCastPicker(trigger) {
    if (this._selNode && typeof ScenarioCastPicker !== "undefined")
      ScenarioCastPicker.open(this._scenarioId, this._selNode, trigger);
  },
  _removeCast(cid) {
    const sc = ScenarioStore.get(this._scenarioId);
    const node = sc && sc.sceneNodes.find((n) => n.id === this._selNode);
    if (!node || !cid) return;
    const cur = (node.castIds || []).filter((x) => x !== cid);
    this._apply(() => ScenarioStore.updateSceneNode(sc.id, node.id, { castIds: cur }));
    this._selectNode(this._selNode); // re-render des puces
  },

  _onNodeControl(el) {
    const k = el.dataset.scenarioNode;
    if (k === "delete") this._deleteNode();
    else if (k === "cast") this._openCastPicker(el);
    else if (k === "cast-remove") this._removeCast(el.dataset.cid);
    else if (k === "cast-link") this._linkCast();
    else if (k === "arrow") {
      this._apply(() => ScenarioStore.updateSceneNode(this._scenarioId, this._selNode, { arrow: el.dataset.arrow || null }));
      this._project(); // re-teinte le disque + repose la sélection (bouton actif)
    }
  },

  /** S2c — propagation OPTIONNELLE « le schéma modifie des relations » : offre de
      créer les liens manquants entre les co-castés d'une étape sur la carte des
      Liens (RelationsStore, sa vérité). Une OFFRE explicite (confirmation), jamais
      automatique — on RÉFÉRENCE les entités, on ne fusionne pas les vérités (Kernel).
      Générique (`type:"relation"`, comme le tissage de GraphView) : éditable ensuite. */
  _linkCast() {
    const sc = ScenarioStore.get(this._scenarioId);
    const node = sc && sc.sceneNodes.find((n) => n.id === this._selNode);
    if (!node || typeof RelationsStore === "undefined") return;
    const ids = (node.castIds || []).slice();
    if (ids.length < 2) return;
    Dialog.confirm({
      title: "Relier le casting",
      message: `Créer les liens manquants entre les ${ids.length} personnages de cette étape ? (relations génériques, éditables sur la carte des Liens.)`,
      confirmLabel: "Relier",
    }).then((ok) => {
      if (!ok) return;
      let created = 0;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i], b = ids[j];
          const exists =
            RelationsStore.edgesWhere({ from: a, to: b, type: "relation" }).length ||
            RelationsStore.edgesWhere({ from: b, to: a, type: "relation" }).length;
          if (!exists) {
            RelationsStore.upsert({ from: a, to: b, type: "relation" });
            created++;
          }
        }
      }
      if (typeof toast === "function")
        toast(created ? `${created} lien${created > 1 ? "s" : ""} créé${created > 1 ? "s" : ""} sur la carte des Liens.` : "Ces personnages sont déjà tous reliés.");
    });
  },
  _onNodeInput(el, isChange) {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selNode) return;
    const k = el.dataset.scenarioNode;
    if (k === "title") this._apply(() => ScenarioStore.updateSceneNode(sc.id, this._selNode, { title: el.value }));
    else if (k === "body") this._apply(() => ScenarioStore.updateSceneNode(sc.id, this._selNode, { body: el.value }));
    else if (k === "bang") this._apply(() => ScenarioStore.updateSceneNode(sc.id, this._selNode, { bang: el.value }));
    else if (k === "type" && isChange) {
      this._apply(() => ScenarioStore.updateSceneNode(sc.id, this._selNode, { type: el.value }));
      this._project(); // le glyphe change → remontage (discret, hors frappe)
      this._selectNode(this._selNode);
    }
  },
  _deleteNode() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selNode) return;
    this._apply(() => ScenarioStore.removeSceneNode(sc.id, this._selNode));
    this._selNode = null;
    this._project();
    this._clearInspector();
  },

  /* ============================================================
     ARÊTES — tissage, sélection, réglage, suppression.
     ============================================================ */
  _createEdge(from, to) {
    if (!from || !to || from === to) return;
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    const exists = sc.sceneEdges.some((e) => e.from === from && e.to === to);
    const edge = exists ? null : this._apply(() => ScenarioStore.addSceneEdge(sc.id, { from, to, kind: "libre" }));
    this._project();
    if (edge) this._selectEdge(edge.id); // nommer/régler la transition dans la foulée
  },

  _selectEdge(id) {
    GraphEngine.selectEdge(id);
    this._pressureOpen = this._timelineOpen = false;
    this._selEdge = id;
    this._selNode = null;
    const sc = ScenarioStore.get(this._scenarioId);
    const e = sc && sc.sceneEdges.find((x) => x.id === id);
    const panel = this._el.querySelector('[data-scenario="inspector"]');
    if (!e || !panel) return;
    panel.classList.remove("empty");
    panel.innerHTML = this._edgeInspectorHtml(e);
  },

  _edgeInspectorHtml(e) {
    const esc = Utils.escHtml;
    const kindOpts = this._KINDS
      .map((k) => `<option value="${k.key}"${(e.kind || "libre") === k.key ? " selected" : ""}>${k.label}</option>`)
      .join("");
    const gw = e.gateway || "";
    const gwBtn = (val, glyph, title) =>
      `<button type="button" class="graph-dir-btn${gw === val ? " active" : ""}" data-scenario-edge="gateway" data-gw="${val}" title="${title}" aria-pressed="${gw === val}">${glyph}</button>`;
    return `<div class="scenario-inspector">
      <div class="scenario-insp-head">Transition</div>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Type de lien</span>
        <select data-scenario-edge="kind">${kindOpts}</select>
      </label>
      <div class="graph-edge-field">
        <span class="graph-edge-flabel">Embranchement</span>
        <div class="graph-dir-row">
          ${gwBtn("", "—", "Aucun")}
          ${gwBtn("exclusive", "⋔", "Exclusif : le joueur choisit A ou B")}
          ${gwBtn("parallel", "∥", "Parallèle : A et B se déroulent ensemble")}
        </div>
      </div>
      <label class="graph-edge-field graph-edge-check">
        <input type="checkbox" data-scenario-edge="hatch"${e.isEscapeHatch ? " checked" : ""}>
        <span>Sortie de secours (échec)</span>
      </label>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Condition / mot sur le trait</span>
        <input type="text" data-scenario-edge="label" value="${esc(e.label || "")}" placeholder="ex. si l'infiltration échoue" maxlength="60">
      </label>
      <button type="button" class="graph-edge-delete" data-scenario-edge="delete">Supprimer ce lien</button>
    </div>`;
  },

  _setEdge(patch) {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selEdge) return;
    this._apply(() => ScenarioStore.updateSceneEdge(sc.id, this._selEdge, patch));
  },
  _onEdgeControl(el) {
    const k = el.dataset.scenarioEdge;
    if (k === "gateway") { this._setEdge({ gateway: el.dataset.gw || null }); this._reflectEdgeInspector(); GraphEngine.updateEdgeStyle(this._selEdge, { label: this._edgeLabelById(this._selEdge) }); }
    else if (k === "delete") this._deleteEdge();
  },
  _onEdgeInput(el, isChange) {
    const k = el.dataset.scenarioEdge;
    if (k === "kind" && isChange) this._setEdge({ kind: el.value });
    else if (k === "hatch") {
      this._setEdge({ isEscapeHatch: el.checked });
      GraphEngine.updateEdgeStyle(this._selEdge, { dashed: el.checked, color: el.checked ? this._HATCH : null, label: this._edgeLabelById(this._selEdge) });
    } else if (k === "label") {
      this._setEdge({ label: el.value });
      GraphEngine.updateEdgeStyle(this._selEdge, { label: this._edgeLabelById(this._selEdge) });
    }
  },
  /** Reflète les boutons d'embranchement sans reconstruire (préserve le champ). */
  _reflectEdgeInspector() {
    const sc = ScenarioStore.get(this._scenarioId);
    const e = sc && sc.sceneEdges.find((x) => x.id === this._selEdge);
    const panel = this._el && this._el.querySelector('[data-scenario="inspector"]');
    if (!e || !panel) return;
    panel.querySelectorAll('[data-scenario-edge="gateway"]').forEach((b) => {
      const on = (e.gateway || "") === (b.dataset.gw || "");
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  },
  _deleteEdge() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selEdge) return;
    this._apply(() => ScenarioStore.removeSceneEdge(sc.id, this._selEdge));
    this._selEdge = null;
    this._project();
    this._clearInspector();
  },

  /* ============================================================
     FAITS & INDICES (S4) — le calque d'enquête superposé aux scènes.
     ============================================================ */
  _addInfo() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    const host = this._el.querySelector('[data-scenario="canvas"]');
    const W = Math.max(320, (host && host.clientWidth) || 640);
    const H = Math.max(240, (host && host.clientHeight) || 460);
    const x = W / 2 + (Math.random() - 0.5) * 90;
    const y = H / 2 + (Math.random() - 0.5) * 90;
    const f = this._apply(() => ScenarioStore.addInfoNode(sc.id, { role: "enrichissement", x, y }));
    this._project();
    if (f) this._selectInfo(f.id);
  },

  _selectInfo(id) {
    GraphEngine.select(id);
    this._pressureOpen = this._timelineOpen = false;
    this._selNode = this._selEdge = this._selClue = null;
    this._selInfo = id;
    const sc = ScenarioStore.get(this._scenarioId);
    const f = sc && sc.infoNodes.find((n) => n.id === id);
    const panel = this._el.querySelector('[data-scenario="inspector"]');
    if (!f || !panel) return;
    panel.classList.remove("empty");
    panel.innerHTML = this._infoInspectorHtml(f);
  },

  _infoInspectorHtml(f) {
    const esc = Utils.escHtml;
    const roleBtn = (val, label, title) =>
      `<button type="button" class="graph-dir-btn${(f.role || "enrichissement") === val ? " active" : ""}" data-scenario-info="role" data-role="${val}" title="${title}" aria-pressed="${(f.role || "enrichissement") === val}">${this._INFO_GLYPH[val]} ${label}</button>`;
    const clues = (ScenarioStore.get(this._scenarioId).clues || []).filter((c) => c.toInfoNode === f.id);
    return `<div class="scenario-inspector">
      <div class="scenario-insp-head">Fait <span class="scenario-info-mark">${this._INFO_GLYPH[f.role] || "◇"}</span></div>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Le fait (caché)</span>
        <textarea data-scenario-info="fact" rows="3" placeholder="ex. le commanditaire cache sa véritable identité">${esc(f.fact || "")}</textarea>
      </label>
      <div class="graph-edge-field">
        <span class="graph-edge-flabel">Rôle dans l'enquête</span>
        <div class="graph-dir-row">
          ${roleBtn("progression", "Progression", "Progression : le fil ne peut avancer sans lui (révélation garantie, GUMSHOE)")}
          ${roleBtn("enrichissement", "Enrichissement", "Enrichissement : de la couleur (règle des 3 indices)")}
        </div>
      </div>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Rang temporel (passé reconstruit)</span>
        <input type="number" data-scenario-info="when" value="${f.when != null ? f.when : ""}" placeholder="optionnel — ex. 1, 2, 3…">
      </label>
      <div class="graph-edge-field">
        <span class="graph-edge-flabel">Indices vers ce fait (${clues.length})</span>
        <p class="graph-hint scenario-clue-hint">Tirez d'une <strong>scène</strong> vers ce fait (◈ Relier) pour l'ancrer, ou ajoutez un indice flottant :</p>
        <button type="button" class="scenario-cast-add" data-scenario-info="add-clue">＋ Indice flottant</button>
      </div>
      <button type="button" class="graph-edge-delete" data-scenario-info="delete">Supprimer ce fait</button>
    </div>`;
  },

  _onInfoControl(el) {
    const k = el.dataset.scenarioInfo;
    if (k === "delete") this._deleteInfo();
    else if (k === "add-clue") this._addFloatingClue();
    else if (k === "role") {
      this._apply(() => ScenarioStore.updateInfoNode(this._scenarioId, this._selInfo, { role: el.dataset.role }));
      this._project(); // le glyphe change → remontage discret
      this._selectInfo(this._selInfo);
    }
  },
  _onInfoInput(el) {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selInfo) return;
    const k = el.dataset.scenarioInfo;
    if (k === "fact") this._apply(() => ScenarioStore.updateInfoNode(sc.id, this._selInfo, { fact: el.value }));
    else if (k === "when") {
      const v = el.value === "" ? null : parseInt(el.value, 10);
      this._apply(() => ScenarioStore.updateInfoNode(sc.id, this._selInfo, { when: Number.isFinite(v) ? v : null }));
    }
  },
  _deleteInfo() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selInfo) return;
    this._apply(() => ScenarioStore.removeInfoNode(sc.id, this._selInfo));
    this._selInfo = null;
    this._project();
    this._clearInspector();
  },

  /** Indice ANCRÉ : tissé d'une scène vers un fait. Refuse le doublon (même
      scène déjà ancrée à un indice de ce fait). */
  _createClue(infoId, sceneId) {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc) return;
    const dup = sc.clues.some((c) => c.toInfoNode === infoId && (c.anchorSceneNodes || []).includes(sceneId));
    const clue = dup ? null : this._apply(() => ScenarioStore.addClue(sc.id, { toInfoNode: infoId, anchorSceneNodes: [sceneId] }));
    this._project();
    if (clue) this._selectClue(clue.id);
  },
  /** Indice FLOTTANT (Sly Flourish) : sans ancre, révélable n'importe où / via un
      contact — créé depuis l'inspecteur du fait. */
  _addFloatingClue() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selInfo) return;
    const clue = this._apply(() => ScenarioStore.addClue(sc.id, { toInfoNode: this._selInfo }));
    this._project();
    if (clue) this._selectClue(clue.id);
  },

  _selectClue(id) {
    this._pressureOpen = this._timelineOpen = false;
    this._selNode = this._selEdge = this._selInfo = null;
    this._selClue = id;
    GraphEngine.select(null);
    GraphEngine.selectEdge(null);
    const sc = ScenarioStore.get(this._scenarioId);
    const c = sc && sc.clues.find((x) => x.id === id);
    const panel = this._el.querySelector('[data-scenario="inspector"]');
    if (!c || !panel) return;
    panel.classList.remove("empty");
    panel.innerHTML = this._clueInspectorHtml(c, sc);
  },

  _clueInspectorHtml(c, sc) {
    const esc = Utils.escHtml;
    const fact = sc.infoNodes.find((n) => n.id === c.toInfoNode);
    const anchors = (c.anchorSceneNodes || [])
      .map((sid) => {
        const s = sc.sceneNodes.find((n) => n.id === sid);
        const name = s ? (s.title || "(sans titre)") : "(scène supprimée)";
        return `<span class="scenario-cast-chip">${esc(name)}<button type="button" class="scenario-cast-x" data-scenario-clue="anchor-remove" data-sid="${esc(sid)}" aria-label="Détacher ${esc(name)}">✕</button></span>`;
      })
      .join("");
    const anchorLabel = (c.anchorSceneNodes || []).length ? anchors : `<span class="scenario-clue-floating">Flottant (aucune ancre) — révélable n'importe où / via un contact.</span>`;
    return `<div class="scenario-inspector">
      <div class="scenario-insp-head">Indice → <span class="scenario-info-mark">${this._INFO_GLYPH[fact && fact.role] || "◇"}</span> ${esc((fact && fact.fact) || "(fait)").slice(0, 40)}</div>
      <label class="graph-edge-field">
        <span class="graph-edge-flabel">Description (ce que la table trouve)</span>
        <textarea data-scenario-clue="description" rows="3" placeholder="ex. un indice matériel laissé sur les lieux">${esc(c.description || "")}</textarea>
      </label>
      <div class="graph-edge-field">
        <span class="graph-edge-flabel">Ancres (scènes)</span>
        <div class="scenario-cast-list">${anchorLabel}</div>
      </div>
      <label class="graph-edge-field graph-edge-check">
        <input type="checkbox" data-scenario-clue="gated"${c.gated ? " checked" : ""}>
        <span>Révélation derrière un jet / une condition</span>
      </label>
      <button type="button" class="graph-edge-delete" data-scenario-clue="delete">Supprimer cet indice</button>
    </div>`;
  },

  _onClueControl(el) {
    const k = el.dataset.scenarioClue;
    if (k === "delete") this._deleteClue();
    else if (k === "anchor-remove") this._removeAnchor(el.dataset.sid);
  },
  _onClueInput(el, isChange) {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selClue) return;
    const k = el.dataset.scenarioClue;
    if (k === "description") this._apply(() => ScenarioStore.updateClue(sc.id, this._selClue, { description: el.value }));
    else if (k === "gated" && isChange) {
      this._apply(() => ScenarioStore.updateClue(sc.id, this._selClue, { gated: el.checked }));
      this._project(); // l'étiquette « jet » de l'arête suit
      this._selectClue(this._selClue);
    }
  },
  _removeAnchor(sid) {
    const sc = ScenarioStore.get(this._scenarioId);
    const c = sc && sc.clues.find((x) => x.id === this._selClue);
    if (!c || !sid) return;
    const cur = (c.anchorSceneNodes || []).filter((x) => x !== sid);
    this._apply(() => ScenarioStore.updateClue(sc.id, c.id, { anchorSceneNodes: cur }));
    this._project();
    this._selectClue(this._selClue);
  },
  _deleteClue() {
    const sc = ScenarioStore.get(this._scenarioId);
    if (!sc || !this._selClue) return;
    this._apply(() => ScenarioStore.removeClue(sc.id, this._selClue));
    this._selClue = null;
    this._project();
    this._clearInspector();
  },

  /* ---- Inspecteur : invite quand rien n'est sélectionné. ---- */
  _clearInspector() {
    this._pressureOpen = this._timelineOpen = false;
    this._selNode = this._selEdge = this._selInfo = this._selClue = null;
    const panel = this._el && this._el.querySelector('[data-scenario="inspector"]');
    if (!panel) return;
    panel.classList.add("empty");
    const sc = ScenarioStore.get(this._scenarioId);
    const hasNodes = sc && sc.sceneNodes.length;
    const cluesHint = this._showClues
      ? "<br><strong>◇ Indices</strong> actif : ajoutez un <strong>＋ Fait</strong>, tirez d'une scène vers un fait pour l'ancrer."
      : "";
    panel.innerHTML = `<p class="graph-hint">${
      hasNodes
        ? "Touchez une étape pour l'éditer, un lien pour le régler.<br>Glissez pour arranger · <strong>◈ Relier</strong> pour tisser une transition." + cluesHint
        : "Ajoutez une étape avec la barre du haut pour commencer votre trame."
    }</p>`;
  },

  _reflectWeave() {
    const b = this._el && this._el.querySelector('[data-scenario-action="toggle-weave"]');
    if (!b) return;
    b.setAttribute("aria-pressed", String(this._weave));
    b.classList.toggle("active", this._weave);
  },
  _reflectClues() {
    const b = this._el && this._el.querySelector('[data-scenario-action="toggle-clues"]');
    if (!b) return;
    b.setAttribute("aria-pressed", String(this._showClues));
    b.classList.toggle("active", this._showClues);
  },

  /* ============================================================
     COQUILLE — .modal-overlay + délégation `data-scenario-*` (0 onclick).
     ============================================================ */
  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay graph-overlay scenario-overlay";
    overlay.id = "scenario-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal graph-modal scenario-modal">
        <div class="modal-header scenario-header">
          <span class="modal-title">Trames</span>
          <select class="scenario-picker" data-scenario-action="pick" aria-label="Choisir une trame"></select>
          <button class="btn-small" data-scenario-action="new">＋ Nouvelle trame</button>
          <button class="btn-small" data-scenario-action="new-from-template" title="Partir d'un squelette narratif (5 salles, Story Spine, Story Circle)">＋ Depuis un modèle</button>
          <button class="btn-small" data-scenario-action="rename">Renommer</button>
          <button class="btn-small" data-scenario-action="save-template" title="Enregistrer la structure de cette trame comme modèle réutilisable">⎘ Modèle</button>
          <button class="btn-small" data-scenario-action="delete">Supprimer</button>
          <button class="graph-weave-toggle" data-scenario-action="toggle-weave" aria-pressed="false" title="Relier deux étapes : tirer de l'une à l'autre">◈ Relier</button>
          <button class="graph-weave-toggle" data-scenario-action="toggle-clues" aria-pressed="false" title="Superposer le calque d'indices : faits (◆/◇) et pistes qui y mènent">◇ Indices</button>
          <button class="graph-weave-toggle" data-scenario-action="toggle-pressure" aria-pressed="false" title="Pression : définir des horloges (menace/alerte/objectif) et leurs effets au seuil">⏱ Pression</button>
          <button class="graph-weave-toggle" data-scenario-action="toggle-timeline" aria-pressed="false" title="Chronologie : le passé reconstruit (faits par rang) vs le futur qui avance (horloges/fronts)">🕰 Chronologie</button>
          <button class="scenario-robust-badge" data-scenario-action="robustesse" title="Vérifier la robustesse de l'enquête (3 indices, sortie de secours, atteignabilité…)">✓ Robustesse</button>
          <button class="modal-close" data-scenario-action="close" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body graph-body">
          <div class="scenario-toolbar" data-scenario="toolbar" hidden></div>
          <div class="graph-split">
            <div class="graph-canvas" data-scenario="canvas">
              <div class="graph-zoom" role="group" aria-label="Zoom de la carte">
                <button type="button" class="graph-zoom-btn" data-scenario-action="zoom-in" aria-label="Zoomer" title="Zoomer (molette · pincement)">＋</button>
                <button type="button" class="graph-zoom-btn" data-scenario-action="zoom-reset" aria-label="Vue d'ensemble" title="Vue d'ensemble">⤢</button>
                <button type="button" class="graph-zoom-btn" data-scenario-action="zoom-out" aria-label="Dézoomer" title="Dézoomer">−</button>
              </div>
            </div>
            <aside class="graph-inspector empty" data-scenario="inspector"></aside>
          </div>
          <p class="graph-empty" data-scenario="empty" hidden></p>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) return this.hide();
      const nodeCtl = e.target.closest("[data-scenario-node]");
      if (nodeCtl) return this._onNodeControl(nodeCtl);
      const edgeCtl = e.target.closest("[data-scenario-edge]");
      if (edgeCtl) return this._onEdgeControl(edgeCtl);
      const infoCtl = e.target.closest("[data-scenario-info]");
      if (infoCtl) return this._onInfoControl(infoCtl);
      const clueCtl = e.target.closest("[data-scenario-clue]");
      if (clueCtl) return this._onClueControl(clueCtl);
      const clockCtl = e.target.closest("[data-scenario-clock]");
      if (clockCtl && clockCtl.tagName === "BUTTON") return this._onClockControl(clockCtl);
      const frontCtl = e.target.closest("[data-scenario-front]");
      if (frontCtl && frontCtl.tagName === "BUTTON") return this._onFrontControl(frontCtl);
      const robustItem = e.target.closest("[data-scenario-robust]");
      if (robustItem) return this._gotoWarning(robustItem.dataset.scenarioRobust);
      const tlFact = e.target.closest("[data-scenario-tl]");
      if (tlFact) return this._gotoWarning(tlFact.dataset.scenarioTl);
      const btn = e.target.closest("[data-scenario-action]");
      if (!btn || btn.tagName === "SELECT") return;
      const a = btn.dataset.scenarioAction;
      if (a === "close") this.hide();
      else if (a === "new") this._newScenario();
      else if (a === "new-from-template") this._newFromTemplate();
      else if (a === "save-template") this._saveAsTemplate();
      else if (a === "rename") this._renameScenario();
      else if (a === "delete") this._deleteScenario();
      else if (a === "add-node") this._addNode(btn.dataset.type);
      else if (a === "add-info") this._addInfo();
      else if (a === "toggle-weave") {
        this._weave = !this._weave;
        this._reflectWeave();
        GraphEngine.setWeave(this._weave);
      } else if (a === "toggle-clues") {
        this._showClues = !this._showClues;
        this._reflectClues();
        this._renderToolbar(true);
        if (!this._showClues && (this._selInfo || this._selClue)) this._clearInspector();
        this._project();
      } else if (a === "robustesse") this._showRobustesse();
      else if (a === "toggle-pressure") {
        this._pressureOpen = !this._pressureOpen;
        this._timelineOpen = false; this._reflectTimeline();
        this._reflectPressure();
        if (this._pressureOpen) { this._selNode = this._selEdge = this._selInfo = this._selClue = null; GraphEngine.select(null); GraphEngine.selectEdge(null); this._renderPressure(); }
        else this._clearInspector();
      } else if (a === "toggle-timeline") {
        this._timelineOpen = !this._timelineOpen;
        this._pressureOpen = false; this._reflectPressure();
        this._reflectTimeline();
        if (this._timelineOpen) { this._selNode = this._selEdge = this._selInfo = this._selClue = null; GraphEngine.select(null); GraphEngine.selectEdge(null); this._renderTimeline(); }
        else this._clearInspector();
      } else if (a === "zoom-in") GraphEngine.zoomBy(1.3);
      else if (a === "zoom-out") GraphEngine.zoomBy(1 / 1.3);
      else if (a === "zoom-reset") GraphEngine.resetView();
    });

    overlay.addEventListener("change", (e) => {
      const el = e.target;
      if (el.matches('[data-scenario-action="pick"]')) {
        this._scenarioId = el.value || null;
        this._selNode = this._selEdge = this._selInfo = this._selClue = null;
        this._renderLibrary();
        this._project();
        return;
      }
      const nodeCtl = el.closest && el.closest("[data-scenario-node]");
      if (nodeCtl) return this._onNodeInput(nodeCtl, true);
      const edgeCtl = el.closest && el.closest("[data-scenario-edge]");
      if (edgeCtl) return this._onEdgeInput(edgeCtl, true);
      const infoCtl = el.closest && el.closest("[data-scenario-info]");
      if (infoCtl) return this._onInfoInput(infoCtl);
      const clueCtl = el.closest && el.closest("[data-scenario-clue]");
      if (clueCtl) return this._onClueInput(clueCtl, true);
      const clockCtl = el.closest && el.closest("[data-scenario-clock]");
      if (clockCtl) return this._onClockInput(clockCtl, true);
      const frontCtl = el.closest && el.closest("[data-scenario-front]");
      if (frontCtl) return this._onFrontInput(frontCtl, true);
    });

    overlay.addEventListener("input", (e) => {
      const nodeCtl = e.target.closest && e.target.closest("[data-scenario-node]");
      if (nodeCtl) return this._onNodeInput(nodeCtl, false);
      const edgeCtl = e.target.closest && e.target.closest("[data-scenario-edge]");
      if (edgeCtl) return this._onEdgeInput(edgeCtl, false);
      const infoCtl = e.target.closest && e.target.closest("[data-scenario-info]");
      if (infoCtl) return this._onInfoInput(infoCtl);
      const clueCtl = e.target.closest && e.target.closest("[data-scenario-clue]");
      if (clueCtl) return this._onClueInput(clueCtl, false);
      const clockCtl = e.target.closest && e.target.closest("[data-scenario-clock]");
      if (clockCtl) return this._onClockInput(clockCtl, false);
      const frontCtl = e.target.closest && e.target.closest("[data-scenario-front]");
      if (frontCtl) return this._onFrontInput(frontCtl, false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._el && this._el.classList.contains("open")) this.hide();
    });

    this._el = overlay;
    return overlay;
  },
};

// Pont couche 5 (voir PLANS/PLAN_MODULES_ES.md) : global classique.
window.ScenarioGraph = ScenarioGraph;
