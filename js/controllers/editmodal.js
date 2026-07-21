"use strict";

/* ============================================================
   EDIT MODAL — édition avancée d'un PNJ sauvegardé
   ============================================================ */
import { Actor } from "../rules/actor.js";
import { Campaign } from "../rules/campaign.js";
import { CardRenderer } from "../widgets/card/cardrenderer.js";
import { Characters } from "./characters.js";
import { ContactsBook } from "./contactsbook.js";
import { Content } from "../rules/content.js";
import { Cyberdeck } from "../rules/cyberdeck.js";
import { CyberdeckRenderer } from "../widgets/card/cyberdeckrenderer.js";
import { Esoteric } from "../rules/esoteric.js";
import { ItemResolver } from "../rules/itemresolver.js";
import { Mentions } from "../widgets/journal/mentions.js";
import { Metavariants } from "../rules/metavariants.js";
import { PersonaRenderer } from "../widgets/card/personarenderer.js";
import { PnjLookup } from "./pnjlookup.js";
import { Shadows } from "./shadows.js";
import { SingleSelect } from "../widgets/kit/singleselect.js";
import { SkillCatalog } from "../rules/skillcatalog.js";
import { UI } from "../widgets/kit/ui.js";
import { Utils } from "../core/utils.js";
import { Vehicles } from "../catalogs/vehicles.js";

