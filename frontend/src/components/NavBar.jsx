// Navbar.js in your React app

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import './assets//NavBar.css'; 
// function NavBar({ isAuthenticated, username })
function NavBar()  {
    const { isAuthenticated, username } = useAuth();
    console.log('NavBar rendering. isAuthenticated:', isAuthenticated, 'username:', username);
    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            ...
            <div className="collapse navbar-collapse" id="navbarNav">
                ...
                    {isAuthenticated ? (
                        <>
                            <span className="navbar-text">
                                Hello, {username}!
                            </span>
                            <Link to="/logout" className="nav-item nav-link">Sign out</Link>
                        </>
                    ) : (
                        <Link to="/login" className="nav-item nav-link">Sign in</Link>
                    )}
                ...
            </div>
        </nav>
    );
}

export default NavBar;
