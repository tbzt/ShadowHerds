"use strict";

/* ============================================================
   EXPORT SR6 → FOUNDRY VTT (système sr6, v14.0.0-alpha.3)

   Fichier COMPAGNON de l'édition SR6 : tout le savoir spécifique
   « comment un PNJ SR6 se traduit en acteur Foundry » vit ici, pas
   dans un consommateur neutre (prohibition #1). Le module
   s'auto-enregistre sur EditionSR6 via `foundryExport`, lu par
   FoundryExport (contrôleur neutre) à travers App.editionModule.

   Cible : Actor type `grunt` (character + { grunt: { isLieutenant } }).

   PIÈGE STRUCTUREL CONFIRMÉ EN LISANT LES SOURCES DU SYSTÈME : la quasi-
   totalité de la fiche est de la donnée DÉRIVÉE — chaque stat suit le
   motif {base, total, mods}, et `.total` (+ moniteurs/défenses/
   résistances/initiatives/totaux Matrice) est TOUJOURS recalculé par
   Foundry à l'ouverture (prepareDerivedPcData(), ~19 fonctions
   calculate*). On n'écrit donc QUE les `.base` : attributs, rang de
   compétence, karma/nuyen gagnés, biographie, et les Items embarqués.
   Ne rien précalculer côté moniteurs/défenses/résistances/initiative :
   travail silencieusement jeté au chargement.

   PIÈGE N°2 : l'acteur `grunt` applique AUTOMATIQUEMENT le bonus racial
   du métatype dans `natural.base` (contrairement à `character`, qui
   n'étend que `.max`). Ne jamais additionner ce bonus soi-même côté
   export — double-comptage sinon. D'où `_metatypeGruntKey()` qui choisit
   la variante scindée (dwarfWill/dwarfBody, trollBody/trollStr) plutôt
   que dwarf/troll bruts.
   ============================================================ */
