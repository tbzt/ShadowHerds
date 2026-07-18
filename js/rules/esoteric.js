"use strict";

/* ============================================================
   ESOTERIC — UN moteur, paramétré par la voie (initiation/
   submersion), pour la progression ésotérique (PLAN_PROGRESSION_
   ESOTERIQUE.md). Le livre lui-même fusionne les deux : Anarchistes
   décrit l'Initiation ET la Submersion avec la MÊME phrase de règle
   (« Atout unique dont le niveau augmente avec le grade »). Module
   profond (Ousterhout) : une mécanique, deux paramétrages — pas deux
   modules jumeaux, cf. arbitrage Kernel dans le plan.

   Aucune donnée propre par édition : tout délègue à
   App.getEditionModule(ed).esotericModel[voie] (prohibition n°1).
   `pnj.esoteric` niché — { voie, grade, acquis: [...] } — additif et
   optionnel (amendement CODIR Failsafe) : un PNJ sans progression
   ésotérique n'a simplement pas ce champ, aucune valeur par défaut
   inventée, aucune 4ᵉ collection Storage (prohibition n°2).

   Coût de grade : Karma pour SR5/SR6 (formule d'édition), NIVEAU
   D'ATOUT pour Anarchy 1 (l'unité change, pas le mécanisme — A1 n'a
   pas de Karma pour ça, cf. arbitrage 4 du plan). `costLabel` porte
   cette unité pour l'affichage.

   Coût Submersion supposé IDENTIQUE à l'Initiation par édition (même
   table de Karma — SR5 p.257 et SR6 p.197 renvoient explicitement à
   la règle d'Initiation) : non re-vérifié séparément dans la
   campagne d'extraction P0 (focalisée métamagies), mais c'est le
   canon documenté des deux livres de base, pas une supposition.
   ============================================================ */
import { Content } from "./content.js";
import { Utils } from "../core/utils.js";

