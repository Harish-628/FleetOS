---
name: verify-e2e
description: End-to-end verification checklist and testing protocols for FleetOS
---

# Verify E2E Skill

Checklist for end-to-end verification:
1. **Idempotent Sync Verification:**
   - Execute pytest async test suite: `pytest backend/tests/ -v`.
   - Ensure duplicates with identical `client_event_id` are acknowledged and deduplicated.
2. **Odometer Invariant:**
   - Ensure `end_km > start_km` validation triggers on both client and server.
3. **P&L Math:**
   - Check `net_profit = cash_received - (fuel + tolls_and_bata)`.
   - Check `mileage_kmpl = total_km / total_liters`.
4. **Offline PWA Simulation:**
   - Verify Dexie stores mutations offline.
   - Verify online flush clears sync queue.
5. **Receipt Vault:**
   - Verify client image compression `<= 250 KB`.
