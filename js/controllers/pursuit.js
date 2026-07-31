"use strict";

/* ============================================================
   PURSUIT — l'état VIVANT d'une course-poursuite (moteur ⇉).

   Exactement le patron `Intrusion` : ce module ne possède aucune donnée.
   L'état vit dans la scène (`Encounter.state.chase`, scène-scopé comme
   `state.matrix`), les règles vivent dans `Chase` (moteur neutre) et dans
   le `chaseModel` de l'édition ; ce fichier ne fait que **muter** et
   déléguer la persistance à `Encounter._commit()` — source unique.

     js/rules/chase.js      → Chase    : les règles, sans état  (couche 2)
     js/controllers/pursuit → Pursuit  : l'état vivant, muté    (couche 5)

   Deux noms pour deux responsabilités, comme `Matrix` / `Intrusion`.

   ⚠ Ce que ce module ne fait PAS, et ne fera jamais : lancer les dés d'un
   PJ, ni appliquer un effet à quelqu'un d'autre. Un PJ annonce, le MJ tape
   ✓ ou ✗ (même doctrine que l'initiative, lot B3.5) ; un accident est
   PROPOSÉ, jamais appliqué (règle R4).
   ============================================================ */
import { Chase } from "../rules/chase.js";
import { Dialog } from "../widgets/kit/dialog.js";
import { Encounter } from "./encounter.js";
import { PnjLookup } from "./pnjlookup.js";

