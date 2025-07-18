import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import GraveMap from './GraveMap';
import ViewMap from './viewmap';

function App() {
  return (
    <Router>
      
      <Routes>
        <Route path="/" element={<GraveMap />} />
        <Route path="/viewmap" element={<ViewMap />} />
        {/* Add more routes here if needed */}
      </Routes>
    </Router>
  );
}

export default App;
