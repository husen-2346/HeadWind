# Headwind - Weather-Aware Truck Routing

Headwind is a weather-aware truck routing web application that helps truck drivers evaluate multiple route options between an origin and destination to select the safest journey based on forecasted weather, load weight, and travel time.

## Tech Stack
- **Frontend**: Vite 6, React 18, TypeScript 5.6, Tailwind CSS 3.4, React Router v6, TanStack Query v5, Mapbox GL JS v3, Geist Sans & Geist Mono
- **Backend**: Python 3.13, Django 5.1, Django REST Framework 3.15, django-cors-headers, httpx, python-dotenv, pytest, gunicorn, whitenoise
- **APIs**: Mapbox Directions & Geocoding, Open-Meteo Weather Forecast API

## Quickstart

### Prerequisites
- Node.js 20+ and npm
- Python 3.13 (see `backend/.python-version`)
- Mapbox Access Token (public token for frontend and backend)

### Backend Setup
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your MAPBOX_TOKEN and secret key

pytest
python manage.py runserver 8000
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your VITE_MAPBOX_TOKEN

npm run lint
npm run build
npm run dev
```

## Environment Variables

### Backend (`backend/.env`)
- `SECRET_KEY`: Django cryptographic signing key
- `DEBUG`: Set to `True` for local development, `False` for production
- `ALLOWED_HOSTS`: Comma-separated list of allowed hostnames
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed frontend origins (e.g., `http://localhost:5173`)
- `MAPBOX_TOKEN`: Mapbox API token for routing requests

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL`: Base URL for the Django API (e.g., `http://localhost:8000`)
- `VITE_MAPBOX_TOKEN`: Mapbox public token for web map rendering

## Architecture
*(To be detailed in subsequent phases)*

## Key Assumptions & Limitations
- **Truck Dimensions / Restrictions**: Mapbox Directions API uses standard driving profiles and does not account for bridge weight ratings, low clearances, or hazmat routes.
- **Risk Evaluation**: Checkpoint weather risk is sampled along route segments and weighted against load rules. See `docs/ASSUMPTIONS.md` for complete logic specifications.

## Deployment
*(To be completed in Phase 8)*
