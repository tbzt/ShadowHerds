"use strict";

/* ============================================================
   COHERENCE — moteur générique de composition de PNJ par
   Rôle × Milieu × Puissance.

   Ne connaît AUCUNE édition (pas de `if (App.edition === …)`,
   cf. CLAUDE.md). Chaque module d'édition lui fournit ses propres
   tables (attrByProf, skillCount, equipPools…) et l'appelle pour
   résoudre le tuple {role, milieu} d'un archétype puis pondérer
   attributs/compétences — même patron que spirits.js
   (_spawnSR/_spawnAnarchy) : le moteur porte l'algorithme et des
   données abstraites, l'édition porte le vocabulaire concret.

   Les 55/45/28 archétypes nommés des éditions ne sont PAS
   recopiés ici : `resolveTuple` les résout à la volée depuis
   ProfCategories (catégorie → milieu) + mots-clés du nom
   (→ rôle). Ajouter un rôle plus tard = une entrée dans ROLES +
   ROLE_KEYWORDS, sans toucher aux éditions (cf. demande d'
   extensibilité — les PNJ SR restent volontairement moins
   polyvalents que les PJ, mais la taxonomie doit pouvoir
   s'affiner).
   ============================================================ */
const Coherence = {
  /* ========================================================
     RÔLES — fonction du PNJ. attrPriority = attributs canoniques
     à favoriser (ordre = poids décroissant) ; skillRegex filtre
     SkillCatalog pour piocher les compétences du rôle ; awakened :
     false | "caster" (lance des sorts) | "adept" (pouvoirs, pas
     de sorts).
     ======================================================== */
  ROLES: {
    combattant: {
      label: "Combattant",
      attrPriority: ["AGI", "CON", "FOR"],
      skillRegex: /arme|(?<!cyber)combat|mains nues|arts martiaux|tir/i,
      weaponCategory: "firearms",
      awakened: false,
    },
    mage: {
      label: "Mage",
      attrPriority: ["LOG", "VOL"],
      skillRegex: /sort|sorcellerie|conjuration|invocation|bannissement|lien d'esprit|alchimie|contresort|enchant|magie rituelle|métamorphose/i,
      weaponCategory: "pistolet",
      awakened: "caster",
    },
    chamane: {
      label: "Chamane",
      attrPriority: ["VOL", "CHA"],
      skillRegex: /sort|sorcellerie|conjuration|invocation|bannissement|lien d'esprit|alchimie|contresort|enchant|magie rituelle/i,
      weaponCategory: "pistolet",
      awakened: "caster",
    },
    adepte: {
      label: "Adepte",
      attrPriority: ["AGI", "FOR", "CON"],
      skillRegex: /arme|(?<!cyber)combat|mains nues|arts martiaux|athlétisme|acrobaties|gymnastique/i,
      weaponCategory: "melee",
      awakened: "adept",
    },
    decker: {
      label: "Decker",
      attrPriority: ["LOG", "INT"],
      skillRegex: /hack|piratage|cybercombat|électronique|hardware|informatique|matricielle|récupération de données/i,
      weaponCategory: "pistolet",
      awakened: false,
    },
    rigger: {
      label: "Rigger",
      attrPriority: ["REA", "LOG"],
      skillRegex: /pilotage|conduite|aviation|mécanique|drone|véhicule|appareils volants|appareils spatiaux|marcheurs/i,
      weaponCategory: "pistolet",
      awakened: false,
    },
    technicien: {
      label: "Technicien",
      attrPriority: ["LOG", "AGI"],
      skillRegex: /mécanique|électronique|ingénierie|hardware|biotech|industrie|sciences appliquées/i,
      weaponCategory: "pistolet",
      awakened: false,
    },
    social: {
      label: "Social",
      attrPriority: ["CHA", "INT"],
      skillRegex: /étiquette|négociation|influence|leadership|escroquerie|impost|réseau|sociale/i,
      weaponCategory: "pistolet",
      awakened: false,
    },
    infiltrateur: {
      label: "Infiltrateur",
      attrPriority: ["AGI", "INT"],
      skillRegex: /discrétion|furtivité|crochetage|serrurerie|filature|pistage|escamotage|déguisement/i,
      weaponCategory: "pistolet",
      awakened: false,
    },
    civil: {
      label: "Civil",
      attrPriority: [],
      skillRegex: /perception|premiers soins|étiquette/i,
      weaponCategory: "aucune",
      awakened: false,
    },
  },

  /** true si le rôle lance des sorts (drain), false pour un adepte pur. */
  castsSpells(role) {
    return this.ROLES[role]?.awakened === "caster";
  },
  isAwakened(role) {
    return !!this.ROLES[role]?.awakened;
  },

  /* ========================================================
     MILIEUX — origine/faction. Dérivés des catégories déjà
     posées par ProfCategories (js/widgets/profcategories.js).
     skillOverlay : libellés « idéaux » (filtrés contre
     SkillCatalog[edition] avant usage, car les noms de spécialité
     entre parenthèses ne sont pas des clés du catalogue).
     ======================================================== */
  MILIEUX: {
    rue: { label: "Rue", skillOverlay: ["Survie", "Étiquette", "Course", "Véhicules terrestres", "Conduite"] },
    gang: { label: "Gang", skillOverlay: ["Intimidation", "Étiquette", "Pilotage"] },
    crime: { label: "Crime organisé", skillOverlay: ["Étiquette", "Discrétion", "Pistolets", "Armes à feu"] },
    securite_corpo: { label: "Sécurité corpo", skillOverlay: ["Étiquette", "Cybercombat", "Perception"] },
    police: { label: "Police & ordre", skillOverlay: ["Leadership", "Perception", "Étiquette"] },
    militaire: { label: "Militaire", skillOverlay: ["Armes lourdes", "Survie", "Explosifs"] },
    corpo: { label: "Corpo", skillOverlay: ["Étiquette", "Négociation", "Informatique"] },
    ombres: { label: "Ombres", skillOverlay: ["Discrétion", "Pistage", "Filature", "Déguisement"] },
  },

  /** Catégorie ProfCategories (libellé FR partagé sr5/sr6/anarchy) → milieu. */
  MILIEU_BY_CATEGORY: {
    "Bas de l'échelle": "rue",
    "Gangs": "gang",
    "Sécurité corpo": "securite_corpo",
    "Police & ordre": "police",
    "Crime organisé": "crime",
    "Militaire & mercenaire": "militaire",
    "Militaire": "militaire",
    "Éveillés": "ombres",
    "Professionnels spécialisés": "ombres",
    "Matrice & riggers": "ombres",
    "Corpo & contacts": "corpo",
    "Autres": "rue",
  },

  /** Mots-clés génériques : nom d'archétype → rôle. Étendre cette liste
      (nouveaux rôles) n'affecte aucune édition. */
  ROLE_KEYWORDS: [
    [/mage|hermétique|aztechnology/i, "mage"],
    [/chaman/i, "chamane"],
    [/adepte/i, "adepte"],
    [/decker|hack/i, "decker"],
    [/rigger|pilote|go-ganger/i, "rigger"],
    [/technicien|mécanicien|ingénieur|matériel/i, "technicien"],
    [/détective|espion|cambrioleur|assassin|passeur|coyote|sans-abri/i, "infiltrateur"],
    [/johnson|cadre|employé corpo|enquêteur|négociant|négociateur|dealer|capo|wakagashira|contrebandier|trafiquant/i, "social"],
    [/^civil/i, "civil"],
    // Filet générique : un archétype marqué « éveillé » sans mot-clé plus
    // précis (chaman/adepte) est traité comme mage par défaut.
    [/éveillé/i, "mage"],
  ],

  resolveRole(archetypeName) {
    const name = archetypeName || "";
    for (const [re, role] of this.ROLE_KEYWORDS) {
      if (re.test(name)) return role;
    }
    return "combattant";
  },

  resolveMilieu(categoryLabel) {
    return this.MILIEU_BY_CATEGORY[categoryLabel] || "rue";
  },

  /** Résout le tuple {role, milieu} d'un archétype nommé d'une édition,
      à partir des groupes ProfCategories (qui savent déjà dans quel
      milieu range chaque nom). */
  resolveTuple(editionId, archetypeName) {
    const groups = (typeof ProfCategories !== "undefined" && ProfCategories[editionId]) || [];
    const group = groups.find((g) => g.items.includes(archetypeName));
    return {
      role: this.resolveRole(archetypeName),
      milieu: this.resolveMilieu(group ? group.cat : ""),
    };
  },

  /**
   * Choisit un archétype nommé cohérent parmi `archetypes`, avec tirage
   * *pondéré par milieu* et *relâchement gracieux*.
   *
   * - Filtre d'abord sur le rôle/milieu explicitement demandés.
   * - Si ce filtre ne laisse rien (l'édition ne couvre pas cette
   *   combinaison), relâche : milieu seul → rôle seul → tout — au lieu de
   *   retomber en tirage « n'importe quoi » (qui, plat sur les archétypes,
   *   favorise la catégorie la plus fournie, cf. flot de profils sécurité).
   * - Tire enfin un milieu *uniformément parmi les milieux présents* dans le
   *   pool, puis un archétype dans ce milieu : « Aléatoire » puise ainsi dans
   *   les divers milieux pertinents au lieu du plus peuplé.
   *
   * @returns {string|null} nom d'archétype, ou null si le pool est vide.
   */
  pickArchetype(editionId, archetypes, { role = null, milieu = null } = {}) {
    const tuples = (archetypes || [])
      .filter((n) => n && n !== "Aléatoire")
      .map((n) => ({ name: n, ...this.resolveTuple(editionId, n) }));
    if (!tuples.length) return null;

    const byRole = (p) => (!role || p.role === role);
    const byMilieu = (p) => (!milieu || p.milieu === milieu);

    // Relâchement gracieux : combinaison exacte → milieu seul → rôle seul → tout.
    let pool = tuples.filter((p) => byRole(p) && byMilieu(p));
    if (!pool.length && role && milieu) {
      this._warnRelax(editionId, role, milieu, "milieu seul");
      pool = tuples.filter(byMilieu);
    }
    if (!pool.length && (role || milieu)) {
      this._warnRelax(editionId, role, milieu, role ? "rôle seul" : "tout");
      pool = role ? tuples.filter(byRole) : tuples;
    }
    if (!pool.length) {
      this._warnRelax(editionId, role, milieu, "tout");
      pool = tuples;
    }

    // Tirage équilibré : un milieu uniformément parmi ceux présents, puis un
    // archétype dans ce milieu.
    const groups = {};
    for (const p of pool) (groups[p.milieu] ||= []).push(p.name);
    const chosenMilieu = Utils.rand(Object.keys(groups));
    return Utils.rand(groups[chosenMilieu]);
  },

  _warnRelax(editionId, role, milieu, fallback) {
    if (typeof Debug === "undefined") return;
    Debug.warn(
      "coherence",
      `pickArchetype(${editionId}) : aucun archétype pour {role:${role || "—"}, milieu:${milieu || "—"}} → relâche vers ${fallback}`,
    );
  },

  /* ========================================================
     COMPOSITION
     ======================================================== */

  /**
   * Repondère un jeu d'attributs déjà calculé par l'édition (base +
   * variance habituelle) en poussant les attributs prioritaires du
   * rôle. Ne clampe PAS : l'édition applique ensuite ses propres
   * bornes de métatype, comme aujourd'hui.
   * @param {Object} baseAttrs - attributs canoniques déjà présents sur le pnj
   * @param {string} role
   * @param {number} variance - amplitude du surplus aléatoire (défaut 1)
   * @param {Object} keyMap - alias clé canonique (ROLES) -> clé réelle de
   *   l'édition, ex. SR6 { REA: "RÉA" } (accent absent des clés canoniques).
   */
  reweightAttrs(baseAttrs, role, variance = 1, keyMap = {}) {
    const prio = this.ROLES[role]?.attrPriority || [];
    const out = { ...baseAttrs };
    prio.forEach((k, i) => {
      const attrKey = keyMap[k] || k;
      if (out[attrKey] === undefined) return;
      const bonus = prio.length - i; // primaire pèse plus que secondaire/tertiaire
      out[attrKey] = out[attrKey] + bonus + Utils.randInt(0, variance);
    });
    return out;
  },

  /** Compétences du rôle disponibles dans le catalogue d'une édition. */
  skillsForRole(edition, role) {
    const re = this.ROLES[role]?.skillRegex;
    if (!re || typeof SkillCatalog === "undefined") return [];
    return SkillCatalog.skillsFor(edition).filter((s) => re.test(s));
  },

  /** Compétences « de saveur » du milieu, filtrées contre le catalogue
      réel de l'édition (un libellé absent du catalogue est ignoré). */
  skillsForMilieu(edition, milieu) {
    const overlay = this.MILIEUX[milieu]?.skillOverlay || [];
    if (typeof SkillCatalog === "undefined") return [];
    const known = new Set(SkillCatalog.skillsFor(edition));
    return overlay.filter((s) => known.has(s));
  },

  /**
   * Échantillonne `count` compétences cohérentes avec le rôle+milieu
   * pour une édition donnée, sans doublon. Complète avec le catalogue
   * général si le pool rôle+milieu est trop court (jamais moins que
   * demandé, comme le comportement existant des pools figés).
   */
  sampleSkills(edition, role, milieu, count) {
    const pool = [...new Set([...this.skillsForRole(edition, role), ...this.skillsForMilieu(edition, milieu)])];
    if (pool.length < count && typeof SkillCatalog !== "undefined") {
      const rest = SkillCatalog.skillsFor(edition).filter((s) => !pool.includes(s));
      pool.push(...rest);
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  },

  weaponCategory(role) {
    return this.ROLES[role]?.weaponCategory || "pistolet";
  },

  /* ========================================================
     AUTO-TEST — garde-fou de non-régression léger, exécuté au
     chargement (canal "coherence" dans Debug, coût nul si le
     canal n'est pas actif).
     ======================================================== */
  _selfTest() {
    if (typeof Debug === "undefined") return;
    const roles = Object.keys(this.ROLES);
    const editions = ["sr5", "sr6", "anarchy2", "anarchy1"];
    for (const role of roles) {
      if (!Array.isArray(this.ROLES[role].attrPriority)) {
        Debug.warn("coherence", `rôle ${role} : attrPriority invalide`);
      }
    }
    for (const ed of editions) {
      for (const role of roles) {
        const skills = this.sampleSkills(ed, role, "rue", 4);
        if (!skills.length) {
          Debug.warn("coherence", `sampleSkills(${ed}, ${role}) est vide`);
        }
      }
    }
    // Couverture rôle/milieu : signale les options « composition libre » qu'une
    // édition ne peut satisfaire (aucun archétype résolu) → trous de contenu à
    // peupler. Base = archétypes classés par ProfCategories.
    if (typeof ProfCategories !== "undefined") {
      const milieux = Object.keys(this.MILIEUX);
      for (const ed of editions) {
        const names = (ProfCategories[ed] || []).flatMap((g) => g.items);
        const covRoles = new Set(names.map((n) => this.resolveRole(n)));
        const covMilieux = new Set(names.map((n) => this.resolveTuple(ed, n).milieu));
        const deadRoles = roles.filter((r) => !covRoles.has(r));
        const deadMilieux = milieux.filter((m) => !covMilieux.has(m));
        if (deadRoles.length || deadMilieux.length) {
          Debug.warn("coherence", `couverture ${ed} : rôles sans archétype [${deadRoles.join(", ") || "—"}], milieux sans archétype [${deadMilieux.join(", ") || "—"}]`);
        }
      }
    }
    Debug.log("coherence", "self-test terminé", { roles: roles.length, editions });
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => Coherence._selfTest());
}
