// ১. প্রাথমিক ডাটা ও সেটিংস
let storeSettings = JSON.parse(localStorage.getItem('trustedShopSettings')) || {
    name: 'TRUSTED SHOP',
    phone: '8801854999250',
    banner: 'banner.png'
};

let deliveryOptions = JSON.parse(localStorage.getItem('trustedShopDelivery')) || [
    { id: 1, name: 'হোম ডেলিভারি', charge: 120 },
    { id: 2, name: 'পোস্ট অফিসের মাধ্যমে', charge: 30 }
];

let products = JSON.parse(localStorage.getItem('trustedShopProducts')) || [
    {
        id: 101,
        category: 'Electronics',
        name: 'Smart Watch Ultra Series',
        images: ['https://placehold.co/400x400/111111/d4af37?text=Smart+Watch+1'],
        desc: 'প্রিমিয়াম কোয়ালিটি স্মার্ট ওয়াচ।\n• ফুল টাচ এইচডি ডিসপ্লে\n• ওয়াটারপ্রুফ এবং লং ব্যাটারি ব্যাকআপ',
        price: 1850,
        oldPrice: 2500
    },
    {
        id: 102,
        category: 'Fashion',
        name: 'Premium Leather Belt & Wallet Combo',
        images: ['https://placehold.co/400x400/111111/d4af37?text=Leather+Combo'],
        desc: '১০০% অরিজিনাল লেদার বেল্ট এবং মানিব্যাগ গিফট বক্স।',
        price: 1250,
        oldPrice: 1600
    }
];

let orders = JSON.parse(localStorage.getItem('trustedShopOrders')) || [];
let cart = [];
let isAdmin = false;
let currentCategory = 'All';

// পেজ লোড হলে ইনিশিয়ালাইজেশন
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('customPrintArea')) {
        const printDiv = document.createElement('div');
        printDiv.id = 'customPrintArea';
        document.body.appendChild(printDiv);
    }

    applySettings();
    renderCategories();
    renderProducts();
    renderDeliveryOptions();
    updateCartUI();

    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('orderFilterDate');
    if (dateInput) dateInput.value = today;
});

function applySettings() {
    if (document.getElementById('headerStoreName')) document.getElementById('headerStoreName').innerText = storeSettings.name;
    if (document.getElementById('footerStoreName')) document.getElementById('footerStoreName').innerText = storeSettings.name;
    if (document.getElementById('topPhoneDisplay')) document.getElementById('topPhoneDisplay').innerText = '+' + storeSettings.phone;
    const bannerImg = document.getElementById('heroBannerImg');
    if (bannerImg && storeSettings.banner) bannerImg.src = storeSettings.banner;
}

function renderCategories() {
    const catContainer = document.getElementById('categoryContainer');
    if (!catContainer) return;

    const categories = ['All', ...new Set(products.map(p => p.category))];
    catContainer.innerHTML = categories.map(cat => `
        <button class="cat-btn ${currentCategory === cat ? 'active' : ''}" onclick="filterCategory('${cat}')">
            ${cat === 'All' ? 'সব ক্যাটাগরি' : cat}
        </button>
    `).join('');

    const adminCatSelect = document.getElementById('prodCatSelect');
    if (adminCatSelect) {
        const existingCats = [...new Set(products.map(p => p.category))];
        adminCatSelect.innerHTML = existingCats.map(c => `<option value="${c}">${c}</option>`).join('') +
                                   `<option value="NEW">+ নতুন ক্যাটাগরি লিখুন</option>`;
    }
}

function filterCategory(cat) {
    currentCategory = cat;
    renderCategories();
    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    const filtered = currentCategory === 'All'
        ? products
        : products.filter(p => p.category === currentCategory);

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:20px;">এই ক্যাটাগরিতে কোনো পণ্য নেই।</p>';
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const mainImg = (p.images && p.images.length > 0) ? p.images[0] : '📦';
        const imgHTML = (mainImg.startsWith('http') || mainImg.startsWith('data:') || mainImg.endsWith('.png') || mainImg.endsWith('.jpg') || mainImg.endsWith('.jpeg') || mainImg.endsWith('.webp'))
            ? `<img src="${mainImg}" alt="${p.name}">`
            : mainImg;

        return `
        <div class="card">
            <span class="badge">${p.category}</span>
            <div class="admin-card-actions" style="display: ${isAdmin ? 'flex' : 'none'};">
                <button class="edit-card-btn" onclick="openEditProduct(${p.id})">✏ Edit</button>
                <button class="del-btn" onclick="deleteProduct(${p.id})">✕</button>
            </div>
            <div class="clickable-area" onclick="openProductDetails(${p.id})">
                <div class="p-img">${imgHTML}</div>
                <div class="p-title">${p.name}</div>
                <div class="p-desc">${p.desc}</div>
                <div class="price">
                    <span class="new-p">৳ ${p.price}</span>
                    ${p.oldPrice ? `<span class="old-p">৳ ${p.oldPrice}</span>` : ''}
                </div>
            </div>
            <button class="wa-order-btn" onclick="addToCart(${p.id})">🛒 কার্টে যুক্ত করুন</button>
        </div>
        `;
    }).join('');
}

