from typing import TypedDict, Literal

from langgraph.graph import StateGraph, END
from my_agent.utils.nodes import research_itinerary, should_continue, tool_node, validate_user_response, update_user_profile, optimize_prompt, review_itinerary
from my_agent.utils.state import InputState


# Define the config
class GraphConfig(TypedDict):
    model_name: Literal["anthropic", "openai"]

# Define a new graph
workflow = StateGraph(InputState, config_schema=GraphConfig)

# Define the two nodes we will cycle between
workflow.add_node(validate_user_response)
workflow.set_entry_point("validate_user_response")

workflow.add_node(update_user_profile)
workflow.add_node(optimize_prompt)
workflow.add_node(research_itinerary)
workflow.add_node(review_itinerary)
workflow.add_node("tool_node", tool_node)
# workflow.add_node("user_tool_node", user_tool_node)

# We now add a conditional edge
workflow.add_conditional_edges(
    "research_itinerary",
    should_continue,
    {
        "continue": "tool_node",
        "end": "review_itinerary",
    },
)
# We now add a normal edge from `tools` to `agent`.
# This means that after `tools` is called, `agent` node is called next.

workflow.add_edge("update_user_profile", "optimize_prompt")
workflow.add_edge("optimize_prompt", "research_itinerary")
workflow.add_edge("tool_node", "research_itinerary")
# workflow.add_edge("user_tool_node", "update_user_profile")

graph = workflow.compile()