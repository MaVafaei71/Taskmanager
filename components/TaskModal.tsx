
import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskStatus, Employee, AssigneeType, SubTask, TaskPriority, Role } from '../types';
import { DEPARTMENTS } from '../constants';
// Added User to the imported icons
import { X, Plus, Trash2, Calendar as CalendarIcon, ChevronDown, Lock, Info, User } from 'lucide-react';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { toPersianDigits, toJalali } from '../utils/dateUtils';
import EmployeeSelector from './EmployeeSelector';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  employees: Employee[];
  initialData?: Task;
  initialDate?: Date;
  currentUser: Employee | null;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, employees, initialData, initialDate, currentUser }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<any>(new Date());
  const [dueDate, setDueDate] = useState<any>(new Date());
  const [assigneeType, setAssigneeType] = useState<AssigneeType>(AssigneeType.USER);
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);

  // Permission Logic
  const isAdmin = currentUser?.role === Role.ADMIN;
  // If it's a new task, admin is always true in UI context. 
  // If editing, check if user is the main assignee or admin.
  const isMainAssignee = initialData ? (
      (initialData.assigneeType === AssigneeType.USER && initialData.assigneeId === currentUser?.id) ||
      (initialData.assigneeType === AssigneeType.DEPARTMENT && initialData.assigneeId === currentUser?.department)
  ) : false;

  const canEditMainFields = isAdmin || !initialData; // Assignee cannot edit main fields of existing task
  const canManageSubTasks = isAdmin || isMainAssignee || !initialData;

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
          setTitle(initialData.title);
          setDescription(initialData.description);
          setStartDate(initialData.startDate ? new Date(initialData.startDate) : new Date());
          setDueDate(new Date(initialData.dueDate));
          setAssigneeType(initialData.assigneeType);
          setAssigneeId(initialData.assigneeId);
          setPriority(initialData.priority || TaskPriority.MEDIUM);
          setSubTasks(initialData.subTasks || []);
        } else {
          setTitle('');
          setDescription('');
          setStartDate(initialDate || new Date());
          setDueDate(initialDate || new Date());
          setAssigneeType(AssigneeType.USER);
          setAssigneeId(''); // Changed: Default to empty to force selection
          setPriority(TaskPriority.MEDIUM);
          setSubTasks([]);
        }
    }
  }, [isOpen, initialData, initialDate, employees]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title || !assigneeId) return;
    
    let finalStartDate = startDate instanceof Date ? startDate : (startDate?.toDate ? startDate.toDate() : new Date(startDate));
    let finalDueDate = dueDate instanceof Date ? dueDate : (dueDate?.toDate ? dueDate.toDate() : new Date(dueDate));
    
    const isNewAssignment = !initialData || initialData.assigneeId !== assigneeId;

    const newTask: Task = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      title: canEditMainFields ? title : (initialData?.title || title),
      description: canEditMainFields ? description : (initialData?.description || description),
      status: initialData?.status || TaskStatus.TODO,
      priority: canEditMainFields ? priority : (initialData?.priority || priority),
      startDate: canEditMainFields ? finalStartDate.toISOString() : (initialData?.startDate || finalStartDate.toISOString()),
      dueDate: canEditMainFields ? finalDueDate.toISOString() : (initialData?.dueDate || finalDueDate.toISOString()),
      createdAt: initialData?.createdAt || new Date().toISOString(),
      assigneeType: canEditMainFields ? assigneeType : (initialData?.assigneeType || assigneeType),
      assigneeId: canEditMainFields ? assigneeId : (initialData?.assigneeId || assigneeId),
      subTasks,
      createdBy: initialData?.createdBy || currentUser?.id || '1',
      timeLogs: initialData?.timeLogs || [],
      comments: initialData?.comments || [],
      viewedByAssignee: isNewAssignment ? false : (initialData?.viewedByAssignee ?? false),
    };
    onSave(newTask);
  };

  const addSubTask = () => {
    setSubTasks([...subTasks, { id: Math.random().toString(36).substr(2, 9), title: '', isCompleted: false, assigneeIds: [] }]);
  };

  const updateSubTaskTitle = (id: string, title: string) => {
    setSubTasks(subTasks.map(st => st.id === id ? { ...st, title } : st));
  };

  const updateSubTaskAssignees = (id: string, assigneeIds: string[]) => {
    setSubTasks(subTasks.map(st => st.id === id ? { ...st, assigneeIds } : st));
  };

  const deleteSubTask = (id: string) => {
    setSubTasks(subTasks.filter(st => st.id !== id));
  };

  const priorityOptions = [
    { value: TaskPriority.URGENT, label: 'فوری', color: 'bg-red-50 text-red-600 border-red-200' },
    { value: TaskPriority.HIGH, label: 'مهم', color: 'bg-orange-50 text-orange-600 border-orange-200' },
    { value: TaskPriority.MEDIUM, label: 'متوسط', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { value: TaskPriority.LOW, label: 'عادی', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
        <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${!canEditMainFields ? 'bg-blue-50/50' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!canEditMainFields ? 'bg-blue-100 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                {initialData ? (canEditMainFields ? <CalendarIcon size={20}/> : <Lock size={20}/>) : <Plus size={20}/>}
             </div>
             <div>
                <h3 className="text-xl font-bold text-gray-800">
                    {initialData ? (canEditMainFields ? 'ویرایش وظیفه' : 'مدیریت زیروظیفه‌ها') : 'ایجاد وظیفه جدید'}
                </h3>
                {!canEditMainFields && (
                    <p className="text-[10px] text-blue-600 font-bold bg-blue-100/50 px-2 py-0.5 rounded-full mt-1 flex items-center gap-1">
                        <Info size={10} /> دسترسی محدود: فقط مدیریت زیروظیفه‌ها
                    </p>
                )}
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-4">
            <div className={!canEditMainFields ? 'opacity-70 pointer-events-none' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">عنوان وظیفه {canEditMainFields && <span className="text-red-500">*</span>}</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEditMainFields} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all" placeholder="عنوان وظیفه..." />
            </div>
            <div className={!canEditMainFields ? 'opacity-70 pointer-events-none' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEditMainFields} rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none transition-all" placeholder="توضیحات..." />
            </div>
          </div>

          <div className={!canEditMainFields ? 'opacity-70 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-2">اولویت</label>
            <div className="flex gap-2">
                {priorityOptions.map((opt) => (
                    <button key={opt.value} onClick={() => setPriority(opt.value)} disabled={!canEditMainFields} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${priority === opt.value ? `${opt.color} shadow-sm border-transparent ring-2 ring-offset-1 ring-gray-200` : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{opt.label}</button>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start Date */}
            <div className={`flex flex-col ${!canEditMainFields ? 'opacity-70 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ شروع</label>
              <DatePicker value={startDate} onChange={setStartDate} disabled={!canEditMainFields} calendar={persian} locale={persian_fa} calendarPosition="bottom-right" inputClass="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none cursor-pointer text-sm" containerStyle={{ width: "100%" }} format="YYYY/MM/DD" />
            </div>
            
            {/* Due Date */}
            <div className={`flex flex-col ${!canEditMainFields ? 'opacity-70 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ سررسید</label>
              <DatePicker value={dueDate} onChange={setDueDate} disabled={!canEditMainFields} calendar={persian} locale={persian_fa} calendarPosition="bottom-right" inputClass="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none cursor-pointer text-sm" containerStyle={{ width: "100%" }} format="YYYY/MM/DD" />
            </div>
          </div>

          {/* Assignee Section - Full Width */}
          <div className={`space-y-2 ${!canEditMainFields ? 'opacity-70 pointer-events-none' : ''}`}>
                <label className="block text-sm font-medium text-gray-700">مسئول انجام <span className="text-red-500">*</span></label>
                {canEditMainFields ? (
                    <>
                        <div className="flex gap-2 mb-2 p-1 bg-gray-100 rounded-lg w-fit">
                            <button onClick={() => setAssigneeType(AssigneeType.USER)} className={`px-4 py-1.5 text-sm rounded-md transition-all shadow-sm ${assigneeType === AssigneeType.USER ? 'bg-white text-primary font-bold' : 'text-gray-500 hover:bg-gray-200/50'}`}>کارمند</button>
                            <button onClick={() => setAssigneeType(AssigneeType.DEPARTMENT)} className={`px-4 py-1.5 text-sm rounded-md transition-all shadow-sm ${assigneeType === AssigneeType.DEPARTMENT ? 'bg-white text-primary font-bold' : 'text-gray-500 hover:bg-gray-200/50'}`}>دپارتمان</button>
                        </div>
                        {assigneeType === AssigneeType.USER ? (
                            <EmployeeSelector selectedIds={assigneeId ? [assigneeId] : []} employees={employees} onChange={(ids) => setAssigneeId(ids[0] || '')} multiple={false} label="انتخاب مسئول..." />
                        ) : (
                            <div className="relative">
                                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all appearance-none">
                                    <option value="">انتخاب دپارتمان...</option>
                                    {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                </select>
                                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16}/>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-3 bg-gray-100 rounded-xl text-sm text-gray-600 flex items-center gap-2">
                        <User size={16} /> {assigneeType === AssigneeType.USER ? employees.find(e => e.id === assigneeId)?.name : assigneeId}
                    </div>
                )}
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <label className="block text-sm font-bold text-gray-800">زیروظیفه‌ها (Subtasks)</label>
                    <p className="text-xs text-gray-500 mt-1">مدیریت مراحل اجرایی کار</p>
                </div>
                {canManageSubTasks && (
                    <button onClick={addSubTask} className="text-primary text-sm flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors font-medium"><Plus size={16}/> افزودن زیروظیفه</button>
                )}
            </div>
            <div className="space-y-3">
                {subTasks.map((st, index) => (
                    <div key={st.id} className="group flex flex-col sm:flex-row items-start gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 transition-all hover:border-primary/30">
                        <div className="flex items-center w-full gap-2 mt-2">
                            <span className="text-gray-400 text-xs w-5 font-mono">{toPersianDigits(index + 1)}.</span>
                            <input type="text" value={st.title} disabled={!canManageSubTasks} onChange={(e) => updateSubTaskTitle(st.id, e.target.value)} className="flex-1 p-2 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary/50 focus:outline-none text-sm" placeholder="عنوان زیروظیفه" />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-1">
                            <div className="w-full sm:w-48">
                              <EmployeeSelector selectedIds={st.assigneeIds || []} employees={employees} onChange={(ids) => updateSubTaskAssignees(st.id, ids)} multiple={true} label="مسئول(ین)..." />
                            </div>
                            {canManageSubTasks && (
                                <button onClick={() => deleteSubTask(st.id)} className="text-gray-400 hover:text-red-500 p-2.5 rounded-lg hover:bg-red-50 transition-colors h-[42px] w-[42px] flex items-center justify-center border border-transparent hover:border-red-100"><Trash2 size={18}/></button>
                            )}
                        </div>
                    </div>
                ))}
                {subTasks.length === 0 && <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl"><p className="text-sm text-gray-400">زیروظیفه‌ای موجود نیست.</p></div>}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors font-medium text-sm">انصراف</button>
            <button onClick={handleSave} disabled={!title || !assigneeId} className="px-8 py-3 rounded-xl bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all font-medium disabled:opacity-50 text-sm flex items-center gap-2">
                {initialData ? (canEditMainFields ? 'بروزرسانی وظیفه' : 'ذخیره زیروظیفه‌ها') : 'ثبت وظیفه'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
