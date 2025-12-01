// ==========================================
// APP.JS - VERSÃO SEGURA (Com Bloqueio de Login)
// ==========================================

// Configuração da API
const API_BASE = 'http://localhost:3000'; 

// Estado Global
let currentUser = null;
let cart = [];
let products = [];
let filteredProducts = [];

// Elementos do DOM
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const productsGrid = document.getElementById('productsGrid');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartSidebar = document.getElementById('cartSidebar');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const loginLink = document.getElementById('loginLink');
const productModal = document.getElementById('productModal');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const adminPanel = document.getElementById('adminPanel');
const adminBtn = document.getElementById('adminBtn');

// Inicializa o App
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupEventListeners();
    checkAuthStatus();
    loadProducts(); 
}

// Event Listeners
function setupEventListeners() {
    // Busca
    if(searchBtn) searchBtn.addEventListener('click', handleSearch);
    if(searchInput) searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Carrinho
    if(cartBtn) cartBtn.addEventListener('click', openCart);
    const closeCartBtn = document.querySelector('.cart-close');
    if(closeCartBtn) closeCartBtn.addEventListener('click', closeCart);

    // Auth
    if(logoutBtn) logoutBtn.addEventListener('click', logout);

    // Checkout
    const checkoutBtn = document.getElementById('checkoutBtn');
    if(checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);

    // Admin
    if(adminBtn) adminBtn.addEventListener('click', () => window.open('./html/produto.html', '_blank'));

    // Fechar carrinho ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === cartSidebar && cartSidebar.classList.contains('open')) {
            closeCart();
        }
    });
}

// Funções de Ajuda da API
async function apiRequest(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || data.message || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth Functions
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('statusLog');
    currentUser = null;
    cart = [];
    updateUI();
    showMessage('Logout realizado com sucesso!', 'success');
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
        currentUser = JSON.parse(user);
    }
    updateUI();
}

// Funções de Produtos
async function loadProducts() {
    try {
        if(loading) loading.style.display = 'block';
        if(errorDiv) errorDiv.style.display = 'none';

        // Busca do Banco de Dados
        const data = await apiRequest('/produto');
        products = data;
        filteredProducts = [...products];

        displayProducts(filteredProducts);
    } catch (error) {
        if(errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    } finally {
        if(loading) loading.style.display = 'none';
    }
}

function displayProducts(productsToShow) {
    if(!productsGrid) return;
    productsGrid.innerHTML = '';

    if (productsToShow.length === 0) {
        productsGrid.innerHTML = '<p class="no-products">Nenhum produto encontrado.</p>';
        return;
    }

    productsToShow.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    // VISUAL V2: Usando IMAGEM
    const imageUrl = product.imagem_url || 'https://via.placeholder.com/300x300?text=Sem+Imagem';

    card.innerHTML = `
        <div class="product-image">
            <img src="${imageUrl}" alt="${product.nome}" onerror="this.src='https://via.placeholder.com/300x300?text=Erro+Imagem';">
            </div>
            <div class="product-info">
            <h3 class="product-name">${product.nome}</h3>
            <p class="product-brand">${product.modelo}</p>
            <br>  
            <p class="product-brand">${product.marca}</p>  
            <p class="product-price">R$ ${parseFloat(product.preco).toFixed(2)}</p>
            <div class="product-actions">
                <button class="add-to-cart-btn" onclick="addToCart(${product.codProduto})">
                    <i class="fas fa-cart-plus"></i> Adicionar
                </button>
            </div>
        </div>
    `;

    const imgDiv = card.querySelector('.product-image');
    if(imgDiv) imgDiv.onclick = () => viewProductDetails(product.codProduto);

    return card;
}

function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
        filteredProducts = [...products];
    } else {
        filteredProducts = products.filter(product =>
            product.nome.toLowerCase().includes(query) ||
            product.marca.toLowerCase().includes(query)
        );
    }

    displayProducts(filteredProducts);
}

// Funções do Carrinho
function addToCart(productId) {
    // === SEGURANÇA ATIVADA ===
    if (!currentUser) {
        showMessage('Faça login para comprar!', 'warning');
        // Redireciona para a tela de login após 1.5 segundos
        setTimeout(() => {
            window.location.href = './html/login.html';
        }, 1500);
        return;
    }

    const product = products.find(p => p.codProduto === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.codProduto === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    updateCartUI();
    showMessage(`${product.nome} adicionado ao carrinho!`, 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.codProduto !== productId);
    updateCartUI();
}

function updateCartQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const item = cart.find(item => item.codProduto === productId);
    if (item) {
        item.quantity = newQuantity;
        updateCartUI();
    }
}

