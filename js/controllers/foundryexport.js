"use strict";

/* ============================================================
   FOUNDRY EXPORT — contrôleur NEUTRE (aucune logique d'édition)

   Déclenche l'export d'un PNJ vers un fichier JSON d'acteur Foundry
   VTT. Toute la connaissance spécifique à une édition vit dans le
   module d'édition, exposée via `App.editionModule.foundryExport`
   (présent en SR5 seulement, cf. js/editions/sr5.foundry.js). Ce
   contrôleur ne fait qu'orchestrer : résoudre le PNJ, appeler
   `buildActor`, sérialiser et télécharger — même idiome Blob que
   Backup.export().
   ============================================================ */
const FoundryExport = {
  /** Le PNJ résolu peut-il être exporté dans l'édition active ? */
  _capabilityFor(pnj) {
    const mod = App.getEditionModule(pnj && pnj.edition);
    return mod && mod.foundryExport ? mod.foundryExport : null;
  },

  /** Point d'entrée du bouton de carte (data-action="export-foundry"). */
  exportPnj(id) {
    const pnj = PnjLookup.find(id);
    if (!pnj) {
      toast("PNJ introuvable.");
      return;
    }
    const cap = this._capabilityFor(pnj);
    if (!cap) {
      toast("Export Foundry indisponible pour cette édition.");
      return;
    }

    let actor;
    try {
      actor = cap.buildActor(pnj);
    } catch (e) {
      Debug.warn("foundry", "buildActor a échoué", { id, error: e });
      toast("Export impossible (données du PNJ incomplètes).");
      return;
    }

    const json = JSON.stringify(actor, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cap.filename ? cap.filename(pnj) : "foundry-actor.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`« ${pnj.name} » exporté pour Foundry.`);
  },
};
