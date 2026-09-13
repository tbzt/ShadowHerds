"use strict";

/* ============================================================
   MODREFS — un mod posé sur un objet d'équipement
   ------------------------------------------------------------
   Dans un brouillon, `gear[i].mods` a longtemps été une liste d'IDS. Un
   objet à indice (« Autopilote amélioré 3 », « Protection ignifuge 4 ») n'y
   avait pas de place : ses emplacements « 1 × Indice », sa capacité
   « [Indice] », son coût « Indice × 250 ¥ » restaient indéterminés, et
   c'était la TROISIÈME fois que ce cas se contournait. Un mod est désormais
   `{ id, indice }` ; une chaîne nue reste lue comme `{ id }` — les
   brouillons d'avant ne cassent pas.

   Moteur neutre : il ne sait rien des éditions, seulement lire une
   référence et résoudre une valeur (nombre au livre, ou formule + variables)
   via Formule.
   ============================================================ */
import { Formule } from "./formule.js";

export const ModRefs = {
  id(m) { return typeof m === "string" ? m : m && m.id != null ? String(m.id) : null; },
  indice(m) {
    if (!m || typeof m === "string") return null;
    const n = Number(m.indice);
    return Number.isFinite(n) && n > 0 ? n : null;
  },
  /** Toujours des objets, sans toucher aux ids. */
  normalize(mods) {
    return (mods || []).map((m) => (typeof m === "string" ? { id: m } : m && typeof m === "object" ? m : null)).filter(Boolean);
  },
  /** Une valeur du livre : le nombre s'il y en a un, sinon la formule
      évaluée avec `vars`, sinon null (à NOMMER, pas à compter zéro). */
  resolve(valeur, note, vars) {
    if (typeof valeur === "number") return valeur;
    return Formule.eval(note, vars);
  },
  /** « 1–4 », « 1-6 », « 1–9 » → { min, max } ; sinon null. */
  indiceRange(mod) {
    const m = String((mod && mod.indice) || "").match(/^(\d+)\s*[–-]\s*(\d+)$/);
    return m ? { min: Number(m[1]), max: Number(m[2]) } : null;
  },
  /** L'objet a-t-il un indice à choisir ? Une plage au livre, ou une note
      (emplacements, capacité, coût) qui en dépend. */
  usesIndice(mod) {
    if (!mod) return false;
    if (this.indiceRange(mod)) return true;
    return [mod.emplacementsNote, mod.capaciteNote, mod.coutNote].some((n) => Formule.usesIndice(n));
  },
};
