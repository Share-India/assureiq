import os
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from backend.database.db import get_db, SessionLocal
from backend.database.models import Company, Document, ExtractedFinancialData, PredictedValue, InsuranceRecommendation, PremiumCalculation, User, AuditLog
from backend.api.routers.auth import require_sales_or_above, require_manager_or_above, get_current_user
from backend.ai.gemini_client import extract_financial_data, predict_missing_financials
from backend.calculations.premium_rules import calculate_premiums, get_financial_value

router = APIRouter(prefix="/companies", tags=["Recommendation & Premium Engine"])

# Helper to cast strings to Decimals safely
def to_decimal(val_str: str) -> Decimal:
    if not val_str:
        return Decimal(0)
    try:
        # Remove currency symbols, commas, and spaces
        clean_str = val_str.replace(",", "").replace("$", "").replace("₹", "").replace(" ", "").strip()
        return Decimal(clean_str)
    except Exception:
        return Decimal(0)

@router.post("/{company_id}/extract", status_code=status.HTTP_202_ACCEPTED)
def trigger_extraction(
    company_id: int,
    background_tasks: BackgroundTasks,
    document_id: int = Query(None, description="Trigger for specific document, otherwise latest is used"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_sales_or_above)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    # Get document
    if document_id:
        doc = db.query(Document).filter(Document.id == document_id, Document.company_id == company_id).first()
    else:
        doc = db.query(Document).filter(Document.company_id == company_id).order_by(Document.uploaded_at.desc()).first()
        
    if not doc:
        raise HTTPException(status_code=400, detail="No documents found to process. Please upload a file first.")
        
    # Update document status to processing
    doc.status = "Processing"
    db.commit()
    
    background_tasks.add_task(run_extraction_pipeline, company_id, doc.id, current_user.id)
    return {"status": "Processing", "message": "Extraction pipeline triggered in the background."}

def run_extraction_pipeline(company_id: int, document_id: int, user_id: int):
    db = SessionLocal()
    try:
        company = db.query(Company).filter(Company.id == company_id).first()
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not company or not doc:
            return

        # Run extraction
        raw_result = extract_financial_data(doc.file_path, doc.file_type)
        if not raw_result:
            raise Exception("AI extraction returned empty result.")
            
        # Clear previous extracted data for this document
        db.query(ExtractedFinancialData).filter(ExtractedFinancialData.company_id == company_id).delete()
        db.commit()
        
        # Categorized fields mapping
        category_map = {
            "company_name": ("Business Info", "name"),
            "industry": ("Business Info", "industry"),
            "pan": ("Business Info", "pan"),
            "gst": ("Business Info", "gst"),
            "cin": ("Business Info", "cin"),
            "address": ("Business Info", "address"),
            "credit_rating": ("Business Info", "credit_rating"),
            # Assets
            "current_assets": ("Assets", "current_assets"),
            "fixed_assets": ("Assets", "fixed_assets"),
            "inventory": ("Assets", "inventory"),
            "machinery": ("Assets", "machinery"),
            "cash": ("Assets", "cash"),
            "bank_balance": ("Assets", "bank_balance"),
            "receivables": ("Assets", "receivables"),
            # Liabilities
            "loans": ("Liabilities", "loans"),
            "current_liability": ("Liabilities", "current_liability"),
            "long_term_liability": ("Liabilities", "long_term_liability"),
            "creditors": ("Liabilities", "creditors"),
            # Employee Benefits
            "employee_count": ("Employee Benefits", "employee_count"),
            "salary": ("Employee Benefits", "salary"),
            "pf": ("Employee Benefits", "pf"),
            "esic": ("Employee Benefits", "esic"),
            "gratuity": ("Employee Benefits", "gratuity"),
            "medical": ("Employee Benefits", "medical"),
            "bonus": ("Employee Benefits", "bonus"),
            # Revenue / Expenses
            "turnover": ("Business Info", "turnover"),
            "revenue": ("Revenue", "revenue"),
            "expenses": ("Expenses", "expenses"),
            # Risk
            "risk_factors": ("Business Info", "risk_factors")
        }
        
        # Iterate over extraction schema and insert records
        extracted_vals_dict = {}
        for field_name, (category, company_attr) in category_map.items():
            field_data = raw_result.get(field_name)
            if field_data:
                val_str = field_data.get("value")
                confidence = field_data.get("confidence", 1.0)
                source_page = field_data.get("source_page")
                
                if val_str:
                    num_val = None
                    # Try converting to decimal for numerical fields
                    if field_name not in ("company_name", "industry", "pan", "gst", "cin", "address", "credit_rating", "risk_factors"):
                        num_val = to_decimal(val_str)
                        
                    # Save to db
                    extracted_record = ExtractedFinancialData(
                        company_id=company_id,
                        document_id=doc.id,
                        field_name=field_name,
                        field_category=category,
                        extracted_value=val_str,
                        numeric_value=num_val,
                        confidence=confidence,
                        source_page=source_page,
                        is_verified=True if confidence > 0.8 else False
                    )
                    db.add(extracted_record)
                    extracted_vals_dict[field_name] = num_val if num_val is not None else val_str
                    
                    # Update company properties if high confidence
                    if confidence >= 0.7:
                        if field_name == "company_name":
                            company.name = val_str
                        elif field_name == "industry":
                            company.industry = val_str
                        elif field_name == "pan":
                            company.pan = val_str
                        elif field_name == "gst":
                            company.gst = val_str
                        elif field_name == "cin":
                            company.cin = val_str
                        elif field_name == "address":
                            company.address = val_str
                        elif field_name == "credit_rating":
                            company.credit_rating = val_str
                        elif field_name == "turnover" and num_val is not None:
                            company.turnover = num_val
                        elif field_name == "employee_count" and num_val is not None:
                            company.employee_count = int(num_val)
                            
        db.commit()
        
        # 2. Check for missing data predictions
        critical_fields = ["turnover", "employee_count", "fixed_assets", "machinery", "inventory", "salary"]
        missing_fields = []
        for field in critical_fields:
            if field not in extracted_vals_dict or extracted_vals_dict[field] is None or extracted_vals_dict[field] == 0:
                missing_fields.append(field)
                
        # Clear old predictions
        db.query(PredictedValue).filter(PredictedValue.company_id == company_id).delete()
        db.commit()
        
        if missing_fields:
            # Trigger prediction API
            pred_res = predict_missing_financials(
                company.name,
                company.industry or "General Business",
                {k: str(v) for k, v in extracted_vals_dict.items() if v is not None},
                missing_fields
            )
            
            if pred_res and "predictions" in pred_res:
                for pred in pred_res["predictions"]:
                    f_name = pred.get("field_name")
                    min_v = pred.get("min_value")
                    exp_v = pred.get("expected_value")
                    max_v = pred.get("max_value")
                    conf = pred.get("confidence", 0.7)
                    
                    pred_record = PredictedValue(
                        company_id=company_id,
                        field_name=f_name,
                        min_value=Decimal(str(min_v)) if min_v is not None else None,
                        expected_value=Decimal(str(exp_v)) if exp_v is not None else None,
                        max_value=Decimal(str(max_v)) if max_v is not None else None,
                        confidence=conf
                    )
                    db.add(pred_record)
                db.commit()
                
        # 3. Calculate Premiums and recommendations
        calculate_premiums(db, company_id)
        
        # Mark document as extracted
        doc.status = "Extracted"
        doc.error_message = None
        db.commit()
        
        # Audit log
        audit = AuditLog(
            user_id=user_id,
            action="Trigger Extraction",
            details=f"Processed and extracted financial data from document ID: {doc.id} for company: {company.name}"
        )
        db.add(audit)
        db.commit()
        
    except Exception as e:
        if doc:
            doc.status = "Failed"
            doc.error_message = str(e)
            db.commit()
    finally:
        db.close()

@router.post("/{company_id}/calculate", status_code=status.HTTP_200_OK)
def trigger_calculations(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_sales_or_above)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    calculate_premiums(db, company_id)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Run Calculations",
        details=f"Manually triggered premium recalculation for company: {company.name}"
    )
    db.add(audit)
    db.commit()
    
    return {"status": "Success", "message": "Premium calculations updated successfully"}

