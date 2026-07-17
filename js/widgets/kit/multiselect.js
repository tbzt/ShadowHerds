"use strict";

/* ============================================================
   MULTISELECT — composant de filtre « ajouter / enlever »

   Garde l'esprit d'un <select> (déclencheur cliquable qui ouvre
   une liste) mais permet de cocher plusieurs valeurs. Les valeurs
   retenues s'affichent sous forme de puces retirables.

   Deux modes :
   - plat   : liste simple de valeurs
   - groupé : catégories repliables (ex. Profession → Gang, Corpo…)
              cocher l'en-tête de catégorie coche/décoche tout le
              groupe (double niveau demandé).

   API :
     MultiSelect.create({ id, label, mode, options|groups,
                          emptyLabel })  -> string HTML
     MultiSelect.selected(id)           -> string[] (vide = « tout »)
     MultiSelect.init()                 -> branche les écouteurs (délégués)

   La sélection est lue à la volée depuis le DOM ; aucun état JS
   à synchroniser. Une sélection vide signifie « Aléatoire / tout ».
   ============================================================ */
export const MultiSelect = {
  _bound: false,

  /**
   * Génère le HTML d'un multi-select.
   * @param {object} cfg
   * @param {string} cfg.id        - identifiant unique (utilisé sur le conteneur)
   * @param {string} cfg.label     - libellé du champ
   * @param {string} [cfg.mode]    - 'flat' (défaut) ou 'grouped'
   * @param {string[]} [cfg.options] - valeurs pour le mode plat
   * @param {{cat:string,items:string[]}[]} [cfg.groups] - pour le mode groupé
   * @param {string} [cfg.emptyLabel] - texte quand rien n'est coché
   */
  create(cfg) {
    const {
      id,
      label,
      mode = "flat",
      options = [],
      groups = [],
      emptyLabel = "Aléatoire (tout)",
      hint = "",
    } = cfg;

    const body =
      mode === "grouped"
        ? this._groupedBody(groups)
        : this._flatBody(options);

    return `
      <div class="form-group ms" data-ms="${id}" data-empty="${this._esc(emptyLabel)}">
        <label>${label}${hint ? ` <span class="ms-hint" title="${this._esc(hint)}" aria-label="${this._esc(hint)}">ⓘ</span>` : ""}</label>
        <div class="ms-control" tabindex="0" role="button" aria-haspopup="listbox" aria-expanded="false">
          <div class="ms-chips" data-ms-chips></div>
          <span class="ms-caret">▾</span>
        </div>
        <div class="ms-dropdown" role="listbox" aria-multiselectable="true" hidden>
          <div class="ms-dropdown-tools">
            <button type="button" class="ms-tool" data-ms-all>Tout</button>
            <button type="button" class="ms-tool" data-ms-none>Aucun</button>
          </div>
          <div class="ms-dropdown-body">${body}</div>
        </div>
      </div>`;
  },

  _flatBody(options) {
    return options
      .map(
        (o) => `
        <label class="ms-opt">
          <input type="checkbox" value="${this._esc(o)}">
          <span>${o}</span>
        </label>`,
      )
      .join("");
  },

  _groupedBody(groups) {
    return groups
      .map((g) => {
        const items = g.items
          .map(
            (i) => `
            <label class="ms-opt ms-opt-child">
              <input type="checkbox" value="${this._esc(i)}" data-ms-cat="${this._esc(g.cat)}">
              <span>${i}</span>
            </label>`,
          )
          .join("");
        return `
          <div class="ms-group">
            <label class="ms-opt ms-group-head">
              <input type="checkbox" data-ms-cathead="${this._esc(g.cat)}">
              <span>${g.cat}</span>
            </label>
            <div class="ms-group-items">${items}</div>
          </div>`;
      })
      .join("");
  },

  /** Valeurs cochées d'un multi-select. Tableau vide = « tout / aléatoire ». */
  selected(id) {
    const root = document.querySelector(`[data-ms="${id}"]`);
    if (!root) return [];
    return [...root.querySelectorAll('.ms-dropdown input[type="checkbox"]')]
      .filter((cb) => cb.checked && cb.value) // ignore les en-têtes (sans value)
      .map((cb) => cb.value);
  },

  /** Branche les écouteurs une seule fois (délégation globale). */
  init() {
    if (this._bound) return;
    this._bound = true;

    // Ouvre / ferme le menu au clic sur le contrôle
    document.addEventListener("click", (e) => {
      const control = e.target.closest(".ms-control");
      const inside = e.target.closest(".ms");

      // Fermer tous les menus ouverts hors du composant cliqué
      document.querySelectorAll(".ms").forEach((ms) => {
        if (ms !== inside) this._setOpen(ms, false);
      });

      if (control) {
        const ms = control.closest(".ms");
        const dd = ms.querySelector(".ms-dropdown");
        this._setOpen(ms, dd.hidden);
      }
    });

    // Cocher / décocher
    document.addEventListener("change", (e) => {
      const cb = e.target;
      if (!cb.matches('.ms-dropdown input[type="checkbox"]')) return;
      const ms = cb.closest(".ms");
      if (!ms) return;

      // En-tête de catégorie → propage aux enfants
      const catHead = cb.dataset.msCathead;
      if (catHead != null) {
        ms
          .querySelectorAll(`input[data-ms-cat="${CSS.escape(catHead)}"]`)
          .forEach((child) => (child.checked = cb.checked));
      }

      this._syncHeads(ms);
      this._renderChips(ms);
    });

    // Outils Tout / Aucun
    document.addEventListener("click", (e) => {
      const all = e.target.closest("[data-ms-all]");
      const none = e.target.closest("[data-ms-none]");
      if (!all && !none) return;
      const ms = e.target.closest(".ms");
      ms
        .querySelectorAll('.ms-dropdown input[type="checkbox"]')
        .forEach((cb) => (cb.checked = !!all));
      this._renderChips(ms);
    });

    // Clavier : Entrée / Espace ouvre, Échap ferme
    document.addEventListener("keydown", (e) => {
      const control = e.target.closest(".ms-control");
      if (control && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        const ms = control.closest(".ms");
        const dd = ms.querySelector(".ms-dropdown");
        this._setOpen(ms, dd.hidden);
      }
      if (e.key === "Escape") {
        document.querySelectorAll(".ms").forEach((ms) => this._setOpen(ms, false));
      }
    });

    // Le dropdown est en position:fixed (échappe au clipping des ancêtres
    // scrollables, cf. forms.css) : ses coordonnées sont figées à l'ouverture,
    // donc on ferme au moindre scroll pour ne pas laisser un menu mal placé.
    document.addEventListener(
      "scroll",
      (e) => {
        if (e.target.closest && e.target.closest(".ms-dropdown")) return;
        document.querySelectorAll(".ms-open").forEach((ms) => this._setOpen(ms, false));
      },
      true,
    );

    // Retirer une puce
    document.addEventListener("click", (e) => {
      const chip = e.target.closest(".ms-chip[data-val]");
      if (!chip || !e.target.closest(".ms-chip-x")) return;
      const ms = chip.closest(".ms");
      const val = chip.dataset.val;
      const cb = ms.querySelector(
        `.ms-dropdown input[value="${CSS.escape(val)}"]`,
      );
      if (cb) cb.checked = false;
      this._syncHeads(ms);
      this._renderChips(ms);
    });
  },

  /* ---- interne ---- */

  _setOpen(ms, open) {
    const dd = ms.querySelector(".ms-dropdown");
    const control = ms.querySelector(".ms-control");
    if (!dd) return;
    if (open) this._position(ms, dd, control);
    dd.hidden = !open;
    ms.classList.toggle("ms-open", open);
    if (control) control.setAttribute("aria-expanded", String(open));
  },

  /** Positionne le dropdown (position:fixed) sous son contrôle — recalculé
      à chaque ouverture puisque le scroll ferme le menu (cf. init). */
  _position(ms, dd, control) {
    const r = control.getBoundingClientRect();
    dd.style.top = `${r.bottom + 4}px`;
    dd.style.left = `${r.left}px`;
    dd.style.width = `${r.width}px`;
  },

  /** Met à jour l'état indéterminé/coché des en-têtes de catégorie. */
  _syncHeads(ms) {
    ms.querySelectorAll("[data-ms-cathead]").forEach((head) => {
      const cat = head.dataset.msCathead;
      const children = [
        ...ms.querySelectorAll(`input[data-ms-cat="${CSS.escape(cat)}"]`),
      ];
      const checked = children.filter((c) => c.checked).length;
      head.checked = checked === children.length && children.length > 0;
      head.indeterminate = checked > 0 && checked < children.length;
    });
  },

  /** Reconstruit les puces depuis l'état des cases. */
  _renderChips(ms) {
    const wrap = ms.querySelector("[data-ms-chips]");
    const empty = ms.dataset.empty || "Aléatoire";
    const vals = [
      ...ms.querySelectorAll('.ms-dropdown input[type="checkbox"]'),
    ]
      .filter((cb) => cb.checked && cb.value)
      .map((cb) => cb.value);

    if (!vals.length) {
      wrap.innerHTML = `<span class="ms-empty">${empty}</span>`;
      return;
    }
    wrap.innerHTML = vals
      .map(
        (v) => `
        <span class="ms-chip" data-val="${this._esc(v)}">
          <span class="ms-chip-label">${v}</span>
          <span class="ms-chip-x" role="button" aria-label="Retirer ${this._esc(v)}">✕</span>
        </span>`,
      )
      .join("");
  },

  /** Initialise l'affichage (puces vides) d'un conteneur fraîchement injecté. */
  refresh(root = document) {
    root.querySelectorAll(".ms").forEach((ms) => {
      this._syncHeads(ms);
      this._renderChips(ms);
    });
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
window.MultiSelect = MultiSelect;
