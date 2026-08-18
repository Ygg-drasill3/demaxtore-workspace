"""Static reference data for the mock AIS provider.

Contains realistic port coordinates, shipping lanes (polylines that avoid
land), vessel type templates, country flags, and naming banks.
"""

# ---------------------------------------------------------------------------
# Ports  (UN/LOCODE, name, country, flag, lat, lng, timezone)
# ---------------------------------------------------------------------------
PORTS = [
    ("CNSHA", "Shanghai", "China", "CN", 31.23, 121.47, "Asia/Shanghai"),
    ("SGSIN", "Singapore", "Singapore", "SG", 1.29, 103.85, "Asia/Singapore"),
    ("NLRTM", "Rotterdam", "Netherlands", "NL", 51.92, 4.48, "Europe/Amsterdam"),
    ("CNNGB", "Ningbo-Zhoushan", "China", "CN", 29.87, 121.55, "Asia/Shanghai"),
    ("CNSZX", "Shenzhen", "China", "CN", 22.55, 114.10, "Asia/Shanghai"),
    ("KRPUS", "Busan", "South Korea", "KR", 35.10, 129.04, "Asia/Seoul"),
    ("CNTAO", "Qingdao", "China", "CN", 36.07, 120.38, "Asia/Shanghai"),
    ("HKHKG", "Hong Kong", "Hong Kong", "HK", 22.30, 114.17, "Asia/Hong_Kong"),
    ("USLAX", "Los Angeles", "United States", "US", 33.74, -118.27, "America/Los_Angeles"),
    ("USLGB", "Long Beach", "United States", "US", 33.75, -118.19, "America/Los_Angeles"),
    ("MYTPP", "Tanjung Pelepas", "Malaysia", "MY", 1.36, 103.55, "Asia/Kuala_Lumpur"),
    ("DEHAM", "Hamburg", "Germany", "DE", 53.54, 9.98, "Europe/Berlin"),
    ("BEANR", "Antwerp", "Belgium", "BE", 51.26, 4.32, "Europe/Brussels"),
    ("TWKHH", "Kaohsiung", "Taiwan", "TW", 22.61, 120.28, "Asia/Taipei"),
    ("CNXMN", "Xiamen", "China", "CN", 24.48, 118.08, "Asia/Shanghai"),
    ("CNDLC", "Dalian", "China", "CN", 38.92, 121.63, "Asia/Shanghai"),
    ("IDJKT", "Tanjung Priok", "Indonesia", "ID", -6.11, 106.88, "Asia/Jakarta"),
    ("THLCH", "Laem Chabang", "Thailand", "TH", 13.08, 100.88, "Asia/Bangkok"),
    ("USNYC", "New York", "United States", "US", 40.68, -74.05, "America/New_York"),
    ("LKCMB", "Colombo", "Sri Lanka", "LK", 6.95, 79.85, "Asia/Colombo"),
    ("GRPIR", "Piraeus", "Greece", "GR", 37.94, 23.65, "Europe/Athens"),
    ("ESVLC", "Valencia", "Spain", "ES", 39.44, -0.32, "Europe/Madrid"),
    ("AEJEA", "Jebel Ali", "UAE", "AE", 25.02, 55.06, "Asia/Dubai"),
    ("ESALG", "Algeciras", "Spain", "ES", 36.13, -5.44, "Europe/Madrid"),
    ("PAMIT", "Manzanillo (Panama)", "Panama", "PA", 9.36, -79.80, "America/Panama"),
    ("JPYOK", "Yokohama", "Japan", "JP", 35.44, 139.65, "Asia/Tokyo"),
    ("GBFXT", "Felixstowe", "United Kingdom", "GB", 51.95, 1.31, "Europe/London"),
    ("FRLEH", "Le Havre", "France", "FR", 49.49, 0.11, "Europe/Paris"),
    ("ESBCN", "Barcelona", "Spain", "ES", 41.35, 2.16, "Europe/Madrid"),
    ("ITGOA", "Genoa", "Italy", "IT", 44.40, 8.92, "Europe/Rome"),
    ("BRSSZ", "Santos", "Brazil", "BR", -23.98, -46.30, "America/Sao_Paulo"),
    ("ZADUR", "Durban", "South Africa", "ZA", -29.87, 31.03, "Africa/Johannesburg"),
    ("PACRI", "Colón", "Panama", "PA", 9.36, -79.90, "America/Panama"),
    ("EGSUZ", "Suez", "Egypt", "EG", 29.97, 32.55, "Africa/Cairo"),
    ("EGPSD", "Port Said", "Egypt", "EG", 31.26, 32.30, "Africa/Cairo"),
    ("GIGIB", "Gibraltar", "Gibraltar", "GI", 36.14, -5.35, "Europe/Gibraltar"),
    ("ZACPT", "Cape Town", "South Africa", "ZA", -33.90, 18.42, "Africa/Johannesburg"),
    ("USHOU", "Houston", "United States", "US", 29.72, -95.02, "America/Chicago"),
    ("USSAV", "Savannah", "United States", "US", 32.08, -81.10, "America/New_York"),
    ("AUSYD", "Sydney", "Australia", "AU", -33.85, 151.22, "Australia/Sydney"),
    ("AUMEL", "Melbourne", "Australia", "AU", -37.83, 144.92, "Australia/Melbourne"),
    ("JPTYO", "Tokyo", "Japan", "JP", 35.62, 139.77, "Asia/Tokyo"),
    ("JPOSA", "Osaka", "Japan", "JP", 34.65, 135.43, "Asia/Tokyo"),
    ("RUVVO", "Vladivostok", "Russia", "RU", 43.10, 131.87, "Asia/Vladivostok"),
    ("INBOM", "Mumbai", "India", "IN", 18.95, 72.83, "Asia/Kolkata"),
    ("INNSA", "Nhava Sheva", "India", "IN", 18.95, 72.95, "Asia/Kolkata"),
    ("EGDAM", "Damietta", "Egypt", "EG", 31.47, 31.79, "Africa/Cairo"),
    ("SAJED", "Jeddah", "Saudi Arabia", "SA", 21.48, 39.19, "Asia/Riyadh"),
    ("OMSLL", "Salalah", "Oman", "OM", 16.94, 54.00, "Asia/Muscat"),
    ("VNSGN", "Ho Chi Minh City", "Vietnam", "VN", 10.77, 106.70, "Asia/Ho_Chi_Minh"),
    ("PHMNL", "Manila", "Philippines", "PH", 14.60, 120.97, "Asia/Manila"),
    ("EGALY", "Alexandria", "Egypt", "EG", 31.19, 29.90, "Africa/Cairo"),
    ("ITTRI", "Trieste", "Italy", "IT", 45.65, 13.75, "Europe/Rome"),
    ("SEGOT", "Gothenburg", "Sweden", "SE", 57.68, 11.83, "Europe/Stockholm"),
    ("PLGDN", "Gdańsk", "Poland", "PL", 54.40, 18.68, "Europe/Warsaw"),
    ("FIHEL", "Helsinki", "Finland", "FI", 60.15, 24.95, "Europe/Helsinki"),
    ("NOOSL", "Oslo", "Norway", "NO", 59.90, 10.72, "Europe/Oslo"),
    ("CATOR", "Toronto (Lake)", "Canada", "CA", 43.63, -79.37, "America/Toronto"),
    ("USMIA", "Miami", "United States", "US", 25.77, -80.13, "America/New_York"),
    ("BRRIO", "Rio de Janeiro", "Brazil", "BR", -22.90, -43.20, "America/Sao_Paulo"),
]