const FoundrySR6Export = {
  /* ----------------------------------------------------------
     COMPÉTENCES — 18 compétences canoniques SR6 (fusion groupe +
     individuelle de SR5), vérifiées dans scripts/helpers/config.js
     SR6.skills + SR6.specializations_<skill>. ShadowHerds utilise 20
     libellés : Survie/Intimidation/Leadership n'existent plus comme
     compétences séparées en SR6, ce sont des SPÉCIALITÉS confirmées
     (outdoors.survival, influence.intimidation/leadership) — pas une
     approximation, vérifié directement dans la table source.
  ---------------------------------------------------------- */
  SKILL_MAP: {
    "Armes à feu": { key: "firearms" },
    "Astral": { key: "astral" },
    "Athlétisme": { key: "athletics" },
    "Biotech": { key: "biotech" },
    "Combat rapproché": { key: "closeCombat" },
    "Conjuration": { key: "conjuring" },
    "Discrétion": { key: "stealth" },
    "Électronique": { key: "electronics" },
    "Enchantement": { key: "enchanting" },
    "Escroquerie": { key: "con" },
    "Furtivité": { key: "stealth" },
    "Influence": { key: "influence" },
    "Ingénierie": { key: "engineering" },
    "Intimidation": { key: "influence", spec: "intimidation" },
    "Leadership": { key: "influence", spec: "leadership" },
    "Perception": { key: "perception" },
    "Pilotage": { key: "piloting" },
    "Piratage": { key: "cracking" },
    "Sorcellerie": { key: "sorcery" },
    "Survie": { key: "outdoors", spec: "survival" },
  },

  /* ShadowHerds (code FR) → attribut sr6. Pas de "essence"/"edge" ici
     (traités à part dans buildActor, mêmes noms de clé attributes.*). */
  ATTR_MAP: {
    CON: "body", AGI: "agility", "RÉA": "reaction", FOR: "strength",
    VOL: "willpower", LOG: "logic", INT: "intuition", CHA: "charisma",
  },

  /* pnj.traditionDrainAttr (code FR) → CONFIG.SR6.drainAttributes
     (uniquement willpower/logic/intuition/charisma). */
  DRAIN_ATTR_MAP: { VOL: "willpower", LOG: "logic", INT: "intuition", CHA: "charisma" },

  /* Table officielle sra2... pardon, sr6 (SR6.metatypesGrunt) : Nain et
     Troll sont scindés selon l'attribut bonus, Humain/Elfe/Ork directs. */
  METATYPE_GRUNT: {
    Humain: "human", Elfe: "elf", Ork: "ork",
    // Nain : bonus VOL ou FOR selon le profil ShadowHerds (attrsMeta) —
    // à défaut d'information, on retient la variante VOL (Nain p.69 :
    // bonus natif Constitution/Volonté, jamais Force en SR6).
    Nain: "dwarfWill",
    // Troll : bonus CON ou FOR — ShadowHerds bonifie CON pour le Troll
    // (cf. attrBase), donc on retient la variante "corps" (trollBody).
    Troll: "trollBody",
  },

  /* ----------------------------------------------------------
     ARMES — catalogue officiel confirmé dans equipPools (js/editions/
     sr6.js) : armes à distance au format "<nom> [<catégorie FR>, VD nX,
     SO a/b/c/d/e, <modes>, <cap>(<type>)]" — catégorie déjà dans la
     chaîne, classification directe. Armes de mêlée au format
     "<nom> [VD nX, SO n+FOR/.../-/-/-]" — pas de catégorie, liste finie.
  ---------------------------------------------------------- */
  RANGED_CATEGORY: {
    "Pistolet de poche": { typeSub: "pistolHoldOut" },
    "Pistolet léger": { typeSub: "pistolLight" },
    "Pistolet lourd": { typeSub: "pistolHeavy" },
    "Pistolet auto": { typeSub: "pistolMachine" },
    "Mitraillette": { typeSub: "submachineGun" },
    "Fusil d'assaut": { typeSub: "rifle" },
    "Fusil de précision": { typeSub: "rifle" },
    "Fusil antimatériel": { typeSub: "rifle" },
    "Shotgun": { typeSub: "shotgun" },
  },
  MELEE_TYPE: {
    "Couteau": "blade", "Couteau de combat": "blade", "Épée": "blade", "Katana": "blade",
    "Hache de combat": "blade",
    "Bâton télescopique": "club", "Matraque télescopique": "club",
    "Électromatraque": "club", "Électro-gants": "club",
    "Mains nues": "unarmed",
  },

  /** "9/6/5/-/-" → attackRating.range.{close,near,medium,far,extreme}.base
      ("-" = 0, l'arme ne porte pas à cette bande — Foundry n'a pas
      d'équivalent "impossible", 0 est le repli le plus sûr). */
  parseSOBands(str) {
    const parts = String(str || "").split("/").map((s) => s.trim());
    const num = (i) => {
      const v = parts[i];
      return v && v !== "-" ? parseInt(v, 10) || 0 : 0;
    };
    return { close: num(0), near: num(1), medium: num(2), far: num(3), extreme: num(4) };
  },

  /** "6+FOR" (mêlée à arme), "FOR+RÉA" (mains nues, cf. Mains nues [VD 2E,
      SO FOR+RÉA/–/–/–/–] — seule occurrence de ce motif dans le catalogue,
      SR6.linkedArAttributes a une clé dédiée "strength_reaction" pour ce
      cas exact) ou "9" (distance) → { base, isStrengthBased, meleeLinkedAttribute }. */
  parseSOFirst(str) {
    const s = String(str || "").trim();
    if (/^FOR\s*\+\s*R[ÉE]A$/i.test(s))
      return { base: 0, isStrengthBased: true, meleeLinkedAttribute: "strength_reaction" };
    const m = s.match(/^(\d+)\s*\+\s*FOR$/i);
    if (m) return { base: parseInt(m[1], 10), isStrengthBased: true, meleeLinkedAttribute: "strength" };
    const n = parseInt(s, 10);
    return { base: Number.isFinite(n) ? n : 0, isStrengthBased: false, meleeLinkedAttribute: "strength" };
  },

  /** "VD 4E(e)" / "VD 2P" → { value, damageType, element }. */
  parseVd(str) {
    const m = String(str || "").match(/VD\s*(\d+)\s*([PE])?(\(e\))?/i);
    const value = m ? parseInt(m[1], 10) : 0;
    const damageType = m && m[2] && m[2].toUpperCase() === "E" ? "stun" : "physical";
    const element = m && m[3] ? "electricity" : "";
    return { value, damageType, element };
  },

  MODE_KEY: { CC: "singleShot", SA: "semiAutomatic", TR: "burstFire", TA: "fullyAutomatic" },

  /** "SA/TR/TA" → { singleShot:bool, semiAutomatic:bool, ... }. */
  parseModes(str) {
    const inStr = String(str || "");
    const flags = { singleShot: false, semiAutomatic: false, burstFire: false, fullyAutomatic: false };
    for (const [code, key] of Object.entries(this.MODE_KEY)) {
      if (new RegExp(`\\b${code}\\b`).test(inStr)) flags[key] = true;
    }
    if (!Object.values(flags).some(Boolean)) flags.singleShot = true;
    return flags;
  },

  _name(str) {
    return (String(str).split("[")[0] || "").trim();
  },

  _isWeaponStr(s) {
    return typeof s === "string" && /\[/.test(s) && /\bVD\b/.test(s) && /\d/.test(s.split("VD")[1] || "");
  },
  _isArmorStr(s) {
    return typeof s === "string" && /\[SD\s*\+\s*\d+/i.test(s);
  },

  /* Cyberware du catalogue equipPools.cyberware + bioware d'initAugFor
     (js/editions/sr6.js) : ces picks atterrissent dans pnj.equip, pas
     forcément pnj.augs. Testé AVANT _isArmorStr : « Armure dermique 3
     [SD+3] » matcherait sinon par erreur le motif d'armure (même bug que
     celui trouvé et corrigé côté export SR5). Aucun de ces noms n'a de
     VD/PRE : jamais en conflit avec _isWeaponStr. */
  _isCyberStr(s) {
    if (typeof s !== "string") return false;
    return /^(Réflexes câblés|Amplificateur de réaction|Amplificateurs synaptiques|Tonification musculaire|Renforcement musculaire|Armure dermique|Oreilles cybernétiques|Yeux cybernétiques|Ossature renforcée|Substituts musculaires|Datajack|Câblage de contrôle|Filtre antalgique|Booster synaptique)\b/i.test(s);
  },

  /** Une chaîne d'arme → système d'un Item `weapon`. */
  buildWeaponItem(str) {
    const s = String(str);
    const bracket = (s.match(/\[([^\]]*)\]/) || [, ""])[1];
    const fields = bracket.split(",").map((f) => f.trim());
    const name = this._name(s);

    // Grenades / flash-paks : catégorie SR6 dédiée (weaponCategories
    // "grenade"), pas de VD chiffré pour certaines (« Flash-paks : Aveuglé
    // III ») — détectées par nom avant la logique ranged/melee.
    const isGrenade = /^grenade\b|flash-?pak/i.test(name);
    const rangedCat = this.RANGED_CATEGORY[fields[0]];
    const meleeType = this.MELEE_TYPE[name];
    const type = isGrenade ? "grenade" : rangedCat ? "rangedWeapon" : "meleeWeapon";
    const typeSub = isGrenade ? "" : rangedCat ? rangedCat.typeSub : meleeType || "meleeSpecial";
    if (!isGrenade && !rangedCat && !meleeType)
      FoundryExport.note("catégorie d'arme", name, "meleeWeapon/meleeSpecial");

    const vdField = fields.find((f) => /^VD\b/i.test(f)) || "";
    const soField = fields.find((f) => /^SO\b/i.test(f)) || "";
    const modeField = fields.find((f) => /\b(CC|SA|TR|TA)\b/.test(f)) || "";
    const { value: dmgValue, damageType, element } = this.parseVd(vdField);

    const soBody = soField.replace(/^SO\s*/i, "");
    const soParts = soBody.split("/");
    const first = this.parseSOFirst(soParts[0]);
    const bands = type === "meleeWeapon"
      ? { close: first.base, near: 0, medium: 0, far: 0, extreme: 0 }
      : this.parseSOBands(soBody);

    const modes = this.parseModes(modeField);
    const modeValue = Object.keys(modes).filter((k) => modes[k]);

    return this._item(name, "weapon", {
      type,
      typeSub,
      damage: {
        value: this._n(dmgValue), valueClose: this._n(0), valueNear: this._n(0), blast: this._n(0),
        isStrengthBased: first.isStrengthBased, isMagicBased: false, isMagical: false, isSpray: false,
        type: damageType, element,
      },
      attackRating: {
        range: {
          close: this._n(bands.close), near: this._n(bands.near), medium: this._n(bands.medium),
          far: this._n(bands.far), extreme: this._n(bands.extreme),
        },
        meleeLinkedAttribute: first.meleeLinkedAttribute || "strength",
        isMagicBased: false,
      },
      firingMode: {
        singleShot: { available: modes.singleShot, attackRating: this._n(0), damage: this._n(0) },
        semiAutomatic: { available: modes.semiAutomatic, attackRating: this._n(0), damage: this._n(0) },
        burstFire: { available: modes.burstFire, attackRating: this._n(0), damage: this._n(modes.burstFire ? 2 : 0) },
        fullyAutomatic: { available: modes.fullyAutomatic, attackRating: this._n(0), damage: this._n(0) },
        value: modeValue,
        current: modeValue[0] || "",
      },
      quantity: 1,
      requiredHands: 1,
      // Grenade → Athlétisme (lancer) ; mêlée → Combat rapproché ; sinon Armes à feu.
      test: { linkedSkill: isGrenade ? "athletics" : type === "meleeWeapon" ? "closeCombat" : "firearms" },
      description: s,
    });
  },

  /** "Armure corporelle intégrale [SD+5]" → système d'un Item `armor`. */
  buildArmorItem(str) {
    const s = String(str);
    const m = s.match(/\[SD\s*\+\s*(\d+)/i);
    const value = m ? parseInt(m[1], 10) : 0;
    return this._item(this._name(s), "armor", {
      type: "armor", defenseRating: this._n(value), socialRating: this._n(0),
      isCumulative: false, description: s,
    });
  },

  /* ---- Petits constructeurs communs ---- */
  _item(name, type, system) {
    return { name: String(name || type), type, system: system || {} };
  },
  _n(v) {
    const num = Number(v) || 0;
    return { base: num, total: 0, mods: [] };
  },
  _attr(v) {
    return { natural: { base: Number(v) || 0, total: 0, mods: [] }, augmented: { base: 0, total: 0, mods: [] } };
  },

  /** Item `augmentation` minimal à partir d'une chaîne (cyber/bioware). */
  _augItem(str) {
    return this._item(this._name(str) || str, "augmentation", {
      type: "cyberware", typeSub: "", installLocation: "natural",
      grade: "standard", essenceCost: { base: 0, total: 0, mods: [], multiplier: "" },
      description: str,
    });
  },

  /** Nom de fichier proposé pour le téléchargement. */
  filename(pnj) {
    const safe = String(pnj && pnj.name ? pnj.name : "pnj")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
    return `shadowherds-foundry-${safe || "pnj"}.json`;
  },

  /** Construit les Items embarqués (armes/armure/équipement/augs/sorts/
      pouvoirs/traits). */
  _buildItems(pnj) {
    const items = [];
    for (const e of pnj.equip || []) {
      if (typeof e !== "string") continue;
      if (this._isCyberStr(e)) items.push(this._augItem(e));
      else if (this._isArmorStr(e)) items.push(this.buildArmorItem(e));
      else if (this._isWeaponStr(e)) items.push(this.buildWeaponItem(e));
      else items.push(this._item(this._name(e) || e, "gear", {
        type: "utility", quantity: 1, description: e,
      }));
    }
    for (const a of pnj.augs || []) {
      if (typeof a === "string") items.push(this._augItem(a));
    }
    for (const sp of pnj.spells || []) {
      const { name, desc } = this._named(sp);
      const cat = sp && typeof sp === "object" ? sp.cat : "";
      const category = ["combat", "detection", "health", "illusion", "manipulation"].includes(cat) ? cat : "combat";
      items.push(this._item(name, "spell", {
        category, range: "lineOfSight", duration: "instantaneous", type: "mana",
        drain: this._n(0), description: desc,
      }));
    }
    for (const pw of pnj.powers || []) {
      const { name, desc } = this._named(pw);
      items.push(this._item(name, "poweradept", { action: "passive", description: desc }));
    }
    for (const tr of pnj.traits || []) {
      const { name, desc } = this._named(tr);
      items.push(this._item(name, "quality", { type: "positive", description: desc }));
    }
    return items;
  },

  /** Normalise une entrée « nommée » (sort, pouvoir, trait) qui peut être
      une chaîne OU un objet { name, desc… } → { name, desc }. */
  _named(x) {
    if (x && typeof x === "object") return { name: String(x.name || ""), desc: String(x.desc || "") };
    return { name: String(x || ""), desc: String(x || "") };
  },

  /** Construit les compétences inline de l'acteur (rank.base + éventuelle
      spécialité sélectionnée). Compétences non atteintes par ShadowHerds
      restent à leur valeur par défaut du schéma (rank 0). */
  _buildSkills(pnj) {
    const skills = {};
    for (const sk of pnj.skills || []) {
      if (!sk || sk.name == null) continue;
      const map = this.SKILL_MAP[sk.name];
      if (!map) {
        FoundryExport.note("compétence", sk.name);
        continue;
      }
      const val = Number(sk.val) || 0;
      const existing = skills[map.key];
      if (!existing || val > existing.rank.base) {
        skills[map.key] = { rank: this._n(val), spec: map.spec || null };
      } else if (map.spec && !existing.spec) {
        existing.spec = map.spec;
      }
    }
    const out = {};
    for (const [key, data] of Object.entries(skills)) {
      out[key] = { rank: data.rank };
      if (data.spec) {
        out[key].specialization = { list: { [data.spec]: { base: this._n(0).base, total: 0, mods: [], isSelected: true } } };
      }
    }
    return out;
  },

  /** PNJ SR6 → document acteur Foundry `grunt`. */
  buildActor(pnj) {
    const a = pnj.attrs || {};
    const attributes = {};
    for (const [code, key] of Object.entries(this.ATTR_MAP)) attributes[key] = this._attr(a[code]);
    attributes.edge = this._attr(a.ATO);
    attributes.essence = this._attr(a.ESS != null ? a.ESS : 6);
    attributes.magic = this._attr(a.MAG || 0);
    attributes.resonance = this._attr(a.RES || 0);

    const awakened = (a.MAG || 0) > 0;
    const technomancer = (a.RES || 0) > 0;
    const magicType = pnj.special === "Adepte" ? "adept"
      : awakened ? "magician"
      : "none";
    const drainAttribute = this.DRAIN_ATTR_MAP[pnj.traditionDrainAttr] || "willpower";
    if (awakened && pnj.traditionDrainAttr && !this.DRAIN_ATTR_MAP[pnj.traditionDrainAttr])
      FoundryExport.note("attribut de Drain", pnj.traditionDrainAttr, "willpower");

    const metatype = this.METATYPE_GRUNT[pnj.meta] || "human";
    if (pnj.meta && !this.METATYPE_GRUNT[pnj.meta])
      FoundryExport.note("métatype", pnj.meta, "human");

    const system = {
      attributes,
      skills: this._buildSkills(pnj),
      biography: {
        realName: pnj.name || "", alias: pnj.name || "",
        metatype,
        metatypeVariant: pnj.metavariant || "",
        gender: pnj.gender === "M" ? "male" : pnj.gender === "F" ? "female" : "other",
        age: 30, description: pnj.archetype || "", background: pnj.notes || "",
      },
      magic: { type: magicType, drainAttribute },
      karma: { gained: this._n(0), spent: this._n(0) },
      nuyen: { gained: this._n(0), spent: this._n(0) },
      grunt: { isLieutenant: pnj.special === "Lieutenant" },
    };

    const items = this._buildItems(pnj);

    return { name: pnj.name || "PNJ", type: "grunt", img: "icons/svg/mystery-man.svg", system, items };
  },
};

/* Auto-enregistrement sur le module d'édition SR6 (chargé avant nous).
   Le contrôleur neutre FoundryExport lira App.editionModule.foundryExport ;
   absent pour SR5/Anarchy1/Anarchy2 (chacun sa propre capacité). */
if (typeof EditionSR6 !== "undefined") {
  EditionSR6.foundryExport = FoundrySR6Export;
}