export const Pursuit = {
  /* ---- Accès à l'état (jamais créé ici : c'est la scène qui le porte) ---- */
  state() {
    return (Encounter.state && Encounter.state.chase) || null;
  },
  active() {
    return !!this.state();
  },
  edition() {
    return typeof App !== "undefined" ? App.edition : null;
  },
  model() {
    return Chase.use(this.edition());
  },

  /** Persiste + rend. Un seul point, comme `Intrusion._persist`. */
  _persist() {
    Encounter._commit();
  },

  /* ========================================================
     OUVRIR / FERMER — le type de scène n'est qu'un préréglage de moteurs
     (doctrine R0), donc « ouvrir une poursuite » ALLUME un moteur, ça ne
     remplace pas la scène. En SR5/SR6 la poursuite tourne AVEC
     l'initiative (le livre l'exige) ; en Anarchy, seule.
     ======================================================== */
  open(opts = {}) {
    if (!Encounter.state) return false;
    if (!Chase.supports(this.edition())) {
      toast("Cette édition n'a pas de règles de course-poursuite.", "warning");
      return false;
    }
    if (this.state()) return true; // idempotent : rouvrir n'écrase pas une piste en cours
    Encounter.state.chase = Chase.newState(this.edition(), opts);
    Encounter.setMotor("chase", true);
    this._persist();
    toast("Scène de poursuite — posez la cible, puis les positions.");
    return true;
  },

  async close() {
    const st = this.state();
    if (!st) return;
    const posees = Object.keys(st.lanes || {}).length;
    if (posees) {
      const ok = await Dialog.confirm({
        title: "Fermer la poursuite",
        message: `${posees} position${posees > 1 ? "s" : ""} sur la piste seront perdues. Les combattants restent en scène.`,
        confirmLabel: "Fermer",
      });
      if (!ok) return;
    }
    Encounter.state.chase = null;
    Encounter.setMotor("chase", false);
    this._persist();
    toast("Poursuite fermée — la scène continue.");
  },

  /* ---- Réglages de piste ---- */
  setTerrain(key) {
    const st = this.state();
    if (!st || !Chase.terrain(this.edition(), key)) return;
    st.terrain = key;
    this._persist();
  },
  setEnv(key) {
    const st = this.state();
    if (!st) return;
    st.env = key || null;
    this._persist();
  },
  setMode(mode) {
    const st = this.state();
    if (!st) return;
    st.mode = mode || "poursuite";
    this._persist();
  },
  /** Désigner la cible n'applique RIEN à personne (cf. `no-target-selection`) :
      c'est l'origine du repère de distances, que le livre exige. */
  setTarget(pnjId) {
    const st = this.state();
    if (!st) return;
    st.targetId = st.targetId === pnjId ? null : pnjId || null;
    if (st.targetId) delete st.lanes[st.targetId];
    this._persist();
  },

  /* ---- Positions ---- */
  place(pnjId, laneKey) {
    const st = this.state();
    if (!st) return;
    Chase.place(st, pnjId, laneKey);
    this._persist();
  },
  move(pnjId, delta) {
    const st = this.state();
    if (!st) return;
    Chase.move(this.edition(), st, pnjId, delta);
    this._persist();
  },
  /** Fait entrer tous les combattants de la scène qui n'y sont pas encore,
      sur la bande demandée — le geste « on y va tous » d'un début de
      poursuite, plutôt que N taps. La cible en est exclue (elle est l'ancre). */
  fill(laneKey) {
    const st = this.state();
    if (!st) return 0;
    const keys = Chase.laneKeys(this.edition(), st.terrain);
    const lane = keys.includes(laneKey) ? laneKey : keys[0];
    let n = 0;
    for (const c of Encounter.state.combatants) {
      if (c.pnjId === st.targetId || st.lanes[c.pnjId]) continue;
      Chase.place(st, c.pnjId, lane);
      n++;
    }
    if (n) this._persist();
    return n;
  },

  /* ---- Le test du round ----
     Sur un PNJ, l'app peut lancer (elle tient les PNJ) ; sur un PJ, elle
     ENREGISTRE ce que le joueur annonce. Ici on ne fait qu'enregistrer :
     le jet réel vient du parcours de dés existant, branché au lot P2. */
  setTest(pnjId, res) {
    const st = this.state();
    if (!st) return;
    Chase.setTest(this.edition(), st, pnjId, res);
    this._persist();
  },
  cycleTest(pnjId) {
    const st = this.state();
    if (!st) return;
    const cur = st.tested[pnjId] || null;
    Chase.setTest(this.edition(), st, pnjId, cur === null ? "ok" : cur === "ok" ? "ko" : null);
    this._persist();
  },
  toggleEdgeUp(pnjId) {
    const st = this.state();
    if (!st) return;
    if (st.edgeUp[pnjId]) delete st.edgeUp[pnjId];
    else st.edgeUp[pnjId] = true;
    this._persist();
  },

  /* ---- Sorties de course ---- */
  drop(pnjId, reason) {
    const st = this.state();
    if (!st) return;
    Chase.drop(st, pnjId, reason);
    this._persist();
    const nom = (PnjLookup.find(pnjId) || {}).name || "Le participant";
    toast(reason === "accident" ? `${nom} — accident, hors course.` : `${nom} est semé.`);
  },
  restore(pnjId) {
    const st = this.state();
    if (!st) return;
    Chase.restore(st, pnjId);
    this._persist();
  },

  /* ---- Valeur d'attribut saisie à la main ----
     Le PJ léger n'a ni Agilité ni Force, et un véhicule d'un autre ouvrage
     n'a pas encore son Intervalle de vitesse : l'app DEMANDE au lieu
     d'inventer (décision n°5 du chantier). */
  setAttr(pnjId, value) {
    const st = this.state();
    if (!st) return;
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n >= 0) st.attrOverride[pnjId] = n;
    else delete st.attrOverride[pnjId];
    this._persist();
  },
  async promptAttr(pnjId) {
    const st = this.state();
    if (!st) return;
    const spec = Chase.attrSpec(this.edition(), st.env, st.terrain);
    const nom = (PnjLookup.find(pnjId) || {}).name || "Ce participant";
    const raw = await Dialog.prompt({
      title: spec ? spec.label : "Attribut du round",
      message: `${nom} — valeur à comparer ce round. L'app ne la trouve ni sur la fiche ni au catalogue : annoncez-la.`,
      value: String(st.attrOverride[pnjId] ?? ""),
    });
    if (raw === null) return;
    this.setAttr(pnjId, raw.trim());
  },

  /* ---- Réserve de course-poursuite (SR6) ---- */
  addPool(pnjId, delta) {
    const st = this.state();
    if (!st) return;
    Chase.addPool(this.edition(), st, pnjId, delta);
    this._persist();
  },
  setPoolMax(pnjId, value) {
    const st = this.state();
    if (!st) return;
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) st.poolMax[pnjId] = n;
    else delete st.poolMax[pnjId];
    this._persist();
  },

  /* ---- Fin de round ----
     Ne déplace personne : le MJ a posé les jetons pendant le round. Ce que
     la fin de round produit, c'est un RÉSUMÉ (qui a gagné ou perdu une
     bande, qui n'a pas testé), annulable. */
  endRound() {
    const st = this.state();
    if (!st) return null;
    const recap = Chase.endRound(this.edition(), st);
    this._persist();
    const nom = (id) => (PnjLookup.find(id) || {}).name || "?";
    const bits = (recap.moves || []).map((m) => `${nom(m.pnjId)} ${m.delta > 0 ? "+" : ""}${m.delta}`);
    if (recap.untested.length)
      bits.push(`${recap.untested.length} sans test — le livre les fait perdre la course`);
    toastUndo(bits.length ? bits.join(" · ") : `Round ${st.round}.`, () => {
      Chase.undoRound(st);
      this._persist();
    });
    return recap;
  },

  /* ---- Lectures dérivées (pour le rendu du lot P2 et la console) ---- */
  /** Une ligne par participant, prête à rendre : position, attribut,
      tendance, état du test. Le calcul des fiches se fait ICI (couche 5),
      jamais dans le moteur neutre. */
  rows() {
    const st = this.state();
    if (!st) return [];
    const ed = this.edition();
    return Encounter.state.combatants
      .filter((c) => c.pnjId !== st.targetId)
      .map((c) => {
        const pnj = PnjLookup.find(c.pnjId);
        return {
          pnjId: c.pnjId,
          name: (pnj && pnj.name) || c.name || "?",
          lane: Chase.laneOf(st, c.pnjId),
          value: Chase.attrValue(ed, pnj, st),
          trend: Chase.trend(ed, st, c.pnjId),
          test: st.tested[c.pnjId] || null,
          edgeUp: !!st.edgeUp[c.pnjId],
          out: st.out[c.pnjId] || null,
          pool: st.pool[c.pnjId] || 0,
        };
      });
  },
  /** L'entrée d'ancre (la cible), même forme qu'une ligne. */
  targetRow() {
    const st = this.state();
    if (!st || !st.targetId) return null;
    const pnj = PnjLookup.find(st.targetId);
    return {
      pnjId: st.targetId,
      name: (pnj && pnj.name) || "?",
      value: Chase.attrValue(this.edition(), pnj, st),
      pool: st.pool[st.targetId] || 0,
    };
  },
  /** Qui domine ce round (l'accent), et les écrasements « 3× » de SR6. */
  dominant() {
    const st = this.state();
    if (!st) return null;
    const all = this.rows().filter((r) => !r.out);
    const t = this.targetRow();
    if (t) all.push(t);
    return Chase.dominantId(all.map((r) => ({ pnjId: r.pnjId, value: r.value })));
  },
  summary() {
    return Chase.summary(this.edition(), this.state());
  },

  /** Le paquet complet que le rendu consomme — assemblé ICI (couche 5, seule
      à pouvoir lire les fiches) pour que `ChaseRenderer` reste PUR : il reçoit
      des données déjà résolues et rend du HTML, comme `EncounterRenderer`.
      → null si aucune poursuite n'est ouverte (le rendu se masque alors). */
  viewModel() {
    const st = this.state();
    if (!st) return null;
    const ed = this.edition();
    const m = this.model();
    if (!m) return null;
    const rows = this.rows();
    const target = this.targetRow();
    const dominantId = this.dominant();
    const byLane = {};
    for (const r of rows) if (!r.out && r.lane) (byLane[r.lane] ||= []).push(r);
    const terr = m.terrains[st.terrain] || {};
    return {
      round: st.round,
      mode: st.mode,
      glyph: m.glyph || "⇉",
      terrain: st.terrain,
      terrains: Object.entries(m.terrains).map(([key, t]) => ({ key, label: t.label, unruled: !!t.unruled })),
      terrainNote: terr.note || "",
      unruled: !!terr.unruled,
      testLabel: terr.testLabel || "",
      testRequired: !!(m.round && m.round.test && m.round.test.required),
      testCost: (m.round && m.round.test && m.round.test.cost) || "",
      opposed: !!(m.round && m.round.test && m.round.test.opposed),
      actions: (m.round && m.round.actions) || [],
      env: st.env,
      envs: Chase.envs(ed).map((e) => ({ key: e.key, label: e.label, examples: e.examples || "" })),
      envLabel: (Chase.env(ed, st.env) || {}).label || "",
      attr: Chase.attrSpec(ed, st.env, st.terrain),
      failCost: Chase.failCost(ed, st),
      lanes: Chase.lanes(ed, st.terrain).map((l) => ({ ...l, rows: byLane[l.key] || [] })),
      target,
      dominantId,
      outcomes: Chase.outcomes(ed, st) || { caught: null, lost: null },
      summary: this.summary(),
      dropped: rows.filter((r) => r.out),
      unplaced: rows.filter((r) => !r.out && !r.lane),
      poolOn: !!(m.edge && m.edge.chasePool),
      poolLabel: (m.edge && m.edge.poolLabel) || "Réserve",
    };
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Pursuit = Pursuit;
