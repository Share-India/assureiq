import os
import pdfplumber
import pandas as pd
from PIL import Image
import io
from typing import List

try:
    import pytesseract
except ImportError:
    pytesseract = None

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Attempts to extract digital text page-by-page from the PDF using pypdf (pure Python).
    This is extremely fast and avoids binary DLL dependencies.
    """
    import pypdf
    text_content = []
    try:
        reader = pypdf.PdfReader(pdf_path)
        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_content.append(f"--- PAGE {idx + 1} ---\n{page_text}")
    except Exception as e:
        print(f"Error extracting digital text from PDF {pdf_path} using pypdf: {str(e)}")
        
    return "\n\n".join(text_content)

def convert_pdf_to_images(pdf_path: str) -> List[bytes]:
    """
    Scanned PDF pages to images conversion. Returning empty list because rendering
    PDF to images requires binary modules that trigger DLL blocks. Pure-python pdfplumber
    text extraction will still parse all digital content.
    """
    return []

def extract_from_excel(excel_path: str) -> str:
    """
    Reads an Excel file (XLSX, XLS, CSV) using pandas.
    Converts sheet data into structured markdown format for Gemini to parse.
    """
    output = []
    try:
        if excel_path.lower().endswith(".csv"):
            df = pd.read_csv(excel_path)
            output.append("--- CSV Data ---")
            output.append(df.to_markdown(index=False))
        else:
            xls = pd.ExcelFile(excel_path)
            for sheet_name in xls.sheet_names:
                df = pd.read_excel(xls, sheet_name=sheet_name)
                output.append(f"--- Sheet: {sheet_name} ---")
                output.append(df.to_markdown(index=False))
    except Exception as e:
        print(f"Error reading Excel/CSV {excel_path}: {str(e)}")
        try:
            df = pd.read_excel(excel_path) if not excel_path.lower().endswith(".csv") else pd.read_csv(excel_path)
            return df.to_csv(index=False)
        except Exception:
            return f"Error loading file data: {str(e)}"
            
    return "\n\n".join(output)

def local_ocr_image_fallback(image_path: str) -> str:
    """
    Fallback local OCR for images when pytesseract is installed.
    """
    if pytesseract is None:
        return "Local OCR (Tesseract) not installed. Please set up Tesseract OCR."
        
    try:
        img = Image.open(image_path)
        return pytesseract.image_to_string(img)
    except Exception as e:
        return f"Error running local OCR fallback: {str(e)}"
