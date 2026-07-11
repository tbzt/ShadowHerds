"use strict";

/* ============================================================
   SUMMON PANEL — invocation d'esprits (extrait de UI, CH-A7 :
   UI était un fourre-tout mélangeant moniteurs/véhicules/esprits ;
   l'invocation est un domaine fonctionnel complet et autonome).
   ============================================================ */
const SummonPanel = {
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
      const summonField = App.getEditionModule(this._summon.edition).summonPower.field;
      this._summon[summonField] = parseInt(b.dataset.power, 10);
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

  open(ownerId) {
    const owner = PnjLookup.find(ownerId);
    if (!owner) return;
    this._ensure();
    this._summon = {
      ownerId,
      edition: owner.edition,
      force: Utils.clamp((owner.attrs && owner.attrs.MAG) || 4, 1, 12),
      tier: 1,
      services: 3,
    };
    document.getElementById("summon-title").textContent =
      `Invoquer — ${owner.name || "PNJ"}`;
    const ed = App.getEditionModule(owner.edition);
    document.getElementById("summon-power-label").textContent =
      ed.summonPower.label;
    // Services choisis à la main uniquement là où l'invocation n'est pas
    // chiffrée (Anarchy) ; en SR5/SR6 ils découlent des succès nets du jet.
    document.getElementById("summon-service-row").style.display =
      ed.conjureSkill ? "none" : "";
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
    if (conj) {
      toast(`Esprit invoqué : ${services} service${services > 1 ? "s" : ""}. ${this._drainToast(conj)}`);
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
