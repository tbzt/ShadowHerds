"use strict";

/* ============================================================
   CHARGEN — assistant de création de personnage jouable (PJ)
   ------------------------------------------------------------
   Édition-agnostique : lit App.editionModule.creation. Aucune
   branche `App.edition === …` ni catalogue d'édition nommé ici.

   Le fichier se DISAIT agnostique de longue date, mais tenait en
   dur la forme d'Anarchy 2 : la liste des étapes (dont « Narratif »,
   qui n'existe que là), la barre de budget libellée en ¥ et ses
   trois cellules, les cinq attributs `["FOR","AGI","VOL","LOG",
   "CHA"]`, la liste des éveils, la forme du brouillon. Le motif du
   CONTRIBUTING § « Concevoir un écran », mais à l'envers : pas un
   contrat qui aplatit, un consommateur qui détient le savoir
   d'édition. C'est rendu au module depuis 2026-09-09, via :

     creation.steps          — les étapes {id, kind, label}
     creation.newBuild()     — le brouillon vierge
     creation.conceptFields()— les champs du concept, déclarés
     creation.budget()       — jauge + cellules, dans SON unité
     creation.attrsStep()    — les attributs, en groupes
     creation.attrRangeFor() — les bornes, pour le clamp

   Le `kind` d'une étape choisit son renderer (`_render_<kind>`).
   Deux éditions ne partagent un kind que si elles partagent
   vraiment la forme de l'écran : les compétences Anarchy (un pool,
   un plafond d'indice) et SR5 (deux pools, individuel/groupe) sont
   deux formes — donc `skills_pool` et un futur `skills_priority`,
   pas un renderer à options qui mentirait sur leur parenté.

   Toute la composition/lecture du brouillon passe par `data-cg`
   (liaison scalaire générique) et `data-cg-action` (mutations de
   listes), délégation scopée à #chargen-overlay — même esprit que
   le pattern ContentModal/Collection, pas de onclick inline.
   ============================================================ */
import { CardRenderer } from "../widgets/card/cardrenderer.js";
import { Characters } from "./characters.js";
import { ContactsBook } from "./contactsbook.js";
import { Dialog } from "../widgets/kit/dialog.js";
import { FocusTrap } from "../widgets/kit/focustrap.js";
import { Storage } from "../core/storage.js";
import { Utils } from "../core/utils.js";

