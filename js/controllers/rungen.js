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
        <button class="btn-secondary" data-action="add-blank">Topos vierge</button>
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
        case "add-blank":
          this.addBlank();
          break;
        case "edit-run": {
          const card = actionEl.closest(".run-card");
          if (card) ToposEdit.open(card.dataset.id);
          break;
        }
        case "run-plan": {
          const card = actionEl.closest(".run-card");
          if (card) this.generatePlan(card.dataset.id, actionEl);
          break;
        }
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
        case "run-cast": {
          const card = actionEl.closest(".run-card");
          this.castForRun(card.dataset.id);
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

  /* Casting du topos (Lot 3b) : catégorie de rôle du profil de sécurité →
     taxonomie Coherence consommée par Gen.generateForRole. `spirit` est
     volontairement absent (un esprit n'est pas un PNJ : invocation séparée),
     donc le slot est ignoré au casting. */
  _CAT_TO_ROLE: {
    grunt: "combattant",
    mage: "mage",
    decker: "decker",
    rigger: "rigger",
    leader: "social",
    runner_rival: "combattant",
  },

  /** « Générer le casting » — produit les PNJ d'opposition cohérents avec le
      topos (profil de sécurité de la cible + rôle injecté par la difficulté),
      calés en nombre sur la menace du district, et les range dans le dossier de
      la run. Génération déléguée à `Gen.generateForRole` ; rangement à `Shadows`
      (via `currentGroup`) — RunGen n'écrit ni la fiche ni le storage lui-même.
      Le casting apparaît ensuite dans le poste de commandement de « Jouer »
      (qui lit déjà `DossierBar.memberIds`). */
  castForRun(runId) {
    const run = this._runs.find((r) => r.id === runId);
    if (!run || !run.dossierId) {
      toast("Faites d'abord une run (dossier) pour y ranger le casting.", "warning");
      return;
    }
    const prof = ToposCatalog.securityProfiles[run.securityProfile];
    if (!prof) {
      toast("Topos sans profil de sécurité — régénérez-le.", "warning");
      return;
    }
    const dossierName = Dossiers.nameOf(run.dossierId);
    if (!dossierName) {
      toast("Dossier de la run introuvable.", "warning");
      return;
    }
    // Slots = profil de la cible (+ un extra si district très surveillé) + le
    // rôle injecté par la difficulté ; on traduit en rôles Coherence (spirit
    // filtré car non-PNJ).
    const cats = prof.roles.map((r) => r.cat);
    const menace = ToposCatalog.districts.find((d) => d.key === run.district)?.menace || 3;
    if (menace >= 4) cats.push("grunt");
    if (run.injectedRole) cats.push(run.injectedRole);
    const roles = cats.map((c) => this._CAT_TO_ROLE[c]).filter(Boolean);
    if (!roles.length) return;

    const prevGroup = Shadows.currentGroup;
    Shadows.currentGroup = dossierName; // Shadows.savePNJ classe dans ce dossier
    let n = 0;
    for (const role of roles) {
      const pnj = Gen.generateForRole(role);
      if (pnj) {
        Shadows.savePNJ(pnj.id);
        n++;
      }
    }
    Shadows.currentGroup = prevGroup;
    toast(`Casting généré : ${n} PNJ rangé${n > 1 ? "s" : ""} dans « ${dossierName} ».`);
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

  /** Crée un topos VIERGE (champs plats vides) et ouvre l'éditeur dessus — pour
      le MJ qui écrit son amorce à la main plutôt que de la générer. Aucune clé
      structurée → pas de casting auto (le MJ compose tout). */
  addBlank() {
    const run = {
      id: Utils.uid(),
      type: "",
      client: "",
      lieu: "",
      complication: "",
      objectif2: "",
      payment: "",
      difficulte: "",
    };
    this._runs.unshift(run);
    this._save();
    this._renderCard(run, true);
    ToposEdit.open(run.id);
  },

  /** Applique les champs édités (ToposEdit) à un topos et persiste. Ne touche
      qu'aux libellés plats ; les clés structurées de génération sont conservées. */
  updateTopos(id, fields) {
    const run = this._runs.find((r) => r.id === id);
    if (!run) return;
    Object.assign(run, fields);
    this._save();
    this._refreshCard(id);
  },

  /** « Plan du lieu » (Lot 4) — génère une image de plan (blueprint) du lieu du
      topos via Pollinations et la stocke sur le topos (`planUrl`). Opt-in Images
      IA (Settings) ; le bouton n'apparaît que sur un site à `planUtile` (3a).
      RunGen ne connaît pas la plomberie : file d'attente partagée + token gérés
      par Pollinations, token lu par l'appelant dans Settings. */
  generatePlan(runId, btn) {
    const run = this._runs.find((r) => r.id === runId);
    if (!run || !run.lieu) return;
    const prompt =
      `top-down architectural floor plan blueprint of ${run.lieu}, ` +
      `schematic layout, labeled rooms, clean technical linework, ` +
      `Shadowrun cyberpunk facility, blue and white blueprint style`;
    Pollinations.generate({
      prompt,
      width: 768,
      height: 512,
      token: Settings.getPortraitSettings().token,
      btn,
      label: "Plan du lieu",
      onSuccess: (url) => {
        run.planUrl = url;
        this._save();
        this._refreshCard(runId);
      },
    });
  },
  clearAll() {
    this._runs = [];
    this._save();
    document.getElementById("run-list").innerHTML = "";
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.RunGen = RunGen;
