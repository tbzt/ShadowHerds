"use strict";

/* ============================================================
   FILE RAIL — rail de dépôt latéral (glisser une carte → ranger)
   ------------------------------------------------------------
   Volet gauche qui n'apparaît QUE pendant un glisser de carte en
   mode Sélection (Collection._initFileDrag). Il liste les dossiers
   (Dossiers.roots + sous-groupes) comme cibles de dépôt, surligne
   celle sous le pointeur et DÉPLIE ses sous-groupes au survol
   prolongé — le « feel » qui guide le choix du bon dossier.

   Il ne persiste rien, ne connaît aucune collection : c'est la
   collection qui pilote (show/hover/dropTarget/hide) et qui écrit
   (col.fileInto). Le classement se fait par NOM de dossier, comme
   BulkBar et DossierBar (jointure par nom, cf. Collection.toggleGroup).
   État transient. Dépendances descendantes : Dossiers, CardRenderer._esc.
   ============================================================ */
import { CardRenderer } from "../card/cardrenderer.js";
import { Dossiers } from "../journal/dossiers.js";

export const FileRail = {
  _el: null,
  _current: null, // { el, name } cible surlignée
  _dwellTimer: null,
  _DWELL_MS: 320,

  _ensure() {
    if (this._el) return this._el;
    const rail = document.createElement("aside");
    rail.id = "file-rail";
    rail.setAttribute("aria-hidden", "true");
    document.body.appendChild(rail);
    this._el = rail;
    return rail;
  },

  /** Monte le rail (dossiers racines repliés) et le fait glisser en vue. */
  show() {
    const rail = this._ensure();
    rail.innerHTML = this._render();
    this._current = null;
    document.body.classList.add("file-dragging");
    void rail.offsetWidth; // reflow avant la classe d'entrée (l'anim joue)
    rail.classList.add("open");
  },

  _render() {
    const roots = Dossiers.roots();
    if (!roots.length) {
      return `<div class="file-rail-head">Ranger dans…</div>
        <div class="file-rail-empty">Aucun dossier pour l'instant.<br>Créez-en un via « 🏷 » sur une carte.</div>`;
    }
    let html = `<div class="file-rail-head">Ranger dans…</div>`;
    for (const d of roots) html += this._rowHtml(d, 0);
    return html;
  },

  /** Un rang de dépôt. `depth` pilote l'indentation ; un dossier avec
      sous-groupes porte un chevron déployable au survol prolongé. */
  _rowHtml(node, depth) {
    const hasChildren = Dossiers.children(node.id).length > 0;
    const nameEsc = CardRenderer._esc(node.name);
    const icon =
      node.kind === "campaign"
        ? "❖"
        : node.kind === "run"
          ? "◆"
          : depth > 0
            ? "↳"
            : "▸";
    const chev = hasChildren
      ? `<span class="file-rail-chev">▸</span>`
      : `<span class="file-rail-chev file-rail-chev-empty"></span>`;
    return `<div class="file-rail-target" role="button"
        data-dossier-id="${CardRenderer._esc(node.id)}"
        data-dossier-name="${nameEsc}" data-depth="${depth}" style="--depth:${depth}">
        ${chev}<span class="file-rail-icon">${icon}</span><span class="file-rail-name">${nameEsc}</span>
      </div>`;
  },

  _rowEl(node, depth) {
    const tpl = document.createElement("template");
    tpl.innerHTML = this._rowHtml(node, depth).trim();
    return tpl.content.firstElementChild;
  },

  /** Surligne la cible sous (x, y) pendant le glisser et arme le dépli au
      survol prolongé. Retourne l'élément cible (ou null). */
  hover(x, y) {
    const target = this._targetElAt(x, y);
    if (target !== (this._current && this._current.el)) {
      this._clearHighlight();
      if (target) {
        target.classList.add("hovered");
        this._current = { el: target, name: target.dataset.dossierName };
      } else {
        this._current = null;
      }
      this._armDwell(target);
    }
    return target;
  },

  /** Cible fraîche sous (x, y), pour le lâcher (indépendant du dernier hover). */
  dropTarget(x, y) {
    const el = this._targetElAt(x, y);
    return el ? { el, name: el.dataset.dossierName } : null;
  },

  _targetElAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest(".file-rail-target") : null;
  },

  _clearHighlight() {
    if (this._current && this._current.el)
      this._current.el.classList.remove("hovered");
  },

  _armDwell(target) {
    clearTimeout(this._dwellTimer);
    if (!target) return;
    const id = target.dataset.dossierId;
    if (target.classList.contains("expanded")) return;
    if (!Dossiers.children(id).length) return;
    this._dwellTimer = setTimeout(() => this._expand(target), this._DWELL_MS);
  },

  /** Révèle les sous-groupes directs de `target`, en cascade animée.
      Un sous-groupe peut à son tour être survolé pour révéler les siens. */
  _expand(target) {
    if (target.classList.contains("expanded")) return;
    target.classList.add("expanded");
    const chev = target.querySelector(".file-rail-chev");
    if (chev) chev.textContent = "▾";
    const id = target.dataset.dossierId;
    const depth = Number(target.dataset.depth) || 0;
    let after = target;
    let i = 0;
    for (const child of Dossiers.children(id)) {
      const row = this._rowEl(child, depth + 1);
      row.classList.add("revealed");
      row.style.setProperty("--i", i++);
      after.after(row);
      after = row;
    }
    void target.offsetWidth;
    let node = target.nextElementSibling;
    while (node && node.classList.contains("revealed")) {
      node.classList.add("in");
      node = node.nextElementSibling;
    }
  },

  /** Petite pulsation de confirmation sur la cible au dépôt. */
  pulse(el) {
    if (!el) return;
    el.classList.remove("dropped");
    void el.offsetWidth;
    el.classList.add("dropped");
  },

  hide() {
    clearTimeout(this._dwellTimer);
    this._clearHighlight();
    this._current = null;
    document.body.classList.remove("file-dragging");
    if (this._el) this._el.classList.remove("open");
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.FileRail = FileRail;
