import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.database.db import engine, Base, SessionLocal
from backend.database.models import InsuranceProduct, User
import bcrypt

def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def init_db():
    print("Creating tables in database...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")
    
    db = SessionLocal()
    try:
        # Check if products exist, otherwise populate default insurance products
        if db.query(InsuranceProduct).count() == 0:
            print("Populating default insurance products...")
            default_products = [
                InsuranceProduct(
                    name="Property Insurance",
                    description="Covers physical damage to buildings, land, and fixed assets due to accidents, fire, or disasters.",
                    base_rate=0.001500, # 0.15% of coverage amount
                    rate_type="PercentageOfAssets"
                ),
                InsuranceProduct(
                    name="Machinery Breakdown Insurance",
                    description="Covers repair/replacement costs of machinery, engines, and equipment due to internal electrical or mechanical breakdown.",
                    base_rate=0.002500, # 0.25% of machinery value
                    rate_type="PercentageOfAssets"
                ),
                InsuranceProduct(
                    name="Group Health Insurance",
                    description="Provides health insurance coverage to all registered employees.",
                    base_rate=2500.000000, # 2500 Rupees per employee per year
                    rate_type="PerEmployee"
                ),
                InsuranceProduct(
                    name="Cyber Insurance",
                    description="Covers liability and recovery expenses arising from data breaches, ransomware attacks, or system hacks.",
                    base_rate=0.000500, # 0.05% of company turnover
                    rate_type="PercentageOfTurnover"
                ),
                InsuranceProduct(
                    name="Fire Insurance",
                    description="Specific coverage against fire damages for buildings, warehouses, and storage assets.",
                    base_rate=0.001000, # 0.1% of warehouse / fixed assets value
                    rate_type="PercentageOfAssets"
                ),
                InsuranceProduct(
                    name="Fleet Insurance",
                    description="Covers corporate vehicle fleet liability and collision damages.",
                    base_rate=15000.000000, # Flat rate or estimated per vehicle (modeled here)
                    rate_type="FlatRate"
                ),
                InsuranceProduct(
                    name="Stock Insurance",
                    description="Covers loss or damage to inventories, raw materials, and finished goods.",
                    base_rate=0.001800, # 0.18% of average stock/inventory value
                    rate_type="PercentageOfAssets"
                ),
                InsuranceProduct(
                    name="Liability Insurance",
                    description="Protects the business against legal claims resulting from injuries or damages caused to third parties.",
                    base_rate=0.000300, # 0.03% of company turnover
                    rate_type="PercentageOfTurnover"
                )
            ]
            db.add_all(default_products)
            db.commit()
            print("Default insurance products populated.")
            
        # Check if default admin exists
        if db.query(User).filter(User.username == "admin").count() == 0:
            print("Creating default admin account...")
            admin_user = User(
                username="admin",
                email="admin@insurance-sys.com",
                hashed_password=hash_password("Admin@123"),
                role="Admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("Default admin account created (admin / Admin@123).")
            
    except Exception as e:
        print(f"Error initializing database content: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
