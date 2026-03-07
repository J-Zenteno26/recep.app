"use client";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

type Item = {
  id_item: number;
  nombre_item: string;
  valor: number;
  comentario: string | null;
  activo: boolean;
};

const API = process.env.NEXT_PUBLIC_API_URL!;

const S: Record<string, CSSProperties> = {
  page: { padding: 24, maxWidth: 900, margin: "0 auto" },
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

export default function ItemsPage() {
  const [search, setSearch] = useState("");
  const q = useMemo(() => search.trim(), [search]);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    valor: "",
    comentario: "",
    activo: true,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = q ? `?search=${encodeURIComponent(q)}` : "";
      const data = await api<Item[]>(`/items${qs}`, { method: "GET" });
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function startEdit(it: Item) {
    setEditing(it);
    setForm({
      nombre: it.nombre_item,
      valor: String(it.valor),
      comentario: it.comentario ?? "",
      activo: it.activo,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ nombre: "", valor: "", comentario: "", activo: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nombre_item = form.nombre.trim();
    if (!nombre_item) return setError("El nombre del item es obligatorio.");

    const v = Number(form.valor);
    if (!Number.isFinite(v) || v < 0) return setError("El valor debe ser un número >= 0.");

    const payload = {
      nombre_item,
      valor: Math.trunc(v),
      comentario: form.comentario.trim() || null,
      activo: form.activo,
    };

    try {
      if (editing) {
        await api(`/items/${editing.id_item}`, { method: "PUT", body: JSON.stringify(payload) });
        cancelEdit();
      } else {
        await api(`/items`, { method: "POST", body: JSON.stringify(payload) });
        setForm({ nombre: "", valor: "", comentario: "", activo: true });
      }
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Error inesperado");
    }
  }

  async function removeItem(it: Item) {
    const ok = confirm(`¿Eliminar "${it.nombre_item}"?`);
    if (!ok) return;

    setError(null);
    try {
      const res = await fetch(`${API}/items/${it.id_item}`, { method: "DELETE" });
      if (res.status !== 204) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Error al eliminar (${res.status})`);
      }
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Error inesperado");
    }
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Items</h1>

      <div style={S.row}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          style={{ ...S.input, flex: 1 }}
        />
        <button onClick={load} style={S.btn}>
          Buscar
        </button>
      </div>

      <form onSubmit={handleSubmit} style={S.box}>
        <h2 style={S.h2}>{editing ? `Editar item #${editing.id_item}` : "Nuevo item"}</h2>

        <div style={S.grid}>
          <div style={S.col}>
            <label>Nombre *</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Torta Chocolate"
              style={S.input}
            />
          </div>

          <div style={S.col}>
            <label>Valor *</label>
            <input
              value={form.valor}
              onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
              placeholder="Ej: 15000"
              inputMode="numeric"
              style={S.input}
            />
          </div>

          <div style={{ ...S.col, gridColumn: "1 / -1" }}>
            <label>Comentario</label>
            <input
              value={form.comentario}
              onChange={(e) => setForm((p) => ({ ...p, comentario: e.target.value }))}
              placeholder="Ej: 8 porciones"
              style={S.input}
            />
          </div>

          <div style={{ ...S.col, gridColumn: "1 / -1" }}>
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
              />
              Activo
            </label>
          </div>
        </div>

        {error && <p style={S.err}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button type="submit" style={S.btn}>
            {editing ? "Guardar cambios" : "Guardar item"}
          </button>
          {editing && (
            <button type="button" onClick={cancelEdit} style={S.btn}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Lista de ítems</h2>
        {loading && <span>cargando…</span>}
      </div>

      <div style={S.tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={S.th}>ID</th>
              <th style={S.th}>Nombre</th>
              <th style={S.th}>Valor</th>
              <th style={S.th}>Activo</th>
              <th style={S.th}>Comentario</th>
              <th style={S.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id_item}>
                <td style={S.td}>{it.id_item}</td>
                <td style={S.td}>{it.nombre_item}</td>
                <td style={S.td}>{it.valor}</td>
                <td style={S.td}>{it.activo ? "Sí" : "No"}</td>
                <td style={S.td}>{it.comentario ?? "-"}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => startEdit(it)} style={S.btnSm}>
                      Editar
                    </button>
                    <button onClick={() => removeItem(it)} style={S.btnSm}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={6} style={S.td}>
                  No hay items.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}