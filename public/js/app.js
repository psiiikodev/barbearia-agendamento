const apiStatus = document.querySelector("#api-status");

async function checkApi() {
  try {
    const response = await fetch("/api/health");

    if (!response.ok) {
      throw new Error(`A API respondeu com status ${response.status}.`);
    }

    const data = await response.json();
    apiStatus.textContent = data.message;
  } catch (error) {
    apiStatus.textContent =
      "Não foi possível conectar à API. Verifique se o servidor está rodando.";
    console.error("Erro ao verificar a API:", error);
  }
}

checkApi();
