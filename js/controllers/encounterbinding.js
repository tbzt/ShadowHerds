"use strict";

/* ============================================================
   ENCOUNTER BINDING — délégation d'évènements du tracker.
   Sortie d'encounter.js, qui cumulait persistance, règles,
   composition de scène ET câblage DOM. Ici le seul câblage :
   ni règle, ni état — tout repasse par Encounter.

   L'amorçage reste ICI plutôt que dans app.js : ce listener
   doit être posé AVANT celui que Servers._wire() attache au
   même nœud (voir la note de propagation dans bindDelegation).
   C'est l'ordre des <script> d'index.html qui le garantit, ce
   fichier suivant immédiatement encounter.js.
   ============================================================ */
import { CardPeek } from "../widgets/card/cardpeek.js";
import { Dialog } from "../widgets/kit/dialog.js";
import { Dice } from "../rules/dice.js";
import { DiceRoller } from "../widgets/dice/diceroller.js";
import { Encounter } from "./encounter.js";
import { EncounterDrag } from "./encounterdrag.js";
import { EncounterRenderer } from "../widgets/play/encounterrenderer.js";
import { Intrusion } from "./intrusion.js";
import { Matrix } from "../rules/matrix.js";
import { PnjLookup } from "./pnjlookup.js";
import { Pursuit } from "./pursuit.js";
import { RovingGroup } from "../widgets/kit/rovinggroup.js";
import { Servers } from "./servers.js";
import { Storage } from "../core/storage.js";
import { Utils } from "../core/utils.js";

