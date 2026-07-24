"use strict";

/* ============================================================
   PARADIGM LENS — déroule le PARADIGME d'un serveur (sa sculpture)
   sur les aspects narrables, pour aider le MJ à improviser dans le
   thème. Leaf PUR (couche 1), sœur de FoundationGen : ne connaît ni
   le DOM, ni `App`, ni Storage, ni une édition en dur. Reçoit un
   objet Paradigme (Matrix.paradigmForSculpture(...)) OU `null`, et
   normalise deux VUES d'une même vérité (doctrine « une vérité +
   lentilles » — jamais un store parallèle) :

     • foundation(p, nodes) → face INTERNE (donjon 7 nœuds, SR5/SR6) :
       costume par nœud + variance-fiction + sens + habitants.
     • server(p)            → face EXTERNE (l'hôte dans le monde) :
       sens + vérité (ce qu'il est) + habitants.

   Chaque aspect renvoie { text, authored } : `authored:true` quand le
   contenu vient du catalogue curé (sourcé/dérivé des livres),
   `authored:false` quand c'est une AMORCE-ÉCHAFAUDAGE de repli — une
   question générique qui aide déjà le MJ sans rien inventer à sa
   place. La vue distingue les deux visuellement (l'amorce est un
   pense-bête, pas du canon). Aucun texte de repli ne prétend décrire
   le serveur : il invite le MJ à le décrire.
   ============================================================ */

/** Enrobe une valeur curée (ou son absence) en { text, authored }. */
function field(value, scaffold) {
  return value ? { text: value, authored: true } : { text: scaffold, authored: false };
}

/* Amorces de repli : génériques, valables pour TOUTE sculpture (même
   un thème maison tapé à la main), dérivées de la MÉTHODE du livre
   (« le paradigme est la défense », FONDATIONS §6) — pas d'un thème
   particulier. Ce sont des invites, jamais des descriptions. */
const SCAFFOLD = {
  senses: "À l'arrivée : que voit-on, qu'entend-on, quelle « odeur » a le lieu ? Une phrase pour l'installer.",
  variance: {
    minor: "Un geste discret qui jure avec le thème (variance mineure).",
    extreme: "Un acte qui brise ouvertement le thème (variance extrême).",
  },
  truth: "Ce que ce serveur EST vraiment dans le monde : à qui, pour quoi, ce qu'on vient y voler.",
  denizens: "Les CI et l'araignée, recostumées en créatures du thème.",
};

export const ParadigmLens = {
  /** Vue INTERNE (Fondations). `nodes` = les 7 nœuds déjà résolus par
      l'édition (`{ id, label, role }`, cf. Matrix.foundationNodes()). */
  foundation(paradigm, nodes = []) {
    const p = paradigm || null;
    const pn = (p && p.nodes) || {};
    return {
      sourced: !!p,
      senses: field(p && p.senses, SCAFFOLD.senses),
      variance: {
        minor: field(p && p.variance && p.variance.minor, SCAFFOLD.variance.minor),
        extreme: field(p && p.variance && p.variance.extreme, SCAFFOLD.variance.extreme),
      },
      denizens: field(p && p.denizens, SCAFFOLD.denizens),
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.label,
        role: n.role,
        costume: field(pn[n.id], `Dans ce paradigme, ${String(n.label || "ce nœud").toLowerCase()} ressemble à…`),
      })),
    };
  },

  /** Vue EXTERNE (le serveur dans le monde) — indépendante de l'édition
      (les 4 éditions ont une sculpture ; seule la Fondation est gatée). */
  server(paradigm) {
    const p = paradigm || null;
    return {
      sourced: !!p,
      senses: field(p && p.senses, SCAFFOLD.senses),
      truth: field(p && p.truth, SCAFFOLD.truth),
      denizens: field(p && p.denizens, SCAFFOLD.denizens),
    };
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.ParadigmLens = ParadigmLens;
