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
            pnj.initDice = (pnj.initDice || 0) + 2;
          },
          revert(pnj) {
            pnj.attrs.RÉA = (pnj.attrs.RÉA || 0) - 1;
            pnj.initDice = (pnj.initDice || 0) - 2;
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

    anarchy: [
      {
        id: "jazz",
        // Le Jazz n'apparaît pas dans pnj.equip côté Anarchy : c'est un
        // atout choisi (pnj.edges), au texte fixe généré par edgeOptions.
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
    ],
  },

  /** Retrouve la définition de drogue correspondant à un libellé
      d'équipement (source "equip") ou d'atout (source "edges"). */
  matchItem(item, edition, source) {
    if (typeof item !== "string") return null;
    const table = this.CATALOG[edition] || [];
    return (
      table.find((d) => (d.source || "equip") === source && d.match.test(item)) ||
      null
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
    const EditionModule =
      edition === "sr5" ? (typeof EditionSR5 !== "undefined" ? EditionSR5 : null)
      : edition === "sr6" ? (typeof EditionSR6 !== "undefined" ? EditionSR6 : null)
      : null;
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
