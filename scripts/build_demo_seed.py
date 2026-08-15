"""Generate the Journi demo dataset: people, visits, social graph, and
pre-computed recommendations.

Recommendations are written straight into the table rather than produced by the
recommend Edge Function. The scoring is the same formula from Part 8.2 —
taste match, friend signal, quality, diversity, minus crowd and price penalties
— evaluated here in Python, and the reason strings follow the Part 8.3 rules.
That means the app has a full, sensible recommendation set for every account
without any model call at runtime.

    python scripts/build_demo_seed.py
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import math
import unicodedata
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import TypeVar

from demo_people import ACTIVITY_VISITS, DEMO_PEOPLE

T = TypeVar("T")

ROOT = Path(__file__).resolve().parents[1]
PLACES_CSV = ROOT / "supabase" / "seed" / "places.csv"
OUTPUT_SQL = ROOT / "supabase" / "seed" / "demo.sql"

PASSWORD = "journi-demo"
TEAM_PASSWORD = "Hello@123"
RECOMMENDATIONS_PER_USER = 20

# Real accounts for the people building this, seeded like everyone else.
TEAM_ACCOUNTS: dict[str, tuple[str, str, str, tuple[str, ...], str]] = {
    "sarangshivam99@gmail.com": (
        "shivam",
        "Shivam Sarang",
        "Building this. Also genuinely trying to see all five boroughs.",
        ("viewpoint", "landmark", "museum", "market"),
        "heavy",
    ),
    "vikhyatkulshrestha12@gmail.com": (
        "vikhyat",
        "Vikhyat Kulshrestha",
        "Long walks, good coffee, and an argument about the best bridge.",
        ("park", "bridge", "waterfront", "neighborhood"),
        "regular",
    ),
    "adityaparekh944@gmail.com": (
        "aditya",
        "Aditya Parekh",
        "Museums on rainy days, rooftops otherwise.",
        ("museum", "gallery", "viewpoint", "theater"),
        "regular",
    ),
    "sandhu.mehtab@gmail.com": (
        "mehtab",
        "Mehtab Sandhu",
        "Here for the food halls and the parks, in that order.",
        ("market", "neighborhood", "park", "venue"),
        "regular",
    ),
}

# Name pools for the generated cast. Kept broad so the feed does not read as
# one demographic.
FIRST_NAMES = [
    "Amara",
    "Luis",
    "Wren",
    "Devika",
    "Tobias",
    "Naomi",
    "Elias",
    "Priya",
    "Marcus",
    "Ingrid",
    "Hassan",
    "Cleo",
    "Rafael",
    "Yara",
    "Soren",
    "Bianca",
    "Omar",
    "Freya",
    "Diego",
    "Nadia",
    "Kenji",
    "Rosalind",
    "Thabo",
    "Elena",
    "Idris",
    "Margot",
    "Anwar",
    "Sunni",
    "Viktor",
    "Leila",
    "Casimir",
    "Imani",
    "Gustavo",
    "Anouk",
    "Rashid",
    "Delphine",
    "Bo",
    "Marisol",
    "Emeka",
    "Talia",
    "Jonas",
    "Rani",
    "Curtis",
    "Saoirse",
    "Malik",
    "Antonia",
    "Peer",
    "Zuri",
    "Lorenzo",
    "Hana",
    "Dmitri",
    "Ayesha",
    "Fionn",
    "Camila",
    "Nikolai",
    "Esme",
    "Terrence",
    "Suri",
    "Bastien",
    "Aditi",
    "Roland",
    "Mei",
    "Kwame",
    "Solveig",
    "Arturo",
    "Nour",
    "Silas",
    "Paloma",
    "Ivo",
    "Chidi",
    "Renata",
    "Aksel",
    "Zainab",
    "Emmett",
    "Lucia",
    "Osei",
    "Greta",
    "Rohan",
    "Simone",
    "Aleksy",
    "Kaia",
    "Julius",
    "Farida",
    "Beckett",
    "Noor",
    "Matias",
    "Wilhelmina",
    "Sekou",
    "Elodie",
    "Rune",
    "Anaya",
    "Fabian",
    "Miriam",
    "Tunde",
    "Astrid",
    "Corbin",
    "Leilani",
    "Ravi",
    "Ottoline",
    "Dashiell",
    "Yusra",
]

LAST_NAMES = [
    "Okafor",
    "Serrano",
    "Delacroix",
    "Nakamura",
    "Kowalski",
    "Abebe",
    "Rossi",
    "Fitzgerald",
    "Haddad",
    "Lindqvist",
    "Mbeki",
    "Castellanos",
    "Nguyen",
    "Petrakis",
    "Whitfield",
    "Marchetti",
    "Osei",
    "Sandoval",
    "Kimura",
    "Bello",
    "Novak",
    "Rahimi",
    "Aguilar",
    "Sørensen",
    "Chaudhry",
    "Mensah",
    "Ferreira",
    "Bergström",
    "Okonkwo",
    "Vasquez",
    "Larkin",
    "Tadesse",
    "Bianchi",
    "Moreau",
    "Adeyemi",
    "Kaplan",
    "Iqbal",
    "Salvatore",
    "Ekwueme",
    "Voss",
    "Cardoso",
    "Halvorsen",
    "Mwangi",
    "Duarte",
    "Sinclair",
    "Farooq",
    "Bertrand",
    "Nakashima",
    "Oyelaran",
    "Grimaldi",
    "Achebe",
    "Solberg",
    "Cortez",
    "Malhotra",
    "Baptiste",
    "Enriquez",
    "Thackeray",
    "Amadi",
]

BIOS = [
    "Weekends are for the outer boroughs.",
    "I keep a list. The list keeps growing.",
    "Two coffees, then a very long walk.",
    "Rating things is my whole personality now.",
    "Here since 2019 and still finding new blocks.",
    "Born here. Still surprised by it.",
    "Free museum hours or nothing.",
    "I will take the ferry for no reason at all.",
    "Parks in the morning, galleries in the rain.",
    "The best places have no sign out front.",
    "One neighbourhood at a time, properly.",
    "I photograph doors. It has gotten out of hand.",
    "Ask me about the G train. Actually don't.",
    "Everything within a 40 minute subway ride.",
    "Slow travel, in my own city.",
    "I only go back if the coffee was good.",
    "Rooftops, bridges, and anywhere with a railing.",
    "Reading in a different park every Sunday.",
    "Trying to use the whole MetroCard.",
    "Bird list and a place list, running in parallel.",
]

HOME_CITIES = [
    "Manhattan, NY",
    "Brooklyn, NY",
    "Queens, NY",
    "Bronx, NY",
    "Staten Island, NY",
    "Jersey City, NJ",
    "Hoboken, NJ",
    "Yonkers, NY",
]

CATEGORY_SETS = [
    ("park", "garden", "waterfront"),
    ("museum", "gallery", "historic_site"),
    ("market", "neighborhood", "venue"),
    ("viewpoint", "landmark", "bridge"),
    ("neighborhood", "historic_site", "gallery"),
    ("park", "sports_venue", "waterfront"),
    ("theater", "venue", "museum"),
    ("garden", "park", "tour_experience"),
    ("historic_site", "landmark", "museum"),
    ("waterfront", "bridge", "tour_experience"),
]

# Notes, keyed loosely by how the visit went. Long enough that the feed never
# shows the same sentence twice on one screen.
NOTES_GOOD = [
    "Went on a weekday morning and had it almost to myself.",
    "Better than I expected, and I already expected a lot.",
    "Took the long way in through the north entrance. Worth it.",
    "Second time here. Somehow better than the first.",
    "Stayed twice as long as I meant to.",
    "Brought a book and never opened it.",
    "The light in the late afternoon is the whole thing.",
    "Everyone should do this once. Preferably off-season.",
    "Quiet, and I did not expect quiet.",
    "This is the one I send people to now.",
    "Go early. That is the entire tip.",
    "Small, and all the better for it.",
    "I have walked past this a hundred times. Finally went in.",
    "Worth the transfer and the walk from the station.",
    "Free, and better than plenty of things that are not.",
    "Would happily spend a whole afternoon here again.",
    "The staff clearly love it, which makes a difference.",
    "Rained the entire time and it did not matter.",
    "Came for one thing, stayed for something else entirely.",
    "Exactly as good as everyone says, annoyingly.",
]

NOTES_MIXED = [
    "Fine. Glad I went, would not rush back.",
    "Nice enough, but very crowded by noon.",
    "Good for an hour, not much more.",
    "Solid. Nothing that stuck with me.",
    "Would have been better on a clear day.",
    "A bit overpriced for what it is.",
    "Pleasant, if slightly underwhelming.",
    "Worth seeing once, ticking it off the list.",
    "Better in theory than in practice.",
    "Half of it was closed, which did not help.",
    "Decent, though the queue ate the morning.",
    "I can see why people like it. Not quite for me.",
]

NOTES_POOR = [
    "Too crowded to enjoy any of it.",
    "Not worth what they charge.",
    "Twenty minutes was plenty.",
    "Mostly a gift shop with a view attached.",
    "I wanted to like this more than I did.",
    "Went at the wrong time and it showed.",
    "Would not go back, but I understand the appeal.",
    "All queue, very little payoff.",
]

COMMENTS = [
    "Adding this to my list right now.",
    "Went last month, completely agree.",
    "Try the north entrance, way quieter.",
    "How long did you spend here?",
    "This is the one I keep meaning to get to.",
    "Bold rating. I would have gone higher.",
    "Was it busy when you went?",
    "Finally someone rates this properly.",
    "Did you do the tour or just walk around?",
    "Been three times, still not tired of it.",
    "Underrated, thank you for posting.",
    "I had the opposite experience honestly.",
    "Weekday or weekend? Makes a big difference here.",
    "Okay you have convinced me.",
    "Great shot, what time of day was that?",
    "This has been on my list for two years.",
    "Agreed on the crowds. Go at opening.",
    "Did you pay full price or find a discount day?",
]

DIMENSION_LABELS = [
    "historic",
    "art and museum",
    "outdoor",
    "food",
    "nightlife",
    "market and shopping",
    "skyline and architecture",
    "active",
    "off-the-beaten-path",
    "easygoing",
]

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

BANDS = {"liked": (6.7, 10.0), "fine": (3.4, 6.6), "disliked": (0.0, 3.3)}


def stable_int(*parts: str) -> int:
    """A deterministic integer from any set of strings."""

    joined = "|".join(parts)
    return int(hashlib.sha256(joined.encode("utf-8")).hexdigest()[:12], 16)


def pick(items: Sequence[T], *parts: str) -> T:
    """Deterministically choose one item from a pool."""

    return items[stable_int(*parts) % len(items)]


def uuid_for(*parts: str) -> str:
    """A deterministic v4-shaped uuid, so re-running produces the same ids."""

    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return (
        f"{digest[0:8]}-{digest[8:12]}-4{digest[13:16]}-"
        f"a{digest[17:20]}-{digest[20:32]}"
    )


def sql_text(value: str | None) -> str:
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


# Letters NFKD leaves intact because they are distinct characters rather than
# a base plus a combining mark. The username column only accepts [a-z0-9_].
TRANSLITERATE = str.maketrans(
    {
        "ø": "o",
        "Ø": "o",
        "æ": "ae",
        "Æ": "ae",
        "å": "a",
        "Å": "a",
        "ð": "d",
        "Ð": "d",
        "þ": "th",
        "Þ": "th",
        "ß": "ss",
        "ł": "l",
        "Ł": "l",
    }
)


def ascii_slug(value: str) -> str:
    folded = value.translate(TRANSLITERATE)
    normalized = unicodedata.normalize("NFKD", folded)
    stripped = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return "".join(ch for ch in stripped.lower() if ch.isascii() and ch.isalnum())


@dataclass
class Place:
    id_key: str
    slug: str
    name: str
    category: str
    borough: str
    neighborhood: str
    taste: list[float]
    crowd_level: int
    price_tier: int
    price_usd: str
    popularity: int


@dataclass
class Person:
    username: str
    email: str
    password: str
    display_name: str
    bio: str
    home_city: str
    categories: tuple[str, ...]
    activity: str
    private: bool
    taste: list[float]
    crowd_tolerance: float
    price_sensitivity: float

    @property
    def uid(self) -> str:
        return uuid_for("journi-person", self.username)


def load_places() -> list[Place]:
    """Read the generated places CSV back in as typed records."""

    with PLACES_CSV.open(encoding="utf-8", newline="") as handle:
        return [
            Place(
                id_key=row["slug"],
                slug=row["slug"],
                name=row["name"],
                category=row["category"],
                borough=row["borough"],
                neighborhood=row["neighborhood"],
                taste=[float(row[f"tv{index}"]) for index in range(10)],
                crowd_level=int(row["crowd_level"]),
                price_tier=int(row["price_tier"]),
                price_usd=row["typical_price_usd"],
                popularity=int(row["popularity_seed"]),
            )
            for row in csv.DictReader(handle)
        ]


def taste_for(categories: tuple[str, ...], seed: str) -> list[float]:
    """Build a taste vector that leans toward the person's categories."""

    vector = [0.2 + (stable_int(seed, str(i)) % 25) / 100 for i in range(10)]
    for category in categories:
        for dimension in CATEGORY_DIMENSIONS.get(category, ()):
            vector[dimension] = min(1.0, 0.75 + (stable_int(seed, category) % 20) / 100)
    return [round(value, 2) for value in vector]


