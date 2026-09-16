import { useState } from "react";
import { WEEKDAYS_FULL, MONTHS } from "../utils/helpers";

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
            <option value="semimonthly">Le 15 et le dernier jour du mois</option>
            <option value="specific">Date précise (mois + jour)</option>
          </select>

          {p.type === "weekly" && (
            <select value={p.weekday} onChange={(e) => updatePlanItem(p.id, { weekday: e.target.value })}>
              {WEEKDAYS_FULL.map((w, i) => <option key={i} value={i}>{w}</option>)}
            </select>
          )}

          {p.type === "monthly" && (
            <div className="plan-detail-group">
              <input
                type="number" min="1" max="31" title="Jour du mois"
                value={p.dayOfMonth}
                onChange={(e) => updatePlanItem(p.id, { dayOfMonth: e.target.value })}
              />
              <span className="plan-detail-label">tous les</span>
              <input
                type="number" min="1" max="12" title="Tous les combien de mois"
                value={p.intervalMonths || 1}
                onChange={(e) => updatePlanItem(p.id, { intervalMonths: e.target.value })}
              />
              <span className="plan-detail-label">mois, à partir de</span>
              <select
                value={p.startMonth ?? 0}
                onChange={(e) => updatePlanItem(p.id, { startMonth: Number(e.target.value) })}
              >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <input
                type="number" min="2000" max="2100" title="Année de départ"
                value={p.startYear ?? thisYear}
                onChange={(e) => updatePlanItem(p.id, { startYear: e.target.value })}
              />
              <span className="plan-detail-label">pour</span>
              <input
                type="number" min="0" title="Nombre de fois (0 = illimité)"
                value={p.occurrenceCount ?? 0}
                onChange={(e) => updatePlanItem(p.id, { occurrenceCount: e.target.value })}
              />
              <span className="plan-detail-label">fois (0 = illimité)</span>
            </div>
          )}

          {p.type === "semimonthly" && (
            <span className="plan-detail-label">15 et dernier jour (vendredi si week-end)</span>
          )}

          {p.type === "specific" && (
            <div className="plan-detail-group">
              <select
                value={p.specificMonth || 1}
                onChange={(e) => updatePlanItem(p.id, { specificMonth: Number(e.target.value) })}
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <input
                type="number" min="1" max="31" title="Jour"
                value={p.specificDay || 1}
                onChange={(e) => updatePlanItem(p.id, { specificDay: Number(e.target.value) })}
              />
            </div>
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
