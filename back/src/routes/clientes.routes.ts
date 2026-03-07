import { Router } from "express";
import {
  createCliente,
  listClientes,
  updateCliente,
  deleteCliente,
} from "../controllers/clientes.controller";

const router = Router();

// GET /clientes?search=mar
router.get("/", listClientes);
// POST /clientes
router.post("/", createCliente);

// NUEVO
router.put("/:id", updateCliente);
router.delete("/:id", deleteCliente);

export default router;