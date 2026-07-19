"use strict";

/* ============================================================
   SUMMON PANEL — invocation d'esprits (extrait de UI :
   UI était un fourre-tout mélangeant moniteurs/véhicules/esprits ;
   l'invocation est un domaine fonctionnel complet et autonome).
   ============================================================ */
import { Actor } from "../../rules/actor.js";
import { AmplitudeSelector } from "../kit/amplitudeselector.js";
import { CardRenderer } from "../card/cardrenderer.js";
import { MagicAction } from "../dice/magicaction.js";
import { Spirits } from "../../catalogs/spirits.js";
import { Sprites } from "../../catalogs/sprites.js";
import { Utils } from "../../core/utils.js";

export const SummonPanel = {
  _summon: null, // état du panneau : { ownerId, force, tier, services }

  /** Panneau d'invocation singleton (pattern du panneau de risque). */
  _ensure() {
    if (document.getElementById("summon-panel")) return;
    const p = document.createElement("div");
    p.id = "summon-panel";
    p.className = "risk-panel-overlay";
    p.setAttribute("hidden", "");
    p.innerHTML = `
      <div class="risk-panel" role="dialog" aria-label="Invocation d'esprit">
        <div class="risk-panel-head">
          <span class="risk-panel-title" id="summon-title">Invoquer un esprit</span>
          <button class="risk-panel-close" id="summon-close" aria-label="Fermer">✕</button>
        </div>
        <div class="summon-row" id="summon-power-row">
          <span class="summon-row-label" id="summon-power-label">Puissance</span>
          <div class="summon-steps" id="summon-power-steps"></div>
        </div>
        <div class="summon-row" id="summon-service-row">
          <span class="summon-row-label">Services</span>
          <div class="summon-steps" id="summon-service-steps"></div>
        </div>
        <div class="summon-types" id="summon-types"></div>
      </div>`;
    document.body.appendChild(p);
    p.addEventListener("click", (e) => {
      if (e.target === p) this._close();
    });
    document.getElementById("summon-close").addEventListener("click", () =>
      this._close(),
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !p.hasAttribute("hidden")) this._close();
    });

    document.getElementById("summon-power-steps").addEventListener("click", (e) => {
      const b = e.target.closest("[data-power]");
      if (!b) return;
      this._summon[this._summon.power.field] = parseInt(b.dataset.power, 10);
      this._sync();
    });
    document.getElementById("summon-service-steps").addEventListener("click", (e) => {
      const b = e.target.closest("[data-services]");
      if (!b) return;
      this._summon.services = parseInt(b.dataset.services, 10);
      this._sync();
    });
    document.getElementById("summon-types").addEventListener("click", (e) => {
      const b = e.target.closest("[data-spirit-type]");
      if (!b) return;
      this._doSummon(b.dataset.spiritType);
    });
  },

  /** Ouvre le rail. `kind` = "spirit" (invocation) ou "sprite" (compilation) :
      un seul panneau, vocabulaire et contrat lus selon le kind (arbitrage
      Canon — pas de SpritePanel parallèle). */
  open(ownerId, kind = "spirit") {
    const owner = PnjLookup.find(ownerId);
    if (!owner) return;
    this._ensure();
    const ed = App.getEditionModule(owner.edition);
    const isSprite = kind === "sprite";
    const power = isSprite ? ed.spriteModel.compilePower : ed.summonPower;
    const defaultPow = isSprite
      ? Utils.clamp(Actor.attr(owner, "RES") || 4, 1, 8)
      : Utils.clamp(Actor.attr(owner, "MAG") || 4, 1, 12);
    this._summon = {
      ownerId,
      edition: owner.edition,
      kind,
      isSprite,
      power,
      [power.field]: power.field === "tier" ? 1 : defaultPow,
      services: 3,
    };
    document.getElementById("summon-title").textContent =
      `${isSprite ? "Compiler" : "Invoquer"} — ${owner.name || "PNJ"}`;
    document.getElementById("summon-power-label").textContent = power.label;
    // Tâches/services choisis à la main quand la mécanique n'est pas chiffrée :
    // esprit SR (conjureSkill) → masqué (succès nets) ; sprite → visible en T3b
    // (le jet de compilation viendra en T3c). Libellé adapté au kind.
    document.getElementById("summon-service-row").style.display =
      !isSprite && ed.conjureSkill ? "none" : "";
    document.querySelector("#summon-service-row .summon-row-label").textContent =
      isSprite ? "Tâches" : "Services";
    this._sync();
    const p = document.getElementById("summon-panel");
    p.removeAttribute("hidden");
    void p.offsetWidth;
    p.classList.add("show");
  },

  _close() {
    const p = document.getElementById("summon-panel");
    if (!p) return;
    p.classList.remove("show");
    clearTimeout(p._t);
    p._t = setTimeout(() => p.setAttribute("hidden", ""), 200);
  },

  _sync() {
    const s = this._summon;
    document.getElementById("summon-power-steps").innerHTML = AmplitudeSelector.render(
      s.power.steps(),
      s[s.power.field],
      "power",
    );
    document.getElementById("summon-service-steps").innerHTML = AmplitudeSelector.render(
      [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) })),
      s.services,
      "services",
    );
    const types = s.isSprite ? Sprites.typesFor(s.edition) : Spirits.typesFor(s.edition);
    const icon = s.isSprite ? "◈" : "✦";
    document.getElementById("summon-types").innerHTML = Object.entries(types)
      .map(
        ([key, t]) =>
          `<button class="summon-type-btn" data-spirit-type="${key}">${icon} ${t.label}</button>`,
      )
      .join("");
  },

  /** Résumé lisible d'un Drain pour un toast. */
  _drainToast(conj) {
    const t = conj.type === "physical" ? "Physique" : "Étourdissant";
    return conj.drainDamage > 0
      ? `Drain : ${conj.drainDamage} case${conj.drainDamage > 1 ? "s" : ""} (${t}).`
      : "Drain résisté.";
  },

  _doSummon(typeKey) {
    const s = this._summon;
    const owner = PnjLookup.find(s.ownerId);
    if (!owner) return;
    if (s.isSprite) return this._doCompile(typeKey);
    const ed = App.getEditionModule(owner.edition);

    // SR5/SR6 : l'app roule l'invocation (services = succès nets) + le Drain.
    // Anarchy : pas de mécanique chiffrée → services choisis à la main, pas
    // de Drain (comportement historique).
    let services = s.services;
    let conj = null;
    if (ed.conjureSkill) {
      conj = MagicAction.resolveConjuration(owner, s.force);
      services = conj.netHits;
    }

    this._close();

    // Invocation ratée (aucun succès net) : l'esprit n'apparaît pas, mais le
    // magicien subit tout de même le Drain (SR5 p.303 / SR6 p.150).
    if (conj && conj.netHits < 1) {
      toast(`Invocation ratée (0 succès net). ${this._drainToast(conj)}`);
      return;
    }

    const spirit = Spirits.spawn(owner, typeKey, {
      force: s.force,
      tier: s.tier,
      services,
    });
    if (!spirit) return;

    const inShadows = Shadows.data.all.some((p) => p.id === owner.id);
    if (inShadows) {
      Shadows.data.all.push(spirit);
      Shadows.save();
    } else {
      Gen.pool.push(spirit);
    }
    const ownerCard =
      document.querySelector(`.panel.active .pnj-card[data-id="${owner.id}"]`) ||
      document.querySelector(`.pnj-card[data-id="${owner.id}"]`);
    if (ownerCard) {
      const card = CardRenderer.render(spirit, inShadows ? ["remove"] : ["discard"]);
      card.classList.add("vehicle-card", "spirit-card", "vehicle-deploying");
      ownerCard.insertAdjacentElement("afterend", card);
      setTimeout(() => card.classList.remove("vehicle-deploying"), 700);
    }
    CardRenderer.refresh(owner);
    // Invocation chiffrée : présente le résultat dans l'affichage de dés
    // standard (jet de Conjuration + services + Drain) avec Secondes chances,
    // parité avec le lancer de sort. Toast conservé pour Anarchy (pas de conj).
    if (conj) {
      MagicAction.presentConjuration(owner, s.force, conj, spirit);
    } else {
      toast(`Esprit invoqué : ${services} service${services > 1 ? "s" : ""}.`);
    }
  },

  /** Compile un sprite (T3b) : compilation MANUELLE (Niveau/palier + type +
      tâches choisis à la main) ; le jet de compilation opposé et le
      Technodrain viendront en T3c. Place la fiche liée sous le technomancien,
      même geste que l'invocation. */
  _doCompile(typeKey) {
    const s = this._summon;
    const owner = PnjLookup.find(s.ownerId);
    if (!owner) return;
    const isTier = s.power.field === "tier";
    const level = isTier ? null : s[s.power.field];
    this._close();

    // SR5/SR6 : l'app roule la compilation (tâches = succès nets) + le
    // Technodrain. Anarchy 1 : compilation narrative (comme ses esprits) →
    // tâches choisies à la main, pas de jet motorisé.
    const comp = level != null ? MagicAction.resolveCompilation(owner, level) : null;
    let tasks = s.services;
    if (comp) {
      tasks = comp.netHits;
      // Compilation ratée (0 succès net) : pas de sprite, mais le Technodrain
      // a déjà été encaissé (livre : on résiste, succès ou non).
      if (comp.netHits < 1) {
        CardRenderer.refresh(owner);
        MagicAction.presentCompilation(owner, level, comp, null);
        toast(`Compilation ratée (0 succès net). ${this._fadingToast(comp)}`);
        return;
      }
    }

    const opts = isTier ? { tier: s[s.power.field] } : { level, tasks };
    const sprite = Sprites.spawn(owner, typeKey, opts);
    if (!sprite) return;

    const inShadows = Shadows.data.all.some((p) => p.id === owner.id);
    if (inShadows) {
      Shadows.data.all.push(sprite);
      Shadows.save();
    } else {
      Gen.pool.push(sprite);
    }
    const ownerCard =
      document.querySelector(`.panel.active .pnj-card[data-id="${owner.id}"]`) ||
      document.querySelector(`.pnj-card[data-id="${owner.id}"]`);
    if (ownerCard) {
      const card = CardRenderer.render(sprite, inShadows ? ["remove"] : ["discard"]);
      card.classList.add("vehicle-card", "spirit-card", "sprite-card", "vehicle-deploying");
      ownerCard.insertAdjacentElement("afterend", card);
      setTimeout(() => card.classList.remove("vehicle-deploying"), 700);
    }
    CardRenderer.refresh(owner);
    if (comp) {
      MagicAction.presentCompilation(owner, level, comp, sprite);
      toast(`Sprite compilé : ${sprite.tasks} tâche${sprite.tasks > 1 ? "s" : ""}. ${this._fadingToast(comp)}`);
    } else {
      toast(`Sprite compilé : ${sprite.tasks} tâche${sprite.tasks > 1 ? "s" : ""}.`);
    }
  },

  /** Résumé lisible du Technodrain d'une compilation pour un toast. */
  _fadingToast(comp) {
    if (!comp || !comp.drainDamage) return "Technodrain résisté.";
    const t = comp.type === "physical" ? "Physique" : "Étourdissant";
    return `Technodrain : ${comp.drainDamage} case${comp.drainDamage > 1 ? "s" : ""} (${t}).`;
  },

  /** Pip de service : marque les services rendus (clic = bascule). */
  toggleService(spiritId, idx) {
    const sp = PnjLookup.find(spiritId);
    if (!sp || sp.type !== "spirit") return;
    sp.servicesUsed = idx < (sp.servicesUsed || 0) ? idx : idx + 1;
    Shadows.save();
    CardRenderer.refresh(sp);
  },

  /** Pip de tâche d'un sprite (miroir de toggleService, lexique « tâche »). */
  toggleTask(spriteId, idx) {
    const sp = PnjLookup.find(spriteId);
    if (!sp || sp.type !== "sprite") return;
    sp.tasksUsed = idx < (sp.tasksUsed || 0) ? idx : idx + 1;
    Shadows.save();
    CardRenderer.refresh(sp);
  },

  /** Inscrit / libère un sprite (SR : inscrit = permanent, plusieurs
      possibles ; non inscrit = éphémère, un seul). Bascule l'état `registered`
      ratifié au cadrage T3. */
  toggleInscribe(spriteId) {
    const sp = PnjLookup.find(spriteId);
    if (!sp || sp.type !== "sprite") return;
    sp.registered = !sp.registered;
    Shadows.save();
    CardRenderer.refresh(sp);
    toast(sp.registered ? "Sprite inscrit (permanent)." : "Sprite libéré (éphémère).");
  },

  /** Renvoie un sprite (retour à la Résonance) : masque sa fiche sans perdre
      son état, comme dismissSpirit pour un esprit. */
  dismissSprite(spriteId) {
    const sp = PnjLookup.find(spriteId);
    if (!sp || sp.type !== "sprite") return;
    sp.deployed = false;
    document
      .querySelectorAll(`.pnj-card[data-id="${sp.id}"]`)
      .forEach((card) => card.remove());
    Shadows.save();
    const owner = PnjLookup.find(sp.ownerId);
    if (owner) CardRenderer.refresh(owner);
  },

  /** Replie/déplie la fiche d'un esprit sur place : masque son corps sans
      le congédier (l'esprit reste actif dans le pool). Purement visuel,
      distinct de dismissSpirit qui retire la fiche du plateau. */
  toggleFold(spiritId) {
    const sp = PnjLookup.find(spiritId);
    if (!sp || (sp.type !== "spirit" && sp.type !== "sprite")) return;
    sp.collapsed = !sp.collapsed;
    Shadows.save();
    CardRenderer.refresh(sp);
  },

  /** Lie/délie un esprit (SR5/SR6) : lié = invocation durable → au
      bannissement, la Magie de l'invocateur s'ajoute à l'opposition (SR5
      p.303). Miroir de toggleInscribe (sprite). */
  toggleBind(spiritId) {
    const sp = PnjLookup.find(spiritId);
    if (!sp || sp.type !== "spirit") return;
    sp.bound = !sp.bound;
    Shadows.save();
    CardRenderer.refresh(sp);
    toast(sp.bound ? "Esprit lié (invocation durable)." : "Esprit non lié.");
  },

  /* ============================================================
     RENVOI HOSTILE (T6b) — bannir un esprit / décompiler un sprite.
     Inverse offensif de l'invocation/compilation. Deux points d'entrée qui
     convergent sur `attemptDismiss` : depuis la carte du lanceur (data-action
     open-dismiss → choisir la cible) ou depuis le tracker sur la cible
     (menu ⋯ → choisir le lanceur). Vocabulaire de glyphes réutilisé (✦ esprit
     / ◈ sprite), pas de nouvel emoji.
     ============================================================ */

  /** Un PNJ peut-il bannir (esprit) / décompiler (sprite) dans son édition ?
      Le verbe doit être motorisé (banishSkill / spriteModel.decompileSkill) et
      le PNJ maîtriser la discipline (arcaneLock). */
  _canDismiss(pnj, kind) {
    if (!pnj || pnj.type) return false;
    const ed = App.getEditionModule(pnj.edition);
    if (!ed) return false;
    if (kind === "sprite")
      return !!(ed.spriteModel && ed.spriteModel.decompileSkill) &&
        ed.arcaneLock(pnj, "resonance") === null;
    return !!ed.banishSkill && ed.arcaneLock(pnj, "magic") === null;
  },

  /** Cibles déployées (esprits ou sprites) présentes en jeu. */
  _dismissTargets(kind) {
    const pools = [Gen.pool || [], Shadows.data ? Shadows.data.all : []];
    const seen = new Set();
    const out = [];
    for (const pool of pools)
      for (const e of pool)
        if (e && e.type === kind && e.deployed !== false && !seen.has(e.id)) {
          seen.add(e.id);
          out.push(e);
        }
    return out;
  },

  /** Lanceurs éligibles (magiciens pour l'esprit, technomanciens pour le
      sprite) résolvables dans les pools joués. */
  _dismissCasters(kind) {
    const pools = [
      Gen.pool || [],
      Shadows.data ? Shadows.data.all : [],
      typeof Characters !== "undefined" ? Characters.data.all : [],
    ];
    const seen = new Set();
    const out = [];
    for (const pool of pools)
      for (const e of pool)
        if (e && !seen.has(e.id) && this._canDismiss(e, kind)) {
          seen.add(e.id);
          out.push(e);
        }
    return out;
  },

  /** Point d'entrée : `{casterId}` (carte du lanceur → choisir la cible) ou
      `{targetId}` (tracker sur la cible → choisir le lanceur). Auto-résout si
      un seul candidat. */
  openDismiss(kind, opts = {}) {
    const isSprite = kind === "sprite";
    const verb = isSprite ? "Décompiler" : "Bannir";
    const noun = isSprite ? "sprite" : "esprit";
    const pick = (list, title, message, onPick) => {
      if (!list.length) return null;
      if (list.length === 1) return onPick(list[0].id);
      Dialog.choose({
        title,
        message,
        options: list.map((e) => ({
          value: e.id,
          label: e.ownerName ? `${e.name || "Sans nom"} — ${e.ownerName}` : e.name || "Sans nom",
        })),
      }).then((id) => id && onPick(id));
    };
    if (opts.casterId) {
      const targets = this._dismissTargets(kind).filter((t) => t.id !== opts.casterId);
      if (!targets.length)
        return toast(isSprite ? "Aucun sprite en jeu à décompiler." : "Aucun esprit en jeu à bannir.", "warning");
      return pick(targets, `${verb} — cible`, `Quel ${noun} viser ?`, (id) =>
        this.attemptDismiss(opts.casterId, id, kind),
      );
    }
    if (opts.targetId) {
      const casters = this._dismissCasters(kind).filter((c) => c.id !== opts.targetId);
      if (!casters.length)
        return toast(isSprite ? "Aucun technomancien pour décompiler." : "Aucun magicien pour bannir.", "warning");
      return pick(casters, `${verb} — lanceur`, `Qui ${isSprite ? "décompile" : "bannit"} ?`, (casterId) =>
        this.attemptDismiss(casterId, opts.targetId, kind),
      );
    }
  },

  /** Réduit les services (esprit) / tâches (sprite) restants de `n` ; renvoie
      `true` si épuisés (l'entité repart au plan / à la Résonance). */
  _reduceDismiss(target, n) {
    const isSprite = target.type === "sprite";
    const totalKey = isSprite ? "tasks" : "services";
    const usedKey = isSprite ? "tasksUsed" : "servicesUsed";
    const total = target[totalKey] || 0;
    const used = target[usedKey] || 0;
    if (n <= 0) return false;
    target[usedKey] = Math.min(total, used + n);
    return total - used - n <= 0;
  },

  /** Retire définitivement une entité renvoyée : replie sa fiche, la sort du
      tracker, rafraîchit son propriétaire d'origine. */
  _finishDismiss(target) {
    target.deployed = false;
    document.querySelectorAll(`.pnj-card[data-id="${target.id}"]`).forEach((c) => c.remove());
    Shadows.save();
    if (typeof Encounter !== "undefined") Encounter.remove(target.id);
    const owner = target.ownerId ? PnjLookup.find(target.ownerId) : null;
    if (owner) CardRenderer.refresh(owner);
  },

  /** Résout un renvoi : jet opposé (MagicAction) → réduit services/tâches (SR)
      ou applique des dégâts matriciels (Anarchy 1) → retire la fiche si
      épuisée. Le Drain éventuel est déjà encaissé par le résolveur. */
  attemptDismiss(casterId, targetId, kind) {
    const caster = PnjLookup.find(casterId);
    const target = PnjLookup.find(targetId);
    if (!caster || !target) return;
    const isSprite = kind === "sprite";
    const verb = isSprite ? "Décompilation" : "Bannissement";
    const unit = isSprite ? "tâche" : "service";
    const res = isSprite
      ? MagicAction.resolveDecompilation(caster, target)
      : MagicAction.resolveBanishment(caster, target);

    // Édition sans verbe motorisé (ne devrait pas arriver via les affordances
      // gatées, mais robuste) : renvoi narratif d'un service/tâche.
    if (!res) {
      const depleted = this._reduceDismiss(target, 1);
      Shadows.save();
      CardRenderer.refresh(target);
      toast(`${verb} narratif : 1 ${unit} retiré.`);
      if (depleted) this._finishDismiss(target);
      return;
    }

    let depleted = false;
    if (res.effect === "damage") {
      target.matFilled = Utils.clamp(
        (target.matFilled || 0) + (res.dmgBoxes || 0),
        0,
        target.matrixMonitor || 0,
      );
      depleted = (target.matrixMonitor || 0) > 0 && target.matFilled >= target.matrixMonitor;
    } else if (res.netHits > 0) {
      depleted = this._reduceDismiss(target, res.netHits);
    }
    Shadows.save();
    CardRenderer.refresh(target);
    CardRenderer.refresh(caster); // le Drain a pu toucher le lanceur

    const success = res.effect === "damage" ? res.dmgBoxes > 0 : res.netHits > 0;
    MagicAction.presentDismissal(
      caster,
      res,
      `${verb} — ${target.name}${success ? "" : " (échec)"}`,
    );
    const effTxt =
      res.effect === "damage"
        ? success
          ? `${res.dmgBoxes} case${res.dmgBoxes > 1 ? "s" : ""} matricielle${res.dmgBoxes > 1 ? "s" : ""}`
          : "aucun succès net"
        : success
          ? `${res.netHits} ${unit}${res.netHits > 1 ? "s" : ""} retiré${res.netHits > 1 ? "s" : ""}`
          : "aucun succès net";
    const fate = depleted ? (isSprite ? " — sprite décompilé !" : " — esprit banni !") : "";
    const drainTxt = res.drainDamage
      ? ` Drain : ${res.drainDamage} (${res.type === "physical" ? "Phys." : "Étourd."}).`
      : res.dv
        ? " Drain résisté."
        : "";
    toast(`${verb} : ${effTxt}${fate}.${drainTxt}`);
    if (depleted) this._finishDismiss(target);
  },

  /** Congédie un esprit : masque sa fiche sans perdre son état (services
      rendus, moniteur, notes...) — l'esprit reste dans le pool. */
  dismissSpirit(spiritId) {
    const sp = PnjLookup.find(spiritId);
    if (!sp || sp.type !== "spirit") return;
    sp.deployed = false;
    document
      .querySelectorAll(`.pnj-card[data-id="${sp.id}"]`)
      .forEach((card) => card.remove());
    Shadows.save();
    const owner = PnjLookup.find(sp.ownerId);
    if (owner) CardRenderer.refresh(owner);
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.SummonPanel = SummonPanel;
