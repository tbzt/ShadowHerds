#!/usr/bin/env python3
"""Garde-fou de conformité — à lancer avant de croire la doctrine sur parole.

Deux mesures, aucune dépendance :

  1. Les fichiers au-dessus du seuil, avec leur part de LOGIQUE.
     CONTRIBUTING § « Taille » vise < 500 lignes, tolère 800, « la cohérence
     fonctionnelle prime sur le nombre de lignes ». Les catalogues de données
     et les modules d'édition sont exemptés « pour peu que la logique
     embarquée reste marginale » — c'est cette part-là qui est mesurée ici,
     et elle décide, PAS le dossier où vit le fichier.

  2. Les trois interdits absolus de CLAUDE.md, comptés et non affirmés.
     Un chiffre daté vaut mieux qu'une doctrine qui ment sur son propre état.

    python3 outils/tailles.py [seuil]

Méthode : commentaires et chaînes retirés d'abord (une accolade dans un
texte suffirait à faire dériver la mesure sur des milliers de lignes —
constaté) ; l'étendue d'un membre va jusqu'au membre suivant, jamais par
comptage d'accolades.
"""
import os
import re
import sys

SEUIL = int(sys.argv[1]) if len(sys.argv) > 1 else 800
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MEMBRE = re.compile(r"^ {2,3}(?:async |get |set |\* )?([A-Za-zÀ-ÿ_$][\w$À-ÿ]*)\s*(\(|:)")
MOTCLE = re.compile(r"^ {2,3}(if|for|while|return|const|let|var|else|case|switch|try|catch|do|throw|await)\b")
FN = re.compile(r":\s*(async\s*)?(function\b|\([^)]*\)\s*=>|[A-Za-zÀ-ÿ_$][\w$]*\s*=>)")


# Un `/` qui suit l'un de ces caractères ouvre une expression régulière, pas
# une division : sans cette règle, `/['\"]/` fait entrer le dépouilleur en
# état « chaîne » et il avale le reste du fichier (constaté sur graphengine.js,
# 529 lignes de code effacées en silence).
AVANT_REGEX = set("(,=:[!&|?{};+-*%~^\n\t ")


def decommente(src):
    """Retire commentaires et contenu des chaînes, en conservant les lignes.

    Les chaînes doivent être suivies malgré tout : `"http://…"` ouvrirait
    sinon un faux commentaire de ligne."""
    out, i, n = [], 0, len(src)
    etat = None  # None | '//' | '/*' | '"' | "'" | '`' | 'rx'
    precedent = "\n"
    while i < n:
        c, d = src[i], src[i:i + 2]
        if etat is None:
            if c == "/" and d != "//" and d != "/*" and precedent in AVANT_REGEX:
                etat, i = "rx", i + 1
                continue
            if d == "//":
                etat, i = "//", i + 2
                continue
            if d == "/*":
                etat, i = "/*", i + 2
                continue
            if c in "\"'`":
                etat, i = c, i + 1
                out.append(c)
                continue
            out.append(c)
            if c.strip():
                precedent = c
            i += 1
        elif etat == "rx":
            if c == "\\":
                i += 2
                continue
            if c == "\n":      # une regex ne franchit pas la ligne : garde-fou
                etat = None
                out.append(c)
            elif c == "/":
                etat = None
                precedent = "/"
            i += 1
        elif etat == "//":
            if c == "\n":
                etat = None
                out.append(c)
            i += 1
        elif etat == "/*":
            if d == "*/":
                etat, i = None, i + 2
                continue
            if c == "\n":
                out.append(c)
            i += 1
        else:  # dans une chaîne
            if c == "\\":
                i += 2
                continue
            if c == etat:
                etat = None
                out.append(c)
            elif c == "\n":
                out.append(c)  # littéral gabarit multiligne
            i += 1
    return "".join(out)


