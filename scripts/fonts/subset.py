# /// script
# requires-python = ">=3.12"
# dependencies = ["fonttools==4.68.0", "brotli==1.2.1", "uharfbuzz==0.57.0"]
# ///
"""Cut the site's web fonts down to what the built pages use.

Run by hand from the repo root, never in the build:

    bun run build && bun run fonts           # rewrite the fonts
    bun run build && bun run fonts --check   # exit 1 if they are stale

Each face becomes a preloaded core (ASCII, common punctuation, and the
characters the pages use) and an extended file (the rest of Latin-1 and
Latin Extended-A) that a browser fetches only when a page needs one of its
characters. Outputs: public/fonts/*.woff2, src/styles/fonts.generated.css,
src/lib/fonts.generated.ts. Commit all three.

Rerun when `--check` fails (new content uses a character outside the core),
when CSS starts using another weight, style, OpenType feature, or
`hyphens: auto`, or when a pinned source below changes.
"""

import argparse
import hashlib
import html
import re
import sys
import urllib.request
from io import BytesIO
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.ttLib.woff2 import WOFF2FlavorData
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist/client"
CACHE = Path(__file__).parent / ".cache"
FONTS_DIR = ROOT / "public/fonts"
CSS_OUT = ROOT / "src/styles/fonts.generated.css"
TS_OUT = ROOT / "src/lib/fonts.generated.ts"


def ranges(spec: str) -> set[int]:
    out: set[int] = set()
    for part in spec.replace("U+", "").split(","):
        lo, _, hi = part.strip().partition("-")
        out.update(range(int(lo, 16), int(hi or lo, 16) + 1))
    return out


ASCII = set(range(0x20, 0x7F))
# No-break space, curly quotes, en and em dashes, ellipsis, and the bullet,
# which Chrome draws for `list-style: disc` markers from the list's own font.
PUNCTUATION = {0xA0, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026}
LATIN_1_AND_EXT_A = set(range(0xA0, 0x180))
HYPHEN = 0x2010  # what `hyphens: auto` draws when the font has it
DEFAULT_IGNORABLE = {0xAD, 0x34F, *range(0x200B, 0x2010), *range(0x2060, 0x2065), 0xFEFF}
# Default-on features. Opt-in ones (frac, ss01, zero, ...) are off in every
# rule today; add a tag here when CSS turns one on.
FEATURES = ["ccmp", "kern", "liga", "mark", "mkmk", "rvrn", "calt", "clig", "rlig", "rclt", "curs"]

FACES = [
    {
        "key": "lumber", "family": "LumberSans", "style": "normal", "weights": ["normal"],
        "path": Path(__file__).parent / "src/LumberSans.ttf",
        "sha256": "4e051338ed9951677fabfc15165aa892cffeebfbf206cd4dc72c76bf162805cb",
        "steps": [],
    },
]
GEIST_REV = "2e554ff2ea3979b63afe770af6424eb8b9490a74"
for key, family, filename, style, weights, steps, digest in [
    ("geist-sans", "Geist", "Geist/variable/Geist%5Bwght%5D.ttf", "normal", [400], [{"wght": 400}], "73894e0448cae90a92b6c2f8732b7bb9acb7b94c418bff559dad4a18e1de9659"),
    ("geist-italic", "Geist", "Geist/variable/Geist-Italic%5Bwght%5D.ttf", "italic", [400], [{"wght": 400}], "a464348abe41a6392f18d04c0ac2ad3c26619357ff5fdd76aff3059116f45e62"),
    ("geist-mono", "Geist Mono", "GeistMono/variable/GeistMono%5Bwght%5D.ttf", "normal", [400], [{"wght": 400}], "87c2aff9723544a9adaea19d92e42a33705c9723624801b6e0224c2206a6af0d"),
    ("geist-serif", "Geist Serif", "GeistSerif/ttf/GeistSerif-Square.ttf", "normal", [400], [], "80b24a90ce54cc81230c0e77de358fc21f89e49ee87d6fc5889704d373d46702"),
]:
    FACES.append({
        "key": key, "family": family, "style": style, "weights": weights,
        "url": f"https://raw.githubusercontent.com/vercel/geist-font/{GEIST_REV}/fonts/{filename}",
        "sha256": digest, "steps": steps,
    })
