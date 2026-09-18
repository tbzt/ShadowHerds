"use strict";

/* ============================================================
   CATALOG PICKER — un catalogue qu'on cherche, qu'on filtre, qu'on lit

   Un champ de recherche, des puces de rayon (une seule allumée), une
   liste bornée en hauteur dont chaque entrée dit son nom, sa catégorie,
   la ligne du livre et ce qu'elle coûte (Essence · prix · Disponibilité).
   Né dans l'assistant de création (équipement, traits, sorts), partagé
   depuis 1.222.0 avec la liste d'équipement d'une fiche (GearList).

   Contrat d'une entrée : `{ label, detail?, kind?, id?, cost?, costNote?,
   availability?, dispoText?, essence?, warn? }` ; d'un groupe :
   `{ category, shelf?, items }`. Le rayon (`shelf`) est posé par le module
   d'édition ; sans rayon, la catégorie sert de puce s'il y en a peu.

   Le filtrage MASQUE les entrées rendues, il ne redessine rien : redessiner
   à chaque frappe perdrait le focus et le curseur. Le clic d'une entrée
   remonte par l'attribut d'action de l'appelant (`actionAttr`,
   `data-cg-action` dans l'assistant, `data-gl-action` dans GearList) —
   jamais de handler inline.
   ============================================================ */
