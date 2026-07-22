"use strict";

/* ============================================================
   HUB — « Ombres portées » comme vue transverse du contenu
   ------------------------------------------------------------
   Agrège les trois collections (PNJ, contacts, serveurs) dans
   une seule vue organisée par DOSSIER. Pour la sélection courante
   (pilotée par DossierBar, partagée avec les écrans de génération),
   le contenu est sectionné automatiquement par type ; un filtre de
   type isole une famille. Le hub est CONSULTATION SEULE : la
   création vit dans les écrans dédiés (générateur, Contacts, Serveurs).
   Un bouton de création CONTEXTUEL y NAVIGUE selon la puce de type
   active — c'est le seul chemin mobile vers Contacts/Serveurs, absents
   de la bottom-nav.

   Le hub ne détient PAS la sélection : il délègue la sidebar de
   dossiers à DossierBar et s'y abonne pour se rafraîchir. Il ne
   porte que le filtre de type, le libellé, la grille et le bouton
   de création contextuel.
   ============================================================ */
import { Coherence } from "../rules/coherence.js";
import { DossierBar } from "../widgets/journal/dossierbar.js";
import { Dossiers } from "../widgets/journal/dossiers.js";
import { RunGen } from "./rungen.js";
import { Sync } from "./sync.js";
import { Utils } from "../core/utils.js";

