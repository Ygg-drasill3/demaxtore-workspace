# Load test analysis — bottleneck projections for DeMaxtore backend
#
# Assumptions: single PM2 instance, PostgreSQL pool=25, Redis rate limit, Socket.io redis adapter
#
# | Users | Likely bottleneck | Recommendation |
# |-------|-------------------|----------------|
# | 100   | None critical     | Current single-instance OK |
# | 500   | DB pool (25 conn) | Raise DATABASE_CONNECTION_LIMIT to 50; add PgBouncer |
# | 1000  | Socket.io + DB    | PM2 cluster (2-4) + SOCKET_ADAPTER=redis + sticky sessions |
# | 5000  | All layers        | Horizontal API (4+ instances), read replicas, CDN for static |
#
# Hot paths: RFQ mutations, auth refresh, realtime workspace subscribe, catalog ingest bursts.
# Rate limits: api-global 600/15min, auth-login 50/15min, catalog-ingest 30/min per IP.
