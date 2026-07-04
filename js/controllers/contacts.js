"use strict";

/* ============================================================
   CONTACTS — contrôleur du panneau générateur de contacts
   Contacts SR5/SR6 : Influence (1-12) + Loyauté (1-6)
   Contacts Anarchy : atout à niveau (0-6), RR sur Réseau
   ============================================================ */
const Contacts = {
  /** Affiche le formulaire dirigé adapté à l'édition courante. */
  renderForm() {
    const host = document.getElementById("contact-gen-form");
    if (!host) return;
    host.innerHTML =
      App.edition === "anarchy"
        ? this._formAnarchy()
        : this._formSR();
    this._syncCost();
    this._bindDelegation();
  },

  _delegated: false,
  _bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;
    document
      .getElementById("contact-gen-form")
      .addEventListener("change", (e) => {
        if (e.target.closest("#cg-network, #cg-scope, #cg-rr"))
          this._syncCost();
      });
  },

  _formAnarchy() {
    const nets = ContactGen.NETWORKS.map(
      (n) => `<option value="${n.id}">${n.label}</option>`,
    ).join("");
    const metas = ContactGen.METATYPES.map(
      (m) => `<option value="${m}">${m}</option>`,
    ).join("");
    return `
      <div class="contact-form">
        <div class="contact-form-row">
          <label>Réseau
            <select id="cg-network">${nets}</select>
          </label>
          <label>Portée
            <select id="cg-scope">
              <option value="specialisation">Spécialisation (un Réseau)</option>
              <option value="competence">Compétence Réseau (tous)</option>
            </select>
          </label>
        </div>
        <div class="contact-form-row">
          <label>RR (loyauté / réseau)
            <select id="cg-rr">
              <option value="1">RR 1</option>
              <option value="2">RR 2</option>
              <option value="3">RR 3</option>
            </select>
          </label>
          <label>Métatype
            <select id="cg-meta">${metas}</select>
          </label>
        </div>
        <div class="contact-form-cost" id="cg-cost"></div>
        <div class="contact-form-hint" id="cg-net-desc"></div>
      </div>`;
  },

  _formSR() {
    const cats = [
      `<option value="any">Tous métiers</option>`,
      ...ContactGen.SR_CATEGORIES.map(
        (c) => `<option value="${c.id}">${c.label}</option>`,
      ),
    ].join("");
    const metas = ContactGen.METATYPES.map(
      (m) => `<option value="${m}">${m}</option>`,
    ).join("");
    return `
      <div class="contact-form">
        <div class="contact-form-row">
          <label>Grand métier
            <select id="cg-category">${cats}</select>
          </label>
          <label>Métatype
            <select id="cg-meta">${metas}</select>
          </label>
        </div>
      </div>`;
  },

  /** Met à jour l'affichage du coût en points d'atout et la description. */
  _syncCost() {
    const costEl = document.getElementById("cg-cost");
    if (!costEl) return;
    const rr = parseInt(
      (document.getElementById("cg-rr") || {}).value || "1",
      10,
    );
    const scope =
      (document.getElementById("cg-scope") || {}).value || "specialisation";
    const cost = ContactGen.atoutCost(rr, scope);
    costEl.innerHTML = `Coût de l'atout : <strong>${cost} pts</strong> <span class="cost-sub">(RR ${rr} ${scope === "competence" ? "sur la compétence Réseau, +5/niveau" : "sur une spécialisation, +2/niveau"})</span>`;
    const descEl = document.getElementById("cg-net-desc");
    const netId = (document.getElementById("cg-network") || {}).value;
    if (descEl && netId) {
      const n = ContactGen.NETWORKS.find((x) => x.id === netId);
      descEl.textContent = n ? n.desc : "";
    }
  },

  /** Lit le formulaire et génère un contact dirigé. */
  generate() {
    if (App.edition === "anarchy") {
      return ContactGen.generateAnarchy({
        networkId: (document.getElementById("cg-network") || {}).value,
        rr: parseInt((document.getElementById("cg-rr") || {}).value || "1", 10),
        scope: (document.getElementById("cg-scope") || {}).value,
        metatype: (document.getElementById("cg-meta") || {}).value,
      });
    }
    return ContactGen.generateSR(App.edition, {
      categoryId: (document.getElementById("cg-category") || {}).value,
      metatype: (document.getElementById("cg-meta") || {}).value,
    });
  },
};
