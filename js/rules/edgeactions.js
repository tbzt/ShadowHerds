"use strict";

/* ============================================================
   ACTIONS D'ATOUT — le magasin, neutre par édition (lot F5).

   Une action d'Atout n'est PAS une action au sens du lot F1. Le livre le dit
   dès sa première phrase (SR6 p.51) :

     « Ces actions en elles-mêmes NE COÛTENT PAS D'ACTION mineure ni majeure,
     mais elles doivent être utilisées CONJOINTEMENT AVEC UNE ACTION, indiquée
     entre parenthèses pour chaque action d'Atout. Dans tous les cas, la
     décision d'utiliser une action d'Atout doit être prise AVANT LE TEST. Si
     vous avez déjà lancé les dés […] vous ne pouvez pas utiliser
     rétroactivement l'action d'Atout. »

   Elles vivent donc dans l'économie d'ATOUT (la rangée 0-7 du cockpit), pas
   dans le budget de jetons. D'où un magasin séparé plutôt qu'un `domain` de
   plus dans `Actions` : ce n'est pas la même monnaie.

   ── Le problème que ce contrat résout ───────────────────────────────────
   Le dépouillement en a trouvé QUATRE-VINGT-DEUX, réparties sur quatre
   ouvrages (base 19, Feu Nourri 33, À tombeau ouvert 26, Compagnon 4). Les
   afficher toutes serait pire que de n'en afficher aucune : personne ne
   parcourt 82 puces au milieu d'un tour de combat.

   La règle de conception tient en une phrase, et c'est celle du MJ :
   **proposer l'action au bon moment, au bon endroit, au bon PNJ.**
   Elle donne exactement les trois axes du filtre.

     · QUI  (`who`)   — les capacités du PERSONNAGE, lues sur sa fiche.
                        « Vous devez avoir un cyberjack implanté ou un score
                        de Résonance » se vérifie, il ne se récite pas.
     · OÙ   (`where`) — le CONTEXTE de la scène. Une action de véhicule n'a
                        rien à faire dans une fusillade à pied ; une action de
                        course-poursuite suppose une poursuite.
     · QUAND (`host`) — l'ACTION HÔTE. Le livre l'écrit entre parenthèses, et
                        c'est le seul moment où l'action d'Atout existe :
                        « Arracher (Bloquer) » ne se propose pas à qui n'est
                        pas en train de Bloquer.

   ── Ce que le filtre ne fait JAMAIS ─────────────────────────────────────
   Masquer sans le dire. Une action écartée par le contexte est RETIRÉE de la
   liste, mais une ligne annonce combien et pourquoi, avec de quoi les révéler
   d'un tap. Le MJ garde la main : le filtre est une aide à la lecture, pas un
   arbitre. C'est la même frontière que partout ailleurs dans ce chantier —
   `affordable` informe, `forbids` refuse ce que le livre nomme, et tout le
   reste s'affiche.

   Et il ne refuse jamais la DÉPENSE : un PNJ sans assez d'Atout voit la puce
   se ternir, comme une action trop chère au lot F1. Le livre écrit le prix,
   pas une interdiction.
   ============================================================ */

import { Statuses } from "./statuses.js";

