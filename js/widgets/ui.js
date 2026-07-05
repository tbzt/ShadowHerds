"use strict";

/* ============================================================
   UI — interactions live (moniteurs, narcos, véhicules/drones liés,
   esprits invoqués, etc.)
   ============================================================ */
const UI = {
  /** Clic sur une case de moniteur */
  toggleMonitor(pnjId, type, idx) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;

    // Mapping type → champ du PNJ
    const fieldMap = {
      phys: "physFilled",
      stun: "stunFilled",
      mon: "monFilled",
      ment: "mentFilled",
      mat: "matFilled",
      // Anarchy 2.0 : moniteur d'état unique à cases fixes (léger/grave/incap)
      leger: "legerFilled",
      grave: "graveFilled",
      incap: "incapFilled",
    };
    const field = fieldMap[type] || "monFilled";
    if (pnj[field] === undefined) pnj[field] = 0;

    pnj[field] = idx < pnj[field] ? idx : idx + 1;

    Shadows.save();
    CardRenderer.refresh(pnj);
  },

  /** Clic sur un point de narco (Anarchy) */
  toggleNarco(pnjId, idx) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;
    if (idx < (pnj.narcoUsed || 0)) {
      pnj.narcoUsed = idx;
    } else {
      pnj.narcoUsed = idx + 1;
    }
    Shadows.save();
    CardRenderer.refresh(pnj);
  },

  /** Clic sur le tag d'une drogue : fait avancer le cycle idle → effet →
      contrecoup → idle (cf. js/drugs.js). */
  cycleDrug(pnjId, edition, drugId) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;
    Drugs.advance(pnj, edition, drugId);
    Shadows.save();
    CardRenderer.refresh(pnj);
  },

  /** Clic sur le tag d'une armure optionnelle (Anarchy) : équipe/range le
      bouclier, ce qui relève/abaisse les seuils physiques affichés. */
  toggleArmorOption(pnjId, idx) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;
    pnj.armorOptions = pnj.armorOptions || {};
    if (pnj.armorOptions[idx]) delete pnj.armorOptions[idx];
    else pnj.armorOptions[idx] = true;
    Shadows.save();
    CardRenderer.refresh(pnj);
  },

  /* ========================================================
     VÉHICULES & DRONES LIÉS (js/vehicles.js)
     ======================================================== */

  /** Clic sur une chip de la zone Combat : déploie la fiche liée,
      ou recentre la vue dessus si elle existe déjà. */
  deployVehicle(ownerId, srcIdx) {
    const owner = PnjLookup.find(ownerId);
    if (!owner) return;
    const srcItem = (this._vehicleItems(owner) || [])[srcIdx];
    if (!srcItem) return;

    const existing = Vehicles.linkedTo(ownerId, srcItem);
    if (existing.length) {
      this._flashCard(existing[0].id);
      return;
    }

    const spawned = Vehicles.spawn(owner, srcItem, owner.edition);
    if (!spawned.length) return;

    const inShadows = Shadows.data.all.some((p) => p.id === ownerId);
    // Un PNJ sauvegardé peut avoir deux cartes : on ancre la fiche liée
    // sur la carte du panneau actif (celle que l'utilisateur voit).
    const ownerCard =
      document.querySelector(`.panel.active .pnj-card[data-id="${ownerId}"]`) ||
      document.querySelector(`.pnj-card[data-id="${ownerId}"]`);
    let anchor = ownerCard;
    for (const v of spawned) {
      if (inShadows) Shadows.data.all.push(v);
      else Gen.pool.push(v);
      if (anchor) {
        const card = CardRenderer.render(v, inShadows ? ["remove"] : ["discard"]);
        card.classList.add("vehicle-card", "vehicle-deploying");
        anchor.insertAdjacentElement("afterend", card);
        setTimeout(() => card.classList.remove("vehicle-deploying"), 700);
        anchor = card;
      }
    }
    if (inShadows) Shadows.save();
    CardRenderer.refresh(owner); // met à jour l'état des chips
  },

  /** Bouton « Ranger » d'une fiche liée : retire la ou les fiches
      issues du même item source. */
  dismissVehicle(vehicleId) {
    const v = PnjLookup.find(vehicleId);
    if (!v || v.type !== "vehicle") return;
    const siblings = Vehicles.linkedTo(v.ownerId, v.srcItem);
    for (const s of siblings) {
      Shadows.data.all = Shadows.data.all.filter((p) => p.id !== s.id);
      if (Gen.pool) Gen.pool = Gen.pool.filter((p) => p.id !== s.id);
      document
        .querySelectorAll(`.pnj-card[data-id="${s.id}"]`)
        .forEach((card) => card.remove());
    }
    Shadows.save();
    const owner = PnjLookup.find(v.ownerId);
    if (owner) CardRenderer.refresh(owner);
  },

  /** Badge « lié à » : scroll + flash de la carte du propriétaire. */
  focusOwner(ownerId) {
    this._flashCard(ownerId);
  },

  _flashCard(id) {
    const card =
      document.querySelector(`.panel.active .pnj-card[data-id="${id}"]`) ||
      document.querySelector(`.pnj-card[data-id="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("card-flash");
    setTimeout(() => card.classList.remove("card-flash"), 1200);
  },

  /** Items déployables d'un PNJ (équipement + atouts Anarchy),
      dans un ordre stable — l'index sert de référence aux chips. */
  _vehicleItems(pnj) {
    if (typeof Vehicles === "undefined" || !pnj || pnj.type === "vehicle")
      return [];
    const src = [...(pnj.equip || []), ...(App.getEditionModule(pnj.edition).hasEdges ? pnj.edges || [] : [])];
    return src.filter((i) => Vehicles.matchItem(i, pnj.edition));
  },

  /* ========================================================
     ESPRITS INVOQUÉS (js/spirits.js)
     ======================================================== */
  _summon: null, // état du panneau : { ownerId, force, tier, services }

  /** Panneau d'invocation singleton (pattern du panneau de risque). */
  _ensureSummonPanel() {
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
        <div class="summon-row">
          <span class="summon-row-label">Services</span>
          <div class="summon-steps" id="summon-service-steps"></div>
        </div>
        <div class="summon-types" id="summon-types"></div>
      </div>`;
    document.body.appendChild(p);
    p.addEventListener("click", (e) => {
      if (e.target === p) this._closeSummonPanel();
    });
    document.getElementById("summon-close").addEventListener("click", () =>
      this._closeSummonPanel(),
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !p.hasAttribute("hidden")) this._closeSummonPanel();
    });

    document.getElementById("summon-power-steps").addEventListener("click", (e) => {
      const b = e.target.closest("[data-power]");
      if (!b) return;
      const summonField = App.getEditionModule(this._summon.edition).summonPower.field;
      this._summon[summonField] = parseInt(b.dataset.power, 10);
      this._syncSummonPanel();
    });
    document.getElementById("summon-service-steps").addEventListener("click", (e) => {
      const b = e.target.closest("[data-services]");
      if (!b) return;
      this._summon.services = parseInt(b.dataset.services, 10);
      this._syncSummonPanel();
    });
    document.getElementById("summon-types").addEventListener("click", (e) => {
      const b = e.target.closest("[data-spirit-type]");
      if (!b) return;
      this._doSummon(b.dataset.spiritType);
    });
  },

  openSummonPanel(ownerId) {
    const owner = PnjLookup.find(ownerId);
    if (!owner) return;
    this._ensureSummonPanel();
    this._summon = {
      ownerId,
      edition: owner.edition,
      force: Utils.clamp((owner.attrs && owner.attrs.MAG) || 4, 1, 12),
      tier: 1,
      services: 3,
    };
    document.getElementById("summon-title").textContent =
      `Invoquer — ${owner.name || "PNJ"}`;
    document.getElementById("summon-power-label").textContent =
      App.getEditionModule(owner.edition).summonPower.label;
    this._syncSummonPanel();
    const p = document.getElementById("summon-panel");
    p.removeAttribute("hidden");
    void p.offsetWidth;
    p.classList.add("show");
  },

  _closeSummonPanel() {
    const p = document.getElementById("summon-panel");
    if (!p) return;
    p.classList.remove("show");
    clearTimeout(p._t);
    p._t = setTimeout(() => p.setAttribute("hidden", ""), 200);
  },

  _syncSummonPanel() {
    const s = this._summon;
    const powerEl = document.getElementById("summon-power-steps");
    const summonPower = App.getEditionModule(s.edition).summonPower;
    powerEl.innerHTML = summonPower
      .steps()
      .map(
        ({ value, label }) =>
          `<button class="summon-step-btn${s[summonPower.field] === value ? " active" : ""}" data-power="${value}">${label}</button>`,
      )
      .join("");
    document.getElementById("summon-service-steps").innerHTML = [1, 2, 3, 4, 5, 6]
      .map(
        (n) =>
          `<button class="summon-step-btn${s.services === n ? " active" : ""}" data-services="${n}">${n}</button>`,
      )
      .join("");
    const types = Spirits.typesFor(s.edition);
    document.getElementById("summon-types").innerHTML = Object.entries(types)
      .map(
        ([key, t]) =>
          `<button class="summon-type-btn" data-spirit-type="${key}">✦ ${t.label}</button>`,
      )
      .join("");
  },

  _doSummon(typeKey) {
    const s = this._summon;
    const owner = PnjLookup.find(s.ownerId);
    if (!owner) return;
    const spirit = Spirits.spawn(owner, typeKey, {
      force: s.force,
      tier: s.tier,
      services: s.services,
    });
    this._closeSummonPanel();
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
  },

  /** Pip de service : marque les services rendus (clic = bascule). */
  toggleService(spiritId, idx) {
    const sp = PnjLookup.find(spiritId);
    if (!sp || sp.type !== "spirit") return;
    sp.servicesUsed = idx < (sp.servicesUsed || 0) ? idx : idx + 1;
    Shadows.save();
    CardRenderer.refresh(sp);
  },

  /** Congédie un esprit : retire sa fiche. */
  dismissSpirit(spiritId) {
    const sp = PnjLookup.find(spiritId);
    if (!sp || sp.type !== "spirit") return;
    Shadows.data.all = Shadows.data.all.filter((p) => p.id !== sp.id);
    if (Gen.pool) Gen.pool = Gen.pool.filter((p) => p.id !== sp.id);
    document
      .querySelectorAll(`.pnj-card[data-id="${sp.id}"]`)
      .forEach((card) => card.remove());
    Shadows.save();
    const owner = PnjLookup.find(sp.ownerId);
    if (owner) CardRenderer.refresh(owner);
  },
};
