"""Genera los íconos PNG de la PWA (requiere Pillow: pip install pillow).

Dibuja el logo de Cóbralo: una "C" blanca con un punto naranja sobre verde.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

GREEN = (15, 81, 50, 255)
ORANGE = (249, 115, 22, 255)
WHITE = (255, 255, 255, 255)
OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
SS = 8  # supersampling para bordes suaves


def draw_logo(size: int, rounded: bool, scale: float) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 14 / 64), fill=GREEN)
    else:
        d.rectangle([0, 0, s, s], fill=GREEN)

    u = s / 64 * scale  # unidad del viewBox 64x64, centrado
    off = s / 2 - 32 * u
    cx, cy, r, w = off + 32 * u, off + 32 * u, 13 * u, 6.5 * u
    # Arco de la "C": abierto hacia la derecha (de 47° a 313°)
    start, end = 47, 313
    box = [cx - r - w / 2, cy - r - w / 2, cx + r + w / 2, cy + r + w / 2]
    d.arc(box, start=start, end=end, fill=WHITE, width=int(w))
    for ang in (start, end):  # extremos redondeados
        x = cx + r * math.cos(math.radians(ang))
        y = cy + r * math.sin(math.radians(ang))
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=WHITE)
    dx, dy, dr = off + 44.5 * u, off + 32 * u, 4.5 * u
    d.ellipse([dx - dr, dy - dr, dx + dr, dy + dr], fill=ORANGE)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [
        ("icon-192.png", 192, True, 1.0),
        ("icon-512.png", 512, True, 1.0),
        ("maskable-512.png", 512, False, 0.78),
        ("apple-touch-icon.png", 180, False, 0.85),
    ]
    for name, size, rounded, scale in jobs:
        img = draw_logo(size, rounded, scale)
        if not rounded:
            img = img.convert("RGB")
        img.save(OUT / name, optimize=True)
        print("✓", name)
    draw_logo(48, True, 1.0).save(OUT.parent / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("✓ favicon.ico")


if __name__ == "__main__":
    main()
