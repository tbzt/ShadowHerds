"use strict";

/* ============================================================
   MENTIONS (E4, chantier Équipe) — autocomplétion `@` dans un textarea.
   V1 = plein texte, zéro migration : insère "@Nom" en texte brut, aucun
   format de stockage nouveau (les notes existantes valident déjà si le nom
   y figure). Candidats résolus par PnjLookup.search — la même source que
   la Palette (CH-Q7), aucun résolveur concurrent. Deux hôtes actuels
   (Notepad, EditModal em-notes), un seul widget : Mentions.attach(textarea).

   Backlinks « Mentionné dans » : calculés à la volée (scan du bloc-notes de
   séance + du champ `notes` des entités sauvegardées), pas d'index
   persistant — volumes faibles, cf. plan E4.
   ============================================================ */
const Mentions = {
  _box: null,
  _target: null,
  _match: null, // { start, end, query }
  _results: [],
  _sel: 0,

  _ensureBox() {
    if (this._box) return this._box;
    const box = document.createElement("div");
    box.id = "mentions-box";
    box.setAttribute("role", "listbox");
    box.hidden = true;
    document.body.appendChild(box);
    // mousedown (pas click) : précède le blur du textarea qui fermerait la
    // liste avant que l'insertion ait pu lire this._match.
    box.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const row = e.target.closest(".palette-row");
      if (row) this._pick(Number(row.dataset.idx));
    });
    this._box = box;
    return box;
  },

  /** Câble un textarea (idempotent — sans effet si déjà attaché). */
  attach(textarea) {
    if (!textarea || textarea.dataset.mentionsWired) return;
    textarea.dataset.mentionsWired = "1";
    textarea.addEventListener("input", () => this._onInput(textarea));
    textarea.addEventListener("keydown", (e) => this._onKeydown(e));
    textarea.addEventListener("blur", () => {
      // setTimeout : laisse le mousedown de la box s'exécuter d'abord.
      setTimeout(() => this._close(), 0);
    });
  },

  /** Détecte un `@partiel` juste avant le curseur (précédé d'un début de
      texte ou d'un espace, sans espace jusqu'au curseur). */
  _onInput(textarea) {
    const pos = textarea.selectionStart;
    const before = textarea.value.slice(0, pos);
    const m = before.match(/(?:^|\s)@([^\s@]*)$/);
    if (!m) {
      this._close();
      return;
    }
    const query = m[1];
    this._match = { start: pos - query.length - 1, end: pos, query };
    this._results = PnjLookup.search(query).slice(0, 8);
    this._sel = 0;
    this._target = textarea;
    if (!this._results.length) {
      this._close();
      return;
    }
    this._render();
  },

  _onKeydown(e) {
    if (!this._match || !this._box || this._box.hidden) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this._sel = (this._sel + 1) % this._results.length;
      this._render();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this._sel = (this._sel - 1 + this._results.length) % this._results.length;
      this._render();
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      this._pick(this._sel);
    } else if (e.key === "Escape") {
      e.preventDefault();
      this._close();
    }
  },

  _TYPE_LABEL: { pnj: "PNJ", pj: "PJ", contact: "Contact", server: "Serveur" },

  /** Réutilise .palette-row/.palette-type/.palette-name tels quels (même
      vocabulaire visuel que la Palette, CH-Q7) — aucun nouveau composant. */
  _render() {
    const box = this._ensureBox();
    box.innerHTML = this._results
      .map((r, i) => {
        // E6 : même avatar constant que la Palette (couleur+anneau+initiale).
        const avatar = r.type === "pj" ? CardRenderer._pcAvatar(PnjLookup.find(r.id)) : "";
        return `<div class="palette-row${i === this._sel ? " sel" : ""}" data-idx="${i}" role="option" aria-selected="${i === this._sel}">
            <span class="palette-type">${this._TYPE_LABEL[r.type] || r.type}</span>
            <span class="palette-name">${avatar}${Utils.escHtml(r.name)}</span>
          </div>`;
      })
      .join("");
    this._position();
    box.hidden = false;
  },

  /** Ancrage sous le textarea (pas de calcul de position de curseur — scope
      réduit, cf. plan E4). Sous 641px : ancré au-dessus du clavier virtuel
      via VisualViewport (meilleur effort — non simulable en preview headless,
      dégrade proprement en `bottom:0` sans l'API). */
  _position() {
    const box = this._box;
    const ta = this._target;
    if (window.innerWidth < 641) {
      box.classList.add("mentions-mobile");
      if (window.visualViewport) {
        const vv = window.visualViewport;
        box.style.bottom = `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`;
      }
      return;
    }
    box.classList.remove("mentions-mobile");
    box.style.bottom = "";
    const r = ta.getBoundingClientRect();
    box.style.left = `${r.left + window.scrollX}px`;
    box.style.top = `${r.bottom + window.scrollY + 4}px`;
    box.style.width = `${r.width}px`;
  },

  _pick(idx) {
    const r = this._results[idx];
    const ta = this._target;
    const m = this._match;
    if (!r || !ta || !m) return;
    const before = ta.value.slice(0, m.start);
    const after = ta.value.slice(m.end);
    const insert = `@${r.name} `;
    ta.value = `${before}${insert}${after}`;
    const caret = before.length + insert.length;
    ta.focus();
    ta.setSelectionRange(caret, caret);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    this._close();
  },

  _close() {
    this._match = null;
    this._results = [];
    if (this._box) this._box.hidden = true;
  },

  /** Backlinks « Mentionné dans » (calculés à la volée) : le bloc-notes de
      séance (global, hors édition) + le champ `notes` de chaque entité
      sauvegardée (PJ/PNJ/contact) qui contient `@Nom`. `excludeId` retire
      l'entité elle-même de ses propres résultats. */
  backlinksFor(name, excludeId) {
    if (!name) return [];
    const needle = `@${name}`;
    const out = [];
    const noteText = Storage.getGlobal("sessionNotes", "");
    if (noteText && noteText.includes(needle)) {
      out.push({ kind: "notepad", label: "Bloc-notes de séance" });
    }
    const scan = (arr, type) => {
      for (const e of arr || []) {
        if (e && e.id !== excludeId && e.notes && e.notes.includes(needle)) {
          out.push({ kind: "entity", id: e.id, name: e.name, type });
        }
      }
    };
    scan(Characters.data.all, "pj");
    scan(Shadows.data.all, "pnj");
    scan(ContactsBook.data.all, "contact");
    return out;
  },
};
