import os
import datetime
from io import BytesIO
from decimal import Decimal
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from backend.database.models import Company, ExtractedFinancialData, PredictedValue, InsuranceRecommendation, PremiumCalculation

def format_currency(val: Any) -> str:
    if val is None:
        return "-"
    try:
        dec_val = Decimal(str(val))
        return f"{dec_val:,.2f}"
    except Exception:
        return str(val)

def generate_pdf_report(db: Session, company_id: int) -> BytesIO:
    """
    Generates a professional corporate PDF risk report using ReportLab.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise ValueError("Company not found")
        
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    primary_color = colors.HexColor("#1A365D")   # Deep navy blue
    secondary_color = colors.HexColor("#2B6CB0") # Medium blue
    text_color = colors.HexColor("#2D3748")      # Charcoal
    accent_color = colors.HexColor("#DD6B20")    # Orange accent
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        spaceAfter=25
    )
    
    h1_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=primary_color,
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'SubSectionHeader',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=secondary_color,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_color,
        spaceAfter=8
    )
    
    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_color,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=5
    )
    
    table_text_bold = ParagraphStyle(
        'TableTextBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=primary_color
    )
    
    table_text_normal = ParagraphStyle(
        'TableTextNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        textColor=text_color
    )
    
    story = []
    
    # 1. Header Cover Info
    story.append(Paragraph("RISK ASSESSMENT & INSURANCE REPORT", title_style))
    story.append(Paragraph(f"Company: {company.name} | Generated on: {datetime.date.today().strftime('%B %d, %Y')}", subtitle_style))
    story.append(Spacer(1, 15))
    
    # 2. Company Profile
    story.append(Paragraph("1. Company Profile", h1_style))
    company_data = [
        [Paragraph("Industry:", table_text_bold), Paragraph(company.industry or "Not Provided", table_text_normal),
         Paragraph("CIN:", table_text_bold), Paragraph(company.cin or "Not Provided", table_text_normal)],
        [Paragraph("Annual Turnover:", table_text_bold), Paragraph(f"INR {format_currency(company.turnover)}" if company.turnover else "Not Provided", table_text_normal),
         Paragraph("PAN / GST:", table_text_bold), Paragraph(f"{company.pan or '-'} / {company.gst or '-'}", table_text_normal)],
        [Paragraph("Employees Count:", table_text_bold), Paragraph(str(company.employee_count) if company.employee_count else "Not Provided", table_text_normal),
         Paragraph("Registered Address:", table_text_bold), Paragraph(company.address or "Not Provided", table_text_normal)]
    ]
    t_company = Table(company_data, colWidths=[1.2*inch, 2.2*inch, 1.2*inch, 2.4*inch])
    t_company.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.lightgrey)
    ]))
    story.append(t_company)
    story.append(Spacer(1, 20))
    
    # 3. Financial Summary Table
    story.append(Paragraph("2. Financial Status & Assets", h1_style))
    story.append(Paragraph("The following data has been extracted from verified filings and document reports.", body_style))
    
    # Load extracted financials
    extracted_records = db.query(ExtractedFinancialData).filter(ExtractedFinancialData.company_id == company_id).all()
    
    financials_data = [
        [Paragraph("Financial Field", table_text_bold), 
         Paragraph("Category", table_text_bold), 
         Paragraph("Value (INR)", table_text_bold), 
         Paragraph("Confidence", table_text_bold), 
         Paragraph("Source Page", table_text_bold)]
    ]
    
    for rec in extracted_records:
        # Avoid cluttering with non-financial details
        if rec.field_name in ("company_name", "industry", "pan", "gst", "cin", "address", "risk_factors"):
            continue
        val_display = format_currency(rec.numeric_value) if rec.numeric_value else rec.extracted_value
        financials_data.append([
            Paragraph(rec.field_name.replace("_", " ").title(), table_text_normal),
            Paragraph(rec.field_category, table_text_normal),
            Paragraph(val_display, table_text_normal),
            Paragraph(f"{rec.confidence * 100:.1f}%", table_text_normal),
            Paragraph(rec.source_page or "-", table_text_normal)
        ])
        
    if len(financials_data) > 1:
        t_financials = Table(financials_data, colWidths=[2.2*inch, 1.3*inch, 1.5*inch, 1.0*inch, 1.0*inch])
        t_financials.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F7FAFC")),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
        ]))
        story.append(t_financials)
    else:
        story.append(Paragraph("No financial extraction history found for this company.", body_style))
        
    story.append(Spacer(1, 20))
    
    # 4. Predicted Missing Values
    predicted_records = db.query(PredictedValue).filter(PredictedValue.company_id == company_id).all()
    if predicted_records:
        story.append(Paragraph("3. Predictive Estimates (Missing Financial Data)", h1_style))
        story.append(Paragraph("The system utilized Gemini AI to predict values for critical fields not present in the files, using industry averages and scale mapping.", body_style))
        
        pred_data = [
            [Paragraph("Estimated Field", table_text_bold),
             Paragraph("Min Value (INR)", table_text_bold),
             Paragraph("Expected Value (INR)", table_text_bold),
             Paragraph("Max Value (INR)", table_text_bold),
             Paragraph("Confidence", table_text_bold)]
        ]
        for pred in predicted_records:
            pred_data.append([
                Paragraph(pred.field_name.replace("_", " ").title(), table_text_normal),
                Paragraph(format_currency(pred.min_value), table_text_normal),
                Paragraph(format_currency(pred.expected_value), table_text_normal),
                Paragraph(format_currency(pred.max_value), table_text_normal),
                Paragraph(f"{pred.confidence * 100:.1f}%", table_text_normal)
            ])
            
        t_pred = Table(pred_data, colWidths=[2.0*inch, 1.25*inch, 1.5*inch, 1.25*inch, 1.0*inch])
        t_pred.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#FFF5F5")), # Light Red warning table
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
        ]))
        story.append(t_pred)
        story.append(Spacer(1, 20))
        
    story.append(PageBreak()) # Move to next page for policy recommendations
    
    # 5. Recommended Insurance Policies
    story.append(Paragraph("4. Recommended Insurance Policies & Premium Estimations", h1_style))
    story.append(Paragraph("The following products have been mapped to cover identified business risk exposures.", body_style))
    
    recs = db.query(InsuranceRecommendation).filter(InsuranceRecommendation.company_id == company_id).all()
    
    total_coverage = Decimal(0)
    total_premium = Decimal(0)
    max_premium = Decimal(0)
    
    recs_data = [
        [Paragraph("Product", table_text_bold),
         Paragraph("Priority", table_text_bold),
         Paragraph("Coverage (INR)", table_text_bold),
         Paragraph("Min Premium (INR)", table_text_bold),
         Paragraph("Est. Premium (INR)", table_text_bold),
         Paragraph("Max Premium (INR)", table_text_bold)]
    ]
    
    for r in recs:
        total_coverage += r.coverage_amount
        calcs = r.premium_calculations
        min_p, est_p, max_p = Decimal(0), Decimal(0), Decimal(0)
        if calcs:
            min_p = calcs[0].min_premium
            est_p = calcs[0].estimated_premium
            max_p = calcs[0].max_premium
            total_premium += est_p
            max_premium += max_p
            
        priority_color = primary_color
        if r.priority == "High":
            priority_color = colors.HexColor("#C53030") # red
        elif r.priority == "Medium":
            priority_color = colors.HexColor("#D69E2E") # yellow/gold
            
        priority_p = Paragraph(f"<font color='{priority_color.hexval()}'><b>{r.priority}</b></font>", table_text_normal)
        
        recs_data.append([
            Paragraph(r.product.name, table_text_normal),
            priority_p,
            Paragraph(format_currency(r.coverage_amount), table_text_normal),
            Paragraph(format_currency(min_p), table_text_normal),
            Paragraph(format_currency(est_p), table_text_normal),
            Paragraph(format_currency(max_p), table_text_normal)
        ])
        
    # Append Aggregates
    recs_data.append([
        Paragraph("<b>Total Opportunity</b>", table_text_bold),
        Paragraph("", table_text_normal),
        Paragraph(f"<b>{format_currency(total_coverage)}</b>", table_text_bold),
        Paragraph("", table_text_normal),
        Paragraph(f"<b>{format_currency(total_premium)}</b>", table_text_bold),
        Paragraph(f"<b>{format_currency(max_premium)}</b>", table_text_bold)
    ])
    
    t_recs = Table(recs_data, colWidths=[2.0*inch, 0.7*inch, 1.2*inch, 1.1*inch, 1.1*inch, 1.1*inch])
    t_recs.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EDF2F7")),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#E2E8F0")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(t_recs)
    story.append(Spacer(1, 20))
    
    # 6. Detailed Policy Explanations
    story.append(Paragraph("5. Underwriting Insights & Risk Descriptions", h1_style))
    for r in recs:
        p_data = [
            [Paragraph("Product Name:", table_text_bold), Paragraph(r.product.name, table_text_normal)],
            [Paragraph("Risk Exposure:", table_text_bold), Paragraph(r.risk_description or "N/A", table_text_normal)],
            [Paragraph("Recommendation Reason:", table_text_bold), Paragraph(r.recommendation_reason or "N/A", table_text_normal)],
            [Paragraph("Business Impact:", table_text_bold), Paragraph(r.business_impact or "N/A", table_text_normal)]
        ]
        t_p = Table(p_data, colWidths=[1.8*inch, 5.2*inch])
        t_p.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#EDF2F7"))
        ]))
        story.append(KeepTogether([t_p, Spacer(1, 10)]))
        
    story.append(Spacer(1, 15))
    
    # 7. AI Insights
    story.append(Paragraph("6. AI Strategic Underwriting Insights", h1_style))
    # Fetch risk factor text
    risk_factor_rec = db.query(ExtractedFinancialData).filter(
        ExtractedFinancialData.company_id == company_id,
        ExtractedFinancialData.field_name == "risk_factors"
    ).first()
    
    risk_str = risk_factor_rec.extracted_value if risk_factor_rec else None
    if not risk_str:
        risk_str = "Standard corporate risk profile for " + (company.industry or "General") + " sector companies. Exposure focuses primarily on employee benefits cover and liability covers."
        
    story.append(Paragraph("<b>Extract Risk Indicators:</b>", h2_style))
    story.append(Paragraph(risk_str, body_style))
    
    story.append(Paragraph("<b>Underwriting Opportunities:</b>", h2_style))
    bullet_1 = f"Total identified premium opportunity for this corporate relationship stands at INR <b>{format_currency(total_premium)}</b>."
    bullet_2 = f"Under maximum coverage conditions, the premium pool scales to INR <b>{format_currency(max_premium)}</b>."
    bullet_3 = f"Primary priorities cover: Property / Fire (asset protection) and Group Health cover (worker safety and retention)."
    
    story.append(Paragraph(f"- {bullet_1}", bullet_style))
    story.append(Paragraph(f"- {bullet_2}", bullet_style))
    story.append(Paragraph(f"- {bullet_3}", bullet_style))
    
    # Footer elements
    doc.build(story)
    buffer.seek(0)
    return buffer