function openProductDetails(id) {
    const p = products.find(item => item.id === id);
    if (!p) return;

    const modal = document.getElementById('productDetailModal');
    if (!modal) return;

    const firstImg = (p.images && p.images.length > 0) ? p.images[0] : '';
    const thumbsHTML = (p.images || []).map((img, idx) => `
        <img src="${img}" class="thumb-item ${idx === 0 ? 'active-thumb' : ''}"
             onclick="changeDetailMainImage(this, '${img}')">
    `).join('');

    document.getElementById('detailModalBody').innerHTML = `
        <div style="text-align:center;">
            <img id="detailMainImg" src="${firstImg}" style="width:100%; max-height:300px; object-fit:contain; border-radius:8px; background:#f9f9f9;">
            ${p.images.length > 1 ? `<div class="detail-thumbs">${thumbsHTML}</div>` : ''}
        </div>
        <h3 style="margin-top:15px; border:none;">${p.name}</h3>
        <div class="price" style="margin-bottom:10px;">
            <span class="new-p" style="font-size:20px;">৳ ${p.price}</span>
            ${p.oldPrice ? `<span class="old-p">৳ ${p.oldPrice}</span>` : ''}
        </div>
        <div class="formatted-desc">${p.desc}</div>
        <div class="m-btns">
            <button class="btn-green" onclick="addToCart(${p.id}); closeModal('productDetailModal');">🛒 কার্টে যোগ করুন</button>
            <button class="btn-gray" onclick="closeModal('productDetailModal')">বন্ধ করুন</button>
        </div>
    `;
    modal.style.display = 'flex';
}

function changeDetailMainImage(thumbEl, imgSrc) {
    document.getElementById('detailMainImg').src = imgSrc;
    document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active-thumb'));
    thumbEl.classList.add('active-thumb');
}

function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    openModal('cartModal');
}

function updateQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== id);
    }
    updateCartUI();
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
}

function renderDeliveryOptions() {
    const select = document.getElementById('deliverySelect');
    if (!select) return;
    select.innerHTML = deliveryOptions.map(opt =>
        `<option value="${opt.charge}" data-name="${opt.name}">${opt.name} - ৳ ${opt.charge}</option>`
    ).join('');
}

