"use strict";

/* ============================================================
   EVOLUTION — faire évoluer un PJ en campagne, à son barème
   ------------------------------------------------------------
   Contrôleur NEUTRE : il rend les lignes que le module de création
   décrit (`creation.advancement(pnj)` — attributs, compétences,
   spécialisations, connaissances, initiation, Atouts, armes… avec LEUR
   coût et LEUR monnaie : karma en SR5/SR6/Anarchy 1, nuyens en
   Anarchy 2), et le solde disponible vient du registre de campagne
   (`Campaign.balance`). Une progression = `apply` sur la fiche, un
   recalcul par le module, une ligne datée dans le registre
   (`UI.addLedgerEntry`, qui persiste et rafraîchit la carte).

   Rien d'édition ici. Une ligne au-delà du solde reste visible et
   inerte : on voit ce qu'on ne peut pas encore se payer.
   ============================================================ */
import { Campaign } from "../rules/campaign.js";
import { Dialog } from "../widgets/kit/dialog.js";
import { FocusTrap } from "../widgets/kit/focustrap.js";
import { PnjLookup } from "./pnjlookup.js";
import { CardRenderer } from "../widgets/card/cardrenderer.js";
import { CatalogPicker } from "../widgets/kit/catalogpicker.js";

export const Evolution = {
  currentId: null,
  _releaseTrap: null,
  _delegated: false,

  _esc(s) {
    return CardRenderer._esc(s);
  },

  _creationOf(pnj) {
    const mod = App.getEditionModule(pnj.edition);
    return mod && mod.creation && mod.creation.advancement ? mod.creation : null;
  },

  /** Un PJ peut-il évoluer ici ? Lu par la carte pour offrir le geste. */
  available(pnj) {
    return !!(pnj && pnj.isPC && !pnj.pcLight && this._creationOf(pnj));
  },

  open(id) {
    const pnj = PnjLookup.find(id);
    if (!pnj || !this.available(pnj)) {
      toast("Progression non disponible pour cette fiche.", "warning");
      return;
    }
    this.bindDelegation();
    this.currentId = id;
    const overlay = document.getElementById("evolution-overlay");
    overlay.classList.add("open");
    this._releaseTrap = FocusTrap.activate(overlay.querySelector(".modal"));
    this.render();
    overlay.querySelector(".modal-close").focus();
  },

  close() {
    const overlay = document.getElementById("evolution-overlay");
    overlay.classList.remove("open");
    if (this._releaseTrap) {
      this._releaseTrap();
      this._releaseTrap = null;
    }
    this.currentId = null;
  },

  render() {
    const pnj = this.currentId && PnjLookup.find(this.currentId);
    if (!pnj) return;
    const c = this._creationOf(pnj);
    const adv = c.advancement(pnj);
    const solde = Campaign.balance(pnj.campaign, adv.currency);
    const x = (n) => Number(n).toLocaleString("fr-FR");
    const unit = adv.currency === "nuyen" ? "¥" : adv.label;
    document.getElementById("evolution-title").textContent = `Faire évoluer — ${pnj.name}`;
    document.getElementById("evolution-subtitle").textContent = `${adv.label} disponible : ${x(solde)}${adv.currency === "nuyen" ? " ¥" : ""}${adv.source ? ` · ${adv.source}` : ""}`;
    const groupes = [];
    for (const r of adv.rows) {
      let g = groupes.find((x) => x.label === r.group);
      if (!g) groupes.push((g = { label: r.group, rows: [] }));
      g.rows.push(r);
    }
    const body = document.getElementById("evolution-body");
    body.innerHTML = groupes.length
      ? groupes
          .map(
            (g) => `<div class="cg-section-label">${this._esc(g.label)}</div>
        <div class="stack stack--tight ev-rows">${g.rows
          .map((r) => {
            /* Une ligne à catalogue : le sélecteur partagé (recherche, rayons,
               coût par entrée) ; cliquer une entrée l'achète. */
            if (r.catalog) {
              return `<div class="ev-catalog"><span class="ev-label">${this._esc(r.label)}</span>${r.note ? `<p class="cg-hint">${this._esc(r.note)}</p>` : ""}${CatalogPicker.html({
                id: `ev-${r.id}`,
                groups: r.catalog,
                actionAttr: "data-ev-action",
                action: "buy-item",
                attrs: `data-row="${this._esc(r.id)}"`,
                limits: { nuyenLeft: solde, dearTitle: "Au-delà du solde disponible" },
                unit,
                vide: "Rien à choisir.",
              })}</div>`;
            }
            const cher = r.cost > solde;
            return `<div class="cluster ev-row${cher ? " is-dear" : ""}">
              <span class="ev-label">${this._esc(r.label)}</span>
              <button type="button" class="btn-secondary btn-small ev-buy" data-ev-action="buy" data-id="${this._esc(r.id)}" ${cher ? 'disabled title="Au-delà du solde"' : ""}>−${x(r.cost)} ${this._esc(unit)}</button>
            </div>`;
          })
          .join("")}</div>`,
          )
          .join("")
      : `<p class="cg-hint">Rien à faire progresser : tout est au maximum.</p>`;
    CatalogPicker.init();
  },

  /** Une progression : la ligne est retrouvée par son id sur un contrat
      recalculé (les coûts bougent après chaque achat), le texte demandé
      s'il y a lieu, la fiche mutée, recalculée, le registre débité. */
  async buy(rowId, itemId = null) {
    const pnj = this.currentId && PnjLookup.find(this.currentId);
    if (!pnj) return;
    const c = this._creationOf(pnj);
    const adv = c.advancement(pnj);
    const row = adv.rows.find((r) => r.id === rowId);
    if (!row) return;
    // Une entrée de catalogue : son coût prime, son libellé va au registre.
    const item = row.catalog && itemId != null ? row.catalog.flatMap((g) => g.items).find((it) => String(it.id) === String(itemId)) : null;
    if (row.catalog && !item) return;
    const cost = item ? item.cost : row.cost;
    const solde = Campaign.balance(pnj.campaign, adv.currency);
    if (cost > solde) {
      toast("Au-delà du solde disponible.", "warning");
      return;
    }
    let value = item ? item.id : null;
    if (row.prompt) {
      value = await Dialog.prompt({ title: row.label, label: row.prompt, confirmLabel: "Valider" });
      if (value === null || !String(value).trim()) return;
      value = String(value).trim();
    }
    row.apply(pnj, value);
    const mod = App.getEditionModule(pnj.edition);
    if (mod && mod.recalc) mod.recalc(pnj);
    const detail = item ? item.label : value;
    if (cost > 0) {
      // Débite, persiste, rafraîchit la carte — une seule écriture, la sienne.
      UI.addLedgerEntry(pnj.id, adv.currency, -cost, `${row.label}${detail ? ` : ${detail}` : ""}`);
    } else {
      // Sans coût dans cette monnaie (pouvoir d'adepte, en points de pouvoir) :
      // rien au registre, mais la fiche est persistée et repeinte.
      UI.persistEntity(pnj.id);
      UI.refreshEntityCard(pnj.id);
    }
    this.render();
  },

  bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-ev-action]");
      if (!el || !document.getElementById("evolution-overlay")?.contains(el)) return;
      if (el.dataset.evAction === "buy") this.buy(el.dataset.id);
      else if (el.dataset.evAction === "buy-item") {
        if (el.getAttribute("aria-disabled") === "true") return;
        this.buy(el.dataset.row, el.dataset.id);
      } else if (el.dataset.evAction === "close") this.close();
    });
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Evolution = Evolution;
