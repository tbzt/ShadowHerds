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
import { Dice } from "../rules/dice.js";
import { DiceRoller } from "../widgets/dice/diceroller.js";
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

  /* ========================================================
     LE TEST DU ROUND (lot P3)

     Le ⚄ lance partout ailleurs dans l'app : il lance ici aussi — mais
     seulement sur un PNJ dont l'app tient la réserve. Sur un PJ léger (pas
     de compétences sur sa fiche : son bloc de table n'en porte pas), le
     même geste POINTE ce que le joueur annonce. Aucune règle nouvelle :
     c'est la doctrine de l'initiative (lot B3.5) appliquée au round de
     poursuite.

     Et ce qui se passe sur un ÉCHEC n'est jamais appliqué : le test
     d'Accident (SR6 encombré) ou les 4E à pied sont PROPOSÉS, avec leur
     réserve prête à lancer. L'app ne remplit aucun moniteur (règle R4).
     ======================================================== */

  /** La réserve du test pour ce participant, ou null si l'app ne la tient
      pas du livre → `{ pool, label, threshold }`. */
  testSpec(pnjId) {
    const st = this.state();
    const m = this.model();
    const pnj = PnjLookup.find(pnjId);
    if (!st || !m || !pnj || !m.testPool) return null;
    const spec = m.testPool(pnj, { terrain: st.terrain, env: st.env });
    if (!spec || !spec.pool) return null;
    const seuil = m.threshold ? m.threshold(pnj, { terrain: st.terrain, env: st.env }) : null;
    return { ...spec, threshold: Number.isFinite(seuil) ? seuil : null };
  },

  /** Le geste du ⚄ : lancer si on peut, pointer sinon. Un test DÉJÀ posé se
      corrige d'un tap (cycle) — se tromper doit coûter un geste, pas un
      détour. */
  testOrRoll(pnjId) {
    const st = this.state();
    if (!st) return;
    if (st.tested[pnjId]) return this.cycleTest(pnjId);
    const spec = this.testSpec(pnjId);
    if (!spec) return this.cycleTest(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const res = Dice.computeRoll(spec.pool);
    const suffixe = spec.threshold != null ? ` (seuil ${spec.threshold})` : "";
    DiceRoller.show(res, { label: `${spec.label}${suffixe}`, who: (pnj && pnj.name) || "?" });
    if (spec.threshold == null) {
      // SR5, Anarchy : pas de seuil (test opposé, ou difficulté arbitrée).
      // On lance, le MJ tranche — l'app ne décide pas d'un résultat qu'aucun
      // livre ne lui donne.
      toast(`${res.hits} succès — comparez, puis posez ✓ ou ✗.`);
      return;
    }
    Chase.setTest(this.edition(), st, pnjId, res.hits >= spec.threshold ? "ok" : "ko");
    this._persist();
  },

  /** Ce que l'échec coûte ICI, prêt à lancer si c'est un jet (test
      d'Accident) — proposé, jamais appliqué. */
  rollFail(pnjId) {
    const st = this.state();
    const spec = this.testSpec(pnjId);
    const cost = Chase.failCost(this.edition(), st);
    if (!cost) return;
    if (!spec) {
      toast(`Échec — ${cost}. À résoudre à la table.`);
      return;
    }
    const pnj = PnjLookup.find(pnjId);
    const res = Dice.computeRoll(spec.pool);
    DiceRoller.show(res, { label: `${cost} — ${spec.label}`, who: (pnj && pnj.name) || "?" });
  },

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
  /** Le gain d'Atout du round (SR6) : « le camp ayant l'indice le plus élevé
      gagne un point d'Atout. Seul un point est attribué. » L'app le PROPOSE
      au dominant en un tap — c'est un gain automatique que les tables
      oublient tous les rounds — mais ne l'applique jamais d'elle-même. */
  grantEdge(pnjId) {
    const m = this.model();
    if (!m || !(m.edge && m.edge.compare)) return;
    Encounter.adjustEdge(pnjId, 1);
    const nom = (PnjLookup.find(pnjId) || {}).name || "Le dominant";
    toast(`${nom} — +1 point d'Atout (attribut le plus élevé du round).`);
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

  /** Annule la dernière fin de round. Le toast s'efface au bout de quelques
      secondes — le MJ, lui, s'aperçoit de son mé-tap deux minutes plus tard :
      le bandeau de résumé garde donc son propre ↩, sans limite de temps. */
  undoRound() {
    const st = this.state();
    if (!st || !Chase.undoRound(st)) return;
    this._persist();
    toast("Round annulé.");
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
    // La réserve du test rejoint chaque ligne : le rendu affiche « ⚄ 12 »
    // quand l'app la tient, et un ⚄ nu quand c'est au joueur d'annoncer.
    for (const r of rows) r.roll = this.testSpec(r.pnjId);
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
      /** Le résumé du round qui vient de se terminer — résolu en NOMS ici
          (le rendu ne connaît pas les fiches). Ce que Savage Worlds appelle
          « le round produit un événement » : un round qui passe sans rien
          dire est un round qu'on oublie. */
      recap: (() => {
        const r = st.log && st.log[0];
        if (!r) return null;
        const nom = (id) => (PnjLookup.find(id) || {}).name || "?";
        return {
          round: r.round,
          moves: (r.moves || []).map((mv) => ({ name: nom(mv.pnjId), delta: mv.delta })),
          untested: (r.untested || []).map(nom),
        };
      })(),
      edgeCompare: !!(m.edge && m.edge.compare),
      failCostLabel: Chase.failCost(ed, st),
      poolOn: !!(m.edge && m.edge.chasePool),
      poolLabel: (m.edge && m.edge.poolLabel) || "Réserve",
    };
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Pursuit = Pursuit;
