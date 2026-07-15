"use strict";

/* ============================================================
   BREAKDOWN — popover d'explication décomposée d'une réserve
   (Défense, Encaissement, Drain…), déclenché par l'affordance ⓘ
   séparée du geste de lancer (data-explain, posée par CardRenderer.
   _rollPill). Recalcule reserveBreakdown(pnj,key) à la demande (aucune
   donnée persistée) — un seul panneau flottant réutilisé, ancré au
   déclencheur sur desktop/tablette, promu en bottom-sheet sur mobile.
   ============================================================ */
const Breakdown = {
  _resolve: null,
  _el: null,
  _trigger: null,

  /** resolve(pnjId) -> pnj, même hook que DiceRoller.init. */
  init({ resolve }) {
    this._resolve = resolve;

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-explain]");
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        if (this._trigger === trigger) this.close();
        else this.open(trigger);
        return;
      }
      if (this._el && !e.target.closest(".breakdown-pop")) this.close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });

    window.addEventListener("scroll", () => this.close(), true);
    window.addEventListener("resize", () => this.close());

    // Survol desktop/tablette (pointeur) seulement — évite le double
    // déclenchement hover+tap sur tactile (Vector).
    if (window.matchMedia && matchMedia("(hover:hover)").matches) {
      document.addEventListener("mouseover", (e) => {
        const trigger = e.target.closest("[data-explain]");
        if (trigger) this.open(trigger);
      });
      document.addEventListener("mouseout", (e) => {
        const trigger = e.target.closest("[data-explain]");
        if (trigger && !trigger.contains(e.relatedTarget)) this.close();
      });
    }
  },

  open(trigger) {
    const key = trigger.dataset.explain;
    const pnj = this._resolve ? this._resolve(trigger.dataset.explainPnj) : null;
    if (!pnj) return;
    const ed = App.getEditionModule(pnj.edition);
    const bd = ed && ed.reserveBreakdown ? ed.reserveBreakdown(pnj, key) : null;
    if (!bd || !bd.length) return;
    this._render(trigger, key, bd);
  },

  close() {
    if (this._el) this._el.remove();
    this._el = null;
    if (this._trigger) this._trigger.removeAttribute("aria-describedby");
    this._trigger = null;
  },

  _LABELS: { defense: "Défense", damageResist: "Encaissement", drainResist: "Drain" },

  _render(trigger, key, bd) {
    this.close();
    const total = bd.reduce((s, c) => s + c.value, 0);
    const isSheet = !!(window.matchMedia && matchMedia("(max-width: 640px)").matches);
    const el = document.createElement("div");
    el.className = "breakdown-pop" + (isSheet ? " breakdown-sheet" : "");
    el.id = "breakdown-pop-" + Utils.uid();
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Détail du calcul — " + (this._LABELS[key] || key));
    el.innerHTML = this._html(key, total, bd);
    document.body.appendChild(el);
    trigger.setAttribute("aria-describedby", el.id);
    this._el = el;
    this._trigger = trigger;
    if (!isSheet) this._position(trigger, el);
  },

  _html(key, total, bd) {
    const esc = Utils.escHtml;
    const lines = bd
      .map((c) => {
        const sub = (c.detail || [])
          .map(
            (d) =>
              `<div class="breakdown-sub" data-negative="${d.value < 0}"><span>${esc(d.label)}</span><span>${d.value >= 0 ? "" : "−"}${Math.abs(d.value)}</span></div>`,
          )
          .join("");
        return `<div class="breakdown-line" data-negative="${c.value < 0}"><span>${esc(c.label)}</span><span>${c.value >= 0 ? "" : "−"}${Math.abs(c.value)}</span></div>${sub}`;
      })
      .join("");
    return `<div class="breakdown-title">${esc(this._LABELS[key] || key)} <strong>${total}</strong></div>
      <div class="breakdown-lines">${lines}</div>`;
  },

  _position(trigger, el) {
    const r = trigger.getBoundingClientRect();
    const pr = el.getBoundingClientRect();
    let top = r.bottom + 6;
    let left = r.left;
    if (left + pr.width > window.innerWidth - 8) left = window.innerWidth - pr.width - 8;
    if (top + pr.height > window.innerHeight - 8) top = r.top - pr.height - 6;
    el.style.top = Math.max(8, top) + "px";
    el.style.left = Math.max(8, left) + "px";
  },
};
