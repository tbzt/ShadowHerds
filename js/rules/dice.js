"use strict";

/* ============================================================
   DICE — moteur de règles pur (testable, sans DOM)
   Shadowrun standard (computeRoll), initiative (computeInitiative)
   et Anarchy 2.0 avec dés de risque (computeAnarchyRoll, riskDiceFor).
   ============================================================ */
import { Utils } from "../core/utils.js";

export const Dice = {
  /* ---- Moteur de règles pur (testable, sans DOM) ---- */
  computeRoll(n) {
    n = Utils.clamp(n, 1, 60);
    const faces = [];
    let hits = 0;
    let ones = 0;

    for (let i = 0; i < n; i++) {
      const r = Utils.randInt(1, 6);
      faces.push(r);
      if (r >= 5) hits++;
      if (r === 1) ones++;
    }

    const glitch = ones > Math.floor(n / 2);
    const critGlitch = glitch && hits === 0;

    return { n, faces, extra: [], hits, ones, glitch, critGlitch };
  },

  /**
   * Ajuste le verdict de complication d'un jet STANDARD selon le MODÈLE de
   * l'édition (editionModule.complicationModel), sans jamais brancher sur
   * App.edition — le switch porte sur `model.kind`, une donnée fournie par le
   * module d'édition. Idempotent : appelé aux entonnoirs d'affichage/journal
   * (DiceRoller.show / roll, DiceLog.record).
   *
   *   - "pool" (SR5/SR6) : la règle « 1s > moitié du pool » est déjà posée par
   *       computeRoll → rien à corriger. Le libellé VF est « Complication » /
   *       « Échec critique » (SR5 Livre de Règles ; SR6 p.40), porté par
   *       `model.glitchLabel` côté affichage.
   *   - "unpredictability" (Anarchy 1re, sran_01 p.157) : un pool ne produit
   *       JAMAIS de complication — celle-ci vient d'un dé d'imprévu opt-in
   *       (Points d'Anarchy ; motorisé au Lot B). On neutralise donc le verdict
   *       SR fantôme hérité de computeRoll.
   *   - "risk" (Anarchy 2.0) : le verdict vit dans `res.complication`
   *       (computeAnarchyRoll), pas dans glitch/critGlitch — ici, no-op.
   */
  normalizeVerdict(res, model) {
    if (!res || !model) return res;
    if (model.kind === "unpredictability") {
      res.glitch = false;
      res.critGlitch = false;
    }
    return res;
  },

  /**
   * Jet avec dés d'Edge PRÉ-jet (SR5 « Repousser les limites », p.58 / SR6
   * « Prendre un risque » et « Ajouter son rang d'Atout », p.50-51). Le pool
   * de base se lance normalement ; on AJOUTE `edgeDice` dés. Si `explode`, ces
   * dés d'Edge — et EUX SEULS — suivent la Règle des six : un 6 compte comme un
   * succès ET se relance en cascade (SR5 : « seuls vos dés de Chance utilisent
   * la Règle des six »). Les relances d'explosion vont dans `extra` et
   * n'apportent que des succès ; la complication se compte sur les dés INITIAUX
   * (base + Edge), jamais sur les explosions. Le plafond de Limite éventuel
   * (SR5) est géré par l'appelant (rollWeapon), pas ici — « Repousser les
   * limites » l'ignore de toute façon.
   */
  computeRollWithEdge(normalPool, edgeDice, explode = false) {
    normalPool = Utils.clamp(normalPool | 0, 0, 60);
    edgeDice = Utils.clamp(edgeDice | 0, 0, 60);
    const faces = [];
    const extra = [];
    let hits = 0;
    let ones = 0;
    let edgeSixes = 0; // dés d'Edge ayant fait 6 (déclencheurs de la Règle des six)
    const tally = (v) => {
      if (v >= 5) hits++;
      if (v === 1) ones++;
    };
    // Dés de base : jamais d'explosion.
    for (let i = 0; i < normalPool; i++) {
      const v = Utils.randInt(1, 6);
      faces.push(v);
      tally(v);
    }
    // Dés d'Edge : comptés dans les dés initiaux (donc la complication), puis Règle
    // des six si `explode`. Garde-fou de cascade (RNG dégénéré / mock).
    for (let i = 0; i < edgeDice; i++) {
      const v = Utils.randInt(1, 6);
      faces.push(v);
      tally(v);
      if (explode && v === 6) {
        edgeSixes++;
        let r = Utils.randInt(1, 6);
        for (let guard = 0; guard < 100; guard++) {
          extra.push(r);
          if (r >= 5) hits++; // les explosions n'apportent que des succès
          if (r !== 6) break;
          r = Utils.randInt(1, 6);
        }
      }
    }
    const n = normalPool + edgeDice;
    const glitch = ones > Math.floor(n / 2);
    const critGlitch = glitch && hits === 0;
    return { n, faces, extra, hits, ones, glitch, critGlitch, edgeDice, edgeExplode: !!explode, edgeSixes };
  },

  /* ========================================================
     ANARCHY 2.0 — RÈGLE DE RISQUE STANDARD

     La réserve totale ne change pas : on remplace `riskDice` dés
     normaux par des dés de risque.
       - Succès normaux : faces 5-6 sur les dés normaux.
       - Succès de risque : faces 5-6 sur les dés de risque, ×2.
       - Les ‘1’ sur les dés de risque génèrent des complications
         (les ‘1’ sur les dés normaux n'ont aucun effet).
       - La RR (réduction de risque) annule autant de ‘1’ de risque.
       - Complications après RR : 0 = rien, 1 = mineure,
         2 = critique, 3+ = désastre.
     ======================================================== */

  /* Table « Combien prendre de dés de risque ? » (p.71)
     indexée [RR][niveau] ; niveaux : faible, normal, fort, extrême.
     null = combinaison non prévue par la table (RR3 / extrême). */
  RISK_TABLE: {
    0: { faible: 1, normal: 2, fort: 4, extreme: 6 },
    1: { faible: 3, normal: 5, fort: 7, extreme: 10 },
    2: { faible: 5, normal: 8, fort: 11, extreme: 13 },
    3: { faible: 8, normal: 12, fort: 15, extreme: null },
  },

  /** Nombre de dés de risque conseillé pour un level et une RR donnés. */
  riskDiceFor(level, rr, pool) {
    const row = this.RISK_TABLE[Utils.clamp(rr, 0, 3)] || this.RISK_TABLE[0];
    let v = row[level];
    if (v == null) {
      // Combinaison hors table (ex. RR3 extrême) : on prend tout le pool.
      v = pool;
    }
    return Utils.clamp(v, 0, pool);
  },

  /**
   * Lance une réserve Anarchy avec dés de risque.
   * @param {number} pool - taille totale de la réserve
   * @param {number} riskDice - dés de risque (0..pool)
   * @param {number} rr - réduction de risque (0..3)
   * @param {number} adv - avantage/désavantage net (p.67) : -1 = désavantage
   *   (seul 6 est un succès), 0 = normal (5-6), +1 = avantage (4-6).
   */
  computeAnarchyRoll(pool, riskDice, rr = 0, adv = 0) {
    pool = Utils.clamp(pool, 1, 60);
    riskDice = Utils.clamp(riskDice, 0, pool);
    rr = Utils.clamp(rr, 0, 3);
    adv = Utils.clamp(adv, -1, 1);
    const threshold = adv === 1 ? 4 : adv === -1 ? 6 : 5;

    const normalCount = pool - riskDice;
    const faces = []; // { v, risk: bool }
    let normalHits = 0;
    let riskHits = 0;
    let riskOnes = 0;

    for (let i = 0; i < normalCount; i++) {
      const v = Utils.randInt(1, 6);
      faces.push({ v, risk: false });
      if (v >= threshold) normalHits++;
    }
    for (let i = 0; i < riskDice; i++) {
      const v = Utils.randInt(1, 6);
      faces.push({ v, risk: true });
      if (v >= threshold) riskHits++;
      if (v === 1) riskOnes++;
    }

    // Succès : risque compte double
    const hits = normalHits + riskHits * 2;

    // Complications : ‘1’ de risque après RR
    const effectiveOnes = Math.max(0, riskOnes - rr);
    let complication = "none";
    if (effectiveOnes === 1) complication = "minor";
    else if (effectiveOnes === 2) complication = "critical";
    else if (effectiveOnes >= 3) complication = "disaster";

    return {
      anarchy: true,
      pool,
      riskDice,
      rr,
      adv,
      threshold,
      faces,
      extra: [],
      normalHits,
      riskHits,
      riskOnes,
      effectiveOnes,
      hits,
      complication,
    };
  },

  /* ========================================================
     RELANCES (« Seconde chance » SR5/SR6, « Relancer tous les
     dés » Anarchy). Fonctions pures : reçoivent un résultat déjà
     lancé, en produisent un nouveau marqué `rerolled`.
     ======================================================== */

  /**
   * Relance les dés qui n'ont pas fait de succès (faces < 5) et
   * recompte succès / complication / échec critique — règle SR5 (p.58) et
   * SR6 (p.50-51). Les dés déjà réussis sont conservés tels quels.
   * Préserve le plafond de Précision SR5 si `res.limit` est défini.
   */
  rerollMisses(res) {
    const faces = res.faces.map((v) => (v < 5 ? Utils.randInt(1, 6) : v));
    let hits = 0;
    let ones = 0;
    for (const v of faces) {
      if (v >= 5) hits++;
      if (v === 1) ones++;
    }
    const n = faces.length;
    const glitch = ones > Math.floor(n / 2);
    const critGlitch = glitch && hits === 0;
    const out = {
      n,
      faces,
      extra: [],
      hits,
      ones,
      glitch,
      critGlitch,
      rerolled: true,
    };
    // Plafond de Précision (SR5) : la limite mord si hits > limite.
    if (res.limit != null && hits > res.limit) {
      out.cappedFrom = hits;
      out.hits = res.limit;
      out.limited = true;
      out.limit = res.limit;
    }
    return out;
  },

  /**
   * Relance intégrale d'un jet Anarchy (p.77) : même réserve, mêmes
   * dés de risque, même avantage/désavantage. La complication du
   * premier jet est FIGÉE — une relance ne peut ni la créer ni
   * l'effacer.
   */
  rerollAnarchyAll(res) {
    const out = this.computeAnarchyRoll(res.pool, res.riskDice, res.rr, res.adv);
    out.complication = res.complication;
    out.rerolled = true;
    return out;
  },

  /* ========================================================
     TEST OPPOSÉ (SR5 p.49 / même principe SR6 & Anarchy) : deux
     réserves lancées séparément, on compare les succès — pas de
     seuil sur un test opposé (cf. livre de règles).
     ======================================================== */
  computeOpposedRoll(poolA, poolB) {
    const a = this.computeRoll(poolA);
    const b = this.computeRoll(poolB);
    return { opposed: true, a, b, net: a.hits - b.hits };
  },

  /* ---- Initiative : base + N D6, en SOMME (pas de succès) ---- */
  computeInitiative(base, dice) {
    base = Math.max(0, base | 0);
    dice = Utils.clamp(dice | 0, 1, 12);
    const faces = [];
    let sum = 0;
    for (let i = 0; i < dice; i++) {
      const v = Utils.randInt(1, 6);
      faces.push(v);
      sum += v;
    }
    return { init: true, base, dice, faces, diceSum: sum, total: base + sum };
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Dice = Dice;
