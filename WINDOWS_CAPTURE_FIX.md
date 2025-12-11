# Windows Capture & Socket Connection Fix

## Issue Analysis
The "Capture Now" feature was failing with "App is not running" because the server could not verify the desktop app's connection status. This was caused by:
1.  **Missing Custom Server**: The project was running with default `next dev`, which does not support the custom Socket.IO server required for real-time features.
2.  **Missing Connection Flag**: The Socket.IO handler was not marking the socket as `isDesktopApp = true`, which the API relies on to verify the connection.

## Fixes Implemented

### 1. Restored `server.js`
Created a custom Node.js server (`server.js`) that:
- Initializes the Next.js application.
- Creates an HTTP server.
- **Initializes Socket.IO** with the correct CORS and path configuration.
- Sets `global.io` so API routes can access the socket instance.
- Implements the `desktop-app-ready` event handler to set `socket.isDesktopApp = true`.

### 2. Updated `package.json`
Modified the start scripts to use the custom server:
- `dev`: `cross-env NEXT_DISABLE_REACT_DEV_OVERLAY=1 node server.js`
- `start`: `NODE_ENV=production node server.js`

### 3. Socket Logic Update
The `desktop-app-ready` handler in `server.js` now explicitly marks the socket:
```javascript
socket.on('desktop-app-ready', (data) => {
  // ...
  socket.isDesktopApp = true; // Critical for API verification
  // ...
});
```

## How Windows Capture Works

### Periodic Capture (Raw Capture)
1.  **Trigger**: `setInterval` in `windows-app/main.js` (default 60s).
2.  **Capture**: Uses `screenshot-desktop` (native) or `desktopCapturer` (Electron).
3.  **Upload**: Sends HTTP POST to `/api/productivity/sync`.
4.  **Dependency**: Requires valid `authToken` and reachable HTTP server. Does NOT strictly require Socket.IO (but `server.js` ensures the server is running correctly).

### Instant Capture (Capture Now)
1.  **Request**: Admin clicks "Capture Now" -> POST `/api/productivity/instant-capture`.
2.  **Verification**: API checks `global.io` for a socket in `user:{userId}` room with `isDesktopApp === true`.
3.  **Signal**: API emits `instant-capture-request` via Socket.IO.
4.  **Capture**: Desktop app receives event -> takes screenshot -> POST `/api/productivity/instant-capture/upload`.
5.  **Result**: Server updates DB and notifies frontend via Socket.IO.

## Verification
1.  Restart the server: `npm run dev`.
2.  Restart the Windows desktop app.
3.  The app should now connect to Socket.IO (check server logs for "Desktop app registered... isDesktopApp=true").
4.  "Capture Now" should work immediately.
