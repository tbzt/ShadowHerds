"use strict";

/* ============================================================
   FOUNDRY EXPORT — contrôleur NEUTRE (aucune logique d'édition)

   Déclenche l'export d'un PNJ vers un ou plusieurs fichiers JSON
   d'acteur Foundry VTT. Toute la connaissance spécifique à une
   édition vit dans le module d'édition, exposée via
   `App.editionModule.foundryExport` (SR5, Anarchy2...). Ce contrôleur
   ne fait qu'orchestrer : résoudre le PNJ, appeler `buildActor`
   (+ `buildVehicleActors` si l'édition l'expose — véhicules liés,
   un fichier par acteur, Foundry n'important qu'un acteur par
   fichier), sérialiser et télécharger — même idiome Blob que
   Backup.export().
   ============================================================ */
import { Debug } from "../core/debug.js";
import { Dialog } from "../widgets/kit/dialog.js";
import { DossierBar } from "../widgets/journal/dossierbar.js";
import { PnjLookup } from "./pnjlookup.js";

export const FoundryExport = {
  /* ---- Diagnostic des mappings non résolus (socle partagé) ----
     Les modules d'édition appellent FoundryExport.note(...) à leurs points
     de repli LOSSY : compétence droppée, catégorie d'arme devinée, métatype
     ou attribut de Drain inconnu. Un mapping non résolu = perte de donnée
     silencieuse à l'export (la pire catégorie, cf. doctrine storage.js) →
     console.warn INCONDITIONNEL (pas via Debug, qui est débrayable via
     ?debug=off). `_session` collecte le temps d'un export pour un récap ;
     null hors export (buildActor appelé seul en test → warn quand même). */
  _session: null,

  note(kind, value, fallback) {
    const tail = fallback !== undefined ? ` → repli « ${fallback} »` : " (ignoré)";
    console.warn(`[foundry-export] mapping non résolu — ${kind} « ${value} »${tail}`);
    if (this._session) this._session.push({ kind, value, fallback });
  },

  /** Le PNJ résolu peut-il être exporté dans l'édition active ? */
  _capabilityFor(pnj) {
    const mod = App.getEditionModule(pnj && pnj.edition);
    return mod && mod.foundryExport ? mod.foundryExport : null;
  },

  /** Télécharge un objet acteur sous forme de fichier JSON. */
  _download(actor, filename) {
    const json = JSON.stringify(actor, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /** Construit et télécharge le(s) fichier(s) acteur d'UNE entité. Renvoie un
      récap ({ ok, files, extras, unresolved }) sans toaster : les points
      d'entrée (carte, dossier) décident du message. */
  _exportEntity(pnj) {
    const cap = this._capabilityFor(pnj);
    if (!cap) return { ok: false, reason: "unsupported" };

    let actor, extras;
    this._session = [];
    try {
      actor = cap.buildActor(pnj);
      extras = cap.buildVehicleActors ? cap.buildVehicleActors(pnj) || [] : [];
    } catch (e) {
      this._session = null;
      Debug.warn("foundry", "buildActor a échoué", { id: pnj.id, error: e });
      return { ok: false, reason: "error" };
    }
    const unresolved = this._session;
    this._session = null;

    const base = cap.filename ? cap.filename(pnj) : "foundry-actor.json";
    this._download(actor, base);
    extras.forEach((extraActor, i) => {
      this._download(extraActor, base.replace(/\.json$/, `-vehicule-${i + 1}.json`));
    });
    return { ok: true, files: 1 + extras.length, extras: extras.length, unresolved: unresolved.length };
  },

  /** Point d'entrée du bouton de carte (data-action="export-foundry"). */
  exportPnj(id) {
    const pnj = PnjLookup.find(id);
    if (!pnj) {
      toast("PNJ introuvable.", "warning");
      return;
    }
    const res = this._exportEntity(pnj);
    if (!res.ok) {
      toast(
        res.reason === "unsupported"
          ? "Export Foundry indisponible pour cette édition."
          : "Export impossible (données du PNJ incomplètes).",
        res.reason === "unsupported" ? "warning" : "danger",
      );
      return;
    }
    const extraMsg = res.extras ? ` (+${res.extras} véhicule${res.extras > 1 ? "s" : ""} lié${res.extras > 1 ? "s" : ""})` : "";
    if (res.unresolved) {
      console.warn(
        `[foundry-export] « ${pnj.name} » (${pnj.edition}) : ${res.unresolved} mapping(s) non résolu(s) — export tout de même produit, voir détails ci-dessus.`,
      );
      toast(`« ${pnj.name} » exporté${extraMsg} — ${res.unresolved} mapping(s) non résolu(s) (voir console).`, "warning");
    } else {
      toast(`« ${pnj.name} » exporté pour Foundry${extraMsg}.`);
    }
  },

  /** Fiches PNJ/PJ du dossier Hub courant, hors entités liées (leurs
      véhicules partent avec leur maître via buildVehicleActors). */
  _dossierEntities() {
    const out = [];
    for (const col of [Shadows, Characters]) {
      if (typeof col === "undefined") continue;
      const byId = new Map(col.data.all.map((e) => [e.id, e]));
      for (const id of DossierBar.memberIds(col)) {
        const e = byId.get(id);
        if (e && !e.ownerId) out.push(e);
      }
    }
    return out;
  },

  /** Point d'entrée du bouton Hub (data-action="foundry-dossier") : exporte
      toutes les fiches exportables du dossier courant, une par fichier
      (Foundry n'importe qu'un acteur par fichier). Confirme d'abord — un
      dossier peut produire beaucoup de téléchargements. */
  async exportDossier() {
    const ents = this._dossierEntities().filter((e) => this._capabilityFor(e));
    if (!ents.length) {
      toast("Aucune fiche exportable vers Foundry dans ce dossier.", "info");
      return;
    }
    const ok = await Dialog.confirm({
      title: "Exporter vers Foundry",
      message: `Exporter ${ents.length} fiche${ents.length > 1 ? "s" : ""} de ce dossier vers Foundry VTT ? Un fichier JSON par acteur sera téléchargé.`,
    });
    if (!ok) return;

    let files = 0;
    let unresolved = 0;
    let failed = 0;
    for (const pnj of ents) {
      const res = this._exportEntity(pnj);
      if (!res.ok) failed++;
      else {
        files += res.files;
        unresolved += res.unresolved;
      }
    }
    const parts = [`${ents.length - failed}/${ents.length} fiche(s) exportée(s)`, `${files} fichier(s)`];
    if (unresolved) parts.push(`${unresolved} mapping(s) non résolu(s) — voir console`);
    if (failed) parts.push(`${failed} échec(s)`);
    toast(parts.join(" · "), unresolved || failed ? "warning" : "success");
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.FoundryExport = FoundryExport;
