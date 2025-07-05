import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import FavoritesPage from './pages/FavoritesPage';
import './App.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="App min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
};

export default App;