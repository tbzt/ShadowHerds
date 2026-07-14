"use strict";

/* ============================================================
   EXPORT ANARCHY 2 → FOUNDRY VTT (système VincentVk9373/sra2)

   Fichier COMPAGNON de l'édition Anarchy2 : tout le savoir spécifique
   « comment un PNJ Anarchy2 se traduit en acteur Foundry » vit ici,
   pas dans un consommateur neutre (prohibition #1). Le module
   s'auto-enregistre sur EditionAnarchy2 via `foundryExport`, lu par
   FoundryExport (contrôleur neutre) à travers App.editionModule.

   Cible : Actor type unique `character` (PJ et PNJ confondus côté
   sra2, pas de type "grunt" séparé). Items : `skill`, `specialization`,
   `feat` (fourre-tout via featType), `metatype`. Véhicules liés
   (Vehicles.linkedTo) deviennent des Actor `vehicle` séparés,
   retournés à part par buildVehicleActors() — un fichier par véhicule,
   Foundry n'important qu'un acteur par fichier.

   Aucune réutilisation de noms possible côté équipement/sorts/edges
   (catalogues sra2 = noms de saveur fictifs). Les ARMES en revanche
   sont classées par catégorie/formule via le catalogue officiel déjà
   présent dans EditionAnarchy2 (WEAPON_CATALOG/resolveWeapon), réutilisé
   tel quel — pas de duplication de la logique VD mêlée (FOR+bonus).
   ============================================================ */
