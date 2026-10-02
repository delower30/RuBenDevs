# Module 05: Development Instructions, API Specification & Docker Blueprint

**Project:** Dhaka Tesla Pool  
**Author:** Software Architect & Principal Engineer  
**Scope:** Developer Setup, REST API Specification, Docker Containerization, and Seed Data Contracts  

---

## 1. Local Environment & Development Instructions

### Prerequisites
- **Node.js:** `v20.x LTS` or higher
- **Package Manager:** `npm` (v10+)
- **Docker & Docker Compose:** Docker Engine v24+ with Compose v2+
- **Database:** PostgreSQL 16 (handled via Docker)

### Quickstart Execution Steps
```bash
# 1. Clone repository and verify branch
git checkout master

# 2. Copy environment template
cp .env.example .env

# 3. Launch full stack via Docker Compose
docker compose up --build -d

# 4. Run database migrations and seed the story cast
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed

# 5. Access the application
# Frontend UI: http://localhost:3000
# Backend API: http://localhost:5000
# API Health:  http://localhost:5000/health
```

---

## 2. Docker Compose Specification (`docker-compose.yml`)

The infrastructure consists of 3 isolated containers sharing an internal bridge network:

```yaml
version: '3.8'

services:
  # 1. PostgreSQL Relational Store
  postgres:
    image: postgres:16-alpine
    container_name: dhaka_tesla_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-tesla_admin}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-bullet_secure_pass_2026}
      POSTGRES_DB: ${DB_NAME:-dhaka_tesla_db}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/prisma/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-tesla_admin} -d ${DB_NAME:-dhaka_tesla_db}"]
      interval: 5s
      timeout: 5s
      retries: 5

  # 2. Node.js Backend API Service
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dhaka_tesla_api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PORT: 5000
      DATABASE_URL: postgresql://${DB_USER:-tesla_admin}:${DB_PASSWORD:-bullet_secure_pass_2026}@postgres:5432/${DB_NAME:-dhaka_tesla_db}?schema=public
      JWT_SECRET: ${JWT_SECRET:-dhaka_tesla_jwt_super_secret_key_90fps}
      NODE_ENV: production
    ports:
      - "5000:5000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # 3. Next.js Frontend Presentation Layer
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: dhaka_tesla_frontend
    restart: unless-stopped
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:5000/api
      PORT: 3000
    ports:
      - "3000:3000"

volumes:
  postgres_data:
    driver: local
```

---

## 3. Environment Variables Configuration (`.env.example`)

```env
# Application Environment
NODE_ENV=development
PORT=5000
FRONTEND_PORT=3000

# Database Configuration (PostgreSQL)
DB_USER=tesla_admin
DB_PASSWORD=bullet_secure_pass_2026
DB_NAME=dhaka_tesla_db
DB_HOST=localhost
DB_PORT=5432
DATABASE_URL=postgresql://tesla_admin:bullet_secure_pass_2026@localhost:5432/dhaka_tesla_db?schema=public

# Security & Authentication
JWT_SECRET=super_secret_dhaka_tesla_key_never_share_in_production
JWT_EXPIRES_IN=7d

# Business Invariants & Pricing Defaults
BASE_FARE_POYSHA=3000          # ৳30.00
RATE_PER_KM_POYSHA=1500        # ৳15.00 / km
POOL_DISCOUNT_PERCENT=25       # 25% discount for shared rides
VEHICLE_MAX_CAPACITY=3         # Bullet physical 3-seat limit
```

---

## 4. The Canonical Story Seed Data Specification (PRD §1 & §18)

