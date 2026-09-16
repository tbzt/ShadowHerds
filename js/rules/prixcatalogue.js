"use strict";

/* ============================================================
   PRIX DU CATALOGUE — moteur neutre : rapproche le libellé d'un objet du
   catalogue de l'app (« Ares Predator V », « Veste pare-balles ») d'une ligne
   d'une table relevée au livre (sr5.armes.js, sr6.armes.js, ArmuresSR5,
   ArmuresSR6) et en lit le prix et la Disponibilité.

   Ne connaît AUCUNE édition : les tables et l'ordre de préséance viennent du
   module appelant. Un prix en formule (« Indice × 100 ¥ ») n'est pas un
   nombre : il reste en note, à saisir — jamais 0 en silence.
   ============================================================ */
export const PrixCatalogue = {
  /** Clé de rapprochement : minuscules, sans accent, sans la plage ou le bloc
      de stats qu'un libellé porte (« Quadmod (indice 1-3) », « … [PRE 5] »). */
  normName(s) {
    return String(s || "")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\(\s*(?:indice\s+)?\d+\s*[-–−]\s*\d+\s*\)/gi, " ")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[’']/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  },

  /** Index nom normalisé → ligne (`nom` + `alias`) ; à clé égale, la
      première entrée gagne — l'appelant met le livre de base en tête. */
  index(table) {
    const idx = new Map();
    for (const ref of table || []) {
      for (const n of [ref.nom, ...(ref.alias || [])]) {
        const k = this.normName(n);
        if (k && !idx.has(k)) idx.set(k, ref);
      }
    }
    return idx;
  },

  /** La ligne d'un libellé, ou null. Un libellé en forme « Nom (variante) »
      retombe sur « Nom » quand la variante n'est pas au livre. */
  find(idx, name) {
    if (!idx) return null;
    const k = this.normName(name);
    if (idx.has(k)) return idx.get(k);
    const sans = this.normName(String(name || "").replace(/\s*\([^)]*\)\s*$/, ""));
    return sans && idx.has(sans) ? idx.get(sans) : null;
  },

  /** « 1 000 ¥ » → 1000 ; un nombre tel quel ; une formule → null. */
  money(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const m = String(v || "").replace(/[  ]/g, " ").match(/^\s*\+?\s*(\d[\d ]*)\s*¥?\s*$/);
    return m ? parseInt(m[1].replace(/\s/g, ""), 10) : null;
  },

  /** La partie numérique d'une Disponibilité (« 5R » → 5, « 3 (L) » → 3,
      « — » → 0) ; une formule (« Indice × 3 ») → null. */
  dispo(v) {
    const s = String(v ?? "").trim();
    if (s === "" ) return null;
    if (/^[—–-]$/.test(s)) return 0;
    const m = s.match(/^\+?\s*(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  },

  /** Ce qu'une ligne donne à un objet : `{cost, costNote, availability,
      dispoText, ref}` — `cost` nombre ou null (formule en `costNote`). */
  defaults(ref) {
    if (!ref) return null;
    const cost = this.money(ref.cout);
    return {
      ref,
      cost,
      costNote: cost == null ? (ref.coutNote || (typeof ref.cout === "string" ? ref.cout : null)) : null,
      availability: this.dispo(ref.dispo),
      dispoText: ref.dispo || null,
    };
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.PrixCatalogue = PrixCatalogue;
