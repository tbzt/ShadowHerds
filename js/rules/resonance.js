"use strict";

/* ============================================================
   RESONANCE — persona incarné du technomancien. Miroir de
   js/rules/cyberdeck.js (matrice côté decker) : ce module n'a pas
   de données propres par édition, il délègue tout le régime à
   App.getEditionModule(ed).technoModel (prohibition n°1). Le
   persona vit niché sur le PNJ (`pnj.persona`, comme `pnj.cyberdeck`)
   — pas de 4ᵉ collection Storage (prohibition n°2).

   Différence avec Cyberdeck : un persona n'est pas du matériel choisi
   par le joueur, il se CALCULE depuis les attributs mentaux + Résonance
   (SR5 p.252, SR6 p.191, table « Équivalences des attributs mentaux/
   matriciels » — vérifiée au livre, pas de mémoire) :
     Indice d'appareil = Résonance · Attaque = Charisme ·
     Corruption = Intuition · Traitement de données = Logique ·
     Firewall = Volonté.
   SR6 ajoute un pool de points bonus égal à la Résonance, répartissable
   par le joueur (cap ⌈50% de l'attribut de base⌉, max +4, p.191) — c'est
   le seul choix réel à persister (`pnj.persona.alloc`). SR5 n'a pas ce
   pool. Les deux éditions routent les dommages matriciels du persona
   vers le moniteur ÉTOURDISSANT existant du PNJ (p.252/p.191) : pas de
   moniteur de persona séparé, contrairement au deck.
   ============================================================ */
import { Actor } from "./actor.js";
import { Utils } from "../core/utils.js";

export const Resonance = {
  /** Mêmes clés/badges/labels que Cyberdeck.ATTR_KEYS — un attribut
      matriciel est le même concept, decker ou technomancien. */
  ATTR_KEYS: [
    { key: "attack", badge: "A", label: "Attaque", mental: "CHA" },
    { key: "sleaze", badge: "C", label: "Corruption", mental: "INT" },
    { key: "dataProcessing", badge: "T", label: "Traitement de données", mental: "LOG" },
    { key: "firewall", badge: "F", label: "Firewall", mental: "VOL" },
  ],

  _model(edition) {
    const mod = App.getEditionModule ? App.getEditionModule(edition) : null;
    return (mod && mod.technoModel) || null;
  },

  attrKeys(edition) {
    const m = this._model(edition);
    if (!m || !m.livingPersona) return [];
    return this.ATTR_KEYS;
  },

  label(edition) {
    return (this._model(edition) || {}).label || "Résonance";
  },

  redistributable(edition) {
    return !!(this._model(edition) || {}).redistributable;
  },

  /** Persona vierge — juste la structure de choix (répartition SR6),
      aucun champ de moniteur (dégâts matriciels → moniteur étourdissant
      existant du PNJ, cf. en-tête). */
  blank() {
    return { alloc: {} };
  },

  /** Cap de déplacement de points sur UN attribut (SR6, p.191) : la
      moitié du rang de BASE (mental) de l'attribut, arrondie au
      supérieur, plafonnée à +4. `0` pour une édition sans redistribution
      (SR5 : le persona est un mappage direct, aucun point bonus). */
  reallocCap(edition, baseVal) {
    if (!this.redistributable(edition)) return 0;
    return Math.min(4, Math.ceil(baseVal / 2));
  },

  /** Persona vivant : les 4 attributs matriciels EFFECTIFS du PNJ,
      dérivés de ses attributs mentaux + Résonance (SR6 : + répartition
      choisie de `pnj.persona.alloc`, bornée au cap par attribut). `{}` si
      l'édition n'a pas ce formalisme (Anarchy — cf. technoModel.livingPersona
      = null) ou si le PNJ n'a pas de persona structuré. */
  livingPersona(pnj, edition) {
    const m = this._model(edition);
    if (!m || !m.livingPersona || !pnj || !pnj.persona) return {};
    const res = Actor.attr(pnj, m.resonanceAttr || "RES");
    const alloc = pnj.persona.alloc || {};
    const out = { deviceRating: res };
    for (const a of this.ATTR_KEYS) {
      const base = Actor.attr(pnj, a.mental);
      const cap = this.reallocCap(edition, base);
      const bonus = this.redistributable(edition)
        ? Math.max(-cap, Math.min(cap, alloc[a.key] || 0))
        : 0;
      out[a.key] = base + bonus;
    }
    return out;
  },

  /** Réserve d'une action de Résonance (tissage de forme complexe,
      compilation…) : compétence + Résonance − malus de blessure, mirroir
      exact de `Magic.actionPool` (même malus, mêmes bonus `SkillEffects`),
      seule différence : l'attribut est la Résonance du module d'édition
      (`resonanceAttr`), pas la Magie — un technomancien n'a pas de MAG. */
  actionPool(pnj, skillName, edition) {
    if (!skillName) return 0;
    const m = this._model(edition);
    const sk = (pnj.skills || []).find((s) => s && s.name === skillName);
    const skillVal = sk ? Number(sk.val) || 0 : 0;
    const res = Actor.attr(pnj, (m && m.resonanceAttr) || "RES");
    const malus = Utils.dicePenalty(pnj, edition);
    const foci =
      typeof SkillEffects !== "undefined"
        ? SkillEffects.forSkill(pnj, skillName).reduce((sum, e) => sum + (e.value || 0), 0)
        : 0;
    return Math.max(0, skillVal + res + foci - malus);
  },

  /** Structure `pnj.persona` pour un technomancien qui n'en a pas encore
      (génération). Idempotent — n'écrase jamais un persona existant (le
      joueur peut déjà avoir choisi sa répartition SR6). */
  hydrate(pnj, edition) {
    if (!pnj || pnj.persona) return pnj;
    const m = this._model(edition);
    if (!m || !m.livingPersona || pnj.special !== "Technomancien") return pnj;
    pnj.persona = this.blank();
    return pnj;
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Resonance = Resonance;
