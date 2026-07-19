"use strict";

/* ============================================================
   ESPRITS INVOQUÉS — fiches liées créées depuis un PNJ
   conjurateur (carte sœur, même socle que js/vehicles.js).

   Les esprits sont façonnés comme des PNJ standards de leur
   édition (attrs, skills, moniteurs) : les corps de carte
   existants (_bodySR5/_bodySR6/_bodyAnarchy) les rendent tels
   quels — jets, malus de blessure, RR compris. Seuls le header
   (« lié à »), le footer (services + Congédier) et le panneau
   d'invocation leur sont propres.

   Sources :
   - SR5 p.303-310 : attributs = Puissance ± modificateur par
     type, Init (P×2±X) + 2D6, moniteurs standards.
   - SR6 p.223-225 : mêmes modificateurs, moniteur (P/2)+8.
   - Anarchy 2.0 p.262-265 : paliers Inférieur/Normal/Supérieur,
     Immunité aux armes normales (Armure 3/4/5), seuils armes
     normales/magiques, VD mains nues = FOR.
   ============================================================ */
import { Utils } from "../core/utils.js";

export const Spirits = {
  /* ---- SR5/SR6 : modificateurs d'attributs par type (± Puissance) ---- */
  SR_TYPES: {
    air: {
      label: "Esprit de l'air",
      mods: { CON: -2, AGI: 3, REA: 4, FOR: -3, VOL: 0, LOG: 0, INT: 0, CHA: 0 },
      initMod: 4,
      skills: [["Combat à mains nues", "AGI"], ["Perception", "INT"], ["Combat astral", "VOL"], ["Vol", "AGI"]],
      powers: ["Accident", "Confusion", "Conscience", "Dissimulation", "Engloutissement", "Forme astrale", "Matérialisation", "Mouvement", "Recherche"],
      special: "Sprint : +10 m par succès",
    },
    betes: {
      label: "Esprit des bêtes",
      mods: { CON: 2, AGI: 1, REA: 0, FOR: 2, VOL: 0, LOG: 0, INT: 0, CHA: 0 },
      initMod: 0,
      skills: [["Combat à mains nues", "AGI"], ["Perception", "INT"], ["Combat astral", "VOL"], ["Course", "FOR"]],
      powers: ["Contrôle animal", "Conscience", "Forme astrale", "Matérialisation", "Mouvement", "Peur", "Sens améliorés (ouïe, odorat, vision nocturne)"],
      special: null,
    },
    eau: {
      label: "Esprit de l'eau",
      mods: { CON: 0, AGI: 1, REA: 2, FOR: 0, VOL: 0, LOG: 0, INT: 0, CHA: 1 },
      initMod: 2,
      skills: [["Combat à mains nues", "AGI"], ["Perception", "INT"], ["Combat astral", "VOL"], ["Natation", "AGI"]],
      powers: ["Confusion", "Conscience", "Dissimulation", "Engloutissement", "Forme astrale", "Matérialisation", "Mouvement", "Recherche"],
      weakness: "Allergie (Feu, Grave)",
      special: "Vitesse ×2 dans l'eau",
    },
    feu: {
      label: "Esprit du feu",
      mods: { CON: 1, AGI: 2, REA: 3, FOR: -2, VOL: 0, LOG: 0, INT: 1, CHA: 0 },
      initMod: 3,
      skills: [["Combat à mains nues", "AGI"], ["Perception", "INT"], ["Combat astral", "VOL"], ["Arme exotique (Attaque élémentaire)", "AGI"]],
      powers: ["Accident", "Attaque élémentaire (Feu)", "Aura d'énergie", "Confusion", "Conscience", "Engloutissement", "Forme astrale", "Matérialisation"],
      weakness: "Allergie (Eau, Grave)",
      special: "Sprint : +5 m par succès",
    },
    homme: {
      label: "Esprit de l'homme",
      mods: { CON: 1, AGI: 0, REA: 2, FOR: -2, VOL: 0, LOG: 0, INT: 1, CHA: 0 },
      initMod: 2,
      skills: [["Combat à mains nues", "AGI"], ["Perception", "INT"], ["Combat astral", "VOL"], ["Lancement de sorts", "MAG"]],
      powers: ["Accident", "Confusion", "Conscience", "Dissimulation", "Forme astrale", "Garde", "Influence", "Matérialisation", "Sens améliorés", "Recherche"],
      special: null,
    },
    terre: {
      label: "Esprit de la terre",
      mods: { CON: 4, AGI: -2, REA: -1, FOR: 4, VOL: 0, LOG: -1, INT: 0, CHA: 0 },
      initMod: -1,
      skills: [["Combat à mains nues", "AGI"], ["Perception", "INT"], ["Combat astral", "VOL"]],
      powers: ["Collage", "Conscience", "Forme astrale", "Garde", "Matérialisation", "Mouvement", "Recherche"],
      special: null,
    },
  },

  /* ---- Anarchy 2.0 (p.262-265) : paliers Inférieur/Normal/Supérieur.
     Attributs et compétences en triplets [inf, norm, sup].
     VD mains nues = FOR ; Immunité = Armure 3/4/5 vs armes normales.
     Seuils : phys (armes normales) = FOR+Armure / +3 / +6,
     phys (armes magiques) = FOR / +3 / +6, mentaux = VOL / +3 / +6. ---- */
  ANARCHY_TYPES: {
    aines: {
      label: "Esprit des aînés",
      attrs: { FOR: [2, 3, 4], AGI: [2, 3, 4], VOL: [4, 5, 6], LOG: [3, 4, 5], CHA: [2, 3, 4] },
      skills: [
        { name: "Athlétisme", val: [2, 3, 4], attr: "FOR" },
        { name: "Combat rapproché", val: [2, 3, 4], attr: "AGI" },
        { name: "Furtivité", val: [2, 3, 4], attr: "AGI" },
        { name: "Survie", val: [3, 4, 5], attr: "LOG" },
        { name: "Perception", val: [3, 4, 5], attr: "LOG" },
        { name: "Sorcellerie", val: [3, 5, 7], attr: "VOL", rr: [0, 1, 2] },
        { name: "Influence", val: [2, 3, 4], attr: "CHA", spec: "Intimidation", specVal: [2, 3, 4], specAttr: "CHA" },
      ],
      edges: [
        "Sort inné (pouvoir) : RR 0/1/2 aux tests de Sorcellerie ; un sort au choix de l'invocateur",
        "Pouvoirs au choix (1/2/2) : Accident, Confusion, Peur, Psychokinésie, Sort inné, Recherche",
      ],
    },
    betes: {
      label: "Esprit des bêtes",
      attrs: { FOR: [3, 4, 5], AGI: [3, 4, 5], VOL: [3, 4, 5], LOG: [2, 3, 4], CHA: [2, 3, 4] },
      skills: [
        { name: "Athlétisme", val: [3, 4, 5], attr: "FOR" },
        { name: "Combat rapproché", val: [3, 4, 5], attr: "AGI", spec: "Griffes et crocs", specVal: [3, 4, 5], specAttr: "AGI" },
        { name: "Furtivité", val: [3, 4, 5], attr: "AGI" },
        { name: "Survie", val: [2, 3, 4], attr: "LOG" },
        { name: "Perception", val: [2, 3, 4], attr: "LOG" },
        { name: "Influence", val: [2, 3, 4], attr: "CHA", spec: "Intimidation", specVal: [3, 4, 5], specAttr: "CHA" },
      ],
      edges: [
        "Griffes acérées (pouvoir) : VD +1/+2/+3 en mêlée",
        "Pouvoirs au choix (1/2/2) : Fureur, Peur, Contrôle animal, Recherche, Venin",
      ],
      weapons: [{ name: "Griffes et crocs", vd: [4, 6, 8], ranges: "[OK/–/–/–]" }],
    },
    plantes: {
      label: "Esprit des plantes",
      attrs: { FOR: [3, 4, 5], AGI: [2, 3, 4], VOL: [4, 5, 6], LOG: [2, 3, 4], CHA: [2, 3, 4] },
      skills: [
        { name: "Athlétisme", val: [3, 4, 5], attr: "FOR" },
        { name: "Combat rapproché", val: [2, 3, 4], attr: "AGI" },
        { name: "Furtivité", val: [3, 4, 5], attr: "AGI" },
        { name: "Survie", val: [3, 4, 5], attr: "LOG" },
        { name: "Perception", val: [2, 3, 4], attr: "LOG" },
      ],
      edges: [
        "Mouvement (pouvoir) : ×/÷ 2/3/4 la vitesse d'une créature ou d'un véhicule sur terrain végétal",
        "Pouvoirs au choix (1/2/2) : Accident, Dissimulation, Enchevêtrement",
      ],
    },
    air: {
      label: "Esprit de l'air",
      attrs: { FOR: [1, 2, 3], AGI: [5, 6, 7], VOL: [3, 4, 5], LOG: [2, 3, 4], CHA: [2, 3, 4] },
      skills: [
        { name: "Athlétisme", val: [2, 3, 4], attr: "FOR" },
        { name: "Armes à distance", val: [3, 4, 5], attr: "AGI", spec: "Attaque élémentaire", specVal: [3, 5, 7], specAttr: "AGI", specRR: [0, 1, 2] },
        { name: "Combat rapproché", val: [3, 4, 5], attr: "AGI" },
        { name: "Furtivité", val: [3, 4, 5], attr: "AGI" },
        { name: "Survie", val: [2, 3, 4], attr: "LOG" },
        { name: "Perception", val: [2, 3, 4], attr: "LOG" },
      ],
      edges: [
        "Mouvement (pouvoir) : ×/÷ 2/3/4 la vitesse sur terrain aérien",
        "Pouvoirs au choix (1/2/2) : Vitesse surnaturelle, Psychokinésie, Attaque élémentaire (froid/électricité), Aura, Engloutissement",
      ],
      weapons: [{ name: "Attaque élémentaire", vd: [4, 5, 6], ranges: "[OK/OK/Dés./–]" }],
    },
    eau: {
      label: "Esprit de l'eau",
      attrs: { FOR: [2, 3, 4], AGI: [3, 4, 5], VOL: [2, 3, 4], LOG: [2, 3, 4], CHA: [3, 4, 5] },
      skills: [
        { name: "Athlétisme", val: [2, 3, 4], attr: "FOR" },
        { name: "Armes à distance", val: [3, 4, 5], attr: "AGI", spec: "Attaque élémentaire", specVal: [3, 5, 7], specAttr: "AGI", specRR: [0, 1, 2] },
        { name: "Combat rapproché", val: [3, 4, 5], attr: "AGI" },
        { name: "Furtivité", val: [3, 4, 5], attr: "AGI" },
        { name: "Survie", val: [2, 3, 4], attr: "LOG" },
        { name: "Perception", val: [2, 3, 4], attr: "LOG" },
      ],
      edges: [
        "Engloutissement (pouvoir) : RR 0/1/2 aux tests de Combat rapproché ; VD +2/+2/+3 en mêlée",
        "Pouvoirs au choix (1/2/2) : Dissimulation, Attaque élémentaire d'eau, Mouvement",
      ],
      weapons: [{ name: "Attaque élémentaire d'eau", vd: [4, 5, 6], ranges: "[OK/OK/Dés./–]" }],
    },
    feu: {
      label: "Esprit du feu",
      attrs: { FOR: [2, 3, 4], AGI: [4, 5, 6], VOL: [3, 4, 5], LOG: [2, 3, 4], CHA: [2, 3, 4] },
      skills: [
        { name: "Athlétisme", val: [2, 3, 4], attr: "FOR" },
        { name: "Armes à distance", val: [3, 4, 5], attr: "AGI", spec: "Attaque élémentaire", specVal: [3, 5, 7], specAttr: "AGI", specRR: [0, 1, 2] },
        { name: "Combat rapproché", val: [3, 4, 5], attr: "AGI" },
        { name: "Survie", val: [2, 3, 4], attr: "LOG" },
        { name: "Perception", val: [2, 3, 4], attr: "LOG" },
        { name: "Influence", val: [2, 3, 4], attr: "CHA", spec: "Intimidation", specVal: [2, 3, 4], specAttr: "CHA" },
      ],
      edges: [
        "Attaque élémentaire de feu (pouvoir) : RR 0/1/2 aux tests d'Armes à distance",
        "Pouvoirs au choix (1/2/2) : Aura de feu, Engloutissement, Peur",
      ],
      weapons: [{ name: "Attaque élémentaire de feu", vd: [4, 5, 6], ranges: "[OK/OK/Dés./–]" }],
    },
    terre: {
      label: "Esprit de la terre",
      attrs: { FOR: [4, 5, 6], AGI: [2, 3, 4], VOL: [3, 4, 5], LOG: [2, 3, 4], CHA: [2, 3, 4] },
      skills: [
        { name: "Athlétisme", val: [3, 4, 5], attr: "FOR" },
        { name: "Armes à distance", val: [2, 3, 4], attr: "AGI", spec: "Attaque élémentaire", specVal: [2, 4, 6], specAttr: "AGI", specRR: [0, 1, 2] },
        { name: "Combat rapproché", val: [2, 3, 4], attr: "AGI" },
        { name: "Furtivité", val: [2, 3, 4], attr: "AGI" },
        { name: "Survie", val: [2, 3, 4], attr: "LOG" },
        { name: "Perception", val: [2, 3, 4], attr: "LOG" },
      ],
      edges: [
        "Mouvement (pouvoir) : ×/÷ 2/3/4 la vitesse sur terrain terrestre",
        "Pouvoirs au choix (1/2/2) : Attaque élémentaire de terre, Confusion, Engloutissement, Solidité",
      ],
      weapons: [{ name: "Attaque élémentaire de terre", vd: [5, 6, 7], ranges: "[OK/OK/Dés./–]" }],
    },
  },

  ANARCHY_TIERS: ["Inférieur", "Normal", "Supérieur"],

  /* ---- Anarchy 1re édition (statblocks §ESPRITS, base p.191-198) ----
     6 types × 3 puissances (mineur/normal/majeur), triplets [min,norm,maj]
     comme ANARCHY_TYPES. `skills` = indice fixe (l'attribut lié scale avec
     la puissance, cf. patron commun p.198). `edgeOptionsFor(ti)` construit
     les Atouts au choix avec leurs valeurs mises à l'échelle de la
     puissance ; `fixedEdgeFor(ti)` l'Atout élémentaire toujours présent
     (absent pour Air, dont l'attaque élémentaire fait partie du choix).
     Bêtes normal/majeur : non confirmés en source (à confirmer p.198) —
     extrapolés depuis le pas uniforme (+2/+2/+2/
     +2/+2/+1 attrs, +4 DÉF, +1/+1 P/E) observé sur les 5 autres types. */
  ANARCHY1_TYPES: {
    air: {
      label: "Esprit de l'air",
      attrs: { FOR: [1, 3, 5], AGI: [7, 9, 11], VOL: [3, 5, 7], LOG: [3, 5, 7], CHA: [3, 5, 7], CHC: [1, 2, 3] },
      defense: [10, 14, 18],
      physMon: [9, 10, 11],
      stunMon: [10, 11, 12],
      armor: 0,
      skills: [
        { name: "Armes à projectiles", val: 3, attr: "AGI" },
        { name: "Combat astral", val: 3, attr: "VOL" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Sorcellerie", val: 3, attr: "VOL" },
      ],
      edgeOptionsFor(ti) {
        const p = (v) => v[ti];
        return [
          `Attaque élémentaire électricité (${p([4, 6, 8])}P/CA, Déf AGI+LOG)`,
          `Attaque élémentaire froid (${p([4, 6, 8])}E/CA, +2 Armure)`,
          "Aura de froid",
          `Confusion (−${p([1, 2, 3])} dé)`,
          `Engloutissement (${p([2, 4, 6])}E/CA, immobilise)`,
          "Psychokinésie",
          "Recherche",
        ];
      },
    },
    eau: {
      label: "Esprit de l'eau",
      attrs: { FOR: [3, 5, 7], AGI: [5, 7, 9], VOL: [3, 5, 7], LOG: [3, 5, 7], CHA: [3, 5, 7], CHC: [1, 2, 3] },
      defense: [8, 12, 16],
      physMon: [10, 11, 12],
      stunMon: [10, 11, 12],
      armor: 0,
      skills: [
        { name: "Armes à projectiles", val: 3, attr: "AGI" },
        { name: "Combat astral", val: 3, attr: "VOL" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Sorcellerie", val: 3, attr: "VOL" },
      ],
      fixedEdgeFor(ti) {
        return `Attaque élémentaire eau (${[5, 7, 9][ti]}E, Déf AGI+LOG, immobilise)`;
      },
      edgeOptionsFor() {
        return ["Collage (cible à mi-vitesse)", "Dissimulation (relance Furtivité)", "Engloutissement", "Mouvement", "Recherche"];
      },
    },
    feu: {
      label: "Esprit du feu",
      attrs: { FOR: [3, 5, 7], AGI: [5, 7, 9], VOL: [3, 5, 7], LOG: [3, 5, 7], CHA: [3, 5, 7], CHC: [1, 2, 3] },
      defense: [8, 12, 16],
      physMon: [10, 11, 12],
      stunMon: [10, 11, 12],
      armor: 0,
      skills: [
        { name: "Armes à projectiles", val: 3, attr: "AGI" },
        { name: "Combat astral", val: 3, attr: "VOL" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Intimidation", val: 3, attr: "CHA" },
      ],
      fixedEdgeFor(ti) {
        return `Attaque élémentaire feu (${[4, 6, 8][ti]}P, +2 dmg à l'Armure)`;
      },
      edgeOptionsFor() {
        return ["Aura de feu", "Engloutissement (feu)", "Peur", "Recherche"];
      },
    },
    terre: {
      label: "Esprit de la terre",
      attrs: { FOR: [7, 9, 11], AGI: [1, 3, 5], VOL: [3, 5, 7], LOG: [3, 5, 7], CHA: [3, 5, 7], CHC: [1, 2, 3] },
      defense: [4, 8, 12],
      physMon: [12, 13, 14],
      stunMon: [10, 11, 12],
      armor: 6,
      skills: [
        { name: "Armes à projectiles", val: 3, attr: "AGI" },
        { name: "Combat astral", val: 3, attr: "VOL" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Sorcellerie", val: 3, attr: "VOL" },
      ],
      fixedEdgeFor(ti) {
        return `Attaque élémentaire terre (${[6, 8, 10][ti]}P, Déf AGI+LOG)`;
      },
      edgeOptionsFor() {
        return ["Collage (cible à mi-vitesse)", "Confusion", "Dissimulation", "Engloutissement", "Recherche"];
      },
    },
    homme: {
      label: "Esprit de l'homme",
      attrs: { FOR: [3, 5, 7], AGI: [4, 6, 8], VOL: [3, 5, 7], LOG: [4, 6, 8], CHA: [3, 5, 7], CHC: [1, 2, 3] },
      defense: [8, 12, 16],
      physMon: [10, 11, 12],
      stunMon: [10, 11, 12],
      armor: 0,
      skills: [
        { name: "Combat astral", val: 3, attr: "VOL" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Intimidation", val: 3, attr: "CHA" },
        { name: "Sorcellerie", val: 3, attr: "VOL" },
      ],
      fixedEdgeFor(ti) {
        return `Contrôle des pensées (+${[1, 3, 5][ti]} dés Intimidation/Négociation)`;
      },
      edgeOptionsFor() {
        return ["Accident", "Confusion", "Dissimulation", "Peur", "Psychokinésie", "Recherche"];
      },
    },
    betes: {
      label: "Esprit des bêtes",
      attrs: { FOR: [5, 7, 9], AGI: [3, 5, 7], VOL: [3, 5, 7], LOG: [3, 5, 7], CHA: [3, 5, 7], CHC: [1, 2, 3] },
      defense: [6, 10, 14],
      physMon: [11, 12, 13],
      stunMon: [10, 11, 12],
      armor: 0,
      skills: [
        { name: "Combat astral", val: 3, attr: "VOL" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Intimidation", val: 3, attr: "CHA" },
      ],
      fixedWeapon(ti, attrs) {
        return { name: "Armes naturelles (griffes/crocs/queue)", dmg: Math.ceil(attrs.FOR / 2) + 2, dmgType: "P" };
      },
      edgeOptionsFor() {
        return ["Contrôle animal", "Dissimulation", "Peur", "Recherche"];
      },
    },
  },

  typesFor(edition) {
    return App.getEditionModule(edition).spiritModel.types();
  },

  /** Le PNJ peut-il invoquer ? (compétence de conjuration, ou magicien
      non-adepte en SR5/SR6) */
  canSummon(pnj) {
    if (!pnj || pnj.type) return false;
    const hasConj = (pnj.skills || []).some((s) =>
      /conjuration|invocation/i.test(s.name || ""),
    );
    if (hasConj) return true;
    if (!App.getEditionModule(pnj.edition).spiritModel.canSummon) return false;
    if (!pnj.attrs || !pnj.attrs.MAG) return false;
    const label = `${pnj.special || ""} ${pnj.archetype || ""}`;
    return /mage|chaman|sorcier|initié/i.test(label) && !/adepte/i.test(label);
  },

  /** Esprits actuellement liés à un invocateur. */
  linkedTo(ownerId) {
    const pools = [Gen.pool || [], Shadows.data ? Shadows.data.all : []];
    const out = [];
    for (const pool of pools) {
      for (const e of pool) {
        if (e.type === "spirit" && e.ownerId === ownerId) out.push(e);
      }
    }
    return out;
  },

  /* ---- Invocation ----
     `owner` peut être null (esprit libre généré depuis le générateur) :
     passer alors opts.edition ; l'esprit n'a ni lien ni services.
     Un régime tiers (ex. Anarchy 1re, ni SR ni Anarchy 2.0) expose son
     propre `spiritModel.spawn` — hook de modèle plutôt qu'une troisième
     branche d'édition ici (cf. plan Anarchy 1re §9). */
  spawn(owner, typeKey, opts = {}) {
    const edition = owner ? owner.edition : opts.edition;
    const Mod = App.getEditionModule(edition);
    if (Mod?.spiritModel?.spawn) return Mod.spiritModel.spawn(owner, typeKey, opts);
    return Mod?.usesRiskPanel
      ? this._spawnAnarchy(owner, typeKey, opts)
      : this._spawnSR(owner, typeKey, opts);
  },

  _spawnSR(owner, typeKey, opts) {
    const t = this.SR_TYPES[typeKey];
    if (!t) return null;
    const edition = owner ? owner.edition : opts.edition;
    const P = Utils.clamp(
      opts.force || Actor.attr(owner, "MAG") || 4, 1, 12);
    const attrs = {};
    // `t.mods` utilise les clés canoniques SR5 (P1 `attributes`, ordre
    // fixe) ; `keys` retrouve le nom réel de l'attribut sur le pnj
    // (RÉA en SR6, REA sinon) en zippant avec l'ordre du module d'édition.
    const canonical = ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"];
    const real = App.getEditionModule(edition).attributes;
    const keys = {};
    canonical.forEach((k, i) => (keys[k] = real[i]));
    for (const [base, key] of Object.entries(keys)) {
      attrs[key] = Math.max(1, P + (t.mods[base] || 0));
    }
    attrs.MAG = P;
    attrs.ESS = P;

    // Les compétences d'esprit sont à l'indice P ; l'app stocke des
    // réserves complètes (attr + compétence) en SR5/SR6. _spawnSR n'est
    // jamais appelé pour Anarchy (spawn() dispatche avant), donc aucune
    // compétence n'est filtrée ici.
    const skills = t.skills.map(([name, attrBase]) => {
      const key = keys[attrBase] || attrBase;
      const av = attrBase === "MAG" ? P : attrs[key] || P;
      return { name, val: av + P };
    });

    const traits = [
      { name: "Immunité aux armes normales", desc: `Armure spéciale ${P * 2} contre les armes non magiques (Puissance × 2).` },
      { name: "Attaque à mains nues", desc: `VD ${attrs.FOR}P (Force de l'esprit).` },
    ];
    if (t.weakness) traits.push({ name: "Faiblesse", desc: t.weakness });
    if (t.special) traits.push({ name: "Spécial", desc: t.special });
    if (!owner)
      traits.push({
        name: "Esprit libre",
        desc: "Indépendant de tout invocateur ; possède sa propre volonté, une réserve de Chance (Puissance) et une formule secrète.",
      });

    const free = !owner;
    const spirit = {
      id: Utils.uid(),
      type: "spirit",
      edition,
      spiritType: typeKey,
      free,
      name: free ? `${t.label} libre` : t.label,
      ownerId: owner ? owner.id : null,
      ownerName: owner ? owner.name || "Invocateur" : null,
      force: P,
      services: free ? 0 : Utils.clamp(opts.services ?? 3, 1, 12),
      servicesUsed: 0,
      // Lié (SR5/SR6) : esprit invoqué durablement — au bannissement, ajoute la
      // Magie de l'invocateur à l'opposition (SR5 p.303). Miroir de `registered`
      // du sprite ; basculé à la main (SummonPanel.toggleBind).
      bound: false,
      meta: "Esprit",
      gender: "NB",
      archetype: `${t.label} (Puissance ${P})`,
      special: "Aucun",
      proRating: Math.min(6, P),
      attrs,
      skills,
      equip: [],
      augs: [],
      spells: [],
      powers: t.powers.map((p) => ({ name: p })),
      traits,
      notes: "",
      physFilled: 0,
      stunFilled: 0,
      initDice: 2,
      deployed: true,
    };

    const Mod = App.getEditionModule(edition);
    if (Mod && Mod.recalc) Mod.recalc(spirit);
    // Init d'esprit : (P×2 + mod) + 2D6 (SR5 p.305) ; SR6 idem simplifié.
    const initBase = P * 2 + (t.initMod || 0);
    if (edition === "sr6") {
      spirit.initBase = initBase;
      spirit.me = Mod.conditionMonitor.spiritMonitor(P); // (P/2)+8, SR6 p.224
      spirit.sdBase = P;
      spirit.pa = null;
    } else {
      spirit.init = initBase;
    }
    spirit.drainResist = null;
    return spirit;
  },

  _spawnAnarchy(owner, typeKey, opts) {
    const t = this.ANARCHY_TYPES[typeKey];
    if (!t) return null;
    const ti = Utils.clamp(opts.tier ?? 1, 0, 2); // 0 Inf / 1 Normal / 2 Sup
    const pick = (v) => (Array.isArray(v) ? v[ti] : v);

    const attrs = {};
    for (const [k, triple] of Object.entries(t.attrs)) attrs[k] = pick(triple);
    const armure = [3, 4, 5][ti]; // Immunité aux armes normales

    const skills = t.skills.map((s) => {
      const out = { name: s.name, val: pick(s.val), attr: s.attr, rr: pick(s.rr || 0) };
      if (s.spec) {
        out.spec = s.spec;
        out.specVal = pick(s.specVal);
        out.specAttr = s.specAttr || s.attr;
        out.specRR = pick(s.specRR || 0);
      }
      return out;
    });

    // `vd` est la valeur affichée/lancée (les statblocks du générateur la
    // calculent depuis vdBase+vdMeta à la génération — ici pas de métatype).
    const mkWeapon = (name, vd, ranges) => ({ name, vd, vdBase: vd, vdMeta: {}, ranges });
    const weapons = [
      mkWeapon("Mains nues", attrs.FOR, "[OK/–/–/–]"),
      mkWeapon("Combat astral", pick([2, 3, 4]), "[OK/–/–/–]"),
      ...(t.weapons || []).map((w) => mkWeapon(w.name, pick(w.vd), w.ranges)),
    ];

    const tierLabel = this.ANARCHY_TIERS[ti];
    const seuil = (base) => [base, base + 3, base + 6];
    const free = !owner;

    return {
      id: Utils.uid(),
      type: "spirit",
      edition: owner ? owner.edition : opts.edition,
      spiritType: typeKey,
      free,
      name: free ? `${t.label} libre` : t.label,
      ownerId: owner ? owner.id : null,
      ownerName: owner ? owner.name || "Invocateur" : null,
      tier: tierLabel,
      tierIndex: ti,
      threatLevel: "extrême", // « Combativité extrême », statblocks p.262-265
      services: free ? 0 : Utils.clamp(opts.services ?? 3, 1, 12),
      servicesUsed: 0,
      meta: "Esprit",
      gender: "NB",
      archetype: `${t.label} (${tierLabel})`,
      attrs,
      skills,
      weapons,
      edges: [
        `Immunité aux armes normales (pouvoir) : Armure ${armure} — seuils armes magiques ${seuil(attrs.FOR).join("/")}`,
        "Matérialisation (pouvoir) : créature astrale, peut se matérialiser (duale)",
        ...t.edges,
        ...(free
          ? ["Esprit libre : indépendant de tout invocateur, agit selon sa propre volonté"]
          : []),
      ],
      spells: [],
      equip: [],
      notes: "",
      physMonitor: seuil(attrs.FOR + armure), // seuils vs armes normales
      mentMonitor: seuil(attrs.VOL),
      matrixMonitor: null,
      legerFilled: 0,
      graveFilled: 0,
      incapFilled: 0,
      narcoUsed: 0,
      deployed: true,
    };
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Spirits = Spirits;
