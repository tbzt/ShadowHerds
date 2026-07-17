"use strict";

/* ============================================================
   TOUR — moteur générique de visite guidée (V9 · G1).
   Zéro contenu (cf. toursteps.js), zéro branche d'édition. Résout des ancres
   `[data-tour]` (sidebar OU bottom-nav — celle qui est visible), pose un scrim
   + un anneau sur la cible + une carte auto-positionnée (bottom-sheet < 641px),
   navigue au clavier (Échap / ← →), respecte prefers-reduced-motion. Le chrome
   est créé dynamiquement (aucun markup dans index.html) et câblé par délégation
   `data-action` locale (jamais d'onclick).

   API publique : Tour.start("full" | "orientation" | ..., { onEnd? }).
   Filtrage capacité (`step.capability`) : hook `_hasCapability`, neutre en G1
   (aucune étape à capacité) ; l'API résolue par l'édition arrive en G3.
   ============================================================ */
import { Debug } from "../core/debug.js";
import { Storage } from "../core/storage.js";
import { TourSteps } from "./toursteps.js";

export const Tour = {
  _steps: [],
  _i: 0,
  _active: false,
  _root: null,
  _onEnd: null,
  _MOBILE: 640,
  _navigate: null,
  _version: "0.0.0",

  /** Injection depuis app.js : `navigate` (navigation par panneau pour les
      étapes à `panel`) et `version` (App.VERSION, base du « Quoi de neuf »).
      Garde le moteur édition-agnostique — aucun App.* en dur ici. */
  init(opts = {}) {
    this._navigate = opts.navigate || null;
    this._version = opts.version || "0.0.0";
  },

  /** Démarre un parcours. Ne fait rien si aucune étape n'y appartient. */
  start(tourName, opts = {}) {
    const all = (typeof TourSteps !== "undefined" && TourSteps.steps) || [];
    this._steps = all.filter(
      (s) => (s.tours || []).includes(tourName) && this._hasCapability(s.capability),
    );
    if (!this._steps.length) return;
    this._onEnd = opts.onEnd || null;
    this._i = 0;
    this._active = true;
    this._ensureRoot();
    this._root.hidden = false;
    document.addEventListener("keydown", this._onKey, true);
    this._render();
  },

  next() {
    if (this._i < this._steps.length - 1) {
      this._i++;
      this._render();
    } else {
      this.end();
    }
  },

  prev() {
    if (this._i > 0) {
      this._i--;
      this._render();
    }
  },

  /** Sortie (Passer / ✕ / Échap / clic hors carte). Idempotente. */
  end() {
    if (!this._active) return;
    this._active = false;
    document.removeEventListener("keydown", this._onKey, true);
    if (this._root) this._root.hidden = true;
    const cb = this._onEnd;
    this._onEnd = null;
    if (cb) cb();
  },

  /* ---- capacité (neutre en G1, résolue par l'édition en G3) ---- */
  _hasCapability(cap) {
    return true;
  },

  /* ---- « Montre-moi » : démo d'une seule étape depuis Quoi de neuf ---- */
  demo(stepId) {
    const all = (typeof TourSteps !== "undefined" && TourSteps.steps) || [];
    const s = all.find((x) => x.id === stepId);
    if (!s) return;
    this._onEnd = null;
    this._steps = [s];
    this._i = 0;
    this._active = true;
    this._ensureRoot();
    this._root.hidden = false;
    document.addEventListener("keydown", this._onKey, true);
    this._render();
  },

  /* ---- « Quoi de neuf » : delta cumulé depuis la dernière version vue ---- */
  _semverGt(a, b) {
    const pa = String(a || "0").split(".").map(Number);
    const pb = String(b || "0").split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
    }
    return false;
  },

  /** Étapes annoncées (`tours` contient "whatsnew") plus récentes que `seen`. */
  _newsSince(seen) {
    const all = (typeof TourSteps !== "undefined" && TourSteps.steps) || [];
    return all.filter(
      (s) => s.since && (s.tours || []).includes("whatsnew") && this._semverGt(s.since, seen),
    );
  },

  /** Pose/retire le badge sur le bouton Aide + met à jour l'entrée « Quoi de
      neuf (N) ». Migration douce : un profil déjà onboardé mais sans version
      vue (pré-G3) est calé sur la version courante — pas de faux badge. */
  refreshBadge() {
    if (
      Storage.getGlobal("tour_seen", false) &&
      Storage.getGlobal("tour_seen_version", null) == null
    ) {
      Storage.setGlobal("tour_seen_version", this._version);
    }
    const seen = Storage.getGlobal("tour_seen_version", null);
    const n = seen != null ? this._newsSince(seen).length : 0;
    const help = document.querySelector('[data-action="toggle-shortcuts"]');
    if (help) help.classList.toggle("has-news", n > 0);
    const entry = document.getElementById("help-whatsnew");
    if (entry) {
      entry.hidden = n === 0;
      entry.textContent = `✦ Quoi de neuf (${n})`;
    }
  },

  /** Ouvre le panneau consolidé (une seule fenêtre quel que soit le nombre de
      versions sautées), groupé par version décroissante. */
  openWhatsNew() {
    const seen = Storage.getGlobal("tour_seen_version", null);
    const items = this._newsSince(seen);
    if (!items.length) return;
    const byVer = {};
    for (const s of items) (byVer[s.since] = byVer[s.since] || []).push(s);
    const versions = Object.keys(byVer).sort((a, b) => (this._semverGt(a, b) ? -1 : 1));
    const esc = (t) =>
      String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const rows = versions
      .map(
        (v) =>
          `<div class="wn-group"><div class="wn-ver">v${esc(v)}</div>` +
          byVer[v]
            .map(
              (s) =>
                `<div class="wn-row"><div class="wn-txt"><strong>${esc(s.title)}</strong><span>${esc(s.body)}</span></div>` +
                `<button class="btn-secondary btn-small" data-action="wn-demo" data-step="${esc(s.id)}">Montre-moi</button></div>`,
            )
            .join("") +
          `</div>`,
      )
      .join("");
    let root = document.getElementById("whatsnew-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "whatsnew-root";
      root.className = "whatsnew-root";
      root.hidden = true;
      document.body.appendChild(root);
      root.addEventListener("click", (e) => {
        const el = e.target.closest("[data-action]");
        if (!el) return;
        if (el.dataset.action === "wn-close") this._closeWhatsNew();
        else if (el.dataset.action === "wn-demo") {
          const id = el.dataset.step;
          this._closeWhatsNew();
          this.demo(id);
        }
      });
    }
    root.innerHTML =
      `<div class="wn-scrim" data-action="wn-close"></div>` +
      `<div class="wn-panel" role="dialog" aria-modal="true" aria-label="Quoi de neuf" tabindex="-1">` +
      `<div class="wn-head"><span class="wn-title">✦ Quoi de neuf</span>` +
      `<button class="modal-close" data-action="wn-close" aria-label="Fermer">✕</button></div>` +
      `<div class="wn-list">${rows}</div>` +
      `<div class="wn-foot"><button class="btn-primary btn-small" data-action="wn-close">Compris</button></div>` +
      `</div>`;
    root.hidden = false;
    root.querySelector(".wn-panel").focus({ preventScroll: true });
  },

  /** Fermeture : `tour_seen_version` = version courante → le badge s'éteint
      d'un coup, quel que soit le nombre de versions cumulées. */
  _closeWhatsNew() {
    const root = document.getElementById("whatsnew-root");
    if (root) root.hidden = true;
    Storage.setGlobal("tour_seen_version", this._version);
    this.refreshBadge();
  },

  /** Garde-fou dev (G4), exécuté une fois au chargement : une étape dont l'ancre
      n'existe sur AUCUN support (typo, oubli d'ancre `data-tour` dans
      index.html) est signalée en console. Jamais visible par l'utilisateur —
      passe par le canal `Debug` s'il est là (comme le self-test Coherence),
      sinon `console.warn`. Une étape sans `anchor` (carte centrée) est ignorée. */
  _auditAnchors() {
    const all = (typeof TourSteps !== "undefined" && TourSteps.steps) || [];
    const missing = all
      .filter((s) => s.anchor && !document.querySelector(`[data-tour="${s.anchor}"]`))
      .map((s) => `${s.id}→${s.anchor}`);
    if (!missing.length) return;
    const msg = "étape(s) à ancre absente (aucun support) : " + missing.join(", ");
    if (typeof Debug !== "undefined") Debug.warn("tour", msg);
    else console.warn("[tour]", msg);
  },

  /* ---- chrome ---- */
  _ensureRoot() {
    if (this._root) return;
    const r = document.createElement("div");
    r.id = "tour-root";
    r.className = "tour-root";
    r.hidden = true;
    r.innerHTML = `
      <div class="tour-scrim" data-action="tour-end"></div>
      <div class="tour-ring" aria-hidden="true"></div>
      <div class="tour-card" role="dialog" aria-modal="true" aria-live="polite" aria-labelledby="tour-title" tabindex="-1">
        <div class="tour-progress" id="tour-progress"></div>
        <h2 class="tour-title" id="tour-title"></h2>
        <p class="tour-body" id="tour-body"></p>
        <p class="tour-try" id="tour-try" hidden></p>
        <div class="tour-actions">
          <button class="btn-secondary btn-small" data-action="tour-end">Passer</button>
          <span class="tour-spacer"></span>
          <button class="btn-secondary btn-small" id="tour-prev" data-action="tour-prev">Précédent</button>
          <button class="btn-primary btn-small" id="tour-next" data-action="tour-next">Suivant</button>
        </div>
      </div>`;
    document.body.appendChild(r);
    this._root = r;

    r.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const a = el.dataset.action;
      if (a === "tour-next") this.next();
      else if (a === "tour-prev") this.prev();
      else if (a === "tour-end") this.end();
    });

    // Repositionner l'anneau/la carte si la mise en page bouge sous le tour.
    const reflow = () => {
      if (this._active) this._place();
    };
    window.addEventListener("resize", reflow);
    window.addEventListener("scroll", reflow, true);
  },

  _resolveAnchor(step) {
    if (!step.anchor) return null;
    const els = [...document.querySelectorAll(`[data-tour="${step.anchor}"]`)];
    // La bonne ancre = celle réellement visible (sidebar desktop vs bottom-nav).
    return els.find((el) => el.offsetParent !== null && el.getClientRects().length) || null;
  },

  _render() {
    const step = this._steps[this._i];
    // Étape à `panel` : amener le bon écran AVANT de résoudre l'ancre.
    if (step.panel && this._navigate) this._navigate(step.panel);
    const q = (sel) => this._root.querySelector(sel);
    q("#tour-title").textContent = step.title || "";
    q("#tour-body").textContent = step.body || "";
    const tryEl = q("#tour-try");
    tryEl.textContent = step.try ? "Essayez : " + step.try : "";
    tryEl.hidden = !step.try;
    q("#tour-progress").textContent = `${this._i + 1} / ${this._steps.length}`;
    const prev = q("#tour-prev");
    prev.style.visibility = this._i === 0 ? "hidden" : "";
    q("#tour-next").textContent =
      this._i === this._steps.length - 1 ? "Terminer" : "Suivant";
    this._place();
    q(".tour-card").focus({ preventScroll: true });
  },

  _place() {
    const step = this._steps[this._i];
    const el = this._resolveAnchor(step);
    const ring = this._root.querySelector(".tour-ring");
    const card = this._root.querySelector(".tour-card");

    if (!el) {
      if (step.fallback === "skip") return this.next();
      ring.style.display = "none";
      this._root.classList.add("tour-centered");
      card.style.left = card.style.top = "";
      return;
    }
    this._root.classList.remove("tour-centered");
    const r = el.getBoundingClientRect();
    ring.style.display = "";
    ring.style.left = r.left - 6 + "px";
    ring.style.top = r.top - 6 + "px";
    ring.style.width = r.width + 12 + "px";
    ring.style.height = r.height + 12 + "px";

    if (window.innerWidth <= this._MOBILE) {
      // Carte en bottom-sheet : la position est portée par le CSS.
      card.style.left = card.style.top = "";
      return;
    }
    // Desktop : carte à droite de la cible, repliée à gauche si elle déborde.
    const cw = card.offsetWidth || 320;
    const ch = card.offsetHeight || 160;
    let left = r.right + 16;
    if (left + cw > window.innerWidth - 12) left = r.left - cw - 16;
    if (left < 12) left = 12;
    const top = Math.max(12, Math.min(r.top, window.innerHeight - ch - 12));
    card.style.left = left + "px";
    card.style.top = top + "px";
  },

  _onKey(e) {
    if (!Tour._active) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      Tour.end();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      Tour.next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      Tour.prev();
    }
  },
};

/* Garde-fou dev : signale au chargement toute étape à ancre absente. Attend
   DOMContentLoaded, seul moment où TOUS les scripts différés ont tourné et
   où les ancres existent (`readyState` vaut déjà "interactive" pendant
   l'exécution des scripts différés — trop tôt). */
if (document.readyState === "complete") {
  Tour._auditAnchors();
} else {
  document.addEventListener("DOMContentLoaded", () => Tour._auditAnchors(), { once: true });
}

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.Tour = Tour;
