# Partners Integration Microservice

Single Express.js microservice handling partner authentication, showroom configuration, media management, offer subscriptions, and Unity integration.

## Port: 4001

## Dependencies

| Service | Purpose |
|---------|---------|
| MongoDB | All data (partners, showrooms, media metadata, offers, subscriptions) |
| Local Disk | Media file storage (uploads/) |

## Quick Start

```bash
# 1. Start MongoDB (via Docker or locally)
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Seed offers
npm run seed

# 4. Start service
npm run dev
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register a new partner |
| POST | /auth/login | Login, returns JWT |
| GET | /auth/me | Get current partner profile |

### Showroom
| Method | Path | Description |
|--------|------|-------------|
| GET | /showroom | Get partner's showroom config |
| PUT | /showroom | Update showroom layout config |
| PUT | /showroom/slots | Assign media to showroom slots |

### Media
| Method | Path | Description |
|--------|------|-------------|
| GET | /media | List partner's uploaded media |
| POST | /media/upload | Upload a media file |
| DELETE | /media/:id | Delete a media file |

### Offers
| Method | Path | Description |
|--------|------|-------------|
| GET | /offers | List available offers |
| POST | /offers/subscribe | Subscribe to an offer |
| GET | /offers/my-subscription | Get current subscription |

### Unity (Public)
| Method | Path | Description |
|--------|------|-------------|
| GET | /unity/partners | List all active partners |
| GET | /unity/partners/:id/showroom | Get filtered showroom by subscription |

## Offer System

| Offer | Images | Videos | 3D Objects |
|-------|--------|--------|------------|
| 🟢 Media Offer | 2 | 0 | 0 |
| 🔵 Full Offer | 4 | 2 | 1 |

## Environment Variables

See `.env.example` for all configuration options.
