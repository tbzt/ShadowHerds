"use strict";

/* ============================================================
   SPECTATOR VIEW (#59) — écran joueur : rendu lecture seule de
   l'initiative + moniteurs de la rencontre en cours. Projeté dans un
   2e onglet du MÊME appareil (#<edition>/spectateur, ouvert depuis
   Paramètres). Jamais d'écriture : aucune délégation data-action
   branchée ici, on se contente de lire Encounter.state/_rows() —
   déjà enrichis (down/morale/gauge) par le tracker normal, aucune
   forme de moniteur par édition à connaître ici (conditionMonitor.gauge
   est l'accesseur neutre, cf. K6).
   ============================================================ */
const SpectatorView = {
  _active: false,
  _bound: false,

  initPanel() {
    this._active = true;
    this._bindStorage();
    this.render();
  },

  /** Quitté (changement de panel) : coupe le rafraîchissement — rien à
      nettoyer côté DOM, le panel suivant prend simplement le relais. */
  leave() {
    this._active = false;
  },

  /** Deux onglets du même navigateur partagent localStorage : l'évènement
      natif "storage" ne se déclenche que dans les AUTRES onglets — c'est
      le canal temps réel choisi (zéro dépendance, cf. Note d'arbitrage
      #59). Un seul listener pour la durée de vie de la page. */
  _bindStorage() {
    if (this._bound) return;
    this._bound = true;
    window.addEventListener("storage", () => {
      if (!this._active) return;
      this._reload();
      this.render();
    });
  },

  /** Encounter.state ne référence que des pnjId : les DONNÉES (moniteurs)
      vivent dans les bibliothèques (Shadows/Characters/ContactsBook/Servers)
      ou, pour un PNJ généré mais pas encore sauvegardé, dans Gen.pool — des
      tableaux en mémoire chargés une fois au boot de CET onglet, jamais
      revisités depuis. Sans ce rechargement, un combattant blessé sur
      l'onglet MJ resterait figé à son état d'ouverture ici (même mécanique
      que Backup._reloadActive, en plus léger : lecture seule, aucun rendu
      des panels normaux nécessaire côté spectateur). */
  _reload() {
    if (Shadows.load) Shadows.load();
    if (typeof Characters !== "undefined" && Characters.load) Characters.load();
    if (ContactsBook.load) ContactsBook.load();
    if (Servers.load) Servers.load();
    // Pool du générateur (PNJ pas encore sauvegardé) : relu sans le rendu
    // DOM de Gen.restorePool() (réservé au boot, dupliquerait les cartes).
    Gen.pool = Storage.get(Gen._POOL_KEY, Gen.pool);
    Encounter.load();
  },

  render() {
    const zone = document.getElementById("spectator-zone");
    if (!zone) return;
    const state = Encounter.state;
    if (!state || !state.combatants.length) {
      zone.innerHTML = `<p class="spectator-empty">Aucun combat en cours.</p>`;
      return;
    }
    const rows = Encounter._rows();
    const passLabel = state.pass > 1 ? ` · Passe ${state.pass}` : "";
    const header = `<div class="spectator-header">Round ${state.round}${passLabel}</div>`;
    const list = rows.map((r, i) => this._row(r, i === state.turnIndex)).join("");
    zone.innerHTML = header + `<div class="spectator-list">${list}</div>`;
  },

  _row(r, isActive) {
    const name = Utils.escHtml(r.pnj?.name || r.name || "?");
    const gauge =
      r.gauge && r.gauge.total > 0
        ? `<div class="monitor-boxes spectator-gauge">${CardRenderer._monitorBoxes(r.pnjId, "gauge", r.gauge.total, r.gauge.filled)}</div>`
        : "";
    const cls = `spectator-row${isActive ? " is-active" : ""}${r.down ? " is-down" : ""}`;
    return `<div class="${cls}">
      <span class="spectator-name">${name}</span>
      ${gauge}
    </div>`;
  },
};
