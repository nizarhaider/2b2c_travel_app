"""This module provides example tools for web scraping and search functionality.

It includes a basic Tavily search function (as an example)

These tools are intended as free examples to get started. For production use,
consider implementing more robust and specialized tools tailored to your needs.
"""
import os
from typing import Any, Callable, List, Optional, cast

import aiohttp
import requests
from exa_py import Exa
from langchain_community.tools import GooglePlacesTool
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import InjectedToolArg, tool
from tavily import TavilyClient, AsyncTavilyClient
from typing_extensions import Annotated

from my_agent.utils.configuration import Configuration

exa = Exa(api_key=os.environ["EXA_API_KEY"])
client = AsyncTavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# async def search_unsplash_photos(
#         query: str,
#         per_page: int,
#         config: Annotated[RunnableConfig, InjectedToolArg]
# ) -> dict:
#     """
#     Searches for photos on Unsplash based on the provided query.

#     This function interacts with the Unsplash API to search for photos matching the query string.
#     It returns a collection of photo results with metadata.

#     Keep your searches SHORT AND MINIMAL

#     Parameters:
#     - query (str): The search terms to find photos.
#     - per_page (int) : Number of items in a page, ALWAYS LEAVE THE DEAFULTS to 10
#     - config (RunnableConfig): Configuration settings used to authenticate the API request. This 
#       includes the API key for the Unsplash API.

#     Returns:
#     - dict: The API response as a dictionary containing a list of photos with detailed information.
#       The data includes the photo ID, URLs, descriptions, user information, and additional metadata.
      
#     Example:
#     >>> search_unsplash_photos(query="mountains", per_page=10)

#     Notes:
#     - Returns the first page of results with default sorting.
#     - Be mindful of rate limits when making requests to the Unsplash API.
#     """
#     async with aiohttp.ClientSession() as session:
#         configuration = Configuration.from_runnable_config(config)

#         # Build URL with query parameters
#         url = "https://api.unsplash.com/search/photos"
#         params = {
#             "query": query,
#             "orientation": "landscape",
#         }

#         headers = {
#             "Authorization": f"Client-ID {configuration.unsplash_api_key}",
#             "Accept-Version": "v1"
#         }
        
#         async with session.get(url, headers=headers, params=params) as response:
#             response.raise_for_status()
#             return await response.json()

async def query_google_places(
        query: str,
        config: Annotated[RunnableConfig, InjectedToolArg]
) -> dict:
    """
    Queries the Google Places API using a text-based search to find places related to the provided query.

    This function interacts with the Google Places API and returns a list of places 
    matching the query string, along with additional details about each place. The API 
    response contains information such as location, rating, price range, photos, business status, 
    and more.

    Parameters:
    - query (str): The search query, typically a name or description of a place or landmark.
    - config (RunnableConfig): Configuration settings used to authenticate the API request. This 
      includes the API key and other relevant parameters for the Google Places API.

    Returns:
    - dict: The API response as a dictionary containing a list of places with detailed information.
      The data includes the place name, location, rating, address, and additional metadata like photos, 
      links to Google Maps, and business status.
      
    Example:
    >>> query_google_places("Colosseum Rome")
    {
        "results": [
            {
                "name": "Colosseum",
                "formatted_address": "Piazza del Colosseo, 1, 00184 Roma RM, Italy",
                "rating": 4.7,
                "price_level": 2,
                "types": ["tourist_attraction", "point_of_interest", "establishment"],
                "photos": [{"photo_reference": "A1z...", "width": 1024, "height": 768}],
                "website_uri": "https://www.coopculture.it/en/colosseo-e-shop.cfm"
            },
            ...
        ]
    }

    Notes:
    - The results are limited to a maximum of 5 places per query.
    - The search includes detailed attributes for each place, including user ratings, pricing details, 
      website URLs, and more.
    """  # noqa: D202, D212, D401
    async with aiohttp.ClientSession() as session:

        configuration = Configuration.from_runnable_config(config)

        url = "https://places.googleapis.com/v1/places:searchText"
        headers = {
            'X-Goog-Api-Key': configuration.google_places_api_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "places.attributions,places.id,places.displayName,places.googleMapsLinks,places.formattedAddress,places.businessStatus,places.types,places.location,places.internationalPhoneNumber,places.rating,places.priceLevel,places.priceRange,places.websiteUri,places.userRatingCount,places.websiteUri,places.goodForChildren,places.liveMusic,places.paymentOptions,places.servesBeer,places.servesVegetarianFood,places.reviews"
        }
        data = {
            "textQuery": query,
            "pageSize": 5
        }

        async with session.post(url, headers=headers, json=data) as response:
            response.raise_for_status()
            return await response.json()         

