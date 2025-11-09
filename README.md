# 🎯 Next.js Local-First Job Tracker

A modern, **offline-first** job application tracker built with Next.js 14+ that works seamlessly whether you're online or offline. Track your job applications, manage interviews, and never lose your data—even without an internet connection.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

### 📊 Application Management
- **Comprehensive Tracking**: Company, position, salary range, location, and status
- **Smart Workflow**: Wishlist → Applied → Screening → Interview → Offer → Rejected
- **Timeline Management**: Application dates, deadlines, and follow-up reminders
- **Rich Details**: Notes, contacts, interview questions, and document references

### 🔄 Local-First Architecture
- **True Offline Support**: All features work without internet using IndexedDB
- **Optimistic Updates**: Instant UI feedback with automatic rollback on errors
- **Background Sync**: Seamlessly syncs when connection returns
- **Conflict Resolution**: Last-write-wins strategy with client-side timestamps
- **Retry Queue**: Failed operations automatically retry with exponential backoff

### 🎨 Multiple Views
- **Kanban Board**: Drag-and-drop applications between status columns
- **Table View**: Sortable, filterable data grid for power users
- **Calendar View**: Visualize interviews and deadlines at a glance
- **Analytics Dashboard**: Track response rates, time-in-stage, and application trends

### 🚀 Power Features
- **Auto-save**: Every change is saved locally in real-time
- **Bulk Operations**: Archive or update multiple applications at once
- **Quick Templates**: Pre-written follow-up email templates
- **Data Export**: Export your data to CSV or JSON
- **Keyboard Shortcuts**: Navigate and manage applications efficiently
- **Dark Mode**: Easy on the eyes during late-night job searches

## 🛠 Tech Stack

