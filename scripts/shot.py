import sys, asyncio
from playwright.sync_api import sync_playwright
rota = sys.argv[1] if len(sys.argv) > 1 else "/"
saida = sys.argv[2] if len(sys.argv) > 2 else "/tmp/shots/x.png"
w = int(sys.argv[3]) if len(sys.argv) > 3 else 1440
espera = int(sys.argv[4]) if len(sys.argv) > 4 else 2500
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    pg = b.new_page(viewport={"width": w, "height": int(sys.argv[5]) if len(sys.argv)>5 else 900})
    logs = []
    pg.on("console", lambda m: logs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: logs.append(f"[pageerror] {e}"))
    pg.goto("http://localhost:5173" + rota, wait_until="networkidle")
    pg.wait_for_timeout(espera)
    pg.screenshot(path=saida, full_page=False)
    print("\n".join(logs[:15]))
    b.close()
