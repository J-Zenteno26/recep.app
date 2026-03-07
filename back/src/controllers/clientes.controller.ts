import { Request, Response } from "express";
import { prisma } from "../db/prisma";

export async function listClientes(req: Request, res: Response) {
  const search = (req.query.search as string | undefined)?.trim();

  const clientes = await prisma.cliente.findMany({
    where: search
      ? {
          OR: [
            { nombre_cliente: { contains: search, mode: "insensitive" } },
            { fono_cliente: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { id_cliente: "desc" },
    take: 50,
  });

  res.json(clientes);
}

export async function createCliente(req: Request, res: Response) {
  const { nombre_cliente, fono_cliente, direccion_cliente } = req.body ?? {};

  if (!nombre_cliente || typeof nombre_cliente !== "string") {
    return res.status(400).json({ error: "nombre_cliente es requerido" });
  }

  const nuevo = await prisma.cliente.create({
    data: {
      nombre_cliente,
      fono_cliente: fono_cliente ?? null,
      direccion_cliente: direccion_cliente ?? null,
    },
  });

  res.status(201).json(nuevo);
}
export async function updateCliente(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });

  const { nombre_cliente, fono_cliente, direccion_cliente } = req.body ?? {};

  if (!nombre_cliente || typeof nombre_cliente !== "string") {
    return res.status(400).json({ error: "nombre_cliente es requerido" });
  }

  try {
    const updated = await prisma.cliente.update({
      where: { id_cliente: id },
      data: {
        nombre_cliente: nombre_cliente.trim(),
        fono_cliente: (fono_cliente ?? "").toString().trim() || null,
        direccion_cliente: (direccion_cliente ?? "").toString().trim() || null,
      },
    });

    return res.json(updated);
  } catch (e: any) {
    // Prisma: record not found
    if (e?.code === "P2025") return res.status(404).json({ error: "Cliente no encontrado" });
    return res.status(500).json({ error: "Error al actualizar cliente" });
  }
}

export async function deleteCliente(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });

  try {
    await prisma.cliente.delete({ where: { id_cliente: id } });
    return res.status(204).send();
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Cliente no encontrado" });

    // Si el cliente tiene pedidos asociados, por FK puede fallar:
    // Prisma suele tirar P2003 (FK constraint)
    if (e?.code === "P2003") {
      return res.status(409).json({ error: "No se puede eliminar: cliente tiene pedidos asociados" });
    }

    return res.status(500).json({ error: "Error al eliminar cliente" });
  }
}