"""Pipeline configuration package.

Re-exports the most commonly used symbols so that downstream code can
simply write::

    from config import get_settings, TOPICS, ensure_topics_exist
"""

from config.settings import Settings, get_settings

__all__ = [
    "Settings",
    "get_settings",
]
