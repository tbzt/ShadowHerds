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
      @param slots   string[] — les montures que l'arme offre
      @returns { ok, affectation: {id → monture}, restants: [objets sans place] } */
  resolve(objets, slots) {
    const cand = (objets || []).filter((o) => o && (o.montures === "*" || (Array.isArray(o.montures) && o.montures.length)));
    const opts = cand.map((o) => (o.montures === "*" ? slots.slice() : o.montures.filter((m) => slots.includes(m))));
    // Les plus contraints d'abord : l'ordre qui échoue le plus tôt.
    const ordre = cand.map((_, i) => i).sort((a, b) => opts[a].length - opts[b].length);
    const essai = (indices) => {
      const pris = new Map();
      const aff = {};
      const bt = (k) => {
        if (k === indices.length) return true;
        const i = indices[k];
        for (const m of opts[i]) {
          if (pris.has(m)) continue;
          pris.set(m, cand[i].id);
          aff[cand[i].id] = m;
          if (bt(k + 1)) return true;
          pris.delete(m);
          delete aff[cand[i].id];
        }
        return false;
      };
      return bt(0) ? aff : null;
    };
    const tout = essai(ordre);
    if (tout) return { ok: true, affectation: tout, restants: [] };
    /* Sinon : garder le plus grand sous-ensemble plaçable, en retirant les
       objets du moins contraint au plus contraint, un à la fois. Les retirés
       sont « restants » — ce que l'écran doit nommer. */
    const garde = ordre.slice();
    const restants = [];
    while (garde.length) {
      const aff = essai(garde);
      if (aff) return { ok: false, affectation: aff, restants };
      const i = garde.pop(); // le moins contraint est en fin d'ordre
      restants.push(cand[i]);
    }
    return { ok: false, affectation: {}, restants };
  },
};
