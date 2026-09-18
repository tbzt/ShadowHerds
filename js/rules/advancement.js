"use strict";

/* ============================================================
   ADVANCEMENT — les progressions possibles d'un PJ, en lignes
   ------------------------------------------------------------
   Module feuille : AUCUN DOM, AUCUN Storage, aucune règle d'édition.
   Chaque module de création compose ses lignes avec ces briques et
   fournit LUI le barème (coût, plafond, monnaie) relevé dans son livre :
   SR5 Livre de Règles p.103-107, SR6 p.70-72, Anarchy 1 p.77-79,
   Anarchy 2 p.83-84 (en nuyens, pas en karma).

   Contrat d'une ligne : { id, group, label, cost, prompt?, catalog?, apply(pnj, value) }
   — `prompt` (un libellé) demande un texte avant d'appliquer (nom d'une
   spécialisation, d'une connaissance, d'un Atout) ; `catalog` (des groupes
   `{ category, items: [{ id, label, detail?, cost? }] }`) offre un choix
   dans une liste — sorts, formes complexes, traits — et `apply` reçoit l'id
   de l'entrée, dont `cost` prime sur celui de la ligne. `apply` MUTE la
   fiche et ne persiste rien ; le contrôleur recalcule, débite le registre
   de campagne et sauve.
   ============================================================ */
import { Actor } from "./actor.js";
import { Esoteric } from "./esoteric.js";
import { Utils } from "../core/utils.js";

