# Building Local-First Applications with Next.js

## Introduction

This document provides a comprehensive guide to the local-first architecture implemented in this job application tracker. Use this as a reference for building similar offline-first applications.

## Core Principles of Local-First Software

1. **Offline-First**: The app works without internet connectivity
2. **Fast**: No waiting for server responses
3. **Reliable**: Data persists even if the server is down
4. **Collaborative**: Eventually syncs with server when online
5. **User Ownership**: Users control their data

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  (React Components + Zustand Stores + Custom Hooks)     │
└───────────────┬─────────────────────────────────────────┘
                │
                │ Read/Write
                ▼
┌─────────────────────────────────────────────────────────┐
│              IndexedDB (Dexie.js)                       │
│  • Primary data storage                                 │
│  • Works completely offline                             │
│  • Structured NoSQL database                            │
└───────────────┬─────────────────────────────────────────┘
                │
                │ Sync Queue
                ▼
┌─────────────────────────────────────────────────────────┐
│              Sync Engine                                 │
│  • Background synchronization                           │
│  • Conflict resolution                                  │
│  • Exponential backoff retry                            │
│  • Batch operations                                     │
└───────────────┬─────────────────────────────────────────┘
                │
                │ HTTPS
                ▼
┌─────────────────────────────────────────────────────────┐
│              Server (Next.js API Routes)                │
│  • PostgreSQL for authoritative data                    │
│  • Authentication & authorization                       │
│  • Conflict resolution validation                       │
└─────────────────────────────────────────────────────────┘
```

## Implementation Guide

### 1. IndexedDB Schema (Dexie.js)

**Location**: `lib/db/indexed-db.ts`

Dexie.js provides a clean wrapper around IndexedDB:

```typescript
export class JobTrackerDB extends Dexie {
  applications!: Table<Application, string>;
  syncQueue!: Table<SyncOperation, string>;

  constructor() {
    super("JobTrackerDB");

    this.version(1).stores({
      // Define indexes for efficient queries
      applications: "id, userId, status, [userId+status], updatedAt",
      syncQueue: "id, synced, timestamp, [synced+timestamp]",
    });
  }
}
```

**Key Concepts**:
- Compound indexes `[userId+status]` for efficient filtered queries
- String IDs use `crypto.randomUUID()` for client-side generation
- Timestamps track data freshness

### 2. Optimistic Updates Pattern

**Location**: `lib/stores/application-store.ts`

All mutations follow this pattern:

```typescript
async addApplication(data) {
  // 1. Generate client-side ID
  const id = crypto.randomUUID();

  // 2. Write to IndexedDB immediately
  await db.applications.add({ ...data, id });

  // 3. Update UI state (optimistic)
  set(state => ({
    applications: [...state.applications, application]
  }));

  // 4. Queue for sync
  await dbHelpers.addToSyncQueue("CREATE", "application", id, data);

  // 5. Sync happens in background
  // If it fails, retry logic handles it automatically
}
```

**Benefits**:
- Instant UI feedback
- No loading spinners for CRUD operations
- Graceful degradation if offline

### 3. Sync Engine

**Location**: `lib/sync/sync-engine.ts`

The sync engine handles background synchronization with sophisticated retry logic:

```typescript
class SyncEngine {
  async sync() {
    // Get operations that haven't synced yet
    const operations = await dbHelpers.getUnsyncedOperations();

    // Process in batches for efficiency
    const batches = this.createBatches(operations, 50);

    for (const batch of batches) {
      await this.processBatch(batch);
    }
  }

