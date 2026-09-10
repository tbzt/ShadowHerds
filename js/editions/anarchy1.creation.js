"use strict";

/* ============================================================
   ANARCHY 1re ÉDITION — BARÈME DE CRÉATION DE PERSONNAGE JOUABLE
   ------------------------------------------------------------
   Source : « sran_01_anarchy_web_v1a.pdf », « Récapitulatif de création de
   personnage » p.78 (PDF 80), lu À L'IMAGE le 2026-09-09 — les trois colonnes
   Ganger / Runner / Runner d'élite sortent entrelacées au pdftotext.

   Barème pur, isolé pour rester corrigeable — même parti que
   anarchy2.creation.js, sr5.creation.js et sr6.creation.js.

   ⚠ ANARCHY 1 N'EST PAS ANARCHY 2. Quatre différences que le contrat ne doit
   pas aplatir :

   1. **Les métatypes donnent des BONUS PLATS**, pas des fourchettes min/max.
      La V2 fait l'inverse (p.52 : « pas de bonus plats, seulement des bornes
      qui varient »). Et ces bonus débordent les attributs : l'humain gagne
      +1 point de compétence, le troll en perd 1 et gagne +3 d'Armure.
   2. **On ne paie rien en nuyens.** Tout se répartit en points — attributs,
      compétences, Atouts — et le niveau de jeu fixe les trois enveloppes.
      La V2, elle, crée en nuyens (375 000 ¥ pour un runner).
   3. **Six répliques**, contre quatre en V2. Cinq mots-clés et quatre
      comportements de part et d'autre, mais pas les répliques.
   4. **L'armure est un CHOIX qui déplace des points de compétence** :
      légère 6 rend +1 point, lourde 12 en coûte 1. Rien de tel en V2.

   ⚠ Ne pas confondre avec `EditionAnarchy1.metaMod`, qui sert le générateur
   de PNJ : il applique un CHC −1 aux non-humains que le livre n'imprime pas
   à la création, et ignore les points de compétence comme l'Armure du troll —
   il ne peut donc pas servir ici.
   ============================================================ */
import { EditionAnarchy1 } from "./anarchy1.js";
import { TraitsAnarchy1 } from "./anarchy1.traits.js";
import { SkillCatalog } from "../rules/skillcatalog.js";
import { Utils } from "../core/utils.js";

