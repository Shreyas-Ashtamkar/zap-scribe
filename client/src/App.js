/**
 * File: App.js
 * Description: Main React component for the collaborative editor.
 * 
 * Steps before running:
 * 1. Navigate to the client folder.
 * 2. Run `npm install` to install dependencies.
 * 3. Make sure the File Server is running on port 5000 and the Sync Server on port 4000.
 * 4. Start the client with `npm start`.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

function App() {
  const [file, setFile] = useState(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [docId, setDocId] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [socket, setSocket] = useState(null);
  const [version, setVersion] = useState(0);

  // Establish WebSocket connection when a document is joined
  useEffect(() => {
    if (docId) {
      const newSocket = io('http://localhost:4000');
      setSocket(newSocket);

      // Join the document session
      newSocket.emit('join', { documentId: docId });

      // Listen for the initial sync message
      newSocket.on('sync', (data) => {
        console.log('Received sync data:', data);
        setEditorContent(data.content);
        setVersion(data.version);
      });

      // Listen for real-time edits from others
      newSocket.on('edit', (data) => {
        console.log('Received edit:', data);
        setEditorContent(data.content);
        setVersion(data.version);
      });

      return () => newSocket.close();
    }
  }, [docId]);

  // Handle file selection from the input
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Upload file to the File Server
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5000/api/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadedFileInfo(res.data.file);
      alert('File uploaded successfully!');
    } catch (error) {
      console.error(error);
      alert('File upload failed!');
      setVersion(version + 1);
    }
  };

  // Join the document session. Here we use the uploaded file's filename as the document ID.
  const handleJoinDocument = () => {
    if (uploadedFileInfo && uploadedFileInfo.filename) {
      setDocId(uploadedFileInfo.filename);
    } else if (docId) {
      // Already have a docId; nothing to do.
    } else {
      alert('Please upload a file first or manually enter a document ID.');
    }
  };

  // Handle changes in the text editor.
  // For simplicity, we send the entire text as the "diff".
  const handleEditorChange = (e) => {
    const newContent = e.target.value;
    setEditorContent(newContent);

    if (socket && docId) {
      socket.emit('edit', { documentId: docId, diff: newContent, clientVersion: version });
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Collaborative Editor</h1>

      <section>
        <h2>File Upload</h2>
        <form onSubmit={handleUpload}>
          <input type="file" onChange={handleFileChange} />
          <button type="submit">Upload File</button>
        </form>
      </section>

      <section>
        <h2>Join Document Session</h2>
        <input
          type="text"
          placeholder="Enter Document ID"
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
        />
        <button onClick={handleJoinDocument}>Join Document</button>
        <p>Document ID: {docId}</p>
      </section>

      <section>
        <h2>Editor</h2>
        <textarea
          style={{ width: '100%', height: '300px' }}
          value={editorContent}
          onChange={handleEditorChange}
        />
      </section>
    </div>
  );
}

export default App;
