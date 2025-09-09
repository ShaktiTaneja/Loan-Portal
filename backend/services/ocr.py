import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image
import io

def ocr_bytes(content: bytes, filename: str) -> str:
    """
    Extract text from uploaded document bytes using Tesseract OCR.
    Supports images and PDFs.
    """
    text = ""
    try:
        if filename.lower().endswith(".pdf"):
            # Convert PDF pages to images
            images = convert_from_bytes(content)
            for img in images:
                text += pytesseract.image_to_string(img) + "\n"
        else:
            # Treat as image
            image = Image.open(io.BytesIO(content))
            text = pytesseract.image_to_string(image)
    except Exception as e:
        text = f"[OCR failed: {e}]"
    return text.strip()
