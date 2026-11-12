require("dotenv").config();

const express = require("express");
const path = require("node:path");
const session = require("express-session");
const { rateLimit } = require("express-rate-limit");
const database = require("./db/database");

const app = express();
const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, "public");
const privateDirectory = path.join(__dirname, "private");
const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
const sessionSecret = process.env.SESSION_SECRET;

if (!adminUsername || !adminPassword || adminPassword.length < 12) {
  throw new Error(
    "Configure ADMIN_USERNAME e ADMIN_PASSWORD (com pelo menos 12 caracteres) no arquivo .env."
  );
}

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    "Configure SESSION_SECRET com pelo menos 32 caracteres no arquivo .env."
  );
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json({ limit: "10kb" }));
app.use(
  session({
    name: "barbearia.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

function requireAuthentication(request, response, next) {
  response.set("Cache-Control", "no-store");

  if (request.session.authenticated) {
    return next();
  }

  if (request.path.startsWith("/api/")) {
    return response.status(401).json({ error: "Autenticação necessária." });
  }

  response.redirect("/login.html?next=%2Fadmin");
}

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." }
});

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidActive(value) {
  return value === undefined || typeof value === "boolean";
}

function serviceFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.duration_minutes,
    price: row.price,
    active: Boolean(row.active),
    createdAt: row.created_at
  };
}

function barberFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    active: Boolean(row.active),
    createdAt: row.created_at
  };
}

app.get("/api/health", (request, response) => {
  response.json({
    status: "ok",
    message: "API da barbearia funcionando."
  });
});

app.get("/api/auth/session", (request, response) => {
  response.json({ authenticated: Boolean(request.session.authenticated) });
});

app.post("/api/auth/login", loginRateLimit, (request, response, next) => {
  const { username, password } = request.body ?? {};

  if (
    !isObject(request.body) ||
    typeof username !== "string" ||
    typeof password !== "string"
  ) {
    return response.status(400).json({
      error: "Informe usuário e senha."
    });
  }

  if (username !== adminUsername || password !== adminPassword) {
    return response.status(401).json({
      error: "Usuário ou senha incorretos."
    });
  }

  request.session.regenerate((error) => {
    if (error) {
      return next(error);
    }

    request.session.authenticated = true;
    request.session.save((saveError) => {
      if (saveError) {
        return next(saveError);
      }

      response.json({ authenticated: true });
    });
  });
});

app.post("/api/auth/logout", (request, response, next) => {
  request.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    response.clearCookie("barbearia.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });
    response.status(204).end();
  });
});

app.get("/admin", requireAuthentication, (request, response, next) => {
  response.set("Cache-Control", "no-store");
  response.sendFile(path.join(privateDirectory, "admin.html"), (error) => {
    if (error) {
      next(error);
    }
  });
});

app.use(express.static(publicDirectory));

app.get("/api/services", requireAuthentication, (request, response) => {
  const rows = database
    .prepare("SELECT * FROM services ORDER BY name")
    .all();

  response.json(rows.map(serviceFromRow));
});

app.post("/api/services", requireAuthentication, (request, response) => {
  const { name, durationMinutes, price, active } = request.body ?? {};

  if (
    !isObject(request.body) ||
    typeof name !== "string" ||
    name.trim().length === 0 ||
    !Number.isSafeInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0 ||
    !isValidActive(active)
  ) {
    return response.status(400).json({
      error:
        "Informe nome, duração em minutos (inteiro positivo), preço (número não negativo) e active (booleano, opcional)."
    });
  }

  const result = database
    .prepare(
      `INSERT INTO services (name, duration_minutes, price, active)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      name.trim(),
      durationMinutes,
      price,
      active === false ? 0 : 1
    );
  const service = database
    .prepare("SELECT * FROM services WHERE id = ?")
    .get(result.lastInsertRowid);

  response.status(201).json(serviceFromRow(service));
});

app.get("/api/barbers", requireAuthentication, (request, response) => {
  const rows = database.prepare("SELECT * FROM barbers ORDER BY name").all();

  response.json(rows.map(barberFromRow));
});

app.post("/api/barbers", requireAuthentication, (request, response) => {
  const { name, active } = request.body ?? {};

  if (
    !isObject(request.body) ||
    typeof name !== "string" ||
    name.trim().length === 0 ||
    !isValidActive(active)
  ) {
    return response.status(400).json({
      error: "Informe um nome e, opcionalmente, active como booleano."
    });
  }

  const result = database
    .prepare("INSERT INTO barbers (name, active) VALUES (?, ?)")
    .run(name.trim(), active === false ? 0 : 1);
  const barber = database
    .prepare("SELECT * FROM barbers WHERE id = ?")
    .get(result.lastInsertRowid);

  response.status(201).json(barberFromRow(barber));
});

app.use((error, request, response, next) => {
  if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
    return response.status(409).json({
      error: "Já existe um cadastro com esse nome."
    });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({
      error: "O corpo da requisição precisa conter um JSON válido."
    });
  }

  console.error("Erro ao processar requisição:", error);
  response.status(500).json({
    error: "Ocorreu um erro interno ao processar a requisição."
  });
});

app.listen(port, () => {
  console.log(`Servidor disponível em http://localhost:${port}`);
});