const FoundryAnarchy2Export = {
  /* ----------------------------------------------------------
     COMPÉTENCES — 16 slugs canoniques de sra2 (constants.ts
     SKILL_NAME_TO_SLUG) + 4 cas particuliers documentés (aucune
     entrée 1:1 côté sra2 pour Astral/Matricielle/Cybercombat/Course).
  ---------------------------------------------------------- */
  SKILL_SLUG: {
    "Combat rapproché": "close-combat",
    "Armes à distance": "ranged-weapons",
    "Athlétisme": "athletics",
    "Furtivité": "stealth",
    "Piratage": "cracking",
    "Ingénierie": "engineering",
    "Électronique": "electronics",
    "Pilotage": "piloting",
    "Sorcellerie": "sorcery",
    "Conjuration": "conjuration",
    "Technomancie": "technomancer",
    "Influence": "influence",
    "Perception": "perception",
    "Survie": "survival",
    "Réseau": "networking",
    "Combat astral": "astral-combat",
    // --- Cas particuliers (pas de slot sra2 dédié) ---
    // Perception astrale (pas combat) : aucune compétence, devient
    // astralPerception:true sur le feat awakened (cf. _awakenedFeat).
    "Astral": "@astral",
    // Matricielle/Cybercombat : pas d'arme, pas de skill combat dédié
    // côté sra2 → routés vers cracking (hacking) + stats cyberdeck.
    "Matricielle": "cracking",
    // Variantes adjectivales rencontrées dans 2 edges ("RR 1 aux tests
    // Matriciels[ d'analyse]", js/editions/anarchy2.js:3236,3331) : le
    // parseur capture le texte intégral après "aux tests", pas juste
    // le premier mot.
    "Matriciels": "cracking",
    "Matriciels d'analyse": "cracking",
    "Cybercombat": "cracking",
    // Course = sous-compétence d'Athlétisme (spec_running), pas un skill séparé.
    "Course": "athletics",
    "Sociale": "influence",
    // Intimidation/Négociation sont des compétences séparées côté ShadowHerds
    // Anarchy2 mais des facettes d'Influence côté sra2 (comme "Sociale").
    // Sans ce mapping elles étaient droppées silencieusement (repéré par le
    // diagnostic FoundryExport.note).
    "Intimidation": "influence",
    "Négociation": "influence",
  },

  /* Attribut lié par slug (SkillDataModel.linkedAttribute), tiré de
     constants.ts SKILL_DEFINITIONS. */
  SKILL_ATTR: {
    "close-combat": "agility", "ranged-weapons": "agility", "athletics": "strength",
    "stealth": "agility", "cracking": "logic", "engineering": "logic",
    "electronics": "logic", "piloting": "agility", "sorcery": "willpower",
    "conjuration": "logic", "technomancer": "logic", "influence": "charisma",
    "perception": "logic", "survival": "willpower", "networking": "charisma",
    "astral-combat": "willpower",
  },

  /* ShadowHerds (code FR) → attribut sra2. */
  ATTR_MAP: { FOR: "strength", AGI: "agility", VOL: "willpower", LOG: "logic", CHA: "charisma" },

  /* ----------------------------------------------------------
     ARMES — classification par CATÉGORIE/FORMULE (pas par nom exact :
     les catalogues sra2 sont des noms de saveur fictifs). Table ORDONNÉE
     de règles (spécifique avant générique), matchée en sous-chaîne sur le
     nom → tolère les variantes et accessoires (« Pistolet lourd silencieux »,
     « Arme longue (katana, batte) »…) sans re-tomber en custom-weapon.
     Slugs = WEAPON_TYPES du système sra2 (item-feat.ts), eux-mêmes calés
     sur la table d'armes Anarchy 2 (p.141-144). Correspondances vérifiées
     par croisement des VD/portées (ex. « Lame dissimulée » VD FOR+1 →
     short-weapons ; « Lame monofilament » VD FOR+2 → long-weapons ;
     « Pistolet lourd silencieux » VD 5, [OK/OK/Dés./–] → heavy-pistols).
  ---------------------------------------------------------- */
  WEAPON_TYPE_RULES: [
    // Mêlée
    [/mains?\s*nues/i, "bare-hands"],
    [/[ée]lectromatraque|matraque|massue|b[aâ]ton|gourdin|contondant/i, "advanced-melee"],
    [/lame monofilament/i, "long-weapons"],
    [/arme longue|katana|hache|[ée]p[ée]e|sabre|claymore/i, "long-weapons"],
    [/couteau|lame|dague|poignard/i, "short-weapons"],
    // Distance
    [/taser/i, "tasers"],
    [/pistolet de poche/i, "pocket-pistols"],
    [/pistolet l[ée]ger/i, "light-pistols"],
    [/pistolet automatique/i, "automatic-pistols"],
    [/pistolet lourd/i, "heavy-pistols"],
    [/mitraillette/i, "smgs"],
    [/fusil d'assaut/i, "assault-rifles"],
    [/fusil de pr[ée]cision/i, "sniper-rifles"],
    [/shotgun|fusil à pompe/i, "shotguns"],
    [/mitrailleuse/i, "machine-guns"],
    [/grenade/i, "grenades"],
  ],

  /** Nom d'arme FR → slug weaponType sra2, ou null si aucune règle ne
      matche (→ custom-weapon + diagnostic). */
  _classifyWeaponType(name) {
    for (const [re, slug] of this.WEAPON_TYPE_RULES) if (re.test(name)) return slug;
    return null;
  },

  /* Noms hors catalogue à ne JAMAIS exporter en itemWeapon (pas de
     profil de portée sra2 correspondant) : Cybercombat/Matrice → stats
     cyberdeck+compétence ; Frappe élémentaire → pouvoir d'adepte. */
  _isNonWeaponName(name) {
    return /cybercombat|matricie|frappe élémentaire/i.test(name);
  },

  /* Jeton de portée FR (catalogue officiel) → enum sra2. */
  RANGE_TOKEN: { "OK": "ok", "–": "none", "-": "none", "Dés.": "disadvantage", "Dé": "dice" },

  /** "[OK/OK/Dés./–]" → {melee,short,medium,long}. */
  parseRanges(str) {
    const inBrk = (String(str || "").match(/\[(.*)\]/) || [, ""])[1];
    const parts = inBrk.split("/").map((s) => s.trim());
    const tok = (i) => this.RANGE_TOKEN[parts[i]] || "none";
    return { melee: tok(0), short: tok(1), medium: tok(2), long: tok(3) };
  },

  /** "8P" / "5E" → { value, damageType }. dmg lettre E=Étourdissant→mental. */
  parseVd(vdStr) {
    const m = String(vdStr || "").match(/(\d+)\s*([PSE])?/i);
    const value = m ? parseInt(m[1], 10) : 0;
    const letter = (m && m[2]) || "P";
    return { value, damageType: letter.toUpperCase() === "E" ? "mental" : "physical" };
  },

  /** Une entrée pnj.weapons → système Item `feat` (featType "weapon"), ou
      null si l'arme ne doit pas devenir un item (Cybercombat, Frappe élémentaire). */
  buildWeaponFeat(entry, pnj) {
    if (this._isNonWeaponName(entry.name)) return null;
    const attrs = Actor.flatAttrs(pnj); // totals plats (attrs = Traits en V2)
    const resolved = EditionAnarchy2.resolveWeapon(entry, attrs, pnj.meta);
    const weaponType = this._classifyWeaponType(entry.name) || "custom-weapon";
    if (!this._classifyWeaponType(entry.name))
      FoundryExport.note("catégorie d'arme", entry.name, "custom-weapon");
    const { value, damageType } = this.parseVd(resolved.vd);
    const ranges = this.parseRanges(resolved.ranges);
    return this._item(resolved.name, "feat", {
      featType: "weapon",
      description: `${resolved.name} [${resolved.vd}, ${resolved.ranges}]`,
      weaponType,
      damageType,
      vdMode: "custom",
      vdCustomValue: value,
      meleeRange: ranges.melee, shortRange: ranges.short,
      mediumRange: ranges.medium, longRange: ranges.long,
      cost: "free-equipment",
    });
  },

  /* ----------------------------------------------------------
     ARMURE — motif "(Armure N)" dans pnj.equip. Texte de saveur
     ShadowHerds gardé tel quel comme nom (pas de tentative de
     matcher un nom sra2, purement cosmétique côté catalogue cible).
  ---------------------------------------------------------- */
  _isArmorStr(s) {
    return typeof s === "string" && /\(Armure\s*\+?\d+\)/i.test(s);
  },

  /** Une chaîne d'armure peut porter DEUX valeurs (armure de base +
      bouclier optionnel) : "Gilet pare-balles (Armure 3) + bouclier
      anti-émeutes optionnel (Armure +1)" → deux feats séparés. */
  buildArmorFeats(str) {
    const matches = [...String(str).matchAll(/\(Armure\s*\+?(\d+)\)/gi)];
    if (!matches.length) return [];
    // Nom de chaque segment = texte avant sa propre parenthèse (ou le
    // début de chaîne pour le premier segment).
    const feats = [];
    let cursor = 0;
    for (const m of matches) {
      const segment = str.slice(cursor, m.index + m[0].length);
      const name = segment.replace(/^\s*[+]\s*/, "").split("(")[0].trim() || str;
      const value = Math.min(5, parseInt(m[1], 10));
      feats.push(this._item(name, "feat", {
        featType: "armor", armorValue: value, cost: "free-equipment",
        description: segment.trim(),
      }));
      cursor = m.index + m[0].length;
    }
    return feats;
  },

  /* ----------------------------------------------------------
     CYBERDECK — motif régulier "Cyberdeck (Attaque N, Firewall M[, filtre
     de biofeedback: ...])" dans pnj.equip.
  ---------------------------------------------------------- */
  _isCyberdeckStr(s) {
    return typeof s === "string" && /^Cyberdeck\b/i.test(s);
  },

  buildCyberdeckFeat(str) {
    const atk = (str.match(/Attaque\s*(\d+)/i) || [, 0])[1];
    const fw = (str.match(/Firewall\s*(\d+)/i) || [, 0])[1];
    const biofeedbackFilter = /filtre de biofeedback/i.test(str);
    return this._item(this._name(str) || "Cyberdeck", "feat", {
      featType: "cyberdeck",
      attack: parseInt(atk, 10) || 0,
      firewall: parseInt(fw, 10) || 0,
      cyberdeckBiofeedbackFilter: biofeedbackFilter,
      description: str,
      cost: "free-equipment",
    });
  },

  _name(str) {
    return (String(str).split("(")[0] || "").trim();
  },

  /* ----------------------------------------------------------
     EDGES / ATOUTS — 130+ chaînes libres "<Nom> (<catégorie>) : <effet>".
     Catégorie entre parenthèses → featType. Effet parsé en cascade :
     RR, Armure +N, blessure légère/grave, action bonus ; à défaut,
     repli narratif (featType déduit, aucun champ mécanique).
  ---------------------------------------------------------- */
  CATEGORY_FEATTYPE: {
    "cyberware": "cyberware",
    "amélioration de cyberware": "cyberware",
    "bioware": "cyberware", // isBioware:true en plus (cf. buildEdgeFeat)
    "équipement": "equipment",
    "pouvoir d'adepte": "adept-power",
    "trait": "trait",
    "contacts": "contact",
    "contact": "contact",
    "drogue": "equipment",
    "allié": "trait",
    "véhicule": "trait", // narratif seulement (pas un Vehicle actor lié)
  },

  /* Motif "RR N aux tests [de/d'] <Compétence>[ (<spécialité>)][, et de
     <Compétence2>[ (<spé2>)]]". Autorise du texte narratif final après
     une virgule/point (ex. ", vision nocturne"). */
  _RR_RE: /RR\s*(\d+)\s*aux tests?\s+(?:de\s+|d')?([^,()]+?)(?:\s*\(([^)]+)\))?(?:\s+et\s+(?:de\s+|d')?([^,()]+?)(?:\s*\(([^)]+)\))?)?\s*(?:[,.;].*)?$/i,
  _ARMOR_BONUS_RE: /Armure\s*\+\s*(\d+)/i,
  _WOUND_RE: /\+\s*(\d+)\s*blessures?\s*(légères?|graves?)/i,
  _ACTION_RE: /\+\s*(\d+)\s*actions?\s*par\s*(combat|narration)/i,
  _VD_BONUS_RE: /VD\s*\+\s*(\d+)\s*(?:à|en)\s*(mains nues|combat rapproché)/i,

  /** Résout un nom de compétence/spécialité FR (issu du texte d'un edge,
      pas forcément identique aux libellés canoniques) vers { rrType,
      rrTarget }. Spécialité présente → "specialization" (slug "spec_x"
      approximatif, best-effort) ; sinon → "skill" (slug canonique). */
  _rrTarget(skillName, specName) {
    const slug = this.SKILL_SLUG[(skillName || "").trim()] || null;
    if (specName) {
      const specSlug = "spec_" + specName.trim().toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return { rrType: "specialization", rrTarget: specSlug };
    }
    return { rrType: "skill", rrTarget: slug || "" };
  },

  /** Une chaîne d'edge → un feat sra2 (featType déduit de la catégorie
      entre parenthèses, champs mécaniques best-effort). Jamais null :
      repli narratif si aucun motif mécanique ne matche. */
  buildEdgeFeat(str) {
    const s = String(str);
    const catM = s.match(/^.*?\(([^)]+)\)\s*:/);
    const category = catM ? catM[1].trim().toLowerCase() : "";
    const featType = this.CATEGORY_FEATTYPE[category] || "trait";
    const name = s.split(/\s*\(/)[0].trim() || s;
    const isBioware = category === "bioware";
    const tail = s.includes(":") ? s.split(":").slice(1).join(":").trim() : s;

    const rrM = tail.match(this._RR_RE);
    if (rrM) {
      const rrList = [{ ...this._rrTarget(rrM[2], rrM[3]), rrValue: Math.min(3, parseInt(rrM[1], 10)) }];
      if (rrM[4]) rrList.push({ ...this._rrTarget(rrM[4], rrM[5]), rrValue: Math.min(3, parseInt(rrM[1], 10)) });
      return this._item(name, "feat", { featType, isBioware, rrList, description: s, cost: "free-equipment" });
    }
    const armM = tail.match(this._ARMOR_BONUS_RE);
    if (armM) {
      return this._item(name, "feat", {
        featType, isBioware, armorValue: Math.min(5, parseInt(armM[1], 10)),
        description: s, cost: "free-equipment",
      });
    }
    const woundM = tail.match(this._WOUND_RE);
    if (woundM) {
      const n = parseInt(woundM[1], 10);
      const field = /grave/i.test(woundM[2]) ? "bonusSevereDamage" : "bonusLightDamage";
      return this._item(name, "feat", { featType, isBioware, [field]: n, description: s, cost: "free-equipment" });
    }
    const vdM = tail.match(this._VD_BONUS_RE);
    if (vdM) {
      return this._item(name, "feat", {
        featType, isBioware, weaponDamageBonus: parseInt(vdM[1], 10),
        weaponTypeBonus: /mains nues/i.test(vdM[2]) ? "bare-hands" : "custom-weapon",
        description: s, cost: "free-equipment",
      });
    }
    const actionM = tail.match(this._ACTION_RE);
    if (actionM) {
      // Pas de champ "action bonus" dédié côté sra2 : approximé en bonus
      // Anarchy (ressource la plus proche d'un avantage tactique répété).
      return this._item(name, "feat", {
        featType, isBioware, bonusAnarchy: parseInt(actionM[1], 10),
        description: s, cost: "free-equipment",
      });
    }
    // Repli narratif : aucun champ mécanique, la description porte tout.
    return this._item(name, "feat", { featType, isBioware, description: s, cost: "free-equipment" });
  },

  /* ----------------------------------------------------------
     SORTS — pnj.spells. Au runtime (generate()), un archétype éveillé
     voit ses sorts enrichis via Content.pickSorts en objets {name, cat,
     desc, seuil, proRatingMin} (même mécanisme que SR5/SR6) — PAS de
     simples chaînes malgré ce que suggèrent les statBlocks bruts.
     "cat" colle déjà au vocabulaire Foundry (combat/detection/illusion/
     manipulation), sauf "sante" (sans accent) → "health". Le champ
     `damageType` du schéma est requis (physical/mental/matrix, pas de
     valeur vide) : "physical" par défaut hors sorts de combat.
  ---------------------------------------------------------- */
  _SPELL_CAT_MAP: { sante: "health", combat: "combat", detection: "detection", illusion: "illusion", manipulation: "manipulation" },

  buildSpellFeat(sp) {
    const isObj = sp && typeof sp === "object";
    const name = isObj ? String(sp.name || "") : String(sp).split("(")[0].trim();
    const desc = isObj ? String(sp.desc || "") : String(sp);
    const rawCat = isObj ? String(sp.cat || "") : "";
    const spellSpecializationType = this._SPELL_CAT_MAP[rawCat] || "combat";
    // "direct" = dommages mentaux, "indirect" = dommages physiques (cf.
    // Content.js js/rules/content.js:493+, commentaire "Combat (7)").
    const damageType = spellSpecializationType === "combat"
      ? (/indirect/i.test(desc) ? "physical" : "mental")
      : "physical";
    return this._item(name || String(sp), "feat", {
      featType: "spell", spellSpecializationType, damageType,
      vdMode: "custom", vdCustomValue: 0,
      description: desc || name, cost: "free-equipment",
    });
  },

  /* ----------------------------------------------------------
     ÉVEILLÉ — pnj.awakened ("hermétique"/"chamanique"/"adepte"/null).
     Pouvoirs d'adepte listés dans pnj.edges (catégorie "pouvoir
     d'adepte") : déjà couverts par buildEdgeFeat, pas de doublon ici.
  ---------------------------------------------------------- */
  buildAwakenedFeat(pnj) {
    const a = pnj.awakened;
    if (!a) return null;
    if (a === "adepte") {
      // L'awakened lui-même (flag adept:true) ; les pouvoirs sont des
      // feats "pouvoir d'adepte" séparés, déjà extraits depuis edges.
      return this._item("Éveillé (Adepte)", "feat", {
        featType: "awakened", adept: true, description: "Adepte physique.",
        cost: "free-equipment",
      });
    }
    const hasAstral = (pnj.edges || []).some((e) => /^Astral\b/i.test(e) || /perception astrale/i.test(e));
    return this._item(`Éveillé (${a === "chamanique" ? "Chamanique" : "Hermétique"})`, "feat", {
      featType: "awakened", sorcery: true, conjuration: true,
      astralPerception: hasAstral,
      description: `Tradition ${a}.`,
      cost: "free-equipment",
    });
  },

  /* ----------------------------------------------------------
     MÉTATYPE — table officielle sra2 (METATYPES), avec anti-troncature :
     si l'attribut réel du PNJ dépasse le max documenté (bonus cumulé
     d'edges/cyberware), on remonte le max pour ne jamais tronquer une
     valeur au chargement (CharacterDataModel clampe sinon silencieusement).
  ---------------------------------------------------------- */
  METATYPE_MAX: {
    Humain: { strength: 4, agility: 4, willpower: 4, logic: 4, charisma: 4, anarchyBonus: 1 },
    Elfe: { strength: 4, agility: 4, willpower: 4, logic: 4, charisma: 5, anarchyBonus: 0 },
    Nain: { strength: 4, agility: 4, willpower: 5, logic: 4, charisma: 4, anarchyBonus: 0 },
    Ork: { strength: 5, agility: 4, willpower: 4, logic: 4, charisma: 4, anarchyBonus: 0 },
    Troll: { strength: 6, agility: 4, willpower: 4, logic: 4, charisma: 4, anarchyBonus: 0 },
  },

  _metatypeItem(pnj) {
    const base = this.METATYPE_MAX[pnj.meta] || this.METATYPE_MAX.Humain;
    const a = Actor.flatAttrs(pnj); // totals plats (attrs = Traits en V2)
    const real = {
      strength: a.FOR || 1, agility: a.AGI || 1, willpower: a.VOL || 1,
      logic: a.LOG || 1, charisma: a.CHA || 1,
    };
    return this._item(pnj.meta || "Humain", "metatype", {
      maxStrength: Math.max(base.strength, real.strength),
      maxAgility: Math.max(base.agility, real.agility),
      maxWillpower: Math.max(base.willpower, real.willpower),
      maxLogic: Math.max(base.logic, real.logic),
      maxCharisma: Math.max(base.charisma, real.charisma),
      anarchyBonus: base.anarchyBonus,
      description: pnj.meta || "Humain",
    });
  },

  /* ---- Petits constructeurs communs ---- */
  _item(name, type, system) {
    return { name: String(name || type), type, system: system || {} };
  },
  _n(v) {
    const num = Number(v) || 0;
    return { value: num, base: num, modifiers: [] };
  },

  /** Nom de fichier proposé pour le téléchargement. */
  filename(pnj) {
    const safe = String(pnj && pnj.name ? pnj.name : "pnj")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
    return `shadowherds-foundry-${safe || "pnj"}.json`;
  },

  /** Construit les Items skill/specialization à partir de pnj.skills.
      Une compétence avec spécialité (sk.spec) produit AUSSI un Item
      `specialization` lié (linkedSkill = slug de la compétence). */
  _buildSkillItems(pnj) {
    const items = [];
    const bySlug = {};
    for (const sk of pnj.skills || []) {
      if (!sk || sk.name == null) continue;
      const slug = this.SKILL_SLUG[sk.name] || null;
      if (slug === "@astral") continue; // Astral : pas de skill item (cf. awakened) — repli intentionnel
      if (!slug) {
        FoundryExport.note("compétence", sk.name);
        continue;
      }
      const linkedAttribute = this.SKILL_ATTR[slug] || "logic";
      // Deux libellés ShadowHerds peuvent pointer vers le même slug sra2
      // (ex. Matricielle/Cybercombat → cracking, Course/Athlétisme →
      // athletics) : on garde le rating le plus élevé pour ne pas
      // écraser une valeur haute par une valeur basse tirée après coup.
      if (!bySlug[slug] || (sk.val || 0) > bySlug[slug].rating) {
        bySlug[slug] = { rating: sk.val || 0, linkedAttribute, spec: sk.spec || "" };
      }
    }
    for (const [slug, data] of Object.entries(bySlug)) {
      items.push(this._item(slug, "skill", {
        rating: data.rating, linkedAttribute: data.linkedAttribute, slug, description: "",
      }));
      if (data.spec) {
        items.push(this._item(data.spec, "specialization", {
          linkedSkill: slug, linkedAttribute: data.linkedAttribute, description: "",
        }));
      }
    }
    return items;
  },

  /** Construit tous les Items embarqués (hors skill/specialization/metatype). */
  _buildItems(pnj) {
    const items = [];
    for (const w of pnj.weapons || []) {
      const feat = this.buildWeaponFeat(w, pnj);
      if (feat) items.push(feat);
    }
    for (const raw of pnj.equip || []) {
      const e = ItemResolver.itemStr(raw); // #63 : item chaîne OU objet
      if (!e) continue;
      if (this._isCyberdeckStr(e)) items.push(this.buildCyberdeckFeat(e));
      else if (this._isArmorStr(e)) items.push(...this.buildArmorFeats(e));
      else items.push(this._item(this._name(e) || e, "feat", {
        featType: "equipment", description: e, cost: "free-equipment",
      }));
    }
    for (const e of pnj.edges || []) {
      if (typeof e === "string") items.push(this.buildEdgeFeat(e));
    }
    for (const sp of pnj.spells || []) {
      if (typeof sp === "string" || (sp && typeof sp === "object")) items.push(this.buildSpellFeat(sp));
    }
    const awakened = this.buildAwakenedFeat(pnj);
    if (awakened) items.push(awakened);
    return items;
  },

  /** PNJ Anarchy2 → document acteur Foundry `character`. */
  buildActor(pnj) {
    const a = Actor.flatAttrs(pnj); // totals plats (attrs = Traits en V2)
    const attributes = {};
    for (const [code, key] of Object.entries(this.ATTR_MAP)) attributes[key] = a[code] || 1;

    const flavor = pnj.flavor || {};
    const system = {
      attributes,
      resources: { yens: 0, anarchy: 0 },
      maxEssence: 6,
      armorLevel: 0, // dérivé par Foundry depuis les feats armor actifs
      gender: pnj.gender === "M" ? "male" : pnj.gender === "F" ? "female" : "random",
      connectionMode: "ar",
      damage: { light: [false, false], severe: [false], incapacitating: false },
      bio: {
        background: [flavor.style, flavor.attitude, flavor.manie, flavor.motivation, flavor.signe]
          .filter(Boolean).join(" · "),
        notes: pnj.notes || "",
        gmDescription: pnj.archetype || "",
      },
      keywords: {
        keyword1: pnj.archetype || "", keyword2: pnj.role || "", keyword3: pnj.milieu || "",
        keyword4: "", keyword5: "",
      },
      behaviors: { behavior1: flavor.attitude || "", behavior2: flavor.motivation || "", behavior3: "", behavior4: "" },
      catchphrases: { catchphrase1: "", catchphrase2: "", catchphrase3: "", catchphrase4: "" },
      linkedVehicles: [],
      reference: pnj.tier || "",
      damageGaugeType: "physical",
    };

    const items = [
      this._metatypeItem(pnj),
      ...this._buildSkillItems(pnj),
      ...this._buildItems(pnj),
    ];

    return { name: pnj.name || "PNJ", type: "character", img: "icons/svg/mystery-man.svg", system, items };
  },

  /** Véhicules liés (Vehicles.linkedTo) → tableau d'acteurs Foundry
      `vehicle` (un fichier par véhicule, cf. contrôleur neutre). */
  buildVehicleActors(pnj) {
    if (typeof Vehicles === "undefined" || !Vehicles.linkedTo) return [];
    const linked = Vehicles.linkedTo(pnj.id) || [];
    return linked.map((v) => {
      const s = v.stats || {};
      return {
        name: v.name || "Véhicule",
        type: "vehicle",
        img: "icons/svg/mystery-man.svg",
        system: {
          vehicleType: "custom-vehicle",
          controlMode: "autonomous",
          customAutopilot: s.autopilote || 6,
          customStructure: s.structure || 0,
          customHandling: s.mania || 0,
          customSpeed: s.vitesse || 0,
          customFlyingSpeed: 0,
          customArmor: s.blindage || 0,
          customWeaponMount: "none",
        },
        items: [],
      };
    });
  },
};

/* Auto-enregistrement sur le module d'édition Anarchy2 (chargé avant
   nous). Le contrôleur neutre FoundryExport lira
   App.editionModule.foundryExport ; absent pour SR6/Anarchy1. */
if (typeof EditionAnarchy2 !== "undefined") {
  EditionAnarchy2.foundryExport = FoundryAnarchy2Export;
}
