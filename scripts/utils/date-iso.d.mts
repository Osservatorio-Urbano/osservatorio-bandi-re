export interface IsoWeekInfo {
  year: number;
  weekNumber: number;
  id: string;
}

export interface DeliverySchedule {
  year: number;
  weekNumber: number;
  id: string;
  deliveryMonday: string;
  categories: string[];
}

export function getIsoWeek(date: Date): IsoWeekInfo;
export function getMondayOfIsoWeek(year: number, weekNumber: number): string;
export function getRomeCurrentDate(d?: Date): Date;
export function getDeliveryMondayForDate(romeDate: Date): string;
export function resolveDeliverySchedule(weekOverride?: string | null, customNow?: Date | null): DeliverySchedule;
export function formatItalianLongDate(dateStr: string): string;
