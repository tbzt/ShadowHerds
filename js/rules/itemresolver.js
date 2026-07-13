"use strict";

/* ============================================================
   ITEM RESOLVER — logique métier de classement d'objets (pas de
   rendu HTML), consommée par CardRenderer.
   ============================================================ */
const ItemResolver = {
  /** Sépare l'équipement : weapons (lançables, notation [VD/PRE]) vs reste. */
  splitEquip(equip) {
    const weapons = [];
    const gear = [];
    (equip || []).forEach((i) => {
      if (typeof i === "string" && /\[/.test(i) && /(VD|PRE)/.test(i))
        weapons.push(i);
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
      if (typeof item !== "string") return;
      const m = item.match(/([^+(]+?)\s*optionnel\s*\(Armure\s*\+(\d+)\)/i);
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
    pnj.equip.push(str);
    return true;
  },
};
