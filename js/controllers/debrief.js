"use strict";

/* ============================================================
   DEBRIEF — VIS-7 · rituel de clôture d'un run (« qu'est-ce que ce
   run a laissé ? »). N'INTRODUIT AUCUN ÉTAT : un écran de saisie
   assistée qui pousse dans deux socles déjà là.
   - Bascules CHIFFRÉES (paie / karma / réputation) → registre daté de
     campagne via `UI.addLedgerEntry` (jumeau du journal) : le solde reste
     DÉRIVÉ (`Campaign.balance`), jamais stocké ; chaque écriture est datée
     et réversible depuis la carte (`UI.removeLedgerEntry`).
   - Bascule NARRATIVE (contact grillé/gagné, retombées) → carnet du run
     via `Notebooks.set` : un paragraphe daté ajouté au document markdown
     (doctrine anti-parseur : une section « ## » dans UN doc, pas de sous-blob).
   *Propose, le MJ ratifie* : rien ne s'applique sans un clic de validation
   (garde-fou « informer, jamais décider », ligne VIS-2/VIS-3).

   La réputation est lue de `App.editionModule.reputationTracks` (neutre `[]`
   pour Anarchy → section vide, ZÉRO branche d'édition ; SR6 y loge « Pression »,
   décrite au livre comme accumulée en fin de séance — le débrief EST son foyer).
   Équipe = PJ (`Characters`) rangés dans le run ET ses dossiers ancêtres
   (campagne parente) : `memberIds` ne descend qu'aux sous-groupes, on remonte
   la chaîne `parentId`.

   Contrôleur-feuille : ne possède aucune donnée, orchestre des contrats
   existants et mute par le global `UI`. Aucun `onclick` : overlay propre,
   délégation `data-debrief-action`.
   ============================================================ */
import { CardRenderer } from "../widgets/card/cardrenderer.js";
import { Campaign } from "../rules/campaign.js";
import { DossierBar } from "../widgets/journal/dossierbar.js";
import { Dossiers } from "../widgets/journal/dossiers.js";
import { Notebooks } from "../rules/notebooks.js";
import { RunGen } from "./rungen.js";

