import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ১. আপনার Firebase কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyCLC2oIVL7Qpb7nX4q-ArIFvl0bxMyIcQE",
  authDomain: "project-0f23df70-16c7-4f9b-937.firebaseapp.com",
  projectId: "project-0f23df70-16c7-4f9b-937",
  storageBucket: "project-0f23df70-16c7-4f9b-937.firebasestorage.app",
  messagingSenderId: "299185225123",
  appId: "1:299185225123:web:5342d37caad6c8e24f2e16",
  measurementId: "G-TQP02LFH2B"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ২. প্রাথমিক ডাটা ও সেটিংস
let storeSettings = {
  name: "TRUSTED SHOP",
  phone: "8801854999250",
  banner: "banner.png",
};

let deliveryOptions = [
  { id: 1, name: "হোম ডেলিভারি", charge: 120 },
  { id: 2, name: "পোস্ট অফিসের মাধ্যমে", charge: 30 },
];

let products = [];
let orders = [];
let cart = [];
let isAdmin = false;
let currentCategory = "All";

// পেজ লোড হলে ইনিশিয়ালাইজেশন ও লাইভ ডাটাবেজ কানেকশন
document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("customPrintArea")) {
    const printDiv = document.createElement("div");
    printDiv.id = "customPrintArea";
    document.body.appendChild(printDiv);
  }

  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("orderFilterDate");
  if (dateInput) dateInput.value = today;

  updateCartUI();
  initFirebaseSync();
});

function initFirebaseSync() {
  // সেটিংস ও ব্যানার লাইভ লোড
  onSnapshot(
    doc(db, "settings", "storeInfo"),
    (docSnap) => {
      if (docSnap.exists()) {
        storeSettings = { ...storeSettings, ...docSnap.data() };
      }
      applySettings();
    },
    (err) => console.error("Settings error:", err)
  );

  // ডেলিভারি অপশন লাইভ লোড
  onSnapshot(
    doc(db, "settings", "delivery"),
    (docSnap) => {
      if (docSnap.exists() && docSnap.data().options) {
        deliveryOptions = docSnap.data().options;
      }
      renderDeliveryOptions();
    },
    (err) => console.error("Delivery error:", err)
  );

  // প্রোডাক্ট লাইভ লোড (সব কাস্টমারের ফোনে রিয়েলটাইম দেখাবে)
  onSnapshot(
    collection(db, "products"),
    (snapshot) => {
      const loadedProducts = [];
      snapshot.forEach((docItem) => {
        loadedProducts.push(docItem.data());
      });
      loadedProducts.sort((a, b) => b.id - a.id);
      products = loadedProducts;
      renderCategories();
      renderProducts();
      renderAdminProductList();
    },
    (err) => console.error("Products error:", err)
  );

  // অর্ডার লাইভ লোড
  onSnapshot(
    collection(db, "orders"),
    (snapshot) => {
      const loadedOrders = [];
      snapshot.forEach((docItem) => {
        loadedOrders.push(docItem.data());
      });
      loadedOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      orders = loadedOrders;
      renderAdminOrders();
    },
    (err) => console.error("Orders error:", err)
  );
}

function applySettings() {
  ["headerStoreName", "brandLogo"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerText = storeSettings.name;
  });
  ["footerStoreName", "fBrand"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerText = storeSettings.name;
  });
  ["topPhoneDisplay", "topPhone"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerText = "+" + storeSettings.phone;
  });
  ["heroBannerImg", "bannerImg"].forEach((id) => {
    const bannerImg = document.getElementById(id);
    if (bannerImg && storeSettings.banner) {
      bannerImg.src = storeSettings.banner;
    }
  });

  const phoneInput =
    document.getElementById("setStorePhone") ||
    document.getElementById("inWaNumber");
  const nameInput =
    document.getElementById("setStoreName") ||
    document.getElementById("inBrand");
  if (phoneInput && document.activeElement !== phoneInput)
    phoneInput.value = storeSettings.phone;
  if (nameInput && document.activeElement !== nameInput)
    nameInput.value = storeSettings.name;
}

