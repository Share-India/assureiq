import datetime
import os
import json
from decimal import Decimal
import pandas as pd
from sqlalchemy.orm import Session
from backend.database.models import Company, ExtractedFinancialData, PredictedValue, InsuranceProduct, InsuranceRecommendation, PremiumCalculation

EXCEL_PATH = os.path.join(os.path.dirname(__file__), "Products_Industry_Wise.xlsx")
_df_cache = None

def get_rates_df():
    global _df_cache
    if _df_cache is None:
        if os.path.exists(EXCEL_PATH):
            try:
                _df_cache = pd.read_excel(EXCEL_PATH, sheet_name="Sheet1")
                _df_cache.columns = [c.strip() if isinstance(c, str) else c for c in _df_cache.columns]
            except Exception as e:
                print(f"Error loading rates Excel: {str(e)}")
        else:
            print(f"Rates Excel not found at {EXCEL_PATH}")
    return _df_cache

def find_matching_row(industry_name: str, df: pd.DataFrame):
    if df is None:
        return None
        
    industry_lower = str(industry_name).lower()
    
    # 1. First check if any row name matches exactly or is a substring
    for idx, row in df.iterrows():
        ind_type = str(row['Industry Type']).lower()
        if ind_type in industry_lower or industry_lower in ind_type:
            return row
            
    # 2. Key-word fallbacks
    keyword_map = {
        "art": "Arts, Entertainment, and Recreation\xa0(NAICS 71)",
        "entertainment": "Arts, Entertainment, and Recreation\xa0(NAICS 71)",
        "recreation": "Arts, Entertainment, and Recreation\xa0(NAICS 71)",
        "event": "Arts, Entertainment, and Recreation\xa0(NAICS 71)",
        "construction": "Construction\xa0(NAICS 23)",
        "builder": "Construction\xa0(NAICS 23)",
        "tech": "Information\xa0(NAICS 51)",
        "software": "Information\xa0(NAICS 51)",
        "computer": "Information\xa0(NAICS 51)",
        "finance": "Finance and Insurance\xa0(NAICS 52)",
        "insurance": "Finance and Insurance\xa0(NAICS 52)",
        "investment": "Finance and Insurance\xa0(NAICS 52)",
        "bank": "Finance and Insurance\xa0(NAICS 52)",
        "broker": "Finance and Insurance\xa0(NAICS 52)",
        "broking": "Finance and Insurance\xa0(NAICS 52)",
        "hospital": "Hospitals\xa0(NAICS 622)",
        "health": "Hospitals\xa0(NAICS 622)",
        "medical": "Hospitals\xa0(NAICS 622)",
        "hotel": "Accommodation and Food Services\xa0(NAICS 72)",
        "food": "Accommodation and Food Services\xa0(NAICS 72)",
        "restaurant": "Accommodation and Food Services\xa0(NAICS 72)",
        "apparel": "Apparel Manufacturing\xa0(NAICS 315)",
        "clothing": "Apparel Manufacturing\xa0(NAICS 315)",
        "manufacturing": "Manufacturing\xa0(NAICS 31-33)",
        "factory": "Manufacturing\xa0(NAICS 31-33)",
        "jewel": "Jeweller, gold, silver & Gems Manufacuring and Wholeseller",
        "gold": "Jeweller, gold, silver & Gems Manufacuring and Wholeseller",
        "silver": "Jeweller, gold, silver & Gems Manufacuring and Wholeseller",
    }
    
    for kw, target in keyword_map.items():
        if kw in industry_lower:
            for idx, row in df.iterrows():
                if str(row['Industry Type']).strip() == target.strip():
                    return row
                    
    # 3. If no match, return the administrative support as default
    for idx, row in df.iterrows():
        if "Administrative and Support" in str(row['Industry Type']):
            return row
            
    return df.iloc[2] if len(df) > 2 else None

