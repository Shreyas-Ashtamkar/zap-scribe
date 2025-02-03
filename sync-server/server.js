/**
 * File: server.js
 * Description: Real-Time Sync Server for handling WebSocket connections,
 *              collaborative edits, and listing active sessions.
 * 
 * Steps before running:
 * 1. Navigate to the sync-server folder.
 * 2. Run `npm install` to install dependencies.
 * 3. Start the server with `npm start` or `node server.js`.
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*' // Adjust the origin if needed for security
  }
});

// In-memory document store: { documentId: { content: string, version: number } }
const documents = {};

// Handle new socket connections
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Client joins a document session
  socket.on('join', (data) => {
    const { documentId } = data;
    console.log(`Socket ${socket.id} joining document ${documentId}`);
    socket.join(documentId);

    // Initialize the document if it doesn't exist
    if (!documents[documentId]) {
      documents[documentId] = { content: "", version: 0 };
    }
    // Send the current document state to the newly connected client
    socket.emit('sync', documents[documentId]);
  });

  // Handle incoming edits
  socket.on('edit', (data) => {
    const { documentId, diff, clientVersion } = data;
    if (!documents[documentId]) {
      console.log(`Document ${documentId} not found`);
      return;
    }
    const doc = documents[documentId];
    console.log(`Received edit for document ${documentId} from ${socket.id}`);

    // For simplicity, we assume diff is the full new content.
    // (In production, you'd implement OT or CRDT for proper conflict resolution.)
    doc.content = diff;
    doc.version += 1;

    // Broadcast the updated document to all other clients in the same room
    socket.to(documentId).emit('edit', { content: doc.content, version: doc.version });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// New endpoint: List active document sessions
app.get('/api/sessions', (req, res) => {
  // Create an array of session info from the documents store.
  const sessions = Object.keys(documents).map(documentId => ({
    documentId,
    version: documents[documentId].version,
    // Optionally, you could add a snippet of the content or other info here.
  }));
  res.json({ sessions });
});

// Start the server on port 4000
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Real-Time Sync Server running on port ${PORT}`);
});
