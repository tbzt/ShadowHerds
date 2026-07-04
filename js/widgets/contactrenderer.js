"use strict";

/* ============================================================
   CONTACT RENDERER
   ============================================================ */
const ContactRenderer = {
  render(c) {
    return c.edition === "anarchy" ? this._renderAnarchy(c) : this._renderSR(c);
  },

  /* ---- Card persistante (ContactsBook) avec édition inline ----
     Le déclencheur de groupes (🏷) est ajouté après coup par le socle
     Collection (_appendGroupTrigger), commun aux trois collections. */
  renderPersistent(c) {
    const el = document.createElement("div");
    el.className = "contact-card contact-card-saved";
    el.dataset.id = c.id;

    const isAnarchy = c.edition === "anarchy";
    const stats = isAnarchy ? this._statsAnarchy(c) : this._statsSR(c);

    el.innerHTML = `
      <div class="contact-card-body">
        <div class="contact-header-row">
          <div>
            <div class="contact-name" contenteditable="true" spellcheck="false"
              onblur="ContactsBook.editField('${c.id}', 'name', this.textContent.trim())"
              >${CardRenderer._esc(c.name)}</div>
            <div class="contact-role" contenteditable="true" spellcheck="false"
              onblur="ContactsBook.editField('${c.id}', 'role', this.textContent.trim())"
              >${CardRenderer._esc(c.role)}</div>
            ${c.metatype ? `<div class="contact-meta">${CardRenderer._esc(c.metatype)}</div>` : ""}
          </div>
        </div>

        <div class="contact-desc">${CardRenderer._esc(c.desc)}</div>

        ${stats}

        <div class="contact-trait">⚠ <span contenteditable="true" spellcheck="false"
          onblur="ContactsBook.editField('${c.id}', 'trait', this.textContent.trim())"
          >${CardRenderer._esc(c.trait)}</span></div>

        ${this._portrait(c)}

        <div class="contact-notes-row">
          <textarea class="contact-notes" placeholder="Notes…" rows="2"
            onchange="ContactsBook.editNote('${c.id}', this.value)"
            >${CardRenderer._esc(c.notes || "")}</textarea>
        </div>
      </div>
      <div class="pnj-card-footer">
        <button class="card-action-btn danger" onclick="ContactsBook.remove('${c.id}')">Supprimer</button>
      </div>`;
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
          onblur="ContactsBook.editFlavor('${c.id}', '${field}', this.textContent.trim())"
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
          onclick="ContactsBook.rerollFlavor('${c.id}')">⟳</button>
      </div>
      ${rows}
    </div>`;
  },

  _statsAnarchy(c) {
    const dots = Array.from(
      { length: 6 },
      (_, i) =>
        `<span class="niveau-dot ${i < c.level ? "filled" : ""}"
        onclick="ContactsBook.editField('${c.id}', 'niveau', ${i + 1}); ContactsBook.render()"></span>`,
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

  _statsSR(c) {
    return `<div class="stats-row" style="margin-top:6px;flex-wrap:wrap;gap:6px;">
      <span class="stat-pill accent">Influence
        <strong contenteditable="true" spellcheck="false" class="editable-num"
          onblur="ContactsBook.editField('${c.id}', 'influence', this.textContent.trim())"
          >${c.influence}</strong>
      </span>
      <span class="stat-pill">Loyauté
        <strong contenteditable="true" spellcheck="false" class="editable-num"
          onblur="ContactsBook.editField('${c.id}', 'loyaute', this.textContent.trim())"
          >${c.loyaute}</strong>
      </span>
      ${c.lieu ? `<span style="font-size:0.68rem;color:var(--text-dim);align-self:center;">📍 ${CardRenderer._esc(c.lieu)}</span>` : ""}
    </div>`;
  },

  _renderAnarchy(c) {
    const el = document.createElement("div");
    el.className = "contact-card";

    // Pastilles de niveau : cercles pleins / vides
    const levelDots = Array.from(
      { length: 6 },
      (_, i) =>
        `<span class="niveau-dot ${i < c.level ? "filled" : ""}"></span>`,
    ).join("");

    const bonusHtml = c.bonus
      ? `<div class="contact-bonus">+ ${CardRenderer._esc(c.bonus)}</div>`
      : "";

    el.innerHTML = `
      <div class="contact-card-body">
        <div class="contact-name">${CardRenderer._esc(c.name)}</div>
        <div class="contact-role">${CardRenderer._esc(c.role)}</div>
        <div class="contact-desc">${CardRenderer._esc(c.desc)}</div>

        <div class="contact-anarchy-stats">
          <div class="contact-stat-row">
            <span class="contact-stat-label">Niveau</span>
            <div class="niveau-dots">${levelDots}</div>
            <span class="contact-stat-val">${c.level} (${c.cout.toLocaleString("fr-FR")}¥)</span>
          </div>
          <div class="contact-stat-row">
            <span class="contact-stat-label">Effet</span>
            <span class="contact-rr">RR ${c.rr} — ${CardRenderer._esc(c.domaine)}</span>
          </div>
          ${bonusHtml}
        </div>

        <div class="contact-trait">⚠ ${CardRenderer._esc(c.trait)}</div>
      </div>
      <div class="pnj-card-footer">
        <button class="card-action-btn danger" onclick="this.closest('.contact-card').remove()">Virer</button>
      </div>`;
    return el;
  },

  _renderSR(c) {
    const el = document.createElement("div");
    el.className = "contact-card";
    el.innerHTML = `
      <div class="contact-card-body">
        <div class="contact-name">${CardRenderer._esc(c.name)}</div>
        <div class="contact-role">${CardRenderer._esc(c.role)}</div>
        <div class="contact-desc">${CardRenderer._esc(c.desc)}</div>
        <div class="stats-row" style="margin-top:6px;">
          <span class="stat-pill accent">Influence <strong>${c.influence}</strong></span>
          <span class="stat-pill">Loyauté <strong>${c.loyaute}</strong></span>
        </div>
        <div style="margin-top:5px;font-size:0.68rem;color:var(--text-dim);">
          📍 ${CardRenderer._esc(c.lieu)}
        </div>
        <div class="contact-trait">⚠ ${CardRenderer._esc(c.trait)}</div>
      </div>
      <div class="pnj-card-footer">
        <button class="card-action-btn danger" onclick="this.closest('.contact-card').remove()">Virer</button>
      </div>`;
    return el;
  },
};
