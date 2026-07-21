"""
Pure-Python tabBar icon generator (no third-party deps).
Generates 81x81 RGBA PNGs for WeChat miniapp tabBar:
  home, match, team, notification, profile
Each in two colors: normal (#999999) and active (#e94560).
"""
import struct
import zlib
import os
import math

SIZE = 81
OUT_DIR = os.path.join(os.path.dirname(__file__), "tabbar")

NORMAL = (0x99, 0x99, 0x99)
ACTIVE = (0xe9, 0x45, 0x60)


def make_canvas():
    """RGBA canvas, all transparent."""
    return [[(0, 0, 0, 0)] * SIZE for _ in range(SIZE)]


def set_pixel(canvas, x, y, color):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        r, g, b = color
        canvas[y][x] = (r, g, b, 255)


def fill_circle(canvas, cx, cy, r, color):
    for y in range(SIZE):
        for x in range(SIZE):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                set_pixel(canvas, x, y, color)


def fill_ring(canvas, cx, cy, r_out, r_in, color):
    for y in range(SIZE):
        for x in range(SIZE):
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            if r_in * r_in <= d2 <= r_out * r_out:
                set_pixel(canvas, x, y, color)


def fill_rect(canvas, x1, y1, x2, y2, color):
    for y in range(max(0, y1), min(SIZE, y2 + 1)):
        for x in range(max(0, x1), min(SIZE, x2 + 1)):
            set_pixel(canvas, x, y, color)


def fill_rounded_rect(canvas, x1, y1, x2, y2, r, color):
    for y in range(max(0, y1), min(SIZE, y2 + 1)):
        for x in range(max(0, x1), min(SIZE, x2 + 1)):
            inside = False
            if x1 + r <= x <= x2 - r or y1 + r <= y <= y2 - r:
                inside = True
            else:
                for (ccx, ccy) in [(x1 + r, y1 + r), (x2 - r, y1 + r),
                                   (x1 + r, y2 - r), (x2 - r, y2 - r)]:
                    if (x - ccx) ** 2 + (y - ccy) ** 2 <= r * r:
                        inside = True
                        break
            if inside:
                set_pixel(canvas, x, y, color)


def draw_thick_line(canvas, x1, y1, x2, y2, thick, color):
    """Draw a line with given thickness by stamping circles along it."""
    length = math.hypot(x2 - x1, y2 - y1)
    steps = max(int(length), 1)
    for i in range(steps + 1):
        t = i / steps
        x = x1 + (x2 - x1) * t
        y = y1 + (y2 - y1) * t
        r = thick // 2
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r:
                    set_pixel(canvas, int(x) + dx, int(y) + dy, color)


def draw_home(canvas, color):
    # House: triangle roof + square body + door
    # Roof
    draw_thick_line(canvas, 12, 42, 40, 18, 6, color)
    draw_thick_line(canvas, 40, 18, 68, 42, 6, color)
    # Body (outline)
    draw_thick_line(canvas, 20, 40, 20, 66, 5, color)
    draw_thick_line(canvas, 60, 40, 60, 66, 5, color)
    draw_thick_line(canvas, 20, 66, 60, 66, 5, color)
    # Door
    draw_thick_line(canvas, 35, 66, 35, 52, 4, color)
    draw_thick_line(canvas, 45, 66, 45, 52, 4, color)
    draw_thick_line(canvas, 35, 52, 45, 52, 4, color)


