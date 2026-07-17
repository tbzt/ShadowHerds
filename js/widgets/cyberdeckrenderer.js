"use strict";

/* ============================================================
   CYBERDECK RENDERER — bloc deck sur la carte PNJ + section
   d'édition. Miroir de
   ServerRenderer côté serveur : reçoit le PNJ + son édition en
   paramètres, ne lit ni ne modifie rien lui-même — la donnée vit
   sur `pnj.cyberdeck` (structure posée par Cyberdeck.blank/parseLegacy
   et la migration Storage v4), les mutations passent par EditModal
   (comme le reste de la fiche). Le moniteur matriciel du deck et la
   réallocation en un tap sont du ressort de la réallocation — ce module n'affiche
   que le socle : attributs, programmes, notes/particularités.
   ============================================================ */
import { CardRenderer } from "./cardrenderer.js";
import { Cyberdeck } from "../rules/cyberdeck.js";
import { Utils } from "../core/utils.js";

export const CyberdeckRenderer = {
  /** Bloc lecture seule sur la carte (cardrenderer.<edition>.js, juste après
      la section Équipement). `null`/vide si le PNJ n'a pas de deck structuré
      (pas de decker, ou pas encore migré/généré). */
  block(pnj, edition, deps) {
    const deck = pnj.cyberdeck;
    if (!deck) return "";
    const esc = (deps && deps.CardRenderer && deps.CardRenderer._esc) || CardRenderer._esc;
    const keys = Cyberdeck.attrKeys(edition);
    // Attributs EFFECTIFS : base + programmes de type `attr` (ex. Cryptage
    // +1 Firewall, Toolbox +1 TdD). Le puits d'édition modifie la base ; la
    // carte affiche la valeur réellement en jeu, comme une stat dérivée. Une
    // cellule relevée par un programme est marquée (classe `attr-boosted`).
    const effAttrs = Cyberdeck.effectiveAttrs(edition, deck);
    const attrsHtml = keys.length
      ? `<div class="attr-grid">${keys
          .map((k) => {
            const boosted = (effAttrs[k.key] || 0) !== (deck.attrs[k.key] || 0);
            return CardRenderer._attrCell(k.badge, effAttrs[k.key], boosted ? "attr-boosted" : "", { roll: false });
          })
          .join("")}</div>`
      : "";
    // Réallocation en un tap — bouton d'échange ⇄ entre attributs
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
              `<button type="button" class="cyberdeck-swap" data-action="deck-realloc" data-id="${pnj.id}" data-from="${k.key}" data-to="${keys[i + 1].key}" aria-label="Échanger ${esc(k.label)} et ${esc(keys[i + 1].label)}">${k.badge} <svg class="icon icon-sm" aria-hidden="true"><use href="#ic-swap"></use></svg> ${keys[i + 1].badge}</button>`,
          )
          .join("")}</div>`
      : "";
    const rerollHtml = Cyberdeck.hasReroll(edition) && deck.reroll
      ? `<div class="cyberdeck-note">Relance ${deck.reroll} échec${deck.reroll > 1 ? "s" : ""} (Hacking)</div>`
      : "";
    const biofeedbackHtml = Cyberdeck.hasBiofeedbackFilter(edition) && deck.biofeedbackFilter
      ? `<div class="cyberdeck-note">Filtre de biofeedback</div>`
      : "";
    // Moniteur matriciel du deck (rangées de 3, malus en marge — même
    // patron que le moniteur de condition du cockpit combat.
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
    </div>`;
  },

  /** Râtelier Attaques unifié — l'arsenal matriciel rejoint les
      armes/sorts en zone Combat au lieu de rester tapi dans Détails, à côté
      du reste du bloc deck. Vide si pas de decker ou pas de loadout. Appelé
      par les 4 renderers d'édition, juste après _weaponBlock/_spellsBlock. */
  combatArsenal(pnj, edition) {
    const deck = pnj.cyberdeck;
    if (!deck) return "";
    return this._arsenalRow(pnj, edition, deck);
  },

  /** Râtelier d'actions matricielles offensives — l'« arsenal » du decker
      (pic de données & co.). Miroir logique du râtelier d'armes d'un combattant
      physique, mais dérivé du catalogue d'édition (Cyberdeck.actions) filtré
      par le loadout du deck. Le pic de données (type "attack") est mis en avant
      (bouton primaire) ; les autres actions équipées défilent en rang
      mono-ligne (doctrine d'alignement : jamais un mur de boutons
      indifférenciés). Vide si l'édition n'a pas de râtelier (Anarchy 1re) ou si
      le loadout est vide. Rendu identique carte / cockpit (le bloc est réutilisé
      en combat par Encounter.renderActiveCard). Déplacé en zone Combat,
      cf. combatArsenal() ci-dessus (plus appelé depuis block()). */
  _arsenalRow(pnj, edition, deck) {
    const esc = CardRenderer._esc;
    const acts = Cyberdeck.actions(edition, deck);
    if (!acts.length) return "";
    // Même grammaire qu'une arme (et qu'un sort). Chaque action est une
    // `.weapon-line` — nom + VD en `.weapon-stat`, dés en badge `⚄` — au lieu
    // d'un bouton-pilule. La teinte « Matrice » (vert) vient de `.matrix-block`,
    // qui redéfinit --accent/--glow ; la ligne reprend donc tout le chrome des
    // armes sans une règle CSS dupliquée. Le pic de données (type "attack")
    // reste en tête ; les autres actions se replient derrière un <details> ⋯,
    // déplié d'office quand une intrusion est en cours (serveur ciblé posé).
    const line = (a) => {
      const rollable = a.pool != null; // action narrative (pool null) = non lançable
      const poolBadge = rollable ? `<span class="weapon-pool">⚄${a.pool}</span>` : "";
      const dvTxt = a.dv != null ? `VD ${a.dv}` : "";
      const title = `${a.name}${a.dv != null ? ` · VD ${a.dv}` : ""}${rollable ? ` · ${a.pool} dés` : ""} (p.${a.page})`;
      return `<div class="weapon-line matrix-line${rollable ? " weapon-rollable rollable" : ""}" data-action="deck-action" data-id="${pnj.id}" data-key="${esc(a.key)}" title="${esc(title)}">
        <div><div class="weapon-name">${esc(a.name)}</div>${dvTxt ? `<div class="weapon-stat">${dvTxt}</div>` : ""}</div>
        ${poolBadge}
      </div>`;
    };
    const primary = acts.filter((a) => a.type === "attack").map(line).join("");
    const rest = acts.filter((a) => a.type !== "attack");
    let restHtml = "";
    if (rest.length) {
      const open = DeckRun.target(pnj) ? " open" : "";
      const n = rest.length;
      restHtml = `<details class="cyberdeck-more"${open}>
        <summary class="cyberdeck-more-summary"><span class="cyberdeck-more-dots">⋯</span> ${n} autre${n > 1 ? "s" : ""} action${n > 1 ? "s" : ""}</summary>
        <div class="cyberdeck-more-body">${rest.map(line).join("")}</div>
      </details>`;
    }
    return `<div class="weapon-block matrix-block">
      <div class="zone-eyebrow">Matrice</div>
      ${primary}
      ${restHtml}
    </div>`;
  },

  /** Cible du decker — picker de serveur + accès au tracker Matrice,
      identique en scène de combat et hors combat (hub/biblio). Le
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
      `pnj.cyberdeck` existe déjà (pas de bouton « ajouter un deck »,
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
    // Loadout curé — quelles actions matricielles ce decker garde
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
      ${this._programsInput(deck, edition)}
      ${deck.legacyText ? `<div class="cyberdeck-legacy-note">Origine : « ${esc(deck.legacyText)} »</div>` : ""}
    </div>`;
  },

  /** Programmes matriciels chargés : picker à cases à cocher du catalogue
      d'édition (même grammaire que le loadout ci-dessus), pré-coché selon
      `deck.programs`. Un point ● marque les programmes à effet mécanique
      (bonus de pool/VD motorisé). Les entrées libres/legacy hors catalogue
      restent éditables dans un petit textarea « autres ». Si l'édition n'a pas
      de catalogue de programmes (Anarchy 2.0), seul le textarea est monté. */
  _programsInput(deck, edition) {
    const esc = CardRenderer._esc;
    const catalog = Cyberdeck.programCatalog(edition);
    const chosen = new Set(deck.programs || []);
    const catalogNames = new Set(catalog.map((p) => p.name));
    // Entrées non catalogue = programmes libres/legacy → textarea « autres ».
    const custom = (deck.programs || []).filter((p) => !catalogNames.has(p));
    const picker = catalog.length
      ? `<div class="form-group full">
          <label>Programmes chargés</label>
          <div class="deck-loadout-picker">
            ${catalog
              .map((p) => {
                const motor = p.effect ? " ●" : "";
                const tip = `p.${p.page}${p.effect ? " · effet mécanique" : ""}`;
                return `<label class="deck-loadout-opt" title="${esc(tip)}"><input type="checkbox" class="em-deck-program" value="${esc(p.name)}" ${chosen.has(p.name) ? "checked" : ""}> ${esc(p.name)}${motor}</label>`;
              })
              .join("")}
          </div>
        </div>`
      : "";
    const customLabel = catalog.length
      ? "Autres programmes (un par ligne)"
      : "Programmes (un par ligne — choisis hors scène)";
    return `${picker}
      <div class="form-group">
        <label>${customLabel}</label>
        <textarea id="em-deck-programs" rows="${catalog.length ? 2 : 3}">${esc(custom.join("\n"))}</textarea>
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
    // Loadout curé — enregistre les clés d'actions cochées. Écrit un
    // tableau EXPLICITE (même si tout est coché) dès que le picker est monté :
    // le choix devient persistant sur pnj.cyberdeck (objet déjà routé par
    // Storage, aucune nouvelle collection). Un decker jamais édité garde
    // `loadout` absent → défaut paresseux « tout » (cf. Cyberdeck.loadout).
    const actionEls = document.querySelectorAll(".em-deck-action");
    if (actionEls.length) {
      deck.loadout = [...actionEls].filter((c) => c.checked).map((c) => c.value);
    }
    // Programmes = cases cochées du catalogue (ordre d'affichage) + entrées
    // libres du textarea « autres ». Le picker peut être absent (édition sans
    // catalogue de programmes) → seules les lignes libres comptent (rétrocompat).
    const checked = [...document.querySelectorAll(".em-deck-program")]
      .filter((c) => c.checked)
      .map((c) => c.value);
    const programsEl = document.getElementById("em-deck-programs");
    const custom = programsEl
      ? programsEl.value
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    deck.programs = [...checked, ...custom];
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.CyberdeckRenderer = CyberdeckRenderer;
