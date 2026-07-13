#!/usr/bin/env python3
"""Pilote de merge git qui neutralise les `?v=` de cache-busting.

Problème résolu : `tools/bump_version.py` réécrit les ~90 tags `?v=NN`
(index.html + js/app.js) sur un seul numéro à chaque bump. Deux branches
qui bumpent en parallèle modifient donc les mêmes dizaines de lignes →
conflit garanti à chaque merge/rebase, alors que le seul « désaccord » est
un numéro de build sans valeur sémantique.

Ce pilote, branché via .gitattributes (`merge=vbump`) et enregistré par
`tools/setup_git.sh`, fait un merge 3-way *en ignorant* les numéros :

  1. remplace tout `?v=<digits>` par un jeton fixe dans base/ours/theirs ;
  2. délègue le merge réel à `git merge-file` (même algo diff3 que git) ;
  3. re-tamponne le résultat sur le plus grand numéro vu (comme un bump).

Conséquence : les différences de `?v=` ne produisent plus jamais de
conflit, mais les vrais conflits de contenu remontent normalement avec
leurs marqueurs. `bump_version.py` reste l'outil de bump ; ce pilote ne
fait que rendre ses écritures fusionnables.

Git l'appelle avec :  merge_version.py %O %A %B
  %O = ancêtre commun (base)   %A = notre version (aussi la SORTIE)
  %B = leur version
Code de retour : 0 = fusion propre, ≠0 = conflit résiduel (marqueurs dans %A).
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

PLACEHOLDER = "?v=@@VBUMP@@"
VERSION_RE = re.compile(r"\?v=(\d+)")


def main() -> int:
    if len(sys.argv) < 4:
        print("usage: merge_version.py <base> <ours> <theirs>", file=sys.stderr)
        return 2
    base_p, ours_p, theirs_p = (Path(a) for a in sys.argv[1:4])

    base = base_p.read_text(encoding="utf-8")
    ours = ours_p.read_text(encoding="utf-8")
    theirs = theirs_p.read_text(encoding="utf-8")

    # Plus grand numéro vu partout : c'est lui qu'on re-tamponnera (= un bump).
    nums = [int(n) for text in (base, ours, theirs) for n in VERSION_RE.findall(text)]
    build = max(nums) if nums else None

    def normalize(text: str) -> str:
        return VERSION_RE.sub(PLACEHOLDER, text)

    # Merge 3-way sur des copies normalisées : les ?v= sont identiques
    # partout, donc invisibles pour l'algo ; seuls les vrais écarts restent.
    with tempfile.TemporaryDirectory() as d:
        dp = Path(d)
        (dp / "base").write_text(normalize(base), encoding="utf-8")
        (dp / "ours").write_text(normalize(ours), encoding="utf-8")
        (dp / "theirs").write_text(normalize(theirs), encoding="utf-8")
        result = subprocess.run(
            ["git", "merge-file", "-p", "-L", "ours", "-L", "base", "-L", "theirs",
             str(dp / "ours"), str(dp / "base"), str(dp / "theirs")],
            capture_output=True, text=True,
        )

    merged = result.stdout
    # git merge-file : rc == 0 propre, rc > 0 = nombre de conflits, rc < 0 = erreur.
    conflicts = result.returncode
    if conflicts < 0:
        sys.stderr.write(result.stderr)
        return 1

    # Re-tampon : le jeton redevient un vrai numéro (le max, comme un bump).
    if build is not None:
        merged = merged.replace(PLACEHOLDER, f"?v={build}")

    ours_p.write_text(merged, encoding="utf-8")  # %A = fichier de sortie attendu par git
    return 0 if conflicts == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
