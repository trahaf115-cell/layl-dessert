/* ===== ليل - Layl Dessert ===== */

const CART_KEY = 'layl_cart_v1';

const state = {
  products: [],
  settings: {},
  cart: [],
  category: 'all'
};

const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

function money(n){
  return Number(n).toFixed(2) + ' د.أ';
}

function escapeHtml(str = ''){
  return String(str).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

async function init(){
  state.cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

  try {
    const [pRes, sRes] = await Promise.all([
      fetch('content/products.json', { cache: 'no-store' }),
      fetch('content/settings.json', { cache: 'no-store' })
    ]);
    const pData = await pRes.json();
    state.settings = await sRes.json();
    state.products = (pData.items || []).filter(p => p.available !== false);
  } catch (e) {
    console.error('فشل تحميل البيانات:', e);
  }

  applySettings();
  renderCategories();
  renderProducts();
  renderCart();
  bindEvents();

  $('#year').textContent = new Date().getFullYear();
}

function applySettings(){
  const s = state.settings || {};
  const wa = (s.whatsapp || '').replace(/\D/g, '');
  if (wa){
    $('#cWhatsapp').href = `https://wa.me/${wa}`;
    $('#cWhatsappText').textContent = '+' + wa;
  }
  if (s.phone){
    $('#cPhone').href = `tel:${s.phone.replace(/\s/g,'')}`;
    $('#cPhoneText').textContent = s.phone;
  }
  if (s.email){
    $('#cEmail').href = `mailto:${s.email}`;
    $('#cEmailText').textContent = s.email;
  }
  if (s.instagram){
    $('#cInstagram').href = s.instagram.startsWith('http') ? s.instagram : `https://instagram.com/${s.instagram.replace('@','')}`;
    $('#cInstagramText').textContent = s.instagram;
  }
  if (s.facebook){
    $('#cFacebook').href = s.facebook.startsWith('http') ? s.facebook : `https://facebook.com/${s.facebook}`;
    $('#cFacebookText').textContent = s.facebook;
  }
  if (s.address){
    $('#cAddress').textContent = s.address;
  }
}

function renderCategories(){
  const box = $('#categories');
  const cats = [...new Set(state.products.map(p => p.category).filter(Boolean))];
  const all = ['all', ...cats];

  box.innerHTML = all.map(c => `
    <button class="cat-btn ${c === state.category ? 'active' : ''}" data-cat="${escapeHtml(c)}">
      ${c === 'all' ? 'الكل' : escapeHtml(c)}
    </button>
  `).join('');
}

function renderProducts(){
  const grid = $('#productsGrid');
  const list = state.category === 'all'
    ? state.products
    : state.products.filter(p => p.category === state.category);

  if (!list.length){
    grid.innerHTML = `<div class="loading">لا توجد أصناف في هذا التصنيف حالياً.</div>`;
    return;
  }

  grid.innerHTML = list.map((p, i) => {
    const img = p.image
      ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">`
      : '';
    return `
      <article class="product-card" style="animation-delay:${i * 60}ms">
        <div class="product-img">
          ${img}
          ${p.category ? `<span class="product-cat">${escapeHtml(p.category)}</span>` : ''}
        </div>
        <div class="product-body">
          <h3 class="product-name">${escapeHtml(p.name)}</h3>
          <p class="product-desc">${escapeHtml(p.description || '')}</p>
          <div class="product-footer">
            <span class="product-price">${money(p.price)}</span>
            <button class="add-btn" data-name="${escapeHtml(p.name)}">أضف للسلة</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function saveCart(){
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
}

function addToCart(name){
  const p = state.products.find(x => x.name === name);
  if (!p) return;

  const existing = state.cart.find(x => x.name === name);
  if (existing) existing.qty += 1;
  else state.cart.push({ name: p.name, price: Number(p.price), image: p.image || '', qty: 1 });

  saveCart();
  renderCart();
  openCart();
}

function changeQty(name, delta){
  const item = state.cart.find(x => x.name === name);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter(x => x.name !== name);
  saveCart();
  renderCart();
}

function removeItem(name){
  state.cart = state.cart.filter(x => x.name !== name);
  saveCart();
  renderCart();
}

function cartTotal(){
  return state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function cartCount(){
  return state.cart.reduce((sum, i) => sum + i.qty, 0);
}

function renderCart(){
  const body = $('#cartBody');
  const foot = $('#cartFoot');
  const count = cartCount();

  $('#cartCount').textContent = count;
  $('#fabCount').textContent = count;
  $('#fabCart').classList.toggle('show', count > 0);

  if (!state.cart.length){
    body.innerHTML = `<p class="empty-cart">سلتك فارغة حالياً 🍫</p>`;
    foot.style.display = 'none';
    return;
  }

  body.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      ${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : `<img alt="">`}
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">${money(item.price)}</div>
        <div class="qty-controls">
          <button data-action="dec" data-name="${escapeHtml(item.name)}">−</button>
          <span>${item.qty}</span>
          <button data-action="inc" data-name="${escapeHtml(item.name)}">+</button>
          <button class="remove-btn" data-action="remove" data-name="${escapeHtml(item.name)}">حذف</button>
        </div>
      </div>
    </div>
  `).join('');

  $('#cartTotal').textContent = money(cartTotal());
  foot.style.display = 'block';
}

/* ---------- Checkout via Email (Netlify Forms) ---------- */
function checkout(){
  if (!state.cart.length) return;

  const name    = $('#orderName').value.trim();
  const phone   = $('#orderPhone').value.trim();
  const address = $('#orderAddress').value.trim();
  const notes   = $('#orderNotes').value.trim();

  if (!name || !phone || !address){
    alert('الرجاء إدخال الاسم ورقم الهاتف والعنوان.');
    return;
  }

  const lines = state.cart.map(i => `${i.qty} × ${i.name} — ${money(i.price * i.qty)}`).join(' | ');

  const formData = new FormData();
  formData.append('form-name', 'order');
  formData.append('name', name);
  formData.append('phone', phone);
  formData.append('address', address);
  formData.append('notes', notes);
  formData.append('items', lines);
  formData.append('total', money(cartTotal()));

  fetch('/', {
    method: 'POST',
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(formData).toString()
  })
  .then(() => {
    alert('تم إرسال طلبك بنجاح! رح نتواصل معك قريباً.');
    state.cart = [];
    saveCart();
    renderCart();
    closeCart();
  })
  .catch((error) => {
    console.error(error);
    alert('عذراً، صار خطأ أثناء إرسال الطلب. جربي مرة ثانية.');
  });
}

function openCart(){
  $('#cartDrawer').classList.add('open');
  $('#cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart(){
  $('#cartDrawer').classList.remove('open');
  $('#cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function bindEvents(){
  $('#categories').addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    state.category = btn.dataset.cat;
    renderCategories();
    renderProducts();
  });

  $('#productsGrid').addEventListener('click', e => {
    const btn = e.target.closest('.add-btn');
    if (!btn) return;
    addToCart(btn.dataset.name);
    btn.textContent = '✓ أُضيف';
    btn.classList.add('added');
    setTimeout(() => {
      btn.textContent = 'أضف للسلة';
      btn.classList.remove('added');
    }, 1200);
  });

  $('#cartBody').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, name } = btn.dataset;
    if (action === 'inc') changeQty(name, 1);
    if (action === 'dec') changeQty(name, -1);
    if (action === 'remove') removeItem(name);
  });

  $('#cartBtn').addEventListener('click', openCart);
  $('#fabCart').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  $('#cartOverlay').addEventListener('click', closeCart);

  $('#checkoutBtn').addEventListener('click', checkout);

  $('#menuToggle').addEventListener('click', () => {
    $('#nav').classList.toggle('open');
  });
  $$('#nav a').forEach(a => a.addEventListener('click', () => {
    $('#nav').classList.remove('open');
  }));

  window.addEventListener('scroll', () => {
    $('#header').style.background = window.scrollY > 40
      ? 'rgba(21,12,7,.92)'
      : 'rgba(21,12,7,.65)';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCart();
  });
}

document.addEventListener('DOMContentLoaded', init);
