"use strict";

/* ============================================================
   SR6 — BARÈME DE CRÉATION DE PERSONNAGE JOUABLE
   ------------------------------------------------------------
   Sources (relevé du 2026-09-09, cf. REFERENCE/creation_pj_sr6.md) :
   - « sr6_01_shadowrun_6_web_v1.pdf » (core VF) — Priorités p.67, Attributs
     des métatypes p.67, règles de création p.66-69, coûts de progression p.70.
   - « sr6_15_compagnon_du_sixieme_monde_web_v0.pdf » (Compagnon du Sixième
     Monde VF, « Formation des Ombres ») — système à 10 points p.26, système
     de création par points p.27, système à modules chronologiques p.29-47.

   Les tables larges ont été lues À L'IMAGE : le pdftotext perdait purement et
   simplement la colonne Compétences de la table des Priorités (deux nombres
   par ligne, un seul en-tête extrait).

   Barème pur, isolé pour rester corrigeable — même parti que
   anarchy2.creation.js et sr5.creation.js.

   ⚠ Trois pièges vérifiés au livre, à ne pas aplatir sur le modèle SR5 :
   1. La colonne Métatypes donne des POINTS D'AJUSTEMENT (Atout, Magie /
      Résonance, et tout attribut dont le max dépasse 6), pas des « points
      d'attributs spéciaux » SR5.
   2. Tous les minimums d'attribut valent 1 en SR6 : on dépense depuis 1, un
      pour un. SR5 part de l'indice du métatype, Anarchy 2 compte depuis 0.
   3. Ce sont l'humain et l'elfe qui manquent aux priorités HAUTES (humain
      absent de A et B, elfe de A) — l'inverse de SR5, où le troll disparaît
      en bas de table.
   ============================================================ */
import { AccessoiresSR6 } from "./sr6.accessoires.js";
import { Content } from "../rules/content.js";
import { Magic } from "../rules/magic.js";
import { EditionSR6 } from "./sr6.js";
import { TraitsSR6 } from "./sr6.traits.js";
import { Metavariants } from "../rules/metavariants.js";
import { Settings } from "../controllers/settings.js";
import { Utils } from "../core/utils.js";

