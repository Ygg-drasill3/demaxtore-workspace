"""Mock AIS provider.

Generates a large fleet of realistic vessels moving along pre-defined
shipping lanes so that no vessel ever appears on land.  The provider ticks
positions in-process and exposes bounded snapshots for the API layer to
serve to the frontend.
"""

from __future__ import annotations

import asyncio
import math
import random
import string
import time
from datetime import datetime, timezone, timedelta
from typing import Any, AsyncIterator

from .provider import AISProvider
from .mock_data import (
    PORTS,
    SHIPPING_LANES,
    VESSEL_TYPES,
    NAV_STATUS,
    VESSEL_PREFIXES,
    VESSEL_NAMES,
    COMPANIES,
)

# Deterministic PRNG so vessel IDs stay stable across a server session.
_R = random.Random(20260201)

TICK_SECONDS = 2.0
FLEET_SIZE = 3500  # vessels rendered concurrently


def _rand_weighted(items: list[dict[str, Any]]) -> dict[str, Any]:
    total = sum(i["weight"] for i in items)
    r = _R.uniform(0, total)
    acc = 0
    for it in items:
        acc += it["weight"]
        if r <= acc:
            return it
    return items[-1]


def _haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _bearing_deg(lat1, lng1, lat2, lng2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lng2 - lng1)
    x = math.sin(dl) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def _mmsi() -> str:
    return "".join(_R.choices(string.digits, k=9))


def _imo() -> str:
    return f"{_R.randint(9000000, 9999999)}"


def _callsign() -> str:
    return "".join(_R.choices(string.ascii_uppercase + string.digits, k=_R.randint(5, 7)))


def _vessel_name() -> str:
    return f"{_R.choice(VESSEL_PREFIXES)} {_R.choice(VESSEL_NAMES)}"


