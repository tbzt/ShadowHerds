"use strict";

/* ============================================================
   MENTIONS & MOTS-CLÉS (E4 → E7) — autocomplétion `@` et `#` dans un
   textarea, + rendu des puces cliquables (mode Lire des hôtes, cartes).

   E7 — ancrage par ID. Une mention se stocke `@[nom](id)` : l'ID est la
   VÉRITÉ, le nom entre crochets n'est qu'un cache lisible/cherchable. Le
   rendu résout toujours l'id → nom COURANT (PnjLookup.locate) — d'où la
   propagation automatique du renommage (Nita → Nitao) SANS aucun hook.
   L'auteur ne tape jamais le jeton : il saisit « @Ni », choisit dans la
   liste, le widget insère `@[Nita](id)`.

   Un mot-clé `#mot` reste du texte brut (il EST son propre libellé, aucun
   id) ; l'autocomplétion ne propose que les tags déjà employés.

   Candidats `@` résolus par PnjLookup.search — même source que la Palette
   (CH-Q7), aucun résolveur concurrent. Deux hôtes (Notepad, EditModal
   em-notes), un seul widget : Mentions.attach(textarea).

   Index (backlinks « Mentionné dans » par id, récolte des `#tags`) : calculé
   à la volée par un balayage unique des notes (bloc-notes de séance + champ
   `notes` et journal des entités sauvegardées) — pas d'index persistant,
   volumes faibles (cf. plan E4/E7).
   ============================================================ */
