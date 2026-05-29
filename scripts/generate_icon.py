#!/usr/bin/env python3
"""Generate a modern app icon for Expense Tracker AI."""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import os

SIZES = {
    'icon.png': 1024,
    'adaptive-icon.png': 1024,
}

COLORS = {
    'bg_start': (108, 92, 231),      # #6C5CE7 - primary
    'bg_end': (162, 155, 254),       # #A29BFE - lighter purple
    'accent': (255, 255, 255),       # white
    'accent2': (0, 184, 148),        # #00B894 - green
    'accent3': (255, 107, 107),      # #FF6B6B - red
}

def create_gradient(size, color_start, color_end):
    """Create a vertical gradient background."""
    img = Image.new('RGBA', (size, size))
    for y in range(size):
        ratio = y / size
        r = int(color_start[0] * (1 - ratio) + color_end[0] * ratio)
        g = int(color_start[1] * (1 - ratio) + color_end[1] * ratio)
        b = int(color_start[2] * (1 - ratio) + color_end[2] * ratio)
        for x in range(size):
            img.putpixel((x, y), (r, g, b, 255))
    return img

def draw_rounded_rect(draw, bbox, color, radius):
    """Draw a filled rounded rectangle."""
    x1, y1, x2, y2 = bbox
    draw.rounded_rectangle(bbox, radius=radius, fill=color)

def draw_income_arrow(draw, cx, cy, size, color):
    """Draw an upward green arrow (income)."""
    s = size
    points = [
        (cx, cy - s),           # top tip
        (cx - s*0.6, cy + s*0.2), # bottom-left
        (cx - s*0.2, cy + s*0.2), # inner left
        (cx - s*0.2, cy + s),     # bottom
        (cx + s*0.2, cy + s),     # bottom
        (cx + s*0.2, cy + s*0.2), # inner right
        (cx + s*0.6, cy + s*0.2), # bottom-right
    ]
    draw.polygon(points, fill=color)

def draw_expense_arrow(draw, cx, cy, size, color):
    """Draw a downward red arrow (expense)."""
    s = size
    points = [
        (cx, cy + s),           # bottom tip
        (cx - s*0.6, cy - s*0.2), # top-left
        (cx - s*0.2, cy - s*0.2), # inner left
        (cx - s*0.2, cy - s),     # top
        (cx + s*0.2, cy - s),     # top
        (cx + s*0.2, cy - s*0.2), # inner right
        (cx + s*0.6, cy - s*0.2), # top-right
    ]
    draw.polygon(points, fill=color)

def generate_icon(size):
    """Generate the main app icon."""
    img = create_gradient(size, COLORS['bg_start'], COLORS['bg_end'])
    draw = ImageDraw.Draw(img)

    c = size // 2
    s = size * 0.22  # base scale

    # --- Draw wallet shape ---
    wallet_w = size * 0.75
    wallet_h = size * 0.55
    wx = (size - wallet_w) / 2
    wy = (size - wallet_h) / 2

    # Wallet body
    draw_rounded_rect(draw, (wx, wy, wx + wallet_w, wy + wallet_h), (255, 255, 255, 240), int(size * 0.06))

    # Wallet stripe (card holder)
    stripe_y = wy + wallet_h * 0.3
    stripe_h = wallet_h * 0.12
    draw_rounded_rect(draw, 
        (wx + wallet_w * 0.1, stripe_y, wx + wallet_w * 0.85, stripe_y + stripe_h),
        (COLORS['bg_start'][0], COLORS['bg_start'][1], COLORS['bg_start'][2], 60),
        int(size * 0.03))

    # Circle coin/chart icon on wallet
    coin_cx = c
    coin_cy = wy + wallet_h * 0.65
    coin_r = wallet_w * 0.18

    # Outer circle
    draw.ellipse(
        [coin_cx - coin_r, coin_cy - coin_r, coin_cx + coin_r, coin_cy + coin_r],
        fill=COLORS['bg_start'][0:3] + (230,)
    )

    # Chart bar inside circle - 3 bars
    bar_w = coin_r * 0.2
    bar_gap = coin_r * 0.1
    bar_base = coin_cy + coin_r * 0.7
    bar_max_h = coin_r * 1.1

    bar1_h = bar_max_h * 0.5
    bar2_h = bar_max_h * 0.85
    bar3_h = bar_max_h * 0.65

    # Bar positions
    b1_x = coin_cx - bar_w - bar_gap // 2
    b2_x = coin_cx - bar_w // 2
    b3_x = coin_cx + bar_gap // 2

    colors = [COLORS['accent2'], (255, 255, 255, 230), COLORS['accent3']]
    bar_heights = [bar1_h, bar2_h, bar3_h]
    bar_xs = [b1_x, b2_x, b3_x]

    for bx, bh, bc in zip(bar_xs, bar_heights, colors):
        draw_rounded_rect(draw,
            (bx, bar_base - bh, bx + bar_w, bar_base),
            bc, int(bar_w * 0.3))

    # Small decorative sparkle dots
    dot_positions = [
        (wx + wallet_w * 0.9, wy + wallet_h * 0.15),
        (wx + wallet_w * 0.2, wy + wallet_h * 0.1),
        (wx + wallet_w * 0.75, wy + wallet_h * 0.35),
    ]
    for dx, dy in dot_positions:
        dot_r = size * 0.008
        draw.ellipse(
            [dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r],
            fill=(COLORS['accent2'][0], COLORS['accent2'][1], COLORS['accent2'][2], 120)
        )

    return img

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(os.path.dirname(script_dir), 'mobile', 'assets')

    print(f"Generating icons in: {assets_dir}")

    for filename, size in SIZES.items():
        print(f"  Creating {filename} ({size}x{size})...")
        img = generate_icon(size)
        # Add soft shadow by applying a slight blur on a copy
        output_path = os.path.join(assets_dir, filename)
        img.save(output_path, 'PNG')
        print(f"    Saved to {output_path}")

    # Also generate favicon (smaller)
    favicon_path = os.path.join(assets_dir, 'favicon.png')
    print(f"  Creating favicon.png (48x48)...")
    favicon = generate_icon(48)
    favicon.save(favicon_path, 'PNG')
    print(f"    Saved to {favicon_path}")

    # Generate notification icon
    notif_path = os.path.join(assets_dir, 'notification-icon.png')
    print(f"  Creating notification-icon.png (96x96)...")
    notif_icon = generate_icon(96)
    notif_icon.save(notif_path, 'PNG')
    print(f"    Saved to {notif_path}")

    print("Done! All icons generated.")

if __name__ == '__main__':
    main()