export const EditModal = {
  currentId: null,
  // Instantané profond pris à l'ouverture : socle de « Annuler les
  // modifications » (revert) et du commit conditionnel à la fermeture.
  _snapshot: null,
  _notesMode: "read", // "read" (puces @/#) | "edit" (jeton brut)

  open(id) {
    const pnj = PnjLookup.find(id);
    if (!pnj) {
      toast("PNJ introuvable.", "warning");
      return;
    }
    this.currentId = id;
    // Avant toute mutation : les sous-actions (compétences, équipement,
    // liens, campagne, couleur) mutent `pnj` en direct pendant la session.
    this._snapshot = structuredClone(pnj);

    document.querySelector(".modal-title").textContent =
      `Édition — ${pnj.name}`;
    const body = document.getElementById("modal-form-body");
    body.innerHTML = pnj.pcLight
      ? this._buildFormLight(pnj)
      : pnj.type === "vehicle"
        ? this._buildFormVehicle(pnj)
        : this._buildForm(pnj);

    // Autocomplétion @/# câblée par l'auto-attach délégué sur
    // `data-mentions` (Mentions.wireAuto) — plus de câblage explicite ici,
    // même si em-notes est régénéré à chaque open().
    const notesEl = document.getElementById("em-notes");
    // Le textarea est régénéré à chaque open() — repartir du mode
    // Lire/Éditer par défaut selon le contenu, jamais garder l'état de la
    // fiche précédemment ouverte.
    this._notesMode = notesEl && notesEl.value.trim() ? "read" : "edit";
    this._syncNotesView();

    document.getElementById("edit-modal").classList.add("open");
  },

  /** Bascule Lire (puces @/# cliquables) / Éditer (jeton brut) des notes
      libres `em-notes` — même mécanique que le bloc-notes de séance. */
  toggleNotesMode() {
    this._notesMode = this._notesMode === "read" ? "edit" : "read";
    this._syncNotesView();
    if (this._notesMode === "edit") document.getElementById("em-notes")?.focus();
  },

  /** Bascule en édition depuis un clic dans le rendu, curseur en fin
      (même mécanique que le bloc-notes de séance). */
  _editNotesFromRead() {
    if (this._notesMode !== "read") return;
    this._notesMode = "edit";
    this._syncNotesView();
    const notesEl = document.getElementById("em-notes");
    if (!notesEl) return;
    notesEl.focus();
    notesEl.setSelectionRange(notesEl.value.length, notesEl.value.length);
  },

  _syncNotesView() {
    const notesEl = document.getElementById("em-notes");
    const readEl = document.getElementById("em-notes-read");
    if (!notesEl || !readEl) return;
    if (this._notesMode === "read") {
      readEl.innerHTML =
        Mentions.renderText(notesEl.value) ||
        '<span class="notepad-read-empty">Vide.</span>';
      readEl.hidden = false;
      notesEl.hidden = true;
    } else {
      readEl.hidden = true;
      notesEl.hidden = false;
    }
  },

  /** Bloc « Notes » commun aux 3 gabarits (identité/véhicule/PJ léger/PNJ
      complet) : textarea éditable + vue lecture (puces @/#) + bascule —
      remplace la triplication du `<textarea id="em-notes">`. */
  _notesBlock(notes) {
    const esc = CardRenderer._esc;
    return `<div class="modal-section">
      <div class="modal-section-title">
        Notes
        <button type="button" class="btn-icon-tiny" data-action="toggle-notes-mode" title="Lire / Éditer" aria-label="Lire / Éditer">✎</button>
      </div>
      <div class="form-group">
        <div class="notepad-read" id="em-notes-read"></div>
        <textarea id="em-notes" rows="3" data-mentions placeholder="Notes libres…">${esc(notes || "")}</textarea>
      </div>
    </div>`;
  },

  /** Fermeture = commit automatique. Lit le formulaire dans l'objet
      canonique, persiste et rafraîchit — puis referme. Appelé par ✕, le
      bouton « Fermer », Échap et le clic hors-modale (app.js). Aucune saisie
      n'est perdue faute d'avoir cliqué sur un bouton Sauvegarder. */
  close() {
    const pnj = this.currentId && PnjLookup.find(this.currentId);
    if (!pnj) {
      this._hide();
      return;
    }

    if (pnj.pcLight) {
      this._readFormLight(pnj);
      this._finish(pnj, () => Characters.render());
      return;
    }

    if (pnj.type === "vehicle") {
      this._readFormVehicle(pnj);
      // Moniteur recalculé depuis la Structure (SR5/SR6)
      if (!App.getEditionModule(pnj.edition)?.usesRiskPanel) {
        pnj.monTotal = Vehicles._monitor(pnj.stats, pnj.edition);
        pnj.monFilled = Math.min(pnj.monFilled || 0, pnj.monTotal);
      }
      this._finish(pnj, null);
      return;
    }

    this._readForm(pnj);

    const edModule = App.getEditionModule(pnj.edition);
    if (edModule && edModule.recalc) edModule.recalc(pnj);
    // Avertissement souple XOR Magie/Résonance : on laisse passer (veto CODIR)
    // mais on signale au save que le PNJ cumule les deux natures — attrape le
    // conflit à l'instant où le MJ le crée (le rendu de la modale l'attrape à
    // l'ouverture d'une fiche déjà en conflit).
    const mAttr = edModule?.magicAttr;
    const rAttr = edModule?.resonanceAttr;
    if (mAttr && rAttr && Actor.attr(pnj, mAttr) > 0 && Actor.attr(pnj, rAttr) > 0)
      toast(`${pnj.name} : ${mAttr} et ${rAttr} cumulés (Éveillé + Émergé).`, "warning");
    // Esprit : moniteur dédié si l'édition en expose un (SR6 p.224),
    // neutre (null) en SR5/Anarchy — cf. conditionMonitor.spiritMonitor.
    if (pnj.type === "spirit" && pnj.force && edModule.conditionMonitor.spiritMonitor) {
      pnj.me = edModule.conditionMonitor.spiritMonitor(pnj.force);
    }

    this._finish(pnj, () => {
      if (Shadows.data.all.some((p) => p.id === pnj.id)) Shadows.render();
    });
  },

  /** Tail commun du commit : ne persiste/rafraîchit/notifie que si l'objet a
      réellement changé depuis l'ouverture (évite l'écriture et le toast « mis
      à jour » quand on referme sans rien avoir touché). */
  _finish(pnj, renderCollection) {
    const changed =
      !this._snapshot || JSON.stringify(pnj) !== JSON.stringify(this._snapshot);
    if (changed) {
      UI.persistEntity(pnj.id);
      if (renderCollection) renderCollection();
      CardRenderer.refresh(pnj);
    }
    this._hide();
    if (changed) toast(`${pnj.name} mis à jour.`);
  },

  /** « Annuler les modifications » : restaure l'objet dans l'état capturé à
      l'ouverture, re-persiste (certaines sous-actions ont pu persister en
      cours de session) et referme. */
  revert() {
    const pnj = this.currentId && PnjLookup.find(this.currentId);
    if (pnj && this._snapshot) {
      this._restore(pnj, this._snapshot);
      UI.persistEntity(pnj.id);
      if (pnj.pcLight) Characters.render();
      else if (Shadows.data.all.some((p) => p.id === pnj.id)) Shadows.render();
      CardRenderer.refresh(pnj);
    }
    this._hide();
    toast("Modifications annulées.");
  },

  /** Restaure `snap` dans `target` EN PLACE (l'identité de référence est
      partagée par les collections et le DOM — jamais réassigner). */
  _restore(target, snap) {
    for (const k of Object.keys(target)) if (!(k in snap)) delete target[k];
    Object.assign(target, structuredClone(snap));
  },

  _hide() {
    document.getElementById("edit-modal").classList.remove("open");
    this.currentId = null;
    this._snapshot = null;
  },

  /* ---- Formulaire d'une fiche véhicule/drone liée ---- */
  _buildFormVehicle(v) {
    const esc = CardRenderer._esc;
    const s = v.stats || {};
    const vm = App.getEditionModule(v.edition).vehicleModel;
    const fields = [...vm.statFields, ...vm.formExtraFields];
    let html = `<div class="modal-section">
      <div class="modal-section-title">Identité</div>
      <div class="modal-grid wide">
        <div class="form-group full">
          <label>Nom</label>
          <input type="text" id="em-name" value="${esc(v.name)}">
        </div>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Caractéristiques</div>
      <div class="modal-grid">`;
    for (const [key, label] of fields) {
      const cur = s[key] ?? (key === "autosoft" ? s.pilote ?? "" : 0);
      html += `<div class="form-group">
        <label>${label}</label>
        <input type="number" id="em-vstat-${key}" value="${cur}" min="0" max="30">
      </div>`;
    }
    html += `</div></div>
    ${this._notesBlock(v.notes)}`;
    return html;
  },

  _readFormVehicle(v) {
    const nameEl = document.getElementById("em-name");
    if (nameEl && nameEl.value.trim()) v.name = nameEl.value.trim();
    v.stats = v.stats || {};
    document
      .querySelectorAll('[id^="em-vstat-"]')
      .forEach((el) => {
        const key = el.id.replace("em-vstat-", "");
        const n = parseInt(el.value, 10);
        if (Number.isFinite(n)) v.stats[key] = n;
      });
    const notesEl = document.getElementById("em-notes");
    if (notesEl) v.notes = notesEl.value;
  },

  /* ---- Formulaire minimal d'un PJ léger : ni attrs ni skills, jamais
     de branche d'édition — nom/joueur/couleur/notes seulement. ---- */
  _buildFormLight(pnj) {
    const esc = CardRenderer._esc;
    const colors = Characters._PC_COLORS;
    return `<div class="modal-section">
      <div class="modal-section-title">Identité</div>
      <div class="modal-grid wide">
        <div class="form-group full">
          <label>Nom</label>
          <input type="text" id="em-name" value="${esc(pnj.name)}">
        </div>
        <div class="form-group full">
          <label>Joueur·se</label>
          <input type="text" id="em-player" value="${esc(pnj.player || "")}" placeholder="Nom à la table (optionnel)">
        </div>
        <div class="form-group full">
          <label>Couleur</label>
          <div class="em-color-picker">
            ${colors
              .map(
                (c) =>
                  `<button type="button" class="em-color-swatch${pnj.pcColor === c ? " selected" : ""}"
                    style="background:${c}" data-action="pick-pc-color" data-color="${c}"
                    title="${c}" aria-label="Choisir ${c}"></button>`,
              )
              .join("")}
            ${(() => {
              const isCustom = pnj.pcColor && !colors.includes(pnj.pcColor);
              const val = pnj.pcColor || colors[0];
              return `<label class="em-color-swatch em-color-custom${isCustom ? " selected" : ""}"
                  ${isCustom ? `style="background:${esc(val)}"` : ""}
                  data-color="${esc(val)}" title="Autre couleur…" aria-label="Choisir une autre couleur">
                <input type="color" class="em-color-custom-input" value="${esc(val)}">
              </label>`;
            })()}
          </div>
        </div>
      </div>
    </div>
    ${this._buildTableBlock(pnj, App.getEditionModule(pnj.edition)?.pcTableBlock)}
    ${this._buildCampaignSection(pnj)}
    ${this._buildContactLinksSection(pnj)}
    ${this._notesBlock(pnj.notes)}`;
  },

  /** « Contacts liés » — repliée par défaut (`<details>`), générée
      depuis `Characters`/`ContactsBook` (mutation immédiate au clic, comme
      les compétences éditables — pas de champ à valider via Sauvegarder).
      Réutilise `SingleSelect` (picker existant) + le patron visuel
      `.em-skill-row`/`.em-add-skill` des compétences, aucun nouveau widget. */
  _buildContactLinksSection(pnj) {
    const esc = CardRenderer._esc;
    const links =
      typeof RelationsStore !== "undefined" ? RelationsStore.contactLinksOf(pnj.id) : [];
    const linkedIds = new Set(links.map((l) => l.contactId));
    const rows = links
      .map((l) => {
        const c = ContactsBook.data.all.find((x) => x.id === l.contactId);
        const name = c ? c.name : "(contact supprimé)";
        const meta = [l.relation, l.loyalty != null ? `loyauté ${l.loyalty}` : null]
          .filter(Boolean)
          .join(" · ");
        return `<div class="em-skill-row" data-idx="${esc(l.contactId)}">
          <span class="em-skill-name">${esc(name)}${meta ? ` — ${esc(meta)}` : ""}</span>
          <button type="button" class="em-skill-del" title="Délier"
            data-action="remove-contact-link" data-id="${esc(l.contactId)}">×</button>
        </div>`;
      })
      .join("");
    const options = ContactsBook.data.all
      .filter((c) => !linkedIds.has(c.id))
      .map((c) => ({ value: c.id, label: c.name }));
    const picker = options.length
      ? `<div class="em-add-skill">
          ${SingleSelect.create({
            id: "em-contact-pick",
            label: "",
            options,
            value: "",
            placeholder: "Choisir un contact…",
          })}
          <input type="text" id="em-contact-relation" placeholder="Relation (ex. fixer)">
          <input type="number" id="em-contact-loyalty" placeholder="Loyauté" min="1" max="6">
          <button type="button" class="em-add-skill-btn" data-action="add-contact-link">Lier</button>
        </div>`
      : `<p style="font-size:0.75rem;color:var(--text-dim);">Aucun contact disponible — créez-en un dans Contacts.</p>`;
    return `<details class="modal-section em-contact-links-section">
      <summary class="modal-section-title">Contacts liés</summary>
      <div id="em-contact-links-list">${rows}</div>
      ${picker}
    </details>`;
  },

  addContactLink() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const contactId = document.getElementById("em-contact-pick")?.value;
    if (!contactId) {
      toast("Choisissez un contact.", "warning");
      return;
    }
    const relation = document.getElementById("em-contact-relation")?.value.trim() || "";
    const loyaltyRaw = document.getElementById("em-contact-loyalty")?.value;
    const loyalty = loyaltyRaw ? parseInt(loyaltyRaw, 10) : null;
    Characters.addContactLink(pnj.id, contactId, relation, loyalty);
    this._rerenderContactLinks(pnj);
  },

  removeContactLink(contactId) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    Characters.removeContactLink(pnj.id, contactId);
    this._rerenderContactLinks(pnj);
  },

  _rerenderContactLinks(pnj) {
    const details = document.querySelector("#modal-form-body .em-contact-links-section");
    if (details) details.outerHTML = this._buildContactLinksSection(pnj);
  },

  /** Section « Mécanique de table » — générée depuis le descripteur
      neutre `pcTableBlock` (jamais `App.edition` ici), repliée par défaut
      (`<details>` natif, pas de JS de bascule à écrire) : le PJ nom-seul
      reste la norme, cette section n'existe que si le MJ l'ouvre. */
  _buildTableBlock(pnj, block) {
    if (!block) return "";
    const esc = CardRenderer._esc;
    const fieldsHtml = (block.fields || [])
      .map((f) => {
        if (f.kind === "select") {
          return SingleSelect.create({
            id: `em-tb-${f.key}`,
            label: f.label,
            options: f.options.map((o) => ({ value: o, label: o })),
            value: pnj[f.key] || "",
            placeholder: "—",
          });
        }
        return `<div class="form-group">
          <label>${esc(f.label)}</label>
          <input type="number" id="em-tb-${f.key}" value="${pnj[f.key] ?? ""}">
        </div>`;
      })
      .join("");
    const monitorFieldsHtml = this._tableBlockMonitorInputs(pnj, block);
    if (!fieldsHtml && !monitorFieldsHtml) return "";
    return `<details class="modal-section">
      <summary class="modal-section-title">Mécanique de table (optionnel)</summary>
      <div class="modal-grid">${fieldsHtml}${monitorFieldsHtml}</div>
    </details>`;
  },

  /** Cases de moniteur = saisies par le MJ pour "double"/"single" (le PJ
      léger n'a pas d'attribut pour les dériver) ; rien à saisir pour
      "anarchy" (capacité figée par la règle, cf. CardRenderer). */
  _tableBlockMonitorInputs(pnj, block) {
    const esc = CardRenderer._esc;
    // "monitorKind" peut être une fonction (SR6 : réglage separateMonitors,
    // cf. CardRenderer._tableBlockMonitors — même résolution des deux côtés).
    const kind =
      typeof block.monitorKind === "function" ? block.monitorKind() : block.monitorKind;
    if (kind === "double") {
      return `<div class="form-group">
          <label>Moniteur physique (cases)</label>
          <input type="number" id="em-tb-physMon" value="${pnj.physMon ?? ""}" min="0" max="30">
        </div>
        <div class="form-group">
          <label>Moniteur étourdissant (cases)</label>
          <input type="number" id="em-tb-stunMon" value="${pnj.stunMon ?? ""}" min="0" max="30">
        </div>`;
    }
    if (kind === "single") {
      const key = block.monitorMaxKey || "me";
      return `<div class="form-group">
        <label>Moniteur d'état (cases)</label>
        <input type="number" id="em-tb-${esc(key)}" value="${pnj[key] ?? ""}" min="0" max="30">
      </div>`;
    }
    return "";
  },

  _readFormLight(pnj) {
    const nameEl = document.getElementById("em-name");
    if (nameEl && nameEl.value.trim()) pnj.name = nameEl.value.trim();
    const playerEl = document.getElementById("em-player");
    if (playerEl) pnj.player = playerEl.value.trim();
    const notesEl = document.getElementById("em-notes");
    if (notesEl) pnj.notes = notesEl.value;
    const picked = document.querySelector(".em-color-swatch.selected");
    if (picked) pnj.pcColor = picked.dataset.color;
    this._readTableBlock(pnj, App.getEditionModule(pnj.edition)?.pcTableBlock);
    this._readCampaignSection(pnj);
  },

  _readTableBlock(pnj, block) {
    if (!block) return;
    for (const f of block.fields || []) {
      const el = document.getElementById(`em-tb-${f.key}`);
      if (!el) continue;
      if (f.kind === "select") {
        pnj[f.key] = el.value || null;
      } else {
        const n = parseInt(el.value, 10);
        pnj[f.key] = Number.isFinite(n) ? n : null;
      }
    }
    const kind =
      typeof block.monitorKind === "function" ? block.monitorKind() : block.monitorKind;
    const monKeys =
      kind === "double"
        ? ["physMon", "stunMon"]
        : kind === "single"
          ? [block.monitorMaxKey || "me"]
          : [];
    for (const key of monKeys) {
      const el = document.getElementById(`em-tb-${key}`);
      if (!el) continue;
      const n = parseInt(el.value, 10);
      pnj[key] = Number.isFinite(n) && n > 0 ? n : null;
    }
  },

  /* ---- Identités (SIN) -------------------------------------------------
     Contrepartie éditable de la zone « Identités » de la carte. Deux
     asymétries assumées avec elle :
       — la CARTE est gardée par la donnée (aucune zone vide, I3) ; la MODALE
         est toujours offerte, c'est ici qu'on CRÉE la première SIN ;
       — le libellé porte « (SIN) » : la section « Identité » juste au-dessus,
         c'est le nom/métatype du personnage. Deux mots à un `s` près.
     Structure et patron 1:1 avec `_buildCampaignSection` : `<details>` natif,
     lignes à `data-action`, mutation immédiate via `UI.*`, champs texte relus
     à la fermeture. Aucun widget neuf.
     ---------------------------------------------------------------------- */

  /** Lignes de styles de vie d'un hôte (`i` = indice de SIN, ou "none" pour
      les orphelins). Le <select> rattache à une autre SIN — c'est le seul
      endroit où l'on peut réparer un lien pendant venu de l'import. */
  _lifestyleRows(list, host, ids) {
    const esc = CardRenderer._esc;
    return (list || [])
      .map((l, li) => {
        const opts =
          ids
            .map(
              (idn, i) =>
                `<option value="${i}"${String(i) === String(host) ? " selected" : ""}>${esc(idn.name || "(sans nom)")}</option>`,
            )
            .join("") + `<option value="none"${host === "none" ? " selected" : ""}>Sans SIN</option>`;
        return `<div class="em-id-sub-row">
          <input type="text" id="em-id-ls-name-${host}-${li}" value="${esc(l.name || "")}" placeholder="Style de vie" aria-label="Style de vie">
          <input type="text" id="em-id-ls-city-${host}-${li}" value="${esc(l.city || "")}" placeholder="Ville" aria-label="Ville">
          <select data-action="id-ls-move" data-host="${host}" data-lidx="${li}" aria-label="Rattacher à">${opts}</select>
          <button type="button" class="em-skill-del" data-action="id-ls-remove" data-host="${host}" data-lidx="${li}" title="Retirer ce style de vie" aria-label="Retirer">×</button>
        </div>`;
      })
      .join("");
  },

  _buildIdentitiesSection(pnj, open) {
    const esc = CardRenderer._esc;
    const ids = pnj.identities || [];
    const orphans = pnj.orphanLifestyles || [];

    const blocks = ids
      .map((idn, i) => {
        const isActive = idn.name === pnj.activeIdentity;
        const licenses = (idn.licenses || [])
          .map(
            (l, li) => `<div class="em-id-sub-row">
              <input type="text" id="em-id-lic-name-${i}-${li}" value="${esc(l.name || "")}" placeholder="Licence" aria-label="Licence">
              <input type="number" id="em-id-lic-rating-${i}-${li}" value="${l.rating ?? ""}" min="1" max="6" placeholder="Niv." aria-label="Indice de la licence">
              <button type="button" class="em-skill-del" data-action="id-lic-remove" data-idx="${i}" data-lidx="${li}" title="Retirer cette licence" aria-label="Retirer">×</button>
            </div>`,
          )
          .join("");
        return `<div class="em-id-block">
          <div class="em-id-head">
            <button type="button" class="em-id-active${isActive ? " is-active" : ""}" data-action="id-set-active" data-idx="${i}"
              title="${isActive ? "Identité jouée" : "Jouer cette identité"}" aria-label="Jouer cette identité" aria-pressed="${isActive}">${isActive ? "●" : "○"}</button>
            <input type="text" id="em-id-name-${i}" value="${esc(idn.name || "")}" placeholder="Nom sur la SIN" aria-label="Nom sur la SIN">
            <input type="text" id="em-id-nat-${i}" value="${esc(idn.nationality || "")}" placeholder="Nationalité" aria-label="Nationalité">
            <input type="number" id="em-id-rating-${i}" value="${idn.rating ?? ""}" min="1" max="6" placeholder="Niv." aria-label="Niveau de la SIN">
            <button type="button" class="em-skill-del" data-action="id-remove" data-idx="${i}" title="Supprimer cette identité" aria-label="Supprimer">×</button>
          </div>
          <div class="em-id-subs">
            <div class="modal-section-hint">Licences</div>
            ${licenses}
            <div class="em-id-add-row">
              <input type="text" id="em-id-newlic-${i}" placeholder="Nouvelle licence" aria-label="Nouvelle licence">
              <button type="button" class="btn-secondary" data-action="id-lic-add" data-idx="${i}">＋</button>
            </div>
            <div class="modal-section-hint">Styles de vie</div>
            ${this._lifestyleRows(idn.lifestyles, String(i), ids)}
            <div class="em-id-add-row">
              <input type="text" id="em-id-newls-${i}" placeholder="Nouveau style de vie" aria-label="Nouveau style de vie">
              <button type="button" class="btn-secondary" data-action="id-ls-add" data-idx="${i}">＋</button>
            </div>
          </div>
        </div>`;
      })
      .join("");

    // Bloc orphelins : n'existe QUE s'il y a des orphelins — mais on peut
    // toujours en créer un depuis le <select> d'un style de vie rattaché.
    const orphanBlock = orphans.length
      ? `<div class="em-id-block em-id-block-orphan">
          <div class="em-id-head"><span class="em-id-orphan-lbl">Sans SIN</span></div>
          <div class="em-id-subs">${this._lifestyleRows(orphans, "none", ids)}</div>
        </div>`
      : "";

    return `<details class="modal-section em-identities-section"${open ? " open" : ""}>
      <summary class="modal-section-title">Identités (SIN)</summary>
      <p class="modal-section-hint">Fausses identités, licences qu'elles portent et styles de vie qu'elles paient. ● marque celle que le personnage joue en ce moment.</p>
      ${blocks}
      ${orphanBlock}
      <div class="em-id-add-row em-id-add-identity">
        <input type="text" id="em-id-newname" placeholder="Nouvelle identité" aria-label="Nom de la nouvelle identité">
        <button type="button" class="btn-secondary" data-action="id-add">＋ Ajouter</button>
      </div>
    </details>`;
  },

  /** Relit les champs texte de la section. `activeIdentity` est une RÉFÉRENCE
      PAR NOM (posée par l'import Foundry, `sr5.foundry.js`) : renommer une SIN
      la casserait silencieusement — le ● disparaîtrait de la ligne et le résumé
      de la carte retomberait sur `ids[0]`, donc afficherait la MAUVAISE
      identité comme jouée, sans rien signaler. On capture donc l'indice actif
      AVANT de renommer et on réécrit le nom APRÈS. */
  _readIdentitiesSection(pnj) {
    const ids = pnj.identities || [];
    if (!ids.length && !(pnj.orphanLifestyles || []).length) return;
    const val = (id) => document.getElementById(id)?.value;
    const num = (id) => {
      const v = val(id);
      if (v === undefined || v === "") return null;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    };
    const activeIdx = ids.findIndex((i) => i.name === pnj.activeIdentity);

    ids.forEach((idn, i) => {
      const n = val(`em-id-name-${i}`);
      if (n !== undefined && n.trim()) idn.name = n.trim();
      const nat = val(`em-id-nat-${i}`);
      if (nat !== undefined) idn.nationality = nat.trim();
      if (document.getElementById(`em-id-rating-${i}`)) idn.rating = num(`em-id-rating-${i}`);
      (idn.licenses || []).forEach((l, li) => {
        const ln = val(`em-id-lic-name-${i}-${li}`);
        if (ln !== undefined && ln.trim()) l.name = ln.trim();
        if (document.getElementById(`em-id-lic-rating-${i}-${li}`)) l.rating = num(`em-id-lic-rating-${i}-${li}`);
      });
      this._readLifestyleRows(idn.lifestyles, String(i));
    });
    this._readLifestyleRows(pnj.orphanLifestyles, "none");

    if (activeIdx >= 0 && ids[activeIdx]) pnj.activeIdentity = ids[activeIdx].name;
  },

  _readLifestyleRows(list, host) {
    (list || []).forEach((l, li) => {
      const n = document.getElementById(`em-id-ls-name-${host}-${li}`);
      if (n && n.value.trim()) l.name = n.value.trim();
      const c = document.getElementById(`em-id-ls-city-${host}-${li}`);
      if (c) l.city = c.value.trim();
    });
  },

  /** Toute action structurelle relit d'abord les champs texte : sans ça, le
      re-rendu de la section écraserait une saisie en cours (on tape un nom,
      on clique ＋ ailleurs, le nom est perdu). */
  _identityAction(mutate) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    this._readIdentitiesSection(pnj);
    mutate(pnj);
    this._rerenderIdentitiesSection(pnj);
  },

  _hostIdx(host) {
    return host === "none" ? null : parseInt(host, 10);
  },

  addIdentity() {
    const el = document.getElementById("em-id-newname");
    const name = el && el.value.trim();
    if (!name) {
      toast("Nommez l'identité.", "warning");
      return;
    }
    this._identityAction((pnj) => UI.addIdentity(pnj.id, name));
  },

  removeIdentity(idx) {
    this._identityAction((pnj) => UI.removeIdentity(pnj.id, idx));
  },

  setActiveIdentity(idx) {
    this._identityAction((pnj) => {
      const idn = (pnj.identities || [])[idx];
      if (idn) UI.setActiveIdentity(pnj.id, idn.name);
    });
  },

  addLicense(idx) {
    const el = document.getElementById(`em-id-newlic-${idx}`);
    const name = el && el.value.trim();
    if (!name) {
      toast("Nommez la licence.", "warning");
      return;
    }
    this._identityAction((pnj) => UI.addLicense(pnj.id, idx, name));
  },

  removeLicense(idx, lidx) {
    this._identityAction((pnj) => UI.removeLicense(pnj.id, idx, lidx));
  },

  addLifestyle(idx) {
    const el = document.getElementById(`em-id-newls-${idx}`);
    const name = el && el.value.trim();
    if (!name) {
      toast("Nommez le style de vie.", "warning");
      return;
    }
    this._identityAction((pnj) => UI.addLifestyle(pnj.id, idx, name));
  },

  removeLifestyle(host, lidx) {
    this._identityAction((pnj) => UI.removeLifestyle(pnj.id, this._hostIdx(host), lidx));
  },

  moveLifestyle(host, lidx, toHost) {
    this._identityAction((pnj) =>
      UI.moveLifestyle(pnj.id, this._hostIdx(host), lidx, this._hostIdx(toHost)),
    );
  },

  _rerenderIdentitiesSection(pnj) {
    const details = document.querySelector("#modal-form-body .em-identities-section");
    if (details) details.outerHTML = this._buildIdentitiesSection(pnj, true);
  },

  /** Suivi de campagne (optionnel) — réglage des soldes courants depuis
      l'édition. Repliée (`<details>` natif), présente uniquement pour un PJ.
      Générée depuis `Campaign.tracks` (devises + réputation d'édition +
      compteurs libres) : aucune branche d'édition. Les valeurs pré-remplies
      sont les SOLDES dérivés ; à la sauvegarde, l'écart est enregistré comme
      une écriture d'ajustement datée (`_readCampaignSection`). */
  _buildCampaignSection(pnj, open) {
    if (!pnj.isPC) return "";
    const esc = CardRenderer._esc;
    const edModule = App.getEditionModule(pnj.edition);
    const rows = Campaign.tracks(pnj, edModule)
      .map((t) => {
        const bal = Campaign.balance(pnj.campaign, t.key);
        const suffix = t.glyph ? ` (${esc(t.glyph)})` : "";
        return `<div class="form-group">
          <label>${esc(t.label)}${suffix}</label>
          <input type="number" id="em-camp-${esc(t.key)}" value="${bal}">
        </div>`;
      })
      .join("");
    const custom = (pnj.campaign && pnj.campaign.customTracks) || [];
    const customRows = custom
      .map(
        (t) => `<div class="em-camp-track-row" data-key="${esc(t.key)}">
          <input type="text" class="em-camp-label" id="em-camp-label-${esc(t.key)}" value="${esc(t.label)}" aria-label="Nom du compteur">
          <button type="button" class="btn-icon-tiny" data-action="camp-track-remove" data-key="${esc(t.key)}" title="Retirer ce compteur" aria-label="Retirer">✕</button>
        </div>`,
      )
      .join("");
    return `<details class="modal-section em-campaign-section"${open ? " open" : ""}>
      <summary class="modal-section-title">Suivi de campagne (optionnel)</summary>
      <p class="modal-section-hint">Réglez le solde courant : l'écart est enregistré comme un ajustement daté. Le suivi fin (gains/dépenses motivés) se fait ensuite sur la fiche.</p>
      <div class="modal-grid">${rows}</div>
      <div class="em-camp-customs">
        <div class="modal-section-hint">Compteurs personnalisés (mois de style de vie, faveurs dues…)</div>
        ${customRows}
        <div class="em-camp-add-row">
          <input type="text" id="em-camp-newtrack" placeholder="Nouveau compteur" aria-label="Nom du nouveau compteur">
          <button type="button" class="btn-secondary" data-action="camp-track-add">＋ Ajouter</button>
        </div>
      </div>
    </details>`;
  },

  /** Lit les soldes cibles (écriture d'ajustement `cible − solde courant`,
      jamais d'écrasement) et les renommages de compteurs libres. Muté
      directement sur `pnj` (copie canonique) ; `save()` persiste et rafraîchit. */
  _readCampaignSection(pnj) {
    if (!pnj.isPC) return;
    const edModule = App.getEditionModule(pnj.edition);
    for (const t of Campaign.tracks(pnj, edModule)) {
      const el = document.getElementById(`em-camp-${t.key}`);
      if (!el || el.value === "") continue;
      const target = parseInt(el.value, 10);
      if (!Number.isFinite(target)) continue;
      const delta = target - Campaign.balance(pnj.campaign, t.key);
      if (delta !== 0) Campaign.ensure(pnj).ledger.unshift(Campaign.entry(t.key, delta, "ajustement"));
    }
    // Renommage des compteurs libres (appliqué à la sauvegarde).
    for (const t of (pnj.campaign && pnj.campaign.customTracks) || []) {
      const el = document.getElementById(`em-camp-label-${t.key}`);
      const l = el && el.value.trim();
      if (l) t.label = l;
    }
  },

  /** Ajoute un compteur libre depuis l'édition (mutation immédiate via UI),
      puis re-rend la section dépliée pour enchaîner. */
  addCampaignTrack() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const el = document.getElementById("em-camp-newtrack");
    const label = el && el.value.trim();
    if (!label) {
      toast("Nommez le compteur.", "warning");
      return;
    }
    UI.addCustomTrack(pnj.id, label);
    this._rerenderCampaignSection(pnj);
  },

  removeCampaignTrack(key) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    UI.removeCustomTrack(pnj.id, key);
    this._rerenderCampaignSection(pnj);
  },

  _rerenderCampaignSection(pnj) {
    const details = document.querySelector("#modal-form-body .em-campaign-section");
    if (details) details.outerHTML = this._buildCampaignSection(pnj, true);
  },

  /** Sélection de couleur : mise à jour visuelle immédiate, lue par
      `_readFormLight` à la sauvegarde (pas d'écriture au clic). */
  pickColor(color) {
    document
      .querySelectorAll(".em-color-swatch")
      .forEach((el) => el.classList.toggle("selected", el.dataset.color === color));
  },

  /** Pastille « libre » (input color natif) : même bascule de sélection que
      pickColor, mais le fond de la pastille suit la teinte choisie en direct. */
  pickCustomColor(color) {
    const custom = document.querySelector(".em-color-custom");
    if (!custom) return;
    custom.dataset.color = color;
    custom.style.background = color;
    document
      .querySelectorAll(".em-color-swatch")
      .forEach((el) => el.classList.toggle("selected", el === custom));
  },

  /* ---- Coquille de zone repliable (ME2b, D-ME-5 = A) ----
     Réutilise TELLES QUELLES les classes globales de la carte
     (.card-zone/.zone-toggle/.zone-body/.zone-body-inner/.zone-body-pad,
     pnj-card.css déjà chargé pour tout le document) — zéro duplication CSS,
     zéro mutation de la carte. Le pli est ÉPHÉMÈRE (D-ME-6 = D-a) : le toggle
     `em-zone-toggle` bascule seulement `.zone-collapsed` sur le DOM, ne touche
     NI `pnj._zoneOpen` (grammaire de persistance de la carte, cf. diceroller)
     NI aucune donnée — l'état repart du défaut à chaque `open()`.
     La zone porte toujours une `.zone-toggle-summary` (même vide) : les
     `_rerender*` la rafraîchissent quand le compte change en cours d'édition
     (cf. _refreshZoneSummary). */
  _zone(label, bodyHtml, opts = {}) {
    if (!bodyHtml) return "";
    const { summary = "", collapsed = false, zoneClass = "" } = opts;
    const esc = CardRenderer._esc;
    return `<div class="card-zone${collapsed ? " zone-collapsed" : ""}${zoneClass ? " " + zoneClass : ""}">
      <button type="button" class="zone-toggle" data-action="em-zone-toggle" aria-expanded="${!collapsed}">
        <span class="zone-toggle-label">${esc(label)}</span>
        <span class="zone-toggle-summary">${esc(summary)}</span>
        <span class="chev" aria-hidden="true">▾</span>
      </button>
      <div class="zone-body"><div class="zone-body-inner"><div class="zone-body-pad">${bodyHtml}</div></div></div>
    </div>`;
  },

  /* Texte de résumé au repos « N libellé(s) », vide si N=0 (rien à résumer). */
  _zoneCount(n, singular, plural) {
    return n ? `${n} ${n > 1 ? plural : singular}` : "";
  },

  /* Rafraîchit le résumé de la zone qui contient l'élément d'ancrage (par id),
     appelé par les _rerender* pour que le compte au repos ne mente pas après
     un ajout/retrait en cours d'édition. */
  _refreshZoneSummary(anchorId, text) {
    const anchor = document.getElementById(anchorId);
    const zone = anchor && anchor.closest(".card-zone");
    const sum = zone && zone.querySelector(".zone-toggle-summary");
    if (sum) sum.textContent = text;
  },

  /* Zone VERROUILLÉE (nouveau, magie) : montre que la capacité existe (le
     MJ voit « Sorts »/« Pouvoirs » dans la liste des zones) sans l'exposer
     comme actionnable — pas de bouton, pas de catalogue, juste un en-tête
     grisé + le motif du verrou. Volontairement pas un `.zone-toggle`
     cliquable (rien à déplier) : un <div> inerte, pas de faux affordance. */
  _zoneLocked(label, hint) {
    const esc = CardRenderer._esc;
    return `<div class="card-zone em-zone-locked">
      <div class="zone-toggle em-zone-locked-header">
        <span class="zone-toggle-label">${esc(label)}</span>
        <span class="zone-toggle-summary">${esc(hint)}</span>
      </div>
    </div>`;
  },

  /* ---- Construction du formulaire ---- */
  _buildForm(pnj) {
    let html = "";

    // ---- Section : Identité ----
    html += `<div class="modal-section">
      <div class="modal-section-title">Identité</div>
      <div class="modal-grid wide">
        <div class="form-group full">
          <label>Nom</label>
          <input type="text" id="em-name" value="${CardRenderer._esc(pnj.name)}">
        </div>
        ${SingleSelect.create({
          id: "em-meta",
          label: "Métatype",
          // pnj.meta ne porte que la souche (5 valeurs) — la métavariante
          // vit à part dans pnj.metavariant (cf. generate() sr5/sr6/anarchy1
          // et _readForm ci-dessous, qui la re-dérive au save).
          value: pnj.metavariant || pnj.meta || "",
          placeholder: "Métatype",
          // #66 : métatype (5 souches) ET métavariante (ex. Troll Cyclope)
          // dans le même picker groupé, fourni par l'édition — jamais un
          // if(App.edition===…) ici (cf. metaOptions() par module).
          ...(App.getEditionModule(pnj.edition).metaOptions?.() || {
            options: ["Humain", "Elfe", "Nain", "Ork", "Troll"].map((m) => ({ value: m, label: m })),
          }),
        })}
        ${SingleSelect.create({
          id: "em-gender",
          label: "Genre",
          options: ["M", "F", "NB"].map((g) => ({ value: g, label: g })),
          value: pnj.gender || "M",
          placeholder: "—",
        })}`;

    const ratingBadge = App.getEditionModule(pnj.edition).ratingBadge;
    if (ratingBadge.options) {
      html += SingleSelect.create({
        id: "em-rang",
        label: ratingBadge.label,
        options: ratingBadge.options.map((r) => ({ value: r, label: r })),
        value: pnj[ratingBadge.field],
        placeholder: "—",
      });
    } else {
      html += `<div class="form-group">
        <label>${ratingBadge.label}</label>
        <input type="number" id="em-prof" value="${pnj[ratingBadge.field]}" min="0" max="6">
      </div>`;
    }

    html += "</div></div>";

    // ---- Section : Attributs ----
    const attrKeys = App.getEditionModule(pnj.edition).attributes;

    html += `<div class="modal-section">
      <div class="modal-section-title">Attributs</div>
      <div class="modal-grid">`;

    for (const k of attrKeys) {
      if (pnj.attrs[k] !== undefined) {
        html += `<div class="form-group">
          <label>${k}</label>
          <input type="number" id="em-attr-${k}" value="${Actor.attr(pnj, k)}" min="1" max="12">
        </div>`;
      }
    }
    // MAG toujours affiché quand l'édition porte l'attribut chiffré (SR5/
    // SR6, cf. magicAttr), 0 par défaut — le MJ doit pouvoir FAIRE DEVENIR
    // un PNJ magicien (poser MAG > 0) sans qu'il l'ait déjà été à la
    // génération. min=0 (pas 1) : 0 = non magicien, valeur légitime.
    const magicAttr = App.getEditionModule(pnj.edition).magicAttr;
    if (magicAttr) {
      html += `<div class="form-group">
        <label>${magicAttr}</label>
        <input type="number" id="em-attr-${magicAttr}" value="${Actor.attr(pnj, magicAttr)}" min="0" max="12">
      </div>`;
    }
    // RES toujours affiché, même patron que MAG ci-dessus (T2) : un
    // technomancien se pose en éditant RES > 0 sans être passé par le
    // générateur, exactement comme un magicien se pose via MAG > 0.
    const resonanceAttr = App.getEditionModule(pnj.edition).resonanceAttr;
    if (resonanceAttr) {
      html += `<div class="form-group">
        <label>${resonanceAttr}</label>
        <input type="number" id="em-attr-${resonanceAttr}" value="${Actor.attr(pnj, resonanceAttr)}" min="0" max="12">
      </div>`;
    }
    // Avertissement souple XOR Magie/Résonance (décision utilisateur
    // 2026-07-18) : les livres traitent Éveillé et Émergé comme exclusifs, mais
    // le veto CODIR (Esoteric.blank) autorise volontairement la coexistence. On
    // SIGNALE l'anomalie à l'ouverture d'une fiche qui la porte déjà — jamais
    // de reset d'attribut. Le pendant « au moment où on la crée » est un toast
    // au save (cf. update()).
    if (
      magicAttr &&
      resonanceAttr &&
      Actor.attr(pnj, magicAttr) > 0 &&
      Actor.attr(pnj, resonanceAttr) > 0
    ) {
      html += `<p class="form-group" style="color:var(--warning);font-size:.85em;">
        ⚠ Ce personnage porte à la fois ${magicAttr} et ${resonanceAttr} — un être est normalement soit Éveillé, soit Émergé, jamais les deux.
      </p>`;
    }
    // Ressource de relance (Chance SR5 / Atout SR6), clé portée par le
    // module d'édition — jamais de nom d'attribut figé côté contrôleur.
    const edgeKey = App.getEditionModule(pnj.edition).rerollAction?.costAttr;
    if (edgeKey && pnj.attrs[edgeKey] !== undefined) {
      html += `<div class="form-group">
        <label>${edgeKey}</label>
        <input type="number" id="em-attr-${edgeKey}" value="${Actor.attr(pnj, edgeKey)}" min="0" max="7">
      </div>`;
    }
    html += "</div></div>";

    // ---- Section Anarchy : Atouts (toujours affichée dès que l'édition a
    // le concept — capacité de l'édition, pas contenu courant, même
    // correctif que l'Équipement). Hors esprits (sémantique distincte). ----
    if (App.getEditionModule(pnj.edition).hasEdges && pnj.type !== "spirit") {
      const atoutsBody = `<div class="form-group">
          <label>Un edge par ligne</label>
          <textarea id="em-atouts" rows="5">${(pnj.edges || []).join("\n")}</textarea>
        </div>
        ${this._edgeCatalogControls(pnj)}`;
      html += this._zone("Atouts", atoutsBody, {
        summary: this._zoneCount((pnj.edges || []).length, "atout", "atouts"),
        collapsed: true,
      });
    }

    // Verrou magie : le module d'édition décide (contrat `arcaneLock`,
    // prohibition n°1) — attribut chiffré en SR5/SR6 (MAG > 0), compétence en
    // Anarchy (Éveillé = Sorcellerie/Conjuration). Verrouillé (grisé, catalogue
    // caché) plutôt que masqué : le MJ VOIT que la capacité existe et pourquoi
    // elle est inaccessible. Garde-fou Failsafe : si des sorts/pouvoirs existent
    // déjà malgré le verrou (édition manuelle antérieure, import…), la zone
    // reste normale/éditable — jamais de donnée cachée ou perdue.
    const magLocked = App.getEditionModule(pnj.edition).arcaneLock(pnj, "magic");

    // ---- Section : Sorts (montée si l'édition a un catalogue de sorts).
    // Hors esprits. Objets structurés (add/retrait via catalogue seulement,
    // pas de saisie libre — comme les Armes). ----
    if (App.getEditionModule(pnj.edition).spellCatalog?.() && pnj.type !== "spirit") {
      if (magLocked && !(pnj.spells || []).length) {
        html += this._zoneLocked("Sorts", magLocked.hint);
      } else {
        const spellsBody = `<div id="em-spells-list" class="em-skills-list">
          ${this._spellRows(pnj)}
        </div>
        ${this._spellCatalogControls(pnj)}`;
        html += this._zone("Sorts", spellsBody, {
          summary: this._zoneCount((pnj.spells || []).length, "sort", "sorts"),
          collapsed: true,
        });
      }
    }

    // ---- Section : Formes complexes (T2) — même verrou que Sorts, discipline
    // "resonance" (attribut RES en SR5/SR6, compétence Technomancie en Anarchy 1 —
    // ferme la réserve Silk : ne s'affiche plus que sur les Émergés). ----
    const resLocked = App.getEditionModule(pnj.edition).arcaneLock(pnj, "resonance");
    if (App.getEditionModule(pnj.edition).complexFormCatalog?.() && pnj.type !== "spirit") {
      if (resLocked && !(pnj.complexForms || []).length) {
        html += this._zoneLocked("Formes complexes", resLocked.hint);
      } else {
        const formsBody = `<div id="em-complex-forms-list" class="em-skills-list">
          ${this._complexFormRows(pnj)}
        </div>
        ${this._complexFormCatalogControls(pnj)}`;
        html += this._zone("Formes complexes", formsBody, {
          summary: this._zoneCount((pnj.complexForms || []).length, "forme", "formes"),
          collapsed: true,
        });
      }
    }

    // ---- Section : Pouvoirs d'adepte (SR5/SR6 seulement — Anarchy fond
    // cette mécanique dans les Atouts). Hors esprits (pnj.powers a une
    // sémantique différente sur un esprit — cf. js/catalogs/spirits.js). ----
    if (App.getEditionModule(pnj.edition).powerCatalog?.() && pnj.type !== "spirit") {
      if (magLocked && !(pnj.powers || []).length) {
        html += this._zoneLocked("Pouvoirs", magLocked.hint);
      } else {
        const powersBody = `<div id="em-powers-list" class="em-skills-list">
          ${this._powerRows(pnj)}
        </div>
        ${this._powerCatalogControls(pnj)}`;
        html += this._zone("Pouvoirs", powersBody, {
          summary: this._zoneCount((pnj.powers || []).length, "pouvoir", "pouvoirs"),
          collapsed: true,
        });
      }
    }

    // ---- Section : Cyberdeck (module Matrice de la carte) — montée si le PNJ
    // a un deck structuré (généré, migré depuis l'ancienne chaîne libre, OU
    // ajouté depuis le catalogue d'équipement, cf. addEquipItem). Wrapper à id
    // stable pour un re-render ciblé quand un deck apparaît/change en cours
    // d'édition. ME2a : remontée près des capacités magiques pour regrouper les
    // modules (Magie + Matrice) comme la carte. ----
    html += `<div id="em-cyberdeck-section">${
      pnj.cyberdeck ? CyberdeckRenderer.editSection(pnj) : ""
    }</div>`;
    // ---- Section : Persona incarné (répartition SR6 uniquement, cf.
    // PersonaRenderer.editSection qui renvoie "" hors SR6) ----
    html += `<div id="em-persona-section">${
      pnj.persona ? PersonaRenderer.editSection(pnj) : ""
    }</div>`;

    // ---- Section : Progression ésotérique (P2-P4) — Initiation/Submersion,
    // montée si l'édition a le concept (esotericModel ≠ null, A2 exclu).
    // Hors esprits. ----
    if (Esoteric.available(pnj.edition) && pnj.type !== "spirit") {
      html += `<div id="em-esoteric-section">${this._esotericSection(pnj)}</div>`;
    }

    // ---- Section : Compétences (éditables + ajout) — zone Capacités ----
    {
      const rowFn =
        App.getEditionModule(pnj.edition).skillModel.shape === "extended"
          ? this._skillRowAnarchy.bind(this)
          : this._skillRowSR.bind(this);
      const skillsBody = `<div id="em-skills-list" class="em-skills-list">
          ${(pnj.skills || []).map((s, i) => rowFn(pnj, s, i)).join("")}
        </div>
        ${this._addSkillControls(pnj)}`;
      html += this._zone("Compétences", skillsBody, {
        summary: this._zoneCount((pnj.skills || []).length, "compétence", "compétences"),
        collapsed: true,
      });
    }

    // ---- Section : Connaissances (SR5/SR6 — cf. hasKnowledges du module ;
    // Anarchy fond ce concept ailleurs, pas de pool de connaissances
    // chiffré). Nom LIBRE (aucune liste fermée au livre) + catégorie choisie
    // qui câble l'attribut lié (Logique/Intuition, cf.
    // SkillCatalog.knowledgeCategories) — un lookup par nom serait peu
    // fiable sur du texte imprévisible, la catégorie est donc stockée
    // explicitement sur l'item (`k.cat`), lue par _knowledgesSection. ----
    if (App.getEditionModule(pnj.edition).hasKnowledges) {
      const knowledgesBody = `<div id="em-knowledges-list" class="em-skills-list">
          ${(pnj.knowledges || []).map((k, i) => this._knowledgeRow(k, i)).join("")}
        </div>
        ${this._knowledgeAddControls()}`;
      html += this._zone("Connaissances", knowledgesBody, {
        summary: this._zoneCount((pnj.knowledges || []).length, "connaissance", "connaissances"),
        collapsed: true,
      });
    }

    // ---- Section : Armes structurées ----
    // Montée seulement pour une édition qui stocke ses armes en objets
    // (`weaponModel.source === "weapons"`, Anarchy 2 aujourd'hui) — lecture
    // neutre, jamais de branche d'édition. Le catalogue de la section
    // Équipement route alors ses armes ici (pnj.weapons), pas dans equip.
    if (App.getEditionModule(pnj.edition).weaponModel?.source === "weapons") {
      const weaponsBody = `<div id="em-weapons-list" class="em-skills-list">
          ${this._weaponRows(pnj)}
        </div>`;
      html += this._zone("Armes", weaponsBody, {
        summary: this._zoneCount((pnj.weapons || []).length, "arme", "armes"),
        collapsed: true,
      });
    }

    // ---- Section : Équipement (toujours affichée : on peut désormais en
    // ajouter à un PNJ qui n'en a pas encore, via le catalogue). ----
    // ME1c/D-ME-2 : saisie libre seule ici (chaînes « un par ligne ») — les
    // objets structurés (#63, indice borné) sortent vers « Augmentations »
    // juste en dessous (D-ME-2b), sinon mix textarea+rows dans une section.
    html += `<div class="modal-section">
        <div class="modal-section-title">Équipement</div>
        <div class="form-group">
          <label>Un élément par ligne</label>
          <textarea id="em-equip" rows="4">${this._equipTextLines(pnj).join("\n")}</textarea>
        </div>
        ${this._equipCatalogControls(pnj)}
      </div>`;

    // ---- Section : Augmentations (objets structurés d'équip — #63 à indice
    // non résolu + cyber/bioware à indice fixe). Toujours montée dans le DOM
    // (#em-equip-ratings reste une cible stable pour _rerenderEquip, ajout
    // d'item en cours d'édition compris) ; masquée par CSS quand vide
    // (`.em-augmentations-section:has(#em-equip-ratings:empty)`, classe portée
    // par la card-zone). Réutilise #em-equip-ratings + _equipRatingRows
    // inchangés (contrat Failsafe : data-idx/id="em-equip-rating-<i>" et le
    // réordre de _readForm ne bougent pas). ----
    const augCount = (pnj.equip || []).filter((it) => it && typeof it === "object").length;
    html += this._zone(
      "Augmentations",
      `<div id="em-equip-ratings" class="em-skills-list">${this._equipRatingRows(pnj)}</div>`,
      {
        summary: this._zoneCount(augCount, "augmentation", "augmentations"),
        collapsed: true,
        zoneClass: "em-augmentations-section",
      },
    );

    // ---- Section : Identités (SIN) ----
    html += this._buildIdentitiesSection(pnj);

    // ---- Section : Suivi de campagne (optionnel, PJ seulement) ----
    html += this._buildCampaignSection(pnj);

    // ---- Section : Notes ----
    html += this._notesBlock(pnj.notes);

    return html;
  },

  /* ============================================================
     COMPÉTENCES ÉDITABLES
     ============================================================ */

  /* Ligne d'une compétence SR5/SR6 : niveau + spécialité libre */
  _skillRowSR(pnj, s, i) {
    const esc = CardRenderer._esc;
    const spec = s.spec && s.spec !== true ? esc(s.spec) : "";
    return `<div class="em-skill-row" data-idx="${i}">
      <span class="em-skill-name">${esc(s.name)}</span>
      <input type="number" class="em-skill-val" id="em-skill-${i}" value="${s.val}" min="1" max="12" title="Niveau">
      <input type="text" class="em-skill-spec" id="em-skill-spec-${i}"
        value="${spec}" placeholder="Spécialité (+2)" title="Spécialité — bonus de +2 dés">
      <button type="button" class="em-skill-del" title="Retirer"
        data-action="remove-skill">×</button>
    </div>`;
  },

  /* Ligne d'une compétence Anarchy : niveau + RR + spécialité (liste) */
  _skillRowAnarchy(pnj, s, i) {
    const esc = CardRenderer._esc;
    const specOpts = ['<option value="">— Aucune —</option>']
      .concat(
        SkillCatalog.anarchySpecs.map(
          (sp) =>
            `<option value="${esc(sp)}"${s.spec === sp ? " selected" : ""}>${esc(sp)}</option>`,
        ),
      )
      .join("");
    // Si la spé courante n'est pas dans la liste, on l'ajoute en tête.
    const customSpec =
      s.spec && !SkillCatalog?.anarchySpecs?.includes(s.spec)
        ? `<option value="${esc(s.spec)}" selected>${esc(s.spec)}</option>`
        : "";
    return `<div class="em-skill-row em-skill-row-anarchy" data-idx="${i}">
      <span class="em-skill-name">${esc(s.name)} <em class="em-skill-attr">${esc(s.attr || "")}</em></span>
      <input type="number" class="em-skill-val" id="em-skill-${i}" value="${s.val}" min="0" max="6" title="Niveau">
      <input type="number" class="em-skill-rr" id="em-skill-rr-${i}" value="${s.rr || 0}" min="0" max="3" title="Relance de réserve (RR)">
      <select class="em-skill-spec" id="em-skill-spec-${i}" title="Spécialité">
        ${customSpec}${specOpts}
      </select>
      <button type="button" class="em-skill-del" title="Retirer"
        data-action="remove-skill">×</button>
    </div>`;
  },

  /* Contrôles d'ajout d'une compétence (liste des règles de base) */
  _addSkillControls(pnj) {
    if (typeof SkillCatalog === "undefined") return "";
    const existing = new Set((pnj.skills || []).map((s) => s.name));
    const options = SkillCatalog.skillsFor(pnj.edition)
      .filter((n) => !existing.has(n))
      .map((n) => ({ value: n, label: n }));
    if (!options.length) return "";
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-add-skill-select",
        label: "",
        options,
        value: "",
        placeholder: "+ Ajouter une compétence…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-skill">Ajouter</button>
    </div>`;
  },

  /* Ajoute une compétence choisie dans le catalogue. Lit d'abord le
     formulaire en cours pour ne pas perdre les modifications. */
  addSkill() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const sel = document.getElementById("em-add-skill-select");
    const name = sel?.value;
    if (!name) return;
    this._readSkills(pnj);
    if (!pnj.skills) pnj.skills = [];
    if (pnj.skills.some((s) => s.name === name)) return;

    if (App.getEditionModule(pnj.edition).skillModel.shape === "extended") {
      pnj.skills.push({
        name,
        val: 1,
        attr: SkillCatalog.attrFor(pnj.edition, name) || "AGI",
        rr: 0,
      });
    } else {
      pnj.skills.push({ name, val: 1 });
    }
    this._rerenderSkills(pnj);
  },

  /* Retire la compétence d'index i. */
  removeSkill(i) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.skills) return;
    this._readSkills(pnj);
    pnj.skills.splice(i, 1);
    this._rerenderSkills(pnj);
  },

  /* Reconstruit uniquement la liste des compétences dans le modal. */
  _rerenderSkills(pnj) {
    const list = document.getElementById("em-skills-list");
    if (!list) return;
    const rowFn =
      App.getEditionModule(pnj.edition).skillModel.shape === "extended"
        ? this._skillRowAnarchy.bind(this)
        : this._skillRowSR.bind(this);
    list.innerHTML = (pnj.skills || [])
      .map((s, i) => rowFn(pnj, s, i))
      .join("");
    // Reconstruit aussi le sélecteur d'ajout (pour retirer les doublons).
    const addWrap = list.parentElement.querySelector(".em-add-skill");
    if (addWrap) {
      addWrap.outerHTML = this._addSkillControls(pnj);
    } else {
      list.insertAdjacentHTML("afterend", this._addSkillControls(pnj));
    }
    this._refreshZoneSummary(
      "em-skills-list",
      this._zoneCount((pnj.skills || []).length, "compétence", "compétences"),
    );
  },

  /* Lit les champs de compétences du formulaire dans le PNJ. */
  _readSkills(pnj) {
    if (!pnj.skills) return;
    pnj.skills.forEach((s, i) => {
      const v = document.getElementById(`em-skill-${i}`);
      if (v) {
        const [min, max] = App.getEditionModule(pnj.edition).skillModel.valRange;
        s.val = Utils.clamp(parseInt(v.value, 10) || s.val, min, max);
      }
      const specEl = document.getElementById(`em-skill-spec-${i}`);
      if (specEl) {
        const sp = specEl.value.trim();
        s.spec = sp || null;
      }
      const rrEl = document.getElementById(`em-skill-rr-${i}`);
      if (rrEl) s.rr = Utils.clamp(parseInt(rrEl.value, 10) || 0, 0, 3);
    });
  },

  /* ---- Connaissances (nom libre + catégorie → attribut, SR5/SR6) ---- */

  /* Ligne d'une connaissance : nom éditable (texte libre, contrairement aux
     compétences actives issues d'un catalogue fermé), niveau, catégorie
     (câble l'attribut lié, cf. SkillCatalog.knowledgeCategories). */
  _knowledgeRow(k, i) {
    const esc = CardRenderer._esc;
    const cats = Object.keys(SkillCatalog.knowledgeCategories);
    // Item LEGACY sans catégorie connue (généré avant ce chantier, ou nom de
    // la réserve sr5Knowledges) : option neutre en tête, jamais une catégorie
    // choisie à sa place — un <select> sans `selected` retomberait sinon
    // silencieusement sur la 1ʳᵉ option et _readKnowledges l'écrirait comme
    // si l'utilisateur l'avait choisie (fausse donnée, piège vérifié en
    // navigateur : "Connaissance ésotérique" héritait "Académique" à tort).
    const blankOpt = cats.includes(k.cat) ? "" : `<option value="" selected>— Catégorie ? —</option>`;
    const catOpts = cats
      .map((c) => `<option value="${esc(c)}"${k.cat === c ? " selected" : ""}>${esc(c)}</option>`)
      .join("");
    return `<div class="em-skill-row em-skill-row-knowledge" data-idx="${i}">
      <input type="text" class="em-skill-name-input" id="em-know-name-${i}"
        value="${esc(k.name)}" placeholder="Nom de la connaissance">
      <input type="number" class="em-skill-val" id="em-know-val-${i}" value="${k.val}" min="1" max="12" title="Niveau">
      <select class="em-skill-spec" id="em-know-cat-${i}" title="Catégorie (câble l'attribut lié)">${blankOpt}${catOpts}</select>
      <button type="button" class="em-skill-del" title="Retirer"
        data-action="remove-knowledge">×</button>
    </div>`;
  },

  /* Ajout à la main (pas de catalogue — les connaissances sont libres au
     livre) : nom texte + catégorie, jamais les deux mêlés dans un select
     catalogue comme les compétences actives. */
  _knowledgeAddControls() {
    const cats = Object.keys(SkillCatalog.knowledgeCategories);
    return `<div class="em-add-skill em-add-knowledge">
      <input type="text" id="em-know-add-name" class="em-know-add-name-input"
        placeholder="Nouvelle connaissance…">
      ${SingleSelect.create({
        id: "em-know-add-cat",
        label: "",
        options: cats.map((c) => ({ value: c, label: c })),
        value: cats[0],
        placeholder: "Catégorie",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-knowledge">Ajouter</button>
    </div>`;
  },

  /* Ajoute la connaissance tapée. Lit d'abord le formulaire en cours (comme
     addSkill) pour ne perdre aucune saisie. */
  addKnowledge() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const nameEl = document.getElementById("em-know-add-name");
    const name = nameEl?.value.trim();
    if (!name) return;
    this._readKnowledges(pnj);
    if (!pnj.knowledges) pnj.knowledges = [];
    if (pnj.knowledges.some((k) => k.name === name)) return;
    const cat =
      document.getElementById("em-know-add-cat")?.value ||
      Object.keys(SkillCatalog.knowledgeCategories)[0];
    pnj.knowledges.push({ name, val: 1, cat });
    this._rerenderKnowledges(pnj);
  },

  /* Retire la connaissance d'index i. */
  removeKnowledge(i) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.knowledges) return;
    this._readKnowledges(pnj);
    pnj.knowledges.splice(i, 1);
    this._rerenderKnowledges(pnj);
  },

  /* Lit les lignes existantes (nom/niveau/catégorie) dans pnj.knowledges —
     appelée par _readForm ET par les ajouts/retraits pour ne perdre aucune
     saisie en cours. */
  _readKnowledges(pnj) {
    if (!pnj.knowledges) return;
    pnj.knowledges.forEach((k, i) => {
      const nameEl = document.getElementById(`em-know-name-${i}`);
      if (nameEl) k.name = nameEl.value.trim() || k.name;
      const valEl = document.getElementById(`em-know-val-${i}`);
      if (valEl) k.val = Utils.clamp(parseInt(valEl.value, 10) || k.val, 1, 12);
      const catEl = document.getElementById(`em-know-cat-${i}`);
      if (catEl) k.cat = catEl.value || k.cat;
    });
  },

  /* Reconstruit uniquement la liste des connaissances + le résumé au repos. */
  _rerenderKnowledges(pnj) {
    const list = document.getElementById("em-knowledges-list");
    if (list) list.innerHTML = (pnj.knowledges || []).map((k, i) => this._knowledgeRow(k, i)).join("");
    const addName = document.getElementById("em-know-add-name");
    if (addName) addName.value = "";
    this._refreshZoneSummary(
      "em-knowledges-list",
      this._zoneCount((pnj.knowledges || []).length, "connaissance", "connaissances"),
    );
  },

  /* ---- Armes structurées (éditions à pnj.weapons) + catalogue ---- */

  /* Lignes de la section « Armes » (réutilise le chrome des compétences). */
  _weaponRows(pnj) {
    const esc = CardRenderer._esc;
    return (pnj.weapons || [])
      .map((w, i) => {
        const detail = [w.vd, w.ranges].filter(Boolean).join(" ");
        return `<div class="em-skill-row" data-idx="${i}">
          <span class="em-skill-name">${esc(w.name)}${detail ? ` — ${esc(detail)}` : ""}</span>
          <button type="button" class="em-skill-del" title="Retirer"
            data-action="remove-weapon">×</button>
        </div>`;
      })
      .join("");
  },

  /* Sélecteur groupé « ＋ Catalogue » — monté seulement si l'édition expose
     un catalogue (equipCatalog() ≠ null), comme l'export Foundry. */
  _equipCatalogControls(pnj) {
    const catalog = App.getEditionModule(pnj.edition).equipCatalog?.();
    if (!catalog || !catalog.length) return "";
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-equip-catalog",
        label: "",
        groups: catalog.map((g) => ({
          category: g.category,
          items: g.items.map((it) => ({ value: it.id, label: it.label })),
        })),
        value: "",
        placeholder: "＋ Catalogue…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-equip-item">Ajouter</button>
    </div>`;
  },

  /* Ajoute l'item choisi au catalogue. Commit d'abord le formulaire courant
     (comme addSkill) pour ne perdre aucune saisie, puis laisse l'édition
     placer l'item (equip texte, ou pnj.weapons structuré), et repeint ciblé. */
  addEquipItem() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const sel = document.getElementById("em-equip-catalog");
    const id = sel?.value;
    if (!id) return;
    this._readForm(pnj);
    App.getEditionModule(pnj.edition).addCatalogItem(pnj, id);
    // Un cyberdeck choisi au catalogue configure aussi le deck mécanique
    // (attrs/nom), pas seulement la ligne d'équipement — détection
    // édition-agnostique sur la dernière ligne poussée (pas de branche
    // d'édition ici, cf. prohibition n°1). Décision utilisateur 2026-07-15.
    const last = (pnj.equip || [])[pnj.equip.length - 1];
    const lastStr = ItemResolver.itemStr(last);
    if (/cyberdeck/i.test(lastStr)) {
      Cyberdeck.setFromLine(pnj, lastStr, pnj.edition);
      this._rerenderCyberdeck(pnj);
    }
    this._rerenderEquip(pnj);
    if (App.getEditionModule(pnj.edition).weaponModel?.source === "weapons")
      this._rerenderWeapons(pnj);
    SingleSelect.reset("em-equip-catalog");
  },

  /* Repeint la section Cyberdeck (apparition/changement de deck en cours
     d'édition, cf. addEquipItem). Le wrapper #em-cyberdeck-section est
     toujours présent dans le corps du modal ; on y (re)pose la section
     d'édition du deck, ou rien si le PNJ n'a pas de deck. */
  _rerenderCyberdeck(pnj) {
    const wrap = document.getElementById("em-cyberdeck-section");
    if (wrap)
      wrap.innerHTML = pnj.cyberdeck ? CyberdeckRenderer.editSection(pnj) : "";
  },

  /* Retire l'arme structurée d'index i. */
  removeWeapon(i) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.weapons) return;
    this._readForm(pnj);
    pnj.weapons.splice(i, 1);
    this._rerenderWeapons(pnj);
  },

  /* #63 : lignes texte libre de la textarea équipement — seuls les items
     CHAÎNE (indice fixe/absent). Les items OBJET (indice non résolu) vivent
     dans la liste à stepper (_equipRatingRows), jamais dans la textarea
     (sinon `[object Object]` + perte de `.rating` au prochain save). */
  _equipTextLines(pnj) {
    return (pnj.equip || []).filter((it) => typeof it === "string");
  },

  /* #63 : une ligne par item OBJET de `pnj.equip` — soit à indice non résolu
     (« Indice 1-4 », stepper numérique borné par la plage), soit catégorisé
     à indice fixe (cyberware/bioware du catalogue, taggé `cat` pour le
     routage Augmentations — cf. ItemResolver.augItems) : label + retrait
     seul, pas de stepper qui n'aurait rien à régler. */
  /* `data-idx` de chaque ligne = position PARMI LES OBJETS SEULEMENT
     (pas l'index brut de `pnj.equip`, qui se réordonne au save — cf.
     _readForm : les objets remontent en tête). `id="em-equip-rating-<i>"`
     garde lui l'index brut : c'est lui que _readForm relit avant réordre
     (absent pour les items sans plage — _readForm ignore alors `.rating`). */
  _equipRatingRows(pnj) {
    const esc = CardRenderer._esc;
    return (pnj.equip || [])
      .map((it, i) => (it && typeof it === "object" ? { it, i } : null))
      .filter(Boolean)
      .map(({ it, i }, ratingIdx) => {
        const label = it.str.split(" [")[0].trim();
        const range = ItemResolver.ratingRange(it.str);
        const control = range
          ? `<input type="number" class="em-equip-rating" id="em-equip-rating-${i}"
              value="${it.rating != null ? it.rating : ""}" min="${range[0]}" max="${range[1]}"
              placeholder="indice ${range[0]}-${range[1]}" title="Indice (${range[0]}-${range[1]})">`
          : "";
        return `<div class="em-skill-row em-equip-rating-row" data-idx="${ratingIdx}">
          <span class="em-skill-name">${esc(label)}</span>
          ${control}
          <button type="button" class="em-skill-del" title="Retirer"
            data-action="remove-equip-rating">×</button>
        </div>`;
      })
      .join("");
  },

  /* Repeint la textarea + la liste à stepper depuis pnj.equip. */
  _rerenderEquip(pnj) {
    const el = document.getElementById("em-equip");
    if (el) el.value = this._equipTextLines(pnj).join("\n");
    const ratings = document.getElementById("em-equip-ratings");
    if (ratings) ratings.innerHTML = this._equipRatingRows(pnj);
    const augCount = (pnj.equip || []).filter((it) => it && typeof it === "object").length;
    this._refreshZoneSummary(
      "em-equip-ratings",
      this._zoneCount(augCount, "augmentation", "augmentations"),
    );
  },

  /* Retire l'item d'équipement (objet à indice) à la position ratingIdx
     PARMI LES OBJETS (cf. note _equipRatingRows) — pas un index brut de
     pnj.equip, qui se réordonne pendant _readForm. */
  removeEquipRating(ratingIdx) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !Array.isArray(pnj.equip)) return;
    this._readForm(pnj);
    const objects = pnj.equip.filter((it) => it && typeof it === "object");
    const target = objects[ratingIdx];
    if (!target) return;
    pnj.equip = pnj.equip.filter((it) => it !== target);
    this._rerenderEquip(pnj);
  },

  /* Repeint la seule liste d'armes depuis pnj.weapons. */
  _rerenderWeapons(pnj) {
    const list = document.getElementById("em-weapons-list");
    if (list) list.innerHTML = this._weaponRows(pnj);
    this._refreshZoneSummary(
      "em-weapons-list",
      this._zoneCount((pnj.weapons || []).length, "arme", "armes"),
    );
  },

  /* ---- Sorts (objets structurés, add/retrait via catalogue seulement) ---- */

  _spellRows(pnj) {
    const esc = CardRenderer._esc;
    return (pnj.spells || [])
      .map((sp, i) => {
        const detail = [
          Content.spellCatLabels[sp.cat] || sp.cat,
          sp.drain != null ? `Drain ${sp.drain}` : sp.niveau != null ? `Niv. ${sp.niveau}` : null,
        ]
          .filter(Boolean)
          .join(", ");
        return `<div class="em-skill-row" data-idx="${i}">
          <span class="em-skill-name" title="${esc(sp.desc || "")}">${esc(sp.name)}${detail ? ` — ${esc(detail)}` : ""}</span>
          <button type="button" class="em-skill-del" title="Retirer"
            data-action="remove-spell">×</button>
        </div>`;
      })
      .join("");
  },

  /* Sélecteur groupé « ＋ Catalogue » — monté seulement si l'édition expose
     un catalogue de sorts (spellCatalog() ≠ null). */
  _spellCatalogControls(pnj) {
    const catalog = App.getEditionModule(pnj.edition).spellCatalog?.();
    if (!catalog || !catalog.length) return "";
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-spell-catalog",
        label: "",
        groups: catalog.map((g) => ({
          category: g.category,
          items: g.items.map((it) => ({ value: it.id, label: it.label })),
        })),
        value: "",
        placeholder: "＋ Catalogue…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-spell-item">Ajouter</button>
    </div>`;
  },

  addSpellItem() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const sel = document.getElementById("em-spell-catalog");
    const id = sel?.value;
    if (!id) return;
    this._readForm(pnj);
    App.getEditionModule(pnj.edition).addSpellItem(pnj, id);
    this._rerenderSpells(pnj);
    SingleSelect.reset("em-spell-catalog");
  },

  removeSpell(i) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.spells) return;
    this._readForm(pnj);
    pnj.spells.splice(i, 1);
    this._rerenderSpells(pnj);
  },

  _rerenderSpells(pnj) {
    const list = document.getElementById("em-spells-list");
    if (list) list.innerHTML = this._spellRows(pnj);
    this._refreshZoneSummary(
      "em-spells-list",
      this._zoneCount((pnj.spells || []).length, "sort", "sorts"),
    );
  },

  /* ---- Formes complexes (T2), même patron que les Sorts ci-dessus. ---- */

  _complexFormRows(pnj) {
    const esc = CardRenderer._esc;
    const costLabel = App.getEditionModule(pnj.edition).technoCostLabel || "VT";
    return (pnj.complexForms || [])
      .map((f, i) => {
        const detail = [Content.complexFormCatLabels[f.cat] || f.cat, f.vt != null ? `${costLabel} ${f.vt}` : null]
          .filter(Boolean)
          .join(", ");
        return `<div class="em-skill-row" data-idx="${i}">
          <span class="em-skill-name" title="${esc(f.desc || "")}">${esc(f.name)}${detail ? ` — ${esc(detail)}` : ""}</span>
          <button type="button" class="em-skill-del" title="Retirer"
            data-action="remove-complex-form">×</button>
        </div>`;
      })
      .join("");
  },

  /* Sélecteur groupé « ＋ Catalogue » + sélecteur d'attribut (Dispersion/
     Injection uniquement — ignoré par les autres entrées, cf.
     Content._resolveComplexForm). Monté seulement si l'édition expose un
     catalogue de formes (complexFormCatalog() ≠ null). */
  _complexFormCatalogControls(pnj) {
    const catalog = App.getEditionModule(pnj.edition).complexFormCatalog?.();
    if (!catalog || !catalog.length) return "";
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-complex-form-catalog",
        label: "",
        groups: catalog.map((g) => ({
          category: g.category,
          items: g.items.map((it) => ({ value: it.id, label: it.label })),
        })),
        value: "",
        placeholder: "＋ Catalogue…",
      })}
      ${SingleSelect.create({
        id: "em-complex-form-attr",
        label: "",
        options: Object.entries(Content.MATRIX_ATTR_LABELS).map(([value, label]) => ({ value, label })),
        value: "attack",
        placeholder: "Attribut (Dispersion/Injection)…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-complex-form-item">Ajouter</button>
    </div>`;
  },

  addComplexFormItem() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const sel = document.getElementById("em-complex-form-catalog");
    const id = sel?.value;
    if (!id) return;
    const attr = document.getElementById("em-complex-form-attr")?.value;
    this._readForm(pnj);
    App.getEditionModule(pnj.edition).addComplexFormItem(pnj, id, attr);
    this._rerenderComplexForms(pnj);
    SingleSelect.reset("em-complex-form-catalog");
  },

  removeComplexForm(i) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.complexForms) return;
    this._readForm(pnj);
    pnj.complexForms.splice(i, 1);
    this._rerenderComplexForms(pnj);
  },

  _rerenderComplexForms(pnj) {
    const list = document.getElementById("em-complex-forms-list");
    if (list) list.innerHTML = this._complexFormRows(pnj);
    this._refreshZoneSummary(
      "em-complex-forms-list",
      this._zoneCount((pnj.complexForms || []).length, "forme", "formes"),
    );
  },

  /* ---- Pouvoirs d'adepte (objets structurés, add/retrait via catalogue seulement) ---- */

  _powerRows(pnj) {
    const esc = CardRenderer._esc;
    return (pnj.powers || [])
      .map(
        (p, i) => `<div class="em-skill-row" data-idx="${i}">
          <span class="em-skill-name" title="${esc(p.desc || "")}">${esc(p.name)}</span>
          <button type="button" class="em-skill-del" title="Retirer"
            data-action="remove-power">×</button>
        </div>`,
      )
      .join("");
  },

  /* Sélecteur plat « ＋ Catalogue » — monté seulement si l'édition expose un
     catalogue de pouvoirs d'adepte (powerCatalog() ≠ null). */
  _powerCatalogControls(pnj) {
    const catalog = App.getEditionModule(pnj.edition).powerCatalog?.();
    if (!catalog || !catalog.length) return "";
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-power-catalog",
        label: "",
        options: catalog.map((it) => ({ value: it.id, label: it.label })),
        value: "",
        placeholder: "＋ Catalogue…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-power-item">Ajouter</button>
    </div>`;
  },

  addPowerItem() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const sel = document.getElementById("em-power-catalog");
    const id = sel?.value;
    if (!id) return;
    this._readForm(pnj);
    App.getEditionModule(pnj.edition).addPowerItem(pnj, id);
    this._rerenderPowers(pnj);
    SingleSelect.reset("em-power-catalog");
  },

  removePower(i) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.powers) return;
    this._readForm(pnj);
    pnj.powers.splice(i, 1);
    this._rerenderPowers(pnj);
  },

  _rerenderPowers(pnj) {
    const list = document.getElementById("em-powers-list");
    if (list) list.innerHTML = this._powerRows(pnj);
    this._refreshZoneSummary(
      "em-powers-list",
      this._zoneCount((pnj.powers || []).length, "pouvoir", "pouvoirs"),
    );
  },

  /* ---- Progression ésotérique (P2-P4, Initiation/Submersion) — UN moteur
     (esoteric.js), deux catalogues (metamagics/echoes selon la voie),
     même mécanique de grade+acquis que le livre lui-même fusionne.
     Toute la section se re-rend en bloc (_rerenderEsoteric) plutôt que
     par liste ciblée : la structure change de forme entre "pas encore
     initié" (boutons de départ) et "initié" (grade+acquis), contrairement
     aux autres zones qui ne font qu'ajouter/retirer une ligne. ---- */

  _esotericSection(pnj) {
    const edition = pnj.edition;
    if (!pnj.esoteric) {
      const starters = Esoteric.VOIES.filter((v) => Esoteric.voieAvailable(edition, v))
        .map(
          (v) =>
            `<button type="button" class="em-add-skill-btn" data-action="esoteric-start" data-voie="${v}">＋ Devenir ${Esoteric.agentLabel(v).toLowerCase()}</button>`,
        )
        .join(" ");
      if (!starters) return "";
      return this._zone("Initiation / Submersion", `<div class="em-add-skill">${starters}</div>`, {
        collapsed: true,
      });
    }
    const voie = pnj.esoteric.voie;
    const esc = CardRenderer._esc;
    const nextCost = Esoteric.nextCostLabel(pnj, edition);
    const body = `<div class="em-esoteric-grade">
        <span>${esc(Esoteric.agentLabel(voie))} — grade <strong>${Esoteric.grade(pnj)}</strong></span>
        <button type="button" class="em-skill-del" data-action="esoteric-grade-dec" title="Réduire le grade">−</button>
        <button type="button" class="em-add-skill-btn" data-action="esoteric-grade-inc" title="${nextCost ? `Coût du grade suivant : ${esc(nextCost)}` : ""}">+ Grade</button>
        <button type="button" class="em-skill-del" data-action="esoteric-remove" title="Retirer la progression">✕</button>
      </div>
      <div id="em-esoteric-acquis-list" class="em-skills-list">${this._esotericAcquisRows(pnj)}</div>
      ${this._esotericCatalogControls(pnj)}`;
    const acquisLabel = Esoteric.acquisLabel(edition, voie).toLowerCase();
    return this._zone(`${Esoteric.label(voie)} (${acquisLabel}s)`, body, {
      summary: this._zoneCount(Esoteric.acquis(pnj).length, acquisLabel, `${acquisLabel}s`),
      collapsed: true,
    });
  },

  _esotericAcquisRows(pnj) {
    const esc = CardRenderer._esc;
    const ed = pnj.edition;
    const lookup = pnj.esoteric.voie === "submersion" ? Content.echoFor.bind(Content) : Content.metamagicFor.bind(Content);
    return Esoteric.acquis(pnj)
      .map((name, i) => {
        const entry = lookup(ed, name);
        const label = entry && entry.titreReconstitue ? `${name} *` : name;
        return `<div class="em-skill-row" data-idx="${i}">
          <span class="em-skill-name" title="${esc((entry && entry.desc) || "")}">${esc(label)}</span>
          <button type="button" class="em-skill-del" title="Retirer" data-action="esoteric-acquis-remove">×</button>
        </div>`;
      })
      .join("");
  },

  /* Sélecteur « ＋ Catalogue » — groupé par `pour` pour l'Initiation
     (facette canon, cf. metamagicCatalogFor), plat pour la Submersion
     (un écho ne distingue pas magicien/adepte). Contenu antagoniste
     (magie du sang/toxique, échos dissonants — P5) inclus UNIQUEMENT
     pour un PNJ, jamais un PJ : « régime PNJ, pas option PJ », cf.
     plan § P5 — la matière à antagoniste n'est pas une progression
     de personnage joueur standard. */
  _esotericCatalogControls(pnj) {
    const mod = App.getEditionModule(pnj.edition);
    const submersion = pnj.esoteric.voie === "submersion";
    const includeAntagonist = !pnj.isPC;
    const catalog = submersion ? mod.echoCatalog?.(includeAntagonist) : mod.metamagicCatalog?.(includeAntagonist);
    if (!catalog || !catalog.length) return "";
    const label = (it) => (it.titreReconstitue ? `${it.label} *` : it.antagonist ? `⚠ ${it.label}` : it.label);
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-esoteric-catalog",
        label: "",
        ...(submersion
          ? { options: catalog.map((it) => ({ value: it.id, label: label(it) })) }
          : { groups: catalog.map((g) => ({ category: g.category, items: g.items.map((it) => ({ value: it.id, label: label(it) })) })) }),
        value: "",
        placeholder: "＋ Catalogue…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="esoteric-acquis-add">Ajouter</button>
    </div>`;
  },

  startEsoteric(voie) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    this._readForm(pnj);
    pnj.esoteric = Esoteric.blank(voie);
    this._rerenderEsoteric(pnj);
  },

  removeEsoteric() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.esoteric) return;
    this._readForm(pnj);
    pnj.esoteric = null;
    this._rerenderEsoteric(pnj);
  },

  incEsotericGrade() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.esoteric) return;
    this._readForm(pnj);
    pnj.esoteric.grade = (pnj.esoteric.grade || 0) + 1;
    this._rerenderEsoteric(pnj);
  },

  decEsotericGrade() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.esoteric) return;
    this._readForm(pnj);
    pnj.esoteric.grade = Math.max(0, (pnj.esoteric.grade || 0) - 1);
    this._rerenderEsoteric(pnj);
  },

  addEsotericAcquis() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.esoteric) return;
    const sel = document.getElementById("em-esoteric-catalog");
    const id = sel?.value;
    if (!id) return;
    this._readForm(pnj);
    const mod = App.getEditionModule(pnj.edition);
    if (pnj.esoteric.voie === "submersion") mod.addEchoItem(pnj, id);
    else mod.addMetamagicItem(pnj, id);
    this._rerenderEsoteric(pnj);
    SingleSelect.reset("em-esoteric-catalog");
  },

  removeEsotericAcquis(i) {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj || !pnj.esoteric || !pnj.esoteric.acquis) return;
    this._readForm(pnj);
    pnj.esoteric.acquis.splice(i, 1);
    this._rerenderEsoteric(pnj);
  },

  _rerenderEsoteric(pnj) {
    const section = document.getElementById("em-esoteric-section");
    if (section) section.innerHTML = this._esotericSection(pnj);
  },

  /* ---- Atouts (texte libre + catalogue dédupliqué qui ajoute une ligne) ---- */

  /* Sélecteur plat « ＋ Catalogue » — monté seulement si l'édition expose un
     catalogue d'Atouts (edgeCatalog() ≠ null, Anarchy 1/2 seulement — le
     gate hasEdges de la section exclut déjà SR5/SR6 avant même l'appel). */
  _edgeCatalogControls(pnj) {
    const catalog = App.getEditionModule(pnj.edition).edgeCatalog?.();
    if (!catalog || !catalog.length) return "";
    return `<div class="em-add-skill">
      ${SingleSelect.create({
        id: "em-edge-catalog",
        label: "",
        options: catalog.map((it) => ({ value: it.id, label: it.label })),
        value: "",
        placeholder: "＋ Catalogue…",
      })}
      <button type="button" class="em-add-skill-btn" data-action="add-edge-item">Ajouter</button>
    </div>`;
  },

  addEdgeItem() {
    const pnj = PnjLookup.find(this.currentId);
    if (!pnj) return;
    const sel = document.getElementById("em-edge-catalog");
    const id = sel?.value;
    if (!id) return;
    this._readForm(pnj);
    App.getEditionModule(pnj.edition).addEdgeItem(pnj, id);
    this._rerenderEdges(pnj);
    SingleSelect.reset("em-edge-catalog");
  },

  _rerenderEdges(pnj) {
    const el = document.getElementById("em-atouts");
    if (el) el.value = (pnj.edges || []).join("\n");
    this._refreshZoneSummary(
      "em-atouts",
      this._zoneCount((pnj.edges || []).length, "atout", "atouts"),
    );
  },

  /* #66 : la valeur du picker peut être une souche OU une métavariante/
     métaconscience/zoocanthrope (même liste plate que metaOptions()) —
     la re-résoudre via Metavariants pour retomber sur le même quatuor de
     champs que generate() (meta = souche seule, metavariant/metaFamily/
     metaTraits à part), sinon la fiche affiche « Nartaki » comme souche
     et perd les traits raciaux. Anarchy 2.0 (pas de useMetavariants) garde
     l'ancien comportement : `val` est déjà une souche. */
  _readMeta(pnj, val) {
    if (!val) return;
    const ed = App.getEditionModule(pnj.edition);
    if (!ed.useMetavariants || typeof Metavariants === "undefined") {
      pnj.meta = val;
      return;
    }
    Metavariants.use(pnj.edition);
    const resolved = Metavariants.resolve(val);
    pnj.meta = resolved ? resolved.baseMetatype : val;
    pnj.metavariant = resolved ? resolved.name : null;
    pnj.metaFamily = resolved ? resolved.family : null;
    pnj.metaTraits = resolved ? resolved.traits || [] : [];
  },

  /* ---- Lecture du formulaire → mise à jour du PNJ ---- */
  _readForm(pnj) {
    const val = (id) => document.getElementById(id)?.value ?? "";
    const num = (id, fallback) => parseInt(val(id), 10) || fallback;

    pnj.name = val("em-name").trim() || pnj.name;
    this._readMeta(pnj, val("em-meta"));
    pnj.gender = val("em-gender") || pnj.gender;

    const edModuleForm = App.getEditionModule(pnj.edition);
    const ratingBadge = edModuleForm.ratingBadge;
    if (ratingBadge.options) {
      pnj[ratingBadge.field] = val("em-rang") || pnj[ratingBadge.field];
    } else {
      pnj[ratingBadge.field] = num("em-prof", pnj[ratingBadge.field]);
    }
    if (edModuleForm.hasEdges) {
      const edgesEl = document.getElementById("em-atouts");
      if (edgesEl)
        pnj.edges = edgesEl.value
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
    }

    // Attributs. Ressource de relance (Chance CHC / Atout ATO) bornée 0-7
    // (0 = épuisée) ; MAG bornée 0-12 (0 = non magicien, légitime — le MJ
    // doit pouvoir FAIRE DEVENIR un PNJ magicien) ; les autres 1-12. Clé lue
    // via le module d'édition.
    const edgeKey = edModuleForm.rerollAction?.costAttr;
    const magicAttrKey = edModuleForm.magicAttr;
    const resonanceAttrKey = edModuleForm.resonanceAttr;
    const allAttrKeys = [
      ...edModuleForm.attributes,
      ...(magicAttrKey ? [magicAttrKey] : []),
      ...(resonanceAttrKey ? [resonanceAttrKey] : []),
      ...(edgeKey ? [edgeKey] : []),
    ];
    for (const k of allAttrKeys) {
      const el = document.getElementById(`em-attr-${k}`);
      // MAG/RES : lus même si l'attribut n'existait pas encore (le champ est
      // TOUJOURS rendu pour l'édition, cf. _buildForm) — sinon impossible de
      // faire naître un magicien/technomancien depuis 0. Les autres attrs
      // gardent la garde (le champ n'existe que si l'attribut existe déjà).
      if (el && (pnj.attrs[k] !== undefined || k === magicAttrKey || k === resonanceAttrKey)) {
        const [lo, hi] =
          k === edgeKey ? [0, 7] : k === magicAttrKey || k === resonanceAttrKey ? [0, 12] : [1, 12];
        const raw = parseInt(el.value, 10);
        // Édition manuelle : pose la BASE du Trait (le total est recalculé,
        // mods d'équipement préservés). Fallback = base courante si NaN.
        Actor.setBase(
          pnj,
          k,
          Utils.clamp(Number.isNaN(raw) ? Actor.base(pnj, k) : raw, lo, hi),
        );
      }
    }

    // Équipement — #63 : la textarea ne porte que les items CHAÎNE (indice
    // fixe/absent) ; les items OBJET (indice non résolu) vivent à part dans
    // la liste à stepper et ne doivent jamais être écrasés par elle, sous
    // peine de perdre `.rating` au save. On lit d'abord le stepper de chaque
    // objet en place, puis on ne remplace que le sous-ensemble « chaînes ».
    if (Array.isArray(pnj.equip)) {
      pnj.equip.forEach((it, i) => {
        if (!it || typeof it !== "object") return;
        const input = document.getElementById(`em-equip-rating-${i}`);
        if (!input) return;
        const [lo, hi] = ItemResolver.ratingRange(it.str) || [1, 6];
        const raw = parseInt(input.value, 10);
        it.rating = Number.isNaN(raw) ? null : Utils.clamp(raw, lo, hi);
      });
    }
    const equipEl = document.getElementById("em-equip");
    if (equipEl) {
      const lines = equipEl.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const objects = (pnj.equip || []).filter((it) => it && typeof it === "object");
      pnj.equip = [...objects, ...lines];
    }

    // Compétences (SR5/SR6 + Anarchy) : niveau, spécialité, RR
    this._readSkills(pnj);

    // Connaissances (SR5/SR6, hasKnowledges) : nom, niveau, catégorie
    this._readKnowledges(pnj);

    // Cyberdeck — lu seulement si la section a été montée (pnj.cyberdeck).
    if (pnj.cyberdeck) CyberdeckRenderer.readForm(pnj);
    // Persona incarné — lu seulement si la section a été montée (pnj.persona).
    if (pnj.persona) PersonaRenderer.readForm(pnj);

    // Identités (SIN)
    this._readIdentitiesSection(pnj);

    // Suivi de campagne (optionnel, PJ seulement)
    this._readCampaignSection(pnj);

    // Notes
    const notesEl = document.getElementById("em-notes");
    if (notesEl) pnj.notes = notesEl.value;
  },

  /** Délégation globale du modal (le conteneur #edit-modal n'est jamais
      recréé, seul son contenu — modal-form-body, liste de compétences —
      est reconstruit à chaque open()/rerender). */
  init() {
    const modal = document.getElementById("edit-modal");
    if (!modal) return;

    modal.addEventListener("click", (e) => {
      // Click-to-edit sur le rendu des notes — avant la délégation
      // data-action (une puce @/# à l'intérieur reste prioritaire, cf. garde).
      if (
        e.target.closest("#em-notes-read") &&
        !e.target.closest("[data-action]") &&
        document.getSelection().isCollapsed
      ) {
        this._editNotesFromRead();
        return;
      }
      const el = e.target.closest("[data-action]");
      if (!el) return;
      switch (el.dataset.action) {
        case "close":
          this.close();
          break;
        case "revert":
          this.revert();
          break;
        case "add-skill":
          this.addSkill();
          break;
        case "remove-skill": {
          const row = el.closest("[data-idx]");
          if (row) this.removeSkill(parseInt(row.dataset.idx, 10));
          break;
        }
        case "add-knowledge":
          this.addKnowledge();
          break;
        case "remove-knowledge": {
          const row = el.closest("[data-idx]");
          if (row) this.removeKnowledge(parseInt(row.dataset.idx, 10));
          break;
        }
        case "add-equip-item":
          this.addEquipItem();
          break;
        case "remove-equip-rating": {
          const row = el.closest("[data-idx]");
          if (row) this.removeEquipRating(parseInt(row.dataset.idx, 10));
          break;
        }
        case "remove-weapon": {
          const row = el.closest("[data-idx]");
          if (row) this.removeWeapon(parseInt(row.dataset.idx, 10));
          break;
        }
        case "add-spell-item":
          this.addSpellItem();
          break;
        case "remove-spell": {
          const row = el.closest("[data-idx]");
          if (row) this.removeSpell(parseInt(row.dataset.idx, 10));
          break;
        }
        case "add-complex-form-item":
          this.addComplexFormItem();
          break;
        case "remove-complex-form": {
          const row = el.closest("[data-idx]");
          if (row) this.removeComplexForm(parseInt(row.dataset.idx, 10));
          break;
        }
        case "add-power-item":
          this.addPowerItem();
          break;
        case "remove-power": {
          const row = el.closest("[data-idx]");
          if (row) this.removePower(parseInt(row.dataset.idx, 10));
          break;
        }
        case "add-edge-item":
          this.addEdgeItem();
          break;
        case "esoteric-start":
          this.startEsoteric(el.dataset.voie);
          break;
        case "esoteric-remove":
          this.removeEsoteric();
          break;
        case "esoteric-grade-inc":
          this.incEsotericGrade();
          break;
        case "esoteric-grade-dec":
          this.decEsotericGrade();
          break;
        case "esoteric-acquis-add":
          this.addEsotericAcquis();
          break;
        case "esoteric-acquis-remove": {
          const row = el.closest("[data-idx]");
          if (row) this.removeEsotericAcquis(parseInt(row.dataset.idx, 10));
          break;
        }
        case "pick-pc-color":
          this.pickColor(el.dataset.color);
          break;
        case "add-contact-link":
          this.addContactLink();
          break;
        case "remove-contact-link":
          this.removeContactLink(el.dataset.id);
          break;
        case "toggle-notes-mode":
          this.toggleNotesMode();
          break;
        case "camp-track-add":
          this.addCampaignTrack();
          break;
        case "camp-track-remove":
          this.removeCampaignTrack(el.dataset.key);
          break;
        case "id-add":
          this.addIdentity();
          break;
        case "id-remove":
          this.removeIdentity(parseInt(el.dataset.idx, 10));
          break;
        case "id-set-active":
          this.setActiveIdentity(parseInt(el.dataset.idx, 10));
          break;
        case "id-lic-add":
          this.addLicense(parseInt(el.dataset.idx, 10));
          break;
        case "id-lic-remove":
          this.removeLicense(parseInt(el.dataset.idx, 10), parseInt(el.dataset.lidx, 10));
          break;
        case "id-ls-add":
          this.addLifestyle(parseInt(el.dataset.idx, 10));
          break;
        case "id-ls-remove":
          this.removeLifestyle(el.dataset.host, parseInt(el.dataset.lidx, 10));
          break;
        case "em-zone-toggle": {
          // Pli ÉPHÉMÈRE (D-a) : bascule la classe DOM, aucune persistance,
          // aucune mutation de pnj (surtout PAS pnj._zoneOpen, réservé à la
          // carte). L'état repart du défaut à la prochaine ouverture.
          const zone = el.closest(".card-zone");
          if (zone) {
            const collapsed = zone.classList.toggle("zone-collapsed");
            el.setAttribute("aria-expanded", String(!collapsed));
          }
          break;
        }
      }
    });
    modal.addEventListener("input", (e) => {
      if (e.target.classList.contains("em-color-custom-input")) {
        this.pickCustomColor(e.target.value);
      }
    });
    // Rattacher un style de vie à une autre SIN : un <select> émet `change`,
    // jamais `click` — il ne peut donc pas passer par le switch d'actions
    // ci-dessus (même raison que la cible Matrice du decker, cf. cardrenderer).
    modal.addEventListener("change", (e) => {
      const sel = e.target.closest('[data-action="id-ls-move"]');
      if (!sel) return;
      this.moveLifestyle(sel.dataset.host, parseInt(sel.dataset.lidx, 10), sel.value);
    });
  },
};

/* Auto-init APRÈS le reste des scripts. Ne pas tester
   `readyState === "loading"` : il vaut déjà "interactive" quand les
   scripts différés s'exécutent, l'init partirait trop tôt.
   DOMContentLoaded ne se déclenche qu'une fois TOUS exécutés. */
if (document.readyState === "complete") {
  EditModal.init();
} else {
  document.addEventListener("DOMContentLoaded", () => EditModal.init(), { once: true });
}

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.EditModal = EditModal;
