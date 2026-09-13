import { useState } from "react";
import { PRESET_PALETTE } from "../hooks/useTypes";

export default function TypeSelect({ types, value, onChange, onCreateType, onUpdateType, disabled }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_PALETTE[0]);
  const [editingColor, setEditingColor] = useState(false);

  const current = types.find((t) => t.id === value);

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === "__new__") { setCreating(true); setEditingColor(false); return; }
    onChange(v || null);
    setEditingColor(false);
  };

  const submitNewType = async () => {
    if (!newName.trim()) return;
    const id = await onCreateType(newName.trim(), newColor);
    onChange(id);
    setCreating(false);
    setNewName("");
  };

  return (
    <div className="type-select">
      <div className="type-select-row">
        {current && <span className="type-dot" style={{ background: current.color }} />}
        <select value={value || ""} onChange={handleSelect} disabled={disabled}>
          <option value="">— Aucun type —</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          {!disabled && <option value="__new__">+ Nouveau type…</option>}
        </select>
        {current && !disabled && (
          <button
            type="button" className="type-edit-btn" title="Modifier la couleur"
            onClick={() => setEditingColor((v) => !v)}
          >
            🎨
          </button>
        )}
      </div>

      {editingColor && current && (
        <div className="type-color-editor">
          <div className="palette">
            {PRESET_PALETTE.map((c) => (
              <button
                key={c} type="button" className="swatch"
                style={{ background: c, outline: current.color === c ? "2px solid var(--ink)" : "none" }}
                onClick={() => onUpdateType(current.id, { color: c })}
              />
            ))}
            <input
              type="color" className="swatch-custom" value={current.color}
              onChange={(e) => onUpdateType(current.id, { color: e.target.value })}
            />
          </div>
        </div>
      )}

      {creating && (
        <div className="type-create">
          <input
            placeholder="Nom du nouveau type" value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="palette">
            {PRESET_PALETTE.map((c) => (
              <button
                key={c} type="button" className="swatch"
                style={{ background: c, outline: newColor === c ? "2px solid var(--ink)" : "none" }}
                onClick={() => setNewColor(c)}
              />
            ))}
            <input type="color" className="swatch-custom" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
          </div>
          <div className="type-create-actions">
            <button type="button" className="btn secondary small" onClick={() => setCreating(false)}>Annuler</button>
            <button type="button" className="btn small" onClick={submitNewType}>Créer</button>
          </div>
        </div>
      )}
    </div>
  );
}