### Frontend
- **[Next.js 14+](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development with strict mode
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible components

### State Management
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight client state management
- **[TanStack Query](https://tanstack.com/query)** - Server state synchronization
- **[Dexie.js](https://dexie.org/)** - IndexedDB wrapper for local storage

### Backend & Database
- **[Prisma](https://www.prisma.io/)** - Type-safe ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[NextAuth.js](https://next-auth.js.org/)** - Authentication solution

### Forms & Validation
- **[React Hook Form](https://react-hook-form.com/)** - Performant form management
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation

## 🏗 Architecture

### Local-First Design Pattern

```typescript
// Every operation follows this pattern:
1. Update IndexedDB immediately (offline-first)
2. Queue sync operation
3. Update UI optimistically
4. Sync to server when online
5. Resolve conflicts if any
```

### Sync Engine Strategy

```typescript
interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'application' | 'note' | 'contact';
  data: any;
  timestamp: number;
  synced: boolean;
  retryCount: number;
}

// Sync process:
// 1. All operations write to IndexedDB first
// 2. Operations queued in sync store
// 3. Batch sync when online (max 50 ops)
// 4. Server validates and resolves conflicts
// 5. Client updates with server truth
```

### Project Structure

```
src/
├── app/
│   ├── (auth)/              # Authentication routes
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # Main application
│   │   ├── applications/    # Application management
│   │   ├── calendar/        # Calendar view
│   │   ├── analytics/       # Statistics dashboard
│   │   ├── settings/        # User preferences
│   │   └── layout.tsx       # Dashboard layout
│   └── api/
│       ├── sync/            # Sync endpoints
│       └── applications/    # CRUD endpoints
│
├── components/
│   ├── applications/
│   │   ├── ApplicationCard.tsx
│   │   ├── ApplicationForm.tsx
│   │   ├── KanbanBoard.tsx
│   │   └── TableView.tsx
│   ├── calendar/
│   │   └── CalendarView.tsx
│   └── ui/                  # shadcn components
│
├── lib/
│   ├── db/
│   │   ├── indexed-db.ts    # IndexedDB schema
│   │   └── prisma.ts        # Prisma client
│   ├── sync/
│   │   ├── sync-engine.ts   # Core sync logic
│   │   ├── conflict-resolver.ts
│   │   └── queue-manager.ts
│   └── stores/
│       ├── application-store.ts
│       └── sync-store.ts
│
└── hooks/
    ├── useOfflineSync.ts
    ├── useApplications.ts
    ├── useKeyboardShortcuts.ts
    └── useNetworkStatus.ts
```

## 🚦 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher
- **pnpm** (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/Next.js-Local-First-Tracker.git
cd Next.js-Local-First-Tracker

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# Set up the database
pnpm db:push

# Run database migrations
pnpm db:migrate

# Start the development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/jobtracker"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Test offline scenarios
pnpm test:offline

# Run all tests with coverage
pnpm test:coverage
```

### Testing Offline Functionality

The project includes specific tests for offline scenarios:

```bash
# Simulate offline mode
pnpm test:offline

# Test sync conflict resolution
pnpm test:sync
```

## 🎯 Key Technical Highlights

### 1. Offline Detection
- Uses `navigator.onLine` API with periodic server pings
- Visual indicators for offline/syncing/synced states
- Graceful degradation of online-only features

### 2. Data Persistence Strategy
- **IndexedDB** (via Dexie.js) - Application data, sync queue
- **localStorage** - User preferences, UI state
- **sessionStorage** - Temporary form data, draft state

### 3. Sync Queue Management
- Maintains operation order with timestamps
- Exponential backoff retry (1s, 2s, 4s, 8s, 16s)
- Batch operations for network efficiency
- Real-time progress indicators

### 4. Performance Optimizations
- Virtual scrolling for large application lists
- Route-based code splitting
- Strategic use of `React.memo` and `useMemo`
- Optimized bundle size with tree-shaking
- Pagination for local data (100 items per page)

## 💡 Development Best Practices

### Avoid Common Pitfalls

✅ **DO:**
- Debounce sync operations (500ms minimum)
- Use server timestamps as source of truth
- Show sync errors as non-blocking notifications
- Cleanup IndexedDB periodically
- Make offline mode feel seamless

❌ **DON'T:**
- Sync on every keystroke
- Store sensitive data in localStorage
- Trust client timestamps alone
- Block UI with sync error modals
- Let IndexedDB grow unbounded

### Code Quality
- **TypeScript strict mode** enabled
- **ESLint** with recommended rules
- **Prettier** for consistent formatting
- **Husky** for pre-commit hooks
- **Conventional Commits** for clear history

## 🎨 UI/UX Principles

- **Clean & Professional**: Minimal, focused design
- **Dark Mode**: Automatic theme switching
- **Mobile First**: Fully responsive on all devices
- **Loading States**: Skeleton screens, not spinners
- **Optimistic UI**: Instant feedback everywhere
- **Inline Editing**: Quick updates without modal dialogs
- **Undo/Redo**: For critical operations

## 📈 Roadmap

- [ ] Mobile apps (React Native)
- [ ] Chrome extension for quick adds
- [ ] AI-powered resume matching
- [ ] Email integration for auto-tracking
- [ ] Team collaboration features
- [ ] Interview preparation tools
- [ ] Salary negotiation insights

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

```bash
# Fork the repository
# Create your feature branch
git checkout -b feature/amazing-feature

# Commit your changes
git commit -m 'Add some amazing feature'

# Push to the branch
git push origin feature/amazing-feature

# Open a Pull Request
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn](https://twitter.com/shadcn) for the amazing UI components
- [Dexie.js](https://dexie.org/) team for the excellent IndexedDB wrapper
- [Vercel](https://vercel.com) for the Next.js framework
- The open-source community for inspiration and tools

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/Next.js-Local-First-Tracker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/Next.js-Local-First-Tracker/discussions)
- **Twitter**: [@yourhandle](https://twitter.com/yourhandle)

---

<p align="center">Made with ❤️ by developers, for developers</p>
<p align="center">⭐ Star this repo if you find it helpful!</p>
