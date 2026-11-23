const API_BASE_URL = "http://54.91.131.2:3000";

const productList = document.querySelector("#products");
const addProductForm = document.querySelector("#add-product-form");
const updateProductForm = document.querySelector("#update-product-form");
const updateProductId = document.querySelector("#update-id");
const updateProductName = document.querySelector("#update-name");
const updateProductPrice = document.querySelector("#update-price");
const updateProductDescription = document.querySelector("#update-description");

async function fetchProducts() {
  const response = await fetch(`${API_BASE_URL}/products`);
  if (!response.ok) {
    throw new Error(`Erro ao buscar produtos: ${response.status}`);
  }

  const products = await response.json();
  productList.innerHTML = "";

  if (!Array.isArray(products)) {
    return;
  }

  products.forEach((product) => {
    const li = document.createElement("li");

    const infoSpan = document.createElement("span");
    const descText = product.description ? ` - ${product.description}` : "";
    infoSpan.textContent = `${product.name} - $${product.price}${descText}`;
    li.appendChild(infoSpan);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      await deleteProduct(product.id);
      await fetchProducts();
    });
    li.appendChild(deleteButton);

    const updateButton = document.createElement("button");
    updateButton.type = "button";
    updateButton.textContent = "Update";
    updateButton.addEventListener("click", () => {
      updateProductId.value = product.id;
      updateProductName.value = product.name ?? "";
      updateProductPrice.value = product.price ?? "";
      updateProductDescription.value = product.description ?? "";
    });
    li.appendChild(updateButton);

    productList.appendChild(li);
  });
}

addProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = addProductForm.elements["name"].value.trim();
  const price = parseFloat(addProductForm.elements["price"].value);
  const description = addProductForm.elements["description"].value.trim();

  await addProduct({ name, price, description });
  addProductForm.reset();
  await fetchProducts();
});

updateProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = updateProductId.value;
  if (!id) {
    alert("Selecione um produto clicando em Update primeiro.");
    return;
  }

  const name = updateProductName.value.trim();
  const price = parseFloat(updateProductPrice.value);
  const description = updateProductDescription.value.trim();

  await updateProduct(id, { name, price, description });
  updateProductForm.reset();
  updateProductId.value = "";
  await fetchProducts();
});

async function addProduct(payload) {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar produto: ${response.status}`);
  }
  return response.text();
}

async function updateProduct(id, payload) {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao atualizar produto: ${response.status}`);
  }
  return response.text();
}

async function deleteProduct(id) {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Erro ao excluir produto: ${response.status}`);
  }
  return response.text();
}

window.addEventListener("DOMContentLoaded", fetchProducts);
