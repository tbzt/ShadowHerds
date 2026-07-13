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
      (CH-Q7, palette de commandes ; mentions `@`, E7). Résultats typés, bornés.
      Étend PnjLookup — jamais un résolveur concurrent (garde-fou CONTRIBUTING).
      Tri : les entités dont le NOM commence par la saisie d'abord — c'est ce
      qu'attend l'auteur qui tape « @N » pour retrouver « Nita ». */
  search(query) {
    const q = Utils.searchNorm(query || "");
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);
    const first = words[0];
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
          // rang 0 : le nom commence par la saisie ; rang 1 : simple
          // sous-chaîne d'un autre champ (archétype, rôle…).
          const rank = Utils.searchNorm(e.name || "").startsWith(first) ? 0 : 1;
          out.push({ id: e.id, name: e.name || "Sans nom", type, _rank: rank });
        }
      }
    };
    scan(Shadows.data.all, "pnj");
    scan(Characters.data.all, "pj");
    scan(ContactsBook.data.all, "contact");
    scan(Servers.data.all, "server");
    // tri stable (JS moderne) : préserve l'ordre des collections à rang égal.
    out.sort((a, b) => a._rank - b._rank);
    return out.slice(0, 30).map(({ _rank, ...r }) => r);
  },

  /** id → { id, name, type } (même forme qu'un résultat de `search`), pour
      résoudre le NOM COURANT d'une mention `@[…](id)` et y naviguer. Balaie
      les quatre bibliothèques sauvegardées offertes par `search` (PNJ, PJ,
      contact, serveur). `null` si l'id ne résout plus (entité supprimée). */
  locate(id) {
    if (!id) return null;
    const hit = (arr, type) => {
      const e = arr && arr.find((x) => x.id === id);
      return e ? { id: e.id, name: e.name || "Sans nom", type } : null;
    };
    return (
      hit(Shadows.data.all, "pnj") ||
      hit(Characters.data.all, "pj") ||
      hit(ContactsBook.data.all, "contact") ||
      hit(Servers.data.all, "server")
    );
  },
};
