import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HomePage } from './components/home-page';
import { StockFinderComponent } from './components/stock-finder';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stock-finder" element={<StockFinderComponent />} />
        {/* Add other routes here */}
      </Routes>
    </Router>
  );
}

export default App;