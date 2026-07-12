"use strict";

/* ============================================================
   FEUILLE IMPRIMABLE ANARCHY 2 — fidèle au bloc PNJ COMPACT du livre
   (chapitre « L'enfer, c'est les autres », ex. GANGER) : titre rouille,
   en-têtes de section orange, table d'attributs à en-tête sombre,
   compétences en LISTE inline « nom succès (indice+Attr, RR n) » +
   sous-puces de spé, armes/équipement à puces, et le MONITEUR d'état
   (□□/□/□) au-dessus des seuils de blessures. Deux colonnes.
   Compagnon de l'édition Anarchy 2, s'auto-enregistre sur printSheet.
   ============================================================ */
const PrintAnarchy2 = {
  _esc: (s) => CardRenderer._esc(s == null ? "" : String(s)),
  _named(v) {
    return v == null ? "" : typeof v === "string" ? v : v.name || "";
  },
  _init: { FOR: "F", AGI: "A", VOL: "V", LOG: "L", CHA: "C" },
  // Succès moyens « seconds rôles » : ceil(réserve / 2) — vérifié sur les
  // blocs PNJ du livre (Athlétisme réserve 6 → 3, Influence 3 → 2).
  _avg(pool) {
    return Math.ceil(Math.max(0, pool) / 2);
  },

  _attrTable(pnj) {
    const a = pnj.attrs || {};
    const cols = [["FOR", a.FOR], ["AGI", a.AGI], ["VOL", a.VOL], ["LOG", a.LOG], ["CHA", a.CHA]];
    const head = cols.map(([k]) => `<th>${k}</th>`).join("");
    const body = cols.map(([, v]) => `<td>${this._esc(v)}</td>`).join("");
    return `<table class="a2-attrs"><thead><tr>${head}</tr></thead><tbody><tr>${body}</tr></tbody></table>`;
  },

  _skillItem(name, val, attrKey, rr) {
    const attrs = this._attrsRef || {};
    const av = attrs[attrKey] || 0;
    const init = this._init[attrKey] || attrKey || "";
    const succ = this._avg(val + av);
    return `${this._esc(name)} <strong>${succ}</strong> (${this._esc(val)}+${this._esc(init)}, RR ${this._esc(rr || 0)})`;
  },

  _skills(pnj) {
    this._attrsRef = pnj.attrs || {};
    const items = [];
    for (const s of pnj.skills || []) {
      if (!s || s.name == null) continue;
      items.push(`<li>${this._skillItem(s.name, s.val, s.attr, s.rr)}`);
      const subs = [];
      const spec = (n, v, ak, rr) => subs.push(`<div class="a2-spec">◊ ${this._skillItem(n, v, ak || s.attr, rr)}</div>`);
      if (s.spec && s.spec !== true && s.specVal) spec(s.spec, s.specVal, s.specAttr, s.specRR != null ? s.specRR : s.rr || 0);
      for (const ex of s.extraSpecs || []) spec(ex.name, ex.val != null ? ex.val : s.val + 2, ex.attr, ex.rr || 0);
      items[items.length - 1] += subs.join("") + "</li>";
    }
    if (!items.length) return "";
    return this._sec("Compétences", `<ul class="a2-list">${items.join("")}</ul>`);
  },

  _bullets(title, arr, fmt) {
    const list = (Array.isArray(arr) ? arr : []).map(fmt).filter(Boolean);
    if (!list.length) return "";
    return this._sec(title, `<ul class="a2-list">${list.map((t) => `<li>${t}</li>`).join("")}</ul>`);
  },

  _weapons(pnj) {
    return this._bullets("Armes", pnj.weapons, (w) => {
      if (!w) return "";
      const vd = w.vd != null ? `VD ${this._esc(w.vd)}` : "";
      const rg = w.ranges ? ` ${this._esc(w.ranges)}` : "";
      return `${this._esc(w.name)} ${vd}${rg}`.trim();
    });
  },

  /** Moniteur d'état Anarchy (2 légères / 1 grave / 1 incap, extensible par
      atout) — les cases □□/□/□ du livre. Suit CAPS de _monitorBoxesAnarchy. */
  _monitor(pnj) {
    const caps = { leger: 2 + (pnj.legerCapBonus || 0), grave: 1 + (pnj.graveCapBonus || 0), incap: 1 };
    const seg = (sev) => Array.from({ length: caps[sev] }, () => `<span class="a2-box a2-box-${sev}"></span>`).join("");
    return `<span class="a2-mon">${seg("leger")}<span class="a2-mon-sep">/</span>${seg("grave")}<span class="a2-mon-sep">/</span>${seg("incap")}</span>`;
  },

  _seuils(pnj) {
    const fmt = (arr) => (Array.isArray(arr) ? `${arr[0]} / ${arr[1]} / ${arr[2]}` : "—");
    const rows = [];
    rows.push(`<div class="a2-seuil"><span class="a2-seuil-lbl">Combativité</span>${this._esc(pnj.threatLevel || "—")}</div>`);
    if (Array.isArray(pnj.physMonitor)) rows.push(`<div class="a2-seuil"><span class="a2-seuil-lbl">Physiques</span>${fmt(pnj.physMonitor)}</div>`);
    if (Array.isArray(pnj.mentMonitor)) rows.push(`<div class="a2-seuil"><span class="a2-seuil-lbl">Mentales</span>${fmt(pnj.mentMonitor)}</div>`);
    if (Array.isArray(pnj.matrixMonitor)) rows.push(`<div class="a2-seuil"><span class="a2-seuil-lbl">Matrice</span>${fmt(pnj.matrixMonitor)}</div>`);
    const head = `Seuils de blessures &nbsp;${this._monitor(pnj)}`;
    return this._sec(head, rows.join(""));
  },

  _sec(title, inner) {
    return `<div class="a2-sec"><div class="a2-sec-h">${title}</div>${inner}</div>`;
  },

  _journal(pnj) {
    const entries = Array.isArray(pnj.journal) ? pnj.journal : [];
    if (!entries.length) return "";
    const rows = entries
      .map((e) => {
        const d = new Date(e.ts);
        const dstr = isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
        return `<li><strong>${dstr}</strong> ${this._esc(e.text)}</li>`;
      })
      .join("");
    return this._sec("Journal", `<ul class="a2-list">${rows}</ul>`);
  },

  build(pnj) {
    const know = (pnj.knowledges || []).map((k) => this._esc(typeof k === "string" ? k : k.name)).filter(Boolean);
    const left = [
      this._skills(pnj),
      know.length ? this._sec("Connaissances", `<div class="a2-plain">${know.join(", ")}</div>`) : "",
      this._bullets("Atouts", pnj.edges, (a) => this._esc(this._named(a))),
    ].join("");
    const right = [
      this._weapons(pnj),
      this._bullets("Équipement", pnj.equip, (e) => this._esc(this._named(e))),
      this._seuils(pnj),
    ].join("");

    const sub = pnj.archetype ? `<span class="psheet-sub">${this._esc(pnj.archetype)}</span>` : "";
    return `<div class="psheet-titlebar"><h2 class="psheet-name">${this._esc(pnj.name)}</h2>${sub}</div>
      <div class="psheet-meta">Métatype : ${this._esc(pnj.meta || "")}</div>
      ${this._attrTable(pnj)}
      <div class="a2-cols"><div>${left}</div><div>${right}</div></div>
      ${this._journal(pnj)}`;
  },
};

if (typeof EditionAnarchy2 !== "undefined") {
  EditionAnarchy2.printSheet = (pnj) => PrintAnarchy2.build(pnj);
}