export const EncounterBinding = {
  /** Délégation globale, scopée au conteneur (jamais recréé — modèle
      EditModal.init() : seul le contenu de #encounter-list change). */
  bindDelegation() {
    const overlay = document.getElementById("encounter-overlay");
    if (!overlay) return;

    EncounterDrag.init(overlay);

    // Le tiroir Matrice est hors de #encounter-overlay (overlay séparé,
    // cf. index.html) — Servers._wire() y pose sa propre délégation pour le
    // contenu réutilisé d'intrusionPanel ; ici seulement les actions
    // propres à Encounter (fermer, délier, lancer une CI). Le même
    // contenu est aussi monté dans la colonne dockée (#encounter-matrix-dock,
    // ≥1100px) — même handler sur les deux montages, mais cette fois nichée
    // DANS #encounter-overlay (contrairement au tiroir, overlay séparé) : un
    // clic y bulle jusqu'au switch de combat plus bas (data-action homonymes,
    // ex. « next-turn » = tour d'INTRUSION ici, tour de combat là-bas). Un
    // garde-fou sur e.target ne suffit pas : Intrusion.nextTurn (via
    // Servers._wire, attaché sur ce même nœud) ré-écrit dockBody.innerHTML de
    // façon synchrone AVANT que la bulle n'atteigne #encounter-overlay,
    // détachant e.target — closest() y échouerait silencieusement. On coupe
    // donc la propagation ici, en premier (EncounterBinding.bindDelegation
    // tourne avant Servers._wire — amorçage au DOMContentLoaded contre appel
    // paresseux depuis Servers.initPanel() — donc ce listener est posé, et
    // s'exécute, avant le sien sur le même nœud).
    const drawerActions = (e) => {
      e.stopPropagation();
      // A5 — clic sur un nœud de la mini-carte topologie : afficher ce serveur
      // (même geste que l'ancien sélecteur switch-matrix-server).
      const node = e.target.closest("[data-node]");
      if (node) {
        Encounter.linkServer(node.dataset.node);
        return;
      }
      const el = e.target.closest("[data-action]");
      if (!el) return;
      switch (el.dataset.action) {
        case "close-matrix-drawer":
          Encounter.closeMatrixDrawer();
          break;
        case "unlink-server":
          Encounter.unlinkServer();
          break;
        case "launch-ic":
          // « ⚔ Init » d'une CI du tiroir → elle rejoint l'ordre.
          // Les autres data-action du tiroir (next-turn, ic-box…) sont
          // gérées par la délégation de Servers._wire (contenu réutilisé).
          Encounter.launchIC(el.dataset.id, el.dataset.k);
          break;
      }
    };
    // A5 — activation clavier d'un nœud de la mini-carte (role=button focusable).
    const drawerKeys = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const node = e.target.closest && e.target.closest("[data-node]");
      if (!node) return;
      e.preventDefault();
      e.stopPropagation();
      Encounter.linkServer(node.dataset.node);
    };
    const matrixDrawer = document.getElementById("matrix-drawer-overlay");
    if (matrixDrawer) {
      matrixDrawer.addEventListener("click", drawerActions);
      matrixDrawer.addEventListener("keydown", drawerKeys);
    }
    const matrixDock = document.getElementById("encounter-matrix-dock");
    if (matrixDock) {
      matrixDock.addEventListener("click", drawerActions);
      matrixDock.addEventListener("keydown", drawerKeys);
    }

    overlay.addEventListener("click", (e) => {
      // La poignée n'a pas de data-action propre : sans cette garde, un clic
      // dessus remonterait à .encounter-nrow (data-action="narrative-toggle")
      // et basculerait « a joué » à chaque glisser en mode narratif.
      if (e.target.closest(".encounter-drag-handle")) return;
      // CardMenu gère l'ouverture du ⋯ (délégation document) et ne coupe pas la
      // propagation : sans cette garde, ouvrir le ⋯ bulle jusqu'à la ligne
      // (focus-active en narratif) — double action parasite.
      if (e.target.closest("[data-card-menu-toggle]")) return;
      // Les clics dans la colonne Matrice dockée n'atteignent jamais ce
      // switch — drawerActions (posé sur #encounter-matrix-dock) coupe la
      // propagation avant qu'elle ne bulle jusqu'ici (cf. son commentaire).
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const id = el.dataset.id;
      switch (el.dataset.action) {
        case "encounter-close":
          Encounter.close();
          break;
        case "roll-all-init":
          Encounter.rollAllInit();
          break;
        case "roll-and-sort":
          Encounter.rollAndSort();
          break;
        case "toggle-add-picker":
          Encounter.toggleAddPicker();
          break;
        case "toggle-rail": {
          // Bascule réglette compacte / liste complète — état de vue
          // éphémère (comme le menu ⋯ .card-menu[hidden]), pas de nouvelle clé Storage.
          const modal = document.querySelector(".encounter-modal");
          if (modal) modal.classList.toggle("rail-compact");
          break;
        }
        /* ---- ⇉ Course-poursuite (lot P2) ----
           Tout est délégué à `Pursuit`, qui mute l'état de scène et
           persiste : ce switch ne fait qu'aiguiller, comme pour la
           Matrice. Les libellés des positions viennent de l'édition, pas
           d'ici. */
        case "chase-open":
          Pursuit.open({});
          break;
        case "chase-close":
          Pursuit.close();
          break;
        case "chase-terrain":
          Pursuit.setTerrain(el.dataset.key);
          break;
        case "chase-env":
          Pursuit.setEnv(el.dataset.key);
          break;
        case "chase-target":
          Pursuit.setTarget(el.dataset.id);
          break;
        case "chase-move":
          Pursuit.move(el.dataset.id, parseInt(el.dataset.delta, 10) || 0);
          break;
        /* L'ancre n'a pas de bande : son déplacement recule tous les autres
           (lot A). Un geste distinct parce que ce n'est pas le même verbe. */
        /* Lot I′ — bordereau du Score de Surveillance. Le bouton vit dans la
           CONSOLE (#encounter-active-card), que la délégation de `Servers` ne
           couvre pas : il se câble donc ici, où le tracker est déjà bindé,
           plutôt qu'en posant un second écouteur sur l'overlay. */
        case "ss-illegal":
          Intrusion.logIllegal(el.dataset.id, el.dataset.key);
          break;
        case "chase-move-anchor":
          Pursuit.moveAnchor(parseInt(el.dataset.delta, 10) || 0);
          break;
        case "chase-test":
          Pursuit.cycleTest(el.dataset.id);
          break;
        /* ⚄ du round : l'app lance quand elle tient la réserve (PNJ), le MJ
           pointe quand c'est au joueur d'annoncer (PJ) — cf. Pursuit.testOrRoll. */
        case "chase-roll":
          Pursuit.testOrRoll(el.dataset.id);
          break;
        case "chase-fail":
          Pursuit.rollFail(el.dataset.id);
          break;
        case "chase-grant":
          Pursuit.grantEdge(el.dataset.id);
          break;
        case "chase-pool":
          Pursuit.addPool(el.dataset.id, parseInt(el.dataset.delta, 10) || 0);
          break;
        case "chase-undo-round":
          Pursuit.undoRound();
          break;
        /* Les 14 actions d'Atout de poursuite : leur feuille, et leur dépense
           — déléguée au débit déjà écrit (F5d), pas réécrite. */
        case "chase-mode":
          Pursuit.setMode(el.dataset.key);
          break;
        case "chase-total":
          Pursuit.setTotal(parseInt(el.dataset.delta, 10) || 0);
          break;
        case "chase-settings":
          Pursuit.toggleSettings();
          break;
        case "chase-sheet":
          Pursuit.toggleSheet(el.dataset.id);
          break;
        case "chase-use":
          Pursuit.useEdgeAction(el.dataset.id, el.dataset.key);
          break;
        case "chase-edge":
          Pursuit.toggleEdgeUp(el.dataset.id);
          break;
        case "chase-attr":
          Pursuit.promptAttr(el.dataset.id);
          break;
        case "chase-drop":
          Pursuit.drop(el.dataset.id, el.dataset.reason);
          break;
        case "chase-restore":
          Pursuit.restore(el.dataset.id);
          break;
        case "chase-fill":
          Pursuit.fill(el.dataset.key);
          break;
        /* ---- Équipages (lot P6) ----
           `data-id` porte ici un **pnjId**, pas une clé de piste : monter,
           conduire et descendre sont des gestes de personne. Tout ce qui
           touche à la POSITION (déplacement, test, sortie) porte au contraire
           la clé de piste, qui est celle de l'engin dès qu'on est monté. */
        case "chase-board":
          Pursuit.promptRide(el.dataset.id);
          break;
        case "chase-wheel":
          Pursuit.takeWheel(el.dataset.id);
          break;
        case "chase-leave":
          Pursuit.disembark(el.dataset.id);
          break;
        case "chase-arrive":
          // Arriver tout de suite au bout d'un franchissement (Anarchy) :
          // le livre laisse un point d'Anarchy l'accélérer, l'app exécute
          // l'arbitrage du MJ, elle ne dépense rien d'elle-même.
          Pursuit.arriveNow(id);
          break;
        case "chase-end-round":
          Pursuit.endRound();
          break;
        case "toggle-scene-type":
          Encounter.toggleSceneType();
          break;
        case "edge-step":
          // ±1 Atout du combattant actif (SR6).
          Encounter.adjustEdge(id, parseInt(el.dataset.delta, 10) || 0);
          break;
        case "anarchy-step":
          // ±1 Point d'Anarchy de scène du combattant actif (Anarchy 2.0).
          Encounter.adjustAnarchyPoints(id, parseInt(el.dataset.delta, 10) || 0);
          break;
        case "anarchy-credit":
          // Crédite en une fois les Points d'Anarchy de scène octroyés par
          // les atouts/drogues actives (idempotent, geste manuel du MJ).
          Encounter.creditAnarchyScene(id);
          break;
        case "narration-bonus":
          // Bascule le bonus « +1 action par narration » pour le tour en
          // cours (Anarchy 2.0, geste manuel du MJ).
          Encounter.grantNarrationAction(id);
          break;
        case "roll-ic": {
          // Jet d'une CI (attaque/défense/encaissement/perception) depuis la
          // fiche CI active ou la console de réaction — même moteur, réserve
          // partagée (Matrix.icCombat), aucun calcul dupliqué. Ces boutons
          // vivent dans #encounter-overlay, hors de la délégation #app de
          // Servers._wire → câblés ici. CI autonome (VIS-10) : `data-id` est
          // l'id du combattant (jet local, pas de serveur à interroger) ; CI
          // liée : `data-id` est l'id du serveur (chemin tiroir Intrusion).
          const cIC = Encounter._find(el.dataset.id);
          if (cIC && cIC.kind === "matrix" && cIC.matrix && !cIC.matrix.serverId)
            Encounter._rollBareIC(cIC, el.dataset.kind);
          else Intrusion.rollIC(el.dataset.id, el.dataset.k, el.dataset.kind);
          break;
        }
        case "ic-box":
          // Case du moniteur d'une CI (fiche active) — VIS-10 : autonome ou
          // liée, `icBox` route vers la bonne source d'état.
          Encounter.icBox(el.dataset.id, parseInt(el.dataset.n, 10) || 0);
          break;
        case "react-expand":
          // Ouvre la fiche du PNJ en coup d'œil (CardPeek : overlay, swipe,
          // prev/next) plutôt qu'un accordéon vers le bas — même geste que dans
          // Jouer. Frères = les PNJ de la console, pour feuilleter le casting.
          CardPeek.open(id, { siblings: Encounter._reactSiblings(), view: "combat" });
          break;
        case "full-defense":
          // Défense totale (SR5/SR6) : déclarée pour le round, motorise le coût
          // d'initiative de l'édition (−10 SR5). Édition-neutre (fullDefenseFor).
          Encounter.fullDefense(id);
          break;
        case "react-counterspell-toggle":
          // F6b — le ✦ déplie les USAGES du Contresort. Deux, dans les deux
          // éditions, et ils ne roulent pas le même test : un bouton unique
          // aurait menti sur ce que le livre décrit.
          EncounterRenderer.toggleReactCounterspell(id);
          break;
        case "react-counterspell":
          // Un usage à JET. Le jet part par la délégation de DiceRoller
          // (`data-roll` sur le même bouton) ; ici on ne fait que DÉBITER, comme
          // le tir débite son action à part du jet. Édition-neutre : c'est le
          // contrat qui dit s'il y a quelque chose à payer (SR5 : rien).
          Encounter.counterSpell(id);
          break;
        case "counterspell-step":
          // La RÉSERVE de défense contre sorts (SR5) : des dés qu'on alloue,
          // qu'on ne lance pas. Cf. `counterspellStep`.
          Encounter.counterspellStep(id, Number(el.dataset.delta) || 0, Number(el.dataset.max) || 0);
          break;
        case "react-interrupt-toggle":
          // E4 — le ⛨ déplie la feuille des interruptions quand l'édition en a
          // plusieurs (SR5). En SR6 ce cas n'existe pas : le bouton porte
          // directement `full-defense`.
          EncounterRenderer.toggleReactInterrupt(id);
          break;
        case "react-interrupt":
          Encounter.useInterrupt(id, el.dataset.key);
          EncounterRenderer.toggleReactInterrupt(id, true);
          break;
        case "trade-action":
          // E5 — échange majeure↔mineures (SR6 p.42), lu sur le contrat.
          Encounter.tradeAction(id, el.dataset.key);
          break;
        case "reset-trades":
          Encounter.resetTrades(id);
          break;
        case "count-defense":
          // E4 — porté par le MÊME bouton que le jet de défense : DiceRoller
          // lance (délégation document), Encounter compte (délégation overlay).
          // Le malus de la défense suivante apparaît au rendu qui suit.
          Encounter.countDefense(id);
          break;
        case "react-damage-toggle":
          // Déplie/replie les chips de dégâts d'une ligne de réaction OU d'une
          // ligne de la file (D6 : le ✸ vit aussi au menu ⋯ / barre de l'actif).
          // Le bouton cliqué est passé : la feuille se cherche AUTOUR de lui
          // (Sheets → Utils.nearest), jamais « la première du document ».
          EncounterRenderer.toggleReactDamage(id, false, el);
          break;
        case "damage-type-toggle":
          // Bascule Physique/Étourdissant (SR5/SR6 séparé) avant d'appliquer
          // un chip — vue seulement, aucune mutation du PNJ.
          EncounterRenderer.toggleDamageType(id);
          break;
        case "react-damage":
          // Applique un résultat NET de dégâts (chip) au moniteur —
          // conditionMonitor.applyDamage lu via Encounter, jamais de calcul ici.
          Encounter.damageCombatant(id, parseInt(el.dataset.n, 10) || 0, {
            type: EncounterRenderer.reactDamageType(id),
          });
          EncounterRenderer.toggleReactDamage(id, true);
          break;
        case "react-wound":
          // Anarchy 2 — un cran de gravité, pas un nombre de cases.
          Encounter.damageCombatant(id, 1, { severity: el.dataset.sev });
          EncounterRenderer.toggleReactDamage(id, true);
          break;
        case "target-device":
          // Désigne une arme comme cible matricielle (brickable).
          Encounter.targetDevice(id, el.dataset.label);
          break;
        case "untarget-device":
          Encounter.untargetDevice(id, el.dataset.label);
          break;
        case "reenable-device":
          Encounter.reenableDevice(id, el.dataset.label);
          break;
        case "device-box":
          // Case du moniteur d'un appareil (SR5/SR6).
          Encounter.deviceBox(id, el.dataset.label, parseInt(el.dataset.idx, 10) || 0);
          break;
        case "device-rating-step":
          // ±1 Indice d'appareil (patron edge-step, pas de saisie clavier).
          Encounter.deviceRatingStep(id, el.dataset.label, parseInt(el.dataset.delta, 10) || 0);
          break;
        case "device-narrative-toggle":
          // Anarchy 2 — bascule « hors service » en un tap (régime narratif).
          Encounter.deviceNarrativeToggle(id, el.dataset.label);
          break;
        case "device-protect": {
          // Désigne le decker protecteur — lit le <select> voisin (même
          // rangée), jamais un data-* mutable au clic (valeur choisie à l'instant).
          // targetDevice d'abord (idempotent) : en narratif (A2), protéger une
          // arme peut être le tout premier geste sur elle, avant tout brickage —
          // pas de bouton "Bricker" séparé dans la bande narrative.
          const sel = el.closest(".encounter-device-protect")?.querySelector("select");
          Encounter.targetDevice(id, el.dataset.label);
          Encounter.setDeviceProtector(id, el.dataset.label, sel && sel.value);
          break;
        }
        case "device-unprotect":
          Encounter.setDeviceProtector(id, el.dataset.label, null);
          break;
        case "device-defense": {
          // Jet de défense protégée (SR5/SR6 : Indice + Firewall du
          // protecteur ; A2 : Protection active, Firewall+Logique). Le MJ
          // interprète/retranche avant de cliquer les cases — jamais résolu
          // ici, même philosophie que le reste du cockpit.
          const pnj = PnjLookup.find(id);
          const c = Encounter._find(id);
          const d = c && c.devices && c.devices[el.dataset.label];
          const protector = d && d.protectorId && PnjLookup.find(d.protectorId);
          if (!pnj || !d || !protector) break;
          const mode = Matrix.use(pnj.edition).deviceBricking();
          const roll =
            mode === "narrative"
              ? Cyberdeck.rollProtectActive(protector)
              : Cyberdeck.rollDefense(d.indice, protector.cyberdeck);
          const res = Dice.computeRoll(Encounter._noisyPool(roll.pool));
          DiceRoller.show(res, { label: `${roll.label} — ${protector.name} protège ${pnj.name}`, who: protector.name });
          break;
        }
        case "decker-attack": {
          // Decker↔decker — attaquer un autre decker, c'est attaquer son
          // propre pnj.cyberdeck (déjà modélisé). Aucune donnée neuve : le
          // MJ encaisse en cliquant les cases du moniteur du decker CIBLÉ,
          // déjà affiché sur sa propre carte (toggle-deck-monitor).
          const sel = el.closest(".encounter-duel")?.querySelector("select");
          const targetId = sel && sel.value;
          const pnj = PnjLookup.find(id);
          const target = targetId && PnjLookup.find(targetId);
          const atk = pnj && Cyberdeck.rollAttack(pnj.edition, pnj.cyberdeck);
          if (!target || !atk) break;
          const res = Dice.computeRoll(Encounter._noisyPool(atk.pool));
          DiceRoller.show(res, { label: `${atk.label} — ${pnj.name} vs ${target.name} (decker)`, who: pnj.name });
          break;
        }
        case "noise-step":
          // ±1 Bruit (SR5 p.232) — modificateur de scène réglé à la
          // main (distance/environnement non trackés par l'app).
          Encounter.stepNoise(parseInt(el.dataset.delta, 10) || 0);
          break;
        case "action-set":
          // Consomme/rend une action du tour actif (jeton tappable).
          Encounter.setAction(id, el.dataset.key, parseInt(el.dataset.idx, 10) || 0);
          break;
        case "action-sheet":
          // F1 — déplie la feuille des actions nommées (patron `status-sheet`).
          EncounterRenderer.toggleActionSheet(id, el);
          break;
        case "action-more":
          EncounterRenderer.toggleActionRest(el);
          break;
        case "edge-use":
          // F5 — déclare une action d'Atout : elle se paie en Atout, pas en jetons.
          Encounter.useEdgeAction(id, el.dataset.key);
          break;
        case "edge-context":
          Encounter.toggleEdgeContext(id, el.dataset.key);
          break;
        case "edge-optional":
          Encounter.toggleEdgeOptional(id);
          break;
        case "action-use":
          // F1 — joue une action du catalogue : elle débite son propre coût.
          // Haptique au SITE DE DISPATCH et non dans `useAction`, que `fire`,
          // `reloadWeapon` et `resolveAttack` appellent aussi en silencieux :
          // seul le geste délibéré du MJ vibre.
          Utils.haptic(12);
          Encounter.useAction(id, el.dataset.key);
          break;
        // F5h — `ammo-fire`, `ammo-modes` et `ammo-reload` ont été retirés :
        // plus aucun rendu ne les émettait depuis que la rangée de munitions a
        // quitté le cockpit (F5c), et `ammo-modes` appelait en prime une
        // fonction disparue — il aurait levé une TypeError s'il avait été
        // atteint. Leurs métiers ont un chemin vivant : `fire` par
        // `resolveAttack`, `reloadWeapon` par le hook `onReload` du panneau.
        // Les deux commandes de RECUL, elles, n'en avaient aucun : elles sont
        // reparties dans le panneau pré-jet (hooks `onRecoilStock`/
        // `onRecoilReset`), seul endroit où le badge ↯ se lit encore.
        case "threat-step":
          // ±1 Réserve de menace (Anarchy) — mute la source unique
          // DiceRoller (le badge topbar et le miroir cockpit se synchronisent).
          DiceRoller.stepThreat(parseInt(el.dataset.delta, 10) || 0);
          break;
        case "threat-reset":
          DiceRoller.resetThreat();
          break;
        case "add-candidate":
          Encounter.add(id);
          Encounter._renderPicker();
          break;
        case "add-pj":
          Encounter.addPJ();
          break;
        case "add-adhoc":
          Encounter.addAdhoc();
          break;
        case "add-ic":
          // VIS-10 — ajoute une CI autonome (deux dialogues : type, indice).
          Encounter.promptAddIC();
          break;
        case "add-team":
          Encounter.addTeam();
          break;
        case "link-server":
          // Porte 1 (picker) : lie un serveur à la scène, remplace
          // aucun combattant — même panneau, destination différente.
          Encounter.linkServer(id);
          Encounter._renderPicker();
          break;
        case "clear-picker-filter": {
          // D8 : le filtre du picker retombant à zéro résultat n'offrait
          // aucun recours (même trou que Hub/Collection, mesuré au plan) —
          // même geste, DOM différent (masquage style.display, pas de
          // re-render complet) : vider le champ visible ET l'état interne
          // d'EncounterRenderer, sans reconstruire le panneau.
          const input = document.querySelector('[data-action="filter-candidates"]');
          if (input) input.value = "";
          EncounterRenderer.filterCandidates("");
          break;
        }
        case "toggle-matrix-drawer":
          Encounter.toggleMatrixDrawer();
          break;
        case "next-turn":
          Encounter.nextTurn();
          break;
        case "next-round":
          Encounter.nextRound();
          break;
        case "clear-encounter":
          Encounter.clear();
          break;
        case "narrative-toggle": {
          // Ligne narrative : ✓/pastille = bascule « a joué » (grise / rallume).
          const c = Encounter._find(id);
          if (c) Encounter.markActed(id, !c.hasActed);
          break;
        }
        case "focus-active":
          // Volet B : tap sur une ligne narrative = met ce combattant en focus
          // → sa fiche + budget d'actions (ou console de réaction si PJ)
          // s'affichent dans #encounter-active-card. Persisté (state.focusId)
          // pour survivre à un F5 et se propager à l'écran spectateur via
          // l'event "storage" (_commit, pas juste _render) ; render() clampe
          // si le combattant disparaît.
          EncounterRenderer._narrativeFocusId = id;
          Encounter.state.focusId = id;
          Encounter._commit();
          break;
        case "toggle-acted": {
          // Ordonné : bascule « a joué » depuis le menu ⋯ (jeton ✓/↩). La
          // case à cocher native a été retirée (elle sur-pondérait une action
          // rare, déjà automatisée par « Tour suivant ») ; le grisé de ligne
          // reste l'indicateur passif. Bouton → switch click (plus la branche
          // 'change' de l'ancienne checkbox).
          const c = Encounter._find(id);
          if (c) Encounter.markActed(id, !c.hasActed);
          break;
        }
        case "init-step":
          // Stepper ±1 de l'initiative (Vague B).
          Encounter.adjustInit(id, parseInt(el.dataset.delta, 10) || 0);
          break;
        case "note-toggle": {
          // Révèle le champ de note (masqué quand vide) et y met le focus.
          const row = el.closest(".encounter-row");
          if (row) {
            row.classList.add("note-open");
            const inp = row.querySelector(".encounter-note");
            if (inp) inp.focus();
          }
          break;
        }
        case "roll-init":
          Encounter.rollInit(id);
          break;
        case "move-up":
          Encounter.moveUp(id);
          break;
        case "move-down":
          Encounter.moveDown(id);
          break;
        case "remove-combatant":
          Encounter.remove(id);
          break;
        case "flee-combatant":
          // Raccourci du drapeau « devrait fuir » : bascule hors de combat en
          // un tap (comme knockOut), réversible — pas un retrait définitif
          // (le combattant qui fuit sort de la mêlée, il n'est
          // pas rayé de la scène).
          Encounter.knockOut(id);
          break;
        case "heal-combatant":
          Encounter.healCombatant(id);
          break;
        case "knockout-combatant":
          Encounter.knockOut(id);
          break;
        case "banish-combatant":
          // Renvoi hostile (T6b) depuis la cible : l'esprit est connu, on
          // choisit le magicien qui bannit (SummonPanel gère le picker + jet).
          SummonPanel.openDismiss("spirit", { targetId: id });
          break;
        case "decompile-combatant":
          SummonPanel.openDismiss("sprite", { targetId: id });
          break;
        case "delay-combatant":
          Encounter.delayCombatant(id);
          break;
        case "act-now-combatant":
          Encounter.actNow(id);
          break;
        case "heal-all":
          Encounter.healAll();
          break;
        case "group-status":
          // E6 — pose de groupe : acte de SCÈNE, d'où son entrée ici et pas
          // sur la fiche, qui garde son geste unitaire inchangé.
          Encounter.openGroupStatus();
          break;
        case "scene-matrix":
          // C-020 — porte de scène vers la Matrice : un serveur déjà lié
          // ouvre directement son tiroir (1 geste) ; sinon on ouvre le
          // panneau d'ajout pour en lier un, ce qui rouvre le tiroir tout
          // seul via linkServer (2 gestes, contre 4 en passant par l'ancien
          // seul chemin, le tiroir d'ajout non annoncé).
          if (Encounter.state.serverId) Encounter.openMatrixDrawer();
          else Encounter.toggleAddPicker();
          break;
        case "focus-combatant":
          Encounter.focusCombatant(id);
          break;
      }
    });

    overlay.addEventListener("change", (e) => {
      // Initiative saisie inline dans la ligne (remplace l'ancien prompt) :
      // 'change' plutôt que 'input' — la valeur n'est committée qu'au blur/
      // Entrée, donc le re-rendu de _commit ne casse pas la frappe en cours.
      // (« a joué » ne passe plus par ici : c'est un bouton du switch click,
      // plus une checkbox.)
      const init = e.target.closest('[data-action="set-init"]');
      if (init) Encounter.setInit(init.dataset.id, init.value);
    });

    // Rafale d'init après « + Équipe » — Entrée commit (blur → 'change'
    // ci-dessus, synchrone) puis enchaîne sur le prochain champ d'init PJ
    // vide (setTimeout 0 : laisse _commit()/_render() reconstruire le DOM
    // avant de chercher le prochain champ).
    overlay.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const input = e.target.closest('.encounter-init-val[data-pj="1"]');
      if (!input) return;
      e.preventDefault();
      input.blur();
      setTimeout(() => EncounterRenderer.focusNextPJInit(), 0);
    });

    overlay.addEventListener("input", (e) => {
      const note = e.target.closest('[data-action="set-note"]');
      if (note) {
        Encounter.setNote(note.dataset.id, note.value);
        // La même note existe en double (ligne dépliée + fiche active) —
        // on garde l'autre champ en phase sans re-rendu complet (qui casserait
        // le focus/curseur de la saisie en cours, cf. setNote).
        document
          .querySelectorAll(`[data-action="set-note"][data-id="${note.dataset.id}"]`)
          .forEach((el) => {
            if (el !== note) el.value = note.value;
          });
        return;
      }
      const filter = e.target.closest('[data-action="filter-candidates"]');
      if (filter) EncounterRenderer.filterCandidates(filter.value);
    });

    // Raccourcis clavier du tracker, actifs seulement overlay ouvert.
    // En capture pour passer AVANT les raccourcis globaux d'app.js — sinon
    // « r » y déclenche le lanceur de dés au lieu de relancer l'init.
    // Garde-fous : jamais pendant une saisie (champ init/note) ni quand un
    // Dialog est ouvert par-dessus. Échap n'est pas capté ici : il retombe
    // sur le handler global d'app.js, qui ferme l'overlay.
    document.addEventListener(
      "keydown",
      (e) => {
        if (!overlay.classList.contains("open")) return;
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const dlg = document.getElementById("dialog-overlay");
        if (dlg && dlg.classList.contains("open")) return;

        // Les jetons d'action passent AVANT les raccourcis du tracker. Sans
        // cette priorité, Espace déclencherait « tour suivant » et les flèches
        // déplaceraient le combattant actif alors que le focus est sur un
        // jeton : le clavier ferait autre chose que ce qu'il montre.
        // ↑ ↓ restent donc à la file d'init — d'où `orientation: "horizontal"`.
        const tok = e.target.closest && e.target.closest(".action-token");
        if (tok) {
          const grp = { container: ".action-tokens", selector: ".action-token", orientation: "horizontal" };
          if (e.key === " " || e.key === "Enter") {
            const { id, key, idx } = tok.dataset;
            Encounter.setAction(id, key, parseInt(idx, 10) || 0);
            // Le groupe a été réécrit en entier : le nœud focalisé n'existe
            // plus. `refocus` retrouve son jumeau et ré-arme le groupe ENTIER
            // — le rendu vient de replacer son propre tab stop ailleurs, et
            // poser le nôtre sans retirer celui-là ferait deux arrêts.
            RovingGroup.refocus(
              `.action-token[data-id="${id}"][data-key="${key}"][data-idx="${idx}"]`,
              grp,
            );
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
          }
          if (RovingGroup.key(e.key, tok, grp)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
          }
        }

        let handled = true;
        switch (e.key) {
          case " ":
          case "n":
          case "N":
            Encounter.nextTurn();
            break;
          case "r":
          case "R":
            Encounter.rollAndSort();
            break;
          case "ArrowUp":
            Encounter.moveActive(-1);
            break;
          case "ArrowDown":
            Encounter.moveActive(1);
            break;
          default:
            handled = false;
        }
        if (handled) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
  },
};

/* Auto-init APRÈS le reste des scripts. Ne pas tester
   `readyState === "loading"` : il vaut déjà "interactive" quand les
   scripts différés s'exécutent, l'init partirait trop tôt.
   DOMContentLoaded ne se déclenche qu'une fois TOUS exécutés. */
if (document.readyState === "complete") {
  EncounterBinding.bindDelegation();
} else {
  document.addEventListener("DOMContentLoaded", () => EncounterBinding.bindDelegation(), { once: true });
}

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.EncounterBinding = EncounterBinding;
