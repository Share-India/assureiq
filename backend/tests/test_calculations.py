import pytest
from decimal import Decimal
import bcrypt

# Password hashing verification
def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def test_password_hashing():
    pwd = "Enterprise@123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong_pwd", hashed) is False

# Formula logic validations
def test_property_insurance_premium():
    # Formula: Coverage (Fixed Assets) * Base Rate
    coverage = Decimal("5000000.00") # 50 Lakhs
    base_rate = Decimal("0.001500") # 0.15%
    
    est_premium = coverage * base_rate
    min_premium = est_premium * Decimal("0.85")
    max_premium = est_premium * Decimal("1.25")
    
    assert est_premium == Decimal("7500.00")
    assert min_premium == Decimal("6375.00")
    assert max_premium == Decimal("9375.00")

def test_employee_health_insurance_premium():
    # Formula: Employees * Base Rate per Employee
    employees = 120
    base_rate = Decimal("2500.00") # 2500 INR
    
    est_premium = employees * base_rate
    min_premium = est_premium * Decimal("0.85")
    max_premium = est_premium * Decimal("1.25")
    
    assert est_premium == Decimal("300000.00")
    assert min_premium == Decimal("255000.00")
    assert max_premium == Decimal("375000.00")

def test_cyber_insurance_premium():
    # Formula: Turnover * Base Rate
    turnover = Decimal("150000000.00") # 15 Crore
    base_rate = Decimal("0.000500") # 0.05%
    
    est_premium = turnover * base_rate
    min_premium = est_premium * Decimal("0.85")
    max_premium = est_premium * Decimal("1.25")
    
    assert est_premium == Decimal("75000.00")
    assert min_premium == Decimal("63750.00")
    assert max_premium == Decimal("93750.00")
