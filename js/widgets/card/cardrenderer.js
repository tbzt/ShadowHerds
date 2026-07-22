"use strict";

/* ============================================================
   CARD RENDERER — rend une card PNJ (générateur, Ombres, véhicules,
   esprits) et gère son cycle de rafraîchissement.
   Les corps par édition (SR5/SR6/Anarchy) et le rendu des entités
   liées (véhicules, esprits) vivent dans des fichiers séparés
   (cardrenderer.sr5.js, .sr6.js, .anarchy.js, .linked.js) qui
   étendent cet objet — même patron que les modules d'édition.
   ============================================================ */
import { Actor } from "../../rules/actor.js";
import { ActorEffects } from "../../rules/actoreffects.js";
import { CardFooter } from "./cardfooter.js";
import { CardZones } from "../../rules/cardzones.js";
import { CyberdeckRenderer } from "./cyberdeckrenderer.js";
import { Drugs } from "../../catalogs/drugs.js";
import { Esoteric } from "../../rules/esoteric.js";
import { ItemResolver } from "../../rules/itemresolver.js";
import { Magic } from "../../rules/magic.js";
import { Mentions } from "../journal/mentions.js";
import { PersonaRenderer } from "./personarenderer.js";
import { Resonance } from "../../rules/resonance.js";
import { SkillCatalog } from "../../rules/skillcatalog.js";
import { SkillEffects } from "../../rules/skilleffects.js";
import { UI } from "../kit/ui.js";
import { Utils } from "../../core/utils.js";
import { WeaponRoll } from "../../rules/weaponroll.js";