Object.assign(EditionAnarchy1, {
  creation: {
    /* ============================================================
       NIVEAUX DE JEU (p.78) — les trois enveloppes de points
       ============================================================ */
    gameLevels: {
      ganger: { label: "Ganger", edgePoints: 6, attrPoints: 12, skillPoints: 10, contacts: 1, weapons: 1, gear: 3, skillCap: 5 },
      runner: { label: "Runner", edgePoints: 10, attrPoints: 16, skillPoints: 12, contacts: 2, weapons: 2, gear: 4, skillCap: 5 },
      elite: { label: "Runner d'élite", edgePoints: 14, attrPoints: 20, skillPoints: 14, contacts: 3, weapons: 3, gear: 5, skillCap: 6 },
    },

    /** Attributs répartis à l'étape 4. La Chance est exclue : « La Chance
        n'est pas augmentée à cette étape » (p.78) — elle ne monte qu'en
        dépensant des points d'Atouts, 1 pour 1. */
    ATTRS: ["FOR", "AGI", "VOL", "LOG", "CHA"],

    /* ============================================================
       MÉTATYPES (p.78) — bonus PLATS, et pas seulement sur les attributs
       ============================================================ */
    metatypes: {
      Humain: { attrs: { CHC: +1 }, skillPoints: +1, armor: 0 },
      Elfe: { attrs: { AGI: +1, CHA: +1 }, skillPoints: 0, armor: 0 },
      Nain: { attrs: { FOR: +1, VOL: +1 }, skillPoints: 0, armor: 0 },
      Ork: { attrs: { FOR: +2 }, skillPoints: 0, armor: 0 },
      Troll: { attrs: { FOR: +2 }, skillPoints: -1, armor: +3 },
    },

    /* ============================================================
       MÉTAVARIANTES — supplément « Anarchistes », p.81-91 (PDF 83-93)
       Chaque bloc « CRÉATION D'UN … » a été lu À L'IMAGE : trois pages
       portent deux encadrés côte à côte et le pdftotext les interverti — il
       donnait la ligne du Fomori au Géant, celle du Menehune au Hobgobelin,
       et vidait le Nocturna au profit du Xapiri thëpë.

       Chaque métavariante impose un ATOUT OBLIGATOIRE à un niveau donné.
       Niveau 0 = gratuit ; au-delà, il consomme des points d'Atouts sur
       l'enveloppe du niveau de jeu — c'est une contrainte de création, pas
       une décoration.

       ⚠ Le Koborokuru figure dans la table des indices maximums (p.88) mais
       n'a PAS de bloc de création dans ce supplément : il n'est donc pas
       proposé ici.
       ============================================================ */
    metavariants: {
      Dryade: { souche: "Elfe", attrs: { CHA: +2 }, skillPoints: 0, armor: 0, edge: { nom: "Dryade", niveau: 1 } },
      Nocturna: { souche: "Elfe", attrs: { AGI: +1, CHA: +1 }, skillPoints: 0, armor: 0, edge: { nom: "Nocturna", niveau: 0 } },
      Wakyambi: { souche: "Elfe", attrs: { AGI: +1, CHA: +1 }, skillPoints: 0, armor: 0, edge: { nom: "Wakyambi", niveau: 2 } },
      "Xapiri thëpë": { souche: "Elfe", attrs: { AGI: +1, CHA: +1 }, skillPoints: 0, armor: 0, edge: { nom: "Xapiri thëpë", niveau: 0 } },
      Nartaki: { souche: "Humain", attrs: { CHC: +1 }, skillPoints: +1, armor: 0, edge: { nom: "Nartaki", niveau: 1 } },
      Gnome: { souche: "Nain", attrs: { VOL: +1, LOG: +1 }, skillPoints: 0, armor: 0, edge: { nom: "Gnome", niveau: 1 } },
      Hanuman: { souche: "Nain", attrs: { FOR: +1, AGI: +1 }, skillPoints: 0, armor: 0, edge: { nom: "Hanuman", niveau: 2 } },
      Menehune: { souche: "Nain", attrs: { FOR: +1, AGI: +1 }, skillPoints: 0, armor: 0, edge: { nom: "Menehune", niveau: 1 } },
      Hobgobelin: { souche: "Ork", attrs: { FOR: +2 }, skillPoints: 0, armor: 0, edge: { nom: "Hobgobelin", niveau: 1 } },
      Ogre: { souche: "Ork", attrs: { FOR: +2 }, skillPoints: 0, armor: 0, edge: { nom: "Ogre", niveau: 1 } },
      Oni: { souche: "Ork", attrs: { FOR: +1, CHA: +1 }, skillPoints: 0, armor: 0, edge: { nom: "Oni", niveau: 1 } },
      Satyre: { souche: "Ork", attrs: { FOR: +1, AGI: +1 }, skillPoints: 0, armor: 0, edge: { nom: "Satyre", niveau: 2 } },
      Cyclope: { souche: "Troll", attrs: { FOR: +3 }, skillPoints: -1, armor: 0, edge: { nom: "Cyclope", niveau: 0 } },
      Fomori: { souche: "Troll", attrs: { FOR: +2 }, skillPoints: 0, armor: 0, edge: { nom: "Fomori", niveau: 1 } },
      "Géant": { souche: "Troll", attrs: { FOR: +2 }, skillPoints: -1, armor: +3, edge: { nom: "Géant", niveau: 0 } },
      Minotaure: { souche: "Troll", attrs: { FOR: +3 }, skillPoints: -1, armor: 0, edge: { nom: "Minotaure", niveau: 2 } },
    },

    /** Indices maximums par métatype (« Anarchistes » p.88, lue à l'image).
        Le livre de base ne donne pas ce plafond par métatype ; sans lui, un
        cyclope et une dryade auraient la même limite de Force. */
    attrMax: {
      Elfe: { FOR: 6, AGI: 7, VOL: 6, LOG: 6, CHA: 8, CHC: 6 },
      Dryade: { FOR: 5, AGI: 7, VOL: 6, LOG: 6, CHA: 8, CHC: 6 },
      Nocturna: { FOR: 5, AGI: 8, VOL: 6, LOG: 6, CHA: 7, CHC: 6 },
      Wakyambi: { FOR: 6, AGI: 7, VOL: 6, LOG: 6, CHA: 6, CHC: 6 },
      "Xapiri thëpë": { FOR: 6, AGI: 7, VOL: 6, LOG: 6, CHA: 7, CHC: 6 },
      Humain: { FOR: 6, AGI: 6, VOL: 6, LOG: 6, CHA: 6, CHC: 7 },
      Nartaki: { FOR: 6, AGI: 6, VOL: 6, LOG: 6, CHA: 6, CHC: 7 },
      Nain: { FOR: 8, AGI: 6, VOL: 7, LOG: 6, CHA: 6, CHC: 6 },
      Gnome: { FOR: 4, AGI: 7, VOL: 7, LOG: 7, CHA: 6, CHC: 6 },
      Hanuman: { FOR: 7, AGI: 7, VOL: 6, LOG: 6, CHA: 5, CHC: 6 },
      Menehune: { FOR: 7, AGI: 7, VOL: 6, LOG: 6, CHA: 6, CHC: 6 },
      Ork: { FOR: 8, AGI: 6, VOL: 6, LOG: 6, CHA: 5, CHC: 6 },
      Hobgobelin: { FOR: 7, AGI: 6, VOL: 6, LOG: 7, CHA: 5, CHC: 6 },
      Ogre: { FOR: 8, AGI: 6, VOL: 7, LOG: 6, CHA: 4, CHC: 6 },
      Oni: { FOR: 7, AGI: 7, VOL: 6, LOG: 5, CHA: 7, CHC: 6 },
      Satyre: { FOR: 7, AGI: 7, VOL: 6, LOG: 6, CHA: 5, CHC: 6 },
      Troll: { FOR: 10, AGI: 5, VOL: 6, LOG: 5, CHA: 4, CHC: 6 },
      Cyclope: { FOR: 11, AGI: 5, VOL: 6, LOG: 4, CHA: 4, CHC: 6 },
      Fomori: { FOR: 9, AGI: 5, VOL: 6, LOG: 5, CHA: 5, CHC: 6 },
      "Géant": { FOR: 10, AGI: 5, VOL: 6, LOG: 5, CHA: 4, CHC: 6 },
      Minotaure: { FOR: 11, AGI: 5, VOL: 6, LOG: 5, CHA: 4, CHC: 6 },
    },

    /** Fusionne souches et métavariantes : c'est la liste du sélecteur. */
    allMetatypes() {
      const out = { ...this.metatypes };
      for (const [nom, d] of Object.entries(this.metavariants)) out[nom] = d;
      return out;
    },

    metaEntry(meta) {
      return this.metavariants[meta] || this.metatypes[meta] || null;
    },

    /* ============================================================
       ARMURE (p.78, étape 9) — un choix qui DÉPLACE des points
       ============================================================ */
    armors: {
      legere: { label: "Armure légère", armor: 6, skillPoints: +1 },
      moyenne: { label: "Armure moyenne", armor: 9, skillPoints: 0 },
      lourde: { label: "Armure lourde", armor: 12, skillPoints: -1 },
    },

    /* ---- Constantes du livre (p.78) ---- */
    MAX_SKILLS: 5,
    SKILL_MIN: 1,
    MAX_EDGES: 6,
    SPEC_COST: 1, // 1 point de compétence, la compétence doit être d'indice ≥ 2
    SPEC_MIN_RANK: 2,
    KEYWORDS: 5,
    BEHAVIORS: 4,
    QUOTES: 6, // ⚠ six en V1, quatre en V2
    TRAITS_POSITIVE: 2,
    TRAITS_NEGATIVE: 1,

    /** Ce que les points d'Atouts achètent en plus des Atouts (p.78). */
    edgeSpends: {
      awakened: 2, // Éveillé ou Émergé
      contactsPer: { cost: 1, gain: 2 },
      weaponsPer: { cost: 1, gain: 2 },
      luckPer: { cost: 1, gain: 1 },
    },

    /** Plafonds que les Atouts ne peuvent dépasser, quel que soit leur
        nombre ou leur combinaison (p.78). Le contrat les EXPOSE plutôt que de
        les appliquer : ils portent sur des effets narratifs que l'assistant ne
        calcule pas, mais que le meneur doit voir. */
    edgeCaps: {
      dice: 3,
      rerollFailures: 3,
      rerollEnemySuccesses: 3,
      armor: 9,
    },

    /* ============================================================
       CONTRAT LU PAR CHARGEN
       ============================================================ */
    steps: [
      { id: "concept", kind: "concept", label: "Concept" },
      { id: "attrs", kind: "attrs", label: "Attributs" },
      { id: "skills", kind: "skills_a1", label: "Compétences" },
      { id: "edges", kind: "edges_a1", label: "Atouts" },
      { id: "gear", kind: "gear_a1", label: "Équipement" },
      { id: "traits", kind: "traits_a1", label: "Traits" },
      { id: "narrative", kind: "narrative", label: "Narratif" },
      { id: "contacts", kind: "contacts", label: "Contacts" },
      { id: "review", kind: "review", label: "Révision" },
    ],

    newBuild() {
      return {
        gameLevel: "runner",
        meta: "Humain",
        gender: "NB",
        name: "",
        awakened: null,
        armor: "moyenne",
        attrs: { FOR: 1, AGI: 1, VOL: 1, LOG: 1, CHA: 1 },
        luck: 0, // Chance achetée en points d'Atouts
        skills: [],
        knowledges: [],
        edges: [],
        weapons: [],
        gear: [],
        extraContacts: 0,
        extraWeapons: 0,
        keywords: ["", "", "", "", ""],
        behaviors: ["", "", "", ""],
        quotes: ["", "", "", "", "", ""], // six en V1
        lifestyle: "",
        contacts: [],
        notes: "",
      };
    },

    /* ---- Totaux, corrigés par le métatype ET par l'armure ---- */
    level(build) {
      return this.gameLevels[build.gameLevel] || this.gameLevels.runner;
    },

    /** Points de compétence : l'enveloppe du niveau, plus le bonus de
        métatype (humain +1, troll −1), plus celui de l'armure (légère +1,
        lourde −1). C'est la seule enveloppe que deux autres choix déplacent. */
    skillPointsTotal(build) {
      const m = this.metaEntry(build.meta) || {};
      const a = this.armors[build.armor] || {};
      return this.level(build).skillPoints + (m.skillPoints || 0) + (a.skillPoints || 0);
    },

    skillPointsUsed(build) {
      return (build.skills || []).reduce(
        (sum, s) => sum + (s.val || 0) + (s.specs || []).length * this.SPEC_COST,
        0,
      );
    },

    attrPointsTotal(build) {
      return this.level(build).attrPoints;
    },

    /** Comptés DEPUIS 1, le score de départ de chaque attribut — le bonus de
        métatype est offert et ne coûte pas de point (p.78). Ni comme la V2
        (depuis 0), ni comme SR5 (depuis l'indice du métatype). */
    attrPointsUsed(build) {
      return this.ATTRS.reduce((sum, k) => sum + Math.max(0, ((build.attrs || {})[k] ?? 1) - 1), 0);
    },

    edgePointsTotal(build) {
      return this.level(build).edgePoints;
    },

    /** Les points d'Atouts paient les Atouts eux-mêmes ET quatre achats
        annexes : l'Éveil, la Chance, les contacts et les armes en plus. */
    edgePointsUsed(build) {
      const sp = this.edgeSpends;
      let n = (build.edges || []).reduce((a, e) => a + (e.level || 1), 0);
      // L'Atout obligatoire d'une métavariante consomme des points dès qu'il
      // est de niveau 1 ou plus (« Anarchistes ») — au niveau 0 il est offert.
      const mv = this.metavariants[build.meta];
      if (mv && mv.edge) n += mv.edge.niveau || 0;
      if (build.awakened) n += sp.awakened;
      n += (build.luck || 0) * sp.luckPer.cost;
      n += Math.ceil((build.extraContacts || 0) / sp.contactsPer.gain) * sp.contactsPer.cost;
      n += Math.ceil((build.extraWeapons || 0) / sp.weaponsPer.gain) * sp.weaponsPer.cost;
      return n;
    },

    contactsTotal(build) {
      return this.level(build).contacts + (build.extraContacts || 0);
    },
    weaponsTotal(build) {
      return this.level(build).weapons + (build.extraWeapons || 0);
    },

    /** Armure finale : celle du choix, plus le +3 du troll. */
    armorTotal(build) {
      const a = this.armors[build.armor] || {};
      const m = this.metaEntry(build.meta) || {};
      return (a.armor || 0) + (m.armor || 0);
    },

    /** Valeur d'un attribut, bonus de métatype compris. */
    attrValue(build, key) {
      const base = (build.attrs || {})[key] ?? 1;
      const bonus = (this.metaEntry(build.meta)?.attrs || {})[key] || 0;
      return base + bonus;
    },

    /** La Chance ne se répartit pas : elle part du bonus de métatype et ne
        monte qu'en points d'Atouts (p.78). */
    luckValue(build) {
      return 1 + ((this.metaEntry(build.meta)?.attrs || {}).CHC || 0) + (build.luck || 0);
    },

    conceptFields(build) {
      const lvl = this.level(build);
      return [
        { path: "name", label: "Nom", type: "text", placeholder: "Nom du personnage" },
        {
          path: "gameLevel",
          label: "Niveau de jeu",
          type: "select",
          options: Object.entries(this.gameLevels).map(([v, o]) => ({
            value: v,
            label: `${o.label} — ${o.attrPoints} attributs, ${o.skillPoints} compétences, ${o.edgePoints} Atouts`,
          })),
        },
        {
          path: "meta",
          label: "Métatype",
          type: "select",
          options: Object.entries(this.allMetatypes()).map(([m, d]) => {
            const bits = Object.entries(d.attrs).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`);
            if (d.skillPoints) bits.push(`${d.skillPoints > 0 ? "+" : ""}${d.skillPoints} pt de compétence`);
            if (d.armor) bits.push(`Armure +${d.armor}`);
            if (d.edge) bits.push(`Atout ${d.edge.nom} niv. ${d.edge.niveau}`);
            return { value: m, label: `${m}${d.souche ? ` (${d.souche})` : ""} — ${bits.join(", ")}` };
          }),
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
        {
          path: "awakened",
          label: `Éveillé ou Émergé (coûte ${this.edgeSpends.awakened} points d'Atouts)`,
          type: "select",
          emptyIsNull: true,
          options: [
            { value: "", label: "Aucun" },
            { value: "hermétique", label: "Hermétique" },
            { value: "chamanique", label: "Chamanique" },
            { value: "adepte", label: "Adepte" },
            { value: "technomancien", label: "Technomancien (Émergé)" },
          ],
        },
        {
          path: "_capsNote",
          label: `Quels que soient vos Atouts, leurs modificateurs plafonnent à ±${this.edgeCaps.dice} dés, ${this.edgeCaps.rerollFailures} relances d'échecs, ${this.edgeCaps.rerollEnemySuccesses} relances de réussites adverses et ${this.edgeCaps.armor} points d'Armure.`,
          type: "note",
        },
        {
          path: "_levelNote",
          label: `Ce niveau donne ${lvl.contacts} contact(s), ${lvl.weapons} arme(s) et ${lvl.gear} pièce(s) d'équipement.`,
          type: "note",
        },
      ];
    },

    budget(build) {
      const lvl = this.level(build);
      const e = this.edgePointsUsed(build);
      return {
        headline: {
          label: `${lvl.label} — Atouts ${e} / ${lvl.edgePoints}`,
          used: e,
          total: lvl.edgePoints,
          over: e > lvl.edgePoints,
        },
        cells: [
          { label: "Attributs", used: this.attrPointsUsed(build), total: this.attrPointsTotal(build) },
          { label: "Compétences", used: this.skillPointsUsed(build), total: this.skillPointsTotal(build) },
          { label: "Armure", used: this.armorTotal(build), total: null },
        ],
      };
    },

    attrsStep(build) {
      const specs = this.ATTRS.map((key) => {
        const bonus = (this.metaEntry(build.meta)?.attrs || {})[key] || 0;
        return {
          key,
          min: 1,
          max: this.attrRangeFor(build, key)[1],
          note: bonus ? `${build.meta} ${bonus > 0 ? "+" : ""}${bonus} → ${this.attrValue(build, key)}` : "",
        };
      });
      const used = this.attrPointsUsed(build);
      const total = this.attrPointsTotal(build);
      return {
        hint: `Chaque attribut part de 1, puis on répartit ${total} points (p.78). Le bonus de métatype est OFFERT et ne coûte rien. La Chance ne se répartit pas ici : elle vaut ${this.luckValue(build)} et ne monte qu'en dépensant des points d'Atouts, un pour un.`,
        groups: [{ used, total, specs }],
        footer: `Points utilisés : ${used} / ${total}`,
      };
    },

    /** Bornes réelles : le maximum vient de la table du supplément (p.88),
        pas d'un 6 uniforme — un cyclope monte à 11 en Force, une dryade
        plafonne à 5. Sans elle, les deux auraient la même limite. */
    attrRangeFor(build, key) {
      const max = (this.attrMax[build.meta] || this.attrMax.Humain)[key] || 6;
      return key === "CHC" ? [0, max] : [1, max];
    },

    /** Catalogue de compétences : source unique `SkillCatalog.anarchy1`. */
    skillCatalog() {
      return Object.entries(SkillCatalog.anarchy1).map(([name, attr]) => ({ name, attr }));
    },

    edgeCatalog() {
      return EditionAnarchy1.edgeCatalog();
    },

    /* ---- Traits (p.70-71) ----
       ⚠ Anarchy ne TARIFE PAS ses traits : la règle est un COMPTE, pas un
       budget — deux Avantages et un Défaut. Ne pas y plaquer le karma de SR5
       ni de SR6, qui n'existe pas ici.

       ⚠ Le livre invite à en inventer : « Vous pouvez choisir vos Traits
       depuis la liste suivante, parmi ceux des personnages prétirés ou créer
       les vôtres. » Le catalogue SUGGÈRE, il ne ferme pas — l'écran garde la
       saisie libre, comme pour les Atouts. */
    traitCatalog() {
      const par = { avantage: [], defaut: [] };
      for (const t of TraitsAnarchy1) {
        par[t.type].push({ id: t.id, label: t.nom, detail: t.effet });
      }
      return [
        { category: `Avantages (${this.TRAITS_POSITIVE} à choisir)`, items: par.avantage },
        { category: `Défauts (${this.TRAITS_NEGATIVE} à choisir)`, items: par.defaut },
      ];
    },

    traitById(id) {
      return TraitsAnarchy1.find((t) => t.id === id) || null;
    },

    /** Le compte, par type — c'est la seule contrainte du livre. */
    traitState(build) {
      let av = 0, de = 0;
      for (const t of build.traits || []) {
        const ref = this.traitById(t.id);
        const type = ref ? ref.type : t.type;
        if (type === "defaut") de++; else av++;
      }
      return { avantages: av, defauts: de, maxAvantages: this.TRAITS_POSITIVE, maxDefauts: this.TRAITS_NEGATIVE };
    },

    contactFields() {
      return [
        { key: "name", placeholder: "Nom" },
        { key: "description", placeholder: "Description (rôle, lien…)" },
      ];
    },
    contactsHint(build) {
      return `Ce niveau donne ${this.level(build).contacts} contact(s) ; chaque point d'Atouts en achète ${this.edgeSpends.contactsPer.gain} de plus. Total autorisé : ${this.contactsTotal(build)}.`;
    },
    contactToManual(c) {
      return { name: c.name, role: c.description || "", level: 1, rr: 1 };
    },

    cleanBuild(b) {
      return {
        ...b,
        keywords: (b.keywords || []).map((s) => s.trim()).filter(Boolean),
        behaviors: (b.behaviors || []).map((s) => s.trim()).filter(Boolean),
        quotes: (b.quotes || []).map((s) => s.trim()).filter(Boolean),
        knowledges: (b.knowledges || []).map((s) => s.trim()).filter(Boolean),
        contacts: (b.contacts || []).filter((c) => c && c.name && c.name.trim()),
      };
    },

    /* ============================================================
       VALIDATION (p.78)
       ============================================================ */
    stepErrors(build) {
      const out = { concept: [], attrs: [], skills: [], edges: [], gear: [], traits: [], contacts: [] };
      const lvl = this.level(build);
      if (!this.metaEntry(build.meta)) {
        out.concept.push("Métatype inconnu.");
        return out;
      }

      const aU = this.attrPointsUsed(build);
      const aT = this.attrPointsTotal(build);
      if (aU > aT) out.attrs.push(`Trop de points d'attributs (${aU}/${aT}).`);
      if (aU < aT) out.attrs.push(`Tous les points d'attribut doivent être répartis (${aU}/${aT}).`);

      const sU = this.skillPointsUsed(build);
      const sT = this.skillPointsTotal(build);
      if (sU > sT) out.skills.push(`Trop de points de compétences (${sU}/${sT}).`);
      if ((build.skills || []).length > this.MAX_SKILLS) {
        out.skills.push(`${this.MAX_SKILLS} compétences au maximum (${build.skills.length} choisies).`);
      }
      for (const s of build.skills || []) {
        if ((s.val || 0) < this.SKILL_MIN) out.skills.push(`${s.name} : indice minimum ${this.SKILL_MIN}.`);
        if ((s.val || 0) > lvl.skillCap) {
          out.skills.push(`${s.name} dépasse l'indice maximum du niveau ${lvl.label} (${lvl.skillCap}).`);
        }
        // « une unique Spécialisation », et la compétence doit être d'indice 2.
        if ((s.specs || []).length > 1) out.skills.push(`${s.name} : une seule spécialisation par personnage.`);
        if ((s.specs || []).length && (s.val || 0) < this.SPEC_MIN_RANK) {
          out.skills.push(`${s.name} : une spécialisation exige un indice ${this.SPEC_MIN_RANK} minimum.`);
        }
      }
      const totalSpecs = (build.skills || []).reduce((n, s) => n + (s.specs || []).length, 0);
      if (totalSpecs > 1) out.skills.push("Une seule spécialisation pour tout le personnage (p.78).");

      const eU = this.edgePointsUsed(build);
      if (eU > lvl.edgePoints) out.edges.push(`Trop de points d'Atouts (${eU}/${lvl.edgePoints}).`);
      if ((build.edges || []).length > this.MAX_EDGES) {
        out.edges.push(`${this.MAX_EDGES} Atouts au maximum (${build.edges.length} choisis).`);
      }

      const armesMax = this.weaponsTotal(build);
      if ((build.weapons || []).length > armesMax) {
        out.gear.push(`${armesMax} arme(s) autorisée(s) à ce niveau (${build.weapons.length} choisies).`);
      }
      if ((build.gear || []).length > lvl.gear) {
        out.gear.push(`${lvl.gear} pièce(s) d'équipement autorisée(s) (${build.gear.length} choisies).`);
      }
      const contactsMax = this.contactsTotal(build);
      if ((build.contacts || []).length > contactsMax) {
        out.contacts.push(`${contactsMax} contact(s) autorisé(s) (${build.contacts.length} saisis).`);
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
      for (const k of this.ATTRS) attrs[k] = this.attrValue(build, k);
      attrs.CHC = this.luckValue(build);

      const skills = (build.skills || []).map((s) => {
        const attr = s.attr || SkillCatalog.anarchy1[s.name] || "LOG";
        const spec = (s.specs || [])[0];
        return {
          name: s.name,
          val: s.val || 0,
          attr,
          spec: spec || undefined,
          specVal: spec ? (s.val || 0) + 2 : undefined,
          specAttr: spec ? attr : undefined,
        };
      });

      // Moniteurs A1 (p.58) : 8 + Force/2 et 8 + Volonté/2, arrondis au
      // supérieur — cf. EditionAnarchy1.conditionMonitor.
      const physMon = 8 + Math.ceil(attrs.FOR / 2);
      const stunMon = 8 + Math.ceil(attrs.VOL / 2);

      return {
        id: Utils.uid(),
        edition: "anarchy1",
        isPC: true,
        name: build.name && build.name.trim() ? build.name.trim() : Utils.genName(),
        meta: build.meta,
        gender: build.gender || "NB",
        tier: this.level(build).label,
        archetype: (build.concept || "").trim() || "Personnage",
        gameLevel: build.gameLevel,
        attrs,
        armor: this.armorTotal(build),
        skills,
        knowledges: [...(build.knowledges || [])],
        edges: (build.edges || []).map((e) => e.text),
        chosenEdges: (build.edges || []).map((e) => e.text),
        weapons: (build.weapons || []).map((w) => ({ name: w.name })),
        equip: [...(build.gear || [])],
        awakened: build.awakened || null,
        threatLevel: "forte",
        physMon,
        stunMon,
        physFilled: 0,
        stunFilled: 0,
        keywords: build.keywords || [],
        behaviors: build.behaviors || [],
        quotes: build.quotes || [],
        lifestyle: build.lifestyle || "",
        contacts: build.contacts || [],
        notes: build.notes || "",
      };
    },
  },
});
