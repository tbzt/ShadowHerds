"use strict";

/* ============================================================
   EDIT MODAL — édition avancée d'un PNJ sauvegardé
   ============================================================ */
const EditModal = {
  currentId: null,
  // Instantané profond pris à l'ouverture : socle de « Annuler les
  // modifications » (revert) et du commit conditionnel à la fermeture.
  _snapshot: null,
  _notesMode: "read", // "read" (puces @/#) | "edit" (jeton brut) — E7

  open(id) {
    const pnj = PnjLookup.find(id);
    if (!pnj) {
      toast("PNJ introuvable.", "warning");
      return;
    }
    this.currentId = id;
    // Avant toute mutation : les sous-actions (compétences, équipement,
    // liens, campagne, couleur) mutent `pnj` en direct pendant la session.
    this._snapshot = structuredClone(pnj);

    document.querySelector(".modal-title").textContent =
      `Édition — ${pnj.name}`;
    const body = document.getElementById("modal-form-body");
    body.innerHTML = pnj.pcLight
      ? this._buildFormLight(pnj)
      : pnj.type === "vehicle"
        ? this._buildFormVehicle(pnj)
        : this._buildForm(pnj);

    // E7 : autocomplétion @/# câblée par l'auto-attach délégué sur
    // `data-mentions` (Mentions.wireAuto) — plus de câblage explicite ici,
    // même si em-notes est régénéré à chaque open().
    const notesEl = document.getElementById("em-notes");
    // E7 : le textarea est régénéré à chaque open() — repartir du mode
    // Lire/Éditer par défaut selon le contenu, jamais garder l'état de la
    // fiche précédemment ouverte.
    this._notesMode = notesEl && notesEl.value.trim() ? "read" : "edit";
    this._syncNotesView();

    document.getElementById("edit-modal").classList.add("open");
  },

  /** Bascule Lire (puces @/# cliquables) / Éditer (jeton brut) des notes
      libres `em-notes` — même mécanique que le bloc-notes de séance. E7. */
  toggleNotesMode() {
    this._notesMode = this._notesMode === "read" ? "edit" : "read";
    this._syncNotesView();
    if (this._notesMode === "edit") document.getElementById("em-notes")?.focus();
  },

  /** Bascule en édition depuis un clic dans le rendu, curseur en fin (E8-A1,
      même mécanique que le bloc-notes de séance). */
  _editNotesFromRead() {
    if (this._notesMode !== "read") return;
    this._notesMode = "edit";
    this._syncNotesView();
    const notesEl = document.getElementById("em-notes");
    if (!notesEl) return;
    notesEl.focus();
    notesEl.setSelectionRange(notesEl.value.length, notesEl.value.length);
  },

  _syncNotesView() {
    const notesEl = document.getElementById("em-notes");
    const readEl = document.getElementById("em-notes-read");
    if (!notesEl || !readEl) return;
    if (this._notesMode === "read") {
      readEl.innerHTML =
        Mentions.renderText(notesEl.value) ||
        '<span class="notepad-read-empty">Vide.</span>';
      readEl.hidden = false;
      notesEl.hidden = true;
    } else {
      readEl.hidden = true;
      notesEl.hidden = false;
    }
  },

  /** Bloc « Notes » commun aux 3 gabarits (identité/véhicule/PJ léger/PNJ
      complet) : textarea éditable + vue lecture (puces @/#) + bascule. E7 —
      remplace la triplication du `<textarea id="em-notes">`. */
  _notesBlock(notes) {
    const esc = CardRenderer._esc;
    return `<div class="modal-section">
      <div class="modal-section-title">
        Notes
        <button type="button" class="btn-icon-tiny" data-action="toggle-notes-mode" title="Lire / Éditer" aria-label="Lire / Éditer">✎</button>
      </div>
      <div class="form-group">
        <div class="notepad-read" id="em-notes-read"></div>
        <textarea id="em-notes" rows="3" data-mentions placeholder="Notes libres…">${esc(notes || "")}</textarea>
      </div>
    </div>`;
  },

  /** Fermeture = commit automatique. Lit le formulaire dans l'objet
      canonique, persiste et rafraîchit — puis referme. Appelé par ✕, le
      bouton « Fermer », Échap et le clic hors-modale (app.js). Aucune saisie
      n'est perdue faute d'avoir cliqué sur un bouton Sauvegarder. */
  close() {
    const pnj = this.currentId && PnjLookup.find(this.currentId);
    if (!pnj) {
      this._hide();
      return;
    }

    if (pnj.pcLight) {
      this._readFormLight(pnj);
      this._finish(pnj, () => Characters.render());
      return;
    }

    if (pnj.type === "vehicle") {
      this._readFormVehicle(pnj);
      // Moniteur recalculé depuis la Structure (SR5/SR6)
      if (!App.getEditionModule(pnj.edition)?.usesRiskPanel) {
        pnj.monTotal = Vehicles._monitor(pnj.stats, pnj.edition);
        pnj.monFilled = Math.min(pnj.monFilled || 0, pnj.monTotal);
      }
      this._finish(pnj, null);
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

    this._finish(pnj, () => {
      if (Shadows.data.all.some((p) => p.id === pnj.id)) Shadows.render();
    });
  },

  /** Tail commun du commit : ne persiste/rafraîchit/notifie que si l'objet a
      réellement changé depuis l'ouverture (évite l'écriture et le toast « mis
      à jour » quand on referme sans rien avoir touché). */
  _finish(pnj, renderCollection) {
    const changed =
      !this._snapshot || JSON.stringify(pnj) !== JSON.stringify(this._snapshot);
    if (changed) {
      UI.persistEntity(pnj.id);
      if (renderCollection) renderCollection();
      CardRenderer.refresh(pnj);
    }
    this._hide();
    if (changed) toast(`${pnj.name} mis à jour.`);
  },

  /** « Annuler les modifications » : restaure l'objet dans l'état capturé à
      l'ouverture, re-persiste (certaines sous-actions ont pu persister en
      cours de session) et referme. */
  revert() {
    const pnj = this.currentId && PnjLookup.find(this.currentId);
    if (pnj && this._snapshot) {
      this._restore(pnj, this._snapshot);
      UI.persistEntity(pnj.id);
      if (pnj.pcLight) Characters.render();
      else if (Shadows.data.all.some((p) => p.id === pnj.id)) Shadows.render();
      CardRenderer.refresh(pnj);
    }
    this._hide();
    toast("Modifications annulées.");
  },

  /** Restaure `snap` dans `target` EN PLACE (l'identité de référence est
      partagée par les collections et le DOM — jamais réassigner). */
  _restore(target, snap) {
    for (const k of Object.keys(target)) if (!(k in snap)) delete target[k];
    Object.assign(target, structuredClone(snap));
  },

  _hide() {
    document.getElementById("edit-modal").classList.remove("open");
    this.currentId = null;
    this._snapshot = null;
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
    ${this._notesBlock(v.notes)}`;
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
            ${(() => {
              const isCustom = pnj.pcColor && !colors.includes(pnj.pcColor);
              const val = pnj.pcColor || colors[0];
              return `<label class="em-color-swatch em-color-custom${isCustom ? " selected" : ""}"
                  ${isCustom ? `style="background:${esc(val)}"` : ""}
                  data-color="${esc(val)}" title="Autre couleur…" aria-label="Choisir une autre couleur">
                <input type="color" class="em-color-custom-input" value="${esc(val)}">
              </label>`;
            })()}
          </div>
        </div>
      </div>
    </div>
    ${this._buildTableBlock(pnj, App.getEditionModule(pnj.edition)?.pcTableBlock)}
    ${this._buildCampaignSection(pnj)}
    ${this._buildContactLinksSection(pnj)}
    ${this._notesBlock(pnj.notes)}`;
  },

  /** E5 : « Contacts liés » — repliée par défaut (`<details>`), générée
      depuis `Characters`/`ContactsBook` (mutation immédiate au clic, comme
      les compétences éditables — pas de champ à valider via Sauvegarder).
      Réutilise `SingleSelect` (picker existant) + le patron visuel
      `.em-skill-row`/`.em-add-skill` des compétences, aucun nouveau widget. */
  _buildContactLinksSection(pnj) {
    const esc = CardRenderer._esc;
    const links = pnj.contactLinks || [];
    const linkedIds = new Set(links.map((l) => l.contactId));
    const rows = links
      .map((l) => {
        const c = ContactsBook.data.all.find((x) => x.id === l.contactId);
        const name = c ? c.name : "(contact supprimé)";
        const meta = [l.relation, l.loyalty != null ? `loyauté ${l.loyalty}` : null]
          .filter(Boolean)
          .join(" · ");
        return `<div class="em-skill-row" data-idx="${esc(l.contactId)}">
          <span class="em-skill-name">${esc(name)}${meta ? ` — ${esc(meta)}` : ""}</span>
          <button type="button" class="em-skill-del" title="Délier"
            data-action="remove-contact-link" data-id="${esc(l.contactId)}">×</button>
        </div>`;
      })
      .join("");
    const options = ContactsBook.data.all
      .filter((c) => !linkedIds.has(c.id))
      .map((c) => ({ value: c.id, label: c.name }));
    const picker = options.length
      ? `<div class="em-add-skill">
          ${SingleSelect.create({
            id: "em-contact-pick",
            label: "",
            options,
            value: "",
            placeholder: "Choisir un contact…",
          })}
          <input type="text" id="em-contact-relation" placeholder="Relation (ex. fixer)">
          <input type="number" id="em-contact-loyalty" placeholder="Loyauté" min="1" max="6">
          <button type="button" class="em-add-skill-btn" data-action="add-contact-link">Lier</button>
        </div>`
      : `<p style="font-size:0.75rem;color:var(--text-dim);">Aucun contact disponible — créez-en un dans Contacts.</p>`;
    return `<details class="modal-section em-contact-links-section">
      <summary class="modal-section-title">Contacts liés</summary>
      <div id="em-contact-links-list">${rows}</div>
      ${picker}
    </details>`;
  },

  addContactLink() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const contactId = document.getElementById("em-contact-pick")?.value;
    if (!contactId) {
      toast("Choisissez un contact.", "warning");
      return;
    }
    const relation = document.getElementById("em-contact-relation")?.value.trim() || "";
    const loyaltyRaw = document.getElementById("em-contact-loyalty")?.value;
    const loyalty = loyaltyRaw ? parseInt(loyaltyRaw, 10) : null;
    Characters.addContactLink(pnj.id, contactId, relation, loyalty);
    this._rerenderContactLinks(pnj);
  },

  removeContactLink(contactId) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    Characters.removeContactLink(pnj.id, contactId);
    this._rerenderContactLinks(pnj);
  },

  _rerenderContactLinks(pnj) {
    const details = document.querySelector("#modal-form-body .em-contact-links-section");
    if (details) details.outerHTML = this._buildContactLinksSection(pnj);
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
    this._readCampaignSection(pnj);
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

  /** Suivi de campagne (optionnel) — réglage des soldes courants depuis
      l'édition. Repliée (`<details>` natif), présente uniquement pour un PJ.
      Générée depuis `Campaign.tracks` (devises + réputation d'édition +
      compteurs libres) : aucune branche d'édition. Les valeurs pré-remplies
      sont les SOLDES dérivés ; à la sauvegarde, l'écart est enregistré comme
      une écriture d'ajustement datée (`_readCampaignSection`). */
  _buildCampaignSection(pnj, open) {
    if (!pnj.isPC) return "";
    const esc = CardRenderer._esc;
    const edModule = App.getEditionModule(pnj.edition);
    const rows = Campaign.tracks(pnj, edModule)
      .map((t) => {
        const bal = Campaign.balance(pnj.campaign, t.key);
        const suffix = t.glyph ? ` (${esc(t.glyph)})` : "";
        return `<div class="form-group">
          <label>${esc(t.label)}${suffix}</label>
          <input type="number" id="em-camp-${esc(t.key)}" value="${bal}">
        </div>`;
      })
      .join("");
    const custom = (pnj.campaign && pnj.campaign.customTracks) || [];
    const customRows = custom
      .map(
        (t) => `<div class="em-camp-track-row" data-key="${esc(t.key)}">
          <input type="text" class="em-camp-label" id="em-camp-label-${esc(t.key)}" value="${esc(t.label)}" aria-label="Nom du compteur">
          <button type="button" class="btn-icon-tiny" data-action="camp-track-remove" data-key="${esc(t.key)}" title="Retirer ce compteur" aria-label="Retirer">✕</button>
        </div>`,
      )
      .join("");
    return `<details class="modal-section em-campaign-section"${open ? " open" : ""}>
      <summary class="modal-section-title">Suivi de campagne (optionnel)</summary>
      <p class="modal-section-hint">Réglez le solde courant : l'écart est enregistré comme un ajustement daté. Le suivi fin (gains/dépenses motivés) se fait ensuite sur la fiche.</p>
      <div class="modal-grid">${rows}</div>
      <div class="em-camp-customs">
        <div class="modal-section-hint">Compteurs personnalisés (mois de style de vie, faveurs dues…)</div>
        ${customRows}
        <div class="em-camp-add-row">
          <input type="text" id="em-camp-newtrack" placeholder="Nouveau compteur" aria-label="Nom du nouveau compteur">
          <button type="button" class="btn-secondary" data-action="camp-track-add">＋ Ajouter</button>
        </div>
      </div>
    </details>`;
  },

  /** Lit les soldes cibles (écriture d'ajustement `cible − solde courant`,
      jamais d'écrasement) et les renommages de compteurs libres. Muté
      directement sur `pnj` (copie canonique) ; `save()` persiste et rafraîchit. */
  _readCampaignSection(pnj) {
    if (!pnj.isPC) return;
    const edModule = App.getEditionModule(pnj.edition);
    for (const t of Campaign.tracks(pnj, edModule)) {
      const el = document.getElementById(`em-camp-${t.key}`);
      if (!el || el.value === "") continue;
      const target = parseInt(el.value, 10);
      if (!Number.isFinite(target)) continue;
      const delta = target - Campaign.balance(pnj.campaign, t.key);
      if (delta !== 0) Campaign.ensure(pnj).ledger.unshift(Campaign.entry(t.key, delta, "ajustement"));
    }
    // Renommage des compteurs libres (appliqué à la sauvegarde).
    for (const t of (pnj.campaign && pnj.campaign.customTracks) || []) {
      const el = document.getElementById(`em-camp-label-${t.key}`);
      const l = el && el.value.trim();
      if (l) t.label = l;
    }
  },

  /** Ajoute un compteur libre depuis l'édition (mutation immédiate via UI),
      puis re-rend la section dépliée pour enchaîner. */
  addCampaignTrack() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const el = document.getElementById("em-camp-newtrack");
    const label = el && el.value.trim();
    if (!label) {
      toast("Nommez le compteur.", "warning");
      return;
    }
    UI.addCustomTrack(pnj.id, label);
    this._rerenderCampaignSection(pnj);
  },

  removeCampaignTrack(key) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    UI.removeCustomTrack(pnj.id, key);
    this._rerenderCampaignSection(pnj);
  },

  _rerenderCampaignSection(pnj) {
    const details = document.querySelector("#modal-form-body .em-campaign-section");
    if (details) details.outerHTML = this._buildCampaignSection(pnj, true);
  },

  /** Sélection de couleur : mise à jour visuelle immédiate, lue par
      `_readFormLight` à la sauvegarde (pas d'écriture au clic). */
  pickColor(color) {
    document
      .querySelectorAll(".em-color-swatch")
      .forEach((el) => el.classList.toggle("selected", el.dataset.color === color));
  },

  /** Pastille « libre » (input color natif) : même bascule de sélection que
      pickColor, mais le fond de la pastille suit la teinte choisie en direct. */
  pickCustomColor(color) {
    const custom = document.querySelector(".em-color-custom");
    if (!custom) return;
    custom.dataset.color = color;
    custom.style.background = color;
    document
      .querySelectorAll(".em-color-swatch")
      .forEach((el) => el.classList.toggle("selected", el === custom));
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
        ${SingleSelect.create({
          id: "em-meta",
          label: "Métatype",
          // pnj.meta ne porte que la souche (5 valeurs) — la métavariante
          // vit à part dans pnj.metavariant (cf. generate() sr5/sr6/anarchy1
          // et _readForm ci-dessous, qui la re-dérive au save).
          value: pnj.metavariant || pnj.meta || "",
          placeholder: "Métatype",
          // #66 : métatype (5 souches) ET métavariante (ex. Troll Cyclope)
          // dans le même picker groupé, fourni par l'édition — jamais un
          // if(App.edition===…) ici (cf. metaOptions() par module).
          ...(App.getEditionModule(pnj.edition).metaOptions?.() || {
            options: ["Humain", "Elfe", "Nain", "Ork", "Troll"].map((m) => ({ value: m, label: m })),
          }),
        })}
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
          <input type="number" id="em-attr-${k}" value="${Actor.attr(pnj, k)}" min="1" max="12">
        </div>`;
      }
    }
    if (pnj.attrs.MAG !== undefined) {
      html += `<div class="form-group">
        <label>MAG</label>
        <input type="number" id="em-attr-MAG" value="${Actor.attr(pnj, "MAG")}" min="1" max="12">
      </div>`;
    }
    // Ressource de relance (Chance SR5 / Atout SR6), clé portée par le
    // module d'édition — jamais de nom d'attribut figé côté contrôleur.
    const edgeKey = App.getEditionModule(pnj.edition).rerollAction?.costAttr;
    if (edgeKey && pnj.attrs[edgeKey] !== undefined) {
      html += `<div class="form-group">
        <label>${edgeKey}</label>
        <input type="number" id="em-attr-${edgeKey}" value="${Actor.attr(pnj, edgeKey)}" min="0" max="7">
      </div>`;
    }
    html += "</div></div>";

    // ---- Section Anarchy : Atouts (toujours affichée dès que l'édition a
    // le concept — capacité de l'édition, pas contenu courant, même
    // correctif que l'Équipement). Hors esprits (sémantique distincte). ----
    if (App.getEditionModule(pnj.edition).hasEdges && pnj.type !== "spirit") {
      html += `<div class="modal-section">
        <div class="modal-section-title">Atouts</div>
        <div class="form-group">
          <label>Un edge par ligne</label>
          <textarea id="em-atouts" rows="5">${(pnj.edges || []).join("\n")}</textarea>
        </div>
        ${this._edgeCatalogControls(pnj)}
      </div>`;
    }

    // ---- Section : Sorts (montée si l'édition a un catalogue de sorts).
    // Hors esprits. Objets structurés (add/retrait via catalogue seulement,
    // pas de saisie libre — comme les Armes). ----
    if (App.getEditionModule(pnj.edition).spellCatalog?.() && pnj.type !== "spirit") {
      html += `<div class="modal-section">
        <div class="modal-section-title">Sorts</div>
        <div id="em-spells-list" class="em-skills-list">
          ${this._spellRows(pnj)}
        </div>
        ${this._spellCatalogControls(pnj)}
      </div>`;
    }

    // ---- Section : Pouvoirs d'adepte (SR5/SR6 seulement — Anarchy fond
    // cette mécanique dans les Atouts). Hors esprits (pnj.powers a une
    // sémantique différente sur un esprit — cf. js/catalogs/spirits.js). ----
    if (App.getEditionModule(pnj.edition).powerCatalog?.() && pnj.type !== "spirit") {
      html += `<div class="modal-section">
        <div class="modal-section-title">Pouvoirs</div>
        <div id="em-powers-list" class="em-skills-list">
          ${this._powerRows(pnj)}
        </div>
        ${this._powerCatalogControls(pnj)}
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

    // ---- Section : Armes structurées ----
    // Montée seulement pour une édition qui stocke ses armes en objets
    // (`weaponModel.source === "weapons"`, Anarchy 2 aujourd'hui) — lecture
    // neutre, jamais de branche d'édition. Le catalogue de la section
    // Équipement route alors ses armes ici (pnj.weapons), pas dans equip.
    if (App.getEditionModule(pnj.edition).weaponModel?.source === "weapons") {
      html += `<div class="modal-section">
        <div class="modal-section-title">Armes</div>
        <div id="em-weapons-list" class="em-skills-list">
          ${this._weaponRows(pnj)}
        </div>
      </div>`;
    }

    // ---- Section : Équipement (toujours affichée : on peut désormais en
    // ajouter à un PNJ qui n'en a pas encore, via le catalogue). ----
    html += `<div class="modal-section">
        <div class="modal-section-title">Équipement</div>
        <div class="form-group">
          <label>Un élément par ligne</label>
          <textarea id="em-equip" rows="4">${this._equipTextLines(pnj).join("\n")}</textarea>
        </div>
        <div id="em-equip-ratings" class="em-skills-list">
          ${this._equipRatingRows(pnj)}
        </div>
        ${this._equipCatalogControls(pnj)}
      </div>`;

    // ---- Section : Cyberdeck (M1) — seulement si déjà structuré (généré ou
    // migré depuis l'ancienne chaîne libre) ; pas de bouton « en ajouter un »
    // en M1 (socle data, cf. PLAN_MATRICE_CYBERDECK.md). ----
    if (pnj.cyberdeck) html += CyberdeckRenderer.editSection(pnj);

    // ---- Section : Suivi de campagne (optionnel, PJ seulement) ----
    html += this._buildCampaignSection(pnj);

    // ---- Section : Notes ----
    html += this._notesBlock(pnj.notes);

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
    const pnj = PnjLookup.find(this.currentId);
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
    const pnj = PnjLookup.find(this.currentId);
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

  /* ---- Armes structurées (éditions à pnj.weapons) + catalogue ---- */

  /* Lignes de la section « Armes » (réutilise le chrome des compétences). */
  _weaponRows(pnj) {
    const esc = CardRenderer._esc;
    return (pnj.weapons || [])
      .map((w, i) => {
        const detail = [w.vd, w.ranges].filter(Boolean).join(" ");
        return `<div class="em-skill-row" data-idx="${i}">
          <span class="em-skill-name">${esc(w.name)}${detail ? ` — ${esc(detail)}` : ""}</span>
          <button type="button" class="em-skill-del" title="Retirer"
            data-action="remove-weapon">×</button>
        </div>`;
      })
      .join("");
  },

  /* Sélecteur groupé « ＋ Catalogue » — monté seulement si l'édition expose
     un catalogue (equipCatalog() ≠ null), comme l'export Foundry. */
  _equipCatalogControls(pnj) {
    const catalog = App.getEditionModule(pnj.edition).equipCatalog?.();
    if (!catalog || !catalog.length) return "";
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-equip-catalog",
        label: "",
        groups: catalog.map((g) => ({
          category: g.category,
          items: g.items.map((it) => ({ value: it.id, label: it.label })),
        })),
        value: "",
        placeholder: "＋ Catalogue…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-equip-item">Ajouter</button>
    </div>`;
  },

  /* Ajoute l'item choisi au catalogue. Commit d'abord le formulaire courant
     (comme addSkill) pour ne perdre aucune saisie, puis laisse l'édition
     placer l'item (equip texte, ou pnj.weapons structuré), et repeint ciblé. */
  addEquipItem() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const sel = document.getElementById("em-equip-catalog");
    const id = sel?.value;
    if (!id) return;
    this._readForm(pnj);
    App.getEditionModule(pnj.edition).addCatalogItem(pnj, id);
    this._rerenderEquip(pnj);
    if (App.getEditionModule(pnj.edition).weaponModel?.source === "weapons")
      this._rerenderWeapons(pnj);
    SingleSelect.reset("em-equip-catalog");
  },

  /* Retire l'arme structurée d'index i. */
  removeWeapon(i) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.weapons) return;
    this._readForm(pnj);
    pnj.weapons.splice(i, 1);
    this._rerenderWeapons(pnj);
  },

  /* #63 : lignes texte libre de la textarea équipement — seuls les items
     CHAÎNE (indice fixe/absent). Les items OBJET (indice non résolu) vivent
     dans la liste à stepper (_equipRatingRows), jamais dans la textarea
     (sinon `[object Object]` + perte de `.rating` au prochain save). */
  _equipTextLines(pnj) {
    return (pnj.equip || []).filter((it) => typeof it === "string");
  },

  /* #63 : une ligne par item OBJET de `pnj.equip` — soit à indice non résolu
     (« Indice 1-4 », stepper numérique borné par la plage), soit catégorisé
     à indice fixe (cyberware/bioware du catalogue, taggé `cat` pour le
     routage Augmentations — cf. ItemResolver.augItems) : label + retrait
     seul, pas de stepper qui n'aurait rien à régler. */
  /* `data-idx` de chaque ligne = position PARMI LES OBJETS SEULEMENT
     (pas l'index brut de `pnj.equip`, qui se réordonne au save — cf.
     _readForm : les objets remontent en tête). `id="em-equip-rating-<i>"`
     garde lui l'index brut : c'est lui que _readForm relit avant réordre
     (absent pour les items sans plage — _readForm ignore alors `.rating`). */
  _equipRatingRows(pnj) {
    const esc = CardRenderer._esc;
    return (pnj.equip || [])
      .map((it, i) => (it && typeof it === "object" ? { it, i } : null))
      .filter(Boolean)
      .map(({ it, i }, ratingIdx) => {
        const label = it.str.split(" [")[0].trim();
        const range = ItemResolver.ratingRange(it.str);
        const control = range
          ? `<input type="number" class="em-equip-rating" id="em-equip-rating-${i}"
              value="${it.rating != null ? it.rating : ""}" min="${range[0]}" max="${range[1]}"
              placeholder="indice ${range[0]}-${range[1]}" title="Indice (${range[0]}-${range[1]})">`
          : "";
        return `<div class="em-skill-row em-equip-rating-row" data-idx="${ratingIdx}">
          <span class="em-skill-name">${esc(label)}</span>
          ${control}
          <button type="button" class="em-skill-del" title="Retirer"
            data-action="remove-equip-rating">×</button>
        </div>`;
      })
      .join("");
  },

  /* Repeint la textarea + la liste à stepper depuis pnj.equip. */
  _rerenderEquip(pnj) {
    const el = document.getElementById("em-equip");
    if (el) el.value = this._equipTextLines(pnj).join("\n");
    const ratings = document.getElementById("em-equip-ratings");
    if (ratings) ratings.innerHTML = this._equipRatingRows(pnj);
  },

  /* Retire l'item d'équipement (objet à indice) à la position ratingIdx
     PARMI LES OBJETS (cf. note _equipRatingRows) — pas un index brut de
     pnj.equip, qui se réordonne pendant _readForm. */
  removeEquipRating(ratingIdx) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !Array.isArray(pnj.equip)) return;
    this._readForm(pnj);
    const objects = pnj.equip.filter((it) => it && typeof it === "object");
    const target = objects[ratingIdx];
    if (!target) return;
    pnj.equip = pnj.equip.filter((it) => it !== target);
    this._rerenderEquip(pnj);
  },

  /* Repeint la seule liste d'armes depuis pnj.weapons. */
  _rerenderWeapons(pnj) {
    const list = document.getElementById("em-weapons-list");
    if (list) list.innerHTML = this._weaponRows(pnj);
  },

  /* ---- Sorts (objets structurés, add/retrait via catalogue seulement) ---- */

  _spellRows(pnj) {
    const esc = CardRenderer._esc;
    return (pnj.spells || [])
      .map((sp, i) => {
        const detail = [
          Content.spellCatLabels[sp.cat] || sp.cat,
          sp.drain != null ? `Drain ${sp.drain}` : sp.niveau != null ? `Niv. ${sp.niveau}` : null,
        ]
          .filter(Boolean)
          .join(", ");
        return `<div class="em-skill-row" data-idx="${i}">
          <span class="em-skill-name" title="${esc(sp.desc || "")}">${esc(sp.name)}${detail ? ` — ${esc(detail)}` : ""}</span>
          <button type="button" class="em-skill-del" title="Retirer"
            data-action="remove-spell">×</button>
        </div>`;
      })
      .join("");
  },

  /* Sélecteur groupé « ＋ Catalogue » — monté seulement si l'édition expose
     un catalogue de sorts (spellCatalog() ≠ null). */
  _spellCatalogControls(pnj) {
    const catalog = App.getEditionModule(pnj.edition).spellCatalog?.();
    if (!catalog || !catalog.length) return "";
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-spell-catalog",
        label: "",
        groups: catalog.map((g) => ({
          category: g.category,
          items: g.items.map((it) => ({ value: it.id, label: it.label })),
        })),
        value: "",
        placeholder: "＋ Catalogue…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-spell-item">Ajouter</button>
    </div>`;
  },

  addSpellItem() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const sel = document.getElementById("em-spell-catalog");
    const id = sel?.value;
    if (!id) return;
    this._readForm(pnj);
    App.getEditionModule(pnj.edition).addSpellItem(pnj, id);
    this._rerenderSpells(pnj);
    SingleSelect.reset("em-spell-catalog");
  },

  removeSpell(i) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.spells) return;
    this._readForm(pnj);
    pnj.spells.splice(i, 1);
    this._rerenderSpells(pnj);
  },

  _rerenderSpells(pnj) {
    const list = document.getElementById("em-spells-list");
    if (list) list.innerHTML = this._spellRows(pnj);
  },

  /* ---- Pouvoirs d'adepte (objets structurés, add/retrait via catalogue seulement) ---- */

  _powerRows(pnj) {
    const esc = CardRenderer._esc;
    return (pnj.powers || [])
      .map(
        (p, i) => `<div class="em-skill-row" data-idx="${i}">
          <span class="em-skill-name" title="${esc(p.desc || "")}">${esc(p.name)}</span>
          <button type="button" class="em-skill-del" title="Retirer"
            data-action="remove-power">×</button>
        </div>`,
      )
      .join("");
  },

  /* Sélecteur plat « ＋ Catalogue » — monté seulement si l'édition expose un
     catalogue de pouvoirs d'adepte (powerCatalog() ≠ null). */
  _powerCatalogControls(pnj) {
    const catalog = App.getEditionModule(pnj.edition).powerCatalog?.();
    if (!catalog || !catalog.length) return "";
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-power-catalog",
        label: "",
        options: catalog.map((it) => ({ value: it.id, label: it.label })),
        value: "",
        placeholder: "＋ Catalogue…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-power-item">Ajouter</button>
    </div>`;
  },

  addPowerItem() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const sel = document.getElementById("em-power-catalog");
    const id = sel?.value;
    if (!id) return;
    this._readForm(pnj);
    App.getEditionModule(pnj.edition).addPowerItem(pnj, id);
    this._rerenderPowers(pnj);
    SingleSelect.reset("em-power-catalog");
  },

  removePower(i) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.powers) return;
    this._readForm(pnj);
    pnj.powers.splice(i, 1);
    this._rerenderPowers(pnj);
  },

  _rerenderPowers(pnj) {
    const list = document.getElementById("em-powers-list");
    if (list) list.innerHTML = this._powerRows(pnj);
  },

  /* ---- Atouts (texte libre + catalogue dédupliqué qui ajoute une ligne) ---- */

  /* Sélecteur plat « ＋ Catalogue » — monté seulement si l'édition expose un
     catalogue d'Atouts (edgeCatalog() ≠ null, Anarchy 1/2 seulement — le
     gate hasEdges de la section exclut déjà SR5/SR6 avant même l'appel). */
  _edgeCatalogControls(pnj) {
    const catalog = App.getEditionModule(pnj.edition).edgeCatalog?.();
    if (!catalog || !catalog.length) return "";
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-edge-catalog",
        label: "",
        options: catalog.map((it) => ({ value: it.id, label: it.label })),
        value: "",
        placeholder: "＋ Catalogue…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-edge-item">Ajouter</button>
    </div>`;
  },

  addEdgeItem() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const sel = document.getElementById("em-edge-catalog");
    const id = sel?.value;
    if (!id) return;
    this._readForm(pnj);
    App.getEditionModule(pnj.edition).addEdgeItem(pnj, id);
    this._rerenderEdges(pnj);
    SingleSelect.reset("em-edge-catalog");
  },

  _rerenderEdges(pnj) {
    const el = document.getElementById("em-atouts");
    if (el) el.value = (pnj.edges || []).join("\n");
  },

  /* #66 : la valeur du picker peut être une souche OU une métavariante/
     métaconscience/zoocanthrope (même liste plate que metaOptions()) —
     la re-résoudre via Metavariants pour retomber sur le même quatuor de
     champs que generate() (meta = souche seule, metavariant/metaFamily/
     metaTraits à part), sinon la fiche affiche « Nartaki » comme souche
     et perd les traits raciaux. Anarchy 2.0 (pas de useMetavariants) garde
     l'ancien comportement : `val` est déjà une souche. */
  _readMeta(pnj, val) {
    if (!val) return;
    const ed = App.getEditionModule(pnj.edition);
    if (!ed.useMetavariants || typeof Metavariants === "undefined") {
      pnj.meta = val;
      return;
    }
    Metavariants.use(pnj.edition);
    const resolved = Metavariants.resolve(val);
    pnj.meta = resolved ? resolved.baseMetatype : val;
    pnj.metavariant = resolved ? resolved.name : null;
    pnj.metaFamily = resolved ? resolved.family : null;
    pnj.metaTraits = resolved ? resolved.traits || [] : [];
  },

  /* ---- Lecture du formulaire → mise à jour du PNJ ---- */
  _readForm(pnj) {
    const val = (id) => document.getElementById(id)?.value ?? "";
    const num = (id, fallback) => parseInt(val(id), 10) || fallback;

    pnj.name = val("em-name").trim() || pnj.name;
    this._readMeta(pnj, val("em-meta"));
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
        // Édition manuelle : pose la BASE du Trait (le total est recalculé,
        // mods d'équipement préservés). Fallback = base courante si NaN.
        Actor.setBase(
          pnj,
          k,
          Utils.clamp(Number.isNaN(raw) ? Actor.base(pnj, k) : raw, lo, hi),
        );
      }
    }

    // Équipement — #63 : la textarea ne porte que les items CHAÎNE (indice
    // fixe/absent) ; les items OBJET (indice non résolu) vivent à part dans
    // la liste à stepper et ne doivent jamais être écrasés par elle, sous
    // peine de perdre `.rating` au save. On lit d'abord le stepper de chaque
    // objet en place, puis on ne remplace que le sous-ensemble « chaînes ».
    if (Array.isArray(pnj.equip)) {
      pnj.equip.forEach((it, i) => {
        if (!it || typeof it !== "object") return;
        const input = document.getElementById(`em-equip-rating-${i}`);
        if (!input) return;
        const [lo, hi] = ItemResolver.ratingRange(it.str) || [1, 6];
        const raw = parseInt(input.value, 10);
        it.rating = Number.isNaN(raw) ? null : Utils.clamp(raw, lo, hi);
      });
    }
    const equipEl = document.getElementById("em-equip");
    if (equipEl) {
      const lines = equipEl.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const objects = (pnj.equip || []).filter((it) => it && typeof it === "object");
      pnj.equip = [...objects, ...lines];
    }

    // Compétences (SR5/SR6 + Anarchy) : niveau, spécialité, RR
    this._readSkills(pnj);

    // Cyberdeck (M1) — lu seulement si la section a été montée (pnj.cyberdeck).
    if (pnj.cyberdeck) CyberdeckRenderer.readForm(pnj);

    // Suivi de campagne (optionnel, PJ seulement)
    this._readCampaignSection(pnj);

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
      // E8-A1 : click-to-edit sur le rendu des notes — avant la délégation
      // data-action (une puce @/# à l'intérieur reste prioritaire, cf. garde).
      if (
        e.target.closest("#em-notes-read") &&
        !e.target.closest("[data-action]") &&
        document.getSelection().isCollapsed
      ) {
        this._editNotesFromRead();
        return;
      }
      const el = e.target.closest("[data-action]");
      if (!el) return;
      switch (el.dataset.action) {
        case "close":
          this.close();
          break;
        case "revert":
          this.revert();
          break;
        case "add-skill":
          this.addSkill();
          break;
        case "remove-skill": {
          const row = el.closest("[data-idx]");
          if (row) this.removeSkill(parseInt(row.dataset.idx, 10));
          break;
        }
        case "add-equip-item":
          this.addEquipItem();
          break;
        case "remove-equip-rating": {
          const row = el.closest("[data-idx]");
          if (row) this.removeEquipRating(parseInt(row.dataset.idx, 10));
          break;
        }
        case "remove-weapon": {
          const row = el.closest("[data-idx]");
          if (row) this.removeWeapon(parseInt(row.dataset.idx, 10));
          break;
        }
        case "add-spell-item":
          this.addSpellItem();
          break;
        case "remove-spell": {
          const row = el.closest("[data-idx]");
          if (row) this.removeSpell(parseInt(row.dataset.idx, 10));
          break;
        }
        case "add-power-item":
          this.addPowerItem();
          break;
        case "remove-power": {
          const row = el.closest("[data-idx]");
          if (row) this.removePower(parseInt(row.dataset.idx, 10));
          break;
        }
        case "add-edge-item":
          this.addEdgeItem();
          break;
        case "pick-pc-color":
          this.pickColor(el.dataset.color);
          break;
        case "add-contact-link":
          this.addContactLink();
          break;
        case "remove-contact-link":
          this.removeContactLink(el.dataset.id);
          break;
        case "toggle-notes-mode":
          this.toggleNotesMode();
          break;
        case "camp-track-add":
          this.addCampaignTrack();
          break;
        case "camp-track-remove":
          this.removeCampaignTrack(el.dataset.key);
          break;
      }
    });
    modal.addEventListener("input", (e) => {
      if (e.target.classList.contains("em-color-custom-input")) {
        this.pickCustomColor(e.target.value);
      }
    });
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => EditModal.init());
} else {
  EditModal.init();
}
