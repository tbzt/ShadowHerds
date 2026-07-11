"use strict";

/* ============================================================
   PNJ LOOKUP — résolution d'une entité à travers les pools
   (génération transitoire, Ombres portées, contacts, spiders liés
   aux serveurs, PJ). Résolution publique unique, sans dépendance
   remontante : les consommateurs l'appellent, elle ne connaît
   personne en retour. Étendue par la palette (CH-Q7) : `search`.
   ============================================================ */
const PnjLookup = {
  /** Résolution unique par id, remplace Dice._lookupPnj, UI._findPNJ et
      EditModal._find (périmètres divergents, supprimés).
      Ordre de priorité (coût de recherche : cas le plus fréquent d'abord) :
        1. Gen.pool     — généré mais pas encore sauvegardé ;
        2. Shadows      — figurant sauvegardé (Ombres portées) ;
        3. Characters   — personnage jouable ;
        4. ContactsBook — contact sauvegardé ;
        5. Servers      — spider lié à un serveur Matrice. */
  find(id) {
    if (!id) return null;
    const fromPool = Gen.findInPool(id);
    if (fromPool) return fromPool;
    const fromShadows = Shadows.data.all.find((p) => p.id === id);
    if (fromShadows) return fromShadows;
    const fromCharacters = Characters.data.all.find((p) => p.id === id);
    if (fromCharacters) return fromCharacters;
    const fromContacts = ContactsBook.data.all.find((p) => p.id === id);
    if (fromContacts) return fromContacts;
    return Servers.findSpider(id);
  },

  /** Recherche par nom/archétype à travers les bibliothèques sauvegardées
      (CH-Q7, palette de commandes). Résultats typés, bornés. Étend PnjLookup —
      jamais un résolveur concurrent (garde-fou CONTRIBUTING). */
  search(query) {
    const q = Utils.searchNorm(query || "");
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);
    const hayOf = (e) =>
      Utils.searchNorm(
        [e.name, e.archetype, e.role, e.profession, e.metatype]
          .filter(Boolean)
          .join(" "),
      );
    const out = [];
    const scan = (arr, type) => {
      if (!arr) return;
      for (const e of arr) {
        const hay = hayOf(e);
        if (words.every((w) => hay.includes(w))) {
          out.push({ id: e.id, name: e.name || "Sans nom", type });
          if (out.length >= 30) return;
        }
      }
    };
    scan(Shadows.data.all, "pnj");
    scan(Characters.data.all, "pj");
    scan(ContactsBook.data.all, "contact");
    scan(Servers.data.all, "server");
    return out.slice(0, 30);
  },
};
