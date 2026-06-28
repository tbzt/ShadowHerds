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

    return `<div class="pnj-card-header">
      <div class="pnj-header-left">
        <div class="pnj-name">${this._esc(pnj.name)}</div>
        <div class="pnj-meta">${gIcon} ${pnj.meta} · ${pnj.profession}${specialStr}</div>
      </div>
      ${badge}
    </div>`;
  },

  /* ---- Body ---- */
  _body(pnj) {
    switch (pnj.edition) {
      case "sr5":
        return this._bodySR5(pnj);
      case "sr6":
        return this._bodySR6(pnj);
      case "anarchy":
        return this._bodyAnarchy(pnj);
      default:
        return '<div class="pnj-card-body">—</div>';
    }
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
    } = pnj;

    let html = '<div class="pnj-card-body">';

    // Attributs principaux (8 + ESS + MAG si applicable)
    const attrKeys = ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"];
    const extras = ["ESS", ...(attrs.MAG ? ["MAG"] : [])];
    html += `<div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, attrs[k])).join("")}</div>`;
    if (extras.length) {
      html += `<div class="attr-grid">${extras.map((k) => this._attrCell(k, attrs[k])).join("")}</div>`;
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
    if (augs && augs.length) html += this._listSection("Augmentations", augs);
    if (equip && equip.length) html += this._tagsSection("Équipement", equip);

    html += "</div>";
    return html;
  },

  /* ---- Body SR6 ---- */
  _bodySR6(pnj) {
    const {
      attrs,
      defAttr,
      init,
      initDice,
      drainResist,
      monitor,
      stunMon,
      monFilled,
      stunFilled,
      skills,
      equip,
      augs,
      sorts,
      powers,
    } = pnj;

    let html = '<div class="pnj-card-body">';

    const attrKeys = ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"];
    const extras = ["ESS", ...(attrs.MAG ? ["MAG"] : [])];
    html += `<div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, attrs[k])).join("")}</div>`;
    if (extras.length) {
      html += `<div class="attr-grid">${extras.map((k) => this._attrCell(k, attrs[k])).join("")}</div>`;
    }

    // Défenses d'attribut SR6
    html += `<div class="card-section def-section">
      <div class="card-section-label">Défenses d'attribut</div>
      <div class="attr-grid">
        ${this._attrCell("Déf.Phys", defAttr.physique, "def-attr")}
        ${this._attrCell("Déf.Ment", defAttr.mental, "def-attr")}
        ${this._attrCell("Déf.Soc", defAttr.social, "def-attr")}
        ${defAttr.astrale !== null ? this._attrCell("Déf.Astr", defAttr.astrale, "def-attr") : ""}
      </div>
    </div>`;

    html += '<div class="stats-row">';
    html += `<span class="stat-pill accent">Init <strong>${init}+${initDice}D6</strong></span>`;
    if (drainResist !== null) {
      html += `<span class="stat-pill">Drain <strong>${drainResist}</strong></span>`;
    }
    html += "</div>";

    // Moniteur(s) SR6
    if (stunMon) {
      html += `<div class="card-section">
        <div class="card-section-label">Moniteurs</div>
        <div class="monitor-row">
          <span class="monitor-label">Phys</span>
          <div class="monitor-boxes">${this._monitorBoxes(pnj.id, "mon", monitor, monFilled)}</div>
        </div>
        <div class="monitor-row" style="margin-top:4px;">
          <span class="monitor-label">Étoud</span>
          <div class="monitor-boxes monitor-stun">${this._monitorBoxes(pnj.id, "stun", stunMon, stunFilled)}</div>
        </div>
      </div>`;
    } else {
      html += `<div class="card-section">
        <div class="card-section-label">Moniteur de condition</div>
        <div class="monitor-row">
          <div class="monitor-boxes">${this._monitorBoxes(pnj.id, "mon", monitor, monFilled)}</div>
        </div>
      </div>`;
    }

    html += this._skillsSection(skills);
    if (sorts && sorts.length) html += this._listSection("Sorts", sorts);
    if (powers && powers.length)
      html += this._listSection("Pouvoirs d'adepte", powers);
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
    html += `<div class="attr-grid" style="grid-template-columns:repeat(5,1fr);">
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

    // Compétences Anarchy : nom / pool composé / RR
    if (skills && skills.length) {
      html += `<div class="card-section">
        <div class="card-section-label">Compétences</div>
        <div class="anarchy-skill-list">`;
      for (const s of skills) {
        const attrVal = attrs[s.attr] || 0;
        const pool = s.val + attrVal;
        const rrStr = s.rr > 0 ? ` RR${s.rr}` : "";
        html += `<div class="anarchy-skill-row">
          <span class="anarchy-skill-name">${this._esc(s.name)}</span>
          <span class="anarchy-skill-pool">${s.val} (${pool}${rrStr})</span>
        </div>`;
        // Spécialisation ◊
        if (s.spec && s.spec !== true && s.specVal) {
          const specAttrVal = attrs[s.specAttr || s.attr] || 0;
          const specPool = s.specVal + specAttrVal;
          const specRR = s.specRR > 0 ? ` RR${s.specRR}` : "";
          html += `<div class="anarchy-skill-row anarchy-skill-spec">
            <span class="anarchy-skill-name">◊ ${this._esc(s.spec)}</span>
            <span class="anarchy-skill-pool">${s.specVal} (${specPool}${specRR})</span>
          </div>`;
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
        html += `<div class="anarchy-skill-row">
          <span class="anarchy-skill-name">${this._esc(a.name)}</span>
          <span class="anarchy-skill-pool">VD ${this._esc(a.vd)} ${this._esc(a.portees)}</span>
        </div>`;
      }
      html += "</div></div>";
    }

    // Sorts (éveillés)
    if (sorts && sorts.length) {
      html += this._listSection("Sorts", sorts);
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
        ${skills.map((s) => `<span class="tag">${this._esc(s.name)}&nbsp;<strong style="color:var(--text)">${s.val}</strong></span>`).join("")}
      </div>
    </div>`;
  },

  _listSection(label, items) {
    if (!items || !items.length) return "";
    return `<div class="card-section">
      <div class="card-section-label">${label}</div>
      <div class="card-section-content">
        ${items.map((i) => `<span class="tag">${this._esc(i)}</span>`).join("")}
      </div>
    </div>`;
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
    const el = document.createElement("div");
    el.className = "contact-card";
    const specStr = c.specialite
      ? ` <em style="color:var(--accent2);font-size:0.6rem;">(${CardRenderer._esc(c.specialite)})</em>`
      : "";
    el.innerHTML = `
      <div class="contact-card-body">
        <div class="contact-name">${CardRenderer._esc(c.name)}</div>
        <div class="contact-role">${CardRenderer._esc(c.role)}${specStr}</div>
        <div style="font-size:0.72rem;color:var(--text-dim);margin:4px 0 8px;line-height:1.5;font-style:italic;">
          ${CardRenderer._esc(c.desc)}
        </div>
        <div class="stats-row">
          <span class="stat-pill">Loyauté <strong>${c.loyaute}</strong></span>
          <span class="stat-pill">Connexion <strong>${c.connexion}</strong></span>
        </div>
        <div style="margin-top:6px;font-size:0.7rem;color:var(--text-dim);line-height:1.5;border-top:1px solid var(--border);padding-top:6px;">
          📍 ${CardRenderer._esc(c.lieu)}<br>
          ⚠ ${CardRenderer._esc(c.trait)}
        </div>
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
