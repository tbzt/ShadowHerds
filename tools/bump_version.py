#!/usr/bin/env python3
"""Aligne tous les `?v=` du projet (index.html + js/app.js + imports ESM
relatifs) sur un seul numéro de build. Le site est statique (déploiement
GitHub Pages sans étape de build, cf. .github/workflows/main.yml) : c'est ce
script, lancé à la main avant commit, qui invalide le cache — pas un
bundler. VR4 (AUDITS/PLAN_VERSIONNING.md).

Quatre gisements de tags, un seul numéro :
- index.html : `<script src="js/…?v=NN">` / `<link href="css/…?v=NN">`.
- js/app.js : `App._EDITION_JS`/`_EDITION_CSS` (chargement conditionnel des
  modules d'édition) — chaînes JS `"js/…?v=NN"`, invisibles pour un bump
  qui ne regarderait que index.html (trouvé en vérifiant un edit de
  js/editions/sr5.js qui servait une version en cache tant que cette table
  n'était pas alignée aussi).
- index.html : `<script type="importmap">`, si présente (migration modules
  ES, PLANS/PLAN_MODULES_ES.md) — mêmes chaînes `"js/…?v=NN"` que app.js
  mais en JSON inline.
- js/**/*.js : imports ESM relatifs `from "./x.js?v=NN"` / `"../x.js?v=NN"`
  (migration modules ES, Phase 1+). PAS de specifier nu via import map :
  constaté en Phase 1 que l'import map, fonctionnelle en PoC isolé, échoue
  une fois intégrée au vrai index.html (cause non identifiée, cf.
  PLAN_MODULES_ES.md §8) — les fichiers migrés s'importent donc entre eux
  par URL relative versionnée, qui a le même besoin de cache-busting.

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
JS_DIR = ROOT / "js"

INDEX_TAG_RE = re.compile(r'((?:src|href)="(?:js|css)/[^"?]+)\?v=\d+(")')
APPJS_TAG_RE = re.compile(r'("(?:js|css)/[^"?]+)\?v=\d+(")')
# Entrées d'import map JSON : `"@spec": "js/…?v=NN"` — précédées de `: "`
# (jamais `src=`/`href=`), pour ne jamais recouper INDEX_TAG_RE.
IMPORTMAP_RE = re.compile(r'(: ")((?:js|css)/[^"?]+)\?v=\d+(")')
# Imports ESM relatifs : `from "./x.js?v=NN"` / `from "../x.js?v=NN"`.
ESM_IMPORT_RE = re.compile(r'(from ")(\.\.?/[^"?]+)\?v=\d+(")')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--set", type=int, help="Numéro de build à imposer (défaut : max courant + 1)")
    args = parser.parse_args()

    html = INDEX.read_text(encoding="utf-8")
    appjs = APP_JS.read_text(encoding="utf-8")
    js_files = sorted(JS_DIR.rglob("*.js"))
    js_contents = {f: f.read_text(encoding="utf-8") for f in js_files}

    current = [int(m) for m in re.findall(r'\?v=(\d+)"', html)]
    current += [int(m) for m in re.findall(r'\?v=(\d+)"', appjs)]
    for txt in js_contents.values():
        current += [int(m) for m in re.findall(r'\?v=(\d+)"', txt)]
    if not current:
        print("Aucun tag ?v= trouvé.", file=sys.stderr)
        sys.exit(1)

    build = args.set if args.set is not None else max(current) + 1
    new_html, n_html = INDEX_TAG_RE.subn(rf'\g<1>?v={build}\g<2>', html)
    new_html, n_importmap = IMPORTMAP_RE.subn(rf'\g<1>\g<2>?v={build}\g<3>', new_html)
    new_appjs, n_appjs = APPJS_TAG_RE.subn(rf'\g<1>?v={build}\g<2>', appjs)
    INDEX.write_text(new_html, encoding="utf-8")
    APP_JS.write_text(new_appjs, encoding="utf-8")

    n_esm = 0
    for f, txt in js_contents.items():
        new_txt, n = ESM_IMPORT_RE.subn(rf'\g<1>\g<2>?v={build}\g<3>', txt)
        if n:
            f.write_text(new_txt, encoding="utf-8")
            n_esm += n

    print(
        f"{n_html + n_importmap + n_appjs + n_esm} tags alignés sur ?v={build} "
        f"(index.html: {n_html}, import map: {n_importmap}, app.js: {n_appjs}, "
        f"imports ESM: {n_esm} · précédent max : {max(current)})."
    )


if __name__ == "__main__":
    main()
