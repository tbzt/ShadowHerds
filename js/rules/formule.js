"use strict";

/* ============================================================
   FORMULE — les notes chiffrées des livres, évaluées quand on peut
   ------------------------------------------------------------
   Les catalogues gardent le texte du livre quand la valeur dépend d'un
   choix : « 0,5 × Indice », « Résistance x 1 000¥ », « [Indice] », « 1 par
   point d'Indice », « Armure / 2 ». Ce moteur les évalue avec les variables
   qu'on lui donne, et rend null dès qu'il ne PEUT pas : variable absente,
   forme qui n'est pas une formule (« variable », « 1, ou 2 FC », « 10 ou
   12+8 selon le harnais »). Un null est une réponse — l'écran nomme l'objet
   au lieu de le compter zéro.

   ⚠ Une note sans AUCUNE variable connue n'est pas évaluée, même si elle
   ressemble à un calcul : « 1–3 » est une PLAGE, pas « 1 moins 3 ».
   ============================================================ */

const VARIABLES = {
  indice: "indice", niveau: "indice",
  resistance: "base", structure: "base",
  armure: "armure",
};

export const Formule = {
  /** @param note   le texte du livre
      @param vars   { indice, base, armure } — ce qu'on sait de l'objet
      @returns number | null */
  eval(note, vars) {
    if (note == null) return null;
    const v = vars || {};
    let s = String(note).toLowerCase();
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // résistance → resistance
    s = s.replace(/[\[\]¥]/g, " ").replace(/’/g, "'");
    s = s.replace(/\bpar point d'/g, "*").replace(/\bpar\b/g, "*");
    s = s.replace(/\s*[×x]\s*/g, "*");
    s = s.replace(/(\d)[   ](?=\d{3}\b)/g, "$1"); // 1 000 → 1000
    s = s.replace(/(\d),(\d)/g, "$1.$2"); // 0,5 → 0.5
    const idents = s.match(/[a-z]+/g) || [];
    if (!idents.length || !idents.every((w) => w in VARIABLES)) return null; // pas une formule (ou vocabulaire inconnu)
    const toks = s.match(/\d+(?:\.\d+)?|[a-z]+|[*/+\-()]/g) || [];
    let i = 0;
    const peek = () => toks[i];
    const next = () => toks[i++];
    let echec = false;
    const facteur = () => {
      const t = next();
      if (t === "(") { const r = expr(); if (next() !== ")") echec = true; return r; }
      if (t == null) { echec = true; return 0; }
      if (/^\d/.test(t)) return Number(t);
      const cle = VARIABLES[t];
      const val = cle ? v[cle] : undefined;
      if (val == null || !Number.isFinite(Number(val))) { echec = true; return 0; }
      return Number(val);
    };
    const terme = () => {
      let r = facteur();
      while (peek() === "*" || peek() === "/") { const op = next(); const f = facteur(); r = op === "*" ? r * f : r / f; }
      return r;
    };
    const expr = () => {
      let r = terme();
      while (peek() === "+" || peek() === "-") { const op = next(); const t = terme(); r = op === "+" ? r + t : r - t; }
      return r;
    };
    const r = expr();
    if (echec || i !== toks.length || !Number.isFinite(r)) return null;
    return Math.round(r * 100) / 100;
  },

  /** La note parle-t-elle de l'indice de l'objet ? */
  usesIndice(note) {
    return /indice|niveau/i.test(String(note || ""));
  },
};
