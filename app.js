document.addEventListener('DOMContentLoaded', () => {
    // ==== JWT 管理 ====
    let accessToken = null;
    let refreshToken = null;

    // ページロード時にlocalStorageからトークンを読み込む
    const storedTokens = localStorage.getItem('jwt');
    if (storedTokens) {
        const parsedTokens = JSON.parse(storedTokens);
        accessToken = parsedTokens.access;
        refreshToken = parsedTokens.refresh;
    }

    const setTokens = (data) => {
        // simplejwt のデフォは { access, refresh }
        accessToken = data.access || accessToken;
        refreshToken = data.refresh || refreshToken;
        localStorage.setItem('jwt', JSON.stringify({ access: accessToken, refresh: refreshToken }));
    };

    // --- Helper (必要なら残すが、基本 JWT 化で未使用になる想定) ---
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

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

    // ==== 共通フェッチ（JWT自動付与 & 自動リフレッシュ）====
    const rawFetch = async (endpoint, options = {}) => {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = { ...(options.headers || {}) };

        // JWTをつける（手動で指定されていなければ）
        if (accessToken && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // JSON文字列なら Content-Type を自動付与（FormDataは付けない）
        if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        // CORSでCookieを使う可能性も残しておく（将来用）
        const resp = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
        });
        return resp;
    };

    // 401時に1回だけリフレッシュしてリトライ
    const apiFetch = async (endpoint, options = {}) => {
        let resp = await rawFetch(endpoint, options);

        if (resp.status === 401 && refreshToken) {
            // アクセス期限切れ → リフレッシュ試行
            const refreshResp = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
                credentials: 'include',
            });

            if (refreshResp.ok) {
                const data = await refreshResp.json().catch(() => ({}));
                if (data.access) {
                    accessToken = data.access;
                    // リトライ
                    resp = await rawFetch(endpoint, options);
                }
            }
        }

        if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
                throw new Error(errorData.detail || errorData.error || `HTTP error! ${response.status}`);
            }

            // ログイン成功時のレスポンスからトークンを取得し、保存する
            const loginData = await response.json(); // レスポンスをJSONとしてパース
            setTokens(loginData); // setTokens関数でトークンを保存

            // ログイン成功時の処理
            walletUsername.textContent = username;
