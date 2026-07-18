"use strict";

/* ============================================================
   CONTACT EDIT — modale d'édition d'un contact existant
   (carte contact → bouton « Éditer »).

   Pendant de ContactCreate : là où ContactCreate CRÉE un contact
   depuis une fiche PJ, ici on ÉDITE un contact déjà au carnet.
   Même patron singleton que ContactCreate/Dialog (overlay
   .modal-overlay/.modal, thème hérité, croix/clic-dehors/Échap,
   câblage par délégation data-action — jamais d'onclick inline).

   Le métatype est le seul champ qui n'était PAS éditable sur la
   carte (rendu statique) : on le rend ici via le sélecteur groupé
   de l'édition (editionModule.metaOptions() → 5 souches + toutes
   les métavariantes), la MÊME source que le générateur PNJ et
   EditModal — jamais une liste plate recopiée, jamais un
   if(App.edition===…) (prohibition #1). Les champs de niveau
   dispatchent via l'API neutre `usesRiskPanel` (Niveau/RR pour
   Anarchy 2, Influence/Loyauté sinon), comme ContactGen.generate.
   ============================================================ */
export const ContactEdit = {
  _el: null,
  _contactId: null,

  /** Appelée une fois au boot (app.js) : construit l'overlay et câble ses
      écouteurs. Idempotent. */
  bindDelegation() {
    this._ensure();
  },

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay dialog-overlay";
    overlay.id = "contact-edit-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal dialog-modal">
        <div class="modal-header">
          <span class="modal-title">Éditer le contact</span>
          <button class="modal-close" data-action="ce-cancel" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body" data-ce="body"></div>
        <div class="modal-footer">
          <button class="btn-secondary" data-action="ce-cancel">Annuler</button>
          <button class="btn-primary" data-action="ce-submit">Enregistrer</button>
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
      if (btn.dataset.action === "ce-cancel") this._close();
      else if (btn.dataset.action === "ce-submit") this._submit();
    });

    // Aperçu vivant du domaine/coût dérivés (Anarchy) : `input` couvre la frappe
    // dans la RR, `change` la bascule des selects Réseau/Portée. Les deux sont
    // no-op hors Anarchy (pas de #ce-derived).
    const onDeriveChange = (e) => {
      if (e.target.closest("#ce-network, #ce-scope, #ce-rr")) this._syncDerived();
    };
    overlay.addEventListener("input", onDeriveChange);
    overlay.addEventListener("change", onDeriveChange);

    // Clavier : capture pour passer AVANT les raccourcis globaux (même patron
    // que Dialog/ContactCreate). Échap ferme ; Entrée valide, SAUF dans la
    // description (textarea multiligne) où Entrée doit insérer un saut de ligne.
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

  /** Ouvre la modale pour éditer le contact `contactId` du carnet. */
  open(contactId) {
    const c =
      typeof ContactsBook !== "undefined"
        ? ContactsBook.data.all.find((x) => x.id === contactId)
        : null;
    if (!c) return;
    this._contactId = contactId;
    const overlay = this._ensure();
    overlay.querySelector('[data-ce="body"]').innerHTML = this._form(c);
    overlay.classList.add("open");
    this._syncDerived();
    requestAnimationFrame(() => {
      const nameEl = overlay.querySelector("#ce-name");
      if (nameEl) {
        nameEl.focus();
        nameEl.select();
      }
    });
  },

  /** Corps du formulaire, pré-rempli. Le sélecteur de métatype est le picker
      groupé de l'édition du contact (souches + métavariantes) — repli sur les
      5 souches si le module n'expose pas metaOptions(), même garde qu'EditModal.
      Les champs de niveau suivent `usesRiskPanel` (Niveau/RR ou Influence/
      Loyauté), comme la génération et la création. */
  _form(c) {
    const esc = CardRenderer._esc;
    const mod = App.getEditionModule(c.edition);
    const metaCfg = (mod && mod.metaOptions && mod.metaOptions()) || {
      options: ["Humain", "Elfe", "Nain", "Ork", "Troll"].map((m) => ({ value: m, label: m })),
    };
    const metaSelect = SingleSelect.create({
      id: "ce-meta",
      label: "Métatype",
      value: c.metatype || "",
      placeholder: "Métatype",
      ...metaCfg,
    });
    const editionFields = mod && mod.usesRiskPanel
      ? this._anarchyFields(c, esc)
      : `<div class="contact-form-row">
           <label>Influence
             <input type="number" id="ce-influence" min="1" max="12" value="${esc(c.influence ?? "")}">
           </label>
           <label>Loyauté
             <input type="number" id="ce-loyaute" min="1" max="6" value="${esc(c.loyaute ?? "")}">
           </label>
         </div>`;
    return `
      <div class="contact-form">
        <div class="contact-form-row">
          <label>Nom
            <input type="text" id="ce-name" value="${esc(c.name || "")}" autocomplete="off">
          </label>
          ${metaSelect}
        </div>
        <div class="contact-form-row">
          <label>Rôle / métier
            <input type="text" id="ce-role" value="${esc(c.role || "")}" autocomplete="off">
          </label>
        </div>
        ${editionFields}
        <div class="contact-form-row">
          <label>Trait
            <input type="text" id="ce-trait" value="${esc(c.trait || "")}" autocomplete="off">
          </label>
        </div>
        <div class="contact-form-row">
          <label>Description
            <textarea id="ce-desc" rows="3">${esc(c.desc || "")}</textarea>
          </label>
        </div>
      </div>`;
  },

  /** Bloc de champs Anarchy 2 : Réseau + Portée pilotent le domaine et le coût
      d'atout (dérivés, recalculés au save par ContactGen.recomputeAnarchyDerived),
      puis Niveau + RR, et une ligne d'aperçu VIVANT du domaine/coût. Selects
      natifs, comme le formulaire de génération (cg-network/cg-scope). */
  _anarchyFields(c, esc) {
    const nets = ContactGen.NETWORKS.map(
      (n) => `<option value="${n.id}"${n.id === c.networkId ? " selected" : ""}>${esc(n.label)}</option>`,
    ).join("");
    return `
      <div class="contact-form-row">
        <label>Réseau
          <select id="ce-network">${nets}</select>
        </label>
        <label>Portée
          <select id="ce-scope">
            <option value="specialisation"${c.scope !== "competence" ? " selected" : ""}>Spécialisation (un Réseau)</option>
            <option value="competence"${c.scope === "competence" ? " selected" : ""}>Compétence Réseau (tous)</option>
          </select>
        </label>
      </div>
      <div class="contact-form-row">
        <label>Niveau
          <input type="number" id="ce-level" min="0" max="6" value="${esc(c.level ?? "")}">
        </label>
        <label>RR (loyauté / réseau)
          <input type="number" id="ce-rr" min="1" max="3" value="${esc(c.rr ?? "")}">
        </label>
      </div>
      <p class="contact-form-hint" id="ce-derived"></p>`;
  },

  /** Aperçu vivant des champs DÉRIVÉS Anarchy (domaine + coût d'atout), pour
      voir l'effet du Réseau/Portée/RR avant d'enregistrer. Même dérivation que
      le save. No-op pour un contact SR (pas de ligne #ce-derived). */
  _syncDerived() {
    if (!this._el) return;
    const host = this._el.querySelector("#ce-derived");
    if (!host) return;
    const net = this._val("#ce-network");
    const scope = this._val("#ce-scope");
    const rr = parseInt(this._val("#ce-rr"), 10) || 0;
    host.textContent =
      `Domaine : ${ContactGen.domaineLabel(net, scope)} · ` +
      `Coût d'atout : ${ContactGen.atoutCost(rr, scope)} pts — ` +
      `recalculés d'après le Réseau, la Portée et la RR.`;
  },

  _val(id) {
    const el = this._el.querySelector(id);
    return el ? el.value : "";
  },

  _submit() {
    const id = this._contactId;
    const name = this._val("#ce-name").trim();
    if (!name) {
      toast("Le nom du contact est requis.", "warning");
      const nameEl = this._el.querySelector("#ce-name");
      if (nameEl) nameEl.focus();
      return;
    }
    // On ne pousse que les champs pertinents pour l'édition courante : les
    // sélecteurs Niveau/RR ou Influence/Loyauté n'existent que dans un seul des
    // deux gabarits (l'autre `_val(...)` renvoie ""), et updateContact ignore
    // les chaînes vides sur les champs numériques.
    const fields = {
      name,
      metatype: this._val("#ce-meta"),
      role: this._val("#ce-role"),
      trait: this._val("#ce-trait"),
      desc: this._val("#ce-desc"),
      influence: this._val("#ce-influence"),
      loyaute: this._val("#ce-loyaute"),
      level: this._val("#ce-level"),
      rr: this._val("#ce-rr"),
    };
    // Réseau / Portée : seulement si le gabarit Anarchy les expose — ne pas
    // greffer un networkId="" sur un contact SR. domaine/atoutCost/role_tags en
    // découlent, recalculés par updateContact (recomputeAnarchyDerived).
    if (this._el.querySelector("#ce-network")) {
      fields.networkId = this._val("#ce-network");
      fields.scope = this._val("#ce-scope");
    }
    ContactsBook.updateContact(id, fields);
    UI.refreshEntityCard(id);
    toast(`✓ ${name} mis à jour.`);
    this._close();
  },

  _close() {
    if (this._el) this._el.classList.remove("open");
    this._contactId = null;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.ContactEdit = ContactEdit;
