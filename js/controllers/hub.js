"use strict";

/* ============================================================
   HUB — « Ombres portées » comme vue transverse du contenu
   ------------------------------------------------------------
   Agrège les trois collections (PNJ, contacts, serveurs) dans
   une seule vue organisée par DOSSIER. Pour la sélection courante
   (pilotée par DossierBar, partagée avec les écrans de génération),
   le contenu est sectionné automatiquement par type ; un filtre de
   type isole une famille. Le hub est CONSULTATION SEULE (CH-C3) : la
   création vit dans les écrans dédiés (générateur, Contacts, Serveurs).
   Un bouton de création CONTEXTUEL y NAVIGUE selon la puce de type
   active — c'est le seul chemin mobile vers Contacts/Serveurs, absents
   de la bottom-nav.

   Le hub ne détient PAS la sélection : il délègue la sidebar de
   dossiers à DossierBar et s'y abonne pour se rafraîchir. Il ne
   porte que le filtre de type, le libellé, la grille et le bouton
   de création contextuel.
   ============================================================ */
const Hub = {
  _type: "all", // all | pnj | contact | server
  _filter: "", // texte de recherche transverse (nom, archétype…)
  _wired: false,
  // Bandeau de rappel de sauvegarde (F3) : masqué pour la session courante
  // seulement (pas de Storage — réapparaît à la prochaine ouverture, comme
  // le bandeau de reprise de brouillon de CharGen).
  _saveReminderDismissed: false,
  _SAVE_REMINDER_DAYS: 7,
  // Puces de filtre auto (F1) : valeurs de facette sélectionnées, par axe.
  // État de SESSION (jamais persisté) ; réinitialisé à chaque render() (donc
  // au changement de dossier/type/mutation), conservé pendant la frappe et le
  // basculement d'une puce (qui passent par _renderMain).
  _facets: { role: new Set(), milieu: new Set(), meta: new Set() },

  /** Les 3 axes de facette exposés (Rôle · Milieu · Métatype). `get` lit une
      métadonnée de génération GÉNÉRIQUE (aucune branche d'édition) ; `labelOf`
      traduit la clé interne en libellé lisible via les tables Coherence. */
  _facetDefs() {
    const roleLabel = (v) =>
      (typeof Coherence !== "undefined" && Coherence.ROLES?.[v]?.label) || v;
    const milieuLabel = (v) =>
      (typeof Coherence !== "undefined" && Coherence.MILIEUX?.[v]?.label) || v;
    return [
      { key: "role", label: "Rôle", get: (e) => e.role, labelOf: roleLabel },
      { key: "milieu", label: "Milieu", get: (e) => e.milieu, labelOf: milieuLabel },
      { key: "meta", label: "Métatype", get: (e) => e.meta || e.metatype, labelOf: (v) => v },
    ];
  },

  _typeDefs() {
    return [
      { col: Shadows, type: "pnj", label: "PNJ" },
      { col: ContactsBook, type: "contact", label: "Contacts" },
      { col: Servers, type: "server", label: "Serveurs" },
      { col: Characters, type: "pj", label: "PJ" },
    ];
  },

  initPanel(type) {
    if (type) this._type = type;
    // Collections + DossierBar sont initialisés au choix d'édition ; ici on
    // ne fait que (dé)monter la sidebar du hub et s'abonner aux changements.
    DossierBar.mount("hub-dossier-list");
    DossierBar.subscribe(() => this.render());
    this._wire();
    DossierBar.refresh(); // rend l'arbre + notifie → this.render()
  },

  render() {
    // D3 : dossier vide (sélection courante, indépendant du filtre texte) →
    // masque les actions qui n'ont rien à faire (Combat/Sélectionner/
    // Imprimer/Foundry) ; Charger + recherche restent utiles à vide.
    const empty = DossierBar.count() === 0;
    document.getElementById("panel-shadows").classList.toggle("hub-empty", empty);
    // Le socle de contenu change (dossier/type/mutation) : les facettes
    // sélectionnées ne s'y appliquent peut-être plus → on repart à zéro
    // (évite l'écran vide « sans raison visible », garde-fou D4-a).
    for (const s of Object.values(this._facets)) s.clear();
    this._renderSaveReminder();
    this._renderChips();
    this._renderCreate();
    this._renderMain(); // met aussi le libellé à jour (compte affiché)
  },

  /** Bandeau discret (F3, FIELD_STUDY REC-3) : « le filet existe, il faut le
      tendre avant la chute » — jamais sauvegardé, ou dernière sauvegarde trop
      ancienne. Réutilise l'horodatage `lastAt` partagé avec la synchro
      (Sync.daysSinceSave) et l'action backup-export déjà câblée (app.js). */
  _renderSaveReminder() {
    const box = document.getElementById("hub-save-reminder");
    if (!box) return;
    const days = Sync.daysSinceSave();
    const stale = days === null || days >= this._SAVE_REMINDER_DAYS;
    if (this._saveReminderDismissed || !stale) {
      box.innerHTML = "";
      return;
    }
    const txt =
      days === null ? "Vous n'avez encore jamais sauvegardé vos fiches." : `Dernière sauvegarde : il y a ${days} jours.`;
    box.innerHTML = `<div class="hub-save-reminder">
      <span>${txt}</span>
      <button class="btn-secondary btn-small" data-action="backup-export">⤓ Sauvegarder mes fiches</button>
      <button class="btn-icon-tiny" data-hub data-action="dismiss-save-reminder" title="Masquer">✕</button>
    </div>`;
  },

  // Chaque type de contenu → son écran de création dédié. En vue « Tout »
  // (pas d'entrée manquante), le bouton est masqué (pas de cible unique).
  _CREATE_TARGET: {
    pnj: { panel: "generator", label: "PNJ" },
    contact: { panel: "contacts", label: "contact" },
    server: { panel: "matrix", label: "serveur" },
    pj: { panel: "characters", label: "PJ" },
  },

  /** Bouton de création contextuel : navigue (show-panel) vers l'écran de
      création du type filtré. Reste dans la doctrine « consultation seule »
      (il ne crée pas en ligne) et fournit sur mobile le seul accès à la
      création de contacts/serveurs, absents de la bottom-nav. */
  _renderCreate() {
    const btn = document.getElementById("hub-create-btn");
    if (!btn) return;
    const target = this._CREATE_TARGET[this._type];
    if (!target) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    btn.dataset.panel = target.panel;
    btn.textContent = `＋ Nouveau ${target.label}`;
  },

  // `shown` = nombre d'entités réellement affichées après filtrage ; en
  // recherche active on montre « affichées/total » pour que le compte ne mente
  // pas quand le filtre masque des fiches du dossier.
  _renderLabel(shown) {
    const label = document.getElementById("hub-dossier-label");
    if (!label) return;
    const node = DossierBar.currentNode();
    const base = node ? node.name : "Tout le contenu";
    const total = DossierBar.count();
    label.textContent = this._filter.trim()
      ? `${base} (${shown}/${total})`
      : `${base} (${total})`;
  },

  _renderChips() {
    document.querySelectorAll("#panel-shadows .hub-type-chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.type === this._type);
    });
  },

  _renderMain() {
    const box = document.getElementById("hub-sections");
    if (!box) return;
    box.innerHTML = "";

    // Requête normalisée UNE fois pour toutes les sections (comme
    // Collection._renderGrid) ; chaque collection filtre ensuite ses membres
    // avec sa propre logique _matchesFilter (searchFields neutre par type).
    const q = Utils.searchNorm(this._filter).trim();
    const words = q ? q.split(/\s+/) : [];

    // Passe 1 — entités retenues par le TEXTE (avant facettes), par type.
    // Sert à la fois à peupler les puces (options stables tant qu'on toggle)
    // et à rendre les sections après application des facettes.
    const perType = [];
    const textMatched = [];
    for (const { col, type, label } of this._typeDefs()) {
      if (this._type !== "all" && this._type !== type) continue;
      let ids = DossierBar.memberIds(col);
      if (words.length) ids = this._filterIds(col, ids, words);
      const byId = new Map(col.data.all.map((e) => [e.id, e]));
      const ents = ids.map((id) => byId.get(id)).filter(Boolean);
      perType.push({ col, type, label, ents });
      textMatched.push(...ents);
    }

    // Puces de facette calculées sur l'ensemble texte (elles ne disparaissent
    // pas quand on en sélectionne une).
    this._renderFacets(textMatched);

    // Passe 2 — applique les facettes actives et rend les sections.
    let total = 0;
    for (const { col, label, ents } of perType) {
      const kept = ents.filter((e) => this._passesFacets(e));
      if (!kept.length) continue;
      total += kept.length;

      const section = document.createElement("div");
      section.className = "hub-section";
      const head = document.createElement("div");
      head.className = "hub-section-head";
      head.innerHTML = `<span class="hub-section-title">${label}</span><span class="hub-section-count">${kept.length}</span>`;
      section.appendChild(head);
      const grid = document.createElement("div");
      grid.className = "cards-zone";
      col.renderMembers(grid, kept.map((e) => e.id), "library");
      section.appendChild(grid);
      box.appendChild(section);
    }

    if (!total) {
      const facetsActive = this._facetsActive();
      const filtering = !!this._filter.trim() || facetsActive;
      const selected = DossierBar.current !== "all";
      const body = this._filter.trim()
        ? `Aucune fiche ne correspond à « ${CardRenderer._esc(this._filter.trim())} ».`
        : facetsActive
          ? "Aucune fiche ne correspond aux filtres actifs."
          : selected
          ? "Ce dossier est vide pour ce filtre."
          : "Générez du contenu (PNJ, contacts, serveurs) et rangez-le dans un dossier.";
      // Onboarding léger (CH-U11) : « commencer ici » seulement à vide total
      // (nouvel utilisateur) — pas en recherche ni dans un dossier vide.
      // Réutilise l'action show-panel, aucun nouveau mécanisme.
      const cta =
        !filtering && !selected
          ? `<button class="btn-primary btn-small empty-state-cta" data-action="show-panel" data-panel="generator">▸ Créer un PNJ</button>`
          : "";
      box.innerHTML = `<div class="empty-state">
        <span class="empty-state-title">${filtering ? "Aucun résultat" : "Rien ici"}</span>
        ${body}
        ${cta}
      </div>`;
    }
    this._renderLabel(total);
  },

  /** Restreint une liste d'ids d'une collection aux entités qui matchent la
      recherche transverse, en réutilisant SA logique _matchesFilter (donc son
      searchFields neutre) — pas de résolveur concurrent. `words` est déjà
      normalisé/découpé par _renderMain. */
  _filterIds(col, ids, words) {
    const byId = new Map(col.data.all.map((e) => [e.id, e]));
    return ids.filter((id) => {
      const e = byId.get(id);
      return e && col._matchesFilter(e, words);
    });
  },

  _facetsActive() {
    return Object.values(this._facets).some((s) => s.size > 0);
  },

  /** Une entité passe si, pour CHAQUE axe ayant des valeurs actives, sa propre
      valeur figure dans la sélection (ET entre axes, OU au sein d'un axe). Une
      entité sans valeur sur un axe actif est écartée — la puce narrows
      honnêtement (ex. un serveur n'a pas de « Rôle »). */
  _passesFacets(e) {
    for (const def of this._facetDefs()) {
      const active = this._facets[def.key];
      if (!active.size) continue;
      if (!active.has(def.get(e))) return false;
    }
    return true;
  },

  /** Rend les puces auto (Rôle · Milieu · Métatype) à partir des valeurs
      DISTINCTES présentes dans `entities`. Un axe n'apparaît qu'avec ≥ 2
      valeurs (une puce seule ne filtrerait rien). */
  _renderFacets(entities) {
    const box = document.getElementById("hub-facets");
    if (!box) return;
    let html = "";
    for (const def of this._facetDefs()) {
      const values = new Map(); // valeur brute → libellé
      for (const e of entities) {
        const raw = def.get(e);
        if (raw == null || raw === "") continue;
        if (!values.has(raw)) values.set(raw, def.labelOf(raw));
      }
      if (values.size < 2) continue;
      const active = this._facets[def.key];
      const chips = [...values.entries()]
        .sort((a, b) => String(a[1]).localeCompare(String(b[1]), "fr"))
        .map(([raw, lab]) => {
          const on = active.has(raw) ? " active" : "";
          return `<button class="hub-facet-chip${on}" data-hub data-action="hub-facet"
            data-facet="${def.key}" data-value="${CardRenderer._esc(raw)}"
            aria-pressed="${active.has(raw)}">${CardRenderer._esc(lab)}</button>`;
        })
        .join("");
      html += `<div class="hub-facet-group">
        <span class="hub-facet-label">${def.label}</span>${chips}</div>`;
    }
    box.innerHTML = html;
  },

  toggleFacet(key, value) {
    const set = this._facets[key];
    if (!set) return;
    if (set.has(value)) set.delete(value);
    else set.add(value);
    this._renderMain();
  },

  setType(t) {
    this._type = t;
    this.render();
  },

  setFilter(v) {
    this._filter = v || "";
    this._renderMain();
  },

  _wire() {
    if (this._wired) return;
    this._wired = true;
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-hub][data-action]");
      if (!el) return;
      if (el.dataset.action === "hub-type") this.setType(el.dataset.type);
      else if (el.dataset.action === "hub-facet")
        this.toggleFacet(el.dataset.facet, el.dataset.value);
      else if (el.dataset.action === "dismiss-save-reminder") {
        this._saveReminderDismissed = true;
        this._renderSaveReminder();
      }
    });

    // Recherche transverse : debounce ~130 ms (aligné sur Collection) pour ne
    // reconstruire les sections qu'une fois par salve de frappes.
    document.addEventListener("input", (e) => {
      const el = e.target.closest("[data-hub-filter]");
      if (!el) return;
      const value = el.value;
      clearTimeout(this._filterTimer);
      this._filterTimer = setTimeout(() => this.setFilter(value), 130);
    });
  },
};
