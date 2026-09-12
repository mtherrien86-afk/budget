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

export function getYearDates(planItem, year) {
  const dates = [];
  if (planItem.type === "weekly") {
    const d = new Date(year, 0, 1);
    while (d.getFullYear() === year) {
      if (d.getDay() === Number(planItem.weekday)) dates.push(toDateStr(d));
      d.setDate(d.getDate() + 1);
    }
  } else if (planItem.type === "monthly") {
    for (let m = 0; m < 12; m++) {
      const lastDay = new Date(year, m + 1, 0).getDate();
      const day = Math.min(Number(planItem.dayOfMonth) || 1, lastDay);
      dates.push(toDateStr(new Date(year, m, day)));
    }
  } else if (planItem.type === "specific") {
    if (planItem.specificDate && planItem.specificDate.startsWith(String(year))) {
      dates.push(planItem.specificDate);
    }
  }
  return dates;
}
