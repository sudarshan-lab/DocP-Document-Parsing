import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';

import './assets//HomePage.css';

function HomePage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [uploadedFileUrl, setUploadedFileUrl] = useState('');
    const djangoBaseUrl = 'http://127.0.0.1:8000'; 
    const djangoBaseDir ='C:/Users/Nikil/Documents/textract/textract/text_extraction'
    const { isAuthenticated, username } = useAuth();
    const [contracts, setContracts] = useState([]);
    const [selectedContract, setSelectedContract] = useState('');
    // console.log("from home",isAuthenticated,username);
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };
    function getCsrfToken() {
        return document.cookie.split('; ').find(row => row.startsWith('csrftoken='))
               ?.split('=')[1];
    }
    useEffect(() => {
        const fetchContracts = async () => {
            const response = await fetch('http://127.0.0.1:8000/contracts/', { 
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },  
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setContracts(data.contracts); 
            } else {
                alert('Failed to fetch contracts');
            }
        };
    
        fetchContracts();
    }, []);
    const [isLoading, setIsLoading] = useState(false);

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
    const handleUpload = async () => {
        if (!selectedFile) {
            alert('Please select a file first!');
            return;
        }
        if (!selectedContract) {
            alert('Please select a contract!');
            return;
        }
        console.log(getCsrfToken())

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('contract_id', selectedContract);
        setIsLoading(true);
        try {
        const response = await fetch('http://localhost:8000/', { 
        credentials: 'include',
        method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
            },
            body:formData,
            credentials: 'include',
        });
        setIsLoading(false); 
        if (response.ok) {
            const data = await response.json();  
            alert('File uploaded successfully');
            setExtractedText(data.extracted_text);
            setUploadedFileUrl(djangoBaseUrl + data.uploaded_file_url); 
        } else {
            const errorText = await response.text();  
            throw new Error(`Server responded with a non-200 status: ${response.status} ${errorText}`);
        }

        }
         catch (error) {
            alert('Error uploading file');
            console.error(error);
        }
    };
    const fileType = uploadedFileUrl.endsWith('.pdf') ? 'pdf' : uploadedFileUrl.match(/\.(jpeg|jpg|png|gif)$/) ? 'image' : 'unknown';
    return (
        <div className="HomePage">
              <div>
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
    <main>
        <div className='upload-area'>
            <div className="upload-content-area">
            <select value={selectedContract} onChange={(e) => setSelectedContract(e.target.value)}>
                <option value="">Select a Contract</option>
                {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>{contract.name}</option>
                ))}
            </select>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload} disabled={isLoading}>{isLoading ? 'Uploading...' : 'Upload'}</button>
            </div>
            <div className="content-container">
            {uploadedFileUrl && (
                <div className="uploaded-file-viewer">
                    <h3>Uploaded File:</h3>
                    <button onClick={() => window.open(uploadedFileUrl, '_blank')}>View Uploaded File</button>
                    {/* <img src="../../../text_etraction" alt="" /> */}
                    {/* <img src="./assets/hotels_3SVmpQV.png" alt="Uploaded Content" style={{ maxWidth: '100%', maxHeight: '500px' }} /> */}
                </div>
            )}
            {extractedText && (
                <div className="extracted-text">
                    <h3>Extracted Text:</h3>
                    <textarea 
        className="extracted-text-area" 
        readOnly 
        value={extractedText} 
        aria-label="Extracted text"
    ></textarea>
                </div>
            )}
            </div>
        </div>
    </main>
</div>

        </div>
      
    );
}


export default HomePage;
