import os, json
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from supa import supa
from storage import upload_bytes
from services.ocr import ocr_bytes
from services.report import generate_report_text, generate_report_pdf_bytes
from models import ApplicationIn, ReportOut

app = FastAPI(title="Loan Portal API")

# Allow frontend domain (Netlify)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN!="*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BUCKET = os.getenv("SUPABASE_BUCKET","docs")

# Utility
def get_app_or_404(app_id: str):
    client = supa()
    res = client.table("applications").select("*").eq("id", app_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return res.data

@app.post("/applications/")
def create_application(payload: ApplicationIn):
    """Create new application metadata (loan_type, applicants)."""
    client = supa()
    res = client.table("applications").insert({
        "loan_type": payload.loan_type,
        "applicants": [a.model_dump() for a in payload.applicants],
        "status": "submitted"
    }).execute()
    return res.data[0]

@app.get("/applications/")
def search_applications(q: str = "", limit: int = 20):
    """List applications, optionally filter by loan_type."""
    client = supa()
    qry = client.table("applications").select("*").order("created_at", desc=True)
    if q:
        qry = qry.ilike("loan_type", f"%{q}%")
    res = qry.limit(limit).execute()
    return res.data

@app.get("/applications/{app_id}")
def get_application(app_id: str):
    client = supa()
    app_row = get_app_or_404(app_id)
    docs = client.table("documents").select("*").eq("application_id", app_id).execute().data
    return {**app_row, "documents": docs}

@app.put("/applications/{app_id}")
def update_application(app_id: str, payload: ApplicationIn):
    client = supa()
    _ = get_app_or_404(app_id)
    res = client.table("applications").update({
        "loan_type": payload.loan_type,
        "applicants": [a.model_dump() for a in payload.applicants]
    }).eq("id", app_id).execute()
    regenerate_report(app_id)
    return res.data[0]

@app.delete("/applications/{app_id}")
def delete_application(app_id: str):
    client = supa()
    _ = get_app_or_404(app_id)
    client.table("applications").delete().eq("id", app_id).execute()
    return {"ok": True}

@app.post("/applications/{app_id}/documents")
async def add_documents(
    app_id: str,
    doc_type: str = Form(...),
    applicant_index: int = Form(0),
    files: List[UploadFile] = File(...)
):
    """Upload documents for an application + run OCR + update report."""
    client = supa()
    _ = get_app_or_404(app_id)
    uploaded = []
    for f in files:
        content = await f.read()
        public_url, key = upload_bytes(app_id, f.filename, content)
        text = ocr_bytes(content, f.filename)
        doc = {
            "application_id": app_id,
            "applicant_index": applicant_index,
            "doc_type": doc_type,
            "file_path": key,
            "file_url": public_url,
            "ocr_text": text
        }
        row = client.table("documents").insert(doc).execute().data[0]
        uploaded.append(row)
    regenerate_report(app_id)
    return {"uploaded": uploaded}

@app.get("/applications/{app_id}/report", response_model=ReportOut)
def get_report(app_id: str):
    client = supa()
    app_row = get_app_or_404(app_id)
    return {
        "report_text": app_row.get("report_text") or "",
        "report_pdf_url": app_row.get("report_pdf_url")
    }

# ---- Internal ----
def regenerate_report(app_id: str):
    """Rebuilds report_text and PDF for an application after changes."""
    client = supa()
    app_row = client.table("applications").select("*").eq("id", app_id).single().execute().data
    docs = client.table("documents").select("ocr_text").eq("application_id", app_id).execute().data
    doc_texts = [d.get("ocr_text","") for d in docs]
    report_text = generate_report_text(json.dumps(app_row), doc_texts)
    pdf_bytes = generate_report_pdf_bytes(report_text)
    public_url, key = upload_bytes(app_id, "report.pdf", pdf_bytes)
    client.table("applications").update({
        "report_text": report_text,
        "report_pdf_url": public_url
    }).eq("id", app_id).execute()
