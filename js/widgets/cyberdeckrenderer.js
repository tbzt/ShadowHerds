"use strict";

/* ============================================================
   CYBERDECK RENDERER — bloc deck sur la carte PNJ + section
   d'édition (M1, PLAN_MATRICE_CYBERDECK.md). Miroir de
   ServerRenderer côté serveur : reçoit le PNJ + son édition en
   paramètres, ne lit ni ne modifie rien lui-même — la donnée vit
   sur `pnj.cyberdeck` (structure posée par Cyberdeck.blank/parseLegacy
   et la migration Storage v4), les mutations passent par EditModal
   (comme le reste de la fiche). Le moniteur matriciel du deck et la
   réallocation en un tap sont du ressort de M2 — ce module n'affiche
   que le socle : attributs, programmes, notes/particularités.
   ============================================================ */
const CyberdeckRenderer = {
  /** Bloc lecture seule sur la carte (cardrenderer.<edition>.js, juste après
      la section Équipement). `null`/vide si le PNJ n'a pas de deck structuré
      (pas de decker, ou pas encore migré/généré). */
  block(pnj, edition, deps) {
    const deck = pnj.cyberdeck;
    if (!deck) return "";
    const esc = (deps && deps.CardRenderer && deps.CardRenderer._esc) || CardRenderer._esc;
    const keys = Cyberdeck.attrKeys(edition);
    const attrsHtml = keys.length
      ? `<div class="attr-grid">${keys.map((k) => CardRenderer._attrCell(k.badge, deck.attrs[k.key], "", { roll: false })).join("")}</div>`
      : "";
    // M2 : réallocation en un tap — bouton d'échange ⇄ entre attributs
    // adjacents si réallouable (SR5/SR6). Rangée séparée de l'attr-grid
    // (plutôt qu'interfolée dedans) pour ne pas perturber sa grille
    // responsive existante (grid-auto-flow + repli 4/2 colonnes, cf.
    // css/base/pnj-card.css) — n'importe quelle permutation s'obtient en
    // quelques taps, comme un tri par transpositions.
    const realloc = Cyberdeck.reallocatable(edition);
    const reallocHtml = realloc && keys.length > 1
      ? `<div class="cyberdeck-realloc" title="Reconfigurer le deck (${esc(Cyberdeck.reallocCostLabel(edition))})">${keys
          .slice(0, -1)
          .map(
            (k, i) =>
              `<button type="button" class="cyberdeck-swap" data-action="deck-realloc" data-id="${pnj.id}" data-from="${k.key}" data-to="${keys[i + 1].key}" aria-label="Échanger ${esc(k.label)} et ${esc(keys[i + 1].label)}">${k.badge} ⇄ ${keys[i + 1].badge}</button>`,
          )
          .join("")}</div>`
      : "";
    const rerollHtml = Cyberdeck.hasReroll(edition) && deck.reroll
      ? `<div class="cyberdeck-note">Relance ${deck.reroll} échec${deck.reroll > 1 ? "s" : ""} (Hacking)</div>`
      : "";
    const biofeedbackHtml = Cyberdeck.hasBiofeedbackFilter(edition) && deck.biofeedbackFilter
      ? `<div class="cyberdeck-note">Filtre de biofeedback</div>`
      : "";
    // M2 : moniteur matriciel du deck (rangées de 3, malus en marge — même
    // patron que le moniteur de condition du cockpit combat, cf. K2/K6).
    // Absent si l'édition n'a pas de moniteur de deck séparé (Anarchy 2.0).
    const size = Cyberdeck.monitorSize(edition, deck);
    const monitorHtml = size
      ? `<div class="monitor-row"><span class="monitor-label">Moniteur</span><div class="monitor-boxes">${this._monitorBoxes(pnj.id, size, deck.filled || 0)}</div></div>`
      : "";
    const programsHtml = deck.programs && deck.programs.length
      ? `<div class="cyberdeck-programs">${deck.programs.map((p) => `<span class="tag">${esc(p)}</span>`).join("")}</div>`
      : "";
    const nameHtml = deck.name ? `<span class="cyberdeck-name">${esc(deck.name)}</span>` : "";
    return `<div class="ref-block cyberdeck-block">
      <div class="ref-lbl">${esc(Cyberdeck.label(edition))}${nameHtml ? " — " : ""}${nameHtml}</div>
      ${attrsHtml}
      ${reallocHtml}
      ${monitorHtml}
      ${rerollHtml}
      ${biofeedbackHtml}
      ${programsHtml}
      ${this._targetRow(pnj, edition, deck)}
      ${this._arsenalRow(pnj, edition, deck)}
    </div>`;
  },

  /** M7 : râtelier d'actions matricielles offensives — l'« arsenal » du decker
      (pic de données & co.). Miroir logique du râtelier d'armes d'un combattant
      physique, mais dérivé du catalogue d'édition (Cyberdeck.actions) filtré
      par le loadout du deck. Le pic de données (type "attack") est mis en avant
      (bouton primaire) ; les autres actions équipées défilent en rang
      mono-ligne (doctrine d'alignement : jamais un mur de boutons
      indifférenciés). Vide si l'édition n'a pas de râtelier (Anarchy 1re) ou si
      le loadout est vide. Rendu identique carte / cockpit (le bloc est réutilisé
      en combat par Encounter.renderActiveCard). */
  _arsenalRow(pnj, edition, deck) {
    const esc = CardRenderer._esc;
    const acts = Cyberdeck.actions(edition, deck);
    if (!acts.length) return "";
    const btn = (a) => {
      const isPrimary = a.type === "attack";
      const glyph = isPrimary ? "⚔ " : "";
      const poolTxt = a.pool != null ? ` ${a.pool}d` : "";
      const dvTxt = a.dv != null ? ` · VD ${a.dv}` : "";
      const cls = `cyberdeck-swap deck-action-btn${isPrimary ? " is-primary" : ""}`;
      return `<button type="button" class="${cls}" data-action="deck-action" data-id="${pnj.id}" data-key="${esc(a.key)}" title="${esc(a.name)}${dvTxt} (p.${a.page})">${glyph}${esc(a.name)}${poolTxt}${dvTxt}</button>`;
    };
    const primary = acts.filter((a) => a.type === "attack").map(btn).join("");
    const rest = acts.filter((a) => a.type !== "attack").map(btn).join("");
    return `<div class="cyberdeck-arsenal" role="group" aria-label="Actions matricielles offensives">
      ${primary}
      ${rest ? `<div class="cyberdeck-arsenal-rest">${rest}</div>` : ""}
    </div>`;
  },

  /** M3 : cible du decker — picker de serveur + accès au tracker Matrice,
      identique en scène de combat et hors combat (hub/biblio). Depuis M7, le
      jet d'attaque n'est plus un bouton unique ici : il vit dans le râtelier
      (`_arsenalRow`, actions nommées), indépendant de la cible (le serveur visé
      ne sert plus qu'à nommer la cible du jet, pas à débloquer l'attaque). */
  _targetRow(pnj, edition, deck) {
    const esc = CardRenderer._esc;
    const targetId = DeckRun.target(pnj);
    const servers = (Servers.data && Servers.data.all) || [];
    const options =
      `<option value="">Aucune cible</option>` +
      servers
        .map((s) => `<option value="${s.id}" ${s.id === targetId ? "selected" : ""}>${esc(s.name)}</option>`)
        .join("");
    const openBtn = targetId
      ? `<button type="button" class="cyberdeck-swap" data-action="deck-open-matrix" data-id="${pnj.id}" title="Ouvrir la Matrice de ce serveur">⚡ Ouvrir la Matrice</button>`
      : "";
    return `<div class="cyberdeck-target">
      <select class="cyberdeck-target-select" data-action="deck-set-target" data-id="${pnj.id}" aria-label="Serveur ciblé">${options}</select>
      ${openBtn}
    </div>`;
  },

  /** Cases du moniteur de deck, data-action="toggle-deck-monitor" (distinct
      de toggle-monitor : mute pnj.cyberdeck.filled, pas un champ top-level).
      Pénalité toutes les 3 cases, même patron que CardRenderer._monitorBoxes. */
  _monitorBoxes(pnjId, total, filled) {
    return Array.from({ length: total }, (_, i) => {
      const isFilled = i < filled;
      const isPenalty = (i + 1) % 3 === 0;
      const cls = `monitor-box ${isFilled ? "filled" : ""} ${isPenalty ? "penalty" : ""}`.trim();
      return `<div class="${cls}" data-action="toggle-deck-monitor" data-id="${pnjId}" data-idx="${i}"></div>`;
    }).join("");
  },

  /** Section du formulaire EditModal (données brutes, un champ par attribut
      pertinent + programmes en texte libre). Montée seulement si
      `pnj.cyberdeck` existe déjà (M1 : pas de bouton « ajouter un deck »,
      cf. plan). */
  editSection(pnj) {
    const esc = CardRenderer._esc;
    const deck = pnj.cyberdeck;
    const edition = pnj.edition;
    const keys = Cyberdeck.attrKeys(edition);
    const attrInputs = keys
      .map(
        (k) => `<div class="form-group">
          <label>${esc(k.label)}</label>
          <input type="number" id="em-deck-attr-${k.key}" value="${deck.attrs[k.key] ?? 0}" min="0" max="12">
        </div>`,
      )
      .join("");
    const rerollInput = Cyberdeck.hasReroll(edition)
      ? `<div class="form-group">
          <label>Relance (échecs Hacking)</label>
          <input type="number" id="em-deck-reroll" value="${deck.reroll || 0}" min="0" max="5">
        </div>`
      : "";
    const biofeedbackInput = Cyberdeck.hasBiofeedbackFilter(edition)
      ? `<div class="form-group">
          <label><input type="checkbox" id="em-deck-biofeedback" ${deck.biofeedbackFilter ? "checked" : ""}> Filtre de biofeedback</label>
        </div>`
      : "";
    // M7 : loadout curé — quelles actions matricielles ce decker garde
    // « équipées » dans son râtelier (prep, hors scène — cf. Croupier). Cases à
    // cocher (2-4 actions, pas un mur), pré-cochées selon le loadout courant ;
    // défaut = tout coché (loadout absent). Vide pour Anarchy 1re (catalogue []).
    const catalog = Cyberdeck.catalog(edition);
    const equipped = new Set(Cyberdeck.loadout(edition, deck).map((a) => a.key));
    const loadoutInput = catalog.length
      ? `<div class="form-group full">
          <label>Actions matricielles équipées (râtelier)</label>
          <div class="deck-loadout-picker">
            ${catalog
              .map(
                (a) =>
                  `<label class="deck-loadout-opt"><input type="checkbox" class="em-deck-action" value="${esc(a.key)}" ${equipped.has(a.key) ? "checked" : ""}> ${esc(a.name)}</label>`,
              )
              .join("")}
          </div>
        </div>`
      : "";
    return `<div class="modal-section">
      <div class="modal-section-title">${esc(Cyberdeck.label(edition))}</div>
      <div class="modal-grid">
        <div class="form-group full">
          <label>Modèle</label>
          <input type="text" id="em-deck-name" value="${esc(deck.name || "")}" placeholder="Ex. Shiawase Cyber-5">
        </div>
        ${attrInputs}
        ${rerollInput}
        ${biofeedbackInput}
      </div>
      ${loadoutInput}
      <div class="form-group">
        <label>Programmes (un par ligne — choisis hors scène)</label>
        <textarea id="em-deck-programs" rows="3">${(deck.programs || []).join("\n")}</textarea>
      </div>
      ${deck.legacyText ? `<div class="cyberdeck-legacy-note">Origine : « ${esc(deck.legacyText)} »</div>` : ""}
    </div>`;
  },

  /** Lit les champs du formulaire ci-dessus dans pnj.cyberdeck (appelé par
      EditModal._readForm, seulement si la section a été montée). */
  readForm(pnj) {
    const deck = pnj.cyberdeck;
    if (!deck) return;
    const nameEl = document.getElementById("em-deck-name");
    if (nameEl) deck.name = nameEl.value.trim();
    for (const k of Cyberdeck.attrKeys(pnj.edition)) {
      const el = document.getElementById(`em-deck-attr-${k.key}`);
      if (el) {
        const n = parseInt(el.value, 10);
        deck.attrs[k.key] = Number.isFinite(n) ? Utils.clamp(n, 0, 12) : deck.attrs[k.key];
      }
    }
    const rerollEl = document.getElementById("em-deck-reroll");
    if (rerollEl) {
      const n = parseInt(rerollEl.value, 10);
      deck.reroll = Number.isFinite(n) ? Utils.clamp(n, 0, 5) : deck.reroll;
    }
    const biofeedbackEl = document.getElementById("em-deck-biofeedback");
    if (biofeedbackEl) deck.biofeedbackFilter = !!biofeedbackEl.checked;
    // M7 : loadout curé — enregistre les clés d'actions cochées. Écrit un
    // tableau EXPLICITE (même si tout est coché) dès que le picker est monté :
    // le choix devient persistant sur pnj.cyberdeck (objet déjà routé par
    // Storage, aucune nouvelle collection). Un decker jamais édité garde
    // `loadout` absent → défaut paresseux « tout » (cf. Cyberdeck.loadout).
    const actionEls = document.querySelectorAll(".em-deck-action");
    if (actionEls.length) {
      deck.loadout = [...actionEls].filter((c) => c.checked).map((c) => c.value);
    }
    const programsEl = document.getElementById("em-deck-programs");
    if (programsEl)
      deck.programs = programsEl.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
  },
};
