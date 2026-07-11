"use strict";

/* ============================================================
   CARD RENDERER — rend une card PNJ (générateur, Ombres, véhicules,
   esprits) et gère son cycle de rafraîchissement.
   Les corps par édition (SR5/SR6/Anarchy) et le rendu des entités
   liées (véhicules, esprits) vivent dans des fichiers séparés
   (cardrenderer.sr5.js, .sr6.js, .anarchy.js, .linked.js) qui
   étendent cet objet — même patron que les modules d'édition.
   ============================================================ */
const CardRenderer = {
  /** Dépendances de rendu par défaut, lues depuis les globals de l'app.
      Point de câblage unique : le reste du renderer ne lit plus aucun de
      ces modules directement, tout arrive via le paramètre `deps`. */
  liveDeps() {
    return { Settings, Drugs, Vehicles, Spirits, WeaponRoll, UI };
  },

  /** Rend une card PNJ et retourne l'élément DOM */
  render(pnj, actions = ["save", "discard"], deps = CardRenderer.liveDeps()) {
    const el = document.createElement("div");
    el.className = "pnj-card scanning";
    el.dataset.id = pnj.id;
    el.dataset.edition = pnj.edition;

    el.innerHTML =
      this._header(pnj) + this._body(pnj, deps) + this._footer(pnj, actions, deps);

    setTimeout(() => el.classList.remove("scanning"), 900);
    return el;
  },

  /** Met à jour le contenu d'une card existante (après édition).
      Un PNJ sauvegardé peut avoir DEUX cartes (générateur + Ombres) :
      on rafraîchit toutes les copies, chacune avec ses propres actions
      (portées par data-saved-actions sur son footer). */
  refresh(pnj, deps = CardRenderer.liveDeps()) {
    document
      .querySelectorAll(`.pnj-card[data-id="${pnj.id}"]`)
      .forEach((el) => {
        const footer = el.querySelector(".pnj-card-footer");
        const actions =
          footer && footer.dataset.savedActions
            ? JSON.parse(footer.dataset.savedActions)
            : ["edit", "remove"];
        el.innerHTML =
          this._header(pnj) + this._body(pnj, deps) + this._footer(pnj, actions, deps);
      });
  },

  /* ---- Header ---- */
  _header(pnj) {
    if (pnj.type === "vehicle") return this._headerVehicle(pnj);
    if (pnj.type === "spirit") return this._headerSpirit(pnj);
    const gIcon = { M: "♂", F: "♀", NB: "⚧" }[pnj.gender] || "";
    let badge = "";

    const ratingBadge = App.getEditionModule(pnj.edition).ratingBadge;
    if (ratingBadge.options) {
      const tier = pnj[ratingBadge.field] || ratingBadge.options[0];
      const tierClass = `rang-${tier.toLowerCase()}`;
      badge = `<span class="pnj-rank-badge ${tierClass}" title="Rang tactique — poids du PNJ dans une scène">${tier}</span>`;
    } else {
      badge = `<span class="pnj-rank-badge" title="Niveau de professionnalisme">PRO&nbsp;${pnj[ratingBadge.field]}</span>`;
    }

    const specialStr =
      pnj.special && pnj.special !== "Aucun"
        ? ` · <em>${pnj.special}</em>`
        : "";

    const metaStr = pnj.infected
      ? `${pnj.meta} <span class="pnj-metavariant pnj-infected">(${this._esc(pnj.infected)})</span>`
      : pnj.metavariant
        ? `${pnj.meta} <span class="pnj-metavariant">(${this._esc(pnj.metavariant)})</span>`
        : pnj.meta;

    const nameHtml = this._nameBlock(pnj.name);

    // L'archétype n'est affiché que s'il apporte une info en plus du nom :
    // pour les créatures, name === archetype === label, on ne le répète pas.
    const archStr =
      pnj.archetype && pnj.archetype !== pnj.name ? ` · ${pnj.archetype}` : "";

    return `<div class="pnj-card-header">
      ${this._portraitThumb(pnj)}
      <div class="pnj-header-left">
        ${nameHtml}
        <div class="pnj-meta">${gIcon} ${metaStr}${archStr}${specialStr}</div>
      </div>
      ${badge}
    </div>`;
  },

  /** Vignette de portrait IA (opt-in), affichée dès qu'un portrait a été
      généré — indépendamment du réglage courant (désactiver le réglage
      empêche d'en générer de nouveaux, pas d'afficher les existants). */
  _portraitThumb(entity) {
    if (!entity.portraitUrl) return "";
    return `<div class="pnj-portrait-thumb" role="button" tabindex="0"
      data-portrait-preview="${this._esc(entity.portraitUrl)}" title="Agrandir le portrait">
      <img src="${this._esc(entity.portraitUrl)}" alt="" loading="lazy">
    </div>`;
  },

  /* Découpe « Prénom "Surnom" Famille » : le surnom devient le titre
     mis en avant ; le nom civil (prénom + famille) passe en sous-ligne
     discrète. Si aucun surnom n'est présent, on affiche le nom tel quel. */
  _nameBlock(rawName) {
    const name = String(rawName ?? "");
    const m = name.match(/^(.*?)\s*[«"“]([^»"”]+)[»"”]\s*(.*)$/);
    if (m) {
      const alias = m[2].trim();
      const civil = `${m[1].trim()} ${m[3].trim()}`.replace(/\s+/g, " ").trim();
      return `<div class="pnj-name" title="${this._esc(name)}">${this._esc(alias)}</div>
        ${civil ? `<div class="pnj-civilname">${this._esc(civil)}</div>` : ""}`;
    }
    return `<div class="pnj-name" title="${this._esc(name)}">${this._esc(name)}</div>`;
  },

  /* ---- Body ---- */
  _body(pnj, deps) {
    if (pnj.type === "vehicle") return this._bodyVehicle(pnj, deps);
    // Les esprits sont des objets PNJ standards : le corps d'édition les
    // rend tel quel (jets, moniteurs, RR). Seule la barre de services est
    // injectée en tête.
    if (pnj.type === "spirit") {
      let core;
      switch (pnj.edition) {
        case "sr5": core = this._bodySR5(pnj, deps); break;
        case "sr6": core = this._bodySR6(pnj, deps); break;
        case "anarchy1": core = this._bodyAnarchy1(pnj, deps); break;
        case "anarchy2": core = this._bodyAnarchy(pnj, deps); break;
        default: return '<div class="pnj-card-body">—</div>';
      }
      return this._spiritServicesBar(pnj) + core;
    }
    let core;
    switch (pnj.edition) {
      case "sr5":
        core = this._bodySR5(pnj, deps);
        break;
      case "sr6":
        core = this._bodySR6(pnj, deps);
        break;
      case "anarchy1":
        core = this._bodyAnarchy1(pnj, deps);
        break;
      case "anarchy2":
        core = this._bodyAnarchy(pnj, deps);
        break;
      default:
        return '<div class="pnj-card-body">—</div>';
    }
    // Injecter magie (tradition/esprit mentor) + traits raciaux + habillage
    const extra =
      this._magicSection(pnj) +
      this._metaTraitsSection(pnj) +
      this._creatureLoreSection(pnj) +
      this._flavorSection(pnj);
    if (extra) {
      const idx = core.lastIndexOf("</div>");
      if (idx !== -1) {
        core = core.slice(0, idx) + extra + core.slice(idx);
      }
    }
    return core;
  },

  /* ---- Tradition magique & esprit mentor (Éveillés) ---- */
  _magicSection(pnj) {
    let html = "";
    if (pnj.tradition) {
      html += this._listSection("Tradition", [
        { name: pnj.tradition, desc: pnj.traditionDesc },
      ]);
    }
    if (pnj.mentorSpirit) {
      html += this._listSection("Esprit mentor", [pnj.mentorSpirit]);
    }
    return html;
  },

  /* ---- Traits raciaux de métavariante ---- */
  _metaTraitsSection(pnj) {
    if (!pnj.metaTraits || !pnj.metaTraits.length) return "";
    const label =
      pnj.metaFamily === "zoocanthrope"
        ? "Traits zoocanthropes"
        : pnj.metaFamily === "metaconscience"
          ? "Traits de métaconscience"
          : "Traits de métavariante";
    return this._tagsSection(label, pnj.metaTraits);
  },

  /* ---- Description (lore) d'une créature du catalogue, lecture seule ---- */
  _creatureLoreSection(pnj) {
    if (pnj.type !== "creature" || !pnj.lore) return "";
    return `<div class="card-section flavor-section">
      <div class="card-section-label">Description</div>
      <div style="font-size:0.75rem;">${this._esc(pnj.lore)}</div>
    </div>`;
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

  /* ---- Réserves de dés utiles au MJ ---- */
  _gmPoolRow(label, value, title) {
    if (value == null) return "";
    const n = Number(value);
    const rollAttrs =
      Number.isFinite(n) && n >= 1
        ? ` data-roll="${n}" data-roll-label="${this._esc(label)}"`
        : "";
    const rollableCls = Number.isFinite(n) && n >= 1 ? " rollable" : "";
    return `<span class="stat-pill gm-pool${rollableCls}" title="${this._esc(title)}"${rollAttrs}>${label}&nbsp;<strong>${value}</strong></span>`;
  },

  /* ========================================================
     Cartes organisées par usage de jeu : zone Combat (mise en
     avant) / Capacités / Référence (repliable). Préférences :
     défaut global (Réglages) + surcharge par carte (état de repli
     mémorisé sur pnj._refOpen). Corps par édition dans les
     fichiers cardrenderer.sr5/sr6/anarchy.js.
     ======================================================== */

  /** Préférences d'affichage, avec défaut ADAPTATIF (CH-C1).
      Le « compact » = référence repliée (layout) : attributs, réserves MJ et
      équipement vivent DANS la zone Référence repliable (cf.
      cardrenderer.sr5/sr6/anarchy.js), dont .ref-toggle reste l'affordance
      d'expansion permanente. On garde donc show* à true — replier par défaut
      ne doit pas vider l'expansion. */
  _displayPrefs(deps) {
    const S = deps.Settings;
    const shows = { showGmPools: true, showAttributes: true, showEquipment: true };
    if (!S || !S.getCardDisplay) return { layout: "expanded", ...shows };
    // Réglage manuel prioritaire : au premier réglage, Settings.setCardDisplay
    // persiste l'objet complet. La présence de ce blob = « l'utilisateur a
    // choisi » → on respecte son choix tel quel, sans le surcharger.
    const configured =
      typeof Storage !== "undefined" &&
      Storage.getGlobal &&
      S._CARD_KEY &&
      Storage.getGlobal(S._CARD_KEY, null) != null;
    if (configured) return S.getCardDisplay();
    // Sinon, une seule base responsive à défaut adaptatif : carte compacte
    // (référence repliée) sur tablette/mobile (≤ 1024px), dépliée sur desktop.
    const compact =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1024px)").matches;
    return { layout: compact ? "compact" : "expanded", ...shows };
  },

  /** La référence est-elle ouverte pour cette carte ? */
  _refIsOpen(pnj, deps = CardRenderer.liveDeps()) {
    if (pnj._refOpen === true || pnj._refOpen === false) return pnj._refOpen;
    return this._displayPrefs(deps).layout === "expanded";
  },

  /** Pastille de réserve lançable (Défense, Encaissement…). */
  _rollPill(label, value, title) {
    if (value == null) return "";
    return `<span class="stat-pill rollable combat-pill" data-roll="${value}" data-roll-label="${this._esc(label)}" title="${this._esc(title || label)}">${this._esc(label)} <strong>${value}</strong></span>`;
  },

  _zoneEyebrow(label) {
    return `<div class="zone-eyebrow">${this._esc(label)}</div>`;
  },

  /** Bloc d'armes lançables, sorti dans la zone Combat. */
  _weaponBlock(pnj, weapons, edition, deps) {
    if (!weapons.length) return "";
    const rows = weapons
      .map((w) => {
        const r = deps.WeaponRoll ? deps.WeaponRoll.resolvePool(pnj, w, edition) : null;
        const parsed = deps.WeaponRoll ? deps.WeaponRoll.parse(w) : { name: w };
        const name = parsed.name || w;
        const stat = String(w).includes("[")
          ? String(w).split("[")[1].replace("]", "").replace(/,\s*/g, " · ")
          : "";
        if (!r) {
          return `<div class="weapon-line"><div><div class="weapon-name">${this._esc(name)}</div><div class="weapon-stat">${this._esc(stat)}</div></div></div>`;
        }
        const approxTxt = r.approx ? " ~" : "";
        const smartTxt = r.smartBonus ? ` · +${r.smartBonus} smartlink` : "";
        const title = `${r.weaponName} : ${r.pool} dés (${r.matchedSkill || r.skill}${approxTxt} ${r.skillVal} + ${r.attr} ${r.attrVal})${r.limit != null ? ` · limite ${r.limit}` : ""}${smartTxt}`;
        const poolBadge = `<span class="weapon-pool">⚄${r.pool}${r.limit != null ? `<span class="lim">▸${r.limit}</span>` : ""}${r.rr ? `<span class="lim">RR${r.rr}</span>` : ""}${r.smartBonus ? `<span class="lim">SL+${r.smartBonus}</span>` : ""}</span>`;
        const dataAttr =
          App.getEditionModule(edition)?.usesRiskPanel
            ? `data-roll-weapon-anarchy="${this._esc(name)}"`
            : `data-roll-weapon="${this._esc(w)}" data-roll-edition="${edition}"`;
        return `<div class="weapon-line weapon-rollable rollable" ${dataAttr} data-roll-pnj="${pnj.id}" title="${this._esc(title)}">
          <div><div class="weapon-name">${this._esc(name)}</div><div class="weapon-stat">${this._esc(stat)}</div></div>
          ${poolBadge}
        </div>`;
      })
      .join("");
    return `<div class="weapon-block">${rows}</div>`;
  },

  _refToggle(pnj, summary) {
    return `<button class="ref-toggle" data-ref-toggle="${pnj.id}">
      <span>${this._esc(summary)}</span>
      <span class="chev">▾</span>
    </button>`;
  },

  /* ---- Helpers ---- */
  _initPill(base, dice, pnj, attrDetail = "") {
    const b = Number(base) || 0;
    const d = Number(dice) || 1;
    const id = pnj && pnj.id ? pnj.id : "";
    const li = pnj && pnj.lastInit ? pnj.lastInit : null;

    // Résultat lancé affiché à la suite, avec bouton d'effacement.
    let resultHtml = "";
    if (li && Number.isFinite(li.total)) {
      const detail = `${li.base} + [${(li.faces || []).join(", ")}]`;
      resultHtml =
        ` <span class="init-result" title="${this._esc(li.total + " = " + detail)}">` +
        `→ <strong>${li.total}</strong>` +
        `<span class="init-clear" data-init-clear="${id}" role="button" title="Effacer l'initiative">✕</span>` +
        `</span>`;
    }

    const baseTxt = attrDetail ? `${attrDetail} (${b})` : b;
    const detailAttr = attrDetail
      ? ` data-roll-init-detail="${this._esc(attrDetail)}"`
      : "";
    return `<span class="stat-pill accent rollable init-pill" data-roll-init="${b}" data-roll-init-dice="${d}" data-roll-pnj="${id}"${detailAttr} title="Lancer l'initiative : ${baseTxt} + ${d}D6">Init <strong>${b}+${d}D6</strong>${resultHtml}</span>`;
  },

  _attrCell(label, value, extraClass = "", opts = {}) {
    const n = Number(value);
    const rollable = opts.roll && Number.isFinite(n) && n >= 1;
    const edAttr = opts.edition ? ` data-roll-edition="${opts.edition}"` : "";
    const rollAttrs = rollable
      ? ` data-roll="${n}" data-roll-label="${this._esc(label)}"${edAttr} data-roll-rr="0" title="Lancer ${n} dés — ${this._esc(label)}"`
      : "";
    const cls = `attr-cell ${extraClass} ${rollable ? "rollable" : ""}`.trim();
    return `<div class="${cls}"${rollAttrs}>
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
      return `<div class="${cls}" data-action="toggle-monitor" data-id="${pnjId}" data-sev="${type}" data-idx="${i}"></div>`;
    }).join("");
  },

  /**
   * @param {Object} [opts]
   * @param {string} [opts.label] - libellé de section (ex. "Connaissances")
   * @param {string} [opts.extraClass] - classe CSS ajoutée aux tags, pour
   *   distinguer visuellement une variante (ex. connaissances SR5 vs
   *   compétences actives — même mécanique de lancer de dés).
   */
  /** Rend un tag de compétence/connaissance : <button> quand il est lançable
      (focus + activation Entrée/Espace NATIFS → la délégation click de
      diceroller.js:96 fait le jet, on ne la redouble pas), sinon <span>.
      L'affordance visible au repos (dé ⚄ + bordure) vit dans base.css. */
  _rollableTag(rollable, cls, attrs, inner) {
    return rollable
      ? `<button type="button" class="${cls}"${attrs}>${inner}</button>`
      : `<span class="${cls}"${attrs}>${inner}</span>`;
  },

  _skillsSection(skills, malus = 0, opts = {}) {
    if (!skills || !skills.length) return "";
    const { label = "Compétences", extraClass = "" } = opts;
    const malusTxt = malus > 0 ? ` (malus blessure −${malus})` : "";
    const tags = skills
      .map((s) => {
        const n = Number(s.val);
        const eff = Number.isFinite(n) ? Math.max(0, n - malus) : n;
        const rollable = Number.isFinite(eff) && eff >= 1;
        const rollAttrs = rollable
          ? ` data-roll="${eff}" data-roll-label="${this._esc(s.name)}" title="Lancer ${eff} dés — ${this._esc(s.name)}${malusTxt}"`
          : "";
        let html = this._rollableTag(
          rollable,
          `tag skill-tag${extraClass}${rollable ? " rollable" : ""}`,
          rollAttrs,
          `${this._esc(s.name)}&nbsp;<strong style="color:var(--text)">${eff}</strong>`,
        );
        if (s.spec && s.spec !== true) {
          // Spécialité : +2 dés sur le pool en SR5/SR6.
          const specN = Number.isFinite(n) ? Math.max(0, n + 2 - malus) : null;
          const specRollable = !!(specN && specN >= 1);
          const specRoll = specRollable
            ? ` data-roll="${specN}" data-roll-label="${this._esc(s.name)} · ${this._esc(s.spec)}" title="Spécialité ${this._esc(s.spec)} : ${specN} dés (+2)${malusTxt}"`
            : ` title="Spécialité ${this._esc(s.spec)} : +2 dés${malusTxt}"`;
          html += this._rollableTag(
            specRollable,
            `tag skill-tag skill-tag-spec${specRollable ? " rollable" : ""}`,
            specRoll,
            `◊&nbsp;${this._esc(s.spec)}`,
          );
        }
        return html;
      })
      .join("");
    return `<div class="card-section">
      <div class="card-section-label">${label}${malus > 0 ? ` <span class="wound-malus-badge" title="Malus de blessure automatique">−${malus}D</span>` : ""}</div>
      <div class="card-section-content">
        ${tags}
      </div>
    </div>`;
  },

  /**
   * Connaissances SR5 (Livre de Règles p.148-152) — un test de
   * connaissance = valeur de connaissance + attribut lié (Logique pour
   * l'académique/professionnel, Intuition pour la rue/les centres
   * d'intérêt). On affiche donc le POOL (comme les réserves MJ), avec le
   * détail « Attribut + Connaissance », et un tag visuellement distinct.
   * @param {Array} knowledges
   * @param {Object} pnj - pour lire l'attribut lié sur pnj.attrs
   * @param {number} malus - malus de blessure
   */
  _knowledgesSection(knowledges, pnj, malus = 0) {
    if (!knowledges || !knowledges.length) return "";
    const attrs = (pnj && pnj.attrs) || {};
    const tags = knowledges
      .map((k) => {
        const rating = Number(k.val);
        const attr = SkillCatalog.attrFor("sr5", k.name); // LOG | INT | null
        const attrVal = attr && Number.isFinite(attrs[attr]) ? attrs[attr] : 0;
        const pool = Number.isFinite(rating)
          ? Math.max(0, rating + attrVal - malus)
          : rating;
        const attrLabel = attr ? Utils.attrFullName(attr) : "";
        const detail = attr
          ? `${attrLabel} ${attrVal} + ${k.name} ${rating}`
          : "";
        const rollable = Number.isFinite(pool) && pool >= 1;
        const rollAttrs = rollable
          ? ` data-roll="${pool}" data-roll-label="${this._esc(k.name)}" data-roll-detail="${this._esc(detail)}" title="Test de connaissance : ${this._esc(detail)}"`
          : "";
        return this._rollableTag(
          rollable,
          `tag skill-tag skill-tag-knowledge${rollable ? " rollable" : ""}`,
          rollAttrs,
          `${this._esc(k.name)}&nbsp;<strong style="color:var(--text)">${pool}</strong>`,
        );
      })
      .join("");
    return `<div class="card-section">
      <div class="card-section-label">Connaissances</div>
      <div class="card-section-content">
        ${tags}
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

  /** Infos rapides d'un sort, affichées sous son nom (façon `weapon-stat`) :
      code/valeur de Drain (SR5/SR6) ou seuil (Anarchy), puis catégorie. */
  _spellInfo(sp) {
    if (!sp || typeof sp !== "object") return "";
    const bits = [];
    if (sp.drain != null) bits.push(`Drain ${sp.drain}`);
    else if (sp.seuil != null) bits.push(`Seuil ${sp.seuil}`);
    if (sp.cat) bits.push(sp.cat);
    return bits.join(" · ");
  },

  /** Bloc de sorts lançables (CH-M7e), en zone Combat — rendu façon armes
      (`.weapon-line` : nom + infos rapides + pastille de réserve, clic pour
      lancer). Le dernier jet (succès) est mémorisé sur `sp._lastCast` et
      présenté sur la ligne (utile pour un sort maintenu ; ✕ pour effacer).
      Éditions à VD (SR5/SR6/Anarchy1) : clic → `data-cast-spell` (MagicAction).
      Anarchy 2 (option `opts.viaRisk`) : clic → jet de risque Sorcellerie
      (`data-roll`), le Drain étant géré par complication (CH-M7d). */
  _spellsBlock(pnj, spells, edition, opts = {}) {
    if (!spells || !spells.length) return "";
    const ed = App.getEditionModule(edition);
    const canCast = ed.spellSkill && pnj.drainResist != null;
    const rows = spells
      .map((sp) => {
        const name = (sp && sp.name) || String(sp);
        const info = this._spellInfo(sp);
        const infoBtn =
          sp && sp.desc
            ? `<span class="spell-info" role="button" tabindex="0" data-content-name="${this._esc(name)}" data-content-desc="${this._esc(sp.desc)}" title="Détails du sort">ⓘ</span>`
            : "";
        const last = sp && sp._lastCast;
        const lastHtml = last
          ? `<span class="spell-last" title="Dernier jet : ${last.hits} succès (suivi d'un sort maintenu)">→ <strong>${last.hits}</strong><span class="spell-last-clear" data-spell-clear="${this._esc(name)}" data-roll-pnj="${pnj.id}" role="button" title="Effacer le dernier jet">✕</span></span>`
          : "";

        let castAttr = "";
        let poolBadge = "";
        if (opts.viaRisk) {
          // Anarchy 2 : lance via la compétence Sorcellerie (jet de risque).
          const pool = opts.riskPool || 0;
          castAttr = `data-roll="${pool}" data-roll-label="Sorcellerie · ${this._esc(name)}" data-roll-edition="${edition}" data-roll-rr="${opts.riskRR || 0}" data-roll-spell="${this._esc(name)}"`;
          poolBadge = pool ? `<span class="weapon-pool">⚄${pool}</span>` : "";
        } else if (canCast) {
          castAttr = `data-cast-spell="${this._esc(name)}"`;
          const pool = Magic.actionPool(pnj, ed.spellSkill, edition);
          poolBadge = pool ? `<span class="weapon-pool">⚄${pool}</span>` : "";
        }
        const rollable = !!castAttr;
        const lineCls = `weapon-line spell-line${rollable ? " weapon-rollable rollable" : ""}`;
        return `<div class="${lineCls}" ${castAttr} data-roll-pnj="${pnj.id}">
          <div class="spell-main">
            <div class="weapon-name">${this._esc(name)} ${infoBtn}</div>
            ${info ? `<div class="weapon-stat">${this._esc(info)}</div>` : ""}
          </div>
          ${poolBadge}
          ${lastHtml}
        </div>`;
      })
      .join("");
    return `<div class="weapon-block spell-block">
      <div class="zone-eyebrow">Sorts</div>
      ${rows}
    </div>`;
  },

  /* Rend un élément de contenu : objet {nom, desc} -> tag cliquable
     ouvrant une modale ; chaîne simple -> tag normal. Pour les sorts, un
     champ drain (SR5/SR6) ou niveau (Anarchy) est affiché dans le libellé. */
  /* Libellé court d'un bonus de trait (voir BonusEngine / content.js). */
  _bonusLabel(bonus) {
    if (!bonus) return "";
    if (bonus.initDice) return `+${bonus.initDice} Init`;
    if (bonus.stat) {
      const labels = { composure: "Sang-froid", memory: "Mémoire" };
      return `+${bonus.val} ${labels[bonus.stat] || bonus.stat}`;
    }
    if (bonus.attr) return `+${bonus.val} ${bonus.attr}`;
    if (bonus.skill) return `+${bonus.val} ${bonus.skill}`;
    return "";
  },

  _contentTag(item) {
    if (item && typeof item === "object" && item.name) {
      const name = this._esc(item.name);
      // Suffixe Drain (SR5/SR6) ou Seuil (Anarchy 2.0) pour les sorts.
      let suffix = "";
      if (item.drain != null) {
        suffix = ` <span class="tag-stat">(Drain ${this._esc(item.drain)})</span>`;
      } else if (item.seuil != null) {
        suffix = ` <span class="tag-stat">(Seuil ${this._esc(item.seuil)})</span>`;
      } else if (item.bonus) {
        const label = this._bonusLabel(item.bonus);
        if (label) suffix = ` <span class="tag-stat">(${this._esc(label)})</span>`;
      }
      if (item.desc) {
        // _esc échappe " donc le contenu est sûr dans un attribut entre guillemets.
        // Pas de onclick inline : on stocke nom/desc en data-* et on délègue
        // le clic/clavier (voir ContentModal.bindDelegation), ce qui évite tout
        // problème d'apostrophes ou de guillemets dans le texte.
        const desc = this._esc(item.desc);
        const t = this._esc(item.name);
        return `<span class="tag tag-clickable" role="button" tabindex="0"
          data-content-name="${t}" data-content-desc="${desc}"
          >${name}${suffix}<span class="tag-info">i</span></span>`;
      }
      return `<span class="tag">${name}${suffix}</span>`;
    }
    return `<span class="tag">${this._esc(item)}</span>`;
  },

  _tagsSection(label, items) {
    return this._listSection(label, items);
  },

  /** Tag cliquable d'une drogue détectée : cycle à 3 clics idle → effet →
      contrecoup → idle (OK), cf. js/drugs.js. */
  _drugTag(pnj, edition, drug, rawLabel, deps) {
    const state = deps.Drugs.state(pnj, drug.id);
    const next = deps.Drugs.next(state);
    const nextLabel = { effect: "Effet", sideEffect: "Contrecoup", idle: "OK" }[next];
    const info =
      state === "idle"
        ? `${drug.effect.text} → ${drug.sideEffect.text}`
        : state === "effect"
          ? drug.effect.text
          : drug.sideEffect.text;
    const stateClass =
      state === "effect" ? " drug-effect" : state === "sideEffect" ? " drug-side" : "";
    return `<span class="tag drug-tag${stateClass}" role="button" tabindex="0"
      data-action="cycle-drug" data-id="${pnj.id}" data-edition="${edition}" data-drug="${drug.id}"
      title="${this._esc(info)}">${this._esc(rawLabel)}<span class="drug-next">${nextLabel}</span></span>`;
  },

  /** Ligne compacte, toujours visible dans la zone Combat (pas besoin de
      déplier la Référence), listant les drogues détectées dans
      l'équipement (SR5/SR6) et les atouts (Anarchy). */
  _drugRow(pnj, edition, deps) {
    if (!deps.Drugs) return "";
    const found = [];
    for (const i of pnj.equip || []) {
      const drug = deps.Drugs.matchItem(i, edition, "equip");
      if (drug) found.push(this._drugTag(pnj, edition, drug, i, deps));
    }
    if (App.getEditionModule(edition).hasEdges) {
      for (const a of pnj.edges || []) {
        const drug = deps.Drugs.matchItem(a, edition, "edges");
        if (drug) found.push(this._drugTag(pnj, edition, drug, a, deps));
      }
    }
    if (!found.length) return "";
    return `<div class="combat-drugs">${found.join("")}</div>`;
  },

  /** Section Équipement où les weapons (VD/PRE) deviennent lançables. */
  _equipSection(pnj, items, edition, deps) {
    if (!items || !items.length) return "";
    const tags = items
      .map((i) => {
        // Les drogues sont pilotées depuis leur tag dans la zone Combat
        // (this._drugRow) — ici, texte simple pour éviter le doublon.
        if (deps.Drugs && deps.Drugs.matchItem(i, edition, "equip"))
          return this._contentTag(i);
        const isWeapon =
          typeof i === "string" && /\[/.test(i) && /(VD|PRE)/.test(i);
        if (!isWeapon) return this._contentTag(i);
        const r = deps.WeaponRoll ? deps.WeaponRoll.resolvePool(pnj, i, edition) : null;
        if (!r) return this._contentTag(i);
        const limTxt = r.limit != null ? ` · lim ${r.limit}` : "";
        const approxTxt = r.approx ? " ~" : "";
        const smartTxt = r.smartBonus ? ` · +${r.smartBonus} smartlink` : "";
        const title = `${r.weaponName} : ${r.pool} dés (${r.matchedSkill || r.skill}${approxTxt} ${r.skillVal} + ${r.attr} ${r.attrVal})${limTxt}${smartTxt} — cliquer pour lancer`;
        return `<span class="tag weapon-rollable rollable" data-roll-weapon="${this._esc(i)}" data-roll-pnj="${pnj.id}" data-roll-edition="${edition}" title="${this._esc(title)}">${this._esc(i)}<span class="weapon-pool">⚄${r.pool}${r.limit != null ? `<span class="weapon-lim">▸${r.limit}</span>` : ""}</span></span>`;
      })
      .join("");
    return `<div class="card-section">
      <div class="card-section-label">Équipement</div>
      <div class="card-section-content">${tags}</div>
    </div>`;
  },

  _esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  /** Bouton "Portrait IA", affiché seulement si le réglage opt-in est
      actif et qu'aucun portrait n'existe encore (véhicules exclus — hors
      scope de la fonctionnalité). */
  _portraitFooterBtn(pnj, deps) {
    if (pnj.type === "vehicle" || pnj.portraitUrl) return "";
    if (!deps.Settings || !deps.Settings.getPortraitSettings().enabled) return "";
    return `<button class="card-action-btn ghost" data-action="generate-portrait" data-id="${pnj.id}">Portrait IA</button>`;
  },

  /* ---- Footer ---- */
  _footer(pnj, actions, deps = CardRenderer.liveDeps()) {
    if (pnj.type === "vehicle") {
      return `<div class="pnj-card-footer" data-saved-actions='${JSON.stringify(actions)}'>
        <button class="card-action-btn ghost" data-action="edit-open" data-id="${pnj.id}">Éditer</button>
        <button class="card-action-btn danger" data-action="dismiss-vehicle" data-id="${pnj.id}">Ranger</button>
      </div>`;
    }
    // Esprit invoqué : Congédier. Esprit libre : boutons standards
    // (sauvegarder/virer) comme tout PNJ généré.
    if (pnj.type === "spirit" && pnj.ownerId) {
      return `<div class="pnj-card-footer" data-saved-actions='${JSON.stringify(actions)}'>
        ${this._portraitFooterBtn(pnj, deps)}
        <button class="card-action-btn ghost" data-action="edit-open" data-id="${pnj.id}">Éditer</button>
        <button class="card-action-btn danger" data-action="dismiss-spirit" data-id="${pnj.id}">Congédier</button>
      </div>`;
    }
    const btns = [this._portraitFooterBtn(pnj, deps)];
    if (actions.includes("saved")) {
      // Carte du générateur après sauvegarde dans les Ombres.
      btns.push(`<span class="card-saved-label">✓ Sauvegardé</span>`);
    }
    if (actions.includes("save")) {
      btns.push(
        `<button class="card-action-btn save" data-action="save-pnj" data-id="${pnj.id}">Sauvegarder</button>`,
      );
    }
    if (actions.includes("edit")) {
      btns.push(
        `<button class="card-action-btn ghost" data-action="edit-open" data-id="${pnj.id}">Éditer</button>`,
      );
    }
    if (actions.includes("discard")) {
      btns.push(
        `<button class="card-action-btn danger" data-action="discard" data-id="${pnj.id}">Virer</button>`,
      );
    }
    if (actions.includes("remove")) {
      btns.push(
        `<button class="card-action-btn ghost" data-action="duplicate-pnj" data-id="${pnj.id}">Dupliquer</button>`,
      );
      btns.push(
        `<button class="card-action-btn danger" data-action="remove-pnj" data-id="${pnj.id}">Supprimer</button>`,
      );
    }
    if (actions.includes("remove-pj")) {
      btns.push(
        `<button class="card-action-btn danger" data-action="remove-pj" data-id="${pnj.id}">Supprimer</button>`,
      );
    }
    btns.push(
      `<button class="card-action-btn ghost" data-action="add-to-encounter" data-id="${pnj.id}" title="Ajouter au suivi de combat">⚔ Combat</button>`,
    );
    // Export Foundry VTT : affiché uniquement si l'édition active en expose
    // la capacité (SR5, Anarchy2...). Lecture neutre du module d'édition,
    // jamais de branche `App.edition === …` (prohibition #1).
    if (App.getEditionModule(pnj.edition)?.foundryExport) {
      btns.push(
        `<button class="card-action-btn ghost" data-action="export-foundry" data-id="${pnj.id}" title="Exporter vers Foundry VTT (télécharge un fichier JSON)">⬗ Foundry</button>`,
      );
    }
    return `<div class="pnj-card-footer" data-saved-actions='${JSON.stringify(actions)}'>${btns.join("")}</div>`;
  },

  _delegated: false,
  bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;
    document.addEventListener("click", (e) => {
      const actionEl = e.target.closest("[data-action]");
      if (!actionEl) return;
      const id = actionEl.dataset.id;
      switch (actionEl.dataset.action) {
        case "focus-owner":
          UI.focusOwner(id);
          break;
        case "deploy-vehicle":
          UI.deployVehicle(id, Number(actionEl.dataset.idx));
          break;
        case "toggle-service":
          UI.toggleService(id, Number(actionEl.dataset.idx));
          break;
        case "toggle-armor":
          UI.toggleArmorOption(id, Number(actionEl.dataset.idx));
          break;
        case "open-summon":
          UI.openSummonPanel(id);
          break;
        case "toggle-monitor":
          UI.toggleMonitor(id, actionEl.dataset.sev, Number(actionEl.dataset.idx));
          break;
        case "cycle-drug":
          UI.cycleDrug(id, actionEl.dataset.edition, actionEl.dataset.drug);
          break;
        case "generate-portrait":
          Portrait.generateForPnj(id, actionEl);
          break;
        case "edit-open":
          EditModal.open(id);
          break;
        case "dismiss-vehicle":
          UI.dismissVehicle(id);
          break;
        case "dismiss-spirit":
          UI.dismissSpirit(id);
          break;
        case "save-pnj":
          Shadows.savePNJ(id);
          break;
        case "remove-pnj":
          Shadows.removePNJ(id);
          break;
        case "duplicate-pnj":
          Shadows.duplicatePNJ(id);
          break;
        case "remove-pj":
          Characters.removePJ(id);
          break;
        case "add-to-encounter":
          Encounter.add(id);
          break;
        case "export-foundry":
          FoundryExport.exportPnj(id);
          break;
      }
    });
  },
};
