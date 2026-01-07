
import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { X, Search, Check, Users, ChevronDown } from 'lucide-react';
import { toPersianDigits } from '../utils/dateUtils';
import UserAvatar from './UserAvatar';

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  multiple: boolean;
  title: string;
}

const SelectionModal: React.FC<SelectionModalProps> = ({ isOpen, onClose, employees, selectedIds, onConfirm, multiple, title }) => {
  const [search, setSearch] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedIds);
      setSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const filteredEmployees = employees.filter(emp => 
    emp.name.includes(search) || 
    emp.mobile.includes(search) || 
    emp.department.includes(search)
  );

  const toggleSelection = (id: string) => {
    if (multiple) {
      if (tempSelected.includes(id)) {
        setTempSelected(tempSelected.filter(tid => tid !== id));
      } else {
        setTempSelected([...tempSelected, id]);
      }
    } else {
      setTempSelected([id]);
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
               <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
               <p className="text-xs text-gray-500">
                 {multiple ? 'چند نفر را انتخاب کنید' : 'یک نفر را انتخاب کنید'}
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
              placeholder="جستجو..."
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
           {!multiple && (
             <div 
               onClick={() => setTempSelected([])}
               className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${tempSelected.length === 0 ? 'border-primary bg-primary-light/20' : 'border-dashed border-gray-300 hover:bg-gray-50'}`}
             >
               <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                 <X size={20}/>
               </div>
               <span className="mr-3 font-medium text-gray-600">بدون مسئول</span>
               {tempSelected.length === 0 && <Check size={20} className="mr-auto text-primary" />}
             </div>
           )}

           {filteredEmployees.map(emp => {
             const isSelected = tempSelected.includes(emp.id);
             return (
               <div 
                 key={emp.id}
                 onClick={() => toggleSelection(emp.id)}
                 className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                   isSelected 
                    ? 'border-primary bg-primary-light/30 shadow-sm' 
                    : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                 }`}
               >
                  <div className="relative">
                     <UserAvatar 
                        src={emp.avatar} 
                        name={emp.name}
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                        iconSize={20}
                     />
                     {isSelected && (
                       <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5 border-2 border-white">
                         <Check size={10} />
                       </div>
                     )}
                  </div>
                  <div className="mr-3 flex-1 min-w-0">
                    <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-primary' : 'text-gray-800'}`}>{emp.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{emp.department}</span>
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
           
           {filteredEmployees.length === 0 && (
             <div className="text-center py-8 text-gray-400 text-sm">
               <p>موردی یافت نشد.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

interface EmployeeSelectorProps {
  selectedIds: string[];
  employees: Employee[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  label?: string;
}

const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({ selectedIds, employees, onChange, multiple = false, label = "انتخاب مسئول..." }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedEmployees = employees.filter(e => selectedIds.includes(e.id));
  const displayText = selectedEmployees.length > 0 
    ? selectedEmployees.map(e => e.name).join('، ')
    : label;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none min-h-[42px] hover:border-primary/50 transition-colors text-right"
      >
        <div className="flex items-center gap-2 overflow-hidden">
           {selectedEmployees.length > 0 ? (
             <div className="flex -space-x-2 space-x-reverse overflow-hidden pl-2">
                {selectedEmployees.slice(0, 3).map(e => (
                   <UserAvatar 
                      key={e.id}
                      src={e.avatar}
                      name={e.name}
                      className="w-6 h-6 rounded-full border border-white"
                      iconSize={14}
                   />
                ))}
                {selectedEmployees.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[10px] text-gray-500 font-bold">
                    +{toPersianDigits(selectedEmployees.length - 3)}
                  </div>
                )}
             </div>
           ) : (
             <Users size={16} className="text-gray-400 min-w-[16px]" />
           )}
           <span className={`truncate ${selectedEmployees.length > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
             {displayText}
           </span>
        </div>
        <ChevronDown size={16} className="text-gray-400 min-w-[16px]" />
      </button>

      <SelectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employees={employees}
        selectedIds={selectedIds}
        onConfirm={onChange}
        multiple={multiple}
        title={multiple ? "انتخاب مسئولین" : "انتخاب مسئول"}
      />
    </>
  );
};

export default EmployeeSelector;
