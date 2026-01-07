
import React, { useState, useEffect } from 'react';
import { CalendarEvent, Employee } from '../types';
import { X, Calendar as CalendarIcon, Clock, AlignLeft, Trash2, Save, ArrowLeft } from 'lucide-react';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { toJalali, toPersianDigits } from '../utils/dateUtils';
import EmployeeSelector from './EmployeeSelector';
import AnalogTimePicker from './AnalogTimePicker';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (id: string) => void;
  employees: Employee[];
  initialDate?: Date;
  initialData?: CalendarEvent;
}

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, onDelete, employees, initialDate, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<any>(new Date());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
  const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);

  // Load initial data for editing
  useEffect(() => {
    if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setDate(new Date(initialData.date));
        setStartTime(initialData.time);
        setEndTime(initialData.endTime || '11:00');
        setAttendeeIds(initialData.attendeeIds);
    } else {
        setTitle('');
        setDescription('');
        setDate(initialDate || new Date());
        setStartTime('10:00');
        setEndTime('11:00');
        setAttendeeIds([]);
    }
  }, [initialData, initialDate, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title || !date) return;

    let finalDate: Date;
    if (date instanceof Date) {
        finalDate = date;
    } else if (date && typeof date.toDate === 'function') {
        finalDate = date.toDate();
    } else {
        finalDate = new Date(date);
    }

    const eventToSave: CalendarEvent = {
      id: initialData?.id || uuidv4(),
      title,
      description,
      date: finalDate.toISOString(),
      time: startTime,
      endTime: endTime,
      attendeeIds,
      createdBy: initialData?.createdBy || 'ADMIN' 
    };

    onSave(eventToSave);
  };

  const handleDelete = () => {
      if (!initialData || !onDelete) return;
      
      Swal.fire({
          title: 'حذف رویداد',
          text: "آیا از حذف این رویداد اطمینان دارید؟",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#d33',
          confirmButtonText: 'بله، حذف کن',
          cancelButtonText: 'انصراف'
      }).then((result) => {
          if (result.isConfirmed) {
              onDelete(initialData.id);
          }
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                <CalendarIcon size={20}/>
             </div>
             <div>
                <h3 className="text-xl font-bold text-gray-800">
                    {initialData ? 'ویرایش رویداد' : 'رویداد جدید'}
                </h3>
                <p className="text-xs text-gray-500">
                    {initialData ? 'تغییر جزئیات رویداد ثبت شده' : 'جلسه، قرار ملاقات یا رویداد تیمی'}
                </p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">عنوان رویداد</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:outline-none transition-all"
                placeholder="مثلاً: جلسه هفتگی تیم فنی"
              />
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ</label>
                    <DatePicker
                        value={date}
                        onChange={setDate}
                        calendar={persian}
                        locale={persian_fa}
                        calendarPosition="bottom-right"
                        inputClass="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:outline-none cursor-pointer"
                        containerStyle={{ width: "100%" }}
                        format="YYYY/MM/DD"
                    />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ساعت شروع</label>
                        <button
                            type="button"
                            onClick={() => setIsStartTimePickerOpen(true)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:outline-none text-center flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                        >
                            <span className="font-mono text-lg font-medium text-gray-700 dir-ltr">{toPersianDigits(startTime)}</span>
                            <Clock size={18} className="text-purple-500"/>
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ساعت پایان</label>
                        <button
                            type="button"
                            onClick={() => setIsEndTimePickerOpen(true)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:outline-none text-center flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                        >
                            <span className="font-mono text-lg font-medium text-gray-700 dir-ltr">{toPersianDigits(endTime)}</span>
                            <Clock size={18} className="text-purple-400"/>
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شرکت‌کنندگان</label>
                <EmployeeSelector
                    selectedIds={attendeeIds}
                    employees={employees}
                    onChange={setAttendeeIds}
                    multiple={true}
                    label="دعوت از همکاران..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات (اختیاری)</label>
                <div className="relative">
                     <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:outline-none resize-none"
                        placeholder="جزئیات رویداد..."
                    />
                    <AlignLeft size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none"/>
                </div>
            </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between gap-3">
             <div>
                 {initialData && onDelete && (
                     <button 
                        onClick={handleDelete}
                        className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition-colors"
                        title="حذف رویداد"
                     >
                         <Trash2 size={20} />
                     </button>
                 )}
             </div>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-6 py-3 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors font-medium text-sm">
                    انصراف
                </button>
                <button 
                    onClick={handleSave}
                    disabled={!title}
                    className="px-8 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/30 transition-all font-medium disabled:opacity-50 text-sm flex items-center gap-2"
                >
                    <Save size={18} />
                    {initialData ? 'ذخیره تغییرات' : 'ثبت رویداد'}
                </button>
            </div>
        </div>

        {/* Start Time Picker */}
        {isStartTimePickerOpen && (
            <AnalogTimePicker 
                value={startTime}
                onChange={setStartTime}
                onClose={() => setIsStartTimePickerOpen(false)}
            />
        )}

        {/* End Time Picker */}
        {isEndTimePickerOpen && (
            <AnalogTimePicker 
                value={endTime}
                onChange={setEndTime}
                onClose={() => setIsEndTimePickerOpen(false)}
            />
        )}
      </div>
    </div>
  );
};

export default EventModal;
