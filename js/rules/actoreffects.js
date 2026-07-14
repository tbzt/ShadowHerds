"use strict";

/* ============================================================
   ACTOR EFFECTS — modificateurs SITUATIONNELS d'objet, au niveau du
   personnage (refonte acteur, suite V4/collecte V5).

   Pendant « acteur » de WeaponEffects (qui, lui, est scopé à un JET
   d'arme) : ici on collecte les effets d'objet qui bonifient un test ou
   une situation SANS surface de jet dédiée dans l'app — résistances aux
   maladies/toxines, limites de Perception spécifiques, etc.

   Décision produit (retour utilisateur) : on ne les AUTO-applique pas
   (pas de jet inexistant à motoriser — garde-fou « l'outil s'arrête à
   l'essentiel »), on les rend VISIBLES et SOURCÉS, groupés par portée,
   dans une section « Modificateurs » de la carte. Le MJ voit « Résistance
   aux maladies +3 — Défenses immunitaires optimisées » au bon moment.

   NB : ce qui correspond à un jet/valeur EXISTANT n'est PAS ici — ça va
   dans BonusEngine (attribut/armure/Score Défensif/limite globale/
   compétence/encaissement) ou WeaponEffects (facettes d'arme).

   Un effet déclare : { match, scope, perRating?|value, conditional?,
   source, page }. Indice lu par ItemResolver.itemRating. Le CATALOG se
   peuple ensuite item par item (fusion V5) sans toucher ce moteur.
   ============================================================ */
const ActorEffects = {
  CATALOG: [
    { match: /défenses immunitaires optimisées/i, scope: "Résistance aux maladies",
      perRating: [null, 1, 2, 3, 4, 5, 6], source: "Défenses immunitaires optimisées", page: "SR5 p.463" },
    { match: /extracteur de toxines/i, scope: "Résistance aux toxines",
      perRating: [null, 1, 2, 3, 4, 5, 6], source: "Extracteur de toxines", page: "SR5 p.463" },
    { match: /filtre trachéal/i, scope: "Résistance toxines (inhalées)",
      perRating: [null, 1, 2, 3, 4, 5, 6], source: "Filtre trachéal", page: "SR5 p.463" },
    { match: /amplification visuelle/i, scope: "Limite — Perception visuelle",
      perRating: [null, 1, 2, 3], source: "Amplification visuelle", page: "SR5 p.456" },
    { match: /amplification auditive/i, scope: "Limite — Perception auditive",
      perRating: [null, 1, 2, 3], source: "Amplification auditive", page: "SR5 p.456" },
  ],

  /** Modificateurs situationnels portés par un PNJ → [{scope, value, source}].
      Neutre par édition. Tolérant items chaîne/objet (#63). */
  forActor(pnj) {
    if (!pnj) return [];
    const items = [...(pnj.equip || []), ...(pnj.augs || [])];
    const out = [];
    for (const e of this.CATALOG) {
      const carrier = items.find((it) => e.match.test(ItemResolver.itemStr(it)));
      if (!carrier) continue;
      if (e.conditional && !e.conditional(pnj)) continue;
      let value = e.value;
      if (e.perRating) {
        const r = ItemResolver.itemRating(carrier);
        if (r == null) continue; // indice non choisi → inactif
        value = e.perRating[r];
      }
      if (!value) continue;
      out.push({ scope: e.scope, value, source: e.source });
    }
    return out;
  },
};
