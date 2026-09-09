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
import { EditionSR6 } from "./sr6.js";
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
        wip: true,
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
      out.push(
        { id: "attrs", kind: "attrs", label: "Attributs" },
        { id: "skills", kind: "skills_sr6", label: "Compétences" },
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
        awakened: "",
        priorities: { meta: "D", attrs: "B", skills: "A", magic: "E", nuyen: "C" },
        attrs: {},
        special: { ATO: 1, MAG: 0, RES: 0 },
        skills: [],
        knowledges: [],
        spells: [],
        gear: [],
        contacts: [],
        pcNuyen: 0, // PC investis en ressources (méthode par points)
        notes: "",
      };
    },

    /** Bornes lues sur `EditionSR6.attrRange` — la table du livre p.67, déjà
        dans l'app et vérifiée cellule par cellule. Une seule source. */
    _range(meta, key) {
      const r = EditionSR6.attrRange[meta] || EditionSR6.attrRange.Humain;
      return r[key] || [1, 6];
    },

    _metaList() {
      return Object.keys(EditionSR6.attrRange);
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
      return this.priorityTable[build.priorities.meta]?.adjust || 0;
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
      return (build.gear || []).reduce((sum, g) => sum + (Number(g.cost) || 0), 0);
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
      // En création par points, la catégorie d'Éveil s'achète (10 PC) et fixe
      // l'indice de départ ; en priorités elle découle de la colonne Magie.
      if (fam === "pc") {
        fields.push({
          path: "awakened",
          label: "Éveillé ou Émergé (10 PC)",
          type: "select",
          options: [{ value: "", label: "Ordinaire (0 PC)" }].concat(
            Object.entries(this.awakenedStart).map(([v, a]) => ({
              value: v,
              label: `${a.label} — ${a.attr} ${a.start} au départ`,
            })),
          ),
        });
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
        cell(colKey, L) {
          const row = self.priorityTable[L];
          if (colKey === "meta") {
            const ok = row.metas.includes(build.meta);
            return {
              html: ok ? `${build.meta} (${row.adjust})` : "—",
              title: ok
                ? `${row.adjust} point(s) d'ajustement`
                : `${build.meta} indisponible en ${L} — le livre n'ouvre A qu'aux Nain/Ork/Troll et B qu'à eux plus l'Elfe`,
              invalid: !ok,
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

    skillCatalog() {
      return this.SKILLS.map((s) => ({ ...s }));
    },

    /** Noms canoniques empruntés au module SR6 (catalogue nominatif, sans
        prix — il alimente le générateur de PNJ). Le joueur saisit le prix
        lu au livre, comme en SR5. */
    gearCatalog() {
      const cat = EditionSR6.equipCatalog() || [];
      return cat.map((it) => ({ label: it.label || it.name || String(it) }));
    },

    gearLimits(build) {
      return {
        availability: this.ILLEGAL_AVAILABILITY_CAP - 1,
        hint: `À la création, pas de matériel illégal de Disponibilité ${this.ILLEGAL_AVAILABILITY_CAP} ou plus (p.69). Il ne doit rester au plus ${this.CASH_MAX.toLocaleString("fr-FR")} ¥ en liquide.`,
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

    cleanBuild(b) {
      return {
        ...b,
        knowledges: (b.knowledges || []).filter((k) => k && String(k.name || "").trim()),
        gear: (b.gear || []).filter((g) => g && String(g.name || "").trim()),
        contacts: (b.contacts || []).filter((c) => c && c.name && c.name.trim()),
      };
    },

    /* ============================================================
       VALIDATION (core p.66-69)
       ============================================================ */
    stepErrors(build) {
      const out = { concept: [], priorites: [], attrs: [], skills: [], gear: [], contacts: [] };
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
        const row = this.priorityTable[build.priorities.meta];
        if (row && !row.metas.includes(build.meta)) {
          out.priorites.push(
            `${build.meta} n'est pas disponible en priorité ${build.priorities.meta} (Métatypes).`,
          );
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
      const aUsed = this.attrPointsUsed(build);
      const aTotal = this.attrPointsTotal(build);
      if (aUsed > aTotal) out.attrs.push(`Trop de points d'attributs (${aUsed}/${aTotal}).`);
      const adjUsed = this.adjustPointsUsed(build);
      const adjTotal = this.adjustPointsTotal(build);
      if (adjUsed > adjTotal) out.attrs.push(`Trop de points d'ajustement (${adjUsed}/${adjTotal}).`);

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
      const attrs = {};
      for (const k of this.ATTRS) attrs[k] = (build.attrs || {})[k] ?? 1;
      const sp = build.special || {};
      attrs.ATO = sp.ATO ?? 1;
      if (sp.MAG) attrs.MAG = sp.MAG;
      if (sp.RES) attrs.RES = sp.RES;
      attrs.ESS = 6;

      const skills = (build.skills || []).map((s) => {
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
        archetype: this.methods[build.method]?.label || "Personnage",
        creationMethod: build.method,
        priorities: { ...build.priorities },
        attrs,
        skills,
        knowledges: (build.knowledges || []).map((k) => k.name || k),
        spells: build.spells || [],
        equip: (build.gear || []).map((g) => g.name),
        awakened: build.awakened || null,
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
