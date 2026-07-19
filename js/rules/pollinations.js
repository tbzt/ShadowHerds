"use strict";

/* ============================================================
   POLLINATIONS — client de génération d'images IA (endpoint anonyme
   image.pollinations.ai). Leaf SANS dépendance sortante : il reçoit
   son prompt et son token en paramètres, ne lit ni Settings ni le
   DOM métier — l'appelant (Portrait, plan de lieu…) fournit tout et
   reçoit l'URL résolue par callback.

   Une SEULE file d'attente, partagée par tous les appelants :
   Pollinations en anonyme n'accepte qu'une requête par IP à la fois
   ("Queue full"), donc portraits ET plans de lieu s'y sérialisent.
   Un échec (surcharge du service) est retenté avant de déranger.
   ============================================================ */
export const Pollinations = {
  _queue: [],
  _processing: false,
  _MAX_ATTEMPTS: 3,
  _RETRY_DELAY_MS: 4000,

  /** URL de génération (endpoint anonyme, aucun secret — repo public). */
  url(prompt, { width = 512, height = 512 } = {}) {
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true`;
  },

  /** Met un prompt en file et appelle `onSuccess(urlOuDataUrl)` au succès.
      `token` (optionnel, lu par l'appelant dans Settings) → chemin fetch +
      Authorization renvoyant une data URL ; sinon chemin <img> anonyme.
      `btn` (optionnel) reçoit l'état de chargement. */
  generate({ prompt, width, height, token = null, btn = null, label = "Image", onSuccess }) {
    this._enqueue({ url: this.url(prompt, { width, height }), token, btn, label, onSuccess });
  },

  _enqueue(job) {
    const idle = !this._processing && this._queue.length === 0;
    this._queue.push(job);
    this._startLoading(job.btn, idle ? "Génération…" : `En file (${this._queue.length})…`);
    this._processQueue();
  },

  async _processQueue() {
    if (this._processing) return;
    this._processing = true;
    while (this._queue.length) {
      const job = this._queue.shift();
      await this._runJob(job);
    }
    this._processing = false;
  },

  async _runJob(job, attempt = 1) {
    this._startLoading(
      job.btn,
      attempt > 1 ? `Nouvel essai (${attempt}/${this._MAX_ATTEMPTS})…` : "Génération…",
    );
    try {
      const resolvedUrl = await this._resolve(job.url, job.token);
      this._stopLoading(job.btn);
      job.onSuccess(resolvedUrl);
    } catch (e) {
      if (attempt < this._MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, this._RETRY_DELAY_MS * attempt));
        return this._runJob(job, attempt + 1);
      }
      toast(`${job.label} — ${e.message}`);
      this._stopLoading(job.btn);
    }
  },

  _resolve(url, token) {
    return token ? this._loadViaToken(url, token) : this._loadViaImg(url);
  },

  /** Précharge via une balise <img> — Pollinations bloque les fetch() nus
      derrière une vérif anti-bot (Cloudflare Turnstile) que <img> ne déclenche
      pas. Retourne l'URL telle quelle (stockable/réaffichable). */
  _loadViaImg(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.onload = img.onerror = null;
        reject(new Error("Délai dépassé — le service est peut-être surchargé."));
      }, 20000);
      img.onload = () => {
        clearTimeout(timer);
        resolve(url);
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Génération impossible (limite de requêtes atteinte ?)."));
      };
      img.src = url;
    });
  },

  /** Avec un token personnel : fetch() + header Authorization (impossible sur
      <img>). Réponse convertie en data URL (pas un blob: qui ne survivrait pas
      à un rechargement), donc stockable comme les URLs directes. */
  async _loadViaToken(url, token) {
    let resp;
    try {
      resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      throw new Error("Génération impossible — vérifiez la connexion.");
    }
    if (!resp.ok) {
      throw new Error(`Pollinations a répondu ${resp.status} (token invalide ?).`);
    }
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Réponse illisible."));
      reader.readAsDataURL(blob);
    });
  },

  _startLoading(btn, label = "Génération…") {
    if (!btn) return;
    btn.disabled = true;
    if (btn.dataset.origLabel === undefined) btn.dataset.origLabel = btn.textContent;
    btn.textContent = label;
  },
  _stopLoading(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = btn.dataset.origLabel || btn.textContent;
    delete btn.dataset.origLabel;
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Pollinations = Pollinations;