export const Esoteric = {
  VOIES: ["initiation", "submersion"],

  _model(edition, voie) {
    const mod = App.getEditionModule ? App.getEditionModule(edition) : null;
    const m = mod && mod.esotericModel;
    return (m && m[voie]) || null;
  },

  /** true si l'édition a UNE progression ésotérique (au moins une voie).
      false pour Anarchy 2 (esotericModel: null) — les deux verdicts
      d'absence (technomancien + progression) se confirment mutuellement. */
  available(edition) {
    const mod = App.getEditionModule ? App.getEditionModule(edition) : null;
    return !!(mod && mod.esotericModel);
  },

  /** true si CETTE voie existe dans l'édition (A1 cœur n'a rien : c'est
      *Anarchistes* qui l'apporte, mais côté modèle c'est transparent —
      esotericModel d'A1 la déclare déjà en intégrant *Anarchistes*). */
  voieAvailable(edition, voie) {
    return !!this._model(edition, voie);
  },

  label(voie) {
    return voie === "submersion" ? "Submersion" : "Initiation";
  },

  agentLabel(voie) {
    return voie === "submersion" ? "Submergé" : "Initié";
  },

  acquisLabel(edition, voie) {
    const m = this._model(edition, voie);
    return (m && m.acquisLabel) || (voie === "submersion" ? "Écho" : "Métamagie");
  },

  attrKey(edition, voie) {
    const m = this._model(edition, voie);
    return (m && m.attr) || (voie === "submersion" ? "RES" : "MAG");
  },

  costLabel(edition, voie) {
    const m = this._model(edition, voie);
    return (m && m.costLabel) || "Karma";
  },

  /** Coût pour ATTEINDRE le grade N (1-indexé). null si la voie n'existe
      pas dans l'édition (garde d'absence, prohibition n°1 : aucun
      `if (App.edition === …)` ici). */
  cost(edition, voie, grade) {
    const m = this._model(edition, voie);
    if (!m || typeof m.cost !== "function") return null;
    return m.cost(grade);
  },

  /** Niveau d'Atout affiché pour A1 (« premier grade = Atout niveau 2,
      chaque grade suivant +1 ») — même formule pour les deux voies,
      c'est la règle qui fusionne Initiation et Submersion. Générique :
      s'applique à toute édition qui exprime le coût en niveau d'Atout,
      pas seulement A1, via `costLabel !== "Karma"`. */
  atoutLevel(grade) {
    return grade > 0 ? grade + 1 : 0;
  },

  grade(pnj) {
    return (pnj && pnj.esoteric && pnj.esoteric.grade) || 0;
  },

  voieOf(pnj) {
    return (pnj && pnj.esoteric && pnj.esoteric.voie) || null;
  },

  acquis(pnj) {
    return (pnj && pnj.esoteric && pnj.esoteric.acquis) || [];
  },

  /** Structure vierge pour un PNJ qui devient initié/submergé (grade 1,
      encore aucun acquis choisi). Jamais appelée automatiquement : la
      voie se STOCKE sur décision explicite (édition/génération), jamais
      dérivée d'un attribut — cf. amendement CODIR (veto Kernel) : un
      PNJ peut porter MAG et RES à la fois, dériver casserait ce choix
      assumé de la refonte du modèle d'acteur. */
  blank(voie) {
    return { voie, grade: 0, acquis: [] };
  },

  /** Résumé une ligne pour affichage carte : "Initié — grade 2 (2
      métamagies)". "" si le PNJ n'a pas de progression ésotérique. */
  summaryLabel(pnj, edition) {
    if (!pnj || !pnj.esoteric) return "";
    const voie = pnj.esoteric.voie;
    const grade = this.grade(pnj);
    const n = this.acquis(pnj).length;
    const acquisWord = this.acquisLabel(edition, voie) + (n > 1 ? "s" : "");
    return `${this.agentLabel(voie)} — grade ${grade} (${n} ${acquisWord.toLowerCase()})`;
  },

  /** Libellé de coût du PROCHAIN grade, pour un survol/tooltip — "23
      Karma" ou "Atout niveau 3". "" si la voie plafonne ou n'existe pas
      (cost() renvoie null). */
  nextCostLabel(pnj, edition) {
    if (!pnj || !pnj.esoteric) return "";
    const voie = pnj.esoteric.voie;
    const nextGrade = this.grade(pnj) + 1;
    const cost = this.cost(edition, voie, nextGrade);
    if (cost == null) return "";
    return `${cost} ${this.costLabel(edition, voie)}`;
  },

  /** P6 (génération) — pose une progression ésotérique COMPLÈTE (grade +
      acquis), jamais un simple label. Restitue l'intention perdue par le
      fourre-tout retiré en P1 (« Initié hermétique » ne portait qu'un
      nom, aucune mécanique) : `forced` est le cas de cet archétype et de
      ses équivalents nommés dans les autres éditions. Hors ce cas,
      variété assumée du projet (pas une règle du livre) : un Éveillé/
      technomancien généré a une chance croissante avec `proRating`
      d'être déjà initié/submergé — un run n'est pas peuplé que de
      débutants.
      N'écrase JAMAIS un `pnj.esoteric` déjà posé (idempotent, comme les
      autres hydratations de génération). Un acquis par grade (règle du
      livre : « chaque grade, une métamagie/un écho »). */
  rollForGeneration(pnj, edition, voie, { forced = false, proRating = 0 } = {}) {
    if (!pnj || pnj.esoteric || !this.voieAvailable(edition, voie)) return;
    const chance = forced ? 1 : Utils.clamp(0.05 + proRating * 0.05, 0, 0.4);
    if (Math.random() > chance) return;
    const grade = Utils.clamp(1 + Math.floor(proRating / 2), 1, forced ? 4 : 3);
    pnj.esoteric = this.blank(voie);
    pnj.esoteric.grade = grade;
    pnj.esoteric.acquis =
      voie === "submersion" ? Content.pickEchoes(edition, grade) : Content.pickMetamagics(edition, grade);
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Esoteric = Esoteric;
