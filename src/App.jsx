import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import VideoChat from './pages/VideoChat';
import TextChat from './pages/TextChat';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/video" element={<VideoChat />} />
            <Route path="/text" element={<TextChat />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

