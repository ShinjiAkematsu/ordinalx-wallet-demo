document.addEventListener('DOMContentLoaded', () => {
    // --- MOCK DATA MODE --- 
    const MOCK_MODE = false; // Set to true to use mock data and bypass API calls

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

    // App state
    let accessToken = null;

    // --- API Call Functions ---
    const apiFetch = async (endpoint, options = {}) => {
        if (MOCK_MODE) {
            console.log(`MOCK API CALL: ${endpoint}`, options);
            // In mock mode, we don't make real calls, so we just return empty promises
            // The actual mock data is handled in the loadWalletData function.
            return new Promise(resolve => resolve({}));
        }

        const url = `${API_BASE_URL}${endpoint}`;
        const headers = { ...options.headers };
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        if (options.body && typeof options.body === 'string') {
             headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
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
        if (MOCK_MODE) return;
        try {
            const balanceData = await apiFetch('/api/v1/user/wallet/balance');
            bsvBalanceEl.textContent = balanceData.balance.toLocaleString();
        } catch (error) {
            console.error('Failed to refresh balance:', error);
        }
    };

    const refreshNFTs = async () => {
        if (MOCK_MODE) return;
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
            // Use placeholder image in mock mode
            nftImage.src = MOCK_MODE ? `https://via.placeholder.com/150?text=${nft.name.replace(/ /g, '+')}` : '#';

            const nftName = document.createElement('p');
            nftName.textContent = nft.name;

            const sendNftButton = document.createElement('button');
            sendNftButton.textContent = 'Send';
            sendNftButton.onclick = () => handleSendNft(nft.nft_origin);

            nftItem.appendChild(nftImage);
            nftItem.appendChild(nftName);
            nftItem.appendChild(sendNftButton);
            nftGrid.appendChild(nftItem);

            if (!MOCK_MODE) {
                try {
                    const imageBlob = await apiFetch(`/api/v1/nft/data/${nft.nft_origin}`);
                    nftImage.src = URL.createObjectURL(imageBlob);
                } catch (error) {
                    console.error(`Failed to load image for ${nft.name}:`, error);
                    nftImage.alt = 'Image not found';
                }
            }
        }
    };

    const loadWalletData = async () => {
        if (MOCK_MODE) {
            console.log("Loading mock wallet data...");
            const mockBalance = 1234567;
            const mockAddress = "1MockAddressForDemoPurposeOnly";
            const mockNfts = [
                { name: "Demo NFT 1", nft_origin: "mock_origin_1" },
                { name: "Cool Cat", nft_origin: "mock_origin_2" },
                { name: "My Artwork", nft_origin: "mock_origin_3" },
            ];
            bsvBalanceEl.textContent = mockBalance.toLocaleString();
            bsvAddressEl.textContent = mockAddress;
            await displayNFTs(mockNfts);
            return;
        }

        try {
            const [balanceData, addressData, nftsData] = await Promise.all([
                apiFetch('/api/v1/user/wallet/balance'),
                apiFetch('/api/v1/bsv/legacy-address'),
                apiFetch('/api/v1/user/nfts/info')
            ]);

            bsvBalanceEl.textContent = balanceData.balance.toLocaleString();
            bsvAddressEl.textContent = addressData.Address[0];
            await displayNFTs(nftsData);
        } catch (error) {
            console.error('Failed to load wallet data:', error);
            alert(`Error loading wallet data: ${error.message}`);
        }
    };

    // --- Action Handlers ---
    const handleSendNft = async (nftOrigin) => {
        if (MOCK_MODE) {
            alert('Functionality disabled in mock mode.');
            return;
        }
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
        if (!username) {
            alert('Please enter a username.');
            return;
        }

        if (MOCK_MODE) {
            walletUsername.textContent = username;
            loginContainer.style.display = 'none';
            walletContainer.style.display = 'block';
            await loadWalletData();
            return;
        }
        
        const password = passwordInput.value.trim();
        if (!password) {
            alert('Please enter a password.');
            return;
        }

        try {
            const data = await apiFetch('/api/v1/auth/jwt-token', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            accessToken = data.access;
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
        if (MOCK_MODE) {
            alert('Functionality disabled in mock mode.');
            return;
        }
        // ... (rest of the function is for non-mock mode)
    });

    createNftButton.addEventListener('click', async () => {
        if (MOCK_MODE) {
            alert('Functionality disabled in mock mode.');
            return;
        }
        // ... (rest of the function is for non-mock mode)
    });
});