"use strict";

/* ============================================================
   SPRITES COMPILÉS — fiches liées créées depuis un PNJ
   technomancien (carte sœur de js/catalogs/spirits.js).

   Le sprite est au technomancien ce que l'esprit est au mage,
   MAIS c'est une ENTITÉ MATRICIELLE, pas un corps physique :
   ses attributs sont les 4 matriciels (Attaque / Corruption /
   Traitement de données / Firewall, mêmes clés que le persona
   incarné — cf. resonance.js), pas FOR/AGI/… Le rendu de carte
   (T3b) réutilisera donc PersonaRenderer, jamais `_bodySR5`.

   Vocabulaire distinct de l'invocation (arbitrage Canon) :
   « Compiler » (pas « Invoquer »), « Niveau » (pas « Puissance »),
   « tâches » (pas « services »), « inscrire »/« décompiler ».

   Sources (REFERENCE/effects/technomanciens/INDEX.md, vérifié) :
   - SR5 p.261 : 5 types, attrs matriciels relatifs au Niveau N,
     Init (N×2)+X + 4D6, moniteur matriciel ⌊N/2⌋+8, RES = N.
   - SR6 p.195 : MÊMES chiffres que SR5 ligne pour ligne, seules
     les compétences changent (Électronique/Piratage) ; +5 types
     (Hacker vaillant p.77). Durée (N×2) h sauf inscrit ; plafond
     RES inscrits + 1 non inscrit.
   - Anarchy 1 p.199 : 3 paliers (Mineur/Normal/Majeur), stats
     génériques LOG-centrées, moniteur 9/10/11, 4 types = un Atout
     au choix (bonus 2/3/4 par palier). Compilation = test opposé
     6/8/12 dés (mineur/standard/majeur), un seul sprite à la fois,
     8 h max. Firewall = Logique.
   ============================================================ */
import { Utils } from "../core/utils.js";

