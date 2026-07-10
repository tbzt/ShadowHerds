"use strict";

/* ============================================================
   DROGUES — effet / contrecoup automatiques déclenchés depuis
   l'équipement d'un PNJ (SR5/SR6) ou ses atouts (Anarchy 2.0,
   où les drogues sont vendues comme « atouts d'équipement »,
   cf. Anarchy 2.0 p.150).

   Un seul tag cliquable par drogue détectée, cycle à 3 clics :
     idle → effet → contrecoup → idle (OK)
   Chaque clic annule proprement la phase précédente avant
   d'appliquer la suivante — jamais cumulatif.
   ============================================================ */
/** Fabrique d'entrée de drogue Anarchy standard : effet textuel, contrecoup
    « Désavantage global » motorisé via pnj.drugAdv (consommé par les jets). */
function Drug_anarchy(id, match, label, effectText, crashText) {
  return {
    id,
    match,
    source: "edges",
    label,
    effect: { text: effectText },
    sideEffect: {
      text: crashText,
      apply(pnj) {
        pnj.drugAdv = -1;
      },
      revert(pnj) {
        delete pnj.drugAdv;
      },
    },
  };
}

const Drugs = {
  CATALOG: {
    // Aucune drogue dans les pools d'équipement SR5 actuels — le
    // mécanisme est prêt, prêt à être alimenté dès qu'une entrée
    // apparaît dans equipPools.equipSpecial (js/editions/sr5.js).
    sr5: [],

    sr6: [
      {
        id: "jazz",
        match: /Inhalateur de Jazz/i,
        source: "equip",
        label: "Jazz",
        effect: {
          text: "Réaction +1, dés d'initiative +2D6 (durée 10×1D6 min)",
          recalc: true,
          apply(pnj) {
            pnj.attrs.RÉA = (pnj.attrs.RÉA || 0) + 1;
            // +2D6 borné au plafond de l'édition (max 5D6) : on mémorise le
            // delta réellement appliqué pour que revert() reste symétrique
            // même quand le PNJ était déjà proche/au plafond.
            const max = (App.getEditionModule(pnj.edition) || {}).maxInitDice || 5;
            const before = pnj.initDice || 0;
            const after = Math.min(before + 2, max);
            pnj._jazzInitDelta = after - before;
            pnj.initDice = after;
          },
          revert(pnj) {
            pnj.attrs.RÉA = (pnj.attrs.RÉA || 0) - 1;
            pnj.initDice = (pnj.initDice || 0) - (pnj._jazzInitDelta ?? 2);
            delete pnj._jazzInitDelta;
          },
        },
        sideEffect: {
          text: "Désorienté : Initiative −4, ne peut ni gagner ni dépenser d'Atout (même durée que l'effet)",
          apply(pnj) {
            pnj.initBase = (pnj.initBase || 0) - 4;
          },
          revert(pnj) {
            pnj.initBase = (pnj.initBase || 0) + 4;
          },
        },
      },
    ],

    // Anarchy 2.0 : les drogues sont des atouts d'équipement (p.150). Le
    // catalogue reconnaît « Nom (drogue) » dans les atouts (edgeOptions
    // des statblocks) ET dans l'équipement (ajout manuel via l'édition) —
    // matchItem() ignore la source pour cette édition. Le contrecoup
    // standard applique le Désavantage global (pnj.drugAdv, p.67).
    get anarchy1() { return this.anarchy2; }, // placeholder V1 → V2 (Phase 3)
    anarchy2: [
      {
        id: "jazz",
        match: /^Jazz\s*\(drogue\)/i,
        source: "edges",
        label: "Jazz",
        effect: {
          text: "+1 point d'Anarchy par scène d'action, +1 action par narration, pas de limite au nombre d'actions supplémentaires par tour",
        },
        sideEffect: {
          text: "Désavantage à tous les tests pendant la scène suivante",
          apply(pnj) {
            pnj.drugAdv = -1;
          },
          revert(pnj) {
            delete pnj.drugAdv;
          },
        },
      },
      Drug_anarchy("bliss", /^Bliss\s*\(drogue\)/i, "Bliss",
        "Antidouleur : ignore les effets de sa première blessure légère pendant la scène",
        "Désavantage à tous les tests pendant la scène suivante (léthargie)"),
      Drug_anarchy("cram", /^Cram\s*\(drogue\)/i, "Cram",
        "+1 action par narration pendant la scène",
        "Désavantage à tous les tests pendant la scène suivante (descente)"),
      Drug_anarchy("deepweed", /^Deepweed\s*\(drogue\)/i, "Deepweed",
        "Donne la perception astrale pendant la scène (Éveillés : Avantage aux tests de perception astrale)",
        "Désavantage à tous les tests pendant la scène suivante"),
      Drug_anarchy("kamikaze", /^Kamikaze\s*\(drogue\)/i, "Kamikaze",
        "VD +1 en combat rapproché et Avantage aux tests de Force pendant la scène ; ne bat jamais en retraite",
        "Désavantage à tous les tests pendant la scène suivante (épuisement)"),
      Drug_anarchy("longhaul", /^Long\s*Haul\s*\(drogue\)/i, "Long Haul",
        "Reste éveillé sans malus de fatigue pendant plusieurs jours",
        "Sommeil inévitable de 8 heures au contrecoup ; Désavantage jusqu'au repos"),
      Drug_anarchy("nitro", /^Nitro\s*\(drogue\)/i, "Nitro",
        "VD +2 à mains nues et Avantage aux tests de Force pendant la scène",
        "Désavantage à tous les tests pendant la scène suivante (contrecoup brutal)"),
      Drug_anarchy("novacoke", /^Novacoke\s*\(drogue\)/i, "Novacoke",
        "Avantage aux tests d'Influence pendant la scène",
        "Désavantage à tous les tests pendant la scène suivante (irritabilité)"),
      Drug_anarchy("psyche", /^Psych[eé]\s*\(drogue\)/i, "Psyché",
        "Éveillés : Avantage aux tests de Sorcellerie et de Conjuration pendant la scène",
        "Désavantage à tous les tests pendant la scène suivante"),
      Drug_anarchy("zen", /^Zen\s*\(drogue\)/i, "Zen",
        "Avantage pour résister à la peur, à l'intimidation et au stress pendant la scène",
        "Désavantage à tous les tests pendant la scène suivante (passivité)"),
    ],
  },

  /** Retrouve la définition de drogue correspondant à un libellé
      d'équipement (source "equip") ou d'atout (source "edges").
      En Anarchy les drogues sont des atouts d'équipement : elles peuvent
      apparaître dans les deux listes, la source n'est pas filtrée. */
  matchItem(item, edition, source) {
    if (typeof item !== "string") return null;
    const table = this.CATALOG[edition] || [];
    const matchAll = App.getEditionModule(edition).drugModel.matchAll;
    return (
      table.find(
        (d) => (matchAll || (d.source || "equip") === source) && d.match.test(item),
      ) || null
    );
  },

  /** État courant d'une drogue sur un PNJ : "idle" | "effect" | "sideEffect". */
  state(pnj, drugId) {
    return (pnj.drugState && pnj.drugState[drugId]) || "idle";
  },

  /** Prochain état dans le cycle à 3 clics. */
  next(state) {
    return state === "idle"
      ? "effect"
      : state === "effect"
        ? "sideEffect"
        : "idle";
  },

  _phase(drug, name) {
    return name === "effect" ? drug.effect : name === "sideEffect" ? drug.sideEffect : null;
  },

  _recalcFor(edition, pnj) {
    const EditionModule = App.getEditionModule(edition);
    if (EditionModule && typeof EditionModule.recalc === "function") EditionModule.recalc(pnj);
  },

  /** Fait avancer une drogue d'un cran (idle → effet → contrecoup → idle),
      en annulant proprement la phase précédente avant d'appliquer la
      suivante — jamais cumulatif. */
  advance(pnj, edition, drugId) {
    const drug = (this.CATALOG[edition] || []).find((d) => d.id === drugId);
    if (!drug) return;
    pnj.drugState = pnj.drugState || {};
    const cur = this.state(pnj, drugId);
    const nxt = this.next(cur);

    // Chaque phase est annulée puis recalculée (si elle touche des attrs)
    // AVANT que la phase suivante applique ses propres deltas — sinon un
    // recalc() tardif écraserait un delta manuel (ex. initBase du contrecoup).
    const curPhase = this._phase(drug, cur);
    if (curPhase && curPhase.revert) curPhase.revert(pnj);
    if (curPhase && curPhase.recalc) this._recalcFor(edition, pnj);

    const nxtPhase = this._phase(drug, nxt);
    if (nxtPhase && nxtPhase.apply) nxtPhase.apply(pnj);
    if (nxtPhase && nxtPhase.recalc) this._recalcFor(edition, pnj);

    if (nxt === "idle") delete pnj.drugState[drugId];
    else pnj.drugState[drugId] = nxt;
  },
};
