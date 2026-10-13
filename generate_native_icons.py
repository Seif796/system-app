import os
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

# 3. Update iOS native icons if ios folder exists
ios_appicon = os.path.join('ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset')
if os.path.exists(ios_appicon):
    for f in os.listdir(ios_appicon):
        if f.endswith('.png'):
            target_file = os.path.join(ios_appicon, f)
            try:
                with Image.open(target_file) as old_img:
                    old_sz = old_img.size
                img.resize(old_sz, Image.Resampling.LANCZOS).save(target_file, 'PNG')
                print(f"Replaced iOS icon: {f} ({old_sz[0]}x{old_sz[1]})")
            except Exception as e:
                print(f"Could not resize for {f}: {e}")
