const STORE_KEY = 'threeRootsPresentationCart';
const state = {
  lang: localStorage.getItem('threeRootsLang') || 'en',
  filter: 'all',
  delivery: 'pickup',
  payment: 'card'
};

const products = [
  {
    id: 'supreme',
    name: 'Supreme Rooster Mix',
    image: './product-supreme-clean.webp',
    price: 26.95,
    category: 'conditioner',
    nutrition: ['14% protein', '4% fat', '6% fiber'],
    description: ['A colorful whole-grain and pellet blend for a managed rooster-feeding program.', 'Mezcla colorida de granos enteros y pellets para un programa controlado de alimentación de gallos.']
  },
  {
    id: 'king',
    name: 'King Rooster Conditioner',
    image: './product-king-clean.webp',
    price: 29.95,
    category: 'conditioner',
    nutrition: ['18% protein', '7% fat', '6% fiber'],
    description: ['A higher-protein and higher-fat conditioning profile with peas, soybean, and safflower.', 'Perfil de acondicionamiento con más proteína y grasa, con chícharos, soya y cártamo.']
  },
  {
    id: 'maintenance',
    name: 'Maintenance Regular',
    image: './product-maintenance-clean.webp',
    price: 23.95,
    category: 'maintenance',
    nutrition: ['14% protein', '4% fat', '4% fiber'],
    description: ['A straightforward grain-and-pellet profile for a regular maintenance routine.', 'Perfil sencillo de granos y pellets para una rutina regular de mantenimiento.']
  },
  {
    id: 'pigeon',
    name: 'Pigeon Mix–High Protein',
    image: './product-pigeon-clean.webp',
    price: 27.95,
    category: 'specialty',
    nutrition: ['17% protein', '5% fat', '7% fiber'],
    description: ['An eight-grain scratch mix with peas, safflower, milo, wheat, oat, and popcorn.', 'Mezcla scratch de ocho granos con chícharos, cártamo, milo, trigo, avena y palomitas.']
  },
  {
    id: 'conditioner',
    name: 'Golden Rooster Conditioner',
    image: './product-conditioner.webp',
    price: 28.95,
    category: 'conditioner',
    nutrition: ['18% protein', '5% fat', '3% fiber'],
    description: ['Balanced conditioning with recognizable grains and a clean golden profile.', 'Acondicionamiento equilibrado con granos reconocibles y un perfil limpio y dorado.']
  },
  {
    id: 'performance',
    name: 'Total Performance Maintenance',
    image: './product-performance.webp',
    price: 24.95,
    category: 'maintenance',
    nutrition: ['13.5% protein', '3.5% fat', '6% fiber'],
    description: ['A varied maintenance blend for a steady daily feeding routine.', 'Mezcla variada de mantenimiento para una rutina diaria constante.']
  }
];

const demoCheckoutCart = [
  { id: 'supreme', qty: 2 },
  { id: 'king', qty: 1 }
];

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function getCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => products.some(product => product.id === item.id) && item.qty > 0) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(STORE_KEY, JSON.stringify(cart));
}

function productById(id) {
  return products.find(product => product.id === id);
}

function itemCount(cart) {
  return cart.reduce((total, item) => total + item.qty, 0);
}

function subtotal(cart) {
  return cart.reduce((total, item) => total + productById(item.id).price * item.qty, 0);
}

function activeCheckoutCart() {
  const cart = getCart();
  return cart.length ? cart : demoCheckoutCart;
}

function updateCartCounts(cart = getCart()) {
  document.querySelectorAll('.cart-count').forEach(counter => {
    counter.textContent = itemCount(cart);
    counter.setAttribute('aria-label', state.lang === 'en' ? `${itemCount(cart)} items in cart` : `${itemCount(cart)} productos en el carrito`);
  });
}

