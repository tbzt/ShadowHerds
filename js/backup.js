"use strict";

/* ============================================================
   BACKUP — export / import global des Ombres et Contacts

   Sauvegarde portable de toutes les éditions (SR5 + SR6 + Anarchy)
   dans un seul fichier JSON, incluant PNJ (Ombres portées) et
   Contacts, avec leurs groupes.

   - export()            → télécharge un .json daté
   - importFromFile(file)→ lit un fichier local
   - importFromUrl(url)  → récupère un fichier distant (NAS, http(s))
   - apply(data, mode)   → 'merge' (fusionne) ou 'replace' (écrase)

   Le format est versionné pour rester lisible à l'avenir. Les clés
   localStorage sous-jacentes ont la forme sr_pnj_v2_<edition>_<clé>.
   ============================================================ */
const Backup = {
  FORMAT: "shadowherds-backup",
  VERSION: 1,
  EDITIONS: ["sr5", "sr6", "anarchy"],
  KEYS: ["shadows_all", "shadows_groups", "contacts_all", "contacts_groups"],

  _rawKey(edition, key) {
    return `sr_pnj_v2_${edition}_${key}`;
  },

  /* ---- Construction du paquet exportable ---- */
  build() {
    const data = {};
    for (const ed of this.EDITIONS) {
      const bucket = {};
      for (const key of this.KEYS) {
        let val = null;
        try {
          const raw = localStorage.getItem(this._rawKey(ed, key));
          val = raw === null ? null : JSON.parse(raw);
        } catch {
          val = null;
        }
        if (val !== null) bucket[key] = val;
      }
      if (Object.keys(bucket).length) data[ed] = bucket;
    }
    return {
      format: this.FORMAT,
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      app: "ShadowHerds",
      data,
    };
  },

  /** Statistiques lisibles d'un paquet (pour confirmation). */
  stats(pkg) {
    const out = { pnj: 0, contacts: 0, editions: [] };
    const data = pkg && pkg.data ? pkg.data : {};
    for (const ed of this.EDITIONS) {
      const b = data[ed];
      if (!b) continue;
      const pnj = (b.shadows_all || []).length;
      const contacts = (b.contacts_all || []).length;
      if (pnj || contacts) {
        out.editions.push({ edition: ed, pnj, contacts });
        out.pnj += pnj;
        out.contacts += contacts;
      }
    }
    return out;
  },

  /* ---- Export : téléchargement d'un .json ---- */
  export() {
    const pkg = this.build();
    const s = this.stats(pkg);
    if (s.pnj === 0 && s.contacts === 0) {
      toast("Rien à exporter pour le moment.");
      return;
    }
    const json = JSON.stringify(pkg, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `shadowherds-sauvegarde-${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Export : ${s.pnj} PNJ, ${s.contacts} contacts.`);
  },

  /* ---- Validation d'un paquet importé ---- */
  validate(pkg) {
    if (!pkg || typeof pkg !== "object") return "Fichier illisible.";
    if (pkg.format && pkg.format !== this.FORMAT)
      return "Ce fichier n'est pas une sauvegarde ShadowHerds.";
    if (!pkg.data || typeof pkg.data !== "object")
      return "Sauvegarde sans données exploitables.";
    return null; // ok
  },

  /* ---- Import : depuis un fichier local ---- */
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("Aucun fichier."));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const pkg = JSON.parse(reader.result);
          resolve(pkg);
        } catch {
          reject(new Error("Le fichier n'est pas un JSON valide."));
        }
      };
      reader.onerror = () =>
        reject(new Error("Lecture du fichier impossible."));
      reader.readAsText(file);
    });
  },

  /* ---- Import : depuis une URL (NAS, http(s)) ---- */
  async importFromUrl(url) {
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new Error("URL invalide (doit commencer par http:// ou https://).");
    }
    let resp;
    try {
      resp = await fetch(url, { mode: "cors", cache: "no-store" });
    } catch (e) {
      // Souvent un blocage CORS : le serveur (NAS) doit autoriser l'origine.
      throw new Error(
        "Récupération impossible. Vérifiez l'URL et que le serveur autorise l'accès distant (CORS).",
      );
    }
    if (!resp.ok) {
      throw new Error(`Le serveur a répondu ${resp.status}.`);
    }
    let pkg;
    try {
      pkg = await resp.json();
    } catch {
      throw new Error("La réponse n'est pas un JSON valide.");
    }
    return pkg;
  },

  /* ---- Application d'un paquet validé ----
     mode 'replace' : écrase intégralement les données existantes
     mode 'merge'   : ajoute les PNJ/contacts absents, fusionne les groupes
  ---- */
  apply(pkg, mode = "merge") {
    const err = this.validate(pkg);
    if (err) {
      toast(err);
      return false;
    }
    const data = pkg.data;

    for (const ed of this.EDITIONS) {
      const incoming = data[ed];
      if (!incoming) continue;

      if (mode === "replace") {
        for (const key of this.KEYS) {
          if (incoming[key] !== undefined) {
            this._writeRaw(ed, key, incoming[key]);
          }
        }
      } else {
        this._mergeEdition(ed, incoming);
      }
    }

    // Recharger les modules en mémoire pour l'édition courante
    this._reloadActive();
    const s = this.stats(pkg);
    toast(
      `Import ${mode === "replace" ? "(remplacement)" : "(fusion)"} : ${s.pnj} PNJ, ${s.contacts} contacts.`,
    );
    return true;
  },

  _writeRaw(edition, key, value) {
    try {
      localStorage.setItem(this._rawKey(edition, key), JSON.stringify(value));
    } catch {
      /* quota ? noop */
    }
  },

  _readRaw(edition, key, fallback) {
    try {
      const raw = localStorage.getItem(this._rawKey(edition, key));
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  /** Fusion : ajoute les éléments dont l'id est absent, fusionne les groupes. */
  _mergeEdition(edition, incoming) {
    // PNJ et contacts : fusion par id
    for (const listKey of ["shadows_all", "contacts_all"]) {
      if (!Array.isArray(incoming[listKey])) continue;
      const current = this._readRaw(edition, listKey, []);
      const byId = new Set(current.map((x) => x && x.id));
      for (const item of incoming[listKey]) {
        if (item && !byId.has(item.id)) {
          current.push(item);
          byId.add(item.id);
        }
      }
      this._writeRaw(edition, listKey, current);
    }

    // Groupes : fusion par clé ; les membres (tableaux d'ids) sont unifiés
    for (const groupKey of ["shadows_groups", "contacts_groups"]) {
      if (!incoming[groupKey] || typeof incoming[groupKey] !== "object")
        continue;
      const current = this._readRaw(edition, groupKey, {});
      for (const [gname, members] of Object.entries(incoming[groupKey])) {
        if (!current[gname]) {
          current[gname] = Array.isArray(members) ? [...members] : members;
        } else if (Array.isArray(current[gname]) && Array.isArray(members)) {
          const set = new Set(current[gname]);
          members.forEach((m) => set.add(m));
          current[gname] = [...set];
        }
      }
      this._writeRaw(edition, groupKey, current);
    }
  },

  /** Recharge Shadows et Contacts en mémoire pour refléter l'import. */
  _reloadActive() {
    if (typeof Shadows !== "undefined" && Shadows.load) {
      Shadows.load();
      if (Shadows.render) Shadows.render();
    }
    if (typeof ContactsBook !== "undefined" && ContactsBook.load) {
      ContactsBook.load();
      if (ContactsBook.render) ContactsBook.render();
    }
  },

  /* ========================================================
     UI — petite boîte de dialogue d'import
     ======================================================== */
  openImportDialog() {
    this._ensureDialog();
    const d = document.getElementById("backup-dialog");
    d.removeAttribute("hidden");
    void d.offsetWidth;
    d.classList.add("show");
    // reset état
    document.getElementById("backup-url").value = "";
    this._pending = null;
    this._setStage("choose");
  },

  _closeDialog() {
    const d = document.getElementById("backup-dialog");
    if (!d) return;
    d.classList.remove("show");
    clearTimeout(d._t);
    d._t = setTimeout(() => d.setAttribute("hidden", ""), 200);
  },

  _ensureDialog() {
    if (document.getElementById("backup-dialog")) return;
    const d = document.createElement("div");
    d.id = "backup-dialog";
    d.className = "backup-overlay";
    d.setAttribute("hidden", "");
    d.innerHTML = `
      <div class="backup-panel" role="dialog" aria-label="Importer une sauvegarde">
        <div class="backup-head">
          <span class="backup-title">Importer une sauvegarde</span>
          <button class="backup-close" id="backup-close" aria-label="Fermer">✕</button>
        </div>

        <div class="backup-stage" data-stage="choose">
          <p class="backup-hint">Depuis un fichier local, ou une URL (NAS, serveur).</p>
          <button class="btn-primary backup-full" id="backup-pick-file">Choisir un fichier…</button>
          <input type="file" id="backup-file-input" accept=".json,application/json" hidden>
          <div class="backup-or">ou</div>
          <div class="backup-url-row">
            <input type="text" id="backup-url" placeholder="https://mon-nas.local/pnj.json">
            <button class="btn-secondary" id="backup-fetch-url">Charger</button>
          </div>
        </div>

        <div class="backup-stage" data-stage="confirm" hidden>
          <p class="backup-summary" id="backup-summary"></p>
          <p class="backup-hint">Comment intégrer ces données ?</p>
          <div class="backup-actions">
            <button class="btn-secondary" id="backup-merge">Fusionner</button>
            <button class="btn-danger-soft" id="backup-replace">Remplacer tout</button>
          </div>
          <button class="backup-back" id="backup-back">‹ Retour</button>
        </div>

        <div class="backup-stage" data-stage="loading" hidden>
          <p class="backup-hint">Chargement…</p>
        </div>
      </div>`;
    document.body.appendChild(d);

    d.addEventListener("click", (e) => {
      if (e.target === d) this._closeDialog();
    });
    document
      .getElementById("backup-close")
      .addEventListener("click", () => this._closeDialog());

    // Fichier local
    const fileInput = document.getElementById("backup-file-input");
    document
      .getElementById("backup-pick-file")
      .addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      this._setStage("loading");
      try {
        const pkg = await this.importFromFile(file);
        this._presentConfirm(pkg);
      } catch (e) {
        toast(e.message || "Import impossible.");
        this._setStage("choose");
      }
      fileInput.value = "";
    });

    // URL distante
    document
      .getElementById("backup-fetch-url")
      .addEventListener("click", async () => {
        const url = document.getElementById("backup-url").value.trim();
        this._setStage("loading");
        try {
          const pkg = await this.importFromUrl(url);
          this._presentConfirm(pkg);
        } catch (e) {
          toast(e.message || "Récupération impossible.");
          this._setStage("choose");
        }
      });

    // Confirmation
    document
      .getElementById("backup-merge")
      .addEventListener("click", () => this._confirm("merge"));
    document
      .getElementById("backup-replace")
      .addEventListener("click", () => this._confirm("replace"));
    document
      .getElementById("backup-back")
      .addEventListener("click", () => this._setStage("choose"));
  },

  _setStage(stage) {
    document.querySelectorAll("#backup-dialog .backup-stage").forEach((el) => {
      if (el.dataset.stage === stage) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
  },

  _presentConfirm(pkg) {
    const err = this.validate(pkg);
    if (err) {
      toast(err);
      this._setStage("choose");
      return;
    }
    this._pending = pkg;
    const s = this.stats(pkg);
    const parts = s.editions
      .map(
        (e) =>
          `${e.edition.toUpperCase()} : ${e.pnj} PNJ${e.contacts ? `, ${e.contacts} contacts` : ""}`,
      )
      .join(" · ");
    document.getElementById("backup-summary").innerHTML =
      `<strong>${s.pnj}</strong> PNJ et <strong>${s.contacts}</strong> contacts trouvés.` +
      (parts ? `<br><span class="backup-detail">${parts}</span>` : "");
    this._setStage("confirm");
  },

  _confirm(mode) {
    if (!this._pending) return;
    if (mode === "replace") {
      const ok = window.confirm(
        "Remplacer écrasera définitivement vos PNJ et contacts actuels. Continuer ?",
      );
      if (!ok) return;
    }
    this.apply(this._pending, mode);
    this._pending = null;
    this._closeDialog();
  },
};
