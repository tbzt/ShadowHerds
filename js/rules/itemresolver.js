"use strict";

/* ============================================================
   ITEM RESOLVER — logique métier de classement d'objets (pas de
   rendu HTML), consommée par CardRenderer.
   ============================================================ */
const ItemResolver = {
  /* ---- #63 : item POLYMORPHE (chaîne legacy OU objet {str, cat, rating}) ----
     La catégorie du catalogue, jetée jusqu'ici à l'ajout, est préservée sur
     l'objet ; les lecteurs coercent via ces helpers (motif « seam », comme
     Actor pour les attributs). Tolérant : une chaîne reste une chaîne. */
  /** Chaîne d'affichage/parse d'un item (l'objet expose `.str`). */
  itemStr(item) {
    if (typeof item === "string") return item;
    return item && typeof item === "object" ? item.str || "" : "";
  },
  /** Clé de catégorie d'un item (`equipPools`), "" pour une chaîne legacy. */
  itemCat(item) {
    return item && typeof item === "object" ? item.cat || "" : "";
  },
  /** Plage d'indice NON résolue dans un libellé catalogue (« Indice 1-4 »),
      ou null si l'indice est fixe/absent. Sert à décider si l'item a besoin
      d'un stepper (#63) avant que son bonus (BonusEngine/WeaponEffects) ne
      s'active (`itemRating` renvoie null tant que le stepper n'a pas réglé
      `.rating`). */
  ratingRange(item) {
    const s = ItemResolver.itemStr(item);
    const m = s.match(/\bindice\s+(\d+)\s*[-–]\s*(\d+)/i);
    return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
  },

  /** Indice choisi d'un item : champ `rating` sinon lu dans le libellé
      (« Indice 3 » ; une plage « 1-4 » non résolue → null). */
  itemRating(item) {
    if (item && typeof item === "object" && item.rating != null)
      return item.rating;
    const s = ItemResolver.itemStr(item);
    // Forme explicite « Indice N » (hors plage « 1-4 » non résolue → null).
    const m = s.match(/\bindice\s+(\d+)(?!\s*[-–])/i);
    if (m) return parseInt(m[1], 10);
    // Forme courte des statblocks (`augsBySpecial`) : « … N » (N=1-6) juste
    // avant une stat-line « [ » ou la fin de chaîne (ex. « Tonification
    // musculaire 1 », « Booster synaptique 2 [bioware…] »). N'est consultée
    // que sur un item déjà sélectionné par un descripteur (byRating/match),
    // donc pas de faux positif sur une arme (« SCK Model 100 » non ciblé).
    const m2 = s.match(/\s([1-6])(?=\s*(?:\[|$))/);
    return m2 ? parseInt(m2[1], 10) : null;
  },

  /** Sépare l'équipement : weapons (lançables, notation [VD/PRE]) vs reste.
      Préserve la forme d'origine (chaîne ou objet) dans chaque liste. */
  splitEquip(equip) {
    const weapons = [];
    const gear = [];
    (equip || []).forEach((i) => {
      const s = ItemResolver.itemStr(i);
      if (/\[/.test(s) && /(VD|PRE)/.test(s)) weapons.push(i);
      else gear.push(i);
    });
    return { weapons, gear };
  },

  /** Équipements « … optionnel (Armure +N) » d'un PNJ Anarchy (bouclier
      anti-émeutes, bouclier balistique…) : chaque option est un choix
      tactique activable, qui relève les seuils de blessures physiques
      (pnj.armorOptions[idx] = true). */
  armorOptions(pnj) {
    if (!App.getEditionModule(pnj.edition)?.usesRiskPanel) return [];
    const out = [];
    (pnj.equip || []).forEach((item, idx) => {
      const s = ItemResolver.itemStr(item);
      if (!s) return;
      const m = s.match(/([^+(]+?)\s*optionnel\s*\(Armure\s*\+(\d+)\)/i);
      if (!m) return;
      out.push({
        idx,
        label: m[1].trim(),
        bonus: parseInt(m[2], 10),
        on: !!(pnj.armorOptions && pnj.armorOptions[idx]),
      });
    });
    return out;
  },

  /** Somme des bonus d'armure optionnels actifs. */
  armorOptionBonus(pnj) {
    return ItemResolver.armorOptions(pnj)
      .filter((o) => o.on)
      .reduce((sum, o) => sum + o.bonus, 0);
  },

  /* ---- Catalogue d'équipement (socle partagé SR5/SR6) ----
     Aplatit un `equipPools` d'édition en catégories affichables pour le
     sélecteur « ＋ Catalogue » d'EditModal. Ces helpers restent neutres :
     chaque module d'édition les appelle avec SON `equipPools` et SON
     `labelMap` (les clés et libellés lui appartiennent). */

  /** Aplati une valeur de pool (string[] direct, ou objet de sous-listes
      façon commlinks/armures {bas/moyen/haut/elite}) en un string[] à plat,
      dans l'ordre d'insertion — déterministe, partagé entre flattenEquipPools
      (qui fabrique les ids) et addEquipString (qui les résout). */
  _flatPool(value) {
    if (Array.isArray(value)) return value.slice();
    if (value && typeof value === "object")
      return Object.values(value).reduce(
        (acc, sub) => acc.concat(Array.isArray(sub) ? sub : []),
        [],
      );
    return [];
  },

  /** Aplati un `equipPools` en `[{category, items:[{id, label}]}]` pour un
      sélecteur groupé. `labelMap` fixe l'ordre ET les libellés lisibles ;
      les clés absentes de `labelMap` (ou vides) sont ignorées.
      id = "<clé>::<index à plat>" (décodable par addEquipString, référence
      la position dans `equipPools` — inchangée par le tri d'affichage
      ci-dessous) ; label = nom avant « [ » (la stat-line reste dans la
      chaîne poussée). Items triés par label (affichage seulement) pour ne
      pas dépendre de l'ordre d'ajout des suppléments dans le catalogue. */
  flattenEquipPools(equipPools, labelMap) {
    const out = [];
    Object.keys(labelMap).forEach((key) => {
      const flat = ItemResolver._flatPool(equipPools[key]);
      if (!flat.length) return;
      const items = flat.map((str, idx) => ({
        id: `${key}::${idx}`,
        label: String(str).split(" [")[0].trim(),
      }));
      items.sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }));
      out.push({ category: labelMap[key], items });
    });
    return out;
  },

  /** Retrouve la chaîne complète d'un id « <clé>::<index> » dans `equipPools`
      et la pousse dans `pnj.equip`. Retourne false si l'id ne résout rien.
      `augsKeys` (optionnel, fourni par l'appelant — SR5/SR6 uniquement) :
      clés du catalogue à tagger `cat` même à indice fixe, pour que l'item
      soit reconnu comme augmentation à l'affichage (cf. `augItems`) sans
      changer sa forme de stockage pour les autres catégories. */
  addEquipString(pnj, equipPools, id, augsKeys) {
    const [key, idxStr] = String(id).split("::");
    const str = ItemResolver._flatPool(equipPools[key])[Number(idxStr)];
    if (!str) return false;
    if (!Array.isArray(pnj.equip)) pnj.equip = [];
    // #63 : le SEAM (helpers itemStr/itemCat/itemRating + lecteurs tolérants,
    // étendu à tous les consommateurs : export Foundry, vues d'impression,
    // recherche plein-fiche, matcher drogues/véhicules) est en place. On
    // n'émet un OBJET {str, cat:key, rating} que si l'indice est une plage
    // non résolue (« Indice 1-4 » → rating:null, réglé par le stepper
    // EditModal) OU si `key` fait partie des `augsKeys` de l'édition
    // (catégorisation pour le routage Augmentations, cf. `augItems`).
    // Le reste du catalogue (valeur fixe, catégorie non taguée) reste une
    // chaîne, inchangé : blast radius minimal.
    const range = ItemResolver.ratingRange(str);
    const tagCat = range || (augsKeys || []).includes(key);
    pnj.equip.push(tagCat ? { str, cat: key, rating: range ? null : undefined } : str);
    return true;
  },

  /** #63 : items d'augmentation (cyberware/bioware) affichables sous
      « Augmentations » — `pnj.augs` (généré, sans interface d'édition) +
      les items d'`pnj.equip` catégorisés via `augsKeys` (ajoutés depuis le
      catalogue, éditables dans EditModal). Source unique pour carte, vues
      d'impression et export Foundry — ne jamais lire `pnj.augs` seul quand
      `augsKeys` existe pour l'édition. */
  augItems(pnj, augsKeys) {
    if (!augsKeys || !augsKeys.length) return pnj.augs || [];
    const fromEquip = (pnj.equip || []).filter((i) =>
      augsKeys.includes(ItemResolver.itemCat(i)),
    );
    return [...(pnj.augs || []), ...fromEquip];
  },
};
