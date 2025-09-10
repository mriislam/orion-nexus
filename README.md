# Orion Nexus - Network Monitoring Portal

A comprehensive network monitoring solution built with FastAPI, Next.js, and real-time monitoring capabilities. Orion Nexus provides device monitoring via SNMP, SSL certificate tracking, uptime monitoring, and network diagnostics.

## 🚀 Features

### Core Monitoring
- **Device Monitoring**: SNMP-based monitoring of network devices (routers, switches, firewalls)
- **SSL Certificate Monitoring**: Automated SSL certificate expiration tracking and alerts
- **Uptime Monitoring**: HTTP/HTTPS, ping, and port connectivity checks
- **Network Diagnostics**: Traceroute, DNS lookup, and network path analysis

### Security & Performance
- **End-to-End Encryption**: AES encryption for all API communications
- **Real-time Updates**: Live dashboard with WebSocket support
- **Scalable Architecture**: Celery-based task queue for distributed monitoring
- **Data Retention**: Configurable data retention policies

### User Interface
- **Responsive Dashboard**: Modern React-based interface with real-time charts
- **Dark/Light Theme**: Customizable UI themes
- **Mobile Friendly**: Optimized for mobile and tablet devices
- **Interactive Charts**: Real-time network traffic and performance visualization

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Task Queue    │
                       │   (Celery +     │
                       │    Redis)       │
                       └─────────────────┘
```

## 📋 Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **MongoDB 4.4+**
- **Redis 6.0+**
- **Git**

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd monitoring_portal
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Copy environment configuration
cp .env.local.example .env.local

# Edit .env.local file with your configuration
nano .env.local
```

### 4. Database Setup

```bash
# Start MongoDB (if not running as service)
mongod --dbpath /path/to/your/db

# Start Redis (if not running as service)
redis-server
```

## 🚀 Running the Application

### Development Mode

1. **Start the Backend API**:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. **Start Celery Worker** (in a new terminal):
```bash
cd backend
source venv/bin/activate
celery -A tasks.celery_app worker --loglevel=info
```

3. **Start Celery Beat** (in a new terminal):
```bash
cd backend
source venv/bin/activate
celery -A tasks.celery_app beat --loglevel=info
```

4. **Start the Frontend** (in a new terminal):
```bash
cd frontend
npm run dev
```

### Production Mode

1. **Build the Frontend**:
```bash
cd frontend
npm run build
npm start
```

2. **Run Backend with Gunicorn**:
```bash
cd backend
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 📊 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 Configuration

### Backend Configuration (.env)

```env
# Database
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=orion_nexus

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here
AES_SECRET_KEY=your-aes-secret-key-here

# Monitoring Intervals (seconds)
DEVICE_POLL_INTERVAL=300
SSL_CHECK_INTERVAL=3600
UPTIME_CHECK_INTERVAL=60
```

### Frontend Configuration (.env.local)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AES_SECRET_KEY=your-aes-secret-key-here

# Application
NEXT_PUBLIC_APP_NAME=Orion Nexus
```

## 📱 Usage

### Adding Devices

1. Navigate to the **Devices** section
2. Click **Add Device**
3. Configure SNMP settings:
   - IP Address
   - SNMP Version (v1, v2c, v3)
   - Community String or Credentials
   - Polling Interval

### SSL Certificate Monitoring

1. Go to **SSL Certificates**
2. Click **Add Domain**
3. Enter domain name and check interval
4. Configure alert thresholds

### Uptime Monitoring

1. Visit **Uptime Monitoring**
2. Add HTTP, Ping, or Port checks
3. Set check intervals and alert conditions

## 🔍 Monitoring Features

### Device Metrics
- CPU Usage
- Memory Utilization
- Interface Statistics
- System Uptime
- SNMP Walk Data

### SSL Certificate Checks
- Certificate Expiration
- Certificate Chain Validation
- SSL Grade Assessment
- Issuer Information

### Network Diagnostics
- HTTP Response Time
- Ping Latency
- Port Connectivity
- Traceroute Analysis
- DNS Resolution

## 🚨 Alerting

Orion Nexus supports multiple alert types:
- Device offline/online status
- High CPU/Memory usage
- SSL certificate expiration warnings
- Failed uptime checks
- Network connectivity issues

## 🔒 Security

- **AES Encryption**: All API communications are encrypted
- **JWT Authentication**: Secure user authentication
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API rate limiting protection
- **CORS Configuration**: Secure cross-origin requests

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📦 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API documentation at `/docs`

## 🔄 Changelog

### v1.0.0
- Initial release
- Device monitoring via SNMP
- SSL certificate monitoring
- Uptime monitoring
- Real-time dashboard
- AES encryption
- Celery task queue

---

**Orion Nexus** - Comprehensive Network Monitoring Made Simple