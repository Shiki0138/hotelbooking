import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './providers/ThemeProvider';
import ErrorBoundary from './components/ErrorBoundary';
import BookingErrorBoundary from './components/Booking/BookingErrorBoundary';
import HomePage from './pages/HomePage';
import PracticalHotelBookingPage from './pages/PracticalHotelBookingPage';
import TestRakutenAPI from './pages/TestRakutenAPI';
import HotelDetailPage from './pages/HotelDetailPage';
import BookingConfirmPage from './pages/BookingConfirmPage';
import BookingCompletePage from './pages/BookingCompletePage';
import BookingTestPage from './components/Booking/BookingTestPage';
import APITestComponent from './components/APITestComponent';
import ThemeToggleDemo from './pages/ThemeToggleDemo';
import './App.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="App min-h-screen bg-surface-primary text-neutral-900 dark:bg-surface-dark-primary dark:text-neutral-50 transition-colors duration-300">
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/practical" element={
            <BookingErrorBoundary>
              <PracticalHotelBookingPage />
            </BookingErrorBoundary>
          } />
          <Route path="/search" element={
            <BookingErrorBoundary>
              <PracticalHotelBookingPage />
            </BookingErrorBoundary>
          } />
          <Route path="/test-rakuten" element={<TestRakutenAPI />} />
          <Route path="/hotel/:id" element={
            <BookingErrorBoundary>
              <HotelDetailPage />
            </BookingErrorBoundary>
          } />
          <Route path="/booking/confirm" element={
            <BookingErrorBoundary>
              <BookingConfirmPage />
            </BookingErrorBoundary>
          } />
          <Route path="/booking/complete" element={
            <BookingErrorBoundary>
              <BookingCompletePage />
            </BookingErrorBoundary>
          } />
          <Route path="/booking/test" element={
            <BookingErrorBoundary>
              <BookingTestPage />
            </BookingErrorBoundary>
          } />
          <Route path="/api-test" element={<APITestComponent />} />
          <Route path="/theme-demo" element={<ThemeToggleDemo />} />
          <Route path="*" element={<div className="p-8 text-center">404 - ページが見つかりません</div>} />
          </Routes>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;