const Mentions = {
  _box: null,
  _target: null,
  _match: null, // { start, end, query }
  _mode: null, // "@" (entités) | "#" (mots-clés)
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

  /** E7 — auto-attach délégué : tout champ portant `data-mentions` (posé par
      le renderer) est câblé au focus, sans câblage explicite par hôte. Un
      nouveau champ (re-rendu, futur écran) est couvert automatiquement dès
      qu'il porte l'attribut. `attach()` reste idempotent, donc sans risque de
      double câblage avec les hôtes historiques (Notepad, EditModal). */
  _autoWired: false,
  wireAuto() {
    if (this._autoWired) return;
    this._autoWired = true;
    document.addEventListener("focusin", (e) => {
      const el = e.target.closest("[data-mentions]");
      if (el) this.attach(el);
    });
  },

  /** Détecte un `@partiel` ou `#partiel` juste avant le curseur (précédé d'un
      début de texte ou d'un espace, sans espace jusqu'au curseur). Le garde
      `startsWith("[")` évite de se déclencher quand le curseur est À
      L'INTÉRIEUR d'un jeton `@[…](id)` déjà posé. */
  _onInput(textarea) {
    const pos = textarea.selectionStart;
    const before = textarea.value.slice(0, pos);
    const at = before.match(/(?:^|\s)@([^\s@]*)$/);
    if (at && !at[1].startsWith("[")) {
      this._open(textarea, pos, at[1], "@");
      return;
    }
    const hash = before.match(/(?:^|\s)#([^\s#]*)$/);
    if (hash) {
      this._open(textarea, pos, hash[1], "#");
      return;
    }
    this._close();
  },

  _open(textarea, pos, query, mode) {
    this._mode = mode;
    this._match = { start: pos - query.length - 1, end: pos, query };
    this._target = textarea;
    this._sel = 0;
    this._results =
      mode === "#"
        ? this.usedTags(query)
        : PnjLookup.search(query).slice(0, 8);
    this._results.length ? this._render() : this._close();
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
        const sel = i === this._sel ? " sel" : "";
        if (this._mode === "#") {
          return `<div class="palette-row${sel}" data-idx="${i}" role="option" aria-selected="${i === this._sel}">
              <span class="palette-type">Mot-clé</span>
              <span class="palette-name">#${Utils.escHtml(r.tag)}</span>
            </div>`;
        }
        // E6 : même avatar constant que la Palette (couleur+anneau+initiale).
        const avatar = r.type === "pj" ? CardRenderer._pcAvatar(PnjLookup.find(r.id)) : "";
        return `<div class="palette-row${sel}" data-idx="${i}" role="option" aria-selected="${i === this._sel}">
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

  /** Insère le jeton à la place du `@partiel`/`#partiel`. L'auteur ne voit
      jamais cette syntaxe se former à la main : il choisit dans la liste. */
  _pick(idx) {
    const r = this._results[idx];
    const ta = this._target;
    const m = this._match;
    if (!r || !ta || !m) return;
    const before = ta.value.slice(0, m.start);
    const after = ta.value.slice(m.end);
    const insert =
      this._mode === "#"
        ? `#${r.tag} `
        : `@[${this._label(r.name)}](${r.id}) `;
    ta.value = `${before}${insert}${after}`;
    const caret = before.length + insert.length;
    ta.focus();
    ta.setSelectionRange(caret, caret);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    this._close();
  },

  /** Nettoie un nom pour le cache entre crochets (l'id reste la vérité) :
      pas de `]` ni de saut de ligne qui casseraient le parseur. */
  _label(name) {
    return String(name || "").replace(/[\]\n]/g, " ").trim() || "?";
  },

  _close() {
    this._match = null;
    this._mode = null;
    this._results = [];
    if (this._box) this._box.hidden = true;
  },

  // ---- Rendu (mode Lire des hôtes + cartes) --------------------------------

  /** Rend un texte de note en HTML sûr : `@[nom](id)` → puce cliquable au nom
      COURANT (résolu par id → propagation du renommage), `#mot` → puce
      mot-clé, le reste échappé. Un ancien `@Nom` nu (E4) reste du texte. Les
      clics sont câblés par délégation côté hôte (`data-action`), jamais en
      inline. */
  renderText(text) {
    if (!text) return "";
    const RE = /@\[([^\]\n]*)\]\(([^)\n]+)\)|(?:^|(?<=\s))#([^\s#]+)/g;
    let out = "";
    let last = 0;
    let m;
    while ((m = RE.exec(text))) {
      out += Utils.escHtml(text.slice(last, m.index));
      if (m[2] != null) {
        const id = m[2];
        const ent = PnjLookup.locate(id);
        const name = ent ? ent.name : m[1];
        const dead = ent ? "" : " mention-chip--dead";
        // Signature visuelle PJ (E6) : la puce reprend la couleur identifiante
        // du PJ, résolue à chaque rendu — un changement de couleur se propage
        // au prochain affichage, comme le nom (aucun cache, aucun hook).
        const pcStyle =
          ent && ent.type === "pj" && ent.pcColor
            ? ` style="--mention-pc-color:${Utils.escHtml(ent.pcColor)}"`
            : "";
        out += `<span class="mention-chip${dead}"${pcStyle} data-action="mention-open" data-id="${Utils.escHtml(id)}" role="button" tabindex="0">@${Utils.escHtml(name || "?")}</span>`;
      } else if (m[3] != null) {
        const tag = m[3];
        out += `<span class="tag-chip" data-action="tag-open" data-tag="${Utils.escHtml(tag)}" role="button" tabindex="0">#${Utils.escHtml(tag)}</span>`;
      }
      last = RE.lastIndex;
    }
    out += Utils.escHtml(text.slice(last));
    return out.replace(/\n/g, "<br>");
  },

  // ---- Index (backlinks + récolte des mots-clés) ---------------------------

  /** Un seul balayage des notes (bloc-notes de séance + champ `notes` et
      journal de chaque entité sauvegardée). `cb(text, loc)` par fragment.
      Source unique réutilisée par backlinksFor / notesWithTag / usedTags. */
  _scanNotes(cb) {
    const note = Storage.getGlobal("sessionNotes", "");
    if (note) cb(note, { kind: "notepad", label: "Bloc-notes de séance" });
    const scan = (arr, type) => {
      for (const e of arr || []) {
        const loc = { kind: "entity", id: e.id, name: e.name, type };
        if (e.notes) cb(e.notes, loc);
        if (Array.isArray(e.journal)) {
          for (const j of e.journal) if (j && j.text) cb(j.text, loc);
        }
      }
    };
    scan(Shadows.data.all, "pnj");
    scan(Characters.data.all, "pj");
    scan(ContactsBook.data.all, "contact");
    scan(Servers.data.all, "server");
  },

  _locOut(loc) {
    return loc.kind === "entity"
      ? { kind: "entity", id: loc.id, name: loc.name, type: loc.type }
      : { kind: "notepad", label: loc.label };
  },

  /** Backlinks « Mentionné dans » d'une entité, par ID (robuste au renommage
      et aux homonymes — E7). Dédupliqué par emplacement, exclut l'entité
      elle-même. */
  backlinksFor(id) {
    if (!id) return [];
    const needle = `](${id})`;
    const out = [];
    const seen = new Set();
    this._scanNotes((text, loc) => {
      if (!text.includes(needle)) return;
      if (loc.kind === "entity" && loc.id === id) return; // pas soi-même
      const key = loc.kind === "entity" ? `e:${loc.id}` : "n";
      if (seen.has(key)) return;
      seen.add(key);
      out.push(this._locOut(loc));
    });
    return out;
  },

  /** Emplacements de note portant `#tag` (récolte Palette, E7). */
  notesWithTag(tag) {
    const t = Utils.searchNorm(tag || "");
    if (!t) return [];
    const re = /(?:^|\s)#([^\s#]+)/g;
    const out = [];
    const seen = new Set();
    this._scanNotes((text, loc) => {
      re.lastIndex = 0;
      let m;
      let hit = false;
      while ((m = re.exec(text))) {
        if (Utils.searchNorm(m[1]) === t) {
          hit = true;
          break;
        }
      }
      if (!hit) return;
      const key = loc.kind === "entity" ? `e:${loc.id}` : "n";
      if (seen.has(key)) return;
      seen.add(key);
      out.push(this._locOut(loc));
    });
    return out;
  },

  /** Mots-clés `#` déjà employés, filtrés par préfixe (autocomplétion `#`).
      Ne fabrique jamais un tag : ne propose que ce que l'auteur a déjà tapé. */
  usedTags(prefix) {
    const p = Utils.searchNorm(prefix || "");
    const re = /(?:^|\s)#([^\s#]+)/g;
    const seen = new Map(); // normalisé -> première forme affichée
    this._scanNotes((text) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const norm = Utils.searchNorm(m[1]);
        if (norm && !seen.has(norm)) seen.set(norm, m[1]);
      }
    });
    return [...seen.entries()]
      .filter(([norm]) => !p || norm.startsWith(p))
      .map(([, raw]) => raw)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 8)
      .map((tag) => ({ tag }));
  },
};
