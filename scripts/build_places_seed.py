"""Build Journi's deterministic NYC place CSV and idempotent SQL seed."""

from __future__ import annotations

import argparse
import csv
import re
from dataclasses import dataclass
from pathlib import Path

from place_expansion import EXPANSION_PLACES
from place_facts import PLACE_FACTS
from place_images import PLACE_IMAGES
from place_niche import NICHE_PLACES
from place_tickets import TICKET_URLS
from validate_places_seed import EXPECTED_COLUMNS, read_places, validate_dataset

POPULAR_PLACE_END_INDEX = 25

# Upper bound of each admission price tier, in US dollars.
TIER_1_MAX = 12
TIER_2_MAX = 25
TIER_3_MAX = 45
OFFBEAT_PLACE_START_INDEX = 120

FREE_CATEGORIES = frozenset(
    {
        "bridge",
        "gallery",
        "garden",
        "historic_site",
        "landmark",
        "neighborhood",
        "park",
        "viewpoint",
        "waterfront",
    }
)

CATEGORY_DIMENSIONS = {
    "museum": (1,),
    "park": (2, 9),
    "landmark": (0, 6),
    "viewpoint": (6,),
    "neighborhood": (8,),
    "market": (3, 5),
    "venue": (4,),
    "waterfront": (2,),
    "garden": (2, 9),
    "historic_site": (0,),
    "bridge": (6, 7),
    "gallery": (1,),
    "theater": (1, 4),
    "sports_venue": (7,),
    "tour_experience": (0, 9),
}

INDOOR_CATEGORIES = frozenset({"gallery", "market", "museum", "theater", "venue"})

