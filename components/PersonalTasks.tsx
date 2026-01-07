
import React, { useState, useMemo } from 'react';
import { PersonalTask, Employee } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, ListTodo, Search, Calendar, Clock, AlignLeft, Edit2, Share2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toPersianDigits, toJalali, openGoogleCalendar } from '../utils/dateUtils';
import Swal from 'sweetalert2';
import PersonalTaskModal from './PersonalTaskModal';

interface PersonalTasksProps {
  currentUser: Employee;
  tasks: PersonalTask[];
  onUpdateTasks: (tasks: PersonalTask[]) => void;
}

const PersonalTasks: React.FC<PersonalTasksProps> = ({ currentUser, tasks, onUpdateTasks }) => {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | undefined>(undefined);

  // Quick Add (Simple)
  const quickAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const newTask: PersonalTask = {
      id: uuidv4(),
      userId: currentUser.id,
      title: inputValue.trim(),
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    onUpdateTasks([newTask, ...tasks]);
    setInputValue('');
  };

  // Detailed Add/Edit via Modal
  const handleSaveModal = (task: PersonalTask) => {
      if (editingTask) {
          // Edit Mode
          onUpdateTasks(tasks.map(t => t.id === task.id ? task : t));
      } else {
          // Add Mode
          onUpdateTasks([task, ...tasks]);
      }
      setIsModalOpen(false);
      setEditingTask(undefined);
  };

  const openAddModal = () => {
      setEditingTask(undefined);
      setIsModalOpen(true);
  };

  const openEditModal = (task: PersonalTask) => {
      setEditingTask(task);
      setIsModalOpen(true);
  };

  const toggleTask = (id: string) => {
    onUpdateTasks(tasks.map(t => 
      t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
    ));
  };

  const deleteTask = (id: string) => {
    Swal.fire({
      title: 'حذف وظیفه شخصی',
      text: 'آیا از حذف این مورد اطمینان دارید؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'بله، حذف کن',
      cancelButtonText: 'انصراف'
    }).then((result) => {
      if (result.isConfirmed) {
        onUpdateTasks(tasks.filter(t => t.id !== id));
      }
    });
  };

  const handleShare = (e: React.MouseEvent, task: PersonalTask) => {
      e.stopPropagation();
      if (task.dueDate) {
          openGoogleCalendar(task.title, task.description || '', {
              startDate: task.dueDate,
              startTime: task.time, // Optional time
              type: 'PERSONAL'
          });
      } else {
          // If no date, alert user
           Swal.fire({
              title: 'بدون تاریخ',
              text: 'برای اشتراک‌گذاری در تقویم، وظیفه باید تاریخ داشته باشد. لطفا وظیفه را ویرایش کرده و تاریخی تعیین کنید.',
              icon: 'info',
              confirmButtonText: 'باشه'
           });
      }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (t.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = 
        filter === 'ALL' || 
        (filter === 'PENDING' && !t.isCompleted) || 
        (filter === 'COMPLETED' && t.isCompleted);
      return matchesSearch && matchesFilter;
    });
  }, [tasks, searchQuery, filter]);

  const stats = useMemo(() => {
    const pending = tasks.filter(t => !t.isCompleted).length;
    const completed = tasks.filter(t => t.isCompleted).length;
    return { pending, completed };
  }, [tasks]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">وظایف شخصی</h2>
          <p className="text-gray-500 mt-1">لیست کارهای خصوصی و یادداشت‌های روزانه شما</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl flex items-center gap-2">
            <ListTodo size={20} />
            <span className="font-bold text-sm">{toPersianDigits(stats.pending)} مورد باقی‌مانده</span>
        </div>
      </div>

      {/* Quick Add Input + Detailed Button */}
      <div className="flex gap-2">
        <form onSubmit={quickAddTask} className="relative group flex-1">
            <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="چیزی بنویسید و اینتر بزنید..."
                className="w-full p-5 pr-6 pl-16 bg-white border border-gray-200 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all text-lg"
            />
            <button 
                type="submit"
                disabled={!inputValue.trim()}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
                <Plus size={24} />
            </button>
        </form>
        <button 
            onClick={openAddModal}
            className="w-16 h-[88px] sm:h-auto bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-primary rounded-[2rem] flex items-center justify-center transition-colors border border-gray-200"
            title="افزودن با جزئیات کامل"
        >
            <ListTodo size={24} />
        </button>
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="جستجو در وظایف..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>
          <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl w-full sm:w-auto overflow-x-auto">
              <button 
                onClick={() => setFilter('ALL')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filter === 'ALL' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                همه
              </button>
              <button 
                onClick={() => setFilter('PENDING')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filter === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                در انتظار
              </button>
              <button 
                onClick={() => setFilter('COMPLETED')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filter === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                انجام شده
              </button>
          </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
                <div 
                    key={task.id} 
                    className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                        task.isCompleted 
                        ? 'bg-gray-50/80 border-gray-100' 
                        : 'bg-white border-gray-100 hover:border-primary/30 shadow-sm hover:shadow-md'
                    }`}
                >
                    <button 
                        onClick={() => toggleTask(task.id)}
                        className={`flex-shrink-0 transition-colors mt-1 ${task.isCompleted ? 'text-emerald-500' : 'text-gray-300 hover:text-primary'}`}
                    >
                        {task.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditModal(task)}>
                        <h4 className={`text-base font-medium transition-all ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {task.title}
                        </h4>
                        
                        {(task.dueDate || task.time || task.description) && (
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                {task.dueDate && (
                                    <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                        <Calendar size={12} />
                                        <span>{toJalali(task.dueDate)}</span>
                                    </div>
                                )}
                                {task.time && (
                                    <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                                        <Clock size={12} />
                                        <span className="dir-ltr">{toPersianDigits(task.time)}</span>
                                    </div>
                                )}
                                {task.description && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md max-w-full truncate">
                                        <AlignLeft size={12} />
                                        <span className="truncate max-w-[200px]">{task.description}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={(e) => handleShare(e, task)}
                            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
                            title="افزودن به تقویم گوگل"
                        >
                            <Share2 size={16} />
                        </button>
                        <button 
                            onClick={() => openEditModal(task)}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={() => deleteTask(task.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))
        ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <ListTodo size={40} />
                </div>
                <h4 className="text-gray-500 font-bold">موردی یافت نشد</h4>
                <p className="text-gray-400 text-sm mt-1">همین حالا اولین وظیفه شخصی خود را اضافه کنید.</p>
            </div>
        )}
      </div>

      {stats.completed > 0 && filter !== 'PENDING' && (
        <div className="text-center pt-4">
             <button 
                onClick={() => {
                    Swal.fire({
                        title: 'پاکسازی انجام شده‌ها',
                        text: 'آیا می‌خواهید تمام موارد تکمیل شده را حذف کنید؟',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'بله، حذف کن',
                        cancelButtonText: 'خیر'
                    }).then(res => {
                        if (res.isConfirmed) {
                            onUpdateTasks(tasks.filter(t => !t.isCompleted));
                        }
                    });
                }}
                className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors"
             >
                پاکسازی موارد انجام شده ({toPersianDigits(stats.completed)})
             </button>
        </div>
      )}

      {/* Full Edit/Add Modal */}
      {isModalOpen && (
          <PersonalTaskModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveModal}
            initialData={editingTask}
            userId={currentUser.id}
          />
      )}
    </div>
  );
};

export default PersonalTasks;
