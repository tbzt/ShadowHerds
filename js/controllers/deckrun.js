"use strict";

/* ============================================================
   DECKRUN — ciblage vivant du decker (M3, PLAN_MATRICE_CYBERDECK.md).
   Mirror minimal d'Intrusion, mais côté decker : quel serveur ce
   decker vise-t-il ? État nesté sur `pnj.cyberdeck.run` (comme l'intrusion
   d'un serveur vit dans `Encounter.state.matrix`, R2-B) — pas de 5ᵉ
   collection Storage
   (prohibition n°2). Ne possède aucune donnée propre : lit/mute
   l'objet porté par le PNJ, toute persistance passe par UI
   (_entityCopies/persistEntity, motif F2 — un decker vit en
   plusieurs copies pool+biblio comme tout PNJ).
   ============================================================ */
const DeckRun = {
  /** Garantit `pnj.cyberdeck.run` (créé à la volée si absent). */
  _ensure(pnj) {
    if (!pnj || !pnj.cyberdeck) return null;
    if (!pnj.cyberdeck.run) pnj.cyberdeck.run = { targetServerId: null };
    return pnj.cyberdeck.run;
  },

  /** Id du serveur actuellement visé par ce decker, ou `null`. */
  target(pnj) {
    const run = pnj && pnj.cyberdeck && pnj.cyberdeck.run;
    return (run && run.targetServerId) || null;
  },

  /** Serveur visé, résolu (ou `null` si non trouvé/aucune cible). */
  targetServer(pnj) {
    const id = this.target(pnj);
    return id ? Servers.find(id) : null;
  },
};
