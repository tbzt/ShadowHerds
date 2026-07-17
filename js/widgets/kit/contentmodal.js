"use strict";

/* ============================================================
   CONTENT MODAL — affiche la description d'un contenu en un clic
   (arme, sort, pouvoir, trait). Modale légère, fermeture au clic
   en dehors, sur la croix, ou avec Échap.
   ============================================================ */
export const ContentModal = {
  _el: null,
  _delegated: false,

  /* Délégation globale : tout clic / touche Enter|Espace sur un
     [data-content-name] ouvre la modale. dataset décode automatiquement
     les entités HTML (&#39;, &quot;…), donc le texte affiché est correct. */
  bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;
    const open = (target) => {
      const tag = target.closest("[data-content-name]");
      if (!tag) return false;
      this.show(tag.dataset.contentName, tag.dataset.contentDesc || "");
      return true;
    };
    document.addEventListener("click", (e) => open(e.target));
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const tag = e.target.closest && e.target.closest("[data-content-name]");
      if (tag) {
        e.preventDefault();
        this.show(tag.dataset.contentName, tag.dataset.contentDesc || "");
      }
    });
  },

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "content-modal-overlay";
    overlay.id = "content-modal-overlay";
    overlay.innerHTML = `
      <div class="content-modal" role="dialog" aria-modal="true">
        <button class="content-modal-close" aria-label="Fermer">&times;</button>
        <h3 class="content-modal-title"></h3>
        <p class="content-modal-desc"></p>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.hide();
    });
    overlay
      .querySelector(".content-modal-close")
      .addEventListener("click", () => this.hide());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.hide();
    });
    this._el = overlay;
    return overlay;
  },

  show(nom, desc) {
    const el = this._ensure();
    el.querySelector(".content-modal-title").textContent = nom;
    el.querySelector(".content-modal-desc").textContent = desc;
    el.classList.add("visible");
  },

  hide() {
    if (this._el) this._el.classList.remove("visible");
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.ContentModal = ContentModal;
