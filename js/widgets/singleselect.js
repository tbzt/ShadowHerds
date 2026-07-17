"use strict";

/* ============================================================
   SINGLESELECT — menu déroulant stylé à choix unique

   Remplace un <select> natif quand son rendu doit rester cohérent
   avec le reste de l'app : la liste déroulante d'un <select> natif
   est souvent dessinée par l'OS (police système, pas celle de la
   page), contrairement à un menu maison en <div>.

   Partage la coquille visuelle de MultiSelect (.ms-control,
   .ms-dropdown...) via des règles CSS combinées, mais reste un
   composant distinct : un seul choix, fermeture au clic, pas de
   puces retirables.

   API :
     SingleSelect.create({ id, label, options, groups, value, placeholder })
       -> string HTML (options: [{ value, label, data? }] ; ou groups:
          [{ category, items: [{ value, label }] }] pour un catalogue
          groupé — en-têtes non sélectionnables, réutilise le CSS de
          MultiSelect (.ms-group-head/.ms-opt-child), cf. forms.css)
     SingleSelect.init()          -> branche les écouteurs (délégués)
     SingleSelect.filterOptions(id, predicate) -> masque les options
       pour lesquelles predicate(optionEl) est faux ; réinitialise
       la sélection si l'option active devient masquée.
     SingleSelect.reset(id) -> revient au placeholder (aucune sélection).

   La valeur est stockée dans un <input type="hidden"> portant l'id
   demandé : les lectures existantes (`element.value`) et les
   écouteurs `change` déjà câblés continuent de fonctionner sans
   changement, le composant se contente de piloter cet input caché.

   #62 : recherche texte — dropdown au-delà de `_SEARCH_THRESHOLD` options,
   une barre de filtre apparaît en tête. Coexiste avec `filterOptions`
   (ex. créature filtrée par habitat, cf. generator.js) via deux drapeaux
   indépendants sur chaque .ss-opt (`data-hab-hidden` / `data-search-hidden`) :
   la visibilité finale est le OU des deux, aucun des deux mécanismes
   n'écrase l'autre. La recherche se réinitialise à la fermeture du
   dropdown (repart propre à chaque ouverture).
   ============================================================ */
