"""Official ticket and booking pages, by place slug.

Only pages we are confident are the real booking route for that attraction.
Anything not listed here simply shows no ticket button, which is better than
sending someone to a guess.
"""

from __future__ import annotations

from typing import Final

TICKET_URLS: Final[dict[str, str]] = {
    "statue-of-liberty": "https://statueoflibertyguide.com/",
    "empire-state-building": "https://www.esbnyc.com/buy-tickets",
    "top-of-the-rock": "https://www.rockefellercenter.com/attractions/top-of-the-rock-observation-deck/",
    "one-world-observatory": "https://oneworldobservatory.com/",
    "edge": "https://www.edgenyc.com/",
    "summit-one-vanderbilt": "https://summitov.com/",
    "the-metropolitan-museum-of-art": "https://www.metmuseum.org/tickets",
    "museum-of-modern-art": "https://www.moma.org/tickets/",
    "american-museum-of-natural-history": "https://www.amnh.org/plan-your-visit/tickets",
    "solomon-r-guggenheim-museum": "https://www.guggenheim.org/plan-your-visit",
    "whitney-museum-of-american-art": "https://whitney.org/visit/tickets",
    "9-11-memorial-museum": "https://www.911memorial.org/visit/museum/tickets",
    "intrepid-museum": "https://intrepidmuseum.org/plan-your-visit",
    "tenement-museum": "https://www.tenement.org/tours/",
    "the-met-cloisters": "https://www.metmuseum.org/visit/plan-your-visit/met-cloisters",
    "bronx-zoo": "https://bronxzoo.com/tickets",
    "new-york-botanical-garden": "https://www.nybg.org/visit/tickets/",
    "brooklyn-botanic-garden": "https://www.bbg.org/visit/tickets",
    "brooklyn-museum": "https://www.brooklynmuseum.org/visit/tickets",
    "new-york-aquarium": "https://nyaquarium.com/tickets",
    "queens-museum": "https://queensmuseum.org/visit/",
    "moma-ps1": "https://www.momaps1.org/visit",
    "the-noguchi-museum": "https://www.noguchi.org/visit/",
    "vessel-hudson-yards": "https://www.hudsonyardsnewyork.com/discover/vessel",
    "circle-line-sightseeing-cruises": "https://www.circleline.com/",
    "governors-island": "https://www.govisland.org/visit",
    "the-frick-collection": "https://www.frick.org/visit",
    "morgan-library-and-museum": "https://www.themorgan.org/visit",
    "new-museum": "https://www.newmuseum.org/visit",
    "museum-of-the-city-of-new-york": "https://www.mcny.org/visit",
    "cooper-hewitt": "https://www.cooperhewitt.org/visit/",
    "rubin-museum": "https://rubinmuseum.org/visit",
    "museum-of-jewish-heritage": "https://mjhnyc.org/visit/",
    "museum-of-the-moving-image": "https://movingimage.org/visit/",
    "new-york-hall-of-science": "https://nysci.org/visit/",
    "brooklyn-children-s-museum": "https://www.brooklynkids.org/plan-your-visit/",
    "new-york-transit-museum": "https://www.nytransitmuseum.org/visit/",
    "staten-island-zoo": "https://statenislandzoo.org/visit/",
    "historic-richmond-town": "https://www.historicrichmondtown.org/visit",
    "snug-harbor-cultural-center": "https://snug-harbor.org/visit/",
    "wave-hill": "https://www.wavehill.org/visit/",
    "green-wood-cemetery": "https://www.green-wood.com/events/",
    "park-avenue-armory": "https://www.armoryonpark.org/",
    "luna-park": "https://lunaparknyc.com/tickets/",
}
