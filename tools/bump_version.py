#!/usr/bin/env python3
"""Aligne tous les `?v=` de index.html (js/, css/) sur un seul numéro de
build. Le site est statique (déploiement GitHub Pages sans étape de build,
cf. .github/workflows/main.yml) : c'est ce script, lancé à la main avant
commit, qui invalide le cache — pas un bundler. VR4 (AUDITS/PLAN_VERSIONNING.md).

Usage :
  tools/bump_version.py            # numéro = max courant + 1
  tools/bump_version.py --set 1000 # numéro imposé
"""
import argparse
import re
import sys
from pathlib import Path

INDEX = Path(__file__).resolve().parent.parent / "index.html"
TAG_RE = re.compile(r'((?:src|href)="(?:js|css)/[^"?]+)\?v=\d+(")')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--set", type=int, help="Numéro de build à imposer (défaut : max courant + 1)")
    args = parser.parse_args()

    html = INDEX.read_text(encoding="utf-8")
    current = [int(m) for m in re.findall(r'\?v=(\d+)"', html)]
    if not current:
        print("Aucun tag ?v= trouvé dans index.html.", file=sys.stderr)
        sys.exit(1)

    build = args.set if args.set is not None else max(current) + 1
    new_html, n = TAG_RE.subn(rf'\g<1>?v={build}\g<2>', html)
    INDEX.write_text(new_html, encoding="utf-8")
    print(f"{n} tags alignés sur ?v={build} (précédent max : {max(current)}).")


if __name__ == "__main__":
    main()
