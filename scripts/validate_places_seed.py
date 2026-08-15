"""Validate Journi's curated NYC place seed before database import."""

from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path

PLACE_CATEGORIES = frozenset(
    {
        "museum",
        "park",
        "landmark",
        "viewpoint",
        "neighborhood",
        "market",
        "venue",
        "waterfront",
        "garden",
        "historic_site",
        "bridge",
        "gallery",
        "theater",
        "sports_venue",
        "tour_experience",
    }
)

EXPECTED_BOROUGH_COUNTS = {
    "manhattan": 60,
    "brooklyn": 40,
    "queens": 25,
    "bronx": 15,
    "staten_island": 10,
}

MINIMUM_TASTE_VALUE = 0.1
MAXIMUM_TASTE_VALUE = 1.0
DOMINANT_TASTE_THRESHOLD = 0.6
MAXIMUM_DOMINANT_DIMENSIONS = 3
MINIMUM_LATITUDE = 40.4774
MAXIMUM_LATITUDE = 40.9176
MINIMUM_LONGITUDE = -74.2591
MAXIMUM_LONGITUDE = -73.7002
MAXIMUM_DESCRIPTION_LENGTH = 200
MINIMUM_PLACE_COUNT = 150
MINIMUM_DISTINCT_COORDINATE_VALUES = 120
MINIMUM_DISTINCT_HERO_IMAGES = 120
TEMPLATED_PHRASES = ("a distinctive", "Explore ")
MAXIMUM_LISTED_SLUGS = 5
MINIMUM_CATEGORY_COUNT = 4
MINIMUM_FREE_PLACE_COUNT = 40
POPULARITY_HIGH_THRESHOLD = 70
MINIMUM_POPULAR_PLACE_COUNT = 20
POPULARITY_LOW_THRESHOLD = 30
MINIMUM_OFFBEAT_PLACE_COUNT = 30

EXPECTED_COLUMNS = (
    "slug",
    "name",
    "category",
    "borough",
    "neighborhood",
    "address",
    "lat",
    "lng",
    "short_description",
    "hero_image_url",
    "tv0",
    "tv1",
    "tv2",
    "tv3",
    "tv4",
    "tv5",
    "tv6",
    "tv7",
    "tv8",
    "tv9",
    "crowd_level",
    "price_tier",
    "typical_price_usd",
    "typical_duration_minutes",
    "best_time",
    "indoor_outdoor",
    "popularity_seed",
)


@dataclass(frozen=True, slots=True)
class PlaceSeedRow:
    """Validated fields needed for dataset-level acceptance checks."""

    line_number: int
    slug: str
    category: str
    borough: str
    taste_vector: tuple[float, ...]
    price_tier: int
    popularity_seed: int
    latitude: float
    longitude: float
    short_description: str
    hero_image_url: str


class SeedValidationError(ValueError):
    """Raised when the curated seed violates the locked specification."""


def _required_value(row: dict[str, str], key: str, line_number: int) -> str:
    value = row.get(key, "").strip()
    if not value:
        raise SeedValidationError(f"Line {line_number}: {key} is required.")
    return value


def _parse_integer(row: dict[str, str], key: str, line_number: int) -> int:
    raw_value = _required_value(row, key, line_number)
    try:
        return int(raw_value)
    except ValueError as error:
        raise SeedValidationError(
            f"Line {line_number}: {key} must be an integer.",
        ) from error


def _parse_taste_vector(
    row: dict[str, str],
    line_number: int,
) -> tuple[float, ...]:
    values: list[float] = []
    for index in range(10):
        raw_value = _required_value(row, f"tv{index}", line_number)
        try:
            value = float(raw_value)
        except ValueError as error:
            raise SeedValidationError(
                f"Line {line_number}: tv{index} must be numeric.",
            ) from error

        if value < MINIMUM_TASTE_VALUE or value > MAXIMUM_TASTE_VALUE:
            raise SeedValidationError(
                f"Line {line_number}: tv{index} must be between 0.1 and 1.0.",
            )
        if round(value, 1) != value:
            raise SeedValidationError(
                f"Line {line_number}: tv{index} must use one decimal place.",
            )
        values.append(value)

    dominant_dimension_count = sum(value > DOMINANT_TASTE_THRESHOLD for value in values)
    if dominant_dimension_count > MAXIMUM_DOMINANT_DIMENSIONS:
        raise SeedValidationError(
            f"Line {line_number}: no more than three taste values may exceed 0.6.",
        )

    return tuple(values)


