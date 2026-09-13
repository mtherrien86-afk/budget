import { useState, useMemo } from "react";
import { fmtMoney } from "../utils/helpers";

const FILTERS = [
  { id: "all", label: "Tout" },
  { id: "unpaid", label: "Non payé" },
  { id: "paid", label: "Payé" },
  { id: "unconfirmed", label: "Non confirmé" },
];

export default function ListView({
  year, entries, startingBalance, setStartingBalance,
  openEditor, updateEntry, archived,
}) {
  const [filter, setFilter] = useState("all");
  const [dragOverId, setDragOverId] = useState(null);

  // Trié chronologiquement, puis par ordre manuel (glisser-déposer / ordre du fichier importé).
  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        const ao = a.order ?? 0, bo = b.order ?? 0;
        if (ao !== bo) return ao - bo;
        return a.id.localeCompare(b.id);
      }),
    [entries]
  );

  // Solde prévisionnel : cumul de TOUTES les entrées, payées ou non, dans l'ordre chronologique.
  let running = startingBalance;
  const withBalance = sorted.map((en) => {
    running += Number(en.amount) || 0;
    return { ...en, balance: running };
  });

  const soldeReel = startingBalance + entries.filter((e) => e.paid).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const soldePrevisionnel = startingBalance + entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const visible = withBalance.filter((en) => {
    if (filter === "unpaid") return !en.paid;
    if (filter === "paid") return en.paid;
    if (filter === "unconfirmed") return !en.confirmed;
    return true;
  });

  const handleRowDrop = (targetId, e) => {
    e.preventDefault();
    setDragOverId(null);
    if (archived) return;
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) return;
    const target = sorted.find((en) => en.id === targetId);
    if (!target) return;

    // Place l'entrée déplacée juste avant la cible, dans le groupe de la date cible.
    const sameDate = sorted.filter((en) => en.date === target.date);
    const idx = sameDate.findIndex((en) => en.id === targetId);
    const prev = sameDate[idx - 1];
    const targetOrder = target.order ?? 0;
    const prevOrder = prev && prev.id !== draggedId ? (prev.order ?? 0) : targetOrder - 2;
    const newOrder = (prevOrder + targetOrder) / 2;

    updateEntry(draggedId, { date: target.date, order: newOrder });
  };

  return (
    <div>
      <div className="balance-bar">
        <div className="balance-field">
          <label>Solde de départ</label>
          <input
            type="number" step="0.01" disabled={archived}
            defaultValue={startingBalance}
            onBlur={(e) => setStartingBalance(e.target.value)}
          />
        </div>
        <div className="summary-stat">
          <div className="num mono">{fmtMoney(soldeReel)}</div>
          <div className="lbl">Solde réel (payé)</div>
        </div>
        <div className="summary-stat">
          <div className="num mono">{fmtMoney(soldePrevisionnel)}</div>
          <div className="lbl">Solde prévisionnel (fin d'année)</div>
        </div>
      </div>

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`filter-btn ${filter === f.id ? "active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        {!archived && (
          <button
            className="btn secondary small ledger-add"
            onClick={() => openEditor({ isNew: true, date: "", year, label: "", amount: 0 })}
          >
            + Ajouter une entrée
          </button>
        )}
      </div>

      <div className="ledger-table-wrap">
        <table className="ledger-table">
          <thead>
            <tr>
              <th></th>
              <th>Date</th>
              <th>Description</th>
              <th>No confirmation</th>
              <th>Note</th>
              <th className="num-col">Montant</th>
              <th>Confirmé</th>
              <th>Payé</th>
              <th className="num-col">Solde</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={9} className="ledger-empty">Aucune entrée pour ce filtre.</td></tr>
            )}
            {visible.map((en) => (
              <tr
                key={en.id}
                className={`${en.paid ? "row-paid" : en.confirmed ? "row-confirmed" : ""} ${dragOverId === en.id ? "row-drag-over" : ""}`}
                onClick={() => openEditor({ ...en, readOnly: archived })}
                draggable={!archived}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", en.id)}
                onDragOver={(e) => { if (!archived) { e.preventDefault(); setDragOverId(en.id); } }}
                onDragLeave={() => setDragOverId((prev) => (prev === en.id ? null : prev))}
                onDrop={(e) => handleRowDrop(en.id, e)}
              >
                <td className="drag-handle" title="Glisser pour réordonner">{archived ? "" : "⋮⋮"}</td>
                <td className="mono">{en.date || <span className="no-date">Sans date</span>}</td>
                <td>{en.label}</td>
                <td className="mono">{en.confirmationNumber || ""}</td>
                <td className="ledger-note">{en.note || ""}</td>
                <td className={`num-col mono ${Number(en.amount) < 0 ? "neg" : "pos"}`}>{fmtMoney(en.amount)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox" disabled={archived}
                    checked={!!en.confirmed}
                    onChange={(e) => updateEntry(en.id, { confirmed: e.target.checked })}
                  />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox" disabled={archived}
                    checked={!!en.paid}
                    onChange={(e) => updateEntry(en.id, { paid: e.target.checked })}
                  />
                </td>
                <td className="num-col mono">{fmtMoney(en.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
