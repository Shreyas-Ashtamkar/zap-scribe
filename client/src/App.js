import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import * as monaco from 'monaco-editor';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [file, setFile] = useState(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [socket, setSocket] = useState(null);
  const [version, setVersion] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('plaintext');

  const editorContainerRef = useRef(null);
  const monacoInstanceRef = useRef(null);
  const isUpdating = useRef(false);

  const getLanguageFromExtension = (filename) => {
    const extension = filename.split('.').pop();
    switch (extension) {
      case 'js':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'cpp':
        return 'cpp';
      case 'c':
        return 'c';
      case 'cs':
        return 'csharp';
      default:
        return 'plaintext';
    }
  };

  // Initialize Monaco Editor in the main area.
  useEffect(() => {
    if (editorContainerRef.current) {
      monacoInstanceRef.current = monaco.editor.create(editorContainerRef.current, {
        value: editorContent,
        language: language,
        theme: darkMode ? 'vs-dark' : 'vs-light',
        automaticLayout: true,
      });

      // Listen for local changes.
      const subscription = monacoInstanceRef.current.onDidChangeModelContent(() => {
        if (!isUpdating.current) {
          const newValue = monacoInstanceRef.current.getValue();
          setEditorContent(newValue);
          if (socket) {
            socket.emit('edit', { diff: newValue, clientVersion: version });
          }
        }
      });

      return () => {
        subscription.dispose();
        monacoInstanceRef.current.dispose();
      };
    }
  }, [editorContent, socket, version, darkMode, language]);

  // Setup WebSocket connection when a document is joined.
  useEffect(() => {
    if (uploadedFileInfo) {
      const newSocket = io('http://localhost:4000');
      setSocket(newSocket);

      // Join the document session.
      newSocket.emit('join', { documentId: uploadedFileInfo.filename });

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
  }, [uploadedFileInfo]);

  // Fetch active sessions from the server.
  const fetchSessions = async () => {
    try {
      const res = await axios.get('http://localhost:4000/api/sessions');
      setSessions(res.data.sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  // Fetch sessions on mount and refresh every 10 seconds.
  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

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
      setLanguage(getLanguageFromExtension(res.data.file.filename));
      alert('File uploaded successfully!');
    } catch (error) {
      console.error(error);
      alert('File upload failed!');
      setVersion(version + 1);
    }
  };

  // Join a session from the list.
  const handleJoinSession = (sessionId) => {
    setUploadedFileInfo({ filename: sessionId });
    setLanguage(getLanguageFromExtension(sessionId));
  };

  // Toggle dark mode.
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Handle file download.
  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([editorContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = uploadedFileInfo ? uploadedFileInfo.filename : 'untitled.txt';
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        {showSidebar && (
          <div className="col-md-3">
            <h2 className="mb-3">Controls</h2>

            <section className="mb-4">
              <h4>File Upload</h4>
              <form onSubmit={handleUpload}>
                <div className="mb-3">
                  <input type="file" className="form-control" onChange={handleFileChange} />
                </div>
                <button type="submit" className="btn btn-primary w-100">Upload File</button>
              </form>
            </section>

            <section className="mb-4">
              <h4>Active Sessions</h4>
              <button className="btn btn-secondary btn-sm mb-2" onClick={fetchSessions}>
                Refresh
              </button>
              {sessions.length ? (
                <ul className="list-group">
                  {sessions.map((session) => (
                    <li
                      key={session.documentId}
                      className="list-group-item list-group-item-action"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleJoinSession(session.documentId)}
                    >
                      {session.documentId}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No active sessions.</p>
              )}
            </section>

            <section className='mb-4'>
              <div className="d-flex justify-content-end mb-2">
                <button
                  className="btn btn-outline-secondary me-2"
                  onClick={toggleDarkMode}
                >
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Main Editor Area */}
        <div className={showSidebar ? "col-md-9" : "col-md-12"}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Editor</h2>
            <button
              className="btn btn-outline-none"
              onClick={handleDownload}
            > 💾 </button>
          </div>
          <div
            ref={editorContainerRef}
            style={{ height: '80vh', border: '1px solid #ddd' }}
          ></div>
          <button
            className="btn btn-outline-none mt-2 px-0 mx-0 text-secondary"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {(showSidebar ? '<<< Controls' : 'Controls >>>')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
