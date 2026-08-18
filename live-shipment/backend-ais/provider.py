"""Abstract AISProvider interface.

Concrete providers (mock, aisstream.io, MarineTraffic, Datalastic) implement
this exact contract so the API layer never changes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator, Any


class AISProvider(ABC):
    @abstractmethod
    async def get_vessels_in_bounds(
        self,
        min_lng: float,
        min_lat: float,
        max_lng: float,
        max_lat: float,
        limit: int = 5000,
        type_filter: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Return vessel snapshots inside a bounding box."""

    @abstractmethod
    async def search_vessels(self, query: str, limit: int = 25) -> list[dict[str, Any]]:
        """Search vessels by name, IMO, MMSI, destination, port or country."""

    @abstractmethod
    async def get_vessel_details(self, vessel_id: str) -> dict[str, Any] | None:
        """Return full metadata for a single vessel."""

    @abstractmethod
    async def get_vessel_track(self, vessel_id: str, hours: int = 24) -> list[dict[str, Any]]:
        """Return past positions for a vessel."""

    @abstractmethod
    async def get_route_forecast(self, vessel_id: str) -> list[dict[str, Any]]:
        """Return the forecast route waypoints from current position to destination."""

    @abstractmethod
    async def list_ports(self, query: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        """Return port catalogue, optionally filtered."""

    @abstractmethod
    async def get_port(self, port_id: str) -> dict[str, Any] | None:
        """Return single port with arrivals, departures, nearby vessels."""

    @abstractmethod
    async def stream_position_updates(self) -> AsyncIterator[list[dict[str, Any]]]:
        """Async iterator yielding batches of position deltas every tick."""

    @abstractmethod
    async def list_companies(self, limit: int = 50) -> list[dict[str, Any]]:
        """Return maritime operating companies."""

    @abstractmethod
    async def list_routes(self, limit: int = 50) -> list[dict[str, Any]]:
        """Return top shipping routes with traffic figures."""

    @abstractmethod
    async def analytics_overview(self) -> dict[str, Any]:
        """Return aggregated analytics (busiest routes, distribution, etc)."""
