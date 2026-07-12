"use strict";

/* ============================================================
   FEUILLE IMPRIMABLE ANARCHY 2 — fidèle au prétiré du livre :
   parchemin + or, Saira, ligne d'attributs, TABLE de compétences
   (Compétence | Indice | +Attribut | = RD | RR) zébrée, seuils de
   blessures, colonnes narratives (Mots-clés / Comportements /
   Répliques). Compagnon de l'édition Anarchy 2, s'auto-enregistre
   sur EditionAnarchy2.printSheet (lu par PrintSheet).
   ============================================================ */
const PrintAnarchy2 = {
  _esc: (s) => CardRenderer._esc(s == null ? "" : String(s)),
  _named(v) {
    return v == null ? "" : typeof v === "string" ? v : v.name || "";
  },

  _attrRow(pnj) {
    const a = pnj.attrs || {};
    const cols = [
      ["FORCE", a.FOR], ["AGILITÉ", a.AGI], ["VOLONTÉ", a.VOL],
      ["LOGIQUE", a.LOG], ["CHARISME", a.CHA],
    ];
    const cells = cols
      .map(([k, v]) => `<div class="pa-attr"><span class="pa-attr-lbl">${k}</span><span class="pa-attr-val">${this._esc(v)}</span></div>`)
      .join("");
    const ess = pnj.essence != null ? `<span class="pa-ess">Essence : <strong>${this._esc(pnj.essence)}</strong></span>` : "";
    return `<div class="pa-attrs">${cells}${ess}</div>`;
  },

  _skillRows(pnj) {
    const attrs = pnj.attrs || {};
    const rows = [];
    for (const s of pnj.skills || []) {
      if (!s || s.name == null) continue;
      const av = attrs[s.attr] || 0;
      rows.push(
        `<tr><td class="pa-sk-name">${this._esc(s.name)}</td><td>${this._esc(s.val)}</td><td>${this._esc(s.attr)} ${this._esc(av)}</td><td class="pa-sk-rd">${this._esc(s.val + av)}</td><td>${s.rr ? this._esc(s.rr) : "—"}</td></tr>`,
      );
      const spec = (name, val, attrKey) => {
        const sav = attrs[attrKey || s.attr] || 0;
        rows.push(
          `<tr class="pa-sk-spec"><td class="pa-sk-name">(${this._esc(name)})</td><td>${this._esc(val)}</td><td>${this._esc(attrKey || s.attr)} ${this._esc(sav)}</td><td class="pa-sk-rd">${this._esc(val + sav)}</td><td>—</td></tr>`,
        );
      };
      if (s.spec && s.spec !== true && s.specVal) spec(s.spec, s.specVal, s.specAttr);
      for (const ex of s.extraSpecs || []) spec(ex.name, ex.val != null ? ex.val : s.val + 2, ex.attr);
    }
    if (!rows.length) return "";
    return `<table class="pa-table pa-skills"><thead><tr><th>Compétence</th><th>Indice</th><th>+Attribut</th><th>= RD</th><th>RR</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  },

  _weapons(pnj) {
    const w = pnj.weapons || [];
    if (!w.length) return "";
    const rows = w
      .map((a) => `<tr><td class="pa-sk-name">${this._esc(a.name)}</td><td>VD ${this._esc(a.vd)}${a.ranges ? ` · ${this._esc(a.ranges)}` : ""}</td></tr>`)
      .join("");
    return `<table class="pa-table pa-weapons"><thead><tr><th>Armes</th><th>Type</th></tr></thead><tbody>${rows}</tbody></table>`;
  },

  _thresholds(pnj) {
    const rows = [];
    const row = (label, arr) => {
      if (!Array.isArray(arr)) return;
      rows.push(`<tr><td class="pa-sk-name">${label}</td><td>${this._esc(arr[0])}</td><td>${this._esc(arr[1])}</td><td>${this._esc(arr[2])}</td></tr>`);
    };
    row("Physique", pnj.physMonitor);
    row("Mental", pnj.mentMonitor);
    row("Matrice", pnj.matrixMonitor);
    if (!rows.length) return "";
    return `<table class="pa-table pa-blessures"><thead><tr><th>Blessures — seuils</th><th>Légère</th><th>Grave</th><th>Incap.</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  },

  _line(label, value) {
    if (!value) return "";
    return `<p class="psheet-line"><span class="psheet-line-label">${label}</span>${value}</p>`;
  },

  _narrativeCol(title, items) {
    const list = (Array.isArray(items) ? items : []).map((v) => this._named(v)).filter(Boolean);
    if (!list.length) return "";
    return `<div class="pa-narr"><div class="pa-narr-title">${title}</div>${list.map((t) => `<div class="pa-narr-item">${this._esc(t)}</div>`).join("")}</div>`;
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
    const knowLine = (pnj.knowledges || [])
      .map((k) => this._esc(typeof k === "string" ? k : k.name))
      .filter(Boolean)
      .join(", ");
    const atouts = (pnj.edges || []).map((a) => this._esc(this._named(a))).filter(Boolean);
    const equipLine = (pnj.equip || []).map((e) => this._esc(this._named(e))).filter(Boolean).join(", ");

    const main = [
      this._attrRow(pnj),
      this._line("Combativité", this._esc(pnj.threatLevel)),
      this._skillRows(pnj),
      this._line("Connaissances", knowLine),
      atouts.length ? `<div class="pa-atouts"><div class="pa-narr-title">Atouts</div>${atouts.map((a) => `<div class="pa-atout">• ${a}</div>`).join("")}</div>` : "",
      this._weapons(pnj),
      this._line("Équipement", equipLine),
      this._thresholds(pnj),
      this._journal(pnj),
    ].join("");

    const narrative =
      this._narrativeCol("Mots-clés", pnj.keywords) +
      this._narrativeCol("Comportements", pnj.behaviors) +
      this._narrativeCol("Répliques", pnj.quotes);
    const portrait = pnj.portraitUrl
      ? `<img class="psheet-portrait" src="${this._esc(pnj.portraitUrl)}" alt="">`
      : "";
    const aside = portrait || narrative ? `<div class="psheet-aside">${portrait}${narrative}</div>` : "";

    const sub = pnj.archetype ? `<span class="psheet-sub">${this._esc(pnj.archetype)}</span>` : "";

    return `<div class="psheet-titlebar"><h2 class="psheet-name">${this._esc(pnj.name)}</h2>${sub}</div>
      <div class="psheet-meta">Métatype : ${this._esc(pnj.meta || "")}</div>
      <div class="psheet-cols"><div class="psheet-main">${main}</div>${aside}</div>`;
  },
};

if (typeof EditionAnarchy2 !== "undefined") {
  EditionAnarchy2.printSheet = (pnj) => PrintAnarchy2.build(pnj);
}
