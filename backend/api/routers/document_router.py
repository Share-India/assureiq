import os
import shutil
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from backend.database.db import get_db
from backend.database.models import Company, Document, User, AuditLog
from backend.schemas.schemas import DocumentResponse
from backend.api.routers.auth import require_sales_or_above, get_current_user

router = APIRouter(prefix="/companies", tags=["Documents"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".xlsx", ".xls", ".csv", ".png", ".jpg", ".jpeg"}

@router.post("/{company_id}/documents/upload", response_model=List[DocumentResponse], status_code=status.HTTP_201_CREATED)
def upload_documents(
    company_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_sales_or_above)
):
    import hashlib
    # Verify company exists
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    if current_user.role != "Admin" and company.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to upload documents for this company")
        
    uploaded_docs = []
    for file in files:
        # Validate extension
        _, ext = os.path.splitext(file.filename)
        ext = ext.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {file.filename}. Supported: PDF, Excel, CSV, Images"
            )
            
        # Calculate file hash to prevent duplicate uploads
        file_content = file.file.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        file.file.seek(0)  # Reset pointer
        
        # Check if the exact same document is already uploaded in the database
        existing = db.query(Document).filter(Document.file_hash == file_hash).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document is already present"
            )
            
        # Create a unique filename to prevent overwrites
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        # Save file to disk
        try:
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file on disk: {str(e)}")
            
        # Create database record
        doc = Document(
            company_id=company_id,
            filename=file.filename,
            file_path=file_path,
            file_type=ext[1:].upper(), # PDF, XLSX, PNG, etc.
            status="Uploaded",
            uploaded_by=current_user.id,
            file_hash=file_hash
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        doc.uploaded_by_username = current_user.username
        uploaded_docs.append(doc)
        
        # Audit log
        audit = AuditLog(
            user_id=current_user.id,
            action="Upload Document",
            details=f"Uploaded file: {file.filename} (ID: {doc.id}) for company: {company.name}"
        )
        db.add(audit)
        db.commit()
        
    return uploaded_docs

@router.get("/{company_id}/documents", response_model=List[DocumentResponse])
def get_company_documents(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_sales_or_above)
):
    # Verify company exists
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    if current_user.role != "Admin" and company.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view documents for this company")
        
    docs = db.query(Document).filter(Document.company_id == company_id).all()
    for d in docs:
        if d.uploaded_by:
            uploader = db.query(User).filter(User.id == d.uploaded_by).first()
            d.uploaded_by_username = uploader.username if uploader else "System"
        else:
            d.uploaded_by_username = "System"
    return docs
