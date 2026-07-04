"use strict";

/* ============================================================
   DICE — moteur de règles pur (testable, sans DOM)
   Shadowrun standard (computeRoll), initiative (computeInitiative)
   et Anarchy 2.0 avec dés de risque (computeAnarchyRoll, riskDiceFor).
   ============================================================ */
const Dice = {
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