function renderCategories() {
  const catContainer = document.getElementById("categoryContainer");
  if (!catContainer) return;

  const categories = ["All", ...new Set(products.map((p) => p.category))];
  catContainer.innerHTML = categories
    .map(
      (cat) => ` <button class="cat-btn ${ currentCategory === cat ? "active" : "" }" onclick="filterCategory('${cat}')"> ${cat === "All" ? "সব ক্যাটাগরি" : cat} </button> `
    )
    .join("");

  const adminCatSelect = document.getElementById("prodCatSelect");
  if (adminCatSelect) {
    const existingCats = [...new Set(products.map((p) => p.category))];
    adminCatSelect.innerHTML =
      existingCats.map((c) => `<option value="${c}">${c}</option>`).join("") +
      `<option value="NEW">+ নতুন ক্যাটাগরি লিখুন</option>`;
  }
}

window.filterCategory = function (cat) {
  currentCategory = cat;
  renderCategories();
  renderProducts();
};

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const filtered =
    currentCategory === "All"
      ? products
      : products.filter((p) => p.category === currentCategory);

  if (filtered.length === 0) {
    grid.innerHTML =
      '<p style="grid-column: 1/-1; text-align:center; padding:20px;">কোনো পণ্য পাওয়া যায়নি।</p>';
    return;
  }

  grid.innerHTML = filtered
    .map((p) => {
      const mainImg = p.images && p.images.length > 0 ? p.images[0] : "📦";
      const imgHTML =
        mainImg.startsWith("http") ||
        mainImg.startsWith("data:") ||
        mainImg.endsWith(".png") ||
        mainImg.endsWith(".jpg") ||
        mainImg.endsWith(".jpeg") ||
        mainImg.endsWith(".webp")
          ? `<img src="${mainImg}" alt="${p.name}">`
          : mainImg;

      return ` <div class="card"> <span class="badge">${p.category}</span> <div class="admin-card-actions" style="display: ${ isAdmin ? "flex" : "none" };"> <button class="edit-card-btn" onclick="openEditProduct(${ p.id })">✏ Edit</button> <button class="del-btn" onclick="deleteProduct(${ p.id })">✕</button> </div> <div class="clickable-area" onclick="openProductDetails(${p.id})"> <div class="p-img">${imgHTML}</div> <div class="p-title">${p.name}</div> <div class="p-desc">${p.desc}</div> <div class="price"> <span class="new-p">৳ ${p.price}</span> ${ p.oldPrice ? `<span class="old-p">৳ ${p.oldPrice}</span>` : "" } </div> </div> <button class="wa-order-btn" onclick="addToCart(${ p.id })">🛒 কার্টে যুক্ত করুন</button> </div> `;
    })
    .join("");
}

window.openProductDetails = function (id) {
  const p = products.find((item) => item.id === id);
  if (!p) return;

  const modal = document.getElementById("productDetailModal");
  if (!modal) return;

  const firstImg = p.images && p.images.length > 0 ? p.images[0] : "";
  const thumbsHTML = (p.images || [])
    .map(
      (img, idx) => ` <img src="${img}" class="thumb-item ${idx === 0 ? "active-thumb" : ""}" onclick="changeDetailMainImage(this, '${img}')"> `
    )
    .join("");

  document.getElementById("detailModalBody").innerHTML = ` <div style="text-align:center;"> <img id="detailMainImg" src="${firstImg}" style="width:100%; max-height:300px; object-fit:contain; border-radius:8px; background:#f9f9f9;"> ${ p.images.length > 1 ? `<div class="detail-thumbs">${thumbsHTML}</div>` : "" } </div> <h3 style="margin-top:15px; border:none;">${p.name}</h3> <div class="price" style="margin-bottom:10px;"> <span class="new-p" style="font-size:20px;">৳ ${p.price}</span> ${p.oldPrice ? `<span class="old-p">৳ ${p.oldPrice}</span>` : ""} </div> <div class="formatted-desc">${p.desc}</div> <div class="m-btns"> <button class="btn-green" onclick="addToCart(${ p.id }); closeModal('productDetailModal');">🛒 কার্টে যোগ করুন</button> <button class="btn-gray" onclick="closeModal('productDetailModal')">বন্ধ করুন</button> </div> `;
  modal.style.display = "flex";
};

