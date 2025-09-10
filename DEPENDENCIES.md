# Project Dependencies

This document provides a comprehensive overview of all dependencies used in the Nexus Monitoring Portal project.

## Backend Dependencies (Python)

### Core Framework
- **fastapi==0.104.1** - Modern, fast web framework for building APIs
- **uvicorn[standard]==0.24.0** - ASGI server for running FastAPI applications
- **python-multipart==0.0.6** - Support for multipart/form-data requests

### Database
- **motor==3.3.2** - Async MongoDB driver for Python
- **pymongo==4.6.0** - Official MongoDB driver for Python

### Authentication & Security
- **pydantic==2.5.0** - Data validation using Python type annotations
- **pydantic-settings==2.1.0** - Settings management using Pydantic
- **cryptography==41.0.8** - Cryptographic recipes and primitives
- **passlib[bcrypt]==1.7.4** - Password hashing library
- **python-jose[cryptography]==3.3.0** - JWT token handling

### Monitoring & Network Tools
- **pysnmp==4.4.12** - SNMP library for network monitoring
- **pyasn1==0.5.1** - ASN.1 types and codecs
- **pyOpenSSL==23.3.0** - SSL certificate checking
- **certifi==2023.11.17** - Certificate authority bundle
- **pythonping==1.1.4** - Network ping functionality
- **dnspython==2.4.2** - DNS toolkit

### HTTP & Async Support
- **aiohttp==3.9.1** - Async HTTP client/server
- **aiofiles==23.2.0** - Async file operations
- **requests==2.31.0** - HTTP library for Python

### Task Queue & Background Jobs
- **celery==5.3.4** - Distributed task queue
- **redis==5.0.1** - Redis client for caching and message broker
- **apscheduler==3.10.4** - Advanced Python scheduler

### Configuration & Environment
- **python-dotenv==1.0.0** - Load environment variables from .env file

### Logging & Monitoring
- **structlog==23.2.0** - Structured logging

### Date & Time
- **python-dateutil==2.8.2** - Extensions to the standard datetime module

### CORS
- **fastapi-cors==0.0.6** - CORS middleware for FastAPI

### Data Export
- **pandas==2.1.4** - Data manipulation and analysis
- **openpyxl==3.1.2** - Excel file handling
- **reportlab==4.0.7** - PDF generation

### Google Cloud Platform Integration
- **google-auth==2.25.2** - Google authentication library
- **google-auth-oauthlib==1.2.0** - OAuth 2.0 support for Google APIs
- **google-auth-httplib2==0.2.0** - HTTP transport for Google Auth
- **google-cloud-monitoring==2.16.0** - Cloud Monitoring API
- **google-cloud-compute==1.15.0** - Compute Engine API
- **google-cloud-storage==2.10.0** - Cloud Storage API
- **cloud-sql-python-connector==1.18.4** - Cloud SQL connector
- **google-cloud-firestore==2.13.1** - Firestore database API
- **google-cloud-functions==1.13.3** - Cloud Functions API
- **google-cloud-run==0.10.5** - Cloud Run API
- **google-cloud-container==2.34.0** - Google Kubernetes Engine API
- **google-cloud-dns==0.34.2** - Cloud DNS API
- **google-cloud-kms==2.19.2** - Key Management Service API
- **google-cloud-pubsub==2.18.4** - Pub/Sub messaging API
- **google-cloud-redis==2.13.2** - Cloud Redis API
- **google-cloud-spanner==3.40.1** - Cloud Spanner API
- **google-analytics-data==0.18.8** - Google Analytics Data API
- **google-analytics-admin==0.25.0** - Google Analytics Admin API

### Google Analytics Integration
- **google-api-python-client==2.108.0** - Google API client library
- **oauth2client==4.1.3** - OAuth 2.0 client library

