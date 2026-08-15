"""Curated cast for the Journi demo dataset.

Thirty people with distinct voices, taste, and levels of activity. The variety
here is what stops the seeded app feeling generated: a heavy user with sixty
visits reads differently from someone who joined last month and logged four.

Each entry:
  username -> (display_name, bio, home_city, categories, activity, private)

`categories` biases which places they visit and their taste vector.
`activity` is one of heavy / regular / casual / new and sets the visit count.
"""

from __future__ import annotations

from typing import Final

DemoPerson = tuple[str, str, str, tuple[str, ...], str, bool]

# Category families the personas draw from.
OUTDOORS = ("park", "garden", "waterfront", "bridge")
ART = ("museum", "gallery", "theater")
FOOD = ("market", "neighborhood")
VIEWS = ("viewpoint", "landmark", "bridge")
OFFBEAT = ("neighborhood", "historic_site", "gallery")
NIGHTLIFE = ("venue", "theater", "neighborhood")
ACTIVE = ("park", "sports_venue", "waterfront")
HISTORY = ("historic_site", "landmark", "museum")
FAMILY = ("park", "garden", "tour_experience", "museum")

DEMO_PEOPLE: Final[dict[str, DemoPerson]] = {
    # --- the primary demo account -------------------------------------------
    "demo_traveler": (
        "Alex Chen",
        "Just moved here from Chicago. Making a list and working through it.",
        "New York, NY",
        ("park", "museum", "viewpoint"),
        "casual",
        False,
    ),
    # --- the five personas named in the specification ------------------------
    "maya_walks": (
        "Maya Okonkwo",
        "Walking every park in the five boroughs. Slowly.",
        "Brooklyn, NY",
        OUTDOORS,
        "heavy",
        False,
    ),
    "artdept_sam": (
        "Sam Petrakis",
        "Museum member card collector. Ask me about the Cloisters.",
        "Manhattan, NY",
        ART,
        "heavy",
        False,
    ),
    "eats_with_jo": (
        "Jo Alvarez",
        "I plan the whole day around lunch. No notes.",
        "Queens, NY",
        FOOD,
        "regular",
        False,
    ),
    "skyline_dev": (
        "Priya Raman",
        "If it has an observation deck I have been up it.",
        "Manhattan, NY",
        VIEWS,
        "regular",
        False,
    ),
    "offbeat_ray": (
        "Ray Delacroix",
        "The good stuff is four subway stops past the good stuff.",
        "Brooklyn, NY",
        OFFBEAT,
        "regular",
        False,
    ),
    # --- the wider cast -------------------------------------------------------
    "nadia_reads": (
        "Nadia Haddad",
        "Librarian. I will find you a bench with good light anywhere in the city.",
        "Brooklyn, NY",
        ("park", "museum", "historic_site"),
        "regular",
        False,
    ),
    "tomas_builds": (
        "Tomás Ferreira",
        "Structural engineer. Bridges are the whole reason I moved here.",
        "Queens, NY",
        ("bridge", "landmark", "viewpoint"),
        "regular",
        False,
    ),
    "hannah_runs": (
        "Hannah Whitfield",
        "Marathon training. Every long run ends somewhere with a view.",
        "Manhattan, NY",
        ACTIVE,
        "heavy",
        False,
    ),
    "kofi_shoots": (
        "Kofi Mensah",
        "Photographer. Golden hour, then dinner.",
        "Brooklyn, NY",
        ("viewpoint", "waterfront", "neighborhood"),
        "regular",
        False,
    ),
    "yuki_after9": (
        "Yuki Tanaka",
        "Live music five nights a week. Sleep is negotiable.",
        "Manhattan, NY",
        NIGHTLIFE,
        "regular",
        False,
    ),
    "the_archivist": (
        "Eleanor Voss",
        "Historic preservation. I read plaques out loud, sorry in advance.",
        "Staten Island, NY",
        HISTORY,
        "heavy",
        False,
    ),
    "dad_of_three": (
        "Marcus Bell",
        "Three kids under ten. Rating everything on how fast we can leave.",
        "Queens, NY",
        FAMILY,
        "regular",
        False,
    ),
    "lena_plants": (
        "Lena Kowalski",
        "Horticulturist. Botanic gardens are my entire personality.",
        "Bronx, NY",
        ("garden", "park"),
        "regular",
        False,
    ),
    "quietcorners": (
        "Ibrahim Sesay",
        "Looking for the empty bench. Usually finds it.",
        "Bronx, NY",
        OFFBEAT,
        "casual",
        True,
    ),
    "dee_on_foot": (
        "Deirdre Nolan",
        "No car, no bike. Everything on this list I walked to.",
        "Brooklyn, NY",
        ("neighborhood", "park", "waterfront"),
        "heavy",
        False,
    ),
    "chris_eats_all": (
        "Chris Okafor",
        "Food halls, night markets, and the occasional museum to feel balanced.",
        "Manhattan, NY",
        ("market", "neighborhood", "museum"),
        "regular",
        False,
    ),
    "sofia_paints": (
        "Sofia Marchetti",
        "Painter. I go for the light in the rooms as much as the work on the walls.",
        "Brooklyn, NY",
        ("gallery", "museum"),
        "regular",
        False,
    ),
    "transit_nerd": (
        "Wes Kimura",
        "I have opinions about every bridge and most of the ferries.",
        "Queens, NY",
        ("bridge", "tour_experience", "waterfront"),
        "casual",
        False,
    ),
    "greenline_amy": (
        "Amy Castellanos",
        "Weekends outside, rain or not.",
        "Manhattan, NY",
        OUTDOORS,
        "regular",
        False,
    ),
    "rooftop_reza": (
        "Reza Amiri",
        "Collecting skylines. Will pay the ticket price once.",
        "Manhattan, NY",
        VIEWS,
        "casual",
        False,
    ),
    "bk_born": (
        "Danielle Pierre",
        "Born in Flatbush. Showing you the Brooklyn that is not on the tote bag.",
        "Brooklyn, NY",
        ("neighborhood", "market", "historic_site"),
        "heavy",
        False,
    ),
    "grad_student_life": (
        "Priyanka Nair",
        "Free admission days only. This is not a bit, it is a budget.",
        "Manhattan, NY",
        ("museum", "park", "gallery"),
        "regular",
        False,
    ),
    "harborwatch": (
        "Gus Lindqvist",
        "Merchant marine, ashore for now. Anything on the water.",
        "Staten Island, NY",
        ("waterfront", "tour_experience", "bridge"),
        "casual",
        False,
    ),
    "the_slow_tourist": (
        "Fatima Rahimi",
        "One place a week, properly, instead of six in a day.",
        "Queens, NY",
        ("museum", "garden", "historic_site"),
        "casual",
        True,
    ),
    "night_owl_nyc": (
        "Jamal Whitaker",
        "The city after eleven is a different city.",
        "Manhattan, NY",
        NIGHTLIFE,
        "casual",
        False,
    ),
    "birding_bea": (
        "Beatrice Osei",
        "Two hundred and eleven species inside city limits. Ask me.",
        "Queens, NY",
        ("park", "waterfront", "garden"),
        "regular",
        False,
    ),
    "newin_nyc": (
        "Oliver Grant",
        "Landed six weeks ago. Everything is still astonishing.",
        "Manhattan, NY",
        ("landmark", "viewpoint", "museum"),
        "new",
        False,
    ),
    "mira_moves": (
        "Mira Sandoval",
        "Dance company. I know every stage door in the city.",
        "Brooklyn, NY",
        ("theater", "venue", "neighborhood"),
        "casual",
        False,
    ),
    "weekendhiker": (
        "Peter Nakamura",
        "Trail shoes on the subway. Judge away.",
        "Staten Island, NY",
        ("park", "waterfront", "historic_site"),
        "casual",
        False,
    ),
    "curator_in_training": (
        "Zoe Abrams",
        "Museum studies student. Wall text critic, reluctantly.",
        "Manhattan, NY",
        ART,
        "new",
        False,
    ),
}

# Visits per activity level. The spread matters more than the numbers: a feed
# where everyone has logged the same amount looks generated.
ACTIVITY_VISITS: Final[dict[str, tuple[int, int]]] = {
    "heavy": (46, 68),
    "regular": (18, 40),
    "casual": (6, 16),
    "new": (2, 5),
}