class _Vessel:
    __slots__ = (
        "id", "name", "type", "type_label", "color", "flag", "flag_country",
        "imo", "mmsi", "callsign", "length", "beam", "draft", "gross_tonnage",
        "deadweight", "built_year", "company", "lane_idx", "segment", "progress",
        "direction", "speed_knots", "nav_status", "origin_port", "destination_port",
        "departure_time", "eta", "lat", "lng", "heading", "prev_lat", "prev_lng",
        "last_update",
    )

    def __init__(self, id_: str):
        self.id = id_
        vt = _rand_weighted(VESSEL_TYPES)
        self.type = vt["code"]
        self.type_label = vt["label"]
        self.color = vt["color"]
        self.length = _R.randint(*vt["length"])
        self.beam = int(self.length * _R.uniform(0.13, 0.18))
        self.draft = round(_R.uniform(4, 16), 1)
        self.gross_tonnage = int(self.length * _R.uniform(300, 900))
        self.deadweight = int(self.gross_tonnage * _R.uniform(1.1, 1.6))
        self.built_year = _R.randint(1998, 2024)
        self.name = _vessel_name()
        self.imo = _imo()
        self.mmsi = _mmsi()
        self.callsign = _callsign()
        port = _R.choice(PORTS)
        self.flag = port[3]
        self.flag_country = port[2]
        self.company = _R.choice(COMPANIES)[0]
        self.lane_idx = _R.randrange(len(SHIPPING_LANES))
        lane = SHIPPING_LANES[self.lane_idx]
        self.segment = _R.randrange(len(lane) - 1)
        self.progress = _R.random()
        self.direction = 1 if _R.random() < 0.5 else -1
        self.speed_knots = round(_R.uniform(*vt["speed"]), 1)
        self.nav_status = _R.choices(
            NAV_STATUS, weights=[70, 10, 8, 3, 3, 3, 3], k=1
        )[0]
        # Ports: pick origin/destination roughly consistent with the lane end
        origin = SHIPPING_LANES[self.lane_idx][0]
        dest = SHIPPING_LANES[self.lane_idx][-1]
        self.origin_port = self._nearest_port(*origin)
        self.destination_port = self._nearest_port(*dest)
        if self.direction < 0:
            self.origin_port, self.destination_port = self.destination_port, self.origin_port
        hours_travel = _R.randint(12, 480)
        self.departure_time = datetime.now(timezone.utc) - timedelta(hours=_R.randint(1, 240))
        self.eta = datetime.now(timezone.utc) + timedelta(hours=hours_travel)
        self.lat = 0.0
        self.lng = 0.0
        self.heading = 0.0
        self.prev_lat = 0.0
        self.prev_lng = 0.0
        self.last_update = datetime.now(timezone.utc)
        self._compute_position()

    def _nearest_port(self, lat: float, lng: float) -> str:
        best = None
        best_d = 1e18
        for p in PORTS:
            d = _haversine_km(lat, lng, p[4], p[5])
            if d < best_d:
                best_d = d
                best = p
        return best[0] if best else "UNKNW"

    def _compute_position(self):
        lane = SHIPPING_LANES[self.lane_idx]
        seg = self.segment
        a = lane[seg]
        b = lane[seg + 1]
        t = self.progress
        lat = a[0] + (b[0] - a[0]) * t
        lng = a[1] + (b[1] - a[1]) * t
        self.prev_lat = self.lat if self.lat else lat
        self.prev_lng = self.lng if self.lng else lng
        self.lat = lat
        self.lng = lng
        self.heading = _bearing_deg(a[0], a[1], b[0], b[1])
        if self.direction < 0:
            self.heading = (self.heading + 180) % 360

    def tick(self, dt: float):
        if self.nav_status in ("At Anchor", "Moored"):
            # anchored: micro-jitter only
            self.lat += (_R.random() - 0.5) * 0.0002
            self.lng += (_R.random() - 0.5) * 0.0002
            self.last_update = datetime.now(timezone.utc)
            return
        lane = SHIPPING_LANES[self.lane_idx]
        a = lane[self.segment]
        b = lane[self.segment + 1]
        seg_km = _haversine_km(a[0], a[1], b[0], b[1])
        # 1 knot = 1.852 km/h
        km_per_sec = (self.speed_knots * 1.852) / 3600.0
        step = (km_per_sec * dt) / max(seg_km, 0.1)
        self.progress += step * self.direction
        while self.progress >= 1.0:
            self.progress -= 1.0
            self.segment += 1
            if self.segment >= len(lane) - 1:
                # bounce back
                self.direction = -1
                self.segment = len(lane) - 2
                self.progress = 1.0 - self.progress
                self.origin_port, self.destination_port = (
                    self.destination_port,
                    self.origin_port,
                )
                self.eta = datetime.now(timezone.utc) + timedelta(hours=_R.randint(12, 480))
        while self.progress < 0.0:
            self.progress += 1.0
            self.segment -= 1
            if self.segment < 0:
                self.direction = 1
                self.segment = 0
                self.progress = -self.progress
                self.origin_port, self.destination_port = (
                    self.destination_port,
                    self.origin_port,
                )
                self.eta = datetime.now(timezone.utc) + timedelta(hours=_R.randint(12, 480))
        self._compute_position()
        self.last_update = datetime.now(timezone.utc)

    def to_public(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "type_label": self.type_label,
            "color": self.color,
            "flag": self.flag,
            "flag_country": self.flag_country,
            "imo": self.imo,
            "mmsi": self.mmsi,
            "callsign": self.callsign,
            "length": self.length,
            "beam": self.beam,
            "draft": self.draft,
            "gross_tonnage": self.gross_tonnage,
            "deadweight": self.deadweight,
            "built_year": self.built_year,
            "company": self.company,
            "speed": self.speed_knots,
            "heading": round(self.heading, 1),
            "nav_status": self.nav_status,
            "origin_port": self.origin_port,
            "destination_port": self.destination_port,
            "departure_time": self.departure_time.isoformat(),
            "eta": self.eta.isoformat(),
            "lat": round(self.lat, 5),
            "lng": round(self.lng, 5),
            "last_update": self.last_update.isoformat(),
        }

    def to_delta(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "lat": round(self.lat, 5),
            "lng": round(self.lng, 5),
            "heading": round(self.heading, 1),
            "speed": self.speed_knots,
        }


