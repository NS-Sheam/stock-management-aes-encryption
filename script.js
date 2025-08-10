// script.js
// Hardcoded users for demo (in real app, use secure backend)
const users = {
  admin: { password: "adminpass", role: "admin" },
  user: { password: "userpass", role: "user" },
};

// AES Encryption Key (In real app, use secure key management)
const encryptionKey = "securestock-secret-key-1234567890";

// Inventory stored in localStorage (encrypted sensitive data)
let inventory = JSON.parse(localStorage.getItem("inventory")) || [];

// Current user role
let currentRole = null;

// Sort state
let sortColumn = "id";
let sortDirection = "asc";

// Login Form Submit
document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const alert = document.getElementById("login-alert");

  if (users[username] && users[username].password === password) {
    currentRole = users[username].role;
    document.getElementById("user-role").textContent = currentRole;
    document.getElementById("login-container").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    if (currentRole === "admin") {
      document.getElementById("add-item-btn").classList.remove("hidden");
    }
    loadInventory();
  } else {
    alert.textContent = "Invalid credentials";
    alert.classList.remove("hidden");
  }
});

// Logout
document.getElementById("logout").addEventListener("click", () => {
  currentRole = null;
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("login-container").classList.remove("hidden");
  document.getElementById("login-alert").classList.add("hidden");
});

// Load Inventory Table with sort and search
function loadInventory(searchTerm = "") {
  const tableBody = document.getElementById("inventory-table");
  tableBody.innerHTML = "";

  // Filter inventory
  let filteredInventory = inventory.filter((item) => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));

  // Sort inventory
  filteredInventory.sort((a, b) => {
    let valA = getSortValue(a);
    let valB = getSortValue(b);
    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  filteredInventory.forEach((item, index) => {
    const decryptedSupplier = decrypt(item.supplier);
    const decryptedPrice = decrypt(item.price);
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.productName}</td>
            <td>${currentRole === "admin" ? decryptedSupplier : "******"}</td>
            <td>${currentRole === "admin" ? decryptedPrice : "******"}</td>
            <td>${item.quantity}</td>
            <td>
                ${
                  currentRole === "admin"
                    ? `
                    <button class="edit-btn" data-index="${index}">Edit</button>
                    <button class="delete-btn" data-index="${index}">Delete</button>
                `
                    : ""
                }
            </td>
        `;
    tableBody.appendChild(row);
  });

  // Update stats
  updateStats(filteredInventory);

  // Edit Buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = e.target.dataset.index;
      editItem(index);
    });
  });

  // Delete Buttons
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = e.target.dataset.index;
      deleteItem(index);
    });
  });
}

function getSortValue(item) {
  switch (sortColumn) {
    case "id":
      return item.id;
    case "productName":
      return item.productName.toLowerCase();
    case "supplier":
      return currentRole === "admin" ? decrypt(item.supplier).toLowerCase() : "";
    case "price":
      return currentRole === "admin" ? parseFloat(decrypt(item.price)) : 0;
    case "quantity":
      return item.quantity;
    default:
      return 0;
  }
}

// Update Stats
function updateStats(filteredInventory) {
  const totalItems = filteredInventory.length;
  const totalQuantity = filteredInventory.reduce((sum, item) => sum + parseInt(item.quantity), 0);
  const lowStock = filteredInventory.filter((item) => item.quantity < 10).length; // Assuming low stock < 10

  document.getElementById("total-items").textContent = totalItems;
  document.getElementById("total-quantity").textContent = totalQuantity;
  document.getElementById("low-stock").textContent = lowStock;
}

// Search Input
document.getElementById("search-input").addEventListener("input", (e) => {
  loadInventory(e.target.value);
});

// Table Sort Headers
document.querySelectorAll("th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    const column = th.dataset.sort;
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }
    loadInventory(document.getElementById("search-input").value);
  });
});

// Add Item Button
document.getElementById("add-item-btn").addEventListener("click", () => {
  document.getElementById("item-modal").classList.remove("hidden");
  setTimeout(() => {
    document.getElementById("item-modal").querySelector("div").classList.remove("scale-95");
  }, 10);
});

// Close Modal
document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("item-modal").classList.add("hidden");
  clearModal();
});

// Add/Edit Item Form Submit
document.getElementById("item-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("item-id").value;
  const productName = document.getElementById("product-name").value;
  const supplier = encrypt(document.getElementById("supplier").value);
  const price = encrypt(document.getElementById("price").value);
  const quantity = document.getElementById("quantity").value;

  if (!productName || !supplier || !price || !quantity) {
    document.getElementById("item-alert").textContent = "All fields are required.";
    document.getElementById("item-alert").classList.remove("hidden");
    return;
  }

  if (id) {
    // Edit
    const index = inventory.findIndex((item) => item.id == id);
    inventory[index] = { id, productName, supplier, price, quantity: parseInt(quantity) };
  } else {
    // Add
    const newId = inventory.length ? Math.max(...inventory.map((i) => i.id)) + 1 : 1;
    inventory.push({ id: newId, productName, supplier, price, quantity: parseInt(quantity) });
  }

  saveInventory();
  loadInventory(document.getElementById("search-input").value);
  document.getElementById("item-modal").classList.add("hidden");
  clearModal();
});

// Edit Item
function editItem(index) {
  const item = inventory[index];
  document.getElementById("modal-title").textContent = "Edit Item";
  document.getElementById("item-id").value = item.id;
  document.getElementById("product-name").value = item.productName;
  document.getElementById("supplier").value = decrypt(item.supplier);
  document.getElementById("price").value = decrypt(item.price);
  document.getElementById("quantity").value = item.quantity;
  document.getElementById("item-modal").classList.remove("hidden");
  setTimeout(() => {
    document.getElementById("item-modal").querySelector("div").classList.remove("scale-95");
  }, 10);
}

// Delete Item
function deleteItem(index) {
  if (confirm("Are you sure you want to delete this item?")) {
    inventory.splice(index, 1);
    saveInventory();
    loadInventory(document.getElementById("search-input").value);
  }
}

// Clear Modal
function clearModal() {
  document.getElementById("modal-title").textContent = "Add Item";
  document.getElementById("item-id").value = "";
  document.getElementById("product-name").value = "";
  document.getElementById("supplier").value = "";
  document.getElementById("price").value = "";
  document.getElementById("quantity").value = "";
  document.getElementById("item-alert").classList.add("hidden");
}

// Save to localStorage
function saveInventory() {
  localStorage.setItem("inventory", JSON.stringify(inventory));
}

// Encrypt function using AES
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, encryptionKey).toString();
}

// Decrypt function using AES
function decrypt(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}
