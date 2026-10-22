/**
 * Modulo di calcolo temporale e date di consegna per RE Funding Intelligence.
 * Conforme allo standard ISO 8601 e al fuso orario Europe/Rome.
 */

/**
 * Calcola anno, numero di settimana e ID ISO 8601 (es. '2026-W44') per una data.
 * @param {Date} date
 * @returns {{ year: number, weekNumber: number, id: string }}
 */
export function getIsoWeek(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNr);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return {
    year: target.getUTCFullYear(),
    weekNumber: weekNo,
    id: `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
  };
}

/**
 * Calcola la data esatta (YYYY-MM-DD) del lunedì corrispondente a un dato anno e settimana ISO 8601.
 * Il 4 gennaio appartiene sempre per definizione alla settimana 1 ISO.
 * @param {number} year
 * @param {number} weekNumber
 * @returns {string} data formato YYYY-MM-DD
 */
export function getMondayOfIsoWeek(year, weekNumber) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7; // 1 (Mon) a 7 (Sun)
  const mondayW1 = new Date(jan4.getTime() - (day - 1) * 86400000);
  const targetMonday = new Date(mondayW1.getTime() + (weekNumber - 1) * 7 * 86400000);
  return targetMonday.toISOString().split('T')[0];
}

/**
 * Restituisce la data corrente a inizio giornata UTC calcolata nel fuso Europe/Rome.
 * @param {Date} [d=new Date()]
 * @returns {Date}
 */
export function getRomeCurrentDate(d = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, m, day] = formatter.format(d).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

/**
 * Calcola la data (YYYY-MM-DD) del lunedì previsto per l'invio.
 * Se la data passata è già lunedì, restituisce la data stessa.
 * Altrimenti restituisce il lunedì successivo più prossimo.
 * @param {Date} romeDate
 * @returns {string} data formato YYYY-MM-DD
 */
export function getDeliveryMondayForDate(romeDate) {
  const day = romeDate.getUTCDay(); // 0 (Sun), 1 (Mon), ..., 6 (Sat)
  const diffToMonday = day === 1 ? 0 : ((1 - day + 7) % 7);
  const monday = new Date(romeDate.getTime() + diffToMonday * 86400000);
  return monday.toISOString().split('T')[0];
}

/**
 * Risolve la schedulazione completa della newsletter.
 * Restituisce anno, numero settimana, ID ISO, data lunedì di consegna e categorie RSS standard.
 * @param {string|null} [weekOverride=null] es. '2026-W44'
 * @param {Date|null} [customNow=null]
 * @returns {{ year: number, weekNumber: number, id: string, deliveryMonday: string, categories: string[] }}
 */
export function resolveDeliverySchedule(weekOverride = null, customNow = null) {
  if (weekOverride && /^\d{4}-W\d{2}$/.test(weekOverride)) {
    const [yStr, wStr] = weekOverride.split('-W');
    const year = Number(yStr);
    const weekNumber = Number(wStr);
    const deliveryMonday = getMondayOfIsoWeek(year, weekNumber);
    return {
      year,
      weekNumber,
      id: weekOverride,
      deliveryMonday,
      categories: ['READY_LATEST', `DELIVERY_${deliveryMonday}`],
    };
  }

  const nowRome = getRomeCurrentDate(customNow || new Date());
  const deliveryMonday = getDeliveryMondayForDate(nowRome);
  const [y, m, d] = deliveryMonday.split('-').map(Number);
  const mondayDate = new Date(Date.UTC(y, m - 1, d));
  const weekInfo = getIsoWeek(mondayDate);

  return {
    year: weekInfo.year,
    weekNumber: weekInfo.weekNumber,
    id: weekInfo.id,
    deliveryMonday,
    categories: ['READY_LATEST', `DELIVERY_${deliveryMonday}`],
  };
}

/**
 * Formatta una data YYYY-MM-DD in data estesa italiana (es. '2026-10-26' -> '26 ottobre 2026').
 * @param {string} dateStr
 * @returns {string}
 */
export function formatItalianLongDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '';
  const months = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
  ];
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}
