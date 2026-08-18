"""FreightIQ Live Tracking — API surface.

All routes are AIS-provider agnostic; swap MockAISProvider for a real
provider inside `ais.get_provider()` without touching the frontend.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from ais import get_provider

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="FreightIQ Live Tracking")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("freightiq")


# ---------------------------------------------------------------------------
# Persistence models  (fleet + alerts)
# ---------------------------------------------------------------------------
class FleetItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vessel_id: str
    label: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vessel_id: str
    vessel_name: str
    kind: str  # arrival, departure, entered_area, left_area, delayed, stopped, overspeed, ais_lost
    message: str
    severity: str = "info"  # info, success, warning, critical
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read: bool = False


class FleetCreate(BaseModel):
    vessel_id: str
    label: str | None = None


# ---------------------------------------------------------------------------
# Startup — start mock tick loop & alert generator
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def _startup():
    provider = get_provider()
    if hasattr(provider, "start"):
        provider.start()
    asyncio.create_task(_alert_generator_loop())


async def _alert_generator_loop():
    """Fabricate live alerts every 12s using the current vessel snapshot."""
    provider = get_provider()
    kinds = [
        ("arrival", "info", "arrived at destination port"),
        ("departure", "info", "has departed from origin"),
        ("delayed", "warning", "is running behind schedule"),
        ("overspeed", "warning", "exceeded speed threshold"),
        ("ais_lost", "critical", "AIS signal was lost"),
        ("entered_area", "success", "entered monitored area"),
        ("stopped", "warning", "reports engine stopped"),
    ]
    import random

    r = random.Random()
    await asyncio.sleep(6)
    while True:
        try:
            vessels = await provider.get_vessels_in_bounds(-180, -85, 180, 85, limit=200)
            if not vessels:
                await asyncio.sleep(6)
                continue
            v = r.choice(vessels)
            k = r.choice(kinds)
            alert = Alert(
                vessel_id=v["id"],
                vessel_name=v["name"],
                kind=k[0],
                severity=k[1],
                message=f"{v['name']} {k[2]}",
            )
            doc = alert.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.alerts.insert_one(doc)
            # keep only latest 200 alerts
            count = await db.alerts.count_documents({})
            if count > 200:
                extras = count - 200
                oldest = (
                    await db.alerts.find({}, {"_id": 1})
                    .sort("created_at", 1)
                    .to_list(extras)
                )
                if oldest:
                    await db.alerts.delete_many({"_id": {"$in": [o["_id"] for o in oldest]}})
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("alert loop error: %s", exc)
        await asyncio.sleep(12)


@app.on_event("shutdown")
async def _shutdown():
    client.close()


# ---------------------------------------------------------------------------
# Basic health
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"service": "freightiq", "status": "ok"}


# ---------------------------------------------------------------------------
# Vessels
# ---------------------------------------------------------------------------
@api_router.get("/vessels")
async def list_vessels(
    min_lng: float = Query(-180),
    min_lat: float = Query(-85),
    max_lng: float = Query(180),
    max_lat: float = Query(85),
    limit: int = Query(5000, le=8000),
    types: str | None = Query(None, description="comma-separated type codes"),
):
    provider = get_provider()
    type_filter = [t for t in types.split(",") if t] if types else None
    data = await provider.get_vessels_in_bounds(
        min_lng, min_lat, max_lng, max_lat, limit=limit, type_filter=type_filter
    )
    return {"count": len(data), "vessels": data}


@api_router.get("/vessels/search")
async def search_vessels(q: str = Query(..., min_length=1), limit: int = 25):
    provider = get_provider()
    return {"results": await provider.search_vessels(q, limit=limit)}


@api_router.get("/vessels/{vessel_id}")
async def vessel_details(vessel_id: str):
    provider = get_provider()
    v = await provider.get_vessel_details(vessel_id)
    if not v:
        raise HTTPException(status_code=404, detail="vessel not found")
    return v


@api_router.get("/vessels/{vessel_id}/track")
async def vessel_track(vessel_id: str, hours: int = 24):
    provider = get_provider()
    return {"track": await provider.get_vessel_track(vessel_id, hours=hours)}


@api_router.get("/vessels/{vessel_id}/forecast")
async def vessel_forecast(vessel_id: str):
    provider = get_provider()
    return {"forecast": await provider.get_route_forecast(vessel_id)}


# ---------------------------------------------------------------------------
# Ports / Companies / Routes / Analytics
# ---------------------------------------------------------------------------
@api_router.get("/ports")
async def list_ports(q: str | None = None, limit: int = 100):
    return {"ports": await get_provider().list_ports(q, limit=limit)}


@api_router.get("/ports/{port_id}")
async def get_port(port_id: str):
    p = await get_provider().get_port(port_id)
    if not p:
        raise HTTPException(status_code=404, detail="port not found")
    return p


@api_router.get("/companies")
async def list_companies():
    return {"companies": await get_provider().list_companies()}


@api_router.get("/routes")
async def list_routes():
    return {"routes": await get_provider().list_routes()}


@api_router.get("/analytics/overview")
async def analytics_overview():
    return await get_provider().analytics_overview()


# ---------------------------------------------------------------------------
# Saved fleet (persisted in Mongo)
# ---------------------------------------------------------------------------
@api_router.get("/fleet")
async def list_fleet():
    items = await db.fleet.find({}, {"_id": 0}).to_list(500)
    provider = get_provider()
    out = []
    for it in items:
        v = await provider.get_vessel_details(it["vessel_id"])
        if v:
            out.append({**it, "vessel": v})
    return {"fleet": out}


@api_router.post("/fleet")
async def add_fleet(item: FleetCreate):
    existing = await db.fleet.find_one({"vessel_id": item.vessel_id}, {"_id": 0})
    if existing:
        return existing
    fleet_item = FleetItem(vessel_id=item.vessel_id, label=item.label)
    doc = fleet_item.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.fleet.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.delete("/fleet/{vessel_id}")
async def remove_fleet(vessel_id: str):
    await db.fleet.delete_one({"vessel_id": vessel_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------
@api_router.get("/alerts")
async def list_alerts(limit: int = 50):
    items = (
        await db.alerts.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    )
    unread = await db.alerts.count_documents({"read": False})
    return {"alerts": items, "unread": unread}


@api_router.post("/alerts/read")
async def mark_alerts_read():
    await db.alerts.update_many({"read": False}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# WebSocket — live vessel position deltas
# ---------------------------------------------------------------------------
@api_router.websocket("/ws")
async def ws_positions(ws: WebSocket):
    """Send periodic snapshots (bounded) to a connected client.

    Client protocol (JSON):
      -> {"type": "bounds", "bounds": [minLng, minLat, maxLng, maxLat], "types": [...]}
    Server protocol:
      <- {"type": "snapshot", "vessels": [...]}
      <- {"type": "delta",    "vessels": [{id, lat, lng, heading, speed}, ...]}
      <- {"type": "alert",    "alert": {...}}   (broadcast alerts)
    """
    await ws.accept()
    provider = get_provider()
    bounds: list[float] = [-180.0, -85.0, 180.0, 85.0]
    type_filter: list[str] | None = None
    last_alert_ts = datetime.now(timezone.utc).isoformat()

    async def _reader():
        nonlocal bounds, type_filter
        try:
            while True:
                msg = await ws.receive_text()
                data = json.loads(msg)
                if data.get("type") == "bounds":
                    b = data.get("bounds") or bounds
                    if isinstance(b, list) and len(b) == 4:
                        bounds = [float(x) for x in b]
                    tf = data.get("types")
                    type_filter = list(tf) if tf else None
                    snap = await provider.get_vessels_in_bounds(
                        *bounds, limit=5000, type_filter=type_filter
                    )
                    await ws.send_text(
                        json.dumps({"type": "snapshot", "vessels": snap})
                    )
        except WebSocketDisconnect:
            raise
        except Exception:  # noqa
            return

    async def _writer():
        nonlocal last_alert_ts
        while True:
            await asyncio.sleep(2.0)
            try:
                snap = await provider.get_vessels_in_bounds(
                    *bounds, limit=5000, type_filter=type_filter
                )
                deltas = [
                    {
                        "id": v["id"],
                        "lat": v["lat"],
                        "lng": v["lng"],
                        "heading": v["heading"],
                        "speed": v["speed"],
                    }
                    for v in snap
                ]
                await ws.send_text(json.dumps({"type": "delta", "vessels": deltas}))
                # push any fresh alerts
                new_alerts = (
                    await db.alerts.find({"created_at": {"$gt": last_alert_ts}}, {"_id": 0})
                    .sort("created_at", 1)
                    .to_list(20)
                )
                if new_alerts:
                    last_alert_ts = new_alerts[-1]["created_at"]
                    for a in new_alerts:
                        await ws.send_text(json.dumps({"type": "alert", "alert": a}))
            except WebSocketDisconnect:
                raise
            except Exception:  # noqa
                return

    try:
        # send initial snapshot
        snap = await provider.get_vessels_in_bounds(*bounds, limit=5000)
        await ws.send_text(json.dumps({"type": "snapshot", "vessels": snap}))
        await asyncio.gather(_reader(), _writer())
    except WebSocketDisconnect:
        pass


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
