import React, { useState, useEffect } from 'react';
import './assets/HistoryPage.css'; 
import { Link } from 'react-router-dom';


function HistoryPage() {
    const [historyItems, setHistoryItems] = useState([]);
        function getCsrfToken() {
        return document.cookie.split('; ').find(row => row.startsWith('csrftoken='))
               ?.split('=')[1];
    }
    const handleLogout = async () => {
        
        const csrfToken = getCsrfToken();
        
        const response = await fetch('http://localhost:8000/logout/', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            credentials: 'include', 
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            alert('Logout failed');
        }
    };
    useEffect(() => {
        const fetchHistory = async () => {
            const response = await fetch('http://localhost:8000/history/', { 
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                console.log("data",data);
                setHistoryItems(data.uploaded_files); 
            } else {
                alert('Failed to fetch history');
            }
        };


        fetchHistory();
    }, []); 

    return (
        <div className='HistoryPage'>
             <nav>
             <span className='logo'>DocP</span>
                <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/history">History</Link></li>
                    <li>
                    <button onClick={handleLogout}>Logout</button>
                    </li>
                </ul>
            </nav>
            <div className="history-table-container">
        <table className="history-table">
    <thead><tr>
        <th>Filename</th>
        <th>Extracted Text</th>
        <th>Upload Date</th>
        <th>Actions</th>
    </tr></thead>
    <tbody>{Array.isArray(historyItems) && historyItems.map((item, index) => (
        <tr key={index}>
            <td><a href={item.file_url} target="_blank" rel="noopener noreferrer">{item.filename}</a></td>
            <td>{item.extracted_text}</td>
            <td>{item.upload_date}</td>
            <td><a href={item.file_url} target="_blank" rel="noopener noreferrer">View File</a></td>
        </tr>
    ))}</tbody>
</table></div>

        </div>
    );
}

export default HistoryPage;