export const EdgeActions = {
  /** Spéc de l'édition, ou null (SR5 a sa Chance mais aucun catalogue nommé
      dans le livre de base ; Anarchy a ses Points d'Anarchy). La surface
      disparaît alors d'elle-même, comme `actionModel` absent. */
  model(pnj) {
    const mod = pnj ? App.getEditionModule(pnj.edition) : null;
    return (mod && mod.edgeActionModel) || null;
  },

  catalog(pnj) {
    const m = this.model(pnj);
    return (m && m.catalog) || [];
  },

  find(pnj, key) {
    return this.catalog(pnj).find((a) => a.key === key) || null;
  },

  /** Nom VF de la ressource — jamais « Edge » à l'écran (décision du chantier :
      la ressource pré-jet se nomme Chance, Atout ou Points d'Anarchy). Lu sur
      `preRollEdge.resourceLabel`, qui le porte déjà. */
  resourceLabel(pnj) {
    const mod = pnj ? App.getEditionModule(pnj.edition) : null;
    return (mod && mod.preRollEdge && mod.preRollEdge.resourceLabel) || "Atout";
  },

  /* ========================================================
     AXE 1 — AU BON PNJ (`who`)

     Les gardes sont NOMMÉES ici et ÉVALUÉES dans le module d'édition : ce
     magasin ne sait pas ce qu'est un cyberjack, et n'a pas à le savoir
     (prohibition n°1, la règle vit dans l'édition).

     `who: ["cyberjack", "resonance"]` se lit « l'une OU l'autre » — c'est la
     forme que le livre emploie (« un cyberjack implanté OU un score de
     Résonance »). Une conjonction serait `who: [["a", "b"]]`, personne n'en a
     besoin aujourd'hui et on ne l'invente pas.

     `waivedBy` — la dérogation de Hacker Vaillant : les protoconsciences « ont
     accès à l'ensemble des actions d'Atout matricielles SANS CONDITION de
     matériel ou attribut spécial ». Une exception écrite au livre mérite un
     champ, pas un cas particulier dans le code.
     ======================================================== */

  /** Le PNJ satisfait-il les capacités requises ? → true/false. */
  meetsWho(pnj, entry) {
    const m = this.model(pnj);
    const gates = (m && m.gates) || {};
    if (!entry.who || !entry.who.length) return true;
    for (const g of entry.waivedBy || []) if (gates[g] && gates[g](pnj)) return true;
    return entry.who.some((g) => gates[g] && gates[g](pnj));
  },

  /** Ce qui manque, en clair, pour l'expliquer plutôt que de masquer en
      silence. → « cyberjack ou Résonance » */
  missingWho(pnj, entry) {
    const m = this.model(pnj);
    const noms = (m && m.gateLabels) || {};
    return (entry.who || []).map((g) => noms[g] || g).join(" ou ");
  },

  /* ========================================================
     AXE 2 — AU BON ENDROIT (`where`)

     Le contexte de scène. Trois valeurs aujourd'hui, et la liste est fermée
     par le contrat de l'édition (`contexts`), pas par ce module :

       · "matrice"  — le PNJ agit en Matrice
       · "vehicule" — le PNJ pilote ou occupe un véhicule / un drone
       · "poursuite" — une course-poursuite est en cours

     DEUX SONT DÉRIVABLES, UN NE L'EST PAS. « Véhicule » se lit sur la fiche
     (`Vehicles.linkedTo(...).deployed`) et « Matrice » sur l'état de scène
     (une intrusion ouverte). « Poursuite » n'existe nulle part : c'est un TYPE
     DE SCÈNE que l'app ne modélise pas — participants, rôles, catégories de
     distance relatives, environnement, test de Pilotage par round.

     ⚠ Tant que ce chantier n'est pas fait, « poursuite » est une bascule
     MANUELLE du MJ, et les 14 actions concernées sont masquées par défaut.
     C'est dit dans la ligne de rappel, jamais caché. La tâche est inscrite au
     plan d'exécution.
     ======================================================== */

  /** Contextes ACTIFS pour ce PNJ dans cette scène : ceux que le contrat sait
      dériver, plus ceux que le MJ a déclarés à la main (`declared`).
      → Set de clés. */
  contexts(pnj, declared) {
    const m = this.model(pnj);
    const specs = (m && m.contexts) || {};
    const out = new Set(declared || []);
    for (const [key, spec] of Object.entries(specs)) {
      if (spec.derive && spec.derive(pnj)) out.add(key);
    }
    return out;
  },

  /** Les contextes que le MJ doit déclarer lui-même — l'app ne sait pas les
      voir. Alimente la rangée de bascules au-dessus de la feuille. */
  manualContexts(pnj) {
    const m = this.model(pnj);
    const specs = (m && m.contexts) || {};
    return Object.entries(specs)
      .filter(([, s]) => !s.derive)
      .map(([key, s]) => ({ key, label: s.label, hint: s.hint || "" }));
  },

  /* ========================================================
     AXE 3 — AU BON MOMENT (`host`)

     L'action hôte, entre parenthèses dans le livre. Trois formes, parce que le
     livre en emploie trois — et le contrat ne prétend pas les unifier :

       · `host: ["attaquer"]`     — des clés du catalogue F1 (« Arracher
                                    (Bloquer) » → `bloquer`)
       · `hostAny: "attaque"`     — une NATURE (« toute attaque », « Défense »)
       · `hostLabel: "Pilotage"`  — du texte, quand c'est une compétence ou une
                                    situation (« Escalade », « Tomber », « Le
                                    personnage obtient l'état À terre »)

     `hostLabel` est TOUJOURS rempli : c'est ce que le MJ lit. Les deux autres
     ne servent qu'au filtre, et leur absence n'empêche rien — une action dont
     l'hôte n'est pas modélisé s'affiche simplement sans être filtrée par lui.
     Mieux vaut une puce de trop qu'une règle escamotée.
     ======================================================== */

  /** L'hôte correspond-il à l'action en cours ? `current` = clé d'action jouée,
      ou null quand le MJ parcourt la feuille sans contexte d'action. Sans
      action courante, TOUT passe : le filtre par hôte ne sert qu'à proposer au
      bon moment, jamais à interdire. */
  matchesHost(entry, current) {
    if (!current) return true;
    // `current` accepte une clé OU un jeu de clés : une même action peut couvrir
    // plusieurs hôtes du livre (« Attaquer » recouvre Attaquer en mêlée ET
    // Attaquer à distance ; c'est l'ARME qui tranche, cf. `Actions.hostKeys`).
    const keys = Array.isArray(current) ? current : [current];
    if (entry.host && entry.host.some((h) => keys.includes(h))) return true;
    return !entry.host; // hôte non modélisé (compétence, nature, situation)
  },

  /* ========================================================
     LA RÉSOLUTION — ce que la feuille affiche, et ce qu'elle dit d'écarté.
     ======================================================== */

  /** Trie le catalogue pour un PNJ dans une scène.
      → { visibles, ecartees: [{ entry, raison }] }

      `opts` : { declared: [contextes déclarés], host: clé d'action courante,
                 edge: points d'Atout disponibles, withOptional: bool } */
  resolve(pnj, opts = {}) {
    const ctx = this.contexts(pnj, opts.declared);
    const visibles = [];
    const ecartees = [];
    for (const e of this.catalog(pnj)) {
      if (e.optional && !opts.withOptional) {
        ecartees.push({ entry: e, raison: "règle optionnelle" });
        continue;
      }
      if (e.where && !ctx.has(e.where)) {
        ecartees.push({ entry: e, raison: `hors contexte : ${e.where}` });
        continue;
      }
      if (!this.meetsWho(pnj, e)) {
        ecartees.push({ entry: e, raison: `demande ${this.missingWho(pnj, e)}` });
        continue;
      }
      if (!this.matchesHost(e, opts.host)) {
        ecartees.push({ entry: e, raison: "autre action hôte" });
        continue;
      }
      visibles.push(e);
    }
    return { visibles, ecartees };
  },

  /** Coût en clair. Le dépouillement a montré que ce n'est PAS toujours un
      nombre : intervalles (« Écran de fumée 1-4 »), alternatives (« Surenchère
      2, 4 ou 6 »), suppléments (« Concentration 3 puis +6 ») et formules
      (« De part en part : la Constitution de la cible »). Le contrat porte
      donc `cost` (nombre, pour le débit et l'accessibilité) et `costLabel`
      (texte, pour l'affichage) — le premier étant le MINIMUM quand le livre en
      donne plusieurs, jamais une moyenne inventée. */
  costLabel(entry) {
    if (!entry) return "";
    if (entry.costLabel) return entry.costLabel;
    return `${entry.cost} point${entry.cost > 1 ? "s" : ""}`;
  },

  /** Payable avec l'Atout disponible ? INFORMATION, comme partout : la puce se
      ternit, elle ne se désactive pas. */
  affordable(entry, edge) {
    return (edge || 0) >= (entry.cost || 0);
  },

  /** Verrou d'état : SR6 Désorienté interdit « ni gain ni dépense d'Atout »
      (lot E3, déjà motorisé). Une action d'Atout est une dépense — elle tombe
      sous le même verrou, et c'est la seule interdiction dure de ce module. */
  locked(pnj) {
    return !Statuses.edgeLock(pnj).spend;
  },

  /** Les surtaxes d'état que cette action d'Atout ANNULE (lot F3).
      Trois entrées le font pour la mineure « Attaquer depuis un couvert » —
      « Tirer depuis un couvert » (base), « Tir de couverture » et « Vif comme
      le vent » (Feu Nourri) : toutes trois écrivent que l'attaque se fait
      « sans utiliser l'action mineure Attaquer depuis un couvert ». Sans ce
      champ, l'app ferait payer une mineure que le joueur vient d'acheter en
      Atout. */
  cancels(entry) {
    return (entry && entry.cancels) || [];
  },
};
