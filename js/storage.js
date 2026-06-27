/* ============================================================
   STORAGE — abstraction localStorage
   Toutes les clés sont préfixées par l'édition active.
   Aucune compatibilité avec les anciens repos SR5_PNJ / SR6_PNJ.
   ============================================================ */
'use strict';

const Storage = {
  _edition: 'none',

  init(edition) {
    this._edition = edition;
  },

  _key(key) {
    return `sr_pnj_v2_${this._edition}_${key}`;
  },

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._key(key));
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(this._key(key));
    } catch { /* noop */ }
  },

  /** Efface toutes les données de l'édition courante */
  clearEdition() {
    const prefix = `sr_pnj_v2_${this._edition}_`;
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  },

  /** Efface toutes les données de toutes les éditions */
  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sr_pnj_v2_'))
      .forEach(k => localStorage.removeItem(k));
  }
};
