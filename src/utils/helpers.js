export const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
export const WEEKDAYS_SHORT = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
export const WEEKDAYS_FULL = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

export function pad(n) { return String(n).padStart(2, "0"); }

export function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Détermine l'année d'une entrée : priorité au champ "year" explicite
// (nécessaire pour les entrées sans date), sinon déduit de la date, sinon
// l'année courante — pour qu'une entrée ne devienne jamais invisible/orpheline.
export function entryYear(en) {
  if (en.year !== undefined && en.year !== null && en.year !== "") return Number(en.year);
  if (en.date) return Number(String(en.date).slice(0, 4));
  return new Date().getFullYear();
}

// Choisit du texte blanc ou sombre selon la luminosité d'une couleur de fond,
// pour que le nom du type reste lisible peu importe la couleur choisie.
export function contrastColor(hex) {
  if (!hex) return "inherit";
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1A1A1A" : "#FFFFFF";
}

// Recule une date au vendredi précédent si elle tombe un samedi ou dimanche.
function adjustWeekend(d) {
  const adjusted = new Date(d);
  const day = adjusted.getDay(); // 0=dimanche, 6=samedi
  if (day === 6) adjusted.setDate(adjusted.getDate() - 1);
  else if (day === 0) adjusted.setDate(adjusted.getDate() - 2);
  return adjusted;
}

export function getYearDates(planItem, year) {
  const dates = [];
  if (planItem.type === "weekly") {
    const d = new Date(year, 0, 1);
    while (d.getFullYear() === year) {
      if (d.getDay() === Number(planItem.weekday)) dates.push(toDateStr(d));
      d.setDate(d.getDate() + 1);
    }
  } else if (planItem.type === "monthly") {
    const interval = Math.max(1, Number(planItem.intervalMonths) || 1);
    const startMonth = Math.min(11, Math.max(0, (Number(planItem.startMonth) || 1) - 1)); // 0-11
    const maxOcc = Number(planItem.occurrenceCount) || 0; // 0 = illimité (dans l'année générée)
    let occ = 0;
    for (let m = startMonth; m < 12; m += interval) {
      if (maxOcc > 0 && occ >= maxOcc) break;
      const lastDay = new Date(year, m + 1, 0).getDate();
      const day = Math.min(Number(planItem.dayOfMonth) || 1, lastDay);
      dates.push(toDateStr(new Date(year, m, day)));
      occ++;
    }
  } else if (planItem.type === "semimonthly") {
    // Le 15 et le dernier jour de chaque mois ; recule au vendredi si week-end.
    for (let m = 0; m < 12; m++) {
      dates.push(toDateStr(adjustWeekend(new Date(year, m, 15))));
      const lastDay = new Date(year, m + 1, 0).getDate();
      dates.push(toDateStr(adjustWeekend(new Date(year, m, lastDay))));
    }
  } else if (planItem.type === "specific") {
    // Mois + jour (pas d'année) : se répète chaque année générée.
    if (planItem.specificMonth && planItem.specificDay) {
      const lastDay = new Date(year, planItem.specificMonth, 0).getDate();
      const day = Math.min(Number(planItem.specificDay), lastDay);
      dates.push(toDateStr(new Date(year, planItem.specificMonth - 1, day)));
    } else if (planItem.specificDate) {
      // Compatibilité avec les anciens items créés avant ce changement.
      const [, m, d] = planItem.specificDate.split("-").map(Number);
      const lastDay = new Date(year, m, 0).getDate();
      dates.push(toDateStr(new Date(year, m - 1, Math.min(d, lastDay))));
    }
  }
  return dates;
}