def parse_place(row: dict[str, str], line_number: int) -> PlaceSeedRow:
    """Parse and validate one CSV record."""

    category = _required_value(row, "category", line_number)
    borough = _required_value(row, "borough", line_number)
    latitude = float(_required_value(row, "lat", line_number))
    longitude = float(_required_value(row, "lng", line_number))
    description = _required_value(row, "short_description", line_number)
    image_url = _required_value(row, "hero_image_url", line_number)
    crowd_level = _parse_integer(row, "crowd_level", line_number)
    price_tier = _parse_integer(row, "price_tier", line_number)
    popularity_seed = _parse_integer(row, "popularity_seed", line_number)

    if category not in PLACE_CATEGORIES:
        raise SeedValidationError(
            f"Line {line_number}: unknown category {category!r}.",
        )
    if borough not in EXPECTED_BOROUGH_COUNTS:
        raise SeedValidationError(
            f"Line {line_number}: unknown borough {borough!r}.",
        )
    if not MINIMUM_LATITUDE <= latitude <= MAXIMUM_LATITUDE:
        raise SeedValidationError(
            f"Line {line_number}: latitude is outside NYC bounds.",
        )
    if not MINIMUM_LONGITUDE <= longitude <= MAXIMUM_LONGITUDE:
        raise SeedValidationError(
            f"Line {line_number}: longitude is outside NYC bounds.",
        )
    if len(description) > MAXIMUM_DESCRIPTION_LENGTH:
        raise SeedValidationError(
            f"Line {line_number}: description exceeds 200 characters.",
        )
    if not image_url.startswith("https://"):
        raise SeedValidationError(
            f"Line {line_number}: hero image must use HTTPS.",
        )
    if crowd_level not in range(1, 6):
        raise SeedValidationError(
            f"Line {line_number}: crowd_level must be from 1 through 5.",
        )
    if price_tier not in range(5):
        raise SeedValidationError(
            f"Line {line_number}: price_tier must be from 0 through 4.",
        )
    if popularity_seed not in range(101):
        raise SeedValidationError(
            f"Line {line_number}: popularity_seed must be from 0 through 100.",
        )

    return PlaceSeedRow(
        line_number=line_number,
        slug=_required_value(row, "slug", line_number),
        category=category,
        borough=borough,
        taste_vector=_parse_taste_vector(row, line_number),
        price_tier=price_tier,
        popularity_seed=popularity_seed,
        latitude=latitude,
        longitude=longitude,
        short_description=description,
        hero_image_url=image_url,
    )


def validate_dataset(places: Sequence[PlaceSeedRow]) -> list[str]:
    """Return all dataset-level errors instead of failing on the first one."""

    errors: list[str] = []
    borough_counts = Counter(place.borough for place in places)
    category_counts = Counter(place.category for place in places)
    slugs = [place.slug for place in places]

    if len(places) < MINIMUM_PLACE_COUNT:
        errors.append(f"Expected at least 150 places; found {len(places)}.")
    thin_boroughs = sorted(
        borough
        for borough, minimum in EXPECTED_BOROUGH_COUNTS.items()
        if borough_counts[borough] < minimum
    )
    if thin_boroughs:
        errors.append(
            "These boroughs fall below the distribution floor in Part 15.1: "
            + ", ".join(
                f"{borough} {borough_counts[borough]}/"
                f"{EXPECTED_BOROUGH_COUNTS[borough]}"
                for borough in thin_boroughs
            )
            + ".",
        )
    unexpected = sorted(set(borough_counts) - set(EXPECTED_BOROUGH_COUNTS))
    if unexpected:
        errors.append("Unknown boroughs: " + ", ".join(unexpected) + ".")
    if len(slugs) != len(set(slugs)):
        errors.append("Every place slug must be unique.")

    missing_categories = sorted(
        category
        for category in PLACE_CATEGORIES
        if category_counts[category] < MINIMUM_CATEGORY_COUNT
    )
    if missing_categories:
        errors.append(
            "Categories with fewer than four places: "
            + ", ".join(missing_categories)
            + ".",
        )
    free_place_count = sum(place.price_tier == 0 for place in places)
    if free_place_count < MINIMUM_FREE_PLACE_COUNT:
        errors.append("At least 40 places must be free.")
    popular_place_count = sum(
        place.popularity_seed >= POPULARITY_HIGH_THRESHOLD for place in places
    )
    if popular_place_count < MINIMUM_POPULAR_PLACE_COUNT:
        errors.append("At least 20 places must have popularity_seed >= 70.")
    offbeat_place_count = sum(
        place.popularity_seed <= POPULARITY_LOW_THRESHOLD for place in places
    )
    if offbeat_place_count < MINIMUM_OFFBEAT_PLACE_COUNT:
        errors.append("At least 30 places must have popularity_seed <= 30.")

    errors.extend(_authenticity_errors(places))
    return errors


