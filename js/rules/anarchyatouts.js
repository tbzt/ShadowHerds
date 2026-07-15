"use strict";

/* ============================================================
   ANARCHY ATOUTS — collecteur render-time des effets chiffrables
   des atouts d'ÉQUIPEMENT (cyber/bio/gear ajoutés au catalogue),
   que le bake de génération (BonusEngine._applyAnarchy) ne voit
   pas : il ne scanne que pnj.edges/chosenEdges, jamais equip/augs.

   Principe : OVERLAY (jamais baké dans pnj.attrs/skills). Recalculé
   à chaque rendu → l'ajout catalogue et l'édition marchent sans
   re-motorisation, et pas de double-comptage si recalc finit par
   tourner. Neutre par édition (gating usesRiskPanel côté appelant),
   aucune branche App.edition. Réutilise BonusEngine.parseAnarchyRR
   (source unique du parsing RR, partagée avec le bake d'edges).

   Les DROGUES (atouts d'équipement temporaires, p.159-160) ne
   contribuent que lorsqu'elles sont ACTIVES (Drugs.state === effect) :
   le toggle de scène existant gate leur inclusion, pas de mutation.
   ============================================================ */
const AnarchyAtouts = {
  /** Nom d'attribut FR (au singulier, tel qu'écrit dans les atouts VF)
      → clé d'attribut. Sert à distinguer un « RR aux tests de Force »
      (attribut, touche tous les tests liés à FOR) d'un « RR aux tests
      de Furtivité » (compétence). parseAnarchyRR ne mappe que des
      compétences ; sans cette table, le RR d'attribut était perdu. */
  _ATTR_NAMES: {
    force: "FOR",
    agilité: "AGI",
    agilite: "AGI",
    volonté: "VOL",
    volonte: "VOL",
    logique: "LOG",
    charisme: "CHA",
  },

  /** Isole la clause « RR N aux tests de … » d'un libellé catalogue et
      normalise deux tournures avant de déléguer à parseAnarchyRR (qu'on
      ne modifie pas — partagé avec le bake). Corrige deux trous réels
      trouvés contre GEAR_CATALOG :
      - la clause peut être suivie d'une virgule (autre effet) ou d'un
        crochet fermant que le parser ne coupe pas (« … Furtivité] »,
        « … Logique, blessure grave après dissipation] ») ;
      - la tournure « aux tests liés à la X » (cyberware) que le regex
        du parser (exige d[e’']) ne matche pas.
      Renvoie une chaîne « … RR N aux tests de … » propre, ou null. */
  _rrClause(text) {
    const s = String(text || "");
    // Repère le début de la clause RR, quelle que soit la tournure.
    const start = s.search(/RR\s*\d+\s+aux tests (?:d[e’']|li[ée]s?\s+à)/i);
    if (start < 0) return null;
    // Coupe à la première frontière de clause : ponctuation ou crochet.
    let clause = s.slice(start).split(/[,.;\]]/)[0];
    // Normalise « aux tests liés à (la|l') X » → « aux tests de X ».
    clause = clause.replace(
      /aux tests li[ée]s?\s+à\s+(?:la\s+|l[’']|l\s+)?/i,
      "aux tests de ",
    );
    return clause;
  },

  /** Sources non bakées : équipement + augmentations. Jamais edges/
      chosenEdges (déjà appliqués par _applyAnarchy à la génération). */
  _sources(pnj) {
    return [].concat(pnj.equip || [], pnj.augs || []);
  },

  /** true si l'item est une drogue INACTIVE (idle/contrecoup) : ses
      effets d'atout (RR/VD…) ne s'appliquent que pendant l'« effet ».
      Un item non-drogue (atout permanent) contribue toujours. */
  _isInactiveDrug(pnj, item) {
    if (typeof Drugs === "undefined") return false;
    // matchItem lit le drugModel de l'édition : ne l'appeler que si le module
    // est chargé (le rendu d'une carte anarchy2 le garantit ; garde-fou pour
    // les appels isolés / éditions sans drogues).
    if (!App.getEditionModule(pnj.edition)?.drugModel) return false;
    const drug = Drugs.matchItem(item, pnj.edition, "equip");
    if (!drug) return false;
    return Drugs.state(pnj, drug.id) !== "effect";
  },

  collect(pnj) {
    const out = {
      attrRR: {},
      skillRR: {},
      specRR: {},
      armor: 0,
      legerBonus: 0,
      graveBonus: 0,
    };
    if (!pnj) return out;

    for (const item of this._sources(pnj)) {
      const raw = ItemResolver.itemStr(item); // chaîne OU objet
      if (!raw) continue;
      // Drogue non active → aucun effet (effet de scène, pas permanent).
      if (this._isInactiveDrug(pnj, item)) continue;

      // ---- RR (compétence / spé / attribut) ----
      const clause = this._rrClause(raw);
      if (clause) {
        const parsed = BonusEngine.parseAnarchyRR(clause);
        if (parsed) {
          for (const { name, subspec } of parsed.skills) {
            const key = name.trim().toLowerCase();
            const attrKey = this._ATTR_NAMES[key];
            if (attrKey) {
              out.attrRR[attrKey] = (out.attrRR[attrKey] || 0) + parsed.rr;
            } else if (subspec) {
              const sk = `${key}:${subspec.trim().toLowerCase()}`;
              out.specRR[sk] = (out.specRR[sk] || 0) + parsed.rr;
            } else {
              out.skillRR[key] = (out.skillRR[key] || 0) + parsed.rr;
            }
          }
        }
      }

      // ---- Armure fixe « [ … Armure +N … ] » ----
      // Distincte du format « X optionnel (Armure +N) » (parenthèses,
      // item cliquable) déjà géré par ItemResolver.armorOptionBonus.
      if (!/optionnel/i.test(raw)) {
        const am = raw.match(/\[[^\]]*Armure\s*\+(\d+)[^\]]*\]/i);
        if (am) out.armor += parseInt(am[1], 10);
      }

      // ---- Cases de blessure supplémentaires (p.61, max +1 chacune) ----
      // Exige le « +1 » : « blessure grave après dissipation » (contrecoup
      // narratif) n'est PAS un +1 de case → pas de faux positif.
      if (/\+\s*1\s+(?:case\s+de\s+)?blessure\s+l[ée]g[èe]re/i.test(raw))
        out.legerBonus += 1;
      if (/\+\s*1\s+(?:case\s+de\s+)?blessure\s+grave/i.test(raw))
        out.graveBonus += 1;
    }

    return out;
  },

  /** RR effective d'une compétence : RR baké (edges) + RR d'équipement
      (nom de compétence) + RR d'attribut lié (un « RR aux tests de
      Force » touche tous les tests utilisant FOR). Borné à 3 (p.71). */
  skillRR(atouts, skill) {
    if (!atouts) return skill.rr || 0;
    const named = this._matchByName(atouts.skillRR, skill.name);
    const attr = atouts.attrRR[skill.attr] || 0;
    return Utils.clamp((skill.rr || 0) + named + attr, 0, 3);
  },

  /** RR effective d'une spécialisation : RR baké de spé + RR d'équipement
      ciblant cette sous-spé + RR d'attribut lié. Borné à 3. */
  specRR(atouts, skill, specName, specAttrKey, bakedSpecRr) {
    const base = bakedSpecRr || 0;
    if (!atouts) return base;
    const key = `${skill.name.toLowerCase()}:${(specName || "").toLowerCase()}`;
    const named = this._matchSpec(atouts.specRR, key);
    const attr = atouts.attrRR[specAttrKey || skill.attr] || 0;
    return Utils.clamp(base + named + attr, 0, 3);
  },

  /** Somme des RR d'équipement dont le nom correspond (inclusion tolérante,
      même logique que BonusEngine._findAnarchySkill). */
  _matchByName(map, skillName) {
    const target = (skillName || "").toLowerCase();
    let sum = 0;
    for (const [name, rr] of Object.entries(map)) {
      if (name === target || name.includes(target) || target.includes(name))
        sum += rr;
    }
    return sum;
  },

  /** Somme des RR de spé dont « compétence:sous-spé » correspond
      (inclusion tolérante sur le nom de compétence ET la sous-spé). */
  _matchSpec(map, targetKey) {
    const [tSkill, tSpec] = targetKey.split(":");
    let sum = 0;
    for (const [k, rr] of Object.entries(map)) {
      const [kSkill, kSpec] = k.split(":");
      const skillOk =
        kSkill === tSkill || kSkill.includes(tSkill) || tSkill.includes(kSkill);
      const specOk =
        kSpec === tSpec || (tSpec && tSpec.includes(kSpec));
      if (skillOk && specOk) sum += rr;
    }
    return sum;
  },
};
