"""Niche New York: the places locals send people to, not the postcard list.

Hidden gardens, one-room museums, ruins, obsessive collections and the odd
piece of infrastructure people make pilgrimages to. Everything here is real,
open to the public, and carries its own coordinates and description.

Format: slug -> (name, category, borough, neighborhood, lat, lng, price_usd,
                 description)
"""

from __future__ import annotations

from typing import Final

NichePlace = tuple[str, str, str, str, float, float, float | None, str]

NICHE_PLACES: Final[dict[str, NichePlace]] = {
    # ------------------------------------------------------------- Manhattan
    "elevated-acre": (
        "Elevated Acre",
        "park",
        "manhattan",
        "Financial District",
        40.7036,
        -74.0089,
        None,
        "An acre of lawn and boardwalk hidden one escalator above Water Street. "
        "Almost nobody who works below it knows it is there.",
    ),
    "whispering-gallery": (
        "Grand Central Whispering Gallery",
        "landmark",
        "manhattan",
        "Midtown",
        40.7519,
        -73.9767,
        None,
        "Stand at opposite corners of the tiled arch outside the Oyster Bar and "
        "speak into the wall. Your friend forty feet away hears it perfectly.",
    ),
    "berlin-wall-520-madison": (
        "Berlin Wall Segments",
        "historic_site",
        "manhattan",
        "Midtown",
        40.7601,
        -73.9727,
        None,
        "Five painted panels of the actual Berlin Wall standing in a midtown "
        "plaza between office towers, entirely unremarked.",
    ),
    "greenacre-park": (
        "Greenacre Park",
        "park",
        "manhattan",
        "Midtown East",
        40.7556,
        -73.9670,
        None,
        "A pocket park built around a twenty-five foot waterfall loud enough to "
        "erase the traffic. Six thousand square feet, and worth an hour.",
    ),
    "paley-park": (
        "Paley Park",
        "park",
        "manhattan",
        "Midtown",
        40.7601,
        -73.9740,
        None,
        "The original pocket park, honey locusts and a water wall on the site of "
        "the old Stork Club. The template every other one copies.",
    ),
    "the-mount-vernon-hotel-museum": (
        "Mount Vernon Hotel Museum & Garden",
        "museum",
        "manhattan",
        "Upper East Side",
        40.7607,
        -73.9591,
        8.0,
        "An 1799 carriage house that became a country day-resort, marooned now "
        "beside the Queensboro Bridge ramp and almost never busy.",
    ),
    "marble-cemetery": (
        "New York City Marble Cemetery",
        "historic_site",
        "manhattan",
        "East Village",
        40.7255,
        -73.9885,
        None,
        "A walled 1830s burial ground with no headstones, only names cut into "
        "the wall. Open a handful of days a year.",
    ),
    "st-marks-church-in-the-bowery": (
        "St. Mark's Church in-the-Bowery",
        "historic_site",
        "manhattan",
        "East Village",
        40.7292,
        -73.9873,
        None,
        "The second-oldest church building in the city, standing on Peter "
        "Stuyvesant's farm chapel, now also a poetry and dance venue.",
    ),
    "the-earth-room": (
        "The New York Earth Room",
        "gallery",
        "manhattan",
        "SoHo",
        40.7255,
        -74.0009,
        None,
        "Walter De Maria filled a SoHo loft with 280,000 pounds of dirt in 1977 "
        "and it has been kept, watered and raked ever since.",
    ),
    "the-broken-kilometer": (
        "The Broken Kilometer",
        "gallery",
        "manhattan",
        "SoHo",
        40.7241,
        -74.0016,
        None,
        "Five hundred polished brass rods laid in precise rows on a loft floor, "
        "another De Maria installation kept permanently since 1979.",
    ),
    "the-hispanic-society": (
        "Hispanic Society Museum & Library",
        "museum",
        "manhattan",
        "Washington Heights",
        40.8330,
        -73.9464,
        None,
        "Goya, Velázquez and El Greco in a terracotta hall in Washington "
        "Heights, free, and frequently almost empty.",
    ),
    "sylvan-terrace": (
        "Sylvan Terrace",
        "historic_site",
        "manhattan",
        "Washington Heights",
        40.8345,
        -73.9382,
        None,
        "Twenty wooden row houses facing each other across a cobbled lane, the "
        "closest thing in Manhattan to stepping into 1882.",
    ),
    "the-little-red-lighthouse": (
        "Little Red Lighthouse",
        "landmark",
        "manhattan",
        "Fort Washington",
        40.8501,
        -73.9474,
        None,
        "The lighthouse from the children's book, still standing directly under "
        "the George Washington Bridge's east tower.",
    ),
    "the-campbell": (
        "The Campbell",
        "venue",
        "manhattan",
        "Midtown",
        40.7527,
        -73.9765,
        24.0,
        "A 1920s railway executive's private office off the Grand Central "
        "balcony, hand-painted ceiling intact, now a cocktail bar.",
    ),
    "roosevelt-island-smallpox-hospital": (
        "Renwick Smallpox Hospital Ruin",
        "historic_site",
        "manhattan",
        "Roosevelt Island",
        40.7532,
        -73.9558,
        None,
        "A Gothic Revival hospital left as a stabilised ruin and floodlit at "
        "night, the only landmarked ruin in the city.",
    ),
    "westbeth-artists-housing": (
        "Westbeth Artists Housing",
        "gallery",
        "manhattan",
        "West Village",
        40.7357,
        -74.0090,
        None,
        "Bell Labs' old research complex converted in 1970 into subsidised "
        "artist housing, with galleries open in the courtyard.",
    ),
    "the-african-burial-ground-ancestral-chamber": (
        "Ancestral Libation Chamber",
        "historic_site",
        "manhattan",
        "Civic Center",
        40.7146,
        -74.0044,
        None,
        "The polished granite chamber at the African Burial Ground, cut with "
        "symbols from across the diaspora and open to the sky.",
    ),
    "pomander-walk": (
        "Pomander Walk",
        "historic_site",
        "manhattan",
        "Upper West Side",
        40.7936,
        -73.9723,
        None,
        "A double row of mock-Tudor cottages hidden mid-block off Broadway, "
        "built in 1921 to look like a stage set. Peer through the gate.",
    ),
    "seventh-regiment-armory": (
        "Park Avenue Armory",
        "venue",
        "manhattan",
        "Upper East Side",
        40.7679,
        -73.9660,
        20.0,
        "A 55,000 square foot drill hall used for enormous installations, "
        "wrapped in Gilded Age rooms by Tiffany and Stanford White.",
    ),
    "freedom-tunnel": (
        "Riverside Park Freight Tunnel Portal",
        "historic_site",
        "manhattan",
        "Upper West Side",
        40.8000,
        -73.9740,
        None,
        "The northern portal of the tunnel that became famous for its graffiti "
        "and its residents. Viewable from the park path above.",
    ),
    # -------------------------------------------------------------- Brooklyn
    "the-city-reliquary-annex": (
        "City Reliquary Backyard",
        "garden",
        "brooklyn",
        "Williamsburg",
        40.7112,
        -73.9541,
        7.0,
        "A garden behind a museum of New York junk, used for block parties and "
        "the annual Bicycle Fetish Day.",
    ),
    "green-wood-catacombs": (
        "Green-Wood Catacombs",
        "historic_site",
        "brooklyn",
        "Greenwood Heights",
        40.6560,
        -73.9925,
        20.0,
        "Thirty family vaults in a hillside corridor, opened only for occasional "
        "tours and candlelit concerts.",
    ),
    "the-mccarren-play-center": (
        "McCarren Play Center",
        "sports_venue",
        "brooklyn",
        "Greenpoint",
        40.7215,
        -73.9500,
        None,
        "A 1936 WPA pool for 6,800 swimmers, shuttered for thirty years and "
        "restored, its brick arch entrance a landmark in itself.",
    ),
    "brooklyn-torah-scribe": (
        "Sunset Park Chinatown",
        "neighborhood",
        "brooklyn",
        "Sunset Park",
        40.6410,
        -74.0040,
        None,
        "Eighth Avenue's Fuzhou community, the least touristed and arguably best "
        "Chinatown in the city, twenty stops from Manhattan.",
    ),
    "the-boat-graveyard": (
        "Coney Island Creek Boat Graveyard",
        "waterfront",
        "brooklyn",
        "Coney Island",
        40.5810,
        -74.0000,
        None,
        "Half-sunk hulls rusting in the creek shallows, including a yellow "
        "submarine one man built to hunt for treasure in 1970.",
    ),
    "the-quaker-cemetery": (
        "Friends Cemetery",
        "historic_site",
        "brooklyn",
        "Prospect Park",
        40.6560,
        -73.9720,
        None,
        "A private Quaker burial ground sealed inside Prospect Park, where "
        "Montgomery Clift is buried. Visible only through the fence.",
    ),
    "dead-horse-bay": (
        "Dead Horse Bay",
        "waterfront",
        "brooklyn",
        "Marine Park",
        40.5790,
        -73.8930,
        None,
        "A beach made of a burst 1950s landfill, where the tide turns up glass "
        "bottles and porcelain by the thousand.",
    ),
    "the-brooklyn-army-terminal": (
        "Brooklyn Army Terminal Atrium",
        "historic_site",
        "brooklyn",
        "Sunset Park",
        40.6455,
        -74.0210,
        None,
        "Cass Gilbert's cathedral-scale freight atrium, staggered balconies and "
        "a single preserved rail car, open on weekdays.",
    ),
    "transit-museum-vintage-fleet": (
        "Nevins Street Lower Level",
        "historic_site",
        "brooklyn",
        "Downtown Brooklyn",
        40.6883,
        -73.9807,
        None,
        "An abandoned lower platform level visible through gaps as the 2 and 3 "
        "trains pass, unused since the 1960s.",
    ),
    "weeksville-hunterfly-road": (
        "Hunterfly Road Houses",
        "historic_site",
        "brooklyn",
        "Crown Heights",
        40.6770,
        -73.9215,
        10.0,
        "Four wooden houses sitting at an angle to the street grid because they "
        "predate it, the last of a free Black village.",
    ),
    "the-bushwick-basilica": (
        "Basilica of Our Lady of Mount Carmel",
        "historic_site",
        "brooklyn",
        "Williamsburg",
        40.7030,
        -73.9418,
        None,
        "Home of the Giglio feast, where hundreds of men carry a five-ton, "
        "sixty-five foot tower through the streets each July.",
    ),
    # ---------------------------------------------------------------- Queens
    "the-panorama-of-nyc": (
        "Panorama of the City of New York",
        "museum",
        "queens",
        "Flushing Meadows",
        40.7458,
        -73.8466,
        12.0,
        "Every building in all five boroughs at 1:1200, built for the 1964 Fair "
        "and still updated. 895,000 structures on one floor.",
    ),
    "the-marine-air-terminal": (
        "Marine Air Terminal",
        "historic_site",
        "queens",
        "East Elmhurst",
        40.7700,
        -73.8730,
        None,
        "LaGuardia's original 1939 Art Deco seaplane terminal, still in use, "
        "with a 235-foot mural of the history of flight.",
    ),
    "the-louis-armstrong-garden": (
        "Louis Armstrong Japanese Garden",
        "garden",
        "queens",
        "Corona",
        40.7548,
        -73.8613,
        15.0,
        "The small garden Lucille Armstrong built behind the house, where Louis "
        "sat with a tape recorder most afternoons.",
    ),
    "the-quaker-meeting-house-flushing": (
        "Flushing Quaker Meeting House",
        "historic_site",
        "queens",
        "Flushing",
        40.7648,
        -73.8300,
        None,
        "In continuous use since 1694, the oldest place of worship in the city, "
        "with hand-hewn beams and no electricity in the main room.",
    ),
    "the-ganesh-temple": (
        "Hindu Temple Society of North America",
        "historic_site",
        "queens",
        "Flushing",
        40.7570,
        -73.8170,
        None,
        "The first traditional Hindu temple built in the United States, with a "
        "canteen in the basement locals queue for.",
    ),
    "the-lic-flux-factory": (
        "Flux Factory",
        "gallery",
        "queens",
        "Long Island City",
        40.7440,
        -73.9330,
        None,
        "An artist collective running deliberately strange exhibitions and "
        "residencies out of a Long Island City warehouse.",
    ),
    "the-rockaway-freeway": (
        "Rockaway Freeway",
        "neighborhood",
        "queens",
        "Rockaway",
        40.5910,
        -73.7950,
        None,
        "A street running directly beneath the elevated A train for two miles, "
        "shadowed and strange and entirely walkable.",
    ),
    "the-steinway-factory": (
        "Steinway & Sons Factory",
        "tour_experience",
        "queens",
        "Astoria",
        40.7810,
        -73.9040,
        None,
        "Pianos still built by hand in Astoria since 1870; the factory tour has "
        "a waiting list measured in months.",
    ),
    # ----------------------------------------------------------------- Bronx
    "the-hall-of-fame-colonnade": (
        "Bronx Community College Colonnade",
        "landmark",
        "bronx",
        "University Heights",
        40.8595,
        -73.9130,
        None,
        "Stanford White's open-air colonnade above the Harlem River, ringed by "
        "ninety-eight bronze busts and almost always deserted.",
    ),
    "the-bronx-victory-column": (
        "Bronx Victory Memorial",
        "historic_site",
        "bronx",
        "Pelham Bay",
        40.8690,
        -73.8210,
        None,
        "A winged Victory on a granite column at the edge of Pelham Bay Park, "
        "the borough's memorial to its First World War dead.",
    ),
    "the-lorelei-fountain": (
        "Lorelei Fountain",
        "landmark",
        "bronx",
        "Concourse",
        40.8290,
        -73.9210,
        None,
        "A memorial to Heinrich Heine that Düsseldorf rejected, shipped to the "
        "Bronx in 1899 and standing at Joyce Kilmer Park.",
    ),
    "the-old-croton-aqueduct": (
        "Old Croton Aqueduct Trail",
        "park",
        "bronx",
        "Van Cortlandt Village",
        40.8890,
        -73.8940,
        None,
        "Walk the roof of the 1842 tunnel that first brought clean water to the "
        "city, now a wooded path through the north Bronx.",
    ),
    "the-bronx-orchid-show-glasshouse": (
        "Enid A. Haupt Conservatory",
        "garden",
        "bronx",
        "Bedford Park",
        40.8620,
        -73.8800,
        15.0,
        "A Victorian glasshouse of eleven connected galleries running from "
        "rainforest to desert in about ninety metres.",
    ),
    # --------------------------------------------------------- Staten Island
    "the-staten-island-boat-graveyard": (
        "Arthur Kill Boat Graveyard",
        "waterfront",
        "staten_island",
        "Rossville",
        40.5560,
        -74.2130,
        None,
        "A marine scrapyard of a hundred rotting tugs and ferries in the Arthur "
        "Kill, best seen from the shoreline at low tide.",
    ),
    "the-moravian-cemetery": (
        "Moravian Cemetery",
        "historic_site",
        "staten_island",
        "New Dorp",
        40.5760,
        -74.1180,
        None,
        "113 wooded acres holding the Vanderbilt mausoleum, designed by Richard "
        "Morris Hunt with landscaping by Frederick Law Olmsted.",
    ),
    "the-sandy-ground-museum": (
        "Sandy Ground Historical Museum",
        "museum",
        "staten_island",
        "Rossville",
        40.5390,
        -74.2000,
        5.0,
        "The oldest continuously settled free Black community in the country, "
        "founded by Maryland oystermen in the 1830s.",
    ),
    "the-kill-van-kull": (
        "Kill Van Kull",
        "waterfront",
        "staten_island",
        "Port Richmond",
        40.6420,
        -74.1300,
        None,
        "The narrow tidal strait where every container ship bound for Newark "
        "squeezes under the Bayonne Bridge, close enough to hear.",
    ),
}