export const Advancement = {
  /** Un attribut de plus, tant que le maximum du métatype le permet.
      `cost(nouvelIndice, dernierPoint)` ; `max(key)` le plafond. */
  attrRows(pnj, keys, { max, cost }) {
    const out = [];
    for (const key of keys) {
      const cur = Actor.base(pnj, key);
      const mx = max(key);
      if (!Number.isFinite(mx) || cur >= mx) continue;
      const next = cur + 1;
      out.push({
        id: `attr:${key}`,
        group: "Attributs",
        label: `${Utils.attrFullName(key)} ${cur} → ${next}`,
        cost: cost(next, next === mx),
        apply: (p) => Actor.setBase(p, key, next),
      });
    }
    return out;
  },

  /** Une compétence possédée, un indice de plus. */
  skillRows(pnj, { max, cost }) {
    const out = [];
    (pnj.skills || []).forEach((s, i) => {
      const val = Number(s.val) || 0;
      if (val >= max) return;
      const next = val + 1;
      out.push({
        id: `skill:${i}`,
        group: "Compétences",
        label: `${s.name} ${val} → ${next}`,
        cost: cost(next),
        apply: (p) => {
          const sk = p.skills[i];
          sk.val = next;
          if (sk.spec) sk.specVal = next + 2;
          for (const x of sk.extraSpecs || []) x.val = next + 2;
        },
      });
    });
    return out;
  },

  /** Une compétence nouvelle, à l'indice 1, parmi celles du catalogue que
      la fiche n'a pas. `catalog` : [{ name, attr }]. */
  newSkillRows(pnj, catalog, { cost, group = "Nouvelle compétence" }) {
    const prises = new Set((pnj.skills || []).map((s) => s.name));
    return catalog
      .filter((c) => c && c.name && !prises.has(c.name))
      .map((c) => ({
        id: `newskill:${c.name}`,
        group,
        label: `${c.name} (indice 1)`,
        cost,
        apply: (p) => {
          p.skills = p.skills || [];
          p.skills.push({ name: c.name, val: 1, ...(c.attr ? { attr: c.attr } : {}) });
        },
      }));
  },

  /** Une spécialisation sur une compétence qui n'en a pas encore. */
  specRows(pnj, { cost, minRank = 1 }) {
    const out = [];
    (pnj.skills || []).forEach((s, i) => {
      if (s.spec || (Number(s.val) || 0) < minRank) return;
      out.push({
        id: `spec:${i}`,
        group: "Spécialisations",
        label: `Spécialisation de ${s.name}`,
        cost,
        prompt: "Spécialisation",
        apply: (p, v) => {
          const sk = p.skills[i];
          sk.spec = v;
          sk.specVal = (Number(sk.val) || 0) + 2;
          if (sk.attr) sk.specAttr = sk.attr;
        },
      });
    });
    return out;
  },

  /** Connaissances : une nouvelle (prompt), et si l'édition les note
      (`rated`), un indice de plus sur celles qu'on a. */
  knowledgeRows(pnj, { rated, costNew, costUp, max = 12 }) {
    const out = [
      {
        id: "know:new",
        group: "Connaissances",
        label: rated ? "Nouvelle connaissance (indice 1)" : "Nouvelle connaissance",
        cost: costNew,
        prompt: "Connaissance",
        apply: (p, v) => {
          p.knowledges = p.knowledges || [];
          p.knowledges.push(rated ? { name: v, val: 1 } : v);
        },
      },
    ];
    if (rated) {
      (pnj.knowledges || []).forEach((k, i) => {
        if (!k || typeof k !== "object") return;
        const val = Number(k.val) || 0;
        if (val >= max) return;
        out.push({
          id: `know:${i}`,
          group: "Connaissances",
          label: `${k.name} ${val} → ${val + 1}`,
          cost: costUp(val + 1),
          apply: (p) => {
            p.knowledges[i].val = val + 1;
          },
        });
      });
    }
    return out;
  },

  /** Le grade d'initiation ou de submersion suivant, si la fiche a une voie
      et que l'édition en donne le coût (`Esoteric.cost`). */
  initiationRows(pnj, edition) {
    const voie = Esoteric.voieOf(pnj);
    if (!voie) return [];
    const next = Esoteric.grade(pnj) + 1;
    const cost = Esoteric.cost(edition, voie, next);
    if (cost == null) return [];
    return [{
      id: "init:next",
      group: Esoteric.label(voie),
      label: `Grade ${next}`,
      cost,
      apply: (p) => {
        p.esoteric = p.esoteric || { voie, acquis: [] };
        p.esoteric.grade = next;
      },
    }];
  },

  /** Atouts (Anarchy) : un nouveau au niveau 1, ou un des siens au niveau
      suivant — les Atouts d'une fiche sont des textes, le niveau atteint
      s'écrit dans le texte. `costNew`, `costLevel(niveau)`. */
  edgeRows(pnj, { costNew, costLevel, maxLevel = 6 }) {
    const out = [{
      id: "edge:new",
      group: "Atouts",
      label: "Nouvel Atout (niveau 1)",
      cost: costNew,
      prompt: "Atout",
      apply: (p, v) => {
        p.edges = p.edges || [];
        p.edges.push(v);
      },
    }];
    (pnj.edges || []).forEach((e, i) => {
      const txt = typeof e === "string" ? e : (e && e.text) || "";
      if (!txt) return;
      const m = txt.match(/\(niv\.?\s*(\d+)\)\s*$/i);
      const cur = m ? Number(m[1]) : 1;
      if (cur >= maxLevel) return;
      const next = cur + 1;
      out.push({
        id: `edge:${i}`,
        group: "Atouts",
        label: `${txt.replace(/\s*\(niv\.?\s*\d+\)\s*$/i, "")} → niveau ${next}`,
        cost: costLevel(next),
        apply: (p) => {
          const base = txt.replace(/\s*\(niv\.?\s*\d+\)\s*$/i, "");
          const nv = `${base} (niv. ${next})`;
          if (typeof p.edges[i] === "string") p.edges[i] = nv;
          else p.edges[i].text = nv;
        },
      });
    });
    return out;
  },

  /** Une ligne libre : un nom demandé, une action. */
  promptRow(id, group, label, cost, prompt, apply) {
    return { id, group, label, cost, prompt, apply };
  },

  /** Le nom d'une entrée de fiche qui peut être une chaîne ou un objet. */
  _nameOf(x) {
    return String((x && typeof x === "object" ? x.name : x) || "").trim();
  },

  /** Une ligne à catalogue : les entrées déjà sur la fiche (par nom) sont
      retirées, chaque entrée porte le coût de la ligne sauf le sien. */
  catalogRow(id, group, label, cost, groups, owned, apply) {
    const pris = new Set((owned || []).map((x) => this._nameOf(x)));
    const catalog = (groups || [])
      .map((g) => ({ ...g, items: (g.items || []).filter((it) => !pris.has(it.label)).map((it) => ({ ...it, cost: it.cost ?? cost })) }))
      .filter((g) => g.items.length);
    if (!catalog.length) return null;
    // Le coût de la ligne : celui donné, sinon le moins cher du catalogue —
    // un contrat lisible d'un coup, jamais un zéro qui mentirait.
    const min = Math.min(...catalog.flatMap((g) => g.items.map((it) => it.cost)));
    return { id, group, label, cost: cost || min, catalog, apply };
  },

  /** Un nouveau sort, au catalogue de l'édition (`spellCatalog()`), posé
      par `addSpellItem(pnj, id)`. */
  spellRow(pnj, { catalog, add, cost }) {
    return this.catalogRow("spell:new", "Sorts", "Nouveau sort", cost, catalog, pnj.spells, (p, id) => add(p, id));
  },

  /** Une nouvelle forme complexe (technomancien). */
  complexFormRow(pnj, { catalog, add, cost }) {
    return this.catalogRow("cform:new", "Formes complexes", "Nouvelle forme complexe", cost, catalog, pnj.complexForms, (p, id) => add(p, id));
  },

  /** Traits en campagne. `costNew(ref)` : le prix d'un trait positif pris
      en jeu (null : pas proposé) ; `costRemove(ref)` : le prix pour retirer
      un défaut que la fiche porte (null : pas proposé). `catalog` : les
      groupes de `traitCatalog()` ; `byId` : `traitById`. Le trait est écrit
      sur la fiche comme à la création : « Nom (karma) » quand il en a un. */
  traitRows(pnj, { catalog, byId, costNew, costRemove, karmaOf = () => null, label = "Nouveau trait positif" }) {
    const out = [];
    const nomDe = (t) => this._nameOf(t).replace(/\s*\([^()]*\)\s*$/, "");
    const owned = (pnj.traits || []).map(nomDe);
    if (costNew) {
      const positifs = (catalog || [])
        .map((g) => ({
          ...g,
          items: g.items
            .map((it) => ({ it, ref: byId(it.id) }))
            .filter(({ ref }) => ref && ref.type === "avantage" && !ref.infecte && costNew(ref) != null)
            .map(({ it, ref }) => ({ ...it, cost: costNew(ref) })),
        }))
        .filter((g) => g.items.length);
      const nouveau = this.catalogRow("trait:new", "Traits", label, 0, positifs, owned, (p, id) => {
        const ref = byId(id);
        if (!ref) return;
        p.traits = p.traits || [];
        const k = karmaOf(ref);
        p.traits.push(k != null ? `${ref.nom} (${k})` : ref.nom);
      });
      if (nouveau) out.push(nouveau);
    }
    if (costRemove) {
      (pnj.traits || []).forEach((t, i) => {
        const nom = nomDe(t);
        const ref = (catalog || []).flatMap((g) => g.items).map((it) => byId(it.id)).find((r) => r && r.nom === nom);
        if (!ref || ref.type !== "defaut") return;
        const cost = costRemove(ref);
        if (cost == null) return;
        out.push({
          id: `trait:remove:${i}`,
          group: "Traits",
          label: `Retirer ${nom}`,
          cost,
          apply: (p) => {
            p.traits.splice(i, 1);
          },
        });
      });
    }
    return out;
  },

  /** Pouvoirs d'adepte : le catalogue de l'édition, SANS coût en karma —
      ils se paient en points de pouvoir, que l'application ne chiffre pas
      par pouvoir (le catalogue ne les porte pas). La ligne le dit et
      laisse le meneur juger ; `ppTotal` : les points, autant que la Magie. */
  adeptPowerRow(pnj, { catalog, add, ppTotal }) {
    const groups = [{ category: "Pouvoirs d'adepte", items: (catalog || []).map((it) => ({ ...it, cost: 0 })) }];
    const row = this.catalogRow("power:new", "Pouvoirs d'adepte", "Nouveau pouvoir", 0, groups, pnj.powers, (p, id) => add(p, id));
    if (!row) return null;
    row.cost = 0;
    row.note = `${ppTotal} point${ppTotal > 1 ? "s" : ""} de pouvoir (autant que la Magie), ${(pnj.powers || []).length} pouvoir${(pnj.powers || []).length > 1 ? "s" : ""} déjà pris — le catalogue ne porte pas le coût de chacun, c'est au meneur de juger.`;
    return row;
  },

  /** Personnaliser une arme (Anarchy 1 p.79) : un effet, une fois par
      arme, écrit dans son nom — « Predator [Précision] ». */
  weaponEffectRows(pnj, { effects, cost }) {
    const out = [];
    (pnj.weapons || []).forEach((w, i) => {
      const nom = String((w && w.name) || "");
      if (!nom) return;
      for (const [eff, desc] of effects) {
        if (new RegExp(`\\[[^\\]]*\\b${eff}\\b`).test(nom)) continue;
        out.push({
          id: `weaponfx:${i}:${eff}`,
          group: "Armes et équipement",
          label: `${nom.replace(/\s*\[[^\]]*\]\s*$/, "")} — ${eff} (${desc})`,
          cost,
          apply: (p) => {
            const arme = p.weapons[i];
            const m = String(arme.name).match(/^(.*?)\s*\[([^\]]*)\]\s*$/);
            const base = m ? m[1] : arme.name;
            const effets = m ? m[2].split(",").map((x) => x.trim()).filter(Boolean) : [];
            effets.push(eff);
            arme.name = `${base} [${effets.join(", ")}]`;
          },
        });
      }
    });
    return out;
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Advancement = Advancement;