### Development Dependencies
- **pytest==7.4.3** - Testing framework
- **pytest-asyncio==0.21.1** - Async support for pytest
- **httpx==0.25.2** - HTTP client for testing
- **black==23.11.0** - Code formatter
- **flake8==6.1.0** - Code linter
- **mypy==1.7.1** - Static type checker

### Utilities
- **click==8.1.7** - Command line interface creation
- **typing-extensions==4.8.0** - Backported type hints

## Frontend Dependencies (Node.js/React)

### Core Framework
- **next==15.5.2** - React framework for production
- **react==19.1.0** - JavaScript library for building user interfaces
- **react-dom==19.1.0** - React DOM rendering

### State Management & Data Fetching
- **@tanstack/react-query==^5.85.9** - Data fetching and caching library
- **zustand==^5.0.8** - Lightweight state management

### UI & Styling
- **tailwindcss==^4** - Utility-first CSS framework
- **@tailwindcss/postcss==^4** - PostCSS plugin for Tailwind
- **clsx==^2.1.1** - Utility for constructing className strings
- **tailwind-merge==^3.3.1** - Merge Tailwind CSS classes
- **lucide-react==^0.542.0** - Icon library

### Charts & Visualization
- **chart.js==^4.5.0** - Chart library
- **react-chartjs-2==^5.3.0** - React wrapper for Chart.js

### Video Streaming
- **video.js==^8.23.4** - HTML5 video player
- **@videojs/http-streaming==^3.17.2** - HLS and DASH support
- **shaka-player==^4.16.0** - Media player library
- **videojs-contrib-quality-levels==^4.1.0** - Quality level support

### Data Processing
- **xlsx==^0.18.5** - Excel file processing
- **crypto-js==^4.2.0** - Cryptographic functions

### Development Dependencies
- **typescript==^5** - TypeScript language
- **@types/node==^20** - Node.js type definitions
- **@types/react==^19** - React type definitions
- **@types/react-dom==^19** - React DOM type definitions
- **@types/crypto-js==^4.2.2** - Crypto-js type definitions
- **eslint==^9** - JavaScript linter
- **eslint-config-next==15.5.2** - ESLint configuration for Next.js
- **@eslint/eslintrc==^3** - ESLint configuration utilities

## Infrastructure Dependencies

### Docker
- **Docker** - Containerization platform
- **Docker Compose** - Multi-container Docker applications

### Database
- **MongoDB** - NoSQL document database
- **Redis** - In-memory data structure store

### External Services
- **Google Cloud Platform** - Cloud computing services
- **Google Analytics** - Web analytics service

## Dependency Management

### Backend
- Dependencies are managed via `requirements.txt`
- Install with: `pip install -r requirements.txt`
- Virtual environment recommended: `python -m venv venv`

### Frontend
- Dependencies are managed via `package.json`
- Install with: `npm install` or `yarn install`
- Node.js version: 18+ recommended

## Security Considerations

1. **Regular Updates**: Keep dependencies updated to latest stable versions
2. **Vulnerability Scanning**: Use tools like `npm audit` and `pip-audit`
3. **Environment Variables**: Store sensitive configuration in `.env` files
4. **Production Dependencies**: Separate development and production dependencies

## Performance Optimization

1. **Bundle Analysis**: Use Next.js bundle analyzer for frontend
2. **Async Operations**: Leverage async/await for I/O operations
3. **Caching**: Implement Redis caching for frequently accessed data
4. **Database Indexing**: Ensure proper MongoDB indexing

## Troubleshooting

### Common Issues
1. **Version Conflicts**: Use exact versions in requirements.txt
2. **Missing Dependencies**: Check for peer dependencies in frontend
3. **Build Failures**: Ensure Node.js and Python versions are compatible
4. **Runtime Errors**: Verify environment variables are set correctly

### Useful Commands
```bash
# Backend
pip freeze > requirements.txt  # Generate requirements file
pip install --upgrade pip      # Update pip

# Frontend
npm outdated                   # Check for outdated packages
npm update                     # Update packages
npm audit fix                  # Fix security vulnerabilities
```