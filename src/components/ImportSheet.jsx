import { useState } from "react";
import * as XLSX from "xlsx";

const FIELD_ALIASES = {
  date: ["date"],
  amount: ["montant", "coût", "cout", "amount", "somme"],
  label: ["description", "libellé", "libelle", "nom"],
  confirmed: ["confirmé", "confirme"],
  paid: ["payé", "paye", "paid"],
  confirmationNumber: ["confirmation", "no confirmation", "numéro de confirmation", "numero de confirmation"],
  note: ["note", "commentaire", "information", "supplémentaire"],
};

const FIELD_LABELS = {
  date: "Date", amount: "Montant", label: "Description", confirmed: "Confirmé",
  paid: "Payé", confirmationNumber: "No confirmation", note: "Note",
};

function guessField(header) {
  const h = String(header || "").trim().toLowerCase();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => h.includes(a))) return field;
  }
  return null;
}

function toBool(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return ["oui", "yes", "true", "1", "x", "vrai"].includes(s);
}

function excelDateToStr(v) {
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v ?? "").trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return "";
}

export default function ImportSheet({ onImport, onClose }) {
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [fileName, setFileName] = useState("");
  const [yearOverride, setYearOverride] = useState("");

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
      if (data.length < 2) { setHeaders([]); setRows([]); return; }
      const hdrs = data[0];
      const body = data.slice(1).filter((r) => r.some((c) => c !== undefined && c !== ""));
      const guessed = {};
      hdrs.forEach((h, i) => {
        const f = guessField(h);
        if (f && guessed[f] === undefined) guessed[f] = i;
      });
      setHeaders(hdrs);
      setMapping(guessed);
      setRows(body);
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = () => {
    if (mapping.date === undefined || mapping.amount === undefined) {
      alert("Associe au moins une colonne Date et une colonne Montant avant d'importer.");
      return;
    }
    let lastRawDate; // pour les dates "fusionnées" : une cellule vide reprend la date de la ligne précédente
    const toImport = rows
      .map((r, index) => {
        let rawDate = r[mapping.date];
        if (rawDate === undefined || rawDate === null || rawDate === "") rawDate = lastRawDate;
        else lastRawDate = rawDate;

        let date = excelDateToStr(rawDate);
        if (date && yearOverride) date = `${yearOverride}${date.slice(4)}`;

        const entry = {
          date,
          order: index, // préserve l'ordre exact des lignes du fichier
          amount: Number(r[mapping.amount]) || 0,
          label: mapping.label !== undefined ? String(r[mapping.label] ?? "") : "Importé",
        };
        if (mapping.note !== undefined) entry.note = String(r[mapping.note] ?? "");
        if (mapping.confirmationNumber !== undefined) {
          entry.confirmationNumber = String(r[mapping.confirmationNumber] ?? "");
        }
        if (mapping.paid !== undefined) entry.paid = toBool(r[mapping.paid]);
        if (mapping.confirmed !== undefined) entry.confirmed = toBool(r[mapping.confirmed]);
        return entry;
      })
      .filter((e) => e.date);
    onImport(toImport);
  };

  const thisYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = thisYear - 3; y <= thisYear + 3; y++) yearOptions.push(y);

  return (
    <div className="editor-overlay" onClick={onClose}>
      <div className="import-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="serif">Importer un fichier</h3>
        <p className="import-hint">Exporte ta feuille Google Sheet ou Excel en CSV/XLSX, puis choisis-la ici.</p>

        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
        {fileName && <p className="import-file">{fileName} — {rows.length} ligne(s) détectée(s)</p>}

        {headers.length > 0 && (
          <>
            <div className="import-mapping">
              {Object.keys(FIELD_LABELS).map((field) => (
                <div className="field" key={field}>
                  <label>{FIELD_LABELS[field]}{(field === "date" || field === "amount") && " *"}</label>
                  <select
                    value={mapping[field] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [field]: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                  >
                    <option value="">— Ignorer —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{String(h)}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="field" style={{ marginTop: 6 }}>
              <label>Forcer l'année (optionnel — garde le mois/jour, change juste l'année)</label>
              <select value={yearOverride} onChange={(e) => setYearOverride(e.target.value)}>
                <option value="">— Garder les dates du fichier —</option>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        )}

        <div className="editor-actions">
          <button className="btn secondary small" onClick={onClose}>Annuler</button>
          <button className="btn small" disabled={rows.length === 0} onClick={confirmImport}>
            Importer {rows.length > 0 ? `(${rows.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
