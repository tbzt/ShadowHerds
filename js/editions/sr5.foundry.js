"use strict";

/* ============================================================
   EXPORT SR5 → FOUNDRY VTT (système shadowfoundry/sr5)

   Fichier COMPAGNON de l'édition SR5 : tout le savoir spécifique
   « comment un PNJ SR5 se traduit en acteur Foundry » vit ici, pas
   dans un consommateur neutre (prohibition #1 : aucune logique
   d'édition hors js/editions/). Le module s'auto-enregistre sur
   EditionSR5 via `foundryExport`, lu par FoundryExport (contrôleur
   neutre) à travers App.editionModule.

   Cible : acteur type `actorGrunt` (les PNJ SR5 ont un moniteur de
   condition UNIQUE, cf. Livre de Règles p.381), avec ses Items
   embarqués (armes, armure, augmentations, matériel, sorts…).

   L'équipement reste stocké en texte libre côté ShadowHerds ; on le
   PARSE ici à la volée (VD/PA/PRE/modes/munitions). Ce parseur est
   volontairement isolé : c'est aussi la brique réutilisable le jour
   d'une éventuelle structuration de `equip` ou d'une i18n.
   ============================================================ */
const FoundrySR5Export = {
  /* ----------------------------------------------------------
     Métadonnées des 76 compétences du système Foundry
     [linkedAttribute, category, skillGroup, limitBase, canDefault]
     Copiées telles quelles depuis template.json (y compris la
     coquille amont « waeponAccuracy » sur pistols, conservée pour
     coller au système cible).
  ---------------------------------------------------------- */
  SKILL_META: {
    animalHandling: ["charisma", "technicalSkills", "", "mentalLimit", true],
    alchemy: ["magic", "magicSkills", "enchantingGroup", "preparationForce", false],
    pilotAircraft: ["reaction", "vehicleSkills", "", "vehicleHandling", false],
    arcana: ["logic", "magicSkills", "", "astralLimit", true],
    exoticRangedWeapon: ["agility", "combatSkills", "", "weaponAccuracy", false],
    exoticMeleeWeapon: ["agility", "combatSkills", "", "weaponAccuracy", false],
    automatics: ["agility", "combatSkills", "firearmsGroup", "weaponAccuracy", true],
    clubs: ["agility", "combatSkills", "closeCombatGroup", "weaponAccuracy", true],
    throwingWeapons: ["agility", "combatSkills", "", "weaponAccuracy", true],
    archery: ["agility", "combatSkills", "", "weaponAccuracy", true],
    gunnery: ["agility", "vehicleSkills", "", "weaponAccuracy", true],
    heavyWeapons: ["agility", "combatSkills", "", "weaponAccuracy", true],
    blades: ["agility", "combatSkills", "closeCombatGroup", "weaponAccuracy", true],
    armorer: ["logic", "technicalSkills", "", "mentalLimit", true],
    artisan: ["intuition", "technicalSkills", "", "mentalLimit", false],
    banishing: ["magic", "magicSkills", "conjuringGroup", "astralLimit", false],
    biotechnology: ["logic", "technicalSkills", "biotechGroup", "mentalLimit", false],
    chemistry: ["logic", "technicalSkills", "", "mentalLimit", false],
    freeFall: ["body", "physicalSkills", "", "physicalLimit", true],
    unarmedCombat: ["agility", "combatSkills", "closeCombatGroup", "weaponAccuracy", true],
    astralCombat: ["willpower", "magicSkills", "", "astralLimit", false],
    counterspelling: ["magic", "magicSkills", "sorceryGroup", "astralLimit", false],
    running: ["strength", "physicalSkills", "athleticsGroup", "physicalLimit", true],
    artificing: ["magic", "magicSkills", "enchantingGroup", "formulaForce", false],
    cybercombat: ["logic", "technicalSkills", "crackingGroup", "mentalLimit", true],
    cybertechnology: ["logic", "technicalSkills", "biotechGroup", "mentalLimit", false],
    disguise: ["intuition", "physicalSkills", "stealthGroup", "mentalLimit", true],
    disenchanting: ["magic", "magicSkills", "enchantingGroup", "astralLimit", false],
    sneaking: ["agility", "physicalSkills", "stealthGroup", "physicalLimit", true],
    instruction: ["charisma", "socialSkills", "", "socialLimit", true],
    palming: ["agility", "physicalSkills", "stealthGroup", "physicalLimit", false],
    con: ["charisma", "socialSkills", "actingGroup", "socialLimit", true],
    etiquette: ["charisma", "socialSkills", "influenceGroup", "socialLimit", true],
    escapeArtist: ["agility", "physicalSkills", "", "physicalLimit", true],
    demolitions: ["logic", "technicalSkills", "", "mentalLimit", true],
    forgery: ["logic", "technicalSkills", "", "mentalLimit", true],
    longarms: ["agility", "combatSkills", "firearmsGroup", "weaponAccuracy", true],
    electronicWarfare: ["logic", "technicalSkills", "crackingGroup", "mentalLimit", false],
    gymnastics: ["agility", "physicalSkills", "athleticsGroup", "physicalLimit", true],
    hacking: ["logic", "technicalSkills", "crackingGroup", "mentalLimit", true],
    impersonation: ["charisma", "socialSkills", "actingGroup", "socialLimit", true],
    computer: ["logic", "technicalSkills", "electronicsGroup", "mentalLimit", true],
    intimidation: ["charisma", "socialSkills", "", "socialLimit", true],
    summoning: ["magic", "magicSkills", "conjuringGroup", "spiritForce", false],
    spellcasting: ["magic", "magicSkills", "sorceryGroup", "spellForce", false],
    leadership: ["charisma", "socialSkills", "influenceGroup", "socialLimit", true],
    binding: ["magic", "magicSkills", "conjuringGroup", "spiritForce", false],
    software: ["logic", "technicalSkills", "electronicsGroup", "mentalLimit", false],
    ritualSpellcasting: ["magic", "magicSkills", "sorceryGroup", "spellForce", false],
    walker: ["reaction", "vehicleSkills", "", "vehicleHandling", false],
    hardware: ["logic", "technicalSkills", "electronicsGroup", "mentalLimit", false],
    aeronauticsMechanic: ["logic", "technicalSkills", "engineeringGroup", "mentalLimit", false],
    automotiveMechanic: ["logic", "technicalSkills", "engineeringGroup", "mentalLimit", false],
    industrialMechanic: ["logic", "technicalSkills", "engineeringGroup", "mentalLimit", false],
    nauticalMechanic: ["logic", "technicalSkills", "engineeringGroup", "mentalLimit", false],
    medecine: ["logic", "technicalSkills", "biotechGroup", "mentalLimit", false],
    swimming: ["strength", "physicalSkills", "athleticsGroup", "physicalLimit", true],
    negociation: ["charisma", "socialSkills", "influenceGroup", "socialLimit", true],
    assensing: ["intuition", "magicSkills", "", "astralLimit", false],
    navigation: ["intuition", "technicalSkills", "outdoorsGroup", "mentalLimit", true],
    perception: ["intuition", "physicalSkills", "", "mentalLimit", true],
    tracking: ["intuition", "physicalSkills", "outdoorsGroup", "mentalLimit", true],
    pistols: ["agility", "combatSkills", "firearmsGroup", "waeponAccuracy", true],
    diving: ["body", "physicalSkills", "", "physicalLimit", true],
    firstAid: ["logic", "technicalSkills", "biotechGroup", "mentalLimit", true],
    performance: ["charisma", "socialSkills", "actingGroup", "socialLimit", true],
    locksmith: ["agility", "technicalSkills", "", "mentalLimit", false],
    survival: ["willpower", "physicalSkills", "outdoorsGroup", "physicalLimit", true],
    pilotExoticVehicle: ["reaction", "vehicleSkills", "", "vehicleHandling", false],
    pilotWatercraft: ["reaction", "vehicleSkills", "", "vehicleHandling", true],
    pilotAerospace: ["reaction", "vehicleSkills", "", "vehicleHandling", false],
    pilotGroundCraft: ["reaction", "vehicleSkills", "", "vehicleHandling", true],
    flight: ["agility", "physicalSkills", "", "physicalLimit", true],
    compiling: ["resonance", "resonanceSkills", "taskingGroup", "spriteLevel", false],
    decompiling: ["resonance", "resonanceSkills", "taskingGroup", "socialLimit", false],
    registering: ["resonance", "resonanceSkills", "taskingGroup", "spriteLevel", false],
  },

  /* Attribut ShadowHerds (code FR 3 lettres) → attribut Foundry. */
  ATTR_MAP: {
    CON: "body", AGI: "agility", REA: "reaction", FOR: "strength",
    VOL: "willpower", LOG: "logic", INT: "intuition", CHA: "charisma",
  },

  /* pnj.tradition (nom FR tiré de Magic.traditions.sr5, js/rules/magic.js:44-148)
     → clé SR5.traditionTypes (scripts/config.js du système Foundry). Les 18
     traditions SR5 du catalogue, toutes mappées 1:1 (aucun repli nécessaire :
     Magic.pickTradition ne renvoie jamais un nom hors de cette liste). */
  TRADITION_MAP: {
    "Hermétique": "hermeticism",
    "Chamanique": "chamanism",
    "Aztèque": "aztec",
    "Bouddhisme": "buddhism",
    "Théurgie chrétienne": "christianTheurgy",
    "Islam": "islam",
    "Shintoïsme": "shinto",
    "Wuxing": "wuxing",
    "Hindouisme": "hinduism",
    "Vaudou": "vodou",
    "Tradition Sioux": "sioux",
    "Druidisme": "druid",
    "Voie de la Roue": "pathOfTheWheel",
    "Wicca": "wicca",
    "Zoroastrisme": "zoroastrianism",
    "Magie du chaos": "chaosMagic",
    "Magie noire": "blackMagic",
    "Cabalisme": "qabbalism",
  },

  /* Classification catégorie/sous-type Foundry (weaponCategories +
     rangedWeaponTypes/meleeWeaponTypes de scripts/config.js), calée sur les
     noms exacts du catalogue equipPools (js/editions/sr5.js) ; au-delà,
     repli par mot-clé pour tout nom hors catalogue (édition manuelle). */
  WEAPON_CLASSIFY: [
    [/^(Fichetti Security 600|Colt America L36|Ares Light Fire 75)/i, "rangedWeapon", "lightPistol"],
    [/^(Ares Predator V|Browning Ultra-Power|Colt Government 2066|Ruger Super Warhawk|Remington Roomsweeper)/i, "rangedWeapon", "heavyPistol"],
    [/^(HK-227|Ceska Black Scorpion|Colt Cobra TZ-120|HK Urban Combat|Ingram Smartgun X)/i, "rangedWeapon", "submachineGun"],
    [/^(Ares Alpha|AK-97|Colt M23|FN HAR|HK XM30)/i, "rangedWeapon", "assaultRifle"],
    [/^(Ares Desert Strike|Ranger Arms SM-5|Remington 950|Onotari JP-K50)/i, "rangedWeapon", "sniperRifle"],
    [/^Defiance EX Shocker/i, "rangedWeapon", "taser"],
    [/^(Couteau|Épée|Katana|Hache de combat|Lame rétractable|Griffes)/i, "meleeWeapon", "blades"],
    [/^(Matraque télescopique|Massue|Électromatraque|Électro-gants|Bâton étourdissant)/i, "meleeWeapon", "clubs"],
    [/^Mains nues/i, "meleeWeapon", "unarmedCombat"],
  ],

  /** { category, type } d'une arme, avec repli mot-clé générique pour tout
      nom hors catalogue (édition manuelle, ajout futur au pool). `silent`
      supprime le diagnostic quand l'appelant gère déjà la catégorie (ex.
      parseGrenade réutilise parseWeapon puis écrase category="grenade" :
      pas un vrai mapping non résolu). */
  _classifyWeapon(name, silent) {
    for (const [re, category, type] of this.WEAPON_CLASSIFY)
      if (re.test(name)) return { category, type };
    if (/mains?\s*nues/i.test(name)) return { category: "meleeWeapon", type: "unarmedCombat" };
    if (/matraque|massue|b[aâ]ton|gourdin|contondant/i.test(name)) return { category: "meleeWeapon", type: "clubs" };
    if (/couteau|katana|[ée]p[ée]e|sabre|hache|lame|machette|tranchant|griffe/i.test(name)) return { category: "meleeWeapon", type: "blades" };
    if (/taser|shocker/i.test(name)) return { category: "rangedWeapon", type: "taser" };
    if (!silent) FoundryExport.note("catégorie d'arme", name, "exoticRangedWeapon");
    return { category: "rangedWeapon", type: "exoticRangedWeapon" };
  },

  /* Sous-type d'arme (system.type) → compétence de combat gouvernante
     (system.weaponSkill.category, clés exactes de SR5.combatSkills dans
     scripts/config.js). Foundry recalcule lui-même weaponSkill.modifiers/
     base à partir de cette clé au chargement (utilityItem.js:441-448) :
     on n'a qu'à poser la bonne clé, pas le pool de dés. */
  TYPE_TO_SKILL: {
    lightPistol: "pistols", heavyPistol: "pistols", machinePistol: "pistols", holdOut: "pistols", taser: "pistols",
    submachineGun: "automatics", assaultRifle: "automatics", lightMachineGun: "automatics", mediumMachineGun: "automatics", heavyMachineGun: "automatics",
    sniperRifle: "longarms", shotgun: "longarms",
    exoticRangedWeapon: "exoticRangedWeapon",
    blades: "blades", clubs: "clubs", unarmedCombat: "unarmedCombat", exoticMeleeWeapon: "exoticMeleeWeapon",
  },

  /** Compétence gouvernant une arme. Les grenades (category "grenade", pas
      de sous-type) se lancent avec Armes de jet (throwingWeapons, p.183). */
  _weaponSkillFor(category, type) {
    if (category === "grenade") return "throwingWeapons";
    return this.TYPE_TO_SKILL[type] || (category === "meleeWeapon" ? "blades" : "exoticRangedWeapon");
  },

  /* Type de compétence de connaissance (system.type de itemKnowledge),
     clés exactes de SR5.knowledgeSkillTypes (scripts/config.js du système
     Foundry) : academic | interests | professional | street | tactics.
     Couvre les 7 noms atteignables depuis le générateur SR5 : les 6 entrées
     de SkillCatalog.sr5Knowledges + « Criminalité locale » (marquée "@know"
     dans SKILL_MAP mais absente de ce catalogue). */
  KNOWLEDGE_TYPE: {
    "Connaissance ésotérique": "interests",
    "Criminalité locale": "street",
    "Enquête": "professional",
    "Maintien de l'ordre": "professional",
    "Procédures de sécurité": "professional",
    "Psychologie": "academic",
    "Sciences appliquées": "academic",
  },

  /** { type, linkedAttribute } d'une connaissance, avec repli attribut-based
      (INT→street, sinon academic) si le nom n'est pas dans KNOWLEDGE_TYPE. */
  _knowledgeMeta(name) {
    const attrCode = (typeof SkillCatalog !== "undefined" && SkillCatalog.sr5Knowledges[name]) || null;
    const linkedAttribute = attrCode ? this.ATTR_MAP[attrCode] : "logic";
    const type = this.KNOWLEDGE_TYPE[name] || (linkedAttribute === "intuition" ? "street" : "academic");
    return { type, linkedAttribute };
  },

  /* Nom de compétence FR (sans parenthèse) → clé Foundry.
     Valeur "@know" = pas de compétence active correspondante → exportée
     en Item de connaissance (aucune perte). */
  SKILL_MAP: {
    // --- Catalogue officiel VF (SkillCatalog.skillsFor("sr5")) → Foundry ---
    "Alchimie": "alchemy",
    "Animaux": "animalHandling",
    "Appareils spatiaux": "pilotAerospace",
    "Appareils volants": "pilotAircraft",
    "Arcanes": "arcana",
    "Arme à distance exotique": "exoticRangedWeapon",
    "Arme de mêlée exotique": "exoticMeleeWeapon",
    "Armes automatiques": "automatics",
    "Armes contondantes": "clubs",
    "Armes de jet": "throwingWeapons",
    "Armes de trait": "archery",
    "Armes de véhicule": "gunnery",
    "Armes lourdes": "heavyWeapons",
    "Armes tranchantes": "blades",
    "Armurerie": "armorer",
    "Artisanat": "artisan",
    "Bannissement": "banishing",
    "Biotechnologie": "biotechnology",
    "Chimie": "chemistry",
    "Chute libre": "freeFall",
    "Combat à mains nues": "unarmedCombat",
    "Combat astral": "astralCombat",
    "Compilation": "compiling",
    "Contresort": "counterspelling",
    "Course": "running",
    "Création d'artefact": "artificing",
    "Cybercombat": "cybercombat",
    "Cybertechnologie": "cybertechnology",
    "Décompilation": "decompiling",
    "Déguisement": "disguise",
    "Désenchantement": "disenchanting",
    "Discrétion": "sneaking",
    "Enseignement": "instruction",
    "Escamotage": "palming",
    "Escroquerie": "con",
    "Étiquette": "etiquette",
    "Évasion": "escapeArtist",
    "Explosifs": "demolitions",
    "Falsification": "forgery",
    "Fusils": "longarms",
    "Guerre électronique": "electronicWarfare",
    "Gymnastique": "gymnastics",
    "Hacking": "hacking",
    "Imposture": "impersonation",
    "Informatique": "computer",
    "Inscription": "registering",
    "Intimidation": "intimidation",
    "Invocation": "summoning",
    "Lancement de sorts": "spellcasting",
    "Leadership": "leadership",
    "Lien d'esprit": "binding",
    "Logiciels": "software",
    "Magie rituelle": "ritualSpellcasting",
    "Marcheurs": "walker",
    "Matériel électronique": "hardware",
    "Mécanique aéronautique": "aeronauticsMechanic",
    "Mécanique automobile": "automotiveMechanic",
    "Mécanique industrielle": "industrialMechanic",
    "Mécanique nautique": "nauticalMechanic",
    "Médecine": "medecine",
    "Natation": "swimming",
    "Négociation": "negociation",
    "Observation astrale": "assensing",
    "Orientation": "navigation",
    "Perception": "perception",
    "Pistage": "tracking",
    "Pistolets": "pistols",
    "Plongée": "diving",
    "Premiers soins": "firstAid",
    "Représentation": "performance",
    "Serrurerie": "locksmith",
    "Survie": "survival",
    "Véhicule exotique": "pilotExoticVehicle",
    "Véhicules aquatiques": "pilotWatercraft",
    "Véhicules terrestres": "pilotGroundCraft",
    // --- Libellés hors-catalogue produits par le générateur (pools,
    //     réconciliation arme↔compétence, injections rôle/milieu) ---
    "Acrobaties": "gymnastics",
    "Armes à feu": "automatics",
    "Arts martiaux": "unarmedCombat",
    "Athlétisme": "gymnastics",
    "Combat rapproché": "unarmedCombat",
    "Conjuration": "summoning",
    "Contrefaçon": "forgery",
    "Crochetage": "locksmith",
    "Électronique": "computer",
    "Hardware": "hardware",
    "Imposition": "impersonation",
    "Impostura": "impersonation",
    "Ingénierie": "aeronauticsMechanic",
    "Lancer de sorts": "spellcasting",
    "Mécanique": "automotiveMechanic",
    "Mécaniques aéro": "aeronauticsMechanic",
    "Pilotage": "pilotGroundCraft",
    "Résistance aux sorts": "counterspelling",
    "Rituel sacrificiel": "ritualSpellcasting",
    "Samouraï": "unarmedCombat",
    // --- Connaissances (pas de compétence active) → Item de connaissance ---
    "Connaissance ésotérique": "@know",
    "Criminalité locale": "@know",
    "Enquête": "@know",
    "Maintien de l'ordre": "@know",
    "Procédures de sécurité": "@know",
    "Psychologie": "@know",
  },

  /* ---- Petits constructeurs de nœuds Foundry {value, base, modifiers} ---- */
  _n(v) {
    const num = Number(v) || 0;
    return { value: num, base: num, modifiers: [] };
  },
  _attr(v) {
    return { natural: this._n(v), augmented: this._n(v) };
  },

  /* ---- Découpe « Nom (parenthèse) » ---- */
  _splitParen(fr) {
    const m = String(fr || "").match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (m) return { base: m[1].trim(), paren: m[2].trim() };
    return { base: String(fr || "").trim(), paren: "" };
  },

  /* ---- Résolution d'une compétence FR → { key, spec } | { knowledge } ---- */
  _mapSkill(frName) {
    const { base, paren } = this._splitParen(frName);
    // « (GC) » = groupe de compétences, pas une spécialité.
    const spec = /^gc$/i.test(paren) ? "" : paren;
    let key = this.SKILL_MAP[base];
    // Pilotage (aéronefs / aéronefs T-bird) relève d'une autre compétence.
    if (base === "Pilotage" && /a[ée]ro|t-?bird/i.test(paren)) key = "pilotAircraft";
    if (!key || key === "@know") return { knowledge: true, name: frName };
    return { key, spec };
  },

  /* ========================================================
     PARSING DE L'ÉQUIPEMENT (texte libre → objets Foundry)
     ======================================================== */

  /** Une chaîne d'équipement est-elle une arme ? (notation [… VD/PRE …]) */
  _isWeaponStr(s) {
    return typeof s === "string" && /\[/.test(s) && /(VD|PRE)/.test(s);
  },
  /** …une armure ? (crochet chiffré sans VD/PRE, ou mot-clé d'armure) */
  _isArmorStr(s) {
    if (typeof s !== "string") return false;
    if (/\[\s*\d/.test(s) && !/(VD|PRE)/.test(s)) return true;
    return /armure|veste|gilet|manteau|combinaison|blind|pare-balles|casque|synth[ée]cuir/i.test(s);
  },

  _name(str) {
    return (String(str).split("[")[0] || "").trim();
  },

  /** Une grenade se reconnaît par son nom (pas par VD/PRE : les fumigènes
      n'en ont ni l'un ni l'autre). Testé AVANT _isWeaponStr/_isArmorStr. */
  _isGrenadeStr(s) {
    return typeof s === "string" && /^Grenade/i.test(this._name(s));
  },

  /** Cyberware du catalogue equipPools.cyberware (js/editions/sr5.js) :
      contrairement à pnj.augs (toujours itemAugmentation), ces picks
      atterrissent dans pnj.equip via buildLoadout(). Testé APRÈS
      _isWeaponStr (« Lame rétractable [VD 7P, PA -2] » reste une arme
      jouable) et AVANT _isArmorStr (« Armure dermique (+1 armure) » n'a
      aucun crochet chiffré : elle matchait par erreur le mot-clé
      "armure" → itemArmor de valeur 0, bug constaté). */
  _isCyberStr(s) {
    if (typeof s !== "string" || this._isWeaponStr(s)) return false;
    return /^(Réflexes câblés|Accroissement de réaction|Tonification musculaire|Yeux cybernétiques|Oreilles cybernétiques|Bras cybernétique|Armure dermique|Datajack)\b/i.test(s);
  },

  /** Arme (chaîne) → système d'un Item `itemWeapon`. `silent` propagé au
      classificateur (cf. parseGrenade). */
  parseWeapon(str, silent) {
    const s = String(str);
    // VD : nombre (« 8P ») ou basé sur la Force (« (FOR+2)P »).
    let dvValue = 0, strBased = false, dmgLetter = "P";
    const vdStr = s.match(/VD\s*\(FOR([^)]*)\)\s*([PSE])?/i);
    const vdNum = s.match(/VD\s*(\d+)\s*([PSE])?/i);
    if (vdStr) {
      strBased = true;
      const plus = vdStr[1].match(/([+-]\s*\d+)/);
      dvValue = plus ? parseInt(plus[1].replace(/\s/g, ""), 10) : 0;
      dmgLetter = (vdStr[2] || "P").toUpperCase();
    } else if (vdNum) {
      dvValue = parseInt(vdNum[1], 10);
      dmgLetter = (vdNum[2] || "P").toUpperCase();
    }
    // « E » = dégâts Étourdissants (stun), pas « électrique » : le marqueur
    // électrique réel est le suffixe « (e) » ou un mot-clé d'arme (électro,
    // taser, shocker…). Valeurs "physical"/"stun" = SR5.damageTypes exact
    // (scripts/config.js), pas "physicalDamage"/"stunDamage".
    const damageType = dmgLetter === "S" || dmgLetter === "E" ? "stun" : "physical";
    const damageElement = /\(e\)|électro|electro|taser|shock/i.test(s) ? "electricity" : "";

    // PA (pénétration d'armure) : « -1 », « — », absent → 0.
    let ap = 0;
    const apM = s.match(/PA\s*(-?\d+)/i);
    if (apM) ap = parseInt(apM[1], 10);

    // PRE (précision) : « 5 » ou « 5(7) » → valeur de base 5.
    let acc = 0;
    const preM = s.match(/PRE\s*(\d+)/i);
    if (preM) acc = parseInt(preM[1], 10);

    // Allonge (mêlée) : « Allonge 1 », « Allonge — ».
    let reach = 0;
    const reachM = s.match(/Allonge\s*(\d+)/i);
    if (reachM) reach = parseInt(reachM[1], 10);

    // Modes de tir : CC (coup par coup), SA (semi-auto), TR (rafale), TA (auto).
    // `value` liste les modes disponibles, `current` (code court SR5.weaponModesCode)
    // est le mode par défaut sélectionné — sans ça Foundry n'a rien à lancer.
    const inBrk = (s.match(/\[(.*)\]/) || [, ""])[1];
    const modeFlags = {
      singleShot: /\bCC\b/.test(inBrk),
      semiAutomatic: /\bSA\b/.test(inBrk),
      burstFire: /\bTR\b/.test(inBrk),
      fullyAutomatic: /\bTA\b/.test(inBrk),
    };
    const MODE_CODE = { semiAutomatic: "SA", singleShot: "SS", burstFire: "BF", fullyAutomatic: "FA" };
    const modeValue = Object.keys(modeFlags).filter((k) => modeFlags[k]);
    const current = ["semiAutomatic", "singleShot", "burstFire", "fullyAutomatic"].find((k) => modeFlags[k]);
    const firingMode = { ...modeFlags, value: modeValue, current: current ? MODE_CODE[current] : "" };

    const { category, type } = this._classifyWeapon(this._name(s), silent);
    const weaponSkill = {
      dicePool: 0, base: 0, modifiers: [], specialization: false,
      category: this._weaponSkillFor(category, type),
    };

    return {
      description: s,
      damageValue: { value: dvValue, base: dvValue, modifiers: [], isStrengthBased: strBased },
      damageType,
      damageElement,
      armorPenetration: { value: ap, base: ap, modifiers: [] },
      accuracy: { value: acc, base: acc, modifiers: [], isPhysicalLimitBased: false },
      category,
      type,
      weaponSkill,
      reach: this._n(reach),
      firingMode,
      quantity: 1,
    };
  },

  /** Grenade (chaîne) → système `itemWeapon` (category "grenade"). Certaines
      grenades (fumigène) n'ont ni VD ni PRE : detectée par préfixe de nom,
      pas par _isWeaponStr, sinon elle finirait en itemGear (bug constaté). */
  parseGrenade(str) {
    const base = this.parseWeapon(str, true);
    const s = String(str);
    const blastM = s.match(/Souffle\s*(\d+)\s*m/i);
    const radius = blastM ? parseInt(blastM[1], 10) : 0;
    return {
      ...base, category: "grenade", type: "", blast: { radius, damageFallOff: 0 },
      weaponSkill: { ...base.weaponSkill, category: "throwingWeapons" },
    };
  },

  /** Armure (chaîne) → système d'un Item `itemArmor`. Somme les crochets
      chiffrés (« [15+3] » = 18). */
  parseArmor(str) {
    const s = String(str);
    const brk = (s.match(/\[([^\]]*)\]/) || [, ""])[1];
    const nums = (brk.match(/\d+/g) || []).map((n) => parseInt(n, 10));
    const val = nums.reduce((a, b) => a + b, 0);
    return { description: s, armorValue: this._n(val) };
  },

  /* ========================================================
     CONSTRUCTION DE L'ACTEUR
     ======================================================== */

  /** Nom de fichier proposé pour le téléchargement. */
  filename(pnj) {
    const safe = String(pnj && pnj.name ? pnj.name : "pnj")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
    return `shadowherds-foundry-${safe || "pnj"}.json`;
  },

  /** Foundry valide `img` (FilePathField) : doit se terminer par une
      extension d'image reconnue. Le portrait IA de ShadowHerds
      (js/controllers/portrait.js) est soit une URL Pollinations sans
      extension (mode anonyme), soit une data URI base64 (mode token) —
      aucune des deux ne passe cette validation ("does not have a valid
      file extension"). On ne l'utilise donc que si elle qualifie déjà. */
  _hasImgExt(url) {
    return typeof url === "string" && /\.(apng|avif|bmp|gif|jpe?g|png|svg|tiff|webp)(\?.*)?$/i.test(url);
  },

  /** Item embarqué minimal { name, type, system }. */
  _item(name, type, system) {
    return { name: String(name || type), type, system: system || {} };
  },

  /** Normalise une entrée « nommée » (sort, pouvoir, atout) qui peut être
      une chaîne OU un objet { name, desc, drain… } → { name, desc }. */
  _named(x) {
    if (x && typeof x === "object") {
      const drain = x.drain ? ` (Drain ${x.drain})` : "";
      return { name: String(x.name || ""), desc: String(x.desc || "") + drain };
    }
    return { name: String(x || ""), desc: String(x || "") };
  },

  /** Construit les compétences Foundry + collecte les connaissances non
      mappées (retournées à part pour devenir des Items). */
  _buildSkills(pnj) {
    const skills = {};
    const knowledgeFromSkills = [];
    for (const sk of pnj.skills || []) {
      if (!sk || sk.name == null) continue;
      const res = this._mapSkill(sk.name);
      if (res.knowledge) {
        knowledgeFromSkills.push({ name: sk.name, val: sk.val });
        continue;
      }
      const meta = this.SKILL_META[res.key];
      if (!meta) {
        // res.key vient de SKILL_MAP (nos propres tables) : une clé sans
        // méta signale une incohérence interne, pas une dérive de catalogue.
        FoundryExport.note("compétence (clé sans métadonnées)", `${sk.name} → ${res.key}`);
        continue;
      }
      const [linkedAttribute, category, skillGroup, limitBase, canDefault] = meta;
      // Spécialité : celle de la compétence (sk.spec) prime sur la
      // parenthèse du nom (res.spec).
      const spec = sk.spec || res.spec || "";
      skills[res.key] = {
        rating: this._n(sk.val),
        test: { dicePool: 0, base: 0, modifiers: [] },
        linkedAttribute,
        limit: { value: 0, base: limitBase, modifiers: [] },
        skillGroup,
        category,
        canDefault: !!canDefault,
        specializations: spec,
      };
    }
    return { skills, knowledgeFromSkills };
  },

  /** Champs mécaniques d'un sort à partir de son entrée catalogue
      { name, cat, drain, desc } (js/rules/content.js) OU d'un simple nom
      (spellsByTradition) — dans ce cas on retrouve l'entrée enrichie dans
      Content.spells.sr5 par nom pour récupérer cat/drain/desc.
      category/type/range/duration/damageType sont extraits des tournures
      FR fixes que le catalogue utilise déjà (« Type M/P », « Maintenue »,
      « au contact », « (Z) »…) : pas de champs structurés en amont. */
  _spellFields(sp) {
    const entry = sp && typeof sp === "object"
      ? sp
      : (typeof Content !== "undefined" && Content.spells && Content.spells.sr5 || [])
          .find((s) => s.name === sp) || null;
    const desc = (entry && entry.desc) || "";
    // "sante" (sans accent, cf. content.js) → "health" (SR5.spellCategories) ;
    // combat/detection/illusion/manipulation collent déjà à l'énum Foundry.
    const rawCat = (entry && entry.cat) || "";
    const category = rawCat === "sante" ? "health" : rawCat;
    const type = /Type\s*M\b/i.test(desc) ? "mana" : /Type\s*P\b/i.test(desc) ? "physical" : "";
    const range = /contact/i.test(desc) ? "touch"
      : /\(Z\)|zone/i.test(desc) ? "area"
      : /personnel/i.test(desc) ? "personal"
      : "lineOfSight";
    const duration = /Maintenue/i.test(desc) ? "sustained"
      : /Permanente/i.test(desc) ? "permanent"
      : "instantaneous";
    // Dégâts : uniquement pertinent pour les sorts de combat (« Type P/M »
    // seul désigne le Type du sort, pas ses dégâts — une illusion « Type P »
    // ne fait pas de dégâts physiques).
    const damageType = category !== "combat" ? ""
      : /dommages?\s+([ée]tourdissants?|E\b)/i.test(desc) ? "stun" : "physical";
    // Drain : nombre fixe, ou code « P-2 »/« P+1 » (modificateur signé sur Force).
    const drainRaw = entry ? entry.drain : null;
    let drainNum = 0;
    if (typeof drainRaw === "number") drainNum = drainRaw;
    else if (typeof drainRaw === "string") {
      const m = drainRaw.match(/([+-]\d+)/);
      drainNum = m ? parseInt(m[1], 10) : 0;
    }
    return { name: (entry && entry.name) || String(sp || ""), desc, category, type, range, duration, damageType, drainRaw, drainNum };
  },

  /** Item `itemAugmentation` minimal à partir d'une chaîne (cyber/bioware). */
  _augItem(str) {
    return this._item(this._name(str) || str, "itemAugmentation", {
      description: str, grade: "standard", category: "",
      essenceCost: { value: 0, base: 0, modifiers: [], multiplier: "" },
    });
  },

  /** Construit tous les Items embarqués de l'acteur. */
  _buildItems(pnj, knowledgeFromSkills) {
    const items = [];
    // Équipement : armes, armures, cyberware égaré dans equip, reste = matériel.
    for (const e of pnj.equip || []) {
      if (typeof e !== "string") continue;
      if (this._isGrenadeStr(e)) items.push(this._item(this._name(e), "itemWeapon", this.parseGrenade(e)));
      else if (this._isWeaponStr(e)) items.push(this._item(this._name(e), "itemWeapon", this.parseWeapon(e)));
      else if (this._isCyberStr(e)) items.push(this._augItem(e));
      else if (this._isArmorStr(e)) items.push(this._item(this._name(e), "itemArmor", this.parseArmor(e)));
      else items.push(this._item(this._name(e) || e, "itemGear", { description: e, quantity: 1 }));
    }
    // Augmentations (cyber/bioware) déjà bien rangées côté pnj.augs.
    for (const a of pnj.augs || []) {
      if (typeof a !== "string") continue;
      items.push(this._augItem(a));
    }
    // Sorts, pouvoirs d'adepte, connaissances, atouts/traits.
    // Ces listes contiennent selon les cas des chaînes OU des objets
    // ({name, desc, drain…}) → _named() normalise les deux.
    for (const sp of pnj.spells || []) {
      const f = this._spellFields(sp);
      const drainSuffix = f.drainRaw != null ? ` (Drain ${f.drainRaw})` : "";
      items.push(this._item(f.name, "itemSpell", {
        description: f.desc + drainSuffix,
        category: f.category,
        type: f.type,
        range: f.range,
        duration: f.duration,
        damageType: f.damageType,
        drainValue: { value: f.drainNum, base: f.drainNum, modifiers: [] },
        drain: { value: f.drainNum, base: f.drainNum, modifiers: [] },
      }));
    }
    for (const pw of pnj.powers || []) {
      const { name, desc } = this._named(pw);
      items.push(this._item(name, "itemAdeptPower", { description: desc }));
    }
    for (const kn of pnj.knowledges || []) {
      const name = kn.name || kn;
      const meta = this._knowledgeMeta(name);
      items.push(this._item(name, "itemKnowledge", {
        description: "", rating: this._n(kn.val), linkedAttribute: meta.linkedAttribute, type: meta.type,
      }));
    }
    for (const kn of knowledgeFromSkills || []) {
      const meta = this._knowledgeMeta(kn.name);
      items.push(this._item(kn.name, "itemKnowledge", {
        description: "", rating: this._n(kn.val), linkedAttribute: meta.linkedAttribute, type: meta.type,
      }));
    }
    for (const tr of pnj.traits || []) {
      const { name, desc } = this._named(tr);
      items.push(this._item(name, "itemQuality", { description: desc, type: "", karmaCost: 0 }));
    }
    return items;
  },

  /** PNJ SR5 → document acteur Foundry `actorGrunt`. */
  buildActor(pnj) {
    const a = pnj.attrs || {};

    // Attributs principaux.
    const attributes = {};
    for (const [code, key] of Object.entries(this.ATTR_MAP))
      attributes[key] = this._attr(a[code]);

    // Attributs spéciaux : Chance (edge), Magie / Résonance.
    const awakened = (a.MAG || 0) > 0 || (pnj.spells || []).length > 0 || (pnj.powers || []).length > 0;
    const techno = (a.RES || 0) > 0;
    const specialAttributes = {
      edge: this._attr(a.CHC),
      magic: this._attr(a.MAG),
      resonance: this._attr(a.RES),
    };
    const activeSpecialAttribute = techno ? "resonance" : awakened ? "magic" : "";

    // Type de magie (SR5.magicTypes) : Adepte pur, ou magicien (mage
    // hermétique/chaman/Aztechnology) — ShadowHerds n'a pas de notion
    // d'adepte mystique/magicien aspecté (special est une valeur unique).
    const magicType = pnj.special === "Adepte"
      ? "adept"
      : awakened && (pnj.spells || []).length ? "magician" : "";
    const tradition = this.TRADITION_MAP[pnj.tradition] || "";

    const { skills, knowledgeFromSkills } = this._buildSkills(pnj);
    const items = this._buildItems(pnj, knowledgeFromSkills);

    // Moniteur de condition unique (grunt) : taille = physMon.
    const monBase = Number(pnj.physMon) || 0;

    const system = {
      attributes,
      specialAttributes,
      activeSpecialAttribute,
      essence: { value: Number(a.ESS ?? 6), base: 6, modifiers: [] },
      initiatives: {
        physicalInit: {
          value: 0, base: Number(pnj.init) || 0, modifiers: [],
          dice: { value: 0, base: Number(pnj.initDice) || 1, modifiers: [] },
          isActive: true,
        },
      },
      limits: {
        physicalLimit: this._n(pnj.limPhys),
        mentalLimit: this._n(pnj.limMent),
        socialLimit: this._n(pnj.limSoc),
      },
      conditionMonitors: {
        condition: { value: monBase, base: monBase, modifiers: [], actual: { value: 0, base: 0, modifiers: [] }, boxes: [] },
      },
      skills,
      magic: { magicType, tradition, concentration: false },
      biography: {
        characterMetatype: pnj.meta || "",
        metatypeVariant: pnj.metavariant || "",
        nickname: pnj.name || "",
        gender: pnj.gender || "",
        age: pnj.flavor && pnj.flavor.age != null ? String(pnj.flavor.age) : "",
        description: [pnj.archetype, pnj.special && pnj.special !== "Aucun" ? pnj.special : "", pnj.notes]
          .filter(Boolean).join(" · "),
        // pnj.flavor = {signe, manie, motivation, style, attitude} (js/rules/flavor.js) :
        // seul endroit du template biography où cet habillage a sa place.
        background: pnj.flavor
          ? [pnj.flavor.style, pnj.flavor.attitude, pnj.flavor.manie, pnj.flavor.motivation, pnj.flavor.signe]
              .filter(Boolean).join(" · ")
          : "",
      },
    };

    return {
      name: pnj.name || "PNJ",
      type: "actorGrunt",
      img: this._hasImgExt(pnj.portraitUrl) ? pnj.portraitUrl : "icons/svg/mystery-man.svg",
      system,
      items,
    };
  },
};

/* Auto-enregistrement sur le module d'édition SR5 (chargé avant nous).
   Le contrôleur neutre FoundryExport lira App.editionModule.foundryExport ;
   absent pour SR6/Anarchy (aucune capacité d'export Foundry pour l'instant). */
if (typeof EditionSR5 !== "undefined") {
  EditionSR5.foundryExport = FoundrySR5Export;
}
