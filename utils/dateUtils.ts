
import DateObject from "react-date-object";

export const toPersianDigits = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num
    .toString()
    .replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
};

export const toJalali = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const getDaysRemaining = (dateString: string): number => {
  const target = new Date(dateString).getTime();
  const now = new Date().getTime();
  const diff = target - now;
  return Math.ceil(diff / (1000 * 3600 * 24));
};

export const isOverdue = (dateString: string): boolean => {
  const target = new Date(dateString);
  const now = new Date();
  return target < now; // Simple check, strict
};

export const isNearDeadline = (dateString: string): boolean => {
  const days = getDaysRemaining(dateString);
  return days >= 0 && days <= 3;
};

interface GoogleCalendarConfig {
    startDate: string; // ISO String or YYYY-MM-DD
    endDate?: string;  // ISO String
    startTime?: string; // HH:mm
    endTime?: string;   // HH:mm
    type: 'TASK' | 'EVENT' | 'PERSONAL';
}

export const openGoogleCalendar = (title: string, description: string, config: GoogleCalendarConfig) => {
    // Helper to format date for Google Calendar: YYYYMMDDTHHmmSSZ or YYYYMMDD
    const formatDate = (date: Date, includeTime: boolean) => {
        if (!includeTime) {
            // For All Day events, string must be YYYYMMDD without time components
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}${mm}${dd}`;
        }
        return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    let start = new Date(config.startDate);
    let end: Date;
    let isAllDay = false;
    let finalTitle = title;

    if (config.type === 'EVENT') {
        // Events are usually timed
        if (config.startTime) {
            const [h, m] = config.startTime.split(':').map(Number);
            start.setHours(h, m, 0, 0);
            
            if (config.endTime) {
                end = new Date(start);
                const [eh, em] = config.endTime.split(':').map(Number);
                end.setHours(eh, em, 0, 0);
            } else {
                end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1h
            }
        } else {
             // Event without time -> All Day
             isAllDay = true;
             end = new Date(start.getTime() + 86400000); // Next day for inclusive end
        }
    } else {
        // TASKS and PERSONAL TASKS
        // If a specific time is provided (e.g. personal task with time), treat as timed
        if (config.startTime) {
            finalTitle = config.type === 'TASK' ? `وظیفه: ${title}` : `شخصی: ${title}`;
            const [h, m] = config.startTime.split(':').map(Number);
            start.setHours(h, m, 0, 0);
            end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour block for task
        } else {
            // Otherwise, tasks are deadlines -> All Day Event
            isAllDay = true;
            finalTitle = config.type === 'TASK' ? `ددلاین: ${title}` : `وظیفه: ${title}`;
            // For all day, start and end are usually YYYYMMDD. 
            // End date is exclusive in GCal for all-day, so we add 1 day
            end = new Date(start.getTime() + 86400000);
        }
    }

    const datesValue = `${formatDate(start, !isAllDay)}/${formatDate(end, !isAllDay)}`;

    // Google Calendar URL Parameters
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: finalTitle,
        details: description,
        dates: datesValue,
    });

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
};

export const downloadICalendarFile = (filename: string, events: Array<{title: string, description?: string, start: Date, end?: Date}>) => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ParsTaskManager//NONSGML v1.0//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";

    const formatDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    events.forEach(event => {
        icsContent += "BEGIN:VEVENT\n";
        icsContent += `DTSTART:${formatDate(event.start)}\n`;
        // Default to 1 hour duration if no end time
        const endDate = event.end || new Date(event.start.getTime() + 60 * 60 * 1000);
        icsContent += `DTEND:${formatDate(endDate)}\n`;
        icsContent += `SUMMARY:${event.title}\n`;
        if (event.description) {
             // Escape newlines for iCal format
            const desc = event.description.replace(/\n/g, "\\n");
            icsContent += `DESCRIPTION:${desc}\n`;
        }
        icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
