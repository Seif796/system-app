import os
import json
import shutil
from PIL import Image

LOGO_PATH = 'Black and White Bold Clothing Brand Typographic Logo.png'
if not os.path.exists(LOGO_PATH):
    LOGO_PATH = 'app-icon.png'

img = Image.open(LOGO_PATH).convert('RGBA')

# 1. Update web/PWA icons
os.makedirs('icons', exist_ok=True)
pwa_sizes = {
    'icons/icon-192.png': (192, 192),
    'icons/icon-512.png': (512, 512),
    'icons/apple-touch-icon.png': (180, 180),
    'icons/favicon.png': (64, 64)
}
for path, sz in pwa_sizes.items():
    img.resize(sz, Image.Resampling.LANCZOS).save(path, 'PNG')
img.resize((512, 512), Image.Resampling.LANCZOS).save('app-icon.png', 'PNG')
print("PWA & Web icons generated.")

# 2. Update Android native icons if android folder exists
android_res = os.path.join('android', 'app', 'src', 'main', 'res')
if os.path.exists(android_res):
    mipmap_sizes = {
        'mipmap-mdpi': (48, 48),
        'mipmap-hdpi': (72, 72),
        'mipmap-xhdpi': (96, 96),
        'mipmap-xxhdpi': (144, 144),
        'mipmap-xxxhdpi': (192, 192)
    }
    for folder, sz in mipmap_sizes.items():
        folder_path = os.path.join(android_res, folder)
        os.makedirs(folder_path, exist_ok=True)
        resized = img.resize(sz, Image.Resampling.LANCZOS)
        resized.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')
        resized.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')
        resized.save(os.path.join(folder_path, 'ic_launcher_foreground.png'), 'PNG')
        print(f"Generated Android icons in {folder}")

# 3. Update iOS native icons and CarPlay Car icons if ios folder exists
ios_appicon = os.path.join('ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset')
if os.path.exists(ios_appicon):
    # Standard iPhone icons
    for f in os.listdir(ios_appicon):
        if f.endswith('.png'):
            target_file = os.path.join(ios_appicon, f)
            try:
                with Image.open(target_file) as old_img:
                    old_sz = old_img.size
                img.resize(old_sz, Image.Resampling.LANCZOS).save(target_file, 'PNG')
                print(f"Replaced iOS icon: {f} ({old_sz[0]}x{old_sz[1]})")
            except Exception as e:
                pass

    # Specific CarPlay Car Icons (60pt @2x = 120px, 60pt @3x = 180px)
    car_icons = {
        'AppIcon-Car-60@2x.png': (120, 120),
        'AppIcon-Car-60@3x.png': (180, 180)
    }
    for name, sz in car_icons.items():
        car_path = os.path.join(ios_appicon, name)
        img.resize(sz, Image.Resampling.LANCZOS).save(car_path, 'PNG')
        print(f"Generated CarPlay Car Icon: {name} ({sz[0]}x{sz[1]})")

    # Update Contents.json with CarPlay entries
    contents_path = os.path.join(ios_appicon, 'Contents.json')
    if os.path.exists(contents_path):
        try:
            with open(contents_path, 'r', encoding='utf-8') as f:
                cdata = json.load(f)

            existing_files = {item.get('filename') for item in cdata.get('images', [])}
            if 'AppIcon-Car-60@2x.png' not in existing_files:
                cdata['images'].append({
                    "size": "60x60",
                    "idiom": "car",
                    "filename": "AppIcon-Car-60@2x.png",
                    "scale": "2x"
                })
            if 'AppIcon-Car-60@3x.png' not in existing_files:
                cdata['images'].append({
                    "size": "60x60",
                    "idiom": "car",
                    "filename": "AppIcon-Car-60@3x.png",
                    "scale": "3x"
                })

            with open(contents_path, 'w', encoding='utf-8') as f:
                json.dump(cdata, f, indent=2)
            print("Updated iOS Contents.json with CarPlay icons.")
        except Exception as e:
            print("Error updating Contents.json:", e)
