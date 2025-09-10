# Nexus Monitoring Portal - Architecture Documentation

## Overview

The Nexus Monitoring Portal is a comprehensive monitoring solution built with a modern microservices architecture. It provides unified monitoring for network devices, cloud resources, SSL certificates, uptime monitoring, and streaming services.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (MongoDB)     │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 27017   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Celery)      │
                       │   Port: 6379    │
                       └─────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.2 with React 19
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand + React Query
- **Charts**: Chart.js with React wrapper
- **Video Streaming**: Video.js + Shaka Player
- **Language**: TypeScript

### Backend
- **Framework**: FastAPI 0.104.1
- **Server**: Uvicorn ASGI server
- **Language**: Python 3.8+
- **API Documentation**: Auto-generated OpenAPI/Swagger

### Database
- **Primary**: MongoDB (Document store)
- **Cache/Queue**: Redis
- **ORM**: Motor (Async MongoDB driver)

### Task Queue
- **Queue**: Celery with Redis broker
- **Scheduler**: APScheduler for periodic tasks

## Project Structure

```
new-monitoring-portal/
├── backend/
│   ├── core/                 # Core configuration and database
│   │   ├── auth.py          # Authentication logic
│   │   ├── config.py        # Application settings
│   │   ├── database.py      # Database connection
│   │   └── gcp_collections.py # GCP-specific collections
│   ├── models/              # Pydantic models
│   │   ├── analytics.py     # Google Analytics models
│   │   ├── device.py        # Network device models
│   │   ├── diagnostics.py   # Network diagnostics models
│   │   ├── gcp.py          # Google Cloud Platform models
│   │   ├── ssl.py          # SSL certificate models
│   │   ├── stream.py       # Streaming service models
│   │   └── uptime.py       # Uptime monitoring models
│   ├── routers/             # API route handlers
│   │   ├── analytics.py     # Google Analytics endpoints
│   │   ├── api_v1.py       # API version 1 router
│   │   ├── devices.py      # Network device endpoints
│   │   ├── diagnostics.py  # Network diagnostics endpoints
│   │   ├── gcp.py          # GCP integration endpoints
│   │   ├── gcp_services.py # GCP service-specific endpoints
│   │   ├── network_diagnostics.py # Network diagnostic tools
│   │   ├── ssl.py          # SSL certificate endpoints
│   │   ├── streams.py      # Streaming service endpoints
│   │   └── uptime.py       # Uptime monitoring endpoints
│   ├── services/            # Business logic services
│   │   ├── network_diagnostics.py # Network diagnostic services
│   │   ├── snmp_poller.py  # SNMP polling service
│   │   └── ssl_checker.py  # SSL certificate checker
│   ├── tasks/               # Background tasks
│   │   ├── analytics_scheduler.py # Analytics task scheduler
│   │   ├── celery_app.py   # Celery application
│   │   ├── device_monitoring.py # Device monitoring tasks
│   │   ├── maintenance.py  # Maintenance tasks
│   │   ├── ssl_monitoring.py # SSL monitoring tasks
│   │   └── uptime_monitoring.py # Uptime monitoring tasks
│   ├── utils/               # Utility functions
│   │   ├── common.py       # Common utility functions
│   │   └── gcp_helpers.py  # GCP-specific helpers
│   ├── scripts/             # Migration and utility scripts
│   │   └── migrate_gcp_resources.py # GCP resource migration
│   ├── main.py             # FastAPI application entry point
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js app directory
│   │   │   ├── analytics/  # Google Analytics pages
│   │   │   ├── devices/    # Network device management
│   │   │   ├── gcp-integration/ # GCP resource management
│   │   │   ├── network-diagnostics/ # Network diagnostic tools
│   │   │   ├── settings/   # Application settings
│   │   │   ├── ssl/        # SSL certificate management
│   │   │   ├── stream-monitoring/ # Streaming service monitoring
│   │   │   └── uptime/     # Uptime monitoring
│   │   ├── components/     # Reusable React components
│   │   ├── lib/           # Utility libraries
│   │   ├── store/         # State management
│   │   └── types/         # TypeScript type definitions
│   ├── public/            # Static assets
│   ├── package.json       # Node.js dependencies
│   └── tsconfig.json      # TypeScript configuration
├── docker-compose.yml     # Docker services configuration
├── DEPENDENCIES.md        # Dependency documentation
├── ARCHITECTURE.md        # This file
└── README.md             # Project overview
```

## Core Components

### 1. Authentication & Security
- JWT-based authentication
- Password hashing with bcrypt
- CORS middleware for cross-origin requests
- Environment-based configuration

### 2. Database Layer
- MongoDB collections for different monitoring types
- Async operations with Motor driver
- Aggregation pipelines for data processing
- Indexing for performance optimization

### 3. API Layer
- RESTful API design
- Auto-generated OpenAPI documentation
- Request/response validation with Pydantic
- Error handling and logging

### 4. Background Tasks
- Celery for distributed task processing
- Redis as message broker
- Scheduled monitoring tasks
- Async task execution