# ---------------------------------------------------------------------------
# Shipping lanes  (waypoints designed to stay on water)
# Each lane is a list of (lat, lng) tuples.  Vessels are spawned along these
# corridors and interpolated between waypoints, so they never appear on land.
# ---------------------------------------------------------------------------
SHIPPING_LANES = [
    # Trans-Pacific: Shanghai <-> Los Angeles (great-circle-ish north)
    [(31.23, 121.47), (34.0, 130.0), (38.0, 145.0), (43.0, 165.0), (46.0, -175.0),
     (44.0, -155.0), (40.0, -140.0), (36.0, -125.0), (33.74, -118.27)],
    # Trans-Pacific: Yokohama <-> Long Beach
    [(35.44, 139.65), (38.0, 155.0), (42.0, 175.0), (44.0, -170.0), (42.0, -150.0),
     (38.0, -135.0), (34.0, -122.0), (33.75, -118.19)],
    # Malacca -> South China Sea -> Shanghai
    [(1.29, 103.85), (3.0, 105.5), (10.0, 110.0), (16.0, 114.0), (22.30, 114.17),
     (25.0, 120.0), (29.87, 121.55), (31.23, 121.47)],
    # Singapore -> Colombo -> Suez
    [(1.29, 103.85), (5.0, 96.0), (6.95, 79.85), (10.0, 70.0), (12.0, 60.0),
     (12.5, 50.0), (13.5, 43.5), (20.0, 38.5), (27.0, 34.5), (29.97, 32.55)],
    # Suez -> Med -> Gibraltar -> Rotterdam
    [(29.97, 32.55), (31.26, 32.30), (34.0, 27.0), (37.0, 20.0), (37.94, 23.65),
     (38.0, 12.0), (36.13, -5.44), (36.14, -5.35), (43.0, -10.0), (48.0, -6.0),
     (50.0, 1.5), (51.92, 4.48)],
    # Rotterdam <-> New York (North Atlantic)
    [(51.92, 4.48), (50.0, 0.0), (49.0, -10.0), (46.0, -25.0), (42.0, -45.0),
     (40.0, -60.0), (40.68, -74.05)],
    # Hamburg <-> Savannah
    [(53.54, 9.98), (52.0, 3.0), (49.0, -8.0), (44.0, -25.0), (38.0, -45.0),
     (34.0, -65.0), (32.08, -81.10)],
    # Panama Canal: LA -> Panama -> New York
    [(33.74, -118.27), (25.0, -112.0), (15.0, -100.0), (9.36, -79.90),
     (9.36, -79.80), (15.0, -75.0), (25.0, -75.0), (35.0, -74.0), (40.68, -74.05)],
    # Around Cape of Good Hope: Rotterdam -> Singapore
    [(51.92, 4.48), (43.0, -10.0), (30.0, -18.0), (10.0, -18.0), (-5.0, -5.0),
     (-25.0, 8.0), (-33.90, 18.42), (-29.87, 31.03), (-15.0, 55.0), (0.0, 75.0),
     (1.29, 103.85)],
    # Persian Gulf: Jebel Ali -> Singapore
    [(25.02, 55.06), (24.0, 58.0), (16.94, 54.00), (12.5, 50.0), (10.0, 60.0),
     (8.0, 75.0), (6.95, 79.85), (5.0, 96.0), (1.29, 103.85)],
    # Baltic: Gdańsk -> Rotterdam
    [(54.40, 18.68), (55.0, 15.0), (55.5, 12.5), (56.5, 10.5), (57.5, 8.0),
     (56.0, 4.0), (54.0, 3.0), (52.0, 3.0), (51.92, 4.48)],
    # North Sea loop: Felixstowe -> Hamburg -> Rotterdam
    [(51.95, 1.31), (52.5, 3.0), (53.54, 9.98), (53.5, 6.0), (51.92, 4.48), (51.26, 4.32)],
    # Med: Piraeus -> Barcelona -> Algeciras
    [(37.94, 23.65), (37.0, 18.0), (38.0, 12.0), (39.44, -0.32), (41.35, 2.16),
     (37.5, -1.0), (36.13, -5.44)],
    # East Asia: Busan -> Shanghai -> Hong Kong
    [(35.10, 129.04), (33.0, 126.0), (31.23, 121.47), (28.0, 122.0), (24.48, 118.08),
     (22.30, 114.17)],
    # Australia: Melbourne -> Sydney -> Singapore
    [(-37.83, 144.92), (-33.85, 151.22), (-25.0, 155.0), (-10.0, 145.0),
     (0.0, 130.0), (1.29, 103.85)],
    # Brazil coast: Rio -> Santos -> Cape Town
    [(-22.90, -43.20), (-23.98, -46.30), (-30.0, -40.0), (-33.0, -20.0),
     (-33.0, 0.0), (-33.90, 18.42)],
    # Red Sea: Jeddah -> Suez
    [(21.48, 39.19), (25.0, 36.5), (27.0, 34.5), (29.97, 32.55)],
    # US Gulf: Houston -> Miami -> New York
    [(29.72, -95.02), (26.0, -84.0), (25.77, -80.13), (32.08, -81.10), (36.0, -75.0), (40.68, -74.05)],
    # India: Mumbai -> Colombo -> Singapore
    [(18.95, 72.83), (12.0, 74.0), (6.95, 79.85), (5.0, 90.0), (3.0, 100.0), (1.29, 103.85)],
    # Vietnam / Philippines: Ho Chi Minh -> Manila -> Kaohsiung
    [(10.77, 106.70), (13.0, 112.0), (14.60, 120.97), (18.0, 120.0), (22.61, 120.28)],
    # Japan coast: Osaka -> Yokohama -> Tokyo
    [(34.65, 135.43), (34.5, 138.0), (35.44, 139.65), (35.62, 139.77)],
    # Trans-Pacific south: Sydney -> Los Angeles
    [(-33.85, 151.22), (-20.0, 170.0), (-5.0, -170.0), (10.0, -155.0),
     (25.0, -140.0), (33.74, -118.27)],
    # Suez -> Salalah -> Colombo
    [(29.97, 32.55), (20.0, 38.5), (16.94, 54.00), (10.0, 65.0), (6.95, 79.85)],
    # Arctic-lite: Oslo -> Rotterdam
    [(59.90, 10.72), (58.0, 8.0), (55.0, 6.0), (52.5, 3.5), (51.92, 4.48)],
    # Med east: Alexandria -> Piraeus -> Trieste
    [(31.19, 29.90), (34.0, 27.0), (37.94, 23.65), (40.0, 18.0), (45.65, 13.75)],
    # Africa west: Cape Town -> Lagos-ish -> Gibraltar
    [(-33.90, 18.42), (-15.0, 5.0), (0.0, -2.0), (15.0, -18.0), (30.0, -18.0), (36.13, -5.44)],
    # Vladivostok -> Busan -> Shanghai
    [(43.10, 131.87), (40.0, 132.0), (35.10, 129.04), (33.0, 126.0), (31.23, 121.47)],
    # Panama -> Santos
    [(9.36, -79.90), (10.0, -70.0), (5.0, -55.0), (-5.0, -40.0), (-15.0, -37.0), (-23.98, -46.30)],
    # Gulf of Mexico loop
    [(29.72, -95.02), (25.0, -90.0), (22.0, -87.0), (20.0, -80.0), (25.77, -80.13)],
    # Baltic east: Helsinki -> Gdańsk
    [(60.15, 24.95), (59.0, 22.0), (57.0, 20.0), (54.40, 18.68)],
]

