"use strict";

/* ============================================================
   SCENARIO VALIDATORS — la robustesse d'une trame (lot S4b).
   ------------------------------------------------------------
   Feuille de LECTURE PURE (aucune écriture, aucune dépendance sortante) :
   reçoit un `Scenario` détenu par ScenarioStore et renvoie une liste
   d'alertes. C'est la théorie de la conception par nœuds rendue vérifiable :
   Alexander (règle des 3 indices, sortie de secours, pas de cul-de-sac) et
   GUMSHOE (une info de progression ne se gâte jamais derrière un seul jet).

   validate(scenario) → [{ level:"error"|"warn", code, message, targetId? }]
   `targetId` = l'id du fait ou de la scène visé (la vue l'illumine au clic).

   Édition-NEUTRE : une enquête robuste l'est dans les 4 livres — aucune
   branche. Le 6ᵉ validateur du plan (cohérence clocks/fronts) arrive avec S5,
   pas écrit d'avance (Kernel). Cf. PLANS/architecture-graphe-scenaristique.md § S4.
   ============================================================ */

const _short = (t) => {
  const s = String(t || "").trim() || "(sans titre)";
  return s.length > 28 ? s.slice(0, 27) + "…" : s;
};

export const ScenarioValidators = {
  /** `opts.factionIds` : Set des factions existantes (fourni par la vue, qui a
      accès à FactionStore) → permet le contrôle d'existence sans dépendre du
      store (la feuille reste pure). Absent = contrôle de faction ignoré. */
  validate(sc, { factionIds = null } = {}) {
    if (!sc) return [];
    const out = [];
    const infoNodes = sc.infoNodes || [];
    const clues = sc.clues || [];
    const sceneNodes = sc.sceneNodes || [];
    const sceneEdges = sc.sceneEdges || [];
    const cluesFor = (fid) => clues.filter((c) => c && c.toInfoNode === fid);

    // 1. Progression garantie (GUMSHOE) — une info de progression a ≥1 indice à
    //    révélation garantie (jamais UNIQUEMENT derrière un jet/condition).
    for (const f of infoNodes) {
      if (f.role !== "progression") continue;
      const cs = cluesFor(f.id);
      if (!cs.length)
        out.push({ level: "error", code: "progression-noclue", targetId: f.id, message: `Le fait de progression « ${_short(f.fact)} » n'a aucun indice : le fil peut se bloquer.` });
      else if (!cs.some((c) => !c.gated))
        out.push({ level: "error", code: "progression-gated", targetId: f.id, message: `Le fait de progression « ${_short(f.fact)} » n'a que des indices derrière un jet : prévoyez une voie garantie.` });
    }

    // 2. Règle des 3 indices (Alexander) — un fait d'enrichissement a ≥3 pistes.
    for (const f of infoNodes) {
      if (f.role !== "enrichissement") continue;
      const n = cluesFor(f.id).length;
      if (n < 3)
        out.push({ level: "warn", code: "three-clues", targetId: f.id, message: `Le fait « ${_short(f.fact)} » n'a que ${n} piste${n > 1 ? "s" : ""} (règle des 3 indices).` });
    }

    // 3. Diversité d'ancrage — les pistes d'un fait ne reposent pas toutes sur UNE
    //    seule scène (un indice flottant compte comme diversité).
    for (const f of infoNodes) {
      const cs = cluesFor(f.id);
      if (cs.length < 2) continue;
      const anchors = new Set();
      let floating = false;
      for (const c of cs) {
        const a = c.anchorSceneNodes || [];
        if (!a.length) floating = true;
        else a.forEach((s) => anchors.add(s));
      }
      if (!floating && anchors.size === 1)
        out.push({ level: "warn", code: "single-anchor", targetId: f.id, message: `Toutes les pistes du fait « ${_short(f.fact)} » passent par une seule scène.` });
    }

    // 4. Sortie de secours (Alexander) — une scène d'action a ≥1 arête sortante
    //    « sortie de secours » (le run ne cale pas sur un échec).
    for (const s of sceneNodes) {
      if (s.type !== "action") continue;
      if (!sceneEdges.some((e) => e && e.from === s.id && e.isEscapeHatch))
        out.push({ level: "warn", code: "no-escape", targetId: s.id, message: `La scène d'action « ${_short(s.title)} » n'a pas de sortie de secours.` });
    }

    // 5. Atteignabilité — tout nœud atteignable depuis une accroche (BFS) ; pas de
    //    cul-de-sac involontaire. Sans accroche, on le signale d'abord.
    if (sceneNodes.length) {
      const accroches = sceneNodes.filter((s) => s.type === "accroche").map((s) => s.id);
      if (!accroches.length && sceneNodes.length >= 2) {
        out.push({ level: "warn", code: "no-accroche", message: "Aucune accroche : la trame n'a pas de point d'entrée." });
      } else if (accroches.length) {
        const adj = new Map(sceneNodes.map((s) => [s.id, []]));
        for (const e of sceneEdges) if (adj.has(e.from)) adj.get(e.from).push(e.to);
        const seen = new Set(accroches);
        const q = [...accroches];
        while (q.length) {
          const cur = q.shift();
          for (const nx of adj.get(cur) || []) if (!seen.has(nx)) { seen.add(nx); q.push(nx); }
        }
        for (const s of sceneNodes)
          if (!seen.has(s.id))
            out.push({ level: "warn", code: "unreachable", targetId: s.id, message: `La scène « ${_short(s.title)} » n'est atteignable depuis aucune accroche.` });
      }
    }

    // 6. Cohérence horloges / fronts (S5c) — les cibles d'effet et les factions
    //    référencées existent. Un effet d'horloge sans cible ne fait rien.
    const nodeIds = new Set(sceneNodes.map((n) => n.id));
    const edgeIds = new Set(sceneEdges.map((e) => e.id));
    for (const c of sc.clocks || []) {
      for (const eff of c.effects || []) {
        if (!eff.targetId) { out.push({ level: "warn", code: "clock-notarget", targetId: null, message: `L'horloge « ${_short(c.title)} » a un effet sans cible : il ne se passera rien.` }); continue; }
        const ok = eff.action === "activateNode" ? nodeIds.has(eff.targetId) : edgeIds.has(eff.targetId);
        if (!ok) out.push({ level: "warn", code: "clock-badtarget", targetId: null, message: `Un effet de l'horloge « ${_short(c.title)} » vise une cible qui n'existe plus.` });
      }
    }
    for (const f of sc.fronts || []) {
      if (f.factionId && factionIds && !factionIds.has(f.factionId))
        out.push({ level: "warn", code: "front-badfaction", targetId: null, message: `Le front « ${_short(f.title)} » est lié à une faction supprimée.` });
    }

    return out;
  },
};
