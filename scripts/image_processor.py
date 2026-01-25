"""
Professional image enhancement for dating profiles and social media.
Based on Fiverr professional editing techniques and portrait retouching best practices.
"""

from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
from typing import Tuple
import os


class ImageProcessor:
    """Apply professional photo editing presets optimized for dating profiles"""

    def __init__(self):
        self.presets = {
            "dating_warm": self.dating_warm_preset,
            "dating_cool": self.dating_cool_preset,
            "instagram_vibrant": self.instagram_vibrant,
            "instagram_matte": self.instagram_matte,
            "tiktok_bright": self.tiktok_bright,
            "natural_enhance": self.natural_enhance,
            "professional_sharp": self.professional_sharp,
            "golden_hour": self.golden_hour,
            "soft_portrait": self.soft_portrait,
            "high_contrast": self.high_contrast
        }

    def apply_preset(self, image_path: str, preset_name: str, output_path: str):
        """Apply a specific preset to an image"""
        img = Image.open(image_path)

        if preset_name not in self.presets:
            raise ValueError(f"Preset '{preset_name}' not found")

        processed = self.presets[preset_name](img)
        processed.save(output_path, quality=95, optimize=True)

        return output_path

    def apply_all_presets(self, image_path: str, output_dir: str) -> dict:
        """Apply all 10 presets and return paths"""
        os.makedirs(output_dir, exist_ok=True)

        results = {}
        filename = os.path.splitext(os.path.basename(image_path))[0]

        for preset_name in self.presets.keys():
            output_path = os.path.join(output_dir, f"{filename}_{preset_name}.jpg")
            self.apply_preset(image_path, preset_name, output_path)
            results[preset_name] = output_path

        return results

    # ===== PRESET IMPLEMENTATIONS =====

    def dating_warm_preset(self, img: Image.Image) -> Image.Image:
        """
        Warm tones optimized for dating profiles.
        Based on Fiverr professional editing: subtle warmth, skin enhancement, soft glow.
        """
        # Slight warmth boost
        img = self._adjust_color_temperature(img, warmth=1.15)

        # Enhance contrast subtly
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.1)

        # Boost saturation slightly
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.15)

        # Slight sharpening
        img = img.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))

        # Soft skin smoothing
        img = self._soft_skin_smooth(img)

        return img

    def dating_cool_preset(self, img: Image.Image) -> Image.Image:
        """
        Cool, modern tones for dating profiles.
        Professional look with slightly cooler temperature.
        """
        img = self._adjust_color_temperature(img, warmth=0.92)

        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.12)

        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.05)

        img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=130, threshold=3))

        return img

    def instagram_vibrant(self, img: Image.Image) -> Image.Image:
        """
        Vibrant Instagram-ready preset.
        Punchy colors, high contrast, eye-catching.
        """
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.25)

        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.15)

        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.03)

        img = img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=140, threshold=3))

        return img

    def instagram_matte(self, img: Image.Image) -> Image.Image:
        """
        Matte Instagram aesthetic.
        Slightly faded, soft contrasts, trendy look.
        """
        # Reduce contrast for matte look
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(0.9)

        # Slight brightness boost
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.08)

        # Desaturate slightly
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(0.92)

        # Very light blur for softness
        img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

        return img

    def tiktok_bright(self, img: Image.Image) -> Image.Image:
        """
        Bright, energetic TikTok preset.
        High brightness, punchy, youthful vibe.
        """
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.12)

        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.18)

        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.08)

        img = img.filter(ImageFilter.UnsharpMask(radius=1, percent=125, threshold=2))

        return img

    def natural_enhance(self, img: Image.Image) -> Image.Image:
        """
        Natural enhancement - subtle improvements that don't look edited.
        Key Fiverr principle: enhance without looking fake.
        """
        # Very subtle contrast
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.05)

        # Minimal brightness adjustment
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.02)

        # Slight sharpening
        img = img.filter(ImageFilter.UnsharpMask(radius=0.8, percent=110, threshold=3))

        # Light skin smoothing
        img = self._soft_skin_smooth(img, strength=0.3)

        return img

    def professional_sharp(self, img: Image.Image) -> Image.Image:
        """
        Professional, sharp portrait.
        Clear, crisp, business-appropriate.
        """
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.3)

        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.12)

        img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))

        return img

    def golden_hour(self, img: Image.Image) -> Image.Image:
        """
        Golden hour warm glow.
        Romantic, warm, sunset-like tones.
        """
        img = self._adjust_color_temperature(img, warmth=1.25)

        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.2)

        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.06)

        img = self._soft_skin_smooth(img, strength=0.4)

        return img

    def soft_portrait(self, img: Image.Image) -> Image.Image:
        """
        Soft, dreamy portrait.
        Reduced sharpness, smooth skin, gentle look.
        """
        # Light blur for softness
        img = img.filter(ImageFilter.GaussianBlur(radius=0.8))

        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(0.95)

        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.05)

        img = self._soft_skin_smooth(img, strength=0.5)

        return img

    def high_contrast(self, img: Image.Image) -> Image.Image:
        """
        High contrast dramatic look.
        Bold, striking, modern aesthetic.
        """
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.25)

        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.15)

        img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=160, threshold=2))

        return img

    # ===== HELPER FUNCTIONS =====

    def _adjust_color_temperature(self, img: Image.Image, warmth: float = 1.0) -> Image.Image:
        """
        Adjust color temperature (warmth > 1.0 = warmer, < 1.0 = cooler)
        """
        # Convert to numpy array
        img_array = np.array(img, dtype=np.float32)

        if warmth > 1.0:  # Warmer
            img_array[:, :, 0] = np.clip(img_array[:, :, 0] * warmth, 0, 255)  # Red
            img_array[:, :, 2] = np.clip(img_array[:, :, 2] / warmth, 0, 255)  # Blue
        else:  # Cooler
            img_array[:, :, 2] = np.clip(img_array[:, :, 2] / warmth, 0, 255)  # Blue
            img_array[:, :, 0] = np.clip(img_array[:, :, 0] * warmth, 0, 255)  # Red

        return Image.fromarray(np.uint8(img_array))

    def _soft_skin_smooth(self, img: Image.Image, strength: float = 0.4) -> Image.Image:
        """
        Subtle skin smoothing without losing texture.
        Simulates basic frequency separation technique.
        """
        # Create a slightly blurred version
        blurred = img.filter(ImageFilter.GaussianBlur(radius=2))

        # Blend original with blurred based on strength
        return Image.blend(img, blurred, strength)


# CLI for testing
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python image_processor.py <image_path> [output_dir]")
        sys.exit(1)

    image_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "./output"

    processor = ImageProcessor()
    results = processor.apply_all_presets(image_path, output_dir)

    print(f"✅ Generated {len(results)} variations:")
    for preset, path in results.items():
        print(f"  - {preset}: {path}")
