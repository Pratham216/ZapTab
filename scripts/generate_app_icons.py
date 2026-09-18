import os
from PIL import Image, ImageOps

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_LOGO = os.path.join(BASE_DIR, "mobile", "assets", "zaptab-logo.png")
ASSETS_DIR = os.path.join(BASE_DIR, "mobile", "assets")
RES_DIR = os.path.join(BASE_DIR, "mobile", "android", "app", "src", "main", "res")

BG_COLOR = (10, 10, 10, 255) # #0a0a0a

def make_solid_bg(size, color=BG_COLOR):
    return Image.new("RGBA", size, color)

def make_transparent(size):
    return Image.new("RGBA", size, (0, 0, 0, 0))

def fit_centered(img, target_size, scale=0.75):
    target_w, target_h = target_size
    logo_w, logo_h = img.size
    
    # Calculate fit
    ratio = min(target_w / logo_w, target_h / logo_h) * scale
    new_w = max(1, int(logo_w * ratio))
    new_h = max(1, int(logo_h * ratio))
    
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Center on canvas
    canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
    x = (target_w - new_w) // 2
    y = (target_h - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas

def generate_icons():
    print(f"Loading source logo: {SRC_LOGO}")
    logo = Image.open(SRC_LOGO).convert("RGBA")
    
    # 1. mobile/assets/icon.png (1024x1024)
    print("Generating mobile/assets/icon.png (1024x1024)")
    icon_1024 = make_solid_bg((1024, 1024))
    centered_logo_1024 = fit_centered(logo, (1024, 1024), scale=0.72)
    icon_1024.paste(centered_logo_1024, (0, 0), centered_logo_1024)
    icon_1024.save(os.path.join(ASSETS_DIR, "icon.png"), "PNG")

    # 2. mobile/assets/android-icon-foreground.png (432x432)
    print("Generating mobile/assets/android-icon-foreground.png (432x432)")
    fg_432 = fit_centered(logo, (432, 432), scale=0.62)
    fg_432.save(os.path.join(ASSETS_DIR, "android-icon-foreground.png"), "PNG")

    # 3. mobile/assets/android-icon-background.png (432x432 solid #0a0a0a)
    print("Generating mobile/assets/android-icon-background.png (432x432)")
    bg_432 = make_solid_bg((432, 432))
    bg_432.save(os.path.join(ASSETS_DIR, "android-icon-background.png"), "PNG")

    # 4. mobile/assets/android-icon-monochrome.png (432x432)
    print("Generating mobile/assets/android-icon-monochrome.png (432x432)")
    mono_img = fg_432.copy()
    r, g, b, a = mono_img.split()
    white_img = Image.new("RGBA", mono_img.size, (255, 255, 255, 255))
    mono_result = Image.new("RGBA", mono_img.size, (0, 0, 0, 0))
    mono_result.paste(white_img, (0, 0), a)
    mono_result.save(os.path.join(ASSETS_DIR, "android-icon-monochrome.png"), "PNG")

    # 5. mobile/assets/favicon.png (64x64)
    print("Generating mobile/assets/favicon.png (64x64)")
    favicon_64 = fit_centered(logo, (64, 64), scale=0.92)
    favicon_64.save(os.path.join(ASSETS_DIR, "favicon.png"), "PNG")

    # 6. mobile/assets/splash-icon.png (256x256)
    print("Generating mobile/assets/splash-icon.png (256x256)")
    splash_256 = fit_centered(logo, (256, 256), scale=0.88)
    splash_256.save(os.path.join(ASSETS_DIR, "splash-icon.png"), "PNG")

    # 7. Android native mipmap densities
    densities = {
        "mipmap-mdpi": {"launcher": 48, "fg": 108},
        "mipmap-hdpi": {"launcher": 72, "fg": 162},
        "mipmap-xhdpi": {"launcher": 96, "fg": 216},
        "mipmap-xxhdpi": {"launcher": 144, "fg": 324},
        "mipmap-xxxhdpi": {"launcher": 192, "fg": 432},
    }

    print("Generating Android mipmap resources...")
    for folder, sizes in densities.items():
        dir_path = os.path.join(RES_DIR, folder)
        os.makedirs(dir_path, exist_ok=True)
        
        l_size = sizes["launcher"]
        fg_size = sizes["fg"]
        
        # Launcher icon (legacy full icon with #0a0a0a bg)
        launcher = make_solid_bg((l_size, l_size))
        l_logo = fit_centered(logo, (l_size, l_size), scale=0.74)
        launcher.paste(l_logo, (0, 0), l_logo)
        launcher.save(os.path.join(dir_path, "ic_launcher.webp"), "WEBP")
        launcher.save(os.path.join(dir_path, "ic_launcher_round.webp"), "WEBP")
        
        # Adaptive foreground
        fg = fit_centered(logo, (fg_size, fg_size), scale=0.62)
        fg.save(os.path.join(dir_path, "ic_launcher_foreground.webp"), "WEBP")
        
        # Adaptive background
        bg = make_solid_bg((fg_size, fg_size))
        bg.save(os.path.join(dir_path, "ic_launcher_background.webp"), "WEBP")
        
        # Monochrome
        r, g, b, a = fg.split()
        white_img = Image.new("RGBA", (fg_size, fg_size), (255, 255, 255, 255))
        m_res = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        m_res.paste(white_img, (0, 0), a)
        m_res.save(os.path.join(dir_path, "ic_launcher_monochrome.webp"), "WEBP")
        
        print(f"  [OK] {folder} updated")

    print("\nAll mobile app icons & web favicons generated successfully!")

if __name__ == "__main__":
    generate_icons()