def build_people(count: int) -> list[Person]:
    people: list[Person] = []

    # 1. The named cast from the specification and the wider hand-written set.
    for username, entry in DEMO_PEOPLE.items():
        display_name, bio, home_city, categories, activity, private = entry
        people.append(
            Person(
                username=username,
                email=f"{username}@journi.demo",
                password=PASSWORD,
                display_name=display_name,
                bio=bio,
                home_city=home_city,
                categories=categories,
                activity=activity,
                private=private,
                taste=taste_for(categories, username),
                crowd_tolerance=round(
                    0.25 + (stable_int(username, "crowd") % 70) / 100, 2
                ),
                price_sensitivity=round(
                    0.2 + (stable_int(username, "price") % 75) / 100, 2
                ),
            )
        )

    # 2. The real team accounts.
    for email, team_entry in TEAM_ACCOUNTS.items():
        username, display_name, bio, categories, activity = team_entry
        people.append(
            Person(
                username=username,
                email=email,
                password=TEAM_PASSWORD,
                display_name=display_name,
                bio=bio,
                home_city="New York, NY",
                categories=categories,
                activity=activity,
                private=False,
                taste=taste_for(categories, username),
                crowd_tolerance=round(
                    0.3 + (stable_int(username, "crowd") % 60) / 100, 2
                ),
                price_sensitivity=round(
                    0.25 + (stable_int(username, "price") % 60) / 100, 2
                ),
            )
        )

    # 3. Generated people to reach the target head count.
    index = 0
    used = {person.username for person in people}
    while len(people) < count:
        seed = f"gen-{index}"
        first = pick(FIRST_NAMES, seed, "first")
        last = pick(LAST_NAMES, seed, "last")
        username = f"{ascii_slug(first)}_{ascii_slug(last)[:6]}{index:02d}"
        index += 1
        if username in used:
            continue
        used.add(username)
        categories = pick(CATEGORY_SETS, seed, "cats")
        activity = ["heavy", "regular", "regular", "casual", "casual", "new"][
            stable_int(seed, "activity") % 6
        ]
        people.append(
            Person(
                username=username,
                email=f"{username}@journi.demo",
                password=PASSWORD,
                display_name=f"{first} {last}",
                bio=pick(BIOS, seed, "bio"),
                home_city=pick(HOME_CITIES, seed, "city"),
                categories=categories,
                activity=activity,
                private=stable_int(seed, "private") % 11 == 0,
                taste=taste_for(categories, seed),
                crowd_tolerance=round(0.15 + (stable_int(seed, "crowd") % 80) / 100, 2),
                price_sensitivity=round(
                    0.15 + (stable_int(seed, "price") % 80) / 100, 2
                ),
            )
        )
    return people