def _authenticity_errors(places: Sequence[PlaceSeedRow]) -> list[str]:
    """Catch generated placeholder data masquerading as curated records.

    An earlier revision of the seed passed every distribution rule above while
    placing Brooklyn Bridge in the Upper East Side, giving all 150 places the
    same photograph, and describing each one with the same sentence template.
    These checks make that class of regression fail the build.
    """

    errors: list[str] = []

    distinct_latitudes = {place.latitude for place in places}
    distinct_longitudes = {place.longitude for place in places}
    if len(distinct_latitudes) < MINIMUM_DISTINCT_COORDINATE_VALUES:
        errors.append(
            "Latitudes look generated: only "
            f"{len(distinct_latitudes)} distinct values across {len(places)} "
            f"places (expected at least {MINIMUM_DISTINCT_COORDINATE_VALUES}).",
        )
    if len(distinct_longitudes) < MINIMUM_DISTINCT_COORDINATE_VALUES:
        errors.append(
            "Longitudes look generated: only "
            f"{len(distinct_longitudes)} distinct values across {len(places)} "
            f"places (expected at least {MINIMUM_DISTINCT_COORDINATE_VALUES}).",
        )

    distinct_images = {place.hero_image_url for place in places}
    if len(distinct_images) < MINIMUM_DISTINCT_HERO_IMAGES:
        errors.append(
            f"Only {len(distinct_images)} distinct hero images across "
            f"{len(places)} places; expected at least "
            f"{MINIMUM_DISTINCT_HERO_IMAGES}. Run scripts/fetch_place_images.py.",
        )

    templated = sorted(
        place.slug
        for place in places
        if any(phrase in place.short_description for phrase in TEMPLATED_PHRASES)
    )
    if templated:
        errors.append(
            "Descriptions still use the placeholder template: "
            + ", ".join(templated[:MAXIMUM_LISTED_SLUGS])
            + ("..." if len(templated) > MAXIMUM_LISTED_SLUGS else "")
            + ".",
        )

    duplicate_descriptions = len(places) - len(
        {place.short_description for place in places}
    )
    if duplicate_descriptions:
        errors.append(
            f"{duplicate_descriptions} places share a description with another "
            "place; every description must be specific to its place.",
        )

    return errors


def read_places(csv_path: Path) -> list[PlaceSeedRow]:
    """Read seed rows and enforce the exact documented column order."""

    with csv_path.open(encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if tuple(reader.fieldnames or ()) != EXPECTED_COLUMNS:
            raise SeedValidationError(
                "CSV columns do not match the locked Journi specification.",
            )
        return [
            parse_place(row, line_number) for line_number, row in enumerate(reader, 2)
        ]


def build_parser() -> argparse.ArgumentParser:
    """Create the command-line parser."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path)
    return parser


def print_errors(errors: Iterable[str]) -> None:
    """Print validation failures consistently."""

    for error in errors:
        print(f"- {error}", file=sys.stderr)


def main() -> int:
    """Run the validator and return a shell-compatible status code."""

    arguments = build_parser().parse_args()
    try:
        places = read_places(arguments.csv_path)
        errors = validate_dataset(places)
    except (OSError, SeedValidationError, ValueError) as error:
        print(f"Seed validation failed: {error}", file=sys.stderr)
        return 1

    if errors:
        print_errors(errors)
        return 1

    print(f"Validated {len(places)} Journi places.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