# Official static cuts avoid rounding drift in variable-font instancing.
geist_sans = next(face for face in FACES if face["key"] == "geist-sans")
for weight, filename, digest in [
    (500, "Medium", "3a3b36f0d0b981f4857f7f00eeef4a5ee123605575d362ab31ee7c19e3d11f2f"),
    (600, "SemiBold", "b9f52322d6d20a7ff1e7fe1310ff12ec851aebb83d24f8b4f1d4149298f489b2"),
    (700, "Bold", "3f21f02b827228c3f0c5fb230d027b5a1a263013618e8052bc1b3c5692812c88"),
]:
    FACES.append({
        **geist_sans, "key": f"geist-sans-{weight}", "weights": [weight], "steps": [],
        "url": f"https://raw.githubusercontent.com/vercel/geist-font/{GEIST_REV}/fonts/Geist/ttf/Geist-{filename}.ttf",
        "sha256": digest,
    })


def source(face: dict) -> TTFont:
    if "path" in face:
        data = face["path"].read_bytes()
    else:
        cached = CACHE / f"{face['sha256']}.ttf"
        if not cached.exists():
            CACHE.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(face["url"]) as response:
                cached.write_bytes(response.read())
        data = cached.read_bytes()
    if hashlib.sha256(data).hexdigest() != face["sha256"]:
        sys.exit(f"{face['key']}: source hash changed; review the new file and update its sha256")
    return TTFont(BytesIO(data))


def unescape_css(text: str) -> str:
    text = re.sub(r"\\([0-9a-fA-F]{1,6}) ?", lambda m: chr(int(m.group(1), 16)), text)
    return re.sub(r"\\(.)", r"\1", text)


def unescape_js(text: str) -> str:
    return re.sub(
        r"\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})",
        lambda m: chr(int(m.group(1) or m.group(2) or m.group(3), 16)),
        text,
    )


def site_usage() -> tuple[set[int], bool]:
    """Characters the built site can render, and whether any CSS hyphenates."""
    if not DIST.exists():
        sys.exit("dist/client not found; run `bun run build` first")
    text, styles = [], []
    for page in DIST.rglob("*.html"):
        raw = page.read_text("utf-8")
        styles += re.findall(r"<style\b[^>]*>(.*?)</style>", raw, flags=re.S | re.I)
        styles += re.findall(r'\bstyle="([^"]*)"', raw)
        body = re.sub(r"<(script|style)\b.*?</\1>", " ", raw, flags=re.S | re.I)
        text.append(html.unescape(re.sub(r"<[^>]+>", " ", body)))
        text += map(html.unescape, re.findall(r'\b(?:placeholder|value)="([^"]*)"', body))
    styles += [p.read_text("utf-8") for p in DIST.rglob("*.css")]
    for css in styles:
        text += map(unescape_css, re.findall(r'content\s*:\s*"((?:[^"\\]|\\.)*)"', css))
    # Client islands render copy from their bundles (guide replies, captions).
    for script in DIST.rglob("*.js"):
        literals = re.findall(r'"(?:[^"\\\n]|\\.)*"|\'(?:[^\'\\\n]|\\.)*\'|`(?:[^`\\]|\\.)*`', script.read_text("utf-8"))
        text += map(unescape_js, literals)
    used = {ord(c) for chunk in text for c in chunk if ord(c) >= 0x20}
    hyphenates = any(re.search(r"hyphens\s*:\s*auto", css) for css in styles)
    return used, hyphenates


def plan(font: TTFont, used: set[int], hyphenates: bool) -> tuple[set[int], set[int], set[int]]:
    cmap = set(font.getBestCmap())
    served, core_pool = cmap, cmap
    wanted_core = ASCII | PUNCTUATION | (used & core_pool) | ({HYPHEN} if hyphenates else set())
    core = wanted_core & served
    extended = ((LATIN_1_AND_EXT_A | used) & served) - core
    skipped = used - served - set(range(0x3000, 0x110000))
    return core, extended, skipped


def instance(face: dict, font: TTFont, weight: int | None = None) -> TTFont:
    """Apply the face's steps; with a weight, pin it in place of any range."""
    for step in face["steps"]:
        if weight is not None and isinstance(step.get("wght"), tuple):
            step = {**step, "wght": weight}
        font = instancer.instantiateVariableFont(font, step)
    return font