export const CharGen = {
  _DRAFT_KEY: "chargen_draft",

  _step: 0,
  _build: null,
  _releaseTrap: null,

  _creation() {
    return App.editionModule && App.editionModule.creation;
  },

  /** Les étapes viennent du module (`creation.steps`), plus d'une constante
      ici : la liste était celle d'Anarchy 2 — « Narratif » (mots-clés,
      comportements, citations) n'existe que là. Chaque entrée porte un `id`
      (clé de stepErrors) et un `kind` (choix du renderer). */
  _steps() {
    const c = this._creation();
    if (!c || !c.steps) return [];
    // SR5 fait dépendre ses étapes de la méthode choisie (la grille de
    // priorités n'existe pas en création par Karma) : `steps` accepte donc
    // les deux formes, tableau figé ou fonction du brouillon.
    return typeof c.steps === "function" ? c.steps.call(c, this._build) : c.steps;
  },

  _stepAt(i) {
    return this._steps()[i] || null;
  },

  _esc(s) {
    return CardRenderer._esc(s);
  },

  /* ---- Ouverture / fermeture ---- */
  open() {
    const creation = this._creation();
    if (!creation) {
      toast("Création de personnage non disponible pour cette édition.");
      return;
    }
    const draft = this._loadDraft();
    this._resumed = !!draft;
    this._build = draft || creation.newBuild();
    this._build.skills = this._normalizeSkillSpecs(this._build.skills);
    this._step = 0;
    const overlay = document.getElementById("chargen-overlay");
    overlay.classList.add("open");
    // D7 : piégé AVANT le déplacement de focus (même ordre que Dialog._open).
    this._releaseTrap = FocusTrap.activate(overlay.querySelector(".modal"));
    overlay.querySelector(".modal-close").focus();
    this._renderAll();
  },

  /** Bandeau de reprise de brouillon (masquable, propose de repartir à zéro). */
  _resumeBanner() {
    if (!this._resumed) return "";
    return `<div class="cluster cg-resume-banner">
      <span>↺ Brouillon repris.</span>
      <button class="btn-secondary btn-small" data-cg-action="restart">Recommencer à zéro</button>
      <button class="btn-icon-tiny" data-cg-action="dismiss-resume" title="Masquer">✕</button>
    </div>`;
  },

  close() {
    document.getElementById("chargen-overlay").classList.remove("open");
    if (this._releaseTrap) {
      this._releaseTrap();
      this._releaseTrap = null;
    }
  },

  _saveDraft() {
    Storage.set(this._DRAFT_KEY, this._build);
  },
  _loadDraft() {
    return Storage.get(this._DRAFT_KEY, null);
  },
  _clearDraft() {
    Storage.remove(this._DRAFT_KEY);
  },

  /** Nettoyage du brouillon avant validation/enregistrement. Délégué au
      module : Anarchy y purge ses champs narratifs (mots-clés, comportements,
      citations — des chaînes), SR5 a des connaissances qui sont des objets
      `{name, val}`. Un `.trim()` générique planterait sur l'une des deux. */
  _cleanBuild(b) {
    const c = this._creation();
    return c.cleanBuild ? c.cleanBuild(b) : b;
  },

  /** Migre les compétences vers le modèle multi-spés `specs: string[]`
      (tolère l'ancienne forme scalaire `spec` des brouillons/presets). */
  _normalizeSkillSpecs(skills) {
    return (skills || []).map((s) => {
      const specs = s.specs || (s.spec ? [s.spec] : []);
      const { spec, ...rest } = s;
      return { ...rest, specs };
    });
  },

  _setPath(obj, path, val) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]];
      if (cur == null) return;
    }
    cur[parts[parts.length - 1]] = val;
  },

  /** Erreurs live de l'étape courante, rendues en tête de l'étape. */
  _stepErrorBox(step) {
    const errs = this._creation().stepErrors(this._build)[step] || [];
    if (!errs.length) return "";
    return `<div class="stack cg-step-errors">${errs
      .map((e) => `<div class="cg-error-text">⚠ ${this._esc(e)}</div>`)
      .join("")}</div>`;
  },

  /** Jauge « utilisé / offert par le kit » : ambre quand on paie au-delà
      (payer est légal en Anarchy), le rouge restant réservé aux vraies erreurs. */
  _kitMeter(used, free, label) {
    const over = used > free;
    const paid = over ? ` <span class="cg-kit-paid">+${used - free} payant</span>` : "";
    return `<span class="cg-kit-meter${over ? " over" : ""}">${label} : ${used}/${free}${paid}</span>`;
  },

  /* ---- Rendu ---- */
  _renderAll() {
    this._renderSteps();
    this._renderBudget();
    this._renderStep();
    this._renderFooter();
  },

  _renderSteps() {
    const el = document.getElementById("chargen-steps");
    if (!el) return;
    const stepErr = this._creation().stepErrors(this._build);
    el.innerHTML = this._steps().map((step, i) => {
      const hasErr = (stepErr[step.id] || []).length > 0;
      return `<button class="cg-step-tab${i === this._step ? " active" : ""}${hasErr ? " has-error" : ""}" data-cg-action="goto" data-idx="${i}" aria-current="${i === this._step ? "step" : "false"}">${i + 1}. ${this._esc(step.label)}${hasErr ? ' <span class="cg-tab-dot">●</span>' : ""}</button>`;
    }).join("");
  },

  /** Rend le budget tel que le module le décrit : une jauge de tête + des
      cellules de catégorie. Ne connaît plus ni le nuyen ni les trois
      catégories d'Anarchy — SR5 y passe des points de priorité, puis du
      karma, sans toucher à cette fonction. */
  _renderBudget() {
    const el = document.getElementById("chargen-budget");
    if (!el) return;
    const { headline, cells } = this._creation().budget(this._build);
    if (!headline) {
      el.innerHTML = "";
      return;
    }
    const pct = headline.total ? Math.min(100, Math.round((headline.used / headline.total) * 100)) : 0;
    let html = `<div class="cluster cg-budget-row">
      <span class="cg-budget-cell${headline.over ? " over" : ""}">${this._esc(headline.label)}</span>
      <div class="cg-budget-bar"><div class="cg-budget-fill${headline.over ? " over" : ""}" style="width:${pct}%"></div></div>
    </div>`;
    if (cells.length) {
      html += `<div class="cluster cg-budget-row cg-budget-cats">${cells
        .map(
          (c) =>
            // `total: null` = compteur sans plafond (« 3 modules »), pas un
            // budget : afficher « 3/null » serait pire que rien.
            `<span class="cg-budget-cell${c.total != null && c.used > c.total ? " over" : ""}">${this._esc(c.label)} ${c.used}${c.total != null ? `/${c.total}` : ""}</span>`,
        )
        .join("")}</div>`;
    }
    el.innerHTML = html;
  },

  _renderStep() {
    const step = this._stepAt(this._step);
    if (!step) return;
    const el = document.getElementById("chargen-body");
    if (!el) return;
    el.innerHTML = this._resumeBanner() + this[`_render_${step.kind}`].call(this);
    if (step.kind === "review") this._mountReview();
  },

  _renderFooter() {
    const el = document.getElementById("chargen-footer");
    if (!el) return;
    const isFirst = this._step === 0;
    const isLast = this._step === this._steps().length - 1;
    el.innerHTML = `
      <button class="btn-secondary" data-cg-action="discard">Abandonner</button>
      <button class="btn-secondary" data-cg-action="prev" ${isFirst ? "disabled" : ""}>← Précédent</button>
      ${isLast ? `<button class="btn-primary" data-cg-action="save">✓ Créer le personnage</button>` : `<button class="btn-primary" data-cg-action="next">Suivant →</button>`}
    `;
  },

  /* ---- Étape : Concept ---- */
  /** Concept : les champs sont DÉCLARÉS par le module (`conceptFields`), pas
      dessinés ici. Le contrôleur ne connaît plus « niveau de jeu », « table de
      points » ni la liste des éveils — tout ça était du savoir Anarchy 2
      logé dans le contrôleur. */
  _render_concept() {
    const c = this._creation();
    const b = this._build;
    const val = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), b);

    const field = (f) => {
      const cur = val(f.path);
      if (f.type === "checkbox") {
        return `<div class="stack cg-field"><label><input type="checkbox" data-cg="${f.path}" ${cur ? "checked" : ""}> ${this._esc(f.label)}</label></div>`;
      }
      if (f.type === "number") {
        return `<div class="stack cg-field"><label>${this._esc(f.label)}</label>
          <input type="number" min="${f.min ?? 0}" data-cg="${f.path}" value="${cur ?? 0}"></div>`;
      }
      if (f.type === "note") {
        return `<p class="cg-hint">${this._esc(f.label)}</p>`;
      }
      if (f.type === "text") {
        return `<div class="stack cg-field"><label>${this._esc(f.label)}</label>
          <input type="text" data-cg="${f.path}" data-cg-rerender="false" value="${this._esc(cur || "")}" placeholder="${this._esc(f.placeholder || "")}"></div>`;
      }
      const opts = (f.options || [])
        .map(
          (o) =>
            `<option value="${this._esc(o.value)}" ${String(cur ?? "") === String(o.value) ? "selected" : ""}>${this._esc(o.label)}</option>`,
        )
        .join("");
      return `<div class="stack cg-field"><label>${this._esc(f.label)}</label><select data-cg="${f.path}">${opts}</select></div>`;
    };

    const presetBtns = (c.presets || [])
      .map(
        (p) =>
          `<button class="btn-secondary btn-small cg-preset-btn" data-cg-action="apply-preset" data-id="${this._esc(p.id)}">${this._esc(p.label)}</button>`,
      )
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("concept")}
      ${presetBtns ? `<div class="stack stack--tight">
        <span class="cg-section-label">Démarrage rapide</span>
        <div class="cg-preset-btns">${presetBtns}</div>
      </div>` : ""}
      ${c.conceptFields(b).map(field).join("")}
    </div>`;
  },

  /** Attributs : la liste vient du module (`attrsStep`), en GROUPES — SR5 en
      a deux (attributs, puis attributs spéciaux Chance/Magie/Résonance, qui
      ont leur propre réserve). Le littéral `["FOR","AGI","VOL","LOG","CHA"]`
      qui vivait ici ne décrivait qu'Anarchy 2. */
  _render_attrs() {
    const b = this._build;
    const { hint, groups, footer } = this._creation().attrsStep(b);

    const row = (spec) => {
      const path = spec.path || `attrs.${spec.key}`;
      const val = path.split(".").reduce((o, k) => (o == null ? o : o[k]), b) || 0;
      const atMax = val >= spec.max;
      const outOfRange = val < spec.min || val > spec.max;
      return `<div class="cluster cg-attr-row">
        <span class="cg-attr-label">${this._esc(spec.key)}</span>
        <div class="cg-stepper">
          <button class="cg-step-btn" data-cg-action="attr-dec" data-key="${this._esc(spec.key)}" data-path="${this._esc(path)}" ${val <= spec.min ? "disabled" : ""} aria-label="Diminuer ${this._esc(spec.key)}">−</button>
          <input type="number" min="${spec.min}" max="${spec.max}" data-cg="${this._esc(path)}" value="${val}">
          <button class="cg-step-btn" data-cg-action="attr-inc" data-key="${this._esc(spec.key)}" data-path="${this._esc(path)}" ${val >= spec.max ? "disabled" : ""} aria-label="Augmenter ${this._esc(spec.key)}">＋</button>
        </div>
        <span class="cg-attr-range">(${spec.min}–${spec.max})</span>
        ${atMax ? '<span class="tag">au max</span>' : ""}
        ${spec.note ? `<span class="cg-attr-note">${this._esc(spec.note)}</span>` : ""}
        ${outOfRange ? '<span class="cg-error-text">hors bornes</span>' : ""}
      </div>`;
    };

    const groupHtml = groups
      .map((g) => {
        const head = g.label
          ? `<div class="cg-section-label">${this._esc(g.label)}${
              g.total != null ? ` <span class="cg-section-note">${g.used}/${g.total}</span>` : ""
            }</div>`
          : "";
        return head + g.specs.map(row).join("");
      })
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("attrs")}
      ${hint ? `<p class="cg-hint">${this._esc(hint)}</p>` : ""}
      ${groupHtml}
      ${footer ? `<p class="cg-hint">${footer}</p>` : ""}
    </div>`;
  },

  _render_skills_pool() {
    const c = this._creation();
    const b = this._build;
    const level = c.gameLevels[b.gameLevel];
    const table = c.pointTables[b.gameLevel][b.archetypeTable];
    const usedNames = new Set(b.skills.map((s) => s.name));
    const available = c.skills.filter((s) => !usedNames.has(s.name) && (!s.awakenedOnly || b.awakened));
    const skillPts = c.skillPointsUsed(b);
    const atCapCount = b.skills.filter((s) => (s.val || 0) >= level.skillMax).length;

    const rows = b.skills
      .map((s, i) => {
        const def = c.skills.find((d) => d.name === s.name);
        const specs = s.specs || [];
        const overCap = (s.val || 0) > level.skillMax;
        const attrKey = s.attr || def?.attr || "LOG";
        const attrVal = b.attrs[attrKey] || 0;
        const pool = (s.val || 0) + attrVal;
        const poolChip = `<span class="cg-pool" title="Pool = ${s.val || 0} (${this._esc(s.name)}) + ${attrVal} (${attrKey})">⚄ ${pool}</span>`;
        // Une puce lançable par spécialisation (indice+2), retirable.
        const specChips = specs
          .map(
            (sp) =>
              `<span class="cg-spec-chip" title="Spécialisation ${this._esc(sp)} : ${(s.val || 0) + 2} + ${attrVal} (${attrKey})">◊ ${this._esc(sp)} <strong>${(s.val || 0) + 2 + attrVal}</strong><button class="cg-spec-x" data-cg-action="remove-spec" data-idx="${i}" data-spec="${this._esc(sp)}" title="Retirer la spécialisation">✕</button></span>`,
          )
          .join("");
        const remaining = (def?.specs || []).filter((sp) => !specs.includes(sp));
        const canAddSpec = (s.val || 0) >= 1 && remaining.length > 0;
        const addSpec = remaining.length
          ? `<span class="cg-spec-add">
              <select id="cg-skill-spec-pick-${i}">${remaining.map((sp) => `<option value="${this._esc(sp)}">${this._esc(sp)}</option>`).join("")}</select>
              <button class="btn-icon-tiny" data-cg-action="add-spec" data-idx="${i}" ${canAddSpec ? "" : "disabled"} title="${canAddSpec ? "Ajouter une spécialisation (2 500 ¥)" : "Indice ≥ 1 requis"}">＋ spé</button>
            </span>`
          : "";
        return `<div class="cluster cg-list-row cg-skill-row">
          <strong>${this._esc(s.name)}</strong>
          <input type="number" min="0" max="${level.skillMax}" data-cg="skills.${i}.val" value="${s.val || 0}" style="width:3.5em">
          ${poolChip}
          ${overCap ? '<span class="cg-error-text">&gt; plafond</span>' : ""}
          <button class="btn-icon-tiny danger" data-cg-action="remove-skill" data-idx="${i}" title="Retirer">✕</button>
          <div class="cluster cg-spec-line">${specChips}${addSpec}</div>
        </div>`;
      })
      .join("");

    const addOpts = available.map((s) => `<option value="${this._esc(s.name)}">${this._esc(s.name)} (${s.attr})</option>`).join("");
    const capNote =
      table.skillsAtCap != null
        ? ` · <span class="${atCapCount > table.skillsAtCap ? "cg-error-text" : ""}">au plafond ${level.skillMax} : ${atCapCount} / ${table.skillsAtCap}</span>`
        : "";

    // Connaissances (p.85) : 2 500 ¥ = 1 point de compétence chacune.
    const knowledges = b.knowledges || [];
    const knowledgeRows = knowledges
      .map(
        (k, i) =>
          `<div class="cluster cg-list-row"><span>${this._esc(k)}</span><button class="btn-icon-tiny danger" data-cg-action="remove-knowledge" data-idx="${i}" title="Retirer">✕</button></div>`,
      )
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("skills")}
      <p class="cg-hint">Table : ${table.skillPoints} points de compétences (spés et connaissances comprises). Plafond d'indice : ${level.skillMax}. ⚄ = pool de dés (indice + attribut). Plusieurs spés possibles par compétence (indice ≥ 1, sans limite de nombre).</p>
      ${rows || '<p class="cg-hint">Aucune compétence choisie.</p>'}
      <div class="cluster cg-add-row">
        <select id="cg-skill-pick">${addOpts || "<option>— toutes prises —</option>"}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-skill" ${available.length ? "" : "disabled"}>＋ Ajouter</button>
      </div>
      <div class="cg-section-label">Connaissances <span class="cg-section-note">2 500 ¥ chacune = 1 point</span></div>
      ${knowledgeRows}
      <div class="cluster cg-add-row">
        <input type="text" id="cg-knowledge-text" placeholder="ex. Gangs de Seattle, Sécurité corpo, Magie…">
        <button class="btn-secondary btn-small" data-cg-action="add-knowledge">＋ Ajouter</button>
      </div>
      <p class="cg-hint">Points utilisés : ${skillPts} / ${table.skillPoints}${capNote}</p>
    </div>`;
  },

  /* ---- Étape : Atouts / Magie ---- */
  /** Suggestions d'Atouts, en `datalist` et non en `select` : les deux Anarchy
      décrivent des Atouts au livre MAIS assument qu'on en invente. Fermer la
      liste retirerait cette liberté ; ne rien proposer obligeait à les saisir
      de mémoire, alors que le catalogue existait — 37 entrées en Anarchy 1, 80
      en Anarchy 2, exposées par le contrat et lues par personne. Même motif que
      `gearCatalog` en septembre : l'accesseur était là, l'écran l'ignorait. */
  _edgeSuggestions() {
    const c = this._creation();
    if (typeof c.edgeCatalog !== "function") return "";
    const opts = (c.edgeCatalog() || [])
      .map((e) => `<option value="${this._esc(e.label || e.id)}"></option>`)
      .join("");
    return opts ? `<datalist id="cg-edge-suggestions">${opts}</datalist>` : "";
  },

  _render_edges_anarchy() {
    const c = this._creation();
    const b = this._build;
    const table = c.pointTables[b.gameLevel][b.archetypeTable];
    const edgePts = b.edges.reduce((a, e) => a + (e.level || 0), 0);

    const edgeRows = b.edges
      .map(
        (e, i) =>
          `<div class="cluster cg-list-row"><span>${this._esc(e.text)}</span><span class="tag">niv. ${e.level}</span>
          <button class="btn-icon-tiny danger" data-cg-action="remove-edge" data-idx="${i}" title="Retirer">✕</button></div>`,
      )
      .join("");

    // Une option par paire (compétence, spécialisation) pour cibler le RR.
    const specPairs = [];
    b.skills.forEach((s, i) => (s.specs || []).forEach((sp) => specPairs.push({ i, name: s.name, spec: sp })));
    const specOpts = specPairs
      .map((p) => `<option value="${p.i}::${this._esc(p.spec)}">${this._esc(p.name)} (${this._esc(p.spec)})</option>`)
      .join("");
    const skillOpts = b.skills.map((s, i) => `<option value="${i}">${this._esc(s.name)}</option>`).join("");

    let magicHtml = "";
    if (b.awakened) {
      const kitSpells = table.kit.sorts;
      const spellChecks = c.spellPool()
        .map(
          (sp) =>
            `<label class="cluster cg-check"><input type="checkbox" data-cg-action="toggle-spell" data-name="${this._esc(sp.name)}" ${b.spells.includes(sp.name) ? "checked" : ""}> ${this._esc(sp.name)}</label>`,
        )
        .join("");
      const mentorBlock = b.mentorSpirit
        ? `<span class="tag">✦ ${this._esc(b.mentorSpirit.name)}${b.mentorSpirit.desc ? ` — ${this._esc(b.mentorSpirit.desc)}` : ""}</span>
           <button class="btn-icon-tiny danger" data-cg-action="clear-mentor" title="Retirer">✕</button>`
        : `<button class="btn-secondary btn-small" data-cg-action="draw-mentor">✦ Tirer un esprit mentor</button>`;
      magicHtml = `<div class="cg-step-section">
        <div class="cg-section-label">Sorts <span class="cg-section-note">${this._kitMeter(b.spells.length, kitSpells, "au kit")} · 5 000 ¥/sort hors kit</span></div>
        <div class="cg-check-grid">${spellChecks}</div>
        <div class="cg-section-label">Esprit mentor</div>
        <div class="cluster cg-add-row">${mentorBlock}</div>
      </div>`;
    }

    return `<div class="stack">
      ${this._stepErrorBox("edges")}
      <p class="cg-hint">Table : ${table.edgePoints} points d'atouts (5 000 ¥/niveau). Modèles RR pré-câblés (s'appliquent automatiquement) + atout personnalisé en texte libre pour le reste du système (cyberware/bioware/pouvoirs d'adepte…, p.58-63).</p>
      ${edgeRows || '<p class="cg-hint">Aucun atout.</p>'}
      <div class="cluster cg-add-row">
        <select id="cg-edge-spec-pick">${specOpts || "<option value=\"\">— aucune spécialisation —</option>"}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-edge-rrspec" ${specPairs.length ? "" : "disabled"}>＋ RR 1 (spé, niv. 2)</button>
      </div>
      <div class="cluster cg-add-row">
        <select id="cg-edge-skill-pick">${skillOpts || "<option value=\"\">— aucune compétence —</option>"}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-edge-rrskill" ${b.skills.length ? "" : "disabled"}>＋ RR 1 (compétence, niv. 5)</button>
      </div>
      <div class="cluster cg-add-row">
        ${this._edgeSuggestions()}
        <input type="text" id="cg-edge-custom-label" list="cg-edge-suggestions" placeholder="Atout — tapez ou choisissez…">
        <input type="number" id="cg-edge-custom-level" min="1" value="1" style="width:4em">
        <button class="btn-secondary btn-small" data-cg-action="add-edge-custom">＋ Ajouter</button>
      </div>
      <p class="cg-hint">Points utilisés : ${edgePts} / ${table.edgePoints}</p>
      ${magicHtml}
    </div>`;
  },

  /* ---- Étape : Équipement ---- */
  _render_gear_kit() {
    const c = this._creation();
    const b = this._build;
    const table = c.pointTables[b.gameLevel][b.archetypeTable];
    const catalog = c.weaponCatalog();
    const chosenNames = b.weapons.map((w) => w.name);
    const specialistNames = new Set(catalog.filter((w) => w.specialist).map((w) => w.name));
    const chosenNormal = b.weapons.filter((w) => !specialistNames.has(w.name)).length;
    const chosenSpe = b.weapons.filter((w) => specialistNames.has(w.name)).length;
    const weaponCheck = (w) =>
      `<label class="cluster cg-check"><input type="checkbox" data-cg-action="toggle-weapon" data-name="${this._esc(w.name)}" ${chosenNames.includes(w.name) ? "checked" : ""}> ${this._esc(w.name)}</label>`;
    const normalChecks = catalog.filter((w) => !w.specialist).map(weaponCheck).join("");
    const speChecks = catalog.filter((w) => w.specialist).map(weaponCheck).join("");
    const gearRows = (b.gear || [])
      .map(
        (g, i) =>
          `<div class="cluster cg-list-row"><span>${this._esc(g)}</span><button class="btn-icon-tiny danger" data-cg-action="remove-gear" data-idx="${i}" title="Retirer">✕</button></div>`,
      )
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("gear")}
      <p class="cg-hint">Kit gratuit (${this._esc(table.label)}) : commlink, faux SIN et armure 3 toujours fournis. Au-delà des quotas, chaque élément est payé en nuyens.</p>
      <div class="cg-section-label">Armes normales <span class="cg-section-note">${this._kitMeter(chosenNormal, table.kit.armesNormales, "au kit")}</span></div>
      <div class="cg-check-grid">${normalChecks}</div>
      ${speChecks ? `<div class="cg-section-label">Armes de spécialiste <span class="cg-section-note">${this._kitMeter(chosenSpe, table.kit.armesSpe, "au kit")}</span></div>
      <div class="cg-check-grid">${speChecks}</div>` : ""}
      <div class="cg-section-label">Armure supplémentaire <span class="cg-section-note">au-delà des 3 du kit, 2 500 ¥/point</span></div>
      <input type="number" min="0" data-cg="extraArmor" value="${b.extraArmor || 0}" style="width:4em">
      <div class="cg-section-label">Équipement <span class="cg-section-note">${this._kitMeter((b.gear || []).length, table.kit.equipements, "au kit")}</span></div>
      ${gearRows}
      <div class="cluster cg-add-row">
        <input type="text" id="cg-gear-text" placeholder="Nom de l'équipement…">
        <button class="btn-secondary btn-small" data-cg-action="add-gear">＋ Ajouter</button>
      </div>
    </div>`;
  },

  /* ---- Étape : grille de priorités (SR5/SR6) ----
     La grille EST l'écran : cinq colonnes, cinq lettres, et le livre impose
     soit une lettre par colonne sans doublon (système de priorités), soit un
     budget de points (système à 10 points). Le renderer ne connaît ni l'une
     ni l'autre règle — il affiche `priorityView()` et laisse stepErrors
     trancher, comme partout ailleurs. */
  _render_priorities() {
    const c = this._creation();
    const b = this._build;
    const view = c.priorityView(b);

    const rows = view.columns
      .map((col) => {
        const cells = view.letters
          .map((L) => {
            const cell = view.cell(col.key, L);
            const chosen = b.priorities[col.key] === L;
            return `<button class="cg-prio-cell${chosen ? " chosen" : ""}${cell.invalid ? " invalid" : ""}"
              data-cg-action="set-priority" data-col="${this._esc(col.key)}" data-letter="${L}"
              title="${this._esc(cell.title || "")}" aria-pressed="${chosen}">
              <span class="cg-prio-letter">${L}${view.cost ? ` <em>${view.cost[L]}</em>` : ""}</span>
              <span class="cg-prio-val">${cell.html}</span>
            </button>`;
          })
          .join("");
        return `<div class="cg-prio-row">
          <div class="cg-prio-head">${this._esc(col.label)}</div>
          <div class="cg-prio-cells">${cells}</div>
        </div>`;
      })
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("priorites")}
      <p class="cg-hint">${this._esc(view.hint)}</p>
      <div class="cg-prio-grid">${rows}</div>
      ${
        view.magicLegend
          ? `<div class="cg-prio-legend">
              <span class="cg-prio-legend-letter">${this._esc(view.magicLegend.letter)}</span>
              ${
                (view.magicLegend.options || []).length
                  ? `<ul class="cg-magic-options">${view.magicLegend.options
                      .map(
                        (o) =>
                          `<li><button class="cg-magic-option${o.chosen ? " chosen" : ""}" data-cg-action="set-magic-option" data-key="${this._esc(o.key)}" aria-pressed="${o.chosen}">${this._esc(o.label)}</button></li>`,
                      )
                      .join("")}</ul>`
                  : `<ul>${view.magicLegend.lignes.map((l) => `<li>${this._esc(l)}</li>`).join("")}</ul>`
              }
            </div>`
          : ""
      }
      ${view.footer ? `<p class="cg-hint">${view.footer}</p>` : ""}
    </div>`;
  },

  /* ---- Étape : compétences SR (deux réserves + groupes + connaissances) ---- */
  _render_skills_sr() {
    const c = this._creation();
    const b = this._build;
    const [indivTotal, groupTotal] = c.skillPointsTotal(b);
    const cat = c.skillCatalog();
    const taken = new Set((b.skills || []).map((s) => s.name));
    const cap = c.SKILL_CAP;

    const skillRows = (b.skills || [])
      .map((s, i) => {
        const attrKey = s.attr || "LOG";
        const [min] = c.attrRangeFor(b, attrKey);
        const attrVal = (b.attrs || {})[attrKey] ?? min;
        const pool = (s.val || 0) + attrVal;
        const specChips = (s.specs || [])
          .map(
            (sp) =>
              `<span class="cg-spec-chip">◊ ${this._esc(sp)} <strong>${(s.val || 0) + 2 + attrVal}</strong><button class="cg-spec-x" data-cg-action="remove-spec" data-idx="${i}" data-spec="${this._esc(sp)}" title="Retirer">✕</button></span>`,
          )
          .join("");
        return `<div class="cluster cg-list-row cg-skill-row">
          <strong>${this._esc(s.name)}</strong>
          <input type="number" min="0" max="${cap}" data-cg="skills.${i}.val" value="${s.val || 0}" style="width:3.5em">
          <span class="cg-pool" title="Pool = ${s.val || 0} + ${attrVal} (${this._esc(attrKey)})">⚄ ${pool}</span>
          ${(s.val || 0) > cap ? '<span class="cg-error-text">&gt; plafond</span>' : ""}
          <button class="btn-icon-tiny danger" data-cg-action="remove-skill" data-idx="${i}" title="Retirer">✕</button>
          <div class="cluster cg-spec-line">${specChips}
            <span class="cg-spec-add">
              <input type="text" id="cg-sr-spec-${i}" placeholder="Spécialisation…">
              <button class="btn-icon-tiny" data-cg-action="add-spec-sr" data-idx="${i}" ${(s.val || 0) >= 1 ? "" : "disabled"} title="1 point de compétence">＋ spé</button>
            </span>
          </div>
        </div>`;
      })
      .join("");

    const groupRows = (b.groups || [])
      .map(
        (g, i) =>
          `<div class="cluster cg-list-row"><strong>${this._esc(g.name)}</strong>
        <input type="number" min="0" max="${cap}" data-cg="groups.${i}.val" value="${g.val || 0}" style="width:3.5em">
        <button class="btn-icon-tiny danger" data-cg-action="remove-group" data-idx="${i}" title="Retirer">✕</button></div>`,
      )
      .join("");

    const knowRows = (b.knowledges || [])
      .map(
        (k, i) =>
          `<div class="cluster cg-list-row"><span>${this._esc(k.name || "")}</span>
        <input type="number" min="1" data-cg="knowledges.${i}.val" value="${k.val || 1}" style="width:3.5em">
        <button class="btn-icon-tiny danger" data-cg-action="remove-knowledge" data-idx="${i}" title="Retirer">✕</button></div>`,
      )
      .join("");

    const skillOpts = cat
      .filter((sk) => !taken.has(sk.name))
      .map((sk) => `<option value="${this._esc(sk.name)}">${this._esc(sk.name)} (${this._esc(sk.attr)})</option>`)
      .join("");
    const groupOpts = c
      .groupCatalog()
      .map((g) => `<option value="${this._esc(g.name)}">${this._esc(g.name)}</option>`)
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("skills")}
      <p class="cg-hint">Deux réserves distinctes (colonne Compétences « ${this._esc(b.priorities.skills)} ») : ${indivTotal} points individuels et ${groupTotal} points de groupes. Plafond d'indice à la création : ${cap} (7 avec le trait Aptitude, p.90). Une spécialisation coûte 1 point.</p>
      <div class="cg-section-label">Compétences actives <span class="cg-section-note">${c.skillPointsUsed(b)} / ${indivTotal}</span></div>
      ${skillRows || '<p class="cg-hint">Aucune compétence.</p>'}
      <div class="cluster cg-add-row">
        <select id="cg-sr-skill-pick">${skillOpts || "<option>— toutes prises —</option>"}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-skill-sr">＋ Ajouter</button>
      </div>
      <div class="cg-section-label">Groupes de compétences <span class="cg-section-note">${c.groupPointsUsed(b)} / ${groupTotal}</span></div>
      ${groupRows}
      <div class="cluster cg-add-row">
        <select id="cg-sr-group-pick" ${groupTotal ? "" : "disabled"}>${groupOpts}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-group" ${groupTotal ? "" : "disabled"}>＋ Ajouter</button>
        ${
          groupTotal
            ? ""
            : `<span class="cg-section-note">La colonne Compétences « ${this._esc(b.priorities.skills)} » n'accorde <strong>aucun</strong> point de groupe (p.67) : prenez A, B ou C pour en acheter.</span>`
        }
      </div>
      <div class="cg-section-label">Connaissances et langues <span class="cg-section-note">${c.knowledgePointsUsed(b)} / ${c.knowledgePointsTotal(b)} — (INT + LOG) × 2</span></div>
      ${knowRows}
      <div class="cluster cg-add-row">
        <input type="text" id="cg-sr-knowledge" placeholder="ex. Gangs de Seattle, Sperethiel…">
        <button class="btn-secondary btn-small" data-cg-action="add-knowledge-sr">＋ Ajouter</button>
      </div>
    </div>`;
  },

  /* ---- Étape : compétences SR6 ----
     Une seule réserve, contrairement à SR5 qui en a deux (individuelles et
     groupes) : d'où un kind distinct plutôt qu'un renderer à options qui
     mentirait sur leur parenté. Une spécialisation coûte 1 rang, et le livre
     n'en autorise qu'une par compétence — sauf Armes exotiques (p.66,
     Compagnon p.29). */
  _render_skills_sr6() {
    const c = this._creation();
    const b = this._build;
    const total = c.skillPointsTotal(b);
    const used = c.skillPointsUsed(b);
    const cap = c.SKILL_CAP;
    const taken = new Set((b.skills || []).map((s) => s.name));

    const rows = (b.skills || [])
      .map((s, i) => {
        const attrKey = s.attr || "LOG";
        const attrVal = (b.attrs || {})[attrKey] ?? 1;
        const pool = (s.val || 0) + attrVal;
        const multiOk = s.name === "Armes exotiques";
        const specChips = (s.specs || [])
          .map(
            (sp) =>
              `<span class="cg-spec-chip">◊ ${this._esc(sp)} <strong>${(s.val || 0) + 2 + attrVal}</strong><button class="cg-spec-x" data-cg-action="remove-spec" data-idx="${i}" data-spec="${this._esc(sp)}" title="Retirer">✕</button></span>`,
          )
          .join("");
        const canAddSpec = (s.val || 0) >= 1 && (multiOk || (s.specs || []).length === 0);
        return `<div class="cluster cg-list-row cg-skill-row">
          <strong>${this._esc(s.name)}</strong>
          <input type="number" min="0" max="${cap}" data-cg="skills.${i}.val" value="${s.val || 0}" style="width:3.5em">
          <span class="cg-pool" title="Pool = ${s.val || 0} + ${attrVal} (${this._esc(attrKey)})">⚄ ${pool}</span>
          ${(s.val || 0) > cap ? '<span class="cg-error-text">&gt; plafond</span>' : ""}
          <button class="btn-icon-tiny danger" data-cg-action="remove-skill" data-idx="${i}" title="Retirer">✕</button>
          <div class="cluster cg-spec-line">${specChips}
            <span class="cg-spec-add">
              <input type="text" id="cg-sr-spec-${i}" placeholder="Spécialisation…">
              <button class="btn-icon-tiny" data-cg-action="add-spec-sr" data-idx="${i}" ${canAddSpec ? "" : "disabled"} title="${canAddSpec ? "1 point de compétence" : "Une seule spécialisation par compétence"}">＋ spé</button>
            </span>
          </div>
        </div>`;
      })
      .join("");

    const opts = c
      .skillCatalog()
      .filter((sk) => !taken.has(sk.name))
      .map((sk) => `<option value="${this._esc(sk.name)}">${this._esc(sk.name)} (${this._esc(sk.attr)})</option>`)
      .join("");

    const knowRows = (b.knowledges || [])
      .map(
        (k, i) =>
          `<div class="cluster cg-list-row"><span>${this._esc(k.name || "")}</span>
        <button class="btn-icon-tiny danger" data-cg-action="remove-knowledge" data-idx="${i}" title="Retirer">✕</button></div>`,
      )
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("skills")}
      <p class="cg-hint">Une seule réserve : ${total} rangs. Un point donne un rang, ou une spécialisation. Rang maximum à la création : ${cap} (7 avec le trait Aptitude), et <strong>une seule compétence</strong> peut l'atteindre.</p>
      <div class="cg-section-label">Compétences <span class="cg-section-note">${used} / ${total}</span></div>
      ${rows || '<p class="cg-hint">Aucune compétence.</p>'}
      <div class="cluster cg-add-row">
        <select id="cg-sr-skill-pick">${opts || "<option>— toutes prises —</option>"}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-skill-sr">＋ Ajouter</button>
      </div>
      <div class="cg-section-label">Connaissances et langues <span class="cg-section-note">hors réserve de compétences</span></div>
      ${knowRows}
      <div class="cluster cg-add-row">
        <input type="text" id="cg-sr-knowledge" placeholder="ex. Pègre de Seattle, Sperethiel…">
        <button class="btn-secondary btn-small" data-cg-action="add-knowledge-sr">＋ Ajouter</button>
      </div>
    </div>`;
  },

  /* ---- Étape : équipement payé en nuyens ----
     Le catalogue SR5 de l'app est NOMINATIF (il alimente le générateur de
     PNJ, sans prix) : on lui emprunte les noms canoniques et le joueur pose
     le prix lu au livre. Un catalogue chiffré serait un relevé à part
     entière (~80 pages de chapitre Équipement). */
  /* ---- Étape : traits (SR5) ----
     Le plafond de 25 karma vaut SÉPARÉMENT pour les avantages et pour les
     défauts (p.73) — pas en net. Les deux compteurs sont donc affichés
     côte à côte, et non fondus en un solde qui masquerait la règle.

     Un coût variable (« 4 ou 8 », « 3 à 15 ») se saisit : 39 traits en ont
     un, et l'application ne choisit pas à la place du joueur. */
  _render_traits_sr() {
    const c = this._creation();
    const b = this._build;
    b.traits = b.traits || [];
    const tr = c.traitState(b);

    const rows = b.traits
      .map((t, i) => {
        const ref = c.traitById(t.id);
        if (!ref) return "";
        // SR5 porte un TABLEAU (coûts variables au livre), SR6 un nombre.
        const k = Array.isArray(ref.karma) ? ref.karma : [ref.karma];
        const borne = k.length > 1 ? `${k[0]} ${ref.variable === "ou" ? "ou" : "à"} ${k[1]}` : `${k[0]}`;
        return `<div class="cluster cg-list-row">
          <span class="cg-pick-name">${this._esc(ref.nom)}</span>
          <span class="tag">${ref.type === "avantage" ? "avantage" : "défaut"}</span>
          <input type="number" min="0" data-cg="traits.${i}.karma" value="${t.karma ?? k[0]}" style="width:4.5em" title="Karma retenu">
          <span class="cg-section-note">karma (livre : ${this._esc(borne)})${ref.parNiveau ? " par niveau" : ""}</span>
          <span class="cg-section-note">${this._esc(ref.source)}</span>
          <button class="btn-icon-tiny danger" data-cg-action="remove-trait" data-idx="${i}" title="Retirer">✕</button>
        </div>`;
      })
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("traits")}
      <p class="cg-hint">${this._esc(c.traitHint ? c.traitHint() : "")}</p>
      <div class="cg-section-label">Retenus
        <span class="cg-section-note">${c.traitSummary(b).map((m) => this._kitMeter(m.used, m.total, m.label)).join(" · ")} · net ${tr.net >= 0 ? "+" : ""}${tr.net} karma</span>
      </div>
      ${rows || '<p class="cg-hint">Aucun trait.</p>'}
      ${this._catalogPicker({
        id: "traits",
        groups: c.traitCatalog(),
        action: "pick-trait",
        selected: b.traits.map((t) => (c.traitById(t.id) || {}).nom).filter(Boolean),
      })}
    </div>`;
  },

  /* ---- Étape : traits Anarchy 1 ----
     ⚠ Écran DISTINCT de `traits_sr`, et ce n'est pas de la duplication :
     Anarchy ne tarife pas ses traits. Il n'y a ni karma à saisir, ni budget à
     jauger — seulement un COMPTE (deux Avantages, un Défaut, p.70). Un
     renderer commun aurait dû afficher une colonne de karma vide et un
     plafond inexistant : ce serait mentir sur la règle. */
  _render_traits_a1() {
    const c = this._creation();
    const b = this._build;
    b.traits = b.traits || [];
    const st = c.traitState(b);

    const rows = b.traits
      .map((t, i) => {
        const ref = c.traitById(t.id);
        const nom = ref ? ref.nom : t.nom || t.id;
        const eff = ref ? ref.effet : t.effet || "";
        const type = ref ? ref.type : t.type || "avantage";
        return `<div class="cluster cg-list-row">
          <span class="cg-pick-name">${this._esc(nom)}</span>
          <span class="tag">${type === "defaut" ? "défaut" : "avantage"}</span>
          <span class="cg-section-note">${this._esc(eff)}</span>
          <button class="btn-icon-tiny danger" data-cg-action="remove-trait" data-idx="${i}" title="Retirer">✕</button>
        </div>`;
      })
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("traits")}
      <p class="cg-hint">Anarchy ne fait pas payer ses traits : on en <strong>compte</strong>. ${st.maxAvantages} Avantage(s) et ${st.maxDefauts} Défaut(s) (p.70). Le livre invite à en inventer — le catalogue suggère, il ne ferme pas.</p>
      <div class="cg-section-label">Retenus
        <span class="cg-section-note">${this._kitMeter(st.avantages, st.maxAvantages, "avantages")} · ${this._kitMeter(st.defauts, st.maxDefauts, "défauts")}</span>
      </div>
      ${rows || '<p class="cg-hint">Aucun trait.</p>'}
      ${this._catalogPicker({
        id: "traits-a1",
        groups: c.traitCatalog(),
        action: "pick-trait",
        selected: b.traits.map((t) => (c.traitById(t.id) || {}).nom).filter(Boolean),
      })}
      <div class="cluster cg-add-row">
        <input type="text" id="cg-a1-trait-libre" placeholder="Trait inventé…">
        <select id="cg-a1-trait-type">
          <option value="avantage">Avantage</option>
          <option value="defaut">Défaut</option>
        </select>
        <button class="btn-secondary btn-small" data-cg-action="add-trait-libre">＋ Ajouter</button>
      </div>
    </div>`;
  },

  /* ---- Étape : karma de finition (SR5, familles à priorités) ----
     Le livre en fait une étape (« Karma restant », p.102) et l'assistant
     annonçait « 25 karma de finition » en tête d'écran depuis le début sans
     offrir un seul endroit où les dépenser.

     Un achat MONTE la cible et enregistre son coût ; les réserves de la
     colonne l'ignorent (cf. `karmaBought`). On défait dans l'ordre inverse,
     sinon le remboursement ne serait pas le prix payé. */
  _render_finish_sr5() {
    const c = this._creation();
    const b = this._build;
    const kf = c.finishingKarma(b);

    const ligne = (kind, name, courant, plafond) => {
      const cout = c.karmaBuyCost(b, kind, name);
      const achete = (b.karmaBuys || []).filter((a) => a.kind === kind && a.name === name).length;
      const possible = cout != null && cout <= kf.left;
      return `<div class="cluster cg-list-row">
        <span class="cg-pick-name">${this._esc(name)}</span>
        <span class="cg-section-note">${courant}${plafond != null ? ` / ${plafond}` : ""}${achete ? ` · ${achete} au karma` : ""}</span>
        <span class="cg-section-note">${cout == null ? "au plafond" : `${cout} karma`}</span>
        <button class="btn-secondary btn-small" data-cg-action="karma-buy" data-kind="${this._esc(kind)}" data-name="${this._esc(name)}" ${possible ? "" : "disabled"}>＋</button>
        <button class="btn-icon-tiny danger" data-cg-action="karma-undo" data-kind="${this._esc(kind)}" data-name="${this._esc(name)}" ${achete ? "" : "disabled"} title="Annuler le dernier achat">✕</button>
      </div>`;
    };

    const attrs = [...c.ATTRS, ...c.SPECIAL_ATTRS]
      .map((k) => {
        const [min, max] = c.attrRangeFor(b, k);
        const cur = c.SPECIAL_ATTRS.includes(k) ? (b.special || {})[k] ?? min : (b.attrs || {})[k] ?? min;
        return ligne("attr", k, cur, max);
      })
      .join("");

    const skills = (b.skills || []).length
      ? b.skills.map((s) => ligne("skill", s.name, s.val || 0, c.SKILL_CAP)).join("")
      : `<p class="cg-hint">Aucune compétence à monter — revenez à l'étape Compétences pour en prendre.</p>`;

    const nuyenPossible = kf.nuyenKarma < kf.nuyenKarmaMax && kf.left >= 1;
    return `<div class="stack">
      ${this._stepErrorBox("finition")}
      <p class="cg-hint">${kf.used} / ${kf.total} karma dépensés — il en reste <strong>${kf.left}</strong>. On n'en garde pas plus de ${kf.carryoverMax} après la création (p.102) : le reste est à dépenser ici.</p>

      <div class="cg-section-label">Attributs <span class="cg-section-note">nouvel indice × ${c.karmaCosts.attrMult}</span></div>
      ${attrs}

      <div class="cg-section-label">Compétences <span class="cg-section-note">nouvel indice × ${c.karmaCosts.skillMult}</span></div>
      ${skills}

      <div class="cg-section-label">Ressources <span class="cg-section-note">${kf.nuyenKarma} / ${kf.nuyenKarmaMax} karma convertis · ${kf.nuyen.toLocaleString("fr-FR")} ¥</span></div>
      <div class="cluster cg-list-row">
        <span class="cg-pick-name">1 karma = ${c.KARMA_TO_NUYEN.toLocaleString("fr-FR")} ¥</span>
        <button class="btn-secondary btn-small" data-cg-action="karma-buy" data-kind="nuyen" data-name="nuyen" ${nuyenPossible ? "" : "disabled"}>＋</button>
        <button class="btn-icon-tiny danger" data-cg-action="karma-undo" data-kind="nuyen" data-name="nuyen" ${kf.nuyenKarma ? "" : "disabled"} title="Annuler">✕</button>
      </div>

      <p class="cg-hint">Les traits, contacts et connaissances s'achètent aussi sur ce karma au livre ; l'application ne les modélise pas encore ici.</p>
    </div>`;
  },

  /* ---- Étape : Magie / Résonance (SR5, SR6) ----
     Un seul écran pour trois réserves que le livre distingue — sorts (ou
     « formules » en SR6), formes complexes, pouvoirs d'adepte — parce que
     l'ÉCRAN a bien la même forme dans les trois cas : un catalogue groupé par
     catégorie, des cases à cocher, un compteur. Ce que chaque édition accorde
     et comment elle le nomme vient de `magicStep()`, jamais d'ici.

     `total: null` signifie « pas de quota, un coût à l'unité » : le compteur
     affiche alors le nombre choisi sans dénominateur, plutôt qu'un « /null ». */
  _render_magic_sr() {
    const c = this._creation();
    const step = c.magicStep(this._build);
    if (!step) return `<div class="stack"><p class="cg-hint">Personnage sans Magie ni Résonance.</p></div>`;

    const blocs = step.groups
      .map((g) => {
        const compteur = g.total == null ? `${g.used} choisi(s)` : this._kitMeter(g.used, g.total, "choisis");
        const retenus = (g.chosen || []).length
          ? `<div class="cg-pick-chosen">${(g.chosen || [])
              .map(
                (nom) =>
                  `<button class="cg-pick-tag" data-cg-action="toggle-magic" data-kind="${this._esc(g.key)}" data-name="${this._esc(nom)}" title="Retirer">${this._esc(nom)} ✕</button>`,
              )
              .join("")}</div>`
          : "";
        return `<div class="stack">
          <div class="cg-section-label">${this._esc(g.label)} <span class="cg-section-note">${compteur}</span></div>
          <p class="cg-hint">${this._esc(g.hint)}</p>
          ${retenus}
          ${this._catalogPicker({
            id: `magic-${g.key}`,
            groups: g.catalog || [],
            action: "toggle-magic",
            selected: g.chosen || [],
          })}
        </div>`;
      })
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("magie")}
      <p class="cg-hint">${this._esc(step.hint)}</p>
      ${blocs}
    </div>`;
  },

  /** Sélecteur de catalogue : recherche, filtre par catégorie, et le DÉTAIL
      du livre sous chaque nom.

      Il remplace le `<select><optgroup>` qui servait jusqu'ici. Ce n'était pas
      un détail d'esthétique : 572 objets d'équipement en SR5, 588 en SR6, 192
      sorts, une centaine de compétences — tenus dans une liste déroulante
      unique, sans recherche, et réduits à leur nom parce que
      `flattenEquipPools` jetait la ligne de stats. On choisissait « Ares
      Predator V » sans savoir que c'est un pistolet lourd VD 8P.

      Le filtrage se fait sur les éléments déjà rendus (on masque), pas en
      redessinant : le champ de recherche garde le focus et la position du
      curseur, ce qu'un re-rendu à chaque frappe perdrait.

      `action` reçoit `data-name` (et `data-cat`) ; à l'appelant de décider ce
      qu'il en fait — ajouter à une liste, cocher, remplacer. */
  _catalogPicker({ id, groups, action, selected, vide }) {
    const sel = new Set(selected || []);
    const cats = (groups || []).map((g) => g.category);
    let n = 0;
    const items = (groups || [])
      .flatMap((g) =>
        (g.items || []).map((it) => {
          n++;
          const dejaPris = sel.has(it.label);
          return `<button class="cg-pick-item${dejaPris ? " pris" : ""}" data-cg-action="${this._esc(action)}"
            data-name="${this._esc(it.label)}" data-cat="${this._esc(g.category)}"${it.kind ? ` data-kind="${this._esc(it.kind)}"` : ""}
            data-hay="${this._esc(`${it.label} ${it.detail || ""} ${g.category}`.toLowerCase())}">
            <span class="cg-pick-name">${dejaPris ? "✓ " : ""}${this._esc(it.label)}</span>
            ${it.detail ? `<span class="cg-pick-detail">${this._esc(it.detail)}</span>` : ""}
            <span class="cg-pick-cat">${this._esc(g.category)}</span>
          </button>`;
        }),
      )
      .join("");

    return `<div class="cg-pick" data-pick="${this._esc(id)}">
      <div class="cluster cg-pick-bar">
        <input type="search" class="cg-pick-search" data-pick-search="${this._esc(id)}" placeholder="Chercher parmi ${n}…" autocomplete="off">
        <select class="cg-pick-cat-filter" data-pick-cat="${this._esc(id)}">
          <option value="">Toutes les catégories</option>
          ${cats.map((cat) => `<option value="${this._esc(cat)}">${this._esc(cat)}</option>`).join("")}
        </select>
      </div>
      <div class="cg-pick-list">${items || `<p class="cg-hint">${this._esc(vide || "Catalogue vide.")}</p>`}</div>
      <p class="cg-hint cg-pick-empty" hidden>Aucun résultat.</p>
    </div>`;
  },

  _render_gear_nuyen() {
    const c = this._creation();
    const b = this._build;
    const budget = c.budget(b);
    const nuyenCell = budget.cells.find((x) => x.label === "Nuyens");
    // Les limites d'achat viennent du contrat : SR5 les fait dépendre du
    // niveau de campagne (rue/expérimenté/élite), SR6 n'a pas ces paliers et
    // interdit simplement l'illégal de Disponibilité ≥ 7.
    const limits = c.gearLimits(b);

    const rows = (b.gear || [])
      .map(
        (g, i) =>
          (() => {
        /* Accessoires montés sur CET objet. Le conflit de monture est dit à
           l'endroit où il se produit, pas dans un message global : deux
           accessoires « Dessous » sur la même arme, c'est cette arme-là qui
           est en faute. */
        const mods = g.mods || [];
        const conflits = c.accessoryConflicts ? c.accessoryConflicts(g) : [];
        const tags = mods
          .map((id) => {
            const a = c.accessoryById(id);
            return a
              ? `<button class="cg-pick-tag" data-cg-action="remove-mod" data-idx="${i}" data-mod="${this._esc(id)}" title="Retirer">${this._esc(a.nom)}${a.monture && a.monture !== "—" ? ` (${this._esc(a.monture)})` : ""} ✕</button>`
              : "";
          })
          .join("");
        /* ⚠ TOUS les groupes du catalogue, chacun dans son <optgroup>. Ne
           prendre que le premier (`[0]`) a fait disparaître les accessoires
           d'armes de tous les menus le jour où les mods de véhicule ont été
           mis en tête — une régression silencieuse : rien ne cassait, il
           manquait juste la moitié du choix. */
        const opts = (c.accessoryCatalog ? c.accessoryCatalog() : [])
          .filter((grp) => grp.items.length)
          .map(
            (grp) =>
              `<optgroup label="${this._esc(grp.category)}">${grp.items
                .map((a) => `<option value="${this._esc(a.id)}" title="${this._esc(a.detail || "")}">${this._esc(a.label)}</option>`)
                .join("")}</optgroup>`,
          )
          .join("");
        const reserves = this._vehicleReserves(c, g, i) + this._weaponSlots(c, g);
        return `<div class="stack cg-list-row">
        <div class="cluster">
          <span>${this._esc(g.name || "")}</span>
          <input type="number" min="0" step="100" data-cg="gear.${i}.cost" value="${g.cost || 0}" style="width:7em" title="Coût en nuyens">
          <span class="cg-section-note">¥</span>
          <input type="number" min="0" data-cg="gear.${i}.availability" value="${g.availability ?? ""}" style="width:4.5em" title="Disponibilité">
          <span class="cg-section-note">Disp.</span>
          <button class="btn-icon-tiny danger" data-cg-action="remove-gear" data-idx="${i}" title="Retirer">✕</button>
        </div>
        ${tags ? `<div class="cg-pick-chosen">${tags}</div>` : ""}
        ${conflits.map((t) => `<p class="cg-hint">⚑ ${this._esc(t)}</p>`).join("")}
        ${reserves}
        ${
          opts
            ? `<div class="cluster cg-add-row">
                <select data-cg-mod-pick="${i}">${opts}</select>
                <button class="btn-secondary btn-small" data-cg-action="add-mod" data-idx="${i}">＋ Accessoire</button>
              </div>`
            : ""
        }
      </div>`;
      })(),
      )
      .join("");


    return `<div class="stack">
      ${this._stepErrorBox("gear")}
      <p class="cg-hint">Ressources : ${(nuyenCell?.used || 0).toLocaleString("fr-FR")} / ${(nuyenCell?.total || 0).toLocaleString("fr-FR")} ¥. ${this._esc(limits.hint)} La ligne de stats du livre s'affiche sous chaque entrée ; les PRIX, eux, n'y figurent pas et se lisent au livre.</p>
      ${rows || '<p class="cg-hint">Aucun équipement.</p>'}
      ${this._catalogPicker({
        id: "gear",
        groups: c.gearCatalog() || [],
        action: "pick-gear",
        selected: (b.gear || []).map((g) => g.name),
      })}
      <div class="cluster cg-add-row">
        <input type="text" id="cg-sr-gear-free" placeholder="Équipement libre…">
        <button class="btn-secondary btn-small" data-cg-action="add-gear-free">＋ Ajouter</button>
      </div>
    </div>`;
  },

  /* Les emplacements de modification d'une ARME, quand l'édition en compte
     (SR6, Feu nourri p.41 : un budget par type d'arme) et que l'objet porte
     au moins un accessoire d'arme. Le budget vient du module ; `null` veut
     dire « le livre ne le donne pas pour ce type », et l'écran le dit au
     lieu d'afficher 0/0. Le rappel sur les montures vient aussi du module :
     l'app suppose toutes les montures libres, ce qui n'est pas la règle. */
  _weaponSlots(c, g) {
    const armes = (g.mods || []).map((id) => c.accessoryById(id)).filter((a) => a && a.montures !== undefined);
    if (!armes.length) return "";
    const morceaux = [];
    if (c.weaponModState) {
      const e = c.weaponModState(g);
      const sur = e.total == null ? "?" : e.total;
      const over = e.total != null && e.utilises > e.total;
      morceaux.push(`<span class="cg-pick-tag${over ? " cg-tag-over" : ""}" title="${this._esc(e.pris.join(", ") || "aucune modification")}">Modifications ${e.utilises}/${sur}</span>`);
      if (e.note) morceaux.push(`<span class="cg-section-note">${this._esc(e.note)}</span>`);
      if (over) morceaux.push(`<p class="cg-hint">⚑ ${e.utilises - e.total} modification(s) de trop pour ce type d'arme.</p>`);
    }
    if (c.WEAPON_MOUNTS_HINT && armes.some((a) => a.montures === "*" || (a.montures && a.montures.length))) {
      morceaux.push(`<span class="cg-section-note">${this._esc(c.WEAPON_MOUNTS_HINT)}</span>`);
    }
    return morceaux.length ? `<div class="cluster cg-add-row">${morceaux.join("")}</div>` : "";
  },

  /* Les réserves d'emplacements d'un véhicule, quand l'édition en a et que
     l'objet porte au moins un mod de véhicule. Trois réserves en SR6 (« À
     tombeau ouvert »), six en SR5 (Rigger 5.0) : le contrôleur ne compte pas,
     il rend ce que `vehicleModState()` lui donne. La valeur de base est
     SAISIE — Résistance ici, Structure là — et son nom vient de
     `MOD_RESERVE`, jamais d'ici.

     ⚠ Un mod aux emplacements indéterminés (formule au livre) est NOMMÉ, pas
     compté 0 : une réserve qui semble libre alors qu'un « 1 × Indice » y
     dort serait un faux vert.

     ⚠ Un dépassement n'a pas le même sens partout : SR6 le rachète à 2:1 sur
     les autres réserves, Rigger 5 l'interdit tout court. `deficit.conversion`
     le dit ; l'écran ne promet une conversion que si le module l'offre. */
  _vehicleReserves(c, g, i) {
    if (!c.vehicleModState || !c.MOD_RESERVE) return "";
    const deVehicule = (g.mods || []).some((id) => {
      const a = c.accessoryById(id);
      return a && a.monture === undefined; // un accessoire d'arme a toujours une monture
    });
    if (!deVehicule) return "";
    const base = c.MOD_RESERVE;
    const val = g[base.key];
    const etat = c.vehicleModState(g);
    const deficit = c.vehicleModDeficit ? c.vehicleModDeficit(g) : null;
    const puces = etat.reserves
      .map((r) => `<span class="cg-pick-tag${r.reste < 0 ? " cg-tag-over" : ""}" title="${this._esc(r.famille)} : ${r.utilises} sur ${r.total}">${this._esc(r.famille)} ${r.utilises}/${r.total}</span>`)
      .join("");
    let ligneDeficit = "";
    if (deficit && val != null) {
      const suite = deficit.conversion
        ? ` Conversion 2 pour 1 : il faut ${deficit.besoin} emplacement(s) libres ailleurs, il y en a ${deficit.dispo}${deficit.possible ? "" : " — pas assez"}.`
        : " Aucune conversion entre catégories dans cette édition : il faut retirer un mod.";
      ligneDeficit = `<p class="cg-hint">⚑ ${this._esc(deficit.manque.join(" ; "))}.${this._esc(suite)}</p>`;
    }
    return `<div class="cluster cg-add-row">
      <span class="cg-section-note">${this._esc(base.label)}</span>
      <input type="number" min="0" data-cg="gear.${i}.${this._esc(base.key)}" value="${val ?? ""}" style="width:4.5em" title="${this._esc(base.hint)} — à saisir">
      ${puces}
    </div>
    ${val == null ? `<p class="cg-hint">Saisis la ${this._esc(base.label)} du véhicule : ${this._esc(base.hint)}</p>` : ""}
    ${ligneDeficit}
    ${etat.indetermines.map((m) => `<p class="cg-hint">⚑ ${this._esc(m.nom)} : emplacements ${this._esc(m.note)} — non comptés dans ${this._esc(m.famille)}.</p>`).join("")}`;
  },

  /* ---- Étape : compétences Anarchy 1 ----
     Cinq compétences au maximum, une réserve de points que le métatype ET
     l'armure déplacent, et UNE SEULE spécialisation pour tout le personnage
     (p.78). Trois règles qu'aucune autre édition ne combine, d'où ce kind. */
  _render_skills_a1() {
    const c = this._creation();
    const b = this._build;
    const lvl = c.level(b);
    const total = c.skillPointsTotal(b);
    const used = c.skillPointsUsed(b);
    const taken = new Set((b.skills || []).map((s) => s.name));
    const specsTotal = (b.skills || []).reduce((n, s) => n + (s.specs || []).length, 0);

    const rows = (b.skills || [])
      .map((s, i) => {
        const attrKey = s.attr || "LOG";
        const pool = (s.val || 0) + c.attrValue(b, attrKey);
        const peutSpe = (s.val || 0) >= c.SPEC_MIN_RANK && (specsTotal === 0 || (s.specs || []).length);
        return `<div class="cluster cg-list-row cg-skill-row">
          <strong>${this._esc(s.name)}</strong>
          <input type="number" min="${c.SKILL_MIN}" max="${lvl.skillCap}" data-cg="skills.${i}.val" value="${s.val || 0}" style="width:3.5em">
          <span class="cg-pool" title="Pool = ${s.val || 0} + ${c.attrValue(b, attrKey)} (${this._esc(attrKey)})">⚄ ${pool}</span>
          ${(s.val || 0) > lvl.skillCap ? '<span class="cg-error-text">&gt; plafond</span>' : ""}
          <button class="btn-icon-tiny danger" data-cg-action="remove-skill" data-idx="${i}" title="Retirer">✕</button>
          <div class="cluster cg-spec-line">
            ${(s.specs || []).map((sp) => `<span class="cg-spec-chip">◊ ${this._esc(sp)}<button class="cg-spec-x" data-cg-action="remove-spec" data-idx="${i}" data-spec="${this._esc(sp)}" title="Retirer">✕</button></span>`).join("")}
            <span class="cg-spec-add">
              <input type="text" id="cg-a1-spec-${i}" placeholder="Spécialisation…">
              <button class="btn-icon-tiny" data-cg-action="add-spec-sr" data-idx="${i}" ${peutSpe ? "" : "disabled"} title="1 point, indice ${c.SPEC_MIN_RANK} minimum, une seule pour tout le personnage">＋ spé</button>
            </span>
          </div>
        </div>`;
      })
      .join("");

    const opts = c
      .skillCatalog()
      .filter((sk) => !taken.has(sk.name))
      .map((sk) => `<option value="${this._esc(sk.name)}">${this._esc(sk.name)} (${this._esc(sk.attr)})</option>`)
      .join("");
    const knows = (b.knowledges || [])
      .map((k, i) => `<div class="cluster cg-list-row"><span>${this._esc(k)}</span><button class="btn-icon-tiny danger" data-cg-action="remove-knowledge" data-idx="${i}" title="Retirer">✕</button></div>`)
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("skills")}
      <p class="cg-hint">${c.MAX_SKILLS} compétences au maximum, indice ${c.SKILL_MIN} à ${lvl.skillCap} pour un ${this._esc(lvl.label)}. La réserve vaut ${total} points : ${lvl.skillPoints} du niveau de jeu, corrigés par le métatype et par l'armure choisie. Une <strong>seule</strong> spécialisation pour tout le personnage, à ${c.SPEC_COST} point, sur une compétence d'indice ${c.SPEC_MIN_RANK} minimum.</p>
      <div class="cg-section-label">Compétences <span class="cg-section-note">${used} / ${total} · ${(b.skills || []).length}/${c.MAX_SKILLS}</span></div>
      ${rows || '<p class="cg-hint">Aucune compétence.</p>'}
      <div class="cluster cg-add-row">
        <select id="cg-sr-skill-pick">${opts || "<option>— toutes prises —</option>"}</select>
        <button class="btn-secondary btn-small" data-cg-action="add-skill-sr" ${(b.skills || []).length >= c.MAX_SKILLS ? "disabled" : ""}>＋ Ajouter</button>
      </div>
      <div class="cg-section-label">Connaissance <span class="cg-section-note">les mots-clés en tiennent aussi lieu (p.78)</span></div>
      ${knows}
      <div class="cluster cg-add-row">
        <input type="text" id="cg-sr-knowledge" placeholder="ex. Gangs de Seattle…">
        <button class="btn-secondary btn-small" data-cg-action="add-knowledge-a1">＋ Ajouter</button>
      </div>
    </div>`;
  },

  /* ---- Étape : Atouts Anarchy 1 ----
     Les points d'Atouts ne paient pas que des Atouts : l'Éveil, la Chance,
     les contacts et les armes en plus s'y prennent aussi (p.78). Un écran qui
     ne montrerait que les Atouts cacherait la moitié de la dépense. */
  _render_edges_a1() {
    const c = this._creation();
    const b = this._build;
    const lvl = c.level(b);
    const sp = c.edgeSpends;
    const mv = c.metavariants[b.meta];

    const rows = (b.edges || [])
      .map((e, i) => `<div class="cluster cg-list-row"><span>${this._esc(e.text)}</span><span class="tag">niv. ${e.level || 1}</span>
        <button class="btn-icon-tiny danger" data-cg-action="remove-edge" data-idx="${i}" title="Retirer">✕</button></div>`)
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("edges")}
      <p class="cg-hint">${lvl.edgePoints} points d'Atouts pour un ${this._esc(lvl.label)}, ${c.MAX_EDGES} Atouts au maximum. Quels que soient vos choix, les modificateurs plafonnent à ±${c.edgeCaps.dice} dés, ${c.edgeCaps.rerollFailures} relances d'échecs, ${c.edgeCaps.rerollEnemySuccesses} relances de réussites adverses et ${c.edgeCaps.armor} points d'Armure.</p>
      ${mv ? `<p class="cg-hint">⚑ ${this._esc(b.meta)} impose l'Atout <strong>${this._esc(mv.edge.nom)}</strong> au niveau ${mv.edge.niveau}${mv.edge.niveau ? `, soit ${mv.edge.niveau} point(s) déjà engagés` : " — offert"}.</p>` : ""}
      ${rows || '<p class="cg-hint">Aucun Atout.</p>'}
      <div class="cluster cg-add-row">
        ${this._edgeSuggestions()}
        <input type="text" id="cg-edge-custom-label" list="cg-edge-suggestions" placeholder="Atout — tapez ou choisissez…">
        <input type="number" id="cg-edge-custom-level" min="1" value="1" style="width:4em">
        <button class="btn-secondary btn-small" data-cg-action="add-edge-custom">＋ Ajouter</button>
      </div>
      <div class="cg-section-label">Ce que les points d'Atouts achètent aussi</div>
      <div class="stack cg-field"><label>Chance supplémentaire (${sp.luckPer.cost} point par point, Chance actuelle ${c.luckValue(b)})</label>
        <input type="number" min="0" data-cg="luck" value="${b.luck || 0}" style="width:5em"></div>
      <div class="stack cg-field"><label>Contacts en plus (${sp.contactsPer.cost} point pour ${sp.contactsPer.gain})</label>
        <input type="number" min="0" step="${sp.contactsPer.gain}" data-cg="extraContacts" value="${b.extraContacts || 0}" style="width:5em"></div>
      <div class="stack cg-field"><label>Armes en plus (${sp.weaponsPer.cost} point pour ${sp.weaponsPer.gain})</label>
        <input type="number" min="0" step="${sp.weaponsPer.gain}" data-cg="extraWeapons" value="${b.extraWeapons || 0}" style="width:5em"></div>
      <p class="cg-hint">Points engagés : ${c.edgePointsUsed(b)} / ${lvl.edgePoints}${b.awakened ? ` — dont ${sp.awakened} pour l'Éveil` : ""}.</p>
    </div>`;
  },

  /* ---- Étape : équipement Anarchy 1 ----
     L'armure n'est pas un achat mais un CHOIX qui déplace des points de
     compétence : légère en rend un, lourde en coûte un (p.78). */
  _render_gear_a1() {
    const c = this._creation();
    const b = this._build;
    const lvl = c.level(b);
    const armes = (b.weapons || [])
      .map((w, i) => `<div class="cluster cg-list-row"><span>${this._esc(w.name)}</span><button class="btn-icon-tiny danger" data-cg-action="remove-weapon-a1" data-idx="${i}" title="Retirer">✕</button></div>`)
      .join("");
    const objets = (b.gear || [])
      .map((g, i) => `<div class="cluster cg-list-row"><span>${this._esc(g)}</span><button class="btn-icon-tiny danger" data-cg-action="remove-gear" data-idx="${i}" title="Retirer">✕</button></div>`)
      .join("");
    const armorOpts = Object.entries(c.armors)
      .map(([k, a]) => `<option value="${k}" ${b.armor === k ? "selected" : ""}>${this._esc(a.label)} — Armure ${a.armor}${a.skillPoints ? `, ${a.skillPoints > 0 ? "+" : ""}${a.skillPoints} point de compétence` : ""}</option>`)
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("gear")}
      <div class="stack cg-field"><label>Armure de départ — elle déplace vos points de compétence</label>
        <select data-cg="armor">${armorOpts}</select></div>
      <p class="cg-hint">Armure finale : <strong>${c.armorTotal(b)}</strong>${(c.metaEntry(b.meta) || {}).armor ? ` (dont +${c.metaEntry(b.meta).armor} de ${this._esc(b.meta)})` : ""}.</p>
      <div class="cg-section-label">Armes <span class="cg-section-note">${(b.weapons || []).length} / ${c.weaponsTotal(b)}</span></div>
      ${armes}
      <div class="cluster cg-add-row">
        <input type="text" id="cg-a1-weapon" placeholder="Nom de l'arme…">
        <button class="btn-secondary btn-small" data-cg-action="add-weapon-a1">＋ Ajouter</button>
      </div>
      <div class="cg-section-label">Équipement <span class="cg-section-note">${(b.gear || []).length} / ${lvl.gear}</span></div>
      ${objets}
      <div class="cluster cg-add-row">
        <input type="text" id="cg-gear-text" placeholder="Nom de l'équipement…">
        <button class="btn-secondary btn-small" data-cg-action="add-gear">＋ Ajouter</button>
      </div>
      <p class="cg-hint">Le commlink est toujours fourni, en plus de l'armure et des armes (p.78).</p>
    </div>`;
  },

  /* ---- Étape : parcours de vie SR5 ----
     Rien à voir avec celui de SR6, et c'est le livre qui l'impose. Ici les
     modules COÛTENT du karma sur 750, il n'y a pas de nombre d'emplacements,
     et les étapes Attributs/Compétences RESTENT : « le solde finalise le
     personnage, les modules laissant volontairement des attributs bas et des
     compétences hautes » (Run Faster p.158).

     Les gains sont affichés TELS QUE LE LIVRE LES ÉCRIT — « Logique +1,
     Connaissances : [Ville] +2, SINner (5) » — et non décomposés : les
     encadrés sont irréguliers (mots manquants, puces mixtes, lignes tronquées
     à la composition), et un analyseur silencieux y fabriquerait des
     personnages faux. Le meneur lit, applique, et garde la main. */
  _render_life_path_sr5() {
    const c = this._creation();
    const b = this._build;
    const LM = c.lifeModules;
    b.lifePath = b.lifePath || [];
    const parcours = c.lifePathKarmaUsed(b);
    const issues = c.lifePathIssues(b);
    const etat = c.lifePathApplyState(b);

    const rows = b.lifePath
      .map((sl, i) => {
        const m = sl && sl.id ? c.lifePathById(sl.id) : null;
        if (!m) return "";
        const lignes = (m.lignes || [])
          .filter((l) => l.valeur)
          .map((l) => `<li><strong>${this._esc(l.label)}</strong> — ${this._esc(l.valeur)}</li>`)
          .join("");
        const sous = (m.souslignes || []).length
          ? `<div class="cluster cg-add-row">
              <span class="cg-section-note">${this._esc((m.lignes.find((l) => !l.valeur) || {}).label || "Au choix")} :</span>
              <select data-cg-action="lp-sousligne" data-idx="${i}">
                <option value="">— à choisir —</option>
                ${m.souslignes.map((x) => `<option value="${this._esc(x.label)}" ${sl.sousligne === x.label ? "selected" : ""}>${this._esc(x.label)}</option>`).join("")}
              </select>
            </div>
            ${sl.sousligne ? `<p class="cg-hint">${this._esc((m.souslignes.find((x) => x.label === sl.sousligne) || {}).valeur || "")}</p>` : ""}`
          : "";
        /* Ce que l'application sait lire de la prose du livre, PROPOSÉ et non
           appliqué d'office ; et, sans le farder, ce qu'elle ne sait pas lire.
           Le texte du livre reste au-dessus : la proposition se relit contre
           lui, ce qui est toute la raison de ne pas avoir écrit un analyseur
           muet. */
        const gains = (c.lifePathGains(b) || []).find((g) => g.id === m.id);
        const gainsHtml = gains
          ? `${
              gains.effets.length
                ? `<div class="cg-lp-gains">${gains.effets
                    .map(
                      (e) =>
                        `<button class="cg-lp-gain${e.applique ? " applique" : ""}" data-cg-action="lp-apply" data-gid="${this._esc(e.gid)}" ${e.applique ? "disabled" : ""}>${e.applique ? "✓ " : "＋ "}${this._esc(e.label)}</button>`,
                    )
                    .join("")}</div>`
                : ""
            }
            ${
              gains.manuels.length
                ? `<p class="cg-hint">⚑ À reporter vous-même : ${this._esc(gains.manuels.join(" · "))}</p>`
                : ""
            }`
          : "";
        return `<div class="cg-lm-slot">
          <div class="cluster cg-lm-head">
            <span class="cg-lm-num">${i + 1}</span>
            <strong>${this._esc(m.nom)}</strong>
            <span class="tag">${m.karma} karma</span>
            <span class="cg-section-note">${this._esc(m.section)}</span>
            <button class="btn-icon-tiny danger" data-cg-action="lp-remove" data-idx="${i}" title="Retirer">✕</button>
          </div>
          <ul class="cg-lm-list">${lignes}</ul>
          ${sous}
          ${gainsHtml}
          ${m.special ? `<p class="cg-lm-special">⚑ ${this._esc(m.special)}</p>` : ""}
        </div>`;
      })
      .join("");

    const groupes = c
      .lifePathCatalog()
      .map(
        (g) =>
          `<optgroup label="${this._esc(g.section)}">${g.modules
            .map((m) => `<option value="${this._esc(m.id)}">${this._esc(m.nom)} (${m.karma})</option>`)
            .join("")}</optgroup>`,
      )
      .join("");

    return `<div class="stack">
      ${this._stepErrorBox("modules")}
      <p class="cg-hint">On compose une vie, on ne répartit pas des points : chaque module coûte du karma sur les ${LM.karma}. L'ordre de choix raconte le parcours. Le solde finalise ensuite le personnage aux étapes Attributs et Compétences — le livre laisse volontairement les attributs bas.</p>
      ${issues.length ? `<div class="stack cg-step-errors">${issues.map((t) => `<div class="cg-hint">⚑ ${this._esc(t)}</div>`).join("")}</div>` : ""}
      <div class="cg-section-label">Parcours <span class="cg-section-note">${b.lifePath.filter((x) => x && x.id).length} modules · ${parcours} karma</span></div>
      ${
        etat.lisibles || etat.manuels
          ? `<div class="cluster cg-add-row">
              <span class="cg-section-note">Gains reportés : ${etat.appliques} / ${etat.lisibles} lisibles${etat.manuels ? ` · ${etat.manuels} ligne(s) à la main` : ""}</span>
              ${etat.appliques < etat.lisibles ? `<button class="btn-secondary btn-small" data-cg-action="lp-apply-all">＋ Tout reporter</button>` : ""}
            </div>
            <p class="cg-hint">Ces gains sont PAYÉS par le karma des modules : les reporter ne consomme rien de plus. Le solde ne sert qu'à ce que vous ajoutez par-dessus.</p>`
          : ""
      }
      ${rows || '<p class="cg-hint">Parcours vide. Commencez par une nationalité.</p>'}
      <div class="cluster cg-add-row">
        <select id="cg-lp-pick">${groupes}</select>
        <button class="btn-secondary btn-small" data-cg-action="lp-add">＋ Ajouter au parcours</button>
      </div>
      <p class="cg-hint">Plafonds propres à cette méthode : compétence active ${LM.skillCap} — l'excédent est <strong>transféré</strong> à une compétence du même attribut, pas perdu — connaissances ${LM.knowledgeCap}, et tout rang d'attribut au-delà du maximum du métatype est <strong>perdu</strong>.</p>
    </div>`;
  },

  /* ---- Étape : parcours de vie (SR6, modules chronologiques) ----
     Trois modules imposés, puis huit emplacements adultes. Chaque option d'un
     module est un vrai choix à résoudre ICI : sans ça, `validate()` passerait
     sur un parcours complet mais vide de décisions — le « faux vert » où le
     critère de succès est une absence d'erreur et qu'un objet vide satisfait
     aussi bien qu'un objet correct. */
  _render_life_modules() {
    const c = this._creation();
    const b = this._build;
    const LM = c.lifeModules;
    const cat = c.lifeModuleCatalog(b);
    const grants = c.lifeModuleGrants(b);
    b.lifeModules = b.lifeModules || [];

    b.lifeImposed = b.lifeImposed || { croissanceSkills: [], talent: "", bestAttr: "" };
    const imp = b.lifeImposed;
    const sel = (action, val, options, vide) =>
      `<select data-cg-action="${action}">
        <option value="">${this._esc(vide)}</option>
        ${options.map((o) => `<option value="${this._esc(o)}" ${val === o ? "selected" : ""}>${this._esc(o)}</option>`).join("")}
      </select>`;

    const imposes = LM.imposed
      .map((m) => {
        const bits = [];
        if (m.skillCount) {
          for (let k = 0; k < m.skillCount; k++) {
            bits.push({ html: `compétence ${k + 1} au rang ${m.skillRank} : ${sel(`lm-croissance-${k}`, imp.croissanceSkills[k], m.skillPool, "— à choisir —")}` });
          }
        }
        if (m.talentRank) {
          bits.push({ html: `talent principal (rang ${m.talentRank}, ${m.talentRankIfRepeated} s'il vient de la Croissance) : ${sel("lm-talent", imp.talent, c.SKILLS.map((x) => x.name), "— à choisir —")}` });
        }
        if (m.bestAttrBonus) {
          bits.push({ html: `meilleur attribut, +${m.bestAttrBonus} : ${sel("lm-bestattr", imp.bestAttr, c.ATTRS, "— à choisir —")}` });
        }
        if (m.nuyen) bits.push(`+${m.nuyen.toLocaleString("fr-FR")} ¥`);
        if (m.contact) bits.push(`un contact à ${m.contact.points} points (minimum ${m.contact.minEach} par indice)`);
        if (m.knowledge) bits.push(`connaissance ${m.knowledge}`);
        (m.effects || []).forEach((e) => bits.push(e));
        const li = bits
          .map((x) => (typeof x === "string" ? `<li>${this._esc(x)}</li>` : `<li>${x.html}</li>`))
          .join("");
        return `<div class="cg-lm-imposed"><strong>${this._esc(m.label)}</strong>
          <span class="cg-section-note">${this._esc(m.hint)}</span>
          <ul class="cg-lm-list">${li}</ul></div>`;
      })
      .join("");

    /* `parmi` est une liste de paires {value, label} : ce que le moteur
       applique n'est PAS toujours ce que le joueur lit. Le livre écrit « votre
       Magie (Éveillé uniquement) » — la parenthèse est une condition d'accès,
       pas une partie du code. Rendre le libellé comme valeur faisait écrire un
       attribut fantôme que rien ne relisait. Ne pas resimplifier en une seule
       chaîne. */
    const choixSelect = (slotIdx, kind, optIdx, parmi, valeur) =>
      `<select class="cg-lm-choice" data-cg-action="lm-choice" data-idx="${slotIdx}" data-kind="${kind}" data-opt="${optIdx}">
        ${parmi
          .map((o) => `<option value="${this._esc(o.value)}" ${valeur === o.value ? "selected" : ""}>${this._esc(o.label)}</option>`)
          .join("")}
      </select>`;

    const slots = [];
    for (let i = 0; i < LM.adultSlots; i++) {
      const slot = b.lifeModules[i] || null;
      const m = slot && slot.id ? c.lifeModuleById(slot.id) : null;
      const opts = cat
        .map((x) => `<option value="${this._esc(x.id)}" ${m && m.id === x.id ? "selected" : ""}>${this._esc(x.nom)}${x.type === "evenement" ? " (événement)" : ""}</option>`)
        .join("");
      let detail = "";
      if (m) {
        const lignes = [];
        (m.attrs || []).forEach((a, k) => {
          const parmi = c.expandParmi(a.parmi, "attrs", b);
          lignes.push(`<li>+${a.n} à ${choixSelect(i, "attrs", k, parmi, slot.attrs && slot.attrs[k])}</li>`);
        });
        (m.skills || []).forEach((sk, k) => {
          const n = sk.pour === 2 ? "deux compétences" : "une compétence";
          const parmi = c.expandParmi(sk.parmi, "skills", b);
          lignes.push(`<li>+${sk.n} rang à ${n} : ${choixSelect(i, "skills", k, parmi, slot.skills && slot.skills[k])}</li>`);
        });
        if (m.know) {
          const opts = m.know.parmi
            .concat(m.know.ouLangue ? ["— un rang de Langue —"] : [])
            .map((o) => ({ value: o, label: o }));
          lignes.push(`<li>connaissance : ${choixSelect(i, "know", 0, opts, slot.know)}</li>`);
        }
        if (m.nuyen) lignes.push(`<li>+${m.nuyen.toLocaleString("fr-FR")} ¥</li>`);
        if (m.contactPts) lignes.push(`<li>${m.contactPts} points de contacts${m.contactCats ? ` (${this._esc(m.contactCats.join(", "))})` : ""}</li>`);
        if (m.special) lignes.push(`<li class="cg-lm-special">⚑ ${this._esc(m.special)}</li>`);
        detail = `<ul class="cg-lm-list">${lignes.join("")}</ul>`;
      }
      slots.push(`<div class="cg-lm-slot">
        <div class="cluster cg-lm-head">
          <span class="cg-lm-num">${i + 1}</span>
          <select data-cg-action="lm-pick" data-idx="${i}">
            <option value="">— emplacement libre —</option>${opts}
          </select>
          ${m ? `<button class="btn-icon-tiny danger" data-cg-action="lm-clear" data-idx="${i}" title="Vider">✕</button>` : ""}
        </div>
        ${detail}
      </div>`);
    }

    return `<div class="stack">
      ${this._stepErrorBox("modules")}
      <p class="cg-hint">Trois modules imposés, puis <strong>exactement ${LM.adultSlots}</strong> modules d'âge adulte — ni plus, ni moins, et un seul peut être pris deux fois. L'ordre raconte votre vie. Les ressources s'additionnent et ne se dépensent qu'à la fin.</p>
      <div class="cg-section-label">Les trois premiers, imposés</div>
      ${imposes}
      ${(grants.overflow || []).length ? `<div class="stack cg-step-errors"><div class="cg-hint">⚑ Rangs perdus au plafond : ${this._esc(grants.overflow.join(" · "))}. Le parcours donne plus que le métatype ne peut porter — c'est légal, mais l'excédent ne compte pas.</div></div>` : ""}
      <div class="cg-section-label">Âge adulte <span class="cg-section-note">${grants.modules}/${LM.adultSlots} · ${grants.nuyen.toLocaleString("fr-FR")} ¥ · ${grants.contactPts} points de contacts</span></div>
      ${slots.join("")}
      <p class="cg-hint">Dans cette méthode, le Charisme n'apporte aucun point de contacts et ne plafonne plus les indices : ce sont les modules qui les donnent, et le plafond est ${LM.contacts.ratingCap}.</p>
    </div>`;
  },

  /* ---- Étape : Narratif (p.50-51) ---- */
  _render_narrative() {
    const b = this._build;
    const roles = ["Métatype", "Origine", "Rôle", "Train de vie", "Libre"];
    // Suggestion par défaut (une seule fois) : le mot-clé 1 reprend le métatype.
    if (!b.keywords[0]) {
      b.keywords[0] = b.meta;
      this._saveDraft();
    }
    const kwFields = b.keywords
      .map(
        (v, i) =>
          `<label class="stack cg-narrative-field">
            <span class="cg-narrative-role">${this._esc(roles[i] || `Mot-clé ${i + 1}`)}</span>
            <input type="text" data-cg="keywords.${i}" data-cg-rerender="false" value="${this._esc(v)}" placeholder="${this._esc(roles[i] || `Mot-clé ${i + 1}`)}">
          </label>`,
      )
      .join("");
    const bhFields = b.behaviors
      .map(
        (v, i) =>
          `<input type="text" data-cg="behaviors.${i}" data-cg-rerender="false" value="${this._esc(v)}" placeholder="Comportement ${i + 1}">`,
      )
      .join("");
    const qFields = b.quotes
      .map(
        (v, i) =>
          `<input type="text" data-cg="quotes.${i}" data-cg-rerender="false" value="${this._esc(v)}" placeholder="Réplique ${i + 1}">`,
      )
      .join("");
    const diceBtn = (field) =>
      `<button class="btn-secondary btn-small cg-dice-btn" data-cg-action="draw-narrative" data-field="${field}" title="Remplit les champs vides">⚄ Inspiration</button>`;

    return `<div class="stack">
      <div class="cg-section-label">5 mots-clés (p.50-51) ${diceBtn("keywords")}</div>
      <div class="cg-narrative-grid">${kwFields}</div>
      <div class="cg-section-label">4 comportements ${diceBtn("behaviors")}</div>
      <div class="cg-narrative-grid">${bhFields}</div>
      <div class="cg-section-label">4 répliques ${diceBtn("quotes")}</div>
      <div class="cg-narrative-grid">${qFields}</div>
      <p class="cg-hint">Le mot-clé « Train de vie » sert aussi de train de vie du personnage.</p>
    </div>`;
  },

  /* ---- Étape : Contacts ---- */
  /* ---- Étape : contacts ----
     Les champs sont déclarés par le module : Anarchy nomme des contacts du
     Réseau (narratif, p.61), SR5 leur donne Connexion et Loyauté chiffrées et
     les paie en karma (Charisme × 3, p.100). Le libellé « Réseau » s'affichait
     tel quel en SR5 avant d'être rendu au contrat. */
  _render_contacts() {
    const c = this._creation();
    const b = this._build;
    const fields = c.contactFields ? c.contactFields() : [
      { key: "name", placeholder: "Nom" },
      { key: "description", placeholder: "Description" },
    ];
    const rows = (b.contacts || [])
      .map(
        (ct, i) =>
          `<div class="cluster cg-list-row">
            ${fields
              .map((f) =>
                f.type === "number"
                  ? `<input type="number" min="${f.min ?? 1}" max="${f.max ?? 12}" data-cg="contacts.${i}.${f.key}" value="${ct[f.key] ?? f.min ?? 1}" style="width:4.5em" title="${this._esc(f.placeholder)}">`
                  : `<input type="text" data-cg="contacts.${i}.${f.key}" data-cg-rerender="false" value="${this._esc(ct[f.key] || "")}" placeholder="${this._esc(f.placeholder)}">`,
              )
              .join("")}
            <button class="btn-icon-tiny danger" data-cg-action="remove-contact" data-idx="${i}" title="Retirer">✕</button>
          </div>`,
      )
      .join("");
    const hint = c.contactsHint ? c.contactsHint(b) : "";
    return `<div class="stack">
      ${hint ? `<p class="cg-hint">${this._esc(hint)}</p>` : ""}
      ${rows}
      <button class="btn-secondary btn-small" data-cg-action="add-contact">＋ Ajouter un contact</button>
    </div>`;
  },

  /* ---- Étape : Révision ---- */
  _render_review() {
    return `<div class="stack">
      <div id="cg-review-errors" class="stack cg-review-errors"></div>
      <div id="cg-review-card" class="cg-review-card"></div>
    </div>`;
  },

  _mountReview() {
    const c = this._creation();
    const clean = this._cleanBuild(this._build);
    const stepErr = c.stepErrors(clean);
    const errBox = document.getElementById("cg-review-errors");
    if (errBox) {
      const items = [];
      this._steps().forEach((step, idx) => {
        (stepErr[step.id] || []).forEach((e) => {
          items.push(
            `<div class="cg-error cg-error-link" data-cg-action="goto" data-idx="${idx}" title="Aller à l'étape ${this._esc(step.label)}">⚠ ${this._esc(e)} <span class="cg-error-goto">→ ${this._esc(step.label)}</span></div>`,
          );
        });
      });
      // Dépassement du budget global : il n'a pas d'étape dédiée, et la
      // jauge du module sait déjà le dire (`over`) dans son unité — nuyen
      // ici, points de priorité ou karma ailleurs.
      const headline = c.budget(clean).headline;
      if (headline && headline.over) {
        items.push(`<div class="cg-error">⚠ Budget dépassé : ${this._esc(headline.label)}.</div>`);
      }
      errBox.innerHTML = items.length ? items.join("") : '<div class="cg-ok">✓ Personnage valide.</div>';
    }
    const holder = document.getElementById("cg-review-card");
    if (holder) {
      holder.innerHTML = "";
      const preview = c.buildCharacter(clean);
      holder.appendChild(CardRenderer.render(preview, []));
    }
  },

  /* ---- Sauvegarde / abandon ---- */
  _save() {
    const c = this._creation();
    const clean = this._cleanBuild(this._build);
    const errors = c.validate(clean);
    if (errors.length) {
      toast("Corrigez les erreurs avant de créer le personnage.");
      return;
    }
    const pnj = c.buildCharacter(clean);
    Characters.add(pnj);
    const nbContacts = this._persistContacts(c, clean, pnj);
    this._clearDraft();
    this.close();
    App.showPanel("characters");
    if (nbContacts) {
      toast(`Personnage créé, ${nbContacts} contact${nbContacts > 1 ? "s" : ""} ajouté${nbContacts > 1 ? "s" : ""} au carnet.`);
    }
  },

  /** Les contacts saisis dans l'assistant DOIVENT rejoindre le carnet.

      Avant le 2026-09-09 ils étaient posés sur `pnj.contacts` et personne ne
      lisait ce champ : le meneur les saisissait, l'assistant les acceptait,
      et ils disparaissaient sans un mot. Le mécanisme existait pourtant —
      `ContactsBook.createManual` puis un lien `RelationsStore`, que la carte
      du PJ sait déjà afficher.

      La traduction des champs appartient à l'ÉDITION (`contactToManual`) :
      SR5/SR6 stockent Influence + Loyauté, Anarchy un niveau d'atout + RR.
      Le contrôleur ne connaît aucun de ces noms. */
  _persistContacts(creation, clean, pnj) {
    const liste = (clean.contacts || []).filter((x) => x && x.name && x.name.trim());
    if (!liste.length || !creation.contactToManual) return 0;
    const ids = [];
    for (const brut of liste) {
      try {
        const cree = ContactsBook.createManual(creation.contactToManual(brut), App.edition);
        if (cree && cree.id) ids.push(cree.id);
      } catch (e) {
        Debug?.warn?.("chargen: contact non créé", e);
      }
    }
    if (ids.length) Characters.addContactLinks(pnj.id, ids);
    return ids.length;
  },

  _discard() {
    Dialog.confirm({
      title: "Abandonner la création",
      message: "Abandonner ce personnage en cours de création ? Le brouillon sera perdu.",
      confirmLabel: "Abandonner",
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      this._clearDraft();
      this.close();
    });
  },

  /* ---- Liaison générique des champs scalaires (data-cg) ---- */
  _applyField(el) {
    const path = el.dataset.cg;
    let val;
    if (el.type === "checkbox") val = el.checked;
    else if (el.type === "number") val = Number(el.value);
    else val = el.value;
    if (path === "awakened" && val === "") val = null;
    if (path.startsWith("attrs.") || path.startsWith("special.")) {
      const key = path.split(".")[1];
      const [min, max] = this._creation().attrRangeFor(this._build, key);
      val = Utils.clamp(val, min, max);
    }
    this._setPath(this._build, path, val);
    // Le 4e mot-clé (Train de vie) alimente aussi le champ lifestyle du PJ.
    if (path === "keywords.3") this._build.lifestyle = val;
    this._saveDraft();
    if (el.dataset.cgRerender === "false") this._renderBudget();
    else this._renderAll();
  },

  /* ---- Actions structurelles (data-cg-action) ---- */
  _handleAction(el) {
    const action = el.dataset.cgAction;
    const b = this._build;
    const c = this._creation();
    const afterMutate = () => {
      this._saveDraft();
      this._renderSteps();
      this._renderStep();
      this._renderBudget();
    };

    switch (action) {
      case "goto":
        this._step = Number(el.dataset.idx);
        this._renderAll();
        break;
      case "next":
        this._step = Math.min(this._step + 1, this._steps().length - 1);
        this._renderAll();
        break;
      case "prev":
        this._step = Math.max(this._step - 1, 0);
        this._renderAll();
        break;
      case "discard":
        this._discard();
        break;
      case "save":
        this._save();
        break;
      case "restart":
        this._build = c.newBuild();
        this._clearDraft();
        this._resumed = false;
        this._step = 0;
        this._renderAll();
        break;
      case "dismiss-resume":
        this._resumed = false;
        this._renderStep();
        break;
      case "apply-preset": {
        const preset = (c.presets || []).find((p) => p.id === el.dataset.id);
        if (!preset) break;
        // Repart d'un brouillon neuf, décliné pour le niveau de jeu choisi.
        // Le module est seul à savoir comment un preset devient un brouillon
        // (et seul à le DÉTACHER du catalogue livré) : ne pas remonter cette
        // expression ici, le garde-fou de tests/ lit la même.
        this._build = c.buildFromPreset(preset.id, b.gameLevel);
        // Normalise l'attribut + les spés (specs[]) de chaque compétence.
        this._build.skills = this._normalizeSkillSpecs(
          (this._build.skills || []).map((s) => {
            const def = c.skills.find((d) => d.name === s.name);
            return { ...s, attr: s.attr || def?.attr };
          }),
        );
        this._resumed = false;
        this._saveDraft();
        this._step = this._steps().findIndex((s) => s.id === "attrs");
        this._renderAll();
        toast(`Preset « ${preset.label} » appliqué.`);
        break;
      }
      case "draw-narrative": {
        const field = el.dataset.field;
        const sug = c.drawNarrative(b);
        const arr = b[field];
        (sug[field] || []).forEach((val, i) => {
          if (i < arr.length && !(arr[i] && arr[i].trim())) {
            arr[i] = val;
            if (field === "keywords" && i === 3) b.lifestyle = val;
          }
        });
        afterMutate();
        break;
      }

      case "attr-inc":
      case "attr-dec": {
        const key = el.dataset.key;
        const path = el.dataset.path || `attrs.${key}`;
        const [min, max] = c.attrRangeFor(b, key);
        const delta = action === "attr-inc" ? 1 : -1;
        const parts = path.split(".");
        const holder = parts.slice(0, -1).reduce((o, k) => (o[k] = o[k] || {}), b);
        const leaf = parts[parts.length - 1];
        holder[leaf] = Utils.clamp((holder[leaf] ?? min) + delta, min, max);
        this._saveDraft();
        this._renderAll();
        break;
      }

      case "add-knowledge-a1": {
        const inp = document.getElementById("cg-sr-knowledge");
        const txt = (inp?.value || "").trim();
        if (txt) {
          b.knowledges = b.knowledges || [];
          b.knowledges.push(txt);
          if (inp) inp.value = "";
          afterMutate();
        }
        break;
      }
      case "add-weapon-a1": {
        const inp = document.getElementById("cg-a1-weapon");
        const txt = (inp?.value || "").trim();
        if (txt) {
          b.weapons = b.weapons || [];
          b.weapons.push({ name: txt });
          if (inp) inp.value = "";
          afterMutate();
        }
        break;
      }
      case "remove-weapon-a1":
        b.weapons.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;

      case "lp-add": {
        const sel = document.getElementById("cg-lp-pick");
        if (sel?.value) {
          b.lifePath = b.lifePath || [];
          b.lifePath.push({ id: sel.value, sousligne: null });
          afterMutate();
        }
        break;
      }
      case "lp-remove":
        b.lifePath.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;
      case "lp-sousligne": {
        const sl = (b.lifePath || [])[Number(el.dataset.idx)];
        if (sl) {
          sl.sousligne = el.value || null;
          afterMutate();
        }
        break;
      }

      case "lm-talent":
      case "lm-bestattr": {
        b.lifeImposed = b.lifeImposed || { croissanceSkills: [], talent: "", bestAttr: "" };
        b.lifeImposed[action === "lm-talent" ? "talent" : "bestAttr"] = el.value;
        afterMutate();
        break;
      }

      case "lm-pick": {
        const i = Number(el.dataset.idx);
        b.lifeModules = b.lifeModules || [];
        b.lifeModules[i] = el.value ? { id: el.value, attrs: [], skills: [], know: null } : null;
        afterMutate();
        break;
      }
      case "lm-clear": {
        b.lifeModules[Number(el.dataset.idx)] = null;
        afterMutate();
        break;
      }
      case "lm-croissance-0":
      case "lm-croissance-1":
      case "lm-croissance-2":
      case "lm-croissance-3": {
        b.lifeImposed = b.lifeImposed || { croissanceSkills: [], talent: "", bestAttr: "" };
        b.lifeImposed.croissanceSkills[Number(action.slice(-1))] = el.value;
        afterMutate();
        break;
      }

      case "lm-choice": {
        const i = Number(el.dataset.idx);
        const slot = (b.lifeModules || [])[i];
        if (!slot) break;
        const k = el.dataset.kind;
        if (k === "know") slot.know = el.value;
        else {
          slot[k] = slot[k] || [];
          slot[k][Number(el.dataset.opt)] = el.value;
        }
        this._saveDraft();
        this._renderBudget();
        break;
      }

      case "set-priority": {
        b.priorities[el.dataset.col] = el.dataset.letter;
        afterMutate();
        break;
      }
      case "add-skill-sr": {
        const sel = document.getElementById("cg-sr-skill-pick");
        const def = c.skillCatalog().find((d) => d.name === sel?.value);
        if (def) {
          b.skills.push({ name: def.name, val: 1, attr: def.attr, specs: [] });
          afterMutate();
        }
        break;
      }
      case "add-spec-sr": {
        const i = Number(el.dataset.idx);
        const inp =
          document.getElementById(`cg-sr-spec-${i}`) || document.getElementById(`cg-a1-spec-${i}`);
        const txt = (inp?.value || "").trim();
        if (txt) {
          b.skills[i].specs = b.skills[i].specs || [];
          if (!b.skills[i].specs.includes(txt)) b.skills[i].specs.push(txt);
          afterMutate();
        }
        break;
      }
      case "add-group": {
        const sel = document.getElementById("cg-sr-group-pick");
        if (sel?.value) {
          b.groups = b.groups || [];
          if (!b.groups.some((g) => g.name === sel.value)) b.groups.push({ name: sel.value, val: 1 });
          afterMutate();
        }
        break;
      }
      case "remove-group":
        b.groups.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;
      case "add-knowledge-sr": {
        const inp = document.getElementById("cg-sr-knowledge");
        const txt = (inp?.value || "").trim();
        if (txt) {
          b.knowledges = b.knowledges || [];
          b.knowledges.push({ name: txt, val: 1 });
          if (inp) inp.value = "";
          afterMutate();
        }
        break;
      }
      // `add-gear-sr` a disparu avec le `<select>` du catalogue : le
      // sélecteur cherchable ajoute directement (cf. `pick-gear`). Reste la
      // saisie libre, qui garde sa raison d'être — tout n'est pas catalogué.
      case "add-gear-free": {
        const src = document.getElementById("cg-sr-gear-free");
        const txt = (src?.value || "").trim();
        if (txt) {
          b.gear = b.gear || [];
          b.gear.push({ name: txt, cost: 0, availability: null });
          if (src) src.value = "";
          afterMutate();
        }
        break;
      }

      case "add-skill": {
        const sel = document.getElementById("cg-skill-pick");
        const def = c.skills.find((d) => d.name === sel?.value);
        if (def) {
          b.skills.push({ name: def.name, val: 1, attr: def.attr, specs: [] });
          afterMutate();
        }
        break;
      }
      case "remove-skill":
        b.skills.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;

      case "add-knowledge": {
        const inp = document.getElementById("cg-knowledge-text");
        const val = inp?.value?.trim();
        if (val) {
          b.knowledges = b.knowledges || [];
          b.knowledges.push(val);
          afterMutate();
        }
        break;
      }
      case "remove-knowledge":
        b.knowledges.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;

      case "add-spec": {
        const i = Number(el.dataset.idx);
        const s = b.skills[i];
        const sel = document.getElementById(`cg-skill-spec-pick-${i}`);
        const sp = sel?.value;
        if (s && sp && (s.val || 0) >= 1) {
          s.specs = s.specs || [];
          if (!s.specs.includes(sp)) s.specs.push(sp);
          afterMutate();
        }
        break;
      }
      case "remove-spec": {
        const s = b.skills[Number(el.dataset.idx)];
        if (s && s.specs) {
          s.specs = s.specs.filter((sp) => sp !== el.dataset.spec);
          afterMutate();
        }
        break;
      }

      case "add-edge-rrspec": {
        const sel = document.getElementById("cg-edge-spec-pick");
        const [idxStr, spec] = (sel?.value || "").split("::");
        const s = b.skills[Number(idxStr)];
        const tpl = c.edgeTemplates.find((t) => t.id === "rr-spec");
        if (s && spec && tpl) {
          // rr structuré → permet la validation des plafonds par niveau.
          b.edges.push({ level: tpl.level, text: tpl.text(s.name, spec), rr: { skill: s.name, spec, amount: 1 } });
          afterMutate();
        }
        break;
      }
      case "add-edge-rrskill": {
        const sel = document.getElementById("cg-edge-skill-pick");
        const s = b.skills[Number(sel?.value)];
        const tpl = c.edgeTemplates.find((t) => t.id === "rr-skill");
        if (s && tpl) {
          b.edges.push({ level: tpl.level, text: tpl.text(s.name), rr: { skill: s.name, spec: null, amount: 1 } });
          afterMutate();
        }
        break;
      }
      case "add-edge-custom": {
        const label = document.getElementById("cg-edge-custom-label")?.value?.trim();
        const lvl = Number(document.getElementById("cg-edge-custom-level")?.value) || 1;
        if (label) {
          b.edges.push({ level: lvl, text: label });
          afterMutate();
        }
        break;
      }
      case "remove-edge":
        b.edges.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;

      case "lp-apply":
        c.applyLifePathGain(b, el.dataset.gid);
        afterMutate();
        break;
      case "lp-apply-all": {
        for (const mod of c.lifePathGains(b)) {
          for (const e of mod.effets) c.applyLifePathGain(b, e.gid);
        }
        afterMutate();
        break;
      }
      case "add-mod": {
        const i = Number(el.dataset.idx);
        // ⚠ `overlay()` n'est pas dans la portée de `_handleAction` : les
        // autres cas y passent tous par `document`. S'aligner, pas inventer.
        const sel = document.querySelector(`[data-cg-mod-pick="${i}"]`);
        const id = sel && sel.value;
        const g = (b.gear || [])[i];
        if (g && id) {
          g.mods = g.mods || [];
          if (!g.mods.includes(id)) g.mods.push(id);
          afterMutate();
        }
        break;
      }
      case "remove-mod": {
        const g = (b.gear || [])[Number(el.dataset.idx)];
        if (g && g.mods) {
          g.mods = g.mods.filter((x) => x !== el.dataset.mod);
          afterMutate();
        }
        break;
      }
      case "pick-gear": {
        const nom = el.dataset.name;
        b.gear = b.gear || [];
        // `kind` = la clé du catalogue (« pistoletsLourds ») : c'est elle qui
        // dit le TYPE de l'arme, donc ses emplacements de modification.
        if (!b.gear.some((g) => g.name === nom)) b.gear.push({ name: nom, cost: 0, ...(el.dataset.kind ? { kind: el.dataset.kind } : {}) });
        afterMutate();
        break;
      }
      case "pick-trait": {
        const ref = (c.traitCatalog() || [])
          .flatMap((g) => g.items)
          .find((x) => x.label === el.dataset.name);
        const t = ref && c.traitById(ref.id);
        if (t) {
          b.traits = b.traits || [];
          const k0 = Array.isArray(t.karma) ? t.karma[0] : t.karma;
          if (!b.traits.some((x) => x.id === t.id)) b.traits.push({ id: t.id, karma: k0 });
          afterMutate();
        }
        break;
      }
      case "add-trait-libre": {
        const nom = document.getElementById("cg-a1-trait-libre")?.value?.trim();
        const type = document.getElementById("cg-a1-trait-type")?.value || "avantage";
        if (nom) {
          b.traits = b.traits || [];
          b.traits.push({ id: `libre_${nom.toLowerCase().replace(/\W+/g, "_")}`, nom, type, effet: "" });
          afterMutate();
        }
        break;
      }
      case "remove-trait":
        b.traits.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;
      case "karma-buy":
        c.applyKarmaBuy(b, el.dataset.kind, el.dataset.name);
        afterMutate();
        break;
      case "karma-undo":
        c.undoKarmaBuy(b, el.dataset.kind, el.dataset.name);
        afterMutate();
        break;
      case "toggle-magic": {
        // Depuis un bouton retenu (data-kind direct) ou depuis le sélecteur,
        // dont l'identifiant porte la réserve : « magic-<kind> ».
        const kind = el.dataset.kind || el.closest("[data-pick]")?.dataset.pick?.replace(/^magic-/, "");
        const name = el.dataset.name;
        const liste = b[kind] || [];
        b[kind] = liste.includes(name) ? liste.filter((x) => x !== name) : [...liste, name];
        afterMutate();
        break;
      }
      case "set-magic-option": {
        b.magicOption = b.magicOption === el.dataset.key ? "" : el.dataset.key;
        afterMutate();
        break;
      }
      case "toggle-spell": {
        const name = el.dataset.name;
        b.spells = b.spells.includes(name) ? b.spells.filter((n) => n !== name) : [...b.spells, name];
        afterMutate();
        break;
      }
      case "draw-mentor": {
        const mentor = c.drawMentor(b.awakened);
        if (mentor) b.mentorSpirit = mentor;
        else toast("Aucun esprit mentor cette fois — retentez.");
        afterMutate();
        break;
      }
      case "clear-mentor":
        b.mentorSpirit = null;
        afterMutate();
        break;

      case "toggle-weapon": {
        const name = el.dataset.name;
        b.weapons = b.weapons.some((w) => w.name === name)
          ? b.weapons.filter((w) => w.name !== name)
          : [...b.weapons, { name }];
        afterMutate();
        break;
      }
      case "add-gear": {
        const inp = document.getElementById("cg-gear-text");
        const val = inp?.value?.trim();
        if (val) {
          b.gear = b.gear || [];
          b.gear.push(val);
          afterMutate();
        }
        break;
      }
      case "remove-gear":
        b.gear.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;

      case "add-contact":
        b.contacts = b.contacts || [];
        b.contacts.push({ name: "", description: "" });
        afterMutate();
        break;
      case "remove-contact":
        b.contacts.splice(Number(el.dataset.idx), 1);
        afterMutate();
        break;
    }
  },

  /* ---- Délégation scopée à #chargen-overlay ---- */
  _delegated: false,
  bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;
    const overlay = () => document.getElementById("chargen-overlay");

    document.addEventListener("change", (e) => {
      // Un <select> peut porter une ACTION plutôt qu'une liaison de champ
      // (choix d'un module de parcours) : il se déclenche au change, pas au
      // click — au click, sa valeur n'a pas encore changé.
      const act = e.target.closest("[data-cg-action]");
      if (act && overlay()?.contains(act) && act.tagName === "SELECT") {
        this._handleAction(act);
        return;
      }
      const el = e.target.closest("[data-cg]");
      if (!el || !overlay()?.contains(el)) return;
      this._applyField(el);
    });
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-cg-action]");
      if (!el || !overlay()?.contains(el)) return;
      this._handleAction(el);
    });
    // Entrée dans un champ « ＋ Ajouter » déclenche l'ajout correspondant.
    const ENTER_ADD = {
      "cg-gear-text": "add-gear",
      "cg-knowledge-text": "add-knowledge",
      "cg-edge-custom-label": "add-edge-custom",
      "cg-edge-custom-level": "add-edge-custom",
    };
    /* Filtrage des sélecteurs de catalogue. On masque les entrées déjà
       rendues plutôt que de redessiner : redessiner à chaque frappe ferait
       perdre le focus et la position du curseur. */
    const filtrer = (id) => {
      const root = overlay()?.querySelector(`[data-pick="${id}"]`);
      if (!root) return;
      const q = (root.querySelector("[data-pick-search]")?.value || "").trim().toLowerCase();
      const cat = root.querySelector("[data-pick-cat]")?.value || "";
      let vus = 0;
      for (const el of root.querySelectorAll(".cg-pick-item")) {
        const ok =
          (!q || (el.dataset.hay || "").includes(q)) && (!cat || el.dataset.cat === cat);
        el.hidden = !ok;
        if (ok) vus++;
      }
      const vide = root.parentElement?.querySelector(".cg-pick-empty") || root.querySelector(".cg-pick-empty");
      if (vide) vide.hidden = vus > 0;
    };
    document.addEventListener("input", (e) => {
      const id = e.target?.dataset?.pickSearch;
      if (id && overlay()?.contains(e.target)) filtrer(id);
    });
    document.addEventListener("change", (e) => {
      const id = e.target?.dataset?.pickCat;
      if (id && overlay()?.contains(e.target)) filtrer(id);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
      const ov = overlay();
      if (!ov?.contains(e.target)) return;
      const action = ENTER_ADD[e.target.id];
      if (!action) return;
      e.preventDefault();
      const btn = ov.querySelector(`[data-cg-action="${action}"]`);
      if (btn) this._handleAction(btn);
    });
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.CharGen = CharGen;
