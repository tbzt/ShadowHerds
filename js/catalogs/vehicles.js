"use strict";

/* ============================================================
   VÉHICULES & DRONES — fiches liées déployables depuis
   l'équipement d'un PNJ (carte sœur à côté du propriétaire).

   - SR5/SR6 : catalogue de stats (tables des livres de base).
     Attaque autonome : SR5 Autopilote + autosoft [Précision],
     SR6 autosoft + Senseurs (Riggers p.203-208 SR6 / p.265-272 SR5).
     Moniteur : ⌈Structure/2⌉ + 8 (les deux éditions).
   - Anarchy 2.0 : les libellés d'équipement/atout sont
     auto-descriptifs et parsés tels quels ("Autopilote 6,
     Structure 1, Maniabilité 9, ..."). Autonome : Autopilote
     seul en réserve (p.230). Moniteur : 2 légères / 1 grave /
     1 incapacitante, seuils S+B / 2S+B / 3S+B (p.68 & 230).

   L'entité créée est un objet du même pool que les PNJ
   (Gen.pool / Shadows.data.all) avec type:"vehicle" et ownerId.
   ============================================================ */
const Vehicles = {
  /* ---- Catalogue SR5/SR6 : stats des tables du livre de base ----
     mania/vitesse/accel/structure/blindage/pilote/senseurs.
     SR6 : vitesse = Vitesse max, accel = Accélération, intervalle
     affiché à titre indicatif dans le titre. */
  CATALOG: {
    sr5: [
      { match: /Optic-X2/i, name: "Lockheed Optic-X2", kind: "drone",
        stats: { mania: 4, vitesse: 4, accel: 3, structure: 2, blindage: 2, pilote: 3, senseurs: 3 } },
      { match: /Crawler/i, name: "Aztechnology Crawler", kind: "drone",
        stats: { mania: 4, vitesse: 3, accel: 1, structure: 3, blindage: 3, pilote: 3, senseurs: 3 } },
      { match: /Doberman/i, name: "GM-Nissan Doberman", kind: "drone",
        stats: { mania: 5, vitesse: 3, accel: 1, structure: 4, blindage: 4, pilote: 3, senseurs: 3 } },
      { match: /Roto-?drone/i, name: "MCT-Nissan Roto-drone", kind: "drone",
        stats: { mania: 4, vitesse: 4, accel: 2, structure: 4, blindage: 4, pilote: 3, senseurs: 3 } },
      { match: /Dalmatian/i, name: "Cyberspace Designs Dalmatian", kind: "drone",
        stats: { mania: 5, vitesse: 5, accel: 3, structure: 5, blindage: 5, pilote: 3, senseurs: 3 } },
      { match: /Steel Lynx/i, name: "Steel Lynx", kind: "drone",
        stats: { mania: 5, vitesse: 4, accel: 2, structure: 6, blindage: 12, pilote: 3, senseurs: 3 } },
      { match: /Americar/i, name: "Ford Americar", kind: "vehicule",
        stats: { mania: 4, vitesse: 3, accel: 2, structure: 11, blindage: 6, pilote: 1, senseurs: 2 } },
      { match: /Westwind/i, name: "Eurocar Westwind 3000", kind: "vehicule",
        stats: { mania: 6, vitesse: 7, accel: 3, structure: 10, blindage: 8, pilote: 3, senseurs: 5 } },
      { match: /Bulldog/i, name: "GMC Bulldog", kind: "vehicule",
        stats: { mania: 3, vitesse: 3, accel: 1, structure: 16, blindage: 12, pilote: 1, senseurs: 2 } },
      { match: /Roadmaster/i, name: "Ares Roadmaster", kind: "vehicule",
        stats: { mania: 3, vitesse: 3, accel: 1, structure: 18, blindage: 18, pilote: 3, senseurs: 3 } },
      { match: /Gopher/i, name: "Toyota Gopher", kind: "vehicule",
        stats: { mania: 5, vitesse: 4, accel: 2, structure: 14, blindage: 10, pilote: 1, senseurs: 2 } },
    ],
    sr6: [
      { match: /Optic-X2/i, name: "Lockheed Optic-X2", kind: "drone",
        stats: { mania: 4, vitesse: 140, accel: 15, structure: 2, blindage: 4, pilote: 4, senseurs: 4 } },
      { match: /Crawler/i, name: "Aztechnology Crawler", kind: "drone",
        stats: { mania: 3, vitesse: 30, accel: 8, structure: 6, blindage: 2, pilote: 2, senseurs: 2 } },
      { match: /Doberman/i, name: "GM-Nissan Doberman", kind: "drone",
        stats: { mania: 3, vitesse: 100, accel: 10, structure: 4, blindage: 6, pilote: 2, senseurs: 3 } },
      { match: /Roto-?drone/i, name: "MCT-Nissan Roto-drone", kind: "drone",
        stats: { mania: 3, vitesse: 160, accel: 20, structure: 5, blindage: 6, pilote: 3, senseurs: 2 } },
      { match: /Dalmatian/i, name: "Cyberspace Designs Dalmatian", kind: "drone",
        stats: { mania: 3, vitesse: 130, accel: 13, structure: 6, blindage: 4, pilote: 3, senseurs: 3 } },
      { match: /Steel Lynx/i, name: "Steel Lynx", kind: "drone",
        stats: { mania: 3, vitesse: 80, accel: 15, structure: 12, blindage: 16, pilote: 4, senseurs: 4 } },
      { match: /Americar/i, name: "Ford Americar", kind: "vehicule",
        stats: { mania: 4, vitesse: 160, accel: 9, structure: 11, blindage: 4, pilote: 1, senseurs: 2 } },
      { match: /Westwind/i, name: "Eurocar Westwind X80", kind: "vehicule",
        stats: { mania: 2, vitesse: 250, accel: 24, structure: 6, blindage: 1, pilote: 4, senseurs: 3 } },
      { match: /Bulldog/i, name: "GMC Bulldog Step-Van", kind: "vehicule",
        stats: { mania: 5, vitesse: 140, accel: 10, structure: 16, blindage: 12, pilote: 2, senseurs: 3 } },
      { match: /Roadmaster/i, name: "Ares Roadmaster", kind: "vehicule",
        stats: { mania: 5, vitesse: 120, accel: 8, structure: 18, blindage: 16, pilote: 2, senseurs: 2 } },
      { match: /Gopher/i, name: "Toyota Gopher", kind: "vehicule",
        stats: { mania: 4, vitesse: 150, accel: 15, structure: 12, blindage: 6, pilote: 1, senseurs: 1 } },
    ],
  },

  /* VD standard des armes embarquées, par édition. */
  MOUNTED_WEAPONS: {
    "fusil d'assaut": { sr5: "10P, PA -2", sr6: "VD 5P", anarchy2: "VD 7", get anarchy1() { return this.anarchy2; } },
    "mitrailleuse":   { sr5: "9P, PA -2",  sr6: "VD 5P", anarchy2: "VD 9", get anarchy1() { return this.anarchy2; } },
  },

  /* ---- Détection : un item d'équipement (ou atout Anarchy)
     correspond-il à un véhicule/drone déployable ? ---- */
  matchItem(item, edition) {
    if (typeof item !== "string") return null;
    if (App.getEditionModule(edition)?.usesRiskPanel) return this._parseAnarchy(item);
    const table = this.CATALOG[edition] || [];
    const entry = table.find((e) => e.match.test(item));
    if (!entry) return null;
    return {
      name: entry.name,
      kind: entry.kind,
      count: 1,
      stats: { ...entry.stats },
      weapons: this._parseMounted(item, edition),
      rrNotes: null,
    };
  },

  /* ---- Parseur Anarchy : libellés auto-descriptifs ----
     "2 MCT-Nissan Roto-drone (drones volants moyens) : Autopilote 6,
      Structure 2, Maniabilité 7, Vitesse 6, Blindage 2, avec fusil d'assaut"
     Seuls les libellés (drone/véhicule) portant un indice Autopilote
     sont déployables — les items purement narratifs (« Moto
     personnalisée (véhicule) : RR 1 aux tests... ») restent des tags. */
  _parseAnarchy(item) {
    const head = item.match(/^(\d+)?\s*([^(]+?)\s*\(([^)]*)\)/);
    if (!head) return null;
    const paren = head[3].toLowerCase();
    const isDrone = /drone/.test(paren);
    const isVehicule = /véhicule/.test(paren);
    if (!isDrone && !isVehicule) return null;
    const num = (re) => {
      const m = item.match(re);
      return m ? parseInt(m[1], 10) : 0;
    };
    const autopilote = num(/Autopilote\s*(\d+)/i);
    if (!autopilote) return null; // pas de stats → simple effet narratif
    const rrM = item.match(/RR\s*\d+\s+aux tests[^.;]*/i);
    return {
      name: head[2].trim(),
      kind: isDrone ? "drone" : "vehicule",
      count: head[1] ? parseInt(head[1], 10) : 1,
      stats: {
        autopilote,
        structure: num(/Structure\s*(\d+)/i),
        mania: num(/Maniabilité\s*(\d+)/i),
        vitesse: num(/Vitesse\s*\.?\s*(\d+)/i),
        blindage: num(/Blindage\s*(\d+)/i),
      },
      weapons: this._parseMounted(item, "anarchy2"),
      rrNotes: rrM ? rrM[0].trim() : null,
    };
  },

  /** Arme embarquée mentionnée dans le libellé (« avec fusil d'assaut »,
      « avec mitrailleuse en tourelle »). */
  _parseMounted(item, edition) {
    const m = item.match(/avec\s+(fusil d.assaut|mitrailleuse)[^,;.\]]*/i);
    if (!m) return [];
    const key = /mitrailleuse/i.test(m[1]) ? "mitrailleuse" : "fusil d'assaut";
    const vd = (this.MOUNTED_WEAPONS[key] || {})[edition] || "";
    return [{ name: m[0].replace(/^avec\s+/i, "").trim(), vd }];
  },

  /* ---- Création de l'entité liée ---- */
  _monitor(stats, edition) {
    // SR5 & SR6 : ⌈Structure/2⌉ + 8 (Riggers, les deux livres)
    return Math.ceil((stats.structure || 0) / 2) + 8;
  },

  spawn(owner, itemStr, edition) {
    const parsed = this.matchItem(itemStr, edition);
    if (!parsed) return [];
    const out = [];
    for (let i = 0; i < parsed.count; i++) {
      const v = {
        id: Utils.uid(),
        type: "vehicle",
        kind: parsed.kind,
        edition,
        name: parsed.count > 1 ? `${parsed.name} #${i + 1}` : parsed.name,
        ownerId: owner.id,
        ownerName: owner.name || owner.archetype || "PNJ",
        srcItem: itemStr,
        stats: { ...parsed.stats },
        weapons: parsed.weapons.map((w) => ({ ...w })),
        rrNotes: parsed.rrNotes,
        notes: "",
        deployed: true,
      };
      if (App.getEditionModule(edition).conditionMonitor.vehicleFields === "thresholds") {
        v.legerFilled = 0;
        v.graveFilled = 0;
        v.incapFilled = 0;
      } else {
        v.monTotal = this._monitor(parsed.stats, edition);
        v.monFilled = 0;
      }
      out.push(v);
    }
    return out;
  },

  /** Entités liées à un item source précis d'un propriétaire. */
  linkedTo(ownerId, srcItem) {
    const pools = [Gen.pool || [], Shadows.data ? Shadows.data.all : []];
    const out = [];
    for (const pool of pools) {
      for (const e of pool) {
        if (e.type === "vehicle" && e.ownerId === ownerId &&
            (srcItem == null || e.srcItem === srcItem)) {
          out.push(e);
        }
      }
    }
    return out;
  },

  /* ---- Réserves de dés affichées sur la fiche ----
     Autosoft par défaut = indice d'Autopilote (simplification MJ,
     éditable via la modale). */
  pools(v) {
    return App.getEditionModule(v.edition).vehicleModel.pools(v);
  },

  /** Seuils de blessures Anarchy (p.68) : léger / grave / incap. */
  anarchyThresholds(v) {
    const s = v.stats || {};
    const base = (s.structure || 0) + (s.blindage || 0);
    return [base, 2 * (s.structure || 0) + (s.blindage || 0), 3 * (s.structure || 0) + (s.blindage || 0)];
  },

  /** Initiative autonome SR5/SR6 : Autopilote × 2 + 4D6. Neutre `null`
      en Anarchy (pas d'initiative autonome distincte, cf. vehicleModel). */
  initiative(v) {
    const fn = App.getEditionModule(v.edition).vehicleModel.initiative;
    return fn ? fn(v) : null;
  },
};
