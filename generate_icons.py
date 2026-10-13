import os
from PIL import Image

LOGO_PATH = "Black and White Bold Clothing Brand Typographic Logo.png"
os.makedirs("icons", exist_ok=True)

if os.path.exists(LOGO_PATH):
    img = Image.open(LOGO_PATH).convert("RGBA")
    sizes = {
        "icon-192.png": (192, 192),
        "icon-512.png": (512, 512),
        "apple-touch-icon.png": (180, 180),
        "favicon.png": (64, 64)
    }
    for name, s in sizes.items():
        img.resize(s, Image.Resampling.LANCZOS).save(os.path.join("icons", name), "PNG")
        print(f"Generated {name} from clothing brand logo")
    img.resize((512, 512), Image.Resampling.LANCZOS).save("app-icon.png", "PNG")
    print("Generated app-icon.png")
