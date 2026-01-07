
import React, { useState, useEffect } from 'react';
import { PersonalTask } from '../types';
import { X, Save, Clock, AlignLeft, Calendar as CalendarIcon, ListTodo } from 'lucide-react';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import AnalogTimePicker from './AnalogTimePicker';
import { toPersianDigits } from '../utils/dateUtils';
import { v4 as uuidv4 } from 'uuid';

interface PersonalTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: PersonalTask) => void;
  initialData?: PersonalTask;
  userId: string;
}

const PersonalTaskModal: React.FC<PersonalTaskModalProps> = ({ isOpen, onClose, onSave, initialData, userId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<any>(null);
  const [time, setTime] = useState('');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setDueDate(initialData.dueDate ? new Date(initialData.dueDate) : null);
        setTime(initialData.time || '');
      } else {
        setTitle('');
        setDescription('');
        setDueDate(null);
        setTime('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;

    let finalDate: string | undefined = undefined;
    if (dueDate) {
        if (dueDate instanceof Date) {
            finalDate = dueDate.toISOString();
        } else if (dueDate && typeof dueDate.toDate === 'function') {
            finalDate = dueDate.toDate().toISOString();
        } else {
            finalDate = new Date(dueDate).toISOString();
        }
    }

    const newTask: PersonalTask = {
      id: initialData?.id || uuidv4(),
      userId: userId,
      title: title.trim(),
      isCompleted: initialData?.isCompleted || false,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      description: description.trim() || undefined,
      dueDate: finalDate,
      time: time || undefined
    };

    onSave(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-visible animate-in zoom-in-95 flex flex-col relative">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center rounded-t-2xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <ListTodo size={20}/>
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                        {initialData ? 'ویرایش وظیفه شخصی' : 'وظیفه شخصی جدید'}
                    </h3>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-5">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">عنوان <span className="text-red-500">*</span></label>
                <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثلا: تماس با پزشک..."
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
                    autoFocus
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ (اختیاری)</label>
                    <div className="relative">
                        <DatePicker
                            value={dueDate}
                            onChange={setDueDate}
                            calendar={persian}
                            locale={persian_fa}
                            calendarPosition="bottom-right"
                            inputClass="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none cursor-pointer text-sm"
                            containerStyle={{ width: "100%" }}
                            format="YYYY/MM/DD"
                            placeholder="انتخاب تاریخ"
                            portal
                            zIndex={9999}
                        />
                         {!dueDate && <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ساعت (اختیاری)</label>
                    <button
                        type="button"
                        onClick={() => setIsTimePickerOpen(true)}
                        className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none text-right flex items-center justify-between hover:bg-gray-100 transition-colors ${!time ? 'text-gray-400' : 'text-gray-800'}`}
                    >
                        <span className={`text-sm ${time ? 'font-mono dir-ltr' : ''}`}>{time ? toPersianDigits(time) : 'انتخاب ساعت'}</span>
                        <Clock size={16} className={time ? "text-primary" : "text-gray-400"}/>
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات بیشتر (اختیاری)</label>
                <div className="relative">
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="جزئیات تکمیلی..."
                        rows={3}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none transition-all text-sm"
                    />
                    <AlignLeft size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none"/>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors font-medium text-sm">
                انصراف
            </button>
            <button 
                onClick={handleSave}
                disabled={!title.trim()}
                className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all font-medium disabled:opacity-50 text-sm flex items-center gap-2"
            >
                <Save size={18} />
                ذخیره
            </button>
        </div>

        {isTimePickerOpen && (
            <AnalogTimePicker 
                value={time || '10:00'}
                onChange={setTime}
                onClose={() => setIsTimePickerOpen(false)}
            />
        )}
      </div>
    </div>
  );
};

export default PersonalTaskModal;
