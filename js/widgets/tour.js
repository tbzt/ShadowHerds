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
const Tour = {
  _steps: [],
  _i: 0,
  _active: false,
  _root: null,
  _onEnd: null,
  _MOBILE: 640,

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
