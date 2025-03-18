"""Define the configurable parameters for the agent."""

from __future__ import annotations
import os
from dataclasses import dataclass, field, fields
from typing import Annotated, Optional

from langchain_core.runnables import RunnableConfig, ensure_config

GPLACES_API_KEY = os.getenv("GPLACES_API_KEY")
UNSPLASH_API_KEY = os.getenv("UNSPLASH_API_KEY")
RAPID_API_JEY = os.getenv("RAPID_API_JEY")
TRIP_ADVISOR_API = os.getenv("TRIP_ADVISOR_API")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")


@dataclass(kw_only=True)
class Configuration:
    """The configuration for the agent."""

    model: Annotated[str, {"__template_metadata__": {"kind": "llm"}}] = field(
        default="openai/gpt-4o-mini",
        metadata={
            "description": "The name of the language model to use for the agent's main interactions. "
            "Should be in the form: provider/model-name."
        },
    )
    google_places_api_key: str = field(
        default=GPLACES_API_KEY
    )
    booking_api_key: str = field(
        default=RAPID_API_JEY
    )
    unsplash_api_key: str = field(
        default=UNSPLASH_API_KEY
    )
    tripadvisor_api_key: str = field(
        default=UNSPLASH_API_KEY
    )
    tavily_api_key: str = field(
        default=TAVILY_API_KEY
    )
    max_search_results: int = field(
        default=10,
        metadata={
            "description": "The maximum number of search results to return for each search query."
        },
    )

    @classmethod
    def from_runnable_config(
        cls, config: Optional[RunnableConfig] = None
    ) -> Configuration:
        """Create a Configuration instance from a RunnableConfig object."""
        config = ensure_config(config)
        configurable = config.get("configurable") or {}
        _fields = {f.name for f in fields(cls) if f.init}
        return cls(**{k: v for k, v in configurable.items() if k in _fields})
