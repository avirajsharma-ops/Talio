# Talio HRMS - AI Coding Agent Instructions

## Project Overview
Talio is a comprehensive Next.js 14 (App Router) HRMS with a custom Node server integrating Socket.IO for realtime features and MAYA, an AI assistant with full HRMS action capabilities (60+ operations across all modules).

## Architecture & Key Components

### Server Runtime
- **Custom server**: `server.js` creates HTTP server + Next.js handler + Socket.IO instance
- **Critical pattern**: Socket.IO instance stored at `global.io` for API route access
- **Socket path**: `/api/socketio` with room-based messaging (`chat:${chatId}`, `user:${userId}`)
- **MAYA realtime**: Special socket events (`maya:*`) for AI assistant communications and screen monitoring

### Database Layer
- **Connection**: `lib/mongodb.js` - cached Mongoose connection (checks `MONGODB_URI` from `.env`)
- **Models**: 50+ Mongoose schemas in `models/` including MAYA-specific models (`MayaMessage`, `MayaActionLog`, `MayaFormattedData`, etc.)
- **Data access**: `lib/mayaDataAccess.js` provides role-based filtered queries for MAYA
- **Auth helpers**: `lib/mayaPermissions.js` - check if user can access target data based on role/hierarchy

### Frontend Structure
- **App Router**: All pages/routes under `app/` - NO pages/ directory
- **Module organization**: `app/dashboard/<module>/` for UI, `app/api/<module>/` for endpoints
- **Major modules**: employees, attendance, leave, payroll, performance, recruitment, tasks, expenses, travel, helpdesk, assets, documents, policies, announcements, chat, maya

### MAYA AI Assistant (Critical System Component)
- **Capabilities**: 60+ actions across ALL HRMS modules - can perform any user action
- **Context system**: `lib/mayaContext.js` + `lib/mayaVectorContext.js` for vector search over HRMS data
- **Message relay**: `app/api/maya/relay-message/route.js` - MAYA sends messages between users via Socket.IO
- **Screen monitoring**: `app/api/maya/monitor-screen/route.js` + `submit-screenshot/route.js` for realtime screen capture
- **Action logging**: All MAYA actions logged to `MayaActionLog` model

## Development Workflows

### Local Development
```bash
npm run dev              # Recommended: runs node server.js (Next + Socket.IO)
npm run dev:next         # Frontend-only: next dev (NO Socket.IO initialization)
```
**Use `npm run dev` when working on chat, realtime features, or MAYA integrations.**

### Building & Production
```bash
npm run build            # Uses SKIP_ENV_VALIDATION=true next build
npm run start            # NODE_ENV=production node server.js
```

### Database & Environment Setup
```bash
npm run seed                    # Seed database (scripts/seed.js)
npm run check-env              # Verify environment variables
npm run setup-local            # Setup local .env
npm run migrate                # MongoDB Atlas migration helpers
npm run migrate:levelnames     # Migrate designation level names
```

### Vector Search Setup (MAYA Feature)
```bash
# Interactive wizard for MongoDB Atlas vector search indexes
node scripts/setup-vector-db.js

# Generate embeddings (choose one)
node scripts/generate-embeddings-openai.js    # Requires OPENAI_API_KEY
node scripts/generate-embeddings-free.js      # Uses @xenova/transformers (no cost)

# Test vector search
node scripts/test-vector-search.js
```

## Code Patterns & Conventions

### Socket.IO Realtime Events
**Pattern**: API routes emit events after DB writes
```javascript
// Example from app/api/chat/[chatId]/messages/route.js
const io = global.io;
if (io) {
  io.to(`chat:${chatId}`).emit('new-message', messagePayload);
  io.to(`user:${recipientId}`).emit('new-message', messagePayload);
}
```
**Client-side**: Connect via `socket.io-client` and join rooms (`socket.emit('join-chat', chatId)`)

### API Route Structure
- **Auth**: JWT verification via `jose` library (`jwtVerify(token, JWT_SECRET)`)
- **Response**: Use `NextResponse.json()` for all responses
- **DB connection**: Call `await connectDB()` before any DB operations
- **Role checks**: Use `lib/mayaPermissions.js` functions or check `user.role` against hierarchy

