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
     SingleSelect.create({ id, label, options, value, placeholder })
       -> string HTML (options: [{ value, label, data? }])
     SingleSelect.init()          -> branche les écouteurs (délégués)
     SingleSelect.filterOptions(id, predicate) -> masque les options
       pour lesquelles predicate(optionEl) est faux ; réinitialise
       la sélection si l'option active devient masquée.

   La valeur est stockée dans un <input type="hidden"> portant l'id
   demandé : les lectures existantes (`element.value`) et les
   écouteurs `change` déjà câblés continuent de fonctionner sans
   changement, le composant se contente de piloter cet input caché.
   ============================================================ */
const SingleSelect = {
  _bound: false,

  create(cfg) {
    const { id, label, options = [], value = "", placeholder = "Aléatoire" } = cfg;
    const selected = options.find((o) => o.value === value);

    const opts = options
      .map((o) => {
        const dataAttrs = Object.entries(o.data || {})
          .map(([k, v]) => ` data-${k}="${this._esc(v)}"`)
          .join("");
        return `<div class="ss-opt ms-opt${o.value === value ? " active" : ""}"
          role="option" data-value="${this._esc(o.value)}"${dataAttrs}>${this._esc(o.label)}</div>`;
      })
      .join("");

    return `<div class="form-group ss" data-ss="${id}" data-placeholder="${this._esc(placeholder)}">
      ${label ? `<label>${label}</label>` : ""}
      <div class="ss-control ms-control" tabindex="0" role="button" aria-haspopup="listbox" aria-expanded="false">
        <span class="ss-value" data-ss-value>${selected ? this._esc(selected.label) : placeholder}</span>
        <span class="ss-caret ms-caret">▾</span>
      </div>
      <div class="ss-dropdown ms-dropdown" role="listbox" hidden>
        <div class="ss-dropdown-body ms-dropdown-body">${opts}</div>
      </div>
      <input type="hidden" id="${id}" value="${this._esc(value)}">
    </div>`;
  },

  /** Masque les options pour lesquelles predicate(optionEl) est faux ;
      réinitialise l'affichage si l'option choisie devient masquée. */
  filterOptions(id, predicate) {
    const root = document.querySelector(`[data-ss="${id}"]`);
    if (!root) return;
    const input = root.querySelector("input");
    let activeHidden = false;
    root.querySelectorAll(".ss-opt").forEach((opt) => {
      const hidden = !predicate(opt);
      opt.hidden = hidden;
      if (hidden && opt.dataset.value === input.value) activeHidden = true;
    });
    if (activeHidden) this._select(root, "");
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
  },

  /* ---- interne ---- */

  _select(ss, value) {
    const input = ss.querySelector("input");
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
    if (!dd) return;
    dd.hidden = !open;
    ss.classList.toggle("ss-open", open);
    if (control) control.setAttribute("aria-expanded", String(open));
  },

  _esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },
};