SUB_CAT_TO_PRODUCT_MAP = {
    "Fire Insurance": "Fire Insurance",
    "MBD": "Machinery Breakdown Insurance",
    "EEI": "Machinery Breakdown Insurance",
    "Portable Equipment": "Machinery Breakdown Insurance",
    "Burglary": "Stock Insurance",
    "Neon": "Property Insurance",
    "Plate Glass": "Property Insurance",
    "Money Insurance": "Property Insurance",
    "Hull Insurance": "Fleet Insurance",
    "Crop Insurance": "Property Insurance",
    "Cattle Insurance": "Property Insurance",
    "Jeweller Block Insurance": "Stock Insurance",
    "Fine Art Insurance": "Property Insurance",
    "Director & Officers Liability": "Liability Insurance",
    "Professional Indemnity": "Liability Insurance",
    "Product Liability": "Liability Insurance",
    "Commercial General Liability": "Liability Insurance",
    "Stock Broker Indeminity": "Liability Insurance",
    "Cyber Liablity": "Cyber Insurance",
    "Workmen Compensation": "Liability Insurance",
    "Fidelity Insurance": "Liability Insurance",
    "Group Medical Coverage": "Group Health Insurance",
    "Group Perosnal Accident": "Group Health Insurance",
    "Group Term Life": "Group Health Insurance",
    "Gratuity": "Group Health Insurance",
    "Leave Encashment": "Group Health Insurance",
    "Supper Annuity": "Group Health Insurance",
    "Specific Marine": "Fleet Insurance",
    "Open Marine Policy": "Fleet Insurance",
    "Sales Turnover Policy": "Fleet Insurance",
    "Stock Throughout Policy": "Fleet Insurance",
    "Industrial All Risk": "Property Insurance",
    "Contactors All Risk": "Property Insurance",
    "Contractors Plant and Machinery": "Property Insurance",
    "Erection All Risk": "Property Insurance",
    "Avaition All Risk Policy": "Property Insurance",
    "Title Insurance": "Property Insurance",
    "Event Insurance": "Property Insurance",
    "Extended Warranty Insurance": "Property Insurance",
    "Clinical Trials": "Property Insurance",
    "Surety Bond Insurance": "Property Insurance",
    "Body Part Insurance": "Property Insurance",
    "Fire Loss of Profit/ Business Interruption": "Property Insurance",
    "Machinery Loss of Profit": "Property Insurance",
    "Trade Credit": "Property Insurance",
    "Credit Life": "Group Health Insurance"
}

def to_decimal(val_str) -> Decimal:
    if not val_str or val_str == '-':
        return Decimal(0)
    try:
        clean_str = str(val_str).replace(",", "").replace("$", "").replace("₹", "").replace(" ", "").strip()
        return Decimal(clean_str)
    except Exception:
        return Decimal(0)

def get_financial_value(db: Session, company_id: int, field_name: str) -> Decimal:
    data = db.query(ExtractedFinancialData).filter(
        ExtractedFinancialData.company_id == company_id,
        ExtractedFinancialData.field_name == field_name
    ).first()
    
    if data and data.numeric_value is not None:
        return data.numeric_value
        
    pred = db.query(PredictedValue).filter(
        PredictedValue.company_id == company_id,
        PredictedValue.field_name == field_name
    ).first()
    
    if pred and pred.expected_value is not None:
        return pred.expected_value
        
    return Decimal(0)

