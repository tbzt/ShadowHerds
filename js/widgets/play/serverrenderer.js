"use strict";

/* ============================================================
   SERVER RENDERER — HTML du panneau Matrice.
   Reçoit les serveurs et l'état d'édition en paramètres, ne lit
   ni ne modifie l'état persisté : la logique reste dans Servers
   (js/controllers/servers.js). Catalogues et règles délégués à
   Matrix (js/matrix.js), comme dans Servers.
   ============================================================ */
import { CardRenderer } from "../card/cardrenderer.js";
import { Matrix } from "../../rules/matrix.js";
import { Utils } from "../../core/utils.js";

export const ServerRenderer = {
  /** État d'intrusion scène-scopé d'un serveur (`Encounter.state.
      matrix`), lu ici pour l'affichage — remplace `srv.intrusion`. Un seul
      point de résolution plutôt que de faire percoler un paramètre `intr`
      dans les 4 fonctions de rendu ci-dessous (card/intrusionPanel/ssBlock/
      dieuBlock) — jamais muté ici (rendu pur, comme le reste du module).
      Repli défensif (état neuf, non persisté) si Encounter n'est pas encore
      chargé, pour ne jamais faire planter un rendu appelé tôt. */
  _intr(srv) {
    if (typeof Encounter !== "undefined" && Encounter.intrusionFor) {
      const intr = Encounter.intrusionFor(srv.id);
      if (intr) return intr;
    }
    return Intrusion.newState();
  },

  /** VIS-10 B1 — le serveur affiché est-il piloté par le Round de combat ?
      (scène de combat + ce serveur lié). Si oui, avancer le Round déploie déjà
      la CI du tour : le bouton d'avance manuel du tiroir est masqué pour ne pas
      double-déployer. Faux en scène Matrice seule (le tiroir reste l'horloge).
      Même accès à l'état de scène (bridge global gardé) que `_intr`. */
  _combatDriven(srv) {
    const st = typeof Encounter !== "undefined" && Encounter.state;
    return !!(st && (st.motors || []).includes("combat") && st.serverId === srv.id);
  },

  renderForm(ed) {
    const esc = CardRenderer._esc.bind(CardRenderer);
    const catalog = Matrix.use(ed).icCatalog();
    const profiles = Matrix.use(ed).profiles();
    const secPhysBonus = App.getEditionModule(ed)?.secPhysBonus;

    const profOpts = [
      `<option value="random">Aléatoire</option>`,
      ...profiles.map(
        (p) => `<option value="${p.id}">${esc(p.label)}${Matrix.use(ed).profileRangeText(p)}</option>`,
      ),
    ].join("");

    const range = Matrix.use(ed).indiceRange();
    const indOpts = [
      `<option value="auto">Selon profil</option>`,
      ...Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i).map(
        (n) => `<option value="${n}">${n}</option>`,
      ),
    ].join("");

    const icChips = Object.entries(catalog)
      .filter(([k]) => k !== "patrouilleuse")
      .map(
        ([k, ic]) => `
        <label class="ic-choice"><input type="checkbox" value="${k}">${esc(ic.label.replace(/^CI /, ""))}</label>`,
      )
      .join("");

    return `
      <div class="contact-form">
        <div class="contact-form-row">
          <label>Nom
            <input type="text" id="srv-name" placeholder="Aléatoire si vide">
          </label>
          <label>Profil
            <select id="srv-profile">${profOpts}</select>
          </label>
          <label>Indice
            <select id="srv-indice">${indOpts}</select>
          </label>
        </div>
        <div class="contact-form-row server-form-flags">
          ${secPhysBonus ? `<label class="ic-choice"><input type="checkbox" id="srv-secphys">Gère la sécurité physique (+${secPhysBonus} indice)</label>` : ""}
          <label class="ic-choice"><input type="checkbox" id="srv-spider">Spider (decker de sécurité lié)</label>
        </div>
        <details class="server-ic-details">
          <summary>CI présentes — sélection auto (Patrouilleuse toujours incluse), ou au choix :</summary>
          <div id="srv-ic-choices" class="server-ic-choices">${icChips}</div>
        </details>
      </div>`;
  },

  /** Badges + seuils du serveur (indice, attributs ou régime sans attrs) —
      extrait de card() pour être réutilisé tel quel par le tiroir Matrice
      du tracker (matrixDrawerHeader) : même contenu, pas une deuxième
      version. Dispatch structurel accepté : deux blocs complets
      (badges+seuils propres au régime vs Matrix.ATTR_KEYS+icThresholdsText
      SR5/SR6), pas une valeur scalaire — cf. Matrix.hasAttrs(). */
  statsHtml(srv) {
    const esc = CardRenderer._esc.bind(CardRenderer);
    if (!Matrix.use(srv.edition).hasAttrs()) {
      const M = Matrix.use(srv.edition);
      const badges = M.serverAttrs(srv)
        .map((a) => `<span class="server-attr"><b>${a.value}</b>${esc(a.label)}</span>`)
        .join("");
      return `
        <div class="server-attrs">${badges}</div>
        <div class="server-thresholds">${M.thresholdsText(srv)}</div>`;
    }
    const a = srv.attrs || {};
    return `
      <div class="server-attrs">
        <span class="server-attr"><b>${srv.indice}</b>Indice</span>
        ${Matrix.ATTR_KEYS
          .map((ak) => `<span class="server-attr"><b>${a[ak.key] ?? "?"}</b>${ak.badge}</span>`)
          .join("")}
      </div>
      <div class="server-thresholds">CI : ${Matrix.use(srv.edition).icThresholdsText(srv)}</div>`;
  },

  /** En-tête du tiroir Matrice (cf. Encounter.state.serverId) : profil +
      statsHtml, au-dessus du bloc intrusion complet (intrusionPanel, réutilisé
      verbatim). Pas une 2ᵉ carte serveur — juste le contexte utile en combat. */
  matrixDrawerHeader(srv) {
    const esc = CardRenderer._esc.bind(CardRenderer);
    return `<div class="matrix-drawer-stats">
      <div class="server-profile">${esc(srv.profile || "")}${srv.secPhys ? " · sécurité physique (+1)" : ""}</div>
      ${this.statsHtml(srv)}
    </div>`;
  },

  card(srv, { editing, icMonitorSize } = {}) {
    const esc = CardRenderer._esc.bind(CardRenderer);
    const card = document.createElement("div");
    card.className = "server-card";
    card.dataset.id = srv.id;

    const intr = this._intr(srv);
    const catalog = Matrix.use(srv.edition).icCatalog();

    /* -- header + stats -- */
    // Dispatch structurel accepté : deux blocs complets
    // (badges+seuils propres au régime vs Matrix.ATTR_KEYS+icThresholdsText
    // SR5/SR6), pas une valeur scalaire — cf. Matrix.hasAttrs(). Le régime
    // hasAttrs:false n'est plus mono-édition (anarchy1 ≠ anarchy2, textes
    // de seuils différents) : badges/texte lus via matrixModel.serverAttrs/
    // thresholdsText, jamais codés en dur ici.
    const statsHtml = this.statsHtml(srv);

    /* -- chips CI -- */
    const chips = (srv.icList || [])
      .map((k) => {
        const ic = catalog[k];
        if (!ic) return "";
        const label = ic.label.replace(/^CI /, "");
        const eff = typeof ic.effect === "function" ? ic.effect(srv) : "";
        const tip = `${ic.def ? `Défense : ${ic.def} — ` : ""}${eff}`;
        return `<span class="ic-chip ${ic.watch ? "watch" : ""}" title="${esc(tip)}">${esc(label)}</span>`;
      })
      .join("");

    const body = editing
      ? this.editForm(srv)
      : `
        <div class="server-profile">${esc(srv.profile || "")}${srv.secPhys ? " · sécurité physique (+1)" : ""}</div>
        ${statsHtml}
        <div class="server-sculpture">${esc(srv.sculpture || "")}
          <button class="btn-icon-tiny" data-action="reroll-sculpture" data-id="${srv.id}"
            title="Relancer la sculpture (gamme du serveur)">🎲</button>
        </div>
        <div class="server-ic-row">${chips}</div>
        ${intr.open ? this.intrusionPanel(srv, { icMonitorSize }) : ""}`;

    // Pied unifié (CardFooter) : même grammaire que PNJ/contacts. Intrusion
    // (ou Terminer en édition) en primaire, Éditer en secondaire, Spider et
    // Supprimer dans le ⋯.
    const footerActs = editing
      ? [
          { kind: "primary", icon: "✓", label: "Terminer", attrs: `data-action="toggle-edit" data-id="${srv.id}"` },
          { kind: "menu", danger: true, label: "Supprimer", attrs: `data-action="remove" data-id="${srv.id}"` },
        ]
      : [
          { kind: "secondary", label: "Éditer", attrs: `data-action="toggle-edit" data-id="${srv.id}"` },
          { kind: "primary", icon: "⚡", label: intr.open ? "Fermer l'intrusion" : "Intrusion", attrs: `data-action="toggle-intrusion" data-id="${srv.id}"` },
          // Calque du « ⚔ Combat » des PNJ — porte 2 de liaison au tiroir
          // Matrice (Encounter.linkServer), même geste que pour un combattant.
          { kind: "menu", label: "⚔ Envoyer au combat", attrs: `data-action="send-to-encounter" data-id="${srv.id}"` },
          srv.spider
            ? { kind: "menu", label: "Retirer le spider", attrs: `data-action="remove-spider" data-id="${srv.id}"` }
            : { kind: "menu", label: "Ajouter un spider", attrs: `data-action="add-spider" data-id="${srv.id}"` },
          { kind: "menu", danger: true, label: "Supprimer", attrs: `data-action="remove" data-id="${srv.id}"` },
        ];

    card.innerHTML = `
      <div class="server-card-header">
        <span class="server-name" title="${esc(srv.profile || "")}">${esc(srv.name)}</span>
        <span class="server-badge">Indice ${srv.indice}</span>
      </div>
      <div class="server-card-body">
        ${body}
        <textarea class="server-notes" placeholder="Notes…"
          data-action="edit-note" data-id="${srv.id}">${esc(srv.notes || "")}</textarea>
      </div>
      ${CardFooter.render(footerActs, { footerClass: "server-card-footer" })}`;
    return card;
  },

  /* ---- Formulaire d'édition (dans la carte) ---- */
  editForm(srv) {
    const esc = CardRenderer._esc.bind(CardRenderer);
    const id = srv.id;
    const catalog = Matrix.use(srv.edition).icCatalog();

    const profOpts = Matrix.use(srv.edition)
      .profiles()
      .map(
        (p) =>
          `<option value="${p.id}" ${p.label === srv.profile ? "selected" : ""}>${esc(p.label)}</option>`,
      )
      .join("");

    const range = Matrix.use(srv.edition).indiceRange();
    const indOpts = Array.from(
      { length: range[1] - range[0] + 1 },
      (_, i) => range[0] + i,
    )
      .map((n) => `<option value="${n}" ${n === srv.indice ? "selected" : ""}>${n}</option>`)
      .join("");

    const attrsHtml = !Matrix.use(srv.edition).hasAttrs()
      ? ""
      : `<div class="server-edit-row">
            ${Matrix.ATTR_KEYS
              .map(
                (ak) => `<label class="server-edit-attr" title="${ak.label}">${ak.badge}
                  <input type="number" id="se-${id}-${ak.key}" min="1" max="15"
                    value="${(srv.attrs || {})[ak.key] || srv.indice}"></label>`,
              )
              .join("")}
            <button class="btn-secondary btn-small" data-action="redistribute-attrs" data-id="${id}"
              title="Redistribuer indice à indice+3 au hasard">↻ ASDF</button>
          </div>`;

    /* Liste ordonnée (l'ordre = ordre de déploiement, Patrouilleuse en tête) */
    const icRows = srv.icList
      .map((k, i) => {
        const ic = catalog[k];
        const label = ic ? ic.label.replace(/^CI /, "") : k;
        if (k === "patrouilleuse") {
          return `<div class="ic-edit-row fixed"><span>1. ${esc(label)}</span><small>toujours présente</small></div>`;
        }
        return `<div class="ic-edit-row">
          <span>${i + 1}. ${esc(label)}</span>
          <span class="ic-edit-actions">
            <button class="btn-icon-tiny" data-action="move-ic" data-id="${id}" data-k="${k}" data-n="-1" title="Déployée plus tôt">↑</button>
            <button class="btn-icon-tiny" data-action="move-ic" data-id="${id}" data-k="${k}" data-n="1" title="Déployée plus tard">↓</button>
            <button class="btn-icon-tiny danger" data-action="drop-ic" data-id="${id}" data-k="${k}" title="Retirer">✕</button>
          </span>
        </div>`;
      })
      .join("");

    const addOpts = Object.entries(catalog)
      .filter(([k]) => k !== "patrouilleuse" && !srv.icList.includes(k))
      .map(([k, ic]) => `<option value="${k}">${esc(ic.label.replace(/^CI /, ""))}</option>`)
      .join("");

    return `
      <div class="server-edit">
        <label class="server-edit-label">Nom
          <input type="text" id="se-${id}-name" value="${esc(srv.name)}"></label>
        <div class="server-edit-row">
          <label class="server-edit-label">Profil
            <select id="se-${id}-profile">${profOpts}</select></label>
          <label class="server-edit-label narrow">Indice
            <select id="se-${id}-indice">${indOpts}</select></label>
        </div>
        ${App.getEditionModule(srv.edition)?.secPhysBonus
          ? `<label class="ic-choice"><input type="checkbox" id="se-${id}-secphys" ${srv.secPhys ? "checked" : ""}>Gère la sécurité physique</label>`
          : ""}
        ${attrsHtml}
        <label class="server-edit-label">Sculpture
          <textarea id="se-${id}-sculpture" rows="3">${esc(srv.sculpture || "")}</textarea></label>
        <button class="btn-secondary btn-small" data-action="reroll-sculpture-edit" data-id="${id}">🎲 Relancer la sculpture</button>
        <div class="server-edit-ics">
          <span class="monitor-label">CI — ordre de déploiement</span>
          ${icRows}
          ${addOpts
            ? `<div class="ic-edit-add">
                <select id="se-${id}-addic">${addOpts}</select>
                <button class="btn-secondary btn-small" data-action="add-ic" data-id="${id}">＋ Ajouter</button>
              </div>`
            : ""}
        </div>
      </div>`;
  },

  /* ---- Bloc intrusion (tracker) ----
     inEncounter : rendu dans le tiroir Matrice du tracker de combat —
     ajoute « ⚔ Init » sur chaque CI active pas encore dans l'ordre
     (launchedKeys = clés déjà lancées, fournies par Encounter). Hors tracker
     (carte du panneau Serveurs), ces options n'apparaissent pas. */
  intrusionPanel(srv, { icMonitorSize, inEncounter, launchedKeys } = {}) {
    const esc = CardRenderer._esc.bind(CardRenderer);
    const intr = this._intr(srv);
    const catalog = Matrix.use(srv.edition).icCatalog();
    const size = icMonitorSize != null ? icMonitorSize : Matrix.use(srv.edition).icMonitorSize(srv.indice);
    const launched = new Set(launchedKeys || []);

    /* Lignes de CI */
    const rows = (srv.icList || [])
      .map((k) => {
        const ic = catalog[k];
        if (!ic) return "";
        const st = intr.ics[k] || { active: !!ic.watch, dmg: 0, down: false };
        const isActive = ic.watch || (st.active && !st.down);
        const label = ic.label.replace(/^CI /, "");
        const eff = typeof ic.effect === "function" ? ic.effect(srv) : "";

        const M = Matrix.use(srv.edition);
        const boxes = `<span class="monitor-boxes">${Array.from({ length: size }, (_, i) => {
          const n = i + 1;
          return `<span class="monitor-box ${st.dmg >= n ? "filled" : ""}"${M.monitorBoxSep(n)}
              title="${M.monitorBoxLabel(n)}"
              data-action="ic-box" data-id="${srv.id}" data-k="${k}" data-n="${n}"></span>`;
        }).join("")}</span>`;

        const status = ic.watch
          ? `<span class="ic-status watch">veille</span>`
          : st.down
            ? `<span class="ic-status down">détruite</span>
               <button class="btn-secondary btn-small" data-action="relaunch-ic" data-id="${srv.id}" data-k="${k}" title="Le serveur relance une copie (dès le tour suivant)">↻ relancer</button>`
            : st.active
              ? `<span class="ic-status active">active${st.turn ? ` · t${st.turn}` : ""}</span>`
              : `<span class="ic-status idle">en réserve</span>`;

        /* Jets (SR5/SR6) — les glaces Anarchy ont des succès fixes */
        let rolls = "";
        if (M.hasAttrs() && (ic.watch || (st.active && !st.down))) {
          const btn = (kind, txt, tip) =>
            `<button class="btn-secondary btn-small ic-roll" title="${esc(tip)}"
              data-action="roll-ic" data-id="${srv.id}" data-k="${k}" data-kind="${kind}">⚄ ${txt}</button>`;
          if (ic.watch) {
            const per = M.actionRoll("per", srv);
            rolls = btn("per", per.txt, per.tip);
          } else {
            const atk = M.actionRoll("atk", srv);
            const def = M.actionRoll("def", srv);
            const soak = M.actionRoll("soak", srv);
            rolls =
              btn("atk", atk.txt, atk.tip) +
              btn("def", def.txt, def.tip) +
              (soak ? btn("soak", soak.txt, soak.tip) : "");
          }
        }

        // « ⚔ Init » pour envoyer cette CI dans l'ordre d'initiative du
        // combat (seulement dans le tiroir, sur une CI déployée non détruite et
        // pas déjà en scène ; jamais la Patrouilleuse en veille).
        let launchBtn = "";
        if (inEncounter && !ic.watch && st.active && !st.down) {
          launchBtn = launched.has(k)
            ? `<span class="ic-status active" title="Déjà dans l'initiative du combat"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-combat"></use></svg> en scène</span>`
            : `<button class="btn-secondary btn-small" data-action="launch-ic" data-id="${srv.id}" data-k="${k}" title="Envoyer cette CI dans l'ordre d'initiative"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-combat"></use></svg> Init</button>`;
        }

        return `<div class="ic-row ${isActive ? "on" : ""} ${st.down ? "dead" : ""}">
          <div class="ic-row-head">
            <span class="ic-row-name">${esc(label)}</span>
            ${status}
            ${launchBtn}
          </div>
          <div class="ic-row-effect">${ic.def ? `<b>Défense :</b> ${esc(ic.def)} — ` : ""}${esc(eff)}</div>
          ${rolls ? `<div class="ic-row-rolls">${rolls}</div>` : ""}
          ${st.active || st.down || ic.watch ? `<div class="monitor-row"><span class="monitor-label">Moniteur${Matrix.use(srv.edition).firewallLabel()}</span>${boxes}</div>` : ""}
        </div>`;
      })
      .join("");

    /* Bloc surveillance selon édition — dispatch structurel accepté :
       DIEU (Anarchy) vs Score de Surveillance (SR5/SR6),
       deux modèles de règles complets. */
    const surveillance = Matrix.use(srv.edition).hasAttrs()
      ? this.ssBlock(srv)
      : this.dieuBlock(srv);

    return `
      <div class="intrusion-panel">
        <div class="intrusion-toolbar">
          <span class="intrusion-turn">Round <b>${intr.turn}</b></span>
          <button class="btn-secondary btn-small ${intr.alerted ? "alert-on" : ""}"
            data-action="set-alert" data-id="${srv.id}"
            title="La Patrouilleuse a repéré l'intrus : le serveur déploie une CI par Round">
            ${intr.alerted ? "⚠ Alerte en cours" : "Donner l'alerte"}</button>
          ${this._combatDriven(srv)
            ? `<span class="intrusion-turn-hint" title="Le déploiement suit l'horloge du combat">CI déployée au « Round suivant » du combat</span>`
            : `<button class="btn-primary btn-small" data-action="next-turn" data-id="${srv.id}">Round suivant <svg class="icon icon-sm" aria-hidden="true"><use href="#ic-chevron"></use></svg></button>`}
          <button class="btn-icon" data-action="reset-intrusion" data-id="${srv.id}" title="Réinitialiser l'intrusion"><svg class="icon" aria-hidden="true"><use href="#ic-reset"></use></svg></button>
        </div>
        <div class="ic-rows">${rows}</div>
        ${surveillance}
      </div>`;
  },

  /* ---- Marks SR5 (deux directions) ----
     Les livres séparent « l'hôte a N marks sur le decker » de « le decker a N
     marks sur l'hôte ». On rend les deux, intégrés au bloc SS :
      · Hôte → PJ : une ligne par persona PJ de la scène (les CI et le spider
        partagent CE compteur, p.247 — pas de compteur par CI).
      · Équipe → hôte : un stepper unique (accès du decker ; 3 = propriétaire). */
  _marksBlock(srv, intr) {
    const esc = CardRenderer._esc.bind(CardRenderer);
    const stepper = (action, extra, val) =>
      `<button class="btn-icon-tiny" data-action="${action}" data-id="${srv.id}" ${extra} data-n="-1">−</button>` +
      `<b>${val}</b>/3` +
      `<button class="btn-icon-tiny" data-action="${action}" data-id="${srv.id}" ${extra} data-n="1">＋</button>`;

    // Personas PJ exposés dans la scène (combattants `kind:"pj"`) — clés de
    // marksOn. Le MJ ignore simplement les lignes qui ne sont pas connectées.
    const pjs =
      typeof Encounter !== "undefined" && Encounter.state
        ? Encounter.state.combatants.filter((c) => c.kind === "pj")
        : [];
    const onMap = intr.marksOn || {};
    const pjRows = pjs.length
      ? pjs
          .map((c) => {
            const name =
              (typeof PnjLookup !== "undefined" && PnjLookup.find(c.pnjId)?.name) ||
              c.name ||
              "PJ";
            return `<span class="ss-marks">${esc(name)} : ${stepper("mark-on", `data-pj="${c.pnjId}"`, onMap[c.pnjId] || 0)}</span>`;
          })
          .join("")
      : `<span class="ss-marks"><small>Aucun PJ connecté dans la scène.</small></span>`;

    return `
      <div class="ss-marks-head" title="Max 3 par cible (p.233). Une mark posée par une CI ou le spider l'est au nom de l'hôte : toutes ses CI la partagent (p.247).">Marks de l'hôte sur les PJ <small>(+2 VD CI/mark · Traqueuse à 2+ · convergence pose 3 marks, p.232)</small></div>
      ${pjRows}
      <span class="ss-marks" title="Marks du decker sur l'hôte : monnaie d'accès (Manipulation). 3 marks = accès propriétaire (miroir SR5 de l'échelle SR6).">Marks de l'équipe sur l'hôte : ${stepper("mark-held", "", intr.marksHeld || 0)} <small>(3 = propriétaire)</small></span>`;
  },

  /* ---- Jauge SS (SR5/SR6) ---- */
  ssBlock(srv) {
    const esc = CardRenderer._esc.bind(CardRenderer);
    const intr = this._intr(srv);
    const ss = intr.ss;
    const pct = Utils.clamp((ss / 40) * 100, 0, 100);
    const zone = ss >= 40 ? "conv" : ss >= 30 ? "hot" : ss >= 20 ? "warm" : "cool";

    const fmt = (t) => {
      const d = new Date(t);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const log = intr.ssLog
      .slice(0, 6)
      .map(
        (e) =>
          `<div class="ss-log-item"><span>${fmt(e.t)}</span> <b>${e.d >= 0 ? "+" : ""}${e.d}</b> ${esc(e.label)}</div>`,
      )
      .join("");

    // Dispatch structurel accepté : le mécanisme du Score de
    // Surveillance diffère entre SR5 (+2D6/15 min, marks) et SR6
    // (+1 par programme de hacking, accès illégaux maintenus, p.178/233).
    const sr5Extra =
      srv.edition === "sr5"
        ? `<button class="btn-secondary btn-small" data-action="add-ss-2d6" data-id="${srv.id}"
            title="Le SS augmente de 2D6 toutes les 15 minutes après le premier point (p.233)">
            +2D6 ⏱${intr.lastRollT ? ` ${Math.round((Date.now() - intr.lastRollT) / 60000)} min` : ""}</button>
          ${this._marksBlock(srv, intr)}`
        : `<button class="btn-secondary btn-small" data-action="add-ss" data-id="${srv.id}" data-n="1" data-label="programme de hacking"
            title="+1 SS par action matricielle modifiée par un programme de hacking (p.178)">+1 prog.</button>
          <span class="ss-marks">Accès illégaux maintenus —
            Utilisateur <button class="btn-icon-tiny" data-action="set-illegal" data-id="${srv.id}" data-kind="user" data-n="-1">−</button><b>${intr.illUser}</b><button class="btn-icon-tiny" data-action="set-illegal" data-id="${srv.id}" data-kind="user" data-n="1">＋</button>
            · Admin <button class="btn-icon-tiny" data-action="set-illegal" data-id="${srv.id}" data-kind="admin" data-n="-1">−</button><b>${intr.illAdmin}</b><button class="btn-icon-tiny" data-action="set-illegal" data-id="${srv.id}" data-kind="admin" data-n="1">＋</button>
            <small>(+1/+3 SS par Round, appliqués à « Round suivant »)</small>
          </span>
          <span class="ss-marks" title="Score Défensif de la cible = Traitement de données + Firewall (p.177), opposition de Forcer l'accès / Sonder l'accès">Accès obtenu —
            <button class="btn-icon-tiny" data-action="set-access" data-id="${srv.id}" data-n="-1">−</button>
            <b>${esc(Matrix.use(srv.edition).accessLevels()[intr.access || 0] || "Invité")}</b>
            <button class="btn-icon-tiny" data-action="set-access" data-id="${srv.id}" data-n="1">＋</button>
            <small>(SD cible ${Matrix.use(srv.edition).defenseScore(srv)})</small>
          </span>`;

    const M = Matrix.use(srv.edition);
    // T6c (SR6 p.195) : à la Convergence, un sprite disparaît et révèle la
    // position physique du technomancien qui l'a compilé → nommer les
    // compilateurs de sprites en jeu, exposés par cette convergence.
    let convergenceExtra = "";
    if (ss >= 40 && M.spriteConvergenceReveal()) {
      const owners = typeof Sprites !== "undefined" ? Sprites.deployedOwners() : [];
      if (owners.length)
        convergenceExtra = ` <b>Sprite${owners.length > 1 ? "s" : ""} en jeu : la position physique de ${owners.map((o) => esc(o.name)).join(", ")} est révélée (p.195).</b>`;
    }
    const convergence =
      ss >= 40
        ? `<div class="ss-convergence">☠ CONVERGENCE — ${M.convergenceText()}${convergenceExtra}</div>`
        : "";
    // T6c (SR5 p.252) : rappel que les actions de Résonance d'un technomancien
    // sont hors SS et sans mark (ses actions matricielles standard, elles, comptent).
    const resonanceNote = M.resonanceOSNote();
    const resonanceHint = resonanceNote
      ? `<div class="ss-effects">⚡ ${esc(resonanceNote)}</div>`
      : "";

    return `
      <div class="ss-block">
        <div class="ss-head">
          <span class="monitor-label">Score de Surveillance</span>
          <span class="ss-value ${zone}">${ss} / 40</span>
        </div>
        <div class="ss-gauge"><div class="ss-fill ${zone}" style="width:${pct}%"></div></div>
        <div class="ss-actions">
          <span class="ss-actions-label" title="Après chaque action illégale : +succès de la défense">Défense :</span>
          ${[1, 2, 3, 4, 5]
            .map(
              (n) =>
                `<button class="btn-secondary btn-small" data-action="add-ss" data-id="${srv.id}" data-n="${n}">+${n}</button>`,
            )
            .join("")}
          <button class="btn-icon-tiny" data-action="undo-ss" data-id="${srv.id}" title="Annuler le dernier ajout">⌫</button>
          <button class="btn-icon-tiny" data-action="reset-ss" data-id="${srv.id}" title="Reboot du decker : SS à zéro"><svg class="icon" aria-hidden="true"><use href="#ic-reset"></use></svg></button>
        </div>
        <div class="ss-actions">${sr5Extra}</div>
        ${convergence}
        ${resonanceHint}
        ${log ? `<div class="ss-log">${log}</div>` : ""}
      </div>`;
  },

  /* ---- Surveillance du DIEU (Anarchy) ---- */
  dieuBlock(srv) {
    const intr = this._intr(srv);
    const riskMin = intr.minor * 2;
    const seuil = intr.critical;

    const stepper = (label, key, val, tip) => `
      <span class="ss-marks" title="${tip}">${label}
        <button class="btn-icon-tiny" data-action="dieu" data-id="${srv.id}" data-k="${key}" data-n="-1">−</button>
        <b>${val}</b>
        <button class="btn-icon-tiny" data-action="dieu" data-id="${srv.id}" data-k="${key}" data-n="1">＋</button>
      </span>`;

    return `
      <div class="ss-block">
        <div class="ss-head">
          <span class="monitor-label">Surveillance du DIEU (complications de Piratage)</span>
        </div>
        <div class="ss-actions">
          ${stepper("Mineures", "minor", intr.minor, "Chaque complication mineure : +2 dés de risque minimum sur les tests de Piratage (hors cybercombat)")}
          ${stepper("Critiques", "critical", intr.critical, "Chaque complication critique : seuil de tous les tests de Piratage (hors cybercombat) +1")}
        </div>
        <div class="ss-effects ${riskMin || seuil ? "on" : ""}">
          Effets en cours : dés de risque minimum <b>${riskMin}</b> · seuil de Piratage <b>+${seuil}</b> (hors cybercombat)
        </div>
        <div class="ss-actions">
          <button class="btn-secondary btn-small ${intr.converged ? "alert-on" : ""}"
            data-action="disaster" data-id="${srv.id}"
            title="Complication Désastre : le DIEU converge">${intr.converged ? "☠ Convergence !" : "Désastre…"}</button>
          <button class="btn-secondary btn-small" data-action="reboot-decker" data-id="${srv.id}"
            title="Seule façon d'effacer les malus : reboot du deck + 1 h hors ligne (perte de tous les accès)">Reboot + 1 h hors ligne</button>
        </div>
        ${
          intr.converged
            ? `<div class="ss-convergence">☠ DÉSASTRE — le DIEU converge : cyberdeck brické, choc d'éjection, force d'intervention d'élite sur place en quelques minutes (p.218).</div>`
            : ""
        }
      </div>`;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.ServerRenderer = ServerRenderer;