export const CatalogPicker = {
  _bound: false,

  esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  },

  /* `limits` (optionnel) :
       `allowed(it)` — l'entrée passe-t-elle la limite de création ? Sinon
                       elle se lit barrée et ne se choisit pas.
       `nuyenLeft`   — ce qui reste à dépenser ; au-delà, l'entrée passe à
                       l'ambre mais reste choisissable : c'est la validation
                       qui refuse un budget dépassé, pas le catalogue.
     `attrs` : attributs ajoutés à chaque entrée (« data-idx="3" »).
     `unit` : l'unité du coût affiché — « ¥ » par défaut, « Karma » pour une
     progression payée au karma.
     `it.id` sort en `data-id`, `it.warn` (avertissement du module : monture
     déjà prise) en classe `is-taken` + titre. */
  html({ id, groups, actionAttr = "data-cg-action", action, selected, vide, limits, attrs, unit = "¥" }) {
    const esc = this.esc;
    const sel = new Set(selected || []);
    const fmt = (v) => Number(v).toLocaleString("fr-FR");
    let n = 0;
    const items = (groups || [])
      .flatMap((g) =>
        (g.items || []).map((it) => {
          n++;
          const dejaPris = sel.has(it.label);
          const rayon = g.shelf || g.category;
          const hors = !!(limits && limits.allowed && !limits.allowed(it));
          const cher = !hors && !!(limits && limits.nuyenLeft != null && it.cost != null && it.cost > limits.nuyenLeft);
          const pris = !hors && !!it.warn;
          const dispo = it.dispoText || (it.availability != null ? String(it.availability) : "");
          const meta = [
            it.essence != null ? `Ess. ${fmt(it.essence)}` : "",
            it.cost != null && it.cost !== 0 ? `${fmt(it.cost)} ${unit}` : it.costNote || "",
            dispo ? `Disp. ${dispo}` : "",
          ].filter(Boolean).join(" · ");
          const titre = hors ? "Disponibilité au-delà de la limite de création" : cher ? (limits.dearTitle || "Au-delà des nuyens restants") : pris ? it.warn : "";
          return `<button type="button" class="cg-pick-item${dejaPris ? " pris" : ""}${hors ? " is-out" : ""}${cher ? " is-dear" : ""}${pris ? " is-taken" : ""}" ${actionAttr}="${esc(action)}"
            data-name="${esc(it.label)}" data-cat="${esc(g.category)}" data-shelf="${esc(rayon)}" data-cost="${it.cost != null ? it.cost : ""}"${it.kind ? ` data-kind="${esc(it.kind)}"` : ""}${it.id != null ? ` data-id="${esc(it.id)}"` : ""}${attrs ? ` ${attrs}` : ""}
            ${hors ? 'aria-disabled="true"' : ""}${titre ? ` title="${esc(titre)}"` : ""}
            data-hay="${esc(`${it.label} ${it.detail || ""} ${g.category}`.toLowerCase())}">
            <span class="cg-pick-name">${dejaPris ? "✓ " : ""}${esc(it.label)}</span>
            <span class="cg-pick-cat">${esc(g.category)}</span>
            ${it.detail ? `<span class="cg-pick-detail">${esc(it.detail)}</span>` : ""}
            ${meta ? `<span class="cg-pick-meta">${esc(meta)}</span>` : ""}
          </button>`;
        }),
      )
      .join("");
    // Les puces de rayon : dans l'ordre du catalogue, seulement s'il y a un
    // choix à faire et qu'il se lit d'un coup (au-delà, c'est la recherche).
    const rayons = [...new Set((groups || []).map((g) => g.shelf || g.category))];
    const puces = rayons.length >= 2 && rayons.length <= 8
      ? `<div class="cluster cg-pick-shelves">
          <button type="button" class="cg-pick-shelf is-on" data-pick-shelf="${esc(id)}" data-shelf="" aria-pressed="true">Tout</button>
          ${rayons.map((r) => `<button type="button" class="cg-pick-shelf" data-pick-shelf="${esc(id)}" data-shelf="${esc(r)}" aria-pressed="false">${esc(r)}</button>`).join("")}
        </div>`
      : "";
    return `<div class="cg-pick" data-pick="${esc(id)}">
      ${puces}
      <div class="cluster cg-pick-bar">
        <input type="search" class="cg-pick-search" data-pick-search="${esc(id)}" placeholder="Chercher parmi ${n}…" autocomplete="off">
      </div>
      <div class="cg-pick-list">${items || `<p class="cg-hint">${esc(vide || "Catalogue vide.")}</p>`}</div>
      <p class="cg-hint cg-pick-empty" hidden>Aucun résultat.</p>
    </div>`;
  },

  /** Marque « pris » les entrées dont le nom est dans `names`, sans
      reconstruire la liste (sa recherche et son défilement survivent). */
  markTaken(root, names) {
    if (!root) return;
    const noms = new Set(names || []);
    for (const it of root.querySelectorAll(".cg-pick-item")) {
      const pris = noms.has(it.dataset.name);
      it.classList.toggle("pris", pris);
      const nom = it.querySelector(".cg-pick-name");
      if (nom) nom.textContent = `${pris ? "✓ " : ""}${it.dataset.name}`;
    }
  },

  /** Passe à l'ambre les entrées au-delà de `reste` (null : aucune). */
  markDear(root, reste) {
    if (!root) return;
    for (const it of root.querySelectorAll(".cg-pick-item")) {
      if (it.classList.contains("is-out")) continue;
      const cout = it.dataset.cost === "" || it.dataset.cost == null ? null : Number(it.dataset.cost);
      it.classList.toggle("is-dear", reste != null && cout != null && cout > reste);
    }
  },

  /** Applique recherche + rayon au sélecteur `root` (`[data-pick]`). */
  filter(root) {
    if (!root) return;
    const q = (root.querySelector("[data-pick-search]")?.value || "").trim().toLowerCase();
    const rayon = root.querySelector(".cg-pick-shelf.is-on")?.dataset.shelf || "";
    let vus = 0;
    for (const el of root.querySelectorAll(".cg-pick-item")) {
      const ok = (!q || (el.dataset.hay || "").includes(q)) && (!rayon || el.dataset.shelf === rayon);
      el.hidden = !ok;
      if (ok) vus++;
    }
    const vide = root.querySelector(".cg-pick-empty");
    if (vide) vide.hidden = vus > 0;
  },

  /** Délégation unique, au document : recherche à la frappe, rayon au clic. */
  init() {
    if (this._bound) return;
    this._bound = true;
    document.addEventListener("input", (e) => {
      const id = e.target?.dataset?.pickSearch;
      if (id) this.filter(e.target.closest("[data-pick]"));
    });
    document.addEventListener("click", (e) => {
      const puce = e.target.closest("[data-pick-shelf]");
      if (!puce) return;
      for (const p of puce.parentElement.querySelectorAll("[data-pick-shelf]")) {
        const on = p === puce;
        p.classList.toggle("is-on", on);
        p.setAttribute("aria-pressed", String(on));
      }
      this.filter(puce.closest("[data-pick]"));
    });
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.CatalogPicker = CatalogPicker;