window.changeDetailMainImage = function (thumbEl, imgSrc) {
  document.getElementById("detailMainImg").src = imgSrc;
  document
    .querySelectorAll(".thumb-item")
    .forEach((el) => el.classList.remove("active-thumb"));
  thumbEl.classList.add("active-thumb");
};

window.addToCart = function (id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  updateCartUI();
  showCartToast(`✅ "${product.name}" কার্টে যোগ হয়েছে!`);
};

function showCartToast(message) {
  const oldToast = document.getElementById("cartToastMsg");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.id = "cartToastMsg";
  toast.innerText = message;
  toast.style.cssText =
    "position:fixed; bottom:85px; left:50%; transform:translateX(-50%); background:#111; color:#fff; padding:10px 20px; border-radius:25px; font-size:13.5px; z-index:99999; box-shadow:0 4px 12px rgba(0,0,0,0.25); white-space:nowrap;";
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast) toast.remove();
  }, 2000);
}

window.updateQty = function (id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.id !== id);
  }
  updateCartUI();
};

window.removeFromCart = function (id) {
  cart = cart.filter((i) => i.id !== id);
  updateCartUI();
};

function renderDeliveryOptions() {
  const select = document.getElementById("deliverySelect");
  if (!select) return;
  select.innerHTML = deliveryOptions
    .map(
      (opt) =>
        `<option value="${opt.charge}" data-name="${opt.name}">${opt.name} - ৳ ${opt.charge}</option>`
    )
    .join("");
  calculateTotalBill();
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  document
    .querySelectorAll(".cart-count")
    .forEach((el) => (el.innerText = totalCount));

  const cartListEl = document.getElementById("cartItemsList");
  if (cartListEl) {
    if (cart.length === 0) {
      cartListEl.innerHTML =
        '<p style="text-align:center; color:#777;">আপনার কার্ট খালি</p>';
    } else {
      cartListEl.innerHTML = cart
        .map(
          (item) => ` <div class="cart-item"> <div> <b>${item.name}</b><br> <small>৳ ${item.price} x ${item.qty}</small> </div> <div class="qty-controls"> <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button> <span>${item.qty}</span> <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button> <button class="remove-item-btn" onclick="removeFromCart(${item.id})">✕</button> </div> </div> `
        )
        .join("");
    }
  }
  calculateTotalBill();
}

window.calculateTotalBill = function () {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const paymentMethod =
    document.getElementById("paymentMethod")?.value || "COD";
  const deliverySelect = document.getElementById("deliverySelect");
  let deliveryCharge = deliverySelect
    ? parseInt(deliverySelect.value || 0)
    : 120;

  const trxField = document.getElementById("trxField");
  const payInfoBox = document.getElementById("paymentInfoBox");

  if (paymentMethod === "bKash" || paymentMethod === "Nagad") {
    if (trxField) trxField.style.display = "block";
    if (payInfoBox) {
      payInfoBox.style.display = "block";
      payInfoBox.innerHTML = `পার্সোনাল <b>${paymentMethod}</b> নম্বর: <b>+${storeSettings.phone}</b> (Send Money করে নিচে নম্বর ও TrxID দিন)`;
    }
  } else {
    if (trxField) trxField.style.display = "none";
    if (payInfoBox) payInfoBox.style.display = "none";
  }

  if (subtotal >= 2000 || subtotal === 0) {
    deliveryCharge = 0;
  }

  const grandTotal = subtotal + deliveryCharge;

  if (document.getElementById("cartSubtotal"))
    document.getElementById("cartSubtotal").innerText = subtotal;
  if (document.getElementById("cartDelivery"))
    document.getElementById("cartDelivery").innerText = deliveryCharge;
  if (document.getElementById("cartGrandTotal"))
    document.getElementById("cartGrandTotal").innerText = grandTotal;
};

