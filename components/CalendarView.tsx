
import React, { useState, useMemo } from 'react';
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { ChevronRight, ChevronLeft, Plus, Calendar as CalendarIcon, X, Clock, CheckCircle2, AlertCircle, ListTodo, Users, Layers, Share2, Download } from 'lucide-react';
import { Task, TaskStatus, TaskPriority, CalendarEvent, PersonalTask } from '../types';
import { toPersianDigits, toJalali, openGoogleCalendar, downloadICalendarFile } from '../utils/dateUtils';
import { getHoliday } from '../utils/holidays';
import Swal from 'sweetalert2';

interface CalendarViewProps {
  tasks: Task[];
  events?: CalendarEvent[];
  personalTasks?: PersonalTask[];
  isAdmin: boolean;
  onAddEvent: (date: Date, type: 'TASK' | 'EVENT') => void;
  onTaskClick: (task: Task) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onPersonalTaskClick?: (task: PersonalTask) => void;
}

const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه شنبه', 'چهارشنبه', 'پنج شنبه', 'جمعه'];

const DayDetailsModal = ({ 
    date, 
    tasks, 
    events, 
    personalTasks,
    onClose, 
    onTaskClick, 
    onEventClick,
    onPersonalTaskClick, 
    onAdd,
    isAdmin 
}: any) => {

    const handleShare = (e: React.MouseEvent, type: 'TASK' | 'EVENT' | 'PERSONAL', item: any) => {
        e.stopPropagation();
        if (type === 'TASK') {
            const t = item as Task;
            // Tasks share as All-Day logic (handled by utility when no time provided)
            openGoogleCalendar(t.title, t.description, {
                startDate: t.dueDate,
                type: 'TASK'
            });
        } else if (type === 'EVENT') {
            const ev = item as CalendarEvent;
            openGoogleCalendar(ev.title, ev.description, {
                startDate: ev.date,
                startTime: ev.time,
                endTime: ev.endTime,
                type: 'EVENT'
            });
        } else if (type === 'PERSONAL') {
             const pt = item as PersonalTask;
             if(pt.dueDate) {
                 openGoogleCalendar(pt.title, pt.description || '', {
                     startDate: pt.dueDate,
                     startTime: pt.time,
                     type: 'PERSONAL'
                 });
             } else {
                 Swal.fire({
                    title: 'بدون تاریخ',
                    text: 'برای اشتراک‌گذاری در تقویم، وظیفه باید تاریخ داشته باشد.',
                    icon: 'info',
                    confirmButtonText: 'باشه'
                 });
             }
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95">
                <div className="p-4 bg-primary text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{toPersianDigits(date.day)}</span>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium opacity-90">{date.month.name}</span>
                            <span className="text-xs opacity-75">{date.year}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button onClick={() => onAdd(date.toDate())} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="افزودن">
                                <Plus size={20} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Events Section */}
                    {events.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">رویدادها</h4>
                            <div className="space-y-2">
                                {events.map((event: CalendarEvent) => (
                                    <div 
                                        key={event.id}
                                        onClick={() => onEventClick(event)}
                                        className="flex items-start gap-3 p-3 rounded-xl bg-purple-50 border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors group relative"
                                    >
                                        <div className="mt-1 min-w-[4px] h-8 bg-purple-500 rounded-full"></div>
                                        <div className="flex-1 min-w-0">
                                            <h5 className="font-bold text-gray-800 text-sm truncate">{event.title}</h5>
                                            <div className="flex items-center gap-2 text-xs text-purple-600 mt-1">
                                                <Clock size={12} />
                                                <span className="font-medium dir-ltr">
                                                    {toPersianDigits(event.time)} 
                                                    {event.endTime ? ` تا ${toPersianDigits(event.endTime)}` : ''}
                                                </span>
                                            </div>
                                            {event.description && (
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{event.description}</p>
                                            )}
                                        </div>
                                        <button 
                                            onClick={(e) => handleShare(e, 'EVENT', event)}
                                            className="absolute left-2 top-2 p-1.5 text-purple-300 hover:text-purple-600 bg-white/50 rounded-lg transition-all"
                                            title="افزودن به تقویم گوگل"
                                        >
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tasks Section */}
                    {tasks.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">وظایف تیمی</h4>
                            <div className="space-y-2">
                                {tasks.map((task: Task) => (
                                    <div 
                                        key={task.id}
                                        onClick={() => onTaskClick(task)}
                                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm group relative ${
                                            task.status === TaskStatus.COMPLETED ? 'bg-emerald-50 border-emerald-100' :
                                            task.status === TaskStatus.OVERDUE ? 'bg-red-50 border-red-100' :
                                            'bg-white border-gray-200 hover:border-primary/50'
                                        }`}
                                    >
                                        <div className="mt-1">
                                            {task.status === TaskStatus.COMPLETED ? (
                                                <CheckCircle2 size={18} className="text-emerald-500" />
                                            ) : task.status === TaskStatus.OVERDUE ? (
                                                <AlertCircle size={18} className="text-red-500" />
                                            ) : (
                                                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 ${
                                                    task.priority === TaskPriority.URGENT ? 'border-red-400' :
                                                    task.priority === TaskPriority.HIGH ? 'border-orange-400' : 'border-blue-400'
                                                }`}></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h5 className={`font-bold text-sm truncate ${task.status === TaskStatus.COMPLETED ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                                    {task.title}
                                                </h5>
                                                {task.priority === TaskPriority.URGENT && task.status !== TaskStatus.COMPLETED && (
                                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">فوری</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => handleShare(e, 'TASK', task)}
                                            className="absolute left-2 top-2 p-1.5 text-gray-300 hover:text-blue-500 bg-white/50 rounded-lg transition-all"
                                            title="افزودن به تقویم گوگل"
                                        >
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Personal Tasks Section */}
                    {personalTasks.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">وظایف شخصی</h4>
                            <div className="space-y-2">
                                {personalTasks.map((pt: PersonalTask) => (
                                    <div 
                                        key={pt.id}
                                        onClick={() => onPersonalTaskClick(pt)}
                                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm group relative ${
                                            pt.isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-indigo-50 border-indigo-100 hover:border-indigo-300'
                                        }`}
                                    >
                                        <div className="mt-1 text-indigo-500">
                                            <ListTodo size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h5 className={`font-bold text-sm truncate ${pt.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                                    {pt.title}
                                                </h5>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                {pt.time && (
                                                    <span className="bg-indigo-100 text-indigo-700 px-1.5 rounded dir-ltr">{toPersianDigits(pt.time)}</span>
                                                )}
                                                {pt.description && (
                                                    <span className="truncate max-w-[150px]">{pt.description}</span>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => handleShare(e, 'PERSONAL', pt)}
                                            className="absolute left-2 top-2 p-1.5 text-indigo-300 hover:text-indigo-600 bg-white/50 rounded-lg transition-all"
                                            title="افزودن به تقویم گوگل"
                                        >
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {events.length === 0 && tasks.length === 0 && personalTasks.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <p>هیچ موردی برای این روز ثبت نشده است.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, events = [], personalTasks = [], isAdmin, onAddEvent, onTaskClick, onEventClick, onPersonalTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new DateObject({ calendar: persian, locale: persian_fa }));
  const [selectedDayDetails, setSelectedDayDetails] = useState<{ date: DateObject, tasks: Task[], events: CalendarEvent[], personalTasks: PersonalTask[] } | null>(null);
  const [viewFilter, setViewFilter] = useState<'ALL' | 'TEAM' | 'PERSONAL'>('ALL');

  const days = useMemo(() => {
    const startOfMonth = new DateObject(currentDate).toFirstOfMonth();
    const endOfMonth = new DateObject(currentDate).toLastOfMonth();
    
    const startDayIndex = startOfMonth.weekDay.index;
    
    const grid: DateObject[] = [];
    
    for (let i = 0; i < startDayIndex; i++) {
       grid.push(new DateObject(startOfMonth).subtract(startDayIndex - i, "days"));
    }
    
    for (let i = 1; i <= endOfMonth.day; i++) {
       grid.push(new DateObject(startOfMonth).setDay(i));
    }
    
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
       grid.push(new DateObject(endOfMonth).add(i, "days"));
    }
    
    return grid;
  }, [currentDate.month, currentDate.year]);

  const handlePrevMonth = () => {
    setCurrentDate(new DateObject(currentDate).subtract(1, "month"));
  };

  const handleNextMonth = () => {
    setCurrentDate(new DateObject(currentDate).add(1, "month"));
  };

  const handleGoToday = () => {
    setCurrentDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  const handleAddClick = (date: Date) => {
      if (!isAdmin) return;
      Swal.fire({
          title: 'افزودن مورد جدید',
          text: 'چه موردی می‌خواهید به تقویم اضافه کنید؟',
          icon: 'question',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: 'وظیفه جدید',
          denyButtonText: 'رویداد جدید',
          cancelButtonText: 'انصراف',
          confirmButtonColor: '#01bfbf',
          denyButtonColor: '#9333ea',
      }).then((result) => {
          if (result.isConfirmed) {
              onAddEvent(date, 'TASK');
          } else if (result.isDenied) {
              onAddEvent(date, 'EVENT');
          }
      });
  };

  const isToday = (date: DateObject) => {
      const today = new DateObject({ calendar: persian, locale: persian_fa });
      return date.year === today.year && date.month === today.month && date.day === today.day;
  };

  // --- Export Functionality ---
  const handleExportCalendar = () => {
      Swal.fire({
          title: 'خروجی تقویم',
          text: 'آیا می‌خواهید تمام رویدادها و وظایف این ماه را به صورت فایل استاندارد (ICS) دریافت کنید؟ این فایل در تقویم گوگل، اوت‌لوک و اپل قابل استفاده است.',
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'بله، دانلود کن',
          cancelButtonText: 'انصراف',
          confirmButtonColor: '#01bfbf'
      }).then((result) => {
          if (result.isConfirmed) {
              const exportItems: Array<{title: string, description?: string, start: Date, end?: Date}> = [];
              const monthIndex = currentDate.month.index;
              const year = currentDate.year;

              // Filter Helper
              const isInCurrentMonth = (dateStr: string) => {
                  const d = new Date(dateStr);
                  const dObj = new DateObject(d).convert(persian, persian_fa);
                  return dObj.year === year && dObj.month.index === monthIndex;
              };

              // 1. Events
              events.forEach(ev => {
                  if (isInCurrentMonth(ev.date)) {
                      const start = new Date(ev.date);
                      if(ev.time) {
                          const [h, m] = ev.time.split(':').map(Number);
                          start.setHours(h, m, 0);
                      }
                      let end = undefined;
                      if(ev.endTime) {
                          const [h, m] = ev.endTime.split(':').map(Number);
                          end = new Date(ev.date);
                          end.setHours(h, m, 0);
                      }
                      exportItems.push({ title: `رویداد: ${ev.title}`, description: ev.description, start, end });
                  }
              });

              // 2. Team Tasks
              tasks.forEach(t => {
                  if (isInCurrentMonth(t.dueDate)) {
                      const start = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
                      const end = new Date(t.dueDate);
                      exportItems.push({ title: `وظیفه: ${t.title}`, description: t.description, start, end });
                  }
              });

              // 3. Personal Tasks
              personalTasks.forEach(pt => {
                  if (pt.dueDate && isInCurrentMonth(pt.dueDate)) {
                       const start = new Date(pt.dueDate);
                       if(pt.time) {
                           const [h, m] = pt.time.split(':').map(Number);
                           start.setHours(h, m, 0);
                       }
                       exportItems.push({ title: `شخصی: ${pt.title}`, description: pt.description, start });
                  }
              });

              if (exportItems.length === 0) {
                  Swal.fire('خالی', 'موردی برای خروجی گرفتن در این ماه وجود ندارد.', 'warning');
                  return;
              }

              downloadICalendarFile(`Calendar-${currentDate.year}-${currentDate.month.number}`, exportItems);
          }
      });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col font-sans">
      {/* Header */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 w-full xl:w-auto">
              <div className="bg-primary/10 p-3 rounded-2xl text-primary hidden md:block">
                  <CalendarIcon size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                    {currentDate.month.name} <span className="text-primary">{toPersianDigits(currentDate.year)}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">برنامه ماهانه و رویدادها</p>
              </div>
          </div>

          <div className="flex items-center justify-between xl:justify-end gap-3 w-full xl:w-auto overflow-x-auto">
              
               {/* Export Button */}
               <button 
                  onClick={handleExportCalendar}
                  className="flex items-center gap-2 bg-orange-50 text-orange-600 border border-orange-100 px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-100 transition-colors whitespace-nowrap"
                  title="دانلود فایل تقویم (ICS) برای گوگل کلندر"
               >
                  <Download size={18} />
                  <span className="hidden sm:inline">خروجی تقویم</span>
               </button>

              {/* Filters */}
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                  <button 
                    onClick={() => setViewFilter('ALL')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewFilter === 'ALL' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                      <Layers size={14} />
                      <span className="hidden sm:inline">همه</span>
                  </button>
                  <button 
                    onClick={() => setViewFilter('TEAM')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewFilter === 'TEAM' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                      <Users size={14} />
                      <span className="hidden sm:inline">تیمی</span>
                  </button>
                  <button 
                    onClick={() => setViewFilter('PERSONAL')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewFilter === 'PERSONAL' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                      <ListTodo size={14} />
                      <span className="hidden sm:inline">شخصی</span>
                  </button>
              </div>

              <div className="w-px h-8 bg-gray-200 mx-1 hidden sm:block"></div>
              
              <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                  <button onClick={handlePrevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
                      <ChevronRight size={20} />
                  </button>
                  <button onClick={handleGoToday} className="px-4 py-2 text-sm font-bold hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-700 whitespace-nowrap">
                      امروز
                  </button>
                  <button onClick={handleNextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
                      <ChevronLeft size={20} />
                  </button>
              </div>
              
              {isAdmin && (
                  <button 
                    onClick={() => handleAddClick(new Date())}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all active:scale-95 text-sm font-bold"
                  >
                     <Plus size={18} />
                     <span className="hidden sm:inline">افزودن</span>
                  </button>
              )}
          </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 bg-white rounded-3xl shadow-lg shadow-gray-100/50 border border-gray-100 flex flex-col overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
              {WEEK_DAYS.map((day, index) => {
                  const isFriday = index === 6;
                  return (
                    <div key={day} className={`py-4 text-center text-sm font-bold ${isFriday ? 'text-red-500' : 'text-gray-500'}`}>
                        {day}
                    </div>
                  );
              })}
          </div>
          
          {/* Days Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-6">
              {days.map((day, index) => {
                  const isFriday = day.weekDay.index === 6;
                  const holidayName = getHoliday(day);
                  const isHoliday = !!holidayName;

                  // Filter Tasks
                  let dayTasks: Task[] = [];
                  if (viewFilter === 'ALL' || viewFilter === 'TEAM') {
                      dayTasks = tasks.filter(t => {
                          const taskDate = new Date(t.dueDate);
                          const dObj = new DateObject(taskDate).convert(persian, persian_fa);
                          return dObj.year === day.year && dObj.month.index === day.month.index && dObj.day === day.day;
                      });
                  }

                  // Filter Events
                  const dayEvents = events.filter(e => {
                      const eventDate = new Date(e.date);
                      const dObj = new DateObject(eventDate).convert(persian, persian_fa);
                      return dObj.year === day.year && dObj.month.index === day.month.index && dObj.day === day.day;
                  });

                  // Filter Personal Tasks
                  let dayPersonalTasks: PersonalTask[] = [];
                  if (viewFilter === 'ALL' || viewFilter === 'PERSONAL') {
                      dayPersonalTasks = personalTasks.filter(pt => {
                          if (!pt.dueDate) return false;
                          const ptDate = new Date(pt.dueDate);
                          const dObj = new DateObject(ptDate).convert(persian, persian_fa);
                          return dObj.year === day.year && dObj.month.index === day.month.index && dObj.day === day.day;
                      });
                  }

                  const totalItems = dayTasks.length + dayEvents.length + dayPersonalTasks.length;
                  const MAX_DISPLAY = 2;
                  const hasOverflow = totalItems > MAX_DISPLAY;
                  
                  // Flatten list for display (Events -> Tasks -> Personal)
                  const displayItems = [
                      ...dayEvents.map(e => ({ type: 'EVENT', data: e })),
                      ...dayTasks.map(t => ({ type: 'TASK', data: t })),
                      ...dayPersonalTasks.map(pt => ({ type: 'PERSONAL', data: pt }))
                  ].slice(0, hasOverflow ? MAX_DISPLAY : 4);

                  const isCurrentMonth = day.month.index === currentDate.month.index;
                  const isDayToday = isToday(day);

                  let bgClass = 'bg-white';
                  if (!isCurrentMonth) bgClass = 'bg-gray-50/30';
                  else if (isFriday) bgClass = 'bg-red-50/30';
                  
                  let textClass = 'text-gray-700';
                  if (!isCurrentMonth) textClass = 'text-gray-300';
                  else if (isFriday || isHoliday) textClass = 'text-red-500';

                  return (
                      <div 
                          key={index}
                          onClick={() => {
                              if (!isCurrentMonth) return;
                              if (isAdmin) handleAddClick(day.toDate());
                          }}
                          className={`
                              border-b border-l border-gray-100 relative p-1.5 transition-all group flex flex-col gap-1 min-h-[100px]
                              ${bgClass}
                              ${isAdmin && isCurrentMonth ? 'cursor-pointer hover:bg-gray-50' : ''}
                          `}
                      >
                          {/* Date Header */}
                          <div className="flex justify-between items-start mb-1">
                              <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDayDetails({ date: day, tasks: dayTasks, events: dayEvents, personalTasks: dayPersonalTasks });
                                }}
                                className={`
                                  w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold transition-all hover:bg-gray-200
                                  ${isDayToday ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover' : textClass}
                                `}
                              >
                                  {toPersianDigits(day.day)}
                              </button>
                              
                              {isHoliday && isCurrentMonth && (
                                  <span className="text-[9px] leading-tight text-red-500 font-medium bg-red-50 px-1 rounded text-left max-w-[60px] truncate" title={holidayName}>
                                      {holidayName}
                                  </span>
                              )}
                          </div>

                          {/* Items List */}
                          <div className="flex-1 flex flex-col gap-1">
                              {displayItems.map((item: any, idx) => {
                                  if (item.type === 'EVENT') {
                                      const event = item.data as CalendarEvent;
                                      return (
                                        <div 
                                            key={`ev-${event.id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if(onEventClick) onEventClick(event);
                                            }}
                                            className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 border-r-2 border-purple-500 truncate cursor-pointer font-bold hover:brightness-95 transition-all shadow-sm"
                                            title={event.title}
                                        >
                                            {event.title}
                                        </div>
                                      );
                                  } else if (item.type === 'TASK') {
                                      const task = item.data as Task;
                                      let colorClass = 'bg-sky-100 text-sky-700 border-sky-500';
                                      if (task.status === TaskStatus.COMPLETED) colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-500 line-through opacity-70';
                                      else if (task.status === TaskStatus.OVERDUE) colorClass = 'bg-red-100 text-red-700 border-red-500';
                                      else if (task.priority === TaskPriority.URGENT) colorClass = 'bg-rose-100 text-rose-700 border-rose-500';
                                      
                                      return (
                                        <div 
                                            key={`t-${task.id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTaskClick(task);
                                            }}
                                            className={`
                                                text-[10px] px-1.5 py-0.5 rounded-md truncate cursor-pointer transition-transform hover:scale-[1.02] font-medium shadow-sm border-r-2
                                                ${colorClass}
                                            `}
                                            title={task.title}
                                        >
                                            {task.title}
                                        </div>
                                      );
                                  } else {
                                      const pt = item.data as PersonalTask;
                                      return (
                                        <div 
                                            key={`pt-${pt.id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if(onPersonalTaskClick) onPersonalTaskClick(pt);
                                            }}
                                            className={`
                                                text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium shadow-sm border-r-2 bg-indigo-50 text-indigo-600 border-indigo-400 cursor-pointer hover:brightness-95
                                                ${pt.isCompleted ? 'line-through opacity-60' : ''}
                                            `}
                                            title={pt.title}
                                        >
                                            {pt.title}
                                        </div>
                                      );
                                  }
                              })}
                              
                              {hasOverflow && (
                                  <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedDayDetails({ date: day, tasks: dayTasks, events: dayEvents, personalTasks: dayPersonalTasks });
                                      }}
                                      className="mt-auto text-[10px] text-gray-500 text-center font-bold bg-gray-100 hover:bg-gray-200 rounded py-1 transition-colors w-full"
                                  >
                                      {toPersianDigits(totalItems - MAX_DISPLAY)}+ مورد دیگر
                                  </button>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      {/* Day Details Modal */}
      {selectedDayDetails && (
          <DayDetailsModal 
              date={selectedDayDetails.date}
              tasks={selectedDayDetails.tasks}
              events={selectedDayDetails.events}
              personalTasks={selectedDayDetails.personalTasks}
              onClose={() => setSelectedDayDetails(null)}
              onTaskClick={(t: Task) => {
                  setSelectedDayDetails(null);
                  onTaskClick(t);
              }}
              onEventClick={(e: CalendarEvent) => {
                  setSelectedDayDetails(null);
                  if (onEventClick) onEventClick(e);
              }}
              onPersonalTaskClick={(pt: PersonalTask) => {
                  setSelectedDayDetails(null);
                  if (onPersonalTaskClick) onPersonalTaskClick(pt);
              }}
              onAdd={(d: Date) => {
                  setSelectedDayDetails(null);
                  handleAddClick(d);
              }}
              isAdmin={isAdmin}
          />
      )}
    </div>
  );
};

export default CalendarView;
