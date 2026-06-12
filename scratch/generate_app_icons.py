import os
import sys
from PIL import Image, ImageDraw

def main():
    base_dir = r"c:\Users\GSVPC_F2\Documents\A gsv office plugin"
    logo_path = os.path.join(base_dir, "frontend", "public", "logo.png")
    
    if not os.path.exists(logo_path):
        print(f"Error: Logo file not found at {logo_path}")
        sys.exit(1)
        
    print(f"Loading base logo from {logo_path}")
    img = Image.open(logo_path).convert("RGBA")
    
    # 1. Autocrop the transparent margins to maximize visual size of the logo
    bbox = img.getbbox()
    if bbox:
        print(f"Autocropping image from {img.size} to {bbox[2]-bbox[0]}x{bbox[3]-bbox[1]}")
        cropped_img = img.crop(bbox)
        
        # Add a tiny 2% safety padding so it doesn't touch the absolute edge
        w, h = cropped_img.size
        pad_w = int(w * 0.02)
        pad_h = int(h * 0.02)
        
        padded_img = Image.new("RGBA", (w + 2*pad_w, h + 2*pad_h), (0, 0, 0, 0))
        padded_img.paste(cropped_img, (pad_w, pad_h))
        img = padded_img
    
    # Make square by adding padding to the shorter dimension to prevent distortion
    w, h = img.size
    size = max(w, h)
    square_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    square_img.paste(img, ((size - w) // 2, (size - h) // 2))
    img = square_img
    
    print(f"Prepared square logo of size {img.size} for scaling.")

    # Helper function to resize and save
    def save_resized(image, dest_path, width, height):
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        # Use High-quality LANCZOS resizing
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        resized.save(dest_path, "PNG")
        print(f"Saved: {dest_path} ({width}x{height})")

    # Helper function to add status badge
    def add_status_badge(image, color_hex):
        badge_img = image.copy()
        w, h = badge_img.size
        draw = ImageDraw.Draw(badge_img)
        
        # Badge dimensions relative to image size
        r = int(w * 0.22)
        center_x = int(w * 0.78)
        center_y = int(h * 0.78)
        
        # Outer dark ring
        draw.ellipse([center_x - r, center_y - r, center_x + r, center_y + r], fill="#0f172a", outline="#1e293b", width=int(max(1, w * 0.03)))
        # Inner status circle
        inner_r = int(r * 0.7)
        draw.ellipse([center_x - inner_r, center_y - inner_r, center_x + inner_r, center_y + inner_r], fill=color_hex)
        return badge_img

    # ─── 2. Generate Android Launcher Icons ─────────────────────────────────────
    android_res_dir = os.path.join(base_dir, "gsv-office-client", "android", "app", "src", "main", "res")
    android_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }
    for folder, sz in android_sizes.items():
        dest = os.path.join(android_res_dir, folder, "ic_launcher.png")
        save_resized(img, dest, sz, sz)

    # ─── 3. Generate iOS App Icons ──────────────────────────────────────────────
    ios_icons_dir = os.path.join(base_dir, "gsv-office-client", "ios", "Runner", "Assets.xcassets", "AppIcon.appiconset")
    ios_sizes = {
        "Icon-App-20x20@1x.png": 20,
        "Icon-App-20x20@2x.png": 40,
        "Icon-App-20x20@3x.png": 60,
        "Icon-App-29x29@1x.png": 29,
        "Icon-App-29x29@2x.png": 58,
        "Icon-App-29x29@3x.png": 87,
        "Icon-App-40x40@1x.png": 40,
        "Icon-App-40x40@2x.png": 80,
        "Icon-App-40x40@3x.png": 120,
        "Icon-App-60x60@2x.png": 120,
        "Icon-App-60x60@3x.png": 180,
        "Icon-App-76x76@1x.png": 76,
        "Icon-App-76x76@2x.png": 152,
        "Icon-App-83.5x83.5@2x.png": 167,
        "Icon-App-1024x1024@1x.png": 1024
    }
    for filename, sz in ios_sizes.items():
        dest = os.path.join(ios_icons_dir, filename)
        save_resized(img, dest, sz, sz)

    # ─── 4. Generate Desktop Client Icons ───────────────────────────────────────
    desktop_assets_dir = os.path.join(base_dir, "desktop-client", "assets")
    
    # icon.png (256x256)
    save_resized(img, os.path.join(desktop_assets_dir, "icon.png"), 256, 256)
    
    # icon-16.png (16x16)
    save_resized(img, os.path.join(desktop_assets_dir, "icon-16.png"), 16, 16)
    
    # icon-tray.png (32x32)
    save_resized(img, os.path.join(desktop_assets_dir, "icon-tray.png"), 32, 32)
    
    # icon-online.png (256x256) with green status dot
    online_img = add_status_badge(img, "#22c55e")
    save_resized(online_img, os.path.join(desktop_assets_dir, "icon-online.png"), 256, 256)
    
    # icon-offline.png (256x256) with gray status dot
    offline_img = add_status_badge(img, "#ef4444")
    save_resized(offline_img, os.path.join(desktop_assets_dir, "icon-offline.png"), 256, 256)
    
    # icon.ico containing multi-resolutions
    ico_dest = os.path.join(desktop_assets_dir, "icon.ico")
    ico_sizes = [256, 128, 64, 48, 32, 16]
    ico_frames = []
    for sz in ico_sizes:
      ico_frames.append(img.resize((sz, sz), Image.Resampling.LANCZOS))
    ico_frames[0].save(ico_dest, format="ICO", sizes=[(sz, sz) for sz in ico_sizes], append_images=ico_frames[1:])
    print(f"Saved: {ico_dest} (multi-resolution ICO)")

    print("\nSUCCESS: All icons generated and visually scaled up successfully!")

if __name__ == "__main__":
    main()
