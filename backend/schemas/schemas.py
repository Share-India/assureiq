from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "Sales Executive" # Admin, Manager, Sales Executive

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

# Company schemas
class CompanyBase(BaseModel):
    name: str
    industry: Optional[str] = None
    turnover: Optional[Decimal] = None
    employee_count: Optional[int] = None
    pan: Optional[str] = None
    gst: Optional[str] = None
    cin: Optional[str] = None
    address: Optional[str] = None
    credit_rating: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    created_by_username: Optional[str] = None

    class Config:
        from_attributes = True

# Document schemas
class DocumentResponse(BaseModel):
    id: int
    company_id: int
    filename: str
    file_type: str
    status: str
    error_message: Optional[str] = None
    uploaded_at: datetime
    uploaded_by: Optional[int] = None
    uploaded_by_username: Optional[str] = None
    file_hash: Optional[str] = None

    class Config:
        from_attributes = True

# Financial Data schemas
class ExtractedDataResponse(BaseModel):
    id: int
    field_name: str
    field_category: str
    extracted_value: Optional[str] = None
    numeric_value: Optional[Decimal] = None
    confidence: float
    source_page: Optional[str] = None
    is_verified: bool
    extracted_at: datetime

    class Config:
        from_attributes = True

class PredictedValueResponse(BaseModel):
    id: int
    field_name: str
    min_value: Optional[Decimal] = None
    expected_value: Optional[Decimal] = None
    max_value: Optional[Decimal] = None
    confidence: float
    predicted_at: datetime

    class Config:
        from_attributes = True

import json
from pydantic import model_validator

# Premium & Recommendation schemas
class PremiumCalculationResponse(BaseModel):
    id: int
    min_premium: Decimal
    estimated_premium: Decimal
    max_premium: Decimal
    calculation_formula: str
    calculated_at: datetime
    sub_categories: Optional[List[Dict[str, Any]]] = None

    @model_validator(mode='before')
    @classmethod
    def parse_sub_categories(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            sub_cats = getattr(data, 'sub_categories', None)
            if isinstance(sub_cats, str) and sub_cats:
                try:
                    # Parse to list/dict but keep it in a temporary variable or convert ORM object attribute
                    # We can set an attribute on the object or return a dict instead!
                    # Actually, if we return a dict, Pydantic will parse from dict!
                    # Converting to dict is much safer to avoid mutating ORM objects or causing SQLAlchemy issues.
                    fields = {
                        "id": data.id,
                        "min_premium": data.min_premium,
                        "estimated_premium": data.estimated_premium,
                        "max_premium": data.max_premium,
                        "calculation_formula": data.calculation_formula,
                        "calculated_at": data.calculated_at,
                        "sub_categories": json.loads(sub_cats)
                    }
                    return fields
                except Exception:
                    pass
        elif isinstance(data, dict) and isinstance(data.get('sub_categories'), str) and data.get('sub_categories'):
            try:
                data['sub_categories'] = json.loads(data['sub_categories'])
            except Exception:
                data['sub_categories'] = []
        return data

    class Config:
        from_attributes = True

class RecommendationResponse(BaseModel):
    id: int
    product_name: str
    product_description: Optional[str] = None
    coverage_amount: Decimal
    priority: str
    risk_description: Optional[str] = None
    recommendation_reason: Optional[str] = None
    business_impact: Optional[str] = None
    sub_categories: Optional[List[Dict[str, Any]]] = None
    premium_calculations: List[PremiumCalculationResponse] = []

    @model_validator(mode='before')
    @classmethod
    def parse_sub_categories(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            sub_cats = getattr(data, 'sub_categories', None)
            if isinstance(sub_cats, str) and sub_cats:
                try:
                    # Convert to dict to avoid mutating the ORM object attributes directly
                    fields = {
                        "id": data.id,
                        "product_name": data.product.name if data.product else "",
                        "product_description": data.product.description if data.product else "",
                        "coverage_amount": data.coverage_amount,
                        "priority": data.priority,
                        "risk_description": data.risk_description,
                        "recommendation_reason": data.recommendation_reason,
                        "business_impact": data.business_impact,
                        "sub_categories": json.loads(sub_cats),
                        "premium_calculations": data.premium_calculations
                    }
                    return fields
                except Exception:
                    pass
        elif isinstance(data, dict) and isinstance(data.get('sub_categories'), str) and data.get('sub_categories'):
            try:
                data['sub_categories'] = json.loads(data['sub_categories'])
            except Exception:
                data['sub_categories'] = []
        return data

    class Config:
        from_attributes = True

# Complete Company Details response
class CompanyDetailResponse(CompanyResponse):
    documents: List[DocumentResponse] = []
    extracted_data: List[ExtractedDataResponse] = []
    predicted_values: List[PredictedValueResponse] = []
    recommendations: List[RecommendationResponse] = []

# Aggregated Dashboard Metrics
class DashboardMetricsResponse(BaseModel):
    total_assets: Decimal
    total_liability: Decimal
    employee_benefits: Decimal
    risk_score: float
    coverage_gap: Decimal
    total_premium_opportunity: Decimal
    max_premium_opportunity: Decimal
    insurance_penetration: float
    recommendation_count: int
