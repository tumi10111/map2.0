import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ViewMap from './viewmap';
import AdminLogin from './AdminLogin';
import GraveMap from './GraveMap'; // Admin dashboard

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ViewMap />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/dashboard" element={<GraveMap />} />
      </Routes>
    </Router>
  );
}

export default App;
