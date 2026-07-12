/* ============================================================
   STORAGE — abstraction localStorage
   Toutes les clés sont préfixées par l'édition active.
   Aucune compatibilité avec les anciens repos SR5_PNJ / SR6_PNJ.
   ============================================================ */
'use strict';

const Storage = {
  _edition: 'none',
  _observers: [],

  init(edition) {
    this._edition = edition;
  },

  /** Observe les écritures persistées (clé complète en argument). Générique :
      Storage ignore le sens des clés ; c'est à l'abonné (ex. Sync) de filtrer
      celles qui l'intéressent. N'émet PAS pour les préférences globales. */
  subscribe(cb) {
    if (typeof cb === 'function') this._observers.push(cb);
  },

  _notify(fullKey) {
    for (const cb of this._observers) {
      try { cb(fullKey); }
      catch (e) { Debug.warn("storage", "observateur échoué", { error: e }); }
    }
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
    } catch (e) {
      Debug.warn("storage", "lecture globale échouée", { key, error: e });
      return fallback;
    }
  },

  setGlobal(key, value) {
    try {
      localStorage.setItem(this._globalKey(key), JSON.stringify(value));
      Debug.log("storage", "setGlobal", { key });
      return true;
    } catch (e) {
      Debug.warn("storage", "écriture globale échouée", { key, error: e });
      return false;
    }
  },

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._key(key));
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      Debug.warn("storage", "lecture échouée", { key, error: e });
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value));
      Debug.log("storage", "set", { key });
      this._notify(this._key(key));
      return true;
    } catch (e) {
      Debug.warn("storage", "écriture échouée", { key, error: e });
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(this._key(key));
      Debug.log("storage", "remove", { key });
    } catch { /* noop */ }
  },

  getFromEdition(edition, key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._keyForEdition(edition, key));
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      Debug.warn("storage", "lecture d'édition échouée", { edition, key, error: e });
      return fallback;
    }
  },

  setForEdition(edition, key, value) {
    try {
      localStorage.setItem(this._keyForEdition(edition, key), JSON.stringify(value));
      Debug.log("storage", "setForEdition", { edition, key });
      this._notify(this._keyForEdition(edition, key));
      return true;
    } catch (e) {
      Debug.warn("storage", "écriture d'édition échouée", { edition, key, error: e });
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
    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    keys.forEach(k => localStorage.removeItem(k));
    Debug.warn("storage", "clearEdition", { edition: this._edition, removed: keys.length });
  },

  /** Efface toutes les données de toutes les éditions */
  clearAll() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('sr_pnj_v2_'));
    keys.forEach(k => localStorage.removeItem(k));
    Debug.warn("storage", "clearAll", { removed: keys.length });
  },

  /** Migration one-shot : l'ancien identifiant d'édition "anarchy" désignait
      Anarchy 2e. Depuis l'ajout d'Anarchy 1re il devient "anarchy2". On
      renomme les clés `sr_pnj_v2_anarchy_*` → `sr_pnj_v2_anarchy2_*` et on
      réécrit les champs `"edition":"anarchy"` dans les valeurs (PNJ, contacts,
      véhicules, esprits liés). Idempotent, gardé par un flag global.
      (Utilisateur unique : filet de sécurité, supprimable à terme.) */
  migrateAnarchyId() {
    if (this.getGlobal("anarchyIdMigrated", false)) return;
    const oldPrefix = 'sr_pnj_v2_anarchy_';
    const oldKeys = Object.keys(localStorage).filter(k => k.startsWith(oldPrefix));
    oldKeys.forEach(k => {
      const newKey = 'sr_pnj_v2_anarchy2_' + k.slice(oldPrefix.length);
      let raw = localStorage.getItem(k);
      if (raw !== null) {
        raw = raw.split('"edition":"anarchy"').join('"edition":"anarchy2"');
        localStorage.setItem(newKey, raw);
      }
      localStorage.removeItem(k);
    });
    this.setGlobal("anarchyIdMigrated", true);
    if (oldKeys.length)
      Debug.warn("storage", "migrateAnarchyId", { migrated: oldKeys.length });
  }
};
