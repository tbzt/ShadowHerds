"use strict";

/* ============================================================
   BONUS ENGINE — applique automatiquement les bonus mécaniques
   d'équipement et de traits aux PNJ générés.

   Trois sources, un seul point d'entrée (apply(pnj, edition)) :
   - Cyberware/équipement SR5/SR6 (REA/FOR/CON/AGI/INT, initiative,
     armure dermique) repérés dans pnj.equip + pnj.augs.
   - Synergie smartgun (arme) / smartlink (PNJ) : stocke un flag
     pnj.smartlink consommé par WeaponRoll.resolvePool() au moment
     du jet (le bonus dépend de l'arme lancée, pas figé à la génération).
   - Atouts Anarchy « RR N aux tests de X » : appliqués à pnj.skills.

   Les bonus d'attribut/armure SR5/SR6 sont suivis d'un appel à
   EditionXXX.recalc(pnj), qui existe déjà (sr5.js/sr6.js) et recalcule
   Limites/Défense/Moniteurs/etc. à partir de pnj.attrs — pas de formule
   dupliquée ici.
   ============================================================ */
const BonusEngine = {
  /* Table de correspondance « préfixe du libellé déjà existant dans
     equipPools.cyberware/equipSpecial/augsBySpecial » → bonus.
     Pas de réécriture des libellés : on les reconnaît tels quels. */
  CYBER_BONUS: {
    sr5: [
      ["Réflexes câblés 1", { initDice: 1 }],
      ["Réflexes câblés 2", { initDice: 2 }],
      ["Accroissement de réaction", { attr: "REA", val: 1 }],
      ["Tonification musculaire", { attr: "FOR", val: 1 }],
      ["Armure dermique", { armor: 1 }],
    ],
    sr6: [
      ["Réflexes câblés 1", { initDice: 1 }],
      ["Réflexes câblés 2", { initDice: 2 }],
      ["Amplificateur de réaction 2", { attr: "RÉA", val: 2 }],
      ["Amplificateurs synaptiques 2", { attr: "INT", val: 2 }],
      ["Tonification musculaire 3", { attr: "FOR", val: 3 }],
      ["Renforcement musculaire 3", { attr: "FOR", val: 3 }],
      ["Ossature renforcée", { attr: "CON", val: 2 }],
      ["Substituts musculaires", { attr: "AGI", val: 2 }],
      ["Armure dermique 3", { sd: 3 }],
      ["Armure dermique 4", { sd: 4 }],
    ],
  },

  /* Bonus de trait : appliqué directement sur les objets traits de
     content.js (champ `bonus`), lu ici depuis pnj.traits. Ce tableau ne
     sert qu'à documenter le schéma — les valeurs vivent dans content.js. */

  /** Repère le cyberware/équipement présent et cumule les bonus. */
  _collectCyberBonuses(pnj, edition) {
    const table = this.CYBER_BONUS[edition] || [];
    const items = [...(pnj.equip || []), ...(pnj.augs || [])];
    const totals = { initDice: 0, armor: 0, sd: 0, attrs: {} };
    for (const item of items) {
      if (typeof item !== "string") continue;
      for (const [prefix, bonus] of table) {
        if (!item.startsWith(prefix)) continue;
        if (bonus.initDice) totals.initDice += bonus.initDice;
        if (bonus.armor) totals.armor += bonus.armor;
        if (bonus.sd) totals.sd += bonus.sd;
        if (bonus.attr) {
          totals.attrs[bonus.attr] = (totals.attrs[bonus.attr] || 0) + bonus.val;
        }
      }
    }
    return totals;
  },

  /** Détecte un smartlink (implanté ou externe) dans l'équipement du PNJ. */
  detectSmartlink(pnj) {
    const items = [...(pnj.equip || []), ...(pnj.augs || [])];
    let implanted = false;
    let external = false;
    for (const item of items) {
      if (typeof item !== "string") continue;
      if (!/smartlink/i.test(item)) continue;
      if (/cybernétique|implant/i.test(item)) implanted = true;
      else external = true;
    }
    if (!implanted && !external) return null;
    return { implanted, external };
  },

  /** Applique le bonus du trait choisi (champ `bonus` sur l'objet trait). */
  _applyTraitBonus(pnj, edition) {
    const trait = (pnj.traits || []).find((t) => t && t.bonus);
    if (!trait) return false;
    const b = trait.bonus;
    let attrsTouched = false;
    if (b.initDice) pnj.initDice = (pnj.initDice || 0) + b.initDice;
    if (b.stat) pnj[b.stat] = (pnj[b.stat] || 0) + b.val;
    if (b.attr) {
      pnj.attrs[b.attr] = (pnj.attrs[b.attr] || 0) + b.val;
      attrsTouched = true;
    }
    if (b.skill) {
      const s = (pnj.skills || []).find(
        (sk) => sk.name.toLowerCase() === b.skill.toLowerCase(),
      );
      if (s) s.val += b.val;
    }
    return attrsTouched;
  },

  /** SR5/SR6 : cyberware + trait + Infecté → attrs/initiative/armure, puis recalc(). */
  _applySR(pnj, edition, EditionModule) {
    const totals = this._collectCyberBonuses(pnj, edition);
    let attrsTouched = false;

    if (totals.initDice) pnj.initDice = (pnj.initDice || 0) + totals.initDice;
    if (totals.armor) pnj.armure = (pnj.armure || 0) + totals.armor;
    if (totals.sd) pnj.sdBase = (pnj.sdBase || 0) + totals.sd;
    for (const [attr, val] of Object.entries(totals.attrs)) {
      pnj.attrs[attr] = (pnj.attrs[attr] || 0) + val;
      attrsTouched = true;
    }

    if (this._applyTraitBonus(pnj, edition)) attrsTouched = true;

    // Bonus de type Infecté (initDice/sd/armor), déposé temporairement par
    // generate() sur pnj._infectedBonus.
    if (pnj._infectedBonus) {
      if (pnj._infectedBonus.initDice)
        pnj.initDice = (pnj.initDice || 0) + pnj._infectedBonus.initDice;
      if (pnj._infectedBonus.sd) pnj.sdBase = (pnj.sdBase || 0) + pnj._infectedBonus.sd;
      if (pnj._infectedBonus.armor) {
        pnj.armure = (pnj.armure || 0) + pnj._infectedBonus.armor;
        attrsTouched = true; // pour rafraîchir damageResist (SR5) via recalc()
      }
      delete pnj._infectedBonus;
    }

    if (attrsTouched && EditionModule && typeof EditionModule.recalc === "function") {
      EditionModule.recalc(pnj);
    }

    pnj.smartlink = this.detectSmartlink(pnj);
  },

  /* ========================================================
     ANARCHY — atouts « RR N aux tests de X (sous-spé) [et de Y...] »
     ======================================================== */

  /** Découpe le texte d'un atout en { rr, skills:[{name, subspec}] } ou null. */
  parseAnarchyRR(text) {
    const m = String(text || "").match(/RR\s*(\d+)\s+aux tests d[e’']\s*(.+)/i);
    if (!m) return null;
    const rr = parseInt(m[1], 10);
    // Coupe à la première ponctuation de fin de phrase qui ne fait pas
    // partie d'une parenthèse de sous-spécialisation.
    const rest = m[2].split(/[.;]/)[0];
    const segments = rest.split(/\s+et\s+(?:de\s+|d[’'])?/i);
    const skills = [];
    for (const seg of segments) {
      const sm = seg.trim().match(/^([^(]+?)\s*(?:\(([^)]+)\))?$/);
      if (!sm) continue;
      const name = sm[1].trim();
      if (!name) continue;
      skills.push({ name, subspec: sm[2] ? sm[2].trim() : null });
    }
    return skills.length ? { rr, skills } : null;
  },

  /** Trouve la compétence du PNJ correspondant à un nom d'atout (insensible
      à la casse, tolère les variantes "Combat rapproché" / "Furtivité"...). */
  _findAnarchySkill(pnj, name) {
    const target = name.toLowerCase();
    return (pnj.skills || []).find((s) => {
      const n = s.name.toLowerCase();
      return n === target || n.includes(target) || target.includes(n);
    });
  },

  _applyAnarchy(pnj) {
    for (const edgeText of pnj.edges || []) {
      const parsed = this.parseAnarchyRR(edgeText);
      if (!parsed) continue;
      for (const { name, subspec } of parsed.skills) {
        const skill = this._findAnarchySkill(pnj, name);
        if (!skill) continue;
        if (
          subspec &&
          skill.spec &&
          skill.spec.toLowerCase().includes(subspec.toLowerCase())
        ) {
          skill.specRR = (skill.specRR || 0) + parsed.rr;
        } else {
          skill.rr = (skill.rr || 0) + parsed.rr;
        }
      }
    }
  },

  /** Point d'entrée unique, appelé en fin de generate() de chaque édition. */
  apply(pnj, edition) {
    if (!pnj) return pnj;
    if (edition === "anarchy") {
      this._applyAnarchy(pnj);
      return pnj;
    }
    const EditionModule = edition === "sr5" ? EditionSR5 : EditionSR6;
    this._applySR(pnj, edition, EditionModule);
    return pnj;
  },
};
