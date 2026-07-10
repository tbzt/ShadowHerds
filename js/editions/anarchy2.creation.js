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

    /* ---- Coûts de composition — chaque fonction ne fait que la
       traduction points/nuyens : aucune règle de plafond ici, c'est le
       rôle de validate(). ---- */

    /** Coût en ¥ d'une répartition d'attributs pour un métatype donné. */
    costAttrs(attrs, meta) {
      const range = this.metatypes[meta] || this.metatypes.Humain;
      let total = 0;
      for (const k of ["FOR", "AGI", "VOL", "LOG", "CHA"]) {
        const val = attrs[k] || 1;
        const min = range[k][0];
        const max = range[k][1];
        const pts = Math.max(0, val - min);
        const atMax = val >= max;
        total += atMax ? (pts - 1) * this.costs.attrPoint + this.costs.attrLastPoint : pts * this.costs.attrPoint;
      }
      return total;
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

    /** Coût en ¥ d'une liste de compétences [{val, spec?}]. */
    costSkills(skills) {
      let total = 0;
      for (const s of skills || []) {
        total += this.costSkillIndex(s.val || 0);
        if (s.spec) total += this.costs.specialization;
      }
      return total;
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
        this.costEdges(build.edges) +
        this.costSpells((build.spells || []).length) +
        this.costWeapons(build.weapons) +
        this.costArmorExtra(build.extraArmor) +
        this.costGear((build.gear || []).length)
      );
    },

    /** Validation live : renvoie un tableau d'erreurs lisibles (vide =
        build valide). N'impose pas le mode table vs avancé — le budget
        nuyen et les plafonds du niveau de jeu s'appliquent toujours. */
    validate(build) {
      const errors = [];
      const level = this.gameLevels[build.gameLevel];
      if (!level) return ["Niveau de jeu inconnu."];
      const range = this.metatypes[build.meta];
      if (!range) return ["Métatype inconnu."];

      // Attributs : bornes métatype + nombre au maximum autorisé.
      let atMaxCount = 0;
      for (const k of ["FOR", "AGI", "VOL", "LOG", "CHA"]) {
        const val = (build.attrs || {})[k] || 1;
        const [min, max] = range[k];
        if (val < min || val > max) {
          errors.push(`${k} doit être compris entre ${min} et ${max} pour un ${build.meta}.`);
        }
        if (val >= max) atMaxCount++;
      }
      if (atMaxCount > level.attrsAtMax) {
        errors.push(
          `Au maximum ${level.attrsAtMax} attribut(s) au plafond du métatype pour le niveau ${level.label}.`,
        );
      }

      // Compétences : plafond d'indice, et sous-plafond "au rang max" si
      // la table en impose un (runner d'élite : 2 compétences à 6 max).
      let atSkillCapCount = 0;
      for (const s of build.skills || []) {
        if (s.val > level.skillMax) {
          errors.push(`${s.name} dépasse l'indice maximum (${level.skillMax}) du niveau ${level.label}.`);
        }
        if (s.val >= level.skillMax) atSkillCapCount++;
      }
      const table = this.pointTables[build.gameLevel]?.[build.archetypeTable];
      if (table && table.skillsAtCap != null && atSkillCapCount > table.skillsAtCap) {
        errors.push(
          `Seules ${table.skillsAtCap} compétence(s) peuvent atteindre l'indice ${level.skillMax} sur cette table.`,
        );
      }

      // Réduction du risque : plafonds par niveau de jeu (p.85-86).
      for (const s of build.skills || []) {
        if ((s.rr || 0) > level.rrMax) {
          errors.push(`RR de ${s.name} dépasse le maximum du niveau (${level.rrMax}).`);
        }
        if ((s.specRR || 0) > level.rrMaxSpec) {
          errors.push(`RR de la spécialisation de ${s.name} dépasse le maximum du niveau (${level.rrMaxSpec}).`);
        }
      }

      // Budget nuyens : mode table (bornes par catégorie via pointTables)
      // ou mode avancé (un seul budget global, transferts libres p.85).
      if (build.advancedMode) {
        const spent = this.totalCost(build);
        if (spent > level.nuyen) {
          errors.push(`Budget dépassé : ${spent.toLocaleString("fr-FR")} ¥ / ${level.nuyen.toLocaleString("fr-FR")} ¥.`);
        }
      } else if (table) {
        const attrPts = Object.values(build.attrs || {}).reduce((a, b) => a + (b - 1), 0);
        if (attrPts > table.attrPoints) errors.push(`Trop de points d'attributs (${attrPts}/${table.attrPoints}).`);
        const skillPts = (build.skills || []).reduce((a, s) => a + (s.val || 0) + (s.spec ? 1 : 0), 0);
        if (skillPts > table.skillPoints) errors.push(`Trop de points de compétences (${skillPts}/${table.skillPoints}).`);
        const edgePts = (build.edges || []).reduce((a, e) => a + (e.level || 0), 0);
        if (edgePts > table.edgePoints) errors.push(`Trop de points d'atouts (${edgePts}/${table.edgePoints}).`);
      }

      return errors;
    },

    /** Construit un personnage de forme PNJ (mêmes clés que
        EditionAnarchy2.generate()) + couche PJ (isPC, narratif, budget). */
    buildCharacter(build) {
      const attrs = { ...build.attrs };
      const skills = (build.skills || []).map((s) => {
        const def = this.skills.find((d) => d.name === s.name);
        return {
          name: s.name,
          val: s.val,
          attr: s.attr || def?.attr || "LOG",
          rr: s.rr || 0,
          spec: s.spec || undefined,
          specVal: s.spec ? s.val + 2 : undefined,
          specAttr: s.spec ? s.specAttr || s.attr || def?.attr : undefined,
          specRR: s.spec ? s.specRR || 0 : undefined,
        };
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

/* Noms d'armes considérées "de spécialiste" (p.83) parmi le catalogue
   officiel — dérivé une fois, pas recopié à la main. */
EditionAnarchy2.creation.WEAPON_CATALOG_SPECIALIST = new Set(
  ["Fusil de précision", "Mitrailleuse", "Grenades"].filter((n) => EditionAnarchy2.WEAPON_CATALOG[n]),
);