export const CardRenderer = {
  /** Dépendances de rendu par défaut, lues depuis les globals de l'app.
      Point de câblage unique : le reste du renderer ne lit plus aucun de
      ces modules directement, tout arrive via le paramètre `deps`.
      `DiceRoller` en bare global (pont window, pas d'import ES) : diceroller.js
      importe déjà CardRenderer, un import direct créerait un cycle. */
  liveDeps() {
    return { Settings, Drugs, Vehicles, Spirits, Sprites, WeaponRoll, UI, Encounter, DiceRoller };
  },

  /** Rend une card PNJ et retourne l'élément DOM.
      Coquille à deux couches : `.pnj-card` (élément de grille, footprint
      complet, réserve la bande du rail) enveloppe `.pnj-card-frame` (la
      carte VISIBLE : bordure/clip/scan) + le rail « carnet » en frère du
      frame, posé hors-cadre dans la bande droite réservée. */
  render(pnj, actions = ["save", "discard"], deps = CardRenderer.liveDeps()) {
    const el = document.createElement("div");
    el.className = "pnj-card scanning";
    if (pnj.collapsed) el.classList.add("spirit-collapsed");
    el.dataset.id = pnj.id;
    el.dataset.edition = pnj.edition;

    el.innerHTML = this._shell(pnj, actions, deps);
    if (this._lensSelector(pnj, deps)) el.classList.add("has-rail");

    setTimeout(() => el.classList.remove("scanning"), 900);
    return el;
  },

  /** Contenu interne d'une carte : le frame visible + le rail carnet frère.
      Point unique de composition, partagé par render() et refresh(). */
  _shell(pnj, actions, deps = CardRenderer.liveDeps()) {
    return (
      `<div class="pnj-card-frame">` +
      this._header(pnj, deps) +
      this._body(pnj, deps) +
      this._footModulesHtml(pnj, deps) +
      this._journal(pnj, deps) +
      this._footer(pnj, actions, deps) +
      `</div>` +
      this._lensSelector(pnj, deps)
    );
  },

  /** Met à jour le contenu d'une card existante (après édition).
      Un PNJ sauvegardé peut avoir DEUX cartes (générateur + Ombres) :
      on rafraîchit toutes les copies, chacune avec ses propres actions
      (portées par data-saved-actions sur son footer). */
  refresh(pnj, deps = CardRenderer.liveDeps()) {
    document
      .querySelectorAll(`.pnj-card[data-id="${pnj.id}"]`)
      .forEach((el) => {
        const footer = el.querySelector(".pnj-card-footer");
        const actions =
          footer && footer.dataset.savedActions
            ? JSON.parse(footer.dataset.savedActions)
            : ["edit", "remove"];
        el.classList.toggle("spirit-collapsed", !!pnj.collapsed);
        el.innerHTML = this._shell(pnj, actions, deps);
        el.classList.toggle("has-rail", !!this._lensSelector(pnj, deps));
      });
  },

  /** Ligne d'annuaire : consultation dense d'une longue bibliothèque
      — la carte compacte replie déjà les zones mais garde son en-tête
      + accordéon (~480px/fiche mesuré), encore lourd à faire défiler pour
      15+ PNJ. Une ligne = nom · archétype · Défense/Encaissement (mêmes
      champs pré-calculés `pnj.defense`/`damageResist` que la carte, PAS de
      recalcul par édition — Anarchy 2 n'a pas ces champs, la pastille est
      simplement absente, cohérent avec son modèle narratif) · jauge de
      moniteur condensée (réutilise `conditionMonitor.gauge`, déjà
      partagé avec la mini-jauge du cockpit). Clic sur le nom = RosterView
      rouvre la carte complète (repli), pas de logique dupliquée ici. */
  renderRow(pnj, deps = CardRenderer.liveDeps()) {
    const el = document.createElement("div");
    el.className = "pnj-card roster-row";
    el.dataset.id = pnj.id;
    el.dataset.edition = pnj.edition;

    const archStr = pnj.archetype && pnj.archetype !== pnj.name ? pnj.archetype : "";
    const defense = this._rollPill("Défense", pnj.defense, {
      title: "Défense — clic pour lancer",
      key: "defense",
      pnj,
    });
    const resist = this._rollPill("Encaissement", pnj.damageResist, {
      title: "Encaissement — clic pour lancer",
      key: "damageResist",
      pnj,
    });
    const cm = App.getEditionModule(pnj.edition).conditionMonitor;
    const life = this.lifeBar(cm && cm.gauge ? cm.gauge(pnj) : null, "roster-row-life");

    el.innerHTML = `
      <button type="button" class="roster-row-name" data-action="roster-row-open" data-id="${pnj.id}">
        <span class="roster-row-nametext">${this._esc(pnj.name)}</span>
        ${archStr ? `<span class="roster-row-arch">${this._esc(archStr)}</span>` : ""}
      </button>
      <div class="roster-row-pools">${defense}${resist}</div>
      ${life}
    `;
    return el;
  },

  /** CO-a (carte Contact) : reconnaissance d'un contact rendu par la carte
      partagée. Le contact porte `type:"contact"` (posé à la génération par
      `ContactGen`, rétro-normalisé à la lecture par `ContactsBook.load`).
      Miroir de la garde `isPC` (module Suivi). */
  isContact(pnj) {
    return !!pnj && pnj.type === "contact";
  },

  /* ---- Header ---- */
  _header(pnj, deps = CardRenderer.liveDeps()) {
    if (this.isContact(pnj)) return this._headerContact(pnj, deps);
    if (pnj.pcLight) return this._headerLight(pnj);
    if (pnj.type === "vehicle") return this._headerVehicle(pnj);
    if (pnj.type === "spirit") return this._headerSpirit(pnj);
    if (pnj.type === "sprite") return this._headerSprite(pnj);
    const gIcon = { M: "♂", F: "♀", NB: "⚧" }[pnj.gender] || "";
    let badge = "";

    // Un PJ n'a pas de rang/professionnalisme de PNJ à afficher (D6, doctrine
    // import Foundry) — vaut pour tout PJ, importé ou créé à la main.
    if (!pnj.isPC) {
      const ratingBadge = App.getEditionModule(pnj.edition).ratingBadge;
      if (ratingBadge.options) {
        const tier = pnj[ratingBadge.field] || ratingBadge.options[0];
        const tierClass = `rang-${tier.toLowerCase()}`;
        badge = `<span class="pnj-rank-badge ${tierClass}" title="Rang tactique — poids du PNJ dans une scène">${tier}</span>`;
      } else {
        badge = `<span class="pnj-rank-badge" title="Niveau de professionnalisme">PRO&nbsp;${pnj[ratingBadge.field]}</span>`;
      }
    }

    const specialStr =
      pnj.special && pnj.special !== "Aucun"
        ? ` · <em>${pnj.special}</em>`
        : "";

    const metaStr = pnj.infected
      ? `${pnj.meta} <span class="pnj-metavariant pnj-infected">(${this._esc(pnj.infected)})</span>`
      : pnj.metavariant
        ? `${pnj.meta} <span class="pnj-metavariant">(${this._esc(pnj.metavariant)})</span>`
        : pnj.meta;

    const nameHtml = this._nameBlock(pnj.name);

    // L'archétype n'est affiché que s'il apporte une info en plus du nom :
    // pour les créatures, name === archetype === label, on ne le répète pas.
    const archStr =
      pnj.archetype && pnj.archetype !== pnj.name ? ` · ${pnj.archetype}` : "";

    return `<div class="pnj-card-header">
      ${this._portraitThumb(pnj)}
      <div class="pnj-header-left">
        ${nameHtml}
        <div class="pnj-meta">${gIcon} ${metaStr}${archStr}${specialStr}</div>
      </div>
      ${badge}
      ${this._pcAvatar(pnj)}
    </div>`;
  },

  /** CO-b (carte Contact, convergence sur CardRenderer) : header d'un
      contact — portrait + nom/rôle éditables en ligne (D-edit-A,
      `deps.editable`) + métatype statique. Ni badge de rang ni icône de
      genre (absents du modèle contact). Nom SANS le découpage alias/civil
      de `_nameBlock` : un contact n'a jamais eu ce format, et le split
      casserait l'édition en ligne d'un seul champ.
      CO-e : lentilles ☰❝ (◈ Relation) — le rail est composé par `_shell()`
      en frère du frame (doctrine §5), jamais ici dans le header ; `_viewsFor`
      exclut Combat pour un contact (I3). */
  _headerContact(pnj, deps = CardRenderer.liveDeps()) {
    const editable = !!(deps && deps.editable);
    const nameAttrs = editable
      ? ` contenteditable="true" spellcheck="false" data-contact-field="name"`
      : "";
    const roleAttrs = editable
      ? ` contenteditable="true" spellcheck="false" data-contact-field="role"`
      : "";
    return `<div class="pnj-card-header">
      ${this._portraitThumb(pnj)}
      <div class="pnj-header-left">
        <div class="pnj-name"${nameAttrs}>${this._esc(pnj.name)}</div>
        <div class="pnj-meta"${roleAttrs}>${this._esc(pnj.role)}</div>
        ${pnj.metatype ? `<div class="contact-meta">${this._esc(pnj.metatype)}</div>` : ""}
      </div>
    </div>`;
  },

  /* ---- PJ léger — gabarit minimal commun, aucune branche d'édition :
     un PJ léger n'a ni attrs ni skills, seulement nom/joueur/couleur/notes. ---- */
  _headerLight(pnj) {
    return `<div class="pnj-card-header">
      <div class="pnj-header-left">
        ${this._nameBlock(pnj.name)}
        <div class="pnj-meta">Personnage-joueur${pnj.player ? ` · ${this._esc(pnj.player)}` : ""}</div>
      </div>
      ${this._pcAvatar(pnj)}
    </div>`;
  },

  /** Signature visuelle du PJ, CONSTANTE partout (tracker, PinRow,
      Palette, mentions, carte) — trois indices redondants (jamais un seul,
      daltoniens) : couleur `pcColor` + anneau (forme, ce badge lui-même
      n'existe QUE pour les PJ) + initiale du joueur (un PJ léger n'a jamais
      de portrait). `""` pour toute entité sans `pcColor` (PNJ) — aucune
      régression visuelle ailleurs. */
  _pcAvatar(pnj) {
    if (!pnj || !pnj.pcColor) return "";
    const label = (pnj.player || pnj.name || "?").trim().charAt(0).toUpperCase();
    const title = `PJ${pnj.player ? " · " + pnj.player : ""}`;
    return `<span class="pc-avatar" style="background:${this._esc(pnj.pcColor)}" title="${this._esc(title)}" aria-hidden="true">${this._esc(label)}</span>`;
  },

  /** CO-c : Relation (stats + « Connu de ») est sortie en module `_MODULES`
      (rendue par `_footModulesHtml`, entre le corps et le Journal) — ne
      reste ici que ce qui n'est pas de la Relation : description, trait,
      Incarnation. Le PNJ déployé n'est plus imbriqué ici (CO-d : rendu
      directement par `ContactsBook.renderCard`, plus de double chrome). */
  _bodyContact(pnj, deps = CardRenderer.liveDeps()) {
    const editable = !!(deps && deps.editable);
    const traitAttrs = editable
      ? ` contenteditable="true" spellcheck="false" data-contact-field="trait"`
      : "";
    return `<div class="pnj-card-body">
      <div class="contact-desc">${this._esc(pnj.desc)}</div>
      <div class="contact-trait">⚠ <span${traitAttrs}>${this._esc(pnj.trait)}</span></div>
      ${this._flavorSection(pnj, deps)}
      ${this._factionsSection(pnj)}
    </div>`;
  },

  /** CO-d : résout l'objet CONTACT qui porte la Relation, que la carte
      affichée soit le contact lui-même (rendu direct) ou le PNJ qu'il a
      déployé (`sourceContactId`, lookup) — la Relation est un jugement porté
      sur le contact, jamais dupliqué/recopié sur le PNJ. Contact supprimé
      après déploiement → lookup `null` → `applies()` devient faux (I3,
      silencieux, même patron que `_contactKnownBy` pour un PJ supprimé). */
  _relationSource(pnj) {
    if (CardRenderer.isContact(pnj)) return pnj;
    if (pnj.sourceContactId) {
      return ContactsBook.data.all.find((c) => c.id === pnj.sourceContactId) || null;
    }
    return null;
  },

  /** CO-c/CO-d : contenu du module Relation — stats (SR Influence/Loyauté ou
      Anarchy Niveau/RR/Atout, dispatch via `usesRiskPanel`) + « Connu de ».
      Rendu par le registre `_MODULES` (placement "foot"), donc déjà enrobé
      dans une coquille de zone repliable par `_footModulesHtml`. */
  _relationModule(pnj) {
    const c = CardRenderer._relationSource(pnj);
    if (!c) return "";
    const isAnarchy = !!App.getEditionModule(c.edition)?.usesRiskPanel;
    const stats = isAnarchy ? this._contactStatsAnarchy(c) : this._contactStatsSR(c);
    return `${stats}${this._contactKnownBy(c)}`;
  },

  /** Résumé visible zone repliée (résumé au repos, Croupier). */
  _relationSummary(pnj) {
    const c = CardRenderer._relationSource(pnj);
    if (!c) return "";
    const isAnarchy = !!App.getEditionModule(c.edition)?.usesRiskPanel;
    return isAnarchy ? `Niveau ${c.level} · RR ${c.rr}` : `Infl ${c.influence} · Loy ${c.loyaute}`;
  },

  /** Dispatch structurel accepté : deux blocs de stats complets
      (atout+RR vs Influence/Loyauté), pas une valeur scalaire.
      CO-d : toujours interactif (dots cliquables, champs éditables), qu'on
      soit sur la carte du contact ou celle du PNJ déployé — contrairement à
      Identité/Incarnation (D-edit-A), la Relation n'est pas gardée par
      `deps.editable` : ce n'est pas du texte libre risquant de fuiter sur un
      vrai PNJ (un PNJ n'a jamais de `sourceContactId` sans Relation
      applicable), c'est de la gestion de relation — même logique que
      « Connu de », toujours actif. `c.id` (le CONTACT, jamais le PNJ hôte)
      est explicite sur chaque élément, jamais déduit de la carte porteuse. */
  _contactStatsAnarchy(c) {
    const dots = Array.from({ length: 6 }, (_, i) => {
      const filled = i < c.level ? " filled" : "";
      return `<span class="niveau-dot${filled}" data-action="contact-set-niveau" data-id="${c.id}" data-niveau-value="${i + 1}"></span>`;
    }).join("");
    const bonus = c.bonus ? `<div class="contact-bonus">+ ${this._esc(c.bonus)}</div>` : "";
    return `<div class="contact-anarchy-stats">
      <div class="contact-stat-row">
        <span class="contact-stat-label">Niveau</span>
        <div class="niveau-dots">${dots}</div>
        <span class="contact-stat-val">${c.level} (${(c.level * 5000).toLocaleString("fr-FR")}¥)</span>
      </div>
      <div class="contact-stat-row">
        <span class="contact-stat-label">Effet</span>
        <span class="contact-rr">RR ${c.rr} — ${this._esc(c.domaine)}</span>
      </div>
      ${c.atoutCost != null ? `<div class="contact-stat-row"><span class="contact-stat-label">Atout</span><span class="contact-stat-val">${c.atoutCost} pts</span></div>` : ""}
      ${bonus}
    </div>`;
  },

  /** CO-d : `data-id="${c.id}"` explicite sur chaque champ éditable — sur la
      carte du PNJ déployé, la racine porte l'id du PNJ, pas celui du
      contact ; la délégation focusout lit cet id explicite en priorité
      (cf. `bindDelegation`), jamais l'ancêtre `.pnj-card`. */
  _contactStatsSR(c) {
    const numAttrs = (field) =>
      ` contenteditable="true" spellcheck="false" data-contact-field="${field}" data-id="${this._esc(c.id)}"`;
    return `<div class="stats-row" style="margin-top:6px;flex-wrap:wrap;gap:6px;">
      <span class="stat-pill accent">Influence
        <strong${numAttrs("influence")} class="editable-num">${c.influence}</strong>
      </span>
      <span class="stat-pill">Loyauté
        <strong${numAttrs("loyaute")} class="editable-num">${c.loyaute}</strong>
      </span>
      ${c.lieu ? `<span style="font-size:0.68rem;color:var(--text-dim);align-self:center;">📍 ${this._esc(c.lieu)}</span>` : ""}
    </div>`;
  },

  /** Sens inverse du lien PJ↔contact, calculé à la volée (jamais
      stocké côté contact — source unique `RelationsStore`, arêtes `type:"contact"`).
      Toujours actif (pas de garde `deps.editable` : gestion de liens, pas édition
      de champ texte — la distinction D-edit-A ne porte que sur le second). */
  _contactKnownBy(c) {
    if (typeof Characters === "undefined") return "";
    const all = Characters.data.all;
    const linkOf = (p) =>
      typeof RelationsStore !== "undefined"
        ? RelationsStore.contactLinksOf(p.id).find((l) => l.contactId === c.id)
        : null;
    const linked = all.filter((p) => linkOf(p));
    const linkedIds = new Set(linked.map((p) => p.id));
    const unlinked = all.filter((p) => !linkedIds.has(p.id));

    const chips = linked
      .map((p) => {
        const link = linkOf(p);
        const rel = link && link.relation ? ` — ${this._esc(link.relation)}` : "";
        return `<span class="tag tag-clickable pjlink-chip" role="button" tabindex="0" data-action="contact-goto-pj"
          data-pj-id="${this._esc(p.id)}" data-pj-name="${this._esc(p.name)}">${this._pcAvatar(p)}${this._esc(p.name)}${rel}<button type="button" class="pjlink-unlink" title="Délier ce PJ" aria-label="Délier"
            data-action="contact-unlink-pj" data-id="${this._esc(c.id)}" data-pj-id="${this._esc(p.id)}">×</button></span>`;
      })
      .join("");

    let addControl = "";
    if (unlinked.length) {
      const teamItem =
        typeof Characters !== "undefined" && Characters.activeTeamMembers().length
          ? `<button type="button" class="contact-pjlink-item contact-pjlink-team" data-action="contact-link-team" data-id="${this._esc(c.id)}">${this._esc(ContactsBook.teamLinkLabel())}</button>`
          : "";
      const items = unlinked
        .map(
          (p) =>
            `<button type="button" class="contact-pjlink-item" data-action="contact-link-pj"
              data-id="${this._esc(c.id)}" data-pj-id="${this._esc(p.id)}">${this._pcAvatar(p)}${this._esc(p.name)}</button>`,
        )
        .join("");
      addControl = `<span class="contact-pjlink-wrap">
        <button type="button" class="tag contact-pjlink-add" data-action="contact-toggle-pjlink-menu">＋ Lier un PJ</button>
        <div class="contact-pjlink-menu" hidden>${teamItem}${items}</div>
      </span>`;
    } else if (!linked.length) {
      addControl = `<span class="pjlink-empty">Aucun PJ — créez-en un dans Équipe.</span>`;
    }

    return `<div class="card-section contact-pjlink-section" style="margin-top:6px;">
      <div class="card-section-label">Connu de</div>
      <div class="card-section-content">${chips}${addControl}</div>
    </div>`;
  },

  /** CO-b : pied d'un contact — Déployer (primaire, tant que non déployé),
      Portrait IA (⋯, opt-in), Supprimer (⋯, destructif). Depuis CO-d,
      `ContactsBook.renderCard` ne rend plus la carte du contact du tout une
      fois déployé (carte du PNJ directement) — cette fonction n'est donc
      jamais atteinte pour un contact déployé par ce chemin ; le garde
      `!deployed` reste défensif pour un appel direct de `CardRenderer.render`
      sur l'objet contact. */
  _footerContact(pnj, deps = CardRenderer.liveDeps()) {
    const id = pnj.id;
    const deployed = Shadows.data.all.some((p) => p.sourceContactId === id);
    const acts = [];
    if (!deployed) {
      acts.push({ kind: "primary", icon: "⇲", label: "Déployer", attrs: `data-action="contact-deploy" data-id="${id}"` });
    }
    // Éditer : la carte contact reste éditable en ligne (nom/rôle/trait/
    // Influence…), mais le métatype n'y est pas modifiable — la modale le
    // couvre (et regroupe l'édition, parité avec PNJ/PJ/serveur/véhicule).
    acts.push({ kind: "secondary", label: "Éditer", attrs: `data-action="contact-edit" data-id="${id}"` });
    if (this._portraitEnabled(pnj, deps)) {
      acts.push({ kind: "menu", label: "Portrait IA", attrs: `data-action="contact-generate-portrait" data-id="${id}"` });
    }
    acts.push({ kind: "menu", danger: true, label: "Supprimer", attrs: `data-action="contact-remove" data-id="${id}"` });
    return CardFooter.render(acts);
  },

  _bodyLight(pnj) {
    const block = App.getEditionModule(pnj.edition)?.pcTableBlock;
    return `<div class="pnj-card-body pnj-card-body-light">
      ${this._tableBlockChips(pnj, block)}
      ${this._tableBlockMonitors(pnj, block)}
      ${
        pnj.notes
          ? `<div class="pc-light-notes">${this._esc(pnj.notes)}</div>`
          : `<div class="pc-light-empty">Fiche légère — nom seul. « Éditer » pour joueur/notes.</div>`
      }
      ${this._contactLinksSection(pnj)}
      ${this._factionsSection(pnj)}
      ${this._backlinksSection(pnj)}
      ${this._dossiersSection(pnj)}
    </div>`;
  },

  /** « Contacts » du PJ léger — liens qualifiés (relation, loyauté),
      un contact supprimé depuis est filtré silencieusement (pas de cascade
      destructive). Cliquable vers la fiche contact via
      `Palette._reveal`, même navigation que les backlinks. */
  _contactLinksSection(pnj) {
    const links =
      typeof RelationsStore !== "undefined" ? RelationsStore.contactLinksOf(pnj.id) : [];
    const linkedIds = new Set(links.map((l) => l.contactId));
    const items = links
      .map((l) => {
        const c = ContactsBook.data.all.find((x) => x.id === l.contactId);
        if (!c) return "";
        const label = l.relation ? `${c.name} — ${l.relation}` : c.name;
        return `<span class="tag tag-clickable" role="button" tabindex="0" data-action="contact-link-goto" data-id="${this._esc(c.id)}" data-name="${this._esc(c.name)}">${this._esc(label)}</span>`;
      })
      .join("");
    // Ajout rapide (hors édition) : le « ＋ » ouvre une liste-popover — 1er item
    // « ＋ Créer un contact » (ContactCreate), puis les contacts existants non
    // encore liés (clic = lien immédiat). Réutilise CardMenu tel quel
    // (data-card-menu-toggle + .card-menu frère) → aucun code de toggle neuf.
    const unlinked = (typeof ContactsBook !== "undefined" ? ContactsBook.data.all : [])
      .filter((c) => !linkedIds.has(c.id));
    const pickItems = unlinked
      .map(
        (c) =>
          `<button type="button" role="menuitem" class="card-menu-item" data-action="contact-link-pick" data-id="${this._esc(pnj.id)}" data-contact-id="${this._esc(c.id)}">${this._esc(c.name)}</button>`,
      )
      .join("");
    const addControl = `<span class="contact-add-wrap">
      <button type="button" class="tag contact-add-btn" data-card-menu-toggle aria-haspopup="true" aria-expanded="false" title="Ajouter un contact">＋</button>
      <div class="card-menu" role="menu" hidden>
        <button type="button" role="menuitem" class="card-menu-item" data-action="contact-create-open" data-id="${this._esc(pnj.id)}">＋ Créer un contact</button>
        ${pickItems}
      </div>
    </span>`;
    // Le ◈ Liens (lentille graphe) ne vit plus ici : il a sa propre section
    // « Liens », rendue pour TOUTE entité (cf. `_relationsLinkSection`), pas
    // seulement les PJ à contacts — on gère aussi les relations PNJ↔PNJ.
    return `<div class="card-section">
      <div class="card-section-label">Contacts</div>
      <div class="card-section-content">${items}${addControl}</div>
    </div>`;
  },

  /** Section « Liens » — porte d'entrée de la lentille graphe, sur TOUTE fiche
      (PNJ comme PJ), afin de voir et tisser les relations, y compris PNJ↔PNJ.
      Toujours présente (même à zéro lien : on peut ouvrir puis tisser) ; un
      compteur discret apparaît dès qu'il y a des arêtes incidentes. */
  _relationsLinkSection(pnj) {
    const n =
      typeof RelationsStore !== "undefined" ? RelationsStore.edgesTouching(pnj.id).length : 0;
    const label = n ? `◈ Liens · ${n}` : "◈ Liens";
    return `<div class="card-section">
      <div class="card-section-label">Liens</div>
      <div class="card-section-content">
        <button type="button" class="tag graph-open-btn" data-action="open-relations-graph" data-id="${this._esc(pnj.id)}" title="Voir et tisser les liens en graphe">${label}</button>
      </div>
    </div>`;
  },

  /** « Mentionné dans » — backlinks calculés à la volée par Mentions
      (bloc-notes de séance + notes/journal des autres entités mentionnant
      cette fiche). Scan par ID (robuste au renommage/homonymes),
      réutilise `.tag`/`.tag-clickable` tel quel (même patron que les tags
      cliquables du corps de carte, cf. `_contentTag`). */
  _backlinksSection(pnj) {
    if (typeof Mentions === "undefined") return "";
    // Un contact DÉJÀ lié (contactLinks) relève de la section « Contacts » : on
    // ne le répète pas ici. Un contact non lié qui mentionne le PJ y reste.
    const linkedContactIds = new Set(
      (typeof RelationsStore !== "undefined" ? RelationsStore.contactLinksOf(pnj.id) : []).map(
        (l) => l.contactId,
      ),
    );
    const links = Mentions.backlinksFor(pnj.id).filter(
      (l) => !(l.kind === "entity" && l.type === "contact" && linkedContactIds.has(l.id)),
    );
    if (!links.length) return "";
    const items = links
      .map((l) =>
        l.kind === "notepad"
          ? `<span class="tag tag-clickable" role="button" tabindex="0" data-action="mention-goto-notepad">${this._esc(l.label)}</span>`
          : `<span class="tag tag-clickable" role="button" tabindex="0" data-action="mention-goto" data-id="${this._esc(l.id)}" data-name="${this._esc(l.name)}" data-type="${this._esc(l.type)}"${l.slot ? ` data-slot="${this._esc(l.slot)}"` : ""}${l.ts != null ? ` data-ts="${this._esc(String(l.ts))}"` : ""}>${this._esc(l.name)}</span>`,
      )
      .join("");
    return `<div class="card-section">
      <div class="card-section-label">Mentionné dans</div>
      <div class="card-section-content">${items}</div>
    </div>`;
  },

  /** VIS-9 « Rangé dans » — pendant de « Mentionné dans » côté ORGANISATION :
      les dossiers où la fiche est classée (appartenance multi-dossiers). Aucune
      donnée neuve — `DossierBar.dossiersOf` ne fait qu'exposer le sens inverse
      de l'appartenance déjà portée par les collections. Chips identiques aux
      backlinks (`.tag`/`.tag-clickable`, même patron) ; la pastille ❖/◆ signale
      campagne/run comme dans la barre de dossiers. Vide ⇒ chaîne vide. */
  _dossiersSection(pnj) {
    if (typeof DossierBar === "undefined") return "";
    const nodes = DossierBar.dossiersOf(pnj.id);
    if (!nodes.length) return "";
    const items = nodes
      .map((d) => {
        const kindIcon =
          d.kind === "campaign" ? "❖ " : d.kind === "run" ? "◆ " : "";
        return `<span class="tag tag-clickable" role="button" tabindex="0" data-action="goto-dossier" data-dossier="${this._esc(d.id)}">${kindIcon}${this._esc(d.name)}</span>`;
      })
      .join("");
    return `<div class="card-section">
      <div class="card-section-label">Rangé dans</div>
      <div class="card-section-content">${items}</div>
    </div>`;
  },

  /** Section « Factions » — la bande d'appartenance transverse (Le Monde et le
      Jeu, A1). Dérive `FactionStore.factionsOf(id)` ; TOUJOURS présente : le « ＋ »
      invite à ranger sans jamais l'imposer (état vide non bloquant). Chip =
      pastille couleur + nom + ✕ retirer ; « ＋ » ouvre `FactionPicker`. Déléguée
      `data-action="faction-*"` (patron ContentModal, aucun handler inline). */
  _factionsSection(pnj) {
    if (typeof FactionStore === "undefined") return "";
    const id = this._esc(pnj.id);
    const chips = FactionStore.factionsOf(pnj.id)
      .map((f) => {
        const dot = `<span class="faction-dot"${f.color ? ` style="background:${this._esc(f.color)}"` : ""}></span>`;
        return `<span class="tag faction-chip">${dot}${this._esc(f.name)}<button type="button" class="faction-chip-x" data-action="faction-remove" data-faction="${this._esc(f.id)}" data-id="${id}" title="Retirer de « ${this._esc(f.name)} »" aria-label="Retirer de la faction">✕</button></span>`;
      })
      .join("");
    const add = `<button type="button" class="tag faction-add" data-action="faction-open-picker" data-id="${id}" title="Ajouter à une faction">＋ Faction</button>`;
    return `<div class="card-section">
      <div class="card-section-label">Factions</div>
      <div class="card-section-content">${chips}${add}</div>
    </div>`;
  },

  /** Après un clic sur un chip « Mentionné dans », amène à l'écran
      l'ENDROIT exact de la mention (l'entrée de journal ciblée, ou la carte
      source pour le champ `notes` — bloc unique). `_reveal` re-rend le panneau
      de façon asynchrone (délai variable PJ/Hub) : on attend l'apparition de
      la cible par rAF borné plutôt qu'un délai fixe. Réutilise le patron
      scroll+flash de `UI._flashCard`, étendu aux `.contact-card`. */
  _scrollToBacklink({ id, slot, ts }) {
    // Boucle de reprise en `setTimeout` (pas `requestAnimationFrame` : rAF est
    // gelé si l'onglet passe en arrière-plan — le scroll manquerait). ~30 essais
    // × 30 ms couvrent le délai variable du re-rendu de `_reveal` (PJ 40 ms/Hub).
    let tries = 30;
    const tick = () => {
      const card = document.querySelector(
        `.panel.active .pnj-card[data-id="${id}"], .panel.active .contact-card[data-id="${id}"], .pnj-card[data-id="${id}"], .contact-card[data-id="${id}"]`,
      );
      const target =
        slot === "journal" && card && ts != null
          ? card.querySelector(`.journal-entry[data-ts="${ts}"]`)
          : card;
      if (!target) {
        if (--tries > 0) setTimeout(tick, 30);
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const cls = target === card ? "card-flash" : "entry-flash";
      target.classList.add(cls);
      setTimeout(() => target.classList.remove(cls), 1200);
    };
    tick();
  },

  /** Valeurs saisies du bloc « mécanique de table » (init/perception/
      volonté/combativité…) — un `.tag` par valeur RENSEIGNÉE seulement
      (« vide par défaut » : rien n'apparaît tant que le MJ n'a rien saisi),
      réutilise `_listSection`/`.tag` tel quel, aucun nouveau composant. */
  _tableBlockChips(pnj, block) {
    if (!block) return "";
    const items = (block.fields || [])
      .filter((f) => pnj[f.key] !== undefined && pnj[f.key] !== null && pnj[f.key] !== "")
      .map((f) => `${f.label} ${pnj[f.key]}`);
    return this._listSection("Mécanique de table", items);
  },

  /** Moniteurs du bloc de table — dispatch sur `monitorKind` (descripteur
      neutre posé par le module d'édition, jamais `App.edition` ici). Réutilise
      les moniteurs déjà motorisés pour les PNJ complets (`_monitorBoxes`,
      `_monitorBoxesAnarchy`) : même markup, même délégation `toggle-monitor`. */
  _tableBlockMonitors(pnj, block) {
    if (!block || !block.monitorKind) return "";
    // "monitorKind" peut être une fonction (SR6 : dépend du réglage
    // separateMonitors, résolu à chaque lecture — un PJ léger n'a pas de
    // moment de « génération » où baker la valeur, contrairement aux PNJ).
    const kind =
      typeof block.monitorKind === "function" ? block.monitorKind() : block.monitorKind;
    if (kind === "anarchy") {
      return `<div class="monitor-block"><div class="monitor-row">
        <span class="monitor-label">État</span>
        <div class="monitor-boxes">${this._monitorBoxesAnarchy(pnj)}</div>
      </div></div>`;
    }
    if (kind === "single") {
      const key = block.monitorMaxKey || "me";
      const max = pnj[key] || 0;
      if (!max) return "";
      return `<div class="monitor-block"><div class="monitor-row">
        <span class="monitor-label">État</span>
        <div class="monitor-boxes">${this._monitorBoxes(pnj.id, "phys", max, pnj.physFilled || 0)}</div>
      </div></div>`;
    }
    // "double" (SR5, Anarchy1) : physMon/stunMon, chaque piste optionnelle
    // indépendamment (un MJ peut ne saisir que le physique).
    const physMon = pnj.physMon || 0;
    const stunMon = pnj.stunMon || 0;
    if (!physMon && !stunMon) return "";
    return `<div class="monitor-block">
      ${
        physMon
          ? `<div class="monitor-row"><span class="monitor-label" title="Physique">P</span>
             <div class="monitor-boxes monitor-phys">${this._monitorBoxes(pnj.id, "phys", physMon, pnj.physFilled || 0)}</div></div>`
          : ""
      }
      ${
        stunMon
          ? `<div class="monitor-row"><span class="monitor-label" title="Étourdissant">E</span>
             <div class="monitor-boxes monitor-stun">${this._monitorBoxes(pnj.id, "stun", stunMon, pnj.stunFilled || 0)}</div></div>`
          : ""
      }
    </div>`;
  },

  /** Vignette de portrait IA (opt-in), affichée dès qu'un portrait a été
      généré — indépendamment du réglage courant (désactiver le réglage
      empêche d'en générer de nouveaux, pas d'afficher les existants). */
  _portraitThumb(entity) {
    if (!entity.portraitUrl) return "";
    // CO-e (correctif) : la vignette contact reste RONDE (.contact-portrait-
    // thumb, distincte de .pnj-portrait-thumb carrée) — un accent visuel
    // "rolodex" volontaire, perdu par inadvertance en CO-b quand `_headerContact`
    // s'est mis à réutiliser ce helper générique sans distinguo de classe.
    const cls = this.isContact(entity) ? "contact-portrait-thumb" : "pnj-portrait-thumb";
    return `<div class="${cls}" role="button" tabindex="0"
      data-portrait-preview="${this._esc(entity.portraitUrl)}" title="Agrandir le portrait">
      <img src="${this._esc(entity.portraitUrl)}" alt="" loading="lazy">
    </div>`;
  },

  /* Découpe « Prénom "Surnom" Famille » (Utils.parseName, seule découpe du
     projet) : le surnom devient le titre mis en avant ; le nom civil (prénom
     + famille) passe en sous-ligne discrète. Si aucun surnom n'est présent,
     on affiche le nom tel quel. */
  _nameBlock(rawName) {
    const { alias, civil, full } = Utils.parseName(rawName);
    if (alias) {
      return `<div class="pnj-name" title="${this._esc(full)}">${this._esc(alias)}</div>
        ${civil ? `<div class="pnj-civilname">${this._esc(civil)}</div>` : ""}`;
    }
    return `<div class="pnj-name" title="${this._esc(full)}">${this._esc(full)}</div>`;
  },

  /* ---- Body ---- */
  _body(pnj, deps) {
    if (this.isContact(pnj)) return this._bodyContact(pnj, deps);
    if (pnj.pcLight) return this._bodyLight(pnj);
    if (pnj.type === "vehicle") return this._bodyVehicle(pnj, deps);
    // Sprite compilé : entité MATRICIELLE (attrs A/C/T/D/F), corps dédié —
    // pas le corps physique d'édition (un sprite n'a pas de FOR). Cf. T3b.
    if (pnj.type === "sprite") return this._bodySprite(pnj, deps);
    // Les esprits sont des objets PNJ standards : le corps d'édition les
    // rend tel quel (jets, moniteurs, RR). Seule la barre de services est
    // injectée en tête.
    if (pnj.type === "spirit") {
      let core;
      switch (pnj.edition) {
        case "sr5": core = this._bodySR5(pnj, deps); break;
        case "sr6": core = this._bodySR6(pnj, deps); break;
        case "anarchy1": core = this._bodyAnarchy1(pnj, deps); break;
        case "anarchy2": core = this._bodyAnarchy(pnj, deps); break;
        default: return '<div class="pnj-card-body">—</div>';
      }
      return this._spiritServicesBar(pnj) + core;
    }
    let core;
    switch (pnj.edition) {
      case "sr5":
        core = this._bodySR5(pnj, deps);
        break;
      case "sr6":
        core = this._bodySR6(pnj, deps);
        break;
      case "anarchy1":
        core = this._bodyAnarchy1(pnj, deps);
        break;
      case "anarchy2":
        core = this._bodyAnarchy(pnj, deps);
        break;
      default:
        return '<div class="pnj-card-body">—</div>';
    }
    // Carte modulaire (VIS-15) — le PAYSAGE ÉPURÉ est une vue OPTIONNELLE,
    // ajoutée SANS toucher aux lentilles existantes (rail ☰❝⚔, qui gardent leur
    // rôle de pli des zones). Un toggle dédié (posé dans le même rail, cf.
    // `_lensSelector`) bascule `_curatedView` : la carte montre alors deux
    // colonnes SYSTÈME (moniteur + capacité signature + compétences en puces +
    // augmentations en tags) ↔ FICTION (saveur sous les titres + relations),
    // scannable, curée. Par DÉFAUT le drapeau est absent → rendu ORIGINAL,
    // byte-identique, lentilles pleinement actives : aucune régression.
    const ctx = { r: this, deps, density: 2, edModule: App.getEditionModule(pnj.edition) };
    if (CardRenderer._curatedView.has(pnj.id)) {
      const systemHtml = this._curatedSystem(pnj, deps) + CardZones.column("system", pnj, ctx);
      const fictionHtml = CardZones.column("fiction", pnj, ctx);
      if (!fictionHtml)
        return `<div class="pnj-card-body pnj-card-body--paysage"><div class="card-col card-col--system">${systemHtml}</div></div>`;
      return (
        `<div class="pnj-card-body pnj-card-body--paysage">` +
        `<div class="card-col card-col--system">${systemHtml}</div>` +
        `<div class="card-col card-col--fiction">${fictionHtml}</div>` +
        `</div>`
      );
    }
    // Vue complète (défaut) — assemblage ORIGINAL mono-colonne : incarnation +
    // identités promues en tête (l'incarnation se regarde avant le combat, I2),
    // le corps d'édition, puis traits/lore/mods + relations. La carte par défaut
    // ne change pas d'un octet.
    const top = this._flavorSection(pnj, deps) + this._topModulesHtml(pnj, deps);
    if (top) {
      const openIdx = core.indexOf(">") + 1;
      core = core.slice(0, openIdx) + top + core.slice(openIdx);
    }
    const tail =
      this._metaTraitsSection(pnj) +
      this._creatureLoreSection(pnj) +
      this._situationalMods(pnj) +
      (pnj.isPC ? this._contactLinksSection(pnj) : "") +
      this._factionsSection(pnj) +
      this._backlinksSection(pnj) +
      this._dossiersSection(pnj);
    if (tail) {
      const idx = core.lastIndexOf("</div>");
      if (idx !== -1) core = core.slice(0, idx) + tail + core.slice(idx);
    }
    return core;
  },

  /** Ids des cartes en vue PAYSAGE ÉPURÉ (toggle du rail) — état de vue
      éphémère, jamais persisté (comme le pli). Défaut = absent = rendu original. */
  _curatedView: new Set(),
  toggleCurated(id) {
    if (this._curatedView.has(id)) this._curatedView.delete(id);
    else this._curatedView.add(id);
  },

  /** DENSITÉ 2 — rendu CURÉ de la colonne système : ce que ce perso EST au
      combat, scannable, tout lançable. Trois blocs :
        1. Moniteur en BARRE (jauge neutre partagée avec l'annuaire) ;
        2. la capacité SIGNATURE selon l'archétype — sorts (mage), formes
           (techno), râtelier Matrice (decker/persona), pouvoirs (adepte) ou
           armes (combattant). Dispatch par la DONNÉE du pnj (jamais
           `App.edition`), réutilise les blocs de `offenseBlocks` — mêmes
           réserves, mêmes libellés d'édition ;
        3. les augmentations en TAGS (câblage, derme…), lues via `AUGS_KEYS`
           du module (Anarchy n'en a pas → rien).
      Le détail complet (toutes les armes, attributs, compétences) vit en
      densité 3 (« Vue complète »). */
  _curatedSystem(pnj, deps) {
    const ed = pnj.edition;
    const edMod = App.getEditionModule(ed);
    let html = "";
    // 1. Moniteur COCHABLE — le compact de la fiche légère : le MJ marque les
    // dégâts d'un clic (délégation `toggle-monitor`, déjà câblée), dispatch
    // d'édition via `pcTableBlock` (P/E en SR5, État en Anarchy) — 0 branche.
    // Une vraie surface de JEU, pas une barre passive.
    const mon =
      edMod && edMod.pcTableBlock ? this._tableBlockMonitors(pnj, edMod.pcTableBlock) : "";
    if (mon) html += `<div class="curated-monitor">${mon}</div>`;
    // 2. Capacité signature — un seul bloc, choisi par ce que le pnj possède.
    const deck = CyberdeckRenderer.combatArsenal(pnj, ed);
    const persona = PersonaRenderer.combatArsenal(pnj, ed);
    let cap = "";
    if (pnj.spells && pnj.spells.length) cap = this._spellsBlock(pnj, pnj.spells, ed);
    else if (pnj.complexForms && pnj.complexForms.length)
      cap = this._complexFormsBlock(pnj, pnj.complexForms, ed);
    else if (deck) cap = deck;
    else if (persona) cap = persona;
    else if (pnj.powers && pnj.powers.length)
      cap = this._listSection("Pouvoirs d'adepte", pnj.powers);
    else {
      // Combattant : armes signature (3 premières) en pastilles lançables.
      const { weapons } = ItemResolver.splitEquip(pnj.equip || []);
      const sorted = weapons
        .map((w) => ({ w, rank: edMod.weaponCategoryRank(ItemResolver.itemStr(w)) }))
        .sort((a, b) => a.rank - b.rank)
        .map(({ w }) => w);
      const pills = [];
      for (const w of sorted.slice(0, 3)) {
        const r = deps.WeaponRoll ? deps.WeaponRoll.resolvePool(pnj, w, ed) : null;
        const name =
          (deps.WeaponRoll ? deps.WeaponRoll.parse(w).name : null) || ItemResolver.itemStr(w);
        if (r)
          pills.push(
            `<span class="stat-pill rollable combat-pill" data-roll="${r.pool}" data-roll-label="${this._esc(name)}" title="${this._esc(name)}">${this._esc(name)} <strong>${r.pool}</strong></span>`,
          );
        // Sans réserve propre (Anarchy : on lance une compétence, l'arme ajoute
        // les dégâts) → pastille nom seul, référence non lançable.
        else pills.push(`<span class="stat-pill combat-pill">${this._esc(name)}</span>`);
      }
      if (pills.length) cap = `<div class="curated-pills">${pills.join("")}</div>`;
    }
    html += cap;
    // 2b. Compétences — puces compactes lançables (le MJ les jette sans cesse :
    // Perception, Discrétion, sociales…). Réutilise le rendu de `offenseBlocks`
    // (mêmes réserves, malus de blessure cuit). Triées pour le repérage (D5).
    const skills = (pnj.skills || [])
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
    if (skills.length) html += this._skillsSection(skills, Utils.dicePenalty(pnj, ed), { pnj });
    // 3. Augmentations en tags.
    const augs = edMod && edMod.AUGS_KEYS ? ItemResolver.augItems(pnj, edMod.AUGS_KEYS) : [];
    if (augs && augs.length) {
      // Tag COURT : le nom (+ indice) seul, sans les effets entre [ ] ou ( )
      // — la lecture d'un coup d'œil de « ce qui est implanté » (le détail
      // vit en vue complète).
      const tags = augs
        .map((a) => {
          const short = ItemResolver.itemStr(a).split(/[[(]/)[0].trim();
          return `<span class="aug-tag" title="${this._esc(ItemResolver.itemStr(a))}">${this._esc(short)}</span>`;
        })
        .join("");
      html += `<div class="curated-augs">${tags}</div>`;
    }
    return html;
  },

  /** Blocs d'OFFENSE du combattant actif, pour la console « Agir » du tracker
      (V7, principe « Agir produit / Réagir subit ») — ce que le PNJ PRODUIT à
      son tour, SANS moniteur (il ne subit rien sur son tour : le malus de
      blessure est déjà cuit dans les réserves affichées, la vie est dans
      l'effectif) : ② Armes → ③ Sorts · Matrice · Pouvoirs → ④ Compétences.
      ① Actions (économie du tour) est posé à part par le tracker (_activeEconomy).
      Réutilise les mêmes helpers de bloc que les corps d'édition (sr5/sr6/
      anarchy1) → édition-fidèle sans dupliquer leur rendu, et sans nouvelle
      branche `App.edition` (dispatch par la DONNÉE du pnj). R1 : l'état
      MAINTENU (⟳ ×N) et les drogues actives — seuls états hors des 4 blocs,
      portés jusqu'ici par le bloc moniteur retiré — sont réémis en tête (fine
      ligne d'état), jamais perdus. anarchy2 rend armes/compétences avec un
      balisage sur mesure (weapon-line/skill-tag, sorts au jet de risque) : il
      renvoie `null` → le tracker garde la fiche complète en attendant son
      propre constructeur d'offense. */
  offenseBlocks(pnj, deps = CardRenderer.liveDeps()) {
    if (!pnj || pnj._adhoc || pnj.edition === "anarchy2") return null;
    const ed = pnj.edition;
    const { weapons } = ItemResolver.splitEquip(pnj.equip || []);
    const malus = Utils.dicePenalty(pnj, ed);
    let html = "";
    // R1 — état maintenu (⟳ ×N · −ND) + drogues actives, réémis même sans la
    // fiche complète (ils vivaient dans le bloc moniteur / la zone Combat).
    const state = this._sustainBadge(pnj, ed) + this._drugRow(pnj, ed, deps);
    if (state) html += `<div class="offense-state">${state}</div>`;
    // ② Armes
    html += this._weaponBlock(pnj, weapons, ed, deps);
    // ③ Sorts · Matrice · Pouvoirs — capacités ACTIVES (mage=Sorts, techno=
    // formes/persona, decker=râtelier Matrice, adepte=Pouvoirs) ; le Drain vit
    // avec le sort (_spellsBlock).
    html += this._spellsBlock(pnj, pnj.spells, ed);
    html += this._complexFormsBlock(pnj, pnj.complexForms, ed);
    html += CyberdeckRenderer.combatArsenal(pnj, ed);
    html += PersonaRenderer.combatArsenal(pnj, ed);
    if (pnj.powers && pnj.powers.length)
      html += this._listSection("Pouvoirs d'adepte", pnj.powers);
    // ④ Compétences — jets génériques, triés ALPHABÉTIQUEMENT (D5 : repérage,
    // pas réserve décroissante) ; ② Armes et ③ capacités gardent l'ordre métier.
    const skills = (pnj.skills || [])
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr"));
    html += this._skillsSection(skills, malus, { pnj });
    return html;
  },

  /* ---- Modules conditionnels ------------------------------------
     Un module = une zone à part entière, placée après Combat, qui n'existe
     QUE si applies(pnj) est vrai. Formalise ce qui vivait en vrac
     (_magicSection, CyberdeckRenderer.block planqué en Détails). Le glyphe
     sert l'onglet conditionnel de module phare (_currentViewKey/_lensSelector
     ci-dessous). */
  _MODULES: [
    {
      key: "magie",
      label: "Magie",
      // ✦ (pas ✸, déjà pris par "Dégâts" dans cockpitLegend) — déjà établi
      // pour la magie ailleurs dans l'app (esprit mentor, badge Éveillé,
      // invocation d'esprit) : réutilisé, pas inventé (feedback_glyph_vocabulary).
      glyph: "✦",
      applies: (pnj) =>
        !!(
          pnj.tradition ||
          pnj.mentorSpirit ||
          (pnj.powers && pnj.powers.length) ||
          (pnj.esoteric && pnj.esoteric.voie === "initiation")
        ),
      render: (pnj) => CardRenderer._magieModule(pnj),
      lenses: ["fiche", "combat"],
    },
    {
      key: "matrice",
      label: "Matrice",
      glyph: "⚡",
      // Decker ET technomancien partagent ce module (même glyphe ⚡, même
      // zone) : deck OU persona incarné, jamais les deux à la fois en
      // pratique, mais le rendu concatène les deux blocs sans hypothèse.
      applies: (pnj) =>
        !!(pnj.cyberdeck || pnj.persona || (pnj.esoteric && pnj.esoteric.voie === "submersion")),
      render: (pnj, deps) =>
        CyberdeckRenderer.block(pnj, pnj.edition, deps) + PersonaRenderer.block(pnj, pnj.edition, deps),
      lenses: ["fiche", "combat"],
    },
    {
      key: "identites",
      label: "Identités",
      // ▤ : aucun glyphe « carte d'identité » n'existait dans le vocabulaire
      // établi (⚔⛉⛊◎⚡✸✦❖◈ tous pris ou hors-sujet), et le seul vrai de
      // l'Unicode — 🪪 — est un emoji en couleur qui jurerait dans le rail
      // en trait. ▤ (carré rempli de lignes) lit « carte + lignes de texte ».
      glyph: "▤",
      // Promue en haut, juste après Incarnation (cf. `_bodyFor`) : la SIN est
      // de la couverture, pas une action de combat — mais elle se lit avec le
      // personnage, pas au pied de la carte. `lenses` inclut "incarner" pour
      // la même raison ; jamais "combat".
      placement: "top",
      // Gardée par la DONNÉE, pas par `isPC` (I3 : aucune zone vide). Le bloc
      // est neutre — n'importe quelle édition peut peupler ces champs, même si
      // seul l'import Foundry SR5 le fait aujourd'hui. C'est la MODALE qui
      // offre toujours la section : c'est là qu'on crée la donnée.
      applies: (pnj) => !!((pnj.identities || []).length || (pnj.orphanLifestyles || []).length),
      render: (pnj) => CardRenderer._identitiesSection(pnj),
      summary: (pnj) => CardRenderer._identitiesSummary(pnj),
      lenses: ["fiche", "incarner"],
    },
    {
      key: "suivi",
      label: "Suivi",
      // ❖ libre dans cockpitLegend (V7 glyphes→sprite) — pas un emoji neuf.
      glyph: "❖",
      // PJ-c : PAS un module d'action → placement "foot" (au pied, jumelé au
      // Journal par le PLACEMENT, pas fusionné avec lui : Journal reste
      // universel, Suivi reste PJ-only). `_modulesHtml` (après Combat)
      // l'exclut ; seul `_footModulesHtml` le rend. `lenses` sans "combat" :
      // ne s'ouvre jamais en vue Combat (D1).
      placement: "foot",
      applies: (pnj) => !!pnj.isPC,
      render: (pnj) => CardRenderer._suiviModule(pnj),
      summary: (pnj) => CardRenderer._suiviSummary(pnj),
      lenses: ["fiche"],
    },
    {
      key: "relation",
      label: "Relation",
      // ◈ décidé avec l'utilisateur (2026-07-14) : sibling géométrique de ❖
      // (Suivi), libre dans cockpitLegend — pas un emoji neuf.
      glyph: "◈",
      // CO-c : formalise en module ce que CO-b avait migré en contenu plat
      // (stats + « Connu de »), faute de registre encore branché à ce
      // moment. PAS un module d'action (un contact n'a pas de Combat) →
      // placement "foot", jumelé au Journal comme Suivi ; `lenses` sans
      // "combat". CO-d : `applies` couvre aussi le PNJ déployé
      // (`sourceContactId`, résolu par `_relationSource`) — la Relation est
      // un jugement porté sur LE CONTACT, jamais dupliqué sur le PNJ.
      placement: "foot",
      applies: (pnj) => !!CardRenderer._relationSource(pnj),
      render: (pnj) => CardRenderer._relationModule(pnj),
      summary: (pnj) => CardRenderer._relationSummary(pnj),
      lenses: ["fiche"],
    },
  ],

  /** Rend les modules d'action applicables, chacun dans sa propre coquille de
      zone (I3 : aucun module vide). Appelé par les 4 corps d'édition juste
      après la zone Combat. Un module d'action est celui qui NE déclare AUCUN
      placement : le filtre est `!m.placement`, jamais une liste des placements
      à exclure — sinon chaque nouveau placement ("top", Identités) s'ajouterait
      ici en double, en plus de son emplacement voulu. */
  _modulesHtml(pnj, deps) {
    return CardRenderer._MODULES.filter((m) => !m.placement && m.applies(pnj))
      .map((m) => this._zoneShell(pnj, m.key, m.render(pnj, deps), m.summary ? m.summary(pnj) : ""))
      .join("");
  },

  /** Rend les modules "top" (Identités) — promus en haut du corps par
      `_bodyFor`, juste après Incarnation, jamais après Combat. */
  _topModulesHtml(pnj, deps) {
    return CardRenderer._MODULES.filter((m) => m.placement === "top" && m.applies(pnj))
      .map((m) => this._zoneShell(pnj, m.key, m.render(pnj, deps), m.summary ? m.summary(pnj) : ""))
      .join("");
  },

  /** Rend les modules "foot" (Suivi, PJ-c) — au pied de la carte, jamais
      après Combat (placement distinct du reste des modules d'action). */
  _footModulesHtml(pnj, deps) {
    return CardRenderer._MODULES.filter((m) => m.placement === "foot" && m.applies(pnj))
      .map((m) => this._zoneShell(pnj, m.key, m.render(pnj, deps), m.summary ? m.summary(pnj) : ""))
      .join("");
  },

  /** Module Magie : tradition, esprit mentor, pouvoirs d'adepte —
      consolidés (vivaient éparpillés : "extra" de fin de carte + zone
      Capacités). *Scope* : la Résistance au Drain RESTE en zone Combat (un
      jet actif de combat doit rester à 1 tap, cf. coût d'interruption) —
      déviation assumée de la table doctrine §4.3. */
  _magieModule(pnj) {
    let html = "";
    if (pnj.esoteric && pnj.esoteric.voie === "initiation") {
      html += this._esotericBadge(pnj);
    }
    if (pnj.tradition) {
      html += this._listSection("Tradition", [
        { name: pnj.tradition, desc: pnj.traditionDesc },
      ]);
    }
    if (pnj.mentorSpirit) {
      html += this._listSection("Esprit mentor", [pnj.mentorSpirit]);
    }
    if (pnj.powers && pnj.powers.length) {
      html += this._listSection("Pouvoirs d'adepte", pnj.powers);
    }
    return html;
  },

  /** Badge grade Initiation/Submersion (P2, socle Esoteric). Partagé entre
      le module Magie (Initiation) et le bloc PersonaRenderer (Submersion,
      module Matrice) — même mécanique de règle, cf. esoteric.js. Lecture
      seule ici : le choix d'acquis (métamagies/échos) vit au catalogue
      (P3/P4), pas dans ce badge. */
  _esotericBadge(pnj) {
    const edition = pnj.edition;
    const label = Esoteric.summaryLabel(pnj, edition);
    if (!label) return "";
    const nextCost = Esoteric.nextCostLabel(pnj, edition);
    const title = nextCost ? `Grade suivant : ${nextCost}` : "";
    return `<div class="ref-block esoteric-badge">
      <div class="ref-lbl" ${title ? `title="${this._esc(title)}"` : ""}>${this._esc(label)}</div>
    </div>`;
  },

  /* ---- Vues (lentilles) ------------------------------------------
     Une vue = un preset {zone→ouvert/fermé} (§4.2). C'est un VERBE, pas un
     état stocké : appliquer une vue ÉCRIT l'état de pli (pnj._zoneOpen,
     I4) — aucune 4ᵉ collection, aucun champ « vue active » persistant.
     Les modules suivent leurs propres `lenses` (§4.3) plutôt que le preset
     `zones` (universel aux 4 zones fixes seulement). */
  _VIEWS: [
    { key: "fiche", glyph: "☰", label: "Fiche", zones: { incarnation: true, combat: true, capacites: true, details: true } },
    { key: "incarner", glyph: "❝", label: "Incarner", zones: { incarnation: true, combat: false, capacites: false, details: false } },
    { key: "combat", glyph: "⚔", label: "Combat", zones: { incarnation: false, combat: true, capacites: true, details: false } },
  ],

  /** Applique une vue : écrit le pli des 4 zones universelles + des modules
      qui déclarent cette vue dans `lenses` (fermés sinon). Devient la
      nouvelle mémoire de la carte (I4), comme un pli manuel — jusqu'au
      prochain tap ou pli individuel. */
  applyView(pnj, viewKey) {
    const view = this._VIEWS.find((v) => v.key === viewKey);
    if (!view) return;
    const zoneOpen = { ...pnj._zoneOpen, ...view.zones };
    for (const m of this._MODULES) {
      zoneOpen[m.key] = m.lenses.includes(viewKey);
    }
    pnj._zoneOpen = zoneOpen;
  },

  /** CO-e : vues OFFERTES pour cette carte — un contact n'a pas de zone
      Combat (jamais de stats de combat), donc la vue Combat n'a rien à
      montrer et ne s'offre pas (I3, étendu du zonage au niveau vue). Filtre
      de données neutre sur la FORME de `pnj` (isContact), aucune branche
      d'édition. */
  _viewsFor(pnj) {
    return CardRenderer.isContact(pnj)
      ? CardRenderer._VIEWS.filter((v) => v.key !== "combat")
      : CardRenderer._VIEWS;
  },

  /** La vue actuellement affichée correspond-elle EXACTEMENT à un preset ?
      Sert uniquement à mettre en surbrillance l'onglet actif du sélecteur —
      un état de pli qui ne correspond à aucun preset (overrides mélangés)
      n'active simplement aucun onglet, ce qui est correct (I4). */
  _currentViewKey(pnj, deps) {
    const applicable = CardRenderer._MODULES.filter((m) => m.applies(pnj));
    return (
      this._viewsFor(pnj).find((v) => {
        const zonesMatch = Object.entries(v.zones).every(
          ([k, open]) => this._zoneIsOpen(pnj, k, deps) === open,
        );
        const modulesMatch = applicable.every(
          (m) => this._zoneIsOpen(pnj, m.key, deps) === m.lenses.includes(v.key),
        );
        return zonesMatch && modulesMatch;
      })?.key || null
    );
  },

  /** Sélecteur d'onglets glyphes = le RAIL « carnet » hors-cadre (doctrine
      §5), posé en frère du `.pnj-card-frame` dans la bande droite réservée
      par `.pnj-card.has-rail` — plus jamais dans le header (le glyphe ⚔ ne
      peut donc plus se lire comme le ✕ du coin-fermer). Présent dans TOUS les
      contextes de carte autonome, y compris le mur d'Ombres (le garde
      `context:"library"` est levé) ; la bande est réservée par carte,
      à l'intérieur du footprint, donc aucune collision avec la colonne
      voisine du layout multi-colonnes. Hit-area ≥ 44 px (padding), délégation
      data-lens (jamais de <select> natif). Entités liées (véhicules/esprits)
      exclues (I7). PJ-c/D5 : onglet(s) de module phare (Suivi ❖) ajoutés après
      les 3 vues — pas une vue, un accès direct 1-tap qui replie/déplie CE
      module précis (data-zone-toggle, même mécanique qu'un pli manuel).
      CO-e (carte Contact) : vues filtrées par `_viewsFor` (un contact n'offre
      pas Combat, I3) — le rail affiche donc ☰❝◈ pour un contact, jamais ⚔. */
  _lensSelector(pnj, deps) {
    if (pnj.type === "vehicle" || pnj.type === "spirit" || pnj.ownerId) return "";
    const current = this._currentViewKey(pnj, deps);
    const viewTabs = this._viewsFor(pnj).map((v) => {
      const active = v.key === current ? " active" : "";
      return `<button type="button" class="lens-tab${active}" data-lens="${v.key}" data-id="${pnj.id}" title="Vue : ${this._esc(v.label)}" aria-label="Vue : ${this._esc(v.label)}" aria-pressed="${v.key === current}">${v.glyph}</button>`;
    }).join("");
    const moduleTabs = CardRenderer._MODULES.filter((m) => m.placement === "foot" && m.applies(pnj))
      .map((m) => {
        const open = this._zoneIsOpen(pnj, m.key, deps);
        return `<button type="button" class="lens-tab${open ? " active" : ""}" data-zone-toggle="${m.key}" data-id="${pnj.id}" title="${this._esc(m.label)}" aria-label="${this._esc(m.label)}" aria-pressed="${open}">${m.glyph}</button>`;
      })
      .join("");
    // Toggle PAYSAGE ÉPURÉ — vue de jeu optionnelle, posée dans le MÊME rail
    // que les lentilles (un seul endroit, pas de chrome éparpillé). N'est pas une
    // « vue » de pli : un état de rendu à part (`_curatedView`), séparé des
    // ☰❝⚔ par un fin filet. Hors contacts (pas de contenu de combat à curer).
    const curatedToggle = CardRenderer.isContact(pnj)
      ? ""
      : `<button type="button" class="lens-tab lens-curated${this._curatedView.has(pnj.id) ? " active" : ""}" data-curated-toggle data-id="${pnj.id}" title="Vue de jeu épurée (paysage)" aria-label="Vue de jeu épurée (paysage)" aria-pressed="${this._curatedView.has(pnj.id)}">◫</button>`;
    return `<div class="lens-selector" role="tablist" aria-label="Vue">${viewTabs}${moduleTabs}${curatedToggle}</div>`;
  },

  /* ---- Traits raciaux de métavariante ---- */
  _metaTraitsSection(pnj) {
    if (!pnj.metaTraits || !pnj.metaTraits.length) return "";
    const label =
      pnj.metaFamily === "zoocanthrope"
        ? "Traits zoocanthropes"
        : pnj.metaFamily === "metaconscience"
          ? "Traits de métaconscience"
          : "Traits de métavariante";
    return this._tagsSection(label, pnj.metaTraits);
  },

  /* ---- Description (lore) d'une créature du catalogue, lecture seule ---- */
  _creatureLoreSection(pnj) {
    if (pnj.type !== "creature" || !pnj.lore) return "";
    return `<div class="card-section flavor-section">
      <div class="card-section-label">Description</div>
      <div style="font-size:0.75rem;">${this._esc(pnj.lore)}</div>
    </div>`;
  },

  /* ---- Habillage (âge, signe, manie, motivation, style, attitude) ----
     Zone Incarnation : « Portrait » reste le mot pour l'image IA,
     le vocabulaire verrouillé de la ZONE est « Incarnation » (porté par le
     libellé du zone-toggle, cf. _ZONE_LABELS).
     PJ-b (dissolution de `_pcNarrativeZone`, Anarchy 2, p.50-51) : Mots-clés/
     Comportements/Répliques d'un PJ rejoignent cette même zone — champs
     neutres (`pnj.keywords`/`behaviors`/`quotes`), aucune branche d'édition,
     zone déjà présente aux 4 éditions (I6). Vide sur un PNJ (champs absents),
     comme avant.
     CO-b (carte Contact) : `deps.editable` (D-edit-A) rend chaque ligne
     éditable en ligne (`data-contact-flavor`) + ajoute le bouton ⟳ (relance
     tout le portrait, ex-`ContactRenderer._portrait`). Sortie PNJ inchangée
     octet pour octet quand `editable` est faux (défaut). */
  _flavorSection(pnj, deps = CardRenderer.liveDeps()) {
    const f = pnj.flavor;
    const editable = !!(deps && deps.editable);
    const defs = f
      ? [
          ["age", "Âge", f.age != null ? `${f.age} ans` : null],
          ["signe", "Signe distinctif", f.signe],
          ["style", "Style", f.style],
          ["attitude", "Attitude", f.attitude],
          ["manie", "Manie", f.manie],
          ["motivation", "Motivation", f.motivation],
        ].filter(([, , v]) => v)
      : [];
    const rows = defs
      .map(([field, k, v]) =>
        editable
          ? `<div class="flavor-row"><span class="flavor-key">${k}</span><span class="flavor-val" contenteditable="true" spellcheck="false" data-contact-flavor="${field}">${this._esc(String(v))}</span></div>`
          : `<div class="flavor-row"><span class="flavor-key">${k}</span><span class="flavor-val">${this._esc(String(v))}</span></div>`,
      )
      .join("");
    const reroll =
      editable && rows
        ? `<button type="button" class="btn-icon-tiny" title="Relancer le portrait" data-action="contact-reroll-flavor" data-id="${this._esc(pnj.id)}">⟳</button>`
        : "";
    let html = rows
      ? `<div class="card-section flavor-section">${reroll ? `<div class="card-section-label">Portrait${reroll}</div>` : ""}${rows}</div>`
      : "";
    if (pnj.keywords && pnj.keywords.length) html += this._listSection("Mots-clés", pnj.keywords);
    if (pnj.behaviors && pnj.behaviors.length) html += this._listSection("Comportements", pnj.behaviors);
    if (pnj.quotes && pnj.quotes.length) {
      html += `<div class="card-section">
        <div class="card-section-label">Répliques</div>
        <div class="card-section-content pc-quotes">
          ${pnj.quotes.map((q) => `<div class="pc-quote">« ${this._esc(q)} »</div>`).join("")}
        </div>
      </div>`;
    }
    if (!html) return "";
    const summary = (f && (f.style || f.attitude || f.motivation)) || (pnj.keywords && pnj.keywords[0]) || "";
    return this._zoneShell(pnj, "incarnation", html, summary);
  },

  /* ---- Réserves de dés utiles au MJ ---- */
  _gmPoolRow(label, value, title, opts = {}) {
    if (value == null) return "";
    const n = Number(value);
    const rollAttrs =
      Number.isFinite(n) && n >= 1
        ? ` data-roll="${n}" data-roll-label="${this._esc(label)}"`
        : "";
    const rollableCls = Number.isFinite(n) && n >= 1 ? " rollable" : "";
    // Même décompte ⓘ que les pastilles de combat (Lot D) : survol desktop /
    // appui long tactile → panneau reserveBreakdown, sur la pastille
    // elle-même. "" si l'édition ne décompose pas la clé → aucune affordance
    // orpheline (Anarchy sur ces réserves).
    const explain =
      opts.key && opts.pnj ? this._breakdownAttrs(opts.pnj, opts.key) : "";
    return `<span class="stat-pill gm-pool${rollableCls}" title="${this._esc(title)}"${rollAttrs}${explain}>${label}&nbsp;<strong>${value}</strong></span>`;
  },

  /* ========================================================
     Cartes organisées par usage de jeu : zones Combat / Capacités /
     Incarnation / Détails, chacune repliable. Préférences :
     défaut global (Réglages) + surcharge PAR ZONE, PAR CARTE (carte de
     pli sparse mémorisée sur pnj._zoneOpen). Corps par édition dans les
     fichiers cardrenderer.sr5/sr6/anarchy.js.
     ======================================================== */

  /** Préférences d'affichage, avec défaut ADAPTATIF. Recâblé
      sur le moteur de vues — plus de réglage global (les 3 cases attributs/
      Jets de situation/équipement et le levier layout ont été retirés des
      Réglages, remplacés par les vues + le pli par carte). L'ancien blob
      `cardDisplay` hérité n'est plus jamais lu (aucun crash, présentation
      pure). Reste le SEUL défaut adaptatif par contexte : bibliothèque
      (consultation) → toujours compact ; sinon responsive (≤1024px). */
  _displayPrefs(deps) {
    const shows = { showGmPools: true, showAttributes: true, showEquipment: true };
    if (deps && deps.context === "library") return { layout: "compact", ...shows };
    const compact =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1024px)").matches;
    return { layout: compact ? "compact" : "expanded", ...shows };
  },

  /** Libellés verrouillés (CONTRIBUTING § Chrome de carte). Magie/Matrice
      reprennent le libellé de leur module (_MODULES), gardés ici aussi
      pour que _zoneShell reste un point d'entrée unique. */
  _ZONE_LABELS: {
    combat: "Combat",
    capacites: "Capacités",
    incarnation: "Incarnation",
    identites: "Identités",
    details: "Détails",
    magie: "Magie",
    matrice: "Matrice",
    suivi: "Suivi",
    relation: "Relation",
    journal: "Journal",
  },

  /** Cette zone est-elle ouverte pour cette carte ? Résolution (I4) :
      1. override par carte, PAR ZONE (persisté, sparse) — gagne et reste.
      2. défaut de contexte (_displayPrefs).
      Compat : l'ancien pnj._refOpen (booléen unique) ne couvrait
      que l'ex-Référence → lu comme repli pour la zone "details" seulement,
      tant qu'aucun override _zoneOpen.details n'existe. Présentation pure,
      aucun schemaVersion (comme _refOpen hier). */
  _zoneIsOpen(pnj, zoneKey, deps = CardRenderer.liveDeps()) {
    const map = pnj._zoneOpen;
    if (map && typeof map[zoneKey] === "boolean") return map[zoneKey];
    if (zoneKey === "details" && typeof pnj._refOpen === "boolean") return pnj._refOpen;
    return this._displayPrefs(deps).layout === "expanded";
  },

  /** Pastille de réserve lançable (Défense, Encaissement…).
      opts = { title, glyph, key, pnj, deps } — key+pnj posent le détail
      décomposé sur la pastille ELLE-MÊME (data-explain), un seul contrôle :
      clic/tap lance (inchangé), survol desktop ou appui long tactile ouvre le
      décompte (Breakdown, js/widgets/card/breakdown.js). Le résultat du jet
      porte aussi le détail (data-roll-detail, déjà affiché par
      diceroller.js). `deps` (si fourni avec `pnj`) ajoute l'affordance Edge
      pré-jet en mode « pastille » (V1 vague 3b), sibling distinct du tap nu. */
  /** Attributs de décompte (data-roll-detail + data-explain) d'une réserve
      motorisée par reserveBreakdown — partagés par _rollPill (combat) et
      _gmPoolRow (jets de situation), jamais dupliqués. La chaîne plate
      data-roll-detail est celle que diceroller pose dans le résultat du jet ;
      data-explain/-pnj ouvre le panneau Breakdown (survol/appui long, sur la
      pastille même). "" si l'édition ne décompose pas la clé. */
  _breakdownAttrs(pnj, key) {
    const ed = key && pnj ? App.getEditionModule(pnj.edition) : null;
    const bd = ed && ed.reserveBreakdown ? ed.reserveBreakdown(pnj, key) : null;
    if (!bd || !bd.length) return "";
    const detail = bd
      .map((c, i) =>
        i === 0
          ? `${c.label} ${c.value}`
          : `${c.value >= 0 ? "+" : "−"} ${c.label} ${Math.abs(c.value)}`,
      )
      .join(" ");
    return ` data-roll-detail="${this._esc(detail)}" data-explain="${key}" data-explain-pnj="${this._esc(pnj.id)}"`;
  },

  _rollPill(label, value, opts = {}) {
    if (value == null) return "";
    const { title, glyph, key, pnj, deps } = opts;
    const glyphHtml = glyph
      ? `<span class="pill-glyph" aria-hidden="true">${glyph}</span> `
      : "";
    const explain = key && pnj ? this._breakdownAttrs(pnj, key) : "";
    const pillHtml = `<span class="stat-pill rollable combat-pill" data-roll="${value}" data-roll-label="${this._esc(label)}"${explain} title="${this._esc(title || label)}">${glyphHtml}${this._esc(label)} <strong>${value}</strong></span>`;
    return pillHtml + (pnj && deps ? this._edgePrerollHtml(pnj, deps) : "");
  },

  /** Affordance Edge pré-jet (V1 vague 3b) : petit contrôle DISTINCT, posé en
      sibling juste après une pastille/ligne lançable, jamais dans le même
      contrôle qu'elle (le tap nu de la pastille reste un lancer immédiat,
      loi 3). N'existe que si le réglage « pastille » est actif ET qu'au
      moins une option d'Edge pré-jet (contrat neutre preRollEdge) est
      abordable pour ce PNJ — sinon "" (aucune pastille orpheline). Au clic,
      diceroller.js résout le vrai jet depuis l'élément lançable voisin
      (`_resolveRollContext`), jamais depuis un attribut dupliqué ici. */
  _edgePrerollHtml(pnj, deps) {
    if (!deps.DiceRoller || deps.DiceRoller.preRollMode() !== "pill") return "";
    const options = deps.DiceRoller.preRollEdgeOptions(pnj);
    if (!options.some((o) => o.affordable)) return "";
    return ` <button type="button" class="edge-preroll" data-preroll-open aria-label="Edge avant le jet" title="Edge avant le jet">Edge</button>`;
  },

  _zoneEyebrow(label) {
    return `<div class="zone-eyebrow">${this._esc(label)}</div>`;
  },

  /** Bloc d'armes lançables, sorti dans la zone Combat. */
  _weaponBlock(pnj, weapons, edition, deps) {
    if (!weapons.length) return "";
    // Rangé par catégorie (Mains nues → mêlée → pistolets → armes d'épaule
    // → lourd), rang lu depuis le module d'édition — jamais de taxonomie
    // ici (prohibition n°1). Tri stable, calcul du rang une fois par arme.
    // Le rang matche par égalité exacte contre `equipPools` (#2), qui stocke
    // la chaîne COMPLÈTE avec crochets — passer le nom seul (sans crochets)
    // ferait manquer tous les matches catalogue et retomberait sur le repli.
    const ed = App.getEditionModule(edition);
    weapons = weapons
      .map((w) => ({ w, rank: ed.weaponCategoryRank(ItemResolver.itemStr(w)) }))
      .sort((a, b) => a.rank - b.rank)
      .map(({ w }) => w);
    const rows = weapons
      .map((w) => {
        const s = ItemResolver.itemStr(w); // #63 : item chaîne OU objet
        const r = deps.WeaponRoll ? deps.WeaponRoll.resolvePool(pnj, w, edition) : null;
        const parsed = deps.WeaponRoll ? deps.WeaponRoll.parse(w) : { name: s };
        const name = parsed.name || s;
        const stat = s.includes("[")
          ? s.split("[")[1].replace("]", "").replace(/,\s*/g, " · ")
          : "";
        if (!r) {
          return `<div class="weapon-line"><div><div class="weapon-name">${this._esc(name)}</div><div class="weapon-stat">${this._esc(stat)}</div></div></div>`;
        }
        // Explication du jet, GÉNÉRALE : décompose le pool depuis
        // `contributions` (compétence + attribut + spécialité + smartlink +
        // effets d'objet − blessure) plutôt que des champs figés (V3).
        const parts = (r.contributions || []).map((c, i) => {
          const label = i === 0 && r.approx ? `${c.label} ~` : c.label;
          if (i === 0) return `${label} ${c.value}`;
          return `${c.value >= 0 ? "+" : "−"} ${label} ${Math.abs(c.value)}`;
        });
        // Facettes d'objet motorisées, GÉNÉRALES : VD, précision, PA (chaque
        // facette résolue par WeaponEffects porte ses contributions étiquetées).
        // Les LIBELLÉS viennent du module (prohibition n°1) : SR6 renomme
        // Précision → SO (weaponModel.facetLabels), les mots SR5 ne fuient plus.
        const fl = (App.getEditionModule(edition)?.weaponModel || {}).facetLabels || {};
        const FACETS = [
          ["dvContributions", fl.dv || "VD"],
          ["accuracyContributions", fl.accuracy || "Prec"],
          ["apContributions", fl.ap || "PA"],
        ];
        const facetChips = [];
        const facetTxts = [];
        for (const [fkey, flbl] of FACETS) {
          const list = r[fkey] || [];
          if (!list.length) continue;
          const sum = list.reduce((a, c) => a + c.value, 0);
          const sign = (v) => (v >= 0 ? "+" : "−") + Math.abs(v);
          facetTxts.push(list.map((c) => `${flbl} ${sign(c.value)} ${c.source}`).join(" · "));
          if (sum)
            facetChips.push(`<span class="lim" title="${this._esc(list.map((c) => `${flbl} ${sign(c.value)} ${c.source}`).join(" · "))}">${flbl}${sign(sum)}</span>`);
        }
        const facetTxt = facetTxts.join(" · ");
        // Une arme brickée en scène (Encounter.deviceState) perd sa
        // pastille d'attaque — l'enforcement réel que R1d renvoyait ici.
        // Hors combat (ou hors participant), `dev` est null : aucun effet.
        const dev = deps.Encounter ? deps.Encounter.deviceState(pnj.id, s) : null;
        const bricked = !!(dev && dev.bricked);
        const title = bricked
          ? `${r.weaponName} : hors service (brické)`
          : `${r.weaponName} : ${r.pool} dés (${parts.join(" ")})${r.limit != null ? ` · limite ${r.limit}` : ""}${facetTxt ? ` · ${facetTxt}` : ""}`;
        const poolBadge = bricked
          ? `<span class="weapon-pool weapon-bricked">⛔</span>`
          : `<span class="weapon-pool">⚄${r.pool}${r.limit != null ? `<span class="lim">▸${r.limit}</span>` : ""}${r.rr ? `<span class="lim">RR${r.rr}</span>` : ""}${r.smartBonus ? `<span class="lim">SL+${r.smartBonus}</span>` : ""}${facetChips.join("")}</span>`;
        const dataAttr = bricked
          ? ""
          : App.getEditionModule(edition)?.usesRiskPanel
            ? `data-roll-weapon-anarchy="${this._esc(name)}"`
            : `data-roll-weapon="${this._esc(s)}" data-roll-edition="${edition}"`;
        return `<div class="weapon-line${bricked ? " is-bricked" : " weapon-rollable rollable"}" ${dataAttr} ${bricked ? "" : `data-roll-pnj="${pnj.id}"`} title="${this._esc(title)}">
          <div><div class="weapon-name">${this._esc(name)}</div><div class="weapon-stat">${this._esc(stat)}</div></div>
          ${poolBadge}${bricked ? "" : this._edgePrerollHtml(pnj, deps)}
        </div>`;
      })
      .join("");
    return `<div class="weapon-block">${rows}</div>`;
  },

  /** Coquille de zone repliable : bouton (libellé + résumé + chevron)
      + corps animé (`.zone-body`, fold CSS dans pnj-card.css). Zone/module
      vide = rien (I3) — pas de zone qui n'a aucun contenu à montrer. */
  _zoneShell(pnj, zoneKey, bodyHtml, summary = "") {
    if (!bodyHtml) return "";
    const open = this._zoneIsOpen(pnj, zoneKey);
    const label = this._ZONE_LABELS[zoneKey] || zoneKey;
    return `<div class="card-zone${open ? "" : " zone-collapsed"}" data-zone="${zoneKey}">
      <button class="zone-toggle" data-zone-toggle="${zoneKey}" data-id="${pnj.id}">
        <span class="zone-toggle-label">${this._esc(label)}</span>
        ${summary ? `<span class="zone-toggle-summary">${this._esc(summary)}</span>` : ""}
        <span class="chev">▾</span>
      </button>
      <div class="zone-body"><div class="zone-body-inner"><div class="zone-body-pad">${bodyHtml}</div></div></div>
    </div>`;
  },

  /* ---- Helpers ---- */
  _initPill(base, dice, pnj, attrDetail = "") {
    const b = Number(base) || 0;
    const d = Number(dice) || 1;
    const id = pnj && pnj.id ? pnj.id : "";
    const li = pnj && pnj.lastInit ? pnj.lastInit : null;

    // Résultat lancé affiché à la suite, avec bouton d'effacement.
    let resultHtml = "";
    if (li && Number.isFinite(li.total)) {
      const detail = `${li.base} + [${(li.faces || []).join(", ")}]`;
      resultHtml =
        ` <span class="init-result" title="${this._esc(li.total + " = " + detail)}">` +
        `→ <strong>${li.total}</strong>` +
        `<span class="init-clear" data-init-clear="${id}" role="button" title="Effacer l'initiative">✕</span>` +
        `</span>`;
    }

    const baseTxt = attrDetail ? `${attrDetail} (${b})` : b;
    const detailAttr = attrDetail
      ? ` data-roll-init-detail="${this._esc(attrDetail)}"`
      : "";
    return `<span class="stat-pill accent rollable init-pill" data-roll-init="${b}" data-roll-init-dice="${d}" data-roll-pnj="${id}"${detailAttr} title="Lancer l'initiative : ${baseTxt} + ${d}D6">Init <strong>${b}+${d}D6</strong>${resultHtml}</span>`;
  },

  _attrCell(label, value, extraClass = "", opts = {}) {
    const n = Number(value);
    const rollable = opts.roll && Number.isFinite(n) && n >= 1;
    const edAttr = opts.edition ? ` data-roll-edition="${opts.edition}"` : "";
    // RR d'atout d'équipement (Anarchy 2 : « RR N aux tests de <attribut> »).
    // data-roll-rr est déjà consommé par le moteur de dés (figé à 0 avant) ;
    // opts.rr par défaut 0 → aucun effet sur SR5/SR6.
    const rr = opts.rr || 0;
    const rollAttrs = rollable
      ? ` data-roll="${n}" data-roll-label="${this._esc(label)}"${edAttr} data-roll-rr="${rr}" title="Lancer ${n} dés — ${this._esc(label)}${rr > 0 ? ` (RR ${rr})` : ""}"`
      : "";
    const cls = `attr-cell ${extraClass} ${rollable ? "rollable" : ""}`.trim();
    return `<div class="${cls}"${rollAttrs}>
      <span class="attr-label">${label}</span>
      <span class="attr-value">${value ?? "—"}${rr > 0 ? `<span class="lim">RR${rr}</span>` : ""}</span>
    </div>`;
  },

  _monitorBoxes(pnjId, type, total, filled = 0) {
    return Array.from({ length: total }, (_, i) => {
      const isFilled = i < filled;
      // Pénalité toutes les 3 cases
      const isPenalty = (i + 1) % 3 === 0;
      const cls =
        `monitor-box ${isFilled ? "filled" : ""} ${isPenalty ? "penalty" : ""}`.trim();
      return `<div class="${cls}" data-action="toggle-monitor" data-id="${pnjId}" data-sev="${type}" data-idx="${i}"></div>`;
    }).join("");
  },

  /** Barre fine de moniteur (mini-jauge de vie), partagée par la ligne
      d'annuaire, le cockpit (EncounterRenderer._lifeGauge) et tout consommateur
      d'un descripteur `conditionMonitor.gauge`. Dessine AVEUGLÉMENT : largeur =
      `frac`, teinte = `level`. L'édition a déjà tranché la gravité (y compris
      l'inversion à seuils d'Anarchy 2 : 1 grave alarme plus que 2 légères).
      Rien sans moniteur (`gauge` null : PJ ad-hoc, CI). */
  lifeBar(gauge, extraClass = "") {
    if (!gauge) return "";
    const tone = gauge.level ? ` is-${gauge.level}` : "";
    const cls = `encounter-life${extraClass ? ` ${extraClass}` : ""}`;
    return `<div class="${cls}" title="Moniteur : ${gauge.label}" aria-hidden="true"><span class="encounter-life-fill${tone}" style="width:${Math.round(gauge.frac * 100)}%"></span></div>`;
  },

  /** Cases de moniteur en LECTURE SEULE (aucune interaction — pas de
      data-action), dessinées à partir d'un descripteur `conditionMonitor.gauge`
      selon sa FORME. Pour l'écran spectateur, qui est une projection :
      - `ladder` → une rangée continue, pénalité toutes les 3 cases ;
      - `tiers`  → segments par palier (2 légères | 1 grave | 1 incapacitante),
        la gravité reste lisible au lieu d'un total aplati.
      Rien sans moniteur. */
  gaugeBoxes(gauge) {
    if (!gauge) return "";
    if (gauge.form === "tiers") {
      return gauge.tiers
        .map((t) =>
          Array.from({ length: t.cap }, (_, i) =>
            `<div class="${`monitor-box sev-${t.sev} ${i < t.filled ? "filled" : ""}`.trim()}"></div>`,
          ).join(""),
        )
        .join(`<span class="monitor-gap"></span>`);
    }
    return Array.from({ length: gauge.total }, (_, i) =>
      `<div class="${`monitor-box ${i < gauge.filled ? "filled" : ""} ${(i + 1) % 3 === 0 ? "penalty" : ""}`.trim()}"></div>`,
    ).join("");
  },

  /** Malus cumulé en marge du moniteur (grille du livre — SR6 p.43) :
      même valeur déjà calculée par chaque renderer (Utils.woundMalus), donc
      pas de nouveau calcul ici. Vide si aucun malus (cas le plus fréquent). */
  _monitorMalusBadge(malus) {
    if (!(malus > 0)) return "";
    return `<div class="monitor-malus" title="Malus de blessure cumulé (déjà appliqué aux tests)">−${malus}D</div>`;
  },

  /** Badge « effets maintenus » — jumeau du badge de blessure : combien de
      sorts/formes le PNJ maintient et le malus de pool qui en découle
      (−2/effet, déjà appliqué à TOUTES les réserves via Utils.dicePenalty).
      Un coup d'œil suffit pour « ce PNJ est à −N ». Vide si aucun effet
      maintenu, ou si l'édition n'a pas la règle (Anarchy : sustainMalus = 0). */
  _sustainBadge(pnj, edition) {
    const n = Utils.sustainedCount(pnj);
    if (!n) return "";
    const malus = Utils.sustainMalus(pnj, edition);
    if (!malus) return "";
    return `<div class="sustain-malus" title="${n} effet(s) maintenu(s) — −${malus} dés à tous les tests (déjà appliqué aux réserves)">⟳ ×${n} · −${malus}D</div>`;
  },

  /**
   * @param {Object} [opts]
   * @param {string} [opts.label] - libellé de section (ex. "Connaissances")
   * @param {string} [opts.extraClass] - classe CSS ajoutée aux tags, pour
   *   distinguer visuellement une variante (ex. connaissances SR5 vs
   *   compétences actives — même mécanique de lancer de dés).
   */
  /** Rend un tag de compétence/connaissance : <button> quand il est lançable
      (focus + activation Entrée/Espace NATIFS → la délégation click de
      diceroller.js:96 fait le jet, on ne la redouble pas), sinon <span>.
      L'affordance visible au repos (dé ⚄ + bordure) vit dans base.css. */
  _rollableTag(rollable, cls, attrs, inner) {
    return rollable
      ? `<button type="button" class="${cls}"${attrs}>${inner}</button>`
      : `<span class="${cls}"${attrs}>${inner}</span>`;
  },

  _skillsSection(skills, malus = 0, opts = {}) {
    if (!skills || !skills.length) return "";
    const { label = "Compétences", extraClass = "", pnj = null } = opts;
    const malusTxt = malus > 0 ? ` (malus blessure −${malus})` : "";
    // PNJ porté explicitement par le tag (pas seulement déduit de la carte
    // englobante `.pnj-card` par la délégation) : sans lui, un jet de compétence
    // lancé HORS d'une carte — ex. la console « Agir » du tracker V7, qui monte
    // ces tags via CardRenderer.offenseBlocks sans coquille de carte — perdait
    // l'attribution (Edge pré-jet, journal). Inoffensif dans la carte : la
    // délégation préfère cet attribut, qui vaut le `.pnj-card` englobant.
    const pnjAttr = pnj ? ` data-roll-pnj="${pnj.id}"` : "";
    const tags = skills
      .map((s) => {
        const n = Number(s.val);
        // Bonus de pool d'objet (SkillEffects) cuit
        // dans la réserve cliquable, avec sa source. Contributions
        // {value, source} — même vocabulaire que WeaponEffects.
        const contribs =
          pnj && typeof SkillEffects !== "undefined"
            ? SkillEffects.forSkill(pnj, s.name)
            : [];
        const bonus = contribs.reduce((a, c) => a + c.value, 0);
        const srcTxt = contribs.length
          ? " — dont " + contribs.map((c) => `${c.source} +${c.value}`).join(", ")
          : "";
        const eff = Number.isFinite(n) ? Math.max(0, n + bonus - malus) : n;
        const rollable = Number.isFinite(eff) && eff >= 1;
        const rollAttrs = rollable
          ? ` data-roll="${eff}"${pnjAttr} data-roll-label="${this._esc(s.name)}"${srcTxt ? ` data-roll-detail="${this._esc(s.name + " " + eff + srcTxt)}"` : ""} title="Lancer ${eff} dés — ${this._esc(s.name)}${malusTxt}${this._esc(srcTxt)}"`
          : "";
        let html = this._rollableTag(
          rollable,
          `tag skill-tag${extraClass}${rollable ? " rollable" : ""}`,
          rollAttrs,
          `${this._esc(s.name)}&nbsp;<strong style="color:var(--text)">${eff}</strong>`,
        );
        if (s.spec && s.spec !== true) {
          // Spécialité : +2 dés sur le pool en SR5/SR6 (le bonus d'objet
          // s'ajoute aussi à la spécialité, même réserve de base).
          const specN = Number.isFinite(n) ? Math.max(0, n + 2 + bonus - malus) : null;
          const specRollable = !!(specN && specN >= 1);
          const specRoll = specRollable
            ? ` data-roll="${specN}"${pnjAttr} data-roll-label="${this._esc(s.name)} · ${this._esc(s.spec)}" title="Spécialité ${this._esc(s.spec)} : ${specN} dés (+2)${malusTxt}${this._esc(srcTxt)}"`
            : ` title="Spécialité ${this._esc(s.spec)} : +2 dés${malusTxt}"`;
          html += this._rollableTag(
            specRollable,
            `tag skill-tag skill-tag-spec${specRollable ? " rollable" : ""}`,
            specRoll,
            `◊&nbsp;${this._esc(s.spec)}`,
          );
        }
        return html;
      })
      .join("");
    return `<div class="card-section">
      <div class="card-section-label">${label}${malus > 0 ? ` <span class="wound-malus-badge" title="Malus de blessure automatique">−${malus}D</span>` : ""}</div>
      <div class="card-section-content">
        ${tags}
      </div>
    </div>`;
  },

  /**
   * Connaissances SR5/SR6 (Livre de Règles SR5 p.150-152, mécanique reprise
   * en SR6) — un test de connaissance = valeur de connaissance + attribut
   * lié (Logique pour Académique/Professionnelle, Intuition pour Rue/
   * Hobbies — PAS « centres d'intérêt », erreur corrigée ici). L'attribut se
   * lit d'abord sur `k.cat` (catégorie choisie à l'ajout, EditModal
   * ME-connaissances) via `SkillCatalog.knowledgeCategories`, sinon en
   * dernier recours par lookup du nom dans la réserve `sr5Knowledges`
   * (items legacy sans catégorie explicite). On affiche donc le POOL
   * (comme les réserves MJ), avec le détail « Attribut + Connaissance »,
   * et un tag visuellement distinct.
   * @param {Array} knowledges
   * @param {Object} pnj - pour lire l'attribut lié sur pnj.attrs et l'édition
   * @param {number} malus - malus de blessure
   */
  _knowledgesSection(knowledges, pnj, malus = 0) {
    if (!knowledges || !knowledges.length) return "";
    // Bonus de pool applicable à toute connaissance (Amélioration
    // mnémonique). Blanket → résolu une fois, ajouté à chaque puce.
    const kContribs =
      pnj && typeof SkillEffects !== "undefined"
        ? SkillEffects.forKnowledge(pnj)
        : [];
    const kBonus = kContribs.reduce((a, c) => a + c.value, 0);
    const kSrc = kContribs.length
      ? " + " + kContribs.map((c) => `${c.source} ${c.value}`).join(" + ")
      : "";
    const tags = knowledges
      .map((k) => {
        const rating = Number(k.val);
        // Catégorie explicite (ajout à la main, EditModal) d'abord — un nom
        // libre ne peut pas être fiablement résolu par lookup ; en dernier
        // recours, réserve de suggestions sr5Knowledges (items legacy).
        const attr =
          (k.cat && SkillCatalog.knowledgeCategories[k.cat]) ||
          SkillCatalog.attrFor(pnj.edition, k.name); // LOG | INT | null
        const attrVal = attr ? Actor.attr(pnj, attr) : 0;
        const pool = Number.isFinite(rating)
          ? Math.max(0, rating + attrVal + kBonus - malus)
          : rating;
        const attrLabel = attr ? Utils.attrFullName(attr) : "";
        const detail = attr
          ? `${attrLabel} ${attrVal} + ${k.name} ${rating}${kSrc}`
          : "";
        const rollable = Number.isFinite(pool) && pool >= 1;
        const rollAttrs = rollable
          ? ` data-roll="${pool}" data-roll-label="${this._esc(k.name)}" data-roll-detail="${this._esc(detail)}" title="Test de connaissance : ${this._esc(detail)}"`
          : "";
        return this._rollableTag(
          rollable,
          `tag skill-tag skill-tag-knowledge${rollable ? " rollable" : ""}`,
          rollAttrs,
          `${this._esc(k.name)}&nbsp;<strong style="color:var(--text)">${pool}</strong>`,
        );
      })
      .join("");
    return `<div class="card-section">
      <div class="card-section-label">Connaissances</div>
      <div class="card-section-content">
        ${tags}
      </div>
    </div>`;
  },

  _listSection(label, items) {
    if (!items || !items.length) return "";
    return `<div class="card-section">
      <div class="card-section-label">${label}</div>
      <div class="card-section-content">
        ${items.map((i) => this._contentTag(i)).join("")}
      </div>
    </div>`;
  },

  /** Infos rapides d'un sort, affichées sous son nom (façon `weapon-stat`) :
      code/valeur de Drain (SR5/SR6) ou seuil (Anarchy), puis catégorie. */
  _spellInfo(sp) {
    if (!sp || typeof sp !== "object") return "";
    const bits = [];
    // Note de palier (Anarchy 1re : dégâts/effet propres au profil, ex. "8P aire").
    if (sp.note) bits.push(sp.note);
    if (sp.drain != null) bits.push(`Drain ${sp.drain}`);
    else if (sp.seuil != null) bits.push(`Seuil ${sp.seuil}`);
    else if (sp.niveau != null) bits.push(`Niveau ${sp.niveau}`);
    if (sp.cat) bits.push(sp.cat);
    return bits.join(" · ");
  },

  /** Bloc de sorts lançables, en zone Combat — rendu façon armes
      (`.weapon-line` : nom + infos rapides + pastille de réserve, clic pour
      lancer). Le dernier jet (succès) est mémorisé sur `sp._lastCast` et
      présenté sur la ligne (utile pour un sort maintenu ; ✕ pour effacer).
      Éditions à VD (SR5/SR6/Anarchy1) : clic → `data-cast-spell` (MagicAction).
      Anarchy 2 (option `opts.viaRisk`) : clic → jet de risque Sorcellerie
      (`data-roll`), le Drain étant géré par complication. */
  _spellsBlock(pnj, spells, edition, opts = {}) {
    if (!spells || !spells.length) return "";
    const ed = App.getEditionModule(edition);
    const canCast = ed.spellSkill && pnj.drainResist != null;
    const rows = spells
      .map((sp) => {
        const name = (sp && sp.name) || String(sp);
        const info = this._spellInfo(sp);
        const infoBtn =
          sp && sp.desc
            ? `<span class="spell-info" role="button" tabindex="0" data-content-name="${this._esc(name)}" data-content-desc="${this._esc(sp.desc)}" title="Détails du sort">ⓘ</span>`
            : "";
        const last = sp && sp._lastCast;
        const sustained = !!(last && last.sustained);
        const lastHtml = last
          ? `<span class="spell-last${sustained ? " is-sustained" : ""}">` +
            `<span class="spell-sustain" data-spell-sustain="${this._esc(name)}" data-roll-pnj="${pnj.id}" role="button" tabindex="0" aria-pressed="${sustained}" title="${sustained ? "Sort maintenu (−2 dés à tous les tests) — cliquer pour arrêter" : `Dernier jet : ${last.hits} succès — cliquer pour maintenir (−2 dés à tous les tests)`}">${sustained ? "⟳" : "→"} <strong>${last.hits}</strong></span>` +
            `</span>`
          : "";

        let castAttr = "";
        let poolBadge = "";
        if (opts.viaRisk) {
          // Anarchy 2 : lance via la compétence Sorcellerie (jet de risque).
          const pool = opts.riskPool || 0;
          castAttr = `data-roll="${pool}" data-roll-label="Sorcellerie · ${this._esc(name)}" data-roll-edition="${edition}" data-roll-rr="${opts.riskRR || 0}" data-roll-spell="${this._esc(name)}"`;
          poolBadge = pool ? `<span class="weapon-pool">⚄${pool}</span>` : "";
        } else if (canCast) {
          castAttr = `data-cast-spell="${this._esc(name)}"`;
          const pool = Magic.actionPool(pnj, ed.spellSkill, edition);
          poolBadge = pool ? `<span class="weapon-pool">⚄${pool}</span>` : "";
        }
        const rollable = !!castAttr;
        const lineCls = `weapon-line spell-line${rollable ? " weapon-rollable rollable" : ""}`;
        return `<div class="${lineCls}" ${castAttr} data-roll-pnj="${pnj.id}">
          <div class="spell-main">
            <div class="weapon-name">${this._esc(name)} ${infoBtn}</div>
            ${info ? `<div class="weapon-stat">${this._esc(info)}</div>` : ""}
          </div>
          ${poolBadge}
          ${lastHtml}
        </div>`;
      })
      .join("");
    return `<div class="weapon-block spell-block">
      <div class="zone-eyebrow">Sorts</div>
      ${rows}
    </div>`;
  },

  /** Bloc de formes complexes lançables (T2), mirroir exact de
      `_spellsBlock` — pool via `Resonance.actionPool` (RES, pas Magie),
      VT via `technoFormSkill`. `manualTest` (ex. FAQ SR5, seule entrée dont
      le test ne suit pas le patron Logiciels+Résonance) : pas de clic, ⓘ
      seulement, comme les formes SR6 sans test nommé au livre. */
  _complexFormsBlock(pnj, forms, edition) {
    if (!forms || !forms.length) return "";
    const ed = App.getEditionModule(edition);
    const canCast = ed.technoFormSkill && pnj.technoDrainResist != null;
    const rows = forms
      .map((f) => {
        const name = (f && f.name) || String(f);
        const info = f && f.vt != null ? `${ed.technoCostLabel || "VT"} ${f.vt}` : "";
        const infoBtn =
          f && f.desc
            ? `<span class="spell-info" role="button" tabindex="0" data-content-name="${this._esc(name)}" data-content-desc="${this._esc(f.desc)}" title="Détails de la forme">ⓘ</span>`
            : "";
        const last = f && f._lastCast;
        const sustained = !!(last && last.sustained);
        const lastHtml = last
          ? `<span class="spell-last${sustained ? " is-sustained" : ""}">` +
            `<span class="spell-sustain" data-form-sustain="${this._esc(name)}" data-roll-pnj="${pnj.id}" role="button" tabindex="0" aria-pressed="${sustained}" title="${sustained ? "Forme complexe maintenue (−2 dés à tous les tests) — cliquer pour arrêter" : `Dernier jet : ${last.hits} succès — cliquer pour maintenir (−2 dés à tous les tests)`}">${sustained ? "⟳" : "→"} <strong>${last.hits}</strong></span>` +
            `</span>`
          : "";

        let castAttr = "";
        let poolBadge = "";
        if (canCast && f && !f.manualTest) {
          castAttr = `data-cast-form="${this._esc(name)}"`;
          const pool = Resonance.actionPool(pnj, f.skill || ed.technoFormSkill, edition);
          poolBadge = pool ? `<span class="weapon-pool">⚄${pool}</span>` : "";
        }
        const rollable = !!castAttr;
        const lineCls = `weapon-line spell-line${rollable ? " weapon-rollable rollable" : ""}`;
        return `<div class="${lineCls}" ${castAttr} data-roll-pnj="${pnj.id}">
          <div class="spell-main">
            <div class="weapon-name">${this._esc(name)} ${infoBtn}</div>
            ${info ? `<div class="weapon-stat">${this._esc(info)}</div>` : ""}
          </div>
          ${poolBadge}
          ${lastHtml}
        </div>`;
      })
      .join("");
    return `<div class="weapon-block spell-block">
      <div class="zone-eyebrow">Formes complexes</div>
      ${rows}
    </div>`;
  },

  /* Rend un élément de contenu : objet {nom, desc} -> tag cliquable
     ouvrant une modale ; chaîne simple -> tag normal. Pour les sorts, un
     champ drain (SR5/SR6) ou niveau (Anarchy) est affiché dans le libellé. */
  /* Libellé court d'un bonus de trait (voir BonusEngine / content.js). */
  _bonusLabel(bonus) {
    if (!bonus) return "";
    if (bonus.initDice) return `+${bonus.initDice} Init`;
    if (bonus.stat) {
      const labels = { composure: "Sang-froid", memory: "Mémoire" };
      return `+${bonus.val} ${labels[bonus.stat] || bonus.stat}`;
    }
    if (bonus.attr) return `+${bonus.val} ${bonus.attr}`;
    if (bonus.skill) return `+${bonus.val} ${bonus.skill}`;
    return "";
  },

  _contentTag(item) {
    if (item && typeof item === "object" && item.name) {
      const name = this._esc(item.name);
      // Trait typé négatif (import Foundry, D5 : affiché tel que saisi par
      // le joueur, jamais validé — le champ ment parfois, ex. « Recherché »
      // en positive chez Mellon/Nane).
      const negClass = item.type === "negative" ? " tag-negative" : "";
      // Suffixe Drain (SR5/SR6) ou Seuil (Anarchy 2.0) pour les sorts.
      let suffix = "";
      if (item.drain != null) {
        suffix = ` <span class="tag-stat">(Drain ${this._esc(item.drain)})</span>`;
      } else if (item.seuil != null) {
        suffix = ` <span class="tag-stat">(Seuil ${this._esc(item.seuil)})</span>`;
      } else if (item.bonus) {
        const label = this._bonusLabel(item.bonus);
        if (label) suffix = ` <span class="tag-stat">(${this._esc(label)})</span>`;
      }
      if (item.desc) {
        // _esc échappe " donc le contenu est sûr dans un attribut entre guillemets.
        // Pas de onclick inline : on stocke nom/desc en data-* et on délègue
        // le clic/clavier (voir ContentModal.bindDelegation), ce qui évite tout
        // problème d'apostrophes ou de guillemets dans le texte.
        const desc = this._esc(item.desc);
        const t = this._esc(item.name);
        return `<span class="tag tag-clickable${negClass}" role="button" tabindex="0"
          data-content-name="${t}" data-content-desc="${desc}"
          >${name}${suffix}<span class="tag-info">i</span></span>`;
      }
      return `<span class="tag${negClass}">${name}${suffix}</span>`;
    }
    return `<span class="tag">${this._esc(item)}</span>`;
  },

  _tagsSection(label, items) {
    return this._listSection(label, items);
  },

  /** Tag cliquable d'une drogue détectée : cycle à 3 clics idle → effet →
      contrecoup → idle (OK), cf. js/drugs.js. */
  _drugTag(pnj, edition, drug, rawLabel, deps) {
    const state = deps.Drugs.state(pnj, drug.id);
    const next = deps.Drugs.next(state);
    const nextLabel = { effect: "Effet", sideEffect: "Contrecoup", idle: "OK" }[next];
    const info =
      state === "idle"
        ? `${drug.effect.text} → ${drug.sideEffect.text}`
        : state === "effect"
          ? drug.effect.text
          : drug.sideEffect.text;
    const stateClass =
      state === "effect" ? " drug-effect" : state === "sideEffect" ? " drug-side" : "";
    return `<span class="tag drug-tag${stateClass}" role="button" tabindex="0"
      data-action="cycle-drug" data-id="${pnj.id}" data-edition="${edition}" data-drug="${drug.id}"
      title="${this._esc(info)}">${this._esc(rawLabel)}<span class="drug-next">${nextLabel}</span></span>`;
  },

  /** Ligne compacte, toujours visible dans la zone Combat (pas besoin de
      déplier la Référence), listant les drogues détectées dans
      l'équipement (SR5/SR6) et les atouts (Anarchy). */
  _drugRow(pnj, edition, deps) {
    if (!deps.Drugs) return "";
    const found = [];
    for (const i of pnj.equip || []) {
      const drug = deps.Drugs.matchItem(i, edition, "equip");
      if (drug) found.push(this._drugTag(pnj, edition, drug, i, deps));
    }
    if (App.getEditionModule(edition).hasEdges) {
      for (const a of pnj.edges || []) {
        const drug = deps.Drugs.matchItem(a, edition, "edges");
        if (drug) found.push(this._drugTag(pnj, edition, drug, a, deps));
      }
    }
    if (!found.length) return "";
    return `<div class="combat-drugs">${found.join("")}</div>`;
  },

  /** Section Équipement où les weapons (VD/PRE) deviennent lançables. */
  /** Inventaire consolidé — équipement porté + augmentations en UNE
      seule section (au lieu de deux fragments distincts). Sous-libellés
      (patron .ref-block/.ref-lbl, déjà utilisé pour Attributs en Détails —
      des FRÈRES avec bordure-bas, jamais imbriqués) seulement s'il y a
      plusieurs groupes — sinon liste plate, pas de sous-titre qui ne
      distingue rien (minimalisme). `augs` optionnel. Le « Porté » se
      sous-groupe à son tour en Armes/Divers, même règle : un PJ importé de
      Foundry (Cisco, 29 armes + 8 armures + 25 objets dans une seule liste
      plate, SR5 n'a pas de pnj.weapons séparé) devient lisible sans nouveau
      composant. */
  _equipSection(pnj, items, edition, deps, augs, decorate) {
    // `decorate(itemStr)` (optionnel) : HTML additionnel accolé à un tag
    // d'item, fourni par l'édition appelante — garde `_equipSection` neutre
    // (aucune dépendance à une règle d'édition ici). Utilisé par Anarchy 2
    // pour un badge « Points d'Anarchy de scène ».
    const deco = typeof decorate === "function" ? decorate : () => "";
    const weaponTags = [];
    const otherTags = [];
    for (const i of items || []) {
      const s = ItemResolver.itemStr(i); // #63 : item chaîne OU objet
      // Les drogues sont pilotées depuis leur tag dans la zone Combat
      // (this._drugRow) — ici, texte simple pour éviter le doublon.
      if (deps.Drugs && deps.Drugs.matchItem(s, edition, "equip")) {
        otherTags.push(this._contentTag(s) + deco(s));
        continue;
      }
      const isWeapon = /\[/.test(s) && /(VD|PRE)/.test(s);
      if (!isWeapon) {
        otherTags.push(this._contentTag(s) + deco(s));
        continue;
      }
      const r = deps.WeaponRoll ? deps.WeaponRoll.resolvePool(pnj, s, edition) : null;
      if (!r) {
        weaponTags.push(this._contentTag(s));
        continue;
      }
      const limTxt = r.limit != null ? ` · lim ${r.limit}` : "";
      const approxTxt = r.approx ? " ~" : "";
      const smartTxt = r.smartBonus ? ` · +${r.smartBonus} smartlink` : "";
      const title = `${r.weaponName} : ${r.pool} dés (${r.matchedSkill || r.skill}${approxTxt} ${r.skillVal} + ${r.attr} ${r.attrVal})${limTxt}${smartTxt} — cliquer pour lancer`;
      weaponTags.push(`<span class="tag weapon-rollable rollable" data-roll-weapon="${this._esc(s)}" data-roll-pnj="${pnj.id}" data-roll-edition="${edition}" title="${this._esc(title)}">${this._esc(s)}<span class="weapon-pool">⚄${r.pool}${r.limit != null ? `<span class="weapon-lim">▸${r.limit}</span>` : ""}</span></span>`);
    }
    const weaponsHtml = weaponTags.join("");
    const othersHtml = otherTags.join("");
    const augsHtml = (augs || []).length
      ? augs.map((a) => { const s = ItemResolver.itemStr(a); return this._contentTag(s) + deco(s); }).join("")
      : "";
    if (!weaponsHtml && !othersHtml && !augsHtml) return "";

    const bothPorté = weaponsHtml && othersHtml;
    const groups = [
      bothPorté && { label: "Armes", html: weaponsHtml },
      bothPorté && { label: "Divers", html: othersHtml },
      !bothPorté && (weaponsHtml || othersHtml) && { label: "Porté", html: weaponsHtml || othersHtml },
      augsHtml && { label: "Augmentations", html: augsHtml },
    ].filter(Boolean);

    const body =
      groups.length > 1
        ? groups
            .map((g) => `<div class="ref-block"><div class="ref-lbl">${g.label}</div><div class="card-section-content">${g.html}</div></div>`)
            .join("")
        : `<div class="card-section-content">${groups[0].html}</div>`;
    return `<div class="card-section">
      <div class="card-section-label">Équipement</div>
      ${body}
    </div>`;
  },

  /** Résumé de la zone Identités porté par l'en-tête repliée : l'identité
      active d'abord (c'est ce qu'on joue), le nombre de SIN ensuite. Un PJ
      qui n'a que des styles de vie orphelins n'a pas de SIN à nommer. */
  _identitiesSummary(pnj) {
    const ids = pnj.identities || [];
    if (!ids.length) return (pnj.orphanLifestyles || []).length ? "sans SIN" : "";
    const active = ids.find((i) => i.name === pnj.activeIdentity) || ids[0];
    return `${active.name}${ids.length > 1 ? ` · ${ids.length} SIN` : ""}`;
  },

  /** Identités (SIN) — Lot 5 import Foundry, `pnj.identities` (D1, champ
      additif). Une ligne par identité (nom · nationalité · niveau),
      licences au pli (`<details>` natif, aucun JS neuf). Identité active
      (D2) marquée ●. Styles de vie orphelins (`pnj.orphanLifestyles` —
      « sans SIN » ou libellé pendant, Failsafe) en pied de section, jamais
      perdus. Neutre : n'importe quelle édition peut peupler ces champs.
      Rend le CONTENU nu : c'est une zone à part entière (module `identites`),
      son en-tête et son pli viennent de `_zoneShell` — plus le `.ref-block`
      enterré en bas de Détails qui disparaissait avec lui. */
  _identitiesSection(pnj) {
    const ids = pnj.identities || [];
    const orphans = pnj.orphanLifestyles || [];
    if (!ids.length && !orphans.length) return "";
    const lifestylesHtml = (list) =>
      list.length
        ? `<div class="card-section-content">${list.map((l) => this._contentTag(l.city ? `${l.name} · ${l.city}` : l.name)).join("")}</div>`
        : "";
    const rows = ids
      .map((idn) => {
        const active = idn.name === pnj.activeIdentity ? "● " : "";
        const bits = [idn.nationality, idn.rating != null ? `niv. ${idn.rating}` : ""].filter(Boolean).join(" · ");
        const licenses = idn.licenses || [];
        const licensesHtml = licenses.length
          ? `<details class="identity-licenses"><summary>${licenses.length} licence${licenses.length > 1 ? "s" : ""}</summary>
              ${licenses.map((l) => this._contentTag(l.rating ? `${l.name} ${l.rating}` : l.name)).join("")}
            </details>`
          : "";
        return `<div class="identity-row">
          <div class="identity-head">${active}<strong>${this._esc(idn.name)}</strong>${bits ? ` <span class="tag-stat">(${this._esc(bits)})</span>` : ""}</div>
          ${lifestylesHtml(idn.lifestyles || [])}
          ${licensesHtml}
        </div>`;
      })
      .join("");
    const orphanHtml = orphans.length
      ? `<div class="identity-row identity-orphan"><div class="identity-head">Sans SIN</div>${lifestylesHtml(orphans)}</div>`
      : "";
    return `${rows}${orphanHtml}`;
  },

  /** Section « Modificateurs situationnels » : effets d'objet qui bonifient
      un test/une situation sans surface de jet dédiée (résistances, limites
      de Perception…). Visibles + sourcés, jamais auto-appliqués (garde-fou).
      Vide → rien (ActorEffects absent ou aucun modificateur actif). */
  _situationalMods(pnj) {
    const mods =
      typeof ActorEffects !== "undefined" ? ActorEffects.forActor(pnj) : [];
    if (!mods.length) return "";
    // Style inline volontaire (CSS de carte éditée en parallèle par une autre
    // session — on reste disjoint au niveau fichier ; à extraire plus tard).
    const rows = mods
      .map(
        (m) =>
          `<div style="display:flex;align-items:baseline;gap:6px;font-size:var(--fs-xs);padding:1px 0;">
            <span style="flex:1 1 auto;">${this._esc(m.scope)}</span>
            <span style="font-family:var(--font-mono);font-weight:700;color:var(--accent);">+${m.value}</span>
            <span style="color:var(--text-dim);">${this._esc(m.source)}</span>
          </div>`,
      )
      .join("");
    return `<div class="card-section">
      <div class="card-section-label">Modificateurs situationnels</div>
      ${rows}
    </div>`;
  },

  _esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  /** Le bouton « Portrait IA » est-il pertinent ? Opt-in actif et aucun
      portrait encore généré (véhicules exclus — hors scope). Consommé par
      _footer pour décider d'un item du menu ⋯. */
  _portraitEnabled(pnj, deps) {
    return (
      pnj.type !== "vehicle" &&
      !pnj.portraitUrl &&
      !!deps.Settings &&
      deps.Settings.getPortraitSettings().enabled
    );
  },

  /* ---- Journal de fiche (F2) ----
     Notes datées, empilées en tête. Zone repliable comme les autres
     (data-zone-toggle="journal", _zoneShell), plus de bouton de repli
     bespoke. Universel (tous types sauf entités liées/transitoires) —
     contrairement à Suivi (PJ-only), Journal reste un simple `_zoneShell`
     hors registre de modules (pas conditionnel). */
  _journal(pnj, deps) {
    if (pnj.type === "vehicle" || pnj.type === "spirit" || pnj.ownerId) return "";
    const entries = Array.isArray(pnj.journal) ? pnj.journal : [];
    const summary = entries.length ? `${entries.length} note${entries.length > 1 ? "s" : ""}` : "";
    return this._zoneShell(pnj, "journal", this._journalInner(pnj), summary);
  },

  /** Contenu du Journal (liste + saisie), sans coquille — réutilisé tel quel
      par le module Suivi n'est PAS le cas (Suivi et Journal restent deux
      zones distinctes, cf. _MODULES "suivi" placement:"foot"). */
  _journalInner(pnj) {
    const entries = Array.isArray(pnj.journal) ? pnj.journal : [];
    const rows = entries
      .map((e) => {
        const d = new Date(e.ts);
        const dstr = isNaN(d.getTime())
          ? ""
          : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
        return `<li class="journal-entry" data-ts="${e.ts}">
          <span class="journal-date">${dstr}</span>
          <span class="journal-text">${Mentions.renderText(e.text)}</span>
          <button class="journal-del" data-action="journal-remove" data-id="${pnj.id}"
            data-ts="${e.ts}" title="Supprimer cette note" aria-label="Supprimer">✕</button>
        </li>`;
      })
      .join("");
    return `${entries.length ? `<ul class="journal-list">${rows}</ul>` : ""}
      <div class="journal-input-row">
        <input type="text" class="journal-input" data-journal-input data-mentions data-id="${pnj.id}"
          maxlength="200" placeholder="Une note, datée…" aria-label="Nouvelle note">
        <button class="journal-add-btn" data-action="journal-add" data-id="${pnj.id}">Ajouter</button>
      </div>`;
  },

  /** Focus (re)mis sur l'input de journal d'une fiche, après un rendu. Le
      journal vit aussi bien sur un `.pnj-card` que sur un `.contact-card`
      (mêmes data-* de délégation) : on cible les deux familles de carte. */
  _focusJournalInput(id) {
    setTimeout(() => {
      document
        .querySelector(
          `.pnj-card[data-id="${id}"] [data-journal-input], .contact-card[data-id="${id}"] [data-journal-input]`,
        )
        ?.focus();
    }, 0);
  },

  /** Lit l'input de la carte cliquée et délègue l'ajout à UI (persistance),
      puis re-focus l'input (l'ajout reste ouvert pour empiler plusieurs notes). */
  _submitJournal(actionEl) {
    const id = actionEl.dataset.id;
    const input = actionEl
      .closest(".pnj-card, .contact-card")
      ?.querySelector("[data-journal-input]");
    const text = input ? input.value : "";
    if (!text.trim()) return;
    UI.addJournalEntry(id, text);
    this._focusJournalInput(id);
  },

  /* ---- Module Suivi (PJ-c) — Progression : nuyens, Karma, réputation,
     compteurs libres. Neutre, aucune branche d'édition — les ressources
     arrivent de `Campaign.tracks` (dont la réputation via
     `edModule.reputationTracks`). Placement "foot" (cf. _MODULES), jamais
     après Combat, jamais en vue Combat (lenses:["fiche"]). */

  /* Vague A3 : marqueur TRANSIENT (présentation seule) du dernier compteur
     modifié par une action directe sur la carte (`_submitLedger`), pour lui
     faire jouer un flash bref au re-rendu qui suit. Auto-consommé dans
     `_trackLine` : une entrée n'y survit qu'un seul rendu. */
  _flashTrack: new Map(),

  /* D3 (PJ-c) : quelles lignes-ressource sont dépliées (montant+motif+✓) sur
     quelle carte. TRANSIENT, présentation seule — clé `${pnjId}:${resKey}`. */
  _suiviLineOpen: new Set(),

  /** Résumé affiché dans l'en-tête de la zone Suivi même repliée (D3 :
      soldes visibles au repos) : soldes non nuls + compte de notes. */
  _suiviSummary(pnj) {
    const edModule = App.getEditionModule(pnj.edition);
    const tracks = Campaign.tracks(pnj, edModule);
    const parts = tracks
      .map((t) => ({ t, bal: Campaign.balance(pnj.campaign, t.key) }))
      .filter((b) => b.bal !== 0)
      .map((b) => (b.t.glyph ? `${b.bal.toLocaleString("fr-FR")}${b.t.glyph}` : `${b.t.label} ${b.bal}`));
    return parts.join(" · ");
  },

  /** Corps du module Suivi : une ligne libellée par ressource (D3, remplace
      la rangée de boutons-glyphes ambiguë), registre daté en dessous. */
  _suiviModule(pnj) {
    const edModule = App.getEditionModule(pnj.edition);
    const tracks = Campaign.tracks(pnj, edModule);
    const lines = tracks
      .map((t) => this._trackLine(pnj, t, Campaign.balance(pnj.campaign, t.key)))
      .join("");
    const entries = (pnj.campaign && pnj.campaign.ledger) || [];
    const ledger = entries.length
      ? `<ul class="progression-list">${entries.map((e) => this._ledgerRow(pnj, e, tracks)).join("")}</ul>`
      : "";
    return `<div class="progression-lines">${lines}</div>${ledger}`;
  },

  /** Ligne-ressource D3 : label + solde toujours visibles ; toucher la ligne
      déplie SUR PLACE montant + motif + ✓ (≤2 taps, découvrable). */
  _trackLine(pnj, t, bal) {
    const key = `${pnj.id}:${t.key}`;
    const open = this._suiviLineOpen.has(key);
    const flash = this._flashTrack.delete(key) ? " entry-flash" : "";
    const balStr = t.glyph
      ? `${bal.toLocaleString("fr-FR")} ${this._esc(t.glyph)}`
      : `${bal}`;
    const row = `<button type="button" class="suivi-line${flash}${open ? " open" : ""}"
      data-action="suivi-line-toggle" data-id="${pnj.id}" data-res="${this._esc(t.key)}"
      aria-expanded="${open}" title="${this._esc(t.label)}">
      <span class="suivi-line-label">${this._esc(t.label)}</span>
      <span class="suivi-line-bal">${balStr}</span>
      <span class="suivi-line-add" aria-hidden="true">${open ? "▾" : "＋"}</span>
    </button>`;
    if (!open) return row;
    return `${row}<div class="suivi-line-form">
      <input type="number" class="progression-amount" data-id="${pnj.id}"
        placeholder="± montant" aria-label="Montant (signé)">
      <input type="text" class="progression-reason" data-id="${pnj.id}" data-mentions
        maxlength="120" placeholder="Motif (run, achat…)" aria-label="Motif">
      <button type="button" class="suivi-line-submit" data-action="ledger-add" data-id="${pnj.id}"
        data-res="${this._esc(t.key)}" aria-label="Valider">✓</button>
    </div>`;
  },

  /** Ligne du registre : date · montant signé · motif (puces @/#) · suppression.
      Réutilise `.journal-date`/`.journal-del` (même grammaire que le journal). */
  _ledgerRow(pnj, e, tracks) {
    const d = new Date(e.ts);
    const dstr = isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    const t = tracks.find((x) => x.key === e.res);
    const sign = e.delta > 0 ? "+" : "";
    const amount =
      t && t.glyph
        ? `${sign}${e.delta.toLocaleString("fr-FR")} ${this._esc(t.glyph)}`
        : `${sign}${e.delta} ${this._esc(t ? t.label : e.res)}`;
    const cls = "progression-delta" + (e.delta < 0 ? " neg" : " pos");
    const reason = e.reason
      ? `<span class="progression-reason-txt">${Mentions.renderText(e.reason)}</span>`
      : "";
    return `<li class="progression-entry">
      <span class="journal-date">${dstr}</span>
      <span class="${cls}">${amount}</span>
      ${reason}
      <button class="journal-del" data-action="ledger-remove" data-id="${pnj.id}"
        data-ts="${e.ts}" title="Supprimer cette écriture" aria-label="Supprimer">✕</button>
    </li>`;
  },

  /** Ouvre/replie la ligne-ressource (présentation seule). */
  _toggleSuiviLine(id, res) {
    const key = `${id}:${res}`;
    if (this._suiviLineOpen.has(key)) this._suiviLineOpen.delete(key);
    else this._suiviLineOpen.add(key);
    UI.refreshEntityCard(id);
  },

  /** Lit montant + motif DANS LE FORMULAIRE de la ligne cliquée (jamais
      carte-wide : plusieurs lignes peuvent être dépliées en même temps) et
      écrit l'entrée pour la ressource du bouton. Le re-rendu vide les champs. */
  _submitLedger(actionEl) {
    const id = actionEl.dataset.id;
    const res = actionEl.dataset.res;
    const form = actionEl.closest(".suivi-line-form");
    const delta = parseInt(form?.querySelector(".progression-amount")?.value, 10);
    if (!Number.isFinite(delta) || delta === 0) return;
    const reason = form?.querySelector(".progression-reason")?.value || "";
    this._flashTrack.set(`${id}:${res}`, true);
    UI.addLedgerEntry(id, res, delta, reason);
  },

  /* ---- Footer ---- */
  /* Grammaire de pied unifiée (voir CONTRIBUTING « Chrome de carte ») : on
     décrit les actions, CardFooter les dispose (secondaire + primaire + ⋯).
     Seul le primaire porte un glyphe. Le socle préfixe ★/🏷 à gauche. */
  _footer(pnj, actions, deps = CardRenderer.liveDeps()) {
    if (this.isContact(pnj)) return this._footerContact(pnj, deps);
    const id = pnj.id;
    const saved = JSON.stringify(actions);

    // Véhicule / esprit invoqué : « Ranger » (quitter la scène) en primaire
    // terminal ; Éditer en secondaire.
    if (pnj.type === "vehicle") {
      return CardFooter.render(
        [
          { kind: "secondary", label: "Éditer", attrs: `data-action="edit-open" data-id="${id}"` },
          { kind: "primary", danger: true, icon: "⏏", label: "Ranger", attrs: `data-action="dismiss-vehicle" data-id="${id}"` },
        ],
        { savedActions: saved },
      );
    }
    if (pnj.type === "spirit" && pnj.ownerId) {
      const acts = [
        { kind: "secondary", label: "Éditer", attrs: `data-action="edit-open" data-id="${id}"` },
        { kind: "primary", danger: true, icon: "⏏", label: "Ranger", attrs: `data-action="dismiss-spirit" data-id="${id}"` },
      ];
      // Lié / Non lié (SR5/SR6) : mirroir d'Inscrire (sprite) — un esprit lié
      // ajoute la Magie de l'invocateur à l'opposition au bannissement (SR5).
      // Seulement là où le bannissement est motorisé (banishSkill).
      if (App.getEditionModule(pnj.edition)?.banishSkill)
        acts.push({ kind: "menu", label: pnj.bound ? "Délier" : "Lier (invocation durable)", attrs: `data-action="toggle-spirit-bind" data-id="${id}"` });
      if (this._portraitEnabled(pnj, deps))
        acts.push({ kind: "menu", label: "Portrait IA", attrs: `data-action="generate-portrait" data-id="${id}"` });
      return CardFooter.render(acts, { savedActions: saved });
    }
    // Sprite compilé : « Renvoyer » (retour à la Résonance, non permanent —
    // vocabulaire technomancien) en primaire terminal ; Éditer en secondaire.
    // Inscrire/Libérer (SR : sprite permanent vs éphémère) en débordement.
    if (pnj.type === "sprite" && pnj.ownerId) {
      const acts = [
        { kind: "secondary", label: "Éditer", attrs: `data-action="edit-open" data-id="${id}"` },
        { kind: "primary", danger: true, icon: "⏏", label: "Renvoyer", attrs: `data-action="dismiss-sprite" data-id="${id}"` },
      ];
      if (pnj.regime === "sr")
        acts.push({ kind: "menu", label: pnj.registered ? "Libérer (désinscrire)" : "Inscrire", attrs: `data-action="toggle-sprite-inscribe" data-id="${id}"` });
      return CardFooter.render(acts, { savedActions: saved });
    }

    const has = (k) => actions.includes(k);
    const acts = [];

    // Primaire : Sauvegarder (générateur) sinon ⚔ Combat (l'action reine à la table).
    if (has("save"))
      acts.push({ kind: "primary", icon: "⊕", label: "Sauvegarder", attrs: `data-action="save-pnj" data-id="${id}"` });
    else
      acts.push({ kind: "primary", icon: "⚔", label: "Combat", attrs: `data-action="add-to-encounter" data-id="${id}"` });

    // Secondaire visible : Éditer.
    if (has("edit"))
      acts.push({ kind: "secondary", label: "Éditer", attrs: `data-action="edit-open" data-id="${id}"` });

    // ⋯ : Combat (rétrogradé quand Sauvegarder est primaire), Dupliquer,
    // Portrait, Foundry, puis le destructif en dernier (rouge, annulable).
    if (has("save"))
      acts.push({ kind: "menu", label: "Combat", attrs: `data-action="add-to-encounter" data-id="${id}"` });
    if (has("remove"))
      acts.push({ kind: "menu", label: "Dupliquer", attrs: `data-action="duplicate-pnj" data-id="${id}"` });
    if (this._portraitEnabled(pnj, deps))
      acts.push({ kind: "menu", label: "Portrait IA", attrs: `data-action="generate-portrait" data-id="${id}"` });
    // Export Foundry : uniquement si l'édition l'expose. Lecture neutre du
    // module d'édition, jamais de branche `App.edition === …` (prohibition #1).
    if (App.getEditionModule(pnj.edition)?.foundryExport)
      acts.push({ kind: "menu", label: "Foundry", attrs: `data-action="export-foundry" data-id="${id}"` });
    if (has("discard"))
      acts.push({ kind: "menu", danger: true, label: "Ranger", attrs: `data-action="discard" data-id="${id}"` });
    if (has("remove"))
      acts.push({ kind: "menu", danger: true, label: "Supprimer", attrs: `data-action="remove-pnj" data-id="${id}"` });
    if (has("remove-pj"))
      acts.push({ kind: "menu", danger: true, label: "Supprimer", attrs: `data-action="remove-pj" data-id="${id}"` });

    return CardFooter.render(acts, {
      savedActions: saved,
      savedLabel: has("saved") ? "✓ Sauvegardé" : null,
    });
  },

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
          this._submitJournal(actionEl);
          break;
        case "journal-remove":
          UI.removeJournalEntry(id, actionEl.dataset.ts);
          break;
        case "suivi-line-toggle":
          this._toggleSuiviLine(id, actionEl.dataset.res);
          break;
        case "ledger-add":
          this._submitLedger(actionEl);
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
          this._scrollToBacklink({ id: mid, slot: mslot, ts: mts });
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
      this._focusJournalInput(id);
    });
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.CardRenderer = CardRenderer;
