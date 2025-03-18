from functools import lru_cache
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from my_agent.utils.tools import tools
from langgraph.prebuilt import ToolNode
from my_agent.utils.schemas import USER_SCHEMA, REFLECTION_SCHEMA
from my_agent.utils.prompts import VALIDATE_INPUT_PROMPT, GENERATE_ITINERARY_PROMPT, REFLECTION_ITINERARY_PROMPT
import datetime 
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage
import json
from langgraph.types import interrupt, Command
from typing import Literal
from my_agent.utils.state import State


model = ChatOpenAI(temperature=0.5, model_name="gpt-4o-mini")

def validate_user_response(state: State, config) -> Command[Literal['__end__', 'update_user_profile']]:
    messages = state.messages

    system_prompt = VALIDATE_INPUT_PROMPT.format(
        TODAY=datetime.datetime.today().date()
    )

    messages = [{"role": "system", "content": system_prompt}] + messages
    model_json = model.with_structured_output({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "validation_validation_schema",
            "$id": "https://example.com/product.schema.json",
            "type": "object",
            "properties": {
                "is_valid": {
                    "type": "boolean",
                    "description": "Indicates whether the user query is relevant and has atleast mentioned budget and no of people."
                },
                "llm_response": {
                    "type": "string",
                    "description": "Response incase the user query is invalid or irrelevant."
                }
            },

            "required": ["is_valid"]
        })
    response = model_json.invoke(messages)

    # print(response)
    if response['is_valid']:
        return Command(
            goto="update_user_profile", 
            update={"is_valid": response['is_valid']}
        )
    
    return Command(
        update={
            'messages': [{"type": "ai", "content": response['llm_response']}]
        },
        goto="__end__"
    )

def update_user_profile(state: State):

    llm_json = model.with_structured_output(USER_SCHEMA)
    response = llm_json.invoke(
        [{
            "type": "system",
            "content": f"""
                Use the message history to update the user profile. 
                Do not make any assumptions and be accurate at ALL TIMES.
                
                Here is the schema with its default values:
                {USER_SCHEMA}

                Use the default values for the fields if the user hasn't provided theirs.
                Assume all people are adults unless mentioned otherwise.

                Make sure to double check if user info doesn't have any typos.
                If currency not given, assume currency of destination.

                Today is {datetime.datetime.today().date().isoformat()}

                ALSO RUN THE MOCK USER_UPDATE TOOL YOU HAVE ACCESS TO.
                """
            }
        ] + state.messages
    )

    return {
        "user_profile": response,
    }
    
# Define the function that determines whether to continue or not
def should_continue(state: State):
    messages = state.messages
    last_message = messages[-1]
    # If there are no tool calls, then we finish
    if not last_message.tool_calls:
        return "end"
    # Otherwise if there is, we continue
    else:
        return "continue"

def optimize_prompt(state: State):
    response = model.invoke([SystemMessage(
        content=""""
        Optimize the user's query into a comprehensive search plan for Sri Lankan travel information. Follow these steps:

        1. Identify key elements in the user's request: specific locations, duration, travel style (luxury/budget), special interests (culture/nature/food), and any constraints.

        2. Prioritize human-curated travel resources including:
        - TripAdvisor itineraries and forum discussions about Sri Lanka
        - Reddit communities (r/srilanka, r/travel, r/backpacking)
        - Facebook travel groups focused on Sri Lanka
        - Travel blogs with personal experiences in Sri Lanka
        - Lonely Planet or similar travel guide forums

        3. For each location mentioned:
        - Search for "hidden gems" and "local experiences" recommended by travelers
        - Find typical duration recommendations from experienced visitors
        - Locate transportation options between destinations

        4. Include search terms for:
        - Seasonal considerations (monsoon patterns, festivals, high/low seasons)
        - Safety updates and local customs
        - Accommodation recommendations from real travelers
        - Sample itineraries matching the user's timeframe

        5. Format findings as:
        - Primary destinations with recommended stay duration
        - Logical route sequence
        - Transportation options
        - Activity highlights with time estimates
        - Authentic dining experiences

        Return an optimized search query that will help find the most relevant human-curated content for this specific traveler's needs.
        
        ONLY RETURN THE OPTIMIZED PROMPT AND NOTHING ELSE.
        """
    )] + [msg for msg in state.messages if isinstance(msg, HumanMessage)]
    )

    return {
        "optimized_prompt": response.content
    }

def research_itinerary(state: State):
    messages = state.messages

    system_prompt = GENERATE_ITINERARY_PROMPT.format(
        USER_ENHANCED_PROMPT=state.optimized_prompt,
        CURRENT_ITINERARY=state.itinerary,
        FEEDBACK=state.itinerary_feedback,
        TODAY=datetime.datetime.today().date()
    )

    model_tools = model.bind_tools(tools)

    messages = [{
        "role": "system", "content": system_prompt
        }] + messages
    response = model_tools.invoke(messages)

    return {"messages": [response]}

def review_itinerary(
    state: State
) -> Command[Literal['__end__', 'research_itinerary']]:
    """ Reflect on the web search agent output and return feedback."""

    llm_json = model.with_structured_output(
        REFLECTION_SCHEMA
    )

    response = llm_json.invoke(
        [
            SystemMessage(
                content=REFLECTION_ITINERARY_PROMPT.format(
                    USER_ENHANCED_PROMPT=state.optimized_prompt,
                    PREVIOUS_FEEDBACK=state.itinerary_feedback
            )), 
            state.messages[-1]
        ]
    )

    counter = state.iteration_counter

    if response['is_satisfactory'] or counter >= 2:
        return Command(
            goto='__end__'
        )
    else:
        return Command(
            goto='research_itinerary',
            update={
                "itinerary_feedback": response['feedback'],
                "iteration_counter": counter + 1,
                "messages": [AIMessage(content=f'FEEDBACK based on last itinerary: {response['feedback']}')]
            }
        )

# Define the function to execute tools
tool_node = ToolNode(tools)
# user_tool_node = ToolNode(update_user_tool)
