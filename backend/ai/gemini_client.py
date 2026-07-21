import os
import json
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from backend.ocr.ocr_service import (
    extract_text_from_pdf,
    convert_pdf_to_images,
    extract_from_excel,
    local_ocr_image_fallback
)

# 1. Models for Gemini structured extraction output
class ExtractedField(BaseModel):
    value: Optional[str] = Field(None, description="The extracted text or numeric value. Clean values (e.g. '500000' or 'Active').")
    confidence: float = Field(1.0, description="Confidence score between 0.0 and 1.0.")
    source_page: Optional[str] = Field(None, description="The page number or location identifier.")

class FinancialExtractionSchema(BaseModel):
    company_name: Optional[ExtractedField] = None
    industry: Optional[ExtractedField] = None
    pan: Optional[ExtractedField] = None
    gst: Optional[ExtractedField] = None
    cin: Optional[ExtractedField] = None
    address: Optional[ExtractedField] = None
    credit_rating: Optional[ExtractedField] = None
    
    # Assets
    current_assets: Optional[ExtractedField] = None
    fixed_assets: Optional[ExtractedField] = None
    inventory: Optional[ExtractedField] = None
    machinery: Optional[ExtractedField] = None
    cash: Optional[ExtractedField] = None
    bank_balance: Optional[ExtractedField] = None
    receivables: Optional[ExtractedField] = None
    
    # Liabilities
    loans: Optional[ExtractedField] = None
    current_liability: Optional[ExtractedField] = None
    long_term_liability: Optional[ExtractedField] = None
    creditors: Optional[ExtractedField] = None
    
    # Employee Benefits
    employee_count: Optional[ExtractedField] = None
    salary: Optional[ExtractedField] = None
    pf: Optional[ExtractedField] = None
    esic: Optional[ExtractedField] = None
    gratuity: Optional[ExtractedField] = None
    medical: Optional[ExtractedField] = None
    bonus: Optional[ExtractedField] = None
    
    # Revenue/Expenses
    turnover: Optional[ExtractedField] = None
    revenue: Optional[ExtractedField] = None
    expenses: Optional[ExtractedField] = None
    
    # Risk Info
    risk_factors: Optional[ExtractedField] = None

# 2. Models for missing value predictions
class PredictField(BaseModel):
    field_name: str = Field(..., description="Name of the missing field.")
    min_value: float = Field(..., description="Lower-bound prediction.")
    expected_value: float = Field(..., description="Expected value prediction.")
    max_value: float = Field(..., description="Upper-bound prediction.")
    confidence: float = Field(..., description="Confidence score 0.0 to 1.0.")

class MissingPredictionSchema(BaseModel):
    predictions: List[PredictField]

def get_gemini_client() -> Optional[genai.Client]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Warning: GEMINI_API_KEY is not defined in the environment.")
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Gemini client: {str(e)}")
        return None

def extract_financial_data(file_path: str, file_type: str) -> Optional[Dict[str, Any]]:
    """
    Main entry point for extracting corporate details from files.
    Tries digital text extraction first. If scanned, falls back to PyMuPDF image conversion
    and sends image parts to Gemini Vision.
    """
    client = get_gemini_client()
    if not client:
        raise ValueError("GEMINI_API_KEY is not defined in the environment. Live extraction is unavailable.")
        
    prompt = """
    You are an expert corporate financial analyst and risk manager.
    Analyze the uploaded document and extract all available corporate information (including Company Name, Industry, PAN, GST, CIN, Address, and Credit Rating if available), asset metrics, liability details, employee benefits, and business indicators.
    Ensure that:
    1. Numeric values contain digits only where applicable (decimals allowed). E.g. '12000000.00' instead of '' or 'Rs 1.2 Crore'.
    2. CRITICAL SCALING RULE: Financial tables in Indian filings often express values in Lakhs (1 Lakh = 100,000 INR) or Crores (1 Crore = 10,000,000 INR) or Thousands (1 Thousand = 1,000 INR).
       Check table/column headers, footnotes, or text titles very carefully to identify if a scaling factor is applied.
       YOU MUST NORMALIZE AND MULTIPLY ALL EXTRACTED NUMBERS BY THEIR SCALE FACTOR to output absolute Rupee values (e.g. if turnover is '15.5 Crore', you must return '155000000.00'. If cash is '12 Lakh', you must return '1200000.00').
    3. Assess the confidence score of each field based on how clear it is.
    4. Note the source page of each extracted value.
    5. Return valid JSON only, complying with the requested schema. Do not output markdown, explanations, or codeblocks.
    """
    
    try:
        # Excel/CSV
        if file_type in ("XLSX", "XLS", "CSV"):
            sheet_content = extract_from_excel(file_path)
            contents = [sheet_content, prompt]
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=FinancialExtractionSchema,
                    temperature=0.1
                )
            )
            return json.loads(response.text)
            
        # PDF
        elif file_type == "PDF":
            digital_text = extract_text_from_pdf(file_path)
            # If text length is trivial, assume it's scanned and use Vision
            if len(digital_text.strip()) < 150:
                print("PDF text is empty or trivial. Converting pages to images for Gemini Vision...")
                image_pages = convert_pdf_to_images(file_path)
                if not image_pages:
                    raise Exception("Failed to convert scanned PDF to images.")
                    
                contents = []
                # Append up to first 5 pages to prevent token overflow in flash
                for idx, img_bytes in enumerate(image_pages[:5]):
                    contents.append(
                        types.Part.from_bytes(
                            data=img_bytes,
                            mime_type="image/png"
                        )
                    )
                contents.append(prompt)
                
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=FinancialExtractionSchema,
                        temperature=0.1
                    )
                )
                return json.loads(response.text)
            else:
                contents = [digital_text, prompt]
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=FinancialExtractionSchema,
                        temperature=0.1
                    )
                )
                return json.loads(response.text)
                
        # Image
        elif file_type in ("PNG", "JPG", "JPEG"):
            with open(file_path, "rb") as f:
                img_bytes = f.read()
            img_part = types.Part.from_bytes(
                data=img_bytes,
                mime_type=f"image/{file_type.lower() if file_type != 'JPG' else 'jpeg'}"
            )
            contents = [img_part, prompt]
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=FinancialExtractionSchema,
                    temperature=0.1
                )
            )
            return json.loads(response.text)
            
    except Exception as e:
        print(f"Gemini extraction failed for {file_path}: {str(e)}")
        
    return None

def predict_missing_financials(
    company_name: str, 
    industry: str, 
    available_data: Dict[str, Any], 
    missing_fields: List[str]
) -> Optional[Dict[str, Any]]:
    """
    Estimates values for missing corporate indicators based on available financial data
    and general industry benchmarks.
    """
    client = get_gemini_client()
    if not client:
        return {"predictions": []}
        
    prompt = f"""
    You are an expert insurance underwriter.
    We are underwriting corporate insurance for '{company_name}', in the '{industry}' industry.
    
    Here is our currently available financial data:
    {json.dumps(available_data, indent=2)}
    
    We have missing values for the following fields: {', '.join(missing_fields)}.
    
    Use industry benchmarks, the company's scale, and other details to estimate:
    1. Min Value (conservative low estimation)
    2. Expected Value (average benchmark value)
    3. Max Value (upper-bound benchmark value)
    4. Confidence (0.0 to 1.0 based on available correlations)
    
    Return valid JSON only matching the schema.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=MissingPredictionSchema,
                temperature=0.2
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini missing value prediction failed: {str(e)}")
        
    return {"predictions": []}

