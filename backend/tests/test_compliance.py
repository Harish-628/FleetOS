from datetime import date, timedelta
from app.models.compliance import VehicleCompliance
from app.services.compliance_service import ComplianceService


def test_compliance_status_thresholds():
    today = date(2026, 11, 23)

    # 1. More than 30 days remaining -> GREEN
    d_green, s_green, _ = ComplianceService.calculate_status(today + timedelta(days=45), today)
    assert d_green == 45
    assert s_green == "GREEN"

    # 2. Exactly 30 days remaining -> AMBER
    d_amber30, s_amber30, _ = ComplianceService.calculate_status(today + timedelta(days=30), today)
    assert d_amber30 == 30
    assert s_amber30 == "AMBER"

    # 3. 5 days remaining -> AMBER
    d_amber5, s_amber5, _ = ComplianceService.calculate_status(today + timedelta(days=5), today)
    assert d_amber5 == 5
    assert s_amber5 == "AMBER"

    # 4. Past expiry (negative days) -> RED
    d_red, s_red, _ = ComplianceService.calculate_status(today - timedelta(days=2), today)
    assert d_red == -2
    assert s_red == "RED"


def test_vehicle_compliance_evaluation():
    today = date(2026, 11, 23)
    rec = VehicleCompliance(
        vehicle_id="BUS-14-23STR",
        rto_permit_expiry=today + timedelta(days=60),  # GREEN
        fitness_cert_expiry=today + timedelta(days=15),  # AMBER
        insurance_expiry=today + timedelta(days=100),  # GREEN
        puc_expiry=today - timedelta(days=1),  # RED (Expired)
    )

    eval_res = ComplianceService.evaluate_vehicle_compliance(rec, current_date=today)
    assert eval_res.has_expired is True
    assert eval_res.requires_attention is True
    assert len(eval_res.items) == 4

    puc = next(i for i in eval_res.items if i.code == "PUC_CERTIFICATE")
    assert puc.status == "RED"

    fc = next(i for i in eval_res.items if i.code == "FC_CERTIFICATE")
    assert fc.status == "AMBER"

    permit = next(i for i in eval_res.items if i.code == "RTO_PERMIT")
    assert permit.status == "GREEN"
