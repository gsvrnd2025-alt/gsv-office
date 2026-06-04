import os
from PIL import Image, ImageDraw

src_path = 'C:/Users/GSVPC_F2/.gemini/antigravity/brain/416f0a4a-184e-4c37-a4ad-7a087b6c31d7/gsv_office_icon_1780533757908.png'
assets_dir = 'c:/Users/GSVPC_F2/Documents/A gsv office plugin/desktop-client/assets'
public_dir = 'c:/Users/GSVPC_F2/Documents/A gsv office plugin/frontend/public'

# Open source image and convert to RGBA
img = Image.open(src_path).convert('RGBA')

# 1. Save main icon.png (512x512)
icon_png_path = os.path.join(assets_dir, 'icon.png')
img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
img_512.save(icon_png_path, 'PNG')
print(f"Generated: {icon_png_path}")

# 2. Save icon.ico (multi-size ICO)
icon_ico_path = os.path.join(assets_dir, 'icon.ico')
img.save(icon_ico_path, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
print(f"Generated: {icon_ico_path}")

# 3. Save icon-16.png (16x16)
icon_16_path = os.path.join(assets_dir, 'icon-16.png')
img_16 = img.resize((16, 16), Image.Resampling.LANCZOS)
img_16.save(icon_16_path, 'PNG')
print(f"Generated: {icon_16_path}")

# 4. Save icon-tray.png (32x32)
icon_tray_path = os.path.join(assets_dir, 'icon-tray.png')
img_32 = img.resize((32, 32), Image.Resampling.LANCZOS)
img_32.save(icon_tray_path, 'PNG')
print(f"Generated: {icon_tray_path}")

# 5. Save favicon.ico (multi-size ICO in public folder)
favicon_ico_path = os.path.join(public_dir, 'favicon.ico')
img.save(favicon_ico_path, format='ICO', sizes=[(64, 64), (32, 32), (16, 16)])
print(f"Generated: {favicon_ico_path}")

# 6. Generate icon-online.png (with green circle)
img_online = img_512.copy()
draw_online = ImageDraw.Draw(img_online)
# Circle dimensions: center at (512-70, 512-70), radius 50
cx, cy, r = 512 - 70, 512 - 70, 50
# Draw a dark border for contrast, then the green fill
draw_online.ellipse([cx-r-5, cy-r-5, cx+r+5, cy+r+5], fill=(30, 41, 59, 255)) # Slate dark border
draw_online.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(34, 197, 94, 255)) # Green #22c55e
icon_online_path = os.path.join(assets_dir, 'icon-online.png')
img_online.save(icon_online_path, 'PNG')
print(f"Generated: {icon_online_path}")

# 7. Generate icon-offline.png (with red circle)
img_offline = img_512.copy()
draw_offline = ImageDraw.Draw(img_offline)
# Draw a dark border for contrast, then the red fill
draw_offline.ellipse([cx-r-5, cy-r-5, cx+r+5, cy+r+5], fill=(30, 41, 59, 255)) # Slate dark border
draw_offline.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(239, 68, 68, 255)) # Red #ef4444
icon_offline_path = os.path.join(assets_dir, 'icon-offline.png')
img_offline.save(icon_offline_path, 'PNG')
print(f"Generated: {icon_offline_path}")

print("Icons generation completed successfully!")