PLACE_GROUPS: dict[str, list[tuple[str, str, str]]] = {
    "manhattan": [
        ("Central Park", "park", "Central Park"),
        ("The Metropolitan Museum of Art", "museum", "Upper East Side"),
        ("Museum of Modern Art", "museum", "Midtown"),
        ("American Museum of Natural History", "museum", "Upper West Side"),
        ("Solomon R. Guggenheim Museum", "museum", "Upper East Side"),
        ("Whitney Museum of American Art", "museum", "Meatpacking District"),
        ("Tenement Museum", "museum", "Lower East Side"),
        ("9/11 Memorial Museum", "museum", "Financial District"),
        ("Intrepid Museum", "museum", "Hell's Kitchen"),
        ("The Met Cloisters", "museum", "Fort Tryon Park"),
        ("The High Line", "park", "Chelsea"),
        ("Bryant Park", "park", "Midtown"),
        ("Washington Square Park", "park", "Greenwich Village"),
        ("Riverside Park", "park", "Upper West Side"),
        ("Little Island", "park", "Chelsea"),
        ("The Battery", "park", "Financial District"),
        ("Madison Square Park", "park", "Flatiron District"),
        ("Fort Tryon Park", "park", "Hudson Heights"),
        ("Empire State Building", "viewpoint", "Midtown"),
        ("Top of the Rock", "viewpoint", "Midtown"),
        ("One World Observatory", "viewpoint", "Financial District"),
        ("Edge", "viewpoint", "Hudson Yards"),
        ("SUMMIT One Vanderbilt", "viewpoint", "Midtown"),
        ("Flatiron Building", "landmark", "Flatiron District"),
        ("Grand Central Terminal", "landmark", "Midtown"),
        ("Rockefeller Center", "landmark", "Midtown"),
        ("Times Square", "landmark", "Theater District"),
        ("Statue of Liberty", "landmark", "Liberty Island"),
        ("Chinatown", "neighborhood", "Chinatown"),
        ("Harlem", "neighborhood", "Harlem"),
        ("Greenwich Village", "neighborhood", "Greenwich Village"),
        ("SoHo", "neighborhood", "SoHo"),
        ("Lower East Side", "neighborhood", "Lower East Side"),
        ("Little Italy", "neighborhood", "Little Italy"),
        ("Chelsea Market", "market", "Chelsea"),
        ("Essex Market", "market", "Lower East Side"),
        ("Union Square Greenmarket", "market", "Union Square"),
        ("The Drawing Center", "gallery", "SoHo"),
        ("Apollo Theater", "theater", "Harlem"),
        ("Broadway Theater District", "theater", "Theater District"),
        ("Lincoln Center", "venue", "Lincoln Square"),
        ("Radio City Music Hall", "venue", "Midtown"),
        ("Carnegie Hall", "venue", "Midtown"),
        ("Blue Note Jazz Club", "venue", "Greenwich Village"),
        ("Pier 17", "waterfront", "Seaport"),
        ("Hudson River Park", "waterfront", "West Village"),
        ("East River Esplanade", "waterfront", "Upper East Side"),
        ("South Street Seaport", "waterfront", "Seaport"),
        ("Conservatory Garden", "garden", "East Harlem"),
        ("Jefferson Market Garden", "garden", "Greenwich Village"),
        ("Heather Garden", "garden", "Fort Tryon Park"),
        ("Federal Hall", "historic_site", "Financial District"),
        ("Hamilton Grange", "historic_site", "Hamilton Heights"),
        ("Morris-Jumel Mansion", "historic_site", "Washington Heights"),
        ("Brooklyn Bridge", "bridge", "Civic Center"),
        ("Manhattan Bridge", "bridge", "Chinatown"),
        ("Madison Square Garden", "sports_venue", "Midtown"),
        ("Chelsea Piers", "sports_venue", "Chelsea"),
        ("Circle Line Sightseeing Cruises", "tour_experience", "Hell's Kitchen"),
        ("Roosevelt Island Tramway", "tour_experience", "Upper East Side"),
    ],
    "brooklyn": [
        ("Brooklyn Museum", "museum", "Prospect Heights"),
        ("New York Transit Museum", "museum", "Downtown Brooklyn"),
        ("Brooklyn Children's Museum", "museum", "Crown Heights"),
        ("The City Reliquary", "museum", "Williamsburg"),
        ("Prospect Park", "park", "Prospect Park"),
        ("Brooklyn Bridge Park", "park", "DUMBO"),
        ("McCarren Park", "park", "Williamsburg"),
        ("Fort Greene Park", "park", "Fort Greene"),
        ("Sunset Park", "park", "Sunset Park"),
        ("Marine Park", "park", "Marine Park"),
        ("Domino Park", "park", "Williamsburg"),
        ("Bushwick Inlet Park", "park", "Greenpoint"),
        ("Brooklyn Botanic Garden", "garden", "Prospect Heights"),
        ("Narrows Botanical Gardens", "garden", "Bay Ridge"),
        ("6/15 Green Community Garden", "garden", "Park Slope"),
        ("Green-Wood Cemetery", "historic_site", "Greenwood Heights"),
        ("Old Stone House", "historic_site", "Park Slope"),
        ("Weeksville Heritage Center", "historic_site", "Crown Heights"),
        ("Wyckoff House Museum", "historic_site", "Canarsie"),
        ("Brooklyn Heights Promenade", "viewpoint", "Brooklyn Heights"),
        ("The William Vale Rooftop", "viewpoint", "Williamsburg"),
        ("Time Out Market Rooftop", "viewpoint", "DUMBO"),
        ("DUMBO", "neighborhood", "DUMBO"),
        ("Williamsburg", "neighborhood", "Williamsburg"),
        ("Bushwick", "neighborhood", "Bushwick"),
        ("Red Hook", "neighborhood", "Red Hook"),
        ("Park Slope", "neighborhood", "Park Slope"),
        ("Coney Island", "landmark", "Coney Island"),
        ("Smorgasburg", "market", "Williamsburg"),
        ("Brooklyn Flea", "market", "DUMBO"),
        ("DeKalb Market Hall", "market", "Downtown Brooklyn"),
        ("Industry City", "market", "Sunset Park"),
        ("Brooklyn Academy of Music", "theater", "Fort Greene"),
        ("St. Ann's Warehouse", "theater", "DUMBO"),
        ("Kings Theatre", "theater", "Flatbush"),
        ("Barclays Center", "sports_venue", "Prospect Heights"),
        ("Pioneer Works", "gallery", "Red Hook"),
        ("Prospect Park Bandshell", "venue", "Prospect Park"),
        ("Coney Island Boardwalk", "waterfront", "Coney Island"),
        ("Verrazzano-Narrows Bridge", "bridge", "Bay Ridge"),
    ],
    "queens": [
        ("MoMA PS1", "museum", "Long Island City"),
        ("Museum of the Moving Image", "museum", "Astoria"),
        ("Queens Museum", "museum", "Flushing Meadows"),
        ("New York Hall of Science", "museum", "Flushing Meadows"),
        ("The Noguchi Museum", "museum", "Long Island City"),
        ("Socrates Sculpture Park", "park", "Astoria"),
        ("Flushing Meadows Corona Park", "park", "Flushing Meadows"),
        ("Gantry Plaza State Park", "park", "Long Island City"),
        ("Astoria Park", "park", "Astoria"),
        ("Forest Park", "park", "Forest Hills"),
        ("Queens Botanical Garden", "garden", "Flushing"),
        ("Jamaica Bay Wildlife Refuge", "tour_experience", "Broad Channel"),
        ("Louis Armstrong House Museum", "historic_site", "Corona"),
        ("Bowne House", "historic_site", "Flushing"),
        ("King Manor Museum", "historic_site", "Jamaica"),
        ("Unisphere", "landmark", "Flushing Meadows"),
        ("New York State Pavilion", "landmark", "Flushing Meadows"),
        ("Astoria", "neighborhood", "Astoria"),
        ("Jackson Heights", "neighborhood", "Jackson Heights"),
        ("Flushing Chinatown", "neighborhood", "Flushing"),
        ("Rockaway Beach", "waterfront", "Rockaway"),
        ("Hunter's Point South Park", "waterfront", "Long Island City"),
        ("Queens Night Market", "market", "Flushing Meadows"),
        ("USTA Billie Jean King National Tennis Center", "sports_venue", "Flushing"),
        ("SculptureCenter", "gallery", "Long Island City"),
    ],
    "bronx": [
        ("Bronx Museum of the Arts", "museum", "Concourse"),
        ("Wave Hill", "garden", "Riverdale"),
        ("New York Botanical Garden", "garden", "Bedford Park"),
        ("Bronx Zoo", "tour_experience", "Belmont"),
        ("Van Cortlandt Park", "park", "Van Cortlandt Village"),
        ("Pelham Bay Park", "park", "Pelham Bay"),
        ("Bronx Documentary Center", "gallery", "Melrose"),
        ("Edgar Allan Poe Cottage", "historic_site", "Fordham"),
        ("Bartow-Pell Mansion Museum", "historic_site", "Pelham Bay"),
        ("Woodlawn Cemetery", "historic_site", "Woodlawn"),
        ("Yankee Stadium", "sports_venue", "Concourse"),
        ("Orchard Beach", "waterfront", "Pelham Bay"),
        ("City Island", "neighborhood", "City Island"),
        ("Arthur Avenue Retail Market", "market", "Belmont"),
        ("The High Bridge", "bridge", "Highbridge"),
    ],
    "staten_island": [
        ("Staten Island Museum", "museum", "St. George"),
        ("National Lighthouse Museum", "museum", "St. George"),
        ("Snug Harbor Cultural Center", "garden", "Livingston"),
        ("Staten Island Greenbelt", "park", "New Springville"),
        ("Conference House Park", "historic_site", "Tottenville"),
        ("Alice Austen House", "historic_site", "Rosebank"),
        ("Fort Wadsworth", "historic_site", "Rosebank"),
        ("St. George", "neighborhood", "St. George"),
        ("South Beach", "waterfront", "South Beach"),
        ("Staten Island Ferry", "tour_experience", "St. George"),
    ],
}


