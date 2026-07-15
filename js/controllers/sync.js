"use strict";

/* ============================================================
   SYNC — sauvegarde synchronisée sur un stockage de l'utilisateur

   Pas de serveur ShadowHerds : l'application lit/écrit un unique
   paquet Backup.build() sur le stockage distant choisi par
   l'utilisateur (Gist secret ou WebDAV/NAS). Config globale, par
   appareil. Réutilise Backup pour construire / appliquer / fusionner.

   - init()        : branche l'écoute des écritures (Storage.subscribe)
   - pullOnLoad()  : récupère le distant au chargement (silencieux)
   - schedulePush(): pousse après un débounce (auto, sur modification)
   - syncNow()     : pull + push manuels

   Contrat provider : isConfigured(cfg), pull(cfg), push(cfg, pkg, rev).
   La « révision » est une chaîne opaque (Gist : SHA d'historique ;
   WebDAV : ETag) servant à détecter les conflits sans fusion aveugle.
   ============================================================ */

class SyncConflict extends Error {
  constructor(remotePkg, remoteRevision) {
    super("Conflit de synchronisation");
    this.name = "SyncConflict";
    this.remotePkg = remotePkg;
    this.remoteRevision = remoteRevision;
  }
}

const Sync = {
  _CFG_KEY: "sync",
  PUSH_DEBOUNCE_MS: 15000,
  POLL_INTERVAL_MS: 45000, // récupération périodique quand l'app est visible
  GIST_FILE: "shadowherds-backup.json",

  _defaults: {
    provider: "none", // 'none' | 'gist' | 'webdav'
    auto: true,
    gist: { token: "", gistId: "", deviceLabel: "" },
    webdav: { url: "", user: "", pass: "" },
    lastRevision: null,
    lastHash: null,
    lastAt: null,
    lastExportAt: null,
  },

  _state: "idle", // idle | pulling | pushing | conflict | error
  _applying: false, // garde anti-boucle pendant l'application d'un distant
  _inited: false,
  _pushTimer: null,
  _pollTimer: null,
  _pullInFlight: false, // garde de réentrance (focus + visibilitychange + poll)

  /* ---------- Config (globale, par appareil) ---------- */
  cfg() {
    const raw = Storage.getGlobal(this._CFG_KEY, {}) || {};
    return {
      ...this._defaults,
      ...raw,
      gist: { ...this._defaults.gist, ...(raw.gist || {}) },
      webdav: { ...this._defaults.webdav, ...(raw.webdav || {}) },
    };
  },
  _saveCfg(patch) {
    const next = { ...this.cfg(), ...patch };
    Storage.setGlobal(this._CFG_KEY, next);
    return next;
  },
  provider() {
    return this.providers[this.cfg().provider] || null;
  },
  status() {
    const c = this.cfg();
    return { provider: c.provider, auto: c.auto, lastAt: c.lastAt, state: this._state };
  },
  /** Étiquette de cet appareil pour la description du gist (Modèle B) :
      celle saisie par l'utilisateur, sinon devinée depuis le navigateur/OS.
      Le nom réel de la machine n'est pas accessible au navigateur. */
  _deviceLabel() {
    const set = (this.cfg().gist.deviceLabel || "").trim();
    if (set) return set;
    const ua = navigator.userAgent || "";
    let br = "Navigateur";
    if (/Firefox\//.test(ua)) br = "Firefox";
    else if (/Edg\//.test(ua)) br = "Edge";
    else if (/OPR\//.test(ua)) br = "Opera";
    else if (/Chrome\//.test(ua)) br = "Chrome";
    else if (/Safari\//.test(ua)) br = "Safari";
    let os = "";
    if (/Windows/.test(ua)) os = "Windows";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
    else if (/Mac OS X/.test(ua)) os = "Mac";
    else if (/Linux/.test(ua)) os = "Linux";
    return os ? `${br}/${os}` : br;
  },
  /** Nombre de jours entiers depuis la dernière sauvegarde (export ou
      synchro, même horodatage `lastAt`) ; null si jamais sauvegardé.
      Partagé par le rappel de Paramètres et le bandeau du Hub (F3). */
  daysSinceSave() {
    const lastAt = this.cfg().lastAt;
    if (!lastAt) return null;
    return Math.floor((Date.now() - new Date(lastAt).getTime()) / 86400000);
  },
  /** Nombre de jours entiers depuis la dernière ARCHIVE téléchargée
      (export fichier uniquement, `lastExportAt`, distinct de `lastAt` qui
      inclut aussi la synchro) ; null si jamais archivé. Un rappel de sync
      cloud ne doit pas faire taire le besoin d'archive locale (#47). */
  daysSinceExport() {
    const lastExportAt = this.cfg().lastExportAt;
    if (!lastExportAt) return null;
    return Math.floor((Date.now() - new Date(lastExportAt).getTime()) / 86400000);
  },

  /* ---------- Cycle de vie ---------- */
  init() {
    if (this._inited) return;
    this._inited = true;
    Storage.subscribe((k) => this._onStorageChange(k));
    this._startAutoPull();
  },

  /* Récupère les changements faits sur un autre appareil sans recharger la
     page : au retour sur l'app (onglet redevenu visible / fenêtre refocalisée)
     et par sondage léger tant que l'app est visible. Le push, lui, reste
     déclenché par les modifications locales (schedulePush). */
  _startAutoPull() {
    const maybePull = () => {
      if (document.visibilityState !== "visible") return;
      if (this.cfg().provider === "none") return;
      if (this._pullInFlight) return;
      this.pullOnLoad();
    };
    document.addEventListener("visibilitychange", maybePull);
    window.addEventListener("focus", maybePull);
    clearInterval(this._pollTimer);
    this._pollTimer = setInterval(maybePull, this.POLL_INTERVAL_MS);
  },

  async pullOnLoad() {
    const prov = this.provider();
    const c = this.cfg();
    if (!prov || !prov.isConfigured(c)) return;
    if (this._pullInFlight) return;
    this._pullInFlight = true;
    this._setState("pulling");
    try {
      const res = await prov.pull(c);
      if (res.cfgPatch) this._saveCfg(res.cfgPatch); // mémorise un gist découvert
      if (res.empty) {
        this._setState("idle");
        // Premier appareil configuré : envoi initial si le local n'est pas vide.
        // Attendu (pas « feu et oublie ») pour ne pas télescoper un push suivant.
        if (this._hash(Backup.build()) !== this._hash(this._emptyPkg()))
          await this._doPush(true);
        return;
      }
      if (res.revision === c.lastRevision) {
        this._setState("idle");
        return;
      }
      if (this._hash(Backup.build()) === c.lastHash) {
        // Local inchangé depuis la dernière synchro → avance rapide. On avance
        // la révision AVANT d'appliquer/rendre : un incident de rendu ne doit
        // pas empêcher le suivi de révision, sinon on re-récupère en boucle.
        this._saveCfg({
          lastRevision: res.revision,
          lastHash: this._hash(res.pkg),
          lastAt: new Date().toISOString(),
        });
        await this._applyRemote(res.pkg);
        this._setState("idle");
        this._refreshSettings();
        toast("Fiches synchronisées depuis votre sauvegarde en ligne.");
      } else {
        // Les deux côtés ont changé → conflit.
        this._setState("conflict");
        this._resolveConflict(res.pkg, res.revision);
      }
    } catch (e) {
      this._setState("error");
      Debug.warn("sync", "pull au chargement échoué", { error: e });
    } finally {
      this._pullInFlight = false;
    }
  },

  /* ---------- Écoute des écritures ---------- */
  _onStorageChange(fullKey) {
    if (this._applying) return;
    const c = this.cfg();
    if (c.provider === "none" || !c.auto) return;
    if (!this._isSyncedKey(fullKey)) return;
    this.schedulePush();
  },
  _isSyncedKey(fullKey) {
    return Backup.KEYS.some((k) => fullKey.endsWith(k));
  },
  schedulePush() {
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => {
      this._doPush().catch(() => {});
    }, this.PUSH_DEBOUNCE_MS);
  },

  async syncNow() {
    const prov = this.provider();
    const c = this.cfg();
    if (!prov || !prov.isConfigured(c)) {
      toast("Configurez d'abord un stockage de synchronisation.", "warning");
      return;
    }
    await this.pullOnLoad(); // récupère et applique/résout (+ push initial si vide)
    await this._doPush(); // pousse l'état courant seulement s'il reste du neuf
    if (this._state === "idle") toast("Synchronisation effectuée.");
  },

  /* ---------- Push ---------- */
  async _doPush(force = false) {
    const prov = this.provider();
    const c = this.cfg();
    if (!prov || !prov.isConfigured(c)) return;
    const pkg = Backup.build();
    const hash = this._hash(pkg);
    if (!force && hash === c.lastHash) return; // rien de neuf à envoyer
    this._setState("pushing");
    try {
      const { revision, cfgPatch } = await prov.push(c, pkg, c.lastRevision);
      this._saveCfg({
        lastRevision: revision,
        lastHash: hash,
        lastAt: new Date().toISOString(),
        ...(cfgPatch || {}),
      });
      this._setState("idle");
      this._refreshSettings();
    } catch (e) {
      if (e instanceof SyncConflict) {
        this._setState("conflict");
        this._resolveConflict(e.remotePkg, e.remoteRevision);
      } else {
        this._setState("error");
        this._refreshSettings();
        toast("Synchro impossible : " + (e.message || "erreur réseau"), "warning");
      }
    }
  },

  /* ---------- Application d'un paquet distant ---------- */
  async _applyRemote(pkg) {
    this._applying = true;
    try {
      Backup.apply(pkg, "replace", { silent: true });
    } catch (e) {
      // Les données sont écrites avant le rendu dans Backup.apply ; un incident
      // de rendu ne doit pas faire échouer la synchro ni bloquer la révision.
      Debug.warn("sync", "rendu post-application échoué", { error: e });
    } finally {
      this._applying = false;
    }
  },

  /* ---------- Résolution de conflit (Lot 1 : binaire, sans perte) ----------
     « Fusionner » réunit les deux états (résurrection assumée, aucune perte).
     « Annuler » conserve la version locale et remplace le distant. Le mode
     à trois choix soigné est prévu pour un lot ultérieur. */
  async _resolveConflict(remotePkg, remoteRevision) {
    const merge = await Dialog.confirm({
      title: "Synchronisation — versions divergentes",
      message:
        "Vos fiches ont changé sur cet appareil et dans votre sauvegarde en ligne depuis la dernière synchro. " +
        "« Fusionner » réunit les deux sans rien perdre. « Annuler » garde la version de cet appareil et remplace celle en ligne.",
      confirmLabel: "Fusionner",
    });
    // Aligner la révision de base sur le distant pour que le push qui suit ne
    // rebute pas sur le même conflit.
    this._saveCfg({ lastRevision: remoteRevision });
    if (merge) {
      this._applying = true;
      try {
        Backup.apply(remotePkg, "merge", { silent: true });
      } finally {
        this._applying = false;
      }
    }
    await this._doPush(true);
    if (this._state === "idle")
      toast(merge ? "Versions fusionnées et synchronisées." : "Votre version a été envoyée en ligne.");
  },

  /* ---------- Utilitaires ---------- */
  _setState(s) {
    this._state = s;
  },
  /** Enregistre une sauvegarde locale réussie (export fichier) : alimente le
      même horodatage `lastAt` que la synchro, pour le rappel de sauvegarde. */
  noteLocalSave() {
    this._saveCfg({ lastAt: new Date().toISOString() });
    this._refreshSettings();
  },
  /** Enregistre une ARCHIVE téléchargée réussie (export fichier uniquement,
      jamais la synchro cloud) : `lastExportAt` distinct de `lastAt`, pour
      le rappel d'archive locale (#47) — le rituel NAS/drive ne doit pas
      être effacé par une simple synchro. */
  noteLocalExport() {
    this._saveCfg({ lastExportAt: new Date().toISOString() });
    this._refreshSettings();
  },
  _refreshSettings() {
    if (typeof Settings !== "undefined" && Settings.renderSyncStatus) Settings.renderSyncStatus();
    // Le bandeau du Hub (F3) partage le même horodatage lastAt : le
    // rafraîchir ici évite qu'il reste affiché après une sauvegarde/synchro.
    if (typeof Hub !== "undefined" && Hub._renderSaveReminder) Hub._renderSaveReminder();
  },
  _emptyPkg() {
    return { format: Backup.FORMAT, version: Backup.VERSION, data: {} };
  },

  /** Hash court déterministe (cyrb53) du contenu. Backup.build() est ordonné
      (EDITIONS × KEYS fixes), donc le hash est stable d'un appareil à l'autre. */
  _hash(pkg) {
    const str = JSON.stringify((pkg && pkg.data) || {});
    let h1 = 0xdeadbeef,
      h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  },

  /* ============================================================
     PROVIDERS
     ============================================================ */
  providers: {
    /* ---- GitHub Gist secret ---- */
    gist: {
      id: "gist",
      label: "GitHub Gist",
      _api: "https://api.github.com/gists",

      isConfigured(c) {
        return !!(c.gist && c.gist.token);
      },
      _headers(c) {
        return {
          Authorization: "token " + c.gist.token,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        };
      },
      /** Résout l'identifiant du gist de sauvegarde : celui configuré, sinon
          un gist existant de l'utilisateur contenant déjà notre fichier. Permet
          à un 2e appareil de retrouver le gist avec le seul token, sans recopier
          d'identifiant. `cfgPatch` mémorise la découverte pour les fois suivantes. */
      async _ensureGistId(c) {
        if (c.gist.gistId) return { gistId: c.gist.gistId, cfgPatch: null };
        const resp = await fetch(this._api + "?per_page=100", {
          headers: this._headers(c),
          cache: "no-store",
        });
        if (resp.status === 401) throw new Error("Token GitHub refusé (401).");
        if (!resp.ok) return { gistId: null, cfgPatch: null };
        const list = await resp.json();
        const matches = Array.isArray(list)
          ? list.filter((g) => g.files && g.files[Sync.GIST_FILE])
          : [];
        if (!matches.length) return { gistId: null, cfgPatch: null };
        // Choix déterministe (le plus ancien) : si plusieurs sauvegardes
        // coexistent, tous les appareils convergent vers la même plutôt que
        // d'en choisir une au hasard.
        matches.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
        const hit = matches[0];
        return { gistId: hit.id, cfgPatch: { gist: { ...c.gist, gistId: hit.id } } };
      },
      async _getById(c, gistId) {
        const resp = await fetch(`${this._api}/${gistId}`, {
          headers: this._headers(c),
          cache: "no-store",
        });
        if (resp.status === 404) return null;
        if (resp.status === 401) throw new Error("Token GitHub refusé (401).");
        if (!resp.ok) throw new Error("GitHub a répondu " + resp.status + ".");
        return resp.json();
      },
      async _readPkg(gist) {
        const file = gist && gist.files && gist.files[Sync.GIST_FILE];
        if (!file) return null;
        let content = file.content;
        if (file.truncated) {
          const r = await fetch(file.raw_url, { cache: "no-store" });
          content = await r.text();
        }
        try {
          return JSON.parse(content);
        } catch {
          return null;
        }
      },
      _revOf(gist) {
        if (!gist) return null;
        if (gist.history && gist.history[0]) return gist.history[0].version;
        return gist.updated_at || null;
      },
      /** Description du gist (Modèle B) : trace le dernier appareil ayant
          synchronisé, sans multiplier les gists. Réécrite à chaque envoi. */
      _description() {
        return (
          "ShadowHerds — dernière synchro : " +
          Sync._deviceLabel() +
          ", " +
          new Date().toLocaleString("fr-FR")
        );
      },
      async pull(c) {
        const { gistId, cfgPatch } = await this._ensureGistId(c);
        if (!gistId) return { empty: true, cfgPatch };
        const gist = await this._getById(c, gistId);
        if (!gist) return { empty: true, cfgPatch };
        const pkg = await this._readPkg(gist);
        if (!pkg) return { empty: true, cfgPatch };
        return { pkg, revision: this._revOf(gist), cfgPatch };
      },
      async push(c, pkg, expectedRevision) {
        const files = { [Sync.GIST_FILE]: { content: JSON.stringify(pkg, null, 2) } };
        const { gistId, cfgPatch } = await this._ensureGistId(c);

        if (!gistId) {
          // Aucun gist configuré ni découvert : on en crée un (secret).
          const resp = await fetch(this._api, {
            method: "POST",
            headers: this._headers(c),
            body: JSON.stringify({
              description: this._description(),
              public: false,
              files,
            }),
          });
          if (resp.status === 401) throw new Error("Token GitHub refusé (401).");
          if (!resp.ok) throw new Error("Création du gist refusée (" + resp.status + ").");
          const gist = await resp.json();
          return {
            revision: this._revOf(gist),
            cfgPatch: { gist: { ...c.gist, gistId: gist.id } },
          };
        }

        // Pré-vérification de conflit : le distant a-t-il bougé sous nos pieds ?
        if (expectedRevision) {
          const current = await this._getById(c, gistId);
          if (current && this._revOf(current) !== expectedRevision) {
            throw new SyncConflict(await this._readPkg(current), this._revOf(current));
          }
        }

        const resp = await fetch(`${this._api}/${gistId}`, {
          method: "PATCH",
          headers: this._headers(c),
          body: JSON.stringify({ files, description: this._description() }),
        });
        if (resp.status === 404)
          throw new Error("Gist introuvable — videz l'identifiant pour le recréer.");
        if (resp.status === 401) throw new Error("Token GitHub refusé (401).");
        if (resp.status === 409) {
          // Le distant a changé entre-temps (autre appareil) : conflit à résoudre.
          const current = await this._getById(c, gistId);
          throw new SyncConflict(
            current ? await this._readPkg(current) : null,
            current ? this._revOf(current) : null,
          );
        }
        if (!resp.ok) throw new Error("Envoi refusé (" + resp.status + ").");
        const gist = await resp.json();
        return { revision: this._revOf(gist), cfgPatch };
      },
    },

    /* ---- WebDAV / NAS ---- */
    webdav: {
      id: "webdav",
      label: "WebDAV / NAS",

      isConfigured(c) {
        return !!(c.webdav && c.webdav.url);
      },
      _headers(c, extra) {
        const h = { ...(extra || {}) };
        if (c.webdav.user)
          h.Authorization = "Basic " + btoa(c.webdav.user + ":" + c.webdav.pass);
        return h;
      },
      _revFrom(resp) {
        return resp.headers.get("ETag") || resp.headers.get("Last-Modified") || null;
      },
      async pull(c) {
        let resp;
        try {
          resp = await fetch(c.webdav.url, { headers: this._headers(c), cache: "no-store" });
        } catch {
          throw new Error("Serveur injoignable (URL ou blocage CORS ?).");
        }
        if (resp.status === 404) return { empty: true };
        if (!resp.ok) throw new Error("Serveur : " + resp.status + ".");
        let pkg;
        try {
          pkg = await resp.json();
        } catch {
          return { empty: true };
        }
        return { pkg, revision: this._revFrom(resp) };
      },
      async push(c, pkg, expectedRevision) {
        const headers = this._headers(c, { "Content-Type": "application/json" });
        if (expectedRevision) headers["If-Match"] = expectedRevision;
        else headers["If-None-Match"] = "*";

        let resp;
        try {
          resp = await fetch(c.webdav.url, {
            method: "PUT",
            headers,
            body: JSON.stringify(pkg, null, 2),
          });
        } catch {
          throw new Error("Envoi impossible (URL ou blocage CORS ?).");
        }

        if (resp.status === 412 || resp.status === 409) {
          // Conflit : relire le distant pour le proposer à la fusion.
          let remotePkg = null,
            rev = null;
          try {
            const r = await fetch(c.webdav.url, { headers: this._headers(c), cache: "no-store" });
            rev = this._revFrom(r);
            remotePkg = await r.json();
          } catch {
            /* distant illisible : conflit sans paquet, l'appelant gardera le local */
          }
          throw new SyncConflict(remotePkg, rev);
        }
        if (!resp.ok) throw new Error("Envoi refusé (" + resp.status + ").");

        // Beaucoup de serveurs n'exposent pas l'ETag sur PUT : relire au besoin.
        let revision = resp.headers.get("ETag");
        if (!revision) {
          try {
            const r = await fetch(c.webdav.url, { headers: this._headers(c), cache: "no-store" });
            revision = this._revFrom(r);
          } catch {
            /* on garde revision null : le prochain pull la recalera */
          }
        }
        return { revision };
      },
    },
  },
};
