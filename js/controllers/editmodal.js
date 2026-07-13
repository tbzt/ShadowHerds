"use strict";

/* ============================================================
   EDIT MODAL — édition avancée d'un PNJ sauvegardé
   ============================================================ */
const EditModal = {
  currentId: null,

  open(id) {
    const pnj = PnjLookup.find(id);
    if (!pnj) {
      toast("PNJ introuvable.", "warning");
      return;
    }
    this.currentId = id;

    document.querySelector(".modal-title").textContent =
      `Édition — ${pnj.name}`;
    const body = document.getElementById("modal-form-body");
    body.innerHTML = pnj.pcLight
      ? this._buildFormLight(pnj)
      : pnj.type === "vehicle"
        ? this._buildFormVehicle(pnj)
        : this._buildForm(pnj);

    // E4 : autocomplétion @ (mentions.js) — em-notes est régénéré à chaque
    // open(), donc rattaché ici (idempotent, sans effet si déjà attaché).
    const notesEl = document.getElementById("em-notes");
    if (notesEl) Mentions.attach(notesEl);

    document.getElementById("edit-modal").classList.add("open");
  },

  close() {
    document.getElementById("edit-modal").classList.remove("open");
    this.currentId = null;
  },

  save() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) {
      this.close();
      return;
    }

    if (pnj.pcLight) {
      this._readFormLight(pnj);
      Characters.save();
      Characters.render();
      CardRenderer.refresh(pnj);
      this.close();
      toast(`${pnj.name} mis à jour.`);
      return;
    }

    if (pnj.type === "vehicle") {
      this._readFormVehicle(pnj);
      // Moniteur recalculé depuis la Structure (SR5/SR6)
      if (!App.getEditionModule(pnj.edition)?.usesRiskPanel) {
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
    // Esprit : moniteur dédié si l'édition en expose un (SR6 p.224),
    // neutre (null) en SR5/Anarchy — cf. conditionMonitor.spiritMonitor.
    if (pnj.type === "spirit" && pnj.force && edModule.conditionMonitor.spiritMonitor) {
      pnj.me = edModule.conditionMonitor.spiritMonitor(pnj.force);
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
    const vm = App.getEditionModule(v.edition).vehicleModel;
    const fields = [...vm.statFields, ...vm.formExtraFields];
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

  /* ---- Formulaire minimal d'un PJ léger (E1) : ni attrs ni skills, jamais
     de branche d'édition — nom/joueur/couleur/notes seulement. ---- */
  _buildFormLight(pnj) {
    const esc = CardRenderer._esc;
    const colors = Characters._PC_COLORS;
    return `<div class="modal-section">
      <div class="modal-section-title">Identité</div>
      <div class="modal-grid wide">
        <div class="form-group full">
          <label>Nom</label>
          <input type="text" id="em-name" value="${esc(pnj.name)}">
        </div>
        <div class="form-group full">
          <label>Joueur·se</label>
          <input type="text" id="em-player" value="${esc(pnj.player || "")}" placeholder="Nom à la table (optionnel)">
        </div>
        <div class="form-group full">
          <label>Couleur</label>
          <div class="em-color-picker">
            ${colors
              .map(
                (c) =>
                  `<button type="button" class="em-color-swatch${pnj.pcColor === c ? " selected" : ""}"
                    style="background:${c}" data-action="pick-pc-color" data-color="${c}"
                    title="${c}" aria-label="Choisir ${c}"></button>`,
              )
              .join("")}
          </div>
        </div>
      </div>
    </div>
    ${this._buildTableBlock(pnj, App.getEditionModule(pnj.edition)?.pcTableBlock)}
    <div class="modal-section">
      <div class="modal-section-title">Notes</div>
      <div class="form-group">
        <textarea id="em-notes" rows="3" placeholder="Notes libres…">${esc(pnj.notes || "")}</textarea>
      </div>
    </div>`;
  },

  /** E3 : section « Mécanique de table » — générée depuis le descripteur
      neutre `pcTableBlock` (jamais `App.edition` ici), repliée par défaut
      (`<details>` natif, pas de JS de bascule à écrire) : le PJ nom-seul
      reste la norme, cette section n'existe que si le MJ l'ouvre. */
  _buildTableBlock(pnj, block) {
    if (!block) return "";
    const esc = CardRenderer._esc;
    const fieldsHtml = (block.fields || [])
      .map((f) => {
        if (f.kind === "select") {
          const opts = f.options
            .map(
              (o) =>
                `<option value="${esc(o)}"${pnj[f.key] === o ? " selected" : ""}>${esc(o)}</option>`,
            )
            .join("");
          return `<div class="form-group">
            <label>${esc(f.label)}</label>
            <select id="em-tb-${f.key}"><option value="">—</option>${opts}</select>
          </div>`;
        }
        return `<div class="form-group">
          <label>${esc(f.label)}</label>
          <input type="number" id="em-tb-${f.key}" value="${pnj[f.key] ?? ""}">
        </div>`;
      })
      .join("");
    const monitorFieldsHtml = this._tableBlockMonitorInputs(pnj, block);
    if (!fieldsHtml && !monitorFieldsHtml) return "";
    return `<details class="modal-section">
      <summary class="modal-section-title">Mécanique de table (optionnel)</summary>
      <div class="modal-grid">${fieldsHtml}${monitorFieldsHtml}</div>
    </details>`;
  },

  /** Cases de moniteur = saisies par le MJ pour "double"/"single" (le PJ
      léger n'a pas d'attribut pour les dériver) ; rien à saisir pour
      "anarchy" (capacité figée par la règle, cf. CardRenderer). */
  _tableBlockMonitorInputs(pnj, block) {
    const esc = CardRenderer._esc;
    // "monitorKind" peut être une fonction (SR6 : réglage separateMonitors,
    // cf. CardRenderer._tableBlockMonitors — même résolution des deux côtés).
    const kind =
      typeof block.monitorKind === "function" ? block.monitorKind() : block.monitorKind;
    if (kind === "double") {
      return `<div class="form-group">
          <label>Moniteur physique (cases)</label>
          <input type="number" id="em-tb-physMon" value="${pnj.physMon ?? ""}" min="0" max="30">
        </div>
        <div class="form-group">
          <label>Moniteur étourdissant (cases)</label>
          <input type="number" id="em-tb-stunMon" value="${pnj.stunMon ?? ""}" min="0" max="30">
        </div>`;
    }
    if (kind === "single") {
      const key = block.monitorMaxKey || "me";
      return `<div class="form-group">
        <label>Moniteur d'état (cases)</label>
        <input type="number" id="em-tb-${esc(key)}" value="${pnj[key] ?? ""}" min="0" max="30">
      </div>`;
    }
    return "";
  },

  _readFormLight(pnj) {
    const nameEl = document.getElementById("em-name");
    if (nameEl && nameEl.value.trim()) pnj.name = nameEl.value.trim();
    const playerEl = document.getElementById("em-player");
    if (playerEl) pnj.player = playerEl.value.trim();
    const notesEl = document.getElementById("em-notes");
    if (notesEl) pnj.notes = notesEl.value;
    const picked = document.querySelector(".em-color-swatch.selected");
    if (picked) pnj.pcColor = picked.dataset.color;
    this._readTableBlock(pnj, App.getEditionModule(pnj.edition)?.pcTableBlock);
  },

  _readTableBlock(pnj, block) {
    if (!block) return;
    for (const f of block.fields || []) {
      const el = document.getElementById(`em-tb-${f.key}`);
      if (!el) continue;
      if (f.kind === "select") {
        pnj[f.key] = el.value || null;
      } else {
        const n = parseInt(el.value, 10);
        pnj[f.key] = Number.isFinite(n) ? n : null;
      }
    }
    const kind =
      typeof block.monitorKind === "function" ? block.monitorKind() : block.monitorKind;
    const monKeys =
      kind === "double"
        ? ["physMon", "stunMon"]
        : kind === "single"
          ? [block.monitorMaxKey || "me"]
          : [];
    for (const key of monKeys) {
      const el = document.getElementById(`em-tb-${key}`);
      if (!el) continue;
      const n = parseInt(el.value, 10);
      pnj[key] = Number.isFinite(n) && n > 0 ? n : null;
    }
  },

  /** Sélection de couleur : mise à jour visuelle immédiate, lue par
      `_readFormLight` à la sauvegarde (pas d'écriture au clic). */
  pickColor(color) {
    document
      .querySelectorAll(".em-color-swatch")
      .forEach((el) => el.classList.toggle("selected", el.dataset.color === color));
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

    const ratingBadge = App.getEditionModule(pnj.edition).ratingBadge;
    if (ratingBadge.options) {
      html += `<div class="form-group">
        <label>${ratingBadge.label}</label>
        <select id="em-rang">
          ${ratingBadge.options
            .map(
              (r) =>
                `<option${pnj[ratingBadge.field] === r ? " selected" : ""}>${r}</option>`,
            )
            .join("")}
        </select>
      </div>`;
    } else {
      html += `<div class="form-group">
        <label>${ratingBadge.label}</label>
        <input type="number" id="em-prof" value="${pnj[ratingBadge.field]}" min="0" max="6">
      </div>`;
    }

    html += "</div></div>";

    // ---- Section : Attributs ----
    const attrKeys = App.getEditionModule(pnj.edition).attributes;

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
    // Ressource de relance (Chance SR5 / Atout SR6), clé portée par le
    // module d'édition — jamais de nom d'attribut figé côté contrôleur.
    const edgeKey = App.getEditionModule(pnj.edition).rerollAction?.costAttr;
    if (edgeKey && pnj.attrs[edgeKey] !== undefined) {
      html += `<div class="form-group">
        <label>${edgeKey}</label>
        <input type="number" id="em-attr-${edgeKey}" value="${pnj.attrs[edgeKey]}" min="0" max="7">
      </div>`;
    }
    html += "</div></div>";

    // ---- Section Anarchy : Atouts libres ----
    if (App.getEditionModule(pnj.edition).hasEdges && pnj.edges) {
      html += `<div class="modal-section">
        <div class="modal-section-title">Atouts</div>
        <div class="form-group">
          <label>Un edge par ligne</label>
          <textarea id="em-atouts" rows="5">${(pnj.edges || []).join("\n")}</textarea>
        </div>
      </div>`;
    }

    // ---- Section : Compétences (éditables + ajout) ----
    {
      const rowFn =
        App.getEditionModule(pnj.edition).skillModel.shape === "extended"
          ? this._skillRowAnarchy.bind(this)
          : this._skillRowSR.bind(this);
      html += `<div class="modal-section">
        <div class="modal-section-title">Compétences</div>
        <div id="em-skills-list" class="em-skills-list">
          ${(pnj.skills || []).map((s, i) => rowFn(pnj, s, i)).join("")}
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
        data-action="remove-skill">×</button>
    </div>`;
  },

  /* Ligne d'une compétence Anarchy : niveau + RR + spécialité (liste) */
  _skillRowAnarchy(pnj, s, i) {
    const esc = CardRenderer._esc;
    const specOpts = ['<option value="">— Aucune —</option>']
      .concat(
        SkillCatalog.anarchySpecs.map(
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
        data-action="remove-skill">×</button>
    </div>`;
  },

  /* Contrôles d'ajout d'une compétence (liste des règles de base) */
  _addSkillControls(pnj) {
    if (typeof SkillCatalog === "undefined") return "";
    const existing = new Set((pnj.skills || []).map((s) => s.name));
    const options = SkillCatalog.skillsFor(pnj.edition)
      .filter((n) => !existing.has(n))
      .map((n) => ({ value: n, label: n }));
    if (!options.length) return "";
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-add-skill-select",
        label: "",
        options,
        value: "",
        placeholder: "+ Ajouter une compétence…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-skill">Ajouter</button>
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

    if (App.getEditionModule(pnj.edition).skillModel.shape === "extended") {
      pnj.skills.push({
        name,
        val: 1,
        attr: SkillCatalog.attrFor(pnj.edition, name) || "AGI",
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
      App.getEditionModule(pnj.edition).skillModel.shape === "extended"
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
        const [min, max] = App.getEditionModule(pnj.edition).skillModel.valRange;
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

    const edModuleForm = App.getEditionModule(pnj.edition);
    const ratingBadge = edModuleForm.ratingBadge;
    if (ratingBadge.options) {
      pnj[ratingBadge.field] = val("em-rang") || pnj[ratingBadge.field];
    } else {
      pnj[ratingBadge.field] = num("em-prof", pnj[ratingBadge.field]);
    }
    if (edModuleForm.hasEdges) {
      const edgesEl = document.getElementById("em-atouts");
      if (edgesEl)
        pnj.edges = edgesEl.value
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
    }

    // Attributs. Ressource de relance (Chance CHC / Atout ATO) bornée 0-7
    // (0 = épuisée) ; les autres 1-12. Clé lue via le module d'édition.
    const edgeKey = edModuleForm.rerollAction?.costAttr;
    const allAttrKeys = [
      ...edModuleForm.attributes,
      "MAG",
      ...(edgeKey ? [edgeKey] : []),
    ];
    for (const k of allAttrKeys) {
      const el = document.getElementById(`em-attr-${k}`);
      if (el && pnj.attrs[k] !== undefined) {
        const [lo, hi] = k === edgeKey ? [0, 7] : [1, 12];
        const raw = parseInt(el.value, 10);
        pnj.attrs[k] = Utils.clamp(
          Number.isNaN(raw) ? pnj.attrs[k] : raw,
          lo,
          hi,
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

  /** Délégation globale du modal (le conteneur #edit-modal n'est jamais
      recréé, seul son contenu — modal-form-body, liste de compétences —
      est reconstruit à chaque open()/rerender). */
  init() {
    const modal = document.getElementById("edit-modal");
    if (!modal) return;
    modal.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      switch (el.dataset.action) {
        case "close":
          this.close();
          break;
        case "save":
          this.save();
          break;
        case "add-skill":
          this.addSkill();
          break;
        case "remove-skill": {
          const row = el.closest("[data-idx]");
          if (row) this.removeSkill(parseInt(row.dataset.idx, 10));
          break;
        }
        case "pick-pc-color":
          this.pickColor(el.dataset.color);
          break;
      }
    });
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => EditModal.init());
} else {
  EditModal.init();
}
