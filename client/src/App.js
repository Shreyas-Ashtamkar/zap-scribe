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

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import * as monaco from 'monaco-editor';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [file, setFile] = useState(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [docId, setDocId] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [socket, setSocket] = useState(null);
  const [version, setVersion] = useState(0);

  const editorContainerRef = useRef(null);
  const monacoInstanceRef = useRef(null);
  const isUpdating = useRef(false);

  // Initialize Monaco Editor once the editor container is available.
  useEffect(() => {
    if (editorContainerRef.current) {
      monacoInstanceRef.current = monaco.editor.create(editorContainerRef.current, {
        value: editorContent,
        language: 'plaintext',
        theme: 'vs-light',
        automaticLayout: true,
      });

      // Listen for local changes.
      const subscription = monacoInstanceRef.current.onDidChangeModelContent(() => {
        if (!isUpdating.current) {
          const newValue = monacoInstanceRef.current.getValue();
          setEditorContent(newValue);
          if (socket && docId) {
            socket.emit('edit', { documentId: docId, diff: newValue, clientVersion: version });
          }
        }
      });

      return () => {
        subscription.dispose();
        monacoInstanceRef.current.dispose();
      };
    }
  }, [editorContainerRef, socket, docId, version]);

  // Setup WebSocket connection when a document is joined.
  useEffect(() => {
    if (docId) {
      const newSocket = io('http://localhost:4000');
      setSocket(newSocket);

      // Join the document session.
      newSocket.emit('join', { documentId: docId });

      // Sync initial content.
      newSocket.on('sync', (data) => {
        console.log('Received sync data:', data);
        setVersion(data.version);
        setEditorContent(data.content);
        if (monacoInstanceRef.current) {
          isUpdating.current = true;
          monacoInstanceRef.current.setValue(data.content);
          setTimeout(() => {
            isUpdating.current = false;
          }, 0);
        }
      });

      // Listen for real-time edits.
      newSocket.on('edit', (data) => {
        console.log('Received edit:', data);
        setVersion(data.version);
        setEditorContent(data.content);
        if (monacoInstanceRef.current) {
          isUpdating.current = true;
          monacoInstanceRef.current.setValue(data.content);
          setTimeout(() => {
            isUpdating.current = false;
          }, 0);
        }
      });

      return () => newSocket.close();
    }
  }, [docId]);

  // Handle file selection.
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Upload file to the File Server.
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5000/api/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadedFileInfo(res.data.file);
      alert('File uploaded successfully!');
    } catch (error) {
      console.error(error);
      alert('File upload failed!');
      setVersion(version + 1);
    }
  };

  // Join the document session.
  const handleJoinDocument = () => {
    if (uploadedFileInfo && uploadedFileInfo.filename) {
      setDocId(uploadedFileInfo.filename);
    } else if (!docId) {
      alert('Please upload a file first or manually enter a document ID.');
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Collaborative Editor</h1>

      <section className="mb-5">
        <h2>File Upload</h2>
        <form onSubmit={handleUpload}>
          <div className="mb-3">
            <input type="file" className="form-control" onChange={handleFileChange} />
          </div>
          <button type="submit" className="btn btn-primary">Upload File</button>
        </form>
      </section>

      <section className="mb-5">
        <h2>Join Document Session</h2>
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Enter Document ID"
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
          />
          <button className="btn btn-outline-secondary" onClick={handleJoinDocument}>Join Document</button>
        </div>
        <p>Document ID: {docId}</p>
      </section>

      <section className="mb-5">
        <h2>Editor</h2>
        {/* The Monaco Editor will mount into this div */}
        <div ref={editorContainerRef} style={{ height: '300px', border: '1px solid #ddd' }}></div>
      </section>
    </div>
  );
}

export default App;
