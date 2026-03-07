import { Request, Response } from "express";
import { prisma } from "../db/prisma";

export async function listItems(req: Request, res: Response) {
  const search = (req.query.search as string | undefined)?.trim();

  const items = await prisma.item.findMany({
    where: search
      ? { nombre_item: { contains: search, mode: "insensitive" } }
      : undefined,
    orderBy: { id_item: "desc" },
    take: 100,
  });

  res.json(items);
}

export async function createItem(req: Request, res: Response) {
  const { nombre_item, valor, comentario } = req.body ?? {};

  if (!nombre_item || typeof nombre_item !== "string" || !nombre_item.trim()) {
    return res.status(400).json({ error: "nombre_item es requerido" });
  }

  const v = Number(valor);
  if (!Number.isFinite(v) || v < 0) {
    return res.status(400).json({ error: "valor debe ser un número >= 0" });
  }

  try {
    const nuevo = await prisma.item.create({
      data: {
        nombre_item: nombre_item.trim(),
        valor: Math.trunc(v),
        comentario: (comentario ?? "").toString().trim() || null,
      },
    });

    res.status(201).json(nuevo);
  } catch (e: any) {
    // Unique nombre_item
    if (e?.code === "P2002") return res.status(409).json({ error: "Ya existe un item con ese nombre" });
    res.status(500).json({ error: "Error al crear item" });
  }
}

export async function updateItem(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });

  const { nombre_item, valor, comentario, activo } = req.body ?? {};

  if (!nombre_item || typeof nombre_item !== "string" || !nombre_item.trim()) {
    return res.status(400).json({ error: "nombre_item es requerido" });
  }

  const v = Number(valor);
  if (!Number.isFinite(v) || v < 0) {
    return res.status(400).json({ error: "valor debe ser un número >= 0" });
  }

  try {
    const updated = await prisma.item.update({
      where: { id_item: id },
      data: {
        nombre_item: nombre_item.trim(),
        valor: Math.trunc(v),
        comentario: (comentario ?? "").toString().trim() || null,
        activo: typeof activo === "boolean" ? activo : undefined,
      },
    });

    res.json(updated);
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Item no encontrado" });
    if (e?.code === "P2002") return res.status(409).json({ error: "Ya existe un item con ese nombre" });
    res.status(500).json({ error: "Error al actualizar item" });
  }
}

export async function deleteItem(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });

  try {
    await prisma.item.delete({ where: { id_item: id } });
    res.status(204).send();
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Item no encontrado" });

    // FK: item usado en pedidos
    if (e?.code === "P2003") {
      return res.status(409).json({ error: "No se puede eliminar: item está en pedidos" });
    }

    res.status(500).json({ error: "Error al eliminar item" });
  }
}