import { useState, useEffect } from "react";
import TypeSelect from "./TypeSelect";

export default function EntryEditor({ entry, onClose, onSave, onDelete, types, onCreateType, onUpdateType }) {
  const [local, setLocal] = useState(entry);
  useEffect(() => setLocal(entry), [entry]);

  // Une entrée est "nouvelle" si et seulement si elle n'a pas encore d'id
  // Firestore — jamais basé sur un champ stocké (source du bug précédent).
  const isNew = !entry.id;
  const readOnly = !!entry.readOnly;
  const set = (patch) => setLocal((prev) => ({ ...prev, ...patch }));

  return (
    <>
      <div className="editor-overlay" onClick={onClose} />
      <div className="editor-panel">
        <h3>
          {isNew ? "Nouvelle entrée" : readOnly ? "Entrée (archivée)" : "Modifier l'entrée"}
        </h3>

        <div className="field">
          <label>Type</label>
          <TypeSelect
            types={types}
            value={local.typeId}
            onChange={(id) => set({ typeId: id })}
            onCreateType={onCreateType}
            onUpdateType={onUpdateType}
            disabled={readOnly}
          />
        </div>

        <div className="field">
          <label>Date</label>
          <input
            type="date" disabled={readOnly}
            value={local.date} onChange={(e) => set({ date: e.target.value })}
          />
        </div>

        <div className="field amount">
          <label>Montant</label>
          <input
            type="number" step="0.01"
            value={local.amount}
            disabled={readOnly || local.confirmed}
            onChange={(e) => set({ amount: e.target.value })}
          />
        </div>

        <div className="checkline">
          <input
            type="checkbox" id="confirmed" disabled={readOnly}
            checked={!!local.confirmed}
            onChange={(e) => set({ confirmed: e.target.checked })}
          />
          <label htmlFor="confirmed">Montant confirmé (verrouille le montant)</label>
        </div>
        <div className="checkline">
          <input
            type="checkbox" id="paid" disabled={readOnly}
            checked={!!local.paid}
            onChange={(e) => set({ paid: e.target.checked })}
          />
          <label htmlFor="paid">Payé / reçu</label>
        </div>
        <div className="field">
          <label>Numéro de confirmation</label>
          <input
            disabled={readOnly}
            value={local.confirmationNumber || ""}
            onChange={(e) => set({ confirmationNumber: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Note</label>
          <textarea
            rows={3} disabled={readOnly}
            value={local.note || ""} onChange={(e) => set({ note: e.target.value })}
          />
        </div>

        <div className="editor-actions">
          {!isNew && !readOnly ? (
            <button className="btn danger small" onClick={onDelete}>Supprimer</button>
          ) : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn secondary small" onClick={onClose}>{readOnly ? "Fermer" : "Annuler"}</button>
            {!readOnly && <button className="btn small" onClick={() => onSave(local)}>Enregistrer</button>}
          </div>
        </div>
      </div>
    </>
  );
}