function updateCartUI() {
    if(cartCount) cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    updateCartModal();
}

// Layout do Carrinho (Corrigido para estilo V2)
function updateCartModal() {
    if(!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Carrinho vazio</p>';
        if(cartTotal) cartTotal.textContent = '0.00';
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #ccc; padding-bottom:5px;">
            <div>
                <strong>${item.nome}</strong><br>
                <small>Qtd: ${item.quantity}</small>
            </div>
            <div style="text-align:right;">
                <span style="color:green; font-weight:bold;">R$ ${(item.preco * item.quantity).toFixed(2)}</span><br>
                <button onclick="removeFromCart(${item.codProduto})" style="background:red; padding:2px 5px; font-size:0.7rem; margin-top:2px; color: white; border: none; border-radius: 4px; cursor: pointer;">X</button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.preco * item.quantity), 0);
    if(cartTotal) cartTotal.textContent = total.toFixed(2);
}

// CHECKOUT
async function handleCheckout() {
    // === SEGURANÇA EXTRA NO CHECKOUT ===
    if (!currentUser) {
        showMessage('Faça login para finalizar a compra.', 'warning');
        return;
    }

    if (cart.length === 0) {
        showMessage('Seu carrinho está vazio.', 'warning');
        return;
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.open('./html/checkout.html', '_blank');
    closeCart();
}

// UI Functions
function updateUI() {
    if (currentUser) {
        if(loginLink) loginLink.style.display = 'none';
        if(userInfo) userInfo.style.display = 'flex';
        if(userName) userName.textContent = `Olá, ${currentUser.nome}`;

        if (currentUser.tipo_usuario === 'ADMIN') {
            if(adminPanel) adminPanel.style.display = 'block';
        }
    } else {
        if(loginLink) loginLink.style.display = 'inline';
        if(userInfo) userInfo.style.display = 'none';
        if(adminPanel) adminPanel.style.display = 'none';
    }
}

function openCart() {
    updateCartModal();
    if(cartSidebar) cartSidebar.classList.add('open');
}

function closeCart() {
    if(cartSidebar) cartSidebar.classList.remove('open');
}

// Modal de Detalhes
function viewProductDetails(productId) {
    const product = products.find(p => p.codProduto === productId);
    if (!product) return;

    const productDetails = document.getElementById('productDetails');
    const productModalTitle = document.getElementById('productModalTitle');

    if(productModalTitle) productModalTitle.textContent = product.nome;

    const imageUrl = product.imagem_url || 'https://via.placeholder.com/400x400?text=Sem+Imagem';

    if(productDetails) {
        productDetails.innerHTML = `
            <div class="product-detail">
                <div class="product-detail-image">
                    <img src="${imageUrl}" alt="${product.nome}" onerror="this.src='https://via.placeholder.com/400x400?text=Erro+Imagem';">
                </div>
                <div class="product-detail-info">
                    <div class="product-detail-header">
                        <h2>${product.nome}</h2>
                        <p class="product-brand" style="margin-top:10px;">Marca: <strong>${product.marca}</strong></p>
                    </div>

                    <div class="product-price-large" style="font-size: 2rem; color: rgb(47, 99, 59); margin: 20px 0;">
                        <strong>R$ ${parseFloat(product.preco).toFixed(2)}</strong>
                    </div>

                    ${product.descricao ? `<div class="product-description">
                        <h3>Descrição</h3>
                        <p>${product.descricao}</p>
                    </div>` : ''}

                    <div class="product-actions-large">
                        <button class="add-to-cart-btn-large" onclick="addToCart(${product.codProduto}); closeModal();" style="width:100%; background:black; color:white; padding:15px; border:none; cursor:pointer; font-weight:bold;">
                            <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    openModal(productModal);
}

function closeModal() {
    const modal = document.getElementById('productModal');
    if(modal) modal.style.display = 'none';
}

function openModal(modal) {
    if(!modal) return;
    modal.style.display = 'block';
    const closeBtn = modal.querySelector('.close');
    if(closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = 'none';
    }
}

// Mensagens Coloridas
function showMessage(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const colors = {
        success: 'rgb(115, 163, 92)', 
        error: '#ff4757',            
        warning: '#f3c107',          
        info: 'black'                
    };

    const bgColor = colors[type] || colors.info;
    const textColor = type === 'warning' ? 'black' : 'white';

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        background-color: ${bgColor};
        color: ${textColor};
        font-weight: bold;
        z-index: 3000;
        box-shadow: 5px 5px 0px rgba(0,0,0,0.2);
        border: 2px solid white;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .no-products {
        grid-column: 1 / -1;
        text-align: center;
        font-size: 1.2rem;
        padding: 40px;
    }
`;
document.head.appendChild(style);