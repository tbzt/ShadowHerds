"use strict";

/* ============================================================
   ACTOR — accesseurs de valeurs d'acteur (attributs, compétences).

   SEAM de la refonte du modèle d'acteur (PLANS/PLAN_REFONTE_ACTEUR.md).
   But : découpler les 27 lecteurs de `pnj.attrs.X` de la FORME stockée,
   pour pouvoir plus tard basculer le plat `5` vers un `Trait {base,mods,
   total}` à un seul endroit — ici — sans toucher les lecteurs.

   VAGUE V2 (active) : le `Trait {base, mods, total}` est la forme cible.
   `_num()` reste tolérant (nombre plat OU Trait), donc les ~35 lecteurs
   migrés en V1 sont transparents à la bascule. Le `Mod` porte sa source :
     Mod = { value, source, sourceUuid?, type?, isMultiplier? }
   `total` = (base + Σ mods additifs) × Π multiplicateurs ; le clamp par
   métatype et les dérivées restent produits par recalc côté édition.

   Neutre par édition (aucune branche `App.edition`).
   ============================================================ */
const Actor = {
  /** Coerce une valeur d'acteur en NOMBRE, quelle que soit sa forme :
      - nombre plat (forme legacy) → tel quel ;
      - Trait `{base, mods, total}` (forme cible V2) → son `total`. */
  _num(v) {
    if (v && typeof v === "object") return v.total ?? v.base ?? 0;
    return v ?? 0;
  },

  /** Vrai si `v` est déjà un Trait `{base, mods, total}`. */
  _isTrait(v) {
    return v != null && typeof v === "object" && "total" in v;
  },

  /** Enveloppe une valeur en Trait (idempotent). Un nombre `n` devient
      `{base:n, mods:[], total:n}` ; un Trait est renvoyé tel quel. */
  trait(v) {
    if (this._isTrait(v)) {
      if (!Array.isArray(v.mods)) v.mods = [];
      return v;
    }
    const n = v ?? 0;
    return { base: n, mods: [], total: n };
  },

  /** Recalcule `total` = (base + Σ additifs) × Π multiplicateurs. */
  _recompute(t) {
    let add = 0;
    let mult = 1;
    for (const m of t.mods) {
      if (m && m.isMultiplier) mult *= m.value;
      else if (m) add += m.value;
    }
    t.total = mult === 1 ? t.base + add : Math.round((t.base + add) * mult);
    return t;
  },

  /** Enveloppe tous les attributs d'un PNJ en Trait (idempotent). */
  normalizeAttrs(pnj) {
    if (!pnj || !pnj.attrs) return;
    for (const k of Object.keys(pnj.attrs)) pnj.attrs[k] = this.trait(pnj.attrs[k]);
  },

  /** Normalise puis recalcule tous les `total` (après changement de base
      ou de mods). Appelé en tête de recalc côté édition. */
  refreshAttrs(pnj) {
    if (!pnj || !pnj.attrs) return;
    for (const k of Object.keys(pnj.attrs)) {
      const t = this.trait(pnj.attrs[k]);
      pnj.attrs[k] = this._recompute(t);
    }
  },

  /** Valeur BASE d'un attribut (l'attribut propre, hors mods). */
  base(pnj, key) {
    const v = pnj && pnj.attrs && pnj.attrs[key];
    return this._isTrait(v) ? v.base : (v ?? 0);
  },

  /** Fixe la base d'un attribut (édition manuelle) et recalcule le total.
      Tolère la forme legacy (écrit un nombre plat si pas encore Trait). */
  setBase(pnj, key, n) {
    const v = pnj.attrs[key];
    if (this._isTrait(v)) {
      v.base = n;
      this._recompute(v);
    } else {
      pnj.attrs[key] = n;
    }
  },

  /** Dépense n points d'un attribut-ressource (Édge/Chance/Atout) : réduit
      la base et recalcule le total. Forme legacy tolérée. */
  spend(pnj, key, n = 1) {
    const v = pnj.attrs[key];
    if (this._isTrait(v)) {
      v.base -= n;
      this._recompute(v);
    } else {
      pnj.attrs[key] = (v ?? 0) - n;
    }
  },

  /** Ajoute un Mod étiqueté sur un attribut (bonus d'équipement/trait) et
      recalcule le total. Enveloppe l'attribut au passage. */
  addMod(pnj, key, mod) {
    const t = this.trait(pnj.attrs[key]);
    t.mods.push(mod);
    this._recompute(t);
    pnj.attrs[key] = t;
  },

  /** Valeur totale d'un attribut (ex. "FOR"). Renvoie 0 si absent. */
  attr(pnj, key) {
    return this._num(pnj && pnj.attrs && pnj.attrs[key]);
  },

  /** Copie PLATE des attributs (clé → total numérique), pour les consommateurs
      qui lisent en masse `pnj.attrs.X` comme des nombres (export Foundry,
      impression). Un seul point de coercion au lieu d'un par lecture. */
  flatAttrs(pnj) {
    const out = {};
    const src = (pnj && pnj.attrs) || {};
    for (const k of Object.keys(src)) out[k] = this._num(src[k]);
    return out;
  },

  /** Rang total d'une compétence par nom exact. Renvoie 0 si absente.
      (La réconciliation floue nom↔compétence vit dans WeaponRoll ; ici on
      ne fait que lire la valeur d'une compétence déjà identifiée.) */
  skillRank(pnj, name) {
    const s = (pnj && pnj.skills) || [];
    const found = s.find((sk) => sk && sk.name === name);
    if (!found) return 0;
    // `rank` (forme cible) ou `val` (forme actuelle) — les deux tolérés.
    return this._num(found.rank != null ? found.rank : found.val);
  },
};
