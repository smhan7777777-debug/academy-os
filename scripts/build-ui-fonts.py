"""Build static UI weights for engines that do not render variable font weights.

One-time asset preparation: python -m pip install 'fonttools[woff]'
Then: python scripts/build-ui-fonts.py
Source: the existing OFL Pretendard variable font. Retain the bundled license.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public/templates/_shared/fonts/files/PretendardVariable.woff2"
TARGET = ROOT / "public/fonts"
TARGET.mkdir(exist_ok=True)

for weight, style in [(400, "Regular"), (700, "Bold")]:
    font = instantiateVariableFont(TTFont(SOURCE), {"wght": weight}, inplace=True)
    # Give the derived build its own family name and retain original copyright.
    names = {1: "Baeumgyeol Sans", 2: style, 3: f"BaeumgyeolSans-{style}",
             4: f"Baeumgyeol Sans {style}", 6: f"BaeumgyeolSans-{style}",
             16: "Baeumgyeol Sans", 17: style}
    for entry in font["name"].names:
        if entry.nameID in names:
            entry.string = names[entry.nameID].encode(entry.getEncoding())
    font.flavor = "woff2"
    path = TARGET / f"baeumgyeol-{weight}.woff2"
    font.save(path)
    print(f"{path.name}: {path.stat().st_size:,} bytes")
