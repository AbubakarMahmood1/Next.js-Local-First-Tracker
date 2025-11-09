# Setup Guide

## Prerequisites

- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- npm or pnpm package manager

## Installation Steps

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd Next.js-Local-First-Tracker
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/jobtracker"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### 3. Set Up the Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (for development)
npm run db:push

# OR run migrations (for production)
npm run db:migrate
```

### 4. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Development Workflow

### Database Management

```bash
# View database in Prisma Studio
npm run db:studio

# Create a new migration
npm run db:migrate

# Reset database (⚠️ WARNING: Deletes all data)
npx prisma migrate reset
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:integration
npm run test:e2e
npm run test:offline

# Watch mode
npm run test:watch
```

### Building for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

## Project Structure

```
.
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── applications/      # Application-specific components
│   ├── sync/             # Sync-related components
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Core libraries
│   ├── auth/            # NextAuth configuration
│   ├── db/              # Database clients (Prisma, Dexie)
│   ├── stores/          # Zustand state stores
│   └── sync/            # Sync engine
├── prisma/              # Prisma schema and migrations
└── types/               # TypeScript type definitions
```

## Key Features Implemented

### Local-First Architecture
- ✅ IndexedDB for offline storage (Dexie.js)
- ✅ Optimistic UI updates
- ✅ Background sync with retry logic
- ✅ Conflict resolution (last-write-wins)
- ✅ Network status detection

### Authentication
- ✅ Email/Password authentication
- ✅ Google OAuth (configured via env vars)
- ✅ Session management with NextAuth.js

### Application Management
- ✅ CRUD operations for job applications
- ✅ Status-based filtering (Wishlist, Applied, Screening, Interview, Offer, Rejected)
- ✅ Search functionality
- ✅ Responsive card-based UI

### Sync Engine
- ✅ Automatic background sync every 5 minutes
- ✅ Manual sync trigger
- ✅ Exponential backoff retry (1s, 2s, 4s, 8s, 16s)
- ✅ Batch sync operations (max 50 per batch)
- ✅ Real-time sync status indicators

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Ensure PostgreSQL is running
2. Verify DATABASE_URL in `.env.local`
3. Create the database manually if needed:
   ```bash
   createdb jobtracker
   ```

### Prisma Generate Issues

If `prisma generate` fails:

```bash
# Clear Prisma cache
rm -rf node_modules/.prisma
npx prisma generate
```

### Build Errors

If the build fails:

```bash
# Clean build artifacts
rm -rf .next
npm run build
```

## Next Steps

### Features to Add

1. **Kanban Board View**
   - Drag-and-drop interface
   - Status column organization
   - Real-time updates

2. **Calendar View**
   - Interview scheduling
   - Deadline tracking
   - Follow-up reminders

3. **Analytics Dashboard**
   - Response rate metrics
   - Time-in-stage analysis
   - Application trends

4. **Advanced Features**
   - Email integration
   - Document attachments
   - Contact management
   - Notes and tagging

### Testing

Currently, the testing infrastructure is set up but needs implementation:

- Unit tests for sync logic
- Integration tests for API routes
- E2E tests with Playwright
- Offline scenario testing

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests (when implemented)
4. Submit a pull request

## License

MIT