export const SingleSelect = {
  _bound: false,
  // #62 : en dessous, la recherche n'apporte rien (liste déjà courte d'un
  // coup d'œil) — évite d'alourdir les petits pickers (genre, habitat…).
  _SEARCH_THRESHOLD: 8,

  create(cfg) {
    const { id, label, options = [], groups = null, value = "", placeholder = "Aléatoire" } = cfg;
    const flat = groups ? groups.flatMap((g) => g.items) : options;
    const selected = flat.find((o) => o.value === value);

    const opts = groups ? this._groupedOpts(groups, value) : this._flatOpts(options, value);
    const search =
      flat.length > this._SEARCH_THRESHOLD
        ? `<input type="text" class="ss-search" placeholder="Filtrer…" autocomplete="off" spellcheck="false">`
        : "";

    return `<div class="form-group ss" data-ss="${id}" data-placeholder="${this._esc(placeholder)}">
      ${label ? `<label>${label}</label>` : ""}
      <div class="ss-control ms-control" tabindex="0" role="button" aria-haspopup="listbox" aria-expanded="false">
        <span class="ss-value" data-ss-value>${selected ? this._esc(selected.label) : placeholder}</span>
        <span class="ss-caret ms-caret">▾</span>
      </div>
      <div class="ss-dropdown ms-dropdown" role="listbox" hidden>
        ${search}
        <div class="ss-dropdown-body ms-dropdown-body">${opts}</div>
      </div>
      <input type="hidden" id="${id}" value="${this._esc(value)}">
    </div>`;
  },

  _flatOpts(options, value) {
    return options
      .map((o) => {
        const dataAttrs = Object.entries(o.data || {})
          .map(([k, v]) => ` data-${k}="${this._esc(v)}"`)
          .join("");
        return `<div class="ss-opt ms-opt${o.value === value ? " active" : ""}"
          role="option" data-value="${this._esc(o.value)}"${dataAttrs}>${this._esc(o.label)}</div>`;
      })
      .join("");
  },

  /* En-tête de groupe non sélectionnable (pas de classe ss-opt ni data-value
     -> ignoré par le clic et par _select, comme les checkboxes d'en-tête de
     MultiSelect). Réutilise .ms-group/.ms-group-head/.ms-opt-child, déjà
     stylés (forms.css) pour le mode groupé de MultiSelect. */
  _groupedOpts(groups, value) {
    return groups
      .map((g) => {
        const items = g.items
          .map(
            (o) => `<div class="ss-opt ms-opt ms-opt-child${o.value === value ? " active" : ""}"
              role="option" data-value="${this._esc(o.value)}">${this._esc(o.label)}</div>`,
          )
          .join("");
        return `<div class="ms-group">
          <div class="ms-opt ms-group-head" role="presentation">${this._esc(g.category)}</div>
          <div class="ms-group-items">${items}</div>
        </div>`;
      })
      .join("");
  },

  /** Revient au placeholder (aucune sélection) — utile après un « Ajouter »
      pour vider un sélecteur de catalogue sans reconstruire le HTML. */
  reset(id) {
    const root = document.querySelector(`[data-ss="${id}"]`);
    if (root) this._select(root, "");
  },

  /** Masque les options pour lesquelles predicate(optionEl) est faux ;
      réinitialise l'affichage si l'option choisie devient masquée.
      #62 : drapeau `data-hab-hidden` indépendant de la recherche texte
      (`data-search-hidden`) — la visibilité finale (`_applyHidden`) est le
      OU des deux, aucun des deux mécanismes n'écrase l'autre. */
  filterOptions(id, predicate) {
    const root = document.querySelector(`[data-ss="${id}"]`);
    if (!root) return;
    const hiddenInput = root.querySelector('input[type="hidden"]');
    let activeHidden = false;
    root.querySelectorAll(".ss-opt").forEach((opt) => {
      const hab = !predicate(opt);
      opt.dataset.habHidden = hab ? "1" : "";
      this._applyHidden(opt);
      if (opt.hidden && opt.dataset.value === hiddenInput.value) activeHidden = true;
    });
    this._updateGroupVisibility(root);
    if (activeHidden) this._select(root, "");
  },

  /** Combine les deux drapeaux de masquage sur une option. */
  _applyHidden(opt) {
    opt.hidden = opt.dataset.habHidden === "1" || opt.dataset.searchHidden === "1";
  },

  /** Masque les en-têtes de groupe dont tous les enfants sont masqués (mode
      groupé uniquement — no-op si `root` n'a pas de .ms-group). */
  _updateGroupVisibility(root) {
    root.querySelectorAll(".ms-group").forEach((g) => {
      const items = g.querySelectorAll(".ss-opt");
      const allHidden = items.length > 0 && [...items].every((o) => o.hidden);
      g.hidden = allHidden;
    });
  },

  /** Normalise pour une comparaison insensible à la casse/aux accents. */
  _normalize(s) {
    return String(s)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  },

  /** #62 : filtre en direct pendant la frappe dans `.ss-search`. */
  _applySearch(root, query) {
    const q = this._normalize(query.trim());
    root.querySelectorAll(".ss-opt").forEach((opt) => {
      const hidden = q.length > 0 && !this._normalize(opt.textContent).includes(q);
      opt.dataset.searchHidden = hidden ? "1" : "";
      this._applyHidden(opt);
    });
    this._updateGroupVisibility(root);
  },

  init() {
    if (this._bound) return;
    this._bound = true;

    document.addEventListener("click", (e) => {
      const control = e.target.closest(".ss-control");
      const inside = e.target.closest(".ss");

      document.querySelectorAll(".ss").forEach((ss) => {
        if (ss !== inside) this._setOpen(ss, false);
      });

      if (control) {
        const ss = control.closest(".ss");
        const dd = ss.querySelector(".ss-dropdown");
        this._setOpen(ss, dd.hidden);
        return;
      }

      const opt = e.target.closest(".ss-opt");
      if (opt) {
        const ss = opt.closest(".ss");
        this._select(ss, opt.dataset.value);
        this._setOpen(ss, false);
      }
    });

    document.addEventListener("keydown", (e) => {
      const control = e.target.closest(".ss-control");
      if (control && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        const ss = control.closest(".ss");
        const dd = ss.querySelector(".ss-dropdown");
        this._setOpen(ss, dd.hidden);
      }
      if (e.key === "Escape") {
        document.querySelectorAll(".ss").forEach((ss) => this._setOpen(ss, false));
      }
    });

    // #62 : recherche en direct — délégué comme le reste (aucun listener
    // par instance, un seul au document).
    document.addEventListener("input", (e) => {
      const search = e.target.closest(".ss-search");
      if (!search) return;
      this._applySearch(search.closest(".ss"), search.value);
    });

    // Le dropdown est en position:fixed (échappe au clipping des ancêtres
    // scrollables, cf. forms.css) : ses coordonnées sont figées à l'ouverture,
    // donc on ferme au moindre scroll pour ne pas laisser un menu mal placé.
    document.addEventListener(
      "scroll",
      (e) => {
        if (e.target.closest && e.target.closest(".ss-dropdown")) return;
        document.querySelectorAll(".ss-open").forEach((ss) => this._setOpen(ss, false));
      },
      true,
    );
  },

  /* ---- interne ---- */

  /** Positionne le dropdown (position:fixed) sous son contrôle — recalculé
      à chaque ouverture puisque le scroll ferme le menu (cf. init). */
  _position(ss) {
    const control = ss.querySelector(".ss-control");
    const dd = ss.querySelector(".ss-dropdown");
    const r = control.getBoundingClientRect();
    dd.style.top = `${r.bottom + 4}px`;
    dd.style.left = `${r.left}px`;
    dd.style.width = `${r.width}px`;
  },

  _select(ss, value) {
    const input = ss.querySelector('input[type="hidden"]');
    const valueEl = ss.querySelector("[data-ss-value]");
    const opt = value ? ss.querySelector(`.ss-opt[data-value="${CSS.escape(value)}"]`) : null;

    ss.querySelectorAll(".ss-opt").forEach((o) => o.classList.toggle("active", o === opt));
    valueEl.textContent = opt ? opt.textContent : ss.dataset.placeholder || "Aléatoire";
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  },

  _setOpen(ss, open) {
    const dd = ss.querySelector(".ss-dropdown");
    const control = ss.querySelector(".ss-control");
    if (!dd || dd.hidden === !open) return; // pas de changement d'état, rien à faire
    if (open) this._position(ss);
    dd.hidden = !open;
    ss.classList.toggle("ss-open", open);
    if (control) control.setAttribute("aria-expanded", String(open));
    const search = dd.querySelector(".ss-search");
    if (search) {
      if (open) {
        search.focus();
      } else {
        // #62 : repart propre à chaque ouverture (le filtre habitat éventuel
        // — data-hab-hidden — n'est pas touché par _applySearch).
        search.value = "";
        this._applySearch(ss, "");
      }
    }
  },

  _esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.SingleSelect = SingleSelect;
