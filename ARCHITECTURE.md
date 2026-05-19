# VROOM Docker System Architecture

## Overview

This project provides a Docker containerized deployment of VROOM (Vehicle Routing Problem Optimization), consisting of:
- **vroom**: Core optimization engine (C++)
- **vroom-express**: Node.js REST API wrapper
- **OSRM**: Routing engine for distance/duration calculations

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Docker Network                                  │
│                                                                              │
│  ┌─────────────────────┐         ┌─────────────────────────────────────┐   │
│  │    vroom-express     │         │              osrm                   │   │
│  │   (Node.js :3000)    │────────▶│        (OSRM :5000)                 │   │
│  │                      │  HTTP   │                                     │   │
│  │  - REST API          │  Calls  │  - Distance Matrix                 │   │
│  │  - Input Validation  │         │  - Route Geometry                  │   │
│  │  - Response Format   │◀────────│  - Travel Times                    │   │
│  └─────────────────────┘         └─────────────────────────────────────┘   │
│           │                                                                           │
│           │ VROOM Algorithm                                                                 │
│           ▼                                                                           │
│  ┌─────────────────────┐                                                            │
│  │       vroom         │                                                             │
│  │  (Compiled C++     │                                                             │
│  │   Binary)          │                                                             │
│  │                     │                                                             │
│  │  - Job Assignment  │                                                             │
│  │  - Route Planning  │                                                             │
│  │  - Optimization    │                                                             │
│  └─────────────────────┘                                                            │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Host Machine   │
                    │                 │
                    │  ./conf/       │
                    │  ├── config.yml│
                    │  └── access.log│
                    └─────────────────┘
```

## Components

### 1. vroom-express (API Layer)
- **Technology**: Node.js 20
- **Port**: 3000
- **Role**: REST API wrapper around vroom core
- **Features**:
  - HTTP API for vehicle routing problems
  - Input validation and error handling
  - JSON response formatting
  - Health check endpoint (`/health`)

### 2. vroom (Optimization Engine)
- **Technology**: C++ compiled binary
- **Role**: Core routing optimization algorithm
- **Capabilities**:
  - Single depot problems
  - Multiple vehicle routing
  - Time windows
  - Skills matching
  - Task prioritization

### 3. OSRM (Routing Service)
- **Technology**: C++ (Open Source Routing Machine)
- **Port**: 5000
- **Role**: Real-time routing calculations
- **Features**:
  - Distance matrix computation
  - Route geometry generation
  - Multi-modal routing (car, bike, foot)
  - Map data from `.osm` files

## Data Flow

```
Client Request
      │
      ▼
┌─────────────┐    Validate    ┌────────────────┐
│   POST      │────────────────▶│  vroom-express │
│   /jobs     │                 │   (Node.js)    │
└─────────────┘                 └───────┬────────┘
                                        │
                    1. Create Matrix   │
                    ──────────────────▶│
                                        │
                                        ▼
                              ┌─────────────────┐
                              │     OSRM        │
                              │  (Distance)     │
                              └────────┬────────┘
                                       │
                    2. Return Matrix  │
                    ◀─────────────────│
                                       │
                                       ▼
                              ┌─────────────────┐
                              │     vroom       │
                              │   (Optimize)    │
                              └────────┬─────────┘
                                       │
                    3. Optimized Route│
                    ◀─────────────────│
                                       │
      ┌───────────────────────────────│
      │                               ▼
      │                    ┌─────────────────┐
      └────────────────────│  vroom-express  │
         4. Return JSON    │   (Response)    │
                           └─────────────────┘
                                    │
                                    ▼
                          Optimized Routes Response
```

## Docker Build Process

### Multi-stage Build

```
┌─────────────────────┐
│     builder         │
│   (debian:trixie)   │
│                     │
│  1. Install deps    │
│  2. Clone vroom     │
│  3. Compile vroom   │
└──────────┬──────────┘
           │ COPY --from=builder
           ▼
┌─────────────────────┐
│     runstage        │
│   (node:20)         │
│                     │
│  1. Copy vroom bin │
│  2. Install npm    │
│  3. Copy entrypoint│
└─────────────────────┘
```

## Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `VROOM_ROUTER` | Routing backend (osrm, valhalla, ors) | `osrm` |
| `VROOM_LOG` | Log directory path | `/conf` |
| `VROOM_DOCKER` | Docker mode flag | `osrm` |

### Volume Mounts
| Host Path | Container Path | Description |
|-----------|---------------|-------------|
| `./conf` | `/conf` | Config and log files |

### config.yml Structure
- `cliArgs`: VROOM engine parameters
- `routingServers`: OSRM/Valhalla/ORS endpoints
- `routingServers.osrm.car`: Car routing config
- `routingServers.osrm.bike`: Bike routing config
- `routingServers.osrm.foot`: Pedestrian routing config

## API Endpoints

### Health Check
```
GET /health
```
Returns container health status.

### Solve Problem
```
POST /jobs
Content-Type: application/json

{
  " vehicles": [...],
  "jobs": [...],
  "matrix_callback": "http://localhost:5000/table/v1/driving/"
}
```

## Deployment Options

### 1. Single Container (OSRM on host)
```bash
docker run -dt --name vroom \
    --net host \
    -v $PWD/conf:/conf \
    -e VROOM_ROUTER=osrm \
    ghcr.io/vroom-project/vroom-docker:v1.15.0
```

### 2. Docker Compose (Recommended)
```bash
docker-compose up -d
```
Runs both vroom-express and OSRM in isolated containers.

### 3. Custom Build
```bash
docker build -t my-vroom \
    --build-arg VROOM_RELEASE=v1.15.0 \
    --build-arg VROOM_EXPRESS_RELEASE=v0.12.0 .
```

## Ports

| Service | Container Port | Host Port |
|---------|---------------|-----------|
| vroom-express | 3000 | 3000 |
| OSRM | 5000 | 5000 |

## Health Checks

Both services include health checks:
- **vroom-express**: `curl http://localhost:3000/health`
- **OSRM**: `curl http://localhost:5000/health`

## Security Considerations

1. **No external routing required**: All services run locally
2. **Volume mounts**: Only `/conf` is exposed (config + logs)
3. **No secrets**: No sensitive data in container
4. **Network isolation**: Services communicate via internal Docker network

## Performance Notes

- VROOM uses multi-threading (configurable via `cliArgs.threads`)
- OSRM loads map data into memory
- Docker resource limits can be set via `docker-compose`:
  ```yaml
  deploy:
    resources:
      limits:
        memory: 4G
  ```
