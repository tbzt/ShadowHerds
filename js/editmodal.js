"use strict";

/* ============================================================
   EDIT MODAL — édition avancée d'un PNJ sauvegardé
   ============================================================ */
const EditModal = {
  currentId: null,

  open(id) {
    const pnj = this._find(id);
    if (!pnj) {
      toast("PNJ introuvable.");
      return;
    }
    this.currentId = id;

    document.querySelector(".modal-title").textContent =
      `Édition — ${pnj.name}`;
    const body = document.getElementById("modal-form-body");
    body.innerHTML =
      pnj.type === "vehicle" ? this._buildFormVehicle(pnj) : this._buildForm(pnj);

    document.getElementById("edit-modal").classList.add("open");
  },

  /** Cherche dans les sauvegardés et le pool du générateur (les fiches
      véhicules peuvent vivre dans les deux). */
  _find(id) {
    return (
      Shadows.data.all.find((p) => p.id === id) ||
      (typeof Gen !== "undefined" && Gen.findInPool ? Gen.findInPool(id) : null)
    );
  },

  close() {
    document.getElementById("edit-modal").classList.remove("open");
    this.currentId = null;
  },

  save() {
    const pnj = this._find(this.currentId);
    if (!pnj) {
      this.close();
      return;
    }

    if (pnj.type === "vehicle") {
      this._readFormVehicle(pnj);
      // Moniteur recalculé depuis la Structure (SR5/SR6)
      if (pnj.edition !== "anarchy" && typeof Vehicles !== "undefined") {
        pnj.monTotal = Vehicles._monitor(pnj.stats, pnj.edition);
        pnj.monFilled = Math.min(pnj.monFilled || 0, pnj.monTotal);
      }
      Shadows.save();
      CardRenderer.refresh(pnj);
      this.close();
      toast(`${pnj.name} mis à jour.`);
      return;
    }

    this._readForm(pnj);

    const edModule = App.getEditionModule(pnj.edition);
    if (edModule && edModule.recalc) edModule.recalc(pnj);
    // Esprit SR6 : moniteur = (Puissance/2)+8 (p.224), pas la formule CON.
    if (pnj.type === "spirit" && pnj.edition === "sr6" && pnj.force) {
      pnj.me = Math.ceil(pnj.force / 2) + 8;
    }

    Shadows.save();
    if (Shadows.data.all.some((p) => p.id === pnj.id)) {
      Shadows.render();
    }
    CardRenderer.refresh(pnj);
    this.close();
    toast(`${pnj.name} mis à jour.`);
  },

  /* ---- Formulaire d'une fiche véhicule/drone liée ---- */
  _buildFormVehicle(v) {
    const esc = CardRenderer._esc;
    const s = v.stats || {};
    const fields =
      v.edition === "anarchy"
        ? [["autopilote", "Autopilote"], ["structure", "Structure"], ["mania", "Maniabilité"], ["vitesse", "Vitesse"], ["blindage", "Blindage"]]
        : [["mania", "Maniabilité"], ["vitesse", "Vitesse"], ["accel", "Accél"], ["structure", "Structure"], ["blindage", "Blindage"], ["pilote", "Autopilote"], ["senseurs", "Senseurs"], ["autosoft", "Autosoft"]];
    let html = `<div class="modal-section">
      <div class="modal-section-title">Identité</div>
      <div class="modal-grid wide">
        <div class="form-group full">
          <label>Nom</label>
          <input type="text" id="em-name" value="${esc(v.name)}">
        </div>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Caractéristiques</div>
      <div class="modal-grid">`;
    for (const [key, label] of fields) {
      const cur = s[key] ?? (key === "autosoft" ? s.pilote ?? "" : 0);
      html += `<div class="form-group">
        <label>${label}</label>
        <input type="number" id="em-vstat-${key}" value="${cur}" min="0" max="30">
      </div>`;
    }
    html += `</div></div>
    <div class="modal-section">
      <div class="modal-section-title">Notes</div>
      <div class="form-group">
        <textarea id="em-notes" rows="3" placeholder="Notes libres…">${esc(v.notes || "")}</textarea>
      </div>
    </div>`;
    return html;
  },

  _readFormVehicle(v) {
    const nameEl = document.getElementById("em-name");
    if (nameEl && nameEl.value.trim()) v.name = nameEl.value.trim();
    v.stats = v.stats || {};
    document
      .querySelectorAll('[id^="em-vstat-"]')
      .forEach((el) => {
        const key = el.id.replace("em-vstat-", "");
        const n = parseInt(el.value, 10);
        if (Number.isFinite(n)) v.stats[key] = n;
      });
    const notesEl = document.getElementById("em-notes");
    if (notesEl) v.notes = notesEl.value;
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
                `<option${pnj.tier === r ? " selected" : ""}>${r}</option>`,
            )
            .join("")}
        </select>
      </div>`;
    } else {
      html += `<div class="form-group">
        <label>Professionnalisme</label>
        <input type="number" id="em-prof" value="${pnj.proRating}" min="0" max="6">
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
    if (pnj.edition === "anarchy" && pnj.edges) {
      html += `<div class="modal-section">
        <div class="modal-section-title">Atouts</div>
        <div class="form-group">
          <label>Un edge par ligne</label>
          <textarea id="em-atouts" rows="5">${(pnj.edges || []).join("\n")}</textarea>
        </div>
      </div>`;
    }

    // ---- Section Anarchy : Compétences (éditables + ajout) ----
    if (pnj.edition === "anarchy") {
      html += `<div class="modal-section">
        <div class="modal-section-title">Compétences</div>
        <div id="em-skills-list" class="em-skills-list">
          ${(pnj.skills || []).map((s, i) => this._skillRowAnarchy(pnj, s, i)).join("")}
        </div>
        ${this._addSkillControls(pnj)}
      </div>`;
    }

    // ---- Section SR5/SR6 : Compétences (éditables + ajout) ----
    if (pnj.edition !== "anarchy") {
      html += `<div class="modal-section">
        <div class="modal-section-title">Compétences</div>
        <div id="em-skills-list" class="em-skills-list">
          ${(pnj.skills || []).map((s, i) => this._skillRowSR(pnj, s, i)).join("")}
        </div>
        ${this._addSkillControls(pnj)}
      </div>`;
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

  /* ============================================================
     COMPÉTENCES ÉDITABLES
     ============================================================ */

  /* Ligne d'une compétence SR5/SR6 : niveau + spécialité libre */
  _skillRowSR(pnj, s, i) {
    const esc = CardRenderer._esc;
    const spec = s.spec && s.spec !== true ? esc(s.spec) : "";
    return `<div class="em-skill-row" data-idx="${i}">
      <span class="em-skill-name">${esc(s.name)}</span>
      <input type="number" class="em-skill-val" id="em-skill-${i}" value="${s.val}" min="1" max="12" title="Niveau">
      <input type="text" class="em-skill-spec" id="em-skill-spec-${i}"
        value="${spec}" placeholder="Spécialité (+2)" title="Spécialité — bonus de +2 dés">
      <button type="button" class="em-skill-del" title="Retirer"
        onclick="EditModal.removeSkill(${i})">×</button>
    </div>`;
  },

  /* Ligne d'une compétence Anarchy : niveau + RR + spécialité (liste) */
  _skillRowAnarchy(pnj, s, i) {
    const esc = CardRenderer._esc;
    const specOpts = ['<option value="">— Aucune —</option>']
      .concat(
        (typeof SkillCatalog !== "undefined"
          ? SkillCatalog.anarchySpecs
          : []
        ).map(
          (sp) =>
            `<option value="${esc(sp)}"${s.spec === sp ? " selected" : ""}>${esc(sp)}</option>`,
        ),
      )
      .join("");
    // Si la spé courante n'est pas dans la liste, on l'ajoute en tête.
    const customSpec =
      s.spec && !SkillCatalog?.anarchySpecs?.includes(s.spec)
        ? `<option value="${esc(s.spec)}" selected>${esc(s.spec)}</option>`
        : "";
    return `<div class="em-skill-row em-skill-row-anarchy" data-idx="${i}">
      <span class="em-skill-name">${esc(s.name)} <em class="em-skill-attr">${esc(s.attr || "")}</em></span>
      <input type="number" class="em-skill-val" id="em-skill-${i}" value="${s.val}" min="0" max="6" title="Niveau">
      <input type="number" class="em-skill-rr" id="em-skill-rr-${i}" value="${s.rr || 0}" min="0" max="3" title="Relance de réserve (RR)">
      <select class="em-skill-spec" id="em-skill-spec-${i}" title="Spécialité">
        ${customSpec}${specOpts}
      </select>
      <button type="button" class="em-skill-del" title="Retirer"
        onclick="EditModal.removeSkill(${i})">×</button>
    </div>`;
  },

  /* Contrôles d'ajout d'une compétence (liste des règles de base) */
  _addSkillControls(pnj) {
    if (typeof SkillCatalog === "undefined") return "";
    const existing = new Set((pnj.skills || []).map((s) => s.name));
    const opts = SkillCatalog.skillsFor(pnj.edition)
      .filter((n) => !existing.has(n))
      .map((n) => `<option value="${CardRenderer._esc(n)}">${CardRenderer._esc(n)}</option>`)
      .join("");
    if (!opts) return "";
    return `<div class="em-add-skill">
      <select id="em-add-skill-select">
        <option value="">+ Ajouter une compétence…</option>
        ${opts}
      </select>
      <button type="button" class="em-add-skill-btn" onclick="EditModal.addSkill()">Ajouter</button>
    </div>`;
  },

  /* Ajoute une compétence choisie dans le catalogue. Lit d'abord le
     formulaire en cours pour ne pas perdre les modifications. */
  addSkill() {
    const pnj = Shadows.data.all.find((p) => p.id === this.currentId);
    if (!pnj) return;
    const sel = document.getElementById("em-add-skill-select");
    const name = sel?.value;
    if (!name) return;
    this._readSkills(pnj);
    if (!pnj.skills) pnj.skills = [];
    if (pnj.skills.some((s) => s.name === name)) return;

    if (pnj.edition === "anarchy") {
      pnj.skills.push({
        name,
        val: 1,
        attr: SkillCatalog.attrFor("anarchy", name) || "AGI",
        rr: 0,
      });
    } else {
      pnj.skills.push({ name, val: 1 });
    }
    this._rerenderSkills(pnj);
  },

  /* Retire la compétence d'index i. */
  removeSkill(i) {
    const pnj = Shadows.data.all.find((p) => p.id === this.currentId);
    if (!pnj || !pnj.skills) return;
    this._readSkills(pnj);
    pnj.skills.splice(i, 1);
    this._rerenderSkills(pnj);
  },

  /* Reconstruit uniquement la liste des compétences dans le modal. */
  _rerenderSkills(pnj) {
    const list = document.getElementById("em-skills-list");
    if (!list) return;
    const rowFn =
      pnj.edition === "anarchy"
        ? this._skillRowAnarchy.bind(this)
        : this._skillRowSR.bind(this);
    list.innerHTML = (pnj.skills || [])
      .map((s, i) => rowFn(pnj, s, i))
      .join("");
    // Reconstruit aussi le sélecteur d'ajout (pour retirer les doublons).
    const addWrap = list.parentElement.querySelector(".em-add-skill");
    if (addWrap) {
      addWrap.outerHTML = this._addSkillControls(pnj);
    } else {
      list.insertAdjacentHTML("afterend", this._addSkillControls(pnj));
    }
  },

  /* Lit les champs de compétences du formulaire dans le PNJ. */
  _readSkills(pnj) {
    if (!pnj.skills) return;
    pnj.skills.forEach((s, i) => {
      const v = document.getElementById(`em-skill-${i}`);
      if (v) {
        const max = pnj.edition === "anarchy" ? 6 : 12;
        const min = pnj.edition === "anarchy" ? 0 : 1;
        s.val = Utils.clamp(parseInt(v.value, 10) || s.val, min, max);
      }
      const specEl = document.getElementById(`em-skill-spec-${i}`);
      if (specEl) {
        const sp = specEl.value.trim();
        s.spec = sp || null;
      }
      const rrEl = document.getElementById(`em-skill-rr-${i}`);
      if (rrEl) s.rr = Utils.clamp(parseInt(rrEl.value, 10) || 0, 0, 3);
    });
  },

  /* ---- Lecture du formulaire → mise à jour du PNJ ---- */
  _readForm(pnj) {
    const val = (id) => document.getElementById(id)?.value ?? "";
    const num = (id, fallback) => parseInt(val(id), 10) || fallback;

    pnj.name = val("em-name").trim() || pnj.name;
    pnj.meta = val("em-meta") || pnj.meta;
    pnj.gender = val("em-gender") || pnj.gender;

    if (pnj.edition === "anarchy") {
      pnj.tier = val("em-rang") || pnj.tier;
      const edgesEl = document.getElementById("em-atouts");
      if (edgesEl)
        pnj.edges = edgesEl.value
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
    } else {
      pnj.proRating = num("em-prof", pnj.proRating);
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

    // Compétences (SR5/SR6 + Anarchy) : niveau, spécialité, RR
    this._readSkills(pnj);

    // Notes
    const notesEl = document.getElementById("em-notes");
    if (notesEl) pnj.notes = notesEl.value;
  },
};
