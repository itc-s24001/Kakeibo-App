#!/usr/bin/env python3
from PIL import Image

def create_optimized_favicon(input_path, output_path):
    """
    ファビコン用にくまちゃんを大きく見やすくする
    """
    # 画像を開く
    img = Image.open(input_path)
    
    # RGBAモードに変換
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    width, height = img.size
    print(f"元の画像サイズ: {width}x{height}")
    
    # くまちゃんを大きく見せるため、余白を削除してトリミング
    # Gmailのファビコンくらいの見やすさを目指す（画像の85%を使用）
    crop_ratio = 0.85
    crop_size = min(width, height) * crop_ratio
    
    # 中心座標を計算
    center_x = width / 2
    center_y = height / 2 - (height * 0.03)  # わずかに上にシフト
    
    left = center_x - crop_size / 2
    top = center_y - crop_size / 2
    right = center_x + crop_size / 2
    bottom = center_y + crop_size / 2
    
    # トリミング
    img_cropped = img.crop((left, top, right, bottom))
    print(f"トリミング後: {img_cropped.size} (余白を削除して85%に拡大)")
    
    # 512x512にリサイズ（高品質）
    img_resized = img_cropped.resize((512, 512), Image.Resampling.LANCZOS)
    img_resized.save(output_path, 'PNG', optimize=True)
    print(f"✓ 保存完了: {output_path}")
    
    # Apple用アイコンも同じものを使用
    apple_path = output_path.replace('icon.png', 'apple-icon.png')
    img_resized.save(apple_path, 'PNG', optimize=True)
    print(f"✓ Apple用アイコン: {apple_path}")

if __name__ == "__main__":
    input_file = "/home/s24020/Downloads/Gemini_Generated_Image_ssx0fbssx0fbssx0 (1).png"
    output_file = "/home/s24020/Kakeibo/tamerun-app/app/icon.png"
    
    create_optimized_favicon(input_file, output_file)
    print("\n✨ ファビコンの最適化が完了しました！")
