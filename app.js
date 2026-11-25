const API_BASE_URL = "http://54.91.131.2:3000";

// Elementos do DOM
const productList = document.querySelector("#products");
const addProductForm = document.querySelector("#add-product-form");
const updateProductForm = document.querySelector("#update-product-form");
const updateProductId = document.querySelector("#update-id");
const updateProductName = document.querySelector("#update-name");
const updateProductPrice = document.querySelector("#update-price");
const updateProductDescription = document.querySelector("#update-description");
const editingBadge = document.querySelector("#editing-badge");
const cancelUpdateBtn = document.querySelector("#cancel-update-btn");

const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const refreshBtn = document.querySelector("#refresh-btn");
const apiStatusBadge = document.querySelector("#api-status");
const feedbackBanner = document.querySelector("#feedback-banner");

const kpiTotalItems = document.querySelector("#kpi-total-items");
const kpiTotalValue = document.querySelector("#kpi-total-value");
const kpiAvgPrice = document.querySelector("#kpi-avg-price");

// Cache local para busca/ordenação instantânea sem sobrecarregar a EC2/Supabase
let allProducts = [];

function showFeedback(message, type = "success") {
  feedbackBanner.textContent = message;
  feedbackBanner.className = `feedback-banner feedback-${type}`;
  clearTimeout(feedbackBanner._timer);
  feedbackBanner._timer = setTimeout(() => {
    feedbackBanner.classList.add("hidden");
  }, 4000);
}

function setApiStatus(isOnline) {
  if (isOnline) {
    apiStatusBadge.textContent = "API EC2 Online";
    apiStatusBadge.className = "status-badge status-online";
  } else {
    apiStatusBadge.textContent = "API EC2 Offline / Erro de Conexão";
    apiStatusBadge.className = "status-badge status-offline";
  }
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return `$ ${num.toFixed(2)}`;
}

function updateBusinessKPIs(products) {
  const totalItems = products.length;
  const totalValue = products.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0),
    0
  );
  const avgPrice = totalItems > 0 ? totalValue / totalItems : 0;

  kpiTotalItems.textContent = totalItems;
  kpiTotalValue.textContent = formatCurrency(totalValue);
  kpiAvgPrice.textContent = formatCurrency(avgPrice);
}

function getFilteredAndSortedProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const sortBy = sortSelect.value;

  let filtered = allProducts.filter((p) => {
    const nameMatch = (p.name || "").toLowerCase().includes(query);
    const descMatch = (p.description || "").toLowerCase().includes(query);
    return nameMatch || descMatch;
  });

  if (sortBy === "price-asc") {
    filtered.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
  } else if (sortBy === "price-desc") {
    filtered.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
  } else if (sortBy === "name-asc") {
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  return filtered;
}

function renderProducts() {
  const products = getFilteredAndSortedProducts();
  productList.innerHTML = "";

  if (products.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent =
      allProducts.length === 0
        ? "Nenhum produto cadastrado na vitrine."
        : "Nenhum produto encontrado para o filtro aplicado.";
    productList.appendChild(empty);
    return;
  }

  products.forEach((product) => {
    const li = document.createElement("li");
    li.className = "product-card";

    // Cabeçalho do card (Nome + Preço)
    const headerDiv = document.createElement("div");
    headerDiv.className = "product-header";

    const titleEl = document.createElement("h3");
    titleEl.className = "product-title";
    titleEl.textContent = product.name || "Sem nome";

    const priceEl = document.createElement("span");
    priceEl.className = "product-price";
    priceEl.textContent = formatCurrency(product.price);

    headerDiv.appendChild(titleEl);
    headerDiv.appendChild(priceEl);
    li.appendChild(headerDiv);

    // Descrição
    const descEl = document.createElement("p");
    descEl.className = "product-desc";
    descEl.textContent = product.description || "Sem descrição disponível.";
    li.appendChild(descEl);

    // ID / SKU de referência
    const metaEl = document.createElement("div");
    metaEl.className = "product-meta";
    metaEl.textContent = `SKU/ID: #${product.id}`;
    li.appendChild(metaEl);

    // Botões de Ação Business
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "product-actions";

    const updateButton = document.createElement("button");
    updateButton.type = "button";
    updateButton.textContent = "Update";
    updateButton.addEventListener("click", () => openUpdateForm(product));

    const duplicateButton = document.createElement("button");
    duplicateButton.type = "button";
    duplicateButton.className = "btn-secondary";
    duplicateButton.textContent = "Duplicar";
    duplicateButton.title = "Criar uma cópia rápida deste produto";
    duplicateButton.addEventListener("click", async () => {
      try {
        duplicateButton.disabled = true;
        await addProduct({
          name: `${product.name} (Cópia)`,
          price: parseFloat(product.price) || 0,
          description: product.description || "",
        });
        showFeedback(`Produto "${product.name}" duplicado com sucesso!`);
        await fetchProducts();
      } catch (err) {
        showFeedback(err.message, "error");
      } finally {
        duplicateButton.disabled = false;
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn-danger";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      const confirmed = confirm(
        `Tem certeza que deseja remover "${product.name}" da vitrine?`
      );
      if (!confirmed) return;

      try {
        deleteButton.disabled = true;
        await deleteProduct(product.id);
        if (String(updateProductId.value) === String(product.id)) {
          closeUpdateForm();
        }
        showFeedback("Produto removido da vitrine.");
        await fetchProducts();
      } catch (err) {
        showFeedback(err.message, "error");
        deleteButton.disabled = false;
      }
    });

    actionsDiv.appendChild(updateButton);
    actionsDiv.appendChild(duplicateButton);
    actionsDiv.appendChild(deleteButton);
    li.appendChild(actionsDiv);

    productList.appendChild(li);
  });
}

