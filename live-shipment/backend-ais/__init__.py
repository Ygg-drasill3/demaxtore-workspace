"""AIS provider abstraction layer.

Import the provider factory to obtain the currently configured AIS provider.
Swap `MockAISProvider` for a real provider (aisstream.io, MarineTraffic, etc.)
in `get_provider()` without touching the routes or the frontend.
"""

from .provider import AISProvider
from .mock_provider import MockAISProvider

_provider: AISProvider | None = None


def get_provider() -> AISProvider:
    global _provider
    if _provider is None:
        _provider = MockAISProvider()
    return _provider
