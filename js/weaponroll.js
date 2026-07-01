"use strict";

/* ============================================================
   WEAPON ROLL — relie une arme à sa réserve d'attaque, et
   réconcilie arme ↔ compétence à la génération.

   Une arme est affichée comme une chaîne descriptive (SR5/SR6,
   ex. « Katana [PRE 6, … VD 7P, PA -2] ») ou un objet (Anarchy).
   Pour la rendre lançable, on infère la compétence de combat à
   partir de mots-clés du nom, on récupère la valeur de cette
   compétence sur le PNJ (en remontant au groupe « (GC) » ou à la
   famille de combat si besoin), puis on ajoute l'attribut lié.

   Pool d'attaque = compétence + attribut lié.
   SR5 : la Précision (PRE) de l'arme plafonne le nombre de succès.

   reconcile(pnj, edition) : appelée en fin de génération, garantit
   que l'arme principale du PNJ a bien sa compétence (renomme une
   compétence de combat existante si elle ne correspond pas).
   ============================================================ */
const WeaponRoll = {
  /* Mots-clés du nom d'arme → compétence canonique (par édition).
     L'ordre compte : du plus spécifique au plus générique. */
  KEYWORD_SKILL: {
    sr5: [
      [/lance-flamme|lance-roquet|missile|mitrailleuse lourde|canon/i, "Armes lourdes"],
      [/grenade|lance-grenade/i, "Armes de jet"],
      [/ak-97|fn har|hk xm30|ares alpha|fusil d.assaut/i, "Armes automatiques"],
      [/mitraillette|smg|hk[\s-]|ingram|smartgun x|ceska|uzi/i, "Armes automatiques"],
      [/sniper|ranger arms|remington|barrett|fusil de précision|fusil de chasse|fusil à pompe|shotgun/i, "Armes à feu"],
      [/pistolet|predator|manhunter|browning|colt|ruger|warhawk|fichetti|ares|beretta|revolver|taser|defiance|shocker/i, "Armes à feu"],
      [/katana|épée|sabre|hache|couteau|lame|griffe|tranchant|crocs?|morsure|queue/i, "Combat rapproché"],
      [/matraque|massue|barre|bâton|gourdin|contondant|électromatraque|gants?|poing/i, "Combat rapproché"],
      [/arc|arbalète|shuriken|étoile|javelot|jet/i, "Armes de jet"],
    ],
    sr6: [
      [/lance-flamme|lance-roquet|missile|canon|lourde/i, "Armes à feu"],
      [/grenade|flash-pak/i, "Armes à feu"],
      [/ak-97|fn har|ares alpha|franchi|spas|fusil|sniper|pompe|shotgun/i, "Armes à feu"],
      [/mitraillette|smg|hk mp|ingram|smartgun/i, "Armes à feu"],
      [/pistolet|predator|colt|cavalier|fichetti|beretta|revolver|taser|defiance|hk p/i, "Armes à feu"],
      [/katana|épée|sabre|hache|couteau|lame|griffe|tranchant|crocs?|morsure|queue/i, "Combat rapproché"],
      [/matraque|massue|barre|bâton|télescopique|électro|gants?|poing|contondant/i, "Combat rapproché"],
    ],
    anarchy: [
      [/pistolet|fusil|arme à distance|smg|mitrail|sniper|revolver|taser/i, "Armes à distance"],
      [/katana|épée|sabre|hache|couteau|lame|griffe|matraque|bâton|mains? nues|poing|contondant|tranchant|rapproché/i, "Combat rapproché"],
      [/grenade|jet|arc|arbalète/i, "Armes à distance"],
    ],
  },

  FALLBACK_SKILL: {
    sr5: "Armes à feu",
    sr6: "Armes à feu",
    anarchy: "Armes à distance",
  },

  /* Groupes de compétences SR5 (« (GC) ») et compétences couvertes.
     Une arme reliée à « Armes automatiques » est jouable avec le
     groupe « Armes à feu (GC) ». Clés/valeurs en minuscules. */
  SR5_GROUPS: {
    "armes à feu": ["armes à feu", "armes automatiques", "armes à distance"],
    "combat rapproché": [
      "combat rapproché",
      "armes tranchantes",
      "armes contondantes",
      "combat à mains nues",
      "arts martiaux",
    ],
    athlétisme: ["athlétisme", "gymnastique", "course", "natation", "escalade"],
  },

  _groupCovering(canonical) {
    const target = this._baseName(canonical).toLowerCase();
    for (const [group, members] of Object.entries(this.SR5_GROUPS)) {
      if (members.includes(target)) return group;
    }
    return null;
  },

  /** Famille de combat d'une compétence : 'ranged' | 'melee' | null. */
  _combatFamily(skillName) {
    const n = this._baseName(skillName).toLowerCase();
    const ranged = [
      "armes à feu",
      "armes automatiques",
      "armes à distance",
      "pistolets",
      "fusils",
      "armes lourdes",
      "armes de jet",
      "armes longues",
    ];
    const melee = [
      "combat rapproché",
      "armes tranchantes",
      "armes contondantes",
      "combat à mains nues",
      "arts martiaux",
      "armes blanches",
    ];
    if (ranged.some((r) => n === r || n.includes(r))) return "ranged";
    if (melee.some((m) => n === m || n.includes(m))) return "melee";
    return null;
  },

  /** Analyse une arme (chaîne ou objet) → { name, pre, vd }. */
  parse(weapon) {
    if (weapon && typeof weapon === "object") {
      return { name: weapon.name || "", pre: null, vd: weapon.vd ?? null };
    }
    const str = String(weapon || "");
    const name = (str.split("[")[0] || "").trim();
    const preMatch = str.match(/PRE\s*(\d+)/i);
    const vdMatch = str.match(/VD\s*(\d+)/i);
    return {
      name,
      pre: preMatch ? parseInt(preMatch[1], 10) : null,
      vd: vdMatch ? parseInt(vdMatch[1], 10) : null,
    };
  },

  /** Compétence canonique gouvernant cette arme. */
  skillFor(weaponName, edition) {
    const rules = this.KEYWORD_SKILL[edition] || [];
    for (const [re, skill] of rules) {
      if (re.test(weaponName)) return skill;
    }
    return this.FALLBACK_SKILL[edition] || "Armes à feu";
  },

  /** Nom de compétence sans suffixe de groupe « (GC) » ni parenthèses. */
  _baseName(skillName) {
    return String(skillName)
      .replace(/\s*\((GC|[^)]*)\)\s*$/i, "")
      .trim();
  },

  /**
   * Cherche la valeur d'une compétence sur le PNJ (exact → partiel →
   * groupe GC → famille de combat). Renvoie { val, matched, approx } ou null.
   */
  findSkillValue(pnj, canonicalSkill) {
    const skills = pnj.skills || [];
    const target = this._baseName(canonicalSkill).toLowerCase();
    let best = null;

    for (const s of skills) {
      if (this._baseName(s.name).toLowerCase() === target) {
        if (!best || s.val > best.val) best = { val: s.val, matched: s.name };
      }
    }
    if (best) return best;

    for (const s of skills) {
      const base = this._baseName(s.name).toLowerCase();
      if (base.includes(target) || target.includes(base)) {
        if (!best || s.val > best.val) best = { val: s.val, matched: s.name };
      }
    }
    if (best) return best;

    const group = this._groupCovering(canonicalSkill);
    if (group) {
      for (const s of skills) {
        if (this._baseName(s.name).toLowerCase() === group) {
          if (!best || s.val > best.val) best = { val: s.val, matched: s.name };
        }
      }
    }
    if (best) return best;

    const family = this._combatFamily(canonicalSkill);
    if (family) {
      for (const s of skills) {
        if (this._combatFamily(s.name) === family) {
          if (!best || s.val > best.val)
            best = { val: s.val, matched: s.name, approx: true };
        }
      }
    }
    return best;
  },

  /**
   * Construit la réserve d'attaque pour une arme donnée.
   * @returns {object|null}
   */
  resolvePool(pnj, weapon, edition) {
    const parsed = this.parse(weapon);
    if (!parsed.name) return null;

    const canonical = this.skillFor(parsed.name, edition);
    const found = this.findSkillValue(pnj, canonical);

    const cat = (typeof SkillCatalog !== "undefined" && SkillCatalog[edition]) || {};
    const attr = cat[canonical] || "AGI";
    const attrVal = (pnj.attrs && pnj.attrs[attr]) || 0;

    const skillVal = found ? found.val : 0;
    const basePool = skillVal + attrVal;
    if (basePool < 1) return null;

    let rr = 0;
    if (edition === "anarchy" && found) {
      const sObj = (pnj.skills || []).find((s) => s.name === found.matched);
      if (sObj && sObj.rr) rr = sObj.rr;
    }

    // Synergie smartgun (arme) / smartlink (PNJ) — SR5 : +2 implanté / +1
    // externe ; SR6 : +1 flat. Voir BonusEngine.detectSmartlink().
    let smartBonus = 0;
    if (
      (edition === "sr5" || edition === "sr6") &&
      pnj.smartlink &&
      /smartgun|smartlink/i.test(String(weapon))
    ) {
      smartBonus =
        edition === "sr5" ? (pnj.smartlink.implanted ? 2 : 1) : 1;
    }
    const pool = basePool + smartBonus;

    return {
      weaponName: parsed.name,
      skill: canonical,
      matchedSkill: found ? found.matched : null,
      approx: found ? !!found.approx : false,
      attr,
      attrVal,
      skillVal,
      pool,
      smartBonus,
      limit: edition === "sr5" ? parsed.pre : null,
      rr,
      edition,
    };
  },

  /* ========================================================
     RÉCONCILIATION ARME ↔ COMPÉTENCE (à la génération)
     ======================================================== */

  /** Liste des weapons (chaînes ou objets) portées par le PNJ. */
  _weaponsOf(pnj, edition) {
    if (edition === "anarchy") return pnj.weapons || [];
    return (pnj.equip || []).filter(
      (e) => typeof e === "string" && /\[/.test(e) && /(VD|PRE)/.test(e),
    );
  },

  /**
   * Garantit la cohérence arme principale ↔ compétence.
   * Pour chaque famille de combat utilisée par les armes du PNJ, si
   * aucune compétence de cette famille ne correspond exactement à
   * l'arme, on renomme une compétence de combat de la MÊME famille
   * vers la compétence attendue (en gardant la valeur). On ne touche
   * pas les PNJ sans aucune compétence de combat (non-combattants).
   */
  reconcile(pnj, edition) {
    if (!pnj || !pnj.skills) return pnj;
    const weapons = this._weaponsOf(pnj, edition);
    if (!weapons.length) return pnj;

    // L'arme « principale » : la première arme à feu, sinon la première.
    const parsed = weapons.map((w) => this.parse(w)).filter((p) => p.name);
    if (!parsed.length) return pnj;
    const primary =
      parsed.find((p) => this._combatFamily(this.skillFor(p.name, edition)) === "ranged") ||
      parsed[0];

    const canonical = this.skillFor(primary.name, edition);
    const family = this._combatFamily(canonical);
    if (!family) return pnj;

    // Déjà une compétence qui correspond exactement (hors approx) ?
    const exact = this._hasExactSkill(pnj, canonical, edition);
    if (exact) return pnj;

    // Sinon, renommer une compétence de la même famille vers `canonical`.
    const candidates = pnj.skills.filter(
      (s) => this._combatFamily(s.name) === family,
    );
    if (!candidates.length) return pnj; // non-combattant pour cette famille

    // On renomme celle de plus haute valeur (la « principale »).
    candidates.sort((a, b) => b.val - a.val);
    const toRename = candidates[0];

    // En SR5 on préserve le suffixe de groupe si la compétence en avait un
    // et que la cible appartient au même groupe.
    const hadGroup = /\(GC\)\s*$/i.test(toRename.name);
    const targetGroup = this._groupCovering(canonical);
    const renameTo =
      hadGroup && targetGroup ? `${canonical} (GC)` : canonical;

    // Éviter un doublon si une autre compétence porte déjà ce nom.
    const exists = pnj.skills.some(
      (s) => s !== toRename && this._baseName(s.name).toLowerCase() === canonical.toLowerCase(),
    );
    if (!exists) {
      toRename.name = renameTo;
      // Conserver l'attribut lié si le modèle le stocke (Anarchy)
      if (toRename.attr && typeof SkillCatalog !== "undefined") {
        const cat = SkillCatalog[edition] || {};
        if (cat[canonical]) toRename.attr = cat[canonical];
      }
    }
    return pnj;
  },

  /** Le PNJ a-t-il déjà une compétence correspondant exactement (ou via
      groupe GC) à l'arme — c.-à-d. utilisable sans approximation ? */
  _hasExactSkill(pnj, canonical, edition) {
    const target = this._baseName(canonical).toLowerCase();
    for (const s of pnj.skills) {
      if (this._baseName(s.name).toLowerCase() === target) return true;
    }
    // Couverture par groupe SR5
    if (edition === "sr5") {
      const group = this._groupCovering(canonical);
      if (group) {
        for (const s of pnj.skills) {
          if (this._baseName(s.name).toLowerCase() === group) return true;
        }
      }
    }
    return false;
  },
};