function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.innerText = totalCount);

    const cartListEl = document.getElementById('cartItemsList');
    if (cartListEl) {
        if (cart.length === 0) {
            cartListEl.innerHTML = '<p style="text-align:center; color:#777;">আপনার কার্ট খালি</p>';
        } else {
            cartListEl.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div>
                        <b>${item.name}</b><br>
                        <small>৳ ${item.price} x ${item.qty}</small>
                    </div>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
                        <button class="remove-item-btn" onclick="removeFromCart(${item.id})">✕</button>
                    </div>
                </div>
            `).join('');
        }
    }
    calculateTotalBill();
}

function calculateTotalBill() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const paymentMethod = document.getElementById('paymentMethod')?.value || 'COD';
    const deliverySelect = document.getElementById('deliverySelect');
    let deliveryCharge = deliverySelect ? parseInt(deliverySelect.value || 0) : 120;

    const trxField = document.getElementById('trxField');
    const payInfoBox = document.getElementById('paymentInfoBox');

    if (paymentMethod === 'bKash' || paymentMethod === 'Nagad') {
        if (trxField) trxField.style.display = 'block';
        if (payInfoBox) {
            payInfoBox.style.display = 'block';
            payInfoBox.innerHTML = `পার্সোনাল <b>${paymentMethod}</b> নম্বর: <b>+${storeSettings.phone}</b> (Send Money করে নিচে নম্বর ও TrxID দিন)`;
        }
    } else {
        if (trxField) trxField.style.display = 'none';
        if (payInfoBox) payInfoBox.style.display = 'none';
    }

    if (subtotal >= 2000 || subtotal === 0) {
        deliveryCharge = 0;
    }

    const grandTotal = subtotal + deliveryCharge;

    if (document.getElementById('cartSubtotal')) document.getElementById('cartSubtotal').innerText = subtotal;
    if (document.getElementById('cartDelivery')) document.getElementById('cartDelivery').innerText = deliveryCharge;
    if (document.getElementById('cartGrandTotal')) document.getElementById('cartGrandTotal').innerText = grandTotal;
}

function confirmOrder() {
    if (cart.length === 0) {
        alert('আপনার কার্টে কোনো পণ্য নেই! অনুগ্রহ করে আগে পণ্য কার্টে যোগ করুন।');
        return;
    }

    const nameEl = document.getElementById('custName');
    const phoneEl = document.getElementById('custPhone');
    const addressEl = document.getElementById('custAddress');
    const paymentEl = document.getElementById('paymentMethod');
    const trxEl = document.getElementById('custTrxId');
    const deliverySelect = document.getElementById('deliverySelect');

    const name = nameEl ? nameEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const address = addressEl ? addressEl.value.trim() : '';
    const paymentMethod = paymentEl ? paymentEl.value : 'COD';
    const trxId = trxEl ? trxEl.value.trim() : '';

    if (!name || !phone || !address) {
        alert('দয়া করে আপনার নাম, মোবাইল নম্বর এবং ডেলিভারি ঠিকানা সঠিকভাবে দিন।');
        return;
    }

    if ((paymentMethod === 'bKash' || paymentMethod === 'Nagad') && !trxId) {
        alert('বিকাশ বা নগদে পেমেন্ট করলে TrxID বা যে নম্বর থেকে টাকা পাঠিয়েছেন তা অবশ্যই লিখুন।');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let delivery = deliverySelect ? parseInt(deliverySelect.value || 0) : 120;
    if (subtotal >= 2000) {
        delivery = 0;
    }
    const total = subtotal + delivery;
    const today = new Date().toISOString().split('T')[0];

    const newOrder = {
        orderId: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        date: today,
        customer: { name, phone, address },
        items: [...cart],
        paymentMethod,
        trxId,
        subtotal,
        delivery,
        total
    };

    orders.push(newOrder);
    localStorage.setItem('trustedShopOrders', JSON.stringify(orders));

    if (nameEl) nameEl.value = '';
    if (phoneEl) phoneEl.value = '';
    if (addressEl) addressEl.value = '';
    if (trxEl) trxEl.value = '';

    cart = [];
    updateCartUI();
    closeModal('cartModal');

    const successModal = document.getElementById('orderSuccessModal');
    if (successModal) {
        const msgHeading = successModal.querySelector('h3');
        const msgPara = successModal.querySelector('p');
        if (msgHeading) msgHeading.innerText = 'হ্যাঁ, আপনার অর্ডারটা নিশ্চিত হয়েছে!';
        if (msgPara) msgPara.innerText = 'আমরা দ্রুত আপনার পণ্য আপনার ডেলিভারি ঠিকানায় পৌঁছে দেব। (অর্ডার আইডি: ' + newOrder.orderId + ')';
        openModal('orderSuccessModal');
    } else {
        alert('হ্যাঁ, আপনার অর্ডারটা নিশ্চিত হয়েছে। আমরা দ্রুত আপনার পণ্য আপনার ডেলিভারি ঠিকানায় পৌঁছে দেব।');
    }
}

function toggleAdminPass() {
    const passInput = document.getElementById('adminPassInput');
    const toggleBtn = document.getElementById('togglePassBtn');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleBtn.innerText = '🙈';
    } else {
        passInput.type = 'password';
        toggleBtn.innerText = '👁️';
    }
}

function handleAdminButton() {
    if (isAdmin) {
        openModal('adminPanelModal');
        renderAdminOrders();
        renderAdminProductList();
    } else {
        const passInput = document.getElementById('adminPassInput');
        if (passInput) {
            passInput.value = '';
            passInput.type = 'password';
        }
        const toggleBtn = document.getElementById('togglePassBtn');
        if (toggleBtn) toggleBtn.innerText = '👁️';
        openModal('adminLoginModal');
    }
}

function verifyAdminLogin() {
    const pass = document.getElementById('adminPassInput').value;
    if (pass === '5482') {
        isAdmin = true;
        closeModal('adminLoginModal');
        renderProducts();
        openModal('adminPanelModal');
        renderAdminOrders();
        renderAdminProductList();
    } else {
        alert('ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।');
    }
}

function switchAdminTab(tabId, tileEl) {
    document.querySelectorAll('.admin-tile').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

    tileEl.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function handleImageFiles(fileInput, callback) {
    const files = Array.from(fileInput.files);
    if (files.length === 0) {
        callback([]);
        return;
    }
    const promises = files.slice(0, 4).map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    });
    Promise.all(promises).then(base64Images => callback(base64Images));
}

function addNewProduct() {
    const catSelect = document.getElementById('prodCatSelect').value;
    const newCat = document.getElementById('newCatInput').value.trim();
    const category = (catSelect === 'NEW' && newCat) ? newCat : catSelect;

    const name = document.getElementById('prodNameInput').value.trim();
    const desc = document.getElementById('prodDescInput').value.trim();
    const price = parseInt(document.getElementById('prodPriceInput').value);
    const oldPrice = parseInt(document.getElementById('prodOldPriceInput').value) || null;
    const linkText = document.getElementById('prodImgLinksInput').value.trim();
    const fileInput = document.getElementById('prodImgFilesInput');

    if (!name || !price) {
        alert('পণ্যের নাম এবং অফার দাম আবশ্যক!');
        return;
    }

    handleImageFiles(fileInput, (uploadedImgs) => {
        const linkImgs = linkText ? linkText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
        const finalImages = [...uploadedImgs, ...linkImgs];

        const newProd = {
            id: Date.now(),
            category,
            name,
            images: finalImages.length > 0 ? finalImages : ['📦'],
            desc,
            price,
            oldPrice
        };

        products.unshift(newProd);
        localStorage.setItem('trustedShopProducts', JSON.stringify(products));

        document.getElementById('prodNameInput').value = '';
        document.getElementById('prodDescInput').value = '';
        document.getElementById('prodPriceInput').value = '';
        document.getElementById('prodOldPriceInput').value = '';
        document.getElementById('prodImgLinksInput').value = '';
        if (fileInput) fileInput.value = '';

        renderCategories();
        renderProducts();
        renderAdminProductList();
        alert('প্রোডাক্ট সফলভাবে ডাটাবেজে যুক্ত হয়েছে!');
    });
}

function openEditProduct(id) {
    const p = products.find(item => item.id === id);
    if (!p) return;

    document.getElementById('editProdId').value = p.id;
    document.getElementById('editProdCat').value = p.category;
    document.getElementById('editProdName').value = p.name;
    document.getElementById('editProdLinks').value = p.images.join(', ');
    document.getElementById('editProdDesc').value = p.desc;
    document.getElementById('editProdPrice').value = p.price;
    document.getElementById('editProdOldPrice').value = p.oldPrice || '';

    openModal('adminPanelModal');
    const prodTabTile = document.querySelectorAll('.admin-tile')[1];
    if (prodTabTile) switchAdminTab('tabProducts', prodTabTile);

    document.getElementById('editProductSection').style.display = 'block';
    document.getElementById('editProductSection').scrollIntoView({ behavior: 'smooth' });
}

function saveEditedProduct() {
    const id = parseInt(document.getElementById('editProdId').value);
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return;

    const fileInput = document.getElementById('editProdFiles');
    handleImageFiles(fileInput, (uploadedImgs) => {
        const linkText = document.getElementById('editProdLinks').value.trim();
        const linkImgs = linkText ? linkText.split(',').map(s => s.trim()).filter(Boolean) : [];
        const updatedImages = uploadedImgs.length > 0 ? uploadedImgs : linkImgs;

        products[idx] = {
            ...products[idx],
            category: document.getElementById('editProdCat').value.trim(),
            name: document.getElementById('editProdName').value.trim(),
            images: updatedImages.length > 0 ? updatedImages : products[idx].images,
            desc: document.getElementById('editProdDesc').value.trim(),
            price: parseInt(document.getElementById('editProdPrice').value),
            oldPrice: parseInt(document.getElementById('editProdOldPrice').value) || null
        };

        localStorage.setItem('trustedShopProducts', JSON.stringify(products));
        document.getElementById('editProductSection').style.display = 'none';
        renderCategories();
        renderProducts();
        renderAdminProductList();
        alert('প্রোডাক্টের তথ্য আপডেট করা হয়েছে!');
    });
}

function deleteProduct(id) {
    if (!confirm('আপনি কি নিশ্চিতভাবে এই প্রোডাক্টটি ডিলিট করতে চান?')) return;
    products = products.filter(p => p.id !== id);
    localStorage.setItem('trustedShopProducts', JSON.stringify(products));
    renderCategories();
    renderProducts();
    renderAdminProductList();
}

function renderAdminProductList() {
    const container = document.getElementById('adminExistingProdList');
    if (!container) return;
    container.innerHTML = products.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
            <span><b>${p.name}</b> (৳${p.price}) - <small>${p.category}</small></span>
            <div>
                <button class="edit-card-btn" onclick="openEditProduct(${p.id})">Edit</button>
                <button class="del-btn" onclick="deleteProduct(${p.id})">✕</button>
            </div>
        </div>
    `).join('');
}

