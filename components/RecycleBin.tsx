


import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { Trash2, RotateCcw, AlertOctagon, CheckCircle2, AlertCircle } from 'lucide-react';
import { toJalali } from '../utils/dateUtils';
import Swal from 'sweetalert2';

interface RecycleBinProps {
  tasks: Task[];
  onRestore: (task: Task) => void;
  onPermanentDelete: (id: string) => void;
}

const RecycleBin: React.FC<RecycleBinProps> = ({ tasks, onRestore, onPermanentDelete }) => {
  const deletedTasks = tasks.filter(t => t.isDeleted);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = deletedTasks.filter(t => t.title.includes(searchQuery));

  const handleRestore = (task: Task) => {
    Swal.fire({
      title: 'بازیابی',
      text: "وظیفه به لیست اصلی بازگردانده می‌شود.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'بله، بازیابی کن',
      cancelButtonText: 'انصراف',
      confirmButtonColor: '#10b981'
    }).then((result) => {
        if (result.isConfirmed) {
            onRestore(task);
            Swal.fire('بازیابی شد', '', 'success');
        }
    });
  };

  const handlePermanentDelete = (id: string) => {
    Swal.fire({
        title: 'حذف دائمی',
        text: "این عملیات غیرقابل بازگشت است! آیا مطمئن هستید؟",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'بله، برای همیشه حذف کن',
        cancelButtonText: 'انصراف',
        confirmButtonColor: '#ef4444'
      }).then((result) => {
          if (result.isConfirmed) {
              onPermanentDelete(id);
              Swal.fire('حذف شد', '', 'success');
          }
      });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Trash2 className="text-red-500" />
                وظایف حذف شده
            </h2>
            <p className="text-gray-500 mt-1">مدیریت وظایف حذف شده (قابل بازیابی)</p>
        </div>
        <div className="bg-red-50 text-red-500 px-4 py-2 rounded-2xl font-bold text-sm">
            {deletedTasks.length} مورد حذف شده
        </div>
      </div>

      {deletedTasks.length > 0 && (
          <input 
            type="text" 
            placeholder="جستجو در حذف شده‌ها..." 
            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/30 focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length > 0 ? (
            filtered.map(task => (
                <div key={task.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-start mb-2">
                         <h3 className="font-bold text-gray-700 line-through decoration-gray-400 decoration-2">{task.title}</h3>
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                             {task.status === TaskStatus.COMPLETED ? 'تکمیل شده' : 'ناتمام'}
                         </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-1">{task.description}</p>
                    
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                         <span className="text-xs text-gray-400">سررسید: {toJalali(task.dueDate)}</span>
                         <div className="flex gap-2">
                             <button 
                                onClick={() => handleRestore(task)}
                                className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
                             >
                                 <RotateCcw size={14} /> بازیابی
                             </button>
                             <button 
                                onClick={() => handlePermanentDelete(task.id)}
                                className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium"
                             >
                                 <AlertOctagon size={14} /> حذف دائم
                             </button>
                         </div>
                    </div>
                </div>
            ))
        ) : (
            <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Trash2 size={48} className="mx-auto mb-4 opacity-20" />
                <p>لیست وظایف حذف شده خالی است.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default RecycleBin;