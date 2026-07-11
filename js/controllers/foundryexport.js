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
const FoundryExport = {
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

    let actor, extras;
    try {
      actor = cap.buildActor(pnj);
      extras = cap.buildVehicleActors ? cap.buildVehicleActors(pnj) || [] : [];
    } catch (e) {
      Debug.warn("foundry", "buildActor a échoué", { id, error: e });
      toast("Export impossible (données du PNJ incomplètes).");
      return;
    }

    const base = cap.filename ? cap.filename(pnj) : "foundry-actor.json";
    this._download(actor, base);
    extras.forEach((extraActor, i) => {
      const suffix = `-vehicule-${i + 1}`;
      this._download(extraActor, base.replace(/\.json$/, `${suffix}.json`));
    });

    const extraMsg = extras.length ? ` (+${extras.length} véhicule${extras.length > 1 ? "s" : ""} lié${extras.length > 1 ? "s" : ""})` : "";
    toast(`« ${pnj.name} » exporté pour Foundry${extraMsg}.`);
  },
};
