# Zap Scribe

Zap Scribe is a collaborative code editing prototype with three services:
- `client`: React + Monaco Editor frontend.
- `file-server`: Express service for file upload/download.
- `sync-server`: Express + Socket.IO service for session state and live sync.

## Current Product Shape

- Users upload a file through the client UI.
- Uploaded files are stored by `file-server` and exposed through `/uploads`.
- The client joins a document room over Socket.IO.
- `sync-server` manages in-memory session documents and exposes active sessions through `GET /api/sessions`.

## Architecture

- Frontend:
  - React app in `client/src/App.js`
  - Monaco editor for source editing
  - Axios for HTTP requests to file/session APIs
  - Socket.IO client for real-time collaboration
- Backend:
  - `file-server/server.js` on port `5000`
  - `sync-server/server.js` on port `4000`
  - CORS enabled for local development

## Run Locally

Open three terminals:

1. Start file server:

   ```bash
   cd file-server
   npm ci
   mkdir -p uploads
   npm start
   ```

2. Start sync server:

   ```bash
   cd sync-server
   npm ci
   npm start
   ```

3. Start client:

   ```bash
   cd client
   npm ci
   npm start
   ```

Client runs on `http://localhost:3000`.

## Validation Commands

- Client build:

  ```bash
  cd client
  npm run build
  ```

- Client tests:

  ```bash
  cd client
  CI=true npm test -- --watch=false
  ```

## Future Goal: Efficient, Useful Collaboration Platform

The next major goal is to evolve Zap Scribe from prototype to a dependable multi-user coding workspace that is:
- Reliable for concurrent editing.
- Efficient in bandwidth and compute usage.
- Useful for real engineering workflows.

### 6-Month Product Direction

1. Collaboration Correctness
   - Replace full-content broadcasts with operation-based sync (OT or CRDT).
   - Add document identity and version checks to every edit event.
   - Persist document state in a database instead of memory-only storage.

2. Performance and Scale
   - Introduce delta-based updates and compression for large files.
   - Add Redis adapter for horizontal Socket.IO scaling.
   - Add rate limiting and payload size guards on upload and sync endpoints.

3. Workflow Utility
   - Add auth + role-based access (owner/editor/viewer).
   - Add project spaces with file trees instead of single-file sessions.
   - Add session history and restore points.

4. Operability
   - Add structured logging, health checks, and metrics.
   - Add CI gates for build, tests, lint, and security scans.
   - Add deployment manifests and environment-based configuration.

### Success Metrics

- p95 sync latency < 150ms for active sessions.
- Zero data loss across server restarts.
- 99.9% successful document join/edit flows.
- Reduced average payload size per edit by at least 70% vs full-content sync.

## Known Constraints (Current State)

- Session state is stored in memory and resets on restart.
- Current sync path is simplified and not conflict-safe for true concurrent edits.
- Client `edit` events currently omit `documentId`, so `sync-server` does not apply/broadcast edits for joined sessions.
- No authentication or authorization yet.

## Repository Layout

```text
.
├── client/
├── file-server/
└── sync-server/
```