# ---------------------------------------------------------------------------
# Vessel types  (name, code, color, avg_length_range, avg_speed_range)
# ---------------------------------------------------------------------------
VESSEL_TYPES = [
    {"code": "container", "label": "Container Ship", "color": "#22c55e",
     "length": (200, 400), "speed": (16, 24), "weight": 22},
    {"code": "bulk", "label": "Bulk Carrier", "color": "#84cc16",
     "length": (180, 300), "speed": (11, 15), "weight": 16},
    {"code": "tanker_oil", "label": "Oil Tanker", "color": "#ef4444",
     "length": (240, 380), "speed": (12, 16), "weight": 14},
    {"code": "tanker_chem", "label": "Chemical Tanker", "color": "#f43f5e",
     "length": (140, 220), "speed": (12, 15), "weight": 10},
    {"code": "lng", "label": "LNG Carrier", "color": "#f59e0b",
     "length": (280, 345), "speed": (17, 21), "weight": 5},
    {"code": "passenger", "label": "Passenger", "color": "#06b6d4",
     "length": (200, 360), "speed": (18, 24), "weight": 7},
    {"code": "roro", "label": "RoRo", "color": "#8b5cf6",
     "length": (150, 260), "speed": (16, 22), "weight": 6},
    {"code": "fishing", "label": "Fishing", "color": "#f97316",
     "length": (30, 100), "speed": (6, 12), "weight": 10},
    {"code": "military", "label": "Military", "color": "#64748b",
     "length": (80, 250), "speed": (14, 28), "weight": 3},
    {"code": "pleasure", "label": "Pleasure Craft", "color": "#ec4899",
     "length": (12, 60), "speed": (8, 18), "weight": 7},
]

