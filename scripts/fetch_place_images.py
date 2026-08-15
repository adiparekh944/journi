"""Resolve a real photograph of every seeded place from Wikimedia.

Run this only when the place list changes. It writes scripts/place_images.py,
which the seed builder imports. Keeping the result checked in means building the
seed never depends on the network, and the URLs stay stable and reviewable.

Every URL is verified to return 200 before it is written, because Part 15.4 of
the specification treats a broken hero image as a demo-breaking defect.

    python scripts/fetch_place_images.py
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from place_expansion import EXPANSION_PLACES
from place_facts import PLACE_FACTS
from place_niche import NICHE_PLACES

HTTP_OK = 200
HTTP_REDIRECT = 300

USER_AGENT = "JourniSeed/1.0 (https://github.com/journi; seed data build)"
SEARCH_ENDPOINT = "https://en.wikipedia.org/w/api.php"
OPENVERSE_ENDPOINT = "https://api.openverse.org/v1/images/"

# Words that mark a result as a diagram, map, logo or portrait rather than a
# photograph of the place.
REJECT_TOKENS = (
    "map",
    "logo",
    "seal",
    "diagram",
    "plan ",
    "chart",
    "coat of arms",
    "portrait",
    "postage",
    "stamp",
    "poster",
    "sign",
    "plaque",
    "graph",
)
TARGET_WIDTH = 1600
MIN_TOKEN_LENGTH = 3

# Both curated sets need a photograph.
ALL_SLUGS = tuple(PLACE_FACTS) + tuple(EXPANSION_PLACES) + tuple(NICHE_PLACES)

# Neighbourhood per slug, used to disambiguate image search results.
NEIGHBOURHOODS: dict[str, str] = {
    slug: entry[3] for slug, entry in {**EXPANSION_PLACES, **NICHE_PLACES}.items()
}

# Where the place name does not match the Wikipedia article title, or matches an
# article about something else entirely, name the article explicitly.
ARTICLE_OVERRIDES: dict[str, str] = {
    "the-battery": "The Battery (Manhattan)",
    "edge": "30 Hudson Yards",
    "top-of-the-rock": "Rockefeller Center",
    "broadway-theater-district": "Theater District, Manhattan",
    "chinatown": "Chinatown, Manhattan",
    "harlem": "Harlem",
    "greenwich-village": "Greenwich Village",
    "soho": "SoHo, Manhattan",
    "lower-east-side": "Lower East Side",
    "little-italy": "Little Italy, Manhattan",
    "east-river-esplanade": "East River Greenway",
    "heather-garden": "Fort Tryon Park",
    "jefferson-market-garden": "Jefferson Market Library",
    "conservatory-garden": "Central Park Conservatory Garden",
    "circle-line-sightseeing-cruises": "Circle Line Sightseeing Cruises",
    "blue-note-jazz-club": "Blue Note Jazz Club",
    "pier-17": "South Street Seaport",
    "hudson-river-park": "Hudson River Park",
    "chelsea-piers": "Chelsea Piers",
    "the-drawing-center": "The Drawing Center",
    "brooklyn-children-s-museum": "Brooklyn Children's Museum",
    "the-city-reliquary": "City Reliquary",
    "6-15-green-community-garden": "Park Slope",
    "narrows-botanical-gardens": "Bay Ridge, Brooklyn",
    "the-william-vale-rooftop": "Williamsburg, Brooklyn",
    "time-out-market-rooftop": "Dumbo, Brooklyn",
    "dumbo": "Dumbo, Brooklyn",
    "williamsburg": "Williamsburg, Brooklyn",
    "bushwick": "Bushwick, Brooklyn",
    "red-hook": "Red Hook, Brooklyn",
    "park-slope": "Park Slope",
    "sunset-park": "Sunset Park (Brooklyn)",
    "marine-park": "Marine Park, Brooklyn",
    "st-ann-s-warehouse": "St. Ann's Warehouse",
    "prospect-park-bandshell": "Prospect Park (Brooklyn)",
    "coney-island-boardwalk": "Riegelmann Boardwalk",
    "brooklyn-flea": "Brooklyn Flea",
    "smorgasburg": "Smorgasburg",
    "dekalb-market-hall": "Downtown Brooklyn",
    "industry-city": "Industry City",
    "moma-ps1": "MoMA PS1",
    "the-noguchi-museum": "Noguchi Museum",
    "socrates-sculpture-park": "Socrates Sculpture Park",
    "flushing-meadows-corona-park": "Flushing Meadows Corona Park",
    "gantry-plaza-state-park": "Gantry Plaza State Park",
    "forest-park": "Forest Park (Queens)",
    "jamaica-bay-wildlife-refuge": "Jamaica Bay Wildlife Refuge",
    "king-manor-museum": "King Manor",
    "new-york-state-pavilion": "New York State Pavilion",
    "astoria": "Astoria, Queens",
    "jackson-heights": "Jackson Heights, Queens",
    "flushing-chinatown": "Flushing, Queens",
    "rockaway-beach": "Rockaway Beach, Queens",
    "hunter-s-point-south-park": "Hunters Point South",
    "queens-night-market": "Queens Night Market",
    "usta-billie-jean-king-national-tennis-center": (
        "USTA Billie Jean King National Tennis Center"
    ),
    "sculpturecenter": "SculptureCenter",
    "bronx-museum-of-the-arts": "Bronx Museum of the Arts",
    "bronx-documentary-center": "Bronx Documentary Center",
    "city-island": "City Island, Bronx",
    "arthur-avenue-retail-market": "Arthur Avenue",
    "the-high-bridge": "High Bridge (New York City)",
    "orchard-beach": "Orchard Beach (Bronx)",
    "staten-island-greenbelt": "Staten Island Greenbelt",
    "conference-house-park": "Conference House",
    "st-george": "St. George, Staten Island",
    "south-beach": "South Beach, Staten Island",
    "snug-harbor-cultural-center": "Snug Harbor Cultural Center",
    "national-lighthouse-museum": "National Lighthouse Museum",
    "the-met-cloisters": "The Cloisters",
    "9-11-memorial-museum": "National September 11 Memorial & Museum",
    "intrepid-museum": "Intrepid Museum",
    "summit-one-vanderbilt": "One Vanderbilt",
    "one-world-observatory": "One World Trade Center",
    "roosevelt-island-tramway": "Roosevelt Island Tramway",
    "madison-square-garden": "Madison Square Garden",
    "union-square-greenmarket": "Union Square, Manhattan",
    "essex-market": "Essex Market",
    "chelsea-market": "Chelsea Market",
    "green-wood-cemetery": "Green-Wood Cemetery",
    "old-stone-house": "Old Stone House (Brooklyn)",
    "weeksville-heritage-center": "Weeksville, Brooklyn",
    "wyckoff-house-museum": "Wyckoff House",
    "bowne-house": "Bowne House",
    "louis-armstrong-house-museum": "Louis Armstrong House",
    "edgar-allan-poe-cottage": "Edgar Allan Poe Cottage",
    "bartow-pell-mansion-museum": "Bartow-Pell Mansion",
    "morris-jumel-mansion": "Morris-Jumel Mansion",
    "hamilton-grange": "Hamilton Grange National Memorial",
    "federal-hall": "Federal Hall",
    "apollo-theater": "Apollo Theater",
    "kings-theatre": "Kings Theatre",
    "barclays-center": "Barclays Center",
    "pioneer-works": "Pioneer Works",
    "brooklyn-academy-of-music": "Brooklyn Academy of Music",
    "verrazzano-narrows-bridge": "Verrazzano-Narrows Bridge",
    "little-island": "Little Island (park)",
    "the-high-line": "High Line",
    "bushwick-inlet-park": "Bushwick Inlet Park",
    "domino-park": "Domino Park",
    "mccarren-park": "McCarren Park",
    "fort-greene-park": "Fort Greene Park",
    "riverside-park": "Riverside Park (Manhattan)",
    "madison-square-park": "Madison Square Park",
    "washington-square-park": "Washington Square Park",
    "bryant-park": "Bryant Park",
    "fort-tryon-park": "Fort Tryon Park",
    "van-cortlandt-park": "Van Cortlandt Park",
    "pelham-bay-park": "Pelham Bay Park",
    "astoria-park": "Astoria Park",
    "brooklyn-bridge-park": "Brooklyn Bridge Park",
    "brooklyn-heights-promenade": "Brooklyn Heights Promenade",
    "south-street-seaport": "South Street Seaport",
    "staten-island-museum": "Staten Island Museum",
    "alice-austen-house": "Alice Austen House",
    "fort-wadsworth": "Fort Wadsworth",
    "woodlawn-cemetery": "Woodlawn Cemetery (Bronx)",
    "queens-botanical-garden": "Queens Botanical Garden",
    "new-york-hall-of-science": "New York Hall of Science",
    "museum-of-the-moving-image": "Museum of the Moving Image",
    "queens-museum": "Queens Museum",
    "new-york-transit-museum": "New York Transit Museum",
    "carnegie-hall": "Carnegie Hall",
    "radio-city-music-hall": "Radio City Music Hall",
    "lincoln-center": "Lincoln Center",
    "manhattan-bridge": "Manhattan Bridge",
    "times-square": "Times Square",
    "rockefeller-center": "Rockefeller Center",
    "grand-central-terminal": "Grand Central Terminal",
    "flatiron-building": "Flatiron Building",
    "statue-of-liberty": "Statue of Liberty",
    "empire-state-building": "Empire State Building",
}


def request_json(url: str) -> dict[str, object]:
    """Fetch and decode one JSON document, backing off when throttled."""

    for attempt in range(6):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload: dict[str, object] = json.loads(response.read().decode("utf-8"))
                return payload
        except urllib.error.HTTPError as error:
            if error.code not in (429, 503):
                raise
            time.sleep(2 * (attempt + 1))
    raise urllib.error.URLError("exhausted retries")


def article_images(titles: list[str]) -> dict[str, str]:
    """Look up lead images for up to 50 articles in a single API call.

    pageimages generates the thumbnail at the width we ask for, which the raw
    file URL cannot do and which arbitrary width rewriting does not survive:
    Wikimedia only serves a fixed set of thumbnail widths and answers 400 for
    anything else. It snaps our request to the nearest allowed bucket.
    """

    query = urllib.parse.urlencode(
        {
            "action": "query",
            "prop": "pageimages",
            "piprop": "thumbnail",
            "pithumbsize": str(TARGET_WIDTH),
            "pilimit": "50",
            "redirects": "1",
            "format": "json",
            "titles": "|".join(titles),
        }
    )
    try:
        payload = request_json(f"{SEARCH_ENDPOINT}?{query}")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return {}

    result = payload.get("query", {})
    if not isinstance(result, dict):
        return {}

    # Follow normalizations and redirects back to the title we asked for.
    alias: dict[str, str] = {}
    for group in ("normalized", "redirects"):
        for entry in result.get(group, []) or []:
            alias[str(entry["to"])] = str(entry["from"])

    images: dict[str, str] = {}
    for page in (result.get("pages") or {}).values():
        thumbnail = page.get("thumbnail") or {}
        source = thumbnail.get("source")
        if not source:
            continue
        title = str(page.get("title", ""))
        requested = alias.get(title, title)
        images[requested] = normalize(str(source))
        images[title] = normalize(str(source))
    return images


def search_article(name: str) -> str | None:
    """Fall back to a full-text search restricted to New York City topics."""

    query = urllib.parse.urlencode(
        {
            "action": "query",
            "list": "search",
            "srsearch": f"{name} New York City",
            "srlimit": "1",
            "format": "json",
        }
    )
    try:
        payload = request_json(f"{SEARCH_ENDPOINT}?{query}")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None
    result = payload.get("query")
    if not isinstance(result, dict):
        return None
    results = result.get("search")
    if not isinstance(results, list) or not results:
        return None
    return str(results[0]["title"])


def distinctive_tokens(name: str) -> list[str]:
    """Words specific enough to confirm a search result is the right place."""

    ignore = {
        "the",
        "of",
        "and",
        "new",
        "york",
        "city",
        "nyc",
        "park",
        "museum",
        "center",
        "centre",
        "national",
        "at",
        "in",
        "for",
        "a",
        "de",
        "st",
    }
    return [
        token
        for token in re.findall(r"[a-z']+", name.lower())
        if len(token) > MIN_TOKEN_LENGTH and token not in ignore
    ]


def openverse_image(name: str, neighborhood: str) -> str | None:
    """Find a wide, large, correctly-subject photograph on Openverse.

    Openverse aggregates Flickr and Wikimedia and generally returns far more
    attractive photography than a Wikipedia lead image, which is often an
    aerial or an awkward crop. The trade-off is relevance, so a result is only
    accepted when its title carries a distinctive word from the place name.
    """

    tokens = distinctive_tokens(name)
    query = urllib.parse.urlencode(
        {
            "q": f"{name} New York",
            "page_size": "8",
            "aspect_ratio": "wide",
            "size": "large",
            "mature": "false",
            "license_type": "all",
        }
    )
    try:
        payload = request_json(f"{OPENVERSE_ENDPOINT}?{query}")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    results = payload.get("results")
    if not isinstance(results, list):
        return None

    for result in results:
        title = str(result.get("title") or "").lower()
        url = result.get("url")
        if not url:
            continue
        if any(token in title for token in REJECT_TOKENS):
            continue
        # Require the subject to be named, or the neighbourhood to match.
        named = any(token in title for token in tokens) if tokens else True
        if not named and neighborhood.lower() not in title:
            continue
        if resolves(str(url)):
            return str(url)
    return None


def normalize(url: str) -> str:
    """Strip the analytics parameters the API appends.

    The width is deliberately left alone. Wikimedia serves only a fixed set of
    thumbnail widths and answers 400 for any other value, so rewriting the size
    in the path produces dead links.
    """

    return url.split("?", 1)[0]


def resolves(url: str) -> bool:
    """Confirm the image actually loads before it reaches the seed."""

    for attempt in range(5):
        request = urllib.request.Request(
            url, headers={"User-Agent": USER_AGENT}, method="HEAD"
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                status: int = response.status
                return HTTP_OK <= status < HTTP_REDIRECT
        except urllib.error.HTTPError as error:
            if error.code not in (429, 503):
                return False
            time.sleep(2 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError):
            return False
    return False


def chunked(values: list[str], size: int) -> list[list[str]]:
    """Split a list into API-sized batches."""

    return [values[index : index + size] for index in range(0, len(values), size)]


def main() -> int:
    """Resolve every place image and write the checked-in module."""

    names = place_names()
    slugs = list(ALL_SLUGS)

    # Preferred article per slug, then the display name as a second attempt.
    primary = {slug: ARTICLE_OVERRIDES.get(slug, names.get(slug, "")) for slug in slugs}
    secondary = {
        slug: names.get(slug, "")
        for slug in slugs
        if names.get(slug, "") and names.get(slug) != primary[slug]
    }

    lookup: dict[str, str] = {}
    titles = sorted({title for title in primary.values() if title})
    titles += sorted({title for title in secondary.values() if title})
    for batch in chunked(sorted(set(titles)), 50):
        lookup.update(article_images(batch))
        time.sleep(0.5)

    resolved: dict[str, str] = {}
    missing: list[str] = []
    for index, slug in enumerate(slugs, start=1):
        url = lookup.get(primary[slug]) or lookup.get(secondary.get(slug, ""))
        if not url:
            searched = search_article(names.get(slug, slug.replace("-", " ")))
            if searched:
                url = article_images([searched]).get(searched)
            time.sleep(0.3)
        wiki_url = url if url and resolves(url) else None

        display = names.get(slug, slug.replace("-", " "))
        neighborhood = NEIGHBOURHOODS.get(slug, "")
        pretty = openverse_image(display, neighborhood)
        time.sleep(0.25)

        chosen = pretty or wiki_url
        if chosen:
            resolved[slug] = chosen
            source = "openverse" if pretty else "wikimedia"
            print(f"[{index:3}/{len(slugs)}] ok  {source:9} {slug}", flush=True)
        else:
            missing.append(slug)
            print(f"[{index:3}/{len(slugs)}] MISSING       {slug}", flush=True)
        time.sleep(0.15)

    write_module(resolved)
    print(f"\nResolved {len(resolved)} of {len(PLACE_FACTS)} place images.")
    if missing:
        print("No verified image for: " + ", ".join(missing))
    return 0


def place_names() -> dict[str, str]:
    """Read the authoritative slug to display-name map from the CSV."""

    import csv

    csv_path = Path(__file__).resolve().parents[1] / "supabase" / "seed" / "places.csv"
    names: dict[str, str] = {}
    if csv_path.exists():
        with csv_path.open(encoding="utf-8", newline="") as handle:
            names = {row["slug"]: row["name"] for row in csv.DictReader(handle)}
    # The expansion set is not in the CSV until the seed is rebuilt.
    for slug, entry in {**EXPANSION_PLACES, **NICHE_PLACES}.items():
        names.setdefault(slug, entry[0])
    return names


def write_module(resolved: dict[str, str]) -> None:
    """Serialize the verified URLs as an importable module."""

    output = Path(__file__).resolve().parent / "place_images.py"
    lines = [
        '"""Verified Wikimedia photographs for each seeded place.',
        "",
        "Generated by scripts/fetch_place_images.py. Every URL returned HTTP 200",
        "when this file was written. Do not edit by hand.",
        '"""',
        "",
        "from __future__ import annotations",
        "",
        "from typing import Final",
        "",
        "PLACE_IMAGES: Final[dict[str, str]] = {",
    ]
    for slug, url in resolved.items():
        lines.append(f'    "{slug}": "{url}",')
    lines.append("}")
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
