from dataclasses import dataclass
from app.services.pnl_service import PnLService


@dataclass
class MockReceipt:
    amount_inr: float
    liters: float


def test_pnl_calculator_standard_trip():
    receipts = [
        MockReceipt(amount_inr=6311.0, liters=65.4),
        MockReceipt(amount_inr=3200.0, liters=33.2),
    ]

    pnl = PnLService.calculate_trip_pnl(
        start_km=142000.0,
        end_km=142592.0,
        cash_received_inr=35000.0,
        tolls_and_extras_inr=2850.0,
        fuel_receipts=receipts,
    )

    # total_km = 142592 - 142000 = 592.0
    assert pnl.total_km == 592.0
    # fuel amount = 6311 + 3200 = 9511.0
    assert pnl.total_fuel_amount_inr == 9511.0
    # fuel liters = 65.4 + 33.2 = 98.6
    assert pnl.total_fuel_liters == 98.6
    # net_profit = 35000 - (9511 + 2850) = 22639.0
    assert pnl.net_profit_inr == 22639.0
    # mileage = 592.0 / 98.6 = 6.0 km/l
    assert pnl.mileage_kmpl == 6.0


def test_pnl_calculator_zero_fuel():
    # Trip with no fuel stops
    pnl = PnLService.calculate_trip_pnl(
        start_km=1000.0,
        end_km=1150.0,
        cash_received_inr=8000.0,
        tolls_and_extras_inr=500.0,
        fuel_receipts=[],
    )

    assert pnl.total_km == 150.0
    assert pnl.total_fuel_amount_inr == 0.0
    assert pnl.total_fuel_liters == 0.0
    assert pnl.net_profit_inr == 7500.0
    assert pnl.mileage_kmpl == 0.0  # Guard against division by zero
