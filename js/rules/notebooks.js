"use strict";

/* ============================================================
   NOTEBOOKS (R2, PLAN_RANGER_LA_RUN.md) — carnets keyés par dossier id.
   ------------------------------------------------------------
   Un carnet = UN document markdown par dossier (campagne/run) — pas d'arbre,
   pas de sous-blobs : « Run »/« Rencontre » vivent comme des TITRES `# ` dans
   le texte (doctrine anti-parseur d'E8, conservée). Le carnet courant = le
   dossier courant (DossierBar.current), résolu par l'appelant : ce module
   reste une FEUILLE, dépendances Storage + Utils seules, aucune connaissance
   de DossierBar.

   Clé Storage additive `notebooks = { version:1, entries: { [dossierId or
   "__global__"]: "<doc>" } }` — pas de migration nécessaire (nouvelle clé).
   ============================================================ */
const Notebooks = {
  _KEY: "notebooks",
  _GLOBAL: "__global__",
  _cache: null,

  load() {
    if (!this._cache) {
      this._cache = Storage.get(this._KEY, null) || { version: 1, entries: {} };
    }
    return this._cache;
  },

  get(dossierId) {
    return this.load().entries[dossierId || this._GLOBAL] || "";
  },

  set(dossierId, doc) {
    const data = this.load();
    data.entries[dossierId || this._GLOBAL] = doc;
    Storage.set(this._KEY, data);
  },

  /** Map dossierId→document, pour le scan Mentions (Palette/backlinks/tags)
      qui doit voir tous les carnets, pas seulement le carnet courant. */
  all() {
    return this.load().entries;
  },

  /** Amorçage paresseux, une seule fois : si AUCUN carnet n'existe encore
      (première ouverture après la migration), semer `dossierId` depuis
      l'ancien bloc-notes global `sessionNotes` (secours gardé 1 release).
      Idempotent : no-op dès qu'un carnet existe, quel qu'il soit. */
  seedFromLegacyIfEmpty(dossierId) {
    const data = this.load();
    if (Object.keys(data.entries).length) return;
    const legacy = Storage.getGlobal("sessionNotes", "");
    if (!legacy) return;
    data.entries[dossierId || this._GLOBAL] = legacy;
    Storage.set(this._KEY, data);
  },
};
