import express from "express";
import cors from "cors";
import axios from "axios";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

// ========= Helpers =========
const API = "https://api.mail.tm";

function randomPassword() {
  return crypto.randomBytes(12).toString("hex"); // 24 chars
}

async function getDomain() {
  const { data } = await axios.get(`${API}/domains?page=1`);
  const domain = data?.["hydra:member"]?.[0]?.domain;
  if (!domain) throw new Error("No hay dominios disponibles en mail.tm");
  return domain;
}

async function createAccount(address, password) {
  const { data } = await axios.post(`${API}/accounts`, { address, password });
  return data; // includes id + address
}

async function getToken(address, password) {
  const { data } = await axios.post(`${API}/token`, { address, password });
  return data?.token;
}

// ========= Healthcheck =========
app.get("/", (req, res) => {
  res.json({ message: "Backend funcionando correctamente 🚀" });
});

// ========= API: Crear sesión (correo) =========
// Devuelve: { address, password, token, expiresAt }
app.post("/api/session/new", async (req, res) => {
  try {
    const domain = await getDomain();
    const user = `u${crypto.randomBytes(6).toString("hex")}`;
    const address = `${user}@${domain}`;
    const password = randomPassword();

    await createAccount(address, password);
    const token = await getToken(address, password);

    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

    res.json({ address, password, token, expiresAt });
  } catch (err) {
    res.status(500).json({
      error: "No se pudo crear sesión",
      detail: err?.response?.data || err?.message || String(err),
    });
  }
});

// ========= API: Inbox =========
// Header: Authorization: Bearer <token>
app.get("/api/inbox", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const { data } = await axios.get(`${API}/messages?page=1`, {
      headers: { Authorization: auth },
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({
      error: "No se pudo leer inbox",
      detail: err?.response?.data || err?.message || String(err),
    });
  }
});

// ========= API: Leer un mensaje =========
// Header: Authorization: Bearer <token>
app.get("/api/message/:id", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const { id } = req.params;
    const { data } = await axios.get(`${API}/messages/${id}`, {
      headers: { Authorization: auth },
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({
      error: "No se pudo leer el mensaje",
      detail: err?.response?.data || err?.message || String(err),
    });
  }
});

// ========= API: Regenerar correo =========
app.post("/api/session/refresh", async (req, res) => {
  // Por simplicidad: crea uno nuevo igual que /new
  // (El frontend "olvida" el anterior y reinicia timer)
  return app._router.handle({ ...req, url: "/api/session/new", method: "POST" }, res, () => {});
});

// ========= Start =========
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor activo en puerto", PORT);
});
