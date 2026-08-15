"""Curated per-place facts for the Journi NYC seed.

Everything in this module is authored by hand, not generated. Coordinates are
real WGS84 positions for the place itself (or, for `neighborhood` records, the
conventional centre of that neighborhood), so map pins land where a visitor
would expect them. Descriptions are specific to the place and stay inside the
200 character limit the schema enforces.

Derived fields — popularity bands, taste vectors, price tiers — stay in
build_places_seed.py, because those must satisfy the distribution rules in
Part 15.1 of the specification rather than describe reality.
"""

from __future__ import annotations

from typing import Final

# slug -> (latitude, longitude, short_description)
PlaceFact = tuple[float, float, str]

PLACE_FACTS: Final[dict[str, PlaceFact]] = {
    # ---------------------------------------------------------------- Manhattan
    "central-park": (
        40.7829,
        -73.9654,
        "843 acres of meadows, lakes and winding paths through the middle of "
        "Manhattan, with the Ramble and Bethesda Terrace at its heart.",
    ),
    "the-metropolitan-museum-of-art": (
        40.7794,
        -73.9632,
        "Two million works spanning five thousand years, from Egyptian temples "
        "to the rooftop garden overlooking Central Park.",
    ),
    "museum-of-modern-art": (
        40.7614,
        -73.9776,
        "Starry Night, Campbell's Soup Cans and a sculpture garden, arranged "
        "across six floors of modern and contemporary work.",
    ),
    "american-museum-of-natural-history": (
        40.7813,
        -73.9740,
        "Blue whale overhead, dinosaur halls upstairs and the Rose Center "
        "planetarium next door. Built for wandering.",
    ),
    "solomon-r-guggenheim-museum": (
        40.7830,
        -73.9590,
        "Frank Lloyd Wright's white spiral on Fifth Avenue. Take the lift up "
        "and walk the ramp down past the exhibitions.",
    ),
    "whitney-museum-of-american-art": (
        40.7396,
        -74.0089,
        "American art from 1900 onward in a Renzo Piano building, with outdoor "
        "terraces looking over the High Line and the Hudson.",
    ),
    "tenement-museum": (
        40.7188,
        -73.9900,
        "Guided tours through restored apartments at 97 Orchard Street, telling "
        "the stories of the immigrant families who lived in them.",
    ),
    "9-11-memorial-museum": (
        40.7115,
        -74.0134,
        "The twin reflecting pools sit in the tower footprints, with the museum "
        "below ground holding the slurry wall and the last column.",
    ),
    "intrepid-museum": (
        40.7645,
        -74.0000,
        "An aircraft carrier moored on the Hudson, carrying a flight deck of "
        "jets, the Concorde and the shuttle Enterprise.",
    ),
    "the-met-cloisters": (
        40.8649,
        -73.9317,
        "Medieval European art in a hilltop building assembled from French "
        "cloisters, with herb gardens above the Hudson.",
    ),
    "the-high-line": (
        40.7480,
        -74.0048,
        "A mile and a half of disused freight line replanted as an elevated "
        "walkway from Gansevoort Street to Hudson Yards.",
    ),
    "bryant-park": (
        40.7536,
        -73.9832,
        "A formal lawn behind the public library, with a carousel, free chairs "
        "everywhere and an ice rink through the winter.",
    ),
    "washington-square-park": (
        40.7308,
        -73.9973,
        "The marble arch, the fountain and a permanent circle of chess players, "
        "buskers and NYU students in Greenwich Village.",
    ),
    "riverside-park": (
        40.8009,
        -73.9722,
        "Four miles of waterfront park along the Hudson, with the 79th Street "
        "boat basin and a promenade under the plane trees.",
    ),
    "little-island": (
        40.7420,
        -74.0110,
        "A public park raised on tulip-shaped concrete piles over the Hudson, "
        "with an amphitheatre and layered planting.",
    ),
    "the-battery": (
        40.7033,
        -74.0170,
        "The southern tip of Manhattan, with harbour views to Liberty Island, "
        "Castle Clinton and the SeaGlass carousel.",
    ),
    "madison-square-park": (
        40.7423,
        -73.9880,
        "A small Flatiron green with rotating outdoor sculpture commissions and "
        "the original Shake Shack in the corner.",
    ),
    "fort-tryon-park": (
        40.8623,
        -73.9330,
        "Terraced paths and one of the best Hudson views in the city, wrapped "
        "around the Cloisters at Manhattan's northern end.",
    ),
    "empire-state-building": (
        40.7484,
        -73.9857,
        "The 1931 Art Deco tower, with observatories on the 86th and 102nd "
        "floors and a restored ceiling in the lobby.",
    ),
    "top-of-the-rock": (
        40.7593,
        -73.9794,
        "The Rockefeller Center observation deck, and the one place you can "
        "photograph the Empire State Building in the skyline.",
    ),
    "one-world-observatory": (
        40.7127,
        -74.0134,
        "Floors 100 to 102 of One World Trade Center, reached by a lift that "
        "animates four centuries of the city on the way up.",
    ),
    "edge": (
        40.7539,
        -74.0011,
        "A triangular sky deck jutting out from Hudson Yards, with angled glass "
        "walls and a glass floor panel to stand on.",
    ),
    "summit-one-vanderbilt": (
        40.7527,
        -73.9785,
        "Mirrored rooms, a reflective floor and glass ledges cantilevered over "
        "Madison Avenue, next to Grand Central.",
    ),
    "flatiron-building": (
        40.7411,
        -73.9897,
        "The 1902 wedge at the junction of Broadway and Fifth, still one of the "
        "most photographed corners in the city.",
    ),
    "grand-central-terminal": (
        40.7527,
        -73.9772,
        "The Beaux-Arts main concourse, its green astronomical ceiling, the "
        "whispering gallery and a lower-level dining hall.",
    ),
    "rockefeller-center": (
        40.7587,
        -73.9787,
        "A complex of Art Deco towers around a sunken plaza that holds the "
        "skating rink and the Christmas tree.",
    ),
    "times-square": (
        40.7580,
        -73.9855,
        "The crossroads of Broadway and Seventh, lit around the clock by "
        "billboards. Loud, crowded and unmistakably New York.",
    ),
    "statue-of-liberty": (
        40.6892,
        -74.0445,
        "Bartholdi's copper figure on Liberty Island, reached by ferry from the "
        "Battery, with pedestal and crown tickets sold separately.",
    ),
    "chinatown": (
        40.7158,
        -73.9970,
        "Dense blocks of markets, bakeries and dumpling shops around Mott and "
        "Canal, with Columbus Park busy from early morning.",
    ),
    "harlem": (
        40.8116,
        -73.9465,
        "Brownstone streets, gospel Sundays and a long musical history around "
        "125th Street and Marcus Garvey Park.",
    ),
    "greenwich-village": (
        40.7336,
        -74.0027,
        "Low brick townhouses on crooked streets, jazz basements and the "
        "cafes around Bleecker and MacDougal.",
    ),
    "soho": (
        40.7233,
        -74.0030,
        "The largest concentration of cast-iron architecture anywhere, with "
        "flagship shops filling the ground floors.",
    ),
    "lower-east-side": (
        40.7150,
        -73.9843,
        "Tenement blocks turned over to galleries, record shops, bars and the "
        "old appetizing stores that stayed put.",
    ),
    "little-italy": (
        40.7191,
        -73.9973,
        "A few surviving blocks of Mulberry Street, with pastry counters, "
        "red-sauce restaurants and the San Gennaro feast.",
    ),
    "chelsea-market": (
        40.7425,
        -74.0061,
        "A food hall in the old Nabisco factory where the Oreo was invented, "
        "opening straight onto the High Line.",
    ),
    "essex-market": (
        40.7185,
        -73.9877,
        "A public market trading since 1940, now in a new hall on Delancey with "
        "produce, fishmongers and prepared food upstairs.",
    ),
    "union-square-greenmarket": (
        40.7359,
        -73.9911,
        "Regional farmers fill the north end of Union Square four days a week, "
        "year round, whatever the weather.",
    ),
    "the-drawing-center": (
        40.7222,
        -74.0026,
        "The only museum in the country devoted to drawing, showing historical "
        "and contemporary work in a SoHo loft.",
    ),
    "apollo-theater": (
        40.8100,
        -73.9500,
        "The Harlem stage where Amateur Night launched Ella Fitzgerald and "
        "James Brown, still running weekly.",
    ),
    "broadway-theater-district": (
        40.7590,
        -73.9845,
        "Forty-one theatres in the blocks around Times Square, with the TKTS "
        "steps selling same-day seats at a discount.",
    ),
    "lincoln-center": (
        40.7725,
        -73.9835,
        "A campus for the Metropolitan Opera, the Philharmonic and City Ballet, "
        "arranged around a travertine plaza and fountain.",
    ),
    "radio-city-music-hall": (
        40.7600,
        -73.9800,
        "A 1932 Art Deco hall with the largest proscenium in the world, home to "
        "the Rockettes and their Christmas show.",
    ),
    "carnegie-hall": (
        40.7651,
        -73.9799,
        "The 1891 concert hall on 57th Street whose main auditorium is still "
        "considered among the finest anywhere for sound.",
    ),
    "blue-note-jazz-club": (
        40.7310,
        -74.0007,
        "A small Greenwich Village room booking major jazz names two sets a "
        "night, with tables tight against the stage.",
    ),
    "pier-17": (
        40.7057,
        -74.0027,
        "A rebuilt Seaport pier with a rooftop concert lawn looking straight at "
        "the Brooklyn Bridge and the East River.",
    ),
    "hudson-river-park": (
        40.7340,
        -74.0100,
        "Four miles of piers, lawns and bike path along the west side, running "
        "from the Battery up to 59th Street.",
    ),
    "east-river-esplanade": (
        40.7740,
        -73.9440,
        "A quiet waterfront walk on the Upper East Side, looking across to "
        "Roosevelt Island and the Queensboro Bridge.",
    ),
    "south-street-seaport": (
        40.7064,
        -74.0035,
        "Cobbled streets and nineteenth-century counting houses beside the "
        "East River, with historic ships tied up at the pier.",
    ),
    "conservatory-garden": (
        40.7940,
        -73.9520,
        "Central Park's only formal garden, six acres in Italian, French and "
        "English styles, entered through the Vanderbilt Gate.",
    ),
    "jefferson-market-garden": (
        40.7345,
        -74.0008,
        "A volunteer-run garden on the site of a former jail, beside the "
        "Victorian Gothic Jefferson Market Library.",
    ),
    "heather-garden": (
        40.8606,
        -73.9337,
        "Three acres of heath and perennial planting on a ridge in Fort Tryon "
        "Park, with the Hudson and the Palisades below.",
    ),
    "federal-hall": (
        40.7074,
        -74.0104,
        "Where Washington took the first presidential oath, marked by his "
        "statue on the steps opposite the Stock Exchange.",
    ),
    "hamilton-grange": (
        40.8199,
        -73.9465,
        "Alexander Hamilton's country house, moved twice and restored in St "
        "Nicholas Park with its original room plan.",
    ),
    "morris-jumel-mansion": (
        40.8347,
        -73.9377,
        "Manhattan's oldest surviving house, built 1765, used by Washington as "
        "a headquarters during the battle for New York.",
    ),
    "brooklyn-bridge": (
        40.7061,
        -73.9969,
        "The 1883 granite-and-steel crossing to Brooklyn, with a raised "
        "pedestrian promenade running down the centre of the span.",
    ),
    "manhattan-bridge": (
        40.7075,
        -73.9903,
        "The quieter East River crossing, with a walkway that gives the classic "
        "view back at the Brooklyn Bridge.",
    ),
    "madison-square-garden": (
        40.7505,
        -73.9934,
        "The arena above Penn Station, home to the Knicks and the Rangers and a "
        "constant concert schedule.",
    ),
    "chelsea-piers": (
        40.7466,
        -74.0086,
        "A sports complex built into four Hudson River piers, with golf, "
        "climbing, skating and batting cages.",
    ),
    "circle-line-sightseeing-cruises": (
        40.7625,
        -74.0002,
        "Sightseeing boats from Pier 83 that run the full loop around "
        "Manhattan, narrated, in about two and a half hours.",
    ),
    "roosevelt-island-tramway": (
        40.7614,
        -73.9639,
        "A commuter cable car over the East River that costs a subway fare and "
        "gives an unmatched midtown view.",
    ),
    # ----------------------------------------------------------------- Brooklyn
    "brooklyn-museum": (
        40.6712,
        -73.9636,
        "A vast collection strong in Egyptian art and American painting, with "
        "the Sackler Center's Dinner Party on permanent show.",
    ),
    "new-york-transit-museum": (
        40.6906,
        -73.9903,
        "Housed in a decommissioned 1936 subway station, with a platform of "
        "vintage cars you can walk through.",
    ),
    "brooklyn-children-s-museum": (
        40.6745,
        -73.9442,
        "The first museum built for children anywhere, opened 1899, with hands "
        "on exhibits across a green-roofed building.",
    ),
    "the-city-reliquary": (
        40.7113,
        -73.9539,
        "A tiny volunteer museum of New York ephemera: subway tokens, seltzer "
        "bottles, Statue of Liberty souvenirs.",
    ),
    "prospect-park": (
        40.6602,
        -73.9690,
        "Olmsted and Vaux's second park, with the Long Meadow, a ravine of "
        "old-growth forest and the city's only lake.",
    ),
    "brooklyn-bridge-park": (
        40.7003,
        -73.9967,
        "Eighty-five acres along the East River piers, with Jane's Carousel and "
        "the best skyline view in the city at dusk.",
    ),
    "mccarren-park": (
        40.7203,
        -73.9502,
        "The open green between Williamsburg and Greenpoint, with a running "
        "track, ball fields and a 1936 pool.",
    ),
    "fort-greene-park": (
        40.6915,
        -73.9740,
        "A hilltop park by Olmsted and Vaux, crowned by the Prison Ship "
        "Martyrs Monument and its granite stairs.",
    ),
    "sunset-park": (
        40.6455,
        -74.0050,
        "The park the neighborhood is named for, with a view across the harbour "
        "taking in both the skyline and the Statue of Liberty.",
    ),
    "marine-park": (
        40.5990,
        -73.9270,
        "Brooklyn's largest park, wrapped around a salt marsh with a boardwalk "
        "trail through the grasses and tidal creek.",
    ),
    "domino-park": (
        40.7144,
        -73.9679,
        "Built on the old Domino Sugar refinery site, keeping the syrup tanks "
        "and cranes as structure along the waterfront.",
    ),
    "bushwick-inlet-park": (
        40.7222,
        -73.9614,
        "A green waterfront strip on the Greenpoint side of the inlet, looking "
        "straight across at midtown Manhattan.",
    ),
    "brooklyn-botanic-garden": (
        40.6680,
        -73.9632,
        "Fifty-two acres including a Japanese hill-and-pond garden and the "
        "cherry esplanade that draws crowds each spring.",
    ),
    "narrows-botanical-gardens": (
        40.6218,
        -74.0356,
        "A volunteer-built garden along the Bay Ridge shore, with a native "
        "plant meadow and views of the Verrazzano.",
    ),
    "6-15-green-community-garden": (
        40.6680,
        -73.9840,
        "A small Park Slope community garden run by neighbours, open on "
        "weekends and planted for pollinators.",
    ),
    "green-wood-cemetery": (
        40.6579,
        -73.9940,
        "478 acres of Victorian funerary landscape on Brooklyn's highest hill, "
        "with monk parakeets nesting in the gatehouse.",
    ),
    "old-stone-house": (
        40.6714,
        -73.9840,
        "A reconstructed Dutch farmhouse marking the Battle of Brooklyn, now a "
        "small museum inside Washington Park.",
    ),
    "weeksville-heritage-center": (
        40.6767,
        -73.9218,
        "Four surviving houses of one of the first free Black communities in "
        "the country, preserved on their original lane.",
    ),
    "wyckoff-house-museum": (
        40.6446,
        -73.9204,
        "The oldest building in New York City, a Dutch saltbox dating to about "
        "1652, with a working kitchen garden.",
    ),
    "brooklyn-heights-promenade": (
        40.6961,
        -73.9967,
        "A cantilevered walkway over the BQE, giving an uninterrupted view of "
        "Lower Manhattan and the harbour.",
    ),
    "the-william-vale-rooftop": (
        40.7215,
        -73.9585,
        "A Williamsburg hotel roof twenty-two floors up, with a wraparound "
        "terrace facing the Manhattan skyline.",
    ),
    "time-out-market-rooftop": (
        40.7030,
        -73.9905,
        "The top floor of the DUMBO food hall, opening onto a terrace between "
        "the Brooklyn and Manhattan bridges.",
    ),
    "dumbo": (
        40.7033,
        -73.9881,
        "Cobbled streets under the bridge approaches, with the Washington "
        "Street view of the Empire State framed by the arches.",
    ),
    "williamsburg": (
        40.7081,
        -73.9571,
        "Warehouse blocks turned to music venues, vintage shops and waterfront "
        "bars, with the L train straight in from Manhattan.",
    ),
    "bushwick": (
        40.6944,
        -73.9213,
        "Industrial streets covered in commissioned murals around the Bushwick "
        "Collective, with galleries in the old lofts.",
    ),
    "red-hook": (
        40.6743,
        -74.0100,
        "A cut-off waterfront neighborhood of cobbles and warehouses, with "
        "harbour views and no subway of its own.",
    ),
    "park-slope": (
        40.6710,
        -73.9814,
        "Brownstone blocks on the slope below Prospect Park, with Fifth Avenue "
        "shopping and a strong food street on Seventh.",
    ),
    "coney-island": (
        40.5755,
        -73.9707,
        "The original seaside amusement district, with the Cyclone, the "
        "Wonder Wheel and Nathan's on Surf Avenue.",
    ),
    "smorgasburg": (
        40.7220,
        -73.9615,
        "An open-air food market of around a hundred vendors, running weekends "
        "from spring through autumn on the waterfront.",
    ),
    "brooklyn-flea": (
        40.7027,
        -73.9873,
        "Weekend stalls of antiques, vintage clothing and salvage, held under "
        "the Manhattan Bridge archway in DUMBO.",
    ),
    "dekalb-market-hall": (
        40.6903,
        -73.9832,
        "Forty vendors underground in Downtown Brooklyn, including an outpost "
        "of the original Katz's pastrami counter.",
    ),
    "industry-city": (
        40.6560,
        -74.0100,
        "Six million square feet of converted Sunset Park warehouses holding "
        "food halls, makers and design studios.",
    ),
    "brooklyn-academy-of-music": (
        40.6863,
        -73.9776,
        "America's oldest operating performing arts centre, programming opera, "
        "dance and the Next Wave festival.",
    ),
    "st-ann-s-warehouse": (
        40.7030,
        -73.9930,
        "Experimental theatre in a converted tobacco warehouse, with a walled "
        "garden open to the public beside it.",
    ),
    "kings-theatre": (
        40.6489,
        -73.9576,
        "A 1929 Loew's Wonder Theatre in Flatbush, restored to its full "
        "gilded interior and booking touring acts.",
    ),
    "barclays-center": (
        40.6826,
        -73.9754,
        "The weathered-steel arena at Atlantic Terminal, home to the Nets and a "
        "regular concert stop.",
    ),
    "pioneer-works": (
        40.6759,
        -74.0116,
        "A Red Hook ironworks turned arts and science centre, with a triple "
        "height main hall and a free garden.",
    ),
    "prospect-park-bandshell": (
        40.6620,
        -73.9790,
        "The outdoor stage that hosts the free BRIC Celebrate Brooklyn summer "
        "concert season inside Prospect Park.",
    ),
    "coney-island-boardwalk": (
        40.5723,
        -73.9793,
        "Two and a half miles of boardwalk along the Atlantic, running from "
        "Sea Gate past the aquarium to Brighton Beach.",
    ),
    "verrazzano-narrows-bridge": (
        40.6066,
        -74.0447,
        "The double-deck suspension span across the Narrows to Staten Island, "
        "and the starting line of the city marathon.",
    ),
    # ------------------------------------------------------------------- Queens
    "moma-ps1": (
        40.7455,
        -73.9475,
        "MoMA's contemporary wing in a former Long Island City schoolhouse, "
        "with the Warm Up music series in the courtyard.",
    ),
    "museum-of-the-moving-image": (
        40.7565,
        -73.9243,
        "Film, television and video game history on the Astoria studio lot, "
        "including a Jim Henson gallery.",
    ),
    "queens-museum": (
        40.7458,
        -73.8467,
        "Home to the Panorama of the City of New York, a 9,335 square foot "
        "scale model built for the 1964 World's Fair.",
    ),
    "new-york-hall-of-science": (
        40.7476,
        -73.8524,
        "A hands-on science museum in a 1964 World's Fair pavilion, with a "
        "large outdoor science playground.",
    ),
    "the-noguchi-museum": (
        40.7681,
        -73.9364,
        "Isamu Noguchi's own museum and sculpture garden, arranged across a "
        "converted photo-engraving plant.",
    ),
    "socrates-sculpture-park": (
        40.7699,
        -73.9366,
        "A former landfill turned open-air studio and exhibition space on the "
        "East River, free and open every day.",
    ),
    "flushing-meadows-corona-park": (
        40.7400,
        -73.8407,
        "The 1939 and 1964 World's Fair grounds, now the borough's largest "
        "park, holding the Unisphere and two museums.",
    ),
    "gantry-plaza-state-park": (
        40.7472,
        -73.9585,
        "Restored rail gantries on the Long Island City waterfront, with piers "
        "facing the midtown skyline across the river.",
    ),
    "astoria-park": (
        40.7787,
        -73.9235,
        "Sloping lawns between the Triborough and Hell Gate bridges, with the "
        "largest and oldest public pool in the city.",
    ),
    "forest-park": (
        40.7020,
        -73.8560,
        "538 acres over a glacial moraine, holding one of the last continuous "
        "oak forests left in Queens.",
    ),
    "queens-botanical-garden": (
        40.7513,
        -73.8280,
        "Thirty-nine acres built around a rose garden and a wedding garden, "
        "with a LEED-platinum visitor centre.",
    ),
    "jamaica-bay-wildlife-refuge": (
        40.6180,
        -73.8240,
        "A federal refuge inside the city limits, on the Atlantic flyway, where "
        "over three hundred bird species have been recorded.",
    ),
    "louis-armstrong-house-museum": (
        40.7546,
        -73.8615,
        "The Corona house Armstrong lived in from 1943 until his death, kept "
        "with its original interiors and tape archive.",
    ),
    "bowne-house": (
        40.7663,
        -73.8265,
        "A 1661 Quaker farmhouse tied to the Flushing Remonstrance, an early "
        "American argument for religious liberty.",
    ),
    "king-manor-museum": (
        40.7017,
        -73.7996,
        "The Jamaica home of Rufus King, a signer of the Constitution and an "
        "early campaigner against slavery.",
    ),
    "unisphere": (
        40.7458,
        -73.8451,
        "The twelve-storey stainless steel globe built as the theme symbol of "
        "the 1964 World's Fair, ringed by fountains.",
    ),
    "new-york-state-pavilion": (
        40.7440,
        -73.8446,
        "Philip Johnson's ruined World's Fair pavilion, its Tent of Tomorrow "
        "towers still standing over the park.",
    ),
    "astoria": (
        40.7644,
        -73.9235,
        "A long-standing Greek neighborhood now layered with Egyptian, "
        "Bangladeshi and Balkan food along Steinway Street.",
    ),
    "jackson-heights": (
        40.7557,
        -73.8831,
        "Garden apartment blocks and one of the most linguistically diverse "
        "square miles on earth, along Roosevelt Avenue.",
    ),
    "flushing-chinatown": (
        40.7590,
        -73.8300,
        "The largest Chinatown outside Manhattan, centred on Main Street, with "
        "regional food courts in the basements.",
    ),
    "rockaway-beach": (
        40.5834,
        -73.8154,
        "Seven miles of Atlantic surf beach reachable by subway, with the only "
        "legal surfing breaks in the city.",
    ),
    "hunter-s-point-south-park": (
        40.7418,
        -73.9613,
        "A resilient waterfront park of salt marsh and lawn, designed to flood, "
        "facing the United Nations across the river.",
    ),
    "queens-night-market": (
        40.7470,
        -73.8517,
        "A Saturday evening market behind the Hall of Science, with scores of "
        "vendors capped at low fixed prices.",
    ),
    "usta-billie-jean-king-national-tennis-center": (
        40.7500,
        -73.8458,
        "The largest public tennis facility in the world and the site of the US "
        "Open every summer.",
    ),
    "sculpturecenter": (
        40.7476,
        -73.9502,
        "A Maya Lin-renovated trolley repair shop in Long Island City, showing "
        "emerging sculptors in raw industrial rooms.",
    ),
    # -------------------------------------------------------------------- Bronx
    "bronx-museum-of-the-arts": (
        40.8306,
        -73.9200,
        "Contemporary art on the Grand Concourse with a focus on Bronx artists, "
        "free to enter every day it opens.",
    ),
    "wave-hill": (
        40.8976,
        -73.9145,
        "A public garden and estate above the Hudson, with a pergola looking "
        "across to the New Jersey Palisades.",
    ),
    "new-york-botanical-garden": (
        40.8623,
        -73.8770,
        "250 acres holding a Victorian glasshouse, a fifty-acre old-growth "
        "forest and the country's largest herbarium.",
    ),
    "bronx-zoo": (
        40.8506,
        -73.8770,
        "The largest metropolitan zoo in the country, with the Congo Gorilla "
        "Forest and a monorail through Wild Asia.",
    ),
    "van-cortlandt-park": (
        40.8976,
        -73.8860,
        "Over a thousand acres of forest, freshwater lake and the oldest public "
        "golf course in the United States.",
    ),
    "pelham-bay-park": (
        40.8671,
        -73.8060,
        "The city's largest park at three times the size of Central Park, with "
        "salt marsh, woodland and a public beach.",
    ),
    "bronx-documentary-center": (
        40.8180,
        -73.9200,
        "A nonprofit gallery in Melrose showing documentary photography and "
        "running free classes for local students.",
    ),
    "edgar-allan-poe-cottage": (
        40.8654,
        -73.8946,
        "The small wooden cottage where Poe spent his last years and wrote "
        "Annabel Lee, kept in Poe Park.",
    ),
    "bartow-pell-mansion-museum": (
        40.8724,
        -73.8047,
        "An 1842 Greek Revival country house in Pelham Bay Park, with a walled "
        "terrace garden running down to the sound.",
    ),
    "woodlawn-cemetery": (
        40.8890,
        -73.8730,
        "A National Historic Landmark burial ground where Duke Ellington, Miles "
        "Davis and Herman Melville are buried.",
    ),
    "yankee-stadium": (
        40.8296,
        -73.9262,
        "The 2009 stadium beside the original site, with Monument Park behind "
        "centre field honouring retired numbers.",
    ),
    "orchard-beach": (
        40.8676,
        -73.7920,
        "A mile-long crescent of sand built by Robert Moses in Pelham Bay Park, "
        "with a colonnaded bathhouse behind it.",
    ),
    "city-island": (
        40.8465,
        -73.7870,
        "A former shipbuilding village a mile and a half long, reached by one "
        "bridge and lined with seafood houses.",
    ),
    "arthur-avenue-retail-market": (
        40.8546,
        -73.8869,
        "An indoor market built in 1940 at the centre of the Belmont Italian "
        "quarter, with butchers, bakers and cheese stalls.",
    ),
    "the-high-bridge": (
        40.8420,
        -73.9297,
        "The oldest surviving bridge in the city, an 1848 aqueduct span "
        "reopened as a footpath over the Harlem River.",
    ),
    # ------------------------------------------------------------ Staten Island
    "staten-island-museum": (
        40.6432,
        -74.1015,
        "The borough's museum of art, natural history and archives, now housed "
        "in a restored building at Snug Harbor.",
    ),
    "national-lighthouse-museum": (
        40.6398,
        -74.0725,
        "On the site of the former Lighthouse Depot at St George, telling the "
        "story of American lighthouse keeping.",
    ),
    "snug-harbor-cultural-center": (
        40.6437,
        -74.1020,
        "Eighty-three acres of Greek Revival buildings and botanical gardens, "
        "including a walled Chinese scholar's garden.",
    ),
    "staten-island-greenbelt": (
        40.5860,
        -74.1370,
        "Two thousand eight hundred acres of connected woodland and wetland, "
        "with thirty-five miles of marked trail.",
    ),
    "conference-house-park": (
        40.4990,
        -74.2520,
        "The southernmost point of New York State, with a 1680 manor house "
        "where a failed 1776 peace conference was held.",
    ),
    "alice-austen-house": (
        40.6152,
        -74.0630,
        "The waterfront cottage of a pioneering woman photographer, looking "
        "across the Narrows to Brooklyn.",
    ),
    "fort-wadsworth": (
        40.6030,
        -74.0570,
        "One of the oldest military sites in the country, under the Verrazzano "
        "approach, with batteries open to walk through.",
    ),
    "st-george": (
        40.6437,
        -74.0765,
        "The ferry landing neighborhood, with a ballpark, a courthouse district "
        "and the best free harbour view in the city.",
    ),
    "south-beach": (
        40.5960,
        -74.0670,
        "Two and a half miles of Atlantic boardwalk named for FDR, facing "
        "Brooklyn across the Lower Bay.",
    ),
    "staten-island-ferry": (
        40.6437,
        -74.0724,
        "A free twenty-five minute crossing running around the clock, passing "
        "close by the Statue of Liberty each way.",
    ),
}
