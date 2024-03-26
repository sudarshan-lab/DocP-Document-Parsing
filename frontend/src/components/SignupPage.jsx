import React, { useState } from 'react';
import './assets//SignupPage.css';
import { useNavigate } from 'react-router-dom';

function SignupPage() {
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password1, setPassword1] = useState('');
    const [password2, setPassword2] = useState('');
    const [errors, setErrors] = useState({});
    const [usernameError, setUsernameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [formErrors, setFormErrors] = useState({});
    

    const navigate = useNavigate();
    const validateForm = () => {
        let formIsValid = true;
        let errors = {};
        if (!email) {
            formIsValid = false;
            errors["email"] = "Please enter your email";
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            formIsValid = false;
            errors["email"] = "Email is not valid";
        }

        if (username.toLowerCase().includes(firstName.toLowerCase()) || username.toLowerCase().includes(lastName.toLowerCase())) {
            formIsValid = false;
            errors["username"] = "Username should not be too similar to your first or last name";
        }
        if (password1 !== password2) {
            formIsValid = false;
            errors["password"] = "Passwords do not match";
        }

        setErrors(errors);
        return formIsValid;
    };

    // const handleSignUp = async (event) => {
    //     event.preventDefault();
    //     const response = await fetch('http://localhost:8000/signup/', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body:JSON.stringify({
    //             username,
    //             email,
    //             password1,
    //             password2,  
    //             first_name: firstName,  // Note the underscore in 'first_name'
    //             last_name: lastName,    // Note the underscore in 'last_name'
    //         }),
    //     });

    //     if (response.ok) {
    //         console.log('Signup success');
    //         navigate('/');
    //     } else {
    //         console.error('Signup failed');
    //         const data = await response.json();
    //         alert(`Signup failed: ${data.detail}`);
    //     }
    // };
    const handleSignUp = async (event) => {
        event.preventDefault();
    
        setUsernameError('');
        setEmailError('');
        setPasswordError('');
        setConfirmPasswordError('');
    
        let isValid = true;
        if (!username) {
            setUsernameError('Username is required.');
            isValid = false;
        } else if (username.length < 3) {
            setUsernameError('Username must be at least 3 characters long.');
            isValid = false;
        } 
    
        if (!email) {
            setEmailError('Email is required.');
            isValid = false;
        } else if (!/^\S+@\S+\.\S+$/.test(email)) {
            setEmailError('Email is invalid.');
            isValid = false;
        }
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]{8,}$/;
        if (!password1) {
            setPasswordError('Password is required.');
            isValid = false;
        } else if (!passwordPattern.test(password1)) {
            setPasswordError('Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number.');
            console.log('password validation error');
            isValid = false;
        } else {
            setPasswordError(''); // Clear password error if validation passes
        }
    
        if (password1 !== password2) {
            setConfirmPasswordError('Passwords do not match.');
            isValid = false;
        }
        else {
            setConfirmPasswordError('');
        }
    
        if (isValid) {
            const response = await fetch('http://localhost:8000/signup/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    email,
                    password1,
                    password2,  // Assuming your API expects 'password2' for confirmation
                    first_name: firstName,
                    last_name: lastName,
                }),
            });
    
            if (response.ok) {
                console.log('Signup success');
                navigate('/');
            } else {
                console.error('Signup failed');
                const errors = await response.json();
                setFormErrors(errors);
            }
        }
        else{
            console.log("form is not valid");
        }
    };
    

    return (
        <div className="container">
            <div className="signup-container">
    <div className="signup-form">
    <h2>Sign Up</h2>
    <form onSubmit={handleSignUp}>
        <div className="input-group">
            <label>Username</label>
            <input 
                type="text"
                className={`form-control ${formErrors.username ? 'is-invalid' : ''}`}
                placeholder="Username"
                value={username}
                onChange={(e) => {
                    setUsername(e.target.value);
                    setFormErrors({...formErrors, username: ''}); 
                }}
                required
            />
            {formErrors.username && <div className="invalid-feedback">{formErrors.username}</div>}
        </div>
        <div className="input-group">
            <label>Email</label>
            <input 
                type="email"
                className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                placeholder="Email"
                value={email}
                onChange={(e) => {
                    setEmail(e.target.value);
                    setFormErrors({...formErrors, email: ''}); 
                }}
                required
            />
            {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
        </div>
        {/* <div className="input-group">
            <label>Password</label>
            <input 
                type="password"
                className={`form-control ${formErrors.password1 ? 'is-invalid' : ''}`} // Notice "password1" for consistency with your backend
                placeholder="Password"
                value={password1}
                onChange={(e) => {
                    setPassword1(e.target.value);
                    setFormErrors({...formErrors, password1: ''}); 
                }}
                required
            />
            {formErrors.password1 && <div className="invalid-feedback">{formErrors.password1}</div>}
        </div>
        <div className="input-group">
            <label>Confirm Password</label>
            <input 
                type="password"
                className={`form-control ${formErrors.password2 ? 'is-invalid' : ''}`} // Ensure your backend uses "password2" or adjust accordingly
                placeholder="Confirm Password"
                value={password2}
                onChange={(e) => {
                    setPassword2(e.target.value);
                    setFormErrors({...formErrors, password2: ''}); 
                }}
                required
            />
            {formErrors.password2 && <div className="invalid-feedback">{formErrors.password2}</div>}
        </div> */}
        <div className="input-group">
    <label>Password</label>
    <input 
        type="password"
        className={`form-control ${passwordError ? 'is-invalid' : ''}`}
        placeholder="Password"
        value={password1}
        onChange={(e) => {
            setPassword1(e.target.value);
            setFormErrors({...formErrors, password1: ''}); // Clear backend error
        }}
        required
    />
    {passwordError && <div className="invalid-feedback">{passwordError}</div>} {/* Display frontend validation error */}
    {formErrors.password1 && <div className="invalid-feedback">{formErrors.password1}</div>} {/* Display backend validation error */}
</div>
<div className="input-group">
    <label>Confirm Password</label>
    <input 
        type="password"
        className={`form-control ${confirmPasswordError ? 'is-invalid' : ''}`}
        placeholder="Confirm Password"
        value={password2}
        onChange={(e) => {
            setPassword2(e.target.value);
            setFormErrors({...formErrors, password2: ''}); // Clear backend error
        }}
        required
    />
    {confirmPasswordError && <div className="invalid-feedback">{confirmPasswordError}</div>} {/* Display frontend validation error */}
    {formErrors.password2 && <div className="invalid-feedback">{formErrors.password2}</div>} {/* Display backend validation error */}
</div>

        <div className="buttons">
            <button type="submit" className="btn btn-primary">Sign Up</button>
            <a href="/login" className="btn btn-secondary">Login</a>
        </div>
    </form>
</div>


        </div>
        </div>
        
    );
}

export default SignupPage;
