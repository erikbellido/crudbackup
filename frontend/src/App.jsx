import { useEffect, useState } from 'react'
import { api } from './api'
import './index.css'

function toDatetimeLocal(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function inputTypeFor(column) {
  if (column.type === 'Boolean') return 'checkbox'
  if (column.type === 'DateTime') return 'datetime-local'
  if (['Int32', 'Int64', 'Decimal', 'Double', 'Single'].includes(column.type)) return 'number'
  return 'text'
}

function defaultValueFor(column) {
  if (column.type === 'Boolean') return true
  if (column.type === 'DateTime') return toDatetimeLocal(new Date())
  if (['Int32', 'Int64', 'Decimal', 'Double', 'Single'].includes(column.type)) return 0
  return ''
}

function EntityForm({ meta, initial, onCancel, onSave }) {
  const editable = meta.columns.filter((c) => !c.isKey && !c.isComputed)
  const [values, setValues] = useState(() => {
    const v = {}
    editable.forEach((c) => {
      const raw = initial ? initial[c.name] : undefined
      if (raw !== undefined && raw !== null) {
        v[c.name] = c.type === 'DateTime' ? toDatetimeLocal(raw) : raw
      } else {
        v[c.name] = defaultValueFor(c)
      }
    })
    return v
  })

  function handleChange(col, raw) {
    let val = raw
    if (col.type === 'Boolean') val = raw
    else if (['Int32', 'Int64'].includes(col.type)) val = raw === '' ? '' : parseInt(raw, 10)
    else if (['Decimal', 'Double', 'Single'].includes(col.type)) val = raw === '' ? '' : parseFloat(raw)
    setValues((prev) => ({ ...prev, [col.name]: val }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...(initial || {}) }
    editable.forEach((c) => {
      payload[c.name] = values[c.name]
    })
    onSave(payload)
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{initial ? 'Editar registro' : 'Nuevo registro'}</h3>
        <form onSubmit={handleSubmit}>
          {editable.map((col) => (
            <label key={col.name} className="field">
              <span>{col.name}{!col.nullable && <em>*</em>}</span>
              {col.type === 'Boolean' ? (
                <input
                  type="checkbox"
                  checked={!!values[col.name]}
                  onChange={(e) => handleChange(col, e.target.checked)}
                />
              ) : (
                <input
                  type={inputTypeFor(col)}
                  step={['Decimal', 'Double', 'Single'].includes(col.type) ? '0.01' : undefined}
                  required={!col.nullable}
                  value={values[col.name] ?? ''}
                  onChange={(e) => handleChange(col, e.target.value)}
                />
              )}
            </label>
          ))}
          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="btn secondary">Cancelar</button>
            <button type="submit" className="btn primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [entities, setEntities] = useState([])
  const [selected, setSelected] = useState(null)
  const [meta, setMeta] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingRow, setEditingRow] = useState(undefined) // undefined = closed, null = new, object = edit

  useEffect(() => {
    api.getEntities()
      .then((data) => {
        setEntities(data)
        if (data.length) setSelected(data[0].route)
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!selected) return
    loadTable(selected)
  }, [selected])

  async function loadTable(route) {
    setLoading(true)
    setError('')
    try {
      const [m, data] = await Promise.all([api.getMeta(route), api.getAll(route)])
      setMeta(m)
      setRows(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(row) {
    if (!meta) return
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await api.remove(selected, row[meta.key])
      loadTable(selected)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleSave(payload) {
    try {
      if (editingRow) {
        await api.update(selected, editingRow[meta.key], payload)
      } else {
        await api.create(selected, payload)
      }
      setEditingRow(undefined)
      loadTable(selected)
    } catch (e) {
      setError(e.message)
    }
  }

  const columns = meta ? meta.columns.map((c) => c.name) : []

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Zapatería Joselito</h2>
        <nav>
          {entities.map((e) => (
            <button
              key={e.route}
              className={`nav-item ${selected === e.route ? 'active' : ''}`}
              onClick={() => setSelected(e.route)}
            >
              {e.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="content-header">
          <h1>{entities.find((e) => e.route === selected)?.label || ''}</h1>
          <button className="btn primary" onClick={() => setEditingRow(null)} disabled={!meta}>
            + Nuevo
          </button>
        </header>

        {error && <div className="alert">{error}</div>}
        {loading && <p>Cargando...</p>}

        {!loading && meta && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => <th key={c}>{c}</th>)}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row[meta.key] ?? i}>
                    {columns.map((c) => (
                      <td key={c}>
                        {typeof row[c] === 'boolean' ? (row[c] ? 'Sí' : 'No') : String(row[c] ?? '')}
                      </td>
                    ))}
                    <td className="actions">
                      <button className="btn small" onClick={() => setEditingRow(row)}>Editar</button>
                      <button className="btn small danger" onClick={() => handleDelete(row)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={columns.length + 1}>Sin registros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {editingRow !== undefined && meta && (
          <EntityForm
            meta={meta}
            initial={editingRow}
            onCancel={() => setEditingRow(undefined)}
            onSave={handleSave}
          />
        )}
      </main>
    </div>
  )
}
