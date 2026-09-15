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
import { Formule } from "./formule.js";

export const Implants = {
  /** Clé de rapprochement entre le nom d'un objet du catalogue de l'app et
      le nom d'une entrée de table : minuscules, sans accent, sans mot
      d'habillage (« implanté », « cybernétique »), sans ponctuation. */
  normName(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, " ")
      .replace(/\b(implantes?|cybernetiques?|cyber)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  },

  /** Index nom normalisé → {ref, indice} sur une table (`nom` + `alias`).
      Un nom terminé par un indice (« Réflexes câblés 1 ») trouve d'abord
      son entrée exacte, sinon l'entrée sans indice avec l'indice retenu. */
  index(table) {
    const idx = new Map();
    for (const ref of table || []) {
      for (const n of [ref.nom, ...(ref.alias || [])]) idx.set(this.normName(n), ref);
    }
    return idx;
  },
  lookup(idx, name, rating) {
    if (!idx) return null;
    const key = this.normName(name);
    const m = key.match(/^(.*?)\s(\d+)$/);
    if (idx.has(key)) {
      const ref = idx.get(key);
      // « Armure dermique 3 » trouvé par alias exact : l'entrée est à indice
      // (« 1–4 »), le 3 du nom est son indice.
      return { ref, indice: m && ref.indice ? Number(m[2]) : null };
    }
    if (m && idx.has(m[1])) return { ref: idx.get(m[1]), indice: Number(m[2]) };
    /* Un nom sans indice dont la table connaît les versions numérotées
       (« Yeux cybernétiques » → « Cyberyeux 1 » … « Cyberyeux 4ux ») :
       l'indice choisi sur l'objet désigne la ligne ; sans lui, on rend la
       plage pour que l'écran la demande. */
    const freres = [];
    for (let n = 1; n <= 12; n++) if (idx.has(`${key} ${n}`)) freres.push(n);
    if (freres.length) {
      const r = rating != null && rating !== "" ? Number(rating) : null;
      const plage = { min: Math.min(...freres), max: Math.max(...freres) };
      if (r != null && idx.has(`${key} ${r}`)) return { ref: idx.get(`${key} ${r}`), indice: r, fixe: true, plage };
      return { ref: null, indice: null, plage };
    }
    return null;
  },

  /** Évalue une cellule de table : nombre tel quel, formule du livre avec
      l'indice (« Indice × 0,1 », « (indice × 5)R » → 5 × indice), sinon null. */
  cell(valeur, note, indice) {
    if (valeur != null) return valeur;
    if (!note) return null;
    const txt = String(note).replace(/[()]/g, " ").replace(/[A-Z]+\s*$/, "").trim();
    if (!/indice/i.test(txt)) return null;
    if (indice == null) return null;
    const v = Formule.eval(txt, { indice });
    return v == null ? null : v;
  },

  /** Les valeurs STANDARD qu'une entrée de table donne à un objet nommé :
      Essence, prix, Disponibilité (partie numérique). Un indice porté par
      le nom (« Armure dermique 3 ») résout les formules ; sans indice, une
      formule reste inconnue (null), jamais 0. */
  defaults(idx, name, rating) {
    const hit = this.lookup(idx, name, rating);
    if (!hit) return null;
    const { ref, indice } = hit;
    if (!ref) {
      // Versions numérotées connues, indice pas encore choisi.
      return { ref: null, indice: null, plage: hit.plage, essenceBase: null, cost: null, availability: null, capaciteOfferte: null, capaciteConsommee: null };
    }
    // L'indice : celui saisi sur l'objet, sinon celui du nom ; une entrée
    // sans plage d'indice n'en a pas besoin.
    const ind = hit.fixe ? indice : rating != null && rating !== "" ? Number(rating) : indice;
    const dispoTxt = ref.dispo ? String(ref.dispo) : "";
    const dispoNum = /^\d+/.test(dispoTxt) ? parseInt(dispoTxt, 10) : this.cell(null, dispoTxt, ind);
    const plage = ref.indice ? String(ref.indice).match(/(\d+)\s*[–-]\s*(\d+)/) : null;
    /* Capacité : OFFERTE par un hôte (cybermembre, cyberœil, oreille
       cybernétique), ou CONSOMMÉE par un implant qui s'y loge (« [2] »,
       « [indice] »). */
    const offerte = ref.capaciteNote === "offerte" ? ref.capacite : null;
    const consommee =
      ref.capaciteNote === "consommée"
        ? ref.capacite
        : ref.capaciteNote && /^\[?indice\]?$/i.test(ref.capaciteNote.trim())
          ? ind != null
            ? ind
            : null
          : null;
    return {
      ref,
      indice: ind,
      // La plage : celle de l'entrée (« 1–4 »), ou celle des versions
      // numérotées (Cyberyeux 1 à 4) pour que l'écran garde le champ Indice.
      plage: plage ? { min: Number(plage[1]), max: Number(plage[2]) } : hit.plage || null,
      essenceBase: this.cell(ref.essence, ref.essenceNote, ind),
      cost: this.cell(ref.cout, ref.coutNote, ind),
      availability: dispoNum,
      capaciteOfferte: offerte,
      capaciteConsommee: consommee,
      // Un accessoire ou une amélioration DE cybermembre (« — [3] ») n'existe
      // que dans un membre : il DOIT être logé. Une bombe corticale (0 [1])
      // ou un smartlink (0,2 [3]) peuvent l'être, sans obligation.
      doitEtreLoge: consommee != null && /accessoire|am[ée]lioration/i.test(String(ref.categorie || "")),
    };
  },

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
