# Uso: python3 apps/web/scripts/leopard.py apps/web/src/themes/bichota/assets
# Genera la tesela de leopardo del estilo «bichota»: rosetas negras con el centro
# dorado y brillante, y manchas sueltas. Se repite sin costuras (lo que sale por
# un borde entra por el contrario). Semilla fija: siempre la misma tesela.
import math, random, sys

def blob(cx, cy, r, rng, wobble=0.28, n=9):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r * (1 + rng.uniform(-wobble, wobble))
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a) * rng.uniform(0.75, 1.1)))
    # Curva cerrada suave por los puntos medios.
    d = []
    mids = [((pts[i][0] + pts[(i + 1) % n][0]) / 2, (pts[i][1] + pts[(i + 1) % n][1]) / 2) for i in range(n)]
    d.append(f"M{mids[-1][0]:.1f} {mids[-1][1]:.1f}")
    for i in range(n):
        d.append(f"Q{pts[i][0]:.1f} {pts[i][1]:.1f} {mids[i][0]:.1f} {mids[i][1]:.1f}")
    return ''.join(d) + 'Z'

def arc_blob(cx, cy, R, a0, a1, thick, rng):
    # Una mancha en forma de trozo de anillo: la piel negra de la roseta.
    steps = 6
    outer, inner = [], []
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        ro = R + thick / 2 * (1 + rng.uniform(-0.2, 0.25))
        ri = R - thick / 2 * (1 + rng.uniform(-0.2, 0.2))
        outer.append((cx + ro * math.cos(a), cy + ro * math.sin(a)))
        inner.append((cx + ri * math.cos(a), cy + ri * math.sin(a)))
    pts = outer + inner[::-1]
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(1, len(pts)):
        p, q = pts[i - 1], pts[i]
        d += f"Q{p[0]:.1f} {p[1]:.1f} {(p[0]+q[0])/2:.1f} {(p[1]+q[1])/2:.1f}"
    return d + 'Z'

def tile(size, seed, fg_black, glitter, gold=('#fff1a8', '#e9b730', '#a8740e')):
    rng = random.Random(seed)
    golds, blacks, sparks = [], [], []
    # Rosetas sueltas al azar, sin pisarse, contando que la tesela se repite.
    centers = []
    tries = 0
    while len(centers) < 9 and tries < 5000:
        tries += 1
        cx, cy = rng.uniform(0, size), rng.uniform(0, size)
        r = rng.uniform(size * 0.075, size * 0.105)
        def far(o):
            dx = min(abs(cx - o[0]), size - abs(cx - o[0]))
            dy = min(abs(cy - o[1]), size - abs(cy - o[1]))
            return math.hypot(dx, dy) > (r + o[2]) * 1.55
        if all(far(o) for o in centers):
            centers.append((cx, cy, r))
    for (cx, cy, r) in centers:
        shapes_g = [blob(cx, cy, r * 0.78, rng, 0.32, 10)]
        a = rng.uniform(0, 2 * math.pi)
        parts = rng.randint(2, 3)
        shapes_b = []
        for k in range(parts):
            span = 2 * math.pi / parts * rng.uniform(0.6, 0.85)
            start = a + 2 * math.pi * k / parts
            shapes_b.append(arc_blob(cx, cy, r * 1.05, start, start + span, r * 0.62, rng))
        sp = []
        for _ in range(16):
            ang = rng.uniform(0, 2 * math.pi); dist = rng.uniform(0, r * 0.5)
            sp.append((cx + dist * math.cos(ang), cy + dist * math.sin(ang), rng.uniform(0.7, 1.6)))
        # Copias desplazadas para que lo que cruza el borde siga al otro lado.
        for dx in (-size, 0, size):
            for dy in (-size, 0, size):
                if abs(cx + dx - size / 2) > size / 2 + r * 1.4 or abs(cy + dy - size / 2) > size / 2 + r * 1.4:
                    continue
                t = f'translate({dx} {dy})' if dx or dy else None
                g = ''.join(f'<path d="{d}"/>' for d in shapes_g)
                b = ''.join(f'<path d="{d}"/>' for d in shapes_b)
                s = ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.1f}"/>' for (x, y, rr) in sp)
                wrap = (lambda inner: f'<g transform="{t}">{inner}</g>') if t else (lambda inner: inner)
                golds.append(wrap(g)); blacks.append(wrap(b)); sparks.append(wrap(s))
    # Manchas sueltas, pequeñas.
    spots = []
    for _ in range(10):
        x, y, r = rng.uniform(0, size), rng.uniform(0, size), rng.uniform(5, 11)
        d = blob(x, y, r, rng, 0.35, 7)
        for dx in (-size, 0, size):
            for dy in (-size, 0, size):
                if -12 < x + dx < size + 12 and -12 < y + dy < size + 12:
                    spots.append(f'<path transform="translate({dx} {dy})" d="{d}"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="{gold[0]}"/><stop offset=".45" stop-color="{gold[1]}"/><stop offset="1" stop-color="{gold[2]}"/>
</linearGradient></defs>
<g fill="url(#g)">{''.join(golds)}</g>
<g fill="{glitter}" opacity=".85">{''.join(sparks)}</g>
<g fill="{fg_black}">{''.join(blacks)}{''.join(spots)}</g>
</svg>'''

out = sys.argv[1]
open(out + '/leopard.svg', 'w').write(tile(320, 7, '#140409', '#fffbe6'))
# Para el fondo claro de la página: las mismas manchas, en rosa y oro suave.
open(out + '/leopard-soft.svg', 'w').write(
    tile(320, 7, '#f7a8cf', '#fffdf2', ('#fff6d2', '#f3d27a', '#d9a94a'))
)
