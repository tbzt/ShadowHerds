"use strict";

/* ============================================================
   PNJ LOOKUP — résolution d'un PNJ par id à travers les pools
   (génération transitoire, Ombres portées, spiders liés aux
   serveurs). Résolution publique unique, sans dépendance
   remontante : les consommateurs l'appellent, elle ne connaît
   personne en retour.
   ============================================================ */
const PnjLookup = {
  /** Résolution unique d'un PNJ par id, remplace Dice._lookupPnj,
      UI._findPNJ et EditModal._find (périmètres divergents, supprimés).
      Ordre de priorité :
        1. Gen.pool     — généré mais pas encore sauvegardé (le plus récent) ;
        2. Shadows      — sauvegardé dans les Ombres portées ;
        3. Characters   — personnage jouable sauvegardé ;
        4. Servers      — spider lié à un serveur Matrice.
      Un même id n'existe jamais dans deux pools à la fois ; l'ordre
      importe seulement pour le coût de la recherche (le cas le plus
      fréquent — carte tout juste générée — d'abord). */
  find(id) {
    if (!id) return null;
    const fromPool = Gen.findInPool(id);
    if (fromPool) return fromPool;
    const fromShadows = Shadows.data.all.find((p) => p.id === id);
    if (fromShadows) return fromShadows;
    const fromCharacters = Characters.data.all.find((p) => p.id === id);
    if (fromCharacters) return fromCharacters;
    return Servers.findSpider(id);
  },
};
