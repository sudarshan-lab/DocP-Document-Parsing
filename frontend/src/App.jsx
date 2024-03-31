import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
// import { AuthProvider } from './components/AuthContext.jsx';
import { AuthProvider } from './components/AuthProvider.jsx';
import LoginPage from './components/Loginpage.jsx';
import AdminLoginPage from './components/AdminLoginPage.jsx';

import SignupPage from './components/SignupPage.jsx';
import HomePage from './components/HomePage.jsx';
import AdminPage from './components/AdminPage.jsx';


import HistoryPage from './components/HistoryPage.jsx';
import NavBar from './components/NavBar.jsx'; 

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);


    const login = () => {
        setIsLoggedIn(true); 
    };

    const logout = () => {
        setIsLoggedIn(false);
    };

    return (
        <Router>
         <AuthProvider>
        {/* {isLoggedIn && <NavBar logout={logout} />}
         */}
         {/* <NavBar /> */}
        <Routes>
            <Route path="/" element={isLoggedIn ? <HomePage /> : <Navigate to="/login" replace />} />
            <Route path="/login" element={!isLoggedIn ? <LoginPage login={login} /> : <Navigate to="/" replace />} />
            <Route path="/adminlogin" element={!isLoggedIn ? <AdminLoginPage login={login} /> : <Navigate to="/admin" replace />} />
            <Route path="/admin" element={isLoggedIn ? <AdminPage/> : <Navigate to="/adminlogin" replace />} />


            <Route path="/signup" element={!isLoggedIn ? <SignupPage /> : <Navigate to="/" replace />} />
            <Route path="/history" element={isLoggedIn ? <HistoryPage /> : <Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to={isLoggedIn ? "/" : "/login"} replace />} />
        </Routes>
        </AuthProvider>   
    </Router>
    );
}

export default App;
