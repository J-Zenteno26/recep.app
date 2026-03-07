"use client";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

type Cliente = {
  id_cliente: number;
  nombre_cliente: string;
  fono_cliente: string | null;
  direccion_cliente: string | null;
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

  if (!res.ok) {
    const msg = body?.error ?? `Error (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const q = useMemo(() => search.trim(), [search]);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ nombre: "", fono: "", direccion: "" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = q ? `?search=${encodeURIComponent(q)}` : "";
      const data = await api<Cliente[]>(`/clientes${qs}`, { method: "GET" });
      setClientes(data);
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

  function startEdit(c: Cliente) {
    setEditing(c);
    setForm({
      nombre: c.nombre_cliente,
      fono: c.fono_cliente ?? "",
      direccion: c.direccion_cliente ?? "",
    });
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ nombre: "", fono: "", direccion: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
      setError(null);

      if (!form.nombre.trim()) {
          setError("Debe ingresar nombre");
          return;
      }

      if (!form.fono.trim() || form.fono && !/^\+?\d{9,15}$/.test(form.fono)) {
          setError("Formato de teléfono inválido");
          return;
      }

      const payload = {
          nombre_cliente: form.nombre.trim(),
          fono_cliente: form.fono.trim() || null,
          direccion_cliente: form.direccion.trim() || null,
      };

      try {
          if (editing) {
              await api(`/clientes/${editing.id_cliente}`, {
                  method: "PUT",
                  body: JSON.stringify(payload),
              });
              cancelEdit();
          } else {
              await api(`/clientes`, { method: "POST", body: JSON.stringify(payload) });
              setForm({ nombre: "", fono: "", direccion: "" });
          }
          await load();
      } catch (e: any) {
          setError(e?.message ?? "Error inesperado");
      }
    }

  async function removeCliente(c: Cliente) {
    const ok = confirm(`¿Eliminar a "${c.nombre_cliente}"?`);
    if (!ok) return;

    setError(null);
    try {
      const res = await fetch(`${API}/clientes/${c.id_cliente}`, { method: "DELETE" });
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
      <h1 style={S.h1}>Clientes</h1>

      <div style={S.row}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o fono..."
          style={{ ...S.input, flex: 1 }}
        />
        <button onClick={load} style={S.btn}>
          Buscar
        </button>
      </div>

      <form onSubmit={handleSubmit} style={S.box}>
        <h2 style={S.h2}>{editing ? `Editar cliente #${editing.id_cliente}` : "Nuevo cliente"}</h2>

        <div style={S.grid}>
          <div style={S.col}>
            <label>Nombre *</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: María González"
              style={S.input}
            />
          </div>

          <div style={S.col}>
            <label>Fono</label>
            <input
              value={form.fono}
              onChange={(e) => setForm((p) => ({ ...p, fono: e.target.value }))}
              placeholder="Ej: +56912345678"
              style={S.input}
            />
          </div>

          <div style={{ ...S.col, gridColumn: "1 / -1" }}>
            <label>Dirección</label>
            <input
              value={form.direccion}
              onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
              placeholder="Ej: Av. Siempre Viva 123"
              style={S.input}
            />
          </div>
        </div>

        {error && <p style={S.err}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button type="submit" style={S.btn}>
            {editing ? "Guardar cambios" : "Guardar cliente"}
          </button>
          {editing && (
            <button type="button" onClick={cancelEdit} style={S.btn}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Listado</h2>
        {loading && <span>cargando…</span>}
      </div>

      <div style={S.tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={S.th}>ID</th>
              <th style={S.th}>Nombre</th>
              <th style={S.th}>Fono</th>
              <th style={S.th}>Dirección</th>
              <th style={S.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id_cliente}>
                <td style={S.td}>{c.id_cliente}</td>
                <td style={S.td}>{c.nombre_cliente}</td>
                <td style={S.td}>{c.fono_cliente ?? "-"}</td>
                <td style={S.td}>{c.direccion_cliente ?? "-"}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => startEdit(c)} style={S.btnSm}>
                      Editar
                    </button>
                    <button onClick={() => removeCliente(c)} style={S.btnSm}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {clientes.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={S.td}>
                  No hay clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}