  async processOperation(operation: SyncOperation) {
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        body: JSON.stringify(operation),
      });

      const result = await response.json();

      // Handle conflicts
      if (result.conflict) {
        await this.resolveConflict(operation, result.serverData);
      }

      // Mark as synced
      await dbHelpers.markOperationSynced(operation.id);

    } catch (error) {
      // Exponential backoff retry
      const delay = RETRY_DELAYS[operation.retryCount];
      await dbHelpers.incrementRetryCount(operation.id);
      setTimeout(() => this.sync(), delay);
    }
  }
}
```

**Features**:
- Batch operations (max 50 per request)
- Exponential backoff: 1s → 2s → 4s → 8s → 16s
- Max 5 retry attempts
- Automatic conflict detection

### 4. Conflict Resolution

**Strategy**: Last-Write-Wins (LWW)

```typescript
async resolveConflict(localOp: SyncOperation, serverData: any) {
  const serverTime = new Date(serverData.updatedAt).getTime();
  const localTime = localOp.timestamp;

  if (serverTime > localTime) {
    // Server wins - update local data
    await db.applications.put({
      ...serverData,
      lastSyncedAt: new Date(),
    });
  } else {
    // Local wins - server will be updated by sync operation
    // Do nothing, let the sync complete
  }
}
```

**Alternative Strategies** (for different use cases):

1. **Operational Transformation (OT)**: For collaborative editing
2. **CRDTs**: For conflict-free replicated data
3. **Version Vectors**: For detecting concurrent edits
4. **Custom Merge Functions**: Application-specific logic

### 5. Network Status Detection

**Location**: `hooks/useNetworkStatus.ts`

Don't trust `navigator.onLine` alone:

```typescript
export function useNetworkStatus() {
  const checkRealConnectivity = async () => {
    // Check browser status
    if (!navigator.onLine) {
      setOnlineStatus(false);
      return;
    }

    // Verify with server ping
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch("/api/health", {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setOnlineStatus(true);
    } catch {
      setOnlineStatus(false);
    }
  };

  // Check every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkRealConnectivity, 30000);
    return () => clearInterval(interval);
  }, []);
}
```

**Why This Matters**:
- `navigator.onLine` can be unreliable
- Server might be down even if network is up
- Firewall or proxy might block requests

### 6. State Management with Zustand

**Location**: `lib/stores/application-store.ts`

Zustand provides lightweight state management:

```typescript
export const useApplicationStore = create<ApplicationStore>((set, get) => ({
  applications: [],

  // Computed values
  getFilteredApplications: () => {
    const { applications, filterStatus, searchQuery } = get();

    return applications
      .filter(app =>
        (filterStatus === "ALL" || app.status === filterStatus) &&
        (app.company.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  },

  // Actions
  updateApplication: async (id, updates) => {
    // Update IndexedDB
    await db.applications.update(id, updates);

    // Queue for sync
    await dbHelpers.addToSyncQueue("UPDATE", "application", id, updates);

    // Update local state
    set(state => ({
      applications: state.applications.map(app =>
        app.id === id ? { ...app, ...updates } : app
      ),
    }));
  },
}));
```

**Benefits**:
- No boilerplate (unlike Redux)
- TypeScript support
- DevTools integration
- Middleware support

### 7. API Routes for Sync

**Location**: `app/api/sync/route.ts`

The server validates and processes sync operations:

```typescript
export async function POST(request: NextRequest) {
  const { operation, entity, entityId, data, timestamp } = await request.json();

  if (operation === "UPDATE") {
    const existing = await prisma.application.findUnique({
      where: { id: entityId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check for conflict
    const serverTime = new Date(existing.updatedAt).getTime();
    if (serverTime > timestamp) {
      // Conflict detected - return server data
      return NextResponse.json({
        success: false,
        conflict: true,
        serverData: existing,
      });
    }

    // No conflict - apply update
    const updated = await prisma.application.update({
      where: { id: entityId },
      data: { ...data, version: existing.version + 1 },
    });

    return NextResponse.json({
      success: true,
      result: updated,
    });
  }
}
```

**Security Considerations**:
- Always verify user owns the data
- Validate all input with Zod schemas
- Use prepared statements (Prisma handles this)
- Rate limit sync endpoints

### 8. Offline Form Handling

**Best Practices**:

```typescript
// Save draft to sessionStorage on every change
const saveDraft = (formData: FormData) => {
  sessionStorage.setItem("draft:application", JSON.stringify(formData));
};

// Restore draft on mount
useEffect(() => {
  const draft = sessionStorage.getItem("draft:application");
  if (draft) {
    setFormData(JSON.parse(draft));
  }
}, []);

// Clear draft on successful submit
const handleSubmit = async (data: FormData) => {
  await createApplication(data);
  sessionStorage.removeItem("draft:application");
};
```

## Performance Optimizations

### 1. Virtual Scrolling

For large lists (1000+ items):

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

function ApplicationList({ applications }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: applications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated row height
  });

  return (
    <div ref={parentRef} style={{ height: "600px", overflow: "auto" }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <ApplicationCard
            key={virtualRow.key}
            application={applications[virtualRow.index]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

### 2. Debounce Sync Operations

```typescript
const debouncedSync = useMemo(
  () => debounce(() => syncEngine.sync(), 500),
  []
);

// Only sync 500ms after last change
const handleChange = (updates: Partial<Application>) => {
  updateApplication(id, updates);
  debouncedSync();
};
```

### 3. IndexedDB Cleanup

Prevent unbounded growth:

```typescript
// Delete old synced operations
async function cleanupSyncQueue() {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  await db.syncQueue
    .where("synced").equals(1)
    .and(op => op.timestamp < thirtyDaysAgo)
    .delete();
}

// Run periodically
setInterval(cleanupSyncQueue, 24 * 60 * 60 * 1000); // Daily
```

## Testing Offline Scenarios

### 1. Chrome DevTools

1. Open DevTools → Network tab
2. Select "Offline" from throttling dropdown
3. Test your app's behavior

### 2. Service Worker Test

```typescript
// Test offline functionality programmatically
if ("serviceWorker" in navigator) {
  // Simulate offline
  navigator.serviceWorker.controller?.postMessage({
    type: "TEST_OFFLINE",
  });
}
```

### 3. Automated Tests

```typescript
// Playwright E2E test
test("should work offline", async ({ page, context }) => {
  // Go online, load app, create data
  await page.goto("/applications");
  await page.fill("[name=company]", "Test Corp");
  await page.click("button[type=submit]");

  // Go offline
  await context.setOffline(true);

  // Verify data still accessible
  await expect(page.locator("text=Test Corp")).toBeVisible();

  // Create new data offline
  await page.fill("[name=company]", "Offline Corp");
  await page.click("button[type=submit]");

  // Go online
  await context.setOffline(false);

  // Wait for sync
  await page.waitForSelector("text=Synced");

  // Verify synced to server
  const response = await page.request.get("/api/applications");
  const data = await response.json();
  expect(data.some(app => app.company === "Offline Corp")).toBeTruthy();
});
```

## Common Pitfalls and Solutions

### ❌ Don't: Sync on Every Keystroke

```typescript
// BAD: Creates too many sync operations
<input onChange={(e) => {
  updateApplication(id, { company: e.target.value });
  syncEngine.sync(); // Syncs on EVERY keystroke!
}} />
```

```typescript
// GOOD: Debounce updates
const debouncedUpdate = useMemo(
  () => debounce((value) => {
    updateApplication(id, { company: value });
  }, 500),
  [id]
);

<input onChange={(e) => debouncedUpdate(e.target.value)} />
```

### ❌ Don't: Store Sensitive Data in IndexedDB Unencrypted

```typescript
// BAD: Plain text password in IndexedDB
await db.users.add({
  email: "user@example.com",
  password: "mypassword123", // ⚠️ Security risk!
});
```

```typescript
// GOOD: Store only authentication tokens
// Real auth happens on server
await db.session.add({
  userId: "user-id",
  sessionToken: "encrypted-token",
});
```

### ❌ Don't: Trust Client Timestamps Alone

```typescript
// BAD: Client time can be wrong
const isNewer = clientTimestamp > serverTimestamp;
```

```typescript
// GOOD: Use version numbers + timestamps
const conflict = {
  version: serverVersion !== clientVersion,
  time: serverTimestamp > clientTimestamp,
};

if (conflict.version || conflict.time) {
  // Resolve conflict
}
```

## Production Checklist

- [ ] Implement proper authentication
- [ ] Add input validation (Zod schemas)
- [ ] Set up error monitoring (Sentry)
- [ ] Configure rate limiting
- [ ] Add database indexes for performance
- [ ] Implement data backup strategy
- [ ] Test on slow networks (3G, 2G)
- [ ] Test on mobile devices
- [ ] Add proper error boundaries
- [ ] Implement undo/redo for critical operations
- [ ] Add user data export functionality
- [ ] Set up automated testing
- [ ] Configure proper CORS policies
- [ ] Add CSP headers
- [ ] Enable HTTPS only
- [ ] Implement audit logs for sensitive operations

## Resources

### Libraries Used
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [TanStack Query](https://tanstack.com/query) - Server state
- [Prisma](https://www.prisma.io/) - Database ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication

### Further Reading
- [Local-First Software](https://www.inkandswitch.com/local-first/) - Ink & Switch
- [Offline First](https://offlinefirst.org/) - Community resources
- [CRDTs](https://crdt.tech/) - Conflict-free data types
- [Service Workers](https://web.dev/service-workers/) - Advanced offline support

## Conclusion

Building local-first applications requires careful consideration of:
1. Data persistence strategy
2. Conflict resolution approach
3. Network reliability
4. User experience during offline periods

This architecture provides a solid foundation for building resilient, user-centric applications that work anywhere, anytime.
