---
name: offline-pwa-sync
description: Offline-first Dexie.js mutation queue and background synchronization engine
---

# Offline PWA Sync Skill

Invariants for offline data lifecycle:
1. Every local mutation creates a record in Dexie.js (`IndexedDB`) with:
   - `client_event_id`: client-side generated UUIDv4.
   - `recorded_at`: ISO-8601 UTC timestamp.
   - `synced`: boolean flag (default `false`).
2. Queue Mutation:
   - Push to `sync_queue` table in Dexie.
   - Fire event to update reactive sync badge in UI (`Offline • X Records Queued`).
3. Flush Protocol:
   - When network comes online or user clicks 'Sync Now':
   - Read all records from `sync_queue` ordered by `created_at`.
   - Dispatch `POST /api/v1/sync/batch`.
   - On HTTP 200, update local records to `synced: true` and clear processed queue items.
   - Update sync badge to `Online • All Synced`.