async def tripadvisor_location_search(
        query: str,
        config: Annotated[RunnableConfig, InjectedToolArg]
) -> dict:
    """
    Queries the TripAdvisor API using a text-based search to find locations related to the provided query.

    This function interacts with the TripAdvisor Location Search API and returns a list of locations 
    matching the query string, along with additional details about each location. The API 
    response contains information such as name, location ID, address, and other location-specific details.

    Parameters:
    - query (str): The search query, typically a name or description of a place or landmark.
    - config (RunnableConfig): Configuration settings used to authenticate the API request. This 
      includes the API key and other relevant parameters for the TripAdvisor API.

    Returns:
    - dict: The API response as a dictionary containing a list of locations with detailed information.
      The data includes the location name, ID, address, and other metadata.
      
    Example:
    >>> tripadvisor_location_search("Colosseum Rome")
    {
        "data": [
            {
                "location_id": "191260",
                "name": "Colosseum",
                "address_obj": {
                    "street1": "Piazza del Colosseo",
                    "city": "Rome",
                    "country": "Italy"
                },
                "latitude": "41.89021",
                "longitude": "12.492231",
                "category": {"key": "attraction", "name": "Attraction"}
            },
            ...
        ]
    }

    Notes:
    - The results are limited to a maximum of 10 locations per query.
    - You can filter results by category using the category parameter ("hotels", "attractions", "restaurants", "geos").
    """
    async with aiohttp.ClientSession() as session:
        configuration = Configuration.from_runnable_config(config)
        
        # Use proper URL formatting with query parameters
        base_url = "https://api.content.tripadvisor.com/api/v1/location/search"
        params = {
            "searchQuery": query,
            "language": "en",
            "key": configuration.tripadvisor_api_key
        }
        
        headers = {"accept": "application/json"}

        # Use GET request instead of POST as specified in the documentation
        async with session.get(base_url, params=params, headers=headers) as response:
            response.raise_for_status()
            return await response.json()

async def tripadvisor_location_details(
        location_id: int,
        config: Annotated[RunnableConfig, InjectedToolArg],
        language: str = "en",
        currency: str = "USD"
) -> dict:
    """
    Gets detailed information about a specific TripAdvisor location.
    
    Retrieves comprehensive details for a hotel, restaurant, or attraction including name,
    address, rating, reviews, and more from the TripAdvisor API.

    Parameters:
    - location_id (int): Unique TripAdvisor location identifier from Location Search
    - config (RunnableConfig): Configuration with API authentication 
    - language (str, optional): Results language code. Defaults to "en"
    - currency (str, optional): Currency code (ISO 4217). Defaults to "USD"

    Returns:
    - dict: Complete location details including name, description, address, rating, etc.
    """
    async with aiohttp.ClientSession() as session:
        configuration = Configuration.from_runnable_config(config)
        
        # Build the URL with the location ID as a path parameter
        base_url = f"https://api.content.tripadvisor.com/api/v1/location/{location_id}/details"
        
        # Set up query parameters
        params = {
            "key": configuration.tripadvisor_api_key,
            "language": language,
            "currency": currency
        }
        
        headers = {"accept": "application/json"}

        async with session.get(base_url, params=params, headers=headers) as response:
            response.raise_for_status()
            return await response.json()

