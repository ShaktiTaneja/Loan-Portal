import os
import io
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from openai import OpenAI

# OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_report_text(application_json: str, doc_texts: list[str]) -> str:
    """
    Generate a risk/eligibility report using OpenAI API
    based on application metadata and OCR results.
    """
    prompt = f"""
You are a loan analysis assistant. Given the context below, extract structured information and generate a summary report in plain text format. Highlight:

- Name: Kalyanji Jadhav
- Pan Card Number as on ITR report
- Aadhaar Card Number
- Credit Score 
- Loan Amount Details
- Property Ownership Document
- Default payment for Loan or Credit Card
- Positive Points
- Negative Points
- Please provide comprehensive risk assessment 
- Missing Documents

Context:
{context}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # or gpt-4.1 if available
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"[Report generation failed: {e}]"

def generate_report_pdf_bytes(report_text: str) -> bytes:
    """
    Generate a simple PDF from report text and return it as bytes.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    text_obj = c.beginText(40, height - 50)
    text_obj.setFont("Helvetica", 11)

    for line in report_text.splitlines():
        text_obj.textLine(line)
    c.drawText(text_obj)
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()