window.confirmOrder = async function () {
  if (cart.length === 0) {
    alert("আপনার কার্টে কোনো পণ্য নেই! অনুগ্রহ করে আগে পণ্য কার্টে যোগ করুন।");
    return;
  }

  const nameEl = document.getElementById("custName");
  const phoneEl = document.getElementById("custPhone");
  const addressEl = document.getElementById("custAddress");
  const paymentEl = document.getElementById("paymentMethod");
  const trxEl = document.getElementById("custTrxId");
  const deliverySelect = document.getElementById("deliverySelect");

  const name = nameEl ? nameEl.value.trim() : "";
  const phone = phoneEl ? phoneEl.value.trim() : "";
  const address = addressEl ? addressEl.value.trim() : "";
  const paymentMethod = paymentEl ? paymentEl.value : "COD";
  const trxId = trxEl ? trxEl.value.trim() : "";

  if (!name || !phone || !address) {
    alert("দয়া করে আপনার নাম, মোবাইল নম্বর এবং ডেলিভারি ঠিকানা সঠিকভাবে দিন।");
    return;
  }

  if ((paymentMethod === "bKash" || paymentMethod === "Nagad") && !trxId) {
    alert(
      "বিকাশ বা নগদে পেমেন্ট করলে TrxID বা যে নম্বর থেকে টাকা পাঠিয়েছেন তা অবশ্যই লিখুন।"
    );
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  let delivery = deliverySelect ? parseInt(deliverySelect.value || 0) : 120;
  if (subtotal >= 2000) {
    delivery = 0;
  }
  const total = subtotal + delivery;
  const today = new Date().toISOString().split("T")[0];
  const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);

  const newOrder = {
    orderId,
    date: today,
    createdAt: Date.now(),
    customer: { name, phone, address },
    items: cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
    })),
    paymentMethod,
    trxId,
    subtotal,
    delivery,
    total,
  };

  try {
    await setDoc(doc(db, "orders", orderId), newOrder);

    if (nameEl) nameEl.value = "";
    if (phoneEl) phoneEl.value = "";
    if (addressEl) addressEl.value = "";
    if (trxEl) trxEl.value = "";

    cart = [];
    updateCartUI();
    closeModal("cartModal");

    const successModal = document.getElementById("orderSuccessModal");
    if (successModal) {
      const msgHeading = successModal.querySelector("h3");
      const msgPara = successModal.querySelector("p");
      if (msgHeading)
        msgHeading.innerText = "হ্যাঁ, আপনার অর্ডারটা নিশ্চিত হয়েছে!";
      if (msgPara)
        msgPara.innerText =
          "আমরা দ্রুত আপনার পণ্য আপনার ডেলিভারি ঠিকানায় পৌঁছে দেব। (অর্ডার আইডি: " +
          orderId +
          ")";
      openModal("orderSuccessModal");
    } else {
      alert("হ্যাঁ, আপনার অর্ডারটা নিশ্চিত হয়েছে। অর্ডার আইডি: " + orderId);
    }
  } catch (error) {
    alert(
      "অর্ডার সাবমিট করতে সমস্যা হয়েছে! ইন্টারনেট বা Firebase Rules পরীক্ষা করুন।"
    );
    console.error(error);
  }
};

window.toggleAdminPass = function () {
  const passInput = document.getElementById("adminPassInput");
  const toggleBtn = document.getElementById("togglePassBtn");
  if (passInput.type === "password") {
    passInput.type = "text";
    toggleBtn.innerText = "🙈";
  } else {
    passInput.type = "password";
    toggleBtn.innerText = "👁️";
  }
};

