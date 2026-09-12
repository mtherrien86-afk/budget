import { useState } from "react";
import { WEEKDAYS_FULL } from "../utils/helpers";

export default function PlanTab({
  planItems, updatePlanItem, addPlanItem, deletePlanItem,
  generateYear, onOpenImport,
}) {
  const thisYear = new Date().getFullYear();
  const [targetYear, setTargetYear] = useState(thisYear);
  const years = [];
  for (let y = thisYear - 1; y <= thisYear + 5; y++) years.push(y);

  return (
    <div className="card">
      <div className="plan-row plan-head">
        <div>Description</div>
        <div>Montant</div>
        <div>Fréquence</div>
        <div>Détail</div>
        <div></div>
      </div>

      {planItems.length === 0 && (
        <p className="empty-hint">Aucun paiement planifié pour l'instant. Ajoutez-en un ci-dessous.</p>
      )}

      {planItems.map((p) => (
        <div className="plan-row" key={p.id}>
          <input value={p.label} onChange={(e) => updatePlanItem(p.id, { label: e.target.value })} />
          <input
            className="amount-input" type="number" step="0.01"
            value={p.amount}
            onChange={(e) => updatePlanItem(p.id, { amount: e.target.value })}
          />
          <select value={p.type} onChange={(e) => updatePlanItem(p.id, { type: e.target.value })}>
            <option value="weekly">À la semaine</option>
            <option value="monthly">Chaque mois</option>
            <option value="specific">Date précise</option>
          </select>

          {p.type === "weekly" && (
            <select value={p.weekday} onChange={(e) => updatePlanItem(p.id, { weekday: e.target.value })}>
              {WEEKDAYS_FULL.map((w, i) => <option key={i} value={i}>{w}</option>)}
            </select>
          )}
          {p.type === "monthly" && (
            <input
              type="number" min="1" max="31" title="Jour du mois"
              value={p.dayOfMonth}
              onChange={(e) => updatePlanItem(p.id, { dayOfMonth: e.target.value })}
            />
          )}
          {p.type === "specific" && (
            <input
              type="date"
              value={p.specificDate}
              onChange={(e) => updatePlanItem(p.id, { specificDate: e.target.value })}
            />
          )}

          <button className="btn danger small" onClick={() => deletePlanItem(p.id)}>Retirer</button>
        </div>
      ))}

      <button className="add-plan-btn" onClick={addPlanItem}>+ Ajouter un paiement planifié</button>

      <div className="year-bar">
        <select value={targetYear} onChange={(e) => setTargetYear(Number(e.target.value))}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="btn" onClick={() => generateYear(targetYear)} disabled={planItems.length === 0}>
          Créer l'année {targetYear}
        </button>
        <button className="btn secondary" onClick={onOpenImport}>
          Importer un fichier
        </button>
        <span className="year-hint">
          Génère une entrée par date de {targetYear}. Les entrées déjà créées ne sont pas dupliquées.
        </span>
      </div>
    </div>
  );
}
