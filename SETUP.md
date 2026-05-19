# VROOM Docker Setup

This guide explains how to set up and run VROOM with Docker, including the frontend demo.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB of RAM available
- Ports 3000 (VROOM API), 5000 (OSRM routing), and 8080 (Frontend) available

### Basic Setup

1. **Clone the repositories** (if you haven't already)
   ```bash
   # Clone main VROOM backend
   git clone https://github.com/VROOM-Project/vroom-docker.git
   cd vroom-docker

   # Clone frontend in parent directory
   cd ..
   git clone https://github.com/VROOM-Project/vroom-frontend.git
   cd vroom-docker
   ```

2. **Add a map file to the `data/` directory**
   - Download a pre-processed map from https://download.geofabrik.de/
   - Process your own OSM data (see data/README.md)
   - The main file should be named `map.osrm`

3. **Start the services**
   ```bash
   # Start backend (VROOM + OSRM)
   docker-compose up --build vroom osrm

   # Or start everything including frontend
   docker-compose --profile frontend up --build
   ```

4. **Check the services are running**
   ```bash
   # Check VROOM health
   curl http://localhost:3000/health

   # Check OSRM health
   curl http://localhost:5000/health

   # Access frontend
   open http://localhost:8080
   ```

## Configuration

### Environment Variables

- `VROOM_ROUTER`: Routing backend (default: osrm)
- `VROOM_LOG`: Log directory (default: /conf)
- `VROOM_DOCKER`: Backend type (default: osrm)

### Config File

The `conf/config.yml` file contains all VROOM configuration options. Edit this to:
- Change the port (default: 3000)
- Adjust routing server settings
- Modify thread count and other performance settings

## Development Workflow

### Building the VROOM image
```bash
docker-compose build

# Build frontend only
docker-compose build frontend
```

### Running in development mode
```bash
# Remove existing containers
docker-compose down

# Start with rebuild
docker-compose up --build --force-recreate

# Or with frontend
docker-compose --profile frontend up --build --force-recreate
```

### Viewing logs
```bash
# View all logs
docker-compose logs -f

# View only VROOM logs
docker-compose logs -f vroom

# View only OSRM logs
docker-compose logs -f osrm

# View only frontend logs
docker-compose --profile frontend logs -f frontend
```

### Stopping services
```bash
# Graceful stop
docker-compose down

# Stop with frontend
docker-compose --profile frontend down

# Force stop and remove containers
docker-compose down -v
```

### Running individual services
```bash
# Only backend (VROOM + OSRM)
docker-compose up --build vroom osrm

# Only frontend (requires backend running)
docker-compose --profile frontend up frontend

# Only OSRM (for testing)
docker-compose --profile osrm up osrm
```

## Testing the API

Once running, you can test VROOM API:

```bash
# Basic health check
curl http://localhost:3000/health

# Example routing request
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{
    "vehicles": [
      {
        "id": "vehicle_1",
        "profile": "driving-car",
        "start": [13.388860, 52.530991],
        "end": [13.397634, 52.529027]
      }
    ],
    "jobs": [
      {
        "id": "job_1",
        "location": [13.419585, 52.516987]
      }
    ]
  }'
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change ports in docker-compose.yml
   - Or stop conflicting services:
     ```bash
     docker ps | grep -E "3000|5000|8080"
     ```

2. **Map file missing**
   - Ensure data/map.osrm exists
   - Check file permissions

3. **Memory issues**
   - Increase Docker memory limit in Docker Desktop settings
   - Reduce thread count in config.yml

4. **Frontend issues**
   - Check if VROOM backend is running on port 3000
   - Verify VROOM_BACKEND_URL environment variable
   - Check browser console for errors

5. **Build errors**
   - Clear Docker cache: `docker system prune -a`
   - Rebuild: `docker-compose build --no-cache`
   - For frontend-specific errors: `docker-compose build --no-cache frontend`

### Useful Commands

```bash
# Check running containers
docker ps

# View container resource usage
docker stats

# Clean up unused Docker resources
docker system prune

# Remove all VROOM containers and volumes
docker-compose down -v
```

## Production Deployment

For production, consider:
- Using a reverse proxy (Nginx)
- Setting up proper logging and monitoring
- Implementing authentication
- Using secure network configurations
- Setting resource limits
- Using Docker Swarm or Kubernetes

## Additional Routing Backends

The configuration supports multiple routing backends:
- OSRM (default)
- OpenRouteService (ORS)
- Valhalla

To use ORS instead of OSRM:
1. Install an ORS instance
2. Update `conf/config.yml` with ORS server details
3. Change `VROOM_ROUTER=ors`