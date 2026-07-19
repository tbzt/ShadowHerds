"use strict";

/* ============================================================
   RUN GENERATOR — contrôleur du panneau « Topos » (amorces de run),
   PAS de contacts. Il ne détient plus les tables : la donnée taggée
   et le moteur d'assemblage cohérent vivent dans `ToposCatalog`
   (couche rules). Ici : formulaire → assemblage → stockage → rendu.
   Rangé avec les générateurs (près de Generator), pas avec le trio
   contact, dont il ne partage ni la donnée ni la persistance.
   ============================================================ */
import { Dialog } from "../widgets/kit/dialog.js";
import { DossierBar } from "../widgets/journal/dossierbar.js";
import { Dossiers } from "../widgets/journal/dossiers.js";
import { RunRenderer } from "../widgets/play/runrenderer.js";
import { Storage } from "../core/storage.js";
import { ToposCatalog } from "../rules/toposcatalog.js";
import { Utils } from "../core/utils.js";

export const RunGen = {
  /** Génère un topos cohérent (assemblage par conflit — cf. ToposCatalog).
      Le contrôleur n'ajoute que l'identité persistante ; toute la donnée de
      jeu et la corrélation appartiennent au catalogue. */
  generate() {
    return { id: Utils.uid(), ...ToposCatalog.assemble() };
  },

  initPanel() {
    this._bindDelegation();
    const zone = document.getElementById("run-panel-content");
    delete zone.dataset.init;
    zone.dataset.init = "1";
    zone.innerHTML = `
      <div class="gen-actions">
        <button class="btn-primary"   data-action="add-one">Générer un topos</button>
        <button class="btn-secondary" data-action="clear-all">Effacer tout</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:1rem;" id="run-list"></div>`;
    this._restore();
  },

  _delegated: false,
  _bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;
    document.getElementById("panel-run").addEventListener("click", (e) => {
      const actionEl = e.target.closest("[data-action]");
      if (!actionEl) return;
      switch (actionEl.dataset.action) {
        case "add-one":
          this.addOne();
          break;
        case "clear-all":
          this.clearAll();
          break;
        case "discard-run": {
          const card = actionEl.closest(".run-card");
          this._runs = this._runs.filter((r) => r.id !== card.dataset.id);
          this._save();
          card.remove();
          break;
        }
        case "run-to-dossier": {
          const card = actionEl.closest(".run-card");
          this.toDossier(card.dataset.id, actionEl.dataset.runName);
          break;
        }
        // R4 : miroir du geste « rencontre » de dossierbar sur la carte de
        // run (même dossierId, mêmes méthodes — aucune logique dupliquée).
        case "open-rencontre":
          DossierBar.openRencontre(actionEl.dataset.dossier);
          this._refreshCard(actionEl.closest(".run-card")?.dataset.id);
          break;
        case "close-rencontre":
          DossierBar.closeRencontre(actionEl.dataset.dossier);
          this._refreshCard(actionEl.closest(".run-card")?.dataset.id);
          break;
      }
    });
  },

  /** « Faire une run » — promeut un topos (amorce générée) en RUN canon.
      Crée (ou réutilise) un dossier typé `run` où ranger PNJ, contacts et
      serveurs de la prep, et relie le topos au dossier (la carte l'affiche
      ensuite au lieu du bouton — le topos ne reste plus sans lien visible une
      fois promu). Le nom est proposé d'après le topos, éditable. */
  async toDossier(runId, suggested) {
    const input = await Dialog.prompt({
      title: "Faire une run",
      label: "Nom de la run",
      value: suggested || "Run",
      confirmLabel: "Faire la run",
    });
    if (input === null || !input.trim()) return;
    const name = input.trim();
    // Le dossier créé est typé « run » (mission canon de la colonne
    // Campagne › Run › Scène) ; un dossier existant garde son type (on ne
    // redéfinit pas la structure déjà posée par le MJ).
    let dossier = Dossiers.list().find((d) => d.name === name);
    if (!dossier) dossier = Dossiers.add(name, null, "run");
    const run = this._runs.find((r) => r.id === runId);
    if (run && dossier) {
      // R0 : jointure par id (stable au renommage) ; dossierName gardé en
      // secours d'affichage 1 release pour les topos pas encore migrés.
      run.dossierId = dossier.id;
      run.dossierName = name;
      this._save();
      this._refreshCard(runId);
    }
    toast(`Run « ${name} » créée — rangez-y votre prep.`);
  },

  /** Ré-affiche une seule carte de run après mutation (évite un re-render
      complet de la liste). */
  _refreshCard(id) {
    const run = this._runs.find((r) => r.id === id);
    const old = [...document.querySelectorAll("#run-list .run-card")].find(
      (c) => c.dataset.id === id,
    );
    if (!run || !old) return;
    const el = RunRenderer.render(run);
    el.dataset.id = run.id;
    old.replaceWith(el);
  },

  /* ---- Persistance des runs générées (édition-scopée) ----
     Miroir du pattern gen_pool : les runs survivent au F5 et au changement de
     panel, restaurées par initPanel(). Storage = source de vérité. */
  _RUNS_KEY: "gen_runs",
  _runs: [],
  _save() {
    Storage.set(this._RUNS_KEY, this._runs);
  },
  /** Runs rattachées à un dossier, par id (R0 — stable au renommage). Lit
      Storage frais — utilisable depuis n'importe quel panneau (le Hub
      notamment), sans dépendre de `_runs`, qui n'est restauré qu'à
      l'ouverture du panneau Run. Fallback `dossierName` pour une run pas
      encore migrée (la migration storage.js v5 couvre le cas normal ; ce
      filet couvre une écriture concurrente entre le boot et la migration). */
  forDossier(id) {
    if (!id) return [];
    const name = Dossiers.nameOf(id);
    return Storage.get(this._RUNS_KEY, []).filter(
      (r) => r.dossierId === id || (!r.dossierId && r.dossierName === name),
    );
  },
  /** Rend une carte et la relie à son objet run par data-id (suppression +
      persistance). RunRenderer reste générique. */
  _renderCard(run, prepend) {
    const el = RunRenderer.render(run);
    el.dataset.id = run.id;
    const list = document.getElementById("run-list");
    prepend ? list.prepend(el) : list.append(el);
  },
  _restore() {
    this._runs = Storage.get(this._RUNS_KEY, []);
    // _runs est du plus récent au plus ancien : append les rend haut → bas.
    for (const run of this._runs) this._renderCard(run, false);
  },
  addOne() {
    const run = this.generate();
    this._runs.unshift(run);
    this._save();
    this._renderCard(run, true);
  },
  clearAll() {
    this._runs = [];
    this._save();
    document.getElementById("run-list").innerHTML = "";
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.RunGen = RunGen;
