"use strict";

/* ============================================================
   WORLD STATE — la mémoire du monde, DÉRIVÉE (VIS-12, Phase 1).
   ------------------------------------------------------------
   Feuille de couche basse, NEUTRE : elle LIT la vérité déjà persistée
   (les topos rangés dans `gen_runs`, l'arbre `Dossiers`, le catalogue
   de factions) et REND des FAITS. Elle n'écrit rien, n'introduit aucun
   store, ne connaît AUCUN contrôleur. Le générateur ne l'importe pas :
   c'est `RunGen` (couche haute) qui calcule les faits et les passe à
   `ToposCatalog.assemble(facts)` — injection DESCENDANTE, jamais montante.

   Phase 1 = un seul fait : le HEAT DE FACTION (récurrence d'une faction
   comme opposition/mandant dans les runs passés de la portée courante).
   Annotation seule côté générateur (aucun pick biaisé) : informer, jamais
   décider. Phases 2+ (biais, relations, réputation) : cf.
   PLANS/PLAN_WORLDSTATE_MEMOIRE_MONDE.md.
   ============================================================ */
import { Storage } from "../core/storage.js";
import { ToposCatalog } from "./toposcatalog.js";
import { Campaign } from "./campaign.js";

export const WorldState = {
  /** Faits de campagne dérivés pour la portée d'un dossier. La mémoire est
      CAMPAGNE-LARGE : on remonte à la racine de l'arbre auquel `dossierId`
      appartient, puis on prend tout son sous-arbre — générer dans un run voit
      donc la mémoire de tous les runs de sa campagne. `dossierId` falsy (hors
      campagne) → aucun fait. Recalculé à la demande, jamais persisté.
      `repTracks` (P4) = les pistes de réputation de l'édition, passées par RunGen
      (le moteur reste édition-neutre : il somme des clés qu'on lui donne, sans
      savoir ce qu'elles signifient). Anarchy → `[]` → pas de fait réputation. */
  factsFor(dossierId, { repTracks = [] } = {}) {
    if (!dossierId) return { factions: [], contacts: [], reputation: null };
    const scopeSet = new Set(this._campaignScope(dossierId));
    const runs = (Storage.get("gen_runs", []) || []).filter(
      (r) => r && scopeSet.has(r.dossierId),
    );

    // Récurrence de faction : compte les apparitions comme opposition/mandant.
    const byKey = new Map();
    const bump = (key, role) => {
      if (!key || !ToposCatalog.factions[key]) return;
      let f = byKey.get(key);
      if (!f) {
        f = { key, name: ToposCatalog.factions[key].nom, count: 0, asOpposition: 0, asMandant: 0 };
        byKey.set(key, f);
      }
      f.count++;
      if (role === "opposition") f.asOpposition++;
      else f.asMandant++;
    };
    for (const r of runs) {
      bump(r.opposition, "opposition");
      bump(r.mandant, "mandant");
    }

    const factions = [...byKey.values()].sort((a, b) => b.count - a.count);
    return {
      factions,
      contacts: this._contactsIn(scopeSet),
      reputation: this._reputationIn(scopeSet, repTracks),
    };
  },

  /** Ids d'entités CONVOQUÉES par les nœuds de la portée (A4/§5.3). Reste couche
      basse : lit `Dossiers.convokes` + `FactionStore` (core), jamais DossierBar.
      Résout les refs d'entité directes ET le roster des Factions convoquées. */
  _convokedIn(scopeSet) {
    const ids = new Set();
    if (typeof Dossiers === "undefined") return ids;
    for (const nodeId of scopeSet) {
      for (const c of Dossiers.convokesOf(nodeId)) {
        if (!c) continue;
        if (c.ref === "entity") ids.add(c.id);
        else if (c.ref === "faction" && typeof FactionStore !== "undefined") {
          const f = FactionStore.get(c.id);
          if (f && Array.isArray(f.members)) for (const m of f.members) ids.add(m);
        }
      }
    }
    return ids;
  },

  /** Ids des PJ de l'équipe dans la portée : casting convoqué (A4) filtré aux PJ
      + appartenance de groupe héritée (`characters_groups`, transition). Reste
      couche basse (Storage + Dossiers + FactionStore), jamais DossierBar. */
  _teamPjIds(scopeSet) {
    const groups = Storage.get("characters_groups", {}) || {};
    const ids = new Set();
    for (const [key, members] of Object.entries(groups))
      if (scopeSet.has(key) && Array.isArray(members)) for (const id of members) ids.add(id);
    const pjAll = new Set((Storage.get("characters_all", []) || []).map((p) => p.id));
    for (const id of this._convokedIn(scopeSet)) if (pjAll.has(id)) ids.add(id);
    return ids;
  },

  /** Réputation d'ÉQUIPE agrégée (P4) : pour chaque piste `repTracks` donnée,
      somme le ledger `Campaign` des PJ de la portée. `notable` = plus grande
      valeur ABSOLUE (« à quel point on vous connaît », neutre : on ne somme
      jamais deux pistes de sens opposé). `null` si pas de piste (Anarchy) ou
      aucune valeur. */
  _reputationIn(scopeSet, repTracks) {
    if (!Array.isArray(repTracks) || !repTracks.length) return null;
    const pjIds = this._teamPjIds(scopeSet);
    if (!pjIds.size) return null;
    const pjById = new Map((Storage.get("characters_all", []) || []).map((p) => [p.id, p]));
    const tracks = repTracks
      .map((t) => {
        let value = 0;
        for (const id of pjIds) {
          const pj = pjById.get(id);
          if (pj && pj.campaign) value += Campaign.balance(pj.campaign, t.key);
        }
        return { key: t.key, label: t.label, value };
      })
      .filter((t) => t.value !== 0);
    if (!tracks.length) return null;
    const top = tracks.slice().sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
    return { tracks, notable: Math.abs(top.value), top };
  },

  /** Visages récurrents (P5) : les PNJ de la campagne déjà taggés d'une faction
      (`pnj.faction`, posé par le casting) correspondant à `factionKey`, hors du
      groupe `excludeGroupId` (le run courant, pour ne pas re-proposer les frais).
      Lu brut (`shadows_all`+`shadows_groups`) — reste couche basse. */
  recurringFacesFor(dossierId, factionKey, excludeGroupId = null) {
    if (!dossierId || !factionKey) return [];
    const scopeSet = new Set(this._campaignScope(dossierId));
    const shadowsAll = new Set((Storage.get("shadows_all", []) || []).map((p) => p.id));
    const groups = Storage.get("shadows_groups", {}) || {};
    const inCampaign = new Set();
    for (const [k, members] of Object.entries(groups))
      if (scopeSet.has(k) && Array.isArray(members)) for (const id of members) inCampaign.add(id);
    // A4 — les visages convoqués (par ref/Faction) comptent aussi comme « dans
    // la campagne » ; le run frais (`excludeGroupId`) est écarté par ses deux
    // canaux (groupe hérité + convocations), pour ne pas re-proposer les frais.
    for (const id of this._convokedIn(scopeSet)) if (shadowsAll.has(id)) inCampaign.add(id);
    const excluded = new Set(excludeGroupId ? groups[excludeGroupId] || [] : []);
    if (excludeGroupId)
      for (const id of this._convokedIn(new Set([excludeGroupId]))) excluded.add(id);
    return (Storage.get("shadows_all", []) || [])
      .filter(
        (p) => p && p.faction === factionKey && inCampaign.has(p.id) && !excluded.has(p.id),
      )
      .map((p) => ({ id: p.id, name: p.name || "un adversaire" }));
  },

  /** Sous-arbre de la RACINE de campagne à laquelle appartient `dossierId`
      (remontée `parentId` jusqu'au sommet, puis descendants). */
  _campaignScope(dossierId) {
    if (typeof Dossiers === "undefined") return [dossierId];
    let node = Dossiers.get(dossierId);
    for (let i = 0; node && node.parentId && i < 50; i++) node = Dossiers.get(node.parentId);
    const rootId = node ? node.id : dossierId;
    return [...Dossiers.descendantIds(rootId)];
  },

  /** Contacts connus de l'ÉQUIPE dans la portée : les PJ rangés dans le
      sous-arbre (lu brut `characters_groups`, comme `gen_runs` — pas de
      remontée vers DossierBar) → leurs liens contact (`RelationsStore`, core),
      dédupliqués par contact (meilleure loyauté retenue), triés par loyauté.
      Reste couche basse : Storage + RelationsStore, jamais un widget. */
  _contactsIn(scopeSet) {
    const RS = typeof RelationsStore !== "undefined" ? RelationsStore : null;
    if (!RS) return [];
    const pjIds = this._teamPjIds(scopeSet);
    const nameById = new Map((Storage.get("contacts_all", []) || []).map((c) => [c.id, c.name]));

    // Stance de campagne (P3c) : arêtes favor/burned posées au débrief, scopées
    // à la campagne (`from` ∈ portée). Un contact grillé/redevable, dérivé.
    const stanceByContact = new Map();
    for (const type of ["favor", "burned"])
      for (const e of RS.edgesWhere({ type }))
        if (scopeSet.has(e.from)) stanceByContact.set(e.to, type);

    const byContact = new Map();
    for (const pjId of pjIds) {
      for (const l of RS.contactLinksOf(pjId)) {
        const ex = byContact.get(l.contactId);
        if (ex) {
          if ((l.loyalty ?? 0) > (ex.loyalty ?? 0)) {
            ex.loyalty = l.loyalty ?? null;
            if (l.relation) ex.relation = l.relation;
          }
          continue;
        }
        byContact.set(l.contactId, {
          id: l.contactId,
          name: nameById.get(l.contactId) || "un contact",
          relation: l.relation || "",
          loyalty: l.loyalty ?? null,
          stance: stanceByContact.get(l.contactId) || null,
        });
      }
    }
    return [...byContact.values()].sort((a, b) => (b.loyalty ?? 0) - (a.loyalty ?? 0));
  },
};

// Pont couche 2 (voir PLANS/PLAN_MODULES_ES.md).
window.WorldState = WorldState;
