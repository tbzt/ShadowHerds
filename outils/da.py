#!/usr/bin/env python3
"""Garde-fou de direction artistique — dit si un lot est arrivé, pas s'il est fatigant.

Le chantier DA a un mode d'échec connu et documenté : on solde l'étape gratuite
(poser un token), elle ne change rien à l'écran, l'élan retombe, et l'étape qui
compte — migrer les objets qui consomment ce token — ne se termine jamais. On
obtient alors un écran migré à 96 pour cent dont le point focal est resté à
l'ancien, ce qui se lit très exactement comme « ça ne ressemble pas ».

    python3 outils/da.py [--court]

Quatre mesures, aucune dépendance. Chacune porte sa CIBLE : un lot est fini
quand le compteur tombe, pas quand on n'en peut plus.

  1. ÉLÉVATION — le figure/fond se fait-il par la luminance ? Le paragraphe 4.4
     l'exige ; encore faut-il que les valeurs puissent le tenir. Contraste des
     quatre surfaces, aux quatre éditions, plus la conformité AA des encres sur
     la surface d'objet — c'est elle qu'on casse en élargissant l'élévation sans
     relever l'encre secondaire.

  2. MIGRATION — combien de règles peignent encore --bg-card / --bg-mid comme
     SURFACE, et combien d'entre elles sont des variantes d'état. Les variantes
     sont le vrai piège : elles surchargent à spécificité supérieure, donc elles
     survivent à la migration de la règle de base et laissent l'objet le plus
     regardé à l'ancienne peau.

  3. HIÉRARCHIE — ce qui empêche un écran d'avoir un sujet : tailles hors
     échelle, majuscules employées hors du rôle d'étiquette, accent employé
     comme encre alors qu'il ne doit signaler que l'interactif et l'actif.

  4. COUCHE 2 — les composants spécifiés par DESIGN-SYSTEM.md et jamais bâtis.
     Un composant décidé mais absent est pire qu'un composant manquant : il fait
     croire que la question est réglée.

Méthode : commentaires CSS retirés avant toute mesure. Un `*/` dans une valeur
suffirait à faire dériver le comptage — piège déjà rencontré sur ce dépôt.
"""
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURT = "--court" in sys.argv

THEMES = {
    "SR5": "css/theme-sr5.css",
    "SR6": "css/theme-sr6.css",
    "Anarchy 1": "css/theme-anarchy1.css",
    "Anarchy 2": "css/theme-anarchy.css",
}

# Cibles. Elles ne sont pas des vœux : chacune vient d'une mesure ou d'une loi
# citée de DESIGN-SYSTEM.md.
CIBLE_FIGURE_FOND = 1.40   # en dessous, la masse ne se voit pas sans filet
CIBLE_AA = 4.5             # WCAG AA texte


def lire(rel):
    with open(os.path.join(RACINE, rel), encoding="utf-8") as f:
        return f.read()


def decommente(css):
    """Retire les commentaires CSS. Indispensable AVANT tout comptage."""
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def fichiers_css():
    base = os.path.join(RACINE, "css", "base")
    return sorted("css/base/" + f for f in os.listdir(base) if f.endswith(".css"))


# ---------------------------------------------------------------- couleur
def _lin(c):
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(hexa):
    h = hexa.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contraste(a, b):
    x, y = lum(a), lum(b)
    return (max(x, y) + 0.05) / (min(x, y) + 0.05)


def tokens(rel):
    """Valeurs littérales des tokens d'un thème (les var() sont ignorées :
    on ne mesure que ce qui a une couleur réelle à comparer)."""
    css = decommente(lire(rel))
    out = {}
    for m in re.finditer(r"(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;", css):
        out.setdefault(m.group(1), m.group(2))
    return out


def mesure_elevation():
    print("1. ÉLÉVATION — le figure/fond se fait-il par la luminance ?")
    print(f"   cible : objet/fond ≥ {CIBLE_FIGURE_FOND}:1 · encres ≥ {CIBLE_AA}:1 sur l'objet\n")
    entete = f"   {'édition':11} {'chrome':>8} {'encart':>8} {'OBJET':>8}   {'--text':>8} {'--text-dim':>11}"
    print(entete)
    ko = 0
    for nom, rel in THEMES.items():
        t = tokens(rel)
        try:
            bg = t["--bg"]
            card, mid, raised = t["--bg-card"], t["--bg-mid"], t["--bg-raised"]
            texte, dim = t["--text"], t["--text-dim"]
        except KeyError as e:
            print(f"   {nom:11} token manquant : {e}")
            ko += 1
            continue
        cf = contraste(bg, raised)
        ct, cd = contraste(raised, texte), contraste(raised, dim)
        mf = "" if cf >= CIBLE_FIGURE_FOND else " ✗"
        mt = "" if ct >= CIBLE_AA else " ✗"
        md = "" if cd >= CIBLE_AA else " ✗"
        ko += (cf < CIBLE_FIGURE_FOND) + (ct < CIBLE_AA) + (cd < CIBLE_AA)
        print(f"   {nom:11} {contraste(bg, card):7.2f}  {contraste(bg, mid):7.2f}  "
              f"{cf:6.2f}{mf:2}  {ct:7.2f}{mt:2} {cd:9.2f}{md:2}")
    print(f"\n   → {ko} écart(s)\n")
    return ko


# ---------------------------------------------------------------- migration
RE_REGLE = re.compile(r"([^{}]+)\{([^{}]*)\}", re.S)
RE_SURFACE = re.compile(r"background(?:-color)?\s*:\s*[^;]*var\(--bg-(?:card|mid)\)")
RE_ETAT = re.compile(r":(hover|active|focus|checked)|\.(is-|has-|active|open|selected|down|delayed)")


