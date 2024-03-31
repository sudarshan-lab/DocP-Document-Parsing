import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';  
import { Link } from 'react-router-dom';
import './assets//AdminPage.css';   

function AdminPage() {
    const { isAuthenticated, username } = useAuth();
    const [contracts, setContracts] = useState([]);
    const [formMode, setFormMode] = useState('create');
    const [newContractName, setNewContractName] = useState('');
    const [selectedContract, setSelectedContract] = useState('');
    const [recentlyEditedContract, setRecentlyEditedContract] = useState(null);
    const [contractDetails, setContractDetails] = useState({
        name: '',
        prompt: '',
        description: ''
    });
    const [selectedContractid, setselectedContractid] = useState('');
    const handleChange = (e) => {
        const { name, value } = e.target;
        setContractDetails(prevDetails => ({
            ...prevDetails,
            [name]: value
        }));
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
                console.log(data);
            } else {
                alert('Failed to fetch contracts');
            }
        };
    
        fetchContracts();
    }, []);

    const handleCreateContract = async () => {
        const response = await fetch('http://127.0.0.1:8000/contracts/create/', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify(contractDetails),
        });
    
        if (response.ok) {
            const newContract = await response.json();
            setContracts(currentContracts => [...currentContracts, newContract]);
            setContractDetails({name: '', prompt: '', description: ''});
        } else {
            alert('Failed to create contract');
        }
    };
    

    const handleUpdateContract = async () => {
        if (!selectedContractid) {
            alert('No contract selected for update.');
            return;
        }
    
        const response = await fetch(`http://127.0.0.1:8000/contracts/update/${selectedContractid}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify(contractDetails),
        });
    
        if (response.ok) {
            const updatedContract = await response.json();
            console.log(updatedContract)
            console.log(contracts)
            setContracts(currentContracts => {
                const index = currentContracts.findIndex(contract => contract.id === selectedContractid);
                if (index !== -1) {
                    const updatedContract = { ...currentContracts[index], ...contractDetails, id: selectedContractid };
                    const newContracts = [...currentContracts];
                    newContracts[index] = updatedContract;
                    return newContracts;
                } else {
                    return [...currentContracts]; 
                }
            });
        setContractDetails({name: '', prompt: '', description: ''});
        setselectedContractid('');
        setFormMode('create');
        } else {
            alert('Failed to update contract');
        }
    };
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
            window.location.href = '/adminlogin';
        } else {
            alert('Logout failed');
        }
    };
    const handleEditContract = (contract) => {
        setContractDetails({
            name: contract.name,
            prompt: contract.prompt,
            description: contract.description
        });
        setselectedContractid(contract.id);
        setFormMode('edit');
        setRecentlyEditedContract(contract.name);
    };
    const handleSubmit = async () => {
        if (formMode === 'create') {
            if (validateContractDetails(true)) {
                await handleCreateContract();
            }
        } else { 
            if (validateContractDetails(false)) {
                await handleUpdateContract();
            }
        }
    };
    const validateContractDetails = (isCreating) => {
    if (!contractDetails.name.trim() || !contractDetails.prompt.trim()) {
        alert("Name and prompt are required.");
        return false;
    }

    if (isCreating) {
        const nameExists = contracts.some(contract => contract.name.toLowerCase() === contractDetails.name.toLowerCase());
        if (nameExists) {
            alert("A contract with this name already exists.");
            return false;
        }
    }
    else{
        const nameCount = contracts.filter(contract => contract.name.toLowerCase() === contractDetails.name.toLowerCase()).length;
        console.log(nameCount);
        if (nameCount > 1 || (nameCount ==1 && recentlyEditedContract != contractDetails.name.toLowerCase()) ) {
            alert("A contract with this name already exists.");
            return false;
        } 
    }

    return true;
};


    const handleDeleteContract = async (contractid) => {
        const response = await fetch(`http://127.0.0.1:8000/contracts/delete/${contractid}/`, { 
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
        });
    
        if (response.ok) {
            setContracts(currentContracts => currentContracts.filter(contract => contract.id !== contractid));
        } else {
            alert('Failed to delete contract');
        }
    };
    

    return (
        <div className="AdminPage">
            <nav>
    <span className='logo'>DocP<span className="logo-admin">Admin</span></span>

        <ul>

            <li>    
                <button onClick={handleLogout}>Logout</button>
            </li>
        </ul>
    </nav>
    <div className='contract-manage-container'>
        <h1>Manage Contracts</h1>
        <div>
                <h2>{formMode === 'create' ? 'Create a New Contract' : 'Edit Contract'}</h2>
                <input 
                    type="text" 
                    placeholder="Contract Name" 
                    name="name"
                    value={contractDetails.name} 
                    onChange={handleChange} 
                />
                <textarea 
                    placeholder="Prompt" 
                    name="prompt"
                    value={contractDetails.prompt} 
                    onChange={handleChange} 
                />
                <textarea 
                    placeholder="Description" 
                    name="description"
                    value={contractDetails.description} 
                    onChange={handleChange} 
                />
                <button onClick={handleSubmit}>{formMode === 'create' ? 'Create Contract' : 'Update Contract'}</button>
            </div>
        <div>
            <h2>Existing Contracts</h2>
            <ul className='contracts-list'>
            {contracts.map((contract) => (
                    <li key={contract.id}>
                        {contract.name}
                        <div className="button-container">
                <button onClick={() => {
                    setContractDetails({name: contract.name, prompt: contract.prompt, description: contract.description});
                    setselectedContractid(contract.id);
                    handleEditContract(contract);
                }}>Edit</button>
                <button onClick={() => handleDeleteContract(contract.id)}>Delete</button>
            </div>
                    </li>
                ))}
            </ul>
        </div>
    </div>
    </div>
    );
}

export default AdminPage;
