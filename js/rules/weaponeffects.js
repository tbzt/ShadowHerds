"use strict";

/* ============================================================
   WEAPON EFFECTS — effets d'objet motorisés sur un JET d'arme, en
   CONTRIBUTIONS étiquetées par facette (refonte acteur, V3/V4).

   Généralisation du motif `Mod` (cf. actor.js) aux facettes d'un jet :
   un objet ne modifie pas que la VD — il peut toucher le POOL de dés, la
   PRÉCISION/limite, la VD, la PA… Chaque facette est une valeur + une
   liste de contributions `{value, source}` ; l'explication du jet itère
   ces listes (« attribut + compétence + bonus (source) »).

   Un effet déclare :
     { match, target, perRating?, value?, conditional?, source, page? }
   - match       : RegExp sur le libellé de l'item porté (equip/augs).
   - target      : la FACETTE visée — "pool" | "accuracy" | "dv" | "ap".
   - perRating[] : table LITTÉRALE du livre indexée par l'indice
                   (perRating[r]) ; sinon `value` fixe.
   - conditional : (weaponName) => bool — l'effet ne s'applique qu'à
                   certaines armes (ex. « mains nues » pour la densité
                   musculaire). Absent = toujours.
   - source/page : provenance affichée + audit de collecte.

   Le CATALOG ci-dessous est le socle N2 (V4). Il se peuple ensuite item
   par item contre le PDF (V5, sous-agents) — SANS toucher ce moteur.
   ============================================================ */
const WeaponEffects = {
  /* Prédicats de condition réutilisables. */
  _isUnarmed(name) {
    return /mains nues|unarmed|à mains nues/i.test(String(name || ""));
  },

  /* Socle N2 (V4). perRating indexé par l'indice (index 0 = inutilisé).
     L'indice de l'item est lu par ItemResolver.itemRating (champ `.rating`
     de la forme objet #63, ou « Indice N » dans le libellé). */
  CATALOG: [
    {
      // SR5 VF p.461, table « Attaques à mains nues » :
      // VD mains nues = FOR + (Indice − 1) → +0/+1/+2/+3 aux indices 1..4.
      match: /densit[ée] musculaire/i,
      target: "dv",
      perRating: [null, 0, 1, 2, 3],
      conditional: (name) => WeaponEffects._isUnarmed(name),
      source: "Densité musculaire",
      page: "SR5 p.461",
    },
  ],

  /** Résout les effets d'objet pour un jet d'arme donné → contributions
      groupées par facette. Renvoie toujours les 4 facettes (listes vides
      si rien). Neutre par édition. */
  forWeapon(pnj, weaponName, edition) {
    const out = { pool: [], accuracy: [], dv: [], ap: [] };
    if (!pnj) return out;
    const items = [...(pnj.equip || []), ...(pnj.augs || [])];
    for (const entry of this.CATALOG) {
      // L'item porteur de l'effet (chaîne OU objet #63, avec son indice).
      const carrier = items.find((it) => entry.match.test(ItemResolver.itemStr(it)));
      if (!carrier) continue;
      if (entry.conditional && !entry.conditional(weaponName, edition)) continue;

      let value = entry.value;
      if (entry.perRating) {
        const r = ItemResolver.itemRating(carrier); // champ .rating ou « Indice N »
        if (r == null) continue; // indice non choisi → effet inactif
        value = entry.perRating[r];
      }
      if (!value) continue; // 0 ou undefined → pas de contribution
      const bucket = out[entry.target];
      if (bucket) bucket.push({ value, source: entry.source });
    }
    return out;
  },
};
