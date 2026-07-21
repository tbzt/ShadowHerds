"use strict";

/* ============================================================
   CAMPAIGN — suivi de campagne d'un PJ : registre daté, soldes dérivés.
   ------------------------------------------------------------
   Ressources universelles aux 4 éditions (nuyens, Karma) + réputation
   d'édition (lue via `edModule.reputationTracks`, neutre `[]` si absente)
   + compteurs libres du MJ. Une seule source de vérité : le SOLDE d'une
   ressource est la SOMME des `delta` de même `res` dans le registre — rien
   n'est stocké en double.

   Module feuille : math pure du registre, AUCUN DOM, AUCUN Storage.
   - la mutation/persistance vit dans `UI` (jumeau du journal de fiche) ;
   - le rendu de carte dans `CardRenderer._progressionZone` ;
   - l'édition (réglage des soldes) dans `EditModal`.
   Champ additif porté par l'entité : `pnj.campaign = { ledger, customTracks }`
   (voyage tel quel dans `characters_all`, comme `journal`).
   ============================================================ */
export const Campaign = {
  /** Devises universelles aux 4 éditions — socle neutre, jamais branché. */
  CORE: [
    { key: "nuyen", label: "nuyens", glyph: "¥" },
    { key: "karma", label: "Karma", glyph: null },
  ],

  /** Le suivi de campagne d'une entité, créé à la volée (forme additive). */
  ensure(pnj) {
    if (!pnj.campaign || typeof pnj.campaign !== "object") pnj.campaign = {};
    if (!Array.isArray(pnj.campaign.ledger)) pnj.campaign.ledger = [];
    if (!Array.isArray(pnj.campaign.customTracks)) pnj.campaign.customTracks = [];
    return pnj.campaign;
  },

  /** Une écriture datée, partagée entre copies (identique — cf. journal). */
  entry(res, delta, reason) {
    return { ts: Date.now(), res, delta: Number(delta) || 0, reason: (reason || "").trim() };
  },

  /** Solde d'une ressource = somme des deltas de même `res` (source unique). */
  balance(campaign, res) {
    if (!campaign || !Array.isArray(campaign.ledger)) return 0;
    let sum = 0;
    for (const e of campaign.ledger) if (e.res === res) sum += Number(e.delta) || 0;
    return sum;
  },

  /** Descripteurs de toutes les ressources suivables d'un PJ, dans l'ordre :
      devises universelles + réputation de l'édition (neutre `[]` si absente)
      + compteurs libres du MJ. Aucune branche d'édition : la réputation arrive
      par `edModule.reputationTracks`. */
  tracks(pnj, edModule) {
    const rep = (edModule && edModule.reputationTracks) || [];
    const custom = (pnj.campaign && pnj.campaign.customTracks) || [];
    return [...this.CORE, ...rep, ...custom];
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Campaign = Campaign;
