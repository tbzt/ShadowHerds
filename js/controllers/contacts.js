"use strict";

/* ============================================================
   CONTACTS — contrôleur du panneau générateur de contacts.

   Domaine contact, brique « fiche/panneau » : formulaire dirigé et
   affichage d'un contact généré. Délègue la donnée/génération à
   ContactGen, et l'ajout à la bibliothèque persistante à
   ContactsBook. Ne persiste rien lui-même.
   Contacts SR5/SR6 : Influence (1-12) + Loyauté (1-6)
   Contacts Anarchy : atout à niveau (0-6), RR sur Réseau
   ============================================================ */
import { ContactGen } from "./contactgen.js";

export const Contacts = {
  /** Affiche le formulaire dirigé adapté à l'édition courante.
      Dispatch structurel accepté : Anarchy (atout+RR) et
      SR5/SR6 (Influence/Loyauté) sont deux templates complets, pas une
      valeur scalaire — cf. ContactGen.generate(). */
  renderForm() {
    const host = document.getElementById("contact-gen-form");
    if (!host) return;
    host.innerHTML =
      App.editionModule?.usesRiskPanel
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

  /** Sélecteur de métatype dirigé : le picker GROUPÉ de l'édition courante
      (souches + toutes les métavariantes), MÊME source que le générateur PNJ
      et EditModal (editionModule.metaOptions()) — plus jamais la liste plate
      de 5 recopiée. `placeholder:"Aléatoire"` + valeur vide = tirage libre,
      relu tel quel par generate() (input caché #cg-meta, "" → _resolveMeta).
      Repli sur les 5 souches si un module n'expose pas metaOptions(). */
  _metaSelect() {
    const mod = App.editionModule;
    const cfg = (mod && mod.metaOptions && mod.metaOptions()) || {
      options: ["Humain", "Elfe", "Nain", "Ork", "Troll"].map((m) => ({ value: m, label: m })),
    };
    return SingleSelect.create({ id: "cg-meta", label: "Métatype", placeholder: "Aléatoire", value: "", ...cfg });
  },

  _formAnarchy() {
    const nets = ContactGen.NETWORKS.map(
      (n) => `<option value="${n.id}">${n.label}</option>`,
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
          ${this._metaSelect()}
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
    return `
      <div class="contact-form">
        <div class="contact-form-row">
          <label>Grand métier
            <select id="cg-category">${cats}</select>
          </label>
          ${this._metaSelect()}
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
    return ContactGen.generate(App.edition, {
      networkId: (document.getElementById("cg-network") || {}).value,
      rr: parseInt((document.getElementById("cg-rr") || {}).value || "1", 10),
      scope: (document.getElementById("cg-scope") || {}).value,
      categoryId: (document.getElementById("cg-category") || {}).value,
      metatype: (document.getElementById("cg-meta") || {}).value,
    });
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Contacts = Contacts;