window.handleAdminButton = function () {
  if (isAdmin) {
    openModal("adminPanelModal");
    renderAdminOrders();
    renderAdminProductList();
    applySettings();
  } else {
    const passInput = document.getElementById("adminPassInput");
    if (passInput) {
      passInput.value = "";
      passInput.type = "password";
    }
    const toggleBtn = document.getElementById("togglePassBtn");
    if (toggleBtn) toggleBtn.innerText = "👁️";
    openModal("adminLoginModal");
  }
};

window.verifyAdminLogin = function () {
  const pass = document.getElementById("adminPassInput").value;
  if (pass === "5482") {
    isAdmin = true;
    closeModal("adminLoginModal");
    renderProducts();
    openModal("adminPanelModal");
    renderAdminOrders();
    renderAdminProductList();
    applySettings();
  } else {
    alert("ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।");
  }
};

window.switchAdminTab = function (tabId, tileEl) {
  document
    .querySelectorAll(".admin-tile")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".admin-tab-content")
    .forEach((c) => c.classList.remove("active"));

  tileEl.classList.add("active");
  document.getElementById(tabId).classList.add("active");
  if (tabId === "tabSettings") applySettings();
};

function compressImage(file, maxWidth, quality) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function handleImageFiles(fileInput, callback) {
  const files = Array.from(fileInput.files);
  if (files.length === 0) {
    callback([]);
    return;
  }
  const promises = files
    .slice(0, 4)
    .map((file) => compressImage(file, 500, 0.7));
  Promise.all(promises).then((base64Images) => callback(base64Images));
}

window.addNewProduct = function () {
  const catSelect = document.getElementById("prodCatSelect").value;
  const newCat = document.getElementById("newCatInput").value.trim();
  const category =
    catSelect === "NEW" && newCat
      ? newCat
      : catSelect === "NEW"
      ? "General"
      : catSelect;

  const name = document.getElementById("prodNameInput").value.trim();
  const desc = document.getElementById("prodDescInput").value.trim();
  const price = parseInt(document.getElementById("prodPriceInput").value);
  const oldPrice =
    parseInt(document.getElementById("prodOldPriceInput").value) || null;
  const linkText = document.getElementById("prodImgLinksInput").value.trim();
  const fileInput = document.getElementById("prodImgFilesInput");

  if (!name || !price) {
    alert("পণ্যের নাম এবং অফার দাম আবশ্যক!");
    return;
  }

  handleImageFiles(fileInput, async (uploadedImgs) => {
    const linkImgs = linkText
      ? linkText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const finalImages = [...uploadedImgs, ...linkImgs];
    const prodId = Date.now();

    const newProd = {
      id: prodId,
      category: category || "General",
      name,
      images: finalImages.length > 0 ? finalImages : ["📦"],
      desc,
      price,
      oldPrice,
    };

    try {
      await setDoc(doc(db, "products", String(prodId)), newProd);

      document.getElementById("prodNameInput").value = "";
      document.getElementById("prodDescInput").value = "";
      document.getElementById("prodPriceInput").value = "";
      document.getElementById("prodOldPriceInput").value = "";
      document.getElementById("prodImgLinksInput").value = "";
      if (fileInput) fileInput.value = "";

      alert("✅ প্রোডাক্ট সফলভাবে লাইভ ডাটাবেজে যুক্ত হয়েছে!");
    } catch (error) {
      alert(
        "❌ প্রোডাক্ট সেভ করা যায়নি! ছবির সাইজ কমান অথবা Firebase Rules চেক করুন।"
      );
      console.error(error);
    }
  });
};

