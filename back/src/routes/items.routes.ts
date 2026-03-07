import { Router } from "express";
import { 
    createItem, 
    listItems, 
    updateItem, 
    deleteItem ,
} from "../controllers/items.controllers";

const router = Router();

// GET /items?search=tor
router.get("/", listItems);

// POST /items
router.post("/", createItem);

// PUT /items/:id
router.put("/:id", updateItem);

// DELETE /items/:id
router.delete("/:id", deleteItem);

export default router;