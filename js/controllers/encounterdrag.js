"use strict";

/* ============================================================
   ENCOUNTER DRAG — glisser-déposer de la file d'initiative.

   Dernier résidu de câblage DOM sorti d'encounter.js. Domaine
   nommable et clos : cinq membres qui ne parlent qu'entre eux,
   plus UN appel sortant (`Encounter.reorderByIds`) au relâcher.

   ⚠ `widgets/collection/collection.js` porte un second moteur de
   réordonnancement. Il RESSEMBLE à celui-ci, il n'en est pas une
   copie, et les fusionner serait une erreur — comparaison faite
   le 2026-08-31 :

     · ici le DOM n'est JAMAIS réordonné pendant le glisser (la
       ligne est translatée, un trait montre où elle se posera) ;
       là-bas la carte est déplacée en direct par insertBefore ;
     · ici l'écoute est portée par l'overlay ; là-bas par
       `document`, avec une garde `_ownsCard` parce que trois
       collections se partagent le même document ;
     · auto-défilement et retour haptique n'existent qu'ici ;
     · le pilotage clavier ↑/↓ (a11y) n'existe que là-bas.

   Le seul vrai commun est la plomberie Pointer Events, une
   quinzaine de lignes. L'extraire couplerait un mécanisme
   combat-critique à un widget de collection pour cette
   quinzaine-là. Si l'un des deux bouge, lire l'autre — mais ne
   pas chercher à les réunir.
   ============================================================ */
import { Encounter } from "./encounter.js";
import { Utils } from "../core/utils.js";

/* ---- Glisser-déposer pour réordonner (Vague C1, refonte « feel sticker ») ----
   Pointer Events (souris + tactile), sans dépendance et sans drag HTML5
   natif (qui ne marche pas au doigt). La ligne saisie se DÉCOLLE et SUIT le
   doigt (--drag-dy composé avec l'inclinaison/soulèvement d'édition
   --drag-tilt/--drag-lift, cf. theme-*.css) ; un TRAIT D'INSERTION montre
   où elle se reposera. Le DOM n'est PAS réordonné en direct (sinon la base
   de translation saute — arbitrage CODIR/Failsafe) : on ne repose la ligne
   et ne réécrit l'état (reorderByIds → un seul _commit) qu'au relâcher.
   Les lignes hors de combat (épinglées en bas) ne sont ni saisissables ni
   des cibles d'insertion. Fonctionne sur .encounter-row (ordonné) comme
   .encounter-nrow (narratif Anarchy). */
export const EncounterDrag = {
  _drag: null,
  init(overlay) {
    overlay.addEventListener("pointerdown", (e) => {
      const handle = e.target.closest(".encounter-drag-handle");
      if (!handle) return;
      const row = handle.closest(".encounter-row, .encounter-nrow");
      const list = document.getElementById("encounter-list");
      if (!row || !list) return;
      e.preventDefault();
      this._drag = { row, list, startY: e.clientY, lastY: e.clientY, before: null, line: null, raf: 0 };
      row.classList.add("dragging");
      Utils.haptic(12);
      try {
        handle.setPointerCapture(e.pointerId);
      } catch (_) {}
      this._dragScroll();
      const move = (ev) => this._dragMove(ev);
      const up = (ev) => {
        try {
          handle.releasePointerCapture(ev.pointerId);
        } catch (_) {}
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        this._dragEnd();
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    });
  },
  /** La ligne suit le doigt (--drag-dy) ; le trait d'insertion se pose à
      l'emplacement de dépôt (première ligne vivante dont on dépasse le milieu).
      Ne dépasse jamais le séparateur « hors de combat » / le pied de scène. */
  _dragMove(ev) {
    const d = this._drag;
    if (!d) return;
    ev.preventDefault();
    d.lastY = ev.clientY;
    d.row.style.setProperty("--drag-dy", ev.clientY - d.startY + "px");
    const targets = [...d.list.querySelectorAll(".encounter-row:not(.down):not(.dragging), .encounter-nrow:not(.down):not(.dragging)")];
    let before = null;
    for (const t of targets) {
      const box = t.getBoundingClientRect();
      if (ev.clientY < box.top + box.height / 2) {
        before = t;
        break;
      }
    }
    d.before = before;
    this._placeDropLine();
  },
  /** Pose (ou déplace) le trait d'insertion avant la cible courante, ou juste
      avant le séparateur/le pied si le dépôt vise le bas de la liste vivante. */
  _placeDropLine() {
    const d = this._drag;
    if (!d) return;
    if (!d.line) {
      d.line = document.createElement("div");
      d.line.className = "encounter-drop-line";
    }
    const anchor =
      d.before ||
      d.list.querySelector(".encounter-downsep") ||
      d.list.querySelector(".encounter-scene-actions");
    if (anchor) d.list.insertBefore(d.line, anchor);
    else d.list.appendChild(d.line);
  },
  /** Auto-défilement quand le doigt approche le haut/bas du conteneur scrollable
      (liste longue sur petit écran) — boucle rAF auto-annulée à la fin du drag. */
  _dragScroll() {
    const d = this._drag;
    if (!d) return;
    const sc = this._scrollParent(d.list);
    if (sc) {
      const r = sc.getBoundingClientRect();
      const edge = 48;
      if (d.lastY < r.top + edge) sc.scrollTop -= 12;
      else if (d.lastY > r.bottom - edge) sc.scrollTop += 12;
    }
    d.raf = requestAnimationFrame(() => this._dragScroll());
  },
  _scrollParent(el) {
    let n = el;
    while (n && n !== document.body) {
      const oy = getComputedStyle(n).overflowY;
      if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight) return n;
      n = n.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  },
  _dragEnd() {
    const d = this._drag;
    if (!d) return;
    const { list, row } = d;
    const droppedId = row.dataset.id;
    if (d.raf) cancelAnimationFrame(d.raf);
    // Repose à l'emplacement du trait (commit unique) puis nettoyage visuel.
    const anchor =
      d.before ||
      list.querySelector(".encounter-downsep") ||
      list.querySelector(".encounter-scene-actions");
    if (anchor && anchor !== row) list.insertBefore(row, anchor);
    else if (!anchor) list.appendChild(row);
    if (d.line && d.line.parentNode) d.line.parentNode.removeChild(d.line);
    row.classList.remove("dragging");
    row.style.removeProperty("--drag-dy");
    this._drag = null;
    Utils.haptic(16);
    const ids = [...list.querySelectorAll(".encounter-row, .encounter-nrow")].map((r) => r.dataset.id);
    Encounter.reorderByIds(ids); // → _commit → re-render (détruit ces nœuds)
    // La ligne re-rendue joue la « repose » du sticker (dépassement → 0).
    const esc = window.CSS && CSS.escape ? CSS.escape(droppedId) : droppedId;
    const fresh = list.querySelector(`.encounter-row[data-id="${esc}"], .encounter-nrow[data-id="${esc}"]`);
    if (fresh) {
      fresh.classList.add("just-dropped");
      fresh.addEventListener("animationend", () => fresh.classList.remove("just-dropped"), { once: true });
    }
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.EncounterDrag = EncounterDrag;
