import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage.jsx';

import HistoryPage from './components/HistoryPage.jsx';

function App() {
    return (
        <Router>
         <AuthProvider>
            <Routes>
            <Route path="/" element={isLoggedIn ? <HomePage /> : <Navigate to="/login" replace />} />
            <Route path="/history" element={isLoggedIn ? <HistoryPage /> : <Navigate to="/login" replace />} />
        </Routes>
        </AuthProvider>   
    </Router>
    );
}

export default App;
