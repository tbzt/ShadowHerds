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

   Contrat de l'enveloppe (format/version/schemaVersion/data), clés
   incluses et règle d'évolution figée : ARCHITECTURE.md § 6
   « Le paquet exporté (Backup) — contrat gelé ». `encounter_current` (la
   scène vivante) est incluse pour couvrir la reprise d'une scène en cours
   sur un autre appareil (ordinateur → téléphone) — voir la règle de
   fusion dédiée sur `_mergeEdition`, distincte des autres clés.
   ============================================================ */
import { Dialog } from "../widgets/kit/dialog.js";
import { Storage } from "../core/storage.js";
import { Sync } from "./sync.js";

export const Backup = {
  FORMAT: "shadowherds-backup",
  VERSION: 1,
  EDITIONS: ["sr5", "sr6", "anarchy2", "anarchy1"],
  KEYS: [
    "shadows_all",
    "shadows_groups",
    "characters_all",
    "characters_groups",
    "contacts_all",
    "contacts_groups",
    "servers_all",
    "servers_groups",
    "entity_relations", // VIS-15 B0 : registre d'arêtes (liens contact…) par édition
    "dossiers", // arbre de dossiers (structure {id,name,parentId}) — CH sync
    "encounter_by_dossier", // R1 (Ranger la run) : rencontres rangées par dossier
    "notebooks", // R2 (Ranger la run) : carnets de notes par dossier
    "gen_runs", // runs générées, rattachées aux dossiers (RunGen)
    "encounter_current", // la scène VIVANTE (round/init/combattants) — reprise sur un autre appareil
  ],

  /* ---- Construction du paquet exportable ---- */
  build() {
    const data = {};
    for (const ed of this.EDITIONS) {
      const bucket = {};
      for (const key of this.KEYS) {
        const val = Storage.getFromEdition(ed, key, null);
        if (val !== null) bucket[key] = val;
      }
      if (Object.keys(bucket).length) data[ed] = bucket;
    }
    return {
      format: this.FORMAT,
      version: this.VERSION,
      schemaVersion: Storage.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      app: "ShadowHerds",
      data,
    };
  },

  /** Statistiques lisibles d'un paquet (pour confirmation). Lit toujours le
      paquet migré (`_migrate`) : un vieux paquet non renommé (édition
      "anarchy") doit compter dans les bons totaux avant même d'être importé. */
  stats(pkg) {
    const out = { pnj: 0, contacts: 0, servers: 0, editions: [] };
    const data = this._migrate(pkg);
    for (const ed of this.EDITIONS) {
      const b = data[ed];
      if (!b) continue;
      const pnj = (b.shadows_all || []).length;
      const contacts = (b.contacts_all || []).length;
      const servers = (b.servers_all || []).length;
      if (pnj || contacts || servers) {
        out.editions.push({ edition: ed, pnj, contacts, servers });
        out.pnj += pnj;
        out.contacts += contacts;
        out.servers += servers;
      }
    }
    return out;
  },

  /* ---- Export : téléchargement d'un .json ---- */
  export() {
    const pkg = this.build();
    const s = this.stats(pkg);
    if (s.pnj === 0 && s.contacts === 0 && s.servers === 0) {
      toast("Rien à exporter pour le moment.", "info");
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
    toast(`Export : ${s.pnj} PNJ, ${s.contacts} contacts, ${s.servers} serveurs.`);
    // Alimente le rappel de sauvegarde : même horodatage que la synchro.
    if (typeof Sync !== "undefined" && Sync.noteLocalSave) Sync.noteLocalSave();
    // Alimente aussi le rappel d'archive téléchargée (#47), distinct : un
    // sync cloud ne doit pas faire taire le besoin d'archive locale.
    if (typeof Sync !== "undefined" && Sync.noteLocalExport) Sync.noteLocalExport();
  },

  /* ---- Validation d'un paquet importé ---- */
  validate(pkg) {
    if (!pkg || typeof pkg !== "object") return "Fichier illisible.";
    if (pkg.format && pkg.format !== this.FORMAT)
      return "Ce fichier n'est pas une sauvegarde ShadowHerds.";
    if (!pkg.data || typeof pkg.data !== "object")
      return "Sauvegarde sans données exploitables.";
    // Un paquet sans schemaVersion est antérieur à ce champ (donc plus ancien
    // que le schéma courant) : `undefined > SCHEMA_VERSION` vaut toujours
    // faux, il n'est jamais refusé ici — seulement migré par `_migrate`.
    if (pkg.schemaVersion > Storage.SCHEMA_VERSION)
      return "Cette sauvegarde vient d'une version plus récente de ShadowHerds. Mettez à jour l'application avant de l'importer.";
    return null; // ok
  },

  /** Aligne le `data` d'un paquet importé sur le schéma courant. Un paquet
      déjà à jour (export du jour) traverse cette fonction sans modification.
      Ne touche jamais `localStorage` : ne transforme que l'objet en mémoire,
      avant `apply`/`stats`. Mise à jour au fil de l'eau, en miroir de
      `Storage._MIGRATIONS` : seules les migrations qui affectent la FORME
      d'un paquet Backup (les clés listées dans `KEYS`) ont besoin d'une
      contrepartie ici — appelant garanti d'avoir déjà passé `validate`. */
  _migrate(pkg) {
    const from = pkg.schemaVersion || 0;
    let data = pkg.data;
    if (from < 1) data = this._migrateAnarchyBucket(data);
    return data;
  },

  /** Contrepartie, pour un paquet importé, de la migration v:1 de Storage
      (édition "anarchy" renommée "anarchy2"). Un éventuel bucket "anarchy2"
      déjà présent dans le paquet garde la priorité sur les clés migrées. */
  _migrateAnarchyBucket(data) {
    if (!data.anarchy) return data;
    const { anarchy, ...rest } = data;
    const renamed = JSON.parse(
      JSON.stringify(anarchy).split('"edition":"anarchy"').join('"edition":"anarchy2"')
    );
    rest.anarchy2 = { ...renamed, ...(rest.anarchy2 || {}) };
    return rest;
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
      reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
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
  apply(pkg, mode = "merge", { silent = false } = {}) {
    const err = this.validate(pkg);
    if (err) {
      if (!silent) toast(err);
      return false;
    }
    const data = this._migrate(pkg);

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
    if (!silent) {
      const s = this.stats(pkg);
      toast(
        `Import ${mode === "replace" ? "(remplacement)" : "(fusion)"} : ${s.pnj} PNJ, ${s.contacts} contacts, ${s.servers} serveurs.`,
      );
    }
    return true;
  },

  _writeRaw(edition, key, value) {
    Storage.setForEdition(edition, key, value);
  },

  _readRaw(edition, key, fallback) {
    return Storage.getFromEdition(edition, key, fallback);
  },

  /** Fusion : ajoute les éléments dont l'id est absent, fusionne les
      groupes, complète les cartes qui n'existent pas encore localement —
      ne retire ni n'écrase jamais rien de local (le mode destructeur est
      "replace", pas "merge"). Couvre les 11 clés de `KEYS` en 4 formes :
      listes par id, groupes (unions), cartes id→valeur (`encounter_by_dossier`,
      `notebooks.entries`), et l'état singleton `encounter_current`
      (règle dédiée : voir plus bas, pas une simple carte). */
  _mergeEdition(edition, incoming) {
    // TODO: reads internal structures {all, groups} of Shadows, ContactsBook, Servers
    // This tight coupling should be addressed in sprint 3 (linked entities roadmap)
    // PNJ, contacts, personnages, dossiers, runs : fusion par id (chaque élément a un id)
    for (const listKey of ["shadows_all", "contacts_all", "servers_all", "characters_all", "dossiers", "gen_runs", "entity_relations"]) {
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

    // Groupes : fusion par clé ; les membres (tableaux d'ids) sont unifiés.
    // VIS-16 1-bis : l'appartenance est keyée par ID de dossier. Un backup d'un
    // appareil NON migré arrive keyé par NOM → on re-key chaque clé-nom entrante
    // vers l'id du nœud homonyme (dossiers déjà fusionnés ci-dessus). Une clé
    // déjà = id de nœud, ou sans nœud (orphelin), est laissée telle quelle :
    // aucune appartenance perdue au merge cross-device.
    const mergedDossiers = this._readRaw(edition, "dossiers", []);
    const dossierIds = new Set();
    const dossierNameToId = {};
    for (const n of Array.isArray(mergedDossiers) ? mergedDossiers : [])
      if (n && n.id) { dossierIds.add(n.id); if (n.name != null) dossierNameToId[n.name] = n.id; }
    const resolveGroupKey = (k) =>
      dossierIds.has(k) ? k : (dossierNameToId[k] || k);
    for (const groupKey of ["shadows_groups", "contacts_groups", "servers_groups", "characters_groups"]) {
      if (!incoming[groupKey] || typeof incoming[groupKey] !== "object") continue;
      const current = this._readRaw(edition, groupKey, {});
      for (const [gname, members] of Object.entries(incoming[groupKey])) {
        const key = resolveGroupKey(gname);
        if (!current[key]) {
          current[key] = Array.isArray(members) ? [...members] : members;
        } else if (Array.isArray(current[key]) && Array.isArray(members)) {
          const set = new Set(current[key]);
          members.forEach((m) => set.add(m));
          current[key] = [...set];
        }
      }
      this._writeRaw(edition, groupKey, current);
    }

    // Rencontres rangées par dossier : carte dossierId→scène, un dossier
    // absent localement est ajouté ; un dossier déjà rangé localement garde
    // SA version (même politique "additif" que les listes ci-dessus, pas de
    // fusion du contenu de la scène elle-même).
    if (incoming.encounter_by_dossier && typeof incoming.encounter_by_dossier === "object") {
      const current = this._readRaw(edition, "encounter_by_dossier", {});
      this._writeRaw(edition, "encounter_by_dossier", this._mergeMapAdditive(current, incoming.encounter_by_dossier));
    }

    // Carnets : même politique, appliquée à `entries` (le sous-objet réel,
    // `version` reste celle en place localement).
    if (incoming.notebooks && typeof incoming.notebooks.entries === "object") {
      const current = this._readRaw(edition, "notebooks", { version: 1, entries: {} });
      current.entries = this._mergeMapAdditive(current.entries || {}, incoming.notebooks.entries);
      this._writeRaw(edition, "notebooks", current);
    }

    // Scène vivante : ce n'est PAS une collection (un seul état par
    // édition), donc pas de fusion élément par élément possible. Reprise
    // ordinateur→téléphone : si le combat en cours est déjà entamé sur CET
    // appareil (des combattants y sont engagés), on ne l'écrase jamais en
    // fusion — seul "replace" le peut, en connaissance de cause. Un
    // appareil sans combat en cours (aucun combattant, y compris jamais
    // initialisé) accueille la scène importée telle quelle.
    if (incoming.encounter_current && typeof incoming.encounter_current === "object") {
      const current = this._readRaw(edition, "encounter_current", null);
      const localIsPristine = !current || !Array.isArray(current.combatants) || current.combatants.length === 0;
      if (localIsPristine) {
        this._writeRaw(edition, "encounter_current", incoming.encounter_current);
      }
    }
  },

  /** Carte id/clé→valeur : ajoute chaque clé absente de `current`, ne
      touche jamais une clé déjà présente (même politique additive que la
      fusion de listes par id — "local wins" sur un conflit). Utilisé pour
      les cartes gardées globalement en un seul niveau (dossierId→…). */
  _mergeMapAdditive(current, incoming) {
    const out = { ...current };
    for (const [key, value] of Object.entries(incoming)) {
      if (!(key in out)) out[key] = value;
    }
    return out;
  },

  /** Recharge les collections en mémoire pour refléter l'import/la synchro. */
  _reloadActive() {
    if (Shadows.load) {
      Shadows.load();
      if (Shadows.render) Shadows.render();
    }
    if (typeof Characters !== "undefined" && Characters.load) {
      Characters.load();
      if (Characters.render) Characters.render();
    }
    if (ContactsBook.load) {
      ContactsBook.load();
      if (ContactsBook.render) ContactsBook.render();
    }
    if (Servers.load) {
      Servers.load();
      if (Servers.render) Servers.render();
    }
    // Registre d'arêtes (liens contact…) : recharger la vérité fusionnée.
    if (typeof RelationsStore !== "undefined" && RelationsStore.load) RelationsStore.load();
    // Dossiers (arbre de dossiers) : recharger la structure + rafraîchir la barre.
    if (typeof Dossiers !== "undefined" && Dossiers.load) Dossiers.load();
    if (typeof DossierBar !== "undefined" && DossierBar.refresh) DossierBar.refresh();
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
    document.getElementById("backup-close").addEventListener("click", () =>
      this._closeDialog(),
    );

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
    document
      .querySelectorAll("#backup-dialog .backup-stage")
      .forEach((el) => {
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

  async _confirm(mode) {
    if (!this._pending) return;
    if (mode === "replace") {
      const ok = await Dialog.confirm({
        title: "Remplacer les données ?",
        message:
          "Remplacer écrasera définitivement vos PNJ et contacts actuels. Continuer ?",
        confirmLabel: "Remplacer",
        danger: true,
      });
      if (!ok) return;
    }
    this.apply(this._pending, mode);
    this._pending = null;
    this._closeDialog();
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Backup = Backup;
