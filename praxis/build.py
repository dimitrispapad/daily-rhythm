# Assembles PraxisAI into one HTML file: shell + styles + Rhythm plan + app code.
import pathlib
root = pathlib.Path(__file__).parent
src = root / "src"
shell = (src / "shell.html").read_text()
css = (src / "styles.css").read_text()
plan = (root.parent / "plan.js").read_text()
app = "\n".join((src / f).read_text() for f in ["1-core.js", "2-views.js", "3-app.js"])
out = shell.replace("/*CSS*/", css).replace("/*PLAN*/", plan).replace("/*APP*/", app)
(root / "index.html").write_text(out)
print(f"praxis/index.html: {len(out)//1024} KB")
