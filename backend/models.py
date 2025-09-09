from pydantic import BaseModel
from typing import List, Optional

class Applicant(BaseModel):
    name: str = ""
    gender: str = ""
    employment: str = ""
    email: str = ""
    phone: str = ""
    pan: str = ""
    aadhaar: str = ""

class ApplicationIn(BaseModel):
    loan_type: Optional[str] = None
    applicants: List[Applicant] = []

class ReportOut(BaseModel):
    report_text: str
    report_pdf_url: Optional[str] = None
