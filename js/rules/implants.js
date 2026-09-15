"use strict";

/* ============================================================
   IMPLANTS — gammes d'augmentations (SR5 p.451, SR6 p.283)
   ------------------------------------------------------------
   « Les prix, disponibilité et coût en Essence du cyberware et bioware
   présentés dans ce chapitre s'entendent pour la gamme standard. Pour les
   autres gammes, appliquez les modificateurs présents dans la table des
   gammes d'implants. » Les deux livres ont la même forme de table — cinq
   gammes, trois multiplicateurs — et pas les mêmes valeurs : chaque
   édition livre SA table (`grades`), ce moteur ne fait que l'appliquer.
   Neutre par édition : aucune branche, aucun catalogue.

   Un objet d'équipement porte `grade` (clé de la table, « standard » par
   défaut), `detail` (la ligne de stats du livre, où se lit l'Essence
   standard « [Essence 0.5, … ] »), `cost` et `availability` saisis AU TARIF
   STANDARD : c'est le moteur qui applique la gamme, et l'écran qui montre
   le résultat. Une Essence introuvable sur la ligne est `null` — nommée,
   pas comptée 0.
   ============================================================ */
export const Implants = {
  /** L'Essence STANDARD : saisie sur l'objet (`essenceBase`) quand le
      catalogue ne la porte pas, sinon lue sur la ligne du livre (« Essence
      0.5 », « Essence 0,5 ») ; null quand elle n'y est pas (« Essence
      variable », « indice × 0.1 », ligne muette). Accepte un objet ou la
      ligne seule. */
  baseEssence(itemOrDetail) {
    const item = itemOrDetail && typeof itemOrDetail === "object" ? itemOrDetail : null;
    if (item && item.essenceBase != null && item.essenceBase !== "" && Number.isFinite(Number(item.essenceBase))) {
      return Number(item.essenceBase);
    }
    const detail = item ? item.detail : itemOrDetail;
    const m = String(detail || "").match(/Essence\s*:?\s*(\d+(?:[.,]\d+)?)/i);
    return m ? Number(m[1].replace(",", ".")) : null;
  },

  /** L'entrée de gamme d'un objet dans la table de l'édition ; standard à défaut. */
  gradeOf(grades, item) {
    const key = item && item.grade ? item.grade : "standard";
    return (grades && grades[key]) || (grades && grades.standard) || { essence: 1, cout: 1, dispo: 0, label: "Standard" };
  },

  /** Essence effective : standard × multiplicateur de la gamme, à deux décimales ; null si inconnue. */
  essence(grades, item) {
    const base = this.baseEssence(item);
    if (base == null) return null;
    return Math.round(base * this.gradeOf(grades, item).essence * 100) / 100;
  },

  /** Coût effectif : le prix standard saisi × multiplicateur. */
  cost(grades, item) {
    return Math.round((Number(item && item.cost) || 0) * this.gradeOf(grades, item).cout);
  },

  /** Disponibilité effective : standard + modificateur ; null si non saisie. */
  availability(grades, item) {
    const a = item && item.availability;
    if (a == null || a === "") return null;
    return Number(a) + this.gradeOf(grades, item).dispo;
  },

  /** Somme d'Essence d'une liste d'objets : `{total, inconnus}` — les objets
      sans Essence lisible sont comptés à part, jamais à 0. */
  total(grades, items) {
    let total = 0;
    let inconnus = 0;
    for (const it of items || []) {
      const e = this.essence(grades, it);
      if (e == null) inconnus++;
      else total += e;
    }
    return { total: Math.round(total * 100) / 100, inconnus };
  },
};
