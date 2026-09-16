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
import { VehiculeModsSR6 } from "./sr6.vehiculemods.js";
import { AccessoiresSR6 } from "./sr6.accessoires.js";
import { ArmureModsSR6, ArmuresSR6 } from "./sr6.armuremods.js";
import { Content } from "../rules/content.js";
import { Mounts } from "../rules/mounts.js";
import { ModRefs } from "../rules/modrefs.js";
import { Magic } from "../rules/magic.js";
import { EditionSR6 } from "./sr6.js";
import { TraitsSR6 } from "./sr6.traits.js";
import { Metavariants } from "../rules/metavariants.js";
import { BonusEngine } from "../rules/bonusengine.js";
import { Implants } from "../rules/implants.js";
import { SkillCatalog } from "../rules/skillcatalog.js";
import { PrixCatalogue } from "../rules/prixcatalogue.js";
import { ArmesSR6 } from "./sr6.armes.js";
import { ImplantsSR6 } from "./sr6.implants.js";
import { Vehicles } from "../catalogs/vehicles.js";
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
    /** « Tout point de Karma non dépensé à la fin de la création de
        personnage est perdu » (livre de base, quatrième étape) : rien ne se
        garde, contrairement aux 7 de SR5. */
    KARMA_CARRYOVER: 0,
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

    /** Les 19 compétences officielles (core p.66), lues dans le catalogue
        partagé — une seule liste depuis 1.213.0 (`SkillCatalog.sr6` portait
        quatre compétences de SR5 et en omettait trois ; la création portait
        la sienne). Anarchy 2 garde la sienne pour d'autres raisons. */
    get SKILLS() {
      return Object.entries(SkillCatalog.sr6).map(([name, attr]) => ({ name, attr }));
    },

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
      /* Quatrième étape du livre : les 50 karma de personnalisation
         s'ajoutent au solde des traits, montent attributs et compétences aux
         coûts de progression, ou deviennent des nuyens (2 000 ¥ le point,
         5 000 avec Endetté). « Quelle que soit la méthode » : l'étape vaut
         pour les trois familles, comme le coût du métatype. Elle précède
         l'Équipement, puisque c'est là que l'argent converti se dépense. */
      out.push({ id: "finition", kind: "finish_karma", label: "Karma" });
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
        /** Points d'ajustement posés sur un attribut spécial de métatype
            (« Points d'ajustement : Constitution (2) » sur la fiche du
            samouraï troll du livre) : `{ CON: 2 }`. */
        adjust: {},
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
        /** Achats faits sur le karma de personnalisation : `{kind, name, cost}`. */
        karmaBuys: [],
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
    /** Vrai si une table de bornes CONNAÎT ce métatype (livre de base, ou
        Compagnon via `Metavariants`) — le fait que le garde-fou mesure. */
    _metaKnown(meta) {
      return !!EditionSR6.attrRange[meta] || !!Metavariants.use("sr6").resolve(meta)?.ranges;
    },

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
    /* ⚠ En création par points, le total est BORNÉ au plafond de la règle
       (attrMax, adjustMax, skillMax) : 96 PC en attributs annonçaient 52
       points quand le livre en autorise 20, et l'erreur n'arrivait qu'à la
       révision. Les nuyens l'étaient déjà ; même classe de plafond, même
       traitement. `stepErrors` continue de refuser l'excédent de PC. */
    attrPointsTotal(build) {
      if (this.methods[build.method]?.family === "pc") {
        return this.pc.attrFree + Math.min(this.pc.attrMax, Math.floor((build.pcAttr || 0) / this.pc.attrCost));
      }
      return this.priorityTable[build.priorities.attrs]?.attrs || 0;
    },
    adjustPointsTotal(build) {
      if (this.methods[build.method]?.family === "pc") {
        return this.pc.adjustFree + Math.min(this.pc.adjustMax, Math.floor((build.pcAdjust || 0) / this.pc.adjustCost));
      }
      return this.adjustFor(build.meta, build.priorities.meta) || 0;
    },
    skillPointsTotal(build) {
      if (this.methods[build.method]?.family === "pc") {
        return this.pc.skillFree + Math.min(this.pc.skillMax, Math.floor((build.pcSkill || 0) / this.pc.skillCost));
      }
      return this.priorityTable[build.priorities.skills]?.skills || 0;
    },
    /** Ressources de la colonne (ou des PC), PLUS le karma converti : « vous
        devriez avoir un petit pactole de nuyens obtenus grâce au choix de
        Ressources et au Karma dépensé » (cinquième étape). */
    nuyenTotal(build) {
      return this.nuyenBase(build) + this.finishingKarma(build).nuyen;
    },
    nuyenBase(build) {
      const fam = this.methods[build.method]?.family;
      if (fam === "pc") return Math.min(this.pc.nuyenMax, (build.pcNuyen || 0) * this.pc.nuyenPerPC);
      if (fam === "modules") return this.lifeModuleGrants(build).nuyen || 0;
      return this.priorityTable[build.priorities.nuyen]?.nuyen || 0;
    },

    /* ============================================================
       KARMA DE PERSONNALISATION (livre de base, quatrième étape ;
       coûts de progression p.70)
       « Chaque personnage reçoit 50 points de Karma, ajoutés au solde de
       karma issu des traits […] dépensés pour augmenter les compétences et
       les attributs mais aussi pour obtenir plus d'argent […] au taux de
       2 000 nuyens par point de Karma ou de 5 000 avec le trait Endetté.
       Tout point de Karma non dépensé […] est perdu. »
       Même moteur qu'en SR5 (`karmaBuys`, achats défaits dans l'ordre
       inverse), autres constantes : rien ne se garde, pas de plafond de
       conversion, un taux qui dépend d'un trait.
       ============================================================ */
    karmaBought(build) {
      const out = { attrs: {}, skills: {}, nuyen: 0 };
      for (const a of build.karmaBuys || []) {
        if (a.kind === "attr") out.attrs[a.name] = (out.attrs[a.name] || 0) + 1;
        else if (a.kind === "skill") out.skills[a.name] = (out.skills[a.name] || 0) + 1;
        else if (a.kind === "nuyen") out.nuyen += a.cost || 0;
      }
      return out;
    },

    /** Connaissances et langues : « un nombre égal à leur Logique (après une
        éventuelle amélioration avec du Karma de personnalisation) plus une
        Langue maternelle gratuite » (Finalisation). Au-delà, une Connaissance
        coûte 3 karma (Progression, p.70), pris sur cette même bourse. */
    knowledgeState(build) {
      const log = (build.attrs || {}).LOG ?? 1;
      const free = log + 1;
      const count = (build.knowledges || []).filter((k) => k && String(k.name || k).trim()).length;
      const extra = Math.max(0, count - free);
      return { free, count, extra, karma: extra * this.karmaCosts.knowledge, log };
    },

    /** ¥ par point de karma converti : 5 000 avec le trait Endetté. */
    karmaRate(build) {
      const endette = (build.traits || []).some((t) => t.id === "endette");
      return endette ? this.KARMA_TO_NUYEN_ENDETTE : this.KARMA_TO_NUYEN;
    },

    finishingKarma(build) {
      const total = this.KARMA;
      const k = this.metaKarma(build);
      const used =
        (build.karmaBuys || []).reduce((n, a) => n + (a.cost || 0), 0) +
        this.traitState(build).net +
        (typeof k === "number" ? k : 0) +
        this.knowledgeState(build).karma;
      const nuyenKarma = this.karmaBought(build).nuyen;
      const rate = this.karmaRate(build);
      return {
        total,
        used,
        left: total - used,
        carryoverMax: this.KARMA_CARRYOVER,
        nuyenKarma,
        nuyenKarmaMax: null, // aucun plafond au livre
        rate,
        nuyen: nuyenKarma * rate,
      };
    },

    /** Ce que le karma peut monter, avec l'état de chaque cible : les huit
        attributs, l'Atout, la Magie ou la Résonance quand le profil en a,
        puis les compétences prises. L'écran ne connaît pas ces listes. */
    karmaTargets(build) {
      /* En méthode à modules, attributs et compétences sont ceux du parcours
         (`lifeModuleGrants`), pas de `build.attrs` : un achat ici n'aurait
         rien à monter. Le karma y sert aux nuyens ; on le dit. */
      if (this.methods[build.method]?.family === "modules") {
        return { attrs: [], skills: [], notes: ["En méthode à modules, attributs et compétences viennent du parcours : ce karma se convertit en nuyens."] };
      }
      const prof = this.magicProfile(build);
      const special = ["ATO"];
      if (prof && prof.key === "technomancien") special.push("RES");
      else if (prof) special.push("MAG");
      const attrs = [...this.ATTRS.map((k) => ({ key: k, path: "attrs" })), ...special.map((k) => ({ key: k, path: "special" }))].map(({ key, path }) => {
        const [min, max] = this.attrRangeFor(build, key);
        const cur = (build[path] || {})[key] ?? min;
        return { kind: "attr", name: key, courant: cur, plafond: max };
      });
      const skills = (build.skills || []).map((s) => ({ kind: "skill", name: s.name, courant: s.val || 0, plafond: this.SKILL_CAP }));
      const ks = this.knowledgeState(build);
      return {
        attrs,
        skills,
        notes: [
          "Les traits se prennent à l'étape Traits : leur solde pèse déjà sur cette bourse.",
          ks.extra ? `Connaissances : ${ks.extra} au-delà des ${ks.free} gratuites (Logique + langue maternelle), ${ks.karma} karma comptés ici.` : `Connaissances : ${ks.free} gratuites (Logique + langue maternelle), puis ${this.karmaCosts.knowledge} karma chacune, comptées ici.`,
          "Les contacts se paient en points de contacts (Charisme × 6), pas en karma.",
        ],
      };
    },

    karmaBuyCost(build, kind, name) {
      const kc = this.karmaCosts;
      if (kind === "attr") {
        const [min, max] = this.attrRangeFor(build, name);
        const cur = this.SPECIAL_ATTRS.includes(name) ? (build.special || {})[name] ?? min : (build.attrs || {})[name] ?? min;
        return cur >= max ? null : (cur + 1) * kc.attrMult;
      }
      if (kind === "skill") {
        const row = (build.skills || []).find((x) => x.name === name);
        const cur = row ? row.val || 0 : 0;
        return cur >= this.SKILL_CAP ? null : (cur + 1) * kc.skillMult;
      }
      if (kind === "nuyen") return 1;
      return null;
    },

    applyKarmaBuy(build, kind, name) {
      const cost = this.karmaBuyCost(build, kind, name);
      if (cost == null) return build;
      if (cost > this.finishingKarma(build).left) return build;
      build.karmaBuys = build.karmaBuys || [];
      if (kind === "attr") {
        const [min] = this.attrRangeFor(build, name);
        const cible = this.SPECIAL_ATTRS.includes(name) ? (build.special = build.special || {}) : (build.attrs = build.attrs || {});
        cible[name] = (cible[name] ?? min) + 1;
      } else if (kind === "skill") {
        build.skills = build.skills || [];
        const row = build.skills.find((x) => x.name === name);
        if (row) row.val = (row.val || 0) + 1;
        else build.skills.push({ name, val: 1, attr: (this.SKILLS.find((x) => x.name === name) || {}).attr || "LOG", specs: [] });
      }
      build.karmaBuys.push({ kind, name, cost });
      return build;
    },

    /** Défait le DERNIER achat sur cette cible : le remboursement est le prix payé. */
    undoKarmaBuy(build, kind, name) {
      const liste = build.karmaBuys || [];
      for (let i = liste.length - 1; i >= 0; i--) {
        const a = liste[i];
        if (a.kind !== kind || a.name !== name) continue;
        if (kind === "attr") {
          const cible = this.SPECIAL_ATTRS.includes(name) ? build.special : build.attrs;
          if (cible && cible[name] != null) cible[name] -= 1;
        } else if (kind === "skill") {
          const row = (build.skills || []).find((x) => x.name === name);
          if (row) row.val = Math.max(0, (row.val || 0) - 1);
        }
        liste.splice(i, 1);
        return build;
      }
      return build;
    },

    /* ---- Dépenses ---- */
    /** ⚠ Depuis 1, un pour un (p.66) — pas depuis l'indice du métatype
        comme en SR5, ni depuis 0 comme en Anarchy 2. */
    /* ⚠ Un rang acheté au karma NE consomme PAS les points de la colonne :
       chaque compte retranche ce que `karmaBought` a payé — sinon monter un
       attribut au karma ferait « Trop de points d'attributs ». Même parti
       qu'en SR5. */
    /** Points d'ajustement POSÉS sur un attribut spécial de métatype, bornés
        par les rangs réellement achetés (hors karma). « Les points
        d'ajustement sont utilisés pour modifier la Magie/Résonance, acheter
        de l'Atout et augmenter les attributs spéciaux de métatype » (p.66) —
        un rang de Constitution de troll se paie d'un point d'attribut OU
        d'un point d'ajustement, au choix du joueur, pas des deux.
        L'ancien compte facturait les rangs au-delà de 6 deux fois. */
    adjustOn(build, key) {
      if (!this._isMetaSpecial(build.meta, key)) return 0;
      const achete = this.karmaBought(build).attrs[key] || 0;
      const rangs = Math.max(0, ((build.attrs || {})[key] ?? 1) - 1 - achete);
      return Math.max(0, Math.min(Number((build.adjust || {})[key]) || 0, rangs));
    },
    /** Bornes d'ajustement possibles sur cet attribut : 0 à (rangs achetés). */
    adjustRangeFor(build, key) {
      if (!this._isMetaSpecial(build.meta, key)) return [0, 0];
      const achete = this.karmaBought(build).attrs[key] || 0;
      return [0, Math.max(0, ((build.attrs || {})[key] ?? 1) - 1 - achete)];
    },

    attrPointsUsed(build) {
      const achete = this.karmaBought(build).attrs;
      return this.ATTRS.reduce((sum, k) => sum + Math.max(0, ((build.attrs || {})[k] ?? 1) - 1 - (achete[k] || 0) - this.adjustOn(build, k)), 0);
    },

    /** Points d'ajustement : Atout au-dessus de 1, Magie/Résonance, et ce
        que le joueur a posé sur ses attributs spéciaux de métatype. */
    adjustPointsUsed(build) {
      const sp = build.special || {};
      const achete = this.karmaBought(build).attrs;
      let sum =
        Math.max(0, (sp.ATO ?? 1) - 1 - (achete.ATO || 0)) +
        Math.max(0, (sp.MAG || 0) - (achete.MAG || 0)) +
        Math.max(0, (sp.RES || 0) - (achete.RES || 0));
      for (const k of this.ATTRS) sum += this.adjustOn(build, k);
      return sum;
    },

    /** Un point = un rang, ou une spécialisation (p.66). */
    skillPointsUsed(build) {
      const achete = this.karmaBought(build).skills;
      return (build.skills || []).reduce(
        (sum, s) => sum + Math.max(0, (s.val || 0) - (achete[s.name] || 0)) + (s.specs || []).length,
        0,
      );
    },

    nuyenUsed(build) {
      // ⚠ Le premier mois de style de vie est payé d'avance : il fait
      // partie des ressources dépensées, pas d'un budget à côté. Un implant
      // se paie à sa gamme (prix standard × multiplicateur).
      return (
        this.lifestyleCost(build) +
        this.accessoryCost(build) +
        (build.gear || []).reduce((sum, g) => sum + (this.isImplant(g) ? this.implantState(g, build).cost : Number(g.cost) || 0), 0)
      );
    },

    /* ---- Gammes d'implants (Livre de base p.283 — aucune restriction de gamme à la création, seule la Disponibilité borne) ----
       Cinq gammes, trois multiplicateurs ; le moteur neutre `Implants`
       applique la table. Un objet d'équipement d'une catégorie
       d'augmentation porte `grade` (« standard » par défaut) ; prix et
       Disponibilité se saisissent au tarif standard, l'écran montre l'effet. */
    IMPLANT_GRADES: {
      occasion: { label: "D'occasion", essence: 1.1, cout: 0.5, dispo: -1 },
      standard: { label: "Standard", essence: 1, cout: 1, dispo: 0 },
      alphaware: { label: "Alphaware", essence: 0.8, cout: 1.2, dispo: 1 },
      betaware: { label: "Betaware", essence: 0.7, cout: 1.5, dispo: 2 },
      deltaware: { label: "Deltaware", essence: 0.5, cout: 2.5, dispo: 3 },
    },
    /** Les gammes qu'on peut prendre à la création. */
    IMPLANT_GRADES_AT_CREATION: ["occasion", "standard", "alphaware", "betaware", "deltaware"],
    ESSENCE_MAX: 6,

    /** La table du livre pour cet implant (nom ou alias du catalogue), et
        ce qu'elle lui donne au tarif standard : Essence, prix, Disponibilité.
        Une formule (« Indice × 0,3 ») se résout avec l'indice porté par le
        nom (« Armure dermique 3 ») ; sans indice, elle reste inconnue. */
    _implantIdx: null,
    /** Le prix et la Disponibilité qu'une ARME ou une ARMURE du catalogue a au
        livre (Livre de base, suppléments) — `{cost, costNote, availability,
        dispoText, ref}`, ou null quand aucune table ne connaît ce nom. Le
        prix en formule (« Indice × 100 ¥ ») reste en note : à saisir, pas 0.
        Les implants ont leur propre table (implantDefaults). */
    /* Les libellés du catalogue de l'app pour des objets que les tables du livre
       nomment autrement — coquilles comprises (« Silvergun »), qu'on ne réécrit
       pas : les fiches sauvegardées les portent. */
    PRIX_ALIAS: {
      "Ares Viper Silvergun": "Ares Viper Slivergun",
      "Colt Government 2076": "Colt Government 2076/Manhunter",
      "Colt Manhunter": "Colt Government 2076/Manhunter",
      "HK P50": "HK P50 Tactical",
      "Arc rEVOlution Iron Hawk (Indice 6)": "Arc à poulies Iron Hawk",
      "Arme d'hast": "Armes d’hast",
      "Couteau de combat": "Couteau de combat/survie",
      "Couteau de survie": "Couteau de combat/survie",
      "Couteaux de lancer (2)": "Couteau de lancer",
      "Glaive Xiphos": "Gladius Xiphos",
      "rEVOlution Hell Turtle": "Hell Turtle",
      "Tronçonneuse monofilament": "Tronçonneuse monofilament Ash Arms",
      "Manteaux Mortimer of London": "Mortimer of London — Manteau",
      "Système d'équipement modulaire (SEM)": "Système d’équipement modulaire (Harnais)",
      "Tenues de service standard (TSS)": "Tenue de service standard",
    },

    gearDefaults(name) {
      if (!this._prixIdx) {
        // le livre de base précède le supplément ; les armures ont leur table
        this._prixIdx = { armes: PrixCatalogue.index(ArmesSR6), armures: PrixCatalogue.index(ArmuresSR6) };
      }
      const nom = this.PRIX_ALIAS[name] || name;
      const ref = PrixCatalogue.find(this._prixIdx.armes, nom) || PrixCatalogue.find(this._prixIdx.armures, nom);
      return PrixCatalogue.defaults(ref);
    },

    implantDefaults(name, rating) {
      if (!this._implantIdx) this._implantIdx = Implants.index(ImplantsSR6);
      return Implants.defaults(this._implantIdx, name, rating);
    },
    /** L'objet tel que le moteur le lit : l'Essence standard saisie, sinon
        celle de la table (résolue avec l'indice de l'objet), sinon la ligne.
        LOGÉ dans un hôte (cybermembre, cyberœil, oreille cybernétique), un
        implant « consomme de la Capacité plutôt que de l'Essence » : son
        Essence est 0. */
    _implantView(gear, build) {
      if (gear.hote && build && this.implantHostOf(build, gear)) return { ...gear, essenceBase: 0 };
      if (gear.essenceBase != null && gear.essenceBase !== "") return gear;
      const d = this.implantDefaults(gear.name, gear.rating);
      return d && d.essenceBase != null ? { ...gear, essenceBase: d.essenceBase } : gear;
    },

    /* ---- Capacité des hôtes ----
       « Les cybermembres peuvent contenir des implants qui ont un coût en
       capacité (améliorations visuelles et auditives comprises) » ; les
       cyberyeux et oreilles cybernétiques offrent « un indice de Capacité
       pour les améliorations ». Un objet du brouillon porte `uid` ; un
       implant logé porte `hote` = uid de son hôte. */

    /* ---- Attributs propres des cybermembres (Livre de base p.291) ----
       Un membre (hors crâne et torse) a sa Force et son Agilité : base
       2, plus les améliorations LOGÉES dans ce membre (« Augmentation d'attribut », qui ne coûte pas de capacité tant que l'attribut du membre ne dépasse pas l'indice naturel, puis 2 points par point au-delà ; « Augmentation d'armure »).
       Quand un membre agit seul, ses attributs comptent ; à plusieurs, la
       moyenne ; en coordination fine, le plus faible — ce partage-là reste
       au meneur, la fiche porte les valeurs. */
    CYBERLIMB: { base: 2, personnalisation: null },
    /* « Un attribut modifié ne peut jamais être supérieur à son maximum
       augmenté, soit son rang d'attribut actuel +4 » (p.42) ; pour les
       membres : « L'augmentation maximale de 4 points doit être respectée,
       aussi n'achetez pas une augmentation d'attribut qui vous ferait
       franchir cette limite » (p.291) — Force, Agilité et Armure. */
    AUGMENT_MAX: 4,

    isCyberlimb(gear) {
      const d = this.isImplant(gear) ? this.implantDefaults(gear.name, gear.rating) : null;
      // ⚠ « Accessoires pour membres cybernétiques » contient aussi le mot :
      // une Augmentation d'attribut passait pour un membre (ligne « Membre
      // FOR 2 AGI 2 » sous l'accessoire, et un choix de plus dans 🦾). Un
      // membre, c'est une ligne d'une table de membres qui OFFRE de la
      // capacité — Livre de base ou Corps à la carte (« Bras cybernétique
      // supplémentaire », « Jambe digitigrade ») ; un Bras simien « [3] » la
      // consomme : c'est un accessoire.
      if (!d || !d.ref || !/membres? cybern/i.test(d.ref.categorie || "") || /accessoires/i.test(d.ref.categorie || "")) return false;
      if (d.ref.capaciteNote !== "offerte") return false;
      return !/cr[aâ]ne|torse/i.test(`${d.ref.groupe || ""} ${d.ref.nom || ""}`);
    },

    /** Force, Agilité et Armure d'un membre : base, personnalisation
        (SR5), améliorations logées ; et ce que la personnalisation coûte. */
    cyberlimbAttrs(build, gear) {
      const L = this.CYBERLIMB;
      const membre = gear.membre || {};
      const perso = { FOR: 0, AGI: 0 };
      if (L.personnalisation) {
        for (const k of ["FOR", "AGI"]) {
          const max = this.attrRangeFor(build, k)[1];
          const v = Number(membre[k]);
          perso[k] = Number.isFinite(v) ? Math.max(0, Math.min(v, max) - L.base) : 0;
        }
      }
      const amel = { FOR: 0, AGI: 0, armure: 0, doublons: [] };
      const vus = new Set();
      for (const g of build.gear || []) {
        if (g.hote !== gear.uid) continue;
        const d = this.implantDefaults(g.name, g.rating);
        if (!d || !d.ref) continue;
        const k = Implants.normName(d.ref.nom);
        const n = Number(g.rating) || 0;
        let cible = null;
        if (/^force$/.test(k)) cible = "FOR";
        else if (/^agilite$/.test(k)) cible = "AGI";
        else if (/^armure$|augmentation d armure/.test(k)) cible = "armure";
        else if (/augmentation d attribut/.test(k)) cible = g.attribut === "AGI" ? "AGI" : "FOR";
        if (!cible) continue;
        if (vus.has(cible)) amel.doublons.push(g.name);
        vus.add(cible);
        amel[cible] += n;
      }
      const points = perso.FOR + perso.AGI;
      return {
        base: L.base,
        perso,
        ameliorations: amel,
        FOR: L.base + perso.FOR + amel.FOR,
        AGI: L.base + perso.AGI + amel.AGI,
        armure: amel.armure,
        persoPoints: points,
        persoCout: L.personnalisation ? points * L.personnalisation.cout : 0,
        persoDispo: L.personnalisation ? points * L.personnalisation.dispo : 0,
      };
    },

    /** Les cybermembres du brouillon avec leurs attributs — pour la fiche. */
    cyberlimbs(build) {
      return (build.gear || []).filter((g) => this.isCyberlimb(g)).map((g) => ({ uid: g.uid, nom: g.name, ...this.cyberlimbAttrs(build, g) }));
    },

    implantCapacity(gear, build) {
      const d = this.implantDefaults(gear.name, gear.rating);
      let consommee = d ? d.capaciteConsommee : null;
      /* « Les augmentations d'attribut ne coûtent pas de capacité tant que
         l'attribut du membre ne dépasse pas l'indice naturel […] Chaque
         point d'indice au-delà de l'attribut naturel coûte 2 points de
         capacité. » (p.291) */
      if (d && d.ref && /augmentation d attribut/.test(Implants.normName(d.ref.nom))) {
        const k = gear.attribut === "AGI" ? "AGI" : "FOR";
        const naturel = build ? ((build.attrs || {})[k] ?? 1) : 1;
        const membre = this.CYBERLIMB.base + (Number(gear.rating) || 0);
        consommee = 2 * Math.max(0, membre - naturel);
      }
      return {
        offerte: d ? d.capaciteOfferte : null,
        consommee,
        doitEtreLoge: !!(d && d.doitEtreLoge),
      };
    },
    /** Les hôtes du brouillon, avec leur capacité offerte, prise, libre. */
    implantHosts(build) {
      const hotes = [];
      for (const g of build.gear || []) {
        if (!this.isImplant(g)) continue;
        const cap = this.implantCapacity(g);
        if (cap.offerte == null) continue;
        hotes.push({ uid: g.uid, name: g.name, total: cap.offerte, utilises: 0, pris: [] });
      }
      for (const g of build.gear || []) {
        if (!g.hote) continue;
        const h = hotes.find((x) => x.uid === g.hote);
        if (!h) continue;
        const c = this.implantCapacity(g, build).consommee;
        h.utilises += c || 0;
        h.pris.push(g.name);
      }
      for (const h of hotes) h.libre = h.total - h.utilises;
      return hotes;
    },
    implantHostOf(build, gear) {
      return gear.hote ? this.implantHosts(build).find((h) => h.uid === gear.hote) || null : null;
    },
    /** Toutes les entrées de la table, pour le catalogue et les tests. */
    implantTable() {
      return ImplantsSR6;
    },

    isImplant(gear) {
      return !!(gear && gear.kind && EditionSR6.AUGS_KEYS.includes(gear.kind));
    },
    /** Options du sélecteur de gamme, avec l'effet en toutes lettres. */
    implantGrades() {
      const x = (n) => String(n).replace(".", ",");
      return this.IMPLANT_GRADES_AT_CREATION.map((k) => {
        const g = this.IMPLANT_GRADES[k];
        return { value: k, label: `${g.label} — Essence ×${x(g.essence)}, coût ×${x(g.cout)}${g.dispo ? `, Disp. ${g.dispo > 0 ? "+" : ""}${g.dispo}` : ""}` };
      });
    },
    /** Ce que la gamme fait à cet implant : Essence, coût et Disponibilité effectifs. */
    implantState(gear, build) {
      const grades = this.IMPLANT_GRADES;
      const vue = this._implantView(gear, build);
      const d = this.implantDefaults(gear.name, gear.rating);
      const cap = this.implantCapacity(gear, build);
      // Un cybermembre personnalisé (SR5) paie +5 000 ¥ et +1 de Disponibilité
      // par point de Force ou d'Agilité au-dessus de la base.
      const membre = build && this.isCyberlimb(gear) ? this.cyberlimbAttrs(build, gear) : null;
      const dispo = Implants.availability(grades, gear);
      return {
        grade: Implants.gradeOf(grades, gear).label,
        essence: Implants.essence(grades, vue),
        capacite: cap,
        hote: build ? this.implantHostOf(build, gear) : null,
        membre,
        cost: Implants.cost(grades, gear) + (membre ? membre.persoCout : 0),
        availability: dispo == null ? null : dispo + (membre ? membre.persoDispo : 0),
        multiplicateurs: Implants.gradeOf(grades, gear),
        // Ce que la table sait de cet implant : plage d'indice à saisir,
        // prix standard résolu (pour le proposer quand le prix est vide).
        table: d ? { plage: d.plage, indice: d.indice, cost: d.cost, availability: d.availability, source: d.ref ? d.ref.source : null } : null,
      };
    },
    /** Essence perdue aux augmentations : `{total, inconnus}` — un implant
        sans Essence lisible est nommé, pas compté 0. */
    essenceUsed(build) {
      return Implants.total(this.IMPLANT_GRADES, (build.gear || []).filter((g) => this.isImplant(g)).map((g) => this._implantView(g, build)));
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
            label: `${m.label}${m.wip ? " — catalogue à venir" : ""}`,
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

    /** Qui l'on construit, en trois mots — l'en-tête de l'assistant et le
        bandeau de reprise le lisent. `name` vide = sans nom encore. */
    identity(build) {
      const m = this.metaTable.find((x) => x.nom === build.meta);
      return {
        name: (build.name || "").trim(),
        meta: m && m.souche && m.souche !== m.nom ? `${m.nom} (${m.souche})` : build.meta,
        method: this.methods[build.method]?.label || "",
      };
    },

    /** Karma de personnalisation DÉPENSÉ : métatype, net des traits, achats
        de finition (attributs, compétences, nuyens). La jauge de tête
        affichait `used: 0` — une barre qui ne bougeait jamais. */
    karmaUsed(build) {
      return this.finishingKarma(build).used;
    },

    budget(build) {
      const method = this.methods[build.method];
      if (!method) return { headline: null, cells: [] };
      const n = (v) => v.toLocaleString("fr-FR");
      // `step` : l'étape que la cellule alimente — l'écran met en avant celles
      // de l'étape courante, sans savoir ce qu'elles comptent.
      const cells = [
        { label: "Attributs", used: this.attrPointsUsed(build), total: this.attrPointsTotal(build), step: "attrs" },
        { label: "Ajustement", used: this.adjustPointsUsed(build), total: this.adjustPointsTotal(build), step: "attrs" },
        { label: "Compétences", used: this.skillPointsUsed(build), total: this.skillPointsTotal(build), step: "skills" },
        { label: "Nuyens", used: this.nuyenUsed(build), total: this.nuyenTotal(build), step: "gear" },
        { label: "Essence", used: this.essenceUsed(build).total, total: this.ESSENCE_MAX, step: "gear" },
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
            { label: "Nuyens", used: this.nuyenUsed(build), total: g.nuyen, step: "gear" },
            { label: "Points de contacts", used: this.contactPointsUsed(build), total: g.contactPts, step: "contacts" },
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
      const karma = this.karmaUsed(build);
      return {
        headline: {
          label: `Karma de personnalisation : ${karma} / ${this.KARMA}`,
          used: karma,
          total: this.KARMA,
          over: karma > this.KARMA,
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
          ? `${method.points} points à répartir : A coûte 4, B 3, C 2, D 1, E 0. Une même lettre peut resservir.`
          : `Une lettre par colonne, chacune une seule fois.`,
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
                title: `${build.meta} n'est pas disponible en priorité ${L}`,
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
        const special = this._isMetaSpecial(build.meta, key);
        return {
          key,
          min,
          max,
          note: special ? "spécial de métatype" : "",
          /* Un attribut spécial de métatype accepte des points d'ajustement :
             l'écran offre le champ, borné par les rangs achetés. */
          adjust: special ? { path: `adjust.${key}`, value: this.adjustOn(build, key), max: this.adjustRangeFor(build, key)[1] } : null,
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
        hint: `Chaque attribut part de 1 et se paie un pour un. Les points d'ajustement montent l'Atout, la Magie, la Résonance — ou, à ta place, les rangs d'un attribut spécial de métatype.`,
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
        joueur de la traiter lui-même. Le second attribut de Drain de
        l'Alchimiste (p.33) n'en est plus un : sa valeur est le jeton `DRAIN`,
        résolu à chaque lecture par la tradition du brouillon
        (`moduleAttr`) — changer de tradition change l'attribut, et sans
        tradition le point est NOMMÉ manquant (stepErrors), pas perdu. */
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
            pousser(
              this.DRAIN_TOKEN,
              dr ? `${dr} — second attribut de Drain (${build.tradition})` : "Second attribut de Drain de votre tradition — à choisir à l'étape Concept",
            );
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

    /** Les compétences choisies pour la puce `k` d'un module : une par cible
        (`pour`, 1 par défaut). Le brouillon range une chaîne pour une cible,
        une liste pour plusieurs — les deux formes sont lues, les vides
        écartés. */
    moduleSkillChoices(slot, k) {
      const v = (slot && slot.skills || [])[k];
      return (Array.isArray(v) ? v : [v]).filter(Boolean);
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
        (m.attrs || []).forEach((a, k) => addAttr(this.moduleAttr(build, (slot.attrs || [])[k]), a.n));
        (m.skills || []).forEach((sk, k) => {
          // « Augmentez de 1 rang DEUX compétences parmi… » : `pour` cibles,
          // chacune +n ; la même compétence deux fois ne compte qu'une (le
          // doublon est nommé par stepErrors, pas cumulé en silence)
          for (const choisi of new Set(this.moduleSkillChoices(slot, k))) addSkill(choisi, sk.n);
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
      const objets = (EditionSR6.equipCatalog() || []).map((g) => ({
        category: g.category,
        // `detail` porte la ligne de stats du livre ; l'écran la montre.
        // `kind` est la clé du pool (« pistoletsLourds ») : c'est elle qui
        // dit à quel TYPE d'arme on a affaire, et donc ses emplacements.
        items: (g.items || [])
          .map((it) => ({ label: it.label, detail: it.detail || "", kind: String(it.id || "").split("::")[0] }))
          .filter((it) => it.label),
      }));
      /* Véhicules et drones : le catalogue existait (js/catalogs/vehicles.js,
         132 entrées SR6) et l'étape Équipement ne le proposait pas — on
         saisissait « Drone MCT-Nissan Roto-Drone » en texte libre, et
         l'objet, sans famille, se voyait offrir les mods des trois familles.
         Même motif que `gearCatalog` en septembre : l'accesseur était là,
         l'écran l'ignorait. */
      return [...objets, ...this._tableImplantGroup(objets), ...this._vehicleGroups()];
    },

    /** Les augmentations que la table du livre connaît et que les rayons de
        l'app n'ont pas (« Augmentation d'attribut » SR6, « Étui de bras »…) :
        un rayon de plus, sans doublon avec l'existant, pour que tout ce qui
        a un coût relevé soit choisissable. */
    _tableImplantGroup(objets) {
      const AUGS = EditionSR6.AUGS_KEYS;
      const deja = new Set();
      for (const g of objets) for (const it of g.items) if (AUGS.includes(it.kind)) deja.add(Implants.normName(it.label));
      const items = [];
      for (const r of this.implantTable()) {
        if (/^(indice|cyberjack) /i.test(r.nom) || r.groupe === "Cyberjack") continue;
        const noms = [r.nom, ...(r.alias || [])].map((n) => Implants.normName(n));
        if (noms.some((n) => deja.has(n))) continue;
        const bio = /bioware/i.test(r.categorie);
        const detail = [
          r.essence != null ? `Essence ${String(r.essence).replace(".", ",")}` : r.essenceNote ? `Essence ${r.essenceNote}` : "",
          r.capacite != null ? (r.capaciteNote === "offerte" ? `capacité ${r.capacite}` : `[${r.capacite}]`) : r.capaciteNote && r.capaciteNote !== "offerte" && r.capaciteNote !== "consommée" ? `capacité ${r.capaciteNote}` : "",
          r.dispo ? `Disp. ${r.dispo}` : "",
          r.cout != null ? `${r.cout.toLocaleString("fr-FR")} ¥` : r.coutNote || "",
        ].filter(Boolean).join(", ");
        items.push({ label: r.nom, detail, kind: bio ? "bioware" : "cyberware" });
        deja.add(Implants.normName(r.nom));
      }
      return items.length ? [{ category: "Augmentations (table du livre)", items }] : [];
    },

    /** Les deux rayons Véhicules / Drones, tirés du catalogue partagé. La
        Résistance (`structure` dans le catalogue, « Body » en VO) est la
        réserve d'emplacements d'« À tombeau ouvert » : elle suit l'objet. */
    _vehicleGroups() {
      const ligne = (v) => {
        const st = v.stats || {};
        return [
          st.mania != null ? `Man. ${st.mania}${st.maniaHors != null ? `/${st.maniaHors}` : ""}` : "",
          st.accel != null ? `Accél. ${st.accel}` : "",
          st.vitesse != null ? `Vit. ${st.vitesse}` : "",
          st.structure != null ? `Résist. ${st.structure}` : "",
          st.blindage != null ? `Blind. ${st.blindage}` : "",
          st.pilote != null ? `Autopilote ${st.pilote}` : "",
          st.senseurs != null ? `Senseurs ${st.senseurs}` : "",
        ].filter(Boolean).join(" · ");
      };
      const liste = Vehicles.catalogList("sr6");
      return [
        { category: "Véhicules", items: liste.filter((v) => v.kind !== "drone").map((v) => ({ label: v.name, detail: ligne(v), kind: "vehicules" })) },
        { category: "Drones", items: liste.filter((v) => v.kind === "drone").map((v) => ({ label: v.name, detail: ligne(v), kind: "drones" })) },
      ].filter((g) => g.items.length);
    },

    /* ---- Famille d'un objet : arme, armure ou véhicule ----
       C'est elle qui dit quels accessoires lui proposer. « ＋ Accessoire »
       offrait les mods de châssis sur une veste pare-balles parce que le
       menu ne triait pas. La famille se lit sur le `kind` du catalogue
       (pool d'armes, « armures », « vehicules »/« drones »), à défaut sur le
       nom (table des armures, catalogue des véhicules), à défaut sur ce
       qui est déjà monté ; un objet libre sans indice reste `null` et se
       voit tout proposer — mieux que de lui fermer la porte. */
    gearFamily(gear) {
      const kind = gear && gear.kind;
      if (kind && Object.prototype.hasOwnProperty.call(this.WEAPON_MOUNTS_BY_KIND, kind)) return "arme";
      if (kind === "armures") return "armure";
      if (kind === "vehicules" || kind === "drones") return "vehicule";
      const nom = String((gear && gear.name) || "").trim().toLowerCase();
      if (nom && ArmuresSR6.some((a) => a.nom.toLowerCase() === nom)) return "armure";
      if (nom && Vehicles.matchItem(nom, "sr6")) return "vehicule";
      for (const ref of ModRefs.normalize(gear && gear.mods)) {
        const a = this.accessoryById(ModRefs.id(ref));
        if (!a) continue;
        if (a.montures !== undefined) return "arme";
        if (Object.prototype.hasOwnProperty.call(a, "capacite")) return "armure";
        return "vehicule";
      }
      return null;
    },

    /** Le catalogue d'accessoires QUI CONVIENT à cet objet : les groupes de
        sa famille seulement, tous si la famille est inconnue. */
    accessoryCatalogFor(gear) {
      const fam = this.gearFamily(gear);
      const tout = this.accessoryCatalog();
      return fam ? tout.filter((g) => g.famille === fam) : tout;
    },

    /** L'objet tel qu'il entre dans le brouillon depuis le catalogue : son
        `kind`, et sa réserve quand le module sait la lire au moment du choix
        — Capacité d'une armure (table Armures), Résistance d'un véhicule
        (catalogue). Inconnue → rien d'écrit, l'écran demande la saisie. */
    gearFromCatalog({ name, detail, kind }) {
      // `detail` (la ligne de stats du livre) suit l'objet : la fiche en a
      // besoin pour une augmentation (Essence, bonus).
      // `uid` : un implant logé désigne son hôte par lui (les index bougent).
      const item = { uid: Utils.uid(), name, cost: 0, ...(kind ? { kind } : {}), ...(detail ? { detail } : {}) };
      /* Un implant connu de la table du livre entre avec ses valeurs
         standard — Essence, prix, Disponibilité — que la gamme modifie
         ensuite. Ce que la table ne donne pas (formule sans indice, objet
         d'un supplément) reste à saisir. */
      if (this.isImplant(item)) {
        const d = this.implantDefaults(name);
        if (d) {
          if (d.essenceBase != null) item.essenceBase = d.essenceBase;
          if (d.cost != null) item.cost = d.cost;
          if (d.availability != null) item.availability = d.availability;
        }
      } else {
        /* Une arme ou une armure connue des tables du livre entre avec son
           prix et sa Disponibilité ; un prix en formule reste à saisir, et
           l'objet le dit (`costNote`). */
        const d = this.gearDefaults(name);
        if (d) {
          if (d.cost != null) item.cost = d.cost;
          else if (d.costNote) item.costNote = d.costNote;
          if (d.availability != null) item.availability = d.availability;
        }
      }
      const fam = this.gearFamily(item);
      if (fam === "armure") {
        const base = this.armorReserveFor({ name, detail });
        if (base != null) item[this.ARMOR_RESERVE.key] = base;
      } else if (fam === "vehicule") {
        const v = Vehicles.catalogList("sr6").find((x) => x.name === name);
        if (v && v.stats && v.stats.structure != null) item[this.MOD_RESERVE.key] = v.stats.structure;
      }
      return item;
    },

    /** L'armure PORTÉE : la meilleure protection de l'équipement, lue sur
        la table Armures (« SD +3 »). Les bonus d'armure ne se cumulent pas
        au livre, hors compléments (casque, bouclier) — on retient le plus
        haut, sans additionner. Rend `{nom, sd}` ou null. */
    armorWorn(build) {
      let best = null;
      for (const g of build.gear || []) {
        const nom = String(g.name || "").trim().toLowerCase();
        const a = ArmuresSR6.find((x) => x.nom.toLowerCase() === nom);
        if (!a) continue;
        const sd = parseInt(String(a.sd).replace(/[^\d-]/g, ""), 10);
        if (Number.isNaN(sd)) continue;
        if (!best || sd > best.sd) best = { nom: a.nom, sd };
      }
      return best;
    },

    gearLimits(build) {
      return {
        availability: this.ILLEGAL_AVAILABILITY_CAP - 1,
        hint: `Pas de matériel illégal de Disponibilité ${this.ILLEGAL_AVAILABILITY_CAP} ou plus ; au plus ${this.CASH_MAX.toLocaleString("fr-FR")} ¥ de liquide à la fin.`,
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
      return `Réseau + Loyauté se paient sur Charisme × ${this.CONTACT_MULT} : ${this.contactPointsUsed(build)} / ${this.contactPointsTotal(build)} points. Aucun indice ne dépasse le Charisme.`;
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
    /* ============================================================
       ÉCONOMIE D'EMPLACEMENTS DE MODS (« À tombeau ouvert » p.122)
       ------------------------------------------------------------
       « [Un véhicule dispose d'un nombre d']emplacements de mods égal à son
       score de Résistance NON MODIFIÉ dans chacune des TROIS catégories :
       Châssis, Motorisation, Électronique. Les emplacements non utilisés
       peuvent être convertis d'une catégorie vers une autre avec un ratio de
       2 POUR 1 (sans arrondi, certaines modifications coûtent 0,5
       emplacement). »

       ⚠ Trois réserves SÉPARÉES, pas une seule : c'est la règle qui donne son
       intérêt au choix. Les additionner en un total unique effacerait la
       conversion à 2:1, qui est précisément ce qui coûte au joueur.

       ⚠ Les emplacements se comptent en DEMIS. Ne pas arrondir : le livre le
       dit explicitement, et un arrondi rendrait gratuits deux mods à 0,5.

       ⚠ Un ACCESSOIRE ne consomme AUCUN emplacement (p.123) — c'est ce qui le
       distingue d'un mod, pas son prix.

       ⚠ L'application ne connaît pas la Résistance d'un véhicule : son
       catalogue d'équipement ne porte que des noms. Elle est donc SAISIE, et
       l'écran le dit plutôt que d'inventer une valeur par défaut. */
    MOD_FAMILIES: ["Châssis", "Motorisation", "Électronique"],
    MOD_CONVERSION: 2,
    /* Le champ saisi et son étiquette : le contrôleur les lit ici, il ne
       code ni « Résistance » (SR6) ni « Structure » (SR5). */
    MOD_RESERVE: { key: "resistance", label: "Résistance", hint: "Résistance non modifiée du véhicule : chaque réserve d'emplacements en vaut autant." },

    /** Les trois réserves d'un véhicule, ce qu'il en reste, et les mods
        qu'on NE PEUT PAS compter.

        ⚠ `emplacements: null` n'est pas zéro (voir sr6.vehiculemods.js) : une
        formule (« 1 × Indice ») que l'app ne résout pas, ou rien au livre. Les
        compter 0 rendrait une réserve verte à tort — le « faux vert ». Ils
        sont rendus à part, et l'écran doit les nommer. */
    /** Ce qu'on sait pour évaluer une formule du livre sur CET objet : son
        indice choisi, et la base du porteur (Résistance). */
    modVars(gear, ref) {
      return { indice: ModRefs.indice(ref), base: gear && gear[this.MOD_RESERVE.key] != null && gear[this.MOD_RESERVE.key] !== "" ? Number(gear[this.MOD_RESERVE.key]) : null };
    },

    vehicleModState(vehicule) {
      const res = Number(vehicule && vehicule[this.MOD_RESERVE.key]) || 0;
      const pris = {};
      const indetermines = [];
      for (const f of this.MOD_FAMILIES) pris[f] = 0;
      for (const ref of ModRefs.normalize(vehicule && vehicule.mods)) {
        const m = this.accessoryById(ModRefs.id(ref));
        if (!m || !m.famille) continue; // accessoire : aucun emplacement
        /* « 1 × Indice », « Résistance/2 » : résolus avec l'indice de CET
           objet et la base du véhicule ; sans eux, nommés, pas comptés 0. */
        const e = ModRefs.resolve(m.emplacements, m.emplacementsNote, this.modVars(vehicule, ref));
        if (e == null) {
          indetermines.push({ nom: m.nom, famille: m.famille, note: m.emplacementsNote || "non précisé au livre" });
          continue;
        }
        pris[m.famille] = (pris[m.famille] || 0) + e;
      }
      return {
        reserves: this.MOD_FAMILIES.map((f) => ({
          famille: f,
          total: res,
          utilises: pris[f] || 0,
          reste: res - (pris[f] || 0),
        })),
        indetermines,
      };
    },

    /** Ce qu'il faudrait convertir depuis les autres catégories pour combler
        un dépassement, au ratio 2:1. `null` si rien ne dépasse. */
    vehicleModDeficit(vehicule) {
      const etat = this.vehicleModState(vehicule).reserves;
      const manque = etat.filter((e) => e.reste < 0);
      if (!manque.length) return null;
      const dispo = etat.filter((e) => e.reste > 0).reduce((n, e) => n + e.reste, 0);
      const besoin = manque.reduce((n, e) => n - e.reste, 0) * this.MOD_CONVERSION;
      return {
        manque: manque.map((e) => `${e.famille} : ${-e.reste} emplacement(s) de trop`),
        conversion: true, // SR6 convertit à 2:1 ; Rigger 5 (SR5) ne convertit pas
        besoin,
        dispo,
        possible: dispo >= besoin,
      };
    },

    /** Le test d'installation, quand on s'en charge soi-même (p.123) :
        Ingénierie + Logique [(emplacements × 8), (emplacements heures)], et
        50 % du coût en moins — remise qui NE S'APPLIQUE PAS aux accessoires. */
    vehicleModInstall(mod) {
      if (!mod || !mod.famille) return null; // accessoire : pas d'installation
      /* ⚠ Emplacements en formule : le seuil dépend de l'indice choisi, que
         l'app ne connaît pas. On le dit, on ne calcule pas sur 0.
         Emplacements absents du livre : règle p.123, « considérez que le
         multiplicateur de seuil et d'intervalle est de 1 ». */
      if (mod.emplacements == null && mod.emplacementsNote) {
        return { test: null, note: `seuil et durée selon l'indice (${mod.emplacementsNote})`, outil: null, remise: null };
      }
      const presume = mod.emplacements == null;
      const e = presume ? 1 : mod.emplacements;
      const outil = e < 2 ? "trousse à outils" : e <= 5 ? "atelier" : "installation";
      return {
        test: `Ingénierie + Logique [${e * 8}, ${e} heure(s)]`,
        note: presume ? "aucun emplacement précisé : compté ×1" : null,
        outil,
        remise: mod.cout == null ? null : Math.round(mod.cout / 2),
      };
    },

    /* ---- Accessoires et modifications d'armes : FEU NOURRI p.41 ----
       Deux systèmes. Un ACCESSOIRE occupe une MONTURE (Dessus, Dessous, Canon,
       Crosse ; « Libre » = n'importe laquelle) et se pose sans test : conflit
       résolu par AFFECTATION (js/rules/mounts.js). Une MODIFICATION consomme un
       EMPLACEMENT DE MODIFICATION du TYPE d'arme, après un test étendu
       d'Ingénierie (Armurerie) + Logique (4, 1 heure).

       ⚠ Les montures réelles dépendent de l'arme (Livre de base pp.261-267) ;
       l'app ne les porte pas et suppose les quatre. L'écran le dit.

       ⚠ Le budget de modification est par TYPE d'arme, lu sur `kind` (la clé
       du catalogue). Un type que le livre ne cite pas rend `null` — on le
       dit, on ne compte pas 0. « Pistolets de poche : ni modification ni
       accessoire » (p.41). */
    WEAPON_MOUNTS: ["Dessus", "Dessous", "Canon", "Crosse"],

    /* Les montures PAR CATÉGORIE, lues dans la description de chaque
       catégorie du Livre de base (p.261-268 imprimées) : « Les pistolets
       lourds peuvent être équipés d'accessoires sur le dessus de l'arme et
       sur le canon », « Les fusils […] sur le dessus de l'arme et sur et sous
       le canon », « Les tasers […] au-dessus du canon », « Les pistolets de
       poche ne peuvent être modifiés ou équipés d'accessoires ».

       ⚠ CROSSE : aucune catégorie du Livre de base ne l'offre — et Feu nourri
       p.58 vend un « Harnais de hanche » qui s'y monte. Elle est AJOUTÉE aux
       armes d'épaule (mitraillettes, shotguns, fusils, mitrailleuses) par
       DÉDUCTION, marquée `deduit`. Ce n'est pas une phrase du livre.

       Arcs et arbalètes : « deux montures d'accessoires, au-dessus et
       au-dessous de l'arme (bien que pour les arcs leur emplacement exact
       diffère) » — Feu nourri p.54. Armes de jet : aucune. Armes des
       suppléments : le catalogue ne connaît pas leur type → null. */
    WEAPON_MOUNTS_BY_KIND: {
      tasers: ["Dessus"],
      pistoletsPoche: [],
      pistoletsLegers: ["Dessus", "Canon"], pistoletsAutomatiques: ["Dessus", "Canon"], pistoletsLourds: ["Dessus", "Canon"],
      mitraillettes: ["Dessus", "Canon", "Crosse"],
      shotguns: ["Dessus", "Canon", "Dessous", "Crosse"], fusils: ["Dessus", "Canon", "Dessous", "Crosse"],
      snipersLourds: ["Dessus", "Canon", "Dessous", "Crosse"],
      armesSpeciales: ["Dessus", "Dessous"],
      armesTrait: ["Dessus", "Dessous"], armesJet: [], armesSupplement: null, meleeWeapons: [],
    },
    WEAPON_MOUNTS_DEDUITS: ["Crosse"],
    /* Exceptions NOMMÉES par le livre. « Le M23 peut accepter deux autres
       accessoires à monter sous le canon pour un total de trois » (p.266). Les
       deux Parashield (p.268) ne sont pas au catalogue. */
    WEAPON_MOUNTS_BY_NAME: {
      "Colt M23": ["Dessus", "Canon", "Dessous", "Dessous", "Dessous", "Crosse"],
    },
    WEAPON_MOUNTS_NOTES: {
      pistoletsPoche: "ni modification ni accessoire",
      armesSpeciales: "lanceurs : au-dessus et en dessous du canon",
      armesTrait: "arcs et arbalètes : au-dessus et au-dessous — sur un arc, l'emplacement exact diffère",
      armesJet: "une arme de jet n'offre aucune monture",
      meleeWeapons: "pas de monture : les accessoires de mêlée n'en occupent aucune",
    },

    /** Les montures qu'une arme offre — par nom d'abord (exceptions du
        livre), par catégorie sinon. `montures: null` = non précisé : le
        résolveur suppose les quatre, et l'écran le dit. */
    weaponMounts(arme) {
      const nom = String((arme && arme.name) || "").trim();
      const kind = arme && arme.kind;
      const parNom = Object.keys(this.WEAPON_MOUNTS_BY_NAME).find((n) => nom.startsWith(n));
      const connu = !!parNom || (kind && Object.prototype.hasOwnProperty.call(this.WEAPON_MOUNTS_BY_KIND, kind));
      const montures = parNom ? this.WEAPON_MOUNTS_BY_NAME[parNom].slice() : connu ? this.WEAPON_MOUNTS_BY_KIND[kind] : null;
      const deduit = Array.isArray(montures) && montures.some((m) => this.WEAPON_MOUNTS_DEDUITS.includes(m));
      return {
        montures,
        deduit,
        note: (kind && this.WEAPON_MOUNTS_NOTES[kind]) || (montures ? (deduit ? "Crosse : ajoutée par déduction, aucune catégorie ne la cite" : null) : "montures non précisées pour ce type : les quatre sont supposées libres"),
        source: parNom ? "Livre de base p.266" : "Livre de base p.261-268",
      };
    },
    WEAPON_MOD_SLOTS: {
      meleeWeapons: 2, armesTrait: 2, armesJet: 0, tasers: 2,
      pistoletsPoche: 0, pistoletsLegers: 3, pistoletsAutomatiques: 3, pistoletsLourds: 3,
      mitraillettes: 4, shotguns: 5, snipersLourds: 5, fusils: 6, armesSpeciales: 2,
    },
    WEAPON_MOD_SLOTS_NOTES: {
      armesJet: "aucun emplacement de modification",
      pistoletsPoche: "ni modification ni accessoire",
      armesSpeciales: "armes exotiques : 2",
    },

    /** Les emplacements de modification d'une arme, et ce qu'ils portent.
        `total: null` = type inconnu du livre (ou non distingué) : à dire. */
    weaponModState(arme) {
      const kind = arme && arme.kind;
      const connu = kind && Object.prototype.hasOwnProperty.call(this.WEAPON_MOD_SLOTS, kind);
      const total = connu ? this.WEAPON_MOD_SLOTS[kind] : null;
      let utilises = 0;
      const pris = [];
      for (const ref of ModRefs.normalize(arme && arme.mods)) {
        const a = this.accessoryById(ModRefs.id(ref));
        if (!a || a.montures === undefined || !a.emplacements) continue; // accessoire sur monture, ou mod de véhicule
        utilises += a.emplacements;
        pris.push(a.nom);
      }
      return { total, utilises, pris, note: (kind && this.WEAPON_MOD_SLOTS_NOTES[kind]) || (connu ? null : "type d'arme sans budget connu") };
    },

    /** Les accessoires d'armes en deux groupes, puis les mods de véhicule
        groupés par section du livre. */
    accessoryCatalog() {
      const argent = (x) => (x.cout != null ? `${x.supplement ? "+" : ""}${x.cout.toLocaleString("fr-FR")} ¥` : x.coutNote || "coût au livre");
      const arme = (a) => [
        a.type === "modification" || a.emplacements ? `${a.emplacements || 1} emplacement de modification` : "",
        a.montures === "*" ? "toute monture" : a.montures && a.montures.length ? "monture : " + a.montures.join(" ou ") : a.type === "accessoire" ? "sans monture" : "",
        a.armes ? ["melee", "trait", "feu"].filter((k) => a.armes[k]).map((k) => ({ melee: "mêlée", trait: "trait/jet", feu: "feu" })[k]).join(", ") : "",
        `Disp. ${a.dispo}`, argent(a), a.note || "",
      ].filter(Boolean).join(" · ");
      const groupesArmes = [["accessoire", "Accessoires d'armes"], ["modification", "Modifications d'armes"]].map(([t, nom]) => ({
        category: nom,
        famille: "arme",
        items: AccessoiresSR6.filter((a) => a.type === t).map((a) => ({ id: a.id, label: a.nom, detail: arme(a) })),
      })).filter((g) => g.items.length);
      const capa = (m) => (m.capacite == null ? `capacité ${m.capaciteNote}` : m.capacite ? `capacité ${m.capacite}` : "aucune capacité");
      groupesArmes.push({
        category: "Modifications d'armure",
        famille: "armure",
        items: ArmureModsSR6.map((m) => ({ id: m.id, label: m.nom, detail: [capa(m), `Disp. ${m.dispo}`, argent(m)].filter(Boolean).join(" · ") })),
      });
      const places = (m) => {
        if (!m.famille) return "accessoire, aucun emplacement";
        if (m.emplacements != null) return `${m.emplacements} empl. ${m.famille}`;
        return `${m.famille} · empl. ${m.emplacementsNote || "non précisés (×1)"}`;
      };
      // Dans l'ordre du livre ; les entrées du livre de base sans section
      // (montures p.303) ferment la marche.
      const ORDRE = ["Accessoires", "Châssis", "Habillage", "Motorisation", "Électronique", ""];
      const sections = ORDRE.map((sec) => ({ category: sec ? `Mods de véhicule — ${sec}` : "Mods de véhicule (livre de base)", famille: "vehicule", items: [] }));
      for (const m of VehiculeModsSR6) {
        const g = sections[Math.max(0, ORDRE.indexOf(m.section || ""))];
        g.items.push({
          id: m.id,
          label: m.nom,
          detail: [places(m), m.indice ? `indice ${m.indice}` : "", `Disp. ${m.dispo}`, argent(m), m.note || ""].filter(Boolean).join(" · "),
        });
      }
      return [...groupesArmes, ...sections.filter((g) => g.items.length)];
    },

    accessoryById(id) {
      return AccessoiresSR6.find((a) => a.id === id) || VehiculeModsSR6.find((m) => m.id === id) || ArmureModsSR6.find((m) => m.id === id) || null;
    },

    /* ---- Modifications d'armure : CAPACITÉ (Livre de base p.275) ----
       « La Capacité d'une protection est indiquée sur la table Armures. Les
       modifications d'armure ont un coût en Capacité égal à leur indice. »

       ⚠ Contrairement à SR5, la Capacité n'est PAS l'indice d'armure : c'est
       une valeur propre à chaque armure, que le catalogue (« Nom [SD+N] ») ne
       porte pas. `armorReserveFor` la lit par NOM dans `ArmuresSR6` au moment
       du choix ; inconnue → null, et l'écran demande la saisie.
       ⚠ Un coût « [Indice] » dépend de l'indice choisi : NOMMÉ, pas compté 0. */
    ARMOR_RESERVE: { key: "capacite", label: "Capacité", hint: "Capacité de la protection, lue sur la table des armures" },

    armorReserveFor(item) {
      const nom = String((item && item.name) || "").trim().toLowerCase();
      const a = ArmuresSR6.find((x) => x.nom.toLowerCase() === nom);
      return a && typeof a.capacite === "number" ? a.capacite : null;
    },

    armorCapacityState(armure) {
      const brut = armure && armure[this.ARMOR_RESERVE.key];
      const total = brut == null || brut === "" ? null : Number(brut);
      let utilises = 0;
      const pris = [];
      const indetermines = [];
      for (const ref of ModRefs.normalize(armure && armure.mods)) {
        const a = this.accessoryById(ModRefs.id(ref));
        if (!a || !Object.prototype.hasOwnProperty.call(a, "capacite")) continue; // pas un objet d'armure
        const cap = ModRefs.resolve(a.capacite, a.capaciteNote, this.modVars(armure, ref)); // « [Indice] » : l'indice choisi
        if (cap == null) { indetermines.push({ nom: a.nom, note: a.capaciteNote || "non précisé" }); continue; }
        utilises += cap;
        if (cap) pris.push(a.nom);
      }
      return { total: Number.isFinite(total) ? total : null, utilises, pris, indetermines };
    },


    /** Les montures déjà prises sur une arme, et donc les conflits. */
    /** L'affectation des accessoires d'une arme à ses montures : ce que
        l'écran montre, monture par monture. */
    accessoryMounts(arme) {
      const objets = [];
      for (const ref of ModRefs.normalize(arme && arme.mods)) {
        const a = this.accessoryById(ModRefs.id(ref));
        /* ⚠ La règle des montures ne vaut QUE pour les accessoires d'armes.
           Les modifications de véhicule n'ont pas de point de fixation. */
        if (!a || a.montures === undefined) continue;
        objets.push({ id: a.id + "#" + objets.length, nom: a.nom, montures: a.montures });
      }
      const wm = this.weaponMounts(arme);
      const slots = wm.montures || this.WEAPON_MOUNTS.slice();
      const r = Mounts.resolve(objets, slots);
      const nomDe = (id) => (objets.find((o) => o.id === id) || {}).nom || null;
      return {
        connu: !!wm.montures,
        note: wm.note,
        occupation: r.occupation.map((o) => ({ monture: o.monture, nom: o.id ? nomDe(o.id) : null })),
        restants: r.restants.map((o) => o.nom),
        ok: r.ok,
      };
    },

    accessoryConflicts(arme) {
      const m = this.accessoryMounts(arme);
      if (m.ok) return [];
      const prises = m.occupation.filter((o) => o.nom).map((o) => `${o.monture} (${o.nom})`);
      return m.restants.map((nom) => `${nom} ne trouve pas de monture libre — ${prises.length ? "prises : " + prises.join(", ") : "cette arme n'offre aucune monture"}.`);
    },

    /** Coût des accessoires montés sur tout l'équipement. */
    accessoryCost(build) {
      let n = 0;
      for (const g of build.gear || []) {
        for (const ref of ModRefs.normalize(g.mods)) {
          const a = this.accessoryById(ModRefs.id(ref));
          if (!a) continue;
          // « Indice × 250 ¥ », « Résistance x 1 000¥ » : comptés dès qu'on sait.
          const c = ModRefs.resolve(a.cout, a.coutNote, this.modVars(g, ref));
          if (c != null) n += c;
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

    /** Le jeton qu'un module de vie pose à la place d'un attribut quand le
        livre écrit « votre second attribut employé pour le Drain »
        (Alchimiste, Compagnon p.33) : résolu par la tradition au moment de
        lire, jamais figé dans le brouillon. */
    DRAIN_TOKEN: "DRAIN",

    /** L'attribut qu'un choix de module désigne : un code tel quel, ou le
        jeton de Drain résolu par la tradition — null tant qu'elle manque. */
    moduleAttr(build, value) {
      if (value === this.DRAIN_TOKEN) return this.drainAttr(build);
      return value || null;
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
            ? `${prof.formulas || 0} formules accordées par la colonne Magie ${build.priorities.magic} — sorts, rituels et préparations comptent ensemble ; seuls les sorts sont catalogués.`
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
          hint: `${this.magicRating(build)} point(s) de pouvoir, autant que la Magie. Le catalogue ne porte pas le coût de chaque pouvoir.`,
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
          // La page du livre reste dans la donnée (`source`), pas à l'écran.
          detail: `${t.karma} karma${t.parNiveau ? " par niveau" : ""}${t.desc ? " — " + t.desc : ""}`,
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
      return `Les traits positifs coûtent du karma, les négatifs en rendent. Au plus ${this.TRAIT_MAX} traits, et ${this.TRAIT_KARMA_NET_MAX} karma d'écart entre positifs et négatifs.`;
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
      const out = { concept: [], priorites: [], modules: [], attrs: [], skills: [], magie: [], gear: [], traits: [], finition: [], contacts: [] };
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
          out.concept.push(`${build.meta} n'a pas de ligne de priorité connue.`);
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
            const v = (sl.attrs || [])[k];
            if (!v) manque.push(`attribut ${k + 1}`);
            // « votre second attribut employé pour le Drain » : choisi, mais la
            // tradition qui le nomme manque — le point ne part pas en silence
            else if (v === this.DRAIN_TOKEN && !this.drainAttr(build)) {
              out.modules.push(`${m.nom} : le second attribut de Drain dépend de la tradition — choisis-la à l'étape Concept.`);
            }
          });
          (m.skills || []).forEach((sk, k) => {
            const pour = sk.pour || 1;
            const choix = this.moduleSkillChoices(sl, k);
            if (choix.length < pour) manque.push(pour > 1 ? `compétence ${k + 1} (${choix.length} sur ${pour} choisies)` : `compétence ${k + 1}`);
            if (pour > 1 && new Set(choix).size < choix.length) {
              out.modules.push(`${m.nom} : les ${pour} compétences doivent être différentes (${choix.join(", ")}).`);
            }
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
      for (const k of this.ATTRS) {
        const pose = Number((build.adjust || {})[k]) || 0;
        const [, maxA] = this.adjustRangeFor(build, k);
        if (pose > maxA) out.attrs.push(`${k} : ${pose} point(s) d'ajustement posés pour ${maxA} rang(s) acheté(s).`);
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
        /* ⚠ Un brouillon corrompu (attribut `NaN`, chaîne) traversait la
           validation : `NaN < min` est faux, comme `NaN > max`. On refuse ce
           qui n'est pas un nombre fini avant de comparer. */
        if (val != null && !Number.isFinite(Number(val))) {
          out.attrs.push(`${k} n'est pas un nombre — le brouillon est abîmé, corrige la valeur.`);
        } else if (val != null && (val < min || val > max)) {
          out.attrs.push(`${k} doit être compris entre ${min} et ${max} pour un ${build.meta}.`);
        }
      }
      const auMax = this.ATTRS.filter(
        (k) => ((build.attrs || {})[k] ?? 1) >= this._range(build.meta, k)[1],
      );
      if (auMax.length > 1) {
        // Nommer plutôt que compter : « (3 le sont) » ne dit pas lesquels.
        out.attrs.push(
          `Un seul attribut peut atteindre le rang maximum du métatype à la création — ${auMax.join(", ")} y sont.`,
        );
      }

      const sUsed = this.skillPointsUsed(build);
      const sTotal = this.skillPointsTotal(build);
      if (sUsed > sTotal) out.skills.push(`Trop de points de compétences (${sUsed}/${sTotal}).`);
      if (reserves && sUsed < sTotal) {
        out.skills.push(`Tous les points de compétence doivent être dépensés (${sUsed}/${sTotal}) — rien ne se conserve.`);
      }
      const auPlafond = [];
      for (const s of build.skills || []) {
        if ((s.val || 0) > this.SKILL_CAP) {
          out.skills.push(`${s.name} dépasse le rang maximum à la création (${this.SKILL_CAP}, 7 avec Aptitude).`);
        }
        if ((s.val || 0) >= this.SKILL_CAP) auPlafond.push(s.name);
        // Une seule spé par compétence, sauf armes exotiques (Compagnon p.29).
        if ((s.specs || []).length > 1 && s.name !== "Armes exotiques") {
          out.skills.push(`${s.name} : une seule spécialisation par compétence à la création.`);
        }
      }
      if (auPlafond.length > 1) {
        out.skills.push(
          `Une seule compétence peut atteindre le rang maximum — ${auPlafond.join(", ")} y sont.`,
        );
      }

      const nUsed = this.nuyenUsed(build);
      const nTotal = this.nuyenTotal(build);
      if (nUsed > nTotal) {
        out.gear.push(
          `Ressources dépassées : ${nUsed.toLocaleString("fr-FR")} / ${nTotal.toLocaleString("fr-FR")} ¥.`,
        );
      } else if (nTotal - nUsed > this.CASH_MAX) {
        /* « Si vous avez plus de 5 000 nuyens, revenez en arrière et achetez
           quelque chose d'autre » (cinquième étape). La consigne le disait,
           rien ne le vérifiait. */
        out.gear.push(
          `Il reste ${(nTotal - nUsed).toLocaleString("fr-FR")} ¥ : au plus ${this.CASH_MAX.toLocaleString("fr-FR")} ¥ de liquide à la création — dépense le reste, ou convertis moins de karma.`,
        );
      }
      const kf = this.finishingKarma(build);
      if (kf.used > kf.total) out.finition.push(`Karma de personnalisation dépassé (${kf.used}/${kf.total}).`);
      if (kf.left > kf.carryoverMax) {
        out.finition.push(`${kf.left} karma non dépensés — ils seront perdus : monte un attribut ou une compétence, ou convertis-les en nuyens.`);
      }
      for (const g of build.gear || []) {
        // Un implant porte la Disponibilité de sa gamme (standard + modificateur).
        const dispo = this.isImplant(g) ? this.implantState(g).availability : g.availability != null && g.availability !== "" ? Number(g.availability) : null;
        if (dispo != null && dispo >= this.ILLEGAL_AVAILABILITY_CAP) {
          out.gear.push(
            `${g.name} : Disponibilité ${dispo} — l'illégal de ${this.ILLEGAL_AVAILABILITY_CAP} ou plus est interdit à la création.`,
          );
        }
      }
      /* Implants : la gamme doit être ouverte à la création, et l'Essence
         ne s'épuise pas — à 0, le personnage n'est plus (les fractions
         perdues rognent déjà Magie/Résonance via `recalc`). */
      for (const g of build.gear || []) {
        if (!this.isImplant(g)) continue;
        if (g.grade && !this.IMPLANT_GRADES_AT_CREATION.includes(g.grade)) {
          out.gear.push(`${g.name} : la gamme ${(this.IMPLANT_GRADES[g.grade] || {}).label || g.grade} n'est pas disponible à la création.`);
        }
      }
      const ess = this.essenceUsed(build);
      if (ess.total >= this.ESSENCE_MAX) {
        out.gear.push(`Essence épuisée : ${ess.total} perdue sur ${this.ESSENCE_MAX} — retire ou allège des implants.`);
      }
      /* Capacité des hôtes : un cybermembre, un cyberœil ou une oreille
         cybernétique n'accueille pas plus que sa capacité ; un accessoire
         de cybermembre doit être logé. */
      for (const h of this.implantHosts(build)) {
        if (h.utilises > h.total) out.gear.push(`${h.name} : capacité ${h.utilises}/${h.total} dépassée (${h.pris.join(", ")}).`);
      }
      for (const g of build.gear || []) {
        if (!this.isImplant(g)) continue;
        const cap = this.implantCapacity(g, build);
        if (cap.doitEtreLoge && !this.implantHostOf(build, g)) {
          out.gear.push(`${g.name} : un accessoire de cybermembre se loge dans un membre — choisis son hôte.`);
        }
        if (g.hote && !this.implantHostOf(build, g)) {
          out.gear.push(`${g.name} : son hôte n'est plus dans l'équipement.`);
        }
        if (this.isCyberlimb(g)) {
          const m = this.cyberlimbAttrs(build, g);
          if (m.ameliorations.doublons.length) {
            out.gear.push(`${g.name} : une seule amélioration de chaque type par membre (${m.ameliorations.doublons.join(", ")} en double).`);
          }
          for (const k of ["FOR", "AGI"]) {
            const v = Number((g.membre || {})[k]);
            const max = this.attrRangeFor(build, k)[1];
            if (Number.isFinite(v) && v > max) out.gear.push(`${g.name} : ${k} du membre personnalisé à ${v}, au plus ${max} (maximum naturel).`);
            if (Number.isFinite(v) && v < this.CYBERLIMB.base) out.gear.push(`${g.name} : ${k} du membre en dessous de la base ${this.CYBERLIMB.base}.`);
            // Le membre ne dépasse pas le maximum augmenté de l'attribut :
            // son rang actuel + 4.
            const naturel = (build.attrs || {})[k] ?? 1;
            if (m[k] > naturel + this.AUGMENT_MAX) out.gear.push(`${g.name} : ${k} du membre à ${m[k]}, au plus ${naturel + this.AUGMENT_MAX} (${naturel} + ${this.AUGMENT_MAX}, maximum augmenté).`);
          }
        }
      }
      // L'Armure des membres est une augmentation comme les autres : +4 au plus,
      // tous membres confondus — elle monte le Score Défensif en permanence.
      const armureMembres = (build.gear || [])
        .filter((g) => this.isCyberlimb(g))
        .reduce((sum, g) => sum + (this.cyberlimbAttrs(build, g).armure || 0), 0);
      if (armureMembres > this.AUGMENT_MAX) out.gear.push(`Armure de membre : +${armureMembres} en tout, au plus +${this.AUGMENT_MAX} (augmentation maximale).`);


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
        out.traits.push(`Au plus ${tr.max} traits à la création (${tr.nombre}).`);
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
      // L'Essence perdue aux implants (à leur gamme) ; `recalc` en tire la
      // pénalité de Magie/Résonance. Elle valait 6 quel que soit le chrome.
      attrs.ESS = Math.max(0, Math.round((this.ESSENCE_MAX - this.essenceUsed(build).total) * 100) / 100);

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

      /* Le profil magique de la fiche, dans les mots du générateur : c'est
         `special` que lisent `recalc` (Technodrain), le persona vivant et
         l'en-tête de carte. */
      const profil = this.magicProfile(build);
      const SPECIAL = { technomancien: "Technomancien", adepte: "Adepte", mystique: "Adepte mystique", magicien: "Magicien", specialise: "Magicien spécialisé" };
      const special = profil ? SPECIAL[profil.key] || null : null;
      const armure = this.armorWorn(build);

      /* Souche / métavariante / traits raciaux dans la langue du générateur —
         la carte lit `metavariant` et `metaTraits`. Cf. sr5.creation.js. */
      const mv = Metavariants.use("sr6").resolve(build.meta);

      const pnj = {
        id: Utils.uid(),
        edition: "sr6",
        isPC: true,
        name: build.name && build.name.trim() ? build.name.trim() : Utils.genName(),
        meta: mv ? mv.baseMetatype || build.meta : build.meta,
        metavariant: mv ? mv.name : null,
        metaFamily: mv ? mv.family : null,
        metaTraits: mv ? mv.traits || [] : [],
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
        /* ⚠ Les accessoires choisis restaient dans le brouillon : la fiche ne
           recevait que le nom de l'objet. Ils voyagent maintenant avec lui,
           en clair — « Ares Predator V (Lunette de visée, Silencieux) ». */
        /* Tout le monde a ses poings : la ligne « Mains nues » que le
           générateur de PNJ pose sur chaque fiche — c'est elle qui porte la
           VD d'un cybermembre (SR5 p.458), résolue par la carte. */
        equip: [...(build.gear || []).map((g) => {
          const mods = ModRefs.normalize(g.mods).map((ref) => {
            const a = this.accessoryById(ModRefs.id(ref));
            const n = ModRefs.indice(ref);
            return a ? `${a.nom}${n ? " " + n : ""}` : null;
          }).filter(Boolean);
          /* ⚠ L'arme sortait sans sa ligne de stats : « Ares Predator V » nu.
             Or la fiche ne reconnaît une arme qu'à son bloc « [PRE…, VD…] »
             (ItemResolver.splitEquip) — un PJ du générateur n'avait donc AUCUN
             jet d'arme, quand le même Predator saisi à la main en avait un.
             Tout objet du catalogue reprend la langue de l'app : « Nom
             [détail, accessoires] », comme « Veste pare-balles [9] ». */
          const detailArme = !this.isImplant(g) && g.detail ? `${g.detail}${mods.length ? `, ${mods.join(", ")}` : ""}` : "";
          const nom = detailArme ? `${g.name} [${detailArme}]` : mods.length ? `${g.name} (${mods.join(", ")})` : g.name;
          /* Une AUGMENTATION entre dans la langue du générateur : un objet
             `{str, cat}` (cf. ItemResolver.addEquipString), avec la ligne de
             stats du livre — c'est elle que lisent le routage Augmentations,
             BonusEngine (« Réflexes câblés 1 » → +1D6) et le coût en Essence
             d'un implant rejeté. Une chaîne nue en faisait un objet « Porté ». */
          if (this.isImplant(g)) {
            /* ⚠ L'indice choisi restait dans le brouillon : « Orthoderme 3 »
               sortait « Orthoderme [Indice 1-4, …] », que BonusEngine lit comme
               une plage non résolue → bonus 0. L'objet porte `rating`, la langue
               du stepper (ItemResolver.itemRating). */
            const st = this.implantState(g, build);
            const gamme = g.grade && g.grade !== "standard" ? ` · ${st.grade.toLowerCase()}` : "";
            const loge = st.hote ? ` · dans ${st.hote.name}` : "";
            // Un cybermembre porte ses attributs propres sur sa ligne.
            const membre = st.membre ? ` · FOR ${st.membre.FOR}, AGI ${st.membre.AGI}${st.membre.armure ? `, Armure +${st.membre.armure}` : ""}` : "";
            return { str: `${g.detail ? `${nom} [${g.detail}]` : nom}${membre}${gamme}${loge}`, cat: g.kind, grade: g.grade || "standard", essence: st.essence, ...(Number(g.rating) > 0 ? { rating: Number(g.rating) } : {}), ...(st.hote ? { hote: st.hote.name } : {}), ...(st.membre ? { membre: { FOR: st.membre.FOR, AGI: st.membre.AGI, armure: st.membre.armure } } : {}) };
          }
          return nom;
        }), "Mains nues [VD 2E, SO FOR+RÉA/–/–/–/–]"],
        awakened: build.awakened || null,
        // Lue par la fiche (section Tradition) et par les règles de Drain.
        tradition: build.tradition || null,
        /* Style de vie « sans SIN » : la fiche et le kit savent déjà l'afficher
           et le rattacher à une identité plus tard. */
        orphanLifestyles: build.lifestyle
          ? [{ name: (this.lifestyleById(build.lifestyle) || {}).nom, city: "" }]
          : [],
        threatLevel: "forte",
        /* ⚠ `recalc` lit la FORME des moniteurs sur la présence de `stunMon`
           (`!== undefined`) : un `stunMon: null` la faisait passer pour la
           forme à deux moniteurs, et le moniteur unique `me` n'était plus
           recalculé — ni la case des cybermembres, ni une Constitution
           modifiée. On n'émet que les champs de la forme choisie. */
        ...(separate ? { physMon, stunMon, physFilled: 0, stunFilled: 0 } : { me, meFilled: 0 }),
        special,
        // L'attribut de Drain de la tradition : c'est lui que `recalc` lit
        // pour poser `drainResist`. Sans lui, la fiche n'avait pas de Drain.
        traditionDrainAttr: this.drainAttr(build),
        /* Score Défensif = Constitution + indice d'Armure (livre de base,
           « Score Défensif ») ; 1 dé d'initiative et 1 action majeure + 2
           mineures par défaut. La fiche affichait « SD ? » et un
           Encaissement vide : ces champs n'étaient pas émis. */
        armure: armure ? armure.sd : 0,
        armureNom: armure ? armure.nom : null,
        sdBase: attrs.CON + (armure ? armure.sd : 0),
        initDice: 1,
        pa: "MAJ 1, MIN 2",
        perception: (perceptionSkill?.val || 0) + attrs.INT,
        volonte: attrs.VOL,
        contacts: build.contacts || [],
        notes: build.notes || "",
      };
      /* ⚠ Une seule source pour les dérivés — initiative, défense,
         encaissement, sang-froid, Drain : `EditionSR6.recalc`, celle des
         PNJ générés et de toute édition manuelle. La fiche du PJ en
         recopiait deux à la main et n'avait pas les autres ; deux
         consommateurs d'un même fait doivent lire la même expression. */
      // Bonus des augmentations (BonusEngine), comme pour un PNJ généré.
      BonusEngine.apply(pnj, "sr6");
      return EditionSR6.recalc(pnj);
    },
  },
});
