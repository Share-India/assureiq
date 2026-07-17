import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey, Enum, Text, Float
from sqlalchemy.orm import relationship
from backend.database.db import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="Sales Executive") # Admin, Manager, Sales Executive
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    documents = relationship("Document", back_populates="uploader")
    audit_logs = relationship("AuditLog", back_populates="user")

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    industry = Column(String(500), nullable=True)
    turnover = Column(Numeric(20, 2), nullable=True)
    employee_count = Column(Integer, nullable=True)
    pan = Column(String(10), unique=True, nullable=True)
    gst = Column(String(15), unique=True, nullable=True)
    cin = Column(String(21), unique=True, nullable=True)
    address = Column(Text, nullable=True)
    credit_rating = Column(String(50), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    documents = relationship("Document", back_populates="company", cascade="all, delete-orphan")
    extracted_data = relationship("ExtractedFinancialData", back_populates="company", cascade="all, delete-orphan")
    predicted_values = relationship("PredictedValue", back_populates="company", cascade="all, delete-orphan")
    recommendations = relationship("InsuranceRecommendation", back_populates="company", cascade="all, delete-orphan")
    premium_calculations = relationship("PremiumCalculation", back_populates="company", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(50), nullable=False) # PDF, Excel, CSV, Image
    status = Column(String(50), default="Uploaded") # Uploaded, Processing, Extracted, Failed
    error_message = Column(Text, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    file_hash = Column(String(64), nullable=True, index=True)
    
    company = relationship("Company", back_populates="documents")
    uploader = relationship("User", back_populates="documents")
    extracted_data = relationship("ExtractedFinancialData", back_populates="document", cascade="all, delete-orphan")

class ExtractedFinancialData(Base):
    __tablename__ = "extracted_financial_data"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    field_name = Column(String(100), nullable=False)
    field_category = Column(String(100), nullable=False) # Assets, Liabilities, Employee Benefits, Revenue, Expenses, Business Info
    extracted_value = Column(Text, nullable=True)
    numeric_value = Column(Numeric(20, 2), nullable=True)
    confidence = Column(Float, default=1.0)
    source_page = Column(String(50), nullable=True)
    is_verified = Column(Boolean, default=False)
    extracted_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    company = relationship("Company", back_populates="extracted_data")
    document = relationship("Document", back_populates="extracted_data")

class PredictedValue(Base):
    __tablename__ = "predicted_values"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    field_name = Column(String(100), nullable=False)
    min_value = Column(Numeric(20, 2), nullable=True)
    expected_value = Column(Numeric(20, 2), nullable=True)
    max_value = Column(Numeric(20, 2), nullable=True)
    confidence = Column(Float, default=1.0)
    predicted_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    company = relationship("Company", back_populates="predicted_values")

class InsuranceProduct(Base):
    __tablename__ = "insurance_products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    base_rate = Column(Numeric(20, 6), nullable=False)
    rate_type = Column(String(50), nullable=False) # PercentageOfAssets, PerEmployee, PercentageOfTurnover, FlatRate
    is_active = Column(Boolean, default=True)
    
    recommendations = relationship("InsuranceRecommendation", back_populates="product")

class InsuranceRecommendation(Base):
    __tablename__ = "insurance_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("insurance_products.id"), nullable=False)
    coverage_amount = Column(Numeric(20, 2), nullable=False)
    priority = Column(String(50), default="Medium") # High, Medium, Low
    risk_description = Column(Text, nullable=True)
    recommendation_reason = Column(Text, nullable=True)
    business_impact = Column(Text, nullable=True)
    sub_categories = Column(Text, nullable=True) # JSON serialized
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    company = relationship("Company", back_populates="recommendations")
    product = relationship("InsuranceProduct", back_populates="recommendations")
    premium_calculations = relationship("PremiumCalculation", back_populates="recommendation", cascade="all, delete-orphan")

class PremiumCalculation(Base):
    __tablename__ = "premium_calculations"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    recommendation_id = Column(Integer, ForeignKey("insurance_recommendations.id", ondelete="CASCADE"), nullable=False)
    min_premium = Column(Numeric(20, 2), nullable=False)
    estimated_premium = Column(Numeric(20, 2), nullable=False)
    max_premium = Column(Numeric(20, 2), nullable=False)
    calculation_formula = Column(Text, nullable=False)
    sub_categories = Column(Text, nullable=True) # JSON serialized
    calculated_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    company = relationship("Company", back_populates="premium_calculations")
    recommendation = relationship("InsuranceRecommendation", back_populates="premium_calculations")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="audit_logs")
