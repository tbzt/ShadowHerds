"use strict";

/* ============================================================
   WEAPON EFFECTS — effets d'objet motorisés sur un JET d'arme, en
   CONTRIBUTIONS étiquetées par facette (refonte du modèle d'acteur).

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
   - conditional : (weaponName, edition, pnj) => bool — l'effet ne s'applique
                   qu'à certaines armes (ex. « mains nues » pour la densité
                   musculaire) ou n'est actif que sous condition d'état du
                   PNJ (ex. drogue en cours d'effet, cf. AnarchyAtouts/Drugs).
                   `pnj` est optionnel (absent des call sites hors jet réel) ;
                   ne jamais y lire de donnée requise sans garde. Absent =
                   toujours.
   - source/page : provenance affichée + audit de collecte.

   Le CATALOG ci-dessous est le socle N2. Il se peuple ensuite item par
   item contre le PDF — SANS toucher ce moteur.
   ============================================================ */
const WeaponEffects = {
  /* Prédicats de condition réutilisables. */
  isUnarmed(name) {
    return /mains nues|unarmed|à mains nues/i.test(String(name || ""));
  },

  /* Socle N2. perRating indexé par l'indice (index 0 = inutilisé).
     L'indice de l'item est lu par ItemResolver.itemRating (champ `.rating`
     de la forme objet, ou « Indice N » dans le libellé). */
  CATALOG: [
    {
      // SR5 VF p.461, table « Attaques à mains nues » :
      // VD mains nues = FOR + (Indice − 1) → +0/+1/+2/+3 aux indices 1..4.
      match: /densit[ée] musculaire/i,
      target: "dv",
      perRating: [null, 0, 1, 2, 3],
      conditional: (name) => WeaponEffects.isUnarmed(name),
      source: "Densité musculaire",
      page: "SR5 p.461",
    },
    // SR6 VF p.299-300, table « Indices de densité osseuse » : VD mains nues
    // devient PHYSIQUE, valeur absolue 3P/3P/4P/4P (table imprimée « VD »).
    // Base générée = « Mains nues [VD 2E, ...] » (sr6.js:2039) : le delta
    // NUMÉRIQUE (3-2/3-2/4-2/4-2) est correct, mais la conversion de type
    // Étourdissant→Physique n'est pas représentée par un chip additif —
    // limite connue du modèle delta actuel, cosmétique (le chiffre est juste,
    // la lettre affichée reste celle de la base).
    {
      match: /augmentation de densit[ée] osseuse/i,
      target: "dv",
      perRating: [null, 1, 1, 2, 2],
      conditional: (name) => WeaponEffects.isUnarmed(name),
      source: "Augmentation de densité osseuse",
      page: "SR6 p.299-300",
    },
    // Même table, colonne « SO » — imprimée avec un signe (+1/+2/+2/+3),
    // donc un vrai delta sur le Score Offensif de base (FOR+RÉA).
    {
      match: /augmentation de densit[ée] osseuse/i,
      target: "accuracy",
      perRating: [null, 1, 2, 2, 3],
      conditional: (name) => WeaponEffects.isUnarmed(name),
      source: "Augmentation de densité osseuse",
      page: "SR6 p.299-300",
    },
    // Anarchy 2 (p.148-149) : seul le volet VD
    // est motorisable pour ce catalogue (BonusEngine._applyAnarchy ne lit
    // jamais pnj.equip, cf. journal § 8nonies) — le volet « case de
    // blessure » de ces objets reste hors schéma, non représenté ici.
    // `match` distingue explicitement le libellé Anarchy2 (prose entre
    // parenthèses) du libellé SR6 déjà motorisé ci-dessus (forme crochets),
    // sans jamais comparer `edition` (interdit n°1).
    {
      match: /ossature renforcée en aluminium/i,
      target: "dv",
      value: 1,
      conditional: (name) => WeaponEffects.isUnarmed(name),
      source: "Ossature renforcée en aluminium",
      page: "SRAN2 p.148-149",
    },
    {
      match: /ossature renforcée en titane/i,
      target: "dv",
      value: 1,
      conditional: (name) => WeaponEffects.isUnarmed(name),
      source: "Ossature renforcée en titane",
      page: "SRAN2 p.148-149",
    },
    {
      match: /augmentation de densit[ée] osseuse \(bioware\)/i,
      target: "dv",
      value: 1,
      conditional: (name) => WeaponEffects.isUnarmed(name),
      source: "Augmentation de densité osseuse",
      page: "SRAN2 p.148-149",
    },
    // Drogues Anarchy 2 (SRAN2 p.159-160, GEAR_CATALOG.equipement) : VD
    // temporaire, actif seulement pendant la phase « effet » du toggle
    // (Drugs.state) — jamais permanent, contrairement aux entrées ci-dessus.
    // Le porteur (carrier) reste l'item catalogue tel qu'ajouté (« Kamikaze
    // [RR…, VD +1 en mêlée…] ») : le match ne dépend pas de l'état, seul le
    // conditional gate l'application. « en mêlée » = toute arme de mêlée du
    // catalogue officiel (mains nues incluses), lu via le module d'édition
    // (jamais de liste d'armes en dur dans ce moteur neutre).
    {
      match: /^Kamikaze\b/i,
      target: "dv",
      value: 1,
      conditional: (name, edition, pnj) =>
        !!App.getEditionModule(edition)?.isMeleeWeapon?.(name) &&
        !!pnj &&
        typeof Drugs !== "undefined" &&
        Drugs.state(pnj, "kamikaze") === "effect",
      source: "Kamikaze (drogue)",
      page: "SRAN2 p.159",
    },
    {
      match: /^Nitro\b/i,
      target: "dv",
      value: 1,
      conditional: (name, edition, pnj) =>
        !!App.getEditionModule(edition)?.isMeleeWeapon?.(name) &&
        !!pnj &&
        typeof Drugs !== "undefined" &&
        Drugs.state(pnj, "nitro") === "effect",
      source: "Nitro (drogue)",
      page: "SRAN2 p.159",
    },
    // Focus d'arme (SR5 p.318) — motorise le slot `focus` de l'ADEPTE : ajoute
    // son indice à la réserve d'ATTAQUE d'une arme de mêlée (l'arme liée du
    // livre ; simplifié « toute arme de mêlée du PNJ » à la génération, faute
    // d'arme liée nommée). Prédicat de mêlée = contrat d'édition
    // (isMeleeWeapon), comme les drogues « en mêlée » ci-dessus — le moteur
    // reste neutre (aucune liste d'armes en dur).
    {
      match: /focus d'arme/i,
      target: "pool",
      perRating: [null, 1, 2, 3, 4, 5, 6],
      conditional: (name, edition) =>
        !!App.getEditionModule(edition)?.isMeleeWeapon?.(name),
      source: "Focus d'arme",
      page: "SR5 p.318",
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
      // L'item porteur de l'effet (chaîne OU objet, avec son indice).
      const carrier = items.find((it) => entry.match.test(ItemResolver.itemStr(it)));
      if (!carrier) continue;
      if (entry.conditional && !entry.conditional(weaponName, edition, pnj)) continue;

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
