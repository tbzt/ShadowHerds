"use strict";

/* ============================================================
   ANARCHY 2.0 — BARÈME DE CRÉATION DE PERSONNAGE JOUABLE
   Source : [SRAN2_01]--Anarchy-v2_web_v1.pdf, chapitre « Création et
   progression des personnages » (p.50-52 attributs/compétences, p.58-61
   atouts, p.83-86 coûts et tables de création).

   La V2 crée les personnages en NUYENS (¥), pas en Karma (différence
   avec la V1 — cf. mémoire projet). Les métatypes V2 n'ont pas de bonus
   plats : seulement des fourchettes min/max différentes par attribut
   (p.52). Ce fichier est un barème pur, isolé pour rester facile à
   corriger si une valeur doit être ajustée après relecture du livre.
   ============================================================ */
Object.assign(EditionAnarchy2, {
  creation: {
    /* ---- Coûts unitaires (récapitulatif p.83) ---- */
    costs: {
      attrPoint: 10000, // par point d'attribut
      attrLastPoint: 20000, // dernier point pour atteindre le max du métatype
      skillPoint: 2500, // par point de compétence, indices 1 à 5
      skillPointHigh: 5000, // par point de compétence, indices 6 à 8
      specialization: 2500, // nécessite indice ≥ 1 dans la compétence
      knowledge: 2500,
      edgeLevel: 5000, // par niveau d'atout
      spell: 5000,
      weaponNormal: 2500, // arme de mêlée ou à distance jusqu'au fusil
      weaponSpecialist: 5000, // fusil de précision, lance-grenades, mitrailleuse...
      armorPoint: 2500, // par point d'Armure au-delà du kit de départ
      gear: 2500, // équipement standard
    },

    /* ---- Niveaux de jeu (p.85-86) ---- */
    gameLevels: {
      ganger: {
        label: "Ganger",
        nuyen: 300000,
        attrsAtMax: 0, // aucun attribut au maximum du métatype
        skillMax: 4,
        rrMax: 1, // RR max pour attributs/compétences, cumuls compris
        rrMaxSpec: 1,
      },
      runner: {
        label: "Runner",
        nuyen: 375000,
        attrsAtMax: 1,
        skillMax: 5,
        rrMax: 1,
        rrMaxSpec: 2, // "maximum 2 pour les spécialisations"
      },
      elite: {
        label: "Runner d'élite",
        nuyen: 450000,
        attrsAtMax: 2,
        skillMax: 6,
        rrMax: 2,
        rrMaxSpec: 2,
      },
    },

    /* ---- Tables de points précalculées (p.86) ----
       Kit toujours fourni en plus : 1 commlink (+trodes), 1 faux SIN,
       1 armure (3) — cf. startingGear. "skillsAtCap" = nombre de
       compétences pouvant atteindre le plafond du niveau de jeu quand
       la table le précise explicitement (ex. "40 (2 au rang 6)" pour
       les runners d'élite) ; `null` = pas de sous-limite au-delà du
       plafond général. */
    pointTables: {
      ganger: {
        equilibre: {
          label: "Équilibré",
          attrPoints: 12,
          skillPoints: 30,
          skillsAtCap: null,
          edgePoints: 18,
          kit: { armesNormales: 2, armesSpe: 0, equipements: 1, sorts: 0 },
        },
        magicien: {
          label: "Magicien",
          attrPoints: 12,
          skillPoints: 30,
          skillsAtCap: null,
          edgePoints: 14,
          kit: { armesNormales: 1, armesSpe: 0, equipements: 2, sorts: 4 },
        },
        combattant: {
          label: "Combattant",
          attrPoints: 12,
          skillPoints: 30,
          skillsAtCap: null,
          edgePoints: 17,
          kit: { armesNormales: 3, armesSpe: 0, equipements: 2, sorts: 0 },
        },
      },
      runner: {
        equilibre: {
          label: "Équilibré",
          attrPoints: 14,
          skillPoints: 35,
          skillsAtCap: null,
          edgePoints: 24,
          kit: { armesNormales: 2, armesSpe: 0, equipements: 2, sorts: 0 },
        },
        magicien: {
          label: "Magicien",
          attrPoints: 14,
          skillPoints: 35,
          skillsAtCap: null,
          edgePoints: 18,
          kit: { armesNormales: 1, armesSpe: 0, equipements: 3, sorts: 6 },
        },
        combattant: {
          label: "Combattant",
          attrPoints: 14,
          skillPoints: 35,
          skillsAtCap: null,
          edgePoints: 22,
          kit: { armesNormales: 4, armesSpe: 1, equipements: 2, sorts: 0 },
        },
      },
      elite: {
        equilibre: {
          label: "Équilibré",
          attrPoints: 16,
          skillPoints: 40,
          skillsAtCap: 2,
          edgePoints: 28,
          kit: { armesNormales: 3, armesSpe: 0, equipements: 4, sorts: 0 },
        },
        magicien: {
          label: "Magicien",
          attrPoints: 16,
          skillPoints: 40,
          skillsAtCap: 2,
          edgePoints: 22,
          kit: { armesNormales: 1, armesSpe: 0, equipements: 4, sorts: 7 },
        },
        combattant: {
          label: "Combattant",
          attrPoints: 16,
          skillPoints: 40,
          skillsAtCap: 2,
          edgePoints: 26,
          kit: { armesNormales: 4, armesSpe: 2, equipements: 3, sorts: 0 },
        },
      },
    },

    /* ---- Métatypes : fourchettes d'attributs (p.52) ----
       Pas de bonus plats en V2, seulement des bornes min/max qui varient
       (Anarchy = pool de dés d'Anarchy du métatype, hors création). */
    metatypes: {
      Humain: { FOR: [1, 4], AGI: [1, 4], VOL: [1, 4], LOG: [1, 4], CHA: [1, 4], anarchy: 4 },
      Elfe: { FOR: [1, 4], AGI: [1, 4], VOL: [1, 4], LOG: [1, 4], CHA: [1, 5], anarchy: 3 },
      Nain: { FOR: [1, 4], AGI: [1, 4], VOL: [1, 5], LOG: [1, 4], CHA: [1, 4], anarchy: 3 },
      Ork: { FOR: [1, 5], AGI: [1, 4], VOL: [1, 4], LOG: [1, 4], CHA: [1, 4], anarchy: 3 },
      Troll: { FOR: [1, 6], AGI: [1, 4], VOL: [1, 4], LOG: [1, 4], CHA: [1, 4], anarchy: 3 },
    },

    /* ---- Les 14 compétences officielles + spécialisations (p.53-56) ----
       Catalogue propre à la création, distinct de SkillCatalog.anarchy
       (qui mélange des spécialisations en tête de liste pour les besoins
       du générateur de PNJ — cf. mémoire projet, non touché ici). attr =
       attribut principal ; attrAlt = second attribut valide pour la
       compétence entière (le meneur tranche selon le contexte, p.53). */
    skills: [
      {
        name: "Athlétisme",
        attr: "FOR",
        attrAlt: "AGI",
        specs: ["Course", "Escalade", "Natation", "Parkour", "Défense à distance"],
      },
      {
        name: "Furtivité",
        attr: "AGI",
        specs: [
          "Discrétion physique",
          "Discrétion astrale",
          "Discrétion matricielle",
          "Escamotage",
          "Crochetage",
        ],
      },
      {
        name: "Perception",
        attr: "LOG",
        specs: ["Physique", "Sociale", "Astrale", "Matricielle"],
      },
      {
        name: "Pilotage",
        attr: "AGI",
        specs: [
          "Motos",
          "Voitures",
          "Camions",
          "Véhicules aquatiques",
          "Véhicules volants",
          "Drones terrestres",
          "Drones aquatiques",
          "Drones volants",
        ],
      },
      {
        name: "Survie",
        attr: "VOL",
        specs: ["Survie en milieu naturel", "Orientation", "Premiers soins", "Dressage", "Sang-froid"],
      },
      {
        name: "Armes à distance",
        attr: "AGI",
        specs: [
          "Armes de jet",
          "Armes de trait",
          "Pistolets",
          "Mitraillettes",
          "Fusils",
          "Lance-grenades",
          "Armes lourdes",
          "Armes montées",
        ],
      },
      {
        name: "Combat rapproché",
        attr: "AGI",
        attrAlt: "VOL",
        specs: ["Mains nues", "Lames", "Armes contondantes", "Combat astral", "Défense"],
      },
      {
        name: "Électronique",
        attr: "LOG",
        specs: ["Appareils personnels", "Protection matricielle", "Recherche matricielle"],
      },
      {
        name: "Piratage",
        attr: "LOG",
        specs: ["Backdoor", "Force brute", "Cybercombat"],
      },
      {
        name: "Ingénierie",
        attr: "LOG",
        specs: [
          "Armes contrôlées à distance",
          "C&R appareils électroniques",
          "C&R véhicules",
          "C&R drones",
          "C&R engins mécaniques",
          "C&R implants cybernétiques",
          "Explosifs",
          "Guerre électronique",
        ],
      },
      {
        name: "Influence",
        attr: "CHA",
        specs: ["Bluff", "Étiquette", "Imposture", "Négociation", "Intimidation"],
      },
      {
        name: "Réseau",
        attr: "CHA",
        specs: [
          "Corporatiste",
          "Criminel",
          "De la rue",
          "Gouvernemental",
          "Ingénierie",
          "Magique",
          "Matriciel",
          "Médiatique",
          "Médical",
          "Universitaire",
        ],
      },
      {
        name: "Sorcellerie",
        attr: "VOL",
        awakenedOnly: true,
        specs: [
          "Sorts de combat",
          "Sorts de détection",
          "Sorts de santé",
          "Sorts d'illusion",
          "Sorts de manipulation",
          "Contresort",
        ],
      },
      {
        name: "Conjuration",
        attr: "LOG",
        attrAlt: "CHA",
        awakenedOnly: true,
        specs: [
          "Esprits de l'air",
          "Esprits de l'eau",
          "Esprits du feu",
          "Esprits de la terre",
          "Esprits des aînés",
          "Esprits des bêtes",
          "Esprits des plantes",
          "Bannissement",
        ],
      },
    ],

    /* ---- Kit de départ commun, gratuit, à toutes les tables (p.86) ---- */
    startingGear: {
      commlink: "Commlink (avec trodes)",
      fauxSIN: "Faux SIN",
      armor: 3,
    },

    /* ---- Atouts courants pré-câblés (p.61) ----
       BonusEngine._applyAnarchy motorise déjà le texte "RR N aux tests
       de X" et "Armure +N" (cf. js/rules/bonusengine.js) : ces gabarits
       respectent cette convention pour s'appliquer automatiquement, sans
       code de bonus supplémentaire. Le reste du (vaste) système de
       construction d'atouts du livre (cyberware/bioware/pouvoirs
       d'adepte/véhicules avec leurs propres tables d'effets, p.58-63)
       reste accessible via un atout personnalisé en texte libre. */
    edgeTemplates: [
      {
        id: "rr-spec",
        label: "RR 1 pour une spécialisation",
        level: 2,
        text: (skill, sub) => `RR 1 aux tests de ${skill}${sub ? ` (${sub})` : ""}`,
      },
      {
        id: "rr-skill",
        label: "RR 1 pour une compétence",
        level: 5,
        text: (skill) => `RR 1 aux tests de ${skill}`,
      },
    ],

    /* ---- Accès catalogue (API lue par chargen.js) ----
       Ces méthodes isolent les catalogues propres à Anarchy (armes, sorts,
       esprits mentors) derrière une API neutre. chargen.js ne nomme ainsi
       aucune édition : chaque module `creation` fournit sa propre version. */

    /** Catalogue d'armes proposé à la création : nom + drapeau spécialiste. */
    weaponCatalog() {
      return Object.keys(EditionAnarchy2.WEAPON_CATALOG).map((name) => ({
        name,
        specialist: this.WEAPON_CATALOG_SPECIALIST.has(name),
      }));
    },

    /** Sorts sélectionnables à la création. */
    spellPool() {
      return (Content.spells.anarchy2 || []).map((sp) => ({ name: sp.name }));
    },

    /** Tire un esprit mentor selon la tradition éveillée (ou null). */
    drawMentor(awakened) {
      const kindMap = { hermétique: "hermetic", chamanique: "shamanic", adepte: "adept" };
      return Magic.pickMentor("anarchy2", null, kindMap[awakened]) || null;
    },

    /* ---- Presets de démarrage rapide ----
       Chaque `patch` est un build partiel appliqué sur un brouillon neuf
       (l'assistant normalise ensuite l'attribut de chaque compétence).
       Pensés « dans les clous » d'un runner mais ajustables librement. */
    presets: [
      {
        id: "sam",
        label: "Samouraï des rues",
        patch: {
          archetypeTable: "combattant",
          awakened: null,
          attrs: { FOR: 3, AGI: 4, VOL: 3, LOG: 2, CHA: 2 },
          skills: [
            { name: "Armes à distance", val: 5, spec: "Pistolets" },
            { name: "Combat rapproché", val: 4 },
            { name: "Athlétisme", val: 3 },
            { name: "Perception", val: 2 },
          ],
          weapons: [{ name: "Pistolet lourd" }, { name: "Couteau de combat" }],
        },
      },
      {
        id: "mage",
        label: "Mage de combat",
        patch: {
          archetypeTable: "magicien",
          awakened: "hermétique",
          attrs: { FOR: 1, AGI: 2, VOL: 4, LOG: 3, CHA: 2 },
          skills: [
            { name: "Sorcellerie", val: 5, spec: "Sorts de combat" },
            { name: "Conjuration", val: 3 },
            { name: "Perception", val: 2 },
            { name: "Athlétisme", val: 2 },
          ],
          spells: ["Boule de feu", "Armure"],
        },
      },
      {
        id: "decker",
        label: "Décker",
        patch: {
          archetypeTable: "equilibre",
          awakened: null,
          attrs: { FOR: 1, AGI: 3, VOL: 2, LOG: 4, CHA: 2 },
          skills: [
            { name: "Piratage", val: 5, spec: "Cybercombat" },
            { name: "Électronique", val: 4 },
            { name: "Ingénierie", val: 2 },
            { name: "Perception", val: 2 },
          ],
          weapons: [{ name: "Pistolet léger" }],
        },
      },
      {
        id: "face",
        label: "Négociateur",
        patch: {
          archetypeTable: "equilibre",
          awakened: null,
          attrs: { FOR: 1, AGI: 2, VOL: 3, LOG: 2, CHA: 4 },
          skills: [
            { name: "Influence", val: 5, spec: "Négociation" },
            { name: "Réseau", val: 4 },
            { name: "Perception", val: 3 },
            { name: "Armes à distance", val: 2 },
          ],
          weapons: [{ name: "Pistolet léger" }],
        },
      },
      {
        id: "rigger",
        label: "Rigger",
        patch: {
          archetypeTable: "equilibre",
          awakened: null,
          attrs: { FOR: 1, AGI: 3, VOL: 2, LOG: 4, CHA: 2 },
          skills: [
            { name: "Pilotage", val: 5, spec: "Drones volants" },
            { name: "Ingénierie", val: 4, spec: "C&R drones" },
            { name: "Électronique", val: 2 },
            { name: "Perception", val: 2 },
          ],
          weapons: [{ name: "Pistolet léger" }],
        },
      },
    ],

    /* ---- Pools d'inspiration narrative (p.50-51) ---- */
    _narrativePools: {
      keywords: [
        "Ancien militaire",
        "Orphelin des Barrens",
        "Ex-corpo grillé",
        "Contrebandier né",
        "Idéaliste désabusé",
        "Survivant des rues",
        "Accro à l'adrénaline",
        "Loyal jusqu'à la faute",
        "Gueule cassée",
        "Petite frappe ambitieuse",
        "Déserteur recherché",
        "Enfant de la Matrice",
      ],
      lifestyles: ["Bas", "Modeste", "Confort", "Élevé"],
      behaviors: [
        "Ne recule jamais devant un défi",
        "Vérifie toujours les sorties d'une pièce",
        "Parle trop quand il est nerveux",
        "Ne fait confiance à personne trop vite",
        "Protège les plus faibles",
        "Rembourse toujours ses dettes",
        "Méthodique jusqu'à l'obsession",
        "Impulsif dès que ça chauffe",
        "Garde toujours une carte dans sa manche",
        "Déteste l'autorité corpo",
      ],
      quotes: [
        "« On finit le boulot, point. »",
        "« J'ai déjà vu pire. »",
        "« Le nuyen d'abord, les questions après. »",
        "« Personne ne me donne d'ordres. »",
        "« Reste derrière moi. »",
        "« Ça va bien se passer… ou pas. »",
        "« Je connais un gars. »",
        "« On aurait dû demander plus cher. »",
        "« La rue n'oublie jamais. »",
        "« Cours d'abord, réfléchis après. »",
      ],
    },

    /** Suggestions narratives : remplit métatype + tirages distincts. Le
        consommateur (chargen) ne remplit que les champs laissés vides. */
    drawNarrative(build) {
      const pickN = (arr, n) => {
        const pool = [...arr];
        const out = [];
        for (let i = 0; i < n && pool.length; i++) {
          out.push(pool.splice(Utils.randInt(0, pool.length - 1), 1)[0]);
        }
        return out;
      };
      const kw = pickN(this._narrativePools.keywords, 3);
      const life = pickN(this._narrativePools.lifestyles, 1)[0];
      return {
        keywords: [build.meta, kw[0], kw[1], life, kw[2]],
        behaviors: pickN(this._narrativePools.behaviors, 4),
        quotes: pickN(this._narrativePools.quotes, 4),
      };
    },

    /* ---- Coûts de composition — chaque fonction ne fait que la
       traduction points/nuyens : aucune règle de plafond ici, c'est le
       rôle de validate(). ---- */

    /** Coût en ¥ d'une répartition d'attributs pour un métatype donné.
        Les attributs se comptent DEPUIS 0 (p.85, « débute à 0 ») : chaque
        point coûte attrPoint, sauf le dernier pour atteindre le max du
        métatype qui coûte attrLastPoint. Exemple livre : Force 2 = 20 000 ¥,
        Volonté 4 (max elfe) = 3×10 000 + 20 000 = 50 000 ¥. */
    costAttrs(attrs, meta) {
      const range = this.metatypes[meta] || this.metatypes.Humain;
      let total = 0;
      for (const k of ["FOR", "AGI", "VOL", "LOG", "CHA"]) {
        const val = attrs[k] || 0;
        const max = range[k][1];
        const atMax = val >= max && val > 0;
        total += val * this.costs.attrPoint + (atMax ? this.costs.attrLastPoint - this.costs.attrPoint : 0);
      }
      return total;
    },

    /** Points d'attributs consommés = somme brute des indices (base 0,
        p.85) — le minimum de métatype est un plancher, pas une remise. */
    attrPointsUsed(attrs) {
      return ["FOR", "AGI", "VOL", "LOG", "CHA"].reduce((a, k) => a + (attrs[k] || 0), 0);
    },

    /** Coût en ¥ d'un point de compétence isolé, à l'indice `toIndex`. */
    _skillPointCost(toIndex) {
      return toIndex <= 5 ? this.costs.skillPoint : this.costs.skillPointHigh;
    },

    /** Coût en ¥ pour amener une compétence de 0 à `val`, paliers p.83. */
    costSkillIndex(val) {
      let total = 0;
      for (let i = 1; i <= val; i++) total += this._skillPointCost(i);
      return total;
    },

    /** Nombre de spécialisations d'une compétence (build : `specs[]` ;
        tolère l'ancienne forme scalaire `spec`). Pas de plafond (p.85). */
    specCount(s) {
      return s.specs ? s.specs.length : s.spec ? 1 : 0;
    },

    /** Points de compétences consommés = indices + spécialisations +
        connaissances (regroupés dans la même catégorie p.85, 2 500 ¥ = 1 pt). */
    skillPointsUsed(build) {
      const skills = (build.skills || []).reduce((a, s) => a + (s.val || 0) + this.specCount(s), 0);
      return skills + (build.knowledges || []).length;
    },

    /** Coût en ¥ d'une liste de compétences [{val, specs?}]. */
    costSkills(skills) {
      let total = 0;
      for (const s of skills || []) {
        total += this.costSkillIndex(s.val || 0);
        total += this.specCount(s) * this.costs.specialization;
      }
      return total;
    },

    /** Coût en ¥ des connaissances (2 500 ¥ chacune, p.85). */
    costKnowledges(knowledges) {
      return (knowledges || []).length * this.costs.knowledge;
    },

    costEdges(edges) {
      return (edges || []).reduce((sum, e) => sum + (e.level || 0) * this.costs.edgeLevel, 0);
    },

    costSpells(n) {
      return (n || 0) * this.costs.spell;
    },

    costWeapons(weapons) {
      return (weapons || []).reduce((sum, w) => {
        const cat = this.WEAPON_CATALOG_SPECIALIST.has(w.name) ? this.costs.weaponSpecialist : this.costs.weaponNormal;
        return sum + cat;
      }, 0);
    },

    costArmorExtra(points) {
      return (points || 0) * this.costs.armorPoint;
    },

    costGear(n) {
      return (n || 0) * this.costs.gear;
    },

    /** Coût total en ¥ d'un build (mode avancé comme mode table : le prix
        est toujours calculé de la même façon, seule la limite change). */
    totalCost(build) {
      return (
        this.costAttrs(build.attrs, build.meta) +
        this.costSkills(build.skills) +
        this.costKnowledges(build.knowledges) +
        this.costEdges(build.edges) +
        this.costSpells((build.spells || []).length) +
        this.costWeapons(build.weapons) +
        this.costArmorExtra(build.extraArmor) +
        this.costGear((build.gear || []).length)
      );
    },

    /** Erreurs de composition rangées par étape de l'assistant (concept,
        attrs, skills, edges, gear). Source unique de vérité : `validate()`
        n'en est que l'aplatissement. Permet à chargen.js de marquer les
        onglets fautifs sans dupliquer le barème. Le dépassement de budget
        global (mode avancé) n'appartient à aucune étape : il est ajouté par
        `validate()` (visible via la barre de budget + la révision). */
    stepErrors(build) {
      const out = { concept: [], attrs: [], skills: [], edges: [], gear: [] };
      const level = this.gameLevels[build.gameLevel];
      if (!level) {
        out.concept.push("Niveau de jeu inconnu.");
        return out;
      }
      const range = this.metatypes[build.meta];
      if (!range) {
        out.concept.push("Métatype inconnu.");
        return out;
      }
      const table = this.pointTables[build.gameLevel]?.[build.archetypeTable];

      // Attributs : bornes métatype + nombre au maximum autorisé.
      let atMaxCount = 0;
      for (const k of ["FOR", "AGI", "VOL", "LOG", "CHA"]) {
        const val = (build.attrs || {})[k] || 0;
        const [min, max] = range[k];
        if (val < min || val > max) {
          out.attrs.push(`${k} doit être compris entre ${min} et ${max} pour un ${build.meta}.`);
        }
        if (val >= max) atMaxCount++;
      }
      if (atMaxCount > level.attrsAtMax) {
        out.attrs.push(
          `Au maximum ${level.attrsAtMax} attribut(s) au plafond du métatype pour le niveau ${level.label}.`,
        );
      }

      // Compétences : plafond d'indice + sous-plafond "au rang max".
      let atSkillCapCount = 0;
      for (const s of build.skills || []) {
        if (s.val > level.skillMax) {
          out.skills.push(`${s.name} dépasse l'indice maximum (${level.skillMax}) du niveau ${level.label}.`);
        }
        if (s.val >= level.skillMax) atSkillCapCount++;
      }
      if (table && table.skillsAtCap != null && atSkillCapCount > table.skillsAtCap) {
        out.skills.push(
          `Seules ${table.skillsAtCap} compétence(s) peuvent atteindre l'indice ${level.skillMax} sur cette table.`,
        );
      }

      // Réduction du risque : plafonds du niveau (p.85-86), cumuls compris.
      // La RR provient d'atouts structurés (edge.rr = {skill, spec, amount}) ;
      // les atouts RR en texte libre ne sont pas suivis (appréciation du MJ).
      const rrSkill = {};
      const rrSpec = {};
      for (const e of build.edges || []) {
        if (!e.rr || !e.rr.skill) continue;
        if (e.rr.spec) {
          const key = `${e.rr.skill}||${e.rr.spec}`;
          rrSpec[key] = (rrSpec[key] || 0) + (e.rr.amount || 0);
        } else {
          rrSkill[e.rr.skill] = (rrSkill[e.rr.skill] || 0) + (e.rr.amount || 0);
        }
      }
      for (const [skill, amt] of Object.entries(rrSkill)) {
        if (amt > level.rrMax) {
          out.edges.push(`RR de ${skill} (${amt}) dépasse le maximum du niveau (${level.rrMax}).`);
        }
      }
      for (const [key, amt] of Object.entries(rrSpec)) {
        const [skill, spec] = key.split("||");
        const eff = amt + (rrSkill[skill] || 0); // cumul spé + compétence
        if (eff > level.rrMaxSpec) {
          out.edges.push(`RR de ${skill} (${spec}) — ${eff} avec cumul — dépasse le maximum du niveau (${level.rrMaxSpec}).`);
        }
      }

      // Budget mode table : bornes par catégorie (le mode avancé n'a qu'un
      // budget global, géré dans `validate()`).
      if (!build.advancedMode && table) {
        const attrPts = this.attrPointsUsed(build.attrs || {});
        if (attrPts > table.attrPoints) out.attrs.push(`Trop de points d'attributs (${attrPts}/${table.attrPoints}).`);
        const skillPts = this.skillPointsUsed(build);
        if (skillPts > table.skillPoints) out.skills.push(`Trop de points de compétences (${skillPts}/${table.skillPoints}).`);
        const edgePts = (build.edges || []).reduce((a, e) => a + (e.level || 0), 0);
        if (edgePts > table.edgePoints) out.edges.push(`Trop de points d'atouts (${edgePts}/${table.edgePoints}).`);
      }

      return out;
    },

    /** Validation live : aplatit `stepErrors()` et y ajoute le dépassement de
        budget global (mode avancé). Vide = build valide. */
    validate(build) {
      const steps = this.stepErrors(build);
      const errors = [];
      for (const k of ["concept", "attrs", "skills", "edges", "gear"]) errors.push(...steps[k]);
      const level = this.gameLevels[build.gameLevel];
      if (level && build.advancedMode) {
        const spent = this.totalCost(build);
        if (spent > level.nuyen) {
          errors.push(`Budget dépassé : ${spent.toLocaleString("fr-FR")} ¥ / ${level.nuyen.toLocaleString("fr-FR")} ¥.`);
        }
      }
      return errors;
    },

    /** Construit un personnage de forme PNJ (mêmes clés que
        EditionAnarchy2.generate()) + couche PJ (isPC, narratif, budget). */
    buildCharacter(build) {
      const attrs = { ...build.attrs };
      const skills = (build.skills || []).map((s) => {
        const def = this.skills.find((d) => d.name === s.name);
        const attr = s.attr || def?.attr || "LOG";
        // Modèle PNJ mono-spé conservé : specs[0] = spé principale ; les
        // suivantes vont dans extraSpecs (rendu/roll les prennent en compte).
        const specs = s.specs || (s.spec ? [s.spec] : []);
        const primary = specs[0];
        const out = {
          name: s.name,
          val: s.val,
          attr,
          rr: s.rr || 0,
          spec: primary || undefined,
          specVal: primary ? s.val + 2 : undefined,
          specAttr: primary ? attr : undefined,
          specRR: primary ? s.specRR || 0 : undefined,
        };
        if (specs.length > 1) {
          out.extraSpecs = specs.slice(1).map((name) => ({ name, val: s.val + 2, attr, rr: 0 }));
        }
        return out;
      });

      const weapons = (build.weapons || []).map((w) =>
        EditionAnarchy2.resolveWeapon({ name: w.name }, attrs, build.meta),
      );

      const totalArmor = this.startingGear.armor + (build.extraArmor || 0);
      const physMonitor = [attrs.FOR + totalArmor, attrs.FOR + totalArmor + 3, attrs.FOR + totalArmor + 6];
      const mentMonitor = [attrs.VOL, attrs.VOL + 3, attrs.VOL + 6];

      const equip = [this.startingGear.commlink, this.startingGear.fauxSIN, ...(build.gear || [])];

      const pnj = {
        id: Utils.uid(),
        edition: "anarchy2",
        isPC: true,
        name: build.name && build.name.trim() ? build.name.trim() : Utils.genName(),
        meta: build.meta,
        gender: build.gender || "NB",
        tier: this.gameLevels[build.gameLevel]?.label || "Runner",
        archetype:
          this.pointTables[build.gameLevel]?.[build.archetypeTable]?.label || "Personnage",
        gameLevel: build.gameLevel,
        archetypeTable: build.archetypeTable,
        role: build.role || "",
        milieu: build.milieu || "",
        attrs,
        skills,
        knowledges: [...(build.knowledges || [])],
        edges: (build.edges || []).map((e) => e.text),
        chosenEdges: (build.edges || []).map((e) => e.text),
        weapons,
        equip,
        threatLevel: "forte",
        physMonitor,
        mentMonitor,
        matrixMonitor: null,
        awakened: build.awakened || null,
        mentorSpirit: build.mentorSpirit || null,
        spells: build.spells || [],
        legerFilled: 0,
        graveFilled: 0,
        incapFilled: 0,
        notes: build.notes || "",
        keywords: build.keywords || [],
        behaviors: build.behaviors || [],
        quotes: build.quotes || [],
        lifestyle: build.lifestyle || "",
        contacts: build.contacts || [],
        karma: 0,
        nuyenSpent: this.totalCost(build),
        nuyenBudget: this.gameLevels[build.gameLevel]?.nuyen || 0,
      };
      BonusEngine.apply(pnj, "anarchy2");
      Flavor.apply(pnj);
      return pnj;
    },
  },
});

/* Noms d'armes "de spécialiste" (p.84 : fusil de précision, lance-grenades,
   mitrailleuse « et armes plus lourdes ») parmi le catalogue officiel —
   dérivé une fois. Les grenades à main restent une arme normale (2 500 ¥). */
EditionAnarchy2.creation.WEAPON_CATALOG_SPECIALIST = new Set(
  ["Fusil de précision", "Lance-grenades", "Mitrailleuse"].filter((n) => EditionAnarchy2.WEAPON_CATALOG[n]),
);
