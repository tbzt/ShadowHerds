"use strict";

/* ============================================================
   SR5 — BARÈME DE CRÉATION DE PERSONNAGE JOUABLE
   ------------------------------------------------------------
   Sources (relevé du 2026-09-09, cf. REFERENCE/creation_pj_sr5.md) :
   - « Shadowrun 5 - Livre de Règles.pdf » (VF) — Table des priorités p.67,
     Attributs par métatype p.68, Jouabilité alternative p.66, checklist de
     création p.102, coûts de progression p.107-108.
   - « sr5_06_run_faster_v1a.pdf » (VF, Kits de construction) — système à
     10 points p.138, système de création par Karma p.140, système à modules
     chronologiques p.142.

   Les deux tables larges ont été lues À L'IMAGE (pdftoppm), pas au
   pdftotext, dont la sortie entrelace les colonnes des livres SR — c'est le
   protocole du projet, et il a effectivement fallu l'appliquer ici.

   Noms VF : le livre écrit « système à 10 points » et « système à modules
   chronologiques ». Ne pas les retraduire en « somme à dix » / « parcours
   de vie » — l'utilisateur est traducteur officiel FR.

   Comme anarchy2.creation.js, ce fichier est un BARÈME PUR, isolé pour
   rester facile à corriger si une valeur doit bouger après relecture.

   ⚠ Piège vérifié au livre : en SR5 les points d'attribut se comptent
   DEPUIS L'INDICE DE DÉPART DU MÉTATYPE (« Il faut 1 point d'attribut pour
   augmenter un attribut de 1 », p.68) — l'inverse d'Anarchy 2, qui compte
   depuis 0 (p.85). Ne pas cloner attrPointsUsed() d'Anarchy ici.
   ============================================================ */
import { VehiculeModsSR5 } from "./sr5.vehiculemods.js";
import { AccessoiresSR5 } from "./sr5.accessoires.js";
import { Content } from "../rules/content.js";
import { Mounts } from "../rules/mounts.js";
import { Magic } from "../rules/magic.js";
import { EditionSR5 } from "./sr5.js";
import { SkillCatalog } from "../rules/skillcatalog.js";
import { TraitsSR5 } from "./sr5.traits.js";
import { Utils } from "../core/utils.js";

