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
  /** Indice choisi d'un item : champ `rating` sinon lu dans le libellé
      (« Indice 3 » ; une plage « 1-4 » non résolue → null). */
  itemRating(item) {
    if (item && typeof item === "object" && item.rating != null)
      return item.rating;
    const m = ItemResolver.itemStr(item).match(/indice\s+(\d+)(?!\s*[-–])/i);
    return m ? parseInt(m[1], 10) : null;
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
      id = "<clé>::<index à plat>" (décodable par addEquipString) ;
      label = nom avant « [ » (la stat-line reste dans la chaîne poussée). */
  flattenEquipPools(equipPools, labelMap) {
    const out = [];
    Object.keys(labelMap).forEach((key) => {
      const flat = ItemResolver._flatPool(equipPools[key]);
      if (!flat.length) return;
      out.push({
        category: labelMap[key],
        items: flat.map((str, idx) => ({
          id: `${key}::${idx}`,
          label: String(str).split(" [")[0].trim(),
        })),
      });
    });
    return out;
  },

  /** Retrouve la chaîne complète d'un id « <clé>::<index> » dans `equipPools`
      et la pousse dans `pnj.equip`. Retourne false si l'id ne résout rien. */
  addEquipString(pnj, equipPools, id) {
    const [key, idxStr] = String(id).split("::");
    const str = ItemResolver._flatPool(equipPools[key])[Number(idxStr)];
    if (!str) return false;
    if (!Array.isArray(pnj.equip)) pnj.equip = [];
    // #63 : le SEAM (helpers itemStr/itemCat/itemRating + lecteurs tolérants)
    // est en place ; l'ÉMISSION en objet {str, cat:key} est prête mais
    // volontairement différée au lot « flip » (reste à rendre tolérants :
    // export Foundry, clé d'appareil matriciel, drug matcher, utils, état de
    // combat). Tant que le flip n'est pas fait, on pousse la chaîne (aucun
    // objet en circulation → arbre 100 % fonctionnel).
    pnj.equip.push(str);
    return true;
  },
};