function renderAdminOrders() {
    const selectedDate = document.getElementById('orderFilterDate')?.value;
    const filteredOrders = selectedDate
        ? orders.filter(o => o.date === selectedDate)
        : orders;

    const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);

    if (document.getElementById('dailyOrderCount')) document.getElementById('dailyOrderCount').innerText = `${filteredOrders.length} টি`;
    if (document.getElementById('dailyTotalSales')) document.getElementById('dailyTotalSales').innerText = `৳ ${totalSales}`;

    const tbody = document.getElementById('adminOrderTableBody');
    if (!tbody) return;

    tbody.innerHTML = filteredOrders.map(o => `
        <tr>
            <td><b>${o.orderId}</b><br><small>${o.date}</small></td>
            <td>${o.customer.name}<br>${o.customer.phone}<br><small>${o.customer.address}</small></td>
            <td>${o.items.map(i => `${i.name} (x${i.qty})`).join('<br>')}</td>
            <td><b>৳ ${o.total}</b><br><small>${o.paymentMethod} ${o.trxId ? `(${o.trxId})` : ''}</small></td>
        </tr>
    `).join('');
}

function printSingleVoucher() {
    const selectedDate = document.getElementById('orderFilterDate')?.value;
    const filteredOrders = selectedDate ? orders.filter(o => o.date === selectedDate) : orders;

    if (filteredOrders.length === 0) {
        alert('এই তারিখে প্রিন্ট করার মতো কোনো অর্ডার নেই!');
        return;
    }

    const printArea = document.getElementById('customPrintArea');
    printArea.innerHTML = filteredOrders.map(o => `
        <div class="voucher-page">
            <div style="text-align: center; border-bottom: 1.5px dashed #333; padding-bottom: 10px; margin-bottom: 12px;">
                <h2 style="margin: 0; font-size: 20px;">${storeSettings.name}</h2>
                <p style="margin: 4px 0; font-size: 13px;">Oxygen, Chattogram | কাস্টমার কেয়ার: +${storeSettings.phone}</p>
                <span style="background: #111; color: #fff; padding: 3px 12px; font-size: 12px; border-radius: 4px; display: inline-block; margin-top: 4px;">কাস্টমার ইনভয়েস / ভাউচার</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 12px; line-height: 1.6;">
                <div>
                    <b>কাস্টমারের নাম:</b> ${o.customer.name}<br>
                    <b>মোবাইল:</b> ${o.customer.phone}<br>
                    <b>ঠিকানা:</b> ${o.customer.address}
                </div>
                <div style="text-align: right;">
                    <b>অর্ডার আইডি:</b> ${o.orderId}<br>
                    <b>তারিখ:</b> ${o.date}<br>
                    <b>পেমেন্ট:</b> ${o.paymentMethod} ${o.trxId ? `(${o.trxId})` : ''}
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px;">
                <thead>
                    <tr style="background: #f2f2f2;">
                        <th style="border: 1px solid #333; padding: 7px; text-align: left;">পণ্যের বিবরণ</th>
                        <th style="border: 1px solid #333; padding: 7px; text-align: center;">পরিমাণ</th>
                        <th style="border: 1px solid #333; padding: 7px; text-align: right;">দাম</th>
                    </tr>
                </thead>
                <tbody>
                    ${o.items.map(i => `
                        <tr>
                            <td style="border: 1px solid #333; padding: 7px;">${i.name}</td>
                            <td style="border: 1px solid #333; padding: 7px; text-align: center;">${i.qty}</td>
                            <td style="border: 1px solid #333; padding: 7px; text-align: right;">৳ ${i.price * i.qty}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align: right; font-size: 13.5px; line-height: 1.6;">
                <div>পণ্যের মোট দাম: <b>৳ ${o.subtotal}</b></div>
                <div>ডেলিভারি চার্জ: <b>৳ ${o.delivery}</b></div>
                <div style="font-size: 16px; margin-top: 4px; border-top: 1px solid #ccc; padding-top: 4px;">সর্বমোট বিল: <b>৳ ${o.total}</b></div>
            </div>
            <p style="text-align: center; font-size: 12px; margin-top: 18px; border-top: 1px dashed #999; padding-top: 8px;">আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!</p>
        </div>
    `).join('');

    window.print();
}

function printDailySummary() {
    const selectedDate = document.getElementById('orderFilterDate')?.value || 'সব তারিখ';
    const filteredOrders = document.getElementById('orderFilterDate')?.value
        ? orders.filter(o => o.date === selectedDate)
        : orders;

    if (filteredOrders.length === 0) {
        alert('এই তারিখে কোনো অর্ডার পাওয়া যায়নি!');
        return;
    }

    const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const printArea = document.getElementById('customPrintArea');

    const rowsHTML = filteredOrders.map((o, idx) => `
        <tr>
            <td style="border: 1px solid #333; padding: 5px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #333; padding: 5px;">${o.orderId}</td>
            <td style="border: 1px solid #333; padding: 5px;"><b>${o.customer.name}</b><br>${o.customer.phone}<br><small>${o.customer.address}</small></td>
            <td style="border: 1px solid #333; padding: 5px;">${o.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</td>
            <td style="border: 1px solid #333; padding: 5px; text-align: right;"><b>৳ ${o.total}</b><br><small>${o.paymentMethod}</small></td>
        </tr>
    `).join('');

    printArea.innerHTML = `
        <div class="summary-page">
            <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #111; padding-bottom: 8px;">
                <h2 style="margin: 0; font-size: 18px;">${storeSettings.name} - ডেইলি সেলস সামারি</h2>
                <p style="margin: 4px 0; font-size: 13px;">তারিখ: <b>${selectedDate}</b> | মোট অর্ডার: <b>${filteredOrders.length} টি</b> | সর্বমোট বিক্রি: <b>৳ ${totalSales}</b></p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
                <thead>
                    <tr style="background: #111; color: #fff;">
                        <th style="border: 1px solid #333; padding: 6px;">নং</th>
                        <th style="border: 1px solid #333; padding: 6px;">অর্ডার আইডি</th>
                        <th style="border: 1px solid #333; padding: 6px;">কাস্টমারের তথ্য</th>
                        <th style="border: 1px solid #333; padding: 6px;">পণ্যসমূহ</th>
                        <th style="border: 1px solid #333; padding: 6px; text-align: right;">মোট বিল</th>
                    </tr>
                </thead>
                <tbody>${rowsHTML}</tbody>
            </table>
        </div>
    `;

    window.print();
}

function addDeliveryZone() {
    const name = document.getElementById('newZoneName').value.trim();
    const charge = parseInt(document.getElementById('newZoneCharge').value);
    if (!name || isNaN(charge)) return alert('অঞ্চলের নাম এবং চার্জ সঠিকভাবে দিন।');

    deliveryOptions.push({ id: Date.now(), name, charge });
    localStorage.setItem('trustedShopDelivery', JSON.stringify(deliveryOptions));
    renderDeliveryOptions();
    alert('নতুন ডেলিভারি অপশন যুক্ত হয়েছে!');
}

function updateStoreSettings() {
    const phone = document.getElementById('setStorePhone').value.trim();
    const name = document.getElementById('setStoreName').value.trim();
    const bannerInput = document.getElementById('setBannerFile');

    if (phone) storeSettings.phone = phone;
    if (name) storeSettings.name = name;

    if (bannerInput && bannerInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
            storeSettings.banner = e.target.result;
            localStorage.setItem('trustedShopSettings', JSON.stringify(storeSettings));
            applySettings();
            alert('সেটিংস এবং ব্যানার আপডেট হয়েছে!');
        };
        reader.readAsDataURL(bannerInput.files[0]);
    } else {
        localStorage.setItem('trustedShopSettings', JSON.stringify(storeSettings));
        applySettings();
        alert('সেটিংস আপডেট হয়েছে!');
    }
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}
