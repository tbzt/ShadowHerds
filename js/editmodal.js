"use strict";

/* ============================================================
   EDIT MODAL — édition avancée d'un PNJ sauvegardé
   ============================================================ */
const EditModal = {
  currentId: null,

  open(id) {
    const pnj = Shadows.data.all.find((p) => p.id === id);
    if (!pnj) {
      toast("PNJ introuvable.");
      return;
    }
    this.currentId = id;

    document.querySelector(".modal-title").textContent =
      `Édition — ${pnj.name}`;
    const body = document.getElementById("modal-form-body");
    body.innerHTML = this._buildForm(pnj);

    document.getElementById("edit-modal").classList.add("open");
  },

  close() {
    document.getElementById("edit-modal").classList.remove("open");
    this.currentId = null;
  },

  save() {
    const pnj = Shadows.data.all.find((p) => p.id === this.currentId);
    if (!pnj) {
      this.close();
      return;
    }

    this._readForm(pnj);

    const edModule = App.getEditionModule(pnj.edition);
    if (edModule && edModule.recalc) edModule.recalc(pnj);

    Shadows.save();
    Shadows.render();
    this.close();
    toast(`${pnj.name} mis à jour.`);
  },

  /* ---- Construction du formulaire ---- */
  _buildForm(pnj) {
    let html = "";

    // ---- Section : Identité ----
    html += `<div class="modal-section">
      <div class="modal-section-title">Identité</div>
      <div class="modal-grid wide">
        <div class="form-group full">
          <label>Nom</label>
          <input type="text" id="em-name" value="${CardRenderer._esc(pnj.name)}">
        </div>
        <div class="form-group">
          <label>Métatype</label>
          <select id="em-meta">
            ${["Humain", "Elfe", "Nain", "Ork", "Troll"]
              .map(
                (m) =>
                  `<option${pnj.meta === m ? " selected" : ""}>${m}</option>`,
              )
              .join("")}
          </select>
        </div>
        <div class="form-group">
          <label>Genre</label>
          <select id="em-gender">
            ${["M", "F", "NB"]
              .map(
                (g) =>
                  `<option${pnj.gender === g ? " selected" : ""}>${g}</option>`,
              )
              .join("")}
          </select>
        </div>`;

    if (pnj.edition === "anarchy") {
      html += `<div class="form-group">
        <label>Rang</label>
        <select id="em-rang">
          ${["Figurant", "Figurant d'élite", "Lieutenant", "Boss"]
            .map(
              (r) =>
                `<option${pnj.rang === r ? " selected" : ""}>${r}</option>`,
            )
            .join("")}
        </select>
      </div>`;
    } else {
      html += `<div class="form-group">
        <label>Professionnalisme</label>
        <input type="number" id="em-prof" value="${pnj.prof}" min="0" max="6">
      </div>`;
    }

    html += "</div></div>";

    // ---- Section : Attributs ----
    const attrKeys =
      pnj.edition === "anarchy"
        ? ["FOR", "AGI", "VOL", "LOG", "CHA"]
        : ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"];

    html += `<div class="modal-section">
      <div class="modal-section-title">Attributs</div>
      <div class="modal-grid">`;

    for (const k of attrKeys) {
      if (pnj.attrs[k] !== undefined) {
        html += `<div class="form-group">
          <label>${k}</label>
          <input type="number" id="em-attr-${k}" value="${pnj.attrs[k]}" min="1" max="12">
        </div>`;
      }
    }
    if (pnj.attrs.MAG !== undefined) {
      html += `<div class="form-group">
        <label>MAG</label>
        <input type="number" id="em-attr-MAG" value="${pnj.attrs.MAG}" min="1" max="12">
      </div>`;
    }
    html += "</div></div>";

    // ---- Section Anarchy : Atouts libres ----
    if (pnj.edition === "anarchy" && pnj.atouts) {
      html += `<div class="modal-section">
        <div class="modal-section-title">Atouts</div>
        <div class="form-group">
          <label>Un atout par ligne</label>
          <textarea id="em-atouts" rows="5">${(pnj.atouts || []).join("\n")}</textarea>
        </div>
      </div>`;
    }

    // ---- Section SR5/SR6 : Compétences ----
    if (pnj.edition !== "anarchy" && pnj.skills && pnj.skills.length) {
      html += `<div class="modal-section">
        <div class="modal-section-title">Compétences</div>
        <div class="modal-grid">`;
      pnj.skills.forEach((s, i) => {
        html += `<div class="form-group">
          <label>${CardRenderer._esc(s.name)}</label>
          <input type="number" id="em-skill-${i}" value="${s.val}" min="1" max="12">
        </div>`;
      });
      html += "</div></div>";
    }

    // ---- Section : Équipement ----
    if (pnj.equip && pnj.equip.length) {
      html += `<div class="modal-section">
        <div class="modal-section-title">Équipement</div>
        <div class="form-group">
          <label>Un élément par ligne</label>
          <textarea id="em-equip" rows="4">${pnj.equip.join("\n")}</textarea>
        </div>
      </div>`;
    }

    // ---- Section : Notes ----
    html += `<div class="modal-section">
      <div class="modal-section-title">Notes</div>
      <div class="form-group">
        <textarea id="em-notes" rows="3" placeholder="Notes libres…">${CardRenderer._esc(pnj.notes || "")}</textarea>
      </div>
    </div>`;

    return html;
  },

  /* ---- Lecture du formulaire → mise à jour du PNJ ---- */
  _readForm(pnj) {
    const val = (id) => document.getElementById(id)?.value ?? "";
    const num = (id, fallback) => parseInt(val(id), 10) || fallback;

    pnj.name = val("em-name").trim() || pnj.name;
    pnj.meta = val("em-meta") || pnj.meta;
    pnj.gender = val("em-gender") || pnj.gender;

    if (pnj.edition === "anarchy") {
      pnj.rang = val("em-rang") || pnj.rang;
      const atoutsEl = document.getElementById("em-atouts");
      if (atoutsEl)
        pnj.atouts = atoutsEl.value
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
    } else {
      pnj.prof = num("em-prof", pnj.prof);
    }

    // Attributs
    const allAttrKeys =
      pnj.edition === "anarchy"
        ? ["FOR", "AGI", "VOL", "LOG", "CHA"]
        : ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA", "MAG"];
    for (const k of allAttrKeys) {
      const el = document.getElementById(`em-attr-${k}`);
      if (el && pnj.attrs[k] !== undefined) {
        pnj.attrs[k] = Utils.clamp(
          parseInt(el.value, 10) || pnj.attrs[k],
          1,
          12,
        );
      }
    }

    // Équipement
    const equipEl = document.getElementById("em-equip");
    if (equipEl)
      pnj.equip = equipEl.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

    // Compétences SR5/SR6
    if (pnj.edition !== "anarchy" && pnj.skills) {
      pnj.skills.forEach((s, i) => {
        const el = document.getElementById(`em-skill-${i}`);
        if (el) s.val = Utils.clamp(parseInt(el.value, 10) || s.val, 1, 12);
      });
    }

    // Notes
    const notesEl = document.getElementById("em-notes");
    if (notesEl) pnj.notes = notesEl.value;
  },
};