window.openEditProduct = function (id) {
  const p = products.find((item) => item.id === id);
  if (!p) return;

  document.getElementById("editProdId").value = p.id;
  document.getElementById("editProdCat").value = p.category;
  document.getElementById("editProdName").value = p.name;
  document.getElementById("editProdLinks").value = p.images.join(", ");
  document.getElementById("editProdDesc").value = p.desc;
  document.getElementById("editProdPrice").value = p.price;
  document.getElementById("editProdOldPrice").value = p.oldPrice || "";

  openModal("adminPanelModal");
  const prodTabTile = document.querySelectorAll(".admin-tile")[1];
  if (prodTabTile) switchAdminTab("tabProducts", prodTabTile);

  document.getElementById("editProductSection").style.display = "block";
  document
    .getElementById("editProductSection")
    .scrollIntoView({ behavior: "smooth" });
};

window.saveEditedProduct = function () {
  const id = parseInt(document.getElementById("editProdId").value);
  const existingProd = products.find((p) => p.id === id);
  if (!existingProd) return;

  const fileInput = document.getElementById("editProdFiles");
  handleImageFiles(fileInput, async (uploadedImgs) => {
    const linkText = document.getElementById("editProdLinks").value.trim();
    const linkImgs = linkText
      ? linkText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const updatedImages = uploadedImgs.length > 0 ? uploadedImgs : linkImgs;

    const updatedProd = {
      ...existingProd,
      category: document.getElementById("editProdCat").value.trim(),
      name: document.getElementById("editProdName").value.trim(),
      images: updatedImages.length > 0 ? updatedImages : existingProd.images,
      desc: document.getElementById("editProdDesc").value.trim(),
      price: parseInt(document.getElementById("editProdPrice").value),
      oldPrice:
        parseInt(document.getElementById("editProdOldPrice").value) || null,
    };

    try {
      await setDoc(doc(db, "products", String(id)), updatedProd);
      document.getElementById("editProductSection").style.display = "none";
      alert("✅ প্রোডাক্টের তথ্য লাইভ আপডেট করা হয়েছে!");
    } catch (error) {
      alert("❌ আপডেট করতে সমস্যা হয়েছে!");
      console.error(error);
    }
  });
};

window.deleteProduct = async function (id) {
  if (!confirm("আপনি কি নিশ্চিতভাবে এই প্রোডাক্টটি ডিলিট করতে চান?")) return;
  try {
    await deleteDoc(doc(db, "products", String(id)));
  } catch (error) {
    alert("❌ ডিলিট করতে সমস্যা হয়েছে!");
    console.error(error);
  }
};

function renderAdminProductList() {
  const container = document.getElementById("adminExistingProdList");
  if (!container) return;
  container.innerHTML = products
    .map(
      (p) => ` <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;"> <span><b>${p.name}</b> (৳${p.price}) - <small>${p.category}</small></span> <div> <button class="edit-card-btn" onclick="openEditProduct(${p.id})">Edit</button> <button class="del-btn" onclick="deleteProduct(${p.id})">✕</button> </div> </div> `
    )
    .join("");
}

window.renderAdminOrders = function () {
  const selectedDate = document.getElementById("orderFilterDate")?.value;
  const filteredOrders = selectedDate
    ? orders.filter((o) => o.date === selectedDate)
    : orders;

  const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);

  if (document.getElementById("dailyOrderCount"))
    document.getElementById(
      "dailyOrderCount"
    ).innerText = `${filteredOrders.length} টি`;
  if (document.getElementById("dailyTotalSales"))
    document.getElementById("dailyTotalSales").innerText = `৳ ${totalSales}`;

  const tbody = document.getElementById("adminOrderTableBody");
  if (!tbody) return;

  tbody.innerHTML = filteredOrders
    .map(
      (o) => ` <tr> <td><b>${o.orderId}</b><br><small>${o.date}</small></td> <td>${o.customer.name}<br>${o.customer.phone}<br><small>${ o.customer.address }</small></td> <td>${o.items.map((i) => `${i.name} (x${i.qty})`).join("<br>")}</td> <td><b>৳ ${o.total}</b><br><small>${o.paymentMethod} ${ o.trxId ? `(${o.trxId})` : "" }</small></td> </tr> `
    )
    .join("");
};

