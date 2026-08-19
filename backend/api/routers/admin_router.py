from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.database.db import get_db
from backend.database.models import User, RuleConfig, InsuranceProduct
from backend.schemas.schemas import RuleConfigResponse, RuleConfigUpdateMultiple, RuleConfigBase
from backend.api.routers.auth import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/rules", response_model=List[RuleConfigResponse])
def get_all_rules(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(RuleConfig).all()

@router.put("/rules", response_model=List[RuleConfigResponse])
def update_rules(payload: RuleConfigUpdateMultiple, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    updated = []
    for rule_data in payload.rules:
        rule = db.query(RuleConfig).filter(RuleConfig.key == rule_data.key).first()
        if rule:
            rule.value = rule_data.value
            if rule_data.description:
                rule.description = rule_data.description
        else:
            rule = RuleConfig(
                key=rule_data.key,
                value=rule_data.value,
                description=rule_data.description
            )
            db.add(rule)
        updated.append(rule)
    
    db.commit()
    for u in updated:
        db.refresh(u)
    return updated