export const Sprites = {
  /* ---- SR5/SR6 : 5 types du cœur. `mods` = décalage des 4 attributs
     matriciels par rapport au Niveau N (clés persona : attack/sleaze/
     dataProcessing/firewall). `initMod` s'ajoute à (N×2). Compétences
     par édition (SR5 nomme Informatique/Guerre électronique/Hacking/
     Matériel électronique ; SR6 Électronique/Piratage/Ingénierie) —
     stockées côté type, l'édition choisit sa clé via spriteModel. ---- */
  SR_TYPES: {
    coursier: {
      label: "Sprite coursier",
      mods: { attack: 0, sleaze: 3, dataProcessing: 1, firewall: 2 },
      initMod: 1,
      skillsSR5: ["Informatique", "Hacking"],
      skillsSR6: ["Électronique", "Piratage"],
      powers: ["Cookie", "Hachage"],
    },
    cracker: {
      label: "Sprite cracker",
      mods: { attack: 0, sleaze: 3, dataProcessing: 2, firewall: 1 },
      initMod: 2,
      skillsSR5: ["Informatique", "Guerre électronique", "Hacking"],
      skillsSR6: ["Électronique", "Piratage"],
      powers: ["Suppression"],
    },
    donnees: {
      label: "Sprite de données",
      mods: { attack: -1, sleaze: 0, dataProcessing: 4, firewall: 1 },
      initMod: 4,
      skillsSR5: ["Informatique", "Guerre électronique"],
      skillsSR6: ["Électronique", "Piratage"],
      powers: ["Masquage", "Watermark"],
    },
    erreur: {
      label: "Sprite d'erreur",
      mods: { attack: 3, sleaze: 0, dataProcessing: 1, firewall: 2 },
      initMod: 1,
      skillsSR5: ["Informatique", "Guerre électronique", "Hacking"],
      skillsSR6: ["Électronique", "Piratage"],
      powers: ["Tempête d'électrons"],
    },
    machine: {
      label: "Sprite machine",
      mods: { attack: 1, sleaze: 0, dataProcessing: 3, firewall: 2 },
      initMod: 3,
      skillsSR5: ["Informatique", "Guerre électronique", "Matériel électronique"],
      skillsSR6: ["Électronique", "Ingénierie"],
      powers: ["Diagnostic", "Gremlins", "Stabilité"],
    },
  },

  /* ---- SR6 seulement : +5 types (Hacker vaillant p.77). Mêmes clés que
     SR_TYPES ; `skillsSR6` uniquement (n'existent pas en SR5). ---- */
  SR6_TYPES: {
    assassin: {
      label: "Sprite assassin",
      mods: { attack: 3, sleaze: 2, dataProcessing: 1, firewall: 0 },
      initMod: 1,
      skillsSR6: ["Électronique", "Piratage"],
      powers: ["Marque de mort", "Fantôme"],
    },
    musical: {
      label: "Sprite musical",
      mods: { attack: 0, sleaze: 0, dataProcessing: 4, firewall: 0 },
      initMod: 4,
      resMod: 1,
      skillsSR6: ["Électronique", "Escroquerie (Représentation)"],
      powers: ["Fascination", "Harmonie"],
    },
    polyvalent: {
      label: "Sprite polyvalent",
      mods: { attack: 1, sleaze: 2, dataProcessing: 1, firewall: 2 },
      initMod: 1,
      skillsSR6: ["Électronique", "Ingénierie", "Piratage"],
      powers: ["Pouvoir de sprite au choix"],
    },
    primal: {
      label: "Sprite primal",
      mods: { attack: 3, sleaze: 1, dataProcessing: 3, firewall: 1 },
      initMod: 3,
      resMod: 1,
      skillsSR6: ["Électronique", "Piratage"],
      powers: ["Rugissement numérique", "Rêve fractal"],
      special: "Ajoute toujours le dé libre ; un 1 dessus → le sprite désobéit (2 tâches pour le remettre en ligne).",
    },
    protecteur: {
      label: "Sprite protecteur",
      mods: { attack: 0, sleaze: 1, dataProcessing: 2, firewall: 3 },
      initMod: 2,
      skillsSR6: ["Électronique", "Piratage"],
      powers: ["Égide", "Stabilité"],
    },
  },

  /* ---- Anarchy 1re (p.199) : 3 paliers, stats génériques (triplets
     [mineur, normal, majeur]). Le « type » est un Atout au choix dont le
     bonus vaut le palier (2/3/4). Firewall = Logique (pas d'attribut
     matriciel séparé au livre A1). ---- */
  ANARCHY1_TIERS: ["Mineur", "Normal", "Majeur"],
  ANARCHY1_THREAT: ["Figurant", "Antagoniste", "Terreur"],
  ANARCHY1_STATS: {
    log: [3, 5, 7],
    chc: [1, 2, 2],
    defense: [6, 10, 14],
    skill: [6, 8, 10], // Hacking / Pistage / Technomancie (3 + Logique)
    weaponVd: [2, 3, 4], // Cybercombat, dommages Étourdissants
    monitor: [9, 10, 11],
    typeBonus: [2, 3, 4],
  },
  /** 4 types du cœur A1 (Atout au choix). `edge(ti)` construit l'effet
      avec le bonus mis à l'échelle du palier. Anarchistes en ajoute 6 —
      hors périmètre du cœur, comme les formes complexes `gen:false`. */
  ANARCHY1_TYPES: {
    coursier: {
      label: "Coursier",
      edge: (n) => `Coursier : ${n} relance(s) pour les tests de Pistage.`,
    },
    cracker: {
      label: "Cracker",
      edge: (n) => `Cracker : +${n} dés pour les tests de Hacking (hors cybercombat).`,
    },
    erreur: {
      label: "Erreur",
      edge: (n) => `Erreur : la cible relance ${n} succès sur ses tests d'Arme à feu, matriciels ou de pilotage.`,
    },
    machine: {
      label: "Machine",
      edge: (n) => `Machine : la cible gagne une résistance aux dommages de ${n} contre les dommages matriciels.`,
    },
  },

  /** Types de sprite disponibles pour l'édition (lu par le rail T3b). */
  typesFor(edition) {
    return App.getEditionModule(edition).spriteModel.types();
  },

  /** Le PNJ peut-il compiler des sprites ? Marqueur d'Émergence, réutilisé
      du contrat `arcaneLock` (RES > 0 en SR5/SR6, compétence Technomancie
      en Anarchy 1) : `arcaneLock(pnj,"resonance") === null` signifie
      exactement « émergé ». A2 sans spriteModel → jamais. */
  canCompile(pnj) {
    if (!pnj || pnj.type) return false;
    const ed = App.getEditionModule(pnj.edition);
    if (!ed.spriteModel) return false;
    return ed.arcaneLock(pnj, "resonance") === null;
  },

  /** T6c (SR6 p.195) — technomanciens exposés par leurs sprites déployés : à la
      Convergence, la position physique du compilateur d'un sprite en jeu est
      révélée. Renvoie les {id,name} uniques des propriétaires de sprites
      déployés (pool + biblio). Lu par le bandeau de convergence de l'intrusion. */
  deployedOwners() {
    const pools = [Gen.pool || [], Shadows.data ? Shadows.data.all : []];
    const seen = new Set();
    const out = [];
    for (const pool of pools)
      for (const e of pool)
        if (e && e.type === "sprite" && e.deployed !== false && e.ownerId && !seen.has(e.ownerId)) {
          seen.add(e.ownerId);
          out.push({ id: e.ownerId, name: e.ownerName || "Technomancien" });
        }
    return out;
  },

  /** Sprites actuellement liés à un compilateur (mêmes 2 copies que les
      esprits : pool de génération + bibliothèque). */
  linkedTo(ownerId) {
    const pools = [Gen.pool || [], Shadows.data ? Shadows.data.all : []];
    const out = [];
    for (const pool of pools) {
      for (const e of pool) {
        if (e.type === "sprite" && e.ownerId === ownerId) out.push(e);
      }
    }
    return out;
  },

  /* ---- Compilation ----
     `owner` peut être null (sprite libre généré depuis le générateur) :
     passer alors opts.edition. Dispatch par régime du spriteModel
     (« sr » = Niveau + attrs matriciels ; « anarchy1 » = paliers), jamais
     une branche `App.edition`. Un régime tiers exposerait son propre
     `spriteModel.spawn` (même hook que Spirits). ---- */
  spawn(owner, typeKey, opts = {}) {
    const edition = owner ? owner.edition : opts.edition;
    const model = App.getEditionModule(edition)?.spriteModel;
    if (!model) return null;
    if (model.spawn) return model.spawn(owner, typeKey, opts);
    return model.regime === "anarchy1"
      ? this._spawnAnarchy1(owner, typeKey, opts)
      : this._spawnSR(owner, typeKey, opts);
  },

  _spawnSR(owner, typeKey, opts) {
    const edition = owner ? owner.edition : opts.edition;
    const model = App.getEditionModule(edition).spriteModel;
    const t = model.types()[typeKey];
    if (!t) return null;
    const N = Utils.clamp(
      opts.level || (owner ? Actor.attr(owner, "RES") : 0) || 4,
      1,
      12,
    );

    // 4 attributs matriciels = Niveau + décalage du type (plancher 1),
    // mêmes clés que le persona incarné (attack/sleaze/dataProcessing/firewall).
    const matrix = {};
    for (const [k, mod] of Object.entries(t.mods)) matrix[k] = Math.max(1, N + mod);

    // Compétences au rang N ; nom selon l'édition (spriteModel.skillKey).
    const skillNames = t[model.skillKey] || t.skillsSR6 || [];
    const skills = skillNames.map((name) => ({ name, val: N }));

    const free = !owner;
    const sprite = {
      id: Utils.uid(),
      type: "sprite",
      regime: "sr",
      edition,
      spriteType: typeKey,
      registered: false, // inscrit (permanent) vs non inscrit (éphémère) — SR6 p.195
      free,
      name: free ? `${t.label} libre` : t.label,
      ownerId: owner ? owner.id : null,
      ownerName: owner ? owner.name || "Technomancien" : null,
      level: N,
      tasks: free ? 0 : Utils.clamp(opts.tasks ?? 3, 1, 12), // « services » côté esprit
      tasksUsed: 0,
      meta: "Sprite",
      gender: "NB",
      archetype: `${t.label} (Niveau ${N})`,
      matrix,
      matrixMonitor: Math.floor(N / 2) + 8, // moniteur matriciel (INDEX §sprites)
      matFilled: 0, // moniteur matriciel (fieldMap UI.toggleMonitor: type "mat")
      skills,
      powers: t.powers.map((p) => ({ name: p })),
      initBase: N * 2 + (t.initMod || 0),
      initDice: 4, // sprites : 4D6 (SR5 p.261 / SR6 p.195)
      resonance: N + (t.resMod || 0),
      special: t.special || null,
      notes: "",
      deployed: true,
    };
    if (free) {
      sprite.powers.push({ name: "Sprite libre", desc: "Non compilé : agit selon sa propre volonté." });
    }
    return sprite;
  },

  _spawnAnarchy1(owner, typeKey, opts) {
    const S = this.ANARCHY1_STATS;
    const type = this.ANARCHY1_TYPES[typeKey];
    if (!type) return null;
    const ti = Utils.clamp(opts.tier ?? 0, 0, 2); // 0 Mineur / 1 Normal / 2 Majeur
    const at = (arr) => arr[ti];
    const tierLabel = this.ANARCHY1_TIERS[ti];
    const log = at(S.log);
    const sk = at(S.skill);
    const free = !owner;

    return {
      id: Utils.uid(),
      type: "sprite",
      regime: "anarchy1",
      edition: owner ? owner.edition : opts.edition,
      spriteType: typeKey,
      registered: false,
      free,
      name: free ? `${type.label} libre` : `Sprite ${type.label.toLowerCase()}`,
      ownerId: owner ? owner.id : null,
      ownerName: owner ? owner.name || "Technomancien" : null,
      tier: tierLabel,
      tierIndex: ti,
      threatLevel: this.ANARCHY1_THREAT[ti],
      meta: "Sprite",
      gender: "NB",
      archetype: `Sprite ${type.label.toLowerCase()} (${tierLabel})`,
      // Anarchy 1 : entité LOG-centrée, Firewall = Logique (pas de 4 attrs
      // matriciels au livre). `attrs` porte LOG/CHC, comme un mini-PNJ A1.
      attrs: { LOG: log, CHC: at(S.chc) },
      defense: at(S.defense),
      firewall: log, // Firewall du sprite = Logique (A1 p.164)
      skills: [
        { name: "Hacking", val: sk, attr: "LOG" },
        { name: "Pistage", val: sk, attr: "LOG" },
        { name: "Technomancie", val: sk, attr: "LOG" },
      ],
      weapons: [{ name: "Cybercombat", vd: at(S.weaponVd), dmgType: "E", ranges: "[OK/–/–/–]" }],
      edges: [type.edge(at(S.typeBonus))],
      matrixMonitor: at(S.monitor),
      matFilled: 0, // moniteur matriciel (fieldMap UI.toggleMonitor: type "mat")
      initDice: 2,
      notes: "",
      deployed: true,
    };
  },
};

// Pont couche 3b (migration modules ES) — retiré en fin de migration.
window.Sprites = Sprites;
