import os
import math
from PIL import Image, ImageDraw

os.makedirs("icons", exist_ok=True)

def create_glowing_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    
    center = size / 2.0
    radius = size * 0.36
    
    # Draw outer glow rings
    num_glow_rings = int(size * 0.12)
    for i in range(num_glow_rings, 0, -1):
        r = radius + i * (size * 0.008)
        alpha = int(40 * (1.0 - (i / num_glow_rings)))
        draw.ellipse(
            [center - r, center - r, center + r, center + r],
            outline=(0, 180, 255, alpha),
            width=int(max(1, size * 0.01))
        )
        
    # Draw main glowing circle border
    border_width = max(2, int(size * 0.04))
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        fill=(5, 20, 35, 255),
        outline=(0, 210, 255, 255),
        width=border_width
    )
    
    # Inner subtle glow
    inner_r = radius * 0.85
    draw.ellipse(
        [center - inner_r, center - inner_r, center + inner_r, center + inner_r],
        fill=(0, 45, 80, 180),
        outline=(0, 150, 255, 100),
        width=max(1, int(size * 0.015))
    )
    
    # Plus sign
    plus_len = size * 0.22
    plus_thick = max(3, int(size * 0.05))
    
    # Horizontal line
    draw.rounded_rectangle(
        [center - plus_len, center - plus_thick / 2, center + plus_len, center + plus_thick / 2],
        radius=plus_thick / 2,
        fill=(255, 255, 255, 255)
    )
    # Vertical line
    draw.rounded_rectangle(
        [center - plus_thick / 2, center - plus_len, center + plus_thick / 2, center + plus_len],
        radius=plus_thick / 2,
        fill=(255, 255, 255, 255)
    )
    
    return img

sizes = {
    "icon-192.png": 192,
    "icon-512.png": 512,
    "apple-touch-icon.png": 180,
    "favicon.png": 64
}

for name, s in sizes.items():
    icon = create_glowing_icon(s)
    icon.save(os.path.join("icons", name), "PNG")
    print(f"Generated {name} ({s}x{s})")

