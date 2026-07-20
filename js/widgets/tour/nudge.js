"use strict";

/* ============================================================
   NUDGE — co-MJ contextuel (VIS-1). Offre, UNE fois, une capacité déjà codée
   qui sert cet instant, puis se tait. Semence : le mécanisme + un nudge par
   lot. Leaf (n'importe que Storage) : il ne lit AUCUN état de jeu lui-même —
   ce sont les surfaces qui possèdent déjà l'état (encounter, magicaction…) qui
   POUSSENT l'offre au bon moment via `offer()`. D'où : zéro polling, zéro
   dépendance remontante, zéro branche d'édition ici.

   Garde-fous (cadrage CODIR 2026-07-19) :
   - « informer, jamais décider » : le nudge OFFRE, le MJ tape le CTA (raccourci
     vers une action déjà codée) ou l'ignore. Non-modal (`role="status"`), ne
     vole pas le focus, n'interrompt jamais un geste.
   - vu une fois : ledger `nudges_seen` (Storage global) ; marqué À L'AFFICHAGE
     (un nudge re-joué après reload est le pire cas), pas à la fermeture.
   - anti-cascade : au plus 1 nudge NEUF par scène (throttle mémoire, non
     persisté, remis à zéro par `enterScene()`), et un seul visible à la fois.
   - maître on/off : `init({enabled})` / `setEnabled()` (réglage Paramètres).
   Chrome créé dynamiquement, câblé par délégation `data-action` (jamais d'onclick).
   ============================================================ */
import { Storage } from "../../core/storage.js";

