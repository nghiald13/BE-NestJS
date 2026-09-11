# E-Commerce Microservices Platform

A backend e-commerce system built with **NestJS microservices**, demonstrating event-driven architecture, distributed transaction handling, and reliable asynchronous payment processing.

> Personal project — built to practice real-world backend patterns used in production distributed systems.

---

## 🏗️ Architecture

```
                        ┌──────────────────┐
                        │   API Gateway    │
                        └────────┬─────────┘
                                 │ TCP
        ┌─────────────┬──────────┼──────────┬──────────────┐
        │             │          │          │              │
   ┌────▼───┐   ┌─────▼────┐┌────▼───┐┌─────▼────┐  ┌──────▼─────┐
   │  Auth  │   │  Order   ││Product ││ Payment  │  │   Media    │
   │Service │   │ Service  ││Service ││ Service  │  │  Service   │
   └────────┘   └────┬─────┘└───┬────┘└────┬─────┘  └────────────┘
                     │          │          │
                     └──────  Kafka ───────┘
                     (order.created, payment.success,
                      order.cancelled, ...)
```

- **Synchronous communication** (TCP): direct request/response calls between services (e.g. Order → Product for stock reservation and price lookup).
- **Asynchronous communication** (Kafka): domain events published via the **Outbox Pattern**, consumed by downstream services (e.g. Payment Service listens to `order.created`).

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS monorepo (multi-app microservices) |
| Messaging | Apache Kafka (`kafkajs`) |
| Database | MongoDB (Mongoose, with transactions/sessions) |
| Caching / Locking | Redis (`ioredis`, `cache-manager`, `@keyv/redis`) — distributed lock for idempotency |
| Job Scheduling | BullMQ, NestJS CronJob |
| Authentication | JWT (`@nestjs/jwt`, `passport-jwt`), Google OAuth2 (`passport-google-oauth20`), 2FA (`otplib`) |
| Media Storage | Cloudinary |
| Email | Nodemailer + Handlebars templates (`@nestjs-modules/mailer`) |
| Payment Gateway | ZaloPay |
| API Documentation | Swagger (`@nestjs/swagger`) |
| Containerization | Docker & Docker Compose |

---

## ✨ Key Engineering Highlights

This project focuses on solving real distributed-systems problems rather than just wiring up CRUD endpoints:

- **Idempotent order creation** — Redis distributed lock (`setNLock`) + result caching prevent duplicate orders and double stock deduction from retried or double-submitted requests.
- **Saga-style compensation** — if order creation fails *after* stock has been reserved, a compensating event (`order.create.failed`) is emitted to roll back the reservation, keeping Order and Product services consistent without a distributed transaction coordinator.
- **Transactional outbox pattern** — domain events (`order.created`, `payment.success`, `order.cancelled`) are written to an outbox collection inside the same MongoDB transaction as the business data, guaranteeing at-least-once event delivery even if the service crashes right after committing.
- **Payment reconciliation** — scheduled jobs (BullMQ) automatically re-query ZaloPay for payment status when webhooks are delayed or missing, so the system doesn't rely solely on callbacks.
- **Callback signature verification** — ZaloPay callbacks are validated via HMAC-SHA256 MAC before being trusted, preventing spoofed payment confirmations.
- **Expiry-driven state machines** — orders and payments carry `expiresAt` timestamps with matching auto-check jobs, so pending states resolve automatically (`PAYMENTPENDING → CANCELLED/PAID`, `PENDING → FINALIZING`, etc.) without manual intervention.

---

## 🧩 Services

| Service | Responsibility |
|---|---|
| `api-gateway` | Entry point, routes requests to internal services |
| `auth-service` | Authentication / authorization |
| `product-service` | Product catalog, stock reservation |
| `order-service` | Order lifecycle, pricing, orchestration |
| `payment-service` | Payment creation, ZaloPay integration, reconciliation |
| `media-service` | Media/file handling |

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (for local development outside containers)

### Run with Docker Compose

```bash
git clone https://github.com/nghiald13/BE-NestJS
cd nest-app
cp .env.example .env   # fill in required environment variables
docker compose up --build
```

The API Gateway will be available at `http://localhost:8080`.
Kafka will be available at `localhost:9092`.

### API Documentation

Interactive Swagger docs are available at:

```
http://localhost:8080/api/docs
```

### Local Development (per service)

Each microservice can be started individually in watch mode, with dedicated debug ports:

```bash
npm run start:debug:gateway   # API Gateway   – debug port 9229
npm run start:debug:auth      # Auth Service  – debug port 9230
npm run start:debug:media     # Media Service – debug port 9231
npm run start:debug:product   # Product Service – debug port 9232
npm run start:debug:order     # Order Service   – debug port 9233
npm run start:debug:payment   # Payment Service – debug port 9234
```

### Environment Variables

Each service reads its config via `.env`.

---

## 📌 Roadmap / Known Improvements

- [ ] Implement Warehouse Management System (WMS) businesses.
- [ ] Implement Dashboard for staff roles.
- [ ] Implement Rate Limiting for crucial businesses.
- [ ] Add centralized logging & tracing across services.
- [ ] Keep transitioning legacy codes from previous monolithic architecture.

---

## 👤 Author

**Lê Đại Nghĩa**

## 📄 License

This project is for personal learning/portfolio purposes (UNLICENSED).