"use strict";

/* ============================================================
   CONTACT CREATE — modale de création rapide d'un contact
   depuis une fiche PJ (bouton « ＋ » → « ＋ Créer un contact »).

   Complète le flux d'ajout rapide (cf. CardRenderer._contactLinksSection) :
   le lien vers un contact EXISTANT se fait en un clic dans la liste-popover ;
   ici on CRÉE un nouveau contact du carnet — seul le nom est obligatoire, le
   reste est facultatif — puis on le lie au PJ. Le contact est un vrai membre
   de ContactsBook, complétable ensuite sur sa fiche.

   Singleton sur le même patron que Dialog (overlay .modal-overlay/.modal, thème
   hérité, croix/clic-dehors/Échap, câblage par délégation data-action — jamais
   d'onclick inline). Dispatch des champs de niveau via l'API neutre de
   l'édition (usesRiskPanel), comme ContactGen.generate — aucune branche
   App.edition (prohibition #1).
   ============================================================ */
const ContactCreate = {
  _el: null,
  _pjId: null,
  _pjEdition: null,

  /** Appelée une fois au boot (app.js) : construit l'overlay et câble ses
      écouteurs. Idempotent. */
  bindDelegation() {
    this._ensure();
  },

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay dialog-overlay";
    overlay.id = "contact-create-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal dialog-modal">
        <div class="modal-header">
          <span class="modal-title" data-cc="title">Créer un contact</span>
          <button class="modal-close" data-action="cc-cancel" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body" data-cc="body"></div>
        <div class="modal-footer">
          <button class="btn-secondary" data-action="cc-cancel">Annuler</button>
          <button class="btn-primary" data-action="cc-submit">Créer &amp; lier</button>
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
      if (btn.dataset.action === "cc-cancel") this._close();
      else if (btn.dataset.action === "cc-submit") this._submit();
    });

    // Clavier : capture pour passer AVANT les raccourcis globaux (même patron
    // que Dialog). Échap ferme, Entrée valide (hors champ multiligne — ici
    // aucun textarea, donc Entrée = créer).
    document.addEventListener(
      "keydown",
      (e) => {
        if (!overlay.classList.contains("open")) return;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this._close();
        } else if (e.key === "Enter") {
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

  /** Ouvre la modale pour créer un contact et le lier au PJ `pjId`. */
  open(pjId) {
    const pj = typeof Characters !== "undefined"
      ? Characters.data.all.find((p) => p.id === pjId)
      : null;
    if (!pj) return;
    this._pjId = pjId;
    this._pjEdition = pj.edition;
    const overlay = this._ensure();
    overlay.querySelector('[data-cc="body"]').innerHTML = this._form(pj);
    overlay.classList.add("open");
    requestAnimationFrame(() => {
      const nameEl = overlay.querySelector("#cc-name");
      if (nameEl) nameEl.focus();
    });
  },

  /** Corps du formulaire : nom requis + champs facultatifs. Les champs de
      niveau dépendent de l'édition du PJ via `usesRiskPanel` (Niveau/RR pour
      Anarchy 2, Influence/Loyauté sinon) — même dispatch que ContactGen. */
  _form(pj) {
    const metas = ContactGen.METATYPES.map(
      (m) => `<option value="${m}">${m}</option>`,
    ).join("");
    const ratings = App.getEditionModule(pj.edition)?.usesRiskPanel
      ? `<label>Niveau
           <input type="number" id="cc-level" min="0" max="6" placeholder="1">
         </label>
         <label>RR (loyauté / réseau)
           <input type="number" id="cc-rr" min="1" max="3" placeholder="1">
         </label>`
      : `<label>Influence
           <input type="number" id="cc-influence" min="1" max="12" placeholder="1">
         </label>
         <label>Loyauté
           <input type="number" id="cc-loyaute" min="1" max="6" placeholder="1">
         </label>`;
    return `
      <div class="contact-form">
        <div class="contact-form-row">
          <label>Nom <span class="cc-req">*</span>
            <input type="text" id="cc-name" placeholder="Nom du contact" autocomplete="off">
          </label>
          <label>Métatype
            <select id="cc-meta">${metas}</select>
          </label>
        </div>
        <div class="contact-form-row">
          <label>Rôle / métier
            <input type="text" id="cc-role" placeholder="ex. fixer, indic…" autocomplete="off">
          </label>
        </div>
        <div class="contact-form-row">${ratings}</div>
        <p class="contact-form-hint">Seul le nom est requis. Vous pourrez compléter la fiche du contact ensuite.</p>
      </div>`;
  },

  _val(id) {
    const el = this._el.querySelector(id);
    return el ? el.value : "";
  },

  _submit() {
    const name = this._val("#cc-name").trim();
    if (!name) {
      toast("Le nom du contact est requis.", "warning");
      const nameEl = this._el.querySelector("#cc-name");
      if (nameEl) nameEl.focus();
      return;
    }
    const c = ContactsBook.createManual(
      {
        name,
        role: this._val("#cc-role"),
        metatype: this._val("#cc-meta"),
        influence: this._val("#cc-influence"),
        loyaute: this._val("#cc-loyaute"),
        level: this._val("#cc-level"),
        rr: this._val("#cc-rr"),
      },
      // L'édition du contact suit celle du PJ (le formulaire dispatche déjà ses
      // champs sur pj.edition) — pas App.edition, qui pourrait différer.
      this._pjEdition,
    );
    // Lien nu (relation/loyauté du lien qualifiables ensuite via Éditer) :
    // addContactLink persiste + rafraîchit la carte du PJ.
    Characters.addContactLink(this._pjId, c.id, "", null);
    toast(`✓ ${c.name} créé et lié.`);
    this._close();
  },

  _close() {
    if (this._el) this._el.classList.remove("open");
    this._pjId = null;
    this._pjEdition = null;
  },
};
