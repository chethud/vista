"""HTML and PDF reports for MultiLingo."""

from __future__ import annotations

import html
import logging
import os
from datetime import datetime
from xml.sax.saxutils import escape as xml_escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.multilingo.constants import INDIAN_LANGUAGES, LANGUAGE_DETAILS
from app.multilingo.model_manager import model_manager

logger = logging.getLogger(__name__)


def _para_text(s: str) -> str:
    if not s:
        return ""
    return xml_escape(s).replace("\n", "<br/>")


def generate_enhanced_html_report(data: dict, output_path: str) -> None:
    lang_code = data.get("target_language", "hi")
    lang_info = LANGUAGE_DETAILS.get(lang_code, LANGUAGE_DETAILS["hi"])
    lang_name = INDIAN_LANGUAGES.get(lang_code, "Unknown Language")
    translated_text = data.get("translated_text", "") or ""
    original_text = data.get("original_text", "") or ""

    safe_orig = html.escape(original_text)
    safe_trans = html.escape(
        translated_text
        if translated_text and not translated_text.startswith("[Translation failed")
        else "Translation not available"
    )

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MultiLingo AI - Translation Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Noto+Sans+Devanagari&display=swap" rel="stylesheet">
    <style>
        body {{ font-family: Poppins, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #1f2937; }}
        .card {{ max-width: 960px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }}
        h1 {{ color: #ff6b35; text-align: center; }}
        .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }}
        .box {{ border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; max-height: 320px; overflow-y: auto; }}
        .indian {{ font-family: 'Noto Sans Devanagari', sans-serif; font-size: 1.1rem; line-height: 1.8; }}
        @media (max-width: 768px) {{ .grid {{ grid-template-columns: 1fr; }} }}
    </style>
</head>
<body>
    <div class="card">
        <h1>🇮🇳 MultiLingo AI</h1>
        <p style="text-align:center;">{html.escape(lang_name)} · {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
        <p>Processing time: {data.get('processing_time', 0):.1f}s</p>
        <div class="grid">
            <div>
                <h3>Filtered English</h3>
                <div class="box"><pre style="white-space:pre-wrap;font:inherit;margin:0;">{safe_orig}</pre></div>
            </div>
            <div>
                <h3>{html.escape(lang_info['english'])}</h3>
                <div class="box indian">{safe_trans}</div>
            </div>
        </div>
    </div>
</body>
</html>"""

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    logger.info("HTML report: %s", os.path.basename(output_path))


def generate_unicode_pdf_report(data: dict, output_path: str) -> None:
    try:
        lang_code = data.get("target_language", "hi")
        lang_info = LANGUAGE_DETAILS.get(lang_code, LANGUAGE_DETAILS["hi"])
        lang_name = INDIAN_LANGUAGES.get(lang_code, "Unknown Language")
        translated_text = data.get("translated_text", "") or ""
        original_text = data.get("original_text", "") or ""

        target_font = lang_info.get("font", model_manager.primary_font)
        try:
            registered = list(pdfmetrics.getRegisteredFontNames())
        except Exception:
            registered = []
        if target_font not in registered:
            target_font = model_manager.primary_font

        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "T",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#ff6b35"),
        )
        h_style = ParagraphStyle(
            "H",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=14,
            alignment=TA_LEFT,
        )
        normal = ParagraphStyle("N", parent=styles["Normal"], fontName="Helvetica", fontSize=10)
        indian_style = ParagraphStyle(
            "I",
            parent=styles["Normal"],
            fontName=target_font,
            fontSize=11,
            leading=14,
        )

        story = []
        story.append(Paragraph("MultiLingo AI — Translation Report", title_style))
        story.append(Spacer(1, 16))
        summary = [
            ["Generated", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
            ["Target language", lang_name],
            ["Original chars", str(len(original_text))],
            ["Translated chars", str(len(translated_text))],
            ["Processing (s)", f"{data.get('processing_time', 0):.2f}"],
        ]
        t = Table(summary, colWidths=[4 * cm, 10 * cm])
        t.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story.append(t)
        story.append(Spacer(1, 20))

        if original_text:
            story.append(Paragraph("Filtered English text", h_style))
            disp = original_text[:2000] + ("..." if len(original_text) > 2000 else "")
            story.append(Paragraph(_para_text(disp), normal))
            story.append(Spacer(1, 10))

        if translated_text and not translated_text.startswith("[Translation failed"):
            story.append(Paragraph(f"{lang_info['english']} translation", h_style))
            disp = translated_text[:2000] + ("..." if len(translated_text) > 2000 else "")
            story.append(Paragraph(_para_text(disp), indian_style))
        else:
            story.append(Paragraph("Translation unavailable or failed.", normal))

        story.append(PageBreak())
        story.append(Paragraph("MultiLingo AI", title_style))
        doc.build(story)
        logger.info("PDF report: %s", os.path.basename(output_path))
    except Exception as e:
        logger.error("PDF generation error: %s", e)
        create_simple_fallback_pdf(data, output_path)


def create_simple_fallback_pdf(data: dict, output_path: str) -> None:
    doc = SimpleDocTemplate(output_path, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    story.append(Paragraph("MultiLingo AI - Translation Report", styles["Title"]))
    story.append(Spacer(1, 12))
    lang_code = data.get("target_language", "hi")
    lang_info = LANGUAGE_DETAILS.get(lang_code, LANGUAGE_DETAILS["hi"])
    lines = [
        "Translation completed.",
        f"Target: {INDIAN_LANGUAGES.get(lang_code, lang_code)}",
        f"Time: {data.get('processing_time', 0):.2f}s",
        f"Chars: {len(data.get('original_text', '') or '')} → {len(data.get('translated_text', '') or '')}",
        "See HTML report for full Unicode text.",
    ]
    for line in lines:
        story.append(Paragraph(line, styles["Normal"]))
    doc.build(story)
    logger.info("Fallback PDF: %s", os.path.basename(output_path))
