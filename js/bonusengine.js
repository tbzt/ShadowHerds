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

  /**
   * Applique un seul objet bonus au pnj. Types supportés :
   * - initDice : dés d'initiative supplémentaires
   * - attr / attrChoice (+val) : attribut fixe ou tiré au hasard dans une liste
   * - skill / skillChoice (+val) : compétence nommée, ou tirée au hasard
   *   parmi celles que le PNJ possède déjà (cohérent avec la condition du
   *   livre « doit déjà connaître la compétence » — silencieux si aucune)
   * - armor (SR5 → pnj.armure) / sd (SR6 → pnj.sdBase)
   * - limit: "phys"|"ment"|"soc" (+val, SR5 uniquement, Limites naturelles)
   * - monitor (+cases au moniteur physique, SR5 physMon / SR6 me)
   * - stat : nom de champ pnj direct (composure, memory... déjà utilisé
   *   par les traits SR5/SR6 existants)
   * Renvoie true si un attribut a été touché (pour déclencher recalc()).
   */
  _applyOneBonus(pnj, edition, b) {
    if (!b) return false;
    let attrsTouched = false;
    if (b.initDice) pnj.initDice = (pnj.initDice || 0) + b.initDice;
    if (b.stat) pnj[b.stat] = (pnj[b.stat] || 0) + b.val;
    if (b.armor) {
      pnj.armure = (pnj.armure || 0) + b.armor;
      attrsTouched = true; // pour rafraîchir damageResist (SR5) via recalc()
    }
    if (b.sd) pnj.sdBase = (pnj.sdBase || 0) + b.sd;
    if (b.limit) {
      const key = { phys: "limPhys", ment: "limMent", soc: "limSoc" }[b.limit];
      if (key) pnj[key] = (pnj[key] || 0) + b.val;
    }
    if (b.monitor) {
      const key = edition === "sr6" ? "me" : "physMon";
      pnj[key] = (pnj[key] || 0) + b.monitor;
    }
    const attr = b.attrChoice && b.attrChoice.length ? Utils.rand(b.attrChoice) : b.attr;
    if (attr) {
      pnj.attrs[attr] = (pnj.attrs[attr] || 0) + b.val;
      attrsTouched = true;
    }
    const skillName =
      b.skillChoice && pnj.skills && pnj.skills.length
        ? Utils.rand(pnj.skills).name
        : b.skill;
    if (skillName) {
      const s = (pnj.skills || []).find(
        (sk) => sk.name.toLowerCase() === skillName.toLowerCase(),
      );
      if (s) s.val += b.val;
    }
    return attrsTouched;
  },

  /** Somme les bonus d'une liste d'objets {bonus} — traits, pouvoirs
      d'adepte, traits de métatype. */
  _sumListBonus(pnj, edition, list) {
    let attrsTouched = false;
    for (const item of list || []) {
      if (item && item.bonus && this._applyOneBonus(pnj, edition, item.bonus))
        attrsTouched = true;
    }
    return attrsTouched;
  },

  /** SR5/SR6 : cyberware + traits + pouvoirs d'adepte + métatype + Infecté
      → attrs/initiative/armure/limites/moniteur, puis recalc(). */
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

    if (this._sumListBonus(pnj, edition, pnj.traits)) attrsTouched = true;
    if (this._sumListBonus(pnj, edition, pnj.powers)) attrsTouched = true;
    if (this._sumListBonus(pnj, edition, pnj.metaTraits)) attrsTouched = true;

    // Bonus « Tous » d'un esprit mentor (une compétence), appliqué si le
    // PNJ possède la compétence visée.
    if (
      pnj.mentorSpirit &&
      pnj.mentorSpirit.bonus &&
      this._applyOneBonus(pnj, edition, pnj.mentorSpirit.bonus)
    )
      attrsTouched = true;

    // Bonus de type Infecté (initDice/sd/armor), déposé temporairement par
    // generate() sur pnj._infectedBonus.
    if (pnj._infectedBonus && this._applyOneBonus(pnj, edition, pnj._infectedBonus))
      attrsTouched = true;
    delete pnj._infectedBonus;

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

    // Esprit mentor Anarchy 2.0 : relances (RR 1) sur les tests choisis,
    // appliquées aux compétences que le PNJ possède (specRR si la
    // spécialisation correspond, sinon rr au niveau de la compétence).
    const chosen = pnj.mentorSpirit && pnj.mentorSpirit.chosen;
    for (const { skill, subspec } of chosen || []) {
      const s = this._findAnarchySkill(pnj, skill);
      if (!s) continue;
      if (
        subspec &&
        s.spec &&
        s.spec.toLowerCase().includes(subspec.toLowerCase())
      ) {
        s.specRR = (s.specRR || 0) + 1;
      } else {
        s.rr = (s.rr || 0) + 1;
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
