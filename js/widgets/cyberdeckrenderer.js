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
    const rerollHtml = Cyberdeck.hasReroll(edition) && deck.reroll
      ? `<div class="cyberdeck-note">Relance ${deck.reroll} échec${deck.reroll > 1 ? "s" : ""} (Hacking)</div>`
      : "";
    const biofeedbackHtml = Cyberdeck.hasBiofeedbackFilter(edition) && deck.biofeedbackFilter
      ? `<div class="cyberdeck-note">Filtre de biofeedback</div>`
      : "";
    const programsHtml = deck.programs && deck.programs.length
      ? `<div class="cyberdeck-programs">${deck.programs.map((p) => `<span class="tag">${esc(p)}</span>`).join("")}</div>`
      : "";
    const nameHtml = deck.name ? `<span class="cyberdeck-name">${esc(deck.name)}</span>` : "";
    return `<div class="ref-block cyberdeck-block">
      <div class="ref-lbl">${esc(Cyberdeck.label(edition))}${nameHtml ? " — " : ""}${nameHtml}</div>
      ${attrsHtml}
      ${rerollHtml}
      ${biofeedbackHtml}
      ${programsHtml}
    </div>`;
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
    const programsEl = document.getElementById("em-deck-programs");
    if (programsEl)
      deck.programs = programsEl.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
  },
};
