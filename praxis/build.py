# Builds PraxisAI two ways from the same source:
#   praxis/index.html  the page published as a private app on claude.ai
#   praxis/app/        the standalone app (Netlify or GitHub Pages): same app + standalone.js,
#                      which swaps claude.ai's storage and Claude for your own sync and Gemini
import pathlib, re, shutil
root = pathlib.Path(__file__).parent
src = root / "src"
shell = (src / "shell.html").read_text()
css = (src / "styles.css").read_text()
plan = (root.parent / "plan.js").read_text()
app = "\n".join((src / f).read_text() for f in ["1-core.js", "2-views.js", "2b-food.js", "3-app.js", "4-food.js"])

out = shell.replace("/*CSS*/", css).replace("/*PLAN*/", plan).replace("/*APP*/", app)
(root / "index.html").write_text(out)
print(f"praxis/index.html: {len(out)//1024} KB")

# ---- standalone ----
SWAPS = {  # wording that only makes sense on claude.ai
    "You're outside claude.ai, so changes are saved in this browser only.": "Saved on this device only. See Settings to sync your phone and laptop.",
    "Synced with claude.ai on all your devices": "Synced on all your devices",
    "Saved on this device only (open PraxisAI on claude.ai to sync)": "Saved on this device only",
    "Backup download works on claude.ai.": "",
}
sa = app
for old, new in SWAPS.items():
    assert old in sa, f"standalone wording not found: {old}"
    sa = sa.replace(old, new)
sa = re.sub(r"\bClaude\b(?!\.ai)", "Gemini", sa)  # the AI here is Gemini
extra_css = """
#sa-lock{position:fixed;inset:0;z-index:200;background:var(--bg);display:grid;place-items:center;padding:24px}
.sa-box{display:flex;flex-direction:column;gap:12px;width:min(340px,100%);text-align:center;align-items:stretch}
.sa-box svg{align-self:center}.sa-box h1{margin:0}.sa-box p{margin:0;color:var(--muted)}
body{margin:0}[hidden]{display:none!important}
"""
body = shell.replace("/*CSS*/", css + extra_css).replace("<script>\n/*PLAN*/", "<script>\n" + (src / "standalone.js").read_text() + "\n</script>\n<script>\n/*PLAN*/").replace("/*PLAN*/", plan).replace("/*APP*/", sa)
assert "window.__standalone" in body
title_end = body.index("</style>") + len("</style>")
head, rest = body[:title_end], body[title_end:]
doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F3F6FA" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0A1035" media="(prefers-color-scheme: dark)">
<meta name="robots" content="noindex,nofollow">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="PraxisAI">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
{head}
</head>
<body>
{rest}
</body>
</html>
"""
dest = root / "app"
(dest / "icons").mkdir(parents=True, exist_ok=True)
(dest / "index.html").write_text(doc)
for f in ["sw.js", "manifest.webmanifest"]:
    shutil.copy(src / f, dest / f)
for f in (src / "icons").glob("*.png"):
    shutil.copy(f, dest / "icons" / f.name)
print(f"praxis/app/index.html: {len(doc)//1024} KB")