def draw_trophy(canvas, color):
    # Trophy: cup + handles + base
    # Cup body (outline)
    draw_thick_line(canvas, 28, 14, 52, 14, 4, color)  # top
    draw_thick_line(canvas, 28, 14, 30, 34, 4, color)  # left side
    draw_thick_line(canvas, 52, 14, 50, 34, 4, color)  # right side
    draw_thick_line(canvas, 30, 34, 50, 34, 4, color)  # bottom of cup
    # Handles
    draw_thick_line(canvas, 28, 18, 20, 22, 3, color)
    draw_thick_line(canvas, 20, 22, 20, 28, 3, color)
    draw_thick_line(canvas, 20, 28, 28, 30, 3, color)
    draw_thick_line(canvas, 52, 18, 60, 22, 3, color)
    draw_thick_line(canvas, 60, 22, 60, 28, 3, color)
    draw_thick_line(canvas, 60, 28, 52, 30, 3, color)
    # Stem
    draw_thick_line(canvas, 40, 34, 40, 48, 4, color)
    # Base
    draw_thick_line(canvas, 28, 48, 52, 48, 4, color)
    draw_thick_line(canvas, 26, 54, 54, 54, 5, color)
    draw_thick_line(canvas, 30, 48, 30, 54, 4, color)
    draw_thick_line(canvas, 50, 48, 50, 54, 4, color)


def draw_team(canvas, color):
    # Two people side by side
    # Left person
    fill_circle(canvas, 27, 24, 8, color)
    draw_thick_line(canvas, 14, 60, 14, 44, 8, color)
    draw_thick_line(canvas, 40, 60, 40, 44, 8, color)
    draw_thick_line(canvas, 14, 44, 40, 44, 8, color)
    draw_thick_line(canvas, 14, 60, 40, 60, 8, color)
    # Right person
    fill_circle(canvas, 54, 24, 8, color)
    draw_thick_line(canvas, 41, 60, 41, 44, 8, color)
    draw_thick_line(canvas, 67, 60, 67, 44, 8, color)
    draw_thick_line(canvas, 41, 44, 67, 44, 8, color)
    draw_thick_line(canvas, 41, 60, 67, 60, 8, color)


def draw_bell(canvas, color):
    # Bell shape
    # Top nub
    fill_circle(canvas, 40, 12, 3, color)
    # Bell body - drawn as filled shape using arcs
    for y in range(14, 56):
        for x in range(SIZE):
            d = (x - 40) ** 2
            # widening bell
            half_w = 6 + (y - 14) * 0.7
            if d <= half_w * half_w and y < 52:
                set_pixel(canvas, x, y, color)
    # Bell rim (wider bottom)
    fill_rect(canvas, 24, 50, 56, 56, color)
    # Clapper (bottom center)
    fill_circle(canvas, 40, 62, 5, color)
    draw_thick_line(canvas, 40, 56, 40, 60, 4, color)


def draw_profile(canvas, color):
    # Head + shoulders
    fill_circle(canvas, 40, 26, 13, color)
    # Shoulders (half ellipse)
    for y in range(44, 70):
        for x in range(SIZE):
            rx = 22
            ry = 16
            cx, cy = 40, 62
            dx = (x - cx) / rx
            dy = (y - cy) / ry
            if dx * dx + dy * dy <= 1 and y < 68:
                set_pixel(canvas, x, y, color)


ICONS = {
    "home": draw_home,
    "match": draw_trophy,
    "team": draw_team,
    "notification": draw_bell,
    "profile": draw_profile,
}


def write_png(canvas, path):
    """Write RGBA canvas as PNG using only stdlib."""
    width = height = SIZE
    # Build raw image data with filter byte per scanline
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter: None
        for x in range(width):
            r, g, b, a = canvas[y][x]
            raw.extend((r, g, b, a))

    def chunk(ctype, data):
        c = ctype + data
        crc = struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + c + crc

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""  )
    with open(path, "wb") as f:
        f.write(png)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, draw_fn in ICONS.items():
        # Normal (gray)
        c1 = make_canvas()
        draw_fn(c1, NORMAL)
        p1 = os.path.join(OUT_DIR, f"{name}.png")
        write_png(c1, p1)
        # Active (red)
        c2 = make_canvas()
        draw_fn(c2, ACTIVE)
        p2 = os.path.join(OUT_DIR, f"{name}-active.png")
        write_png(c2, p2)
        print(f"  {name}.png + {name}-active.png")
    print(f"\nDone. {len(ICONS) * 2} icons written to {OUT_DIR}")


if __name__ == "__main__":
    main()
