from dataclasses import dataclass
from typing import Optional


@dataclass
class TripPnLSummary:
    total_km: float
    total_fuel_amount_inr: float
    total_fuel_liters: float
    driver_bata_inr: float
    net_profit_inr: float
    mileage_kmpl: float


class PnLService:
    @staticmethod
    def calculate_trip_pnl(
        start_km: float,
        end_km: Optional[float],
        cash_received_inr: float,
        tolls_and_extras_inr: float,
        fuel_receipts: list,
        driver_bata_inr: float = 0.0,
        is_owner_driver: bool = False,
        driver_username: Optional[str] = None,
    ) -> TripPnLSummary:
        """
        Calculates trip metrics according to domain requirements:
        - total_km = end_km - start_km
        - mileage_kmpl = total_km / total_liters
        - Owner-Driver Bata Rule:
          When is_owner_driver is True or driver_username == "senthilraja",
          driver_bata_inr is strictly enforced to 0.0.
        - net_profit = cash_received_inr - (diesel_total + tolls_and_extras_inr + driver_bata_inr)
        """
        total_km = 0.0
        if end_km is not None and end_km >= start_km:
            total_km = round(end_km - start_km, 2)

        total_fuel_amount = 0.0
        total_fuel_liters = 0.0

        for receipt in fuel_receipts:
            amount = getattr(receipt, "amount_inr", 0.0) or 0.0
            liters = getattr(receipt, "liters", 0.0) or 0.0
            total_fuel_amount += amount
            total_fuel_liters += liters

        total_fuel_amount = round(total_fuel_amount, 2)
        total_fuel_liters = round(total_fuel_liters, 2)

        # Enforce Owner-Driver Bata Rule
        if is_owner_driver or (driver_username and driver_username.strip().lower() == "senthilraja"):
            effective_bata = 0.0
        else:
            effective_bata = round(max(0.0, float(driver_bata_inr or 0.0)), 2)

        net_profit = round(cash_received_inr - (total_fuel_amount + tolls_and_extras_inr + effective_bata), 2)

        mileage_kmpl = 0.0
        if total_fuel_liters > 0 and total_km > 0:
            mileage_kmpl = round(total_km / total_fuel_liters, 2)

        return TripPnLSummary(
            total_km=total_km,
            total_fuel_amount_inr=total_fuel_amount,
            total_fuel_liters=total_fuel_liters,
            driver_bata_inr=effective_bata,
            net_profit_inr=net_profit,
            mileage_kmpl=mileage_kmpl,
        )
