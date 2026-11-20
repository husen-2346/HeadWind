# Project Assumptions

Proposed, to be confirmed in Phase 1:

1. **Half-open threshold intervals [low, high)**:
   - Wind (mph): Low [0, 25), Moderate [25, 35), High [35, 45), Severe [45, 55), No Travel [55, ∞).
   - Rain (in/hr): Low [0, 0.10), Moderate [0.10, 0.25), High [0.25, 0.50), Severe [0.50, 1.00), No Travel [1.00, ∞).
   - Snow (in/hr): Low [0, 0.5), Moderate [0.5, 1.0), High [1.0, 2.0), Severe [2.0, 3.0), No Travel [3.0, ∞).
2. **Checkpoint risk level**:
   - Checkpoint risk level = worst of wind, rain, snow risks at that checkpoint after applying load rules.
3. **Load rules apply to wind only**:
   - >=55 mph: No Travel for any load.
   - 45-54 mph and load >30,000 lb: No Travel (otherwise Severe).
   - 35-44 mph and load >40,000 lb: Severe (otherwise High).
4. **Segment mileage ownership**:
   - Each checkpoint owns the miles of the segment it represents (e.g. 10, 25, or 50 mile interval along the polyline).
5. **No Travel exclusion & ranking**:
   - Any route containing No Travel ranks below every route without it.
   - Routes without No Travel are ordered using the 4 preferences in order:
     1) fewest Severe miles
     2) fewest High miles
     3) lowest average risk score
     4) shortest travel time
6. **Strict lexicographic ranking**:
   - Transparent ranking function returning human-readable reasons explaining why the winning route was chosen over alternatives.
7. **Sustained wind vs gusts (undecided)**:
   - Primary metric currently planned is sustained wind speed (10m), with gusts to be evaluated as a secondary advisory factor or combined metric during Phase 1 investigation.
8. **Departure time interpretation**:
   - Departure date/time is interpreted in the origin location's local time zone, converted to UTC for forecast querying, and checkpoints track local arrival time.
9. **Routing is not truck-restricted**:
   - Mapbox Directions API does not have a dedicated commercial truck profile (uses standard driving profile). Routes do not account for bridge weight ratings, low clearances, or hazmat restrictions. This is documented as a known platform limitation.
