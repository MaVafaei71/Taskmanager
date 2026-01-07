
import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { X, Search, Check, ListTodo, ChevronDown } from 'lucide-react';
import { toPersianDigits } from '../utils/dateUtils';

interface TaskSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}

const TaskSelectionModal: React.FC<TaskSelectionModalProps> = ({ isOpen, onClose, tasks, selectedIds, onConfirm }) => {
  const [search, setSearch] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedIds);
      setSearch('');
    }
  }, [isOpen, selectedIds]);

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    if (tempSelected.includes(id)) {
      setTempSelected(tempSelected.filter(tid => tid !== id));
    } else {
      setTempSelected([...tempSelected, id]);
    }
  };

  const handleConfirm = () => {
    onConfirm(tempSelected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
              <X size={20} />
            </button>
            <div>
               <h3 className="font-bold text-gray-800 text-lg">انتخاب وظایف</h3>
               <p className="text-xs text-gray-500">
                 وظایف مورد نظر برای گزارش را انتخاب کنید
               </p>
            </div>
          </div>
          <button 
            onClick={handleConfirm}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-primary/30 transition-all"
          >
            تایید {tempSelected.length > 0 && `(${toPersianDigits(tempSelected.length)})`}
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-white border-b border-gray-100">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="جستجو در عنوان وظایف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
           {/* Option to clear selection */}
           <div 
               onClick={() => setTempSelected([])}
               className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${tempSelected.length === 0 ? 'border-primary bg-primary-light/20' : 'border-dashed border-gray-300 hover:bg-gray-50'}`}
             >
               <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                 <X size={20}/>
               </div>
               <span className="mr-3 font-medium text-gray-600">همه وظایف (بدون فیلتر)</span>
               {tempSelected.length === 0 && <Check size={20} className="mr-auto text-primary" />}
             </div>

           {filteredTasks.map(task => {
             const isSelected = tempSelected.includes(task.id);
             return (
               <div 
                 key={task.id}
                 onClick={() => toggleSelection(task.id)}
                 className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                   isSelected 
                    ? 'border-primary bg-primary-light/30 shadow-sm' 
                    : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                 }`}
               >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <ListTodo size={20} />
                  </div>
                  
                  <div className="mr-3 flex-1 min-w-0">
                    <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-primary' : 'text-gray-800'}`}>{task.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span className={`bg-gray-100 px-1.5 py-0.5 rounded ${task.status === 'COMPLETED' ? 'text-green-600 bg-green-50' : ''}`}>
                          {task.status === 'COMPLETED' ? 'تکمیل شده' : 'در جریان'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
               </div>
             );
           })}
           
           {filteredTasks.length === 0 && (
             <div className="text-center py-8 text-gray-400 text-sm">
               <p>وظیفه‌ای یافت نشد.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

interface TaskSelectorProps {
  selectedIds: string[];
  tasks: Task[];
  onChange: (ids: string[]) => void;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({ selectedIds, tasks, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedCount = selectedIds.length;
  const displayText = selectedCount > 0 
    ? `${toPersianDigits(selectedCount)} وظیفه انتخاب شده`
    : "همه وظایف";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none min-h-[42px] hover:border-primary/50 transition-colors text-right"
      >
        <div className="flex items-center gap-2 overflow-hidden">
           <ListTodo size={16} className={selectedCount > 0 ? "text-primary" : "text-gray-400"} />
           <span className={`truncate ${selectedCount > 0 ? 'text-gray-800 font-bold' : 'text-gray-400'}`}>
             {displayText}
           </span>
        </div>
        <ChevronDown size={16} className="text-gray-400 min-w-[16px]" />
      </button>

      <TaskSelectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tasks={tasks}
        selectedIds={selectedIds}
        onConfirm={onChange}
      />
    </>
  );
};

export default TaskSelector;
