import express from "express";
import cors from "cors";
import clientesRoutes from "./routes/clientes.routes";
import itemsRoutes from "./routes/items.routes";
import pedidosRoutes from "./routes/pedidos.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/clientes", clientesRoutes);
app.use("/items", itemsRoutes);
app.use("/pedidos", pedidosRoutes);
export default app;