@dataclass(frozen=True, slots=True)
class GeneratedPlace:
    """One normalized record ready for CSV and SQL serialization."""

    values: dict[str, str]


def slugify(value: str) -> str:
    """Return a stable URL-safe slug."""

    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def popularity(index: int) -> int:
    """Create the required high, middle, and offbeat popularity bands."""

    if index < POPULAR_PLACE_END_INDEX:
        return 95 - (index % 6) * 5
    if index >= OFFBEAT_PLACE_START_INDEX:
        return 18 + (index % 5) * 3
    return 38 + (index % 6) * 5


def taste_vector(category: str, popularity_seed: int) -> list[float]:
    """Author a sparse, category-led vector with a popularity inverse."""

    vector = [0.2] * 10
    for dimension in CATEGORY_DIMENSIONS[category]:
        vector[dimension] = 0.9
    offbeat_value = round(max(0.1, 1 - popularity_seed / 100), 1)
    vector[8] = max(vector[8], offbeat_value)
    return vector


def place_fact(slug: str) -> tuple[float, float, str]:
    """Return the hand-authored coordinates and description for one place."""

    try:
        return PLACE_FACTS[slug]
    except KeyError:
        raise SystemExit(
            f"No curated facts for '{slug}'. Add it to scripts/place_facts.py."
        ) from None


def hero_image(slug: str) -> str:
    """Return the verified photograph of this place."""

    try:
        return PLACE_IMAGES[slug]
    except KeyError:
        raise SystemExit(
            f"No verified image for '{slug}'. "
            "Run: python scripts/fetch_place_images.py"
        ) from None


def tier_from_price(price: float | None) -> int:
    """Map a real admission price onto the 0-4 tier the schema stores."""

    if not price:
        return 0
    if price < TIER_1_MAX:
        return 1
    if price < TIER_2_MAX:
        return 2
    if price < TIER_3_MAX:
        return 3
    return 4


def price_tier(category: str, index: int) -> int:
    """Return a plausible tier while preserving abundant free exploration."""

    if category in FREE_CATEGORIES:
        return 0
    if category in {"museum", "tour_experience"}:
        return 2
    if category in {"sports_venue", "theater", "venue"}:
        return 3
    return 1 + index % 2


def generate_places() -> list[GeneratedPlace]:
    """Generate all curated records in deterministic borough order."""

    generated: list[GeneratedPlace] = []
    global_index = 0
    for borough, templates in PLACE_GROUPS.items():
        for name, category, neighborhood in templates:
            slug = slugify(name)
            popularity_seed = popularity(global_index)
            latitude, longitude, description = place_fact(slug)
            tier = price_tier(category, global_index)
            vector = taste_vector(category, popularity_seed)
            values = {
                "slug": slug,
                "name": name,
                "category": category,
                "borough": borough,
                "neighborhood": neighborhood,
                "address": f"{neighborhood}, New York, NY",
                "lat": str(latitude),
                "lng": str(longitude),
                "short_description": description,
                "hero_image_url": hero_image(slug),
                **{f"tv{index}": f"{value:.1f}" for index, value in enumerate(vector)},
                "crowd_level": str(max(1, min(5, popularity_seed // 20 + 1))),
                "price_tier": str(tier),
                "typical_price_usd": "" if tier == 0 else f"{tier * 18:.2f}",
                "typical_duration_minutes": str(45 + global_index % 6 * 30),
                "best_time": "morning" if category in FREE_CATEGORIES else "afternoon",
                "indoor_outdoor": (
                    "indoor" if category in INDOOR_CATEGORIES else "outdoor"
                ),
                "popularity_seed": str(popularity_seed),
                "ticket_url": TICKET_URLS.get(slug, ""),
            }
            generated.append(GeneratedPlace(values))
            global_index += 1

    for slug, entry in {**EXPANSION_PLACES, **NICHE_PLACES}.items():
        name, category, borough, neighborhood, lat, lng, price, description = entry
        popularity_seed = popularity(global_index)
        tier = tier_from_price(price)
        vector = taste_vector(category, popularity_seed)
        generated.append(
            GeneratedPlace(
                {
                    "slug": slug,
                    "name": name,
                    "category": category,
                    "borough": borough,
                    "neighborhood": neighborhood,
                    "address": f"{neighborhood}, New York, NY",
                    "lat": str(lat),
                    "lng": str(lng),
                    "short_description": description,
                    "hero_image_url": hero_image(slug),
                    **{
                        f"tv{index}": f"{value:.1f}"
                        for index, value in enumerate(vector)
                    },
                    "crowd_level": str(max(1, min(5, popularity_seed // 20 + 1))),
                    "price_tier": str(tier),
                    "typical_price_usd": "" if price is None else f"{price:.2f}",
                    "typical_duration_minutes": str(45 + global_index % 6 * 30),
                    "best_time": (
                        "morning" if category in FREE_CATEGORIES else "afternoon"
                    ),
                    "indoor_outdoor": (
                        "indoor" if category in INDOOR_CATEGORIES else "outdoor"
                    ),
                    "popularity_seed": str(popularity_seed),
                    "ticket_url": TICKET_URLS.get(slug, ""),
                }
            )
        )
        global_index += 1

    return generated


def write_csv(output_path: Path, places: list[GeneratedPlace]) -> None:
    """Write the exact locked CSV schema."""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=EXPECTED_COLUMNS)
        writer.writeheader()
        writer.writerows(place.values for place in places)


def sql_literal(value: str) -> str:
    """Quote one CSV value safely for deterministic SQL generation."""

    return "'" + value.replace("'", "''") + "'"


def write_sql(output_path: Path, places: list[GeneratedPlace]) -> None:
    """Write an idempotent bulk upsert consumed by Supabase seed."""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    rows: list[str] = []
    for place in places:
        values = place.values
        vector = ",".join(values[f"tv{index}"] for index in range(10))
        ordered_values = [
            values["slug"],
            values["name"],
            values["category"],
            values["borough"],
            values["neighborhood"],
            values["address"],
            values["lat"],
            values["lng"],
            values["short_description"],
            values["hero_image_url"],
        ]
        sql_values = ", ".join(sql_literal(value) for value in ordered_values)
        price = values["typical_price_usd"] or "null"
        rows.append(
            "  ("
            f"{sql_values}, '{{{vector}}}'::real[], "
            f"{values['crowd_level']}, {values['price_tier']}, {price}, "
            f"{values['typical_duration_minutes']}, "
            f"{sql_literal(values['best_time'])}, "
            f"{sql_literal(values['indoor_outdoor'])}, "
            f"{values['popularity_seed']}, "
            f"{sql_literal(values['ticket_url']) if values['ticket_url'] else 'null'}"
            ")"
        )

    columns = (
        "slug, name, category, borough, neighborhood, address, lat, lng, "
        "short_description, hero_image_url, taste_vector, crowd_level, "
        "price_tier, typical_price_usd, typical_duration_minutes, best_time, "
        "indoor_outdoor, popularity_seed, ticket_url"
    )
    update_columns = [
        column.strip() for column in columns.split(",") if column.strip() != "slug"
    ]
    updates = ",\n  ".join(f"{column} = excluded.{column}" for column in update_columns)
    sql = (
        "-- Generated by scripts/build_places_seed.py. Do not edit manually.\n"
        f"insert into public.places ({columns}) values\n"
        + ",\n".join(rows)
        + "\non conflict (slug) do update set\n  "
        + updates
        + ";\n"
    )
    output_path.write_text(sql, encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    """Create the command-line interface."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--csv",
        type=Path,
        default=Path("supabase/seed/places.csv"),
    )
    parser.add_argument(
        "--sql",
        type=Path,
        default=Path("supabase/seed/seed.sql"),
    )
    return parser


def main() -> int:
    """Build both artifacts, then validate the generated CSV."""

    arguments = build_parser().parse_args()
    places = generate_places()
    write_csv(arguments.csv, places)
    write_sql(arguments.sql, places)
    errors = validate_dataset(read_places(arguments.csv))
    if errors:
        raise ValueError("; ".join(errors))
    print(f"Built {len(places)} Journi place records.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