def mesure_migration():
    print("2. MIGRATION — objets encore peints à la couleur du chrome")
    print("   cible : 0 variante d'état ; les règles restantes doivent être du VRAI chrome\n")
    total = etats = 0
    par_fichier = {}
    for rel in fichiers_css():
        css = decommente(lire(rel))
        n = ne = 0
        for sel, corps in RE_REGLE.findall(css):
            sel = " ".join(sel.split())
            if not sel or sel.startswith("@"):
                continue
            if not RE_SURFACE.search(corps):
                continue
            n += 1
            if RE_ETAT.search(sel):
                ne += 1
        if n:
            par_fichier[rel] = (n, ne)
            total += n
            etats += ne
    adopte = sum(len(re.findall(r"var\(--bg-raised\)", decommente(lire(f))))
                 for f in fichiers_css())
    print(f"   règles peignant --bg-card/--bg-mid comme surface : {total}")
    print(f"     dont VARIANTES D'ÉTAT (le piège)               : {etats}")
    print(f"   usages de var(--bg-raised)                       : {adopte}")
    if not COURT:
        print()
        for rel, (n, ne) in sorted(par_fichier.items(), key=lambda kv: -kv[1][0])[:8]:
            print(f"     {os.path.basename(rel):26} {n:3}   dont {ne} d'état")
    print()
    return etats


# ---------------------------------------------------------------- hiérarchie
ECHELLE = {"--fs-2xs", "--fs-xs", "--fs-sm", "--fs-base", "--fs-md",
           "--fs-lg", "--fs-xl", "--fs-2xl"}


def mesure_hierarchie():
    print("3. HIÉRARCHIE — ce qui empêche un écran d'avoir un sujet")
    print("   cible : 0 taille hors échelle (hors em/%/print) · l'accent n'est pas une encre\n")
    hors, maj, accent_encre = [], 0, []
    for rel in fichiers_css():
        css = decommente(lire(rel))
        for m in re.finditer(r"font-size\s*:\s*([^;]+);", css):
            v = m.group(1).strip()
            if v.startswith("var(") or v.endswith("em") or v.endswith("%") \
               or "clamp" in v or v.endswith("pt") or v == "0":
                continue
            hors.append((os.path.basename(rel), v))
        maj += len(re.findall(r"text-transform\s*:\s*uppercase", css))
        for sel, corps in RE_REGLE.findall(css):
            if not re.search(r"(?<!-)\bcolor\s*:\s*var\(--accent2?\)", corps):
                continue
            # L'accent EST autorisé sur l'interactif et l'actif (§ 2) : un
            # `:hover` en accent n'est pas une faute, c'en est l'emploi. On ne
            # compte que l'accent posé sur du texte AU REPOS et NON actionnable
            # — un titre, un libellé, une valeur. Sans ce filtre l'outil signale
            # 230 sites dont l'écrasante majorité sont conformes, et personne ne
            # le relance jamais.
            s = " ".join(sel.split())
            if RE_ETAT.search(s) or re.search(
                    r"\b(a|button)\b|\[data-action|\.chip|\.rollable|\.nav-|"
                    r"\.tab-|\.btn|:focus|:link|:visited|::selection", s):
                continue
            accent_encre.append((os.path.basename(rel), s[:46]))
    print(f"   font-size hors échelle                    : {len(hors)}")
    print(f"   text-transform: uppercase                 : {maj}")
    print(f"   accent comme encre AU REPOS (non cliquable) : {len(accent_encre)}")
    if not COURT:
        if hors:
            print()
            for f, v in hors[:6]:
                print(f"     hors échelle  {f:24} {v}")
        if accent_encre:
            print()
            for f, s in accent_encre[:8]:
                print(f"     accent-encre  {f:24} {s}")
    print()
    return len(hors)


# ---------------------------------------------------------------- couche 2
def mesure_couche2():
    print("4. COUCHE 2 — composants spécifiés par DESIGN-SYSTEM.md")
    print("   cible : bâtis, ou rayés du document. Un composant décidé et absent ment.\n")
    css_tout = "".join(decommente(lire(f)) for f in fichiers_css())
    balisage = lire("index.html") + "".join(
        open(os.path.join(dp, f), encoding="utf-8", errors="ignore").read()
        for dp, _, fs in os.walk(os.path.join(RACINE, "js"))
        for f in fs if f.endswith(".js"))
    for nom, motif_css, motif_bal in [
        (".surface (§ 5.1)", r"\.surface\b", r'class="[^"]*\bsurface\b'),
        (".panel-toolbar (§ 6.2)", r"\.panel-toolbar\b", r"panel-toolbar"),
        (".btn-quiet (§ 6.4)", r"\.btn-quiet\b", r"btn-quiet"),
        ("état d'erreur (§ 6.7)", r"error-state", r"error-state"),
        ("--scrim (§ 4.1)", r"var\(--scrim\)", r"--scrim"),
    ]:
        c = len(re.findall(motif_css, css_tout))
        b = len(re.findall(motif_bal, balisage))
        etat = "absent" if c == 0 else ("défini, jamais posé" if b == 0 else "en service")
        print(f"   {nom:26} css:{c:3}  balisage:{b:3}   {etat}")
    print()


if __name__ == "__main__":
    print()
    ko = mesure_elevation()
    etats = mesure_migration()
    hors = mesure_hierarchie()
    mesure_couche2()
    print("— un lot est fini quand son compteur tombe, pas quand on est fatigué —\n")
    sys.exit(0)
