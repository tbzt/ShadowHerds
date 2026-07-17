"use strict";

/* ============================================================
   CONTEXT SELECTOR — sélecteur de contexte UNIQUE et réutilisable.
   ------------------------------------------------------------
   Doctrine « Campagne › Run › Scène » : « un sélecteur de contexte unique,
   identique partout (bloc-note, tracker, cartes) : il liste les dossiers /
   runs / scènes actifs et y saute directement ». Choix retenu : liste
   PLATE (pas un arbre à explorer), réutilisée telle quelle.

   Une seule vérité : choisir un contexte pose `App.context` via
   `DossierBar.select` (le fil d'Ariane, le hub et le carnet suivent).
   Le widget ne persiste rien lui-même ; il lit `Dossiers` + `App.context`.

   Usage : `ContextSelector.open(anchorEl, onPick)`. `onPick(id|null)` est
   appelé après la pose du contexte (id de dossier, ou `null` pour « Tout »).
   Les appelants (bloc-note, rangée locator) fournissent le geste de suite
   (recharger le carnet, aller au hub…). Popover ancré, fermé au clic-dehors
   ou Échap. Rendu neutre par édition (aucun `App.edition`).
   ============================================================ */
import { CardRenderer } from "../card/cardrenderer.js";
import { Collection } from "../collection/collection.js";
import { DossierBar } from "./dossierbar.js";
import { Dossiers } from "./dossiers.js";

export const ContextSelector = {
  _el: null, // popover monté (unique, réutilisé)
  _onPick: null, // callback de l'ouverture courante
  _outside: null, // handler clic-dehors courant (retiré à la fermeture)

  /** HTML d'un bouton déclencheur (à insérer par les hôtes). `label` visible
      quand aucun contexte n'est en focus (sinon le fil d'Ariane porte le nom). */
  triggerHtml(label = "Contexte") {
    return `<button type="button" class="ctx-trigger" data-action="ctx-open" title="Changer de contexte (campagne / run / scène)" aria-haspopup="listbox">
      <span class="ctx-trigger-icon" aria-hidden="true">◇</span><span class="ctx-trigger-label">${label}</span><span class="ctx-trigger-caret" aria-hidden="true">▾</span>
    </button>`;
  },

  _ensure() {
    if (this._el) return this._el;
    const el = document.createElement("div");
    el.id = "ctx-selector";
    el.className = "ctx-selector";
    el.setAttribute("role", "listbox");
    el.hidden = true;
    document.body.appendChild(el);
    // Délégation interne : un item choisi pose le contexte puis rappelle onPick.
    el.addEventListener("click", (e) => {
      const item = e.target.closest("[data-ctx-id]");
      if (!item) return;
      const raw = item.dataset.ctxId;
      const id = raw === "__all__" ? null : raw;
      this._choose(id);
    });
    this._el = el;
    return el;
  },

  /** Liste PLATE de tous les dossiers, en ordre arborescent (racine puis
      descendants), indentée par profondeur — un membre reste cliquable sans
      dépliage. Le nœud Favoris (réservé) est exclu (ce n'est pas un contexte
      de jeu). « Tout » en tête remet le focus global à zéro. */
  _listHtml() {
    const esc = CardRenderer._esc;
    const focus = (typeof App !== "undefined" && App.context && App.context.dossier) || null;
    const scene = (typeof App !== "undefined" && App.context && App.context.scene) || null;
    const check = (on) => (on ? '<span class="ctx-item-check" aria-hidden="true">✓</span>' : '<span class="ctx-item-check" aria-hidden="true"></span>');

    let html = `<button type="button" role="option" class="ctx-item${focus ? "" : " is-current"}" data-ctx-id="__all__">
      ${check(!focus)}<span class="ctx-item-icon" aria-hidden="true">◈</span><span class="ctx-item-name">Tout</span>
    </button>`;

    const rowHtml = (node, depth) => {
      const isCampaign = node.kind === "campaign";
      const isRun = node.kind === "run";
      const icon = isCampaign ? "❖" : isRun ? "◆" : depth > 0 ? "↳" : "▸";
      const isFocus = node.id === focus;
      const isLive = node.id === scene;
      const live = isLive
        ? '<span class="ctx-item-live" title="Scène en cours"><span class="tb-crumb-live" aria-hidden="true"></span>En cours</span>'
        : "";
      return `<button type="button" role="option" class="ctx-item${isFocus ? " is-current" : ""}" data-ctx-id="${node.id}" style="--depth:${Math.min(depth, 3)}">
        ${check(isFocus)}<span class="ctx-item-icon" aria-hidden="true">${icon}</span><span class="ctx-item-name">${esc(node.name)}</span>${live}
      </button>`;
    };

    const walk = (node, depth) => {
      if (node.name !== Collection.FAV_GROUP) html += rowHtml(node, depth);
      for (const child of Dossiers.children(node.id)) walk(child, depth + 1);
    };
    for (const root of Dossiers.roots()) walk(root, 0);

    if (Dossiers.list().filter((d) => d.name !== Collection.FAV_GROUP).length === 0) {
      html += `<div class="ctx-empty">Aucun dossier. Créez une campagne ou une run dans la bibliothèque.</div>`;
    }
    return html;
  },

  /** Ouvre le popover ancré sous `anchorEl`. `onPick(id|null)` appelé après
      la pose du contexte. Ré-ouvre en togglant si déjà ouvert sur le même but. */
  open(anchorEl, onPick) {
    const el = this._ensure();
    if (!el.hidden && this._anchor === anchorEl) {
      this.close();
      return;
    }
    this._onPick = onPick || null;
    this._anchor = anchorEl;
    el.innerHTML = this._listHtml();
    el.hidden = false;
    this._position(anchorEl);
    // Fermeture au clic-dehors (différée pour ne pas capter le clic d'ouverture).
    this._outside = (e) => {
      if (!el.contains(e.target) && e.target !== anchorEl && !anchorEl.contains(e.target)) {
        this.close();
      }
    };
    setTimeout(() => document.addEventListener("click", this._outside, true), 0);
    document.addEventListener("keydown", this._onKey);
  },

  _onKey(e) {
    if (e.key === "Escape") ContextSelector.close();
  },

  /** Positionne le popover sous l'ancre, borné à la fenêtre (bottom-sheet
      plein largeur sur mobile via CSS `.ctx-selector`). */
  _position(anchorEl) {
    const el = this._el;
    if (window.matchMedia("(max-width: 640px)").matches) {
      // Mobile : bottom-sheet piloté par CSS, pas de positionnement inline.
      el.style.left = el.style.top = el.style.right = "";
      return;
    }
    const r = anchorEl.getBoundingClientRect();
    const maxLeft = window.innerWidth - el.offsetWidth - 8;
    el.style.left = Math.max(8, Math.min(r.left, maxLeft)) + "px";
    el.style.top = r.bottom + 4 + "px";
    el.style.right = "auto";
  },

  _choose(id) {
    // Pose le contexte global (une seule vérité) — le fil d'Ariane, le hub et
    // le carnet en dérivent. `"all"` accepté par DossierBar pour « Tout ».
    if (typeof DossierBar !== "undefined") DossierBar.select(id || "all");
    const cb = this._onPick;
    this.close();
    if (cb) cb(id);
  },

  close() {
    if (!this._el || this._el.hidden) return;
    this._el.hidden = true;
    this._anchor = null;
    if (this._outside) {
      document.removeEventListener("click", this._outside, true);
      this._outside = null;
    }
    document.removeEventListener("keydown", this._onKey);
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.ContextSelector = ContextSelector;
