"use strict";

/* ============================================================
   SKILL EFFECTS — bonus de POOL d'objet sur un jet de COMPÉTENCE
   nommée (refonte du modèle d'acteur).

   Pendant « compétence » de WeaponEffects (scopé à un jet d'arme) et
   d'ActorEffects (modificateur situationnel affiché, jamais appliqué) :
   ici on collecte les effets d'objet qui ajoutent des dés à la réserve
   d'un test de COMPÉTENCE existant sur la carte (Modulateur vocal →
   Imposture, Synthécarde → groupe Athlétisme…). Contrairement à
   ActorEffects, ces bonus SONT cuits dans le pool cliquable de la puce
   de compétence (`_skillsSection`), avec leur source affichée — vraie
   motorisation N2, même vocabulaire `{value, source}` que les `Mod`.

   Un effet déclare :
     { match, skills?|knowledge?, perRating?|value, conditional?, source, page }
   - match       : RegExp sur le libellé de l'item porté (equip/augs).
   - skills      : liste LITTÉRALE de noms de compétences ACTIVES visées.
                   Pour un « groupe » SR5 (qui n'a pas de puce dédiée), on
                   liste ses membres exacts transcrits du livre (Canon,
                   jamais une supposition — comme `perRating`). Consommé par
                   forSkill(pnj, skillName).
   - knowledge   : true = bonus qui s'applique à TOUTES les connaissances
                   (Connaissances/langues/mémoire), pas à une compétence
                   nommée. Consommé par forKnowledge(pnj). Exclusif de
                   `skills`.
   - perRating[] : table LITTÉRALE du livre indexée par l'indice ; sinon
                   `value` fixe.
   - conditional : (pnj) => bool, optionnel (ex. sans-fil requis).
   - source/page : provenance affichée + audit de collecte.

   NEUTRE PAR ÉDITION (interdit n°1) : le scoping se fait par le nom de
   compétence propre à la taxonomie d'une édition (« Imposture » n'existe
   qu'en SR5 ; SR6 = « Escroquerie ») — pas de branche `App.edition`.
   Le CATALOG se peuple item par item sans toucher ce moteur.
   ============================================================ */
import { ItemResolver } from "./itemresolver.js";