window.printSingleVoucher = function () {
  const selectedDate = document.getElementById("orderFilterDate")?.value;
  const filteredOrders = selectedDate
    ? orders.filter((o) => o.date === selectedDate)
    : orders;

  if (filteredOrders.length === 0) {
    alert("এই তারিখে প্রিন্ট করার মতো কোনো অর্ডার নেই!");
    return;
  }

  const printArea = document.getElementById("customPrintArea");
  printArea.innerHTML = filteredOrders
    .map(
      (o) => ` <div class="voucher-page"> <div style="text-align: center; border-bottom: 1.5px dashed #333; padding-bottom: 10px; margin-bottom: 12px;"> <h2 style="margin: 0; font-size: 20px;">${ storeSettings.name }</h2> <p style="margin: 4px 0; font-size: 13px;">Oxygen, Chattogram | কাস্টমার কেয়ার: +${ storeSettings.phone }</p> <span style="background: #111; color: #fff; padding: 3px 12px; font-size: 12px; border-radius: 4px; display: inline-block; margin-top: 4px;">কাস্টমার ইনভয়েস / ভাউচার</span> </div> <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 12px; line-height: 1.6;"> <div> <b>কাস্টমারের নাম:</b> ${o.customer.name}<br> <b>মোবাইল:</b> ${o.customer.phone}<br> <b>ঠিকানা:</b> ${o.customer.address} </div> <div style="text-align: right;"> <b>অর্ডার আইডি:</b> ${o.orderId}<br> <b>তারিখ:</b> ${o.date}<br> <b>পেমেন্ট:</b> ${o.paymentMethod} ${ o.trxId ? `(${o.trxId})` : "" } </div> </div> <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px;"> <thead> <tr style="background: #f2f2f2;"> <th style="border: 1px solid #333; padding: 7px; text-align: left;">পণ্যের বিবরণ</th> <th style="border: 1px solid #333; padding: 7px; text-align: center;">পরিমাণ</th> <th style="border: 1px solid #333; padding: 7px; text-align: right;">দাম</th> </tr> </thead> <tbody> ${o.items .map( (i) => ` <tr> <td style="border: 1px solid #333; padding: 7px;">${ i.name }</td> <td style="border: 1px solid #333; padding: 7px; text-align: center;">${ i.qty }</td> <td style="border: 1px solid #333; padding: 7px; text-align: right;">৳ ${ i.price * i.qty }</td> </tr> ` ) .join("")} </tbody> </table> <div style="text-align: right; font-size: 13.5px; line-height: 1.6;"> <div>পণ্যের মোট দাম: <b>৳ ${o.subtotal}</b></div> <div>ডেলিভারি চার্জ: <b>৳ ${o.delivery}</b></div> <div style="font-size: 16px; margin-top: 4px; border-top: 1px solid #ccc; padding-top: 4px;">সর্বমোট বিল: <b>৳ ${ o.total }</b></div> </div> <p style="text-align: center; font-size: 12px; margin-top: 18px; border-top: 1px dashed #999; padding-top: 8px;">আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!</p> </div> `
    )
    .join("");

  window.print();
};

