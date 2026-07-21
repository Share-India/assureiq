from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database.db import get_db
from backend.database.models import Company, User, AuditLog
from backend.schemas.schemas import CompanyCreate, CompanyResponse, CompanyDetailResponse
from backend.api.routers.auth import require_sales_or_above, require_manager_or_above, require_admin, get_current_user
from typing import List

router = APIRouter(prefix="/companies", tags=["Companies"])

@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    company_in: CompanyCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_sales_or_above)
):
    # Check if duplicate CIN, PAN or GST if provided
    if company_in.cin:
        existing = db.query(Company).filter(Company.cin == company_in.cin).first()
        if existing:
            raise HTTPException(status_code=400, detail="Company with this CIN already exists")
    if company_in.pan:
        existing = db.query(Company).filter(Company.pan == company_in.pan).first()
        if existing:
            raise HTTPException(status_code=400, detail="Company with this PAN already exists")
            
    new_company = Company(**company_in.dict())
    new_company.created_by = current_user.id
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    new_company.created_by_username = current_user.username
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Create Company",
        details=f"Created company: {new_company.name} (ID: {new_company.id})"
    )
    db.add(audit)
    db.commit()
    
    return new_company

@router.get("", response_model=List[CompanyResponse])
def get_companies(
    name: str = None, 
    industry: str = None, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_sales_or_above)
):
    query = db.query(Company)
    if current_user.role != "Admin":
        query = query.filter(Company.created_by == current_user.id)
    if name:
        query = query.filter(Company.name.ilike(f"%{name}%"))
    if industry:
        query = query.filter(Company.industry.ilike(f"%{industry}%"))
    results = query.all()
    for r in results:
        if r.created_by:
            creator_user = db.query(User).filter(User.id == r.created_by).first()
            r.created_by_username = creator_user.username if creator_user else "System"
        else:
            r.created_by_username = "System"
    return results

@router.get("/{id}", response_model=CompanyDetailResponse)
def get_company_detail(
    id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_sales_or_above)
):
    company = db.query(Company).filter(Company.id == id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    if current_user.role != "Admin" and company.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this company")
        
    # Build response manually or through SQLAlchemy eager loading
    # We will build and format recommendations to include product details
    recommendations_list = []
    for rec in company.recommendations:
        recommendations_list.append({
            "id": rec.id,
            "product_name": rec.product.name,
            "product_description": rec.product.description,
            "coverage_amount": rec.coverage_amount,
            "priority": rec.priority,
            "risk_description": rec.risk_description,
            "recommendation_reason": rec.recommendation_reason,
            "business_impact": rec.business_impact,
            "sub_categories": rec.sub_categories,
            "premium_calculations": [
                {
                    "id": calc.id,
                    "min_premium": calc.min_premium,
                    "estimated_premium": calc.estimated_premium,
                    "max_premium": calc.max_premium,
                    "calculation_formula": calc.calculation_formula,
                    "calculated_at": calc.calculated_at,
                    "sub_categories": calc.sub_categories
                } for calc in rec.premium_calculations
            ]
        })
        
    creator_user = db.query(User).filter(User.id == company.created_by).first() if company.created_by else None
    created_by_username = creator_user.username if creator_user else "System"
    
    documents_list = []
    for doc in company.documents:
        uploader_user = db.query(User).filter(User.id == doc.uploaded_by).first() if doc.uploaded_by else None
        documents_list.append({
            "id": doc.id,
            "company_id": doc.company_id,
            "filename": doc.filename,
            "file_path": doc.file_path,
            "file_type": doc.file_type,
            "status": doc.status,
            "error_message": doc.error_message,
            "uploaded_at": doc.uploaded_at,
            "uploaded_by": doc.uploaded_by,
            "uploaded_by_username": uploader_user.username if uploader_user else "System"
        })

    return {
        "id": company.id,
        "name": company.name,
        "industry": company.industry,
        "turnover": company.turnover,
        "employee_count": company.employee_count,
        "pan": company.pan,
        "gst": company.gst,
        "cin": company.cin,
        "address": company.address,
        "created_by": company.created_by,
        "created_by_username": created_by_username,
        "created_at": company.created_at,
        "updated_at": company.updated_at,
        "documents": documents_list,
        "extracted_data": company.extracted_data,
        "predicted_values": company.predicted_values,
        "recommendations": recommendations_list
    }

@router.put("/{id}", response_model=CompanyResponse)
def update_company(
    id: int, 
    company_in: CompanyCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_sales_or_above)
):
    company = db.query(Company).filter(Company.id == id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    if current_user.role != "Admin" and company.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this company")
        
    for k, v in company_in.dict(exclude_unset=True).items():
        setattr(company, k, v)
        
    db.commit()
    db.refresh(company)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Update Company",
        details=f"Updated company details for: {company.name} (ID: {company.id})"
    )
    db.add(audit)
    db.commit()
    
    return company

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    company = db.query(Company).filter(Company.id == id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    company_name = company.name
    db.delete(company)
    db.commit()
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Delete Company",
        details=f"Deleted company: {company_name} (ID: {id})"
    )
    db.add(audit)
    db.commit()
    
    return None
