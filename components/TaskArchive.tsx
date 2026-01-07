


import React, { useState } from 'react';
import { Task, TaskStatus, Employee } from '../types';
import { Archive, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toJalali } from '../utils/dateUtils';
import Swal from 'sweetalert2';

interface TaskArchiveProps {
  tasks: Task[];
  currentUser: Employee;
  onUnarchive: (task: Task) => void;
}

const TaskArchive: React.FC<TaskArchiveProps> = ({ tasks, currentUser, onUnarchive }) => {
  // Filter Logic: Task must be in 'archivedBy' list for current user AND not deleted
  const archivedTasks = tasks.filter(t => 
    t.archivedBy && 
    t.archivedBy.includes(currentUser.id) && 
    !t.isDeleted
  );
  
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = archivedTasks.filter(t => t.title.includes(searchQuery));

  const handleUnarchive = (task: Task) => {
      Swal.fire({
          title: 'بازگردانی از آرشیو',
          text: "این وظیفه به لیست وظایف بازگردانده می‌شود.",
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'بله، بازگردان',
          cancelButtonText: 'انصراف',
          confirmButtonColor: '#6366f1'
      }).then((result) => {
          if (result.isConfirmed) {
              onUnarchive(task);
              Swal.fire('بازگردانده شد', '', 'success');
          }
      });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Archive className="text-indigo-500" />
                آرشیو وظایف (شخصی)
            </h2>
            <p className="text-gray-500 mt-1">بایگانی وظایفی که شما آرشیو کرده‌اید</p>
        </div>
        <div className="bg-indigo-50 text-indigo-500 px-4 py-2 rounded-2xl font-bold text-sm">
            {archivedTasks.length} مورد آرشیو شده
        </div>
      </div>

      {archivedTasks.length > 0 && (
          <input 
            type="text" 
            placeholder="جستجو در آرشیو..." 
            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length > 0 ? (
            filtered.map(task => (
                <div key={task.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-indigo-100 to-transparent -mr-8 -mt-8 rounded-full"></div>
                    
                    <div className="flex justify-between items-start mb-3 relative z-10">
                         <h3 className="font-bold text-gray-800 truncate pr-2">{task.title}</h3>
                         <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 h-8">{task.description}</p>
                    
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                         <span className="text-xs text-gray-400">اتمام: {toJalali(task.dueDate)}</span>
                         <button 
                            onClick={() => handleUnarchive(task)}
                            className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                         >
                             <RotateCcw size={14} /> بازگردانی به لیست
                         </button>
                    </div>
                </div>
            ))
        ) : (
            <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Archive size={48} className="mx-auto mb-4 opacity-20" />
                <p>هیچ موردی در آرشیو شخصی شما وجود ندارد.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default TaskArchive;