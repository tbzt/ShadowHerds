"use strict";

/* ============================================================
   DECKRUN — ciblage vivant du runner matriciel.
   Mirror minimal d'Intrusion, mais côté runner : quel serveur ce
   runner vise-t-il ? État nesté sur son porteur matriciel — le
   `pnj.cyberdeck` d'un decker OU le `pnj.persona` d'un technomancien
   (T6a) : les deux nichent `.run` à l'identique (comme l'intrusion
   d'un serveur vit dans `Encounter.state.matrix`) — pas de 5ᵉ
   collection Storage (prohibition n°2). Le module ne connaît AUCUNE
   édition : il choisit l'hôte par présence (cf. `_host`), jamais par
   un `if (App.edition)` (prohibition n°1). Ne possède aucune donnée
   propre : lit/mute l'objet porté par le PNJ, toute persistance passe
   par UI (_entityCopies/persistEntity — un runner vit en plusieurs
   copies pool+biblio comme tout PNJ).
   ============================================================ */
import { Servers } from "./servers.js";

export const DeckRun = {
  /** Hôte du nid `.run` : le cyberdeck d'un decker, ou le persona
      incarné d'un technomancien. Les deux portent `.run` à
      l'identique (T6a, option Kernel (a) : additif, zéro migration).
      `null` si le PNJ ne fait tourner ni l'un ni l'autre. Le cyberdeck
      l'emporte si par accident les deux coexistent — un decker reste
      un decker. */
  _host(pnj) {
    if (!pnj) return null;
    return pnj.cyberdeck || pnj.persona || null;
  },

  /** Garantit `<hôte>.run` (créé à la volée si absent). */
  _ensure(pnj) {
    const host = this._host(pnj);
    if (!host) return null;
    if (!host.run) host.run = { targetServerId: null };
    return host.run;
  },

  /** Id du serveur actuellement visé par ce runner, ou `null`. */
  target(pnj) {
    const host = this._host(pnj);
    const run = host && host.run;
    return (run && run.targetServerId) || null;
  },

  /** Serveur visé, résolu (ou `null` si non trouvé/aucune cible). */
  targetServer(pnj) {
    const id = this.target(pnj);
    return id ? Servers.find(id) : null;
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.DeckRun = DeckRun;