function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem('threeRootsLang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-en]').forEach(element => { element.innerHTML = element.dataset[lang]; });
  document.querySelectorAll('[data-lang]').forEach(button => {
    const active = button.dataset.lang === lang;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderCatalog();
  renderCart();
  renderCheckoutSummary();
}

function renderCatalog() {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;
  const languageIndex = state.lang === 'en' ? 0 : 1;
  const filtered = state.filter === 'all' ? products : products.filter(product => product.category === state.filter);
  grid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <div class="product-photo">
        <img src="${product.image}" alt="${product.name} Three Roots feed product">
        <span class="demo-price">${state.lang === 'en' ? 'Demo price' : 'Precio demo'}</span>
      </div>
      <div class="product-copy">
        <h3>${product.name}</h3>
        <p>${product.description[languageIndex]}</p>
        <div class="nutrition">${product.nutrition.map(value => `<span>${value}</span>`).join('')}</div>
        <div class="product-buy">
          <div class="price"><strong>${money(product.price)}</strong><small>${state.lang === 'en' ? 'sample per-bag price' : 'precio de ejemplo por bolsa'}</small></div>
          <button class="btn btn-gold add-btn" type="button" data-add-product="${product.id}">${state.lang === 'en' ? 'Add to cart' : 'Agregar'}</button>
        </div>
      </div>
    </article>`).join('');
  grid.querySelectorAll('[data-add-product]').forEach(button => button.addEventListener('click', () => addToCart(button.dataset.addProduct)));
}

function addToCart(id) {
  const cart = getCart();
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart(cart);
  renderCart();
  showToast(state.lang === 'en' ? `${productById(id).name} added to the presentation cart.` : `${productById(id).name} se agregó al carrito de presentación.`);
}

function changeQuantity(id, change) {
  const cart = getCart();
  const item = cart.find(entry => entry.id === id);
  if (!item) return;
  item.qty += change;
  saveCart(cart.filter(entry => entry.qty > 0));
  renderCart();
}

function renderCart() {
  const target = document.getElementById('cartItems');
  const cart = getCart();
  updateCartCounts(cart);
  if (!target) return;
  if (!cart.length) {
    target.innerHTML = `<div class="empty-cart"><b>${state.lang === 'en' ? 'Your cart is ready.' : 'Su carrito está listo.'}</b>${state.lang === 'en' ? 'Add a product to preview the order flow.' : 'Agregue un producto para ver el proceso del pedido.'}</div>`;
  } else {
    target.innerHTML = cart.map(item => {
      const product = productById(item.id);
      return `<div class="cart-item">
        <img src="${product.image}" alt="">
        <div><b>${product.name}</b><small>${money(product.price)} ${state.lang === 'en' ? 'each' : 'cada uno'}</small><div class="quantity"><button type="button" data-quantity="-1" data-id="${item.id}" aria-label="Decrease quantity">−</button><span>${item.qty}</span><button type="button" data-quantity="1" data-id="${item.id}" aria-label="Increase quantity">+</button></div></div>
        <div class="item-total">${money(product.price * item.qty)}</div>
      </div>`;
    }).join('');
    target.querySelectorAll('[data-quantity]').forEach(button => button.addEventListener('click', () => changeQuantity(button.dataset.id, Number(button.dataset.quantity))));
  }
  const amount = subtotal(cart);
  const subtotalElement = document.getElementById('cartSubtotal');
  const totalElement = document.getElementById('cartTotal');
  if (subtotalElement) subtotalElement.textContent = money(amount);
  if (totalElement) totalElement.textContent = money(amount);
}

function renderCheckoutSummary() {
  const target = document.getElementById('summaryItems');
  if (!target) return;
  const cart = activeCheckoutCart();
  updateCartCounts(cart);
  target.innerHTML = cart.map(item => {
    const product = productById(item.id);
    return `<div class="summary-item"><span><b>${item.qty}×</b> ${product.name}</span><strong>${money(product.price * item.qty)}</strong></div>`;
  }).join('');
  const productSubtotal = subtotal(cart);
  const delivery = state.delivery === 'delivery' ? 45 : 0;
  document.getElementById('summarySubtotal').textContent = money(productSubtotal);
  document.getElementById('summaryDelivery').textContent = money(delivery);
  document.getElementById('summaryTotal').textContent = money(productSubtotal + delivery);
}

function setupFilters() {
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(filter => filter.classList.toggle('active', filter === button));
    renderCatalog();
  }));
}

function setupCheckout() {
  if (document.body.dataset.page !== 'checkout') return;
  document.querySelectorAll('input[name="delivery"]').forEach(input => input.addEventListener('change', () => {
    state.delivery = input.value;
    const fields = document.getElementById('deliveryFields');
    fields.hidden = state.delivery !== 'delivery';
    fields.querySelectorAll('input').forEach(field => { field.required = state.delivery === 'delivery'; });
    renderCheckoutSummary();
  }));
  document.querySelectorAll('[data-payment]').forEach(button => button.addEventListener('click', () => {
    state.payment = button.dataset.payment;
    document.querySelectorAll('[data-payment]').forEach(tab => {
      const active = tab === button;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    document.getElementById('cardPayment').hidden = state.payment !== 'card';
    document.getElementById('achPayment').hidden = state.payment !== 'ach';
  }));
  document.getElementById('checkoutForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    window.location.href = 'order-confirmation.html?demo=1';
  });
}

let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
setupFilters();
setupCheckout();
setLanguage(state.lang);