export const Nudge = {
  _LEDGER: "nudges_seen", // Storage global : { <id>: true }
  _MOBILE: 640,
  _enabled: true,
  _shownThisScene: false, // throttle de SESSION, jamais persisté
  _open: null, // id du nudge affiché (file à un seul élément)
  _cta: null, // closure du CTA courant
  _anchor: null,
  _root: null,

  /** app.js : maître on/off (réglage « Astuces du co-MJ »). */
  init({ enabled = true } = {}) {
    this._enabled = enabled !== false;
    if (!this._enabled) this._dismiss();
  },

  /** Réglage Paramètres, à chaud : couper masque aussi un nudge déjà ouvert. */
  setEnabled(on) {
    this._enabled = !!on;
    if (!on) this._dismiss();
  },

  /** Nouvelle scène vivante : rouvre le budget « 1 nudge neuf / scène ». */
  enterScene() {
    this._shownThisScene = false;
  },

  /** « Revoir les astuces » (Paramètres) : vide le ledger — toutes les astuces
      déjà vues réapparaîtront à leur prochain déclencheur. Réarme aussi le budget
      de scène pour qu'un nudge puisse surgir sans attendre la scène suivante.
      Contrepartie assumée du marquage « à l'affichage » (une astuce entr'aperçue
      était sinon brûlée). */
  reset() {
    Storage.setGlobal(this._LEDGER, {});
    this._shownThisScene = false;
  },

  seen(id) {
    return !!(Storage.getGlobal(this._LEDGER, {}) || {})[id];
  },

  /** Offre un nudge, une seule fois. No-op si désactivé, déjà vu, throttle
      épuisé, ou un nudge déjà ouvert. `cta` = { label, run } (run : closure
      exécutée au tap ; le CTA fait l'action, il ne désigne pas un contrôle).
      `dismissLabel` : libellé du bouton de sortie (défaut « Plus tard » avec CTA,
      « Compris » sans). `throttled` (défaut true) : soumis au budget « 1
      nudge/scène ». Un nudge déclenché par une action délibérée HORS scène (ex.
      maintien de sort) passe `throttled: false` — le throttle scène-borné le
      bloquerait sinon indéfiniment ; il respecte toujours `_open` et « vu une
      fois », donc jamais d'empilement ni de répétition. */
  offer(id, { anchor, title, body, cta, dismissLabel, throttled = true } = {}) {
    if (!this._enabled || this._open) return;
    if (throttled && this._shownThisScene) return;
    if (!id || this.seen(id)) return;
    this._show(id, { anchor, title, body, cta, dismissLabel, throttled });
  },

  _markSeen(id) {
    const m = Storage.getGlobal(this._LEDGER, {}) || {};
    m[id] = true;
    Storage.setGlobal(this._LEDGER, m);
  },

  _show(id, { anchor, title, body, cta, dismissLabel, throttled = true }) {
    this._ensureRoot();
    const q = (s) => this._root.querySelector(s);
    q(".nudge-title").textContent = title || "";
    q(".nudge-body").textContent = body || "";
    const ctaBtn = q('[data-action="nudge-cta"]');
    if (cta && cta.run) {
      this._cta = cta.run;
      ctaBtn.textContent = cta.label || "OK";
      ctaBtn.hidden = false;
    } else {
      this._cta = null;
      ctaBtn.hidden = true;
    }
    // Bouton de sortie : « Plus tard » quand une action est à différer,
    // « Compris » pour un nudge purement informatif.
    q('.nudge-actions [data-action="nudge-dismiss"]').textContent =
      dismissLabel || (cta && cta.run ? "Plus tard" : "Compris");
    this._anchor = anchor || null;
    this._place();
    this._root.hidden = false;
    this._open = id;
    if (throttled) this._shownThisScene = true; // les nudges hors scène ne consomment pas le budget
    this._markSeen(id); // T1 : marquer vu À L'AFFICHAGE
  },

  /* ---- chrome (non-modal, aucun scrim qui bloque) ---- */
  _ensureRoot() {
    if (this._root) return;
    const r = document.createElement("div");
    r.id = "nudge-root";
    r.className = "nudge-root";
    r.hidden = true;
    r.innerHTML = `
      <div class="nudge-card" role="status" aria-live="polite">
        <button class="nudge-close" data-action="nudge-dismiss" aria-label="Fermer">✕</button>
        <p class="nudge-title"></p>
        <p class="nudge-body"></p>
        <div class="nudge-actions">
          <button class="btn-secondary btn-small" data-action="nudge-dismiss">Plus tard</button>
          <button class="btn-primary btn-small" data-action="nudge-cta"></button>
        </div>
      </div>`;
    document.body.appendChild(r);
    this._root = r;

    r.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      if (el.dataset.action === "nudge-dismiss") this._dismiss();
      else if (el.dataset.action === "nudge-cta") this._runCta();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._open) this._dismiss();
    });
    const reflow = () => {
      if (this._open) this._place();
    };
    window.addEventListener("resize", reflow);
    window.addEventListener("scroll", reflow, true);
  },

  /** Ancre visible (sidebar OU bottom-nav — celle réellement affichée). */
  _resolveAnchor() {
    if (!this._anchor) return null;
    const els = [...document.querySelectorAll(`[data-tour="${this._anchor}"]`)];
    return els.find((el) => el.offsetParent !== null && el.getClientRects().length) || null;
  },

  /** Sur mobile OU sans ancre visible : mode « coin » (position portée par le
      CSS, au-dessus de la bottom-nav). Sur desktop : à côté de l'ancre, replié à
      gauche si ça déborde (même logique que Tour._place, sans scrim ni anneau). */
  _place() {
    const card = this._root.querySelector(".nudge-card");
    const el = window.innerWidth <= this._MOBILE ? null : this._resolveAnchor();
    this._root.classList.toggle("nudge-corner", !el);
    if (!el) {
      card.style.left = card.style.top = "";
      return;
    }
    const r = el.getBoundingClientRect();
    const cw = card.offsetWidth || 300;
    const ch = card.offsetHeight || 140;
    let left = r.right + 14;
    if (left + cw > window.innerWidth - 12) left = r.left - cw - 14;
    if (left < 12) left = 12;
    const top = Math.max(12, Math.min(r.top, window.innerHeight - ch - 12));
    card.style.left = left + "px";
    card.style.top = top + "px";
  },

  _runCta() {
    const run = this._cta;
    this._dismiss();
    if (run) run();
  },

  _dismiss() {
    if (this._root) this._root.hidden = true;
    this._open = null;
    this._cta = null;
  },
};
