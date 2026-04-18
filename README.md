# Panini Live Wishlist

Easily create and share a **live-updating** wishlist for your Panini comics!

## Why?

Panini only allows wishlist sharing via email, and once sent, the list quickly becomes outdated. If you buy a comic, your previously shared wishlist doesn't reflect the change.

This app generates a **sharable live link** to your wishlist, ensuring it's always up to date!

## Features

- Live-updating wishlist accessible via a shareable URL
- Priority settings (1-10) for wishlist items
- Notes on individual items
- Dependency tracking between related comics (e.g., prequels)
- QR code generation for easy sharing
- Bulk priority management
- Dark mode support
- Cached comic data (price, author, release date, etc.)
- Account management (login, change password, delete account)

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API Routes + Flask (Python) for web scraping
- **Database**: MySQL via Prisma ORM
- **Auth**: JWT sessions with bcrypt password hashing
- **Scraping**: Selenium (Python) for Panini.de data

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.13+
- MySQL database
- Chrome/Chromium (for Selenium)

### Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/EntchenEric/panini-live-wishlist.git
   cd panini-live-wishlist
   ```

2. Install Node.js dependencies:
   ```bash
   npm ci
   ```

3. Install Python dependencies:
   ```bash
   cd python_backend
   pip install -r requirements.txt
   ```

4. Copy the environment template:
   ```bash
   cp example.env .env.local
   ```

5. Configure `.env.local` with your values (see [Environment Variables](#environment-variables)).

6. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

7. Start the development servers:
   ```bash
   # Terminal 1 — Next.js
   npm run dev

   # Terminal 2 — Flask backend
   cd python_backend
   python main.py
   ```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL connection string (`mysql://user:pass@host:3306/db`) |
| `SECRET_KEY` | Yes | Encryption key for Panini passwords (min 32 chars) |
| `SESSION_SECRET` | Yes | JWT signing key (min 32 chars) |
| `BACKEND_URL` | Yes | Flask backend URL (e.g., `http://localhost:8000`) |
| `FLASK_API_KEY` | Yes | Shared API key between Next.js and Flask |
| `FRONTEND_URL` | No | Frontend URL for Flask CORS (default: `http://localhost:3000`) |
| `FLASK_BACKEND_URL` | No | Flask URL for CSP `connect-src` (default: `http://localhost:5000`) |
| `NEXT_PUBLIC_APP_DOMAIN` | No | App domain for QR codes (default: `panini.entcheneric.com`) |
| `BACKEND_PORT` | No | Flask port number |
| `ENABLE_DEBUG_ROUTES` | No | Enable debug API routes (development only) |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/login` | Login with email + password |
| POST | `/api/logout` | Logout (clear session) |
| GET | `/api/session` | Check session status |
| POST | `/api/create_user` | Register new account |
| POST | `/api/change_password` | Change account password |
| POST | `/api/delete_account` | Delete account permanently |

### Wishlist Data
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/get_wishlist` | Fetch live wishlist from Panini |
| GET | `/api/get_cashed_wishlist` | Fetch cached wishlist |

### Comic Data
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/get_comic_data` | Fetch single comic data |
| GET | `/api/get_cached_comic_data` | Fetch single cached comic data |
| POST | `/api/get_cached_comic_data` | Bulk fetch cached comic data (max 50 URLs) |
| POST | `/api/get_bulk_comic_data` | Bulk fetch comic data with background updates |

### User Data
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/get_priorities` | Get all priorities for a wishlist |
| POST | `/api/set_priority` | Set priority for a comic |
| GET | `/api/get_note` | Get note for a comic |
| POST | `/api/save_note` | Save/update a note |
| GET | `/api/get_all_notes` | Get all notes for a wishlist |
| GET | `/api/get_dependencies` | Get dependencies for a comic |
| POST | `/api/save_dependency` | Save a dependency |
| POST | `/api/get_all_dependencies` | Get all dependencies |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/qr/[wishEnding]` | Generate QR code PNG |

## Security Notice

**Panini passwords are encrypted (reversible), not hashed (irreversible).** This is necessary because the app needs to authenticate with Panini on your behalf to fetch your wishlist. The passwords are encrypted with AES-256-GCM and stored in the database.

Only use this app if your Panini account has no sensitive payment data. We will never access or misuse your data.

## Development

```bash
npm run dev        # Start Next.js dev server
npm run build      # Production build
npm run lint       # Run ESLint
npm test           # Run tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please ensure all tests pass and the build succeeds before submitting.