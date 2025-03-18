from langgraph.graph import add_messages
from langchain_core.messages import BaseMessage
from typing import TypedDict, Annotated, Sequence
from pydantic import Field
from dataclasses import dataclass, field

@dataclass
class InputState():
    messages: Annotated[Sequence[BaseMessage], add_messages]

@dataclass
class State(InputState):
    is_valid: bool = field(default=False)
    user_profile: dict = field(default_factory=dict)
    optimized_prompt: str = field(default="")
    user_accomodation: dict = field(default_factory=dict)
    itinerary: dict = field(default_factory=dict)
    itinerary_feedback: str = field(default="")
    iteration_counter: int = field(default=0)
