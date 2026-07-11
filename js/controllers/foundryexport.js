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
    this._session = [];
    try {
      actor = cap.buildActor(pnj);
      extras = cap.buildVehicleActors ? cap.buildVehicleActors(pnj) || [] : [];
    } catch (e) {
      this._session = null;
      Debug.warn("foundry", "buildActor a échoué", { id, error: e });
      toast("Export impossible (données du PNJ incomplètes).");
      return;
    }
    const unresolved = this._session;
    this._session = null;

    const base = cap.filename ? cap.filename(pnj) : "foundry-actor.json";
    this._download(actor, base);
    extras.forEach((extraActor, i) => {
      const suffix = `-vehicule-${i + 1}`;
      this._download(extraActor, base.replace(/\.json$/, `${suffix}.json`));
    });

    const extraMsg = extras.length ? ` (+${extras.length} véhicule${extras.length > 1 ? "s" : ""} lié${extras.length > 1 ? "s" : ""})` : "";
    if (unresolved.length) {
      // Récap groupé après le détail ligne-à-ligne déjà émis par note().
      console.warn(
        `[foundry-export] « ${pnj.name} » (${pnj.edition}) : ${unresolved.length} mapping(s) non résolu(s) — export tout de même produit, voir détails ci-dessus.`,
      );
      toast(`« ${pnj.name} » exporté${extraMsg} — ⚠ ${unresolved.length} mapping(s) non résolu(s) (voir console).`);
    } else {
      toast(`« ${pnj.name} » exporté pour Foundry${extraMsg}.`);
    }
  },
};
