const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const requestedDestination = new URLSearchParams(window.location.search).get("next");
const destination = requestedDestination === "/admin" ? "/admin" : "/";

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";

  const formData = new FormData(loginForm);

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password")
      })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível entrar.");
    }

    window.location.assign(destination);
  } catch (error) {
    loginMessage.textContent = error.message;
    console.error("Erro ao entrar na área administrativa:", error);
  }
});
