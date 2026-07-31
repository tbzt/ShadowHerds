"use strict";

/* ============================================================
   SPECTATOR VIEW (#59) — écran joueur : rendu lecture seule de
   l'initiative + moniteurs de la rencontre en cours. Projeté dans un
   2e onglet du MÊME appareil (#<edition>/spectateur, ouvert depuis
   Paramètres). Jamais d'écriture : aucune délégation data-action
   branchée ici, on se contente de lire Encounter.state/_rows() —
   déjà enrichis (down/morale/gauge) par le tracker normal. La FORME du
   moniteur (échelle/seuils) vit dans le descripteur `conditionMonitor.gauge` ;
   `CardRenderer.gaugeBoxes` la dessine — ici on ne branche jamais sur l'édition.
   ============================================================ */
import { Chase } from "../../rules/chase.js";
import { Storage } from "../../core/storage.js";
import { Utils } from "../../core/utils.js";

export const SpectatorView = {
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
    const activeId = this._activeId(rows, state);
    const list = rows.map((r) => this._row(r, r.pnjId === activeId)).join("");
    zone.innerHTML = header + this._chase(state, rows) + `<div class="stack spectator-list">${list}</div>`;
  },

  /** ⇉ La piste, projetée en LECTURE SEULE — les positions, rien d'autre.

      Ce que les joueurs peuvent voir : qui est devant, qui colle au train,
      et sur quel terrain. Ce qui reste chez le MJ : les tests du round, les
      réserves, les valeurs d'attribut, les actions d'Atout — ce sont des
      informations de GESTION, pas de fiction. La piste projetée est donc
      volontairement pauvre, comme le reste de cet écran.

      Rendu local plutôt qu'un appel à `ChaseRenderer` : l'écran spectateur
      est isolé du cluster cockpit (même arbitrage que `_typeLabel` et
      `_activeId`, recopiés pour la même raison). */
  _chase(state, rows) {
    const ch = state.chase;
    if (!ch) return "";
    const ed = App.edition;
    const mode = Chase.mode(ed, ch.mode) || { label: "Poursuite", counter: "Round" };
    const nom = (id) => {
      const r = rows.find((x) => x.pnjId === id);
      return Utils.escHtml((r && r.pnj && r.pnj.name) || "?");
    };
    const cible = ch.targetId
      ? `<div class="spectator-chase-anchor"><span>${Utils.escHtml(mode.anchorLabel || "Cible")}</span> ${nom(ch.targetId)}</div>`
      : "";
    const bandes = Chase.lanes(ed, ch.terrain)
      .map((l) => {
        const gens = Object.keys(ch.lanes || {})
          .filter((id) => ch.lanes[id] === l.key && !(ch.out || {})[id])
          .map((id) => `<span class="spectator-chase-tok">${nom(id)}</span>`)
          .join("");
        return `<div class="spectator-chase-band${gens ? "" : " is-empty"}">
          <span class="spectator-chase-lane">${Utils.escHtml(l.label)}</span>
          <span class="spectator-chase-slots">${gens || "·"}</span>
        </div>`;
      })
      .join("");
    const sortis = Object.keys(ch.out || {})
      .map((id) => `${nom(id)} <em>${ch.out[id] === "accident" ? "accident" : "semé"}</em>`)
      .join(" · ");
    return `<div class="spectator-chase">
      <div class="spectator-chase-head">⇉ ${Utils.escHtml(mode.label)} —
        ${Utils.escHtml(mode.counter || "Round")} ${ch.round}${ch.total ? ` / ${ch.total}` : ""}</div>
      ${cible}${bandes}
      ${sortis ? `<div class="spectator-chase-out">Hors course : ${sortis}</div>` : ""}
    </div>`;
  },

  /** Combattant à mettre en avant : Miroir NEUTRE de la résolution de focus
      d'EncounterRenderer (recopié plutôt qu'appelé, même logique qu'ailleurs
      dans ce fichier — écran spectateur isolé du cluster cockpit). En
      narratif (Anarchy 2 : pas de tour d'initiative), c'est le focus posé
      par le MJ (state.focusId, persisté par focus-active) ou, à défaut, le
      premier vivant qui n'a pas encore joué ; en ordonné, c'est turnIndex. */
  _activeId(rows, state) {
    const model = (App.editionModule && App.editionModule.combatModel) || {};
    if (!model.narrative) return (rows[state.turnIndex] || {}).pnjId || null;
    const live = rows.filter((r) => r.pnj && !r.down);
    if (!live.length) return null;
    const focused = state.focusId && live.find((r) => r.pnjId === state.focusId);
    return (focused || live.find((r) => !r.hasActed) || live[0]).pnjId;
  },

  /** Libellé de type joueur-facing (PJ/PNJ/CI/Drone…). Miroir NEUTRE de
      EncounterRenderer._kindLabel — recopié (et non appelé : c'est un privé
      d'un autre fichier) pour garder l'écran spectateur isolé du cluster
      cockpit. Aucune branche d'édition. */
  _typeLabel(r) {
    if (r.kind === "pj") return "PJ";
    if (r.kind === "matrix") return "CI";
    const p = r.pnj || {};
    if (p.kind === "drone") return "Drone";
    if (p.kind === "vehicule") return "Véhicule";
    if (p.type === "spirit") return "Esprit";
    if (p.type === "creature") return "Créature";
    if (typeof Characters !== "undefined" && Characters.data && Characters.data.all.some((c) => c.id === p.id)) return "PJ";
    return "PNJ";
  },

  /** Portrait de l'entité s'il existe (lecture seule, pas d'agrandissement ici —
      l'écran spectateur n'a aucune interaction). */
  _portrait(r) {
    const url = r.pnj && r.pnj.portraitUrl;
    if (!url) return "";
    return `<img class="spectator-portrait" src="${Utils.escHtml(url)}" alt="" loading="lazy">`;
  },

  _row(r, isActive) {
    const name = Utils.escHtml(r.pnj?.name || r.name || "?");
    // Cases dessinées selon la FORME du descripteur (échelle vs seuils) :
    // en Anarchy 2 les paliers de gravité restent lisibles au lieu d'un total
    // aplati. Lecture seule (projection) — CardRenderer.gaugeBoxes n'émet
    // aucune interaction.
    const boxes = CardRenderer.gaugeBoxes(r.gauge);
    const gauge = boxes ? `<div class="cluster monitor-boxes spectator-gauge">${boxes}</div>` : "";
    const cls = `cluster cluster--between spectator-row${isActive ? " is-active" : ""}${r.down ? " is-down" : ""}${r.hasActed ? " has-acted" : ""}`;
    // Identité (portrait + nom + type) à gauche, moniteur à droite : les joueurs
    // doivent savoir QUI est en jeu, pas seulement voir des cases.
    return `<div class="${cls}">
      <div class="cluster spectator-identity">
        ${this._portrait(r)}
        <span class="spectator-name">${name}</span>
        <span class="spectator-type">${this._typeLabel(r)}</span>
      </div>
      ${gauge}
    </div>`;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.SpectatorView = SpectatorView;
