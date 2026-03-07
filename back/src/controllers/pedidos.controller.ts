import { Request, Response } from "express";
import { prisma } from "../db/prisma";

const ESTADOS = ["EN_PROCESO", "ENTREGADO", "CANCELADO"] as const;
type Estado = typeof ESTADOS[number];

export async function listPedidos(req: Request, res: Response) {
  const search = (req.query.search as string | undefined)?.trim();
  const estado = (req.query.estado as string | undefined)?.trim();

  const pedidos = await prisma.pedido.findMany({
    where: {
      ...(estado && ESTADOS.includes(estado as Estado) ? { estado: estado as Estado } : {}),
      ...(search
        ? {
            OR: [
              { cliente: { nombre_cliente: { contains: search, mode: "insensitive" } } },
              // si escriben "12" y coincide id_pedido
              ...(Number.isFinite(Number(search)) ? [{ id_pedido: Number(search) }] : []),
            ],
          }
        : {}),
    },
    include: {
      cliente: true,
      items: { include: { item: true } },
    },
    orderBy: { id_pedido: "desc" },
    take: 50,
  });

  res.json(pedidos);
}

export async function createPedido(req: Request, res: Response) {
  const { clienteId, fecha_retiro, items } = req.body ?? {};

  const cid = Number(clienteId);
  if (!Number.isFinite(cid)) return res.status(400).json({ error: "clienteId inválido" });

  const fr = new Date(fecha_retiro);
  if (isNaN(fr.getTime())) return res.status(400).json({ error: "fecha_retiro inválida (usa ISO string)" });

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items debe ser un arreglo con al menos 1 item" });
  }

  // Validar líneas
  const lines = items.map((x: any) => ({
    itemId: Number(x.itemId),
    cantidad: Number(x.cantidad ?? 1),
    comentario_linea: x.comentario_linea ? String(x.comentario_linea) : null,
  }));

  if (lines.some((l) => !Number.isFinite(l.itemId))) return res.status(400).json({ error: "itemId inválido" });
  if (lines.some((l) => !Number.isFinite(l.cantidad) || l.cantidad < 1))
    return res.status(400).json({ error: "cantidad debe ser >= 1" });

  // Quitar duplicados (si se repite el mismo item, sumamos cantidad)
  const merged = new Map<number, { itemId: number; cantidad: number; comentario_linea: string | null }>();
  for (const l of lines) {
    const prev = merged.get(l.itemId);
    if (!prev) merged.set(l.itemId, l);
    else merged.set(l.itemId, { ...prev, cantidad: prev.cantidad + l.cantidad });
  }
  const finalLines = [...merged.values()];

  try {
    // Buscar items (para usar valor como precio_unitario "congelado")
    const ids = finalLines.map((l) => l.itemId);
    const dbItems = await prisma.item.findMany({ where: { id_item: { in: ids } } });

    if (dbItems.length !== ids.length) {
      return res.status(400).json({ error: "Uno o más items no existen" });
    }

    const priceById = new Map(dbItems.map((it) => [it.id_item, it.valor]));
    const total = finalLines.reduce((acc, l) => acc + (priceById.get(l.itemId) ?? 0) * l.cantidad, 0);

    const pedido = await prisma.pedido.create({
      data: {
        clienteId: cid,
        fecha_retiro: fr,
        total,
        items: {
          create: finalLines.map((l) => ({
            itemId: l.itemId,
            cantidad: l.cantidad,
            precio_unitario: priceById.get(l.itemId)!,
            comentario_linea: l.comentario_linea,
          })),
        },
      },
      include: { cliente: true, items: { include: { item: true } } },
    });

    res.status(201).json(pedido);
  } catch (e: any) {
    // Cliente no existe o FK
    if (e?.code === "P2003") return res.status(400).json({ error: "clienteId o itemId inválido (FK)" });
    res.status(500).json({ error: "Error al crear pedido" });
  }
}

export async function updateEstadoPedido(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });

  const { estado } = req.body ?? {};
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: "estado inválido" });

  try {
    const updated = await prisma.pedido.update({
      where: { id_pedido: id },
      data: { estado },
    });
    res.json(updated);
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Pedido no encontrado" });
    res.status(500).json({ error: "Error al actualizar estado" });
  }
}

export async function deletePedido(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });

  try {
    await prisma.pedido.delete({ where: { id_pedido: id } });
    res.status(204).send();
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Pedido no encontrado" });
    res.status(500).json({ error: "Error al eliminar pedido" });
  }
}