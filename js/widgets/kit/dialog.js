"use strict";

/* ============================================================
   DIALOG — modales internes prompt() / confirm()
   ------------------------------------------------------------
   Remplace les fenêtres natives du navigateur (window.prompt,
   window.confirm) par de vraies modales intégrées, cohérentes
   avec le thème de l'édition active. Un seul overlay singleton,
   réutilisé ; chaque appel renvoie une Promise.

     Dialog.prompt({ title, label, value, placeholder })
        -> Promise<string|null>   (null si annulé)
     Dialog.confirm({ title, message, danger })
        -> Promise<boolean>

   Câblage par délégation, fermeture au clic en dehors, sur la
   croix, avec Échap (annule) ou Entrée (valide). Réutilise les
   classes .modal-overlay / .modal, donc hérite du thème sans
   surcharge par édition.
   ============================================================ */
export const Dialog = {
  _el: null,
  _resolve: null,
  _mode: null, // "prompt" | "confirm"

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay dialog-overlay";
    overlay.id = "dialog-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal dialog-modal">
        <div class="modal-header">
          <span class="modal-title" data-dialog="title"></span>
          <button class="modal-close" data-dialog-action="cancel" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body dialog-body">
          <label class="dialog-label" data-dialog="label"></label>
          <input type="text" class="dialog-input" data-dialog="input" autocomplete="off">
          <p class="dialog-message" data-dialog="message"></p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" data-dialog-action="cancel">Annuler</button>
          <button class="btn-primary" data-dialog-action="confirm" data-dialog="confirm-btn">Valider</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this._settle(null);
        return;
      }
      const btn = e.target.closest("[data-dialog-action]");
      if (!btn) return;
      if (btn.dataset.dialogAction === "cancel") this._settle(null);
      else if (btn.dataset.dialogAction === "confirm") this._commit();
    });

    // Clavier : capture pour passer AVANT les raccourcis globaux d'app.js.
    // Échap annule, Entrée valide. On stoppe la propagation tant que la
    // modale est ouverte pour neutraliser ces raccourcis.
    document.addEventListener(
      "keydown",
      (e) => {
        if (!overlay.classList.contains("open")) return;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this._settle(null);
        } else if (e.key === "Enter") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this._commit();
        }
      },
      true,
    );

    this._el = overlay;
    return overlay;
  },

  /** Modale de saisie. Résout avec la valeur saisie (trim conservé côté
      appelant) ou null si annulée. */
  prompt({
    title = "",
    label = "",
    value = "",
    placeholder = "",
    confirmLabel = "Valider",
  } = {}) {
    const overlay = this._ensure();
    this._mode = "prompt";
    overlay.querySelector('[data-dialog="title"]').textContent = title;
    const labelEl = overlay.querySelector('[data-dialog="label"]');
    labelEl.textContent = label;
    labelEl.style.display = label ? "" : "none";
    overlay.querySelector('[data-dialog="message"]').style.display = "none";
    const input = overlay.querySelector('[data-dialog="input"]');
    input.style.display = "";
    input.value = value || "";
    input.placeholder = placeholder || "";
    overlay.querySelector('[data-dialog="confirm-btn"]').textContent =
      confirmLabel;
    overlay
      .querySelector('[data-dialog="confirm-btn"]')
      .classList.remove("danger-btn");

    return this._open(() => {
      input.focus();
      input.select();
    });
  },

  /** Modale de confirmation. Résout avec true (validé) ou false (annulé). */
  confirm({
    title = "",
    message = "",
    confirmLabel = "Confirmer",
    danger = false,
  } = {}) {
    const overlay = this._ensure();
    this._mode = "confirm";
    overlay.querySelector('[data-dialog="title"]').textContent = title;
    overlay.querySelector('[data-dialog="label"]').style.display = "none";
    overlay.querySelector('[data-dialog="input"]').style.display = "none";
    const msgEl = overlay.querySelector('[data-dialog="message"]');
    msgEl.textContent = message;
    msgEl.style.display = "";
    const confirmBtn = overlay.querySelector('[data-dialog="confirm-btn"]');
    confirmBtn.textContent = confirmLabel;
    confirmBtn.classList.toggle("danger-btn", !!danger);

    return this._open(() => confirmBtn.focus()).then((v) => v !== null);
  },

  _open(afterShow) {
    const overlay = this._el;
    // Une modale déjà ouverte est annulée avant d'en présenter une autre.
    if (this._resolve) this._settle(null);
    const promise = new Promise((resolve) => {
      this._resolve = resolve;
    });
    overlay.classList.add("open");
    // Laisse le layout s'appliquer avant le focus (transition/scroll).
    requestAnimationFrame(() => afterShow && afterShow());
    return promise;
  },

  /** Valide : renvoie la valeur du champ (prompt) ou true (confirm). */
  _commit() {
    if (this._mode === "prompt") {
      const input = this._el.querySelector('[data-dialog="input"]');
      this._settle(input.value);
    } else {
      this._settle(true);
    }
  },

  /** Ferme et résout la Promise en cours avec `value`. */
  _settle(value) {
    if (this._el) this._el.classList.remove("open");
    const resolve = this._resolve;
    this._resolve = null;
    this._mode = null;
    if (resolve) resolve(value);
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.Dialog = Dialog;
