
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

// لیست تعطیلات ثابت شمسی (ماه-روز)
const SOLAR_HOLIDAYS: Record<string, string> = {
  "01-01": "عید نوروز",
  "01-02": "عید نوروز",
  "01-03": "عید نوروز",
  "01-04": "عید نوروز",
  "01-12": "روز جمهوری اسلامی",
  "01-13": "روز طبیعت",
  "03-14": "رحلت امام خمینی",
  "03-15": "قیام ۱۵ خرداد",
  "11-22": "پیروزی انقلاب اسلامی",
  "12-29": "ملی شدن صنعت نفت",
};

export const getHoliday = (date: DateObject): string | null => {
  // تبدیل تاریخ به شمسی برای اطمینان
  const pDate = new DateObject(date).convert(persian, persian_fa);
  
  const month = pDate.month.number.toString().padStart(2, '0');
  const day = pDate.day.toString().padStart(2, '0');
  const key = `${month}-${day}`;

  return SOLAR_HOLIDAYS[key] || null;
};