@router.get("/{company_id}/dashboard", response_model=Dict[str, Any])
def get_company_dashboard(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_sales_or_above)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    # Aggregate Dashboard Metrics
    current_assets = get_financial_value(db, company_id, "current_assets")
    fixed_assets = get_financial_value(db, company_id, "fixed_assets")
    total_assets = current_assets + fixed_assets
    
    loans = get_financial_value(db, company_id, "loans")
    current_liability = get_financial_value(db, company_id, "current_liability")
    long_term_liability = get_financial_value(db, company_id, "long_term_liability")
    total_liability = loans + current_liability + long_term_liability
    
    salary = get_financial_value(db, company_id, "salary")
    pf = get_financial_value(db, company_id, "pf")
    esic = get_financial_value(db, company_id, "esic")
    gratuity = get_financial_value(db, company_id, "gratuity")
    medical = get_financial_value(db, company_id, "medical")
    bonus = get_financial_value(db, company_id, "bonus")
    employee_benefits = salary + pf + esic + gratuity + medical + bonus
    
    # Recommendations aggregations
    recs = company.recommendations
    total_coverage = Decimal(0)
    total_premium = Decimal(0)
    max_premium = Decimal(0)
    min_premium = Decimal(0)
    
    bar_chart_data = []
    trend_chart_data = []
    
    for rec in recs:
        total_coverage += rec.coverage_amount
        calcs = rec.premium_calculations
        if calcs:
            calc = calcs[0]
            total_premium += calc.estimated_premium
            max_premium += calc.max_premium
            min_premium += calc.min_premium
            
            bar_chart_data.append({
                "product": rec.product.name,
                "Estimated": float(calc.estimated_premium),
                "Coverage": float(rec.coverage_amount) / 100  # Scale down for chart comparison
            })
            
            trend_chart_data.append({
                "product": rec.product.name,
                "Min Premium": float(calc.min_premium),
                "Estimated Premium": float(calc.estimated_premium),
                "Max Premium": float(calc.max_premium)
            })
            
    # Risk Score calculation
    if len(recs) == 0:
        risk_score = 0.0
    else:
        # Base risk score = 40.
        # Increases by 10 if debt/assets ratio is high (> 0.5)
        # Increases by 5 if IT/finance (cyber risk)
        # Increases if high employee count
        risk_score = 45.0
        if total_assets > 0 and (total_liability / total_assets) > 0.5:
            risk_score += 15.0
        if company.industry in ("Information Technology", "Financial Services", "Healthcare"):
            risk_score += 10.0
        if len(recs) > 5:
            risk_score += 10.0
        risk_score = min(risk_score, 95.0) # max out at 95%
    
    coverage_gap = total_coverage # assume 100% gap initially
    insurance_penetration = 0.0
    if len(recs) > 0:
        # Mock insurance penetration: let's pretend they have 1 policy active
        insurance_penetration = 12.5 # 1 out of 8 standard covers active
        
    pie_chart_data = [
        {"name": "Current Assets", "value": float(current_assets)},
        {"name": "Fixed Assets", "value": float(fixed_assets)},
        {"name": "Total Liability", "value": float(total_liability)},
        {"name": "Employee Benefits", "value": float(employee_benefits)}
    ]
    
    # Filter out zero values for visual beauty in charts
    pie_chart_data = [d for d in pie_chart_data if d["value"] > 0]
    if not pie_chart_data:
        pie_chart_data = [{"name": "No Data", "value": 1.0}]
        
    return {
        "metrics": {
            "total_assets": float(total_assets),
            "total_liability": float(total_liability),
            "employee_benefits": float(employee_benefits),
            "risk_score": risk_score,
            "coverage_gap": float(coverage_gap),
            "total_premium_opportunity": float(total_premium),
            "max_premium_opportunity": float(max_premium),
            "insurance_penetration": insurance_penetration,
            "recommendation_count": len(recs)
        },
        "charts": {
            "pieChart": pie_chart_data,
            "barChart": bar_chart_data,
            "trendChart": trend_chart_data
        }
    }

from fastapi.responses import StreamingResponse
from backend.reports.pdf_generator import generate_pdf_report

@router.get("/{company_id}/report", status_code=status.HTTP_200_OK)
def download_company_report(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_sales_or_above)
):
    try:
        pdf_buffer = generate_pdf_report(db, company_id)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=risk_report_{company_id}.pdf"}
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
