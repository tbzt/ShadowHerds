#!/usr/bin/env python3
"""Aligne tous les `?v=` du projet (index.html + js/app.js) sur un seul
numéro de build. Le site est statique (déploiement GitHub Pages sans étape
de build, cf. .github/workflows/main.yml) : c'est ce script, lancé à la
main avant commit, qui invalide le cache — pas un bundler. VR4
(AUDITS/PLAN_VERSIONNING.md).

Deux gisements de tags, un seul numéro :
- index.html : `<script src="js/…?v=NN">` / `<link href="css/…?v=NN">`.
- js/app.js : `App._EDITION_JS`/`_EDITION_CSS` (chargement conditionnel des
  modules d'édition, CH-P1b) — chaînes JS `"js/…?v=NN"`, invisibles pour un
  bump qui ne regarderait que index.html (trouvé en vérifiant E3 : un
  edit de js/editions/sr5.js servait une version en cache tant que cette
  table n'était pas alignée aussi).

Usage :
  tools/bump_version.py            # numéro = max courant + 1
  tools/bump_version.py --set 1000 # numéro imposé
"""
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
APP_JS = ROOT / "js" / "app.js"

INDEX_TAG_RE = re.compile(r'((?:src|href)="(?:js|css)/[^"?]+)\?v=\d+(")')
APPJS_TAG_RE = re.compile(r'("(?:js|css)/[^"?]+)\?v=\d+(")')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--set", type=int, help="Numéro de build à imposer (défaut : max courant + 1)")
    args = parser.parse_args()

    html = INDEX.read_text(encoding="utf-8")
    appjs = APP_JS.read_text(encoding="utf-8")
    current = [int(m) for m in re.findall(r'\?v=(\d+)"', html)]
    current += [int(m) for m in re.findall(r'\?v=(\d+)"', appjs)]
    if not current:
        print("Aucun tag ?v= trouvé.", file=sys.stderr)
        sys.exit(1)

    build = args.set if args.set is not None else max(current) + 1
    new_html, n_html = INDEX_TAG_RE.subn(rf'\g<1>?v={build}\g<2>', html)
    new_appjs, n_appjs = APPJS_TAG_RE.subn(rf'\g<1>?v={build}\g<2>', appjs)
    INDEX.write_text(new_html, encoding="utf-8")
    APP_JS.write_text(new_appjs, encoding="utf-8")
    print(
        f"{n_html + n_appjs} tags alignés sur ?v={build} "
        f"(index.html: {n_html}, app.js: {n_appjs} · précédent max : {max(current)})."
    )


if __name__ == "__main__":
    main()
