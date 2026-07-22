"use strict";

/* ============================================================
   TAGS — le rangement PUR du Monde (étiquettes multi-valuées).
   ------------------------------------------------------------
   Un tag est une étiquette libre posée sur une entité
   (`entity.tags: [String…]`) : « corpo », « matrice », « indics ».
   Ni Faction (pas de roster partagé, pas d'objet commun : « corpo »
   sur un PNJ et « corpo » sur un contact sont deux étiquettes
   indépendantes), ni nœud de jeu (hors timeline). Voir
   PLANS/VISION_MONDE_ET_JEU.md § 3.5.

   Ce module est une FEUILLE de LECTURE : normalisation, vocabulaire,
   accesseur de fiche. L'ÉCRITURE passe par `UI` (addTag/removeTag/
   toggleTag/togglePin) — le seul écrivain d'entité sanctionné, qui
   mute TOUTES les copies (pool/biblio) et persiste par appartenance.
   `entity.tags` est un champ ADDITIF : il voyage dans `*_all`
   existant (0 migration, 0 clé Storage neuve) et meurt avec l'entité
   (aucune cascade de purge à tenir, contrairement aux rosters/arêtes).

   `PINNED` est la sentinelle réservée qui absorbe « ★ Favoris »
   (A2b) : un tag comme les autres pour le stockage, mais rendu comme
   une épingle et exclu du vocabulaire libre.
   ============================================================ */

export const Tags = {
  // Sentinelle réservée « Favoris » — un caractère de contrôle en tête la rend
  // impossible à saisir au clavier, donc sans collision avec un tag utilisateur.
  PINNED: "pinned",

  /** Normalise un libellé de tag : trim + espaces internes compactés. Renvoie
      "" pour un tag vide (à rejeter par l'appelant). Pas de casse forcée — on
      garde la graphie saisie ; la déduplication est insensible à la casse. */
  normalize(t) {
    return String(t == null ? "" : t)
      .replace(/\s+/g, " ")
      .trim();
  },

  /** Les tags LIBRES d'une entité (sentinelle réservée exclue), toujours un
      tableau. Accesseur de fiche — lecture seule. */
  of(entity) {
    if (!entity || !Array.isArray(entity.tags)) return [];
    return entity.tags.filter((t) => t && t !== this.PINNED);
  },

  /** Une entité est-elle épinglée (Favoris) ? */
  isPinned(entity) {
    return !!(entity && Array.isArray(entity.tags) && entity.tags.includes(this.PINNED));
  },

  /** Le VOCABULAIRE : l'union triée des tags libres déjà posés sur une entité
      quelconque (pour proposer la réutilisation dans le picker). Scan de lecture
      des collections vivantes + du pool de génération. Casse-insensible pour la
      dédup, première graphie rencontrée conservée. */
  vocabulary() {
    const seen = new Map(); // clé minuscule → graphie affichée
    const scan = (arr) => {
      if (!arr) return;
      for (const e of arr) {
        if (!e || !Array.isArray(e.tags)) continue;
        for (const raw of e.tags) {
          if (!raw || raw === this.PINNED) continue;
          const t = this.normalize(raw);
          if (!t) continue;
          const k = t.toLowerCase();
          if (!seen.has(k)) seen.set(k, t);
        }
      }
    };
    if (typeof Gen !== "undefined") scan(Gen.pool);
    if (typeof Shadows !== "undefined") scan(Shadows.data && Shadows.data.all);
    if (typeof Characters !== "undefined") scan(Characters.data && Characters.data.all);
    if (typeof ContactsBook !== "undefined") scan(ContactsBook.data && ContactsBook.data.all);
    if (typeof Servers !== "undefined" && Servers.data) {
      // les serveurs portent leurs araignées comme entités taggables
      scan(Servers.data.all);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, "fr"));
  },
};

// Pont couche 1 (voir PLANS/PLAN_MODULES_ES.md) : global classique tant que les
// couches hautes n'ont pas basculé en `import`.
window.Tags = Tags;