Object.assign(EditionSR5, {
  creation: {
    /* ============================================================
       LES QUATRE MÉTHODES DU LIVRE
       ============================================================ */
    methods: {
      priorites: {
        label: "Système de priorités",
        source: "Livre de Règles p.67",
        family: "priority",
        hint: "La méthode par défaut. Une lettre par colonne, chaque lettre une seule fois.",
      },
      dixpoints: {
        label: "Système à 10 points",
        source: "Run Faster p.138",
        family: "priority",
        points: 10,
        hint: "Même table, mais 10 points à répartir : A coûte 4, B 3, C 2, D 1, E 0. Une lettre peut resservir.",
      },
      karma: {
        label: "Système de création par Karma",
        source: "Run Faster p.140",
        family: "karma",
        karma: 800,
        nuyenKarmaCap: 235,
        hint: "800 points de Karma, tout s'achète. Le plus libre, et le plus long.",
      },
      modules: {
        label: "Système à modules chronologiques",
        source: "Run Faster p.142",
        family: "modules",
        karma: 750,
        hint: "750 points de Karma dépensés en modules de vie : on compose un parcours, on ne répartit pas des points.",
      },
    },

    /** Attributs achetés par les points de la colonne Attributs (p.68). */
    ATTRS: ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"],
    /** Attributs spéciaux, payés par les points de la colonne Métatype.
        Ils échappent à la règle du « un seul au maximum » (checklist p.102). */
    SPECIAL_ATTRS: ["CHC", "MAG", "RES"],

    /* ============================================================
       TABLE DES PRIORITÉS (LdR p.67) — lue à l'image
       ============================================================ */
    priorityTable: {
      A: {
        meta: { Humain: 9, Elfe: 8, Nain: 7, Ork: 7, Troll: 5 },
        attrs: 24,
        magic: [
          { key: "magicien", label: "Magicien ou adepte mystique", mag: 6, skills: 2, skillRating: 5, spells: 10 },
          { key: "technomancien", label: "Technomancien", res: 6, skills: 2, skillRating: 5, forms: 5 },
        ],
        skills: [46, 10],
        nuyen: 450000,
      },
      B: {
        meta: { Humain: 7, Elfe: 6, Nain: 4, Ork: 4, Troll: 0 },
        attrs: 20,
        magic: [
          { key: "magicien", label: "Magicien ou adepte mystique", mag: 4, skills: 2, skillRating: 4, spells: 7 },
          { key: "technomancien", label: "Technomancien", res: 4, skills: 2, skillRating: 4, forms: 2 },
          { key: "adepte", label: "Adepte", mag: 6, activeSkills: 1, skillRating: 4 },
          { key: "specialise", label: "Magicien spécialisé", mag: 5, groups: 1, skillRating: 4 },
        ],
        skills: [36, 5],
        nuyen: 275000,
      },
      C: {
        meta: { Humain: 5, Elfe: 3, Nain: 1, Ork: 0 },
        attrs: 16,
        magic: [
          { key: "magicien", label: "Magicien ou adepte mystique", mag: 3, spells: 5 },
          { key: "technomancien", label: "Technomancien", res: 3, forms: 1 },
          { key: "adepte", label: "Adepte", mag: 4, activeSkills: 1, skillRating: 2 },
          { key: "specialise", label: "Magicien spécialisé", mag: 3, groups: 1, skillRating: 2 },
        ],
        skills: [28, 2],
        nuyen: 140000,
      },
      D: {
        meta: { Humain: 3, Elfe: 0 },
        attrs: 14,
        magic: [
          { key: "adepte", label: "Adepte", mag: 2 },
          { key: "specialise", label: "Magicien spécialisé", mag: 2 },
        ],
        skills: [22, 0],
        nuyen: 50000,
      },
      E: {
        meta: { Humain: 1 },
        attrs: 12,
        magic: [],
        skills: [18, 0],
        nuyen: 6000,
      },
    },

    /** Colonnes de la table, dans l'ordre du livre. */
    PRIORITY_COLUMNS: [
      { key: "meta", label: "Métatype" },
      { key: "attrs", label: "Attributs" },
      { key: "magic", label: "Magie ou Résonance" },
      { key: "skills", label: "Compétences" },
      { key: "nuyen", label: "Ressources" },
    ],

    /** Coût en points de chaque lettre — système à 10 points (RF p.138). */
    priorityCost: { A: 4, B: 3, C: 2, D: 1, E: 0 },

    /* ============================================================
       NIVEAUX DE CAMPAGNE (encadré « Jouabilité alternative », LdR p.66)
       Même structure à trois paliers que les gameLevels d'Anarchy 2.
       ============================================================ */
    gameLevels: {
      rue: {
        label: "Niveau rue",
        karma: 13,
        karmaMax: 26,
        nuyenByPriority: { A: 75000, B: 50000, C: 25000, D: 15000, E: 6000 },
        deviceRating: 4,
        availability: 10,
        karmaToNuyenMax: 5,
        contactMult: 3,
      },
      experimente: {
        label: "Runner expérimenté",
        karma: 25,
        karmaMax: null,
        nuyenByPriority: null, // table standard
        deviceRating: 6,
        availability: 12,
        karmaToNuyenMax: 10,
        contactMult: 3,
      },
      elite: {
        label: "Runner d'élite",
        karma: 35,
        karmaMax: 70,
        nuyenByPriority: { A: 500000, B: 325000, C: 210000, D: 150000, E: 100000 },
        deviceRating: 6,
        availability: 15,
        karmaToNuyenMax: 25,
        contactMult: 6,
      },
    },

    /** 1 point de Karma = 2 000 ¥ (constant aux trois paliers, p.66 et RF p.140). */
    KARMA_TO_NUYEN: 2000,
    /** Indice maximum d'une compétence À LA CRÉATION (p.90). */
    SKILL_CAP: 6,
    SKILL_CAP_APTITUDE: 7,
    /** Plafonds de traits à la création (p.73). */
    QUALITY_CAP: 25,
    /** Karma reportable en jeu (checklist p.102). */
    KARMA_CARRYOVER: 7,

    /* ============================================================
       COÛTS EN KARMA (LdR p.107-108) — lus à l'image
       ============================================================ */
    karmaCosts: {
      attrMult: 5, // nouvel indice × 5
      skillMult: 2, // nouvel indice × 2
      knowledgeMult: 1, // nouvel indice × 1
      groupMult: 5, // nouvel indice × 5
      complexForm: 4,
      spell: 5,
      powerPoint: 5, // adepte mystique seulement
      specialization: 7,
    },

    /** Traits d'Éveil/Résonance achetables en création par Karma (RF p.141). */
    awakenedKarma: {
      adepte: { label: "Adepte", karma: 20, attr: "MAG" },
      specialise: { label: "Magicien spécialisé", karma: 15, attr: "MAG" },
      magicien: { label: "Magicien", karma: 30, attr: "MAG" },
      mystique: { label: "Adepte mystique", karma: 35, attr: "MAG" },
      technomancien: { label: "Technomancien", karma: 15, attr: "RES" },
    },

    /* ============================================================
       CONTRAT LU PAR CHARGEN
       ============================================================ */

    /** La liste d'étapes dépend de la méthode : la grille de priorités
        n'existe pas en création par Karma. `steps` est donc une FONCTION
        (le contrôleur accepte les deux formes). */
    steps(build) {
      const fam = this.methods[build.method]?.family;
      const out = [{ id: "concept", kind: "concept", label: "Concept" }];
      if (fam === "priority") out.push({ id: "priorites", kind: "priorities", label: "Priorités" });
      if (fam === "modules") out.push({ id: "modules", kind: "life_path_sr5", label: "Parcours" });
      out.push(
        { id: "attrs", kind: "attrs", label: "Attributs" },
        { id: "skills", kind: "skills_sr", label: "Compétences" },
      );
      // L'étape n'existe que si le personnage a quelque chose à y choisir :
      // un profane n'a pas d'écran vide à traverser.
      if (this.magicStep(build)) out.push({ id: "magie", kind: "magic_sr", label: "Magie / Résonance" });
      out.push(
        { id: "gear", kind: "gear_nuyen", label: "Équipement" },
      );
      /* « Karma restant » est une ÉTAPE du livre (p.102), pas une case : on
         y monte ce qu'on veut aux coûts d'amélioration, et on n'en garde pas
         plus de 7. Les méthodes au karma et à modules n'en ont pas besoin :
         leur monnaie EST le karma, `karmaUsed` s'en charge déjà. */
      out.push({ id: "traits", kind: "traits_sr", label: "Traits" });
      if (fam === "priority") out.push({ id: "finition", kind: "finish_sr5", label: "Karma" });
      out.push(
        { id: "contacts", kind: "contacts", label: "Contacts" },
        { id: "review", kind: "review", label: "Révision" },
      );
      return out;
    },

    newBuild() {
      return {
        method: "priorites",
        gameLevel: "experimente",
        meta: "Humain",
        gender: "NB",
        name: "",
        concept: "",
        awakened: "",
        // Lettre assignée à chaque colonne (système de priorités / 10 points).
        priorities: { meta: "C", attrs: "B", magic: "E", skills: "A", nuyen: "D" },
        magicOption: "",
        tradition: "",
        lifestyle: "",
        attrs: {},
        special: { CHC: 0, MAG: 0, RES: 0 },
        skills: [],
        groups: [],
        knowledges: [],
        spells: [],
        complexForms: [],
        adeptPowers: [],
        gear: [],
        contacts: [],
        /** Achats faits sur le karma de finition (p.102). `karmaSpent` ne
            servait à rien : il était déclaré et personne ne l'écrivait ni ne
            le lisait, si bien que les 13/25/35 karma annoncés en tête d'écran
            n'étaient dépensables NULLE PART. */
        karmaBuys: [],
        /** Traits choisis : `{id, karma}` — le karma est CELUI QUE LE JOUEUR
            RETIENT, parce que 39 traits ont un coût variable au livre. */
        traits: [],
        karmaToNuyen: 0,
        // Méthode à modules : les modules choisis, dans l'ordre, chacun {id, sousligne}.
        lifePath: [],
        /** Gains du parcours DÉJÀ reportés, par identifiant stable. Sert deux
            fois : à ne pas appliquer deux fois, et à ne pas refacturer en
            karma ce que le module a déjà payé. */
        lifePathApplied: {},
        notes: "",
      };
    },

    /** Indices de départ du métatype — LUS SUR `EditionSR5.attrRange`, la
        table du livre p.68 déjà présente dans l'app (vérifiée cellule par
        cellule le 2026-09-09). Une seule source, jamais deux. */
    _range(meta, key) {
      const r = EditionSR5.attrRange[meta] || EditionSR5.attrRange.Humain;
      return r[key] || [1, 6];
    },

    _metaList() {
      return Object.keys(EditionSR5.attrRange);
    },

    /** Le niveau de campagne peut remplacer la colonne Ressources (p.66). */
    nuyenFor(build) {
      const level = this.gameLevels[build.gameLevel];
      const letter = build.priorities.nuyen;
      if (level && level.nuyenByPriority) return level.nuyenByPriority[letter] || 0;
      return this.priorityTable[letter]?.nuyen || 0;
    },

    /** Points d'attributs offerts par la colonne Attributs. */
    attrPointsTotal(build) {
      return this.priorityTable[build.priorities.attrs]?.attrs || 0;
    },

    /** Points offerts pour ce métatype à cette lettre, `null` quand le livre
        n'ouvre PAS la lettre à ce métatype : le troll disparaît en C, l'ork
        en D, tout le monde sauf l'humain en E (p.67). La table ne pose pas
        de zéro dans ces cases, elle les laisse vides — et « vide » n'est pas
        « zéro » : le troll en B reçoit bel et bien 0 point.

        Même signature qu'en SR6, où la valeur est un point d'AJUSTEMENT et
        non un point spécial. Les deux monnaies diffèrent ; la question à
        laquelle l'accesseur répond — « cette lettre est-elle ouverte à ce
        métatype ? » — est la même, et c'est elle que le garde-fou interroge. */
    adjustFor(meta, letter) {
      const row = this.priorityTable[letter];
      if (!row || !row.meta) return null;
      return row.meta[meta] ?? null;
    },

    /** Points d'attributs SPÉCIAUX offerts par la colonne Métatype. */
    specialPointsTotal(build) {
      return this.adjustFor(build.meta, build.priorities.meta) ?? 0;
    },

    /** [individuelles, groupes] offerts par la colonne Compétences. */
    skillPointsTotal(build) {
      return this.priorityTable[build.priorities.skills]?.skills || [0, 0];
    },

    /** ⚠ Comptés DEPUIS L'INDICE DE DÉPART DU MÉTATYPE (p.68), pas depuis 0. */
    attrPointsUsed(build) {
      const achete = this.karmaBought(build).attrs;
      return this.ATTRS.reduce((sum, k) => {
        const [min] = this._range(build.meta, k);
        const val = (build.attrs || {})[k];
        const brut = Math.max(0, (val == null ? min : val) - min);
        return sum + Math.max(0, brut - (achete[k] || 0));
      }, 0);
    },

    /** Chance part de la valeur du métatype ; Magie et Résonance de 0 (p.67). */
    specialPointsUsed(build) {
      const [chcMin] = this._range(build.meta, "CHC");
      const sp = build.special || {};
      const chc = Math.max(0, (sp.CHC == null ? chcMin : sp.CHC) - chcMin);
      return chc + Math.max(0, sp.MAG || 0) + Math.max(0, sp.RES || 0);
    },

    /** Une spécialisation coûte 1 point de compétence à la création (p.91). */
    skillPointsUsed(build) {
      const achete = this.karmaBought(build).skills;
      return (build.skills || []).reduce(
        (sum, s) => sum + Math.max(0, (s.val || 0) - (achete[s.name] || 0)) + (s.specs || []).length,
        0,
      );
    },

    groupPointsUsed(build) {
      return (build.groups || []).reduce((sum, g) => sum + (g.val || 0), 0);
    },

    /** Points de connaissances et langues offerts : (INT + LOG) × 2 (p.93). */
    knowledgePointsTotal(build) {
      const val = (k) => {
        const [min] = this._range(build.meta, k);
        return (build.attrs || {})[k] ?? min;
      };
      return (val("INT") + val("LOG")) * 2;
    },

    knowledgePointsUsed(build) {
      return (build.knowledges || []).reduce((sum, k) => sum + (k.val || 1), 0);
    },

    nuyenUsed(build) {
      // ⚠ Le premier mois de style de vie est payé d'avance : il fait
      // partie des ressources dépensées, pas d'un budget à côté.
      return this.lifestyleCost(build) + this.accessoryCost(build) + (build.gear || []).reduce((sum, g) => sum + (Number(g.cost) || 0), 0);
    },

    /** Karma de départ, corrigé du palier de campagne (p.66). */
    karmaTotal(build) {
      const method = this.methods[build.method];
      if (method && method.family !== "priority") return method.karma || 0;
      return this.gameLevels[build.gameLevel]?.karma || 25;
    },

    /** Points de priorité dépensés — système à 10 points seulement. */
    priorityPointsUsed(build) {
      return this.PRIORITY_COLUMNS.reduce(
        (sum, col) => sum + (this.priorityCost[build.priorities[col.key]] ?? 0),
        0,
      );
    },

    /** Modèle de la grille de priorités. Le contrôleur dessine, le module
        dit ce que chaque case contient et si elle est jouable — le troll
        n'existe pas en C/D/E, l'ork pas en D/E, l'elfe pas en E (p.67). */
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
          ? `${method.label} : ${method.points} points à répartir (A = 4, B = 3, C = 2, D = 1, E = 0). Une même lettre peut resservir, mais chaque colonne ne se choisit qu'une fois (Run Faster p.138).`
          : `${method?.label} : une lettre par colonne, et chaque lettre ne sert qu'une fois (Livre de Règles p.67).`,
        footer: method?.points
          ? `Points de priorité : ${this.priorityPointsUsed(build)} / ${method.points}`
          : "",
        /** Ce que la lettre CHOISIE en Magie/Résonance accorde, en toutes
            lettres — voir le commentaire jumeau de sr6.creation.js : la
            cellule reste compacte, mais le sens sort du `title=`. */
        magicLegend: (() => {
          const row = self.priorityTable[build.priorities.magic];
          if (!row) return null;
          if (!row.magic.length) {
            return { letter: build.priorities.magic, options: [], lignes: ["Aucune option magique."] };
          }
          return {
            letter: build.priorities.magic,
            /* ⚠ Ces lignes étaient DÉCORATIVES : elles disaient « Magicien :
               Magie 6, 10 sorts » sans qu'on puisse jamais déclarer qu'on
               était ce magicien. `build.magicOption` existait dans le
               brouillon, n'était ni écrit ni lu, et l'assistant ne pouvait
               donc pas savoir s'il fallait proposer des sorts, des formes
               complexes ou des pouvoirs d'adepte. Elles sont maintenant
               choisissables, et ce choix commande l'étape Magie. */
            options: row.magic.map((m) => ({
              key: m.key,
              label: self._magicOptionLabel(m),
              chosen: build.magicOption === m.key,
            })),
            lignes: row.magic.map((m) => {
              const bits = [];
              if (m.mag) bits.push(`Magie ${m.mag}`);
              if (m.res) bits.push(`Résonance ${m.res}`);
              if (m.skills) bits.push(`${m.skills} compétences indice ${m.skillRating}`);
              if (m.activeSkills) bits.push(`${m.activeSkills} compétence active indice ${m.skillRating}`);
              if (m.groups) bits.push(`${m.groups} groupe indice ${m.skillRating}`);
              if (m.spells) bits.push(`${m.spells} sorts`);
              if (m.forms) bits.push(`${m.forms} formes complexes`);
              return `${m.label} : ${bits.join(", ")}`;
            }),
          };
        })(),
        cell(colKey, L) {
          const row = self.priorityTable[L];
          if (colKey === "meta") {
            const pts = row.meta[build.meta];
            if (pts === undefined) {
              return { html: "—", title: `${build.meta} indisponible en ${L}`, invalid: true };
            }
            return { html: `${build.meta} (${pts})`, title: `${pts} point(s) d'attributs spéciaux`, invalid: false };
          }
          if (colKey === "attrs") return { html: String(row.attrs), title: "Points d'attributs", invalid: false };
          if (colKey === "skills") {
            return {
              html: `${row.skills[0]} / ${row.skills[1]}`,
              title: "Points individuels / points de groupes",
              invalid: false,
            };
          }
          if (colKey === "nuyen") {
            const level = self.gameLevels[build.gameLevel];
            const v = level?.nuyenByPriority ? level.nuyenByPriority[L] : row.nuyen;
            return { html: `${money(v)} ¥`, title: level?.label || "", invalid: false };
          }
          // Magie ou Résonance : la case liste les options du livre.
          if (!row.magic.length) return { html: "—", title: "Aucune option magique", invalid: false };
          const parts = row.magic.map((m) => {
            const bits = [];
            if (m.mag) bits.push(`Magie ${m.mag}`);
            if (m.res) bits.push(`Résonance ${m.res}`);
            if (m.skills) bits.push(`${m.skills} compétences indice ${m.skillRating}`);
            if (m.activeSkills) bits.push(`${m.activeSkills} compétence active indice ${m.skillRating}`);
            if (m.groups) bits.push(`${m.groups} groupe indice ${m.skillRating}`);
            if (m.spells) bits.push(`${m.spells} sorts`);
            if (m.forms) bits.push(`${m.forms} formes complexes`);
            return `${m.label} : ${bits.join(", ")}`;
          });
          return {
            html: row.magic.map((m) => m.label.split(" ")[0]).join(" · "),
            title: parts.join(" — "),
            invalid: false,
          };
        },
      };
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
      return (EditionSR5.equipCatalog() || []).map((g) => ({
        category: g.category,
        // `detail` porte la ligne de stats du livre ; l'écran la montre.
        // `kind` est la clé du pool (« pistoletsLourds ») : c'est elle qui
        // dit à quel TYPE d'arme on a affaire, et donc ses emplacements.
        items: (g.items || [])
          .map((it) => ({ label: it.label, detail: it.detail || "", kind: String(it.id || "").split("::")[0] }))
          .filter((it) => it.label),
      }));
    },

    /** Catalogue groupé par section, dans l'ordre de la vie. */
    lifePathCatalog() {
      const cat = this.lifeModules.catalogue || [];
      return this.lifeModules.order
        .map((sec) => ({ section: sec, modules: cat.filter((m) => m.section === sec) }))
        .filter((g) => g.modules.length);
    },

    lifePathById(id) {
      return (this.lifeModules.catalogue || []).find((m) => m.id === id) || null;
    },

    /** Karma dépensé par le parcours, plus le coût du métatype. */
    lifePathKarmaUsed(build) {
      return (build.lifePath || []).reduce((sum, sl) => {
        const m = this.lifePathById(sl && sl.id);
        return sum + (m ? m.karma || 0 : 0);
      }, 0);
    },

    /** Les identifiants de contrainte qui ne désignent AUCUN module. Une
        règle qui ne cible rien est morte à l'écriture et ne se voit jamais :
        c'est le motif de la règle CSS visant une classe inexistante du
        CONTRIBUTING. Deux références l'étaient ici (« adolescence_… » au lieu
        de « l_adolescence_… », l'apostrophe de « L'adolescence » devenant un
        souligné dans l'identifiant). Lu par `stepErrors`, qui le signale. */
    lifePathDeadRefs() {
      const ids = new Set((this.lifeModules.catalogue || []).map((m) => m.id));
      const out = [];
      for (const k of this.lifeModules.constraints) {
        for (const r of [k.de, ...(k.cibles || [])].filter(Boolean)) {
          if (!ids.has(r)) out.push(r);
        }
      }
      return out;
    },

    /** Les contraintes d'enchaînement que le parcours courant viole. */
    lifePathIssues(build) {
      const pris = (build.lifePath || []).map((x) => x && x.id).filter(Boolean);
      const set = new Set(pris);
      const out = [];
      for (const c of this.lifeModules.constraints) {
        if (c.kind === "exclut" && set.has(c.de)) {
          const conflit = (c.cibles || []).filter((x) => set.has(x));
          if (conflit.length) out.push(c.texte);
        }
        if ((c.kind === "impose" || c.kind === "exige") && set.has(c.de)) {
          out.push(c.texte);
        }
      }
      return out;
    },

    conceptFields(build) {
      const money = (n) => n.toLocaleString("fr-FR");
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
          path: "gameLevel",
          label: "Niveau de campagne",
          type: "select",
          options: Object.entries(this.gameLevels).map(([v, g]) => ({
            value: v,
            label: `${g.label} (${g.karma} karma, disponibilité ${g.availability})`,
          })),
        },
        {
          path: "meta",
          label: "Métatype",
          type: "select",
          options: this._metaList().map((m) => ({ value: m, label: m })),
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
      // En création par Karma, l'Éveil est un TRAIT acheté (RF p.141) : le
      // choix vit ici. En priorités, il découle de la colonne Magie, donc il
      // se fait dans la grille — pas deux endroits pour un même fait.
      if (this.methods[build.method]?.family === "karma") {
        fields.push({
          path: "awakened",
          label: "Éveil / Résonance (trait acheté)",
          type: "select",
          options: [{ value: "", label: `Aucun (0 karma)` }].concat(
            Object.entries(this.awakenedKarma).map(([v, a]) => ({
              value: v,
              label: `${a.label} (${a.karma} karma)`,
            })),
          ),
        });
      }
      if (this.methods[build.method]?.family === "priority") {
        fields.push({
          path: "_nuyenNote",
          label: `Ressources de la colonne : ${money(this.nuyenFor(build))} ¥`,
          type: "note",
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

    /** Jauge dans l'unité de la MÉTHODE : points de priorité, ou karma. */
    budget(build) {
      const method = this.methods[build.method];
      if (!method) return { headline: null, cells: [] };
      const n = (v) => v.toLocaleString("fr-FR");

      if (method.family === "priority") {
        const cells = [
          { label: "Attributs", used: this.attrPointsUsed(build), total: this.attrPointsTotal(build) },
          { label: "Spéciaux", used: this.specialPointsUsed(build), total: this.specialPointsTotal(build) },
          { label: "Compétences", used: this.skillPointsUsed(build), total: this.skillPointsTotal(build)[0] },
          { label: "Groupes", used: this.groupPointsUsed(build), total: this.skillPointsTotal(build)[1] },
          { label: "Nuyens", used: this.nuyenUsed(build), total: this.nuyenFor(build) },
        ];
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
        const karma = this.karmaTotal(build);
        return {
          headline: {
            label: `Système de priorités · ${karma} karma de finition`,
            used: 0,
            total: karma,
            over: false,
          },
          cells,
        };
      }

      if (method.family === "modules") {
        // ⚠ Contrairement à SR6, les étapes Attributs et Compétences RESTENT :
        // le livre dit que le solde finalise le personnage, « les modules
        // laissant volontairement des attributs bas et des compétences
        // hautes » (p.158). Le parcours n'est donc pas tout le personnage,
        // c'est sa moitié narrative — l'autre s'achète avec ce qui reste.
        const parcours = this.lifePathKarmaUsed(build);
        const reste = method.karma - parcours;
        const autres = this.karmaUsed(build);
        const total = parcours + autres;
        return {
          headline: {
            label: `${n(total)} / ${n(method.karma)} karma · parcours ${n(parcours)}, reste ${n(Math.max(0, reste - autres))}`,
            used: total,
            total: method.karma,
            over: total > method.karma,
          },
          cells: [
            { label: "Modules", used: (build.lifePath || []).filter((x) => x && x.id).length, total: null },
            { label: "Nuyens", used: this.nuyenUsed(build), total: this.karmaNuyenCap(build) },
          ],
        };
      }

      // Création par Karma / modules : une seule bourse.
      const total = method.karma || 0;
      const used = this.karmaUsed(build);
      return {
        headline: {
          label: `${n(used)} / ${n(total)} karma`,
          used,
          total,
          over: used > total,
        },
        cells: [
          { label: "Nuyens", used: this.nuyenUsed(build), total: this.karmaNuyenCap(build) },
        ],
      };
    },

    /** Plafond de nuyens achetables au karma (RF p.140 : 235 karma). */
    karmaNuyenCap(build) {
      const cap = this.methods[build.method]?.nuyenKarmaCap || 0;
      return cap * this.KARMA_TO_NUYEN;
    },

    /** Coût cumulé d'une compétence montée de 0 à `val` (p.108). */
    karmaForSkill(val, mult) {
      let sum = 0;
      for (let i = 1; i <= val; i++) sum += i * mult;
      return sum;
    },

    /** Karma total dépensé — création par Karma uniquement. */
    karmaUsed(build) {
      const kc = this.karmaCosts;
      let sum = 0;
      /* ⚠ Ce que le PARCOURS a accordé a déjà été payé par le karma du module :
         le refacturer ici compterait le parcours deux fois et ferait sauter
         les 750. Le report part donc du rang offert, pas du minimum. */
      const offert = this.lifePathGranted(build);
      // Attributs : cumul de (nouvel indice × 5) depuis le minimum du métatype.
      for (const k of this.ATTRS) {
        const [min] = this._range(build.meta, k);
        const val = (build.attrs || {})[k] ?? min;
        const depart = min + (offert.attrs[k] || 0);
        for (let i = depart + 1; i <= val; i++) sum += i * kc.attrMult;
      }
      for (const k of this.SPECIAL_ATTRS) {
        const base = k === "CHC" ? this._range(build.meta, "CHC")[0] : 0;
        const val = (build.special || {})[k] ?? base;
        for (let i = base + 1; i <= val; i++) sum += i * kc.attrMult;
      }
      for (const s of build.skills || []) {
        const base = offert.skills[s.name] || 0;
        sum += this.karmaForSkill(s.val || 0, kc.skillMult) - this.karmaForSkill(base, kc.skillMult);
        sum += (s.specs || []).length * kc.specialization;
      }
      // Une spécialisation offerte par un module est payée par lui aussi.
      sum -= (offert.specs || 0) * kc.specialization;
      for (const g of build.groups || []) {
        const base = offert.groups[g.name] || 0;
        sum += this.karmaForSkill(g.val || 0, kc.groupMult) - this.karmaForSkill(base, kc.groupMult);
      }
      for (const k of build.knowledges || []) {
        const base = offert.knowledges[k.name] || 0;
        sum += this.karmaForSkill(k.val || 1, kc.knowledgeMult) - this.karmaForSkill(base, kc.knowledgeMult);
      }
      sum += (build.spells || []).length * kc.spell;
      sum += (build.complexForms || []).length * kc.complexForm;
      if (build.awakened && this.awakenedKarma[build.awakened]) {
        sum += this.awakenedKarma[build.awakened].karma;
      }
      // Nuyens achetés au karma.
      sum += Math.ceil(this.nuyenUsed(build) / this.KARMA_TO_NUYEN);
      return sum;
    },

    attrsStep(build) {
      const method = this.methods[build.method];
      const specs = this.ATTRS.map((key) => {
        const [min, max] = this._range(build.meta, key);
        return { key, min, max };
      });
      const [chcMin, chcMax] = this._range(build.meta, "CHC");
      // `path` : les attributs spéciaux vivent dans `build.special`, pas dans
      // `build.attrs` — le contrôleur suit le chemin déclaré ici.
      const specialSpecs = [
        { key: "CHC", path: "special.CHC", min: chcMin, max: chcMax, note: "Chance" },
        { key: "MAG", path: "special.MAG", min: 0, max: 6, note: "Magie" },
        { key: "RES", path: "special.RES", min: 0, max: 6, note: "Résonance" },
      ];
      const atMax = this.ATTRS.filter((k) => {
        const [, max] = this._range(build.meta, k);
        return ((build.attrs || {})[k] ?? this._range(build.meta, k)[0]) >= max;
      }).length;

      const isPriority = method?.family === "priority";
      const used = this.attrPointsUsed(build);
      const total = this.attrPointsTotal(build);
      const usedSp = this.specialPointsUsed(build);
      const totalSp = this.specialPointsTotal(build);

      return {
        hint: isPriority
          ? `Colonne Attributs « ${build.priorities.attrs} » : ${total} points, comptés DEPUIS l'indice de départ du métatype (p.68). Les points spéciaux viennent de la colonne Métatype et ne servent qu'à Chance, Magie et Résonance.`
          : `Création par Karma : chaque point coûte le nouvel indice × 5 (p.107). Les attributs partent du minimum du métatype.`,
        groups: [
          {
            label: "Attributs mentaux et physiques",
            used: isPriority ? used : null,
            total: isPriority ? total : null,
            specs,
          },
          {
            label: "Attributs spéciaux",
            used: isPriority ? usedSp : null,
            total: isPriority ? totalSp : null,
            specs: specialSpecs,
          },
        ],
        footer: isPriority
          ? `Attributs : ${used} / ${total} · Spéciaux : ${usedSp} / ${totalSp} · <span class="${atMax > 1 ? "cg-error-text" : ""}">au maximum naturel : ${atMax} / 1</span>`
          : `Karma dépensé : ${this.karmaUsed(build)} / ${method?.karma || 0}`,
      };
    },

    /** Traduit un contact saisi dans l'assistant vers les champs qu'attend
        `Contacts.buildManual`. SR5 nomme l'indice « Connexion » au livre mais
        le stocke en `influence` (1-12) — c'est la structure de l'app, pas une
        traduction du livre. Le mapping vit ICI parce que ses noms de champs
        sont ceux de l'édition : Anarchy attend `level`/`rr` à la place. */
    contactToManual(c) {
      return {
        name: c.name,
        role: c.description || "",
        influence: c.connection || 1,
        loyaute: c.loyalty || 1,
      };
    },

    /** Limites d'achat à la création — indexées sur le niveau de campagne
        (p.66) et la règle générale p.98. */
    gearLimits(build) {
      const level = this.gameLevels[build.gameLevel];
      return {
        availability: level.availability,
        deviceRating: level.deviceRating,
        hint: `À la création, indice maximum ${level.deviceRating} et Disponibilité maximum ${level.availability} (p.98).`,
      };
    },

    /** Contacts SR5 : Connexion et Loyauté chiffrées (p.100). */
    contactFields() {
      return [
        { key: "name", placeholder: "Nom" },
        { key: "description", placeholder: "Rôle / archétype" },
        { key: "connection", placeholder: "Connexion", type: "number", min: 1, max: 12 },
        { key: "loyalty", placeholder: "Loyauté", type: "number", min: 1, max: 6 },
      ];
    },
    /** Karma de contacts offert : Charisme × 3, ou × 6 au niveau élite (p.66). */
    contactKarmaTotal(build) {
      const [chaMin] = this._range(build.meta, "CHA");
      const cha = (build.attrs || {}).CHA ?? chaMin;
      return cha * (this.gameLevels[build.gameLevel]?.contactMult || 3);
    },
    contactKarmaUsed(build) {
      return (build.contacts || []).reduce(
        (sum, c) => sum + (Number(c.connection) || 0) + (Number(c.loyalty) || 0),
        0,
      );
    },
    contactsHint(build) {
      return `Connexion + Loyauté se paient en karma : ${this.contactKarmaUsed(build)} / ${this.contactKarmaTotal(build)} offerts (Charisme × ${this.gameLevels[build.gameLevel]?.contactMult || 3}, p.100).`;
    },

    /** Nettoyage du brouillon : en SR5 les connaissances sont des OBJETS
        `{name, val}` et l'équipement porte un coût — pas de `.trim()` ici. */
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
       TRAITS (p.72-91, Run Faster, Chrome Flesh, Data Trails)
       ------------------------------------------------------------
       Le barème portait un `QUALITY_CAP: 25` que rien ne lisait, et les
       modules de vie du parcours listaient des traits sans qu'il existe un
       endroit où les inscrire. Le catalogue vit dans `sr5.traits.js`.

       ⚠ Le plafond de 25 karma vaut SÉPARÉMENT pour les avantages et pour
       les défauts (p.73) : ce n'est pas un solde net. Un personnage à 25 de
       défauts et 25 d'avantages est légal ; 30 d'avantages compensés par 30
       de défauts ne l'est pas.

       ⚠ Les avantages COÛTENT du karma, les défauts en RENDENT. Les deux
       comptent positivement vers leur propre plafond, et c'est la différence
       qui pèse sur la bourse de finition.
       ============================================================ */

    /** Catalogue groupé, prêt pour le sélecteur cherchable. */
    traitCatalog() {
      const par = { avantage: [], defaut: [] };
      for (const t of TraitsSR5) {
        const k = t.karma.length > 1
          ? `${t.karma[0]} ${t.variable === "ou" ? "ou" : "à"} ${t.karma[1]}`
          : `${t.karma[0]}`;
        par[t.type].push({
          id: t.id,
          label: t.nom,
          detail: `${k} karma · ${t.source}${t.parNiveau ? " · par niveau" : ""}${t.desc ? " — " + t.desc : ""}`,
        });
      }
      return [
        { category: "Avantages (coûtent du karma)", items: par.avantage },
        { category: "Défauts (en rendent)", items: par.defaut },
      ];
    },

    traitById(id) {
      return TraitsSR5.find((t) => t.id === id) || null;
    },

    /** Bilan des traits : ce que les avantages coûtent, ce que les défauts
        rendent, et les deux plafonds — séparés, pas nets. */
    /** Le RÉSUMÉ est déclaré par l'édition, pas dessiné par le contrôleur :
        SR5 borne séparément avantages et défauts à 25 karma (p.73), SR6 borne
        le NOMBRE de traits et l'écart net. Même écran, deux règles — c'est
        l'accesseur qui les distingue. */
    /** L'aide de l'écran est déclarée ici : SR5 borne SÉPARÉMENT avantages
        et défauts, SR6 borne un nombre. Le contrôleur ne doit pas connaître
        la différence. */
    traitHint() {
      return `Les Avantages coûtent du karma, les Défauts en rendent. Le plafond de ${this.QUALITY_CAP} karma s'applique SÉPARÉMENT aux uns et aux autres (p.73) : ce n'est pas un solde net. La différence pèse ensuite sur le karma de finition.`;
    },

    traitSummary(build) {
      const t = this.traitState(build);
      return [
        { label: "avantages", used: t.coutAvantages, total: t.cap },
        { label: "défauts", used: t.bonusDefauts, total: t.cap },
      ];
    },

    traitState(build) {
      let coutAvantages = 0;
      let bonusDefauts = 0;
      for (const t of build.traits || []) {
        const ref = this.traitById(t.id);
        if (!ref) continue;
        const k = Number(t.karma) || ref.karma[0] || 0;
        if (ref.type === "avantage") coutAvantages += k;
        else bonusDefauts += k;
      }
      return {
        coutAvantages,
        bonusDefauts,
        net: coutAvantages - bonusDefauts,
        cap: this.QUALITY_CAP,
      };
    },

    /* ============================================================
       KARMA DE FINITION (LdR p.102, « Karma restant »)
       ------------------------------------------------------------
       « Le Karma restant peut maintenant [être dépensé] […] Pour
       l'amélioration de compétences et d'attributs, il faut [en payer le
       coût] […] Si un joueur souhaite garder du Karma pour un usage
       ultérieur, [il ne peut pas conser]ver plus de 7 points de Karma. »
       Jusqu'à 10 points (selon le palier) se transfèrent en nuyens.

       Le barème annonçait « 25 karma de finition » en tête d'écran depuis le
       début et il n'y avait aucun endroit où les dépenser.

       ⚠ Un rang acheté au karma NE DOIT PAS consommer les points de la
       colonne : `attrPointsUsed` et `skillPointsUsed` retranchent ce que la
       finition a payé, exactement comme `karmaUsed` retranche les gains du
       parcours. Sans ça, acheter au karma ferait « Trop de points
       d'attributs » alors qu'on n'a rien pris à la réserve.
       ============================================================ */

    /** Ce que la finition a acheté, par cible. */
    karmaBought(build) {
      const out = { attrs: {}, skills: {}, knowledges: {}, nuyen: 0 };
      for (const a of build.karmaBuys || []) {
        if (a.kind === "attr") out.attrs[a.name] = (out.attrs[a.name] || 0) + 1;
        else if (a.kind === "skill") out.skills[a.name] = (out.skills[a.name] || 0) + 1;
        else if (a.kind === "know") out.knowledges[a.name] = (out.knowledges[a.name] || 0) + 1;
        else if (a.kind === "nuyen") out.nuyen += a.cost || 0;
      }
      return out;
    },

    /** État de la bourse de finition. `left` peut être positif : le livre
        autorise à en garder, mais pas plus de 7. */
    finishingKarma(build) {
      const total = this.gameLevels[build.gameLevel]?.karma || 0;
      const tr = this.traitState(build);
      // Les avantages se paient sur cette bourse, les défauts l'alimentent.
      const used = (build.karmaBuys || []).reduce((n, a) => n + (a.cost || 0), 0) + tr.net;
      const nuyenKarma = this.karmaBought(build).nuyen;
      return {
        total,
        used,
        left: total - used,
        carryoverMax: this.KARMA_CARRYOVER,
        nuyenKarma,
        nuyenKarmaMax: this.gameLevels[build.gameLevel]?.karmaToNuyenMax || 0,
        nuyen: nuyenKarma * this.KARMA_TO_NUYEN,
      };
    },

    /** Coût du PROCHAIN rang d'une cible — « nouvel indice × multiplicateur »
        (p.107). Rend `null` quand la cible est au plafond de création. */
    karmaBuyCost(build, kind, name) {
      const kc = this.karmaCosts;
      if (kind === "attr") {
        const [min, max] = this.attrRangeFor(build, name);
        const cur = this.SPECIAL_ATTRS.includes(name)
          ? (build.special || {})[name] ?? min
          : (build.attrs || {})[name] ?? min;
        return cur >= max ? null : (cur + 1) * kc.attrMult;
      }
      if (kind === "skill") {
        const row = (build.skills || []).find((x) => x.name === name);
        const cur = row ? row.val || 0 : 0;
        return cur >= this.SKILL_CAP ? null : (cur + 1) * kc.skillMult;
      }
      if (kind === "know") {
        const row = (build.knowledges || []).find((x) => x.name === name);
        const cur = row ? row.val || 0 : 0;
        return (cur + 1) * kc.knowledgeMult;
      }
      if (kind === "nuyen") return 1;
      return null;
    },

    /** Achète un rang (ou un point de nuyens) sur la finition. Refuse
        silencieusement ce qui dépasse la bourse : le bouton est déjà masqué,
        ceci n'est qu'une ceinture. */
    applyKarmaBuy(build, kind, name) {
      const cost = this.karmaBuyCost(build, kind, name);
      if (cost == null) return build;
      const bourse = this.finishingKarma(build);
      if (cost > bourse.left) return build;

      build.karmaBuys = build.karmaBuys || [];
      if (kind === "attr") {
        const [min] = this.attrRangeFor(build, name);
        const cible = this.SPECIAL_ATTRS.includes(name)
          ? (build.special = build.special || {})
          : (build.attrs = build.attrs || {});
        cible[name] = (cible[name] ?? min) + 1;
      } else if (kind === "skill") {
        build.skills = build.skills || [];
        const row = build.skills.find((x) => x.name === name);
        if (row) row.val = (row.val || 0) + 1;
        else build.skills.push({ name, val: 1, specs: [] });
      } else if (kind === "know") {
        build.knowledges = build.knowledges || [];
        const row = build.knowledges.find((x) => x.name === name);
        if (row) row.val = (row.val || 0) + 1;
        else build.knowledges.push({ name, val: 1 });
      } else if (kind === "nuyen") {
        if (bourse.nuyenKarma >= bourse.nuyenKarmaMax) return build;
      }
      build.karmaBuys.push({ kind, name, cost });
      return build;
    },

    /** Annule le DERNIER achat portant sur cette cible — on défait dans
        l'ordre inverse, sinon le coût remboursé ne serait pas celui payé. */
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
        } else if (kind === "know") {
          const row = (build.knowledges || []).find((x) => x.name === name);
          if (row) row.val = Math.max(0, (row.val || 0) - 1);
        }
        liste.splice(i, 1);
        break;
      }
      return build;
    },

    /* ============================================================
       MAGIE / RÉSONANCE — sorts, formes complexes, pouvoirs d'adepte
       ------------------------------------------------------------
       ⚠ Rien de tout cela n'était choisissable avant la 1.163.0, alors que
       la grille des priorités PROMETTAIT « 10 sorts » ou « 5 formes
       complexes » et que `karmaUsed` facturait déjà les sorts. Les
       catalogues existaient depuis toujours dans `Content`, au service du
       générateur de PNJ — 192 sorts, 19 formes, 56 pouvoirs en SR5. Même
       motif que `gearCatalog` et les Atouts d'Anarchy : la donnée était là,
       l'écran ne la lisait pas.
       ============================================================ */

    /** Libellé d'une option de la colonne Magie, tel que la légende l'écrit. */
    _magicOptionLabel(m) {
      const bits = [];
      if (m.mag) bits.push(`Magie ${m.mag}`);
      if (m.res) bits.push(`Résonance ${m.res}`);
      if (m.spells) bits.push(`${m.spells} sorts`);
      if (m.forms) bits.push(`${m.forms} formes complexes`);
      return bits.length ? `${m.label} — ${bits.join(", ")}` : m.label;
    },

    /** Le profil magique EFFECTIF, ou `null` pour un profane. Deux sources,
        parce que le livre en a deux : la COLONNE Magie en priorités (p.67,
        et RF p.138 pour les 10 points), un TRAIT ACHETÉ au karma (RF p.141).
        Le même écran sert les deux — c'est l'accesseur qui les réconcilie,
        pas le contrôleur. */
    /** Les traditions du livre, avec leur ATTRIBUT DE DRAIN. `Magic.traditions`
        les porte depuis toujours — 18 en SR5, 16 en SR6 — la fiche les affiche
        et les règles les lisent ; seule la création ne les demandait pas.

        ⚠ C'est ce `drainAttr` qui rend enfin lisible le « second attribut
        employé pour le Drain » de l'Alchimiste (module de vie SR6, p.33), que
        j'avais déclaré irréductible en 1.163.0 : il n'est irréductible que
        tant qu'on ignore la tradition du personnage. */
    /* ---- Styles de vie (Livre de Règles p.375-376) ----
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
    /* ---- Mods de véhicule : ÉCONOMIE D'EMPLACEMENTS DE RIGGER 5.0 (p.151) ----
       « Each vehicle [has] a number of Modification Slots equal to its Body
       in each Modification Category. There are six Modification Categories:
       Power Train, Protection, Weapons, Body, Electromagnetic, and Cosmetic.
       […] A vehicle cannot exceed its Modification Slots in any category.
       Not even a little. »

       ⚠ Ce N'EST PAS l'économie SR6 : six réserves et non trois, et AUCUNE
       conversion entre catégories — un dépassement est interdit, pas
       convertible. `vehicleModDeficit` le dit avec `conversion: false` ; le
       contrôleur n'a pas à savoir quelle édition il sert.

       ⚠ La réserve se mesure sur la STRUCTURE (Body), que l'app ne connaît
       pas : elle est saisie. `MOD_RESERVE` nomme le champ et l'étiquette,
       pour que le contrôleur ne code ni « Structure » ni « Résistance ». */
    MOD_FAMILIES: ["Motorisation", "Protection", "Armement", "Châssis", "Électronique", "Habillage"],
    MOD_RESERVE: { key: "structure", label: "Structure", hint: "Structure du véhicule (Rigger 5.0 p.151) : chacune des six réserves d'emplacements en vaut autant." },

    /** Les six réserves, ce qu'il en reste, et les mods qu'on ne peut pas
        compter (emplacements en formule : « Indice × 2 », « [Indice] »). */
    vehicleModState(vehicule) {
      const base = Number(vehicule && vehicule[this.MOD_RESERVE.key]) || 0;
      const pris = {};
      const indetermines = [];
      for (const f of this.MOD_FAMILIES) pris[f] = 0;
      for (const id of (vehicule && vehicule.mods) || []) {
        const m = this.accessoryById(id);
        if (!m || !m.famille) continue; // entrée du Livre de Règles sans catégorie, ou accessoire d'arme
        if (m.emplacements == null) {
          indetermines.push({ nom: m.nom, famille: m.famille, note: m.emplacementsNote || "non précisé au livre" });
          continue;
        }
        pris[m.famille] = (pris[m.famille] || 0) + m.emplacements;
      }
      return {
        reserves: this.MOD_FAMILIES.map((f) => ({ famille: f, total: base, utilises: pris[f] || 0, reste: base - (pris[f] || 0) })),
        indetermines,
      };
    },

    /** Un dépassement, en Rigger 5, ne se rachète pas : `possible` est
        toujours faux et `conversion` dit pourquoi. `null` si rien ne dépasse. */
    vehicleModDeficit(vehicule) {
      const manque = this.vehicleModState(vehicule).reserves.filter((e) => e.reste < 0);
      if (!manque.length) return null;
      return {
        manque: manque.map((e) => `${e.famille} : ${-e.reste} emplacement(s) de trop`),
        conversion: false,
        possible: false,
      };
    },

    /** L'installation (p.150-151) : test ÉTENDU (Mécanique du véhicule) +
        Logique [Logique] (seuil, 1 heure), avec l'outillage de la ligne ; si
        une compétence spéciale est listée, un test (Compétence) + Logique (4)
        en plus. Le livre ne donne AUCUNE remise pour l'auto-installation. */
    vehicleModInstall(mod) {
      if (!mod || !mod.famille) return null;
      const seuil = mod.seuil || "?";
      const test = `Mécanique (du véhicule) + Logique [Logique] (${seuil}, 1 heure), test étendu`;
      return {
        test,
        outil: mod.outil || null,
        note: [
          mod.competence ? `puis ${mod.competence} + Logique [Logique] (4)` : "",
          mod.emplacements == null && mod.emplacementsNote ? `emplacements : ${mod.emplacementsNote}` : "",
        ].filter(Boolean).join(" · ") || null,
        remise: null,
      };
    },

    /* ---- Accessoires et modifications d'armes : RUN & GUN p.68 ----
       Six emplacements — « Chaque emplacement ne peut accueillir qu'un
       accessoire ou qu'une modification » — et un objet qui en accepte
       plusieurs n'en occupe qu'UN, au choix. Le conflit se résout donc par
       AFFECTATION (js/rules/mounts.js), pas en comparant des chaînes.

       ⚠ Run & Gun p.69 donne, arme par arme, les emplacements réellement
       disponibles. L'app ne porte pas cette table : le résolveur suppose les
       six — l'écran le dit, il ne le cache pas. */
    WEAPON_MOUNTS: ["Dessus", "Dessous", "Canon", "Côté", "Interne", "Crosse"],
    WEAPON_MOUNTS_HINT: "Run & Gun p.69 réserve certains emplacements selon l'arme ; ici les six sont supposés libres.",

    /** Les accessoires d'armes en trois groupes (accessoires, modifications,
        options), puis les mods de véhicule par catégorie de Rigger 5.0. Une
        entrée sans nombre (formule au livre) s'affiche par sa note. */
    accessoryCatalog() {
      const argent = (x) => (x.cout != null ? `${x.supplement ? "+" : ""}${x.cout.toLocaleString("fr-FR")} ¥` : x.coutNote || "coût au livre");
      const arme = (a) => [
        a.montures === "*" ? "toute monture" : a.montures && a.montures.length ? "monture : " + a.montures.join(" ou ") : "sans monture",
        `Disp. ${a.dispo}`, argent(a), a.note || "", a.source,
      ].filter(Boolean).join(" · ");
      const TYPES = [["accessoire", "Accessoires d'armes"], ["modification", "Modifications d'armes"], ["option", "Options d'accessoires"]];
      const groupesArmes = TYPES.map(([t, nom]) => ({
        category: nom,
        items: AccessoiresSR5.filter((a) => a.type === t).map((a) => ({ id: a.id, label: a.nom, detail: arme(a) })),
      })).filter((g) => g.items.length);
      const places = (m) => {
        if (!m.famille) return "";
        if (m.emplacements != null) return `${m.emplacements} empl. ${m.famille}`;
        return `${m.famille} · empl. ${m.emplacementsNote}`;
      };
      const ORDRE = [...this.MOD_FAMILIES, ""];
      const sections = ORDRE.map((sec) => ({ category: sec ? `Mods de véhicule — ${sec}` : "Mods de véhicule (Livre de Règles)", items: [] }));
      for (const m of VehiculeModsSR5) {
        const g = sections[Math.max(0, ORDRE.indexOf(m.famille || ""))];
        g.items.push({
          id: m.id,
          label: m.statut === "proposé" ? `${m.nom} *` : m.nom,
          detail: [
            places(m), m.indice ? `indice ${m.indice}` : "", m.seuil ? `seuil ${m.seuil}` : "", m.outil || "",
            m.competence ? `+ ${m.competence}` : "", `Disp. ${m.dispo}`, argent(m), m.note || "",
            m.statut === "proposé" ? `* traduction proposée (VO : ${m.sourceVO})` : "", m.errata ? "errata" : "", m.source,
          ].filter(Boolean).join(" · "),
        });
      }
      return [...groupesArmes, ...sections.filter((g) => g.items.length)];
    },

    accessoryById(id) {
      return AccessoiresSR5.find((a) => a.id === id) || VehiculeModsSR5.find((m) => m.id === id) || null;
    },

    /** Les montures déjà prises sur une arme, et donc les conflits. */
    accessoryConflicts(arme) {
      const objets = [];
      for (const id of (arme && arme.mods) || []) {
        const a = this.accessoryById(id);
        /* ⚠ La règle des montures ne vaut QUE pour les accessoires d'armes.
           Les modifications de véhicule n'ont pas de point de fixation. */
        if (!a || a.montures === undefined) continue;
        objets.push({ id: a.id + "#" + objets.length, nom: a.nom, montures: a.montures });
      }
      const r = Mounts.resolve(objets, this.WEAPON_MOUNTS);
      if (r.ok) return [];
      const prises = Object.entries(r.affectation).map(([id, m]) => `${m} (${objets.find((o) => o.id === id).nom})`);
      return r.restants.map((o) => `${o.nom} ne trouve pas de monture libre — ${prises.length ? "prises : " + prises.join(", ") : "aucune monture disponible"}.`);
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
      return (Magic.traditions?.sr5 || []).map((t) => ({
        value: t.name,
        label: `${t.name} — Drain : Volonté + ${Utils.attrFullName ? Utils.attrFullName(t.drainAttr) : t.drainAttr}`,
      }));
    }, 

    /** L'attribut de Drain de la tradition retenue, ou null. */
    drainAttr(build) {
      const t = (Magic.traditions?.sr5 || []).find((x) => x.name === build.tradition);
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
      const a = this.awakenedKarma[build.awakened];
      return a ? { key: build.awakened, label: a.label, source: "karma" } : null;
    },

    /** Indice de Magie ou de Résonance effectif — il plafonne les pouvoirs
        d'adepte (un adepte reçoit autant de points de pouvoir que sa Magie,
        p.69) et sert de repère au joueur. */
    magicRating(build) {
      const p = this.magicProfile(build);
      if (!p) return 0;
      if (p.source === "priorite") return p.mag || p.res || 0;
      const sp = build.special || {};
      return this.awakenedKarma[build.awakened]?.attr === "RES" ? sp.RES || 0 : sp.MAG || 0;
    },

    /** L'écran Magie, DÉCLARÉ : trois réserves possibles, chacune avec son
        catalogue groupé par catégorie et son plafond. `total: null` = pas de
        quota mais un coût en karma à l'unité.

        ⚠ Un adepte ne « dépense » pas ses pouvoirs comme des sorts : il a
        des POINTS DE POUVOIR (= sa Magie), et le catalogue de l'application
        ne porte pas le coût de chaque pouvoir. On affiche donc le nombre de
        points disponibles sans prétendre facturer la sélection — mieux vaut
        un compteur honnête qu'un total inventé. */
    magicStep(build) {
      const prof = this.magicProfile(build);
      if (!prof) return null;
      const fam = this.methods[build.method]?.family;
      const kc = this.karmaCosts;
      const groups = [];

      const sorts = Content.spellCatalogFor("sr5");
      if (sorts && prof.key !== "technomancien" && prof.key !== "adepte") {
        groups.push({
          key: "spells",
          label: "Sorts",
          hint: prof.source === "priorite"
            ? `La colonne Magie ${build.priorities.magic} en accorde ${prof.spells || 0}.`
            : `${kc.spell} karma le sort.`,
          total: prof.source === "priorite" ? prof.spells || 0 : null,
          used: (build.spells || []).length,
          chosen: build.spells || [],
          catalog: sorts,
        });
      }

      const formes = Content.complexFormCatalogFor("sr5");
      if (formes && prof.key === "technomancien") {
        groups.push({
          key: "complexForms",
          label: "Formes complexes",
          hint: prof.source === "priorite"
            ? `La colonne Résonance ${build.priorities.magic} en accorde ${prof.forms || 0}.`
            : `${kc.complexForm} karma la forme complexe.`,
          total: prof.source === "priorite" ? prof.forms || 0 : null,
          used: (build.complexForms || []).length,
          chosen: build.complexForms || [],
          catalog: formes,
        });
      }

      const pouvoirs = Content.pouvoirsAdepte?.sr5 || [];
      if (pouvoirs.length && (prof.key === "adepte" || prof.key === "mystique")) {
        const pp = this.magicRating(build);
        groups.push({
          key: "adeptPowers",
          label: "Pouvoirs d'adepte",
          hint: `${pp} point(s) de pouvoir (autant que la Magie, p.69). Le catalogue ne porte pas le coût de chaque pouvoir : à vérifier au livre.`,
          total: null,
          used: (build.adeptPowers || []).length,
          chosen: build.adeptPowers || [],
          catalog: [{ category: "Pouvoirs d'adepte", items: pouvoirs.map((x) => ({ id: x.name, label: x.name })) }],
        });
      }

      return groups.length ? { hint: `${prof.label}.`, groups } : null;
    },

    /** Les attributs spéciaux vivent dans `build.special`, pas `build.attrs`. */
    attrRangeFor(build, key) {
      if (this.SPECIAL_ATTRS.includes(key)) {
        if (key === "CHC") return this._range(build.meta, "CHC");
        return [0, 6];
      }
      return this._range(build.meta, key);
    },

    /** Catalogue de compétences actives : source unique `SkillCatalog.sr5`. */
    skillCatalog() {
      return Object.entries(SkillCatalog.sr5).map(([name, attr]) => ({ name, attr }));
    },

    groupCatalog() {
      return Object.keys(SkillCatalog.sr5Groups || {}).map((name) => ({
        name,
        members: SkillCatalog.sr5Groups[name],
      }));
    },

    /* ============================================================
       SYSTÈME À MODULES CHRONOLOGIQUES (Run Faster p.142-158)
       Règles relevées et vérifiées ; le catalogue des 51 modules vit dans
       sr5.lifemodules.js — table isolée, corrigeable sans toucher aux règles.
       ============================================================ */
    lifeModules: {
      karma: 750,

      /** Coût par section. Les encadrés ne le répètent pas : il est donné une
          fois dans l'intro de chaque section. Les Études supérieures font
          exception — chaque module y porte son propre coût, imprimé entre
          parenthèses dans son titre (40 à 115). */
      sectionKarma: {
        Nationalités: 15,
        Enfance: 40,
        "L'adolescence": 50,
        "La vraie vie": 100,
      },

      /** L'ordre de la vie. On ne « remplit » pas des emplacements comme en
          SR6 : on parcourt les âges, et chaque module dépense du karma. */
      order: [
        "Nationalités",
        "Enfance",
        "L'adolescence",
        "Études supérieures",
        "La vraie vie",
      ],

      /** ⚠ Différence de règle avec SR6, à ne pas aplatir : l'excédent d'une
          COMPÉTENCE n'est pas perdu, il est TRANSFÉRÉ. « Une compétence active
          ne peut être augmentée au-dessus de 7 avec ce système. […] les rangs
          au-dessus de 7 sont transférés à une compétence liée au même
          attribut » (p.142). L'excédent d'un ATTRIBUT, lui, est bien perdu. */
      skillCap: 7,
      knowledgeCap: 9,
      skillOverflow: "transfert",
      attrOverflow: "perte",

      /** « Si un groupe de compétences est sélectionné, mais que les
          sélections précédentes ont modifié les valeurs des compétences du
          groupe, ajoutez tout simplement un rang à chacune » (p.142). */
      groupAddsOneRank: true,

      /** Contraintes d'enchaînement imprimées dans la prose, jamais dans les
          encadrés — c'est pour ça qu'elles sont ici et non dans le catalogue.
          `kind` : "exclut" (A ferme B), "exige" (A demande l'un de B),
          "impose" (A force B ensuite), "porte" (passage à sens unique). */
      constraints: [
        {
          kind: "exclut",
          de: "l_adolescence_ecole_preparatoire",
          cibles: ["enfance_fugitif", "enfance_education_rurale_en_zone_isolee"],
          texte:
            "École préparatoire est incompatible avec Fugitif et avec Éducation rurale en zone isolée (p.147).",
        },
        {
          kind: "impose",
          de: "l_adolescence_education_magique",
          texte:
            "Éducation magique exige d'avoir acheté une catégorie éveillée (p.141), puis impose le module Corporatiste — directement, ou après des Études supérieures qui restent facultatives.",
        },
        {
          kind: "impose",
          de: "etudes_superieures_academies_militaires",
          texte: "Académies militaires impose de choisir ensuite une Période de service.",
        },
        {
          kind: "exige",
          de: "la_vraie_vie_detective_prive",
          texte:
            "Détective privé exige d'avoir terminé Agent secret, Agent gouvernemental, Corporatiste, Forces de l'ordre, Période de service ou Travail dans les Ombres.",
        },
        {
          kind: "exige",
          de: "la_vraie_vie_periode_de_service_mercenaire",
          texte:
            "Période de service (Mercenaire) exige Agent corpo, Période de service ou Travail dans les Ombres.",
        },
        {
          kind: "porte",
          texte:
            "Passage à sens unique : prendre un module d'Études supérieures mène ensuite à La vraie vie, mais aller directement à La vraie vie interdit d'y revenir.",
        },
      ],

      /** Équilibre karmique — ce qu'on fait du solde (p.158). */
      finition: {
        karmaToNuyen: 2000,
        karmaToNuyenMax: 225,
        sinRule: "On ne garde que le SIN de plus forte valeur en Karma ; il remplace tous les autres.",
        traitDouble:
          "Un trait reçu deux fois et non augmentable est remplacé par un autre de même coût.",
        defautCap: 25,
      },

      /** Rempli par sr5.lifemodules.js. Vide si ce fichier n'est pas chargé —
          `stepErrors` le dit alors plutôt que de laisser créer sans modules. */
      catalogue: [],
    },

    /* ============================================================
       REPORT DES GAINS DU PARCOURS (Run Faster p.142-158)
       ------------------------------------------------------------
       Les encadrés du livre sont de la PROSE, et le relevé les garde telles
       quelles : « Charisme +1, Logique +1 », « Connaissances (hobbies) :
       [1 au choix] +3, Négociation +1 ». C'était voulu — les encadrés sont
       irréguliers (mots manquants, puces mixtes, lignes tronquées à la
       composition) et un analyseur SILENCIEUX y fabriquerait des personnages
       faux tout en paraissant fonctionner.

       Le prix de ce parti, c'est qu'il fallait tout recopier à la main, alors
       que SR6 applique ses modules tout seul. D'où ce compromis : on lit ce
       qu'on sait lire, on le PROPOSE, et le joueur valide. Ce qu'on ne sait
       pas lire est montré tel quel, jamais deviné ni escamoté.

       ⚠ Couverture mesurée sur les 51 modules : 82 % des 1 200 fragments
       sont mécaniques (attributs, compétences, groupes, connaissances,
       spécialisations). Le reste est de la prose CONDITIONNELLE
       (« **Magicien :** ajoutez 1 rang à 2 des groupes suivants… »), des
       listes de langues au choix, et les traits — que rien ne modélise
       encore. Ces 18 % restent à la main, et l'écran le dit.
       ============================================================ */

    /** Noms d'attributs tels que le livre les écrit, vers les codes de l'app. */
    _LP_ATTRS: {
      Constitution: "CON", Agilité: "AGI", Réaction: "REA", Force: "FOR",
      Volonté: "VOL", Logique: "LOG", Intuition: "INT", Charisme: "CHA",
      Chance: "CHC", Magie: "MAG", Résonance: "RES",
    },

    /** Étiquettes dont la VALEUR est une liste d'options et non de gains :
        « Langues secondaires (choisir une langue, rang 1) » énumère des choix,
        pas des acquis. Les découper en gains ferait gagner huit langues. */
    _LP_CHOIX: /langues? secondaires|régions|branches|démographies|rôles?|travails|langue principale/i,

    /** Lit UN fragment. Rend toujours un objet : `kind: "inconnu"` est un
        résultat, pas un échec silencieux — l'écran l'affiche tel quel. */
    _lifePathRead(item) {
      const norm = (x) => String(x || "").trim().replace(/\s+/g, " ");
      const t = norm(item).replace(/\*+$/, "");
      if (!t) return { kind: "vide" };
      const skills = new Set(this.skillCatalog().map((x) => x.name));
      let m;

      /* Deux gains collés faute d'une virgule : « Connaissances
         professionnelles : Stratégie +1 Course +1 ». La virgule manque DANS LE
         LIVRE (vérifié au zoom 300 dpi lors du relevé, cf. la note du module),
         et le catalogue l'a conservée littéralement. On ne l'applique donc pas
         à sa place : on refuse de lire, et la note ⚑ du module dit au joueur
         la lecture attendue. Sans ce garde, l'analyseur fabriquait une
         connaissance nommée « Stratégie +1 Course ». */
      if (/[+-]\d+\s*\S/.test(t)) return { kind: "inconnu", label: t };

      if ((m = t.match(/^Spécialisations?\s+(.+?)\s*\((.+)\)$/i))) {
        return { kind: "spec", name: norm(m[1]), spec: norm(m[2]), label: t };
      }
      if ((m = t.match(/^(.+?)\s*:\s*(.+?)\s*([+-]\d+)$/))) {
        if (/^connaissances?/i.test(m[1]) || /^langues?/i.test(m[1])) {
          return { kind: "know", name: `${norm(m[1])} : ${norm(m[2])}`, delta: Number(m[3]), label: t };
        }
        return { kind: "inconnu", label: t };
      }
      if ((m = t.match(/^(.+?)\s*\(GC\)\s*([+-]\d+)$/i))) {
        return { kind: "group", name: norm(m[1]), delta: Number(m[2]), label: t };
      }
      // « Arme de mêlée exotique (Harpon) +2 » : compétence ET spécialisation.
      if ((m = t.match(/^(.+?)\s*\(([^)]+)\)\s*([+-]\d+)$/)) && skills.has(norm(m[1]))) {
        return { kind: "skill", name: norm(m[1]), spec: norm(m[2]), delta: Number(m[3]), label: t };
      }
      if ((m = t.match(/^(.+?)\s*([+-]\d+)$/))) {
        const nom = norm(m[1]);
        if (this._LP_ATTRS[nom]) return { kind: "attr", key: this._LP_ATTRS[nom], delta: Number(m[2]), label: t };
        if (skills.has(nom)) return { kind: "skill", name: nom, delta: Number(m[2]), label: t };
        if (/^langue/i.test(nom)) return { kind: "know", name: nom, delta: Number(m[2]), label: t };
        return { kind: "inconnu", label: t };
      }
      // « Asocial (14) » : un trait et son coût. Rien ne les modélise encore.
      if (/\(\d+\)$/.test(t)) return { kind: "trait", label: t };
      return { kind: "inconnu", label: t };
    },

    /** Les gains de chaque module du parcours, lus et identifiés. L'identifiant
        est bâti sur l'id du module, pas sur sa position : réordonner le
        parcours ne doit pas rendre « appliqué » un gain qui ne l'est pas. */
    lifePathGains(build) {
      const applied = build.lifePathApplied || {};
      const out = [];
      (build.lifePath || []).forEach((sl) => {
        const mod = this.lifePathById(sl && sl.id);
        if (!mod) return;
        const lignes = [...(mod.lignes || [])];
        // La sous-ligne CHOISIE compte comme une ligne de plus.
        const sous = (mod.souslignes || []).find((x) => x.label === sl.sousligne);
        if (sous) lignes.push({ label: sous.label, valeur: sous.valeur, sousligne: true });

        const effets = [];
        const manuels = [];
        lignes.forEach((l, li) => {
          if (!l.valeur) return;
          if (this._LP_CHOIX.test(l.label || "")) {
            manuels.push(`${l.label} — ${l.valeur}`);
            return;
          }
          String(l.valeur).split(",").forEach((frag, fi) => {
            const r = this._lifePathRead(frag);
            if (r.kind === "vide") return;
            if (r.kind === "inconnu" || r.kind === "trait") {
              manuels.push(r.label);
              return;
            }
            const gid = `${mod.id}#${li}#${fi}`;
            effets.push({ ...r, gid, applique: !!applied[gid] });
          });
        });
        out.push({ id: mod.id, nom: mod.nom, karma: mod.karma, effets, manuels });
      });
      return out;
    },

    /** Ce que le parcours a DÉJÀ accordé, par catégorie. Lu par `karmaUsed`
        pour ne pas refacturer ce que le karma du module a payé : sans cela,
        reporter les gains ferait exploser les 750 avec le parcours compté
        deux fois. */
    lifePathGranted(build) {
      const g = { attrs: {}, skills: {}, groups: {}, knowledges: {}, specs: 0 };
      const applied = build.lifePathApplied || {};
      for (const mod of this.lifePathGains(build)) {
        for (const e of mod.effets) {
          if (!applied[e.gid]) continue;
          if (e.kind === "attr") g.attrs[e.key] = (g.attrs[e.key] || 0) + e.delta;
          if (e.kind === "skill") g.skills[e.name] = (g.skills[e.name] || 0) + e.delta;
          if (e.spec || e.kind === "spec") g.specs += 1;
          if (e.kind === "group") g.groups[e.name] = (g.groups[e.name] || 0) + e.delta;
          if (e.kind === "know") g.knowledges[e.name] = (g.knowledges[e.name] || 0) + e.delta;
        }
      }
      return g;
    },

    /** Reporte un gain sur le brouillon. Idempotent : un gain déjà appliqué
        ne l'est pas deux fois — c'est `lifePathApplied` qui fait foi, pas la
        valeur courante, qu'un joueur a le droit d'avoir modifiée depuis. */
    applyLifePathGain(build, gid) {
      build.lifePathApplied = build.lifePathApplied || {};
      if (build.lifePathApplied[gid]) return build;
      let effet = null;
      for (const mod of this.lifePathGains(build)) {
        const e = mod.effets.find((x) => x.gid === gid);
        if (e) { effet = e; break; }
      }
      if (!effet) return build;

      const listeAjoute = (liste, nom, delta, spec) => {
        const row = liste.find((x) => x.name === nom);
        if (row) {
          row.val = (row.val || 0) + delta;
          if (spec) row.specs = [...new Set([...(row.specs || []), spec])];
        } else {
          liste.push({ name: nom, val: delta, specs: spec ? [spec] : [] });
        }
      };

      if (effet.kind === "attr") {
        const [min] = this.attrRangeFor(build, effet.key);
        const cible = this.SPECIAL_ATTRS.includes(effet.key) ? (build.special = build.special || {}) : (build.attrs = build.attrs || {});
        cible[effet.key] = (cible[effet.key] ?? min) + effet.delta;
      } else if (effet.kind === "skill") {
        build.skills = build.skills || [];
        listeAjoute(build.skills, effet.name, effet.delta, effet.spec);
      } else if (effet.kind === "group") {
        build.groups = build.groups || [];
        listeAjoute(build.groups, effet.name, effet.delta);
      } else if (effet.kind === "know") {
        build.knowledges = build.knowledges || [];
        listeAjoute(build.knowledges, effet.name, effet.delta);
      } else if (effet.kind === "spec") {
        build.skills = build.skills || [];
        listeAjoute(build.skills, effet.name, 0, effet.spec);
      }
      build.lifePathApplied[gid] = true;
      return build;
    },

    /** Où en est le report — lu par l'écran pour dire l'état en une ligne. */
    lifePathApplyState(build) {
      let lisibles = 0, appliques = 0, manuels = 0;
      for (const mod of this.lifePathGains(build)) {
        lisibles += mod.effets.length;
        appliques += mod.effets.filter((e) => e.applique).length;
        manuels += mod.manuels.length;
      }
      return { lisibles, appliques, manuels };
    },

    /* ============================================================
       VALIDATION — la checklist de création du livre (p.102)
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
          if (used > method.points) {
            out.priorites.push(`Trop de points de priorité (${used}/${method.points}).`);
          }
        } else {
          // Système de priorités : une lettre par colonne, sans doublon (p.67).
          const seen = new Set();
          for (const l of letters) {
            if (seen.has(l)) {
              out.priorites.push(`La lettre ${l} est utilisée deux fois — chaque priorité ne sert qu'une fois.`);
              break;
            }
            seen.add(l);
          }
        }
        // Le métatype doit exister dans la ligne choisie (le troll n'est pas
        // disponible en C, D, E ; l'ork pas en D/E ; l'elfe pas en E).
        const row = this.priorityTable[build.priorities.meta];
        if (row && row.meta[build.meta] === undefined) {
          out.priorites.push(
            `${build.meta} n'est pas disponible en priorité ${build.priorities.meta} (Métatype).`,
          );
        }

        const attrUsed = this.attrPointsUsed(build);
        const attrTotal = this.attrPointsTotal(build);
        if (attrUsed > attrTotal) out.attrs.push(`Trop de points d'attributs (${attrUsed}/${attrTotal}).`);
        if (attrUsed < attrTotal) {
          out.attrs.push(`Tous les points d'attribut doivent être dépensés (${attrUsed}/${attrTotal}).`);
        }
        const spUsed = this.specialPointsUsed(build);
        const spTotal = this.specialPointsTotal(build);
        if (spUsed > spTotal) out.attrs.push(`Trop de points spéciaux (${spUsed}/${spTotal}).`);

        const [indiv, groups] = this.skillPointsTotal(build);
        const sUsed = this.skillPointsUsed(build);
        const gUsed = this.groupPointsUsed(build);
        if (sUsed > indiv) out.skills.push(`Trop de points de compétences (${sUsed}/${indiv}).`);
        if (gUsed > groups) out.skills.push(`Trop de points de groupes (${gUsed}/${groups}).`);

        const nuyen = this.nuyenUsed(build);
        const nuyenMax = this.nuyenFor(build);
        if (nuyen > nuyenMax) {
          out.gear.push(
            `Ressources dépassées : ${nuyen.toLocaleString("fr-FR")} / ${nuyenMax.toLocaleString("fr-FR")} ¥.`,
          );
        }
      } else if (method.family === "modules") {
        const cat = this.lifeModules.catalogue || [];
        if (!cat.length) {
          out.concept.push("Catalogue des modules absent — sr5.lifemodules.js n'est pas chargé.");
        }
        const mortes = this.lifePathDeadRefs();
        if (mortes.length) {
          out.concept.push(
            `Contrainte(s) de parcours pointant un module inexistant : ${mortes.join(", ")}. La règle ne s'appliquerait jamais.`,
          );
        }
        const pris = (build.lifePath || []).filter((x) => x && x.id);
        if (!pris.length) out.modules.push("Aucun module choisi — le parcours est vide.");

        const parcours = this.lifePathKarmaUsed(build);
        const total = parcours + this.karmaUsed(build);
        if (total > method.karma) {
          out.modules.push(`Karma dépassé (${total}/${method.karma}) — parcours ${parcours}, reste dépensé ${this.karmaUsed(build)}.`);
        }

        // Une nationalité est le point de départ obligé (p.142).
        if (!pris.some((x) => this.lifePathById(x.id)?.section === "Nationalités")) {
          out.modules.push("Il faut choisir une nationalité et sa région d'origine (p.142).");
        }
        // Sous-ligne à trancher quand le module en propose.
        for (const sl of pris) {
          const m = this.lifePathById(sl.id);
          if (m && (m.souslignes || []).length && !sl.sousligne) {
            out.modules.push(`${m.nom} : la ligne « ${m.souslignes[0].label.split(",")[0]}… » reste à choisir.`);
          }
        }
        for (const t of this.lifePathIssues(build)) out.modules.push(t);
      } else if (method.family === "karma") {
        const used = this.karmaUsed(build);
        if (used > method.karma) out.concept.push(`Karma dépassé (${used}/${method.karma}).`);
        /* Le karma qui reste ne suit PAS le personnage : « Notez bien que les
           points de Karma restant à l'issue de la création du personnage ne
           peuvent pas être conservés (ils sont utilisés ou perdus !) »
           (Run Faster p.142). On pouvait finir à 297/800 sans un mot. */
        if (used < method.karma) {
          out.concept.push(`Tout le karma doit être dépensé (${used}/${method.karma}) — le reliquat est perdu, pas conservé (p.142).`);
        }
        const cap = this.karmaNuyenCap(build);
        if (this.nuyenUsed(build) > cap) {
          out.gear.push(
            `Plafond de nuyens achetés au karma dépassé : ${this.nuyenUsed(build).toLocaleString("fr-FR")} / ${cap.toLocaleString("fr-FR")} ¥ (${this.methods.karma.nuyenKarmaCap} karma).`,
          );
        }
      }

      // Règles communes aux deux familles (checklist p.102).
      for (const k of this.ATTRS) {
        const [min, max] = this._range(build.meta, k);
        const val = (build.attrs || {})[k];
        if (val != null && (val < min || val > max)) {
          out.attrs.push(`${k} doit être compris entre ${min} et ${max} pour un ${build.meta}.`);
        }
      }
      const atMax = this.ATTRS.filter((k) => {
        const [min, max] = this._range(build.meta, k);
        return ((build.attrs || {})[k] ?? min) >= max;
      }).length;
      if (atMax > 1) {
        out.attrs.push(
          `Un seul attribut mental ou physique peut être à son maximum naturel (${atMax} le sont). Chance, Magie et Résonance ne comptent pas.`,
        );
      }

      const cap = this.SKILL_CAP;
      for (const s of build.skills || []) {
        if ((s.val || 0) > cap) {
          out.skills.push(`${s.name} dépasse l'indice maximum à la création (${cap}, 7 avec le trait Aptitude).`);
        }
      }
      // Aucun doublon groupe / compétence individuelle (checklist p.102).
      const groupMembers = new Set();
      for (const g of build.groups || []) {
        for (const m of SkillCatalog.sr5Groups?.[g.name] || []) groupMembers.add(m);
      }
      for (const s of build.skills || []) {
        if (groupMembers.has(s.name)) {
          out.skills.push(`${s.name} est déjà couverte par un groupe de compétences — doublon interdit.`);
        }
      }

      const kUsed = this.knowledgePointsUsed(build);
      const kTotal = this.knowledgePointsTotal(build);
      if (kUsed > kTotal) {
        out.skills.push(`Trop de points de connaissances (${kUsed}/${kTotal} = (INT + LOG) × 2).`);
      }

      const cUsed = this.contactKarmaUsed(build);
      const cTotal = this.contactKarmaTotal(build);
      if (cUsed > cTotal) {
        out.contacts.push(
          `Contacts : ${cUsed} / ${cTotal} points de karma offerts (Charisme × ${this.gameLevels[build.gameLevel]?.contactMult || 3}). Le surplus se paie sur le karma de création.`,
        );
      }

      const level = this.gameLevels[build.gameLevel];
      for (const g of build.gear || []) {
        if (g.availability != null && Number(g.availability) > level.availability) {
          out.gear.push(`${g.name} : Disponibilité ${g.availability} > ${level.availability} autorisée à la création.`);
        }
      }

      const tr = this.traitState(build);
      if (tr.coutAvantages > tr.cap) {
        out.traits.push(`Au plus ${tr.cap} karma d'Avantages à la création (${tr.coutAvantages}) — p.73.`);
      }
      if (tr.bonusDefauts > tr.cap) {
        out.traits.push(`Au plus ${tr.cap} karma de Défauts à la création (${tr.bonusDefauts}) — p.73.`);
      }

      if (method.family === "priority") {
        const kf = this.finishingKarma(build);
        if (kf.used > kf.total) out.finition.push(`Karma de finition dépassé (${kf.used}/${kf.total}).`);
        if (kf.left > kf.carryoverMax) {
          out.finition.push(
            `On ne garde pas plus de ${kf.carryoverMax} karma après la création (p.102) : il en reste ${kf.left}.`,
          );
        }
        if (kf.nuyenKarma > kf.nuyenKarmaMax) {
          out.finition.push(`Au plus ${kf.nuyenKarmaMax} karma convertis en nuyens à ce palier (${kf.nuyenKarma}).`);
        }
      }

      /* Magie : on refuse de DÉPASSER le quota de la colonne. Un quota non
         épuisé n'est PAS signalé — contrairement aux réserves de points, je
         n'ai pas vérifié au livre que les sorts non pris sont perdus, et
         inventer la règle serait pire que se taire. */
      const magie = this.magicStep(build);
      for (const g of magie ? magie.groups : []) {
        if (g.total != null && g.used > g.total) {
          out.magie.push(`${g.label} : ${g.used} choisi(s) pour ${g.total} accordé(s).`);
        }
      }
      // Une colonne Magie qui offre des options mais dont aucune n'est prise :
      // le personnage n'est ni profane ni éveillé, il est indéterminé.
      if (method.family === "priority") {
        const row = this.priorityTable[build.priorities.magic];
        if (row && row.magic.length && !this.magicProfile(build)) {
          out.priorites.push(
            `La colonne Magie ${build.priorities.magic} ouvre ${row.magic.length} option(s) : il faut en choisir une, ou prendre une lettre sans magie.`,
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
       Même forme que EditionSR5.generate() + la couche PJ.
       ============================================================ */
    buildCharacter(build) {
      const attrs = {};
      for (const k of this.ATTRS) {
        const [min] = this._range(build.meta, k);
        attrs[k] = (build.attrs || {})[k] ?? min;
      }
      const sp = build.special || {};
      attrs.CHC = sp.CHC ?? this._range(build.meta, "CHC")[0];
      if (sp.MAG) attrs.MAG = sp.MAG;
      if (sp.RES) attrs.RES = sp.RES;
      attrs.ESS = 6;

      const skills = (build.skills || []).map((s) => {
        const specs = s.specs || [];
        const primary = specs[0];
        return {
          name: s.name,
          val: s.val || 0,
          attr: s.attr || SkillCatalog.sr5[s.name] || "LOG",
          spec: primary || undefined,
          specVal: primary ? (s.val || 0) + 2 : undefined,
          specAttr: primary ? s.attr || SkillCatalog.sr5[s.name] || "LOG" : undefined,
          extraSpecs: specs.length > 1
            ? specs.slice(1).map((name) => ({ name, val: (s.val || 0) + 2, attr: s.attr || "LOG" }))
            : undefined,
        };
      });

      // Moniteurs SR5 : Physique 8 + ⌈CON/2⌉, Étourdissant 8 + ⌈VOL/2⌉ (p.103).
      const physMon = 8 + Math.ceil(attrs.CON / 2);
      const stunMon = 8 + Math.ceil(attrs.VOL / 2);

      return {
        id: Utils.uid(),
        edition: "sr5",
        isPC: true,
        name: build.name && build.name.trim() ? build.name.trim() : Utils.genName(),
        meta: build.meta,
        gender: build.gender || "NB",
        tier: this.gameLevels[build.gameLevel]?.label || "Runner expérimenté",
        // Le concept du joueur, pas le libellé de la méthode : celui-ci vit
        // déjà dans `creationMethod`, et l'afficher en archétype donnait des
        // fiches disant « Elfe · Système de priorités ».
        archetype: (build.concept || "").trim() || "Personnage",
        creationMethod: build.method,
        gameLevel: build.gameLevel,
        priorities: { ...build.priorities },
        // Le parcours est conservé sur la fiche : c'est l'histoire du
        // personnage, et le meneur doit pouvoir la relire.
        lifePath: (build.lifePath || [])
          .filter((x) => x && x.id)
          .map((x) => {
            const m = this.lifePathById(x.id);
            return m ? { nom: m.nom, section: m.section, karma: m.karma, choix: x.sousligne || null } : null;
          })
          .filter(Boolean),
        attrs,
        skills,
        skillGroups: (build.groups || []).map((g) => ({ name: g.name, val: g.val })),
        /* ⚠ La fiche attend des OBJETS `{name, val}` : `_knowledgesSection`
           lit `k.name` et `k.val`. Aplatir en chaînes ici produisait un tag
           « NaN » sans nom sur la fiche de tout personnage créé par
           l'assistant — mesuré. Anarchy tolère les deux formes, pas SR. */
        knowledges: (build.knowledges || []).map((k) =>
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
          return ref ? `${ref.nom} (${t.karma ?? ref.karma[0]})` : t.id;
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
        physMon,
        stunMon,
        physFilled: 0,
        stunFilled: 0,
        contacts: build.contacts || [],
        notes: build.notes || "",
      };
    },
  },
});