window.printDailySummary = function () {
  const selectedDate =
    document.getElementById("orderFilterDate")?.value || "সব তারিখ";
  const filteredOrders = document.getElementById("orderFilterDate")?.value
    ? orders.filter((o) => o.date === selectedDate)
    : orders;

  if (filteredOrders.length === 0) {
    alert("এই তারিখে কোনো অর্ডার পাওয়া যায়নি!");
    return;
  }

  const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const printArea = document.getElementById("customPrintArea");

  const rowsHTML = filteredOrders
    .map(
      (o, idx) => ` <tr> <td style="border: 1px solid #333; padding: 5px; text-align: center;">${ idx + 1 }</td> <td style="border: 1px solid #333; padding: 5px;">${o.orderId}</td> <td style="border: 1px solid #333; padding: 5px;"><b>${ o.customer.name }</b><br>${o.customer.phone}<br><small>${ o.customer.address }</small></td> <td style="border: 1px solid #333; padding: 5px;">${o.items .map((i) => `${i.name} (x${i.qty})`) .join(", ")}</td> <td style="border: 1px solid #333; padding: 5px; text-align: right;"><b>৳ ${ o.total }</b><br><small>${o.paymentMethod}</small></td> </tr> `
    )
    .join("");

  printArea.innerHTML = ` <div class="summary-page"> <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #111; padding-bottom: 8px;"> <h2 style="margin: 0; font-size: 18px;">${storeSettings.name} - ডেইলি সেলস সামারি</h2> <p style="margin: 4px 0; font-size: 13px;">তারিখ: <b>${selectedDate}</b> | মোট অর্ডার: <b>${filteredOrders.length} টি</b> | সর্বমোট বিক্রি: <b>৳ ${totalSales}</b></p> </div> <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;"> <thead> <tr style="background: #111; color: #fff;"> <th style="border: 1px solid #333; padding: 6px;">নং</th> <th style="border: 1px solid #333; padding: 6px;">অর্ডার আইডি</th> <th style="border: 1px solid #333; padding: 6px;">কাস্টমারের তথ্য</th> <th style="border: 1px solid #333; padding: 6px;">পণ্যসমূহ</th> <th style="border: 1px solid #333; padding: 6px; text-align: right;">মোট বিল</th> </tr> </thead> <tbody>${rowsHTML}</tbody> </table> </div> `;

  window.print();
};

window.addDeliveryZone = async function () {
  const name = document.getElementById("newZoneName").value.trim();
  const charge = parseInt(document.getElementById("newZoneCharge").value);
  if (!name || isNaN(charge))
    return alert("অঞ্চলের নাম এবং চার্জ সঠিকভাবে দিন।");

  deliveryOptions.push({ id: Date.now(), name, charge });
  try {
    await setDoc(doc(db, "settings", "delivery"), { options: deliveryOptions });
    document.getElementById("newZoneName").value = "";
    document.getElementById("newZoneCharge").value = "";
    alert("✅ নতুন ডেলিভারি অপশন লাইভ যুক্ত হয়েছে!");
  } catch (error) {
    alert("❌ ডেলিভারি অপশন সেভ করতে সমস্যা হয়েছে!");
    console.error(error);
  }
};

window.updateStoreSettings = async function () {
  const phoneInput =
    document.getElementById("setStorePhone") ||
    document.getElementById("inWaNumber");
  const nameInput =
    document.getElementById("setStoreName") ||
    document.getElementById("inBrand");
  const bannerInput =
    document.getElementById("setBannerFile") ||
    document.getElementById("inBannerFile");

  const phone = phoneInput ? phoneInput.value.trim() : "";
  const name = nameInput ? nameInput.value.trim() : "";

  if (phone) storeSettings.phone = phone;
  if (name) storeSettings.name = name;

  try {
    if (bannerInput && bannerInput.files && bannerInput.files.length > 0) {
      const compressedBanner = await compressImage(
        bannerInput.files[0],
        900,
        0.7
      );
      storeSettings.banner = compressedBanner;
      await setDoc(doc(db, "settings", "storeInfo"), storeSettings);
      bannerInput.value = "";
      alert(
        "✅ সেটিংস এবং ব্যানার ছবি লাইভ আপডেট হয়েছে! এখন সব ফোনে একই দেখাবে।"
      );
    } else {
      await setDoc(doc(db, "settings", "storeInfo"), storeSettings);
      alert("✅ দোকানের নাম ও নম্বর লাইভ আপডেট হয়েছে!");
    }
  } catch (error) {
    alert("❌ ছবিটি অনেক বড় হওয়ায় সেভ করা যায়নি অথবা Firebase Rules চালু নেই!");
    console.error(error);
  }
};

window.openModal = function (id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "flex";
};

window.closeModal = function (id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
};
