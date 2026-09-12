"use strict";

/* ============================================================
   MONTURES — affectation d'accessoires aux emplacements d'une arme
   ------------------------------------------------------------
   Moteur PUR, sans édition : il reçoit des objets qui déclarent chacun la
   LISTE des montures qu'ils acceptent, et la liste des montures que l'arme
   offre. Il dit si tout tient, et où.

   ⚠ La règle que ce moteur sert n'est PAS « deux objets de même monture se
   gênent ». Un objet « Dessus ou Dessous » et une lunette « Dessus » tiennent
   ensemble — l'un prend Dessus, l'autre Dessous. L'ancien contrôle, qui
   comparait des chaînes, groupait « Dessus ou Dessous » à part : deux visées
   laser se disputaient une monture imaginaire, et une visée laser plus une
   lunette plus un smartgun externe passaient sans un mot. C'est un problème
   d'AFFECTATION, et il se résout comme tel.

   `montures` d'un objet : string[] (celles qu'il accepte, il n'en occupe
   qu'une), [] (aucune : cumul libre), ou "*" (n'importe laquelle).
   ============================================================ */

export const Mounts = {
  /** @param objets  [{ id, nom, montures }]
      @param slots   string[] — les montures que l'arme offre. Un nom RÉPÉTÉ
                     est une monture en plus (le Colt M23 offre trois
                     « Dessous », Livre de base SR6 p.266) : chaque position
                     de la liste est un emplacement distinct.
      @returns { ok, affectation: {id → monture}, occupation: [{monture, id|null}],
                 restants: [objets sans place] } */
  resolve(objets, slots) {
    const cand = (objets || []).filter((o) => o && (o.montures === "*" || (Array.isArray(o.montures) && o.montures.length)));
    const positions = slots.map((_, i) => i);
    const opts = cand.map((o) => positions.filter((i) => o.montures === "*" || o.montures.includes(slots[i])));
    /* COUPLAGE MAXIMUM (chemins augmentants, Kuhn). Un objet est placé si un
       chemin augmentant existe ; ceux qui n'en ont pas sont « restants ».

       ⚠ Le premier repli — retirer les objets « du moins contraint au plus
       contraint » jusqu'à ce que ça passe — évinçait un silencieux et une
       visée quand un harnais de crosse n'avait AUCUNE option : il retirait
       les deux autres avant lui, et l'écran disait « cette arme n'offre
       aucune monture » devant deux montures libres. Le couplage maximum n'a
       pas cette faute : chaque objet plaçable l'est. */
    const ordre = cand.map((_, i) => i).sort((a, b) => opts[a].length - opts[b].length); // les plus contraints d'abord
    const prisPar = new Map(); // position → index d'objet
    const augmente = (i, vu) => {
      for (const pos of opts[i]) {
        if (vu.has(pos)) continue;
        vu.add(pos);
        if (!prisPar.has(pos) || augmente(prisPar.get(pos), vu)) {
          prisPar.set(pos, i);
          return true;
        }
      }
      return false;
    };
    for (const i of ordre) augmente(i, new Set());
    // les chemins augmentants réaffectent en cascade : relire qui est placé
    const placeReel = new Set(prisPar.values());
    const restants = cand.filter((_, i) => !placeReel.has(i));
    const affectation = {};
    for (const [pos, i] of prisPar) affectation[cand[i].id] = slots[pos];
    return {
      ok: restants.length === 0,
      affectation,
      occupation: slots.map((m, pos) => ({ monture: m, id: prisPar.has(pos) ? cand[prisPar.get(pos)].id : null })),
      restants,
    };
  },
};
