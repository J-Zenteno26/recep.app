import { Router } from "express";
import { createPedido, listPedidos, updateEstadoPedido, deletePedido } from "../controllers/pedidos.controller";

const router = Router();

router.get("/", listPedidos);
router.post("/", createPedido);
router.put("/:id/estado", updateEstadoPedido);
router.delete("/:id", deletePedido);

export default router;