When executing `npm run db:seed`, the database must populate the exact cast:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('tesla123', 10);

  // 1. Seed Driver: Jashim
  const jashim = await prisma.user.upsert({
    where: { email: 'jashim.driver@dhakatesla.com' },
    update: {},
    create: {
      fullName: 'Jashim Uddin',
      email: 'jashim.driver@dhakatesla.com',
      passwordHash,
      phone: '+8801711000001',
      role: 'DRIVER',
    },
  });

  // 2. Seed Jashim's 3-Seater Tesla: Bullet
  const bullet = await prisma.vehicle.upsert({
    where: { licensePlate: 'DHA-HA-11-2024' },
    update: {},
    create: {
      driverId: jashim.id,
      name: 'Bullet',
      model: 'Electric Rickshaw Tesla (3-Wheeler)',
      licensePlate: 'DHA-HA-11-2024',
      capacity: 3,
      isActive: true,
    },
  });

  // 3. Seed Passenger 1: Nusrat
  const nusrat = await prisma.user.upsert({
    where: { email: 'nusrat@dhakatesla.com' },
    update: {},
    create: {
      fullName: 'Nusrat Jahan',
      email: 'nusrat@dhakatesla.com',
      passwordHash,
      phone: '+8801711000002',
      role: 'PASSENGER',
    },
  });

  // 4. Seed Passenger 2: Rafiq
  const rafiq = await prisma.user.upsert({
    where: { email: 'rafiq@dhakatesla.com' },
    update: {},
    create: {
      fullName: 'Rafiqul Islam',
      email: 'rafiq@dhakatesla.com',
      passwordHash,
      phone: '+8801711000003',
      role: 'PASSENGER',
    },
  });

  // 5. Seed Passenger 3: Shirin (The Contender)
  const shirin = await prisma.user.upsert({
    where: { email: 'shirin@dhakatesla.com' },
    update: {},
    create: {
      fullName: 'Shirin Akter',
      email: 'shirin@dhakatesla.com',
      passwordHash,
      phone: '+8801711000004',
      role: 'PASSENGER',
    },
  });

  // 6. Pre-load Simulated TeslaPay Wallets (৳1,000.00 = 100,000 poysha each)
  for (const user of [nusrat, rafiq, shirin, jashim]) {
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        balancePoysha: 100000,
        currency: 'BDT',
      },
    });
  }

  console.log('✅ Dhaka Tesla Story Seed Data successfully deployed.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

---

## 5. Complete REST API Specification

### Authentication Domain
#### `POST /api/auth/login`
- **Description:** Authenticates passenger or driver; returns JWT.
- **Request:**
  ```json
  {
    "email": "nusrat@dhakatesla.com",
    "password": "tesla123"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "user": {
      "id": "uuid-nusrat",
      "fullName": "Nusrat Jahan",
      "email": "nusrat@dhakatesla.com",
      "role": "PASSENGER"
    }
  }
  ```

---

### Ride & Pooling Domain
#### `POST /api/rides/request`
- **Description:** Submits a ride request from a passenger.
- **Headers:** `Authorization: Bearer <token>`, `Idempotency-Key: <uuid>`
- **Request:**
  ```json
  {
    "pickupZone": "Banani",
    "destinationZone": "Mohakhali",
    "requestedSeats": 1
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "rideId": "uuid-ride-1",
    "status": "REQUESTED",
    "pickupZone": "Banani",
    "destinationZone": "Mohakhali",
    "requestedSeats": 1,
    "fare": {
      "baseFareBdt": "30.00",
      "distanceFareBdt": "45.00",
      "estimatedDiscountBdt": "0.00",
      "estimatedTotalBdt": "75.00",
      "farePoysha": 7500
    }
  }
  ```

#### `GET /api/rides/:id`
- **Description:** Returns live ride status and fare for the authenticated passenger.
- **Privacy Enforcement:** If requesting user is NOT the owner of the ride and NOT the assigned driver, returns `403 Forbidden`.
- **Response `200 OK` (Nusrat's isolated view when pooled with Rafiq):**
  ```json
  {
    "rideId": "uuid-ride-1",
    "status": "MATCHED",
    "pickupZone": "Banani",
    "destinationZone": "Mohakhali",
    "assignedDriver": {
      "name": "Jashim",
      "vehicle": "Bullet (3-Wheeler Tesla)",
      "plate": "DHA-HA-11-2024"
    },
    "poolStatus": {
      "isShared": true,
      "occupiedSeats": 2,
      "maxSeats": 3
    },
    "myFare": {
      "baseFareBdt": "30.00",
      "distanceFareBdt": "45.00",
      "poolDiscountBdt": "18.75",
      "finalFareBdt": "56.25",
      "finalFarePoysha": 5625
    }
  }
  ```

#### `POST /api/rides/:id/cancel`
- **Description:** Cancels a ride if status is `REQUESTED` or `MATCHED`.
- **Response `200 OK`:**
  ```json
  {
    "rideId": "uuid-ride-1",
    "status": "CANCELLED",
    "refundedPoysha": 5625,
    "message": "Ride cancelled. Seats restored to Bullet's pool."
  }
  ```

---

### Driver Dispatch Domain
#### `GET /api/driver/pool/current`
- **Description:** Returns Jashim's current vehicle pool, seat manifest, and passenger pickup order.
- **Headers:** `Authorization: Bearer <jashim-token>`
- **Response `200 OK`:**
  ```json
  {
    "poolId": "uuid-pool-1",
    "vehicle": "Bullet",
    "capacity": 3,
    "occupiedSeats": 2,
    "status": "OPEN",
    "passengers": [
      {
        "rideId": "uuid-ride-1",
        "name": "Nusrat",
        "seats": 1,
        "pickup": "Banani Road 11",
        "destination": "Mohakhali",
        "status": "MATCHED"
      },
      {
        "rideId": "uuid-ride-2",
        "name": "Rafiq",
        "seats": 1,
        "pickup": "Banani Road 11",
        "destination": "Gulshan 1",
        "status": "MATCHED"
      }
    ]
  }
  ```

#### `POST /api/driver/pool/:id/transition`
- **Description:** Drivers transition the pool lifecycle (`DRIVER_ARRIVED`, `STARTED`, `COMPLETED`).
- **Request:**
  ```json
  {
    "targetState": "STARTED"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "poolId": "uuid-pool-1",
    "previousState": "DRIVER_ARRIVED",
    "currentState": "STARTED",
    "updatedAt": "2026-09-26T08:45:00.000Z"
  }
  ```
- **Error Response `409 Conflict` (Illegal state transition):**
  ```json
  {
    "error": "InvalidStateTransition",
    "message": "Cannot transition pool from REQUESTED directly to COMPLETED"
  }
  ```

---

### System Health
#### `GET /health`
- **Description:** Verifies service uptime and database connection for Docker health checks.
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "uptimeSeconds": 1420,
    "database": "connected",
    "timestamp": "2026-09-26T08:45:00.000Z"
  }
  ```
