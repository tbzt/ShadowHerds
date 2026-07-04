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

  _keyForEdition(edition, key) {
    return `sr_pnj_v2_${edition}_${key}`;
  },

  _globalKey(key) {
    return `sr_pnj_v2_global_${key}`;
  },

  /** Préférences globales, communes à toutes les éditions (UI, dés...). */
  getGlobal(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._globalKey(key));
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  setGlobal(key, value) {
    try {
      localStorage.setItem(this._globalKey(key), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
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

  getFromEdition(edition, key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._keyForEdition(edition, key));
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  setForEdition(edition, key, value) {
    try {
      localStorage.setItem(this._keyForEdition(edition, key), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  getKeysForEdition(edition) {
    const prefix = `sr_pnj_v2_${edition}_`;
    return Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .map(k => k.slice(prefix.length));
  },

  listEditions() {
    const editionsSet = new Set();
    const prefix = 'sr_pnj_v2_';
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => {
        const afterPrefix = k.slice(prefix.length);
        const editionEndIdx = afterPrefix.indexOf('_');
        if (editionEndIdx > 0) {
          editionsSet.add(afterPrefix.slice(0, editionEndIdx));
        }
      });
    return Array.from(editionsSet);
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
