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
import { EditionSR5 } from "./sr5.js";
import { SkillCatalog } from "../rules/skillcatalog.js";
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
        { id: "gear", kind: "gear_nuyen", label: "Équipement" },
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
        attrs: {},
        special: { CHC: 0, MAG: 0, RES: 0 },
        skills: [],
        groups: [],
        knowledges: [],
        spells: [],
        gear: [],
        contacts: [],
        karmaSpent: 0,
        karmaToNuyen: 0,
        // Méthode à modules : les modules choisis, dans l'ordre, chacun {id, sousligne}.
        lifePath: [],
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
      return this.ATTRS.reduce((sum, k) => {
        const [min] = this._range(build.meta, k);
        const val = (build.attrs || {})[k];
        return sum + Math.max(0, (val == null ? min : val) - min);
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
      return (build.skills || []).reduce(
        (sum, s) => sum + (s.val || 0) + (s.specs || []).length,
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
      return (build.gear || []).reduce((sum, g) => sum + (Number(g.cost) || 0), 0);
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
            return { letter: build.priorities.magic, lignes: ["Aucune option magique."] };
          }
          return {
            letter: build.priorities.magic,
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
        items: (g.items || []).map((it) => ({ label: it.label })).filter((it) => it.label),
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
      // Attributs : cumul de (nouvel indice × 5) depuis le minimum du métatype.
      for (const k of this.ATTRS) {
        const [min] = this._range(build.meta, k);
        const val = (build.attrs || {})[k] ?? min;
        for (let i = min + 1; i <= val; i++) sum += i * kc.attrMult;
      }
      for (const k of this.SPECIAL_ATTRS) {
        const base = k === "CHC" ? this._range(build.meta, "CHC")[0] : 0;
        const val = (build.special || {})[k] ?? base;
        for (let i = base + 1; i <= val; i++) sum += i * kc.attrMult;
      }
      for (const s of build.skills || []) {
        sum += this.karmaForSkill(s.val || 0, kc.skillMult);
        sum += (s.specs || []).length * kc.specialization;
      }
      for (const g of build.groups || []) sum += this.karmaForSkill(g.val || 0, kc.groupMult);
      for (const k of build.knowledges || []) sum += this.karmaForSkill(k.val || 1, kc.knowledgeMult);
      sum += (build.spells || []).length * kc.spell;
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
      };
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
       VALIDATION — la checklist de création du livre (p.102)
       ============================================================ */
    stepErrors(build) {
      const out = { concept: [], priorites: [], modules: [], attrs: [], skills: [], gear: [], contacts: [] };
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
        knowledges: (build.knowledges || []).map((k) => k.name || k),
        spells: build.spells || [],
        equip: (build.gear || []).map((g) => g.name),
        awakened: build.awakened || null,
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