### Role Hierarchy
`god_admin` > `admin` > `hr` > `department_head` > `manager` > `employee` > `user`

### MAYA Integration Points
When adding features that MAYA should control:
1. Create action in relevant API route (e.g., `app/api/leave/route.js`)
2. Add action definition to `lib/mayaDataAccess.js` if data access needed
3. Update MAYA context in `lib/mayaContext.js` with new capability
4. Log action in `MayaActionLog` model for audit trail

## Critical Dependencies

### Realtime & Notifications
- `socket.io` / `socket.io-client` - realtime communication
- `firebase-admin` - Firebase Cloud Messaging for push notifications
- Server-side push: `lib/pushNotification.js` - Firebase push notification wrapper

### AI & Vector Search
- `openai` - embeddings and MAYA chat completions
- `@xenova/transformers` - free local embeddings alternative
- MongoDB Atlas vector search indexes required (see `scripts/setup-vector-db.js`)

### Auth & Security
- `next-auth` - authentication framework
- `jose` - JWT verification (used instead of jsonwebtoken in API routes)
- `bcryptjs` - password hashing

### Data Processing
- `mongoose` - MongoDB ODM with global connection caching
- `sharp` - image processing
- `multer` - file uploads
- `jspdf` / `jspdf-autotable` - PDF generation
- `xlsx` - Excel export

## Environment Variables (`.env`)

**Required for core functionality:**
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB_NAME` - Database name for vector search
- `JWT_SECRET` - JWT signing secret
- `NEXTAUTH_SECRET` - NextAuth session secret
- `NEXTAUTH_URL` - App URL for NextAuth

**Required for MAYA:**
- `OPENAI_API_KEY` - OpenAI API key (or use free embeddings)
- `NEXT_PUBLIC_OPENAI_API_KEY` - OpenAI client-side key
- `NEXT_PUBLIC_OPENAI_MODEL` - Model to use (default: gpt-4o)

**Required for notifications:**
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key

## Docker Deployment
- **Dockerfile**: Multi-stage build with Node 20 Alpine
- **docker-compose.yml**: Includes nginx reverse proxy + certbot for SSL
- **Build args**: `NEXT_PUBLIC_*` vars must be passed as build args (embedded in client bundle)
- **Runtime env**: Other vars passed via `environment` section in docker-compose

## Common Tasks

### Adding a New Module
1. Create `app/dashboard/<module>/page.js` for UI
2. Create `app/api/<module>/route.js` for CRUD endpoints
3. Create `models/<Module>.js` for Mongoose schema
4. Add navigation link to `components/Sidebar.js`
5. Consider MAYA integration if actions are needed

### Emitting Realtime Events
```javascript
// Always check if global.io exists
if (global.io) {
  global.io.to(`room:${id}`).emit('event-name', data);
}
```

### Debugging Socket.IO
- Check `server.js` for socket event handlers
- Socket logs use prefixes: `✅`, `🔐`, `👤`, `📨`, `📸`, `❌`
- Use `npm run dev` (NOT `npm run dev:next`) to initialize sockets

### Testing Vector Search
1. Ensure MongoDB Atlas vector search indexes created (see `HOW_TO_CREATE_VECTOR_INDEX.md`)
2. Run `node scripts/generate-embeddings-*.js` to populate embeddings
3. Test with `node scripts/test-vector-search.js`

## High-Value Files to Reference

**Server & Sockets**: `server.js`, `lib/socket.js`
**Database**: `lib/mongodb.js`, `models/` (50+ schemas)
**MAYA Core**: `lib/mayaContext.js`, `lib/mayaDataAccess.js`, `lib/mayaPermissions.js`, `lib/mayaVectorContext.js`
**API Examples**: `app/api/maya/relay-message/route.js`, `app/api/chat/[chatId]/messages/route.js`
**Scripts**: `scripts/setup-vector-db.js`, `scripts/seed.js`, `scripts/generate-embeddings-*.js`
**Config**: `package.json`, `Dockerfile`, `docker-compose.yml`

---
*For specific MAYA capabilities or module details, check the extensive `.md` documentation files in root.* 
