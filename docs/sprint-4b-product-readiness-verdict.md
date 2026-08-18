# Sprint 4B — Product Readiness Verdict

## Question

**Can DeMaxtore provide operational port-to-port shipment visibility without IoT hardware?**

## Verdict: **YES**

## Rationale

Buyers and admins can link a shipment by container/booking/vessel reference and see vessel, voyage, carrier, POL/POD, ETD, ETA, sync status, delay badge, and a tracking event timeline — all without GPS devices or map widgets.

The manual provider supports pilot and E2E; the maritime API adapter is production-shaped (retry, timeout, graceful fallback) and activates when `TRACKING_PROVIDER=maritime_api` and credentials are set.

Tracking is explicitly **non-authoritative**: Shipment FSM state is unchanged; timeline entries are observability only. Control Tower surfaces ETA drift and delays for operations.

## Caveats

- Live maritime data quality depends on the configured external API (not bundled).
- No AIS/map visualization (by design).
- Scheduler syncs up to 100 linked shipments per hour per instance.
