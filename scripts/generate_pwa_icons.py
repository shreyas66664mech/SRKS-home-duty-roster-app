import zlib
import struct
import math
import os

def create_png(width, height, draw_fn):
    # PNG signature
    png = bytearray(b'\x89PNG\r\n\x1a\n')

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png.extend(struct.pack('>I', len(ihdr_data)))
    png.extend(b'IHDR')
    png.extend(ihdr_data)
    png.extend(struct.pack('>I', ihdr_crc))

    # Raw scanlines with RGBA (filter type 0)
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            r, g, b, a = draw_fn(x, y, width, height)
            raw_data.extend([r, g, b, a])

    # IDAT chunk
    compressed = zlib.compress(bytes(raw_data), 9)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png.extend(struct.pack('>I', len(compressed)))
    png.extend(b'IDAT')
    png.extend(compressed)
    png.extend(struct.pack('>I', idat_crc))

    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    png.extend(struct.pack('>I', 0))
    png.extend(b'IEND')
    png.extend(struct.pack('>I', iend_crc))

    return bytes(png)

def draw_icon(x, y, w, h):
    # Center coordinates
    cx, cy = w / 2.0, h / 2.0
    dx = x - cx
    dy = y - cy
    dist = math.sqrt(dx * dx + dy * dy)
    r_max = min(w, h) / 2.0

    # Base background: Deep sleek navy gradient (#0a1526 -> #040914)
    factor_y = y / float(h)
    bg_r = int(10 * (1 - factor_y) + 4 * factor_y)
    bg_g = int(21 * (1 - factor_y) + 9 * factor_y)
    bg_b = int(38 * (1 - factor_y) + 20 * factor_y)

    # Rounded rectangle border check
    corner_r = w * 0.22
    in_box = True
    if x < corner_r and y < corner_r:
        if math.hypot(x - corner_r, y - corner_r) > corner_r: in_box = False
    elif x > w - corner_r and y < corner_r:
        if math.hypot(x - (w - corner_r), y - corner_r) > corner_r: in_box = False
    elif x < corner_r and y > h - corner_r:
        if math.hypot(x - corner_r, y - (h - corner_r)) > corner_r: in_box = False
    elif x > w - corner_r and y > h - corner_r:
        if math.hypot(x - (w - corner_r), y - (h - corner_r)) > corner_r: in_box = False

    if not in_box:
        return (0, 0, 0, 0)

    # Gold ring at radius 0.62 * r_max
    ring_r = r_max * 0.60
    ring_thick = r_max * 0.06
    if abs(dist - ring_r) < ring_thick:
        # Amber/gold
        return (245, 158, 11, 255)

    # Inner circular emblem center
    if dist < ring_r - ring_thick:
        # Glowing dark center
        emblem_bg = 12
        # OM / Emblem stylization: Draw central gold motif
        # Main vertical/curved strokes of 3 / Om shape
        norm_x = dx / (ring_r * 0.7)
        norm_y = (dy + r_max * 0.05) / (ring_r * 0.7)

        # Draw artistic OM-inspired geometry with gold strokes
        is_stroke = False
        # Upper loop
        if -0.7 < norm_x < 0.6 and -0.7 < norm_y < -0.05:
            d_loop1 = math.hypot(norm_x + 0.1, norm_y + 0.38)
            if 0.22 < d_loop1 < 0.36: is_stroke = True
        # Lower loop
        if -0.7 < norm_x < 0.7 and -0.1 < norm_y < 0.75:
            d_loop2 = math.hypot(norm_x + 0.05, norm_y - 0.32)
            if 0.25 < d_loop2 < 0.42: is_stroke = True
        # Right tail
        if 0.2 < norm_x < 0.85 and -0.25 < norm_y < 0.5:
            d_tail = math.hypot(norm_x - 0.45, norm_y - 0.1)
            if 0.22 < d_tail < 0.34: is_stroke = True
        # Crescent and dot on top
        if -0.1 < norm_x < 0.65 and -0.85 < norm_y < -0.55:
            d_cres = math.hypot(norm_x - 0.3, norm_y + 0.65)
            if 0.15 < d_cres < 0.25 and norm_y > -0.7: is_stroke = True
            d_dot = math.hypot(norm_x - 0.3, norm_y + 0.85)
            if d_dot < 0.09: is_stroke = True

        if is_stroke:
            return (251, 191, 36, 255) # Bright amber #fbbf24

        return (7, 17, 32, 255)

    # Outer border line
    margin = w * 0.04
    if (x < margin or x > w - margin or y < margin or y > h - margin) and in_box:
        return (245, 158, 11, 200)

    # Bottom badge text bar representation
    if 0.70 * h < y < 0.84 * h and 0.20 * w < x < 0.80 * w:
        return (15, 35, 63, 255)

    # Live sync green dot (top right)
    dot_cx = w * 0.82
    dot_cy = h * 0.18
    if math.hypot(x - dot_cx, y - dot_cy) < r_max * 0.10:
        return (16, 185, 129, 255) # Emerald 500

    return (bg_r, bg_g, bg_b, 255)

