import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Backend funcionando correctamente 🚀" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor activo en puerto", PORT);
});
