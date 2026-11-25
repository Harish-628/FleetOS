from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.compliance import VehicleCompliance
from app.schemas.compliance import VehicleComplianceResponse
from app.services.compliance_service import ComplianceService

router = APIRouter(prefix="/compliance", tags=["Compliance"])


@router.get("", response_model=VehicleComplianceResponse)
async def get_compliance_status(
    admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns Compliance Countdown Board status for vehicle certificates:
    - RTO Tourist Permit
    - Fitness Certificate (FC)
    - Comprehensive Insurance
    - Pollution Under Control (PUC)
    Alert levels: Green (>30d), Amber (<=30d), Red (Expired).
    Protected by Admin JWT Authentication.
    """
    stmt = select(VehicleCompliance).where(VehicleCompliance.vehicle_id == "BUS-14-23STR")
    result = await db.execute(stmt)
    compliance = result.scalars().first()

    if not compliance:
        # Initialize standard realistic dates for this 23-seater coach
        today = date.today()
        compliance = VehicleCompliance(
            vehicle_id="BUS-14-23STR",
            rto_permit_expiry=today + timedelta(days=120),    # Green (~4 months)
            fitness_cert_expiry=today + timedelta(days=18),   # Amber (18 days left - Urgent)
            insurance_expiry=today + timedelta(days=210),    # Green (7 months)
            puc_expiry=today + timedelta(days=4),            # Amber (4 days left)
        )
        db.add(compliance)
        await db.commit()
        await db.refresh(compliance)

    return ComplianceService.evaluate_vehicle_compliance(compliance)