Object.assign(EditionSR6, {
  creation: {
    /* ============================================================
       LES QUATRE MÉTHODES
       ============================================================ */
    methods: {
      priorites: {
        label: "Système de priorités",
        source: "Livre de base p.67",
        family: "priority",
      },
      dixpoints: {
        label: "Système à 10 points",
        source: "Compagnon du Sixième Monde p.26",
        family: "priority",
        points: 10,
      },
      points: {
        label: "Système de création par points",
        source: "Compagnon du Sixième Monde p.27",
        family: "pc",
        pc: 100,
      },
      modules: {
        label: "Système à modules chronologiques",
        source: "Compagnon du Sixième Monde p.29",
        family: "modules",
      },
    },

    ATTRS: ["CON", "AGI", "RÉA", "FOR", "VOL", "LOG", "INT", "CHA"],
    /** Atout, Magie et Résonance se paient en points d'AJUSTEMENT (p.66). */
    SPECIAL_ATTRS: ["ATO", "MAG", "RES"],

    /* ============================================================
       TABLE DES PRIORITÉS (core p.67) — lue à l'image
       ============================================================ */
    priorityTable: {
      A: {
        metas: ["Nain", "Ork", "Troll"],
        adjust: 13,
        attrs: 24,
        skills: 32,
        magic: [
          { key: "magicien", label: "Magicien pur & adepte mystique", mag: 4, formulas: 8 },
          { key: "specialise", label: "Magicien spécialisé", mag: 5, formulas: 10 },
          { key: "adepte", label: "Adepte", mag: 4 },
          { key: "technomancien", label: "Technomancien", res: 4, forms: 8 },
        ],
        nuyen: 450000,
      },
      B: {
        metas: ["Nain", "Elfe", "Ork", "Troll"],
        adjust: 11,
        attrs: 16,
        skills: 24,
        magic: [
          { key: "magicien", label: "Magicien pur & adepte mystique", mag: 3, formulas: 6 },
          { key: "specialise", label: "Magicien spécialisé", mag: 4, formulas: 8 },
          { key: "adepte", label: "Adepte", mag: 3 },
          { key: "technomancien", label: "Technomancien", res: 3, forms: 6 },
        ],
        nuyen: 275000,
      },
      C: {
        metas: ["Nain", "Elfe", "Humain", "Ork", "Troll"],
        adjust: 9,
        attrs: 12,
        skills: 20,
        magic: [
          { key: "magicien", label: "Magicien pur & adepte mystique", mag: 2, formulas: 4 },
          { key: "specialise", label: "Magicien spécialisé", mag: 3, formulas: 6 },
          { key: "adepte", label: "Adepte", mag: 2 },
          { key: "technomancien", label: "Technomancien", res: 2, forms: 3 },
        ],
        nuyen: 150000,
      },
      D: {
        metas: ["Nain", "Elfe", "Humain", "Ork", "Troll"],
        adjust: 4,
        attrs: 8,
        skills: 16,
        magic: [
          { key: "magicien", label: "Magicien pur & adepte mystique", mag: 1, formulas: 2 },
          { key: "specialise", label: "Magicien spécialisé", mag: 2, formulas: 4 },
          { key: "adepte", label: "Adepte", mag: 1 },
          { key: "technomancien", label: "Technomancien", res: 1, forms: 2 },
        ],
        nuyen: 50000,
      },
      E: {
        metas: ["Nain", "Elfe", "Humain", "Ork", "Troll"],
        adjust: 1,
        attrs: 2,
        skills: 10,
        magic: [],
        nuyen: 8000,
      },
    },

    /** POINTS D'AJUSTEMENT PAR MÉTATYPE ET PAR PRIORITÉ (Compagnon p.90).

        La table des Priorités du livre de base ne nomme que les cinq souches.
        Le Compagnon donne à CHAQUE métavariante et métaconscience sa propre
        ligne, souvent différente de celle de sa souche : le Xapiri thëpë est
        B10/C8 quand l'Elfe est B11/C9, le Wakyambi monte à B12 mais perd le E,
        le Fomori atteint A14.

        ⚠ Le réflexe de faire retomber une métavariante sur la ligne de sa
        souche (`Metavariants.baseMetatype` la donne) est FAUX pour au moins
        dix entrées. `null` = lettre indisponible (« N/A » au livre).

        `karma` est un coût de personnalisation qui s'applique « quelle que
        soit la méthode de création utilisée » (note de la table) — donc aussi
        en création par points et en modules chronologiques. Le livre précise
        par ailleurs qu'aucun choix de métatype ne coûte de PC.

        Relevé et vérifié à part, cf. REFERENCE/creation_pj_sr6_metavariantes.md.
        Contrôle : les cinq souches recoupent `priorityTable` au chiffre près. */
    metaTable: [
      { nom: "Elfe", souche: "Elfe", adj: { A: null, B: 11, C: 9, D: 4, E: 1 }, karma: 0 },
      { nom: "Dalakitnon", souche: "Elfe", adj: { A: null, B: 11, C: 9, D: 4, E: 1 }, karma: 5 },
      { nom: "Dryade", souche: "Elfe", adj: { A: null, B: 11, C: 9, D: 4, E: 1 }, karma: 5 },
      { nom: "Nocturna", souche: "Elfe", adj: { A: null, B: 10, C: 8, D: 4, E: 1 }, karma: 5 },
      { nom: "Wakyambi", souche: "Elfe", adj: { A: null, B: 12, C: 9, D: 4, E: null }, karma: 10 },
      { nom: "Xapiri thëpë", souche: "Elfe", adj: { A: null, B: 10, C: 8, D: 4, E: 1 }, karma: 5 },
      { nom: "Humain", souche: "Humain", adj: { A: null, B: null, C: 9, D: 4, E: 1 }, karma: 0 },
      { nom: "Nartaki", souche: "Humain", adj: { A: null, B: null, C: 10, D: 4, E: null }, karma: "5 / 10" },
      { nom: "Valkyrie", souche: "Humain", adj: { A: null, B: 11, C: 10, D: 4, E: null }, karma: 15 },
      { nom: "Nain", souche: "Nain", adj: { A: 13, B: 11, C: 9, D: 4, E: 1 }, karma: 0 },
      { nom: "Duende", souche: "Nain", adj: { A: 13, B: 11, C: 9, D: 4, E: 1 }, karma: 10 },
      { nom: "Gnome", souche: "Nain", adj: { A: 13, B: 11, C: 9, D: 4, E: 1 }, karma: 5 },
      { nom: "Hanuman", souche: "Nain", adj: { A: 12, B: 10, C: 9, D: 4, E: 1 }, karma: 5 },
      { nom: "Koborokuru", souche: "Nain", adj: { A: 13, B: 11, C: 9, D: 4, E: 1 }, karma: 5 },
      { nom: "Menehune", souche: "Nain", adj: { A: 12, B: 10, C: 9, D: 4, E: null }, karma: 5 },
      { nom: "Ork", souche: "Ork", adj: { A: 13, B: 11, C: 9, D: 4, E: 1 }, karma: 0 },
      { nom: "Hobgobelin", souche: "Ork", adj: { A: 13, B: 11, C: 9, D: 4, E: 1 }, karma: 5 },
      { nom: "Ogre", souche: "Ork", adj: { A: 13, B: 11, C: 9, D: 4, E: 1 }, karma: 5 },
      { nom: "Oni", souche: "Ork", adj: { A: 13, B: 11, C: 9, D: 4, E: 1 }, karma: 5 },
      { nom: "Satyre", souche: "Ork", adj: { A: 13, B: 11, C: 9, D: 4, E: null }, karma: 10 },
      { nom: "Troll", souche: "Troll", adj: { A: 13, B: 11, C: 9, D: 4, E: 1 }, karma: 0 },
      { nom: "Cyclope", souche: "Troll", adj: { A: 13, B: 11, C: 9, D: 4, E: 1 }, karma: 5 },
      { nom: "Fomori", souche: "Troll", adj: { A: 14, B: 11, C: 9, D: 4, E: null }, karma: 10 },
      { nom: "Géant", souche: "Troll", adj: { A: 14, B: 11, C: 9, D: 4, E: 1 }, karma: 5 },
      { nom: "Minotaure", souche: "Troll", adj: { A: 13, B: 11, C: 9, D: 4, E: 1 }, karma: 5 },
      { nom: "Centaure", souche: null, adj: { A: 13, B: 11, C: 9, D: 4, E: null }, karma: 15 },
      { nom: "Naga", souche: null, adj: { A: 11, B: 9, C: 4, D: 2, E: null }, karma: 15 },
      { nom: "Pixie", souche: null, adj: { A: 12, B: 10, C: 9, D: 4, E: null }, karma: 10 },
      { nom: "Sasquatch", souche: null, adj: { A: 14, B: 11, C: 9, D: 4, E: null }, karma: 10 },
      { nom: "Triton", souche: null, adj: { A: 13, B: 11, C: 9, D: 5, E: null }, karma: 15 },
    ],

    /** Ordre du livre : Compétences vient AVANT Magie, contrairement à SR5. */
    PRIORITY_COLUMNS: [
      { key: "meta", label: "Métatypes (ajustement)" },
      { key: "attrs", label: "Attributs" },
      { key: "skills", label: "Compétences" },
      { key: "magic", label: "Magie ou Résonance" },
      { key: "nuyen", label: "Ressources" },
    ],

    priorityCost: { A: 4, B: 3, C: 2, D: 1, E: 0 },

    /* ============================================================
       SYSTÈME DE CRÉATION PAR POINTS (Compagnon p.27)
       ============================================================ */
    pc: {
      total: 100,
      awakened: 10, // ordinaire = 0
      adjustFree: 1,
      adjustMax: 12,
      adjustCost: 4,
      attrFree: 4,
      attrMax: 20,
      attrCost: 2,
      skillFree: 12,
      skillMax: 20,
      skillCost: 2,
      nuyenPerPC: 15000,
      nuyenMax: 450000,
      powerPointAdept: 4, // obligatoires, jusqu'au rang de Magie
      powerPointMystic: 8, // facultatifs
      spell: 2,
      complexForm: 2,
    },

    /** Indice de départ de Magie/Résonance par catégorie (Compagnon p.28). */
    awakenedStart: {
      magicien: { label: "Magicien pur", attr: "MAG", start: 1 },
      specialise: { label: "Magicien spécialisé", attr: "MAG", start: 2 },
      adepte: { label: "Adepte", attr: "MAG", start: 1 },
      mystique: { label: "Adepte mystique", attr: "MAG", start: 1 },
      technomancien: { label: "Technomancien", attr: "RES", start: 1 },
    },

    /* ---- Constantes de création (core p.66-69) ---- */
    KARMA: 50,
    KARMA_TO_NUYEN: 2000,
    KARMA_TO_NUYEN_ENDETTE: 5000,
    SKILL_CAP: 6,
    SKILL_CAP_APTITUDE: 7,
    TRAIT_MAX: 6,
    TRAIT_KARMA_NET_MAX: 20,
    CONTACT_MULT: 6,
    CASH_MAX: 5000,
    ILLEGAL_AVAILABILITY_CAP: 7,

    /* ============================================================
       SYSTÈME À MODULES CHRONOLOGIQUES (Compagnon p.29-47)
       Règles du système : relevées et VÉRIFIÉES À L'IMAGE le 2026-09-09
       (page imprimée 31). Le catalogue des 86 modules d'âge adulte vit dans
       sr6.lifemodules.js — table isolée pour rester corrigeable. Relevé
       détaillé et irrégularités du livre : REFERENCE/creation-modules-sr6/.
       ============================================================ */
    lifeModules: {
      /** Trois modules imposés, dans l'ordre, puis huit modules adultes. */
      adultSlots: 8,
      /** « Vous devez choisir huit modules, ni plus, ni moins, et seul l'un
          d'entre eux peut être sélectionné deux fois » (p.31). */
      repeatableMax: 1,

      /** ⚠ L'économie de contacts de CETTE méthode n'est pas celle des trois
          autres : le Charisme n'apporte AUCUN point et ne plafonne plus les
          indices — ce sont les modules qui donnent 2 ou 4 points (p.30). */
      contacts: {
        fromCharisma: false,
        newContactCost: 2, // Réseau 1 + Loyauté 1
        ratingCap: 8,
        /** Améliorer un contact au karma de personnalisation : 1 karma = 1
            point — mais LÀ, le plafond redevient le Charisme (p.30). */
        karmaUpgradeCappedByCharisma: true,
      },

      /** Les points de contacts d'un ÉVÉNEMENT ne peuvent qu'améliorer des
          contacts déjà choisis, toutes catégories confondues (p.31). */
      eventContactsUpgradeOnly: true,

      /** Un module qui octroierait un septième trait : y renoncer, ou en
          remplacer un déjà pris (on en récupère le karma). Les voies de
          traits ne comptent pas dans la limite (p.30). */
      traitReplacementAllowed: true,

      /** Les ressources s'ADDITIONNENT au fil des modules et ne se dépensent
          qu'une fois la création achevée (p.30). */
      resourcesDeferred: true,

      /** Catégories de contacts citées par les modules (p.31). */
      contactCategories: [
        "universitaire", "corporatiste", "criminel", "ingénierie",
        "gouvernemental", "magique", "matriciel", "médias", "médical", "de la rue",
      ],

      /** Les trois modules imposés. Leurs effets sont décrits en clair : ils
          ne suivent pas le gabarit à puces des modules adultes. */
      imposed: [
        {
          id: "naissance",
          label: "Naissance",
          hint: "Le corps dont vous avez hérité, et si vous êtes né ordinaire, Éveillé ou Émergé.",
          /** Attribut dont le maximum du métatype dépasse 6 → démarre à 2
              (ainsi que l'Atout pour les humains) ; tous les autres à 1. */
          attrStartAboveSix: 2,
          attrStartDefault: 1,
          humanEdgeStartsAtTwo: true,
          /** Indices de départ par catégorie — mêmes valeurs que la création
              par points (`awakenedStart`), lues sur la même page. */
          ordinaryEdgeBonus: 1,
          effects: [
            "Choisir métatype, voire métavariante, et traits métagénétiques — payés en Karma.",
            "Choisir ordinaire, Éveillé ou Émergé.",
            "Choisir sa nationalité et sa langue maternelle.",
            "Un ou deux traits de naissance ; si deux, l'un positif et l'autre négatif.",
          ],
        },
        {
          id: "croissance",
          label: "Croissance : de l'enfance à l'adolescence",
          hint: "Les acquis de votre jeunesse.",
          /** Quatre compétences au rang 2, prises dans cette liste fermée. */
          skillCount: 4,
          skillRank: 2,
          skillPool: [
            "Athlétisme", "Combat rapproché", "Escroquerie", "Électronique",
            "Plein air", "Perception", "Furtivité",
          ],
          knowledge: "Géographie [région]",
          effects: [
            "Un ou deux traits liés à l'adolescence ; si deux, l'un positif et l'autre négatif.",
          ],
        },
        {
          id: "majorite",
          label: "Majorité : du jeune adulte à la maturité",
          hint: "Votre principal talent, et l'attribut qui vous définit.",
          /** Une compétence au rang 4 — ou 6 si elle avait déjà été prise à
              la Croissance. C'est la seule façon d'atteindre 6 ici. */
          talentRank: 4,
          talentRankIfRepeated: 6,
          /** Meilleur attribut (hors Atout, Magie, Résonance) +5 rangs ; si
              le métatype y plafonne à 5, le mettre au max et +1 ailleurs. */
          bestAttrBonus: 5,
          bestAttrExcludes: ["ATO", "MAG", "RES"],
          nuyen: 25000,
          /** Un contact de la catégorie de son choix, 4 points répartis entre
              Réseau et Loyauté, minimum 1 chacun. */
          contact: { points: 4, minEach: 1, anyCategory: true },
          effects: [
            "Un ou deux traits, positifs ou négatifs, qui vous définissent particulièrement.",
          ],
        },
      ],

      /** Catalogue des modules d'âge adulte — 75 modules de choix de vie et
          11 modules d'événements, remplis par sr6.lifemodules.js. Reste vide
          si ce fichier n'est pas chargé : `stepErrors` le dit alors au lieu
          de laisser créer un personnage sans modules. */
      adult: [],
    },

    /* ---- Coûts de progression (core p.70) — lus à l'image ---- */
    karmaCosts: {
      attrMult: 5, // 5 × nouveau rang
      skillMult: 5, // 5 × nouveau rang — DEUX FOIS PLUS CHER QU'EN SR5
      specialization: 5,
      mastery: 5,
      knowledge: 3,
      spell: 5,
      ritual: 5,
      complexForm: 5,
    },

    /** Les 19 compétences officielles (core p.66).
        ⚠ `SkillCatalog.sr6` de l'app diverge : il porte des compétences SR5
        (Discrétion, Intimidation, Leadership, Survie) et omet Armes exotiques,
        Plein air et Technomancie. Il sert l'édition manuelle de PNJ ; la
        création a besoin de la liste du livre, donc elle la porte elle-même —
        même parti que `anarchy2.creation.js`, pour la même raison. */
    SKILLS: [
      { name: "Armes à feu", attr: "AGI" },
      { name: "Armes exotiques", attr: "AGI" },
      { name: "Astral", attr: "INT" },
      { name: "Athlétisme", attr: "AGI" },
      { name: "Biotech", attr: "LOG" },
      { name: "Combat rapproché", attr: "AGI" },
      { name: "Conjuration", attr: "MAG" },
      { name: "Électronique", attr: "LOG" },
      { name: "Enchantement", attr: "MAG" },
      { name: "Escroquerie", attr: "CHA" },
      { name: "Furtivité", attr: "AGI" },
      { name: "Influence", attr: "CHA" },
      { name: "Ingénierie", attr: "LOG" },
      { name: "Perception", attr: "INT" },
      { name: "Pilotage", attr: "RÉA" },
      { name: "Piratage", attr: "LOG" },
      { name: "Plein air", attr: "INT" },
      { name: "Sorcellerie", attr: "MAG" },
      { name: "Technomancie", attr: "RES" },
    ],

    /* ============================================================
       CONTRAT LU PAR CHARGEN
       ============================================================ */
    steps(build) {
      const fam = this.methods[build.method]?.family;
      const out = [{ id: "concept", kind: "concept", label: "Concept" }];
      if (fam === "priority") out.push({ id: "priorites", kind: "priorities", label: "Priorités" });
      if (fam === "modules") out.push({ id: "modules", kind: "life_modules", label: "Parcours" });
      // En méthode à modules, on ne DÉPENSE pas de points d'attributs ni de
      // compétences : ce sont les modules qui les accordent. Les deux étapes
      // correspondantes n'auraient rien à faire — les afficher vides serait
      // un écran qui ment sur ce qu'il y a à y faire.
      if (fam !== "modules") {
        out.push(
          { id: "attrs", kind: "attrs", label: "Attributs" },
          { id: "skills", kind: "skills_sr6", label: "Compétences" },
        );
      }
      if (this.magicStep(build)) out.push({ id: "magie", kind: "magic_sr", label: "Magie / Résonance" });
      out.push({ id: "traits", kind: "traits_sr", label: "Traits" });
      out.push(
        { id: "gear", kind: "gear_nuyen", label: "Équipement" },
        { id: "contacts", kind: "contacts", label: "Contacts" },
        { id: "review", kind: "review", label: "Révision" },
      );
      return out;
    },

    newBuild() {
      return {
        method: "priorites",
        meta: "Humain",
        gender: "NB",
        name: "",
        concept: "",
        awakened: "",
        priorities: { meta: "D", attrs: "B", skills: "A", magic: "E", nuyen: "C" },
        attrs: {},
        special: { ATO: 1, MAG: 0, RES: 0 },
        skills: [],
        knowledges: [],
        spells: [],
        complexForms: [],
        adeptPowers: [],
        /** Option retenue dans la colonne Magie (familles à priorités) ; les
            familles « points » et « modules » passent par `awakened`. */
        magicOption: "",
        tradition: "",
        lifestyle: "",
        /** Traits retenus : `{id, karma}`. */
        traits: [],
        gear: [],
        contacts: [],
        pcNuyen: 0, // PC investis en ressources (méthode par points)
        // Méthode à modules : les 8 emplacements adultes, chacun {id, choix}.
        lifeModules: [],
        /** Choix des trois modules imposés (Croissance et Majorité en ont). */
        lifeImposed: { croissanceSkills: [], talent: "", bestAttr: "" },
        notes: "",
      };
    },

    /** Bornes d'attributs. Source principale : `EditionSR6.attrRange` (table
        du livre p.67, vérifiée cellule par cellule).

        ⚠ Les cinq MÉTACONSCIENCES (Centaure, Naga, Pixie, Sasquatch, Triton)
        n'y figurent pas — elles n'ont de fourchettes que dans les tables de
        `Metavariants`. Sans ce second recours, `_range` retombait en SILENCE
        sur l'Humain : mesuré le 2026-09-09, un Sasquatch ressortait avec
        CON 1-6 au lieu de 1-10.

        ⚠ On passe par `Metavariants.use("sr6").resolve()`, PAS par
        `Metavariants.sr6[nom]` : la table est imbriquée en
        `{metavariants, metaconsciences, zoocanthropes}` et un accès direct
        rend `undefined` sans rien signaler — c'est ce qui m'avait piégé. */
    _range(meta, key) {
      const r =
        EditionSR6.attrRange[meta] ||
        Metavariants.use("sr6").resolve(meta)?.ranges ||
        EditionSR6.attrRange.Humain;
      return r[key] || [1, 6];
    },

    /** La liste des métatypes vient de `metaTable` — celle du Compagnon p.90,
        seule table qui dise quelles LETTRES chaque métatype peut recevoir.
        Elle était tirée de `Object.keys(attrRange)`, qui ignore tout des
        priorités : avec un Duende, les cinq lettres rendaient « — ». */
    _metaList() {
      return this.metaTable.map((m) => m.nom);
    },

    /** La ligne p.90 d'un métatype, ou null s'il est inconnu de la table. */
    metaRow(meta) {
      return this.metaTable.find((m) => m.nom === meta) || null;
    },

    /** Points d'ajustement offerts pour ce métatype à cette lettre. `null`
        signifie que le livre n'ouvre PAS cette lettre à ce métatype. */
    adjustFor(meta, letter) {
      const r = this.metaRow(meta);
      return r ? (r.adj[letter] ?? null) : null;
    },

    /** Coût en karma de personnalisation du métatype choisi (p.90). Rendu tel
        quel : le Nartaki vaut « 5 / 10 » selon le nombre de paires de Bras de
        Shiva, et figer l'un des deux effacerait une règle que le livre
        distingue — CON et FOR bougent avec. À trancher par le joueur. */
    metaKarma(build) {
      const r = this.metaRow(build.meta);
      return r ? r.karma : 0;
    },

    /** Un attribut est « spécial de métatype » quand son maximum dépasse 6 :
        c'est le seul que les points d'ajustement peuvent monter (p.66). */
    _isMetaSpecial(meta, key) {
      return this._range(meta, key)[1] > 6;
    },

    /* ---- Totaux offerts ---- */
    attrPointsTotal(build) {
      if (this.methods[build.method]?.family === "pc") {
        return this.pc.attrFree + Math.floor((build.pcAttr || 0) / this.pc.attrCost);
      }
      return this.priorityTable[build.priorities.attrs]?.attrs || 0;
    },
    adjustPointsTotal(build) {
      if (this.methods[build.method]?.family === "pc") {
        return this.pc.adjustFree + Math.floor((build.pcAdjust || 0) / this.pc.adjustCost);
      }
      return this.adjustFor(build.meta, build.priorities.meta) || 0;
    },
    skillPointsTotal(build) {
      if (this.methods[build.method]?.family === "pc") {
        return this.pc.skillFree + Math.floor((build.pcSkill || 0) / this.pc.skillCost);
      }
      return this.priorityTable[build.priorities.skills]?.skills || 0;
    },
    nuyenTotal(build) {
      if (this.methods[build.method]?.family === "pc") {
        return Math.min(this.pc.nuyenMax, (build.pcNuyen || 0) * this.pc.nuyenPerPC);
      }
      return this.priorityTable[build.priorities.nuyen]?.nuyen || 0;
    },

    /* ---- Dépenses ---- */
    /** ⚠ Depuis 1, un pour un (p.66) — pas depuis l'indice du métatype
        comme en SR5, ni depuis 0 comme en Anarchy 2. */
    attrPointsUsed(build) {
      return this.ATTRS.reduce((sum, k) => sum + Math.max(0, ((build.attrs || {})[k] ?? 1) - 1), 0);
    },

    /** Points d'ajustement : Atout au-dessus de 1, Magie/Résonance, et les
        attributs « spéciaux de métatype » montés au-delà de 6. */
    adjustPointsUsed(build) {
      const sp = build.special || {};
      let sum = Math.max(0, (sp.ATO ?? 1) - 1) + Math.max(0, sp.MAG || 0) + Math.max(0, sp.RES || 0);
      for (const k of this.ATTRS) {
        if (!this._isMetaSpecial(build.meta, k)) continue;
        sum += Math.max(0, ((build.attrs || {})[k] ?? 1) - 6);
      }
      return sum;
    },

    /** Un point = un rang, ou une spécialisation (p.66). */
    skillPointsUsed(build) {
      return (build.skills || []).reduce(
        (sum, s) => sum + (s.val || 0) + (s.specs || []).length,
        0,
      );
    },

    nuyenUsed(build) {
      // ⚠ Le premier mois de style de vie est payé d'avance : il fait
      // partie des ressources dépensées, pas d'un budget à côté.
      return this.lifestyleCost(build) + this.accessoryCost(build) + (build.gear || []).reduce((sum, g) => sum + (Number(g.cost) || 0), 0);
    },

    /** PC dépensés — méthode par points uniquement. */
    pcUsed(build) {
      const p = this.pc;
      let sum = build.awakened ? p.awakened : 0;
      sum += Number(build.pcAdjust || 0);
      sum += Number(build.pcAttr || 0);
      sum += Number(build.pcSkill || 0);
      sum += Number(build.pcNuyen || 0);
      sum += (build.spells || []).length * p.spell;
      return sum;
    },

    priorityPointsUsed(build) {
      return this.PRIORITY_COLUMNS.reduce(
        (sum, col) => sum + (this.priorityCost[build.priorities[col.key]] ?? 0),
        0,
      );
    },

    /** Points de contacts : Charisme × 6 (p.69). */
    contactPointsTotal(build) {
      return ((build.attrs || {}).CHA ?? 1) * this.CONTACT_MULT;
    },
    contactPointsUsed(build) {
      return (build.contacts || []).reduce(
        (sum, c) => sum + (Number(c.network) || 0) + (Number(c.loyalty) || 0),
        0,
      );
    },

    /* ---- Écrans ---- */
    conceptFields(build) {
      const fam = this.methods[build.method]?.family;
      const fields = [
        { path: "name", label: "Nom", type: "text", placeholder: "Nom du personnage" },
        {
          path: "concept",
          label: "Concept",
          type: "text",
          placeholder: "ex. samouraï des rues, décker de rue, mage de combat…",
        },
        {
          path: "method",
          label: "Méthode de création",
          type: "select",
          options: Object.entries(this.methods).map(([v, m]) => ({
            value: v,
            label: `${m.label}${m.wip ? " — catalogue à venir" : ""} · ${m.source}`,
          })),
        },
        {
          path: "meta",
          label: "Métatype",
          type: "select",
          // Groupés par souche, les métaconsciences à la fin — l'ordre de la
          // table du Compagnon p.90, qui est aussi celui que le joueur cherche.
          options: this.metaTable.map((m) => ({
            value: m.nom,
            label: m.souche && m.souche !== m.nom ? `${m.nom} (${m.souche})` : m.nom,
          })),
        },
        {
          path: "gender",
          label: "Genre",
          type: "select",
          options: [
            { value: "M", label: "Masculin" },
            { value: "F", label: "Féminin" },
            { value: "NB", label: "Non-binaire" },
          ],
        },
      ];
      // Le coût du métatype se paie en KARMA de personnalisation, « quelle que
      // soit la méthode de création » (Compagnon p.90) — donc aussi en PC et en
      // modules, où rien d'autre ne le rappellerait.
      const kMeta = this.metaKarma(build);
      if (kMeta) {
        fields.push({
          path: "_metaKarma",
          label:
            typeof kMeta === "string"
              ? `${build.meta} coûte ${kMeta} karma de personnalisation — le livre donne deux valeurs selon l'option choisie, à trancher avec le meneur.`
              : `${build.meta} coûte ${kMeta} karma de personnalisation, sur les ${this.KARMA} de départ.`,
          type: "note",
        });
      }

      /* En création par points, la catégorie d'Éveil s'achète (10 PC) et fixe
         l'indice de départ ; en priorités elle découle de la colonne Magie.

         ⚠ En méthode à MODULES, elle se choisit à la Naissance (Compagnon
         p.31) — et le contrôle manquait purement et simplement. `build.awakened`
         était donc toujours vide, si bien que `lifeModuleCatalog` masquait les
         NEUF modules réservés aux Éveillés, aux Émergés et aux adeptes
         (Alchimiste, Chaman urbain, Technomancien…) : on ne pouvait pas se
         construire un magicien par les modules de vie. Le reste du moteur
         attendait pourtant déjà cette valeur — `lifeModuleGrants` accorde
         +1 Atout à l'ordinaire. Une omission, pas un désaccord de conception. */
      if (fam === "pc" || fam === "modules") {
        const parPoints = fam === "pc";
        fields.push({
          path: "awakened",
          label: parPoints ? "Éveillé ou Émergé (10 PC)" : "Éveillé ou Émergé — choisi à la Naissance",
          type: "select",
          options: [{ value: "", label: parPoints ? "Ordinaire (0 PC)" : "Ordinaire (+1 Atout)" }].concat(
            Object.entries(this.awakenedStart).map(([v, a]) => ({
              value: v,
              label: `${a.label} — ${a.attr} ${a.start} au départ`,
            })),
          ),
        });
      }

      if (fam === "pc") {
        fields.push({
          path: "pcAdjust",
          label: `PC investis en points d'ajustement (${this.pc.adjustCost} PC le point, ${this.pc.adjustMax} max)`,
          type: "number",
        });
        fields.push({
          path: "pcAttr",
          label: `PC investis en attributs (${this.pc.attrCost} PC le point, ${this.pc.attrMax} max)`,
          type: "number",
        });
        fields.push({
          path: "pcSkill",
          label: `PC investis en compétences (${this.pc.skillCost} PC le point, ${this.pc.skillMax} max)`,
          type: "number",
        });
        fields.push({
          path: "pcNuyen",
          label: `PC investis en ressources (1 PC = ${this.pc.nuyenPerPC.toLocaleString("fr-FR")} ¥)`,
          type: "number",
        });
      }
      /* La tradition n'est demandée QU'À UN LANCEUR DE SORTS : un adepte
         n'en a pas, un technomancien encore moins. Elle porte l'attribut de
         résistance au Drain, que la fiche et les règles savent déjà lire.
         ⚠ Hors de toute branche de méthode : le choix vaut pour les quatre. */
      const profilMagique = this.magicProfile(build);
      if (profilMagique && profilMagique.key !== "technomancien" && profilMagique.key !== "adepte") {
        fields.push({
          path: "tradition",
          label: "Tradition magique (résistance au Drain)",
          type: "select",
          options: [{ value: "", label: "— à choisir —" }].concat(this.traditionCatalog()),
        });
      }

      /* Le style de vie se choisit à la création et son PREMIER MOIS se
         paie d'avance : il pèse donc sur les ressources de départ. */
      fields.push({
        path: "lifestyle",
        label: "Style de vie (premier mois payé d'avance)",
        type: "select",
        options: [{ value: "", label: "— à choisir —" }].concat(this.lifestyleCatalog()),
      });

      return fields;
    },

    budget(build) {
      const method = this.methods[build.method];
      if (!method) return { headline: null, cells: [] };
      const n = (v) => v.toLocaleString("fr-FR");
      const cells = [
        { label: "Attributs", used: this.attrPointsUsed(build), total: this.attrPointsTotal(build) },
        { label: "Ajustement", used: this.adjustPointsUsed(build), total: this.adjustPointsTotal(build) },
        { label: "Compétences", used: this.skillPointsUsed(build), total: this.skillPointsTotal(build) },
        { label: "Nuyens", used: this.nuyenUsed(build), total: this.nuyenTotal(build) },
      ];

      if (method.family === "modules") {
        const g = this.lifeModuleGrants(build);
        const n = this.lifeModules.adultSlots;
        return {
          headline: {
            label: `Parcours : ${g.modules} / ${n} modules · ${this.KARMA} karma de personnalisation`,
            used: g.modules,
            total: n,
            over: g.modules > n,
          },
          cells: [
            { label: "Nuyens", used: this.nuyenUsed(build), total: g.nuyen },
            { label: "Points de contacts", used: this.contactPointsUsed(build), total: g.contactPts },
          ],
        };
      }
      if (method.family === "pc") {
        const used = this.pcUsed(build);
        return {
          headline: {
            label: `${used} / ${method.pc} PC · ${this.KARMA} karma de personnalisation en plus`,
            used,
            total: method.pc,
            over: used > method.pc,
          },
          cells,
        };
      }
      if (method.points) {
        const used = this.priorityPointsUsed(build);
        return {
          headline: {
            label: `Priorités : ${used} / ${method.points} points`,
            used,
            total: method.points,
            over: used > method.points,
          },
          cells,
        };
      }
      return {
        headline: {
          label: `${method.label} · ${this.KARMA} karma de personnalisation`,
          used: 0,
          total: this.KARMA,
          over: false,
        },
        cells,
      };
    },

    priorityView(build) {
      const method = this.methods[build.method];
      const letters = ["A", "B", "C", "D", "E"];
      const money = (n) => n.toLocaleString("fr-FR");
      const self = this;
      return {
        letters,
        columns: this.PRIORITY_COLUMNS,
        cost: method?.points ? this.priorityCost : null,
        hint: method?.points
          ? `${method.label} : ${method.points} points à répartir (A = 4, B = 3, C = 2, D = 1, E = 0). Une même lettre peut resservir (Compagnon p.26).`
          : `${method?.label} : une lettre par colonne, chacune une seule fois (livre de base p.67).`,
        footer: method?.points
          ? `Points de priorité : ${this.priorityPointsUsed(build)} / ${method.points}`
          : "",
        /** Ce que la lettre CHOISIE en Magie/Résonance accorde, en toutes
            lettres. La cellule reste compacte (cinq colonnes doivent tenir à
            375 px avec des cibles de 44 px), mais le sens ne vit plus dans un
            `title=` que le tactile n'atteint jamais. */
        magicLegend: (() => {
          const row = self.priorityTable[build.priorities.magic];
          if (!row) return null;
          if (!row.magic.length) {
            return { letter: build.priorities.magic, options: [], lignes: ["Ordinaire — ni Magie ni Résonance."] };
          }
          return {
            letter: build.priorities.magic,
            /* Choisissables, et non plus décoratives : ce choix commande
               l'étape Magie. Cf. le commentaire jumeau de sr5.creation.js. */
            options: row.magic.map((m) => ({
              key: m.key,
              label: self._magicOptionLabel(m),
              chosen: build.magicOption === m.key,
            })),
            lignes: row.magic.map((m) => {
              const bits = [];
              if (m.mag) bits.push(`Magie ${m.mag}`);
              if (m.res) bits.push(`Résonance ${m.res}`);
              if (m.formulas) bits.push(`${m.formulas} formules`);
              if (m.forms) bits.push(`${m.forms} formes complexes`);
              return `${m.label} : ${bits.join(", ")}`;
            }),
          };
        })(),
        cell(colKey, L) {
          const row = self.priorityTable[L];
          if (colKey === "meta") {
            // Chaque métatype a SA ligne (Compagnon p.90) : une métavariante
            // ne suit pas forcément celle de sa souche.
            const pts = self.adjustFor(build.meta, L);
            if (pts == null) {
              return {
                html: "—",
                title: `${build.meta} n'a pas de ligne en priorité ${L} au Compagnon p.90`,
                invalid: true,
              };
            }
            const k = self.metaKarma(build);
            return {
              html: `${build.meta} (${pts})`,
              title: `${pts} point(s) d'ajustement${k ? ` · métatype à ${k} karma` : ""}`,
              invalid: false,
            };
          }
          if (colKey === "attrs") return { html: String(row.attrs), title: "Points d'attributs", invalid: false };
          if (colKey === "skills") return { html: String(row.skills), title: "Rangs de compétences", invalid: false };
          if (colKey === "nuyen") return { html: `${money(row.nuyen)} ¥`, title: "Ressources", invalid: false };
          if (!row.magic.length) return { html: "Ordinaire", title: "Ni Magie ni Résonance", invalid: false };
          const parts = row.magic.map((m) => {
            const bits = [];
            if (m.mag) bits.push(`Magie ${m.mag}`);
            if (m.res) bits.push(`Résonance ${m.res}`);
            if (m.formulas) bits.push(`${m.formulas} formules`);
            if (m.forms) bits.push(`${m.forms} formes complexes`);
            return `${m.label} : ${bits.join(", ")}`;
          });
          return {
            html: row.magic.map((m) => (m.mag ? `M${m.mag}` : `R${m.res}`)).join(" · "),
            title: parts.join(" — "),
            invalid: false,
          };
        },
      };
    },

    attrsStep(build) {
      const specs = this.ATTRS.map((key) => {
        const [min, max] = this._range(build.meta, key);
        return {
          key,
          min,
          max,
          note: this._isMetaSpecial(build.meta, key) ? "ajustement au-delà de 6" : "",
        };
      });
      const [atoMin, atoMax] = this._range(build.meta, "ATO");
      const specialSpecs = [
        { key: "ATO", path: "special.ATO", min: atoMin, max: atoMax, note: "Atout" },
        { key: "MAG", path: "special.MAG", min: 0, max: 6, note: "Magie" },
        { key: "RES", path: "special.RES", min: 0, max: 6, note: "Résonance" },
      ];
      const atMax = this.ATTRS.filter(
        (k) => ((build.attrs || {})[k] ?? 1) >= this._range(build.meta, k)[1],
      ).length;
      const used = this.attrPointsUsed(build);
      const total = this.attrPointsTotal(build);
      const aUsed = this.adjustPointsUsed(build);
      const aTotal = this.adjustPointsTotal(build);
      return {
        hint: `Les attributs partent tous de 1 et se paient un pour un (p.66). Les points d'ajustement, eux, montent l'Atout, la Magie ou la Résonance, et les attributs dont le maximum dépasse 6 pour ce métatype.`,
        groups: [
          { label: "Attributs", used, total, specs },
          { label: "Ajustement (Atout, Magie, Résonance)", used: aUsed, total: aTotal, specs: specialSpecs },
        ],
        footer: `Attributs : ${used} / ${total} · Ajustement : ${aUsed} / ${aTotal} · <span class="${atMax > 1 ? "cg-error-text" : ""}">au maximum du métatype : ${atMax} / 1</span>`,
      };
    },

    attrRangeFor(build, key) {
      if (key === "ATO") return this._range(build.meta, "ATO");
      if (key === "MAG" || key === "RES") return [0, 6];
      return this._range(build.meta, key);
    },

    /** Le catalogue filtré par ce que le personnage PEUT prendre : une
        restriction de MODULE (au pluriel dans le livre) ferme le module ;
        une restriction d'OPTION (au singulier, dans une puce) ne ferme rien
        et reste dans les listes `parmi`. */
    lifeModuleCatalog(build) {
      const a = build.awakened || "";
      const estEveille = ["magicien", "specialise", "adepte", "mystique"].includes(a);
      const estEmerge = a === "technomancien";
      const estAdepte = a === "adepte";
      return (this.lifeModules.adult || []).filter((m) => {
        if (!m.restriction) return true;
        const r = m.restriction.toLowerCase();
        if (r.includes("adepte")) return estAdepte;
        if (r.includes("émergé")) return estEmerge;
        if (r.includes("éveillé")) return estEveille;
        return true;
      });
    },

    /** Catégories d'attributs SR6 (p.42), nécessaires parce que certains
        modules — Voyageur, la plupart des événements — n'offrent pas une
        liste d'attributs mais une CATÉGORIE : « un attribut physique de votre
        choix ». Sans ce développement, la phrase serait prise pour un nom
        d'attribut et le personnage gagnerait un attribut nommé
        « un attribut physique ». */
    ATTR_GROUPS: {
      physique: ["CON", "AGI", "RÉA", "FOR"],
      mental: ["VOL", "LOG", "INT", "CHA"],
      special: ["ATO", "MAG", "RES"],
    },

    /** Développe une option générique en la liste concrète qu'elle désigne,
        et rend TOUJOURS des paires `{value, label}` : `value` est ce que le
        moteur applique, `label` ce que le joueur lit.

        ⚠ Les deux ont divergé le jour où le livre a écrit « votre Magie
        (Éveillé uniquement) » : la parenthèse est une CONDITION D'ACCÈS, pas
        une partie du code. Comme la valeur stockée servait aussi de libellé,
        `lifeModuleGrants` écrivait un attribut nommé « MAG (Éveillé
        uniquement) » que rien ne relisait — le point accordé par le module
        disparaissait sans un mot, dans une quinzaine de modules parmi les plus
        courants. Ne pas refusionner value et label.

        La restriction reste AFFICHÉE et l'option reste choisissable : c'est la
        doctrine déjà posée par `lifeModuleCatalog` — une restriction de MODULE
        ferme le module, une restriction d'OPTION ne ferme rien.

        `value: ""` marque une option que le moteur ne sait pas appliquer.
        `addAttr` / `addSkill` l'ignorent (garde `if (k)`) et le libellé dit au
        joueur de la traiter lui-même. Un seul cas subsiste : le second
        attribut de Drain de l'Alchimiste (p.33), qui dépend de la tradition —
        que la création ne demande à aucun moment. */
    expandParmi(parmi, kind, build) {
      const codes = new Set([...this.ATTRS, ...this.ATTR_GROUPS.special]);
      const out = [];
      const pousser = (value, label) => out.push({ value, label: label ?? value });

      for (const opt of parmi || []) {
        const o = opt.toLowerCase();

        // « MAG (Éveillé uniquement) » → valeur MAG, libellé entier.
        const cond = opt.match(/^(\S+)\s*\((.+)\)$/);
        if (cond && codes.has(cond[1])) {
          pousser(cond[1], opt);
          continue;
        }

        const generique =
          o.includes("de votre choix") ||
          o.includes("au choix") ||
          o.startsWith("un attribut") ||
          o.startsWith("une compétence");

        if (!generique) {
          /* « votre second attribut employé pour le Drain » (Alchimiste,
             p.33) N'EST PLUS irréductible : depuis que la création demande la
             TRADITION, son `drainAttr` donne la réponse. Je l'avais déclaré
             insoluble en 1.163.0 — il ne l'était que faute d'avoir posé la
             question. Sans tradition choisie, on retombe sur l'aveu. */
          if (/drain/i.test(o)) {
            const dr = build ? this.drainAttr(build) : null;
            if (dr) pousser(dr, `${dr} — second attribut de Drain de votre tradition`);
            else pousser("", `${opt} — choisissez d'abord votre tradition`);
            continue;
          }
          // Un nom de compétence est libre ; un attribut doit être un code.
          if (kind === "skills" || codes.has(opt)) pousser(opt);
          else pousser("", `${opt} — à appliquer vous-même`);
          continue;
        }

        if (kind === "skills") {
          for (const x of this.SKILLS) pousser(x.name);
          continue;
        }
        const g = this.ATTR_GROUPS;
        const parts = [];
        if (o.includes("physique")) parts.push(...g.physique);
        if (o.includes("mental")) parts.push(...g.mental);
        if (o.includes("spécial") || o.includes("special")) parts.push(...g.special);
        for (const x of parts.length ? parts : [...g.physique, ...g.mental, ...g.special]) pousser(x);
      }

      const vu = new Set();
      return out.filter((x) => {
        const cle = x.value || x.label;
        if (vu.has(cle)) return false;
        vu.add(cle);
        return true;
      });
    },

    lifeModuleById(id) {
      return (this.lifeModules.adult || []).find((m) => m.id === id) || null;
    },

    /** Le parcours complet, résolu : les trois modules imposés puis les huit
        adultes, avec les choix tranchés. C'est CE calcul qui fait le
        personnage — en méthode à modules, on ne dépense aucun point.
        Les ressources s'additionnent et ne se dépensent qu'à la fin (p.30). */
    lifeModuleGrants(build) {
      const imp = build.lifeImposed || {};
      const out = {
        attrs: {}, skills: {}, know: [],
        nuyen: 0, contactPts: 0, modules: 0, evenements: 0,
      };
      const addAttr = (k, n) => { if (k) out.attrs[k] = (out.attrs[k] || 0) + n; };
      const addSkill = (k, n) => { if (k) out.skills[k] = Math.max(out.skills[k] || 0, 0) + n; };

      /* --- Naissance : les valeurs de départ (p.31) --- */
      for (const k of this.ATTRS) {
        out.attrs[k] = this._range(build.meta, k)[1] > 6 ? 2 : 1;
      }
      out.attrs.ATO = build.meta === "Humain" ? 2 : 1;
      if (!build.awakened) out.attrs.ATO += 1; // ordinaire : +1 Atout
      const cat = this.awakenedStart[build.awakened];
      if (cat) out.attrs[cat.attr] = cat.start;

      /* --- Croissance : quatre compétences au rang 2 --- */
      for (const sk of imp.croissanceSkills || []) if (sk) out.skills[sk] = 2;

      /* --- Majorité : le talent, puis le meilleur attribut --- */
      const maj = this.lifeModules.imposed.find((i) => i.id === "majorite");
      if (imp.talent) {
        const dejaPrise = (imp.croissanceSkills || []).includes(imp.talent);
        out.skills[imp.talent] = dejaPrise ? maj.talentRankIfRepeated : maj.talentRank;
      }
      if (imp.bestAttr) {
        const max = this._range(build.meta, imp.bestAttr)[1];
        // « Si votre métatype a un maximum de 5 dans cet attribut, donnez-lui
        // sa valeur maximum et augmentez de 1 un autre attribut. »
        out.attrs[imp.bestAttr] = Math.min(max, (out.attrs[imp.bestAttr] || 1) + maj.bestAttrBonus);
      }
      out.nuyen += maj.nuyen || 0;
      out.contactPts += maj.contact ? maj.contact.points : 0;

      /* --- Les huit modules adultes --- */
      for (const slot of build.lifeModules || []) {
        const m = this.lifeModuleById(slot && slot.id);
        if (!m) continue;
        out.modules++;
        if (m.type === "evenement") out.evenements++;
        (m.attrs || []).forEach((a, k) => addAttr((slot.attrs || [])[k], a.n));
        (m.skills || []).forEach((sk, k) => {
          const choisi = (slot.skills || [])[k];
          if (choisi) addSkill(choisi, sk.n);
        });
        if (m.know && slot.know) out.know.push(slot.know);
        out.nuyen += m.nuyen || 0;
        out.contactPts += m.contactPts || 0;
      }

      // Les rangs au-delà du maximum du métatype (ou du plafond de compétence)
      // sont PERDUS, pas ignorés en silence : on les relève pour que l'écran
      // puisse le dire, comme le livre le prévoit pour les modules trop
      // généreux.
      out.overflow = [];
      for (const k of [...this.ATTRS, "ATO"]) {
        const max = this._range(build.meta, k)[1];
        if ((out.attrs[k] || 0) > max) {
          out.overflow.push(`${k} ${out.attrs[k]} → ${max} (maximum ${build.meta})`);
          out.attrs[k] = max;
        }
      }
      for (const k of ["MAG", "RES"]) {
        if ((out.attrs[k] || 0) > 6) {
          out.overflow.push(`${k} ${out.attrs[k]} → 6`);
          out.attrs[k] = 6;
        }
      }
      for (const [n, v] of Object.entries(out.skills)) {
        if (v > this.SKILL_CAP) {
          out.overflow.push(`${n} ${v} → ${this.SKILL_CAP}`);
          out.skills[n] = this.SKILL_CAP;
        }
      }
      return out;
    },

    skillCatalog() {
      return this.SKILLS.map((s) => ({ ...s }));
    },

    /** Catalogue d'équipement, GROUPÉ PAR CATÉGORIE.

        ⚠ Corrigé le 2026-09-09 : `ItemResolver.flattenEquipPools` rend
        `[{category, items:[{id,label}]}]` — des GROUPES, pas des items. Le
        code d'origine faisait `it.label || it.name || String(it)` dessus, ce
        qui donnait `String(<groupe>)` soit « [object Object] » sur TOUTES les
        entrées du sélecteur. Écrit en 1.156.0 et recopié tel quel d'une
        édition à l'autre : deux fois la même faute, jamais vue parce que la
        vérification lisait l'en-tête de l'écran, pas le contenu de la liste.

        La catégorie n'est plus jetée : le sélecteur la rend en <optgroup>,
        ce qui était la raison d'être de `flattenEquipPools`. */
    gearCatalog() {
      return (EditionSR6.equipCatalog() || []).map((g) => ({
        category: g.category,
        // `detail` porte la ligne de stats du livre ; l'écran la montre.
        items: (g.items || [])
          .map((it) => ({ label: it.label, detail: it.detail || "" }))
          .filter((it) => it.label),
      }));
    },

    gearLimits(build) {
      return {
        availability: this.ILLEGAL_AVAILABILITY_CAP - 1,
        hint: `À la création, pas de matériel illégal de Disponibilité ${this.ILLEGAL_AVAILABILITY_CAP} ou plus (p.69). Il ne doit rester au plus ${this.CASH_MAX.toLocaleString("fr-FR")} ¥ en liquide.`,
      };
    },

    /** Traduit un contact saisi dans l'assistant vers les champs qu'attend
        `Contacts.buildManual`. SR6 nomme l'indice « Réseau » au livre et le
        stocke en `influence` — même structure que SR5, autre vocabulaire. */
    contactToManual(c) {
      return {
        name: c.name,
        role: c.description || "",
        influence: c.network || 1,
        loyaute: c.loyalty || 1,
      };
    },

    /** Contacts SR6 : Réseau et Loyauté — « Réseau », pas « Connexion »,
        qui est le terme SR5 (p.69). */
    contactFields() {
      return [
        { key: "name", placeholder: "Nom" },
        { key: "description", placeholder: "Rôle / archétype" },
        { key: "network", placeholder: "Réseau", type: "number", min: 1, max: 12 },
        { key: "loyalty", placeholder: "Loyauté", type: "number", min: 1, max: 6 },
      ];
    },
    contactsHint(build) {
      return `Réseau + Loyauté se paient sur Charisme × ${this.CONTACT_MULT} : ${this.contactPointsUsed(build)} / ${this.contactPointsTotal(build)} points (p.69). Aucun indice ne peut dépasser le Charisme.`;
    },

    /* ============================================================
       MAGIE / RÉSONANCE — formules, formes complexes, pouvoirs d'adepte
       ------------------------------------------------------------
       Mêmes accesseurs qu'en SR5, MAIS le vocabulaire du livre diffère et on
       ne l'aplatit pas : SR6 parle de FORMULES (sorts, rituels et
       préparations alchimiques sous un même quota, core p.67), là où SR5
       compte des sorts. Le catalogue de l'application ne contient que des
       sorts : le quota affiché est donc celui du livre, la liste ne couvre
       qu'une partie de ce qu'il autorise, et l'écran le dit.
       ============================================================ */

    _magicOptionLabel(m) {
      const bits = [];
      if (m.mag) bits.push(`Magie ${m.mag}`);
      if (m.res) bits.push(`Résonance ${m.res}`);
      if (m.formulas) bits.push(`${m.formulas} formules`);
      if (m.forms) bits.push(`${m.forms} formes complexes`);
      return bits.length ? `${m.label} — ${bits.join(", ")}` : m.label;
    },

    /** Profil magique effectif, ou `null` pour un ordinaire. La colonne Magie
        en priorités ; `awakened` pour les méthodes par points et à modules,
        où le choix se fait au Concept (et, pour les modules, à la Naissance
        — Compagnon p.31). */
    /** Les traditions du livre, avec leur ATTRIBUT DE DRAIN. `Magic.traditions`
        les porte depuis toujours — 18 en SR5, 16 en SR6 — la fiche les affiche
        et les règles les lisent ; seule la création ne les demandait pas.

        ⚠ C'est ce `drainAttr` qui rend enfin lisible le « second attribut
        employé pour le Drain » de l'Alchimiste (module de vie SR6, p.33), que
        j'avais déclaré irréductible en 1.163.0 : il n'est irréductible que
        tant qu'on ignore la tradition du personnage. */
    /* ---- Styles de vie (Livre de base p.253) ----
       ⚠ L'application les modélise DÉJÀ : `pnj.identities[].lifestyles` et
       `pnj.orphanLifestyles`, avec leur section sur la fiche et leur interface
       dans le kit. Seule la création ne les demandait pas. On émet donc un
       style de vie ORPHELIN (« sans SIN ») plutôt qu'un champ neuf : la fiche
       sait déjà l'afficher, et le joueur le rattachera à une identité quand
       il en créera une.

       La grille est identique en SR5 et en SR6, mais chaque édition déclare
       la sienne avec sa page : ce n'est pas au contrôleur de savoir qu'elles
       coïncident, et rien ne garantit qu'une errata ne les sépare pas. */
    lifestyles: [
      { id: "rue", nom: "La rue", cout: 0, note: "Gratuit — et on en a pour son argent." },
      { id: "squatter", nom: "Squatter", cout: 500 },
      { id: "bas", nom: "Bas", cout: 2000 },
      { id: "moyen", nom: "Moyen", cout: 5000 },
      { id: "eleve", nom: "Élevé", cout: 10000 },
      { id: "luxueux", nom: "Luxueux", cout: 100000 },
    ],

    /** Le catalogue, prêt pour un champ déclaré. */
    /* ---- Accessoires d'armes ----
       ⚠ La MONTURE est la règle à ne pas aplatir : deux accessoires qui
       occupent le même point de fixation (Dessus, Dessous, Canon) ne se
       cumulent PAS sur une même arme. « — » = aucune monture, cumul libre.
       C'est cette contrainte, pas le prix, qui fait l'intérêt du choix. */
    accessoryCatalog() {
      return [{
        category: "Accessoires d'armes",
        items: AccessoiresSR6.map((a) => ({
          id: a.id,
          label: a.nom,
          detail: `${a.monture === "—" ? "sans monture" : "monture : " + a.monture} · Disp. ${a.dispo} · ${
            a.cout != null ? a.cout.toLocaleString("fr-FR") + " ¥" : a.coutNote || "coût au livre"
          } · ${a.source}`,
        })),
      }];
    },

    accessoryById(id) {
      return AccessoiresSR6.find((a) => a.id === id) || null;
    },

    /** Les montures déjà prises sur une arme, et donc les conflits. */
    accessoryConflicts(arme) {
      const prises = new Map();
      for (const id of (arme && arme.mods) || []) {
        const a = this.accessoryById(id);
        if (!a || a.monture === "—") continue;
        prises.set(a.monture, [...(prises.get(a.monture) || []), a.nom]);
      }
      return [...prises.entries()]
        .filter(([, noms]) => noms.length > 1)
        .map(([m, noms]) => `${noms.join(" et ")} occupent tous deux la monture « ${m} ».`);
    },

    /** Coût des accessoires montés sur tout l'équipement. */
    accessoryCost(build) {
      let n = 0;
      for (const g of build.gear || []) {
        for (const id of g.mods || []) {
          const a = this.accessoryById(id);
          if (a && a.cout != null) n += a.cout;
        }
      }
      return n;
    },

    lifestyleCatalog() {
      return this.lifestyles.map((l) => ({
        value: l.id,
        label: `${l.nom} — ${l.cout ? l.cout.toLocaleString("fr-FR") + " ¥/mois" : "gratuit"}`,
      }));
    },

    lifestyleById(id) {
      return this.lifestyles.find((l) => l.id === id) || null;
    },

    /** Coût du style de vie retenu. Le livre fait payer UN MOIS d'avance à la
        création : c'est ce mois qui pèse sur les ressources de départ. */
    lifestyleCost(build) {
      const l = this.lifestyleById(build.lifestyle);
      return l ? l.cout : 0;
    },

    traditionCatalog() {
      return (Magic.traditions?.sr6 || []).map((t) => ({
        value: t.name,
        label: `${t.name} — Drain : Volonté + ${Utils.attrFullName ? Utils.attrFullName(t.drainAttr) : t.drainAttr}`,
      }));
    }, 

    /** L'attribut de Drain de la tradition retenue, ou null. */
    drainAttr(build) {
      const t = (Magic.traditions?.sr6 || []).find((x) => x.name === build.tradition);
      return t ? t.drainAttr : null;
    },

    magicProfile(build) {
      const fam = this.methods[build.method]?.family;
      if (fam === "priority") {
        const row = this.priorityTable[build.priorities?.magic];
        if (!row || !row.magic.length) return null;
        const opt = row.magic.find((m) => m.key === build.magicOption);
        return opt ? { ...opt, source: "priorite" } : null;
      }
      const a = this.awakenedStart[build.awakened];
      return a ? { key: build.awakened, label: a.label, source: "eveil" } : null;
    },

    magicRating(build) {
      const p = this.magicProfile(build);
      if (!p) return 0;
      if (p.source === "priorite") return p.mag || p.res || 0;
      const sp = build.special || {};
      return this.awakenedStart[build.awakened]?.attr === "RES" ? sp.RES || 0 : sp.MAG || 0;
    },

    /** L'écran Magie, déclaré. `total: null` = pas de quota de colonne, mais
        un coût en karma de personnalisation à l'unité. */
    magicStep(build) {
      const prof = this.magicProfile(build);
      if (!prof) return null;
      const kc = this.karmaCosts;
      const parPriorite = prof.source === "priorite";
      const groups = [];
      const estTechno = prof.key === "technomancien";
      const estAdepte = prof.key === "adepte" || prof.key === "mystique";

      const sorts = Content.spellCatalogFor("sr6");
      if (sorts && !estTechno && !estAdepte) {
        groups.push({
          key: "spells",
          label: "Formules",
          hint: parPriorite
            ? `La colonne Magie ${build.priorities.magic} en accorde ${prof.formulas || 0}. Le livre compte sorts, rituels et préparations dans ce même quota ; seuls les sorts sont catalogués ici.`
            : `${kc.spell} karma la formule.`,
          total: parPriorite ? prof.formulas || 0 : null,
          used: (build.spells || []).length,
          chosen: build.spells || [],
          catalog: sorts,
        });
      }

      const formes = Content.complexFormCatalogFor("sr6");
      if (formes && estTechno) {
        groups.push({
          key: "complexForms",
          label: "Formes complexes",
          hint: parPriorite
            ? `La colonne Résonance ${build.priorities.magic} en accorde ${prof.forms || 0}.`
            : `${kc.complexForm} karma la forme complexe.`,
          total: parPriorite ? prof.forms || 0 : null,
          used: (build.complexForms || []).length,
          chosen: build.complexForms || [],
          catalog: formes,
        });
      }

      const pouvoirs = Content.pouvoirsAdepte?.sr6 || [];
      if (pouvoirs.length && estAdepte) {
        groups.push({
          key: "adeptPowers",
          label: "Pouvoirs d'adepte",
          hint: `${this.magicRating(build)} point(s) de pouvoir (autant que la Magie). Le catalogue ne porte pas le coût de chaque pouvoir : à vérifier au livre.`,
          total: null,
          used: (build.adeptPowers || []).length,
          chosen: build.adeptPowers || [],
          catalog: [{ category: "Pouvoirs d'adepte", items: pouvoirs.map((x) => ({ id: x.name, label: x.name })) }],
        });
      }

      return groups.length ? { hint: `${prof.label}.`, groups } : null;
    },

    /* ---- Traits (Livre de base p.73-81, Compagnon) ----
       Même forme qu'en SR5, MAIS SR6 n'impose pas de plafond de karma sur
       les traits : le livre borne leur NOMBRE (six à la création, cf.
       `TRAIT_MAX`) et le karma de personnalisation paie le reste. Ne pas y
       plaquer le `QUALITY_CAP: 25` de SR5, qui n'existe pas ici. */
    traitCatalog() {
      const par = { avantage: [], defaut: [] };
      for (const t of TraitsSR6) {
        par[t.type].push({
          id: t.id,
          label: t.nom,
          detail: `${t.karma} karma${t.parNiveau ? " par niveau" : ""} · ${t.source}${t.desc ? " — " + t.desc : ""}`,
        });
      }
      return [
        { category: "Traits positifs (coûtent du karma)", items: par.avantage },
        { category: "Traits négatifs (en rendent)", items: par.defaut },
      ];
    },

    traitById(id) {
      return TraitsSR6.find((t) => t.id === id) || null;
    },

    /** Résumé déclaré — SR6 borne le NOMBRE et l'écart net, pas un budget
        par catégorie comme SR5. */
    traitHint() {
      return `Les traits positifs coûtent du karma, les négatifs en rendent. SR6 ne borne pas un budget par catégorie comme SR5 : il borne le NOMBRE de traits (${this.TRAIT_MAX} à la création) et l'écart net entre positifs et négatifs (${this.TRAIT_KARMA_NET_MAX} karma).`;
    },

    traitSummary(build) {
      const t = this.traitState(build);
      return [
        { label: "traits", used: t.nombre, total: t.max },
        { label: "écart net", used: Math.abs(t.net), total: t.netMax },
      ];
    },

    traitState(build) {
      let coutAvantages = 0;
      let bonusDefauts = 0;
      for (const t of build.traits || []) {
        const ref = this.traitById(t.id);
        if (!ref) continue;
        const k = Number(t.karma) || ref.karma || 0;
        if (ref.type === "avantage") coutAvantages += k;
        else bonusDefauts += k;
      }
      return {
        coutAvantages,
        bonusDefauts,
        net: coutAvantages - bonusDefauts,
        nombre: (build.traits || []).length,
        max: this.TRAIT_MAX,
        netMax: this.TRAIT_KARMA_NET_MAX,
      };
    },

    cleanBuild(b) {
      return {
        ...b,
        knowledges: (b.knowledges || []).filter((k) => k && String(k.name || "").trim()),
        gear: (b.gear || []).filter((g) => g && String(g.name || "").trim()),
        contacts: (b.contacts || []).filter((c) => c && c.name && c.name.trim()),
        spells: (b.spells || []).filter((x) => String(x || "").trim()),
        complexForms: (b.complexForms || []).filter((x) => String(x || "").trim()),
        adeptPowers: (b.adeptPowers || []).filter((x) => String(x || "").trim()),
        traits: (b.traits || []).filter((t) => t && t.id),
      };
    },

    /* ============================================================
       VALIDATION (core p.66-69)
       ============================================================ */
    stepErrors(build) {
      const out = { concept: [], priorites: [], modules: [], attrs: [], skills: [], magie: [], gear: [], traits: [], contacts: [] };
      const method = this.methods[build.method];
      if (!method) {
        out.concept.push("Méthode de création inconnue.");
        return out;
      }
      if (method.wip) {
        out.concept.push(
          `${method.label} : le catalogue de modules n'est pas encore relevé au livre — méthode indisponible.`,
        );
      }

      if (method.family === "priority") {
        const letters = this.PRIORITY_COLUMNS.map((c) => build.priorities[c.key]);
        if (letters.some((l) => !this.priorityTable[l])) {
          out.priorites.push("Chaque colonne doit recevoir une lettre.");
        } else if (method.points) {
          const used = this.priorityPointsUsed(build);
          if (used > method.points) out.priorites.push(`Trop de points de priorité (${used}/${method.points}).`);
        } else {
          const seen = new Set();
          for (const l of letters) {
            if (seen.has(l)) {
              out.priorites.push(`La lettre ${l} est utilisée deux fois — chaque priorité ne sert qu'une fois.`);
              break;
            }
            seen.add(l);
          }
        }
        if (!this.metaRow(build.meta)) {
          out.concept.push(`${build.meta} n'a pas de ligne de priorité connue (Compagnon p.90).`);
        } else if (this.adjustFor(build.meta, build.priorities.meta) == null) {
          out.priorites.push(
            `${build.meta} n'est pas disponible en priorité ${build.priorities.meta} (Métatypes).`,
          );
        }
      } else if (method.family === "modules") {
        const cat = this.lifeModules.adult || [];
        if (!cat.length) {
          out.concept.push(
            "Catalogue des modules absent — sr6.lifemodules.js n'est pas chargé.",
          );
        }
        const slots = (build.lifeModules || []).filter((x) => x && x.id);
        const n = this.lifeModules.adultSlots;
        if (slots.length !== n) {
          out.modules.push(`Il faut exactement ${n} modules d'âge adulte (${slots.length} choisis) — ni plus, ni moins.`);
        }
        // « seul l'un d'entre eux peut être sélectionné deux fois » (p.31)
        const compte = {};
        for (const sl of slots) compte[sl.id] = (compte[sl.id] || 0) + 1;
        const repetes = Object.entries(compte).filter(([, c]) => c > 1);
        if (repetes.length > this.lifeModules.repeatableMax) {
          out.modules.push(
            `Un seul module peut être pris deux fois (${repetes.length} le sont : ${repetes.map(([id]) => this.lifeModuleById(id)?.nom || id).join(", ")}).`,
          );
        }
        for (const [id, c] of repetes) {
          if (c > 2) out.modules.push(`${this.lifeModuleById(id)?.nom || id} est pris ${c} fois — deux au maximum.`);
        }
        const imp = build.lifeImposed || {};
        const nCroiss = (imp.croissanceSkills || []).filter(Boolean).length;
        const croiss = this.lifeModules.imposed.find((i) => i.id === "croissance");
        if (nCroiss !== croiss.skillCount) {
          out.modules.push(`Croissance : ${croiss.skillCount} compétences à choisir (${nCroiss} choisies).`);
        }
        if (new Set((imp.croissanceSkills || []).filter(Boolean)).size !== nCroiss) {
          out.modules.push("Croissance : les quatre compétences doivent être distinctes.");
        }
        if (!imp.talent) out.modules.push("Majorité : le talent principal n'est pas choisi.");
        if (!imp.bestAttr) out.modules.push("Majorité : le meilleur attribut n'est pas choisi.");

        // Chaque option d'un module doit être TRANCHÉE. Sans ce contrôle, un
        // parcours complet mais sans choix passerait la validation et
        // produirait un personnage vide — le critère de succès étant une
        // absence d'erreur, un objet vide le satisfait aussi bien qu'un bon.
        for (const sl of slots) {
          const m = this.lifeModuleById(sl.id);
          if (!m) continue;
          const manque = [];
          (m.attrs || []).forEach((a, k) => {
            if (!(sl.attrs || [])[k]) manque.push(`attribut ${k + 1}`);
          });
          (m.skills || []).forEach((sk, k) => {
            if (!(sl.skills || [])[k]) manque.push(`compétence ${k + 1}`);
          });
          if (m.know && !sl.know) manque.push("connaissance");
          if (manque.length) {
            out.modules.push(`${m.nom} : choix à trancher (${manque.join(", ")}).`);
          }
        }

        // Une restriction de module doit être respectée par l'Éveil choisi.
        const ouverts = new Set(this.lifeModuleCatalog(build).map((m) => m.id));
        for (const sl of slots) {
          const m = this.lifeModuleById(sl.id);
          if (m && m.restriction && !ouverts.has(m.id)) {
            out.modules.push(`${m.nom} est réservé aux « ${m.restriction} ».`);
          }
        }
      } else if (method.family === "pc") {
        const used = this.pcUsed(build);
        if (used > method.pc) out.concept.push(`Points de création dépassés (${used}/${method.pc}).`);
        if (used < method.pc) {
          out.concept.push(`Les 100 PC doivent tous être dépensés (${used}/${method.pc}) — rien ne se conserve.`);
        }
        const p = this.pc;
        if (Math.floor((build.pcAdjust || 0) / p.adjustCost) > p.adjustMax) {
          out.concept.push(`Au plus ${p.adjustMax} points d'ajustement supplémentaires.`);
        }
        if (Math.floor((build.pcAttr || 0) / p.attrCost) > p.attrMax) {
          out.concept.push(`Au plus ${p.attrMax} points d'attributs supplémentaires.`);
        }
        if (Math.floor((build.pcSkill || 0) / p.skillCost) > p.skillMax) {
          out.concept.push(`Au plus ${p.skillMax} points de compétences supplémentaires.`);
        }
        if ((build.pcNuyen || 0) * p.nuyenPerPC > p.nuyenMax) {
          out.concept.push(`Plafond de ressources : ${p.nuyenMax.toLocaleString("fr-FR")} ¥.`);
        }
      }

      /* ---- Règles communes ---- */
      /* ⚠ Une réserve non dépensée est PERDUE, et rien ne le disait : en
         priorités comme en 10 points, on pouvait finir avec 20 des 24 points
         d'attribut et 22 des 24 de compétence en réserve, validation propre.
         La méthode par points le refusait déjà — « rien ne se conserve » —
         et SR5 comme Anarchy 1 refusaient l'équivalent : même situation,
         quatre comportements. La méthode à MODULES est la seule exempte, et
         c'est normal : elle ne distribue aucune réserve, ce sont les modules
         qui accordent tout. */
      const reserves = method.family !== "modules";
      const aUsed = this.attrPointsUsed(build);
      const aTotal = this.attrPointsTotal(build);
      if (aUsed > aTotal) out.attrs.push(`Trop de points d'attributs (${aUsed}/${aTotal}).`);
      if (reserves && aUsed < aTotal) {
        out.attrs.push(`Tous les points d'attribut doivent être dépensés (${aUsed}/${aTotal}) — rien ne se conserve.`);
      }
      const adjUsed = this.adjustPointsUsed(build);
      const adjTotal = this.adjustPointsTotal(build);
      if (adjUsed > adjTotal) out.attrs.push(`Trop de points d'ajustement (${adjUsed}/${adjTotal}).`);
      if (reserves && adjUsed < adjTotal) {
        out.attrs.push(`Tous les points d'ajustement doivent être dépensés (${adjUsed}/${adjTotal}) — rien ne se conserve.`);
      }

      for (const k of this.ATTRS) {
        const [min, max] = this._range(build.meta, k);
        const val = (build.attrs || {})[k];
        if (val != null && (val < min || val > max)) {
          out.attrs.push(`${k} doit être compris entre ${min} et ${max} pour un ${build.meta}.`);
        }
      }
      const atMax = this.ATTRS.filter(
        (k) => ((build.attrs || {})[k] ?? 1) >= this._range(build.meta, k)[1],
      ).length;
      if (atMax > 1) {
        out.attrs.push(
          `Un seul attribut peut atteindre le rang maximum du métatype à la création (${atMax} le sont).`,
        );
      }

      const sUsed = this.skillPointsUsed(build);
      const sTotal = this.skillPointsTotal(build);
      if (sUsed > sTotal) out.skills.push(`Trop de points de compétences (${sUsed}/${sTotal}).`);
      if (reserves && sUsed < sTotal) {
        out.skills.push(`Tous les points de compétence doivent être dépensés (${sUsed}/${sTotal}) — rien ne se conserve.`);
      }
      let atSkillCap = 0;
      for (const s of build.skills || []) {
        if ((s.val || 0) > this.SKILL_CAP) {
          out.skills.push(`${s.name} dépasse le rang maximum à la création (${this.SKILL_CAP}, 7 avec Aptitude).`);
        }
        if ((s.val || 0) >= this.SKILL_CAP) atSkillCap++;
        // Une seule spé par compétence, sauf armes exotiques (Compagnon p.29).
        if ((s.specs || []).length > 1 && s.name !== "Armes exotiques") {
          out.skills.push(`${s.name} : une seule spécialisation par compétence à la création.`);
        }
      }
      if (atSkillCap > 1) {
        out.skills.push(
          `Une seule compétence peut atteindre le rang maximum (${atSkillCap} y sont).`,
        );
      }

      const nUsed = this.nuyenUsed(build);
      const nTotal = this.nuyenTotal(build);
      if (nUsed > nTotal) {
        out.gear.push(
          `Ressources dépassées : ${nUsed.toLocaleString("fr-FR")} / ${nTotal.toLocaleString("fr-FR")} ¥.`,
        );
      }
      for (const g of build.gear || []) {
        if (g.availability != null && g.availability !== "" && Number(g.availability) >= this.ILLEGAL_AVAILABILITY_CAP) {
          out.gear.push(
            `${g.name} : Disponibilité ${g.availability} — l'illégal de ${this.ILLEGAL_AVAILABILITY_CAP} ou plus est interdit à la création.`,
          );
        }
      }

      const cUsed = this.contactPointsUsed(build);
      const cTotal = this.contactPointsTotal(build);
      if (cUsed > cTotal) out.contacts.push(`Contacts : ${cUsed} / ${cTotal} points (Charisme × ${this.CONTACT_MULT}).`);
      const cha = (build.attrs || {}).CHA ?? 1;
      for (const c of build.contacts || []) {
        if (Number(c.network) > cha || Number(c.loyalty) > cha) {
          out.contacts.push(`${c.name || "Contact"} : aucun indice ne peut dépasser le Charisme (${cha}).`);
        }
      }
      /* Magie : refuser le DÉPASSEMENT du quota de la colonne. Un quota non
         épuisé n'est pas signalé — je n'ai pas vérifié au livre que les
         formules non prises sont perdues, et inventer la règle serait pire
         que se taire. */
      const tr = this.traitState(build);
      if (tr.nombre > tr.max) {
        out.traits.push(`Au plus ${tr.max} traits à la création (${tr.nombre}) — p.69.`);
      }
      if (Math.abs(tr.net) > tr.netMax) {
        out.traits.push(`L'écart entre traits positifs et négatifs ne dépasse pas ${tr.netMax} karma (${tr.net}).`);
      }

      const magie = this.magicStep(build);
      for (const g of magie ? magie.groups : []) {
        if (g.total != null && g.used > g.total) {
          out.magie.push(`${g.label} : ${g.used} choisi(s) pour ${g.total} accordé(s).`);
        }
      }
      if (method.family === "priority") {
        const rowM = this.priorityTable[build.priorities.magic];
        if (rowM && rowM.magic.length && !this.magicProfile(build)) {
          out.priorites.push(
            `La colonne Magie ${build.priorities.magic} ouvre ${rowM.magic.length} option(s) : il faut en choisir une, ou prendre une lettre sans magie.`,
          );
        }
      }
      return out;
    },

    validate(build) {
      const steps = this.stepErrors(build);
      const errors = [];
      for (const k of Object.keys(steps)) errors.push(...steps[k]);
      return errors;
    },

    /* ============================================================
       CONSTRUCTION DU PERSONNAGE
       ============================================================ */
    buildCharacter(build) {
      const parModules = this.methods[build.method]?.family === "modules";
      const grants = parModules ? this.lifeModuleGrants(build) : null;

      const attrs = {};
      if (parModules) {
        // Le parcours EST le personnage : attributs et compétences viennent
        // des modules, pas d'une réserve de points.
        for (const k of this.ATTRS) {
          attrs[k] = Math.min(grants.attrs[k] ?? 1, this._range(build.meta, k)[1]);
        }
        attrs.ATO = Math.min(grants.attrs.ATO ?? 1, this._range(build.meta, "ATO")[1]);
        if (grants.attrs.MAG) attrs.MAG = Math.min(grants.attrs.MAG, 6);
        if (grants.attrs.RES) attrs.RES = Math.min(grants.attrs.RES, 6);
      } else {
        for (const k of this.ATTRS) attrs[k] = (build.attrs || {})[k] ?? 1;
        const sp = build.special || {};
        attrs.ATO = sp.ATO ?? 1;
        if (sp.MAG) attrs.MAG = sp.MAG;
        if (sp.RES) attrs.RES = sp.RES;
      }
      attrs.ESS = 6;

      const listeSkills = parModules
        ? Object.entries(grants.skills).map(([name, val]) => ({
            name,
            val: Math.min(val, this.SKILL_CAP),
            attr: (this.SKILLS.find((x) => x.name === name) || {}).attr || "LOG",
            specs: [],
          }))
        : build.skills || [];

      const skills = listeSkills.map((s) => {
        const specs = s.specs || [];
        const primary = specs[0];
        const attr = s.attr || "LOG";
        return {
          name: s.name,
          val: s.val || 0,
          attr,
          spec: primary || undefined,
          specVal: primary ? (s.val || 0) + 2 : undefined,
          specAttr: primary ? attr : undefined,
        };
      });

      // Moniteur d'état : SR6 en a UN SEUL par défaut (`me` = 8 + CON/2), et
      // deux (physMon/stunMon) si la table a activé `separateMonitors`. On lit
      // le MÊME réglage que `EditionSR6.generate` — deux consommateurs d'un
      // même fait doivent lire la même expression, sinon la fiche d'un PJ
      // contredit celle d'un PNJ créé le même jour.
      const separate = Settings.get("separateMonitors", false);
      const me = separate ? null : 8 + Math.ceil(attrs.CON / 2);
      const physMon = separate ? 8 + Math.ceil(attrs.CON / 2) : null;
      const stunMon = separate ? 8 + Math.ceil(attrs.VOL / 2) : null;
      const perceptionSkill = (build.skills || []).find((s) => s.name === "Perception");

      return {
        id: Utils.uid(),
        edition: "sr6",
        isPC: true,
        name: build.name && build.name.trim() ? build.name.trim() : Utils.genName(),
        meta: build.meta,
        gender: build.gender || "NB",
        tier: "Runner",
        // Le concept du joueur, pas le libellé de la méthode : celui-ci vit
        // déjà dans `creationMethod`, et l'afficher en archétype donnait des
        // fiches disant « Elfe · Système de priorités ».
        archetype: (build.concept || "").trim() || "Personnage",
        creationMethod: build.method,
        priorities: { ...build.priorities },
        attrs,
        skills,
        /* ⚠ Objets `{name, val}` : `_knowledgesSection` de la fiche lit
           `k.name` et `k.val`. Les aplatir en chaînes affichait un tag
           « NaN » sans nom — mesuré en SR5, même cause ici. */
        knowledges: (parModules ? grants.know : build.knowledges || []).map((k) =>
          typeof k === "string" ? { name: k, val: 1 } : { name: k.name, val: k.val ?? 1 },
        ),
        spells: build.spells || [],
        complexForms: build.complexForms || [],
        /* ⚠ Le champ canonique de l'application est `powers` : la fiche,
           l'impression et la modale d'édition le lisent tous. Émettre
           `adeptPowers` créait un champ FANTÔME que personne ne relit — les
           pouvoirs choisis à la création n'apparaissaient nulle part. Même
           motif que `pnj.contacts` en septembre. Le brouillon garde
           `adeptPowers` ; c'est la SORTIE qui doit parler la langue de l'app. */
        powers: build.adeptPowers || [],
        traits: (build.traits || []).map((t) => {
          const ref = this.traitById(t.id);
          return ref ? `${ref.nom} (${t.karma ?? ref.karma})` : t.id;
        }),
        equip: (build.gear || []).map((g) => g.name),
        awakened: build.awakened || null,
        // Lue par la fiche (section Tradition) et par les règles de Drain.
        tradition: build.tradition || null,
        /* Style de vie « sans SIN » : la fiche et le kit savent déjà l'afficher
           et le rattacher à une identité plus tard. */
        orphanLifestyles: build.lifestyle
          ? [{ name: (this.lifestyleById(build.lifestyle) || {}).nom, city: "" }]
          : [],
        threatLevel: "forte",
        me,
        physMon,
        stunMon,
        meFilled: 0,
        physFilled: 0,
        stunFilled: 0,
        // Bloc « mécanique de table » du PJ SR6 (cf. pcTableBlock).
        initBase: attrs.RÉA + attrs.INT,
        initDice: 1,
        defense: attrs.RÉA + attrs.INT,
        perception: (perceptionSkill?.val || 0) + attrs.INT,
        volonte: attrs.VOL,
        contacts: build.contacts || [],
        notes: build.notes || "",
      };
    },
  },
});