def mesure(path):
    brut = open(path, encoding="utf-8").read()
    lignes = decommente(brut).split("\n")
    utiles = [i for i, l in enumerate(lignes) if l.strip()]
    if not utiles:
        return 0, None, 0.0
    # Garde de forme : la mesure ne vaut que pour le motif dominant du projet,
    # `export const X = { … }`. Un fichier bâti sur des `const` de tête ou des
    # fonctions libres serait lu de travers — mieux vaut l'avouer.
    depart = next((i for i, l in enumerate(lignes)
                   if re.match(r"^(export )?const [A-Za-zÀ-ÿ_$][\w$]* = \{", l)), None)
    # …et le littéral doit porter l'essentiel du fichier : s'il est précédé
    # de beaucoup de code (const de tête, fonctions libres), ce n'est pas la
    # forme attendue et la mesure ne veut rien dire.
    if depart is None or sum(1 for i in utiles if i < depart) > 0.2 * len(utiles):
        return len(utiles), None, 0.0
    lignes = lignes[depart:]
    utiles = [i for i, l in enumerate(lignes) if l.strip()]
    hits = []
    for i, l in enumerate(lignes):
        m = MEMBRE.match(l)
        if m and not MOTCLE.match(l):
            hits.append((i, m.group(2) == "(" or bool(FN.search(l))))
    if not hits:
        return len(utiles), None, 0.0
    dans_fn, couverts = set(), set()
    for k, (ln, est_fn) in enumerate(hits):
        fin = hits[k + 1][0] if k + 1 < len(hits) else len(lignes)
        couverts.update(range(ln, fin))
        if est_fn:
            dans_fn.update(range(ln, fin))
    fn = sum(1 for i in utiles if i in dans_fn)
    couv = 100.0 * sum(1 for i in utiles if i in couverts) / len(utiles)
    return len(utiles), 100.0 * fn / len(utiles), couv


def js_files():
    for base, dirs, files in os.walk(os.path.join(RACINE, "js")):
        dirs[:] = [d for d in dirs if d != "node_modules"]
        for f in sorted(files):
            if f.endswith(".js"):
                yield os.path.relpath(os.path.join(base, f), RACINE)


rows = []
for f in js_files():
    brut = sum(1 for _ in open(os.path.join(RACINE, f), encoding="utf-8"))
    if brut <= SEUIL:
        continue
    code, pct, couv = mesure(os.path.join(RACINE, f))
    rows.append((brut, code, pct, couv, f))
rows.sort(reverse=True)

print(f"\n=== Fichiers de plus de {SEUIL} lignes ({len(rows)}) ===\n")
print(f"{'fichier':46s} {'brut':>6s} {'code':>6s} {'logique':>8s}   nature")
for brut, code, pct, couv, f in rows:
    if pct is None or couv < 60:
        nature, aff = "structure non reconnue — mesurer à la main", "    ?"
    else:
        aff = f"{pct:6.0f}%"
        if pct < 15:
            nature = "catalogue — la taille est de la donnée"
        elif pct < 50:
            nature = "mixte — données + logique embarquée"
        else:
            nature = "LOGIQUE — candidat au découpage"
    print(f"{f:46s} {brut:6d} {code:6d} {aff}   {nature}")

print("\n=== Les trois interdits (CLAUDE.md) ===\n")


def infractions(motif, fichiers, exclure=None, ignorer=None):
    res = []
    for f in fichiers:
        if exclure and exclure in f:
            continue
        brut = open(os.path.join(RACINE, f), encoding="utf-8").read().split("\n")
        nu = decommente("\n".join(brut)).split("\n")
        for i, l in enumerate(nu):
            origine = brut[i] if i < len(brut) else ""
            if re.search(motif, l) and not (ignorer and re.search(ignorer, origine)):
                res.append(f"{f}:{i+1}: {origine.strip()[:90]}")
    return res


js = list(js_files())
a = infractions(r"App\.edition\s*[=!]==", [f for f in js if not f.startswith("js/editions/")],
                ignorer=r'"none"')
print(f"  1. branches d'édition hors js/editions/ : {len(a)}")
for l in a:
    print(f"       {l}")

b = infractions(r"\blocalStorage\b", js, exclure="js/core/storage.js")
print(f"  2. localStorage hors js/core/storage.js  : {len(b)}")
for l in b:
    print(f"       {l}")

c = infractions(r"onclick=", js + ["index.html"])
print(f"  3. handlers inline onclick=             : {len(c)}")
for l in c:
    print(f"       {l}")
print()
