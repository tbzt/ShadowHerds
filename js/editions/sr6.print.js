"use strict";

/* ============================================================
   FEUILLE IMPRIMABLE SR6 — fidèle au bloc d'archétype du Livre de
   Règles 6e : titre magenta souligné, MÉTATYPE, table d'attributs
   (… ATO MAG ESS) à en-têtes magenta, lignes « Libellé : … »,
   moniteur d'états entier. Compagnon de l'édition SR6, s'auto-
   enregistre sur EditionSR6.printSheet (lu par PrintSheet).
   ============================================================ */
const PrintSR6 = {
  _esc: (s) => CardRenderer._esc(s == null ? "" : String(s)),
  _named(v) {
    // #63 : v.str couvre l'item d'équipement polymorphe {str,cat,rating}.
    return v == null ? "" : typeof v === "string" ? v : v.name || v.str || "";
  },
  _list(arr) {
    return (Array.isArray(arr) ? arr : []).map((v) => this._named(v)).filter(Boolean);
  },
  _skillLine(skills) {
    return (Array.isArray(skills) ? skills : [])
      .filter((s) => s && s.name != null)
      .map((s) => {
        const v = s.val != null ? ` ${s.val}` : "";
        const spec = s.spec ? ` (${this._esc(s.spec)})` : "";
        return `${this._esc(s.name)}${v}${spec}`;
      })
      .join(", ");
  },
  _knowLine(knowledges) {
    return (Array.isArray(knowledges) ? knowledges : [])
      .map((k) => (typeof k === "string" ? k : `${k.name}${k.val != null ? ` ${k.val}` : ""}`))
      .filter(Boolean)
      .map((s) => this._esc(s))
      .join(", ");
  },
  _line(label, value) {
    if (!value && value !== 0) return "";
    return `<p class="psheet-line"><span class="psheet-line-label">${label}</span>${value}</p>`;
  },

  _attrTable(pnj) {
    const a = pnj.attrs || {};
    const cols = [
      ["CON", a.CON], ["AGI", a.AGI], ["RÉA", a.RÉA], ["FOR", a.FOR],
      ["VOL", a.VOL], ["LOG", a.LOG], ["INT", a.INT], ["CHA", a.CHA],
    ];
    if (a.ATO != null) cols.push(["ATO", a.ATO]);
    if (a.MAG) cols.push(["MAG", a.MAG]);
    if (a.RES) cols.push(["RÉS", a.RES]);
    cols.push(["ESS", a.ESS != null ? a.ESS : "—"]);
    const head = cols.map(([k]) => `<th>${k}</th>`).join("");
    const body = cols.map(([, v]) => `<td>${this._esc(v)}</td>`).join("");
    return `<table class="psheet-attrs"><thead><tr>${head}</tr></thead><tbody><tr>${body}</tr></tbody></table>`;
  },

  _monitors(pnj) {
    const boxes = (n) =>
      Array.from({ length: Math.max(0, n | 0) }, () => `<span class="psheet-box"></span>`).join("");
    if (pnj.stunMon !== undefined) {
      return `<div class="psheet-monitors">
        <span><span class="psheet-monitor-label">Physique</span><span class="psheet-boxes">${boxes(pnj.physMon)}</span></span>
        <span><span class="psheet-monitor-label">Étourdissant</span><span class="psheet-boxes">${boxes(pnj.stunMon)}</span></span>
      </div>`;
    }
    return `<div class="psheet-monitors">
      <span><span class="psheet-monitor-label">Moniteur d'états</span><span class="psheet-boxes">${boxes(pnj.me)}</span></span>
    </div>`;
  },

  _journal(pnj) {
    const entries = Array.isArray(pnj.journal) ? pnj.journal : [];
    if (!entries.length) return "";
    const rows = entries
      .map((e) => {
        const d = new Date(e.ts);
        const dstr = isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
        return `<p class="psheet-journal-entry"><span class="psheet-journal-date">${dstr}</span> ${this._esc(e.text)}</p>`;
      })
      .join("");
    return `<div class="psheet-journal"><span class="psheet-journal-label">Journal</span>${rows}</div>`;
  },

  build(pnj) {
    const { weapons, gear } =
      typeof ItemResolver !== "undefined" && ItemResolver.splitEquip
        ? ItemResolver.splitEquip(pnj.equip || [])
        : { weapons: [], gear: pnj.equip || [] };

    const metaStr = pnj.meta + (pnj.metavariant ? ` (${this._esc(pnj.metavariant)})` : "");
    const initStr = `${this._esc(pnj.initBase ?? 0)} + ${this._esc(pnj.initDice ?? 1)}D6` + (pnj.pa ? ` / ${this._esc(pnj.pa)}` : "");

    const main = [
      this._attrTable(pnj),
      this._line("Initiative / Actions", initStr),
      pnj.stunMon !== undefined
        ? this._line("Moniteur de condition (P/E)", `${this._esc(pnj.physMon)} / ${this._esc(pnj.stunMon)}`)
        : this._line("Moniteur d'états", pnj.me != null ? this._esc(pnj.me) : ""),
      this._monitors(pnj),
      this._line("Score Défensif", pnj.sdBase != null ? this._esc(pnj.sdBase) : ""),
      pnj.drainResist != null ? this._line("Résistance au Drain", this._esc(pnj.drainResist)) : "",
      this._line("Compétences actives", this._skillLine(pnj.skills)),
      this._line("Connaissances", this._knowLine(pnj.knowledges)),
      this._line("Traits", this._list(pnj.traits).map((s) => this._esc(s)).join(", ")),
      this._line("Sorts", this._list(pnj.spells).map((s) => this._esc(s)).join(", ")),
      this._line("Pouvoirs d'adepte", this._list(pnj.powers).map((s) => this._esc(s)).join(", ")),
      this._line("Augmentations", this._list(pnj.augs).map((s) => this._esc(s)).join(", ")),
      this._line("Armes", this._list(weapons).map((s) => this._esc(s)).join(", ")),
      this._line("Équipement", this._list(gear).map((s) => this._esc(s)).join(", ")),
      this._journal(pnj),
    ].join("");

    const aside = pnj.portraitUrl
      ? `<div class="psheet-aside"><img class="psheet-portrait" src="${this._esc(pnj.portraitUrl)}" alt=""></div>`
      : "";
    const sub = pnj.archetype ? `<span class="psheet-sub">${this._esc(pnj.archetype)}</span>` : "";

    return `<div class="psheet-titlebar"><h2 class="psheet-name">${this._esc(pnj.name)}</h2>${sub}</div>
      <div class="psheet-meta">Métatype : ${this._esc(metaStr)}</div>
      <div class="psheet-cols"><div class="psheet-main">${main}</div>${aside}</div>`;
  },
};

if (typeof EditionSR6 !== "undefined") {
  EditionSR6.printSheet = (pnj) => PrintSR6.build(pnj);
}