def subset(font: TTFont, codepoints: set[int], keep_hinting: bool) -> TTFont:
    options = Options()
    options.layout_features = FEATURES
    options.hinting = keep_hinting
    # fvar and STAT point at name records past 255, so keep every ID.
    options.name_IDs = ["*"]
    options.name_languages = [0x409]
    # Glyph names, .notdef outlines, and source head bounds affect macOS
    # rasterization. Preserve them so subsetting does not change the ink.
    options.glyph_names = True
    options.notdef_outline = True
    subsetter = Subsetter(options)
    subsetter.populate(unicodes=codepoints)
    font = TTFont(BytesIO(serialize(font, None)))
    subsetter.subset(font)
    font.recalcBBoxes = False
    return font


def serialize(font: TTFont, flavor: str | None) -> bytes:
    # Keep the source's head.modified so a rerun with no changes writes the
    # same bytes and the same hashed file names.
    font.recalcTimestamp = False
    font.flavor = flavor
    # The optional hmtx transform sets head.flags bit 1, which the pinned source files
    # leave clear.
    font.flavorData = WOFF2FlavorData(transformedTables={"glyf", "loca"}) if flavor else None
    out = BytesIO()
    font.save(out)
    return out.getvalue()


def outlines(font: TTFont, location: dict | None) -> dict[int, tuple]:
    if location and "fvar" in font:
        font = instancer.instantiateVariableFont(font, location)
    glyphs, hmtx = font.getGlyphSet(), font["hmtx"]
    shapes = {}
    for codepoint, glyph in font.getBestCmap().items():
        pen = DecomposingRecordingPen(glyphs)
        glyphs[glyph].draw(pen)
        shapes[codepoint] = (hmtx[glyph][0], pen.value)
    return shapes


def shaping(data: bytes, codepoints: list[int], weight: int | None) -> list[tuple]:
    font = hb.Font(hb.Face(data))
    if weight is not None:
        font.set_variations({"wght": weight})
    # HarfBuzz drops a default-ignorable character (soft hyphen) from a font
    # with no space glyph and keeps it at zero width otherwise. Both draw
    # nothing, and the extended files have no space, so skip them.
    codepoints = [c for c in codepoints if c not in DEFAULT_IGNORABLE]
    results = []
    for a in codepoints:
        for b in codepoints:
            buf = hb.Buffer()
            buf.add_codepoints([a, b])
            buf.guess_segment_properties()
            hb.shape(font, buf, {})
            results.append(tuple((p.x_advance, p.x_offset, p.y_offset) for p in buf.glyph_positions))
    return results


def verify(face: dict, base: TTFont, part: str, data: bytes, codepoints: set[int], keep_hinting: bool) -> None:
    """Fail on any drift from the pinned source at each used weight."""
    label = f"{face['key']}-{part}"
    font = TTFont(BytesIO(data))
    cmap = set(font.getBestCmap())
    if cmap != codepoints:
        sys.exit(f"{label}: cmap differs from plan by {sorted(map(hex, cmap ^ codepoints))[:12]}")
    if ("fpgm" in font or "prep" in font) != (keep_hinting and ("fpgm" in base or "prep" in base)):
        sys.exit(f"{label}: hinting tables do not match --drop-hinting")
    full = TTFont(BytesIO(serialize(instance(face, base), None)))
    head = font["head"]
    want = (full["head"].xMin, full["head"].yMin, full["head"].xMax, full["head"].yMax)
    if font["head"].flags != full["head"].flags | 0x800:  # bit 11: WOFF2-encoded
        sys.exit(f"{label}: head flags drifted")
    notdef = [f["glyf"][".notdef"].numberOfContours for f in (full, font)]
    if (head.xMin, head.yMin, head.xMax, head.yMax) != want or font["post"].formatType != full["post"].formatType or notdef[0] != notdef[1]:
        sys.exit(f"{label}: head bounds, glyph names, or .notdef drifted")
    variable = "fvar" in font
    ttf = serialize(font, None)
    ordered = sorted(codepoints)
    for weight in [w for w in face["weights"] if isinstance(w, int)] if variable else [None]:
        reference = instance(face, base, weight)
        want, got = outlines(reference, None), outlines(font, {"wght": weight} if weight else None)
        drift = [hex(c) for c in ordered if want[c] != got[c]]
        if drift:
            sys.exit(f"{label} wght {weight}: outlines or advances differ for {drift[:12]}")
        if shaping(serialize(reference, None), ordered, None) != shaping(ttf, ordered, weight):
            sys.exit(f"{label} wght {weight}: pair shaping (kerning, marks, ligatures) differs")


