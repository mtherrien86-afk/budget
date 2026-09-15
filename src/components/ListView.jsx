import { useState, useMemo } from "react";
import { fmtMoney, MONTHS, contrastColor } from "../utils/helpers";

const FILTERS = [
  { id: "all", label: "Tout" },
  { id: "unpaid", label: "Non payé" },
  { id: "paid", label: "Payé" },
  { id: "unconfirmed", label: "Non confirmé" },
];

export default function ListView({
  year, entries, startingBalance, setStartingBalance,
  openEditor, updateEntry, archived, types, onRecalcStartingBalance,
}) {
  const [filter, setFilter] = useState("all");
  const [dragOverId, setDragOverId] = useState(null);
  const [collapsed, setCollapsed] = useState({});

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

  const unpaidBalances = withBalance.filter((en) => !en.paid).map((en) => en.balance);
  const minBalance = unpaidBalances.length ? Math.min(...unpaidBalances) : null;
  const maxBalance = unpaidBalances.length ? Math.max(...unpaidBalances) : null;

  const visible = withBalance.filter((en) => {
    if (filter === "unpaid") return !en.paid;
    if (filter === "paid") return en.paid;
    if (filter === "unconfirmed") return !en.confirmed;
    return true;
  });

  // Regroupe par mois (les entrées sans date forment un groupe à part, en premier).
  const groups = {};
  visible.forEach((en) => {
    const key = en.date ? en.date.slice(0, 7) : "0000-00";
    if (!groups[key]) groups[key] = [];
    groups[key].push(en);
  });
  const groupKeys = Object.keys(groups).sort();

  const monthLabel = (key) => {
    if (key === "0000-00") return "Sans date";
    const [y, m] = key.split("-");
    return `${MONTHS[Number(m) - 1]} ${y}`;
  };

  const toggleMonth = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleRowDrop = (targetId, e) => {
    e.preventDefault();
    setDragOverId(null);
    if (archived) return;
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) return;
    const target = sorted.find((en) => en.id === targetId);
    if (!target) return;

    const sameDate = sorted.filter((en) => en.date === target.date);
    const idx = sameDate.findIndex((en) => en.id === targetId);
    const prev = sameDate[idx - 1];
    const targetOrder = target.order ?? 0;
    const prevOrder = prev && prev.id !== draggedId ? (prev.order ?? 0) : targetOrder - 2;
    const newOrder = (prevOrder + targetOrder) / 2;

    updateEntry(draggedId, { date: target.date, order: newOrder });
  };

  const rowClass = (en) => {
    if (en.paid) return "row-paid";
    if (en.balance < 0) return "row-danger";
    if (en.balance < 1000) return "row-warning";
    return "";
  };

  return (
    <div>
      <div className="balance-bar">
        <div className="balance-field">
          <label>Solde de départ</label>
          <div className="balance-field-row">
            <input
              type="number" step="0.01" disabled={archived}
              defaultValue={startingBalance}
              onBlur={(e) => setStartingBalance(e.target.value)}
            />
            {!archived && onRecalcStartingBalance && (
              <button
                type="button" className="btn secondary small" title="Recalculer depuis l'année précédente"
                onClick={onRecalcStartingBalance}
              >
                ↻
              </button>
            )}
          </div>
        </div>
        <div className="summary-stat">
          <div className="num mono">{fmtMoney(soldeReel)}</div>
          <div className="lbl">Solde réel (payé)</div>
        </div>
        <div className="summary-stat">
          <div className="num mono">{fmtMoney(soldePrevisionnel)}</div>
          <div className="lbl">Solde prévisionnel (fin d'année)</div>
        </div>
        {minBalance !== null && (
          <div className="summary-stat">
            <div className="num mono" style={{ color: minBalance < 0 ? "var(--red)" : "inherit" }}>{fmtMoney(minBalance)}</div>
            <div className="lbl">Plus bas solde (non payé)</div>
          </div>
        )}
        {maxBalance !== null && (
          <div className="summary-stat">
            <div className="num mono">{fmtMoney(maxBalance)}</div>
            <div className="lbl">Plus haut solde (non payé)</div>
          </div>
        )}
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
            onClick={() => openEditor({ date: "", year, label: "", amount: 0 })}
          >
            + Ajouter une entrée
          </button>
        )}
      </div>

      {groupKeys.length === 0 && (
        <p className="empty-hint">Aucune entrée pour ce filtre.</p>
      )}

      {groupKeys.map((key) => {
        const rows = groups[key];
        const monthTotal = rows.reduce((s, en) => s + (Number(en.amount) || 0), 0);
        const isCollapsed = !!collapsed[key];
        return (
          <div className="ledger-month" key={key}>
            <button className="ledger-month-header" onClick={() => toggleMonth(key)}>
              <span className="ledger-month-title">
                <span className="chevron">{isCollapsed ? "▸" : "▾"}</span>
                <span className="serif">{monthLabel(key)}</span>
                <span className="ledger-month-count">{rows.length} entrée{rows.length > 1 ? "s" : ""}</span>
              </span>
              <span className="mono">{fmtMoney(monthTotal)}</span>
            </button>

            {!isCollapsed && (
              <div className="ledger-table-wrap">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>No confirmation</th>
                      <th>Note</th>
                      <th className="num-col">Montant</th>
                      <th>Confirmé</th>
                      <th>Payé</th>
                      <th className="num-col">Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((en) => {
                      const type = types.find((t) => t.id === en.typeId);
                      return (
                        <tr
                          key={en.id}
                          className={`${rowClass(en)} ${dragOverId === en.id ? "row-drag-over" : ""}`}
                          onClick={() => openEditor({ ...en, readOnly: archived })}
                          draggable={!archived}
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", en.id)}
                          onDragOver={(e) => { if (!archived) { e.preventDefault(); setDragOverId(en.id); } }}
                          onDragLeave={() => setDragOverId((prev) => (prev === en.id ? null : prev))}
                          onDrop={(e) => handleRowDrop(en.id, e)}
                        >
                          <td className="row-handle-cell">
                            <span className="drag-handle" title="Glisser pour réordonner">{archived ? "" : "⋮⋮"}</span>
                            {!archived && (
                              <button
                                type="button" className="row-add-btn" title="Ajouter une entrée à cette date"
                                onClick={(e) => { e.stopPropagation(); openEditor({ date: en.date, year, label: "", amount: 0 }); }}
                              >
                                +
                              </button>
                            )}
                          </td>
                          <td className="mono">{en.date || <span className="no-date">Sans date</span>}</td>
                          <td>
                            {type ? (
                              <span
                                className="type-pill"
                                style={{ background: type.color, color: contrastColor(type.color) }}
                              >
                                {type.name}
                              </span>
                            ) : (
                              <span className="ledger-note">{en.label || "—"}</span>
                            )}
                          </td>
                          <td className="mono">{en.confirmationNumber || ""}</td>
                          <td className="ledger-note">{en.note || ""}</td>
                          <td className={`num-col mono ${en.confirmed ? "amount-confirmed" : Number(en.amount) < 0 ? "neg" : "pos"}`}>
                            {fmtMoney(en.amount)}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