async def tripadvisor_location_photos(
        location_id: int,
        config: Annotated[RunnableConfig, InjectedToolArg],
        language: str = "en",
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        source: Optional[str] = None
) -> dict:
    """
    Retrieves photos for a specific TripAdvisor location.
    
    Gets up to 5 high-quality photos for a location in multiple sizes (thumbnail to original).
    Photos are ordered by recency.
    
    Parameters:
    - location_id (int): Unique TripAdvisor location identifier
    - config (RunnableConfig): Configuration with API authentication
    - language (str, optional): Results language code. Defaults to "en"
    - limit (int, optional): Number of results to return
    - offset (int, optional): Index of first result
    - source (str, optional): Comma-separated photo sources: 'Expert', 'Management', 'Traveler'
    
    Returns:
    - dict: Photo data with URLs in various sizes and metadata
    """
    async with aiohttp.ClientSession() as session:
        configuration = Configuration.from_runnable_config(config)
        
        base_url = f"https://api.content.tripadvisor.com/api/v1/location/{location_id}/photos"
        
        params = {
            "key": configuration.tripadvisor_api_key,
            "language": language
        }
        
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset
        if source is not None:
            params["source"] = source
        
        headers = {"accept": "application/json"}

        async with session.get(base_url, params=params, headers=headers) as response:
            response.raise_for_status()
            return await response.json()     
async def tavily_web_search(
    query: str,
    config: Annotated[RunnableConfig, InjectedToolArg]
) -> dict:
    """
    Performs a general web search using the Tavily search engine to retrieve trusted and comprehensive results.

    This function utilizes the Tavily search engine, which is designed to provide highly relevant, 
    accurate, and up-to-date results, especially for queries related to current events, travel destinations, 
    or other frequently changing information. The results include articles, blog posts, and other web content 
    that match the search query.

    Parameters:
    - query (str): The search query string, which can be a question or a topic that the user wants to research.
    - config (RunnableConfig): Configuration settings for the search, including parameters like the 
      maximum number of results to fetch and other filters for refining the search.

    Returns:
    - Optional[list[dict[str, Any]]]: A list of dictionaries containing the search results. Each dictionary 
      represents a single result and may contain keys such as the title, snippet, URL, and other metadata for 
      each item. If no results are found, the function will return `None`.

    Example:
    >>> tavily_web_search("best family-friendly attractions in Sri Lanka")
    [
        {
            "title": "Top 10 Family-Friendly Attractions in Sri Lanka",
            "snippet": "Sri Lanka offers a variety of family-friendly attractions, from wildlife safaris to beach resorts.",
            "url": "https://www.example.com/family-friendly-attractions-sri-lanka",
            "source": "Travel Blog"
        },
        ...
    ]

    Notes:
    - The search results may include a mix of sources, such as blogs, news articles, and other online content.
    - The search engine is optimized for current, real-time information and highly relevant content.
    - The results are enriched with extra details such as snippets, URLs, and source information to help users find valuable resources.
    """  # noqa: D202, D212, D401

    configuration = Configuration.from_runnable_config(config)

    response = await client.search(
        query=query,
        include_images=True,
        max_results=configuration.max_search_results,
        time_range='year'
    )
    return response

async def exa_web_search(query: str):
    """Search for webpages based on the query and retrieve their contents."""
    return exa.search_and_contents(
        query, use_autoprompt=True, num_results=10, text=True, highlights=True
    )

tools: List[Callable[..., Any]] = [tavily_web_search, query_google_places, tripadvisor_location_search, tripadvisor_location_details, tripadvisor_location_photos]
# update_user_tool: List[Callable[..., Any]] = [update_user_profile]