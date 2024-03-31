import React, { useState ,useEffect } from 'react';
import './assets//LoginPage.css';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';


const useStyles = styled((theme) => ({
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '100vh',
        background: 'url(your-background-image.jpg)', 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    },
    loginCard: {
        marginLeft: theme.spacing(6), 
        padding: theme.spacing(2),
        background: 'rgba(255, 255, 255, 0.8)',
        boxShadow: theme.shadows[5],
        borderRadius: theme.shape.borderRadius,
        transform: 'perspective(500px) rotateY(-20deg)', 
    },
    formGroup: {
        marginBottom: theme.spacing(2),
    },
    formControl: {
        width: '100%',
        padding: theme.spacing(1),
        border: '1px solid #ddd',
        borderRadius: theme.shape.borderRadius,
    },
    btnGroup: {
        display: 'flex',
        justifyContent: 'space-between',
    },
}));
const StyledLoginCard = styled('div')(({ theme }) => ({
    marginRight: theme.spacing(6), 
    padding: theme.spacing(2),
    background: 'rgba(255, 255, 255, 0.8)',
    boxShadow: theme.shadows[5],
    borderRadius: theme.shape.borderRadius,
    transform: 'none', 
}));

const StyledContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100vh',
    background: 'url(your-background-image.jpg)', 
    backgroundSize: 'cover',
    backgroundPosition: 'center',
}));


function LoginPage({ login }) {
    const classes = useStyles();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    useEffect(() => {
        fetch('http://localhost:8000/set-csrf/', {
            credentials: 'include' 
        }).then(response => {
            console.log('CSRF token set successfully');
        }).catch(error => {
            console.error('Error setting CSRF token:', error);
        });
    }, []);
        function getCsrfToken() {
        return document.cookie.split('; ').find(row => row.startsWith('csrftoken='))
               ?.split('=')[1];
    }
    
    const handleSubmit = async (event) => {
        event.preventDefault();
        const response = await fetch('http://localhost:8000/login/', { 
        credentials: 'include',
            
        method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include',
        });
        console.log(getCsrfToken());

        if (response.ok) {
            const data = await response.json();
            console.log('Login success:', data);
            console.log(getCsrfToken());

            login(data);    
            
            // console("loggedinstate",isLoggedIn); 
            // setAuthCheckTrigger(oldValue => oldValue + 1);

            navigate('/');
        } else {
            // const errors = await response.json();
            alert('Login failed');
            // setFormErrors(errors); 
            console.log(getCsrfToken());
        }
    };
    return (
        <div className="container">
            <div className="login-card">
                <h2 className="text-center">Login</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Username" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />

                    </div>
                    <div className="form-group">
                        <input 
                            type="password" 
                            className="form-control" 
                            placeholder="Password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="btn-group">
                        <button type="submit" className="btn btn-primary">Login</button>
                        <div className="signup-area">
                            <span className="signup-span">Don't have account? Register here</span>
                        <a href="/signup" className="btn btn-secondary">Signup</a>
                        </div>
                        <div className="signup-area">
                            <span className="signup-span">Login as Admin</span>
                        <a href="/adminlogin" className="btn btn-secondary">Admin Login</a>
                        </div>
                        
                    </div>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