def choose_visits(person: Person, places: list[Place]) -> list[Place]:
    """Pick this person's visited places, weighted toward their taste."""

    low, high = ACTIVITY_VISITS[person.activity]
    span = max(1, high - low)
    count = low + stable_int(person.username, "count") % span

    ranked = sorted(
        places,
        key=lambda place: (
            0 if place.category in person.categories else 1,
            stable_int(person.username, place.slug),
        ),
    )
    return ranked[:count]


def cosine(first: list[float], second: list[float]) -> float:
    dot = sum(a * b for a, b in zip(first, second, strict=False))
    left = math.sqrt(sum(a * a for a in first))
    right = math.sqrt(sum(b * b for b in second))
    if left == 0 or right == 0:
        return 0.0
    return dot / (left * right)


def bucket_for(person: Person, place: Place, position: int, total: int) -> str:
    """Most visits land positive; the tail spreads into fine and disliked."""

    ratio = position / max(1, total - 1)
    jitter = (stable_int(person.username, place.slug, "bucket") % 100) / 100
    blended = ratio * 0.75 + jitter * 0.25
    if blended < 0.58:
        return "liked"
    if blended < 0.87:
        return "fine"
    return "disliked"


def score_for(bucket: str, rank: int, size: int) -> float:
    minimum, maximum = BANDS[bucket]
    if size <= 1:
        return maximum
    return round(maximum - (rank / (size - 1)) * (maximum - minimum), 1)


def main() -> int:
    """Build the demo SQL from the curated cast and the seeded places."""

    from demo_sql import emit

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--people", type=int, default=110)
    arguments = parser.parse_args()

    places = load_places()
    people = build_people(arguments.people)
    OUTPUT_SQL.write_text(emit(people, places), encoding="utf-8")

    visits = sum(len(choose_visits(person, places)) for person in people)
    print(
        f"Wrote {OUTPUT_SQL.relative_to(ROOT)}: {len(people)} accounts, "
        f"{visits} visits, "
        f"{len(people) * RECOMMENDATIONS_PER_USER} recommendations, "
        f"across {len(places)} places."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