function openUpdateForm(product) {
  updateProductId.value = product.id;
  updateProductName.value = product.name ?? "";
  updateProductPrice.value = product.price ?? "";
  updateProductDescription.value = product.description ?? "";
  editingBadge.textContent = `(ID #${product.id})`;

  updateProductForm.classList.remove("hidden");
  updateProductForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  updateProductName.focus();
}

function closeUpdateForm() {
  updateProductForm.reset();
  updateProductId.value = "";
  editingBadge.textContent = "";
  updateProductForm.classList.add("hidden");
}

async function fetchProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) {
      throw new Error(`Erro ao buscar produtos: HTTP ${response.status}`);
    }

    const products = await response.json();
    setApiStatus(true);

    allProducts = Array.isArray(products) ? products : [];
    updateBusinessKPIs(allProducts);
    renderProducts();
  } catch (error) {
    console.error(error);
    setApiStatus(false);
    showFeedback(
      "Não foi possível conectar ao backend na EC2. Verifique o Security Group (porta 3000) e o CORS.",
      "error"
    );
  }
}

addProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitBtn = addProductForm.querySelector('button[type="submit"]');
  const name = addProductForm.elements["name"].value.trim();
  const price = parseFloat(addProductForm.elements["price"].value);
  const description = addProductForm.elements["description"].value.trim();

  if (!name || isNaN(price) || price < 0) {
    showFeedback("Preencha um nome válido e preço maior ou igual a zero.", "error");
    return;
  }

  try {
    submitBtn.disabled = true;
    await addProduct({ name, price, description });
    addProductForm.reset();
    showFeedback("Produto adicionado à vitrine com sucesso!");
    await fetchProducts();
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

updateProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = updateProductId.value;
  if (!id) {
    showFeedback("Selecione um produto clicando em Update primeiro.", "error");
    return;
  }

  const submitBtn = updateProductForm.querySelector('button[type="submit"]');
  const name = updateProductName.value.trim();
  const price = parseFloat(updateProductPrice.value);
  const description = updateProductDescription.value.trim();

  if (!name || isNaN(price) || price < 0) {
    showFeedback("Preencha um nome válido e preço maior ou igual a zero.", "error");
    return;
  }

  try {
    submitBtn.disabled = true;
    await updateProduct(id, { name, price, description });
    closeUpdateForm();
    showFeedback("Produto atualizado com sucesso!");
    await fetchProducts();
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

cancelUpdateBtn.addEventListener("click", closeUpdateForm);
searchInput.addEventListener("input", renderProducts);
sortSelect.addEventListener("change", renderProducts);
refreshBtn.addEventListener("click", fetchProducts);

async function addProduct(payload) {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar produto (HTTP ${response.status})`);
  }
  return response.text();
}

async function updateProduct(id, payload) {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao atualizar produto (HTTP ${response.status})`);
  }
  return response.text();
}

async function deleteProduct(id) {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Erro ao excluir produto (HTTP ${response.status})`);
  }
  return response.text();
}

window.addEventListener("DOMContentLoaded", fetchProducts);