### 5. Frontend Architecture
- Server-side rendering with Next.js
- Component-based architecture
- State management with Zustand
- Data fetching with React Query
- Responsive design with Tailwind CSS

## Data Flow

### 1. Device Monitoring Flow
```
SNMP Poller → Device Data → MongoDB → API → Frontend Dashboard
     ↓
Celery Tasks → Scheduled Polling → Real-time Updates
```

### 2. GCP Integration Flow
```
GCP APIs → Resource Discovery → Data Transformation → MongoDB → API → Frontend
    ↓
Credentials → Service Account → API Calls → Resource Monitoring
```

### 3. SSL Monitoring Flow
```
SSL Checker → Certificate Analysis → Expiry Tracking → MongoDB → API → Alerts
     ↓
Scheduled Tasks → Certificate Validation → Status Updates
```

### 4. Uptime Monitoring Flow
```
HTTP Checker → Response Analysis → Availability Tracking → MongoDB → API → Dashboard
     ↓
Ping Service → Network Connectivity → Performance Metrics
```

## API Design

### RESTful Endpoints
- `GET /api/v1/devices` - List network devices
- `POST /api/v1/devices` - Create new device
- `GET /api/v1/gcp/compute-engine` - List GCP instances
- `GET /api/v1/ssl/certificates` - List SSL certificates
- `GET /api/v1/uptime/monitors` - List uptime monitors

### Response Format
```json
{
  "status": "success",
  "data": [...],
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Handling
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {...}
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Security Architecture

### Authentication
- JWT tokens for API authentication
- Secure password storage with bcrypt
- Session management

### Authorization
- Role-based access control (planned)
- API key authentication for external integrations
- Resource-level permissions

### Data Protection
- Environment variable configuration
- Encrypted credential storage
- HTTPS enforcement in production

## Monitoring & Observability

### Logging
- Structured logging with structlog
- Request/response logging
- Error tracking and alerting

### Metrics
- Application performance monitoring
- Database query performance
- API response times

### Health Checks
- `/health` endpoint for service status
- Database connectivity checks
- External service availability

## Deployment Architecture

### Development
```
Local Development:
- Frontend: npm run dev (Port 3000)
- Backend: uvicorn main:app --reload (Port 8000)
- MongoDB: Local instance (Port 27017)
- Redis: Local instance (Port 6379)
```

### Production (Docker)
```
Docker Compose:
- Frontend Container (nginx + Next.js)
- Backend Container (uvicorn + FastAPI)
- MongoDB Container
- Redis Container
- Reverse Proxy (nginx)
```

### Scaling Considerations
- Horizontal scaling with load balancers
- Database sharding for large datasets
- Redis clustering for high availability
- CDN for static asset delivery

## Performance Optimization

### Backend
- Async/await for I/O operations
- Database indexing and query optimization
- Connection pooling
- Caching with Redis

### Frontend
- Server-side rendering
- Code splitting and lazy loading
- Image optimization
- Bundle size optimization

### Database
- Proper indexing strategy
- Aggregation pipeline optimization
- Connection pooling
- Read replicas for scaling

## Future Enhancements

### Planned Features
1. **Real-time Notifications**
   - WebSocket connections
   - Push notifications
   - Email/SMS alerts

2. **Advanced Analytics**
   - Machine learning for anomaly detection
   - Predictive analytics
   - Custom dashboards

3. **Multi-tenancy**
   - Organization-based isolation
   - Role-based access control
   - Resource quotas

4. **API Gateway**
   - Rate limiting
   - API versioning
   - Request/response transformation

### Technical Debt
1. **Testing Coverage**
   - Unit tests for all components
   - Integration tests
   - End-to-end testing

2. **Documentation**
   - API documentation improvements
   - Code documentation
   - User guides

3. **Monitoring**
   - Application performance monitoring
   - Error tracking
   - Business metrics

## Troubleshooting Guide

### Common Issues
1. **Database Connection Issues**
   - Check MongoDB service status
   - Verify connection string
   - Check network connectivity

2. **API Performance Issues**
   - Monitor database query performance
   - Check Redis cache hit rates
   - Analyze API response times

3. **Frontend Build Issues**
   - Verify Node.js version compatibility
   - Check for dependency conflicts
   - Clear build cache

### Debugging Tools
- FastAPI automatic documentation at `/docs`
- MongoDB Compass for database inspection
- Redis CLI for cache inspection
- Browser developer tools for frontend debugging

## Contributing Guidelines

### Code Standards
- Follow PEP 8 for Python code
- Use ESLint and Prettier for JavaScript/TypeScript
- Write comprehensive tests
- Document all public APIs

### Development Workflow
1. Create feature branch
2. Implement changes with tests
3. Run linting and tests
4. Submit pull request
5. Code review and merge

### Release Process
1. Version bump in package.json and requirements.txt
2. Update CHANGELOG.md
3. Create release tag
4. Deploy to staging
5. Deploy to production