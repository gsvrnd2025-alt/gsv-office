import os
from PIL import Image, ImageDraw

src_path = 'c:/Users/GSVPC_F2/Documents/A gsv office plugin/frontend/src/assets/gsvlogo.png'
assets_dir = 'c:/Users/GSVPC_F2/Documents/A gsv office plugin/desktop-client/assets'
public_dir = 'c:/Users/GSVPC_F2/Documents/A gsv office plugin/frontend/public'

# Open the original 600x400 logo
img_logo = Image.open(src_path).convert('RGBA')
width, height = img_logo.size

# Pad to a square (600x600) with transparent background
square_size = max(width, height)
img_square = Image.new('RGBA', (square_size, square_size), (0, 0, 0, 0))
# Calculate offset to center the logo
offset_x = (square_size - width) // 2
offset_y = (square_size - height) // 2
img_square.paste(img_logo, (offset_x, offset_y))

# 1. Save main icon.png (512x512)
icon_png_path = os.path.join(assets_dir, 'icon.png')
img_512 = img_square.resize((512, 512), Image.Resampling.LANCZOS)
img_512.save(icon_png_path, 'PNG')
print(f"Generated: {icon_png_path}")

# 2. Save icon.ico (multi-size ICO)
icon_ico_path = os.path.join(assets_dir, 'icon.ico')
img_square.save(icon_ico_path, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
print(f"Generated: {icon_ico_path}")

# 3. Save icon-16.png (16x16)
icon_16_path = os.path.join(assets_dir, 'icon-16.png')
img_16 = img_square.resize((16, 16), Image.Resampling.LANCZOS)
img_16.save(icon_16_path, 'PNG')
print(f"Generated: {icon_16_path}")

# 4. Save icon-tray.png (32x32)
icon_tray_path = os.path.join(assets_dir, 'icon-tray.png')
img_32 = img_square.resize((32, 32), Image.Resampling.LANCZOS)
img_32.save(icon_tray_path, 'PNG')
print(f"Generated: {icon_tray_path}")

# 5. Save favicon.ico (multi-size ICO in public folder)
favicon_ico_path = os.path.join(public_dir, 'favicon.ico')
img_square.save(favicon_ico_path, format='ICO', sizes=[(64, 64), (32, 32), (16, 16)])
print(f"Generated: {favicon_ico_path}")

# 6. Generate icon-online.png (with green circle)
img_online = img_512.copy()
draw_online = ImageDraw.Draw(img_online)
# Draw status indicator dot on bottom right
cx, cy, r = 512 - 70, 512 - 70, 50
draw_online.ellipse([cx-r-5, cy-r-5, cx+r+5, cy+r+5], fill=(30, 41, 59, 255)) # Dark border
draw_online.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(34, 197, 94, 255)) # Green #22c55e
icon_online_path = os.path.join(assets_dir, 'icon-online.png')
img_online.save(icon_online_path, 'PNG')
print(f"Generated: {icon_online_path}")

# 7. Generate icon-offline.png (with red circle)
img_offline = img_512.copy()
draw_offline = ImageDraw.Draw(img_offline)
draw_offline.ellipse([cx-r-5, cy-r-5, cx+r+5, cy+r+5], fill=(30, 41, 59, 255)) # Dark border
draw_offline.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(239, 68, 68, 255)) # Red #ef4444
icon_offline_path = os.path.join(assets_dir, 'icon-offline.png')
img_offline.save(icon_offline_path, 'PNG')
print(f"Generated: {icon_offline_path}")

print("Icons generation completed successfully!")