def draw_maskable_icon(x, y, w, h):
    # Full bleed background for Android maskable icon (safe zone inside 80% circle)
    factor_y = y / float(h)
    bg_r = int(10 * (1 - factor_y) + 4 * factor_y)
    bg_g = int(21 * (1 - factor_y) + 9 * factor_y)
    bg_b = int(38 * (1 - factor_y) + 20 * factor_y)

    cx, cy = w / 2.0, h / 2.0
    dx = x - cx
    dy = y - cy
    dist = math.hypot(dx, dy)
    r_max = (min(w, h) / 2.0) * 0.75 # scaled down for safe zone

    # Gold ring
    ring_r = r_max * 0.65
    ring_thick = r_max * 0.07
    if abs(dist - ring_r) < ring_thick:
        return (245, 158, 11, 255)

    if dist < ring_r - ring_thick:
        norm_x = dx / (ring_r * 0.7)
        norm_y = (dy + r_max * 0.05) / (ring_r * 0.7)
        is_stroke = False
        if -0.7 < norm_x < 0.6 and -0.7 < norm_y < -0.05:
            d_loop1 = math.hypot(norm_x + 0.1, norm_y + 0.38)
            if 0.22 < d_loop1 < 0.36: is_stroke = True
        if -0.7 < norm_x < 0.7 and -0.1 < norm_y < 0.75:
            d_loop2 = math.hypot(norm_x + 0.05, norm_y - 0.32)
            if 0.25 < d_loop2 < 0.42: is_stroke = True
        if 0.2 < norm_x < 0.85 and -0.25 < norm_y < 0.5:
            d_tail = math.hypot(norm_x - 0.45, norm_y - 0.1)
            if 0.22 < d_tail < 0.34: is_stroke = True
        if -0.1 < norm_x < 0.65 and -0.85 < norm_y < -0.55:
            d_cres = math.hypot(norm_x - 0.3, norm_y + 0.65)
            if 0.15 < d_cres < 0.25 and norm_y > -0.7: is_stroke = True
            d_dot = math.hypot(norm_x - 0.3, norm_y + 0.85)
            if d_dot < 0.09: is_stroke = True

        if is_stroke:
            return (251, 191, 36, 255)
        return (7, 17, 32, 255)

    return (bg_r, bg_g, bg_b, 255)

os.makedirs('public', exist_ok=True)

print("Generating 192x192 PNG...")
p192 = create_png(192, 192, draw_icon)
with open('public/pwa-192x192.png', 'wb') as f:
    f.write(p192)

print("Generating 512x512 PNG...")
p512 = create_png(512, 512, draw_icon)
with open('public/pwa-512x512.png', 'wb') as f:
    f.write(p512)

print("Generating 512x512 maskable PNG...")
pmask = create_png(512, 512, draw_maskable_icon)
with open('public/pwa-maskable-512x512.png', 'wb') as f:
    f.write(pmask)

print("Generating apple-touch-icon.png...")
p180 = create_png(180, 180, draw_icon)
with open('public/apple-touch-icon.png', 'wb') as f:
    f.write(p180)

print("Generating favicon.ico (64x64 PNG format)...")
p64 = create_png(64, 64, draw_icon)
with open('public/favicon.ico', 'wb') as f:
    f.write(p64)

print("All PWA icons generated successfully!")
