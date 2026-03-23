import logging
import os

import requests
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.multilingo.config import OUTPUT_FOLDER

logger = logging.getLogger(__name__)


def setup_unicode_fonts():
    """Download and register Unicode fonts for PDF generation."""
    try:
        logger.info("Setting up Unicode fonts for PDF generation...")

        fonts_dir = os.path.join(OUTPUT_FOLDER, "fonts")
        os.makedirs(fonts_dir, exist_ok=True)

        fonts_registered = []

        font_sources = [
            {
                "name": "NotoSansDevanagari",
                "url": "https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari-Regular.ttf",
                "filename": "NotoSansDevanagari-Regular.ttf",
                "languages": ["Hindi", "Sanskrit", "Marathi"],
            },
            {
                "name": "NotoSansKannada",
                "url": "https://github.com/google/fonts/raw/main/ofl/notosanskannada/NotoSansKannada-Regular.ttf",
                "filename": "NotoSansKannada-Regular.ttf",
                "languages": ["Kannada"],
            },
            {
                "name": "NotoSansTamil",
                "url": "https://github.com/google/fonts/raw/main/ofl/notosanstamil/NotoSansTamil-Regular.ttf",
                "filename": "NotoSansTamil-Regular.ttf",
                "languages": ["Tamil"],
            },
            {
                "name": "NotoSansTelugu",
                "url": "https://github.com/google/fonts/raw/main/ofl/notosanstelugu/NotoSansTelugu-Regular.ttf",
                "filename": "NotoSansTelugu-Regular.ttf",
                "languages": ["Telugu"],
            },
        ]

        for font_info in font_sources:
            font_path = os.path.join(fonts_dir, font_info["filename"])

            if not os.path.exists(font_path):
                try:
                    logger.info("Downloading %s font...", font_info["name"])
                    response = requests.get(font_info["url"], timeout=30)
                    if response.status_code == 200:
                        with open(font_path, "wb") as f:
                            f.write(response.content)
                        logger.info("Downloaded %s", font_info["name"])
                    else:
                        logger.warning(
                            "Failed to download %s: HTTP %s",
                            font_info["name"],
                            response.status_code,
                        )
                        continue
                except Exception as e:
                    logger.warning("Error downloading %s: %s", font_info["name"], e)
                    continue

            if os.path.exists(font_path):
                try:
                    pdfmetrics.registerFont(TTFont(font_info["name"], font_path))
                    fonts_registered.append(font_info["name"])
                    logger.info(
                        "Registered %s for %s",
                        font_info["name"],
                        ", ".join(font_info["languages"]),
                    )
                except Exception as e:
                    logger.warning("Could not register %s: %s", font_info["name"], e)

        system_fonts = [
            {"path": "C:\\Windows\\Fonts\\arial.ttf", "name": "Arial"},
            {"path": "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "name": "DejaVuSans"},
            {"path": "/System/Library/Fonts/Arial.ttf", "name": "ArialMac"},
        ]

        for font_info in system_fonts:
            if os.path.exists(font_info["path"]):
                try:
                    pdfmetrics.registerFont(TTFont(font_info["name"], font_info["path"]))
                    fonts_registered.append(font_info["name"])
                    logger.info("Registered system font: %s", font_info["name"])
                    break
                except Exception as e:
                    logger.warning("Could not register system font %s: %s", font_info["name"], e)

        if fonts_registered:
            logger.info(
                "Registered %s fonts: %s",
                len(fonts_registered),
                ", ".join(fonts_registered),
            )
            return fonts_registered[0]
        logger.warning("No Unicode fonts registered, using Helvetica fallback")
        return "Helvetica"

    except Exception as e:
        logger.error("Font setup error: %s", e)
        return "Helvetica"


# colors import kept for parity with original; reportlab colors used in reports module
__all__ = ["setup_unicode_fonts"]
