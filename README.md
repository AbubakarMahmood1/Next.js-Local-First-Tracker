# Next.js-Local-First-Tracker
I need you to create a CLAUDE.md file for building a local-first job application tracker using Next.js 14+, TypeScript, and modern browser storage APIs.

Project Concept:
A job application tracker that works offline-first, syncs when online, and helps developers manage their job search with a beautiful, responsive UI. This demonstrates modern frontend architecture and state management.

Tech Stack:
- Next.js 14+ with App Router
- TypeScript with strict mode
- Prisma with PostgreSQL (for server)
- IndexedDB via Dexie.js (for client)
- TanStack Query for server state
- Zustand for client state
- Tailwind CSS + shadcn/ui components
- React Hook Form + Zod validation
- NextAuth.js for authentication

Core Features:

1. Application Tracking:
   - Company, position, salary range, location
   - Status workflow: Wishlist → Applied → Screening → Interview → Offer → Rejected
   - Application date, deadline, follow-up dates
   - Notes, contacts, interview questions
   - Document attachments (store references, not files)

2. Local-First Architecture:
   - All data works offline using IndexedDB
   - Optimistic updates with rollback on failure
   - Background sync when connection returns
   - Conflict resolution using last-write-wins + client timestamps
   - Queue failed operations for retry

3. Views and Filters:
   - Kanban board (drag-drop between statuses)
   - Table view with sorting/filtering
   - Calendar view for interviews/deadlines
   - Statistics dashboard (response rate, time in stage, etc.)

4. Smart Features:
   - Auto-save every change locally
   - Bulk actions (archive old applications)
   - Quick templates for follow-up emails
   - Export data to CSV/JSON
   - Keyboard shortcuts for power users

Data Sync Strategy:
```typescript
// Pseudo-code for sync strategy
interface SyncOperation {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'application' | 'note' | 'contact'
  data: any
  timestamp: number
  synced: boolean
}

// 1. Every operation goes to IndexedDB first
// 2. Queue operation for sync
// 3. Batch sync when online
// 4. Handle conflicts with server
```

Component Architecture:
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── applications/
│   │   ├── calendar/
│   │   ├── settings/
│   │   └── layout.tsx
│   └── api/
│       └── sync/
├── components/
│   ├── applications/
│   │   ├── ApplicationCard.tsx
│   │   ├── ApplicationForm.tsx
│   │   └── KanbanBoard.tsx
│   └── ui/ (shadcn components)
├── lib/
│   ├── db/
│   │   ├── indexed-db.ts
│   │   └── prisma.ts
│   ├── sync/
│   │   ├── sync-engine.ts
│   │   └── conflict-resolver.ts
│   └── stores/
│       ├── application-store.ts
│       └── sync-store.ts
└── hooks/
├── useOfflineSync.ts
├── useApplications.ts
└── useKeyboardShortcuts.ts

Key Technical Challenges to Solve:

1. Offline Detection:
   - Navigator.onLine API
   - Periodic ping to ensure real connectivity
   - Visual indicator of offline/syncing/synced state

2. Data Persistence:
   - IndexedDB for structured data
   - LocalStorage for user preferences
   - SessionStorage for temporary form data

3. Sync Queue:
   - Maintain order of operations
   - Retry with exponential backoff
   - Batch operations for efficiency
   - Show sync progress to user

4. Performance:
   - Virtual scrolling for large lists
   - Lazy load routes
   - Optimize bundle size
   - Use React.memo strategically
   - Implement pagination even for local data

UI/UX Requirements:
- Clean, professional design using shadcn/ui
- Dark mode support
- Mobile responsive (actually test on phone)
- Loading skeletons, not spinners
- Optimistic UI updates everywhere
- Inline editing where appropriate
- Undo/redo for critical operations

Testing Strategy:
- Unit tests for sync logic
- Integration tests for API routes
- E2E tests with Playwright for critical flows
- Test offline scenarios explicitly

Common Pitfalls to Avoid:
- Don't sync on every keystroke (debounce)
- Don't store sensitive data in localStorage
- Don't trust client timestamps alone
- Don't show sync errors as blocking modals
- Don't forget to cleanup IndexedDB
- Don't make offline mode feel "degraded"

Create a comprehensive CLAUDE.md that explains the local-first architecture, provides complete code examples for the sync engine, demonstrates proper TypeScript patterns, and includes strategies for testing offline scenarios. Focus on making the offline experience feel as smooth as online.