"use strict";

/* ============================================================
   FEUILLE IMPRIMABLE ANARCHY 1 — fidèle à la feuille de perso du
   livre (or + noir, anguleux) : bandeau-titre noir, rangée
   d'attributs sur bande dorée, compétences en grille « indice+attr »,
   bandeaux de section dorés, moniteurs à cercles. Compagnon de
   l'édition Anarchy 1, s'auto-enregistre sur EditionAnarchy1.printSheet.
   ============================================================ */
const PrintAnarchy1 = {
  _esc: (s) => CardRenderer._esc(s == null ? "" : String(s)),
  _named(v) {
    // #63 : v.str couvre l'item d'équipement polymorphe {str,cat,rating}.
    return v == null ? "" : typeof v === "string" ? v : v.name || v.str || "";
  },
  // Initiale d'attribut pour la notation « indice+X » du livre.
  _attrInitial: { FOR: "F", AGI: "A", VOL: "V", LOG: "L", CHA: "C", CHC: "Ch" },

  _attrBand(pnj) {
    const a = pnj.attrs || {};
    const cols = [
      ["FORCE", a.FOR], ["AGILITÉ", a.AGI], ["VOLONTÉ", a.VOL],
      ["LOGIQUE", a.LOG], ["CHARISME", a.CHA], ["CHANCE", a.CHC],
    ];
    const cells = cols
      .map(([k, v]) => `<div class="pa1-attr"><span class="pa1-attr-lbl">${k}</span><span class="pa1-attr-val">${this._esc(v)}</span></div>`)
      .join("");
    return `<div class="pa1-band">${cells}</div>`;
  },

  _skills(pnj) {
    const list = (pnj.skills || []).filter((s) => s && s.name != null);
    if (!list.length) return "";
    const boxes = list
      .map((s) => {
        const init = this._attrInitial[s.attr] || s.attr || "";
        const spec = s.spec && s.spec !== true ? `<span class="pa1-sk-spec">(${this._esc(s.spec)})</span>` : "";
        return `<div class="pa1-skbox"><span class="pa1-sk-name">${this._esc(s.name)}${spec}</span><span class="pa1-sk-val">${this._esc(s.val)}+${this._esc(init)}</span></div>`;
      })
      .join("");
    return `<div class="pa1-section">${this._banner("Compétences")}<div class="pa1-grid">${boxes}</div></div>`;
  },

  _weapons(pnj) {
    const { weapons } =
      typeof ItemResolver !== "undefined" && ItemResolver.splitEquip
        ? ItemResolver.splitEquip(pnj.equip || [])
        : { weapons: [] };
    const list = Array.isArray(pnj.weapons) && pnj.weapons.length ? pnj.weapons : weapons;
    if (!list || !list.length) return "";
    const rows = list
      .map((w) => {
        if (typeof w === "string") return `<tr><td class="pa1-w-name">${this._esc(w)}</td><td></td><td></td></tr>`;
        const vd = w.dmg != null ? `${this._esc(w.dmg)}${this._esc(w.dmgType || "")}` : this._esc(w.vd || "");
        return `<tr><td class="pa1-w-name">${this._esc(w.name)}</td><td>VD ${vd}</td><td>${this._esc(w.ranges || "")}</td></tr>`;
      })
      .join("");
    return `<div class="pa1-section">${this._banner("Armes")}<table class="pa1-table"><tbody>${rows}</tbody></table></div>`;
  },

  _monitors(pnj) {
    const circles = (n) =>
      Array.from({ length: Math.max(0, n | 0) }, () => `<span class="pa1-circle"></span>`).join("");
    return `<div class="pa1-section">${this._banner("Moniteur de condition")}
      <div class="pa1-monitors">
        <div class="pa1-mon-row"><span class="pa1-mon-lbl">Physique</span><span class="pa1-circles">${circles(pnj.physMon)}</span></div>
        <div class="pa1-mon-row"><span class="pa1-mon-lbl">Étourdissant</span><span class="pa1-circles">${circles(pnj.stunMon)}</span></div>
      </div></div>`;
  },

  _listSection(title, items) {
    const list = (Array.isArray(items) ? items : []).map((v) => this._named(v)).filter(Boolean);
    if (!list.length) return "";
    return `<div class="pa1-section">${this._banner(title)}<div class="pa1-list">${list.map((t) => `<div class="pa1-list-item">• ${this._esc(t)}</div>`).join("")}</div></div>`;
  },

  _banner(txt) {
    return `<div class="pa1-banner">${txt}</div>`;
  },

  _journal(pnj) {
    const entries = Array.isArray(pnj.journal) ? pnj.journal : [];
    if (!entries.length) return "";
    const rows = entries
      .map((e) => {
        const d = new Date(e.ts);
        const dstr = isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
        return `<div class="pa1-list-item"><strong>${dstr}</strong> ${this._esc(e.text)}</div>`;
      })
      .join("");
    return `<div class="pa1-section">${this._banner("Journal")}<div class="pa1-list">${rows}</div></div>`;
  },

  build(pnj) {
    const { gear } =
      typeof ItemResolver !== "undefined" && ItemResolver.splitEquip
        ? ItemResolver.splitEquip(pnj.equip || [])
        : { gear: pnj.equip || [] };
    const awakened = pnj.awakened || (pnj.attrs && pnj.attrs.MAG) ? "Éveillé" : "";

    const main = [
      this._skills(pnj),
      this._listSection("Atouts", pnj.edges),
      pnj.spells && pnj.spells.length ? this._listSection("Sorts", pnj.spells) : "",
      this._weapons(pnj),
      this._monitors(pnj),
      gear && gear.length ? this._listSection("Équipement", gear) : "",
      this._journal(pnj),
    ].join("");

    const sub = pnj.archetype ? `<span class="pa1-sub">${this._esc(pnj.archetype)}</span>` : "";
    const meta = pnj.meta ? `<span class="pa1-meta">${this._esc(pnj.meta)}</span>` : "";
    const ev = awakened ? `<span class="pa1-ev">${awakened}</span>` : "";

    return `<div class="pa1-titlebar"><h2 class="pa1-name">${this._esc(pnj.name)}</h2>${ev}</div>
      <div class="pa1-subrow">${meta}${sub}</div>
      ${this._attrBand(pnj)}
      ${main}`;
  },
};

if (typeof EditionAnarchy1 !== "undefined") {
  EditionAnarchy1.printSheet = (pnj) => PrintAnarchy1.build(pnj);
}
