"use client";
import Modal from '../components/Modal';
import { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

type Cliente = { id_cliente: number; nombre_cliente: string };
type Item = { id_item: number; nombre_item: string; valor: number; activo: boolean };
type Linea = { itemId: number; cantidad: number };

type Pedido = {
    id_pedido: number;
    estado: "EN_PROCESO" | "ENTREGADO" | "CANCELADO";
    total: number;
    fecha_retiro: string;
    cliente: { id_cliente: number; nombre_cliente: string };
    items: { cantidad: number; precio_unitario: number; item: { nombre_item: string } }[];
};

const API = process.env.NEXT_PUBLIC_API_URL!;

const S: Record<string, CSSProperties> = {
    page: { padding: 24, maxWidth: 1000, margin: "0 auto" },
    h1: { fontSize: 24, fontWeight: 700, marginBottom: 16 },
    h2: { fontSize: 18, fontWeight: 600, marginBottom: 12 },
    box: { border: "1px solid #eee", borderRadius: 12, padding: 16, marginBottom: 20 },
    row: { display: "flex", gap: 12, marginBottom: 16 },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    col: { display: "flex", flexDirection: "column" as const, gap: 6 },
    input: { padding: 10, border: "1px solid #ccc", borderRadius: 8 },
    btn: { padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" },
    btnSm: { padding: "6px 10px", cursor: "pointer" },
    err: { color: "crimson", marginTop: 10 },
    tableWrap: { overflowX: "auto", border: "1px solid #eee", borderRadius: 12 },
    th: { textAlign: "left" as const, padding: 12, borderBottom: "1px solid #eee" },
    td: { padding: 12, borderBottom: "1px solid #eee" },
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error ?? `Error (${res.status})`);
    return body as T;
}

export default function PedidosPage() {
    // listas base
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    // Modal
    const [openCliente, setOpenCliente] = useState(false);
    const [openItem, setOpenItem] = useState(false);

    const [newCliente, setNewCliente] = useState({ nombre: "", fono: "", direccion: "" });
    const [newItem, setNewItem] = useState({ nombre: "", valor: "", comentario: "" });

    // crear pedido
    const [clienteId, setClienteId] = useState<number | "">("");
    const [fechaRetiro, setFechaRetiro] = useState(""); // datetime-local
    const [lineas, setLineas] = useState<Linea[]>([]);
    const [pickItemId, setPickItemId] = useState<number | "">("");
    const [pickCantidad, setPickCantidad] = useState(1);

    // listado pedidos
    const [search, setSearch] = useState("");
    const q = useMemo(() => search.trim(), [search]);
    const [estadoFilter, setEstadoFilter] = useState<"" | Pedido["estado"]>("");

    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const priceById = useMemo(() => new Map(items.map((it) => [it.id_item, it.valor])), [items]);
    const nameById = useMemo(() => new Map(items.map((it) => [it.id_item, it.nombre_item])), [items]);

    const totalPreview = useMemo(
        () => lineas.reduce((acc, l) => acc + (priceById.get(l.itemId) ?? 0) * l.cantidad, 0),
        [lineas, priceById]
    );

    async function loadBases() {
        // clientes + items para el formulario
        const [c, it] = await Promise.all([
            api<Cliente[]>("/clientes", { method: "GET" }),
            api<Item[]>("/items", { method: "GET" }),
        ]);
        setClientes(c);
        setItems(it.filter((x) => x.activo)); // solo activos
    }
    async function crearClienteModal(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const payload = {
            nombre_cliente: newCliente.nombre.trim(),
            fono_cliente: newCliente.fono.trim() || null,
            direccion_cliente: newCliente.direccion.trim() || null,
        };

        if (!payload.nombre_cliente) return setError("Nombre de cliente es obligatorio.");
        if (!payload.fono_cliente) return setError("Fono inválido, reintente");
        try {
            const creado = await api<{ id_cliente: number; nombre_cliente: string }>("/clientes", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            await loadBases(); // recarga lista clientes/items

            setClienteId(creado.id_cliente); // queda seleccionado
            setNewCliente({ nombre: "", fono: "", direccion: "" });
            setOpenCliente(false);
        } catch (e: any) {
            setError(e?.message ?? "Error inesperado");
        }
    }

    async function crearItemModal(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const payload = {
            nombre_item: newItem.nombre.trim(),
            valor: Number(newItem.valor),
            comentario: newItem.comentario.trim() || null,
            activo: true,
        };

        if (!payload.nombre_item) return setError("Nombre de item es obligatorio.");
        if (!Number.isFinite(payload.valor) || payload.valor < 0) return setError("Valor inválido.");

        try {
            const creado = await api<{ id_item: number; nombre_item: string; valor: number }>("/items", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            await loadBases(); // recarga items

            setPickItemId(creado.id_item); // queda seleccionado
            setNewItem({ nombre: "", valor: "", comentario: "" });
            setOpenItem(false);
        } catch (e: any) {
            setError(e?.message ?? "Error inesperado");
        }
    }
    async function loadPedidos() {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (q) params.set("search", q);
            if (estadoFilter) params.set("estado", estadoFilter);
            const qs = params.toString() ? `?${params.toString()}` : "";
            const data = await api<Pedido[]>(`/pedidos${qs}`, { method: "GET" });
            setPedidos(data);
        } catch (e: any) {
            setError(e?.message ?? "Error inesperado");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadBases().then(loadPedidos);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadPedidos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, estadoFilter]);

    function addLinea() {
        if (!pickItemId) return setError("Selecciona un item.");
        const cant = Number(pickCantidad);
        if (!Number.isFinite(cant) || cant < 1) return setError("Cantidad debe ser >= 1.");

        setError(null);
        setLineas((prev) => {
            const idx = prev.findIndex((p) => p.itemId === pickItemId);
            if (idx === -1) return [...prev, { itemId: pickItemId as number, cantidad: cant }];
            // si ya existe, sumamos cantidad
            return prev.map((p, i) => (i === idx ? { ...p, cantidad: p.cantidad + cant } : p));
        });

        setPickCantidad(1);
    }

    function removeLinea(itemId: number) {
        setLineas((prev) => prev.filter((l) => l.itemId !== itemId));
    }

    async function crearPedido(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!clienteId) return setError("Selecciona un cliente.");
        if (!fechaRetiro) return setError("Selecciona fecha y hora de retiro.");
        if (lineas.length === 0) return setError("Agrega al menos 1 item.");

        // datetime-local -> ISO
        const iso = new Date(fechaRetiro).toISOString();

        try {
            await api("/pedidos", {
                method: "POST",
                body: JSON.stringify({
                    clienteId,
                    fecha_retiro: iso,
                    items: lineas,
                }),
            });

            // limpiar form
            setClienteId("");
            setFechaRetiro("");
            setLineas([]);
            setPickItemId("");
            setPickCantidad(1);

            await loadPedidos();
        } catch (e: any) {
            setError(e?.message ?? "Error inesperado");
        }
    }

    async function cambiarEstado(id: number, estado: Pedido["estado"]) {
        setError(null);
        try {
            await api(`/pedidos/${id}/estado`, { method: "PUT", body: JSON.stringify({ estado }) });
            await loadPedidos();
        } catch (e: any) {
            setError(e?.message ?? "Error inesperado");
        }
    }

    async function eliminarPedido(id: number) {
        const ok = confirm(`¿Eliminar pedido #${id}?`);
        if (!ok) return;

        setError(null);
        try {
            const res = await fetch(`${API}/pedidos/${id}`, { method: "DELETE" });
            if (res.status !== 204) {
                const body = await res.json().catch(() => null);
                throw new Error(body?.error ?? `Error al eliminar (${res.status})`);
            }
            await loadPedidos();
        } catch (e: any) {
            setError(e?.message ?? "Error inesperado");
        }
    }

    return (
        <div style={S.page}>
            <h1 style={S.h1}>Pedidos</h1>

            <form onSubmit={crearPedido} style={S.box}>
                <h2 style={S.h2}>🛎️ Nuevo pedido</h2>

                <div style={S.grid}>
                    <div style={S.col}>
                        <label>Cliente *</label>
                        <select
                            value={clienteId}
                            onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : "")}
                            style={S.input}
                        >
                            <option value="">Selecciona…</option>
                            {clientes.map((c) => (
                                <option key={c.id_cliente} value={c.id_cliente}>
                                    {c.nombre_cliente}
                                </option>
                            ))}
                        </select>
                        <button type="button" onClick={() => setOpenCliente(true)} style={S.btn}>
                            + Nuevo
                        </button>
                    </div>

                    <div style={S.col}>
                        <label>Fecha/Hora retiro *</label>
                        <input
                            type="datetime-local"
                            value={fechaRetiro}
                            onChange={(e) => setFechaRetiro(e.target.value)}
                            style={S.input}
                        />
                    </div>

                    <div style={{ ...S.col, gridColumn: "1 / -1" }}>
                        <label>Agregar item</label>
                        <div style={{ display: "flex", gap: 10 }}>
                            <select
                                value={pickItemId}
                                onChange={(e) => setPickItemId(e.target.value ? Number(e.target.value) : "")}
                                style={{ ...S.input, flex: 1 }}
                            >
                                <option value="">Selecciona…</option>
                                {items.map((it) => (
                                    <option key={it.id_item} value={it.id_item}>
                                        {it.nombre_item} — ${it.valor}
                                    </option>
                                ))}
                            </select>

                            <button type="button" onClick={addLinea} style={S.btn}>
                                + Nuevo
                            </button>

                            <input
                                value={pickCantidad}
                                onChange={(e) => setPickCantidad(Number(e.target.value))}
                                type="number"
                                min={1}
                                style={{ ...S.input, width: 120 }}
                            />

                            <button type="button" onClick={addLinea} style={S.btn}>
                                + Agregar
                            </button>
                        </div>
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                        <div style={S.tableWrap}>
                            <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                                <thead>
                                    <tr style={{ background: "#f3edb9" }}>
                                        <th style={S.th}>Item</th>
                                        <th style={S.th}>Cantidad</th>
                                        <th style={S.th}>Subtotal</th>
                                        <th style={S.th}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineas.map((l) => (
                                        <tr key={l.itemId}>
                                            <td style={S.td}>{nameById.get(l.itemId) ?? `Item #${l.itemId}`}</td>
                                            <td style={S.td}>{l.cantidad}</td>
                                            <td style={S.td}>${(priceById.get(l.itemId) ?? 0) * l.cantidad}</td>
                                            <td style={S.td}>
                                                <button type="button" onClick={() => removeLinea(l.itemId)} style={S.btnSm}>
                                                    Quitar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {lineas.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={S.td}>
                                                Aún no agregas items.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, fontWeight: 700 }}>
                            Total: ${totalPreview}
                        </div>
                    </div>
                </div>

                {error && <p style={S.err}>{error}</p>}

                <div style={{ marginTop: 12 }}>
                    <button type="submit" style={S.btn}>
                        Guardar pedido
                    </button>
                </div>
            </form>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por cliente o ID pedido..."
                    style={{ ...S.input, flex: 1 }}
                />
                <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value as any)} style={S.input}>
                    <option value="">Todos</option>
                    <option value="EN_PROCESO">En proceso</option>
                    <option value="ENTREGADO">Entregado</option>
                    <option value="CANCELADO">Cancelado</option>
                </select>
                <button onClick={loadPedidos} style={S.btn}>
                    Buscar
                </button>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>Lista de pedidos</h2>
                {loading && <span>Cargando…</span>}
            </div>

            <div style={S.tableWrap}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                    <thead>
                        <tr style={{ textAlign: "center", background: "#f3edb9" }}>
                            <th style={S.th}>ID</th>
                            <th style={S.th}>Cliente</th>
                            <th style={S.th}>Retiro</th>
                            <th style={S.th}>Total</th>
                            <th style={S.th}>Estado</th>
                            <th style={S.th}>Items</th>
                            <th style={S.th}>Opciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pedidos.map((p) => (
                            <tr key={p.id_pedido}>
                                <td style={S.td}>{p.id_pedido}</td>
                                <td style={S.td}>{p.cliente.nombre_cliente}</td>
                                <td style={S.td}>{new Date(p.fecha_retiro).toLocaleString()}</td>
                                <td style={S.td}>${p.total}</td>
                                <td style={S.td}>{p.estado}</td>
                                <td style={S.td}>
                                    {p.items.map((x, i) => (
                                        <div key={i}>
                                            {x.item.nombre_item} x{x.cantidad}
                                        </div>
                                    ))}
                                </td>
                                <td style={S.td}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                        {/* Grupo estados */}
                                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                            <button
                                                onClick={() => cambiarEstado(p.id_pedido, "EN_PROCESO")}
                                                style={{
                                                    padding: "6px 10px",
                                                    borderRadius: 6,
                                                    border: "none",
                                                    background: "#6badda",
                                                    color: "white",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                En proceso
                                            </button>

                                            <button
                                                onClick={() => cambiarEstado(p.id_pedido, "ENTREGADO")}
                                                style={{
                                                    padding: "6px 10px",
                                                    borderRadius: 6,
                                                    border: "none",
                                                    background: "#3edaa6",
                                                    color: "white",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Entregado
                                            </button>

                                            <button
                                                onClick={() => cambiarEstado(p.id_pedido, "CANCELADO")}
                                                style={{
                                                    padding: "6px 10px",
                                                    borderRadius: 6,
                                                    border: "none",
                                                    background: "#ecb75a",
                                                    color: "white",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Cancelado
                                            </button>
                                        </div>
                                        {/* Acción destructiva */}
                                        <button
                                            onClick={() => eliminarPedido(p.id_pedido)}
                                            style={{
                                                padding: "6px 10px",
                                                borderRadius: 6,
                                                border: "none",
                                                background: "#eb6a6a",
                                                color: "white",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {pedidos.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7} style={S.td}>
                                    No hay pedidos.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Modal open={openCliente} title="Nuevo cliente" onClose={() => setOpenCliente(false)}>
                <form onSubmit={crearClienteModal} style={{ display: "grid", gap: 10 }}>
                    <input
                        placeholder="Nombre *"
                        value={newCliente.nombre}
                        onChange={(e) => setNewCliente((p) => ({ ...p, nombre: e.target.value }))}
                        style={S.input}
                    />
                    <input
                        placeholder="Fono"
                        value={newCliente.fono}
                        onChange={(e) => setNewCliente((p) => ({ ...p, fono: e.target.value }))}
                        style={S.input}
                    />
                    <input
                        placeholder="Dirección"
                        value={newCliente.direccion}
                        onChange={(e) => setNewCliente((p) => ({ ...p, direccion: e.target.value }))}
                        style={S.input}
                    />

                    <button type="submit" style={S.btn}>
                        Guardar cliente
                    </button>
                </form>
            </Modal>

            <Modal open={openItem} title="Nuevo item" onClose={() => setOpenItem(false)}>
                <form onSubmit={crearItemModal} style={{ display: "grid", gap: 10 }}>
                    <input
                        placeholder="Nombre *"
                        value={newItem.nombre}
                        onChange={(e) => setNewItem((p) => ({ ...p, nombre: e.target.value }))}
                        style={S.input}
                    />
                    <input
                        placeholder="Valor *"
                        inputMode="numeric"
                        value={newItem.valor}
                        onChange={(e) => setNewItem((p) => ({ ...p, valor: e.target.value }))}
                        style={S.input}
                    />
                    <input
                        placeholder="Comentario"
                        value={newItem.comentario}
                        onChange={(e) => setNewItem((p) => ({ ...p, comentario: e.target.value }))}
                        style={S.input}
                    />

                    <button type="submit" style={S.btn}>
                        Guardar item
                    </button>
                </form>
            </Modal>
        </div>
    );
}