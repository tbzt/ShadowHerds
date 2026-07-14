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
    if (pnj.collapsed) el.classList.add("spirit-collapsed");
    el.dataset.id = pnj.id;
    el.dataset.edition = pnj.edition;

    el.innerHTML =
      this._header(pnj) + this._body(pnj, deps) + this._progressionZone(pnj) + this._journal(pnj) + this._footer(pnj, actions, deps);

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
        el.classList.toggle("spirit-collapsed", !!pnj.collapsed);
        el.innerHTML =
          this._header(pnj) + this._body(pnj, deps) + this._progressionZone(pnj) + this._journal(pnj) + this._footer(pnj, actions, deps);
      });
  },

  /* ---- Header ---- */
  _header(pnj) {
    if (pnj.pcLight) return this._headerLight(pnj);
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

  /* ---- PJ léger (E1) — gabarit minimal commun, aucune branche d'édition :
     un PJ léger n'a ni attrs ni skills, seulement nom/joueur/couleur/notes. ---- */
  _headerLight(pnj) {
    return `<div class="pnj-card-header">
      <div class="pnj-header-left">
        ${this._nameBlock(pnj.name)}
        <div class="pnj-meta">Personnage-joueur${pnj.player ? ` · ${this._esc(pnj.player)}` : ""}</div>
      </div>
      ${this._pcAvatar(pnj)}
    </div>`;
  },

  /** E6 : signature visuelle du PJ, CONSTANTE partout (tracker, PinRow,
      Palette, mentions, carte) — trois indices redondants (jamais un seul,
      daltoniens) : couleur `pcColor` (E1) + anneau (forme, ce badge lui-même
      n'existe QUE pour les PJ) + initiale du joueur (un PJ léger n'a jamais
      de portrait). `""` pour toute entité sans `pcColor` (PNJ) — aucune
      régression visuelle ailleurs. */
  _pcAvatar(pnj) {
    if (!pnj || !pnj.pcColor) return "";
    const label = (pnj.player || pnj.name || "?").trim().charAt(0).toUpperCase();
    const title = `PJ${pnj.player ? " · " + pnj.player : ""}`;
    return `<span class="pc-avatar" style="background:${this._esc(pnj.pcColor)}" title="${this._esc(title)}" aria-hidden="true">${this._esc(label)}</span>`;
  },

  _bodyLight(pnj) {
    const block = App.getEditionModule(pnj.edition)?.pcTableBlock;
    return `<div class="pnj-card-body pnj-card-body-light">
      ${this._tableBlockChips(pnj, block)}
      ${this._tableBlockMonitors(pnj, block)}
      ${
        pnj.notes
          ? `<div class="pc-light-notes">${this._esc(pnj.notes)}</div>`
          : `<div class="pc-light-empty">Fiche légère — nom seul. « Éditer » pour joueur/notes.</div>`
      }
      ${this._contactLinksSection(pnj)}
      ${this._backlinksSection(pnj)}
    </div>`;
  },

  /** E5 : « Contacts » du PJ léger — liens qualifiés (relation, loyauté),
      un contact supprimé depuis est filtré silencieusement (pas de cascade
      destructive, cf. plan E5). Cliquable vers la fiche contact via
      `Palette._reveal`, même navigation que les backlinks E4. */
  _contactLinksSection(pnj) {
    const links = pnj.contactLinks || [];
    const linkedIds = new Set(links.map((l) => l.contactId));
    const items = links
      .map((l) => {
        const c = ContactsBook.data.all.find((x) => x.id === l.contactId);
        if (!c) return "";
        const label = l.relation ? `${c.name} — ${l.relation}` : c.name;
        return `<span class="tag tag-clickable" role="button" tabindex="0" data-action="contact-link-goto" data-id="${this._esc(c.id)}" data-name="${this._esc(c.name)}">${this._esc(label)}</span>`;
      })
      .join("");
    // Ajout rapide (hors édition) : le « ＋ » ouvre une liste-popover — 1er item
    // « ＋ Créer un contact » (ContactCreate), puis les contacts existants non
    // encore liés (clic = lien immédiat). Réutilise CardMenu tel quel
    // (data-card-menu-toggle + .card-menu frère) → aucun code de toggle neuf.
    const unlinked = (typeof ContactsBook !== "undefined" ? ContactsBook.data.all : [])
      .filter((c) => !linkedIds.has(c.id));
    const pickItems = unlinked
      .map(
        (c) =>
          `<button type="button" role="menuitem" class="card-menu-item" data-action="contact-link-pick" data-id="${this._esc(pnj.id)}" data-contact-id="${this._esc(c.id)}">${this._esc(c.name)}</button>`,
      )
      .join("");
    const addControl = `<span class="contact-add-wrap">
      <button type="button" class="tag contact-add-btn" data-card-menu-toggle aria-haspopup="true" aria-expanded="false" title="Ajouter un contact">＋</button>
      <div class="card-menu" role="menu" hidden>
        <button type="button" role="menuitem" class="card-menu-item" data-action="contact-create-open" data-id="${this._esc(pnj.id)}">＋ Créer un contact</button>
        ${pickItems}
      </div>
    </span>`;
    return `<div class="card-section">
      <div class="card-section-label">Contacts</div>
      <div class="card-section-content">${items}${addControl}</div>
    </div>`;
  },

  /** E4/E7 : « Mentionné dans » — backlinks calculés à la volée par Mentions
      (bloc-notes de séance + notes/journal des autres entités mentionnant
      cette fiche). Scan par ID depuis E7 (robuste au renommage/homonymes),
      réutilise `.tag`/`.tag-clickable` tel quel (même patron que les tags
      cliquables du corps de carte, cf. `_contentTag`). */
  _backlinksSection(pnj) {
    if (typeof Mentions === "undefined") return "";
    // Un contact DÉJÀ lié (contactLinks) relève de la section « Contacts » : on
    // ne le répète pas ici. Un contact non lié qui mentionne le PJ y reste.
    const linkedContactIds = new Set((pnj.contactLinks || []).map((l) => l.contactId));
    const links = Mentions.backlinksFor(pnj.id).filter(
      (l) => !(l.kind === "entity" && l.type === "contact" && linkedContactIds.has(l.id)),
    );
    if (!links.length) return "";
    const items = links
      .map((l) =>
        l.kind === "notepad"
          ? `<span class="tag tag-clickable" role="button" tabindex="0" data-action="mention-goto-notepad">${this._esc(l.label)}</span>`
          : `<span class="tag tag-clickable" role="button" tabindex="0" data-action="mention-goto" data-id="${this._esc(l.id)}" data-name="${this._esc(l.name)}" data-type="${this._esc(l.type)}"${l.slot ? ` data-slot="${this._esc(l.slot)}"` : ""}${l.ts != null ? ` data-ts="${this._esc(String(l.ts))}"` : ""}>${this._esc(l.name)}</span>`,
      )
      .join("");
    return `<div class="card-section">
      <div class="card-section-label">Mentionné dans</div>
      <div class="card-section-content">${items}</div>
    </div>`;
  },

  /** E7 : après un clic sur un chip « Mentionné dans », amène à l'écran
      l'ENDROIT exact de la mention (l'entrée de journal ciblée, ou la carte
      source pour le champ `notes` — bloc unique). `_reveal` re-rend le panneau
      de façon asynchrone (délai variable PJ/Hub) : on attend l'apparition de
      la cible par rAF borné plutôt qu'un délai fixe. Réutilise le patron
      scroll+flash de `UI._flashCard`, étendu aux `.contact-card`. */
  _scrollToBacklink({ id, slot, ts }) {
    // Boucle de reprise en `setTimeout` (pas `requestAnimationFrame` : rAF est
    // gelé si l'onglet passe en arrière-plan — le scroll manquerait). ~30 essais
    // × 30 ms couvrent le délai variable du re-rendu de `_reveal` (PJ 40 ms/Hub).
    let tries = 30;
    const tick = () => {
      const card = document.querySelector(
        `.panel.active .pnj-card[data-id="${id}"], .panel.active .contact-card[data-id="${id}"], .pnj-card[data-id="${id}"], .contact-card[data-id="${id}"]`,
      );
      const target =
        slot === "journal" && card && ts != null
          ? card.querySelector(`.journal-entry[data-ts="${ts}"]`)
          : card;
      if (!target) {
        if (--tries > 0) setTimeout(tick, 30);
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const cls = target === card ? "card-flash" : "entry-flash";
      target.classList.add(cls);
      setTimeout(() => target.classList.remove(cls), 1200);
    };
    tick();
  },

  /** E3 : valeurs saisies du bloc « mécanique de table » (init/perception/
      volonté/combativité…) — un `.tag` par valeur RENSEIGNÉE seulement
      (« vide par défaut » : rien n'apparaît tant que le MJ n'a rien saisi),
      réutilise `_listSection`/`.tag` tel quel, aucun nouveau composant. */
  _tableBlockChips(pnj, block) {
    if (!block) return "";
    const items = (block.fields || [])
      .filter((f) => pnj[f.key] !== undefined && pnj[f.key] !== null && pnj[f.key] !== "")
      .map((f) => `${f.label} ${pnj[f.key]}`);
    return this._listSection("Mécanique de table", items);
  },

  /** E3 : moniteurs du bloc de table — dispatch sur `monitorKind` (descripteur
      neutre posé par le module d'édition, jamais `App.edition` ici). Réutilise
      les moniteurs déjà motorisés pour les PNJ complets (`_monitorBoxes`,
      `_monitorBoxesAnarchy`) : même markup, même délégation `toggle-monitor`. */
  _tableBlockMonitors(pnj, block) {
    if (!block || !block.monitorKind) return "";
    // "monitorKind" peut être une fonction (SR6 : dépend du réglage
    // separateMonitors, résolu à chaque lecture — un PJ léger n'a pas de
    // moment de « génération » où baker la valeur, contrairement aux PNJ).
    const kind =
      typeof block.monitorKind === "function" ? block.monitorKind() : block.monitorKind;
    if (kind === "anarchy") {
      return `<div class="monitor-block"><div class="monitor-row">
        <span class="monitor-label">État</span>
        <div class="monitor-boxes">${this._monitorBoxesAnarchy(pnj)}</div>
      </div></div>`;
    }
    if (kind === "single") {
      const key = block.monitorMaxKey || "me";
      const max = pnj[key] || 0;
      if (!max) return "";
      return `<div class="monitor-block"><div class="monitor-row">
        <span class="monitor-label">État</span>
        <div class="monitor-boxes">${this._monitorBoxes(pnj.id, "phys", max, pnj.physFilled || 0)}</div>
      </div></div>`;
    }
    // "double" (SR5, Anarchy1) : physMon/stunMon, chaque piste optionnelle
    // indépendamment (un MJ peut ne saisir que le physique).
    const physMon = pnj.physMon || 0;
    const stunMon = pnj.stunMon || 0;
    if (!physMon && !stunMon) return "";
    return `<div class="monitor-block">
      ${
        physMon
          ? `<div class="monitor-row"><span class="monitor-label">Phys</span>
             <div class="monitor-boxes">${this._monitorBoxes(pnj.id, "phys", physMon, pnj.physFilled || 0)}</div></div>`
          : ""
      }
      ${
        stunMon
          ? `<div class="monitor-row" style="margin-top:4px;"><span class="monitor-label">Étourd</span>
             <div class="monitor-boxes">${this._monitorBoxes(pnj.id, "stun", stunMon, pnj.stunFilled || 0)}</div></div>`
          : ""
      }
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
    if (pnj.pcLight) return this._bodyLight(pnj);
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
    // CP2 : Incarnation promue tout en haut du corps (juste après l'ouverture
    // de pnj-card-body, donc juste après le header) — la saveur se regarde
    // avant le combat/les capacités, pas après (I2 : jamais déplacée ensuite,
    // seulement pliée/dépliée).
    const flavor = this._flavorSection(pnj);
    if (flavor) {
      const openIdx = core.indexOf(">") + 1;
      core = core.slice(0, openIdx) + flavor + core.slice(openIdx);
    }
    // Injecter traits raciaux + lore créature (habillage neutre, hors modules)
    const extra = this._metaTraitsSection(pnj) + this._creatureLoreSection(pnj);
    if (extra) {
      const idx = core.lastIndexOf("</div>");
      if (idx !== -1) {
        core = core.slice(0, idx) + extra + core.slice(idx);
      }
    }
    return core;
  },

  /* ---- Modules conditionnels (CP3) ------------------------------------
     Un module = une zone à part entière, placée après Combat, qui n'existe
     QUE si applies(pnj) est vrai. Formalise ce qui vivait en vrac
     (_magicSection, CyberdeckRenderer.block planqué en Détails). Le glyphe
     sert les onglets de sélecteur (CP4) — inutilisé pour l'instant. */
  _MODULES: [
    {
      key: "magie",
      label: "Magie",
      glyph: "✸",
      applies: (pnj) => !!(pnj.tradition || pnj.mentorSpirit || (pnj.powers && pnj.powers.length)),
      render: (pnj) => CardRenderer._magieModule(pnj),
      lenses: ["fiche", "combat"],
    },
    {
      key: "matrice",
      label: "Matrice",
      glyph: "⚡",
      applies: (pnj) => !!pnj.cyberdeck,
      render: (pnj, deps) => CyberdeckRenderer.block(pnj, pnj.edition, deps),
      lenses: ["fiche", "combat"],
    },
  ],

  /** Rend les modules applicables, chacun dans sa propre coquille de zone
      (I3 : aucun module vide). Appelé par les 4 corps d'édition juste après
      la zone Combat. */
  _modulesHtml(pnj, deps) {
    return CardRenderer._MODULES.filter((m) => m.applies(pnj))
      .map((m) => this._zoneShell(pnj, m.key, m.render(pnj, deps), ""))
      .join("");
  },

  /** Module Magie (CP3) : tradition, esprit mentor, pouvoirs d'adepte —
      consolidés (vivaient éparpillés : "extra" de fin de carte + zone
      Capacités). *Scope* : la Résistance au Drain RESTE en zone Combat (un
      jet actif de combat doit rester à 1 tap, cf. coût d'interruption) —
      déviation assumée de la table doctrine §4.3. */
  _magieModule(pnj) {
    let html = "";
    if (pnj.tradition) {
      html += this._listSection("Tradition", [
        { name: pnj.tradition, desc: pnj.traditionDesc },
      ]);
    }
    if (pnj.mentorSpirit) {
      html += this._listSection("Esprit mentor", [pnj.mentorSpirit]);
    }
    if (pnj.powers && pnj.powers.length) {
      html += this._listSection("Pouvoirs d'adepte", pnj.powers);
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

  /* ---- Habillage (âge, signe, manie, motivation, style, attitude) ----
     Zone Incarnation (CP1) : « Portrait » reste le mot pour l'image IA,
     le vocabulaire verrouillé de la ZONE est « Incarnation » (porté par le
     libellé du zone-toggle, cf. _ZONE_LABELS). Promotion en haut de carte
     et fusion complète : CP2. */
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
    if (!rows) return "";
    const summary = f.style || f.attitude || f.motivation || "";
    return this._zoneShell(pnj, "incarnation", `<div class="card-section flavor-section">${rows}</div>`, summary);
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
     Cartes organisées par usage de jeu : zones Combat / Capacités /
     Incarnation / Détails, chacune repliable (CP1). Préférences :
     défaut global (Réglages) + surcharge PAR ZONE, PAR CARTE (carte de
     pli sparse mémorisée sur pnj._zoneOpen). Corps par édition dans les
     fichiers cardrenderer.sr5/sr6/anarchy.js.
     ======================================================== */

  /** Préférences d'affichage, avec défaut ADAPTATIF (CH-C1).
      Le « compact » = zones repliées par défaut (layout) : attributs,
      Jets de situation et équipement vivent DANS la zone Détails repliable (cf.
      cardrenderer.sr5/sr6/anarchy.js), dont .zone-toggle reste l'affordance
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
    // Contexte bibliothèque (consultation, D6a) : référence toujours repliée,
    // quel que soit l'écran — le mur de cartes desktop devient un annuaire
    // scannable. Le générateur (aucun contexte transmis) garde l'aperçu riche.
    if (deps && deps.context === "library") return { layout: "compact", ...shows };
    // Sinon, une seule base responsive à défaut adaptatif : carte compacte
    // (référence repliée) sur tablette/mobile (≤ 1024px), dépliée sur desktop.
    const compact =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1024px)").matches;
    return { layout: compact ? "compact" : "expanded", ...shows };
  },

  /** Libellés verrouillés (CP1/CONTRIBUTING § Chrome de carte). Magie/Matrice
      (CP3) reprennent le libellé de leur module (_MODULES), gardés ici aussi
      pour que _zoneShell reste un point d'entrée unique. */
  _ZONE_LABELS: {
    combat: "Combat",
    capacites: "Capacités",
    incarnation: "Incarnation",
    details: "Détails",
    magie: "Magie",
    matrice: "Matrice",
  },

  /** Cette zone est-elle ouverte pour cette carte ? Résolution (I4) :
      1. override par carte, PAR ZONE (persisté, sparse) — gagne et reste.
      2. défaut de contexte (_displayPrefs).
      Compat : l'ancien pnj._refOpen (booléen unique, pré-CP1) ne couvrait
      que l'ex-Référence → lu comme repli pour la zone "details" seulement,
      tant qu'aucun override _zoneOpen.details n'existe. Présentation pure,
      aucun schemaVersion (comme _refOpen hier). */
  _zoneIsOpen(pnj, zoneKey, deps = CardRenderer.liveDeps()) {
    const map = pnj._zoneOpen;
    if (map && typeof map[zoneKey] === "boolean") return map[zoneKey];
    if (zoneKey === "details" && typeof pnj._refOpen === "boolean") return pnj._refOpen;
    return this._displayPrefs(deps).layout === "expanded";
  },

  /** Pastille de réserve lançable (Défense, Encaissement…). */
  _rollPill(label, value, title, glyph) {
    if (value == null) return "";
    const glyphHtml = glyph
      ? `<span class="pill-glyph" aria-hidden="true">${glyph}</span> `
      : "";
    return `<span class="stat-pill rollable combat-pill" data-roll="${value}" data-roll-label="${this._esc(label)}" title="${this._esc(title || label)}">${glyphHtml}${this._esc(label)} <strong>${value}</strong></span>`;
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

  /** Coquille de zone repliable (CP1) : bouton (libellé + résumé + chevron)
      + corps animé (`.zone-body`, fold CSS dans pnj-card.css). Zone/module
      vide = rien (I3) — pas de zone qui n'a aucun contenu à montrer. */
  _zoneShell(pnj, zoneKey, bodyHtml, summary = "") {
    if (!bodyHtml) return "";
    const open = this._zoneIsOpen(pnj, zoneKey);
    const label = this._ZONE_LABELS[zoneKey] || zoneKey;
    return `<div class="card-zone${open ? "" : " zone-collapsed"}" data-zone="${zoneKey}">
      <button class="zone-toggle" data-zone-toggle="${zoneKey}" data-id="${pnj.id}">
        <span class="zone-toggle-label">${this._esc(label)}</span>
        ${summary ? `<span class="zone-toggle-summary">${this._esc(summary)}</span>` : ""}
        <span class="chev">▾</span>
      </button>
      <div class="zone-body"><div class="zone-body-inner"><div class="zone-body-pad">${bodyHtml}</div></div></div>
    </div>`;
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

  /** Malus cumulé en marge du moniteur (K2, grille du livre — SR6 p.43) :
      même valeur déjà calculée par chaque renderer (Utils.woundMalus), donc
      pas de nouveau calcul ici. Vide si aucun malus (cas le plus fréquent). */
  _monitorMalusBadge(malus) {
    if (!(malus > 0)) return "";
    return `<div class="monitor-malus" title="Malus de blessure cumulé (déjà appliqué aux tests)">−${malus}D</div>`;
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
    // Note de palier (Anarchy 1re : dégâts/effet propres au profil, ex. "8P aire").
    if (sp.note) bits.push(sp.note);
    if (sp.drain != null) bits.push(`Drain ${sp.drain}`);
    else if (sp.seuil != null) bits.push(`Seuil ${sp.seuil}`);
    else if (sp.niveau != null) bits.push(`Niveau ${sp.niveau}`);
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
  /** CP2 : inventaire consolidé — équipement porté + augmentations en UNE
      seule section (au lieu de deux fragments distincts). Sous-libellés
      (patron .ref-block/.ref-lbl, déjà utilisé pour Attributs en Détails)
      seulement si les deux groupes coexistent — sinon liste plate, pas de
      sous-titre qui ne distingue rien (minimalisme). `augs` optionnel. */
  _equipSection(pnj, items, edition, deps, augs) {
    const tags = (items || [])
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
    const augsHtml = (augs || []).length
      ? augs.map((a) => this._contentTag(a)).join("")
      : "";
    if (!tags && !augsHtml) return "";
    const body =
      tags && augsHtml
        ? `<div class="ref-block"><div class="ref-lbl">Porté</div><div class="card-section-content">${tags}</div></div>
           <div class="ref-block"><div class="ref-lbl">Augmentations</div><div class="card-section-content">${augsHtml}</div></div>`
        : `<div class="card-section-content">${tags || augsHtml}</div>`;
    return `<div class="card-section">
      <div class="card-section-label">Équipement</div>
      ${body}
    </div>`;
  },

  _esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  /** Le bouton « Portrait IA » est-il pertinent ? Opt-in actif et aucun
      portrait encore généré (véhicules exclus — hors scope). Consommé par
      _footer pour décider d'un item du menu ⋯. */
  _portraitEnabled(pnj, deps) {
    return (
      pnj.type !== "vehicle" &&
      !pnj.portraitUrl &&
      !!deps.Settings &&
      deps.Settings.getPortraitSettings().enabled
    );
  },

  /* ---- Journal de fiche (F2) ----
     Notes datées, empilées en tête, repliées derrière un bouton pour ne pas
     alourdir la grille. Le compte reste visible (mémoire présente). L'état
     d'ouverture vit dans un Set TRANSIENT (jamais sérialisé sur l'entité,
     contrairement à _zoneOpen) : uniquement de la présentation.
     Exclu des entités liées/transitoires (véhicules, esprits, enfants) :
     le journal est la mémoire d'une fiche autonome qu'on suit dans le temps. */
  _journalOpen: new Set(),

  _journal(pnj) {
    if (pnj.type === "vehicle" || pnj.type === "spirit" || pnj.ownerId) return "";
    const entries = Array.isArray(pnj.journal) ? pnj.journal : [];
    const open = this._journalOpen.has(pnj.id);
    const count = entries.length
      ? ` <span class="journal-count">${entries.length}</span>`
      : "";
    if (!open) {
      return `<div class="pnj-journal">
        <button class="journal-toggle" data-action="journal-toggle" data-id="${pnj.id}"
          aria-expanded="false" title="Notes de séance sur cette fiche">＋ Journal${count}</button>
      </div>`;
    }
    const rows = entries
      .map((e) => {
        const d = new Date(e.ts);
        const dstr = isNaN(d.getTime())
          ? ""
          : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
        return `<li class="journal-entry" data-ts="${e.ts}">
          <span class="journal-date">${dstr}</span>
          <span class="journal-text">${Mentions.renderText(e.text)}</span>
          <button class="journal-del" data-action="journal-remove" data-id="${pnj.id}"
            data-ts="${e.ts}" title="Supprimer cette note" aria-label="Supprimer">✕</button>
        </li>`;
      })
      .join("");
    return `<div class="pnj-journal">
      <button class="journal-toggle" data-action="journal-toggle" data-id="${pnj.id}"
        aria-expanded="true" title="Replier le journal">▾ Journal${count}</button>
      <div class="journal-body">
        ${entries.length ? `<ul class="journal-list">${rows}</ul>` : ""}
        <div class="journal-input-row">
          <input type="text" class="journal-input" data-journal-input data-mentions data-id="${pnj.id}"
            maxlength="200" placeholder="Une note, datée…" aria-label="Nouvelle note">
          <button class="journal-add-btn" data-action="journal-add" data-id="${pnj.id}">Ajouter</button>
        </div>
      </div>
    </div>`;
  },

  /** Focus (re)mis sur l'input de journal d'une fiche, après un rendu. Le
      journal vit aussi bien sur un `.pnj-card` que sur un `.contact-card`
      (mêmes data-* de délégation) : on cible les deux familles de carte. */
  _focusJournalInput(id) {
    setTimeout(() => {
      document
        .querySelector(
          `.pnj-card[data-id="${id}"] [data-journal-input], .contact-card[data-id="${id}"] [data-journal-input]`,
        )
        ?.focus();
    }, 0);
  },

  /** Ouvre/replie l'input du journal (présentation seule). Rafraîchit la carte
      via UI (route PNJ vs contact), puis met le focus sur l'input si on vient
      d'ouvrir. */
  _toggleJournal(id) {
    if (this._journalOpen.has(id)) this._journalOpen.delete(id);
    else this._journalOpen.add(id);
    UI.refreshEntityCard(id);
    if (this._journalOpen.has(id)) this._focusJournalInput(id);
  },

  /** Lit l'input de la carte cliquée et délègue l'ajout à UI (persistance),
      puis re-focus l'input (l'ajout reste ouvert pour empiler plusieurs notes). */
  _submitJournal(actionEl) {
    const id = actionEl.dataset.id;
    const input = actionEl
      .closest(".pnj-card, .contact-card")
      ?.querySelector("[data-journal-input]");
    const text = input ? input.value : "";
    if (!text.trim()) return;
    UI.addJournalEntry(id, text);
    this._focusJournalInput(id);
  },

  /* ---- Suivi de campagne (Progression) ----
     Soldes vivants (nuyens, Karma, réputation, compteurs libres) + registre
     daté, replié comme le journal. Neutre et PC-only : aucune branche
     d'édition — les ressources arrivent de `Campaign.tracks` (dont la
     réputation via `edModule.reputationTracks`). L'état d'ouverture vit dans
     un Set TRANSIENT (présentation seule, jamais sérialisé). */
  _progressionOpen: new Set(),

  /* Vague A3 : marqueur TRANSIENT (présentation seule) du dernier compteur
     modifié par une action directe sur la carte (`_submitLedger`), pour lui
     faire jouer un flash bref au re-rendu qui suit. Auto-consommé dans
     `_trackPill` : une entrée n'y survit qu'un seul rendu. */
  _flashTrack: new Map(),

  _progressionZone(pnj) {
    if (!pnj.isPC) return "";
    const edModule = App.getEditionModule(pnj.edition);
    const tracks = Campaign.tracks(pnj, edModule);
    // Rendu (et donc consommation du marqueur de flash A3) sur TOUS les
    // tracks, y compris solde nul : un track tombé à 0 n'a pas de pastille où
    // flasher, mais son marqueur ne doit pas trainer pour un rendu ultérieur.
    const pills = tracks
      .map((t) => ({ t, bal: Campaign.balance(pnj.campaign, t.key) }))
      .map((b) => ({ ...b, html: this._trackPill(b.t, b.bal, pnj.id) }))
      .filter((b) => b.bal !== 0)
      .map((b) => b.html)
      .join("");
    const open = this._progressionOpen.has(pnj.id);
    if (!open) {
      return `<div class="pnj-progression">
        <button class="progression-toggle" data-action="progression-toggle" data-id="${pnj.id}"
          aria-expanded="false" title="Suivi de campagne (nuyens, Karma…)">＋ Progression</button>
        ${pills ? `<div class="progression-pills">${pills}</div>` : ""}
      </div>`;
    }
    const entries = (pnj.campaign && pnj.campaign.ledger) || [];
    const rows = entries.map((e) => this._ledgerRow(pnj, e, tracks)).join("");
    const addBtns = tracks
      .map(
        (t) =>
          `<button class="progression-res-btn" data-action="ledger-add" data-id="${pnj.id}"
            data-res="${this._esc(t.key)}" title="Appliquer le montant à ${this._esc(t.label)}">${this._esc(t.glyph || t.label)}</button>`,
      )
      .join("");
    return `<div class="pnj-progression">
      <button class="progression-toggle" data-action="progression-toggle" data-id="${pnj.id}"
        aria-expanded="true" title="Replier">▾ Progression</button>
      <div class="progression-body">
        ${pills ? `<div class="progression-pills">${pills}</div>` : ""}
        ${entries.length ? `<ul class="progression-list">${rows}</ul>` : ""}
        <div class="progression-add">
          <div class="progression-add-fields">
            <input type="number" class="progression-amount" data-id="${pnj.id}"
              placeholder="± montant" aria-label="Montant (signé)">
            <input type="text" class="progression-reason" data-id="${pnj.id}" data-mentions
              maxlength="120" placeholder="Motif (run, achat…)" aria-label="Motif">
          </div>
          <div class="progression-res-row">${addBtns}</div>
        </div>
      </div>
    </div>`;
  },

  /** Pastille de solde d'une ressource. Devise (glyphe) → « 8 000 ¥ » ;
      score → « Renommée 3 » (le négatif SR6 s'affiche naturellement). */
  _trackPill(t, bal, pnjId) {
    const flashKey = pnjId != null ? `${pnjId}:${t.key}` : null;
    const flash = flashKey && this._flashTrack.delete(flashKey) ? " entry-flash" : "";
    if (t.glyph)
      return `<span class="stat-pill accent${flash}"><strong>${bal.toLocaleString("fr-FR")}</strong> ${this._esc(t.glyph)}</span>`;
    return `<span class="stat-pill accent${flash}">${this._esc(t.label)} <strong>${bal}</strong></span>`;
  },

  /** Ligne du registre : date · montant signé · motif (puces @/#) · suppression.
      Réutilise `.journal-date`/`.journal-del` (même grammaire que le journal). */
  _ledgerRow(pnj, e, tracks) {
    const d = new Date(e.ts);
    const dstr = isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    const t = tracks.find((x) => x.key === e.res);
    const sign = e.delta > 0 ? "+" : "";
    const amount =
      t && t.glyph
        ? `${sign}${e.delta.toLocaleString("fr-FR")} ${this._esc(t.glyph)}`
        : `${sign}${e.delta} ${this._esc(t ? t.label : e.res)}`;
    const cls = "progression-delta" + (e.delta < 0 ? " neg" : " pos");
    const reason = e.reason
      ? `<span class="progression-reason-txt">${Mentions.renderText(e.reason)}</span>`
      : "";
    return `<li class="progression-entry">
      <span class="journal-date">${dstr}</span>
      <span class="${cls}">${amount}</span>
      ${reason}
      <button class="journal-del" data-action="ledger-remove" data-id="${pnj.id}"
        data-ts="${e.ts}" title="Supprimer cette écriture" aria-label="Supprimer">✕</button>
    </li>`;
  },

  /** Ouvre/replie la zone Progression (présentation seule). */
  _toggleProgression(id) {
    if (this._progressionOpen.has(id)) this._progressionOpen.delete(id);
    else this._progressionOpen.add(id);
    UI.refreshEntityCard(id);
  },

  /** Lit le montant + motif de la carte cliquée et écrit l'entrée pour la
      ressource du bouton. Le re-rendu (refreshEntityCard) vide les champs. */
  _submitLedger(actionEl) {
    const id = actionEl.dataset.id;
    const res = actionEl.dataset.res;
    const card = actionEl.closest(".pnj-card");
    const delta = parseInt(card?.querySelector(".progression-amount")?.value, 10);
    if (!Number.isFinite(delta) || delta === 0) return;
    const reason = card?.querySelector(".progression-reason")?.value || "";
    this._flashTrack.set(`${id}:${res}`, true);
    UI.addLedgerEntry(id, res, delta, reason);
  },

  /* ---- Footer ---- */
  /* Grammaire de pied unifiée (voir CONTRIBUTING « Chrome de carte ») : on
     décrit les actions, CardFooter les dispose (secondaire + primaire + ⋯).
     Seul le primaire porte un glyphe. Le socle préfixe ★/🏷 à gauche. */
  _footer(pnj, actions, deps = CardRenderer.liveDeps()) {
    const id = pnj.id;
    const saved = JSON.stringify(actions);

    // Véhicule / esprit invoqué : « Ranger » (quitter la scène) en primaire
    // terminal ; Éditer en secondaire.
    if (pnj.type === "vehicle") {
      return CardFooter.render(
        [
          { kind: "secondary", label: "Éditer", attrs: `data-action="edit-open" data-id="${id}"` },
          { kind: "primary", danger: true, icon: "⏏", label: "Ranger", attrs: `data-action="dismiss-vehicle" data-id="${id}"` },
        ],
        { savedActions: saved },
      );
    }
    if (pnj.type === "spirit" && pnj.ownerId) {
      const acts = [
        { kind: "secondary", label: "Éditer", attrs: `data-action="edit-open" data-id="${id}"` },
        { kind: "primary", danger: true, icon: "⏏", label: "Ranger", attrs: `data-action="dismiss-spirit" data-id="${id}"` },
      ];
      if (this._portraitEnabled(pnj, deps))
        acts.push({ kind: "menu", label: "Portrait IA", attrs: `data-action="generate-portrait" data-id="${id}"` });
      return CardFooter.render(acts, { savedActions: saved });
    }

    const has = (k) => actions.includes(k);
    const acts = [];

    // Primaire : Sauvegarder (générateur) sinon ⚔ Combat (l'action reine à la table).
    if (has("save"))
      acts.push({ kind: "primary", icon: "⊕", label: "Sauvegarder", attrs: `data-action="save-pnj" data-id="${id}"` });
    else
      acts.push({ kind: "primary", icon: "⚔", label: "Combat", attrs: `data-action="add-to-encounter" data-id="${id}"` });

    // Secondaire visible : Éditer.
    if (has("edit"))
      acts.push({ kind: "secondary", label: "Éditer", attrs: `data-action="edit-open" data-id="${id}"` });

    // ⋯ : Combat (rétrogradé quand Sauvegarder est primaire), Dupliquer,
    // Portrait, Foundry, puis le destructif en dernier (rouge, annulable).
    if (has("save"))
      acts.push({ kind: "menu", label: "Combat", attrs: `data-action="add-to-encounter" data-id="${id}"` });
    if (has("remove"))
      acts.push({ kind: "menu", label: "Dupliquer", attrs: `data-action="duplicate-pnj" data-id="${id}"` });
    if (this._portraitEnabled(pnj, deps))
      acts.push({ kind: "menu", label: "Portrait IA", attrs: `data-action="generate-portrait" data-id="${id}"` });
    // Export Foundry : uniquement si l'édition l'expose. Lecture neutre du
    // module d'édition, jamais de branche `App.edition === …` (prohibition #1).
    if (App.getEditionModule(pnj.edition)?.foundryExport)
      acts.push({ kind: "menu", label: "Foundry", attrs: `data-action="export-foundry" data-id="${id}"` });
    if (has("discard"))
      acts.push({ kind: "menu", danger: true, label: "Ranger", attrs: `data-action="discard" data-id="${id}"` });
    if (has("remove"))
      acts.push({ kind: "menu", danger: true, label: "Supprimer", attrs: `data-action="remove-pnj" data-id="${id}"` });
    if (has("remove-pj"))
      acts.push({ kind: "menu", danger: true, label: "Supprimer", attrs: `data-action="remove-pj" data-id="${id}"` });

    return CardFooter.render(acts, {
      savedActions: saved,
      savedLabel: has("saved") ? "✓ Sauvegardé" : null,
    });
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
          SummonPanel.toggleService(id, Number(actionEl.dataset.idx));
          break;
        case "toggle-armor":
          UI.toggleArmorOption(id, Number(actionEl.dataset.idx));
          break;
        case "open-summon":
          SummonPanel.open(id);
          break;
        case "toggle-monitor":
          UI.toggleMonitor(id, actionEl.dataset.sev, Number(actionEl.dataset.idx));
          break;
        case "toggle-deck-monitor":
          // M2 : case du moniteur matriciel du deck (pnj.cyberdeck.filled),
          // distinct de toggle-monitor (champs top-level pnj.*Filled).
          UI.toggleDeckMonitor(id, Number(actionEl.dataset.idx));
          break;
        case "deck-realloc":
          // M2 : réallocation ASDF/ACTF en un tap (SR5 action gratuite, SR6
          // action mineure — cf. Cyberdeck.reallocatable/cyberdeckModel).
          UI.reallocDeck(id, actionEl.dataset.from, actionEl.dataset.to);
          break;
        case "deck-open-matrix": {
          // M3 : ouvre le tracker Matrice du serveur ciblé par ce decker —
          // en scène si ce serveur y est déjà lié (reste dans le tracker de
          // combat), sinon via le panneau Serveurs (hors combat comme en
          // combat sur un serveur non lié).
          const pnj = PnjLookup.find(id);
          const srv = pnj && DeckRun.targetServer(pnj);
          if (!srv) break;
          Intrusion._get(srv.id);
          srv.intrusion.open = true;
          Servers.save();
          Servers.render();
          if (typeof Encounter !== "undefined" && Encounter.state && Encounter.state.serverId === srv.id) {
            Encounter.openMatrixDrawer();
          } else {
            App.showPanel("matrix");
          }
          break;
        }
        case "deck-attack": {
          // M3 : jet de piratage — même forme que Intrusion.rollIC (un seul
          // pool, pas de test opposé calculé ; la formule livre reste à
          // affiner en M4, cf. Cyberdeck.rollAttack). M6 : Bruit de scène
          // retranché si une scène de combat est active (hors combat, pas de
          // Bruit — l'action n'existe pas encore, cf. Encounter._noisyPool).
          const pnj = PnjLookup.find(id);
          const srv = pnj && DeckRun.targetServer(pnj);
          const atk = pnj && Cyberdeck.rollAttack(pnj.edition, pnj.cyberdeck);
          if (!srv || !atk) break;
          const pool = typeof Encounter !== "undefined" ? Encounter._noisyPool(atk.pool) : atk.pool;
          const res = Dice.computeRoll(pool);
          DiceRoller.show(res, { label: `${atk.label} — ${pnj.name} vs ${srv.name}`, who: pnj.name });
          break;
        }
        case "deck-action": {
          // M7 : action matricielle offensive du râtelier (pic de données & co.).
          // Même forme que deck-attack (Dice.computeRoll + DiceRoller.show +
          // Bruit de scène M6), mais par action nommée, et INDÉPENDANTE de la
          // cible (le serveur visé ne sert plus qu'à nommer la cible dans le
          // label). Une action narrative (pool null, ex. « Pirater la Matrice »
          // en Anarchy) devient un marqueur toast, sans jet de dés. Le MJ garde
          // la main : la VD est affichée, jamais appliquée automatiquement
          // (aucun test opposé auto-résolu).
          const pnj = PnjLookup.find(id);
          if (!pnj) break;
          const act = Cyberdeck.rollAction(pnj.edition, pnj.cyberdeck, actionEl.dataset.key);
          if (!act) break;
          const srv = DeckRun.targetServer(pnj);
          const vs = srv ? ` vs ${srv.name}` : "";
          const dvTxt = act.dv != null ? ` (VD ${act.dv})` : "";
          const label = `${act.label}${dvTxt} — ${pnj.name}${vs}`;
          if (act.pool == null) {
            toast(label);
            break;
          }
          const pool = typeof Encounter !== "undefined" ? Encounter._noisyPool(act.pool) : act.pool;
          const res = Dice.computeRoll(pool);
          DiceRoller.show(res, { label, who: pnj.name });
          break;
        }
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
          SummonPanel.dismissSpirit(id);
          break;
        case "toggle-spirit-fold":
          SummonPanel.toggleFold(id);
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
        case "journal-toggle":
          this._toggleJournal(id);
          break;
        case "journal-add":
          this._submitJournal(actionEl);
          break;
        case "journal-remove":
          UI.removeJournalEntry(id, actionEl.dataset.ts);
          break;
        case "progression-toggle":
          this._toggleProgression(id);
          break;
        case "ledger-add":
          this._submitLedger(actionEl);
          break;
        case "ledger-remove":
          UI.removeLedgerEntry(id, actionEl.dataset.ts);
          break;
        case "mention-goto-notepad":
          Notepad.open();
          break;
        case "mention-goto": {
          const { id: mid, name: mname, type: mtype, slot: mslot, ts: mts } = actionEl.dataset;
          // Journal : déplier AVANT la révélation pour que le re-rendu de la
          // liste par _reveal inclue l'entrée ciblée dans le DOM.
          if (mslot === "journal") this._journalOpen.add(mid);
          Palette._reveal({ id: mid, name: mname, type: mtype });
          this._scrollToBacklink({ id: mid, slot: mslot, ts: mts });
          break;
        }
        case "contact-link-goto":
          Palette._reveal({ id: actionEl.dataset.id, name: actionEl.dataset.name, type: "contact" });
          break;
        case "contact-link-pick":
          // Ajout rapide : lier un contact EXISTANT au PJ (lien nu ; qualifiable
          // ensuite via Éditer). addContactLink persiste + rafraîchit la carte.
          Characters.addContactLink(id, actionEl.dataset.contactId, "", null);
          break;
        case "contact-create-open":
          ContactCreate.open(id);
          break;
      }
    });

    // M3 : cible Matrice du decker (<select>, pas un clic — délégation change
    // dédiée, même patron que MultiSelect._wire).
    document.addEventListener("change", (e) => {
      const el = e.target.closest('[data-action="deck-set-target"]');
      if (!el) return;
      UI.setDeckTarget(el.dataset.id, el.value);
    });

    // Entrée dans l'input de journal = ajouter la note (pas de <form> : évite
    // une soumission de page ; délégation cohérente avec le reste des cartes).
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const input = e.target.closest("[data-journal-input]");
      if (!input) return;
      e.preventDefault();
      const id = input.dataset.id;
      const text = input.value;
      if (!text.trim()) return;
      UI.addJournalEntry(id, text);
      this._focusJournalInput(id);
    });
  },
};
