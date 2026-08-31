"use strict";

/* ============================================================
   CARD DELEGATION — délégation d'évènements des cartes PNJ/PJ.

   Sortie de cardrenderer.js pour la même raison qu'encounter :
   un fichier de rendu n'a pas à porter aussi son câblage. Le
   rendu reste dans CardRenderer, ici seulement les écouteurs.

   ⚠ Ce module IMPORTE CardRenderer, il ne le redéfinit pas. Les
   cinq corps de carte par édition (cardrenderer.sr5/sr6/anarchy…)
   font `Object.assign(CardRenderer, …)` sur le global : recréer
   ici un second objet donnerait un singleton que ces cinq-là
   n'auraient jamais complété. Même patron que cardpeek.js.
   ============================================================ */
import { CardRenderer } from "./cardrenderer.js";
import { Resonance } from "../../rules/resonance.js";
import { RovingGroup } from "../kit/rovinggroup.js";
import { Sheets } from "../kit/sheets.js";
import { UI } from "../kit/ui.js";
import { Utils } from "../../core/utils.js";

export const CardDelegation = {
  _delegated: false,
  bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;
    document.addEventListener("click", (e) => {
      // CO-b (carte Contact) : ferme tout menu « Lier un PJ » ouvert au clic
      // en dehors de son wrap (pas de backdrop : la fiche reste manipulable).
      // Fait avant le switch pour ne pas court-circuiter un clic sur un item
      // du menu (ex-`ContactRenderer.bindDelegation`).
      if (!e.target.closest(".contact-pjlink-wrap")) {
        document
          .querySelectorAll(".contact-pjlink-menu:not([hidden])")
          .forEach((m) => (m.hidden = true));
      }

      const actionEl = e.target.closest("[data-action]");
      if (!actionEl) return;
      const id = actionEl.dataset.id;
      switch (actionEl.dataset.action) {
        case "focus-owner":
          UI.focusOwner(id);
          break;
        case "deploy-vehicle":
          UI.deployVehicle(id, Number(actionEl.dataset.idx));
          break;
        case "toggle-service":
          SummonPanel.toggleService(id, Number(actionEl.dataset.idx));
          break;
        case "toggle-armor":
          UI.toggleArmorOption(id, Number(actionEl.dataset.idx));
          break;
        case "open-summon":
          // Rail unique paramétré par kind (esprit | sprite) — un seul panneau,
          // vocabulaire distinct lu au contrat (arbitrage Canon, T3b).
          SummonPanel.open(id, actionEl.dataset.kind || "spirit");
          break;
        case "open-dismiss":
          // Renvoi hostile (T6b) : depuis la carte du lanceur → choisir la
          // cible. `id` = lanceur ; kind esprit (bannir) | sprite (décompiler).
          SummonPanel.openDismiss(actionEl.dataset.kind || "spirit", { casterId: id });
          break;
        case "toggle-spirit-bind":
          SummonPanel.toggleBind(id);
          break;
        case "toggle-sprite-task":
          SummonPanel.toggleTask(id, Number(actionEl.dataset.idx));
          break;
        case "toggle-monitor":
          UI.toggleMonitor(id, actionEl.dataset.sev, Number(actionEl.dataset.idx));
          break;
        case "essence-drain":
          UI.promptEssenceDrain(id);
          break;
        case "essence-step":
          // Drain d'Essence, pose d'implant : le geste de jeu (D2b). Le pas
          // fractionnaire du cyberware passe par l'éditeur de fiche.
          UI.stepEssence(id, Number(actionEl.dataset.delta));
          break;
        case "toggle-deck-monitor":
          // Case du moniteur matriciel du deck (pnj.cyberdeck.filled),
          // distinct de toggle-monitor (champs top-level pnj.*Filled).
          UI.toggleDeckMonitor(id, Number(actionEl.dataset.idx));
          break;
        case "deck-realloc":
          // Réallocation ASDF/ACTF en un tap (SR5 action gratuite, SR6
          // action mineure — cf. Cyberdeck.reallocatable/cyberdeckModel).
          UI.reallocDeck(id, actionEl.dataset.from, actionEl.dataset.to);
          break;
        case "persona-realloc":
          // Réallocation du pool bonus du persona incarné (SR6 — cf.
          // Resonance.redistributable/technoModel).
          UI.reallocPersona(id, actionEl.dataset.from, actionEl.dataset.to);
          break;
        case "deck-open-matrix": {
          // Ouvre le tracker Matrice du serveur ciblé par ce decker —
          // en scène si ce serveur y est déjà lié (reste dans le tracker de
          // combat), sinon via le panneau Serveurs (hors combat comme en
          // combat sur un serveur non lié).
          const pnj = PnjLookup.find(id);
          const srv = pnj && DeckRun.targetServer(pnj);
          if (!srv) break;
          // L'état vivant est scène-scopé (Encounter.state.matrix),
          // plus srv.intrusion.
          const intr = typeof Encounter !== "undefined" ? Encounter.intrusionFor(srv.id) : null;
          if (intr) intr.open = true;
          Servers.save();
          Servers.render();
          if (typeof Encounter !== "undefined" && Encounter.state && Encounter.state.serverId === srv.id) {
            Encounter.openMatrixDrawer();
          } else {
            App.showPanel("matrix");
          }
          break;
        }
        case "deck-attack": {
          // Jet de piratage — même forme que Intrusion.rollIC (un seul
          // pool, pas de test opposé calculé ; la formule livre reste à
          // affiner plus tard, cf. Cyberdeck.rollAttack). Bruit de scène
          // retranché si une scène de combat est active (hors combat, pas de
          // Bruit — l'action n'existe pas encore, cf. Encounter._noisyPool).
          const pnj = PnjLookup.find(id);
          const srv = pnj && DeckRun.targetServer(pnj);
          const atk = pnj && Cyberdeck.rollAttack(pnj.edition, pnj.cyberdeck);
          if (!srv || !atk) break;
          const pool = typeof Encounter !== "undefined" ? Encounter._noisyPool(atk.pool) : atk.pool;
          const res = Dice.computeRoll(pool);
          DiceRoller.show(res, { label: `${atk.label} — ${pnj.name} vs ${srv.name}`, who: pnj.name });
          break;
        }
        case "deck-action": {
          // Action matricielle offensive du râtelier (pic de données & co.).
          // Même forme que deck-attack (Dice.computeRoll + DiceRoller.show +
          // Bruit de scène), mais par action nommée, et INDÉPENDANTE de la
          // cible (le serveur visé ne sert plus qu'à nommer la cible dans le
          // label). Une action narrative (pool null, ex. « Pirater la Matrice »
          // en Anarchy) devient un marqueur toast, sans jet de dés. Le MJ garde
          // la main : la VD est affichée, jamais appliquée automatiquement
          // (aucun test opposé auto-résolu).
          const pnj = PnjLookup.find(id);
          if (!pnj) break;
          const act = Cyberdeck.rollAction(pnj.edition, pnj.cyberdeck, actionEl.dataset.key);
          if (!act) break;
          // F6 — le râtelier PAIE ce qu'il joue. Ces quatre lignes lançaient
          // les dés sans toucher au budget d'actions, alors que les mêmes
          // gestes coûtaient une majeure (SR6) ou une complexe (SR5) depuis la
          // feuille. La clé vient du contrat de l'édition (`actionKey`), jamais
          // d'une table codée ici — même patron que `fireModes[].actionKey`.
          if (act.actionKey && typeof Encounter !== "undefined")
            Encounter.useAction(pnj.id, act.actionKey, true);
          const srv = DeckRun.targetServer(pnj);
          const vs = srv ? ` vs ${srv.name}` : "";
          const dvTxt = act.dv != null ? ` (VD ${act.dv})` : "";
          const label = `${act.label}${dvTxt} — ${pnj.name}${vs}`;
          if (act.pool == null) {
            toast(label);
            break;
          }
          const pool = typeof Encounter !== "undefined" ? Encounter._noisyPool(act.pool) : act.pool;
          const res = Dice.computeRoll(pool);
          DiceRoller.show(res, { label, who: pnj.name });
          break;
        }
        case "persona-action": {
          // Action matricielle du technomancien — même forme que deck-action
          // (Dice.computeRoll + DiceRoller.show + Bruit de scène), mais pools
          // tirés du persona vivant (Resonance.rollAction). Actions universelles
          // jouées « par la Résonance » (SR5 p.252) ; VD affichée, jamais
          // appliquée d'office (le MJ tranche le test opposé). Depuis T6a le
          // persona cible un serveur (persona.run, via le picker de sa carte) :
          // le serveur visé ne sert qu'à NOMMER la cible dans le label, comme
          // pour le decker — l'action reste indépendante de la cible.
          const pnj = PnjLookup.find(id);
          if (!pnj) break;
          const act = Resonance.rollAction(pnj, pnj.edition, actionEl.dataset.key);
          if (!act) break;
          // F6 — jumeau du débit de `deck-action`. Le technomancien joue les
          // MÊMES actions matricielles par la Résonance (`Resonance.actions`
          // délègue à `Cyberdeck.actions`), donc le même `actionKey` remonte.
          if (act.actionKey && typeof Encounter !== "undefined")
            Encounter.useAction(pnj.id, act.actionKey, true);
          const srv = DeckRun.targetServer(pnj);
          const vs = srv ? ` vs ${srv.name}` : "";
          const dvTxt = act.dv != null ? ` (VD ${act.dv})` : "";
          const label = `${act.label}${dvTxt} — ${pnj.name}${vs}`;
          if (act.pool == null) {
            toast(label);
            break;
          }
          const pool = typeof Encounter !== "undefined" ? Encounter._noisyPool(act.pool) : act.pool;
          const res = Dice.computeRoll(pool);
          DiceRoller.show(res, { label, who: pnj.name });
          break;
        }
        case "cycle-drug":
          UI.cycleDrug(id, actionEl.dataset.edition, actionEl.dataset.drug);
          break;
        // ÉTATS (E1). Le ✕ est un enfant du tag d'état, mais `closest` remonte
        // au PLUS PROCHE [data-action] : un clic sur le ✕ résout `status-clear`
        // et jamais `status-step`, sans avoir à couper la propagation.
        case "status-clear":
          // Feel (audit « le feel détruit », lot 1/3, 2026-07-31) — aucune des
          // trois mutations d'état ne vibrait : `_afterStatusChange` reconstruit
          // la carte entière (`CardRenderer.refresh`), donc même le flash
          // `:active` natif meurt avec le nœud tapé. Haptique posée au SITE DE
          // DISPATCH, comme `action-use` plus bas — jamais dans
          // `UI.stepStatus`/`setStatus`, qui n'ont aucun moyen de savoir si
          // l'appelant est un geste délibéré du MJ ou une purge de masse
          // (`clearStatuses`, qui ne passe pas par ce dispatch).
          Utils.haptic(10);
          UI.setStatus(id, actionEl.dataset.status, 0);
          break;
        // Poser depuis la feuille et monter d'un cran sur un état déjà posé
        // sont LE MÊME geste : `step` pose le niveau I quand l'état est absent.
        // Deux libellés parce que les deux surfaces sont distinctes, un seul
        // comportement parce qu'il n'y a qu'une règle.
        case "status-set":
        case "status-step":
          Utils.haptic(10);
          UI.stepStatus(id, actionEl.dataset.status);
          break;
        case "status-sheet":
          CardRenderer._toggleStatusSheet(id, actionEl);
          break;
        case "status-more":
          // A1 — mémorisé avec sa feuille (cf. `Sheets`), comme le « tous… »
          // des actions l'était déjà seul : rouvrir le second étage entre deux
          // poses était un tap de trop que la feuille d'actions ne payait pas.
          Sheets.toggleRest(actionEl, ".status-rest");
          break;
        case "generate-portrait":
          Portrait.generateForPnj(id, actionEl);
          break;
        case "edit-open":
          EditModal.open(id);
          break;
        case "dismiss-vehicle":
          UI.dismissVehicle(id);
          break;
        case "dismiss-spirit":
          SummonPanel.dismissSpirit(id);
          break;
        case "dismiss-sprite":
          SummonPanel.dismissSprite(id);
          break;
        case "toggle-sprite-inscribe":
          SummonPanel.toggleInscribe(id);
          break;
        case "toggle-spirit-fold":
          SummonPanel.toggleFold(id);
          break;
        case "save-pnj":
          Shadows.savePNJ(id);
          break;
        case "remove-pnj":
          Shadows.removePNJ(id);
          break;
        case "duplicate-pnj":
          Shadows.duplicatePNJ(id);
          break;
        case "remove-pj":
          Characters.removePJ(id);
          break;
        case "add-to-encounter":
          Encounter.add(id);
          break;
        case "export-foundry":
          FoundryExport.exportPnj(id);
          break;
        case "journal-add":
          CardRenderer._submitJournal(actionEl);
          break;
        case "journal-remove":
          UI.removeJournalEntry(id, actionEl.dataset.ts);
          break;
        case "suivi-line-toggle":
          CardRenderer._toggleSuiviLine(id, actionEl.dataset.res);
          break;
        case "ledger-add":
          CardRenderer._submitLedger(actionEl);
          break;
        case "ledger-remove":
          UI.removeLedgerEntry(id, actionEl.dataset.ts);
          break;
        case "mention-goto-notepad":
          Notepad.open();
          break;
        case "goto-dossier":
          // VIS-9 — depuis « Rangé dans », révéler le dossier : le sélectionner
          // (miroir vers App.context via DossierBar.select) puis aller à la
          // bibliothèque filtrée. Même geste que le pont Créer→Retrouver
          // (cf. app.js `create-goto`).
          DossierBar.select(actionEl.dataset.dossier);
          App.showPanel("shadows");
          break;
        case "mention-goto": {
          const { id: mid, name: mname, type: mtype, slot: mslot, ts: mts } = actionEl.dataset;
          // Journal : déplier AVANT la révélation pour que le re-rendu de la
          // liste par _reveal inclue l'entrée ciblée dans le DOM.
          if (mslot === "journal") {
            const target = PnjLookup.find(mid);
            if (target) target._zoneOpen = { ...target._zoneOpen, journal: true };
          }
          Palette._reveal({ id: mid, name: mname, type: mtype });
          CardRenderer._scrollToBacklink({ id: mid, slot: mslot, ts: mts });
          break;
        }
        case "contact-link-goto":
          Palette._reveal({ id: actionEl.dataset.id, name: actionEl.dataset.name, type: "contact" });
          break;
        case "contact-link-pick":
          // Ajout rapide : lier un contact EXISTANT au PJ (lien nu ; qualifiable
          // ensuite via Éditer). addContactLink persiste + rafraîchit la carte.
          Characters.addContactLink(id, actionEl.dataset.contactId, "", null);
          break;
        case "contact-create-open":
          ContactCreate.open(id);
          break;
        case "open-relations-graph": {
          // VIS-15 B1 : la lentille graphe, centrée sur cette entité + ses
          // voisines directes. Un tap de nœud y ouvre CardPeek (jamais d'éjection).
          const ent = PnjLookup.find(id);
          if (typeof GraphView !== "undefined")
            GraphView.open({ focusId: id, title: ent ? `Liens — ${ent.name}` : "Liens" });
          break;
        }
        // ---- CO-b (carte Contact, convergence) : actions de la carte
        // contact elle-même, fusionnées depuis l'ex-`ContactRenderer.
        // bindDelegation` (préfixe `contact-` pour ne pas collider avec les
        // actions PNJ ci-dessus ni avec `contact-link-goto`/`contact-link-
        // pick`/`contact-create-open`, qui vont dans l'autre sens : PJ→contact). ----
        case "contact-remove":
          ContactsBook.remove(id);
          break;
        case "contact-reroll-flavor":
          ContactsBook.rerollFlavor(id);
          break;
        case "contact-set-niveau":
          ContactsBook.editField(id, "level", actionEl.dataset.niveauValue);
          ContactsBook.render();
          break;
        case "contact-generate-portrait":
          Portrait.generateForContact(id, actionEl);
          break;
        case "contact-deploy":
          ContactsBook.deployPNJ(id);
          break;
        case "contact-edit":
          ContactEdit.open(id);
          break;
        case "contact-goto-pj":
          Palette._reveal({ id: actionEl.dataset.pjId, name: actionEl.dataset.pjName, type: "pj" });
          break;
        case "contact-toggle-pjlink-menu": {
          // Un seul menu ouvert à la fois : on referme les autres d'abord.
          const menu = actionEl.parentElement.querySelector(".contact-pjlink-menu");
          const willOpen = menu && menu.hidden;
          document
            .querySelectorAll(".contact-pjlink-menu:not([hidden])")
            .forEach((m) => (m.hidden = true));
          if (menu) menu.hidden = !willOpen;
          break;
        }
        case "contact-link-pj":
          // Le lien vit côté PJ (contactLinks) ; on rafraîchit la grille
          // contacts pour afficher le nouveau chip « Connu de ».
          Characters.addContactLink(actionEl.dataset.pjId, id, "", null);
          UI.refreshEntityCard(id);
          break;
        case "contact-link-team":
          // Rattache ce contact à toute l'équipe active (render() côté carnet
          // rafraîchit tous les chips « Connu de »).
          ContactsBook.linkManyToTeam([id]);
          break;
        case "contact-unlink-pj":
          Characters.removeContactLink(actionEl.dataset.pjId, id);
          UI.refreshEntityCard(id);
          break;
      }
    });

    // CO-b (carte Contact) : blur/focus ne bubblent pas ; focusout si, c'est
    // son équivalent — même patron que le reste de la délégation. Les cards
    // contact persistantes ne portent aucun onclick/onblur figé, seulement
    // des data-* lus ici (ex-`ContactRenderer.bindDelegation`).
    document.addEventListener("focusout", (e) => {
      const fieldEl = e.target.closest("[data-contact-field]");
      if (fieldEl) {
        // CO-d : id explicite sur le champ (Relation, qui peut vivre sur la
        // carte du PNJ déployé) prioritaire sur l'ancêtre — l'ancêtre
        // `.pnj-card` reste le fallback correct pour Identité (name/role/
        // trait), qui ne vit jamais que sur la carte du contact lui-même.
        const id = fieldEl.dataset.id || fieldEl.closest(".pnj-card")?.dataset.id;
        if (!id) return;
        ContactsBook.editField(id, fieldEl.dataset.contactField, fieldEl.textContent.trim());
        return;
      }
      const flavorEl = e.target.closest("[data-contact-flavor]");
      if (!flavorEl) return;
      const card = flavorEl.closest(".pnj-card");
      if (!card) return;
      ContactsBook.editFlavor(card.dataset.id, flavorEl.dataset.contactFlavor, flavorEl.textContent.trim());
    });

    // Cible Matrice du decker (<select>, pas un clic — délégation change
    // dédiée, même patron que MultiSelect._wire).
    document.addEventListener("change", (e) => {
      const el = e.target.closest('[data-action="deck-set-target"]');
      if (!el) return;
      UI.setDeckTarget(el.dataset.id, el.value);
    });

    // AUD-4 — le moniteur de condition au clavier. C'était le geste le plus
    // fréquent du meneur et le seul entièrement inatteignable : 85 `<div>`
    // muets sur une scène ordinaire. Un moniteur = UN arrêt de tabulation,
    // flèches ← → à l'intérieur (motif `RovingGroup`, validé sur les jetons
    // d'action). Les quatre éditions passent ici sans distinction : le groupe
    // est `.monitor-boxes` partout, et la gravité vit dans l'aria-label que le
    // renderer a déjà posé.
    document.addEventListener("keydown", (e) => {
      const box = e.target.closest && e.target.closest(".monitor-box[data-action='toggle-monitor']");
      if (!box) return;
      const grp = { container: ".monitor-boxes", selector: ".monitor-box[data-action='toggle-monitor']", orientation: "horizontal" };
      if (e.key === " " || e.key === "Enter") {
        const { id, sev, idx } = box.dataset;
        e.preventDefault();
        UI.toggleMonitor(id, sev, Number(idx));
        // La carte est re-rendue : le nœud focalisé n'existe plus. `refocus`
        // ré-arme le groupe ENTIER autour de son jumeau frais — poser le tab
        // stop sans retirer celui que le rendu vient de replacer ailleurs en
        // laisserait deux (piège mesuré sur les jetons d'action).
        RovingGroup.refocus(
          `.monitor-box[data-action='toggle-monitor'][data-id="${id}"][data-sev="${sev}"][data-idx="${idx}"]`,
          grp,
        );
        return;
      }
      if (RovingGroup.key(e.key, box, grp)) e.preventDefault();
    });

    // Entrée dans l'input de journal = ajouter la note (pas de <form> : évite
    // une soumission de page ; délégation cohérente avec le reste des cartes).
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const input = e.target.closest("[data-journal-input]");
      if (!input) return;
      e.preventDefault();
      const id = input.dataset.id;
      const text = input.value;
      if (!text.trim()) return;
      UI.addJournalEntry(id, text);
      CardRenderer._focusJournalInput(id);
    });
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.CardDelegation = CardDelegation;
