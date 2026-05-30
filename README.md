# Real-Time Traffic & Public Transport Optimization Dashboard

A beginner-friendly DevOps project using React, Node.js, MongoDB, Docker, Docker Compose, and GitHub Actions.

## Project Structure

```text
traffic-dashboard/
├── frontend/
├── backend/
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Features

- Traffic conditions by route
- Public transport arrival timings
- Best-route suggestion based on congestion
- Auto-refresh every 5 seconds
- Simple responsive dashboard UI

## Tech Stack

- Frontend: React + Vite + Axios
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- DevOps: Docker, Docker Compose, GitHub Actions

## API Endpoints

- `GET /traffic`
- `GET /transport`
- `GET /best-route`
- `GET /health`

## Sample API Responses

### `GET /traffic`

```json
{
  "success": true,
  "data": [
    { "routeName": "Route A", "congestionLevel": "High" },
    { "routeName": "Route B", "congestionLevel": "Medium" },
    { "routeName": "Route C", "congestionLevel": "Low" }
  ]
}
```

### `GET /transport`

```json
{
  "success": true,
  "data": [
    { "lineName": "Bus 101", "nextArrivalMinutes": 6 },
    { "lineName": "Metro Blue", "nextArrivalMinutes": 3 },
    { "lineName": "Bus 202", "nextArrivalMinutes": 9 }
  ]
}
```

### `GET /best-route`

```json
{
  "success": true,
  "data": {
    "suggestedRoute": "Route C",
    "reason": "Route A has high congestion. Use Route C instead."
  }
}
```

## Local Setup Without Docker

1. Start MongoDB locally on `mongodb://localhost:27017`
2. Start backend:
   - `cd backend`
   - `npm install`
   - `npm run dev`
3. Start frontend in a new terminal:
   - `cd frontend`
   - `npm install`
   - `npm run dev`
4. Open `http://localhost:5173`

## Docker Setup

From project root:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`
- MongoDB: `mongodb://localhost:27017`

To stop:

```bash
docker compose down
```

## CI/CD (GitHub Actions)

Workflow file: `.github/workflows/ci.yml`

On push to `main`, it:

1. Installs frontend dependencies
2. Builds frontend
3. Installs backend dependencies
4. Checks backend source syntax
5. Builds frontend Docker image
6. Builds backend Docker image

This keeps the project simple and ideal for a college DevOps viva demonstration.
