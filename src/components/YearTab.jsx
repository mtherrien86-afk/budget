import { useState } from "react";
import { MONTHS, WEEKDAYS_SHORT, pad, fmtMoney } from "../utils/helpers";
import ListView from "./ListView";

export default function YearTab({
  year, entries, openEditor, updateEntry,
  archived, onArchiveToggle, startingBalance, setStartingBalance,
}) {
  const [view, setView] = useState("list");

  return (
    <div>
      <div className="year-toolbar">
        <div className="view-switch">
          <button className={`view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>Liste</button>
          <button className={`view-btn ${view === "calendar" ? "active" : ""}`} onClick={() => setView("calendar")}>Calendrier</button>
        </div>
        <div className="year-toolbar-right">
          {archived && <span className="badge-archived">Archivée</span>}
          <button className="btn secondary small" onClick={onArchiveToggle}>
            {archived ? "Désarchiver cette année" : "Archiver cette année"}
          </button>
        </div>
      </div>

      {view === "list" ? (
        <ListView
          entries={entries}
          startingBalance={startingBalance}
          setStartingBalance={setStartingBalance}
          openEditor={openEditor}
          updateEntry={updateEntry}
          archived={archived}
        />
      ) : (
        <CalendarView
          year={year}
          entries={entries}
          openEditor={openEditor}
          updateEntry={updateEntry}
          archived={archived}
        />
      )}
    </div>
  );
}

function CalendarView({ year, entries, openEditor, updateEntry, archived }) {
  const [dragOverCell, setDragOverCell] = useState(null);

  const entriesByDate = {};
  entries.forEach((en) => {
    if (!entriesByDate[en.date]) entriesByDate[en.date] = [];
    entriesByDate[en.date].push(en);
  });

  const totalPlanned = entries.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalPaid = entries.filter((e) => e.paid).reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalConfirmed = entries.filter((e) => e.confirmed).length;

  const handleDrop = (dateStr, e) => {
    e.preventDefault();
    if (archived) return;
    const id = e.dataTransfer.getData("text/plain");
    if (id) updateEntry(id, { date: dateStr });
    setDragOverCell(null);
  };

  return (
    <div>
      <div className="summary-bar">
        <div className="summary-stat">
          <div className="num mono">{fmtMoney(totalPlanned)}</div>
          <div className="lbl">Total planifié</div>
        </div>
        <div className="summary-stat">
          <div className="num mono" style={{ color: "var(--green)" }}>{fmtMoney(totalPaid)}</div>
          <div className="lbl">Reçu / payé</div>
        </div>
        <div className="summary-stat">
          <div className="num mono">{entries.length}</div>
          <div className="lbl">Entrées</div>
        </div>
        <div className="summary-stat">
          <div className="num mono">{totalConfirmed}</div>
          <div className="lbl">Montants confirmés</div>
        </div>
      </div>

      {entries.length === 0 && (
        <p className="empty-hint">Aucune entrée pour {year}. Retournez dans Planification pour en créer.</p>
      )}

      {MONTHS.map((mName, mIdx) => {
        const firstDay = new Date(year, mIdx, 1);
        const offset = (firstDay.getDay() + 6) % 7;
        const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < offset; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);

        const monthTotal = Object.keys(entriesByDate)
          .filter((d) => d.startsWith(`${year}-${pad(mIdx + 1)}`))
          .reduce((s, d) => s + entriesByDate[d].reduce((s2, e) => s2 + Number(e.amount || 0), 0), 0);

        return (
          <div className="month-block" key={mIdx}>
            <div className="month-title">
              <span className="serif">{mName}</span>
              <span className="mono">{fmtMoney(monthTotal)}</span>
            </div>
            <div className="day-grid">
              {WEEKDAYS_SHORT.map((w) => <div className="day-head" key={w}>{w}</div>)}
              {cells.map((d, i) => {
                if (d === null) return <div className="day-cell empty" key={i} />;
                const dateStr = `${year}-${pad(mIdx + 1)}-${pad(d)}`;
                const dayEntries = entriesByDate[dateStr] || [];
                const isOver = dragOverCell === dateStr;
                return (
                  <div
                    key={i}
                    className={`day-cell ${isOver ? "drag-over" : ""}`}
                    onDragOver={(e) => { if (!archived) { e.preventDefault(); setDragOverCell(dateStr); } }}
                    onDragLeave={() => setDragOverCell((prev) => (prev === dateStr ? null : prev))}
                    onDrop={(e) => handleDrop(dateStr, e)}
                  >
                    <span className="day-num">{d}</span>
                    {!archived && (
                      <button
                        className="day-add" title="Ajouter une entrée"
                        onClick={() => openEditor({ isNew: true, date: dateStr, label: "", amount: 0 })}
                      >
                        +
                      </button>
                    )}
                    {dayEntries.map((en) => (
                      <div
                        key={en.id}
                        className={`chip ${en.paid ? "paid" : en.confirmed ? "confirmed" : "pending"}`}
                        draggable={!archived}
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", en.id)}
                        onClick={() => openEditor({ ...en, readOnly: archived })}
                        title={`${en.label} — ${fmtMoney(en.amount)}`}
                      >
                        {fmtMoney(en.amount)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
