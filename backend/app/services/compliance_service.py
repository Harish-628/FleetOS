from datetime import date
from typing import Literal
from app.models.compliance import VehicleCompliance
from app.schemas.compliance import ComplianceItem, VehicleComplianceResponse


class ComplianceService:
    @staticmethod
    def calculate_status(expiry_date: date, today: date) -> tuple[int, Literal["GREEN", "AMBER", "RED"], str]:
        delta_days = (expiry_date - today).days
        
        if delta_days < 0:
            return delta_days, "RED", f"Expired {abs(delta_days)} days ago"
        elif delta_days <= 30:
            return delta_days, "AMBER", f"{delta_days} days left (Action Required)"
        else:
            return delta_days, "GREEN", f"{delta_days} days remaining"

    @classmethod
    def evaluate_vehicle_compliance(cls, record: VehicleCompliance, current_date: date | None = None) -> VehicleComplianceResponse:
        today = current_date or date.today()
        
        certificates = [
            ("RTO Tourist Permit", "RTO_PERMIT", record.rto_permit_expiry),
            ("Fitness Certificate (FC)", "FC_CERTIFICATE", record.fitness_cert_expiry),
            ("Comprehensive Insurance", "INSURANCE", record.insurance_expiry),
            ("Pollution Under Control (PUC)", "PUC_CERTIFICATE", record.puc_expiry),
        ]
        
        items = []
        has_expired = False
        requires_attention = False

        for name, code, expiry in certificates:
            days, status, label = cls.calculate_status(expiry, today)
            if status == "RED":
                has_expired = True
                requires_attention = True
            elif status == "AMBER":
                requires_attention = True

            items.append(
                ComplianceItem(
                    name=name,
                    code=code,
                    expiry_date=expiry,
                    days_remaining=days,
                    status=status,
                    status_label=label,
                )
            )

        return VehicleComplianceResponse(
            vehicle_id=record.vehicle_id,
            items=items,
            has_expired=has_expired,
            requires_attention=requires_attention,
        )
