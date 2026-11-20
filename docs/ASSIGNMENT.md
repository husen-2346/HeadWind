Take-home for Spotter, role Full Stack Developer: "Weather-Aware Truck
Routing". Build a React + Django web app that helps a truck driver choose
the safest route based on weather, load weight and travel time.
User enters: origin and destination, departure date/time, load weight.
App must: generate 3 route options via a routing API; sample weather every
10 / 25 / 50 miles using the truck's ESTIMATED ARRIVAL TIME at each
checkpoint; compute weather risk with the rules below; recommend the best
route balancing weather risk and travel time; show all routes, checkpoints,
risk levels, ETAs and route summaries on a map; show a weather heatmap
along the trip corridor with a 0-48 hour forecast slider. Third-party APIs
are allowed for routing, geocoding and weather.
Risk thresholds (Low / Moderate / High / Severe / No Travel):
 Wind (mph): <25 | 25-34 | 35-44 | 45-54 | >=55
 Rain (in/hr): <0.10 | 0.10-0.25 | 0.25-0.50 | 0.50-1.00 | >1.00
 Snow (in/hr): <0.5 | 0.5-1.0 | 1.0-2.0 | 2.0-3.0 | >3.0
Load rules: >=55 mph is No Travel for any load; 45-54 mph and load
>30,000 lb is No Travel; 35-44 mph and load >40,000 lb is Severe.
Recommendation preference order: 1) fewest Severe miles, 2) fewest High
miles, 3) lowest average risk, 4) shortest travel time.
Deliverables: GitHub repo, hosted app, 5-10 min Loom.
Grading: 40% routes/weather/risk/recommendation logic, 40% UI/map/heatmap
smoothness and performance, 15% code quality, 5% docs and walkthrough.
"Prioritize correctness and clarity over extra features."
Hard limit: 16 work hours. Keep scope tight.
