"use strict";

/* ============================================================
   CONTACT RENDERER
   ============================================================ */
const ContactRenderer = {
  _delegated: false,

  /* Délégation globale (modèle ContentModal) : les cards persistantes
     ne portent aucun onclick/onblur figé, seulement des data-* lus ici.
     L'id du contact est porté par la card (.contact-card[data-id]), pas
     répété sur chaque champ éditable. */
  bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;

    // blur/focus ne bubblent pas : focusout si, c'est son équivalent.
    document.addEventListener("focusout", (e) => {
      const fieldEl = e.target.closest("[data-contact-field]");
      if (fieldEl) {
        const card = fieldEl.closest(".contact-card");
        if (!card) return;
        ContactsBook.editField(
          card.dataset.id,
          fieldEl.dataset.contactField,
          fieldEl.textContent.trim(),
        );
        return;
      }
      const flavorEl = e.target.closest("[data-contact-flavor]");
      if (!flavorEl) return;
      const card = flavorEl.closest(".contact-card");
      if (!card) return;
      ContactsBook.editFlavor(
        card.dataset.id,
        flavorEl.dataset.contactFlavor,
        flavorEl.textContent.trim(),
      );
    });

    document.addEventListener("change", (e) => {
      const notesEl = e.target.closest("[data-contact-notes]");
      if (!notesEl) return;
      const card = notesEl.closest(".contact-card");
      if (!card) return;
      ContactsBook.editNote(card.dataset.id, notesEl.value);
    });

    document.addEventListener("click", (e) => {
      const actionEl = e.target.closest("[data-contact-action]");
      if (!actionEl) return;
      const card = actionEl.closest(".contact-card");
      if (!card) return;
      const id = card.dataset.id;
      switch (actionEl.dataset.contactAction) {
        case "remove":
          ContactsBook.remove(id);
          break;
        case "reroll-flavor":
          ContactsBook.rerollFlavor(id);
          break;
        case "set-niveau":
          ContactsBook.editField(id, "level", actionEl.dataset.niveauValue);
          ContactsBook.render();
          break;
        case "generate-portrait":
          Portrait.generateForContact(id, actionEl);
          break;
        case "deploy-pnj":
          ContactsBook.deployPNJ(id);
          break;
        case "goto-pj":
          Palette._reveal({ id: actionEl.dataset.pjId, name: actionEl.dataset.pjName, type: "pj" });
          break;
      }
    });
  },

  /* ---- Card persistante (ContactsBook) avec édition inline ----
     Le déclencheur de groupes (🏷) est ajouté après coup par le socle
     Collection (_appendGroupTrigger), commun aux trois collections. */
  renderPersistent(c) {
    const el = document.createElement("div");
    el.className = "contact-card contact-card-saved";
    el.dataset.id = c.id;

    // Dispatch structurel accepté (issue #14) : deux blocs de stats
    // complets (atout+RR vs Influence/Loyauté), pas une valeur scalaire.
    const isAnarchy = !!App.getEditionModule(c.edition)?.usesRiskPanel;
    const stats = isAnarchy ? this._statsAnarchy(c) : this._statsSR(c);

    // PNJ complet déployé depuis ce contact (ContactsBook.deployPNJ),
    // affiché imbriqué dans la carte plutôt que dans un autre écran.
    const deployed = Shadows.data.all.find((p) => p.sourceContactId === c.id);

    // Pied unifié (CardFooter) : Déployer en primaire ; Portrait IA et
    // Supprimer dans le ⋯. Le contact s'édite en ligne, pas de bouton Éditer.
    const footerActs = [
      ...(deployed
        ? []
        : [{ kind: "primary", icon: "⇲", label: "Déployer", attrs: 'data-contact-action="deploy-pnj"' }]),
      ...(!c.portraitUrl && Settings.getPortraitSettings().enabled
        ? [{ kind: "menu", label: "Portrait IA", attrs: 'data-contact-action="generate-portrait"' }]
        : []),
      { kind: "menu", danger: true, label: "Supprimer", attrs: 'data-contact-action="remove"' },
    ];

    el.innerHTML = `
      <div class="contact-card-body">
        <div class="contact-header-row">
          ${c.portraitUrl ? `<div class="contact-portrait-thumb" role="button" tabindex="0" data-portrait-preview="${CardRenderer._esc(c.portraitUrl)}" title="Agrandir le portrait"><img src="${CardRenderer._esc(c.portraitUrl)}" alt="" loading="lazy"></div>` : ""}
          <div>
            <div class="contact-name" contenteditable="true" spellcheck="false"
              data-contact-field="name"
              >${CardRenderer._esc(c.name)}</div>
            <div class="contact-role" contenteditable="true" spellcheck="false"
              data-contact-field="role"
              >${CardRenderer._esc(c.role)}</div>
            ${c.metatype ? `<div class="contact-meta">${CardRenderer._esc(c.metatype)}</div>` : ""}
          </div>
        </div>

        <div class="contact-desc">${CardRenderer._esc(c.desc)}</div>

        ${stats}

        ${this._knownBy(c)}

        <div class="contact-trait">⚠ <span contenteditable="true" spellcheck="false"
          data-contact-field="trait"
          >${CardRenderer._esc(c.trait)}</span></div>

        ${this._portrait(c)}

        <div class="contact-notes-row">
          <textarea class="contact-notes" placeholder="Notes…" rows="2"
            data-contact-notes
            >${CardRenderer._esc(c.notes || "")}</textarea>
        </div>

        ${deployed ? '<div class="contact-deployed-pnj" data-deployed-slot></div>' : ""}
      </div>
      ${CardFooter.render(footerActs)}`;

    if (deployed) {
      const slot = el.querySelector("[data-deployed-slot]");
      if (slot) slot.appendChild(CardRenderer.render(deployed, ["edit", "remove"]));
    }
    return el;
  },

  /* ---- Portrait éditable (flavor) pour un contact ---- */
  _portrait(c) {
    const f = c.flavor;
    if (!f) return "";
    const row = (key, field, val) =>
      `<div class="flavor-row">
        <span class="flavor-key">${key}</span>
        <span class="flavor-val" contenteditable="true" spellcheck="false"
          data-contact-flavor="${field}"
          >${CardRenderer._esc(String(val))}</span>
      </div>`;
    const rows = [
      f.age != null ? row("Âge", "age", f.age) : "",
      f.signe ? row("Signe", "signe", f.signe) : "",
      f.style ? row("Style", "style", f.style) : "",
      f.attitude ? row("Attitude", "attitude", f.attitude) : "",
      f.manie ? row("Manie", "manie", f.manie) : "",
      f.motivation ? row("Motivation", "motivation", f.motivation) : "",
    ].join("");
    return `<div class="card-section flavor-section contact-portrait">
      <div class="card-section-label">Portrait
        <button class="btn-icon-tiny" title="Relancer le portrait"
          data-contact-action="reroll-flavor">⟳</button>
      </div>
      ${rows}
    </div>`;
  },

  _statsAnarchy(c) {
    const dots = Array.from(
      { length: 6 },
      (_, i) =>
        `<span class="niveau-dot ${i < c.level ? "filled" : ""}"
        data-contact-action="set-niveau" data-niveau-value="${i + 1}"></span>`,
    ).join("");
    const bonus = c.bonus
      ? `<div class="contact-bonus">+ ${CardRenderer._esc(c.bonus)}</div>`
      : "";
    return `<div class="contact-anarchy-stats">
      <div class="contact-stat-row">
        <span class="contact-stat-label">Niveau</span>
        <div class="niveau-dots">${dots}</div>
        <span class="contact-stat-val">${c.level} (${(c.level * 5000).toLocaleString("fr-FR")}¥)</span>
      </div>
      <div class="contact-stat-row">
        <span class="contact-stat-label">Effet</span>
        <span class="contact-rr">RR ${c.rr} — ${CardRenderer._esc(c.domaine)}</span>
      </div>
      ${c.atoutCost != null ? `<div class="contact-stat-row"><span class="contact-stat-label">Atout</span><span class="contact-stat-val">${c.atoutCost} pts</span></div>` : ""}
      ${bonus}
    </div>`;
  },

  /** E5 : sens inverse du lien PJ↔contact, calculé à la volée (jamais
      stocké côté contact — une seule source de vérité, `pnj.contactLinks`).
      Pastille `pcColor` (E1) pour l'identification au coup d'œil. */
  _knownBy(c) {
    if (typeof Characters === "undefined") return "";
    const linked = Characters.data.all.filter(
      (p) => Array.isArray(p.contactLinks) && p.contactLinks.some((l) => l.contactId === c.id),
    );
    if (!linked.length) return "";
    const chips = linked
      .map((p) => {
        const dot = p.pcColor
          ? `<span class="pc-color-dot" style="background:${CardRenderer._esc(p.pcColor)}" aria-hidden="true"></span>`
          : "";
        return `<span class="tag tag-clickable" role="button" tabindex="0" data-contact-action="goto-pj"
          data-pj-id="${CardRenderer._esc(p.id)}" data-pj-name="${CardRenderer._esc(p.name)}">${dot}${CardRenderer._esc(p.name)}</span>`;
      })
      .join("");
    return `<div class="card-section" style="margin-top:6px;">
      <div class="card-section-label">Connu de</div>
      <div class="card-section-content">${chips}</div>
    </div>`;
  },

  _statsSR(c) {
    return `<div class="stats-row" style="margin-top:6px;flex-wrap:wrap;gap:6px;">
      <span class="stat-pill accent">Influence
        <strong contenteditable="true" spellcheck="false" class="editable-num"
          data-contact-field="influence"
          >${c.influence}</strong>
      </span>
      <span class="stat-pill">Loyauté
        <strong contenteditable="true" spellcheck="false" class="editable-num"
          data-contact-field="loyaute"
          >${c.loyaute}</strong>
      </span>
      ${c.lieu ? `<span style="font-size:0.68rem;color:var(--text-dim);align-self:center;">📍 ${CardRenderer._esc(c.lieu)}</span>` : ""}
    </div>`;
  },

};
