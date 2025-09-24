document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginContainer = document.getElementById('login-container');
    const walletContainer = document.getElementById('wallet-container');
    const loginButton = document.getElementById('login-button');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const walletUsername = document.getElementById('wallet-username');
    const bsvAddressEl = document.getElementById('bsv-address');
    const bsvBalanceEl = document.getElementById('bsv-balance');
    const nftGrid = document.getElementById('nft-grid');
    const sendBsvButton = document.getElementById('send-bsv-button');
    const sendBsvRecipientInput = document.getElementById('send-bsv-recipient');
    const sendBsvAmountInput = document.getElementById('send-bsv-amount');
    const createNftButton = document.getElementById('create-nft-button');
    const createNftNameInput = document.getElementById('create-nft-name');
    const createNftFileInput = document.getElementById('create-nft-file');

    // API Configuration
    const API_BASE_URL = 'https://akematsu.yenpoint.jp';

    // --- API Call Functions ---
    const apiFetch = async (endpoint, options = {}) => {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = { ...options.headers };
        const token = sessionStorage.getItem('jwtToken');

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Set Content-Type for JSON, otherwise let browser handle it for FormData
        if (options.body && typeof options.body === 'string') {
             headers['Content-Type'] = 'application/json';
        }

        const fetchOptions = { ...options, headers };

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            if (response.status === 401) {
                alert('Session expired. Please log in again.');
                sessionStorage.removeItem('jwtToken');
                sessionStorage.removeItem('username');
                loginContainer.style.display = 'block';
                walletContainer.style.display = 'none';
            }
            const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
            throw new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        }
        return response.blob();
    };

    // --- UI Refresh Functions ---
    const refreshBalance = async () => {
        try {
            const balanceData = await apiFetch('/api/v1/user/wallet/balance');
            bsvBalanceEl.textContent = balanceData.balance.toLocaleString();
        } catch (error) {
            console.error('Failed to refresh balance:', error);
        }
    };

    const refreshNFTs = async () => {
        try {
            const nftsData = await apiFetch('/api/v1/user/nfts/info');
            await displayNFTs(nftsData);
        } catch (error) {
            console.error('Failed to refresh NFTs:', error);
        }
    };

    // --- UI Update Functions ---
    const displayNFTs = async (nfts) => {
        nftGrid.innerHTML = '';
        if (!nfts || nfts.length === 0) {
            nftGrid.innerHTML = '<p>No NFTs found.</p>';
            return;
        }

        for (const nft of nfts) {
            const nftItem = document.createElement('div');
            nftItem.className = 'nft-item';

            const nftImage = document.createElement('img');
            nftImage.alt = nft.name;
            nftImage.src = '#'; // Placeholder until image loads

            const nftName = document.createElement('p');
            nftName.textContent = nft.name;

            const sendNftButton = document.createElement('button');
            sendNftButton.textContent = 'Send';
            sendNftButton.onclick = () => handleSendNft(nft.nft_origin);

            nftItem.appendChild(nftImage);
            nftItem.appendChild(nftName);
            nftItem.appendChild(sendNftButton);
            nftGrid.appendChild(nftItem);

            try {
                const imageBlob = await apiFetch(`/api/v1/nft/data/${nft.nft_origin}`);
                nftImage.src = URL.createObjectURL(imageBlob);
            } catch (error) {
                console.error(`Failed to load image for ${nft.name}:`, error);
                nftImage.alt = 'Image not found';
            }
        }
    };

    const loadWalletData = async () => {
        try {
            const [balanceData, addressData, nftsData] = await Promise.all([
                apiFetch('/api/v1/user/wallet/balance'),
                apiFetch('/api/v1/bsv/legacy-address'),
                apiFetch('/api/v1/user/nfts/info')
            ]);

            // Use the correct property for balance from the API response
            if (balanceData && typeof balanceData.total_balance !== 'undefined') {
                bsvBalanceEl.textContent = balanceData.total_balance.toLocaleString();
            } else {
                console.error('total_balance property not found in balanceData response.');
                bsvBalanceEl.textContent = 'N/A';
            }

            // Use the correct property for address from the API response
            if (addressData && typeof addressData.Address === 'string') {
                bsvAddressEl.textContent = addressData.Address;
            } else {
                console.error('Address property not found or not a string in addressData response.');
                bsvAddressEl.textContent = 'N/A';
            }

            await displayNFTs(nftsData);
        } catch (error) {
            console.error('Failed to load wallet data:', error);
            alert(`Error loading wallet data: ${error.message}`);
        }
    };

    // --- Action Handlers ---
    const handleSendNft = async (nftOrigin) => {
        const recipientPaymail = prompt('Enter recipient paymail:');
        if (!recipientPaymail) return;

        try {
            await apiFetch('/api/v1/nft/paymail/send', {
                method: 'POST',
                body: JSON.stringify({ recipient_paymail: recipientPaymail, nft_origin: nftOrigin })
            });
            alert('NFT sent successfully!');
            await refreshNFTs();
        } catch (error) {
            console.error('Failed to send NFT:', error);
            alert(`Error sending NFT: ${error.message}`);
        }
    };

    // --- Event Listeners ---
    loginButton.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        if (!username || !password) {
            alert('Please enter both username and password.');
            return;
        }

        try {
            // Use the dedicated JWT endpoint with JSON payload
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/jwt-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
                throw new Error(errorData.detail || errorData.error || `HTTP error! ${response.status}`);
            }

            const tokenData = await response.json();
            const token = tokenData.token || tokenData.access;

            if (!token) {
                console.log('JWT response data:', tokenData); // For debugging if needed
                throw new Error('Login successful, but no token was provided. Check the developer console.');
            }

            sessionStorage.setItem('jwtToken', token);
            sessionStorage.setItem('username', username);

            walletUsername.textContent = username;
            loginContainer.style.display = 'none';
            walletContainer.style.display = 'block';
            await loadWalletData();

        } catch (error) {
            console.error('Login failed:', error);
            alert(`Login failed: ${error.message}`);
        }
    });

    sendBsvButton.addEventListener('click', async () => {
        const recipient = sendBsvRecipientInput.value.trim();
        const amount = parseInt(sendBsvAmountInput.value, 10);

        if (!recipient || !amount || amount <= 0) {
            alert('Please enter a valid recipient and amount.');
            return;
        }

        if (!confirm(`Send ${amount} satoshis to ${recipient}?`)) return;

        try {
            await apiFetch('/api/v1/bsv/paymail/send', {
                method: 'POST',
                body: JSON.stringify({ recipient_paymail: recipient, amount_satoshis: amount })
            });
            alert('BSV sent successfully!');
            sendBsvRecipientInput.value = '';
            sendBsvAmountInput.value = '';
            await refreshBalance();
        } catch (error) {
            console.error('Failed to send BSV:', error);
            alert(`Error sending BSV: ${error.message}`);
        }
    });

    createNftButton.addEventListener('click', async () => {
        const name = createNftNameInput.value.trim();
        const file = createNftFileInput.files[0];

        if (!name || !file) {
            alert('Please provide a name and a file for the NFT.');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('file', file);
        formData.append('app', 'OrdinalX-Demo-App');

        try {
            await apiFetch('/api/v1/nft/create', {
                method: 'POST',
                body: formData
            });
            alert('NFT created successfully!');
            createNftNameInput.value = '';
            createNftFileInput.value = '';
            await refreshNFTs();
        } catch (error) {
            console.error('Failed to create NFT:', error);
            alert(`Error creating NFT: ${error.message}`);
        }
    });

    // --- Initial Check for existing session ---
    const checkLoginStatus = async () => {
        const token = sessionStorage.getItem('jwtToken');
        if (token) {
            const username = sessionStorage.getItem('username');
            if (username) {
                walletUsername.textContent = username;
                loginContainer.style.display = 'none';
                walletContainer.style.display = 'block';
                await loadWalletData();
            }
        }
    };

    checkLoginStatus();
});