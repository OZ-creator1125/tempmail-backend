import express from "express";
import cors from "cors";
import axios from "axios";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const API = "https://api.mail.tm";

// LOGS
console.log("Booting app...");
console.log("PORT env =", process.env.PORT);

// HOME / HEALTHCHECK
app.get("/", (req, res) => {
  res.json({ message: "Backend funcionando correctamente 🚀" });
});

// NEW SESSION
app.post("/api/session/new", async (req, res) => {
  try {
    const domainsRes = await axios.get(`${API}/domains?page=1`, { timeout: 15000 });
    const domain = domainsRes?.data?.["hydra:member"]?.[0]?.domain;
    if (!domain) return res.status(500).json({ error: "Mail.tm sin dominios disponibles" });

    const user = `u${crypto.randomBytes(6).toString("hex")}`;
    const address = `${user}@${domain}`;
    const password = crypto.randomBytes(12).toString("hex");

    await axios.post(`${API}/accounts`, { address, password }, { timeout: 15000 });

    const tokenRes = await axios.post(`${API}/token`, { address, password }, { timeout: 15000 });
    const token = tokenRes?.data?.token;
    if (!token) return res.status(500).json({ error: "No se pudo obtener token" });

    const expiresAt = Date.now() + 10 * 60 * 1000;
    res.json({ address, password, token, expiresAt });
  } catch (err) {
    console.error("SESSION NEW ERROR:", err?.response?.status, err?.response?.data || err?.message);
    res.status(500).json({
      error: "No se pudo crear sesión",
      status: err?.response?.status || null,
      detail: err?.response?.data || err?.message || String(err),
    });
  }
});

// INBOX
app.get("/api/inbox", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(400).json({ error: "Falta header Authorization" });

    const { data } = await axios.get(`${API}/messages?page=1`, {
      headers: { Authorization: auth },
      timeout: 15000,
    });

    res.json(data);
  } catch (err) {
    console.error("INBOX ERROR:", err?.response?.status, err?.response?.data || err?.message);
    res.status(500).json({
      error: "No se pudo leer inbox",
      status: err?.response?.status || null,
      detail: err?.response?.data || err?.message || String(err),
    });
  }
});

// READ MESSAGE
app.get("/api/message/:id", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(400).json({ error: "Falta Authorization" });

    const id = req.params.id;

    const { data } = await axios.get(`${API}/messages/${id}`, {
      headers: { Authorization: auth },
      timeout: 15000,
    });

    res.json(data);
  } catch (err) {
    console.error("MESSAGE ERROR:", err?.response?.status, err?.response?.data || err?.message);
    res.status(500).json({
      error: "No se pudo leer mensaje",
      status: err?.response?.status || null,
      detail: err?.response?.data || err?.message || String(err),
    });
  }
});

// LISTEN (CLAVE)
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor activo en puerto", PORT);
});
