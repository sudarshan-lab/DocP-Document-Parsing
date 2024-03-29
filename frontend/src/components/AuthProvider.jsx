// src/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');

    // useEffect(() => {
    //     fetch('127.0.0.1:8000/api/auth/status', {
    //         credentials: 'include'  
    //     })
    //     .then(response => response.json())
    //     .then(data => {
    //         if (data.isAuthenticated) {
    //             setIsAuthenticated(true);
    //             setUsername(data.username); // Assuming the response includes the username when authenticated
    //         } else {
    //             setIsAuthenticated(false);
    //             setUsername(''); // Clear username since not authenticated
    //         }
    //     })
    //     .catch(error => {
    //         console.error('Error checking authentication status:', error);
    //     });
    // }, []); 
    useEffect(() => {
        fetch('http://127.0.0.1:8000/api/auth/status', {
            method: 'GET',  
            headers: {
                'Content-Type': 'application/json', 
            },
            credentials: 'include'  
        })
        .then(response => {
            if (response.ok) {
                return response.json(); 
            }
            throw new Error('Network response was not ok');
        })
        .then(data => {
            if (data.isAuthenticated) {
                setIsAuthenticated(true);
                setUsername(data.username); 
            } else {
                setIsAuthenticated(false);
                setUsername('');
            }
        })
        .catch(error => {
            console.error('Error checking authentication status:', error);
        });
    }, []); 
    return (
        <AuthContext.Provider value={{ isAuthenticated, username }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
