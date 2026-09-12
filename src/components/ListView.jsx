import { useState, useMemo } from "react";
import { fmtMoney } from "../utils/helpers";

const FILTERS = [
  { id: "all", label: "Tout" },
  { id: "unpaid", label: "Non payé" },
  { id: "paid", label: "Payé" },
  { id: "unconfirmed", label: "Non confirmé" },
];

export default function ListView({
  entries, startingBalance, setStartingBalance,
  openEditor, updateEntry, archived,
}) {
  const [filter, setFilter] = useState("all");

  // Trié chronologiquement — ordre stable via l'id pour les entrées de même date.
  const sorted = useMemo(
    () => [...entries].sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? -1 : 1)),
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
            onClick={() => openEditor({ isNew: true, date: new Date().toISOString().slice(0, 10), label: "", amount: 0 })}
          >
            + Ajouter une entrée
          </button>
        )}
      </div>

      <div className="ledger-table-wrap">
        <table className="ledger-table">
          <thead>
            <tr>
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
              <tr><td colSpan={8} className="ledger-empty">Aucune entrée pour ce filtre.</td></tr>
            )}
            {visible.map((en) => (
              <tr
                key={en.id}
                className={en.paid ? "row-paid" : en.confirmed ? "row-confirmed" : ""}
                onClick={() => openEditor({ ...en, readOnly: archived })}
              >
                <td className="mono">{en.date}</td>
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