def calculate_premiums(db: Session, company_id: int):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return
        
    # Clear existing calculations/recommendations
    db.query(InsuranceRecommendation).filter(InsuranceRecommendation.company_id == company_id).delete()
    db.commit()
    
    # Load products and Excel rates
    products = db.query(InsuranceProduct).filter(InsuranceProduct.is_active == True).all()
    df = get_rates_df()
    matched_row = find_matching_row(company.industry or "General Business", df)
    
    # Fetch financials
    fixed_assets = get_financial_value(db, company_id, "fixed_assets")
    machinery = get_financial_value(db, company_id, "machinery")
    turnover = get_financial_value(db, company_id, "turnover")
    employee_count = get_financial_value(db, company_id, "employee_count")
    inventory = get_financial_value(db, company_id, "inventory")
    salary = get_financial_value(db, company_id, "salary")
    
    sub_categories_computed = []
    
    if df is not None and matched_row is not None:
        sub_cat_names = df.iloc[0]
        sub_cat_units = df.iloc[1]
        
        for col_idx in range(3, 49):
            col_name = df.columns[col_idx]
            sub_name = str(sub_cat_names.iloc[col_idx]).strip()
            unit = str(sub_cat_units.iloc[col_idx]).strip()
            rate_val = matched_row.iloc[col_idx]
            
            # Specific NAICS 71 Override for Fine Art Insurance
            if company.industry and "71" in company.industry and sub_name == "Fine Art Insurance":
                rate_val = 0.585
                unit = "per mille"
                
            if pd.isna(rate_val) or rate_val == '-':
                continue
                
            rate_decimal = to_decimal(rate_val)
            coverage = Decimal(0)
            premium = Decimal(0)
            formula = ""
            
            # 1. Asset sub-categories
            if col_idx in range(3, 16):
                if sub_name == "Fire Insurance":
                    coverage = fixed_assets + inventory
                elif sub_name in ("MBD", "EEI", "Portable Equipment"):
                    coverage = machinery
                elif sub_name == "Fine Art Insurance":
                    coverage = fixed_assets * Decimal("0.2")
                else:
                    coverage = fixed_assets * Decimal("0.5")
                    
                if unit == "per mille" and rate_decimal > 0:
                    premium = coverage * (rate_decimal / Decimal(1000))
                    formula = f"Coverage ({coverage:,.0f}) * Rate ({rate_decimal}) / 1000 (per mille)"
                else:
                    premium = coverage * Decimal("0.001")
                    formula = f"Coverage ({coverage:,.0f}) * Default Rate (0.001)"
                    
            # 2. Liability sub-categories
            elif col_idx in range(16, 24):
                coverage = turnover * Decimal("0.2")
                if rate_decimal > 0:
                    premium = turnover * rate_decimal
                    formula = f"Turnover ({turnover:,.0f}) * Rate ({rate_decimal})"
                else:
                    premium = turnover * Decimal("0.001")
                    formula = f"Turnover ({turnover:,.0f}) * Default Rate (0.001)"
                    
            # 3. Employee Benefits sub-categories
            elif col_idx in range(24, 30):
                coverage = employee_count * Decimal("500000")
                if "per Lac per Life" in unit or rate_decimal > 10:
                    premium = employee_count * rate_decimal
                    formula = f"Employees ({employee_count:.0f}) * Rate ({rate_decimal}) per Employee"
                elif unit == "Per 1000 sum assured" or (rate_decimal > 0 and rate_decimal < 10):
                    premium = coverage * (rate_decimal / Decimal(1000))
                    formula = f"Coverage ({coverage:,.0f}) * Rate ({rate_decimal}) / 1000"
                else:
                    premium = employee_count * Decimal("1000")
                    formula = f"Employees ({employee_count:.0f}) * Default Rate (1000)"
                    
            # 4. Marine sub-categories
            elif col_idx in range(30, 34):
                coverage = turnover * Decimal("0.3")
                if rate_decimal > 0:
                    premium = coverage * (rate_decimal / Decimal(1000))
                    formula = f"Coverage ({coverage:,.0f}) * Rate ({rate_decimal}) / 1000"
                else:
                    premium = coverage * Decimal("0.0005")
                    formula = f"Coverage ({coverage:,.0f}) * Default Rate (0.0005)"
                    
            # 5. Special sub-categories
            elif col_idx in range(34, 45):
                coverage = fixed_assets * Decimal("0.8")
                if rate_decimal > 0:
                    premium = coverage * (rate_decimal / Decimal(1000))
                    formula = f"Coverage ({coverage:,.0f}) * Rate ({rate_decimal}) / 1000"
                else:
                    premium = coverage * Decimal("0.001")
                    formula = f"Coverage ({coverage:,.0f}) * Default Rate (0.001)"
                    
            # 6. Safeguards Profits
            elif col_idx in range(45, 49):
                coverage = turnover * Decimal("0.5")
                if rate_decimal > 0:
                    premium = coverage * (rate_decimal / Decimal(1000))
                    formula = f"Coverage ({coverage:,.0f}) * Rate ({rate_decimal}) / 1000"
                else:
                    premium = coverage * Decimal("0.001")
                    formula = f"Coverage ({coverage:,.0f}) * Default Rate (0.001)"
                    
            if premium > 0:
                sub_categories_computed.append({
                    "sub_category_name": sub_name,
                    "coverage_amount": float(coverage),
                    "estimated_premium": float(premium),
                    "min_premium": float(premium * Decimal("0.85")),
                    "max_premium": float(premium * Decimal("1.25")),
                    "rate": str(rate_val) if not (company.industry and "71" in company.industry and sub_name == "Fine Art Insurance") else "0.585",
                    "unit": unit,
                    "formula": formula
                })

    # Group sub-categories by parent products and write to database
    for prod in products:
        # Filter sub-categories mapping to this product
        prod_subs = [s for s in sub_categories_computed if SUB_CAT_TO_PRODUCT_MAP.get(s["sub_category_name"]) == prod.name]
        
        if prod_subs:
            total_coverage = sum(s["coverage_amount"] for s in prod_subs)
            total_premium = sum(s["estimated_premium"] for s in prod_subs)
            total_min = sum(s["min_premium"] for s in prod_subs)
            total_max = sum(s["max_premium"] for s in prod_subs)
            
            formula_str = "Sum of sub-categories: " + ", ".join([f"{s['sub_category_name']} ({s['rate']})" for s in prod_subs])
            
            # Create recommendation
            rec = InsuranceRecommendation(
                company_id=company_id,
                product_id=prod.id,
                coverage_amount=Decimal(str(total_coverage)),
                priority="High" if total_premium > 50000 else "Medium",
                risk_description=f"Consolidated protection package including: {', '.join([s['sub_category_name'] for s in prod_subs])}.",
                recommendation_reason=f"Recommended for {company.industry} sector based on industry mappings.",
                business_impact=f"Protects operations and liabilities across sub-categories.",
                sub_categories=json.dumps(prod_subs)
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)
            
            # Create calculation
            calc = PremiumCalculation(
                company_id=company_id,
                recommendation_id=rec.id,
                min_premium=Decimal(str(total_min)),
                estimated_premium=Decimal(str(total_premium)),
                max_premium=Decimal(str(total_max)),
                calculation_formula=formula_str,
                sub_categories=json.dumps(prod_subs)
            )
            db.add(calc)
            db.commit()

    print(f"Successfully calculated premiums and recommendations for company ID {company_id}.")
