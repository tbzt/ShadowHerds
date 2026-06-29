"use strict";

/* ============================================================
   UI — CardRenderer, ContactRenderer, RunRenderer
   ============================================================ */

const CardRenderer = {
  /** Rend une card PNJ et retourne l'élément DOM */
  render(pnj, actions = ["save", "discard"]) {
    const el = document.createElement("div");
    el.className = "pnj-card scanning";
    el.dataset.id = pnj.id;
    el.dataset.edition = pnj.edition;

    el.innerHTML =
      this._header(pnj) + this._body(pnj) + this._footer(pnj, actions);

    setTimeout(() => el.classList.remove("scanning"), 900);
    return el;
  },

  /** Met à jour le contenu d'une card existante (après édition) */
  refresh(pnj) {
    const el = document.querySelector(`.pnj-card[data-id="${pnj.id}"]`);
    if (!el) return;
    const actions = el.dataset.savedActions
      ? JSON.parse(el.dataset.savedActions)
      : ["edit", "remove"];
    el.innerHTML =
      this._header(pnj) + this._body(pnj) + this._footer(pnj, actions);
  },

  /* ---- Header ---- */
  _header(pnj) {
    const gIcon = { M: "♂", F: "♀", NB: "⚧" }[pnj.gender] || "";
    let badge = "";

    if (pnj.edition === "anarchy") {
      const rangClass = `rang-${pnj.rang.toLowerCase()}`;
      badge = `<span class="pnj-rank-badge ${rangClass}">${pnj.rang}</span>`;
    } else {
      badge = `<span class="pnj-rank-badge">PRO&nbsp;${pnj.prof}</span>`;
    }

    const specialStr =
      pnj.special && pnj.special !== "Aucun"
        ? ` · <em>${pnj.special}</em>`
        : "";

    const metaStr = pnj.metavariant
      ? `${pnj.meta} <span class="pnj-metavariant">(${this._esc(pnj.metavariant)})</span>`
      : pnj.meta;

    return `<div class="pnj-card-header">
      <div class="pnj-header-left">
        <div class="pnj-name">${this._esc(pnj.name)}</div>
        <div class="pnj-meta">${gIcon} ${metaStr} · ${pnj.profession}${specialStr}</div>
      </div>
      ${badge}
    </div>`;
  },

  /* ---- Body ---- */
  _body(pnj) {
    let core;
    switch (pnj.edition) {
      case "sr5":
        core = this._bodySR5(pnj);
        break;
      case "sr6":
        core = this._bodySR6(pnj);
        break;
      case "anarchy":
        core = this._bodyAnarchy(pnj);
        break;
      default:
        return '<div class="pnj-card-body">—</div>';
    }
    // Injecter traits raciaux + habillage avant la fermeture du body
    const extra = this._metaTraitsSection(pnj) + this._flavorSection(pnj);
    if (extra) {
      const idx = core.lastIndexOf("</div>");
      if (idx !== -1) {
        core = core.slice(0, idx) + extra + core.slice(idx);
      }
    }
    return core;
  },

  /* ---- Traits raciaux de métavariante ---- */
  _metaTraitsSection(pnj) {
    if (!pnj.metaTraits || !pnj.metaTraits.length) return "";
    const label =
      pnj.metaFamille === "zoocanthrope"
        ? "Traits zoocanthropes"
        : pnj.metaFamille === "metaconscience"
          ? "Traits de métaconscience"
          : "Traits de métavariante";
    return this._tagsSection(label, pnj.metaTraits);
  },

  /* ---- Habillage (âge, signe, manie, motivation, style, attitude) ---- */
  _flavorSection(pnj) {
    const f = pnj.flavor;
    if (!f) return "";
    const rows = [
      ["Âge", `${f.age} ans`],
      ["Signe distinctif", f.signe],
      ["Style", f.style],
      ["Attitude", f.attitude],
      ["Manie", f.manie],
      ["Motivation", f.motivation],
    ]
      .filter(([, v]) => v)
      .map(
        ([k, v]) =>
          `<div class="flavor-row"><span class="flavor-key">${k}</span><span class="flavor-val">${this._esc(String(v))}</span></div>`,
      )
      .join("");
    return `<div class="card-section flavor-section">
      <div class="card-section-label">Portrait</div>
      ${rows}
    </div>`;
  },

  /* ---- Body SR5 ---- */
  _bodySR5(pnj) {
    const {
      attrs,
      limPhys,
      limMent,
      limSoc,
      init,
      initDice,
      drainResist,
      physMon,
      stunMon,
      physFilled,
      stunFilled,
      skills,
      equip,
      augs,
      sorts,
      powers,
      traits,
    } = pnj;

    let html = '<div class="pnj-card-body">';

    // Attributs principaux (8 + ESS + MAG si applicable)
    const attrKeys = ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"];
    const extras = ["ESS", ...(attrs.MAG ? ["MAG"] : [])];
    html += `<div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, attrs[k])).join("")}</div>`;
    if (extras.length) {
      html += `<div class="attr-grid with-ess">${extras.map((k) => this._attrCell(k, attrs[k])).join("")}</div>`;
    }

    // Limites
    html += `<div class="limites-grid">
      ${this._attrCell("Lim.Phys", limPhys)}
      ${this._attrCell("Lim.Ment", limMent)}
      ${this._attrCell("Lim.Soc", limSoc)}
    </div>`;

    // Pills
    html += '<div class="stats-row">';
    html += `<span class="stat-pill accent">Init <strong>${init}+${initDice}D6</strong></span>`;
    if (drainResist !== null) {
      html += `<span class="stat-pill">Drain <strong>${drainResist}</strong></span>`;
    }
    html += "</div>";

    // Moniteurs SR5 (séparés)
    html += `<div class="card-section">
      <div class="card-section-label">Moniteurs</div>
      <div class="monitor-row">
        <span class="monitor-label">Phys</span>
        <div class="monitor-boxes monitor-phys">${this._monitorBoxes(pnj.id, "phys", physMon, physFilled)}</div>
      </div>
      <div class="monitor-row" style="margin-top:4px;">
        <span class="monitor-label">Étoud</span>
        <div class="monitor-boxes monitor-stun">${this._monitorBoxes(pnj.id, "stun", stunMon, stunFilled)}</div>
      </div>
    </div>`;

    html += this._skillsSection(skills);
    if (sorts && sorts.length) html += this._listSection("Sorts", sorts);
    if (powers && powers.length)
      html += this._listSection("Pouvoirs d'adepte", powers);
    if (traits && traits.length) html += this._listSection("Traits", traits);
    if (augs && augs.length) html += this._listSection("Augmentations", augs);
    if (equip && equip.length) html += this._tagsSection("Équipement", equip);

    html += "</div>";
    return html;
  },

  /* ---- Body SR6 ---- */
  _bodySR6(pnj) {
    const {
      attrs,
      me,
      sdBase,
      initBase,
      initDice,
      pa,
      physFilled,
      skills,
      equip,
      augs,
      sorts,
      powers,
      traits,
    } = pnj;

    let html = '<div class="pnj-card-body">';

    // Attributs SR6 : CON/AGI/RÉA/FOR/VOL/LOG/INT/CHA
    const attrKeys = ["CON", "AGI", "RÉA", "FOR", "VOL", "LOG", "INT", "CHA"];
    html += `<div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, attrs[k] ?? "—")).join("")}</div>`;

    // Attributs spéciaux (MAG, RES)
    const extras = [];
    if (attrs.MAG) extras.push("MAG");
    if (attrs.RES) extras.push("RES");
    if (extras.length) {
      html += `<div class="attr-grid with-ess">${extras.map((k) => this._attrCell(k, attrs[k])).join("")}</div>`;
    }

    // Stats clés SR6
    html += '<div class="stats-row">';
    html += `<span class="stat-pill accent">Init <strong>${initBase ?? "?"}+${initDice ?? 1}D6</strong></span>`;
    html += `<span class="stat-pill">SD <strong>${sdBase ?? "?"}</strong></span>`;
    html += `<span class="stat-pill">ME <strong>${me ?? "?"}</strong></span>`;
    if (pa) html += `<span class="stat-pill">PA <strong>${pa}</strong></span>`;
    html += "</div>";

    // Moniteur d'état unique SR6
    const monTotal = me ?? 9;
    html += `<div class="card-section">
      <div class="card-section-label">Moniteur d'état</div>
      <div class="monitor-row">
        <div class="monitor-boxes">${this._monitorBoxes(pnj.id, "phys", monTotal, physFilled ?? 0)}</div>
      </div>
    </div>`;

    html += this._skillsSection(skills);
    if (sorts && sorts.length) html += this._listSection("Sorts", sorts);
    if (powers && powers.length)
      html += this._listSection("Pouvoirs d'adepte", powers);
    if (traits && traits.length) html += this._listSection("Traits", traits);
    if (augs && augs.length) html += this._listSection("Augmentations", augs);
    if (equip && equip.length) html += this._tagsSection("Équipement", equip);

    html += "</div>";
    return html;
  },

  /* ---- Body Anarchy 2e ---- */
  _bodyAnarchy(pnj) {
    const {
      attrs,
      skills,
      atouts,
      armes,
      equip,
      sorts,
      traits,
      combativite,
      seuilsPhys,
      seuils_ment,
      seuilsMat,
      physFilled,
      mentFilled,
      matFilled,
      eveille,
      notes,
    } = pnj;

    let html = '<div class="pnj-card-body">';

    // Attributs : 5 attrs Anarchy (FOR/AGI/VOL/LOG/CHA)
    const attrKeys = ["FOR", "AGI", "VOL", "LOG", "CHA"];
    html += `<div class="attr-grid">
      ${attrKeys.map((k) => this._attrCell(k, attrs[k])).join("")}
    </div>`;

    // Combativité + éveillé
    html += '<div class="stats-row">';
    const combClass =
      combativite === "forte" || combativite === "extrême" ? "accent" : "";
    html += `<span class="stat-pill ${combClass}">Combativité <strong>${combativite}</strong></span>`;
    if (eveille) {
      const evLabel =
        {
          hermétique: "Éveillé hermétique",
          adepte: "Adepte",
          chamanique: "Éveillé chaman",
        }[eveille] || eveille;
      html += `<span class="stat-pill">✦ ${evLabel}</span>`;
    }
    html += "</div>";

    // Compétences Anarchy — alignées visuellement sur SR5/SR6 (tags compacts).
    // Le pool (val + attr) reste affiché dans le tag ; la spé suit en tag ◊.
    if (skills && skills.length) {
      html += `<div class="card-section">
        <div class="card-section-label">Compétences</div>
        <div class="card-section-content">`;
      for (const s of skills) {
        const attrVal = attrs[s.attr] || 0;
        const pool = s.val + attrVal;
        const rrStr = s.rr > 0 ? ` RR${s.rr}` : "";
        html += `<span class="tag skill-tag" title="${this._esc(s.name)} : ${pool} (${s.val}+${s.attr}${rrStr})">${this._esc(s.name)}&nbsp;<strong style="color:var(--text)">${pool}</strong></span>`;
        if (s.spec && s.spec !== true && s.specVal) {
          const specAttrVal = attrs[s.specAttr || s.attr] || 0;
          const specPool = s.specVal + specAttrVal;
          html += `<span class="tag skill-tag skill-tag-spec" title="Spécialisation ${this._esc(s.spec)} : ${specPool}">◊&nbsp;${this._esc(s.spec)}&nbsp;<strong style="color:var(--text)">${specPool}</strong></span>`;
        }
      }
      html += "</div></div>";
    }

    // Atouts
    if (atouts && atouts.length) {
      html += `<div class="card-section">
        <div class="card-section-label">Atouts</div>
        <div class="card-section-content">`;
      for (const a of atouts) {
        html += `<div class="anarchy-atout">• ${this._esc(a)}</div>`;
      }
      html += "</div></div>";
    }

    // Armes
    if (armes && armes.length) {
      html += `<div class="card-section">
        <div class="card-section-label">Armes</div>
        <div class="anarchy-skill-list">`;
      for (const a of armes) {
        const noteStr = a.note
          ? ` <em style="color:var(--text-dim);font-size:0.58rem;">(${this._esc(a.note)})</em>`
          : "";
        html += `<div class="anarchy-skill-row">
          <span class="anarchy-skill-name">${this._esc(a.name)}${noteStr}</span>
          <span class="anarchy-skill-pool">VD ${a.vd} ${this._esc(a.portees)}</span>
        </div>`;
      }
      html += "</div></div>";
    }

    // Sorts (éveillés)
    if (sorts && sorts.length) {
      html += this._listSection("Sorts", sorts);
    }

    // Traits
    if (traits && traits.length) {
      html += this._listSection("Traits", traits);
    }

    // Équipement
    if (equip && equip.length) {
      html += this._tagsSection("Équipement", equip);
    }

    // Seuils de blessures — Anarchy utilise un format X/Y/Z
    html += `<div class="card-section">
      <div class="card-section-label">Seuils de blessures</div>
      <div class="anarchy-seuils">`;

    const fmtSeuils = (arr) =>
      arr ? `${arr[0]} / ${arr[1]} / ${arr[2]}` : "—";

    html += `<div class="anarchy-seuil-row">
      <span class="anarchy-seuil-label">Physiques</span>
      <div class="monitor-boxes">${this._monitorBoxesAnarchy(pnj.id, "phys", seuilsPhys, physFilled)}</div>
    </div>`;
    html += `<div class="anarchy-seuil-row" style="margin-top:4px;">
      <span class="anarchy-seuil-label">Mentales</span>
      <div class="monitor-boxes">${this._monitorBoxesAnarchy(pnj.id, "ment", seuils_ment, mentFilled)}</div>
    </div>`;
    if (seuilsMat) {
      html += `<div class="anarchy-seuil-row" style="margin-top:4px;">
        <span class="anarchy-seuil-label">Matricielles</span>
        <div class="monitor-boxes">${this._monitorBoxesAnarchy(pnj.id, "mat", seuilsMat, matFilled)}</div>
      </div>`;
    }
    html += "</div></div>";

    if (notes) {
      html += `<div class="card-section">
        <div class="card-section-label">Notes</div>
        <div class="card-section-content" style="font-size:0.75rem;">${this._esc(notes)}</div>
      </div>`;
    }

    html += "</div>";
    return html;
  },

  /**
   * Moniteur Anarchy : les seuils sont [leger, moyen, grave].
   * On affiche N cases correspondant au seuil grave (max),
   * avec marquage des paliers léger et moyen.
   */
  _monitorBoxesAnarchy(pnjId, type, seuils, filled = 0) {
    if (!seuils) return "—";
    const [s1, s2, s3] = seuils;
    return Array.from({ length: s3 }, (_, i) => {
      const isFilled = i < filled;
      // Paliers : case s1 = fin blessure légère, s2 = fin blessure modérée
      const isPalier = i + 1 === s1 || i + 1 === s2;
      const cls = [
        "monitor-box",
        isFilled ? "filled" : "",
        isPalier ? "penalty" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<div class="${cls}" onclick="UI.toggleMonitor('${pnjId}','${type}',${i})"></div>`;
    }).join("");
  },

  /* ---- Helpers ---- */
  _attrCell(label, value, extraClass = "") {
    return `<div class="attr-cell ${extraClass}">
      <span class="attr-label">${label}</span>
      <span class="attr-value">${value ?? "—"}</span>
    </div>`;
  },

  _monitorBoxes(pnjId, type, total, filled = 0) {
    return Array.from({ length: total }, (_, i) => {
      const isFilled = i < filled;
      // Pénalité toutes les 3 cases
      const isPenalty = (i + 1) % 3 === 0;
      const cls =
        `monitor-box ${isFilled ? "filled" : ""} ${isPenalty ? "penalty" : ""}`.trim();
      return `<div class="${cls}" onclick="UI.toggleMonitor('${pnjId}','${type}',${i})"></div>`;
    }).join("");
  },

  _skillsSection(skills) {
    if (!skills || !skills.length) return "";
    return `<div class="card-section">
      <div class="card-section-label">Compétences</div>
      <div class="card-section-content">
        ${skills.map((s) => `<span class="tag skill-tag">${this._esc(s.name)}&nbsp;<strong style="color:var(--text)">${s.val}</strong></span>`).join("")}
      </div>
    </div>`;
  },

  _listSection(label, items) {
    if (!items || !items.length) return "";
    return `<div class="card-section">
      <div class="card-section-label">${label}</div>
      <div class="card-section-content">
        ${items.map((i) => this._contentTag(i)).join("")}
      </div>
    </div>`;
  },

  /* Rend un élément de contenu : objet {nom, desc} -> tag cliquable
     ouvrant une modale ; chaîne simple -> tag normal. Pour les sorts, un
     champ drain (SR5/SR6) ou seuil (Anarchy) est affiché dans le libellé. */
  _contentTag(item) {
    if (item && typeof item === "object" && item.nom) {
      const nom = this._esc(item.nom);
      // Suffixe Drain/Seuil pour les sorts, affiché dans le tag.
      let suffix = "";
      if (item.drain != null) {
        suffix = ` <span class="tag-stat">(Drain ${this._esc(item.drain)})</span>`;
      } else if (item.seuil != null) {
        suffix = ` <span class="tag-stat">(Seuil ${this._esc(item.seuil)})</span>`;
      }
      if (item.desc) {
        // _esc échappe " donc le contenu est sûr dans un attribut entre guillemets.
        // Pas de onclick inline : on stocke nom/desc en data-* et on délègue
        // le clic/clavier (voir ContentModal.bindDelegation), ce qui évite tout
        // problème d'apostrophes ou de guillemets dans le texte.
        const desc = this._esc(item.desc);
        const t = this._esc(item.nom);
        return `<span class="tag tag-clickable" role="button" tabindex="0"
          data-content-nom="${t}" data-content-desc="${desc}"
          >${nom}${suffix}<span class="tag-info">i</span></span>`;
      }
      return `<span class="tag">${nom}${suffix}</span>`;
    }
    return `<span class="tag">${this._esc(item)}</span>`;
  },

  _tagsSection(label, items) {
    return this._listSection(label, items);
  },

  _esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  /* ---- Footer ---- */
  _footer(pnj, actions) {
    const btns = [];
    if (actions.includes("save")) {
      btns.push(
        `<button class="card-action-btn save" onclick="Shadows.savePNJ('${pnj.id}')">Sauvegarder</button>`,
      );
    }
    if (actions.includes("edit")) {
      btns.push(
        `<button class="card-action-btn ghost" onclick="EditModal.open('${pnj.id}')">Éditer</button>`,
      );
    }
    if (actions.includes("discard")) {
      btns.push(
        `<button class="card-action-btn danger" onclick="Gen.discard('${pnj.id}')">Virer</button>`,
      );
    }
    if (actions.includes("remove")) {
      btns.push(
        `<button class="card-action-btn danger" onclick="Shadows.removePNJ('${pnj.id}')">Supprimer</button>`,
      );
    }
    return `<div class="pnj-card-footer" data-saved-actions='${JSON.stringify(actions)}'>${btns.join("")}</div>`;
  },
};

/* ============================================================
   UI — interactions live (moniteurs, narcos, etc.)
   ============================================================ */
const UI = {
  /** Clic sur une case de moniteur */
  toggleMonitor(pnjId, type, idx) {
    const pnj = this._findPNJ(pnjId);
    if (!pnj) return;

    // Mapping type → champ du PNJ
    const fieldMap = {
      phys: "physFilled",
      stun: "stunFilled",
      mon: "monFilled",
      ment: "mentFilled",
      mat: "matFilled",
    };
    const field = fieldMap[type] || "monFilled";
    if (pnj[field] === undefined) pnj[field] = 0;

    pnj[field] = idx < pnj[field] ? idx : idx + 1;

    Shadows.save();
    CardRenderer.refresh(pnj);
  },

  /** Clic sur un point de narco (Anarchy) */
  toggleNarco(pnjId, idx) {
    const pnj = this._findPNJ(pnjId);
    if (!pnj) return;
    if (idx < (pnj.narcoUsed || 0)) {
      pnj.narcoUsed = idx;
    } else {
      pnj.narcoUsed = idx + 1;
    }
    Shadows.save();
    CardRenderer.refresh(pnj);
  },

  _findPNJ(id) {
    return Shadows.data.all.find((p) => p.id === id);
  },
};

/* ============================================================
   CONTACT RENDERER
   ============================================================ */
const ContactRenderer = {
  render(c) {
    return c.edition === "anarchy" ? this._renderAnarchy(c) : this._renderSR(c);
  },

  /* ---- Card persistante (ContactsBook) avec édition inline ---- */
  renderPersistent(c, allGroups, currentGroups) {
    const el = document.createElement("div");
    el.className = "contact-card contact-card-saved";
    el.dataset.id = c.id;

    const isAnarchy = c.edition === "anarchy";
    const stats = isAnarchy ? this._statsAnarchy(c) : this._statsSR(c);

    const groupOpts = ["— Sans groupe —", ...allGroups]
      .map((g) => {
        const val = g === "— Sans groupe —" ? "all" : g;
        const sel = currentGroups.includes(g) ? "selected" : "";
        return `<option value="${val}" ${sel}>${g}</option>`;
      })
      .join("");
    const groupSel =
      allGroups.length > 0
        ? `<select class="group-select-inline" title="Groupe"
           onchange="ContactsBook.moveToGroup('${c.id}', this.value)">${groupOpts}</select>`
        : "";

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
          </div>
          <div class="contact-header-actions">
            ${groupSel}
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
        `<span class="niveau-dot ${i < c.niveau ? "filled" : ""}"
        onclick="ContactsBook.editField('${c.id}', 'niveau', ${i + 1}); ContactsBook.render()"></span>`,
    ).join("");
    const bonus = c.bonus
      ? `<div class="contact-bonus">+ ${CardRenderer._esc(c.bonus)}</div>`
      : "";
    return `<div class="contact-anarchy-stats">
      <div class="contact-stat-row">
        <span class="contact-stat-label">Niveau</span>
        <div class="niveau-dots">${dots}</div>
        <span class="contact-stat-val">${c.niveau} (${(c.niveau * 5000).toLocaleString("fr-FR")}¥)</span>
      </div>
      <div class="contact-stat-row">
        <span class="contact-stat-label">Effet</span>
        <span class="contact-rr">RR ${c.rr} — ${CardRenderer._esc(c.domaine)}</span>
      </div>
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
    const niveauDots = Array.from(
      { length: 6 },
      (_, i) =>
        `<span class="niveau-dot ${i < c.niveau ? "filled" : ""}"></span>`,
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
            <div class="niveau-dots">${niveauDots}</div>
            <span class="contact-stat-val">${c.niveau} (${c.cout.toLocaleString("fr-FR")}¥)</span>
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

/* ============================================================
   RUN RENDERER
   ============================================================ */
const RunRenderer = {
  render(r) {
    const el = document.createElement("div");
    el.className = "run-card";
    const obj2 = r.objectif2
      ? `<div class="run-field">
           <span class="run-field-label">Objectif secondaire</span>
           <span class="run-field-val" style="color:var(--accent2);font-size:0.75rem;">${CardRenderer._esc(r.objectif2)}</span>
         </div>`
      : "";
    el.innerHTML = `
      <div class="run-card-header">
        <div class="run-type">${CardRenderer._esc(r.type)}</div>
        <span class="pnj-rank-badge">${r.difficulte}</span>
      </div>
      <div class="run-card-body">
        <div class="run-field">
          <span class="run-field-label">Client</span>
          <span class="run-field-val">${CardRenderer._esc(r.client)}</span>
        </div>
        <div class="run-field">
          <span class="run-field-label">Lieu</span>
          <span class="run-field-val">${CardRenderer._esc(r.lieu)}</span>
        </div>
        <div class="run-field">
          <span class="run-field-label">Complication</span>
          <span class="run-field-val run-complication">${CardRenderer._esc(r.complication)}</span>
        </div>
        ${obj2}
        <div class="stats-row" style="margin-top:0.5rem;">
          <span class="stat-pill accent">Paiement <strong>${r.payment}</strong></span>
        </div>
      </div>
      <div class="pnj-card-footer">
        <button class="card-action-btn danger" onclick="this.closest('.run-card').remove()">Virer</button>
      </div>`;
    return el;
  },
};

/* ============================================================
   CONTENT MODAL — affiche la description d'un contenu en un clic
   (arme, sort, pouvoir, trait). Modale légère, fermeture au clic
   en dehors, sur la croix, ou avec Échap.
   ============================================================ */
const ContentModal = {
  _el: null,
  _delegated: false,

  /* Délégation globale : tout clic / touche Enter|Espace sur un
     [data-content-nom] ouvre la modale. dataset décode automatiquement
     les entités HTML (&#39;, &quot;…), donc le texte affiché est correct. */
  bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;
    const open = (target) => {
      const tag = target.closest("[data-content-nom]");
      if (!tag) return false;
      this.show(tag.dataset.contentNom, tag.dataset.contentDesc || "");
      return true;
    };
    document.addEventListener("click", (e) => open(e.target));
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const tag = e.target.closest && e.target.closest("[data-content-nom]");
      if (tag) {
        e.preventDefault();
        this.show(tag.dataset.contentNom, tag.dataset.contentDesc || "");
      }
    });
  },

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "content-modal-overlay";
    overlay.id = "content-modal-overlay";
    overlay.innerHTML = `
      <div class="content-modal" role="dialog" aria-modal="true">
        <button class="content-modal-close" aria-label="Fermer">&times;</button>
        <h3 class="content-modal-title"></h3>
        <p class="content-modal-desc"></p>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.hide();
    });
    overlay
      .querySelector(".content-modal-close")
      .addEventListener("click", () => this.hide());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.hide();
    });
    this._el = overlay;
    return overlay;
  },

  show(nom, desc) {
    const el = this._ensure();
    el.querySelector(".content-modal-title").textContent = nom;
    el.querySelector(".content-modal-desc").textContent = desc;
    el.classList.add("visible");
  },

  hide() {
    if (this._el) this._el.classList.remove("visible");
  },
};