export const Hub = {
  _type: "all", // all | pnj | contact | server
  _filter: "", // texte de recherche transverse (nom, archétype…)
  _wired: false,
  // Bandeau de rappel de sauvegarde : masqué pour la session courante
  // seulement (pas de Storage — réapparaît à la prochaine ouverture, comme
  // le bandeau de reprise de brouillon de CharGen).
  _saveReminderDismissed: false,
  _SAVE_REMINDER_DAYS: 7,
  // Puces de filtre auto : valeurs de facette sélectionnées, par axe.
  // État de SESSION (jamais persisté) ; réinitialisé à chaque render() (donc
  // au changement de dossier/type/mutation), conservé pendant la frappe et le
  // basculement d'une puce (qui passent par _renderMain).
  _facets: {
    pinned: new Set(),
    tags: new Set(),
    role: new Set(),
    milieu: new Set(),
    meta: new Set(),
  },

  /** Les axes de facette exposés. Les axes du MONDE (rangement de l'utilisateur)
      d'abord — Épinglés · Tags (A2c, MULTI-valués : une entité porte plusieurs
      tags) — puis les axes de GÉNÉRATION (Rôle · Milieu · Métatype, mono-valués).
      `get`/`getMany` lisent des champs NEUTRES (aucune branche d'édition) ;
      `labelOf` traduit la clé en libellé. `multi` = valeurs multiples par entité
      (OU au sein de l'axe = intersection non vide). `always` = rendu même à une
      seule valeur (l'axe « Épinglés » n'a qu'une valeur ★). */
  _facetDefs() {
    const roleLabel = (v) =>
      (typeof Coherence !== "undefined" && Coherence.ROLES?.[v]?.label) || v;
    const milieuLabel = (v) =>
      (typeof Coherence !== "undefined" && Coherence.MILIEUX?.[v]?.label) || v;
    const tagsOf = (e) => (typeof Tags !== "undefined" ? Tags.of(e) : []);
    const isPinned = (e) => typeof Tags !== "undefined" && Tags.isPinned(e);
    return [
      {
        key: "pinned",
        label: "Épinglés",
        multi: true,
        always: true,
        getMany: (e) => (isPinned(e) ? ["★"] : []),
        labelOf: () => "★ Épinglés",
      },
      { key: "tags", label: "Tags", multi: true, getMany: tagsOf, labelOf: (v) => v },
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

  /** Bandeau discret : « le filet existe, il faut le
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
      <button class="btn-secondary btn-small" data-action="backup-export"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-export"></use></svg> Sauvegarder mes fiches</button>
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
      // Onboarding léger : « commencer ici » seulement à vide total
      // (nouvel utilisateur) — pas en recherche ni dans un dossier vide.
      // Réutilise l'action show-panel, aucun nouveau mécanisme.
      const cta =
        !filtering && !selected
          ? `<button class="btn-primary btn-small empty-state-cta" data-action="show-panel" data-panel="generator"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-chevron"></use></svg> Créer un PNJ</button>`
          : "";
      box.innerHTML = `<div class="empty-state">
        <span class="empty-state-title">${filtering ? "Aucun résultat" : "Rien ici"}</span>
        ${body}
        ${cta}
      </div>`;
    }
    this._renderLabel(total);
    // A3 : rappel du rôle du dossier dans la campagne, en tête du contenu.
    // Après le rendu des sections/état-vide (qui réécrivent #hub-sections),
    // pour survivre aux deux chemins.
    this._renderContextBanner();
  },

  /** Bandeau de contexte de campagne (A3) : quand le dossier courant est typé
      (run/campagne), rappelle son rôle en tête du contenu et offre le raccourci
      utile — vers la prep pour une run, un décompte de runs pour une campagne.
      Réutilise la coquille `.hub-section` (aucun CSS neuf). L'étagère « scènes
      jouées » viendra avec la mémoire de scène (Part B). */
  _renderContextBanner() {
    const box = document.getElementById("hub-sections");
    const node = DossierBar.currentNode();
    if (!box || !node || !node.kind) return;
    let title = "";
    let right = "";
    if (node.kind === "run") {
      title = "◆ Run";
      const hasPrep = RunGen.forDossier(node.id).length > 0;
      right = hasPrep
        ? `<button class="btn-secondary btn-small" data-action="show-panel" data-panel="run">Voir la prep</button>`
        : `<span class="hub-section-count">prep non générée</span>`;
    } else if (node.kind === "campaign") {
      title = "❖ Campagne";
      const runs = Dossiers.children(node.id).filter((d) => d.kind === "run").length;
      right = `<span class="hub-section-count">${runs} run${runs > 1 ? "s" : ""}</span>`;
    } else {
      return;
    }
    // VIS-15 B4 — « ◈ Liens » : le graphe des relations scopé à cette portée
    // (campagne/run), dès qu'elle a convoqué au moins une entité. Une lentille
    // de plus sur la même vérité (convenedIds), jamais un store.
    const liensBtn = DossierBar.convenedIds(node.id).length
      ? `<button class="btn-secondary btn-small" data-hub data-action="scope-relations-graph" data-dossier="${node.id}" title="Voir les liens de « ${CardRenderer._esc(node.name)} » en graphe">◈ Liens</button>`
      : "";
    box.insertAdjacentHTML(
      "afterbegin",
      `<div class="hub-section hub-context-banner">
        <div class="hub-section-head">
          <span class="hub-section-title">${title} — ${CardRenderer._esc(node.name)}</span>
          ${liensBtn}${right}
        </div>
      </div>`,
    );
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
      if (def.multi) {
        // OU au sein d'un axe multi : l'entité passe si l'une de ses valeurs
        // (ses tags, ou son épingle) figure dans la sélection.
        if (!def.getMany(e).some((v) => active.has(v))) return false;
      } else if (!active.has(def.get(e))) return false;
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
        // Axe MULTI (tags/épingle) : chaque entité peut apporter plusieurs
        // valeurs ; axe mono : une seule (`get`).
        const raws = def.multi ? def.getMany(e) : [def.get(e)];
        for (const raw of raws) {
          if (raw == null || raw === "") continue;
          if (!values.has(raw)) values.set(raw, def.labelOf(raw));
        }
      }
      // Un axe n'apparaît qu'avec ≥ 2 valeurs (une puce seule ne filtrerait
      // rien) — SAUF les axes `always` (« Épinglés » : une valeur ★ suffit).
      if (!values.size || (values.size < 2 && !def.always)) continue;
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
      } else if (el.dataset.action === "scope-relations-graph") {
        // VIS-15 B4 — le graphe scopé à la portée (campagne/run) sélectionnée.
        const id = el.dataset.dossier;
        const node = Dossiers.get(id);
        GraphView.open({
          memberIds: DossierBar.convenedIds(id),
          title: node ? `Liens — ${node.name}` : "Liens",
        });
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

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Hub = Hub;
