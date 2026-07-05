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
    if (pnj.edition !== "anarchy") return [];
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
};