class MockAISProvider(AISProvider):
    def __init__(self, size: int = FLEET_SIZE):
        self._vessels: dict[str, _Vessel] = {}
        for i in range(size):
            vid = f"vsl_{i:06d}"
            self._vessels[vid] = _Vessel(vid)
        self._last_tick = time.time()
        self._lock = asyncio.Lock()
        self._tick_task: asyncio.Task | None = None

    # ---- tick loop -------------------------------------------------------
    def start(self):
        if self._tick_task is None or self._tick_task.done():
            self._tick_task = asyncio.create_task(self._run())

    async def _run(self):
        while True:
            await asyncio.sleep(TICK_SECONDS)
            now = time.time()
            dt = now - self._last_tick
            self._last_tick = now
            async with self._lock:
                for v in self._vessels.values():
                    v.tick(dt)

    # ---- provider interface ---------------------------------------------
    async def get_vessels_in_bounds(
        self,
        min_lng: float,
        min_lat: float,
        max_lng: float,
        max_lat: float,
        limit: int = 5000,
        type_filter: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        crosses = min_lng > max_lng
        for v in self._vessels.values():
            if v.lat < min_lat or v.lat > max_lat:
                continue
            if crosses:
                if not (v.lng >= min_lng or v.lng <= max_lng):
                    continue
            else:
                if v.lng < min_lng or v.lng > max_lng:
                    continue
            if type_filter and v.type not in type_filter:
                continue
            out.append(v.to_public())
            if len(out) >= limit:
                break
        return out

    async def search_vessels(self, query: str, limit: int = 25) -> list[dict[str, Any]]:
        q = query.strip().lower()
        if not q:
            return []
        out = []
        for v in self._vessels.values():
            hay = (
                f"{v.name}|{v.imo}|{v.mmsi}|{v.callsign}|{v.destination_port}|"
                f"{v.origin_port}|{v.flag_country}|{v.company}"
            ).lower()
            if q in hay:
                out.append(v.to_public())
                if len(out) >= limit:
                    break
        return out

    async def get_vessel_details(self, vessel_id: str) -> dict[str, Any] | None:
        v = self._vessels.get(vessel_id)
        return v.to_public() if v else None

    async def get_vessel_track(self, vessel_id: str, hours: int = 24) -> list[dict[str, Any]]:
        v = self._vessels.get(vessel_id)
        if not v:
            return []
        lane = SHIPPING_LANES[v.lane_idx]
        # Reconstruct past N hours as a polyline walking backwards along the lane.
        km_travelled = (v.speed_knots * 1.852) * hours
        seg_idx = v.segment
        progress = v.progress
        direction = v.direction
        pts: list[tuple[float, float, datetime]] = []
        remaining = km_travelled
        step_km = 25.0
        t_cursor = datetime.now(timezone.utc)
        while remaining > 0 and 0 <= seg_idx < len(lane) - 1:
            a = lane[seg_idx]
            b = lane[seg_idx + 1]
            seg_km = _haversine_km(a[0], a[1], b[0], b[1])
            # walk backwards
            back = min(step_km, remaining) / max(seg_km, 0.1)
            progress -= back * direction
            if progress < 0:
                seg_idx -= 1
                progress = 1 + progress
            elif progress > 1:
                seg_idx += 1
                progress = progress - 1
            if 0 <= seg_idx < len(lane) - 1:
                a2 = lane[seg_idx]
                b2 = lane[seg_idx + 1]
                lat = a2[0] + (b2[0] - a2[0]) * progress
                lng = a2[1] + (b2[1] - a2[1]) * progress
                t_cursor = t_cursor - timedelta(minutes=25)
                pts.append((lat, lng, t_cursor))
            remaining -= step_km
        pts.reverse()
        return [
            {"lat": round(la, 5), "lng": round(ln, 5), "ts": ts.isoformat()}
            for la, ln, ts in pts
        ]

    async def get_route_forecast(self, vessel_id: str) -> list[dict[str, Any]]:
        v = self._vessels.get(vessel_id)
        if not v:
            return []
        lane = SHIPPING_LANES[v.lane_idx]
        if v.direction > 0:
            pts = lane[v.segment + 1 :]
        else:
            pts = list(reversed(lane[: v.segment + 1]))
        # prepend the vessel's current position
        return [{"lat": round(v.lat, 5), "lng": round(v.lng, 5)}] + [
            {"lat": p[0], "lng": p[1]} for p in pts
        ]

    async def list_ports(self, query: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        out = []
        for code, name, country, flag, lat, lng, tz in PORTS:
            if query:
                q = query.lower()
                if q not in name.lower() and q not in country.lower() and q not in code.lower():
                    continue
            out.append(
                {
                    "id": code,
                    "unlocode": code,
                    "name": name,
                    "country": country,
                    "flag": flag,
                    "lat": lat,
                    "lng": lng,
                    "timezone": tz,
                }
            )
            if len(out) >= limit:
                break
        return out

    async def get_port(self, port_id: str) -> dict[str, Any] | None:
        port = next((p for p in PORTS if p[0] == port_id.upper()), None)
        if not port:
            return None
        code, name, country, flag, lat, lng, tz = port
        arrivals: list[dict[str, Any]] = []
        departures: list[dict[str, Any]] = []
        nearby: list[dict[str, Any]] = []
        for v in self._vessels.values():
            d = _haversine_km(lat, lng, v.lat, v.lng)
            if d < 60:
                nearby.append({**v.to_public(), "distance_km": round(d, 1)})
            if v.destination_port == code and len(arrivals) < 12:
                arrivals.append(v.to_public())
            if v.origin_port == code and len(departures) < 12:
                departures.append(v.to_public())
            if len(nearby) >= 30 and len(arrivals) >= 12 and len(departures) >= 12:
                break
        congestion = min(100, len(nearby) * 4 + _R.randint(5, 20))
        return {
            "id": code,
            "unlocode": code,
            "name": name,
            "country": country,
            "flag": flag,
            "lat": lat,
            "lng": lng,
            "timezone": tz,
            "arrivals": arrivals,
            "departures": departures,
            "nearby": nearby[:20],
            "congestion": congestion,
            "weather": {
                "temp_c": round(_R.uniform(8, 32), 1),
                "wind_knots": round(_R.uniform(2, 28), 1),
                "wave_m": round(_R.uniform(0.2, 3.4), 1),
                "condition": _R.choice(["Clear", "Cloudy", "Rain", "Overcast", "Sunny"]),
            },
        }

    async def stream_position_updates(self) -> AsyncIterator[list[dict[str, Any]]]:
        while True:
            await asyncio.sleep(TICK_SECONDS)
            yield [v.to_delta() for v in self._vessels.values()]

    async def list_companies(self, limit: int = 50) -> list[dict[str, Any]]:
        out = []
        for name, country, founded, fleet in COMPANIES[:limit]:
            active = sum(1 for v in self._vessels.values() if v.company == name)
            out.append(
                {
                    "id": name.lower().replace(" ", "-"),
                    "name": name,
                    "country": country,
                    "founded": founded,
                    "fleet_size": fleet,
                    "active_vessels": active,
                }
            )
        return out

    async def list_routes(self, limit: int = 50) -> list[dict[str, Any]]:
        out = []
        for i, lane in enumerate(SHIPPING_LANES[:limit]):
            origin = self._nearest_port_from_coord(*lane[0])
            dest = self._nearest_port_from_coord(*lane[-1])
            vessel_count = sum(
                1 for v in self._vessels.values() if v.lane_idx == i
            )
            distance_km = 0.0
            for j in range(len(lane) - 1):
                distance_km += _haversine_km(*lane[j], *lane[j + 1])
            out.append(
                {
                    "id": f"route_{i:03d}",
                    "origin": origin,
                    "destination": dest,
                    "distance_km": round(distance_km, 1),
                    "waypoints": [{"lat": p[0], "lng": p[1]} for p in lane],
                    "vessels": vessel_count,
                }
            )
        return out

    async def analytics_overview(self) -> dict[str, Any]:
        total = len(self._vessels)
        by_type: dict[str, int] = {}
        by_flag: dict[str, int] = {}
        by_status: dict[str, int] = {}
        for v in self._vessels.values():
            by_type[v.type_label] = by_type.get(v.type_label, 0) + 1
            by_flag[v.flag_country] = by_flag.get(v.flag_country, 0) + 1
            by_status[v.nav_status] = by_status.get(v.nav_status, 0) + 1
        top_routes = await self.list_routes(limit=8)
        top_routes.sort(key=lambda r: r["vessels"], reverse=True)
        return {
            "total_vessels": total,
            "in_transit": by_status.get("Underway Using Engine", 0),
            "at_anchor": by_status.get("At Anchor", 0),
            "moored": by_status.get("Moored", 0),
            "by_type": by_type,
            "by_flag": dict(
                sorted(by_flag.items(), key=lambda x: x[1], reverse=True)[:15]
            ),
            "by_status": by_status,
            "top_routes": top_routes[:8],
        }

    def _nearest_port_from_coord(self, lat: float, lng: float) -> dict[str, Any]:
        best = None
        best_d = 1e18
        for p in PORTS:
            d = _haversine_km(lat, lng, p[4], p[5])
            if d < best_d:
                best_d = d
                best = p
        return {"code": best[0], "name": best[1], "country": best[2]} if best else {}
