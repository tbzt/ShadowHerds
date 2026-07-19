"use strict";

/* ============================================================
   TOPOS EDIT — modale d'édition d'un topos (carte de topos →
   bouton « Éditer »), et cible du bouton « Topos vierge » de RunGen.

   Même patron singleton que ContactEdit/Dialog : overlay
   .modal-overlay/.modal (thème hérité), fermeture croix/clic-dehors/
   Échap, validation Entrée, câblage par délégation data-action —
   jamais d'onclick inline.

   N'édite que les champs PLATS de l'amorce (objectif, mandant, lieu,
   complication, bonus, paiement, difficulté) ; les clés structurées
   (opposition, district, securityProfile…) restent celles de la
   génération. Conséquence assumée : un topos édité à la main garde le
   casting de sa génération d'origine, et un topos vierge n'en a pas.
   ============================================================ */
export const ToposEdit = {
  _el: null,
  _runId: null,

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay dialog-overlay";
    overlay.id = "topos-edit-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal dialog-modal">
        <div class="modal-header">
          <span class="modal-title">Éditer le topos</span>
          <button class="modal-close" data-action="te-cancel" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body" data-te="body"></div>
        <div class="modal-footer">
          <button class="btn-secondary" data-action="te-cancel">Annuler</button>
          <button class="btn-primary" data-action="te-submit">Enregistrer</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this._close();
        return;
      }
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "te-cancel") this._close();
      else if (btn.dataset.action === "te-submit") this._submit();
    });

    // Clavier en capture (avant les raccourcis globaux), comme ContactEdit :
    // Échap ferme ; Entrée valide, sauf dans un textarea (saut de ligne).
    document.addEventListener(
      "keydown",
      (e) => {
        if (!overlay.classList.contains("open")) return;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this._close();
        } else if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this._submit();
        }
      },
      true,
    );

    this._el = overlay;
    return overlay;
  },

  /** Ouvre la modale sur le topos `runId` (dans RunGen._runs). */
  open(runId) {
    const t = (typeof RunGen !== "undefined" ? RunGen._runs : []).find(
      (r) => r.id === runId,
    );
    if (!t) return;
    this._runId = runId;
    const overlay = this._ensure();
    overlay.querySelector('[data-te="body"]').innerHTML = this._form(t);
    overlay.classList.add("open");
    requestAnimationFrame(() => {
      const el = overlay.querySelector("#te-type");
      if (el) {
        el.focus();
        el.select();
      }
    });
  },

  _field(id, label, value, textarea = false) {
    const esc = CardRenderer._esc;
    const control = textarea
      ? `<textarea id="${id}" class="dialog-input" rows="2">${esc(value || "")}</textarea>`
      : `<input type="text" id="${id}" class="dialog-input" value="${esc(value || "")}" autocomplete="off">`;
    return `<label class="dialog-label" for="${id}">${label}</label>${control}`;
  },

  _form(t) {
    return `<div class="topos-form">
      ${this._field("te-type", "Objectif", t.type)}
      ${this._field("te-client", "Mandant", t.client)}
      ${this._field("te-lieu", "Lieu", t.lieu)}
      ${this._field("te-complication", "Complication", t.complication, true)}
      ${this._field("te-objectif2", "Objectif secondaire", t.objectif2)}
      ${this._field("te-payment", "Paiement", t.payment)}
      ${this._field("te-difficulte", "Difficulté", t.difficulte)}
    </div>`;
  },

  _val(id) {
    const el = this._el.querySelector(id);
    return el ? el.value.trim() : "";
  },

  _submit() {
    if (typeof RunGen === "undefined") return this._close();
    RunGen.updateTopos(this._runId, {
      type: this._val("#te-type"),
      client: this._val("#te-client"),
      lieu: this._val("#te-lieu"),
      complication: this._val("#te-complication"),
      objectif2: this._val("#te-objectif2"),
      payment: this._val("#te-payment"),
      difficulte: this._val("#te-difficulte"),
    });
    toast("✓ Topos mis à jour.");
    this._close();
  },

  _close() {
    if (this._el) this._el.classList.remove("open");
    this._runId = null;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.ToposEdit = ToposEdit;