NAV_STATUS = [
    "Underway Using Engine", "At Anchor", "Moored", "Not Under Command",
    "Restricted Maneuverability", "Constrained by Draft", "Underway Sailing",
]

# Vessel name banks
VESSEL_PREFIXES = [
    "MSC", "OOCL", "COSCO", "EVER", "MAERSK", "CMA CGM", "HAPAG", "ONE",
    "YANG MING", "PIL", "ZIM", "WAN HAI", "HMM", "STAR", "NORDIC",
    "PACIFIC", "ATLANTIC", "OCEAN", "NORTHERN", "SOUTHERN", "GULF",
    "ARCTIC", "IMPERIAL", "ROYAL", "GLOBAL", "MARINE", "NAVIGATOR",
]
VESSEL_NAMES = [
    "APEX", "AURORA", "HORIZON", "VIKING", "PIONEER", "PHOENIX", "ATLAS",
    "TITAN", "ODYSSEY", "MERIDIAN", "PROSPERITY", "VOYAGER", "ENDEAVOR",
    "SENTINEL", "GLORY", "SPIRIT", "MAJESTY", "ENDURANCE", "LEGACY",
    "TRIUMPH", "CENTURY", "MARINER", "MERCURY", "NEPTUNE", "POSEIDON",
    "TRIDENT", "CORAL", "PEARL", "OPAL", "AMETHYST", "SAPPHIRE", "RUBY",
    "EMERALD", "DIAMOND", "STARLIGHT", "MOONLIGHT", "SUNRISE", "TWILIGHT",
    "SERENITY", "HARMONY", "ZEPHYR", "TEMPEST", "MISTRAL", "MONSOON",
]

# Companies
COMPANIES = [
    ("MSC Mediterranean Shipping", "CH", 1970, 780),
    ("Maersk Line", "DK", 1904, 720),
    ("CMA CGM Group", "FR", 1978, 620),
    ("COSCO Shipping Lines", "CN", 1961, 480),
    ("Hapag-Lloyd", "DE", 1970, 265),
    ("ONE Ocean Network Express", "JP", 2017, 220),
    ("Evergreen Marine", "TW", 1968, 210),
    ("HMM Co.", "KR", 1976, 82),
    ("Yang Ming Marine Transport", "TW", 1972, 95),
    ("ZIM Integrated Shipping", "IL", 1945, 148),
    ("PIL Pacific International", "SG", 1967, 100),
    ("Wan Hai Lines", "TW", 1965, 145),
    ("SITC International", "HK", 1991, 96),
    ("X-Press Feeders", "SG", 1972, 100),
    ("KMTC Line", "KR", 1954, 65),
    ("TS Lines", "TW", 2001, 40),
]