def unicode_range(codepoints: set[int]) -> str:
    runs, ordered = [], sorted(codepoints)
    start = prev = ordered[0]
    for c in ordered[1:] + [None]:
        if c is not None and c == prev + 1:
            prev = c
            continue
        runs.append(f"U+{start:X}" if start == prev else f"U+{start:X}-{prev:X}")
        if c is not None:
            start = prev = c
    return ", ".join(runs)


def describe(codepoints: set[int]) -> str:
    return " ".join(chr(c) if chr(c).isprintable() and c > 0x20 else f"U+{c:04X}" for c in sorted(codepoints))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="exit 1 if the committed fonts do not match the built site")
    parser.add_argument("--drop-hinting", action="store_true", help="drop TrueType hinting; changes rendering on Windows")
    args = parser.parse_args()
    keep_hinting = not args.drop_hinting

    used, hyphenates = site_usage()
    committed = CSS_OUT.read_text("utf-8") if CSS_OUT.exists() else ""
    rules, preloads, written, stale = [], {}, set(), []
    for face in FACES:
        base = source(face)
        core, extended, skipped = plan(base, used, hyphenates)
        if skipped:
            print(f"{face['key']}: left to system fonts as today: {describe(skipped)}")
        reference = instance(face, base)
        for part, codepoints in (("core", core), ("ext", extended)):
            marker = f"/* {face['key']}-{part} */"
            if args.check:
                match = re.search(re.escape(marker) + r".*?unicode-range: ([^;]+);", committed, flags=re.S)
                if not match or ranges(match.group(1)) != codepoints:
                    stale.append(f"{face['key']}-{part}")
                continue
            font = subset(reference, codepoints, keep_hinting)
            data = serialize(font, "woff2")
            verify(face, base, part, data, codepoints, keep_hinting)
            name = f"{face['key']}-{part}.{hashlib.sha256(data).hexdigest()[:10]}.woff2"
            (FONTS_DIR / name).write_bytes(data)
            written.add(name)
            if part == "core":
                preloads[face["key"]] = f"/fonts/{name}"
            print(f"{name:34} {len(data):6} B  {len(codepoints):3} chars")
            for weight in face["weights"]:
                rules.append(
                    "\n".join([
                        f"{marker}",
                        "@font-face {",
                        f'  font-family: "{face["family"]}";',
                        f"  font-style: {face['style']};",
                        f"  font-weight: {weight};",
                        "  font-display: swap;",
                        f'  src: url("/fonts/{name}") format("woff2");',
                        f"  unicode-range: {unicode_range(codepoints)};",
                        "}",
                    ])
                )

    if args.check:
        if stale:
            sys.exit(f"stale: {', '.join(stale)}. Rerun `bun run fonts` and commit the output.")
        print("fonts match the built site")
        return

    for old in FONTS_DIR.glob("*.woff2"):
        if old.name not in written and re.match(r"(sans|sans-italic|mono|lumber|geist-sans(?:-500|-600|-700)?|geist-italic|geist-mono|geist-serif)-(core|ext)\.[0-9a-f]{10}\.woff2$", old.name):
            old.unlink()
    header = "Generated by scripts/fonts/subset.py. Do not edit; rerun `bun run fonts`."
    CSS_OUT.write_text(f"/* {header} */\n\n" + "\n\n".join(rules) + "\n", "utf-8")
    entries = "\n".join(f'\t{re.sub(r"-(.)", lambda m: m.group(1).upper(), k)}: "{v}",' for k, v in preloads.items())
    TS_OUT.write_text(
        f"// {header}\n\n/** Core font files, which the layout preloads. */\nexport const FONT_PRELOADS = {{\n{entries}\n}} as const;\n",
        "utf-8",
    )


if __name__ == "__main__":
    main()