export const SkillEffects = {
  CATALOG: [
    // SR5 p.455 : « l'indice du modulateur est ajouté à la réserve de
    // dés pour les tests d'Imposture ». Une seule compétence, sans
    // ambiguïté de groupe.
    {
      match: /modulateur vocal/i,
      skills: ["Imposture"],
      perRating: [null, 1, 2, 3, 4, 5, 6],
      source: "Modulateur vocal",
      page: "SR5 p.455",
    },
    // SR5 p.464 : Synthécarde « ajoute son indice à la réserve de dés des
    // tests du groupe Athlétisme ». SR5 ne stocke pas les noms de groupe :
    // on liste les membres du groupe Athlétisme (Gymnastique, Course,
    // Natation) transcrits du livre.
    {
      match: /synthécarde/i,
      skills: ["Gymnastique", "Course", "Natation"],
      perRating: [null, 1, 2, 3],
      source: "Synthécarde",
      page: "SR5 p.464",
    },
    // SR5 p.464 : Amélioration mnémonique « ajoute son indice aux tests de
    // compétences de Connaissances, langues, tests liés à la mémoire ».
    // S'applique à TOUTES les connaissances → `knowledge:true` (pas une
    // compétence active nommée). Le volet Limite mentale est déjà motorisé
    // à part (BonusEngine, tranche 1) — facette distincte, pas de doublon.
    {
      match: /amélioration mnémonique/i,
      knowledge: true,
      perRating: [null, 1, 2, 3],
      source: "Amélioration mnémonique",
      page: "SR5 p.464",
    },
    // SR5 p.463 : Phéromones optimisées « ajoute l'indice aux tests des
    // groupes Comédie et Influence (si la cible perçoit le personnage) ».
    // Membres des deux groupes transcrits du livre (section Compétences
    // sociales) : Comédie = Escroquerie/Imposture/Représentation ;
    // Influence = Étiquette/Leadership/Négociation. Le volet Limite sociale
    // est déjà motorisé à part (BonusEngine, tranche 1) — facette distincte.
    // LIMITE ASSUMÉE : la condition « si la cible perçoit le personnage »
    // n'est pas modélisable (pas d'état-cible au jet) → bonus baké, la source
    // affichée laisse le MJ l'écarter si la cible ne peut pas percevoir/sentir
    // le PNJ (cohérent avec le baking conditionnel de WeaponEffects/Modulateur).
    {
      match: /phéromones optimisées/i,
      skills: [
        "Escroquerie",
        "Imposture",
        "Représentation",
        "Étiquette",
        "Leadership",
        "Négociation",
      ],
      perRating: [null, 1, 2, 3],
      source: "Phéromones optimisées",
      page: "SR5 p.463",
    },
    // --- Foci magiques (SR5 p.318) — motorisation du slot `focus` du
    // générateur. Un focus « lié » ajoute son indice à la réserve de dés du
    // test magique visé. Consommé par la puce de compétence de la carte ET
    // par Magic.actionPool (jet réel d'incantation/invocation), qui lit
    // SkillEffects. Skills = noms SR5 (l'entrée SR6 viendra avec
    // « Sorcellerie »/« Conjuration » — forSkill filtre par nom exact, donc
    // pas de contamination croisée).
    {
      match: /focus d'incantation/i,
      skills: ["Lancement de sorts"],
      perRating: [null, 1, 2, 3, 4, 5, 6],
      source: "Focus d'incantation",
      page: "SR5 p.318",
    },
    {
      match: /focus de contresort/i,
      skills: ["Contresort"],
      perRating: [null, 1, 2, 3, 4, 5, 6],
      source: "Focus de contresort",
      page: "SR5 p.318",
    },
    {
      match: /(focus|fétiche) de conjuration/i,
      skills: ["Invocation"],
      perRating: [null, 1, 2, 3, 4, 5, 6],
      source: "Focus de conjuration",
      page: "SR5 p.318",
    },
    {
      // Focus de puissance : ajoute son indice à TOUTE action magique
      // (lancement, invocation, contresort).
      match: /focus de puissance/i,
      skills: ["Lancement de sorts", "Invocation", "Contresort"],
      perRating: [null, 1, 2, 3, 4, 5, 6],
      source: "Focus de puissance",
      page: "SR5 p.318",
    },
    // SR6 p.157 : « Focus de pouvoir » — terme distinct de « Focus de
    // puissance » (SR5), regex disjointe, pas de contamination croisée.
    // SR6 n'a pas de compétence Contresort séparée (Sorcellerie/Conjuration/
    // Astral seulement) ; le livre décrit le focus de pouvoir comme
    // contribuant à « tout test utilisant la Magie » — scope limité aux deux
    // actions réellement motorisées par Magic.actionPool.
    {
      match: /focus de pouvoir/i,
      skills: ["Sorcellerie", "Conjuration"],
      perRating: [null, 1, 2, 3, 4, 5, 6],
      source: "Focus de pouvoir",
      page: "SR6 p.157",
    },
  ],

  /** Résout la valeur à l'indice d'un item porteur, ou null si l'objet
      n'est pas porté / condition non remplie / indice non résolu. Facteur
      commun de forSkill et forKnowledge. */
  _resolve(pnj, entry, items) {
    const carrier = items.find((it) => entry.match.test(ItemResolver.itemStr(it)));
    if (!carrier) return null;
    if (entry.conditional && !entry.conditional(pnj)) return null;
    let value = entry.value;
    if (entry.perRating) {
      const r = ItemResolver.itemRating(carrier);
      if (r == null) return null; // indice non choisi → inactif
      value = entry.perRating[r];
    }
    return value || null;
  },

  /** Contributions de pool portées par les objets du PNJ pour une
      compétence ACTIVE nommée → [{value, source}]. Neutre par édition.
      Tolérant items chaîne/objet. Liste vide si rien ne s'applique. */
  forSkill(pnj, skillName) {
    if (!pnj || !skillName) return [];
    const name = String(skillName).toLowerCase();
    const items = [...(pnj.equip || []), ...(pnj.augs || [])];
    const out = [];
    for (const e of this.CATALOG) {
      if (!e.skills || !e.skills.some((s) => s.toLowerCase() === name)) continue;
      const value = this._resolve(pnj, e, items);
      if (value) out.push({ value, source: e.source });
    }
    return out;
  },

  /** Contributions de pool applicables à TOUTE connaissance (Amélioration
      mnémonique…) → [{value, source}]. Blanket : même bonus pour chaque
      puce de la section Connaissances. */
  forKnowledge(pnj) {
    if (!pnj) return [];
    const items = [...(pnj.equip || []), ...(pnj.augs || [])];
    const out = [];
    for (const e of this.CATALOG) {
      if (!e.knowledge) continue;
      const value = this._resolve(pnj, e, items);
      if (value) out.push({ value, source: e.source });
    }
    return out;
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.SkillEffects = SkillEffects;
