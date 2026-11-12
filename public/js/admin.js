const serviceForm = document.querySelector("#service-form");
const barberForm = document.querySelector("#barber-form");
const serviceList = document.querySelector("#service-list");
const barberList = document.querySelector("#barber-list");
const serviceMessage = document.querySelector("#service-message");
const barberMessage = document.querySelector("#barber-message");
const logoutButton = document.querySelector("#logout-button");

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `A requisição falhou (${response.status}).`);
  }

  return data;
}

function showEmptyMessage(list, message) {
  const item = document.createElement("li");
  item.className = "empty-message";
  item.textContent = message;
  list.replaceChildren(item);
}

async function loadServices() {
  const services = await requestJson("/api/services");
  serviceList.replaceChildren();

  if (services.length === 0) {
    showEmptyMessage(serviceList, "Nenhum serviço cadastrado ainda.");
    return;
  }

  for (const service of services) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    const details = document.createElement("span");

    name.textContent = service.name;
    details.textContent =
      `${service.durationMinutes} min · ` +
      service.price.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });
    item.append(name, details);
    serviceList.append(item);
  }
}

async function loadBarbers() {
  const barbers = await requestJson("/api/barbers");
  barberList.replaceChildren();

  if (barbers.length === 0) {
    showEmptyMessage(barberList, "Nenhum barbeiro cadastrado ainda.");
    return;
  }

  for (const barber of barbers) {
    const item = document.createElement("li");
    item.textContent = barber.name;
    barberList.append(item);
  }
}

async function submitForm(form, messageElement, endpoint, getPayload, reload) {
  messageElement.textContent = "";

  try {
    await requestJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getPayload(new FormData(form)))
    });
    form.reset();
    messageElement.textContent = "Cadastro realizado com sucesso.";
    await reload();
  } catch (error) {
    if (error.message === "Autenticação necessária.") {
      window.location.assign("/login.html?next=%2Fadmin");
      return;
    }

    messageElement.textContent = error.message;
    console.error(`Erro ao enviar cadastro para ${endpoint}:`, error);
  }
}

serviceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitForm(
    serviceForm,
    serviceMessage,
    "/api/services",
    (formData) => ({
      name: formData.get("name"),
      durationMinutes: Number(formData.get("durationMinutes")),
      price: Number(formData.get("price"))
    }),
    loadServices
  );
});

barberForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitForm(
    barberForm,
    barberMessage,
    "/api/barbers",
    (formData) => ({ name: formData.get("name") }),
    loadBarbers
  );
});

Promise.all([loadServices(), loadBarbers()]).catch((error) => {
  if (error.message === "Autenticação necessária.") {
    window.location.assign("/login.html?next=%2Fadmin");
    return;
  }

  console.error("Erro ao carregar os cadastros:", error);
  serviceMessage.textContent =
    "Não foi possível carregar os cadastros. Verifique a conexão com a API.";
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });

    if (!response.ok) {
      throw new Error(`Não foi possível sair (${response.status}).`);
    }

    window.location.assign("/");
  } catch (error) {
    logoutButton.disabled = false;
    serviceMessage.textContent = error.message;
    console.error("Erro ao encerrar a sessão:", error);
  }
});