export const Debrief = {
  _el: null,
  _runId: null,

  /** Ouvre le débrief d'un run. No-op si l'id ne pointe pas un dossier « run ». */
  open(runId) {
    if (!runId || Dossiers.kindOf(runId) !== "run") return;
    this._runId = runId;
    const overlay = this._ensure();
    overlay.querySelector('[data-debrief="body"]').innerHTML = this._bodyHtml(runId);
    overlay.classList.add("open");
    requestAnimationFrame(() => {
      const first = overlay.querySelector("input[type=number]");
      if (first) first.focus();
    });
  },

  hide() {
    if (this._el) this._el.classList.remove("open");
    this._runId = null;
  },

  /* ---- Dérivations (aucune donnée neuve) ---- */

  /** Pistes chiffrées proposées à TOUTE l'équipe : devises universelles
      (`Campaign.CORE`) + réputation de l'édition courante. Volontairement PAS
      les compteurs libres par PJ (personnels, pas des bascules de run). */
  _tracks() {
    const rep = (App.editionModule && App.editionModule.reputationTracks) || [];
    return [...Campaign.CORE, ...rep];
  },

  /** Ids des PJ de l'équipe : membres `Characters` du run ET de ses dossiers
      ancêtres (campagne parente). `DossierBar.memberIds` ne descend qu'aux
      sous-groupes → on remonte via `parentId`. Set dédupliqué ; garde à 50
      purement défensive (`Dossiers.move` interdit déjà les cycles). */
  _teamIds(runId) {
    const ids = new Set();
    let node = Dossiers.get(runId);
    for (let i = 0; node && i < 50; i++) {
      for (const id of DossierBar.memberIds(Characters, node.id)) ids.add(id);
      node = node.parentId ? Dossiers.get(node.parentId) : null;
    }
    return [...ids];
  },

  /** Fiches PJ de l'équipe, dans l'ordre stable de la collection. */
  _team(runId) {
    const ids = new Set(this._teamIds(runId));
    return (Characters.data.all || []).filter((c) => ids.has(c.id));
  },

  /** Paie par runner pré-remplie depuis le topos rattaché (« 3 000¥ par
      runner » → 3000) ; 0 si aucun topos ou champ vide. */
  _defaultPaie(runId) {
    const topoi = (typeof RunGen !== "undefined" && RunGen.forDossier(runId)) || [];
    const pay = topoi.length ? String(topoi[0].payment || "") : "";
    const n = parseInt(pay.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  },

  /* ---- Rendu ---- */
  _bodyHtml(runId) {
    const esc = CardRenderer._esc;
    const team = this._team(runId);
    const runName = Dossiers.nameOf(runId) || "run";
    const paie = this._defaultPaie(runId);

    const teamHtml = team.length
      ? `<div class="debrief-team">${team
          .map((c) => `<span class="debrief-chip">${esc(c.name || "Sans nom")}</span>`)
          .join("")}</div>`
      : `<p class="debrief-warn">Aucun PJ rangé dans ce run ni dans sa campagne — les bascules chiffrées seront ignorées. Rangez l'équipe dans le run pour les activer.</p>`;

    // Une ligne par piste chiffrée (devises + réputation d'édition). Nuyens
    // pré-rempli de la paie du topos ; le reste à 0 (le MJ ratifie ce qui bouge).
    const rows = this._tracks()
      .map((t) => {
        const glyph = t.glyph ? ` <span class="debrief-glyph">${esc(t.glyph)}</span>` : "";
        const def = t.key === "nuyen" ? paie : 0;
        return `<label class="debrief-row">
          <span class="debrief-row-label">${esc(t.label)}${glyph}</span>
          <input type="number" class="debrief-input" data-debrief-track="${esc(t.key)}" value="${def}" step="1" inputmode="numeric">
        </label>`;
      })
      .join("");

    const repEmpty =
      !((App.editionModule && App.editionModule.reputationTracks) || []).length;
    const repNote = repEmpty
      ? `<p class="debrief-hint">Cette édition ne chiffre pas la réputation — notez les retombées ci-dessous.</p>`
      : "";

    return `<div class="debrief-lead">
        <span class="debrief-run">◆ ${esc(runName)}</span>
        <span class="debrief-sub">Les valeurs proposées ne s'appliquent qu'à votre validation.</span>
      </div>
      ${teamHtml}
      <div class="debrief-section-title">Paie &amp; progression${team.length ? ` <span class="debrief-team-count">× ${team.length} PJ</span>` : ""}</div>
      <div class="debrief-tracks">${rows}</div>
      ${repNote}
      <div class="debrief-section-title">Ce que le run a laissé</div>
      <p class="debrief-hint">Contact grillé ou gagné, corpo fâchée, faveur due… — ce texte rejoint le carnet du run, daté.</p>
      <textarea class="debrief-notes" data-debrief="notes" rows="5" placeholder="Ex. « Le fixer Hachette est grillé ; la decker Ø-Mercy nous doit une faveur ; Ares a ouvert un dossier sur l'équipe. »"></textarea>`;
  },

  /* ---- Application (via UI + Notebooks, jamais de Storage direct) ---- */
  _apply() {
    const runId = this._runId;
    if (!runId) return;
    const overlay = this._el;
    const team = this._teamIds(runId);
    const runName = Dossiers.nameOf(runId) || "run";
    const reason = `Débrief · ${runName}`;

    // 1. Bascules chiffrées → une écriture datée par PJ (team-wide). Solde
    //    dérivé, réversible depuis la carte. `UI` persiste et rafraîchit.
    let written = 0;
    if (team.length) {
      for (const input of overlay.querySelectorAll("[data-debrief-track]")) {
        const delta = parseInt(input.value, 10);
        if (!Number.isFinite(delta) || delta === 0) continue;
        const res = input.dataset.debriefTrack;
        for (const pjId of team) {
          UI.addLedgerEntry(pjId, res, delta, reason);
          written++;
        }
      }
    }

    // 2. Bascule narrative → paragraphe daté ajouté au carnet du run (Notebooks
    //    route via Storage). Titre « ## » dans le doc, jamais un sous-blob.
    const notesEl = overlay.querySelector('[data-debrief="notes"]');
    const notes = (notesEl && notesEl.value.trim()) || "";
    if (notes) {
      const date = new Date().toLocaleDateString("fr-FR");
      const prev = Notebooks.get(runId);
      const section = `## Débrief — ${date}\n\n${notes}`;
      Notebooks.set(runId, prev ? `${prev}\n\n${section}` : section);
    }

    this.hide();

    if (written || notes) {
      // Perche vers le carnet (socle VIS-2 `toastAction`) : y consigner d'un clic.
      toastAction(`Débrief de « ${runName} » enregistré.`, "Voir le carnet", () => {
        DossierBar.select(runId);
        Notepad.open();
      });
    } else {
      toast("Rien à enregistrer — aucune bascule saisie.");
    }
  },

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay debrief-overlay";
    overlay.id = "debrief-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    // Réutilise la coquille .modal-overlay/.modal (thème par édition hérité).
    overlay.innerHTML = `
      <div class="modal debrief-modal">
        <div class="modal-header">
          <span class="modal-title">Débrief de séance</span>
          <button class="modal-close" data-debrief-action="cancel" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body debrief-body" data-debrief="body"></div>
        <div class="modal-footer">
          <button class="btn-secondary" data-debrief-action="cancel">Annuler</button>
          <button class="btn-primary" data-debrief-action="apply">Valider le débrief</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.hide();
        return;
      }
      const btn = e.target.closest("[data-debrief-action]");
      if (!btn) return;
      if (btn.dataset.debriefAction === "cancel") this.hide();
      else if (btn.dataset.debriefAction === "apply") this._apply();
    });
    // Échap ferme (annule). Pas de raccourci « Entrée valide » : la zone de
    // notes a besoin des retours à la ligne.
    document.addEventListener("keydown", (e) => {
      if (!overlay.classList.contains("open")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        this.hide();
      }
    });
    this._el = overlay;
    return overlay;
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Debrief = Debrief;
