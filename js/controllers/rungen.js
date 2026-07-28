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
import { ScenarioStore } from "../core/scenariostore.js";
import { FactionStore } from "../core/factionstore.js";
import { ScenarioTemplates } from "../widgets/graph/scenariotemplates.js";
import { TrameGen } from "../rules/tramegen.js";
import { Storage } from "../core/storage.js";
import { ToposCatalog } from "../rules/toposcatalog.js";
import { WorldState } from "../rules/worldstate.js";
import { Utils } from "../core/utils.js";

export const RunGen = {
  /** Génère un topos cohérent (assemblage par conflit — cf. ToposCatalog).
      Le contrôleur n'ajoute que l'identité persistante ; toute la donnée de
      jeu et la corrélation appartiennent au catalogue. VIS-12 : le contrôleur
      ORCHESTRE la mémoire du monde — il dérive les faits de la campagne courante
      (`WorldState.factsFor`, couche basse) et les PASSE au catalogue (injection
      descendante) ; le catalogue n'appelle jamais WorldState. */
  generate() {
    const scope = (typeof App !== "undefined" && App.context && App.context.dossier) || null;
    const repTracks = (App && App.editionModule && App.editionModule.reputationTracks) || [];
    return { id: Utils.uid(), ...ToposCatalog.assemble(WorldState.factsFor(scope, { repTracks })) };
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
      <p style="margin:.4rem 0 .2rem;color:var(--text-dim,#9fb0c0);font-size:var(--fs-sm);">Une amorce qui mérite une aventure structurée ? <button class="linklike" data-action="show-panel" data-panel="trames">La construire en trame ◈</button></p>
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
        case "run-map": {
          const card = actionEl.closest(".run-card");
          if (card) this.showMap(card.dataset.id);
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
        case "run-trame": {
          const card = actionEl.closest(".run-card");
          this.generateTrameForRun(card.dataset.id);
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

  /** « Faire un run » — promeut un topos (amorce générée) en RUN canon.
      Crée (ou réutilise) un dossier typé `run` où ranger PNJ, contacts et
      serveurs de la prep, et relie le topos au dossier (la carte l'affiche
      ensuite au lieu du bouton — le topos ne reste plus sans lien visible une
      fois promu). Le nom est proposé d'après le topos, éditable. */
  async toDossier(runId, suggested) {
    const input = await Dialog.prompt({
      title: "Faire un run",
      label: "Nom du run",
      value: suggested || "Run",
      confirmLabel: "Faire le run",
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
    // VIS-3 (annexe B a) : le run tout juste promu devient le contexte courant
    // (focus + destination de rangement + fil d'Ariane) — sinon il fallait
    // aller le focaliser à la main pour que « Jouer » l'affiche en tête.
    if (dossier) DossierBar.select(dossier.id);
    // VIS-3 (annexe B b) : la trame est PROPOSÉE, pas imposée (informer jamais
    // décider). Un topos porteur d'un profil de sécurité offre un bouton qui
    // pose une trame jouable (scènes, horloges, front, faction + casting) d'un
    // clic ; sinon, simple confirmation.
    if (run && run.dossierId && run.securityProfile) {
      toastAction(
        `Run « ${name} » créé — rangez-y votre prep.`,
        "Générer la trame",
        () => this.generateTrameForRun(runId),
        6000,
      );
    } else {
      toast(`Run « ${name} » créé — rangez-y votre prep.`);
    }
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

  /** Produit et RANGE les PNJ d'opposition d'un run (casting par référence),
      renvoie `[{id, role}]` (la trame les répartit sur les scènes selon leur rôle
      et les verse en membres de faction). Slots = profil de sécurité de la cible
      (+ un extra si district très surveillé) + le rôle injecté par la difficulté,
      traduits en rôles Coherence (`spirit` filtré car non-PNJ).
      A4/§5.2 — on génère DANS LE MONDE (bibliothèque) puis on CONVOQUE sur le run
      (`Dossiers.convoke`) ; le casting n'est plus une appartenance de dossier. */
  _generateCast(run) {
    const prof = ToposCatalog.securityProfiles[run.securityProfile];
    if (!prof) return [];
    const cats = prof.roles.map((r) => r.cat);
    const menace = ToposCatalog.districts.find((d) => d.key === run.district)?.menace || 3;
    if (menace >= 4) cats.push("grunt");
    if (run.injectedRole) cats.push(run.injectedRole);
    const roles = cats.map((c) => this._CAT_TO_ROLE[c]).filter(Boolean);
    const cast = [];
    for (const role of roles) {
      const pnj = Gen.generateForRole(role);
      if (!pnj) continue;
      // VIS-12 (P5) : tag la faction d'opposition pour la mémoire du monde —
      // « ce PNJ a été croisé chez Ares » deviendra dérivable (visage récurrent).
      pnj.faction = run.opposition || null;
      Shadows.savePNJ(pnj.id);
      Dossiers.convoke(run.dossierId, "entity", pnj.id);
      cast.push({ id: pnj.id, role });
    }
    return cast;
  },

  /* Classe de scène (repérage=tech / sociale=social / action=combat) où placer
     un rôle Coherence — miroir de `TrameGen._CAST_CLASS_BY_TYPE`. */
  _ROLE_CLASS: {
    combattant: "combat", mage: "combat", decker: "tech", rigger: "tech", social: "social",
  },

  /** « Générer la trame » — d'un topos promu en run, POSE une trame jouable
      COMPLÈTE et la lie au run (le cockpit « Jouer » la retrouve via
      `ScenarioStore.byRun(dossierId)`). Le contrôleur ORCHESTRE : il résout le
      contexte (opposition, mandant, sécurité, menace, **modèle tiré au sort**) et
      le passe au bâtisseur pur `TrameGen.fromTopos` (feuille), puis pose TOUTES
      les couches — factions en lice, scènes+beats dramatiques, arêtes, horloges,
      fronts, calque d'indices, casting distribué par rôle. Ne duplique pas : si
      une trame est déjà liée, propose de l'ouvrir. */
  generateTrameForRun(runId) {
    const run = this._runs.find((r) => r.id === runId);
    if (!run || !run.dossierId) {
      toast("Faites d'abord un run (dossier) pour y ancrer la trame.", "warning");
      return;
    }
    const prof = ToposCatalog.securityProfiles[run.securityProfile];
    if (!prof) {
      toast("Topos sans profil de sécurité — régénérez-le.", "warning");
      return;
    }
    const dossierName = Dossiers.nameOf(run.dossierId);
    if (!dossierName) {
      toast("Dossier du run introuvable.", "warning");
      return;
    }
    const openTrame = (id) => {
      if (typeof ScenarioGraph !== "undefined") ScenarioGraph.open(id);
    };
    // Une trame par run (convention `byRun`) : ne pas dupliquer.
    const existing = ScenarioStore.byRun(run.dossierId);
    if (existing) {
      toastAction(`« ${dossierName} » a déjà une trame.`, "Ouvrir la trame", () => openTrame(existing.id));
      return;
    }

    // Contexte résolu pour le bâtisseur pur (aucune connaissance du catalogue
    // ni des stores côté TrameGen). Modèle de scènes TIRÉ AU SORT parmi les
    // intégrés (les modèles user peuvent avoir des beats hors des 6 types).
    const oppKey = run.opposition || null;
    const opposition = { key: oppKey, name: (ToposCatalog.factions[oppKey] || {}).nom || "Opposition", type: ToposCatalog.typeOf(oppKey) };
    const mandant = { key: run.mandant || null, name: (ToposCatalog.factions[run.mandant] || {}).nom || "le commanditaire", type: ToposCatalog.typeOf(run.mandant) };
    const menace = ToposCatalog.districts.find((d) => d.key === run.district)?.menace || 3;
    const builtins = ScenarioTemplates.all().filter((t) => !ScenarioTemplates.isUser(t));
    const template = Utils.rand(builtins.length ? builtins : ScenarioTemplates.all());
    const system = (typeof App !== "undefined" && App.edition) || null;
    const spec = TrameGen.fromTopos({
      topos: run, template, opposition, mandant,
      security: { label: prof.label, roles: prof.roles, key: run.securityProfile },
      ambiances: ToposCatalog.districtAmbiances[run.district] || [],
      menace, system,
    });
    if (!spec) {
      toast("Modèle de trame indisponible.", "warning");
      return;
    }

    // Pose — factions d'abord (les fronts les référencent par RÔLE), puis la
    // trame liée au run.
    const factionIdByRole = {};
    for (const [role, f] of Object.entries(spec.factions)) {
      const created = FactionStore.create({ name: f.name, anchor: f.anchor });
      if (created) factionIdByRole[role] = created.id;
    }
    const oppFactionId = factionIdByRole.opposition || null;
    const sc = ScenarioStore.create(spec.scenario);
    if (!sc) {
      toast("Création de la trame impossible.", "warning");
      return;
    }
    ScenarioStore.setRunId(sc.id, run.dossierId);

    // Scènes (+ beat dramatique) puis arêtes. Les cibles du spec sont des INDEX ;
    // on les résout via ces tables index→id, comme `_seedFromTemplate`.
    const sceneIds = spec.scenes.map((s) => {
      const n = ScenarioStore.addSceneNode(sc.id, {
        type: s.type, title: s.title, body: s.body, templateBeat: s.beat, x: s.x, y: s.y,
      });
      if (n && (s.bang || s.arrow))
        ScenarioStore.updateSceneNode(sc.id, n.id, { bang: s.bang || "", arrow: s.arrow || null });
      return n ? n.id : null;
    });
    const edgeIds = spec.edges.map((e) => {
      const edge = ScenarioStore.addSceneEdge(sc.id, {
        from: sceneIds[e.from], to: sceneIds[e.to],
        kind: e.kind, gateway: e.gateway, isEscapeHatch: e.isEscapeHatch, label: e.label,
      });
      return edge ? edge.id : null;
    });

    // Horloges + effets (cible scène/arête par index → id).
    for (const c of spec.clocks) {
      const clock = ScenarioStore.addClock(sc.id, { type: c.type, title: c.title, segments: c.segments });
      if (!clock) continue;
      for (const eff of c.effects || []) {
        const targetId =
          eff.target.scene != null ? sceneIds[eff.target.scene]
          : eff.target.edge != null ? edgeIds[eff.target.edge]
          : null;
        if (targetId)
          ScenarioStore.addClockEffect(sc.id, clock.id, {
            atThreshold: eff.atThreshold, action: eff.action, targetId,
          });
      }
    }

    // Calque d'indices : faits cachés (index→id) puis indices ancrés sur les scènes.
    const infoIds = spec.infoNodes.map((n) => {
      const info = ScenarioStore.addInfoNode(sc.id, { fact: n.fact, role: n.role, when: n.when });
      return info ? info.id : null;
    });
    for (const cl of spec.clues) {
      const toInfo = infoIds[cl.toInfo];
      if (!toInfo) continue;
      ScenarioStore.addClue(sc.id, {
        toInfoNode: toInfo,
        anchorSceneNodes: (cl.anchorScenes || []).map((i) => sceneIds[i]).filter(Boolean),
        description: cl.description, gated: cl.gated,
      });
    }

    // Fronts (faction résolue par rôle) + danger + présages ordonnés.
    for (const fr of spec.fronts) {
      const front = ScenarioStore.addFront(sc.id, {
        title: fr.title, factionId: factionIdByRole[fr.factionRole] || null,
      });
      if (!front) continue;
      const dg = ScenarioStore.addDanger(sc.id, front.id, {
        impulse: fr.danger.impulse, impendingDoom: fr.danger.impendingDoom,
      });
      if (dg) for (const p of fr.danger.portents) ScenarioStore.addPortent(sc.id, front.id, dg.id, p);
    }

    // Casting (superset) → membres de la faction d'opposition + RÉPARTITION par
    // rôle sur les scènes (le fixer en sociale, le decker au repérage, le muscle
    // au climax) ; les surnuméraires atterrissent au climax.
    const cast = this._generateCast(run);
    if (oppFactionId) for (const c of cast) FactionStore.addMember(oppFactionId, c.id);
    const pools = { combat: [], tech: [], social: [] };
    for (const c of cast) (pools[this._ROLE_CLASS[c.role] || "combat"]).push(c.id);
    const sceneCast = {};
    spec.scenes.forEach((s, i) => {
      const id = s.cast && pools[s.cast] && pools[s.cast].shift();
      if (id && sceneIds[i]) (sceneCast[sceneIds[i]] ||= []).push(id);
    });
    const climaxId = sceneIds[spec.climaxIndex];
    const leftovers = [...pools.combat, ...pools.tech, ...pools.social];
    if (climaxId && leftovers.length) (sceneCast[climaxId] ||= []).push(...leftovers);
    for (const [sid, ids] of Object.entries(sceneCast))
      ScenarioStore.updateSceneNode(sc.id, sid, { castIds: ids });

    this._refreshCard(runId);

    // Un seul toast à la fois (socle utils). VIS-12 (P5) : si un visage déjà
    // croisé de l'opposition traîne dans la campagne, on PROPOSE de le ramener
    // (une némésis récurrente, ré-attachée par référence + versée en faction) ;
    // sinon, l'accès direct à la trame fraîche.
    const head = `Trame « ${sc.title} » générée — ${spec.scenes.length} scènes, ${spec.clocks.length} horloges, ${spec.fronts.length} fronts, ${cast.length} PNJ.`;
    const faces =
      typeof WorldState !== "undefined"
        ? WorldState.recurringFacesFor(run.dossierId, run.opposition, run.dossierId)
        : [];
    if (faces.length) {
      const face = Utils.rand(faces);
      const factionName = opposition.name || "";
      toastAction(
        `${head} ${face.name} — déjà croisé${factionName ? ` chez ${factionName}` : ""}. Le ramener ?`,
        "Ramener",
        () => {
          Dossiers.convoke(run.dossierId, "entity", face.id); // convoque par référence
          if (oppFactionId) FactionStore.addMember(oppFactionId, face.id);
          toast(`${face.name} rejoint « ${dossierName} ».`);
        },
        6000,
      );
    } else {
      toastAction(head, "Ouvrir la trame", () => openTrame(sc.id), 6000);
    }
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

  /* ---- Persistance des runs générés (édition-scopée) ----
     Miroir du pattern gen_pool : les runs survivent au F5 et au changement de
     panel, restaurées par initPanel(). Storage = source de vérité. */
  _RUNS_KEY: "gen_runs",
  _PURGE_KEY: "gen_runs_blueprint_purged", // flag one-shot (blueprint→ambiance)
  _runs: [],
  _save() {
    Storage.set(this._RUNS_KEY, this._runs);
  },
  /** Runs rattachés à un dossier, par id (R0 — stable au renommage). Lit
      Storage frais — utilisable depuis n'importe quel panneau (le Hub
      notamment), sans dépendre de `_runs`, qui n'est restauré qu'à
      l'ouverture du panneau Run. Fallback `dossierName` pour un run pas
      encore migré (la migration storage.js v5 couvre le cas normal ; ce
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
    // Purge unique (par édition) des anciennes images « plan » : c'étaient des
    // blueprints IA structurels, redondants avec le plan SVG, avant que
    // `planUrl` ne serve l'AMBIANCE. On les efface pour que le MJ régénère une
    // vraie ambiance ; garde-fou = flag scopé édition → ne s'exécute qu'une
    // fois et ne touche jamais une ambiance générée depuis.
    if (!Storage.get(this._PURGE_KEY, false)) {
      let touched = false;
      for (const run of this._runs)
        if (run.planUrl) {
          delete run.planUrl;
          touched = true;
        }
      if (touched) this._save();
      Storage.set(this._PURGE_KEY, true);
    }
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

  /** « Ambiance du lieu » — génère une IMAGE D'AMBIANCE (plan large, ressenti :
      lumière, matière, atmosphère) du lieu du topos via Pollinations et la
      stocke sur le topos (`planUrl`, clé conservée — sémantique nouvelle). La
      STRUCTURE (plan tactique) reste au SVG MapGen (`showMap`) : l'IA ne
      redouble plus le plan, elle apporte ce que le SVG ne sait pas faire —
      l'ambiance. Opt-in Images IA (Settings) ; bouton dès qu'il y a un `lieu`
      (une scène a toujours une ambiance). RunGen ne connaît pas la plomberie :
      file d'attente + token gérés par Pollinations, token lu dans Settings. */
  generatePlan(runId, btn) {
    const run = this._runs.find((r) => r.id === runId);
    if (!run || !run.lieu) return;
    const prompt =
      `atmospheric establishing shot of ${run.lieu}, Shadowrun cyberpunk sixth world, ` +
      `moody neon lighting, cinematic wide angle, gritty rain-slicked atmosphere, ` +
      `concept art, highly detailed, no text`;
    Pollinations.generate({
      prompt,
      width: 768,
      height: 512,
      token: Settings.getPortraitSettings().token,
      btn,
      label: "Ambiance du lieu",
      onSuccess: (url) => {
        run.planUrl = url;
        this._save();
        this._refreshCard(runId);
      },
    });
  },

  /** « Plan tactique » — plan de lieu CONSTRUIT par MapGen (procédural, gratuit,
      hors opt-in IA, à la différence de generatePlan/Pollinations). Déterministe :
      on ne persiste que `mapSeed` (le `siteType` est déjà sur le topos) ; le SVG se
      régénère à l'identique à chaque affichage — rien de lourd à stocker. Rendu
      dans la lightbox de Portrait (un data URL SVG dans le même <img>). L'accent
      DA est lu sur le module d'édition (jamais `if (App.edition === …)`). */
  showMap(runId) {
    const run = this._runs.find((r) => r.id === runId);
    if (!run) return;
    if (!run.mapSeed) {
      run.mapSeed = Utils.uid();
      this._save();
    }
    const accent =
      (App.editionModule && App.editionModule.mapAccent) || "#35e0e6";
    const svg = MapGen.build({
      siteType: run.siteType,
      seed: run.mapSeed,
      accent,
      title: run.lieu || "Plan du lieu",
      subtitle: [run.type, run.client].filter(Boolean).join(" · "),
      lieu: run.lieu || "",
    });
    Portrait.showPreview(
      MapGen.dataUrl(svg),
      `Plan tactique — ${run.lieu || "lieu inconnu"}`,
    );
  },

  /** VIS-16 étape 2b — plan de lieu PROCÉDURAL d'une SCÈNE (nœud `Dossiers`).
      Lu/écrit SUR LE NŒUD (`lieu`/`mapSeed`), pas dans `gen_runs` (verrou B :
      les refs de scène vivent sur le nœud ; `gen_runs` reste le topos du run).
      Réutilise MapGen + Portrait comme `showMap`. Demande le lieu la 1ʳᵉ fois,
      puis le mémorise (régénération déterministe ensuite). Aucune dépendance au
      topos : `MapGen` défaute à « corpo » et lit les mots-clés du lieu. */
  showSceneMap(sceneId) {
    const node = typeof Dossiers !== "undefined" ? Dossiers.get(sceneId) : null;
    if (!node) return;
    const render = (lieu) => {
      node.lieu = lieu;
      if (!node.mapSeed) node.mapSeed = Utils.uid();
      Dossiers.save();
      const accent =
        (App.editionModule && App.editionModule.mapAccent) || "#35e0e6";
      const svg = MapGen.build({
        siteType: node.siteType,
        seed: node.mapSeed,
        accent,
        title: lieu,
        subtitle: node.name,
        lieu,
      });
      Portrait.showPreview(MapGen.dataUrl(svg), `Plan — ${lieu}`);
    };
    if (node.lieu) return render(node.lieu);
    Dialog.prompt({
      title: "Lieu de la scène",
      label: "Où se passe cette scène ?",
      placeholder: "ex. entrepôt d'Ares, boîte de nuit, host de Renraku…",
      confirmLabel: "Générer le plan",
    }).then((v) => {
      if (v && v.trim()) render(v.trim());
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
