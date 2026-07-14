"use strict";

/* ============================================================
   ACTOR — accesseurs de valeurs d'acteur (attributs, compétences).

   SEAM de la refonte du modèle d'acteur (PLANS/PLAN_REFONTE_ACTEUR.md).
   But : découpler les 27 lecteurs de `pnj.attrs.X` de la FORME stockée,
   pour pouvoir plus tard basculer le plat `5` vers un `Trait {base,mods,
   total}` à un seul endroit — ici — sans toucher les lecteurs.

   VAGUE V0 (celle-ci) : read-through NO-OP. `_num()` accepte déjà les
   deux formes (nombre plat OU Trait à `.total`), donc migrer un lecteur
   vers cet accesseur ne change RIEN tant que le storage reste plat, et
   restera transparent quand la forme basculera (V2). N'est encore appelé
   nulle part : purement additif, aucune bascule de comportement.

   Neutre par édition (aucune branche `App.edition`). Le `total` réel
   (clamp par métatype, dérivées) reste produit par recalc côté édition.
   ============================================================ */
const Actor = {
  /** Coerce une valeur d'acteur en NOMBRE, quelle que soit sa forme :
      - nombre plat (forme actuelle) → tel quel ;
      - Trait `{base, mods, total}` (forme cible V2) → son `total`. */
  _num(v) {
    if (v && typeof v === "object") return v.total ?? v.base ?? 0;
    return v ?? 0;
  },

  /** Valeur totale d'un attribut (ex. "FOR"). Renvoie 0 si absent. */
  attr(pnj, key) {
    return this._num(pnj && pnj.attrs && pnj.attrs[key]);
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
