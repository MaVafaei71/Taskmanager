
import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskStatus, Employee, Role, AssigneeType, TimeLog, TaskPriority } from '../types';
import { Plus, Search, Calendar, User, Users, ChevronRight, ChevronLeft, Play, Pause, CheckSquare, Timer, Coffee, FileText, History, Square, Check, AlertCircle, Clock, Settings2, Trash2, Archive, Share2 } from 'lucide-react';
import { toJalali, toPersianDigits, openGoogleCalendar } from '../utils/dateUtils';
import TaskModal from './TaskModal';
import TaskHistoryModal from './TaskHistoryModal';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';
import UserAvatar from './UserAvatar';

interface TasksProps {
  tasks: Task[];
  employees: Employee[];
  currentUser: Employee | null;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddComment: (taskId: string, text: string) => void;
  onEditComment: (taskId: string, commentId: string, newText: string) => void;
  onDeleteComment: (taskId: string, commentId: string) => void;
}

const ITEMS_PER_PAGE = 9;

const formatDuration = (ms: number) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getPriorityBadge = (priority: TaskPriority) => {
    switch(priority) {
        case TaskPriority.URGENT:
            return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 flex items-center gap-1"><AlertCircle size={10}/> فوری</span>;
        case TaskPriority.HIGH:
            return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-100">مهم</span>;
        case TaskPriority.MEDIUM:
            return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">متوسط</span>;
        case TaskPriority.LOW:
            return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-100">عادی</span>;
        default:
            return null;
    }
};

const Tasks: React.FC<TasksProps> = ({ tasks, employees, currentUser, onAddTask, onUpdateTask, onDeleteTask, onAddComment, onEditComment, onDeleteComment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryTaskId, setSelectedHistoryTaskId] = useState<string | null>(null);

  const selectedHistoryTask = useMemo(() => 
    tasks.find(t => t.id === selectedHistoryTaskId) || null
  , [tasks, selectedHistoryTaskId]);

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredTasks = tasks.filter(task => {
    // Exclude deleted or archived tasks from the main list
    // NOTE: Tasks are already filtered for 'isDeleted' and 'archivedBy' in App.tsx before passing here.
    // However, if we need strict check here:
    if (task.isDeleted) return false;
    if (task.archivedBy && currentUser && task.archivedBy.includes(currentUser.id)) return false;

    const matchesSearch = task.title.includes(searchQuery) || task.description.includes(searchQuery);
    const matchesStatus = filterStatus === 'ALL' || task.status === filterStatus;
    
    if (currentUser?.role === Role.EMPLOYEE) {
       const isAssignedToMe = task.assigneeType === AssigneeType.USER && task.assigneeId === currentUser.id;
       const isAssignedToMyDept = task.assigneeType === AssigneeType.DEPARTMENT && task.assigneeId === currentUser.department;
       const isSubTaskAssignee = task.subTasks && task.subTasks.some(st => st.assigneeIds.includes(currentUser.id));
       return matchesStatus && matchesSearch && (isAssignedToMe || isAssignedToMyDept || isSubTaskAssignee);
    }
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleOpenModal = (task?: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleOpenHistory = (task: Task) => {
      setSelectedHistoryTaskId(task.id);
      setIsHistoryModalOpen(true);
  };

  const handleShareToGoogle = (task: Task) => {
      // For tasks, we treat them as "Deadlines". We use dueDate as the main date.
      openGoogleCalendar(task.title, task.description, {
          startDate: task.dueDate,
          type: 'TASK'
      });
  };

  const calculateTotalTime = (task: Task) => {
    let total = 0;
    const logs = task.timeLogs || [];
    logs.forEach(log => {
      const start = new Date(log.startTime).getTime();
      const end = log.endTime ? new Date(log.endTime).getTime() : now.getTime();
      total += (end - start);
    });
    return total;
  };

  const getRunningLog = (task: Task) => {
    return task.timeLogs?.find(log => !log.endTime && log.userId === currentUser?.id);
  };

  const handleStartWork = async (task: Task) => {
    if (!currentUser) return;
    const userSubtasks = task.subTasks.filter(st => st.assigneeIds.includes(currentUser.id) && !st.isCompleted);
    const isMainAssignee = task.assigneeId === currentUser.id;
    let selectedSubTaskId: string | undefined = undefined;

    if (userSubtasks.length > 0) {
        const options: Record<string, string> = {};
        if (isMainAssignee) options['MAIN'] = 'تسک اصلی (کلی)';
        userSubtasks.forEach(st => { options[st.id] = `زیروظیفه: ${st.title}`; });

        const { value: choice } = await Swal.fire({
            title: 'انتخاب فعالیت',
            text: 'می‌خواهید روی کدام بخش کار کنید؟',
            input: 'select',
            inputOptions: options,
            inputPlaceholder: 'انتخاب کنید...',
            showCancelButton: true,
            confirmButtonText: 'شروع',
            cancelButtonText: 'انصراف',
            confirmButtonColor: '#01bfbf'
        });
        if (!choice) return;
        if (choice !== 'MAIN') selectedSubTaskId = choice;
    }

    const newLog: TimeLog = { id: uuidv4(), userId: currentUser.id, startTime: new Date().toISOString(), subTaskId: selectedSubTaskId };
    onUpdateTask({ ...task, status: TaskStatus.IN_PROGRESS, isOnBreak: false, timeLogs: [...(task.timeLogs || []), newLog] });
  };

  const handleTakeBreak = (task: Task) => {
    if (!currentUser) return;
    Swal.fire({
      title: 'استراحت',
      text: "آیا می‌خواهید وارد حالت استراحت شوید؟ (تایمر متوقف می‌شود)",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'بله، استراحت',
      cancelButtonText: 'خیر'
    }).then((result) => {
      if (result.isConfirmed) {
        const runningLog = getRunningLog(task);
        let updatedLogs = task.timeLogs || [];
        if (runningLog) {
            updatedLogs = updatedLogs.map(log => log.id === runningLog.id ? { ...log, endTime: new Date().toISOString(), isBreakStart: true } : log);
        }
        onUpdateTask({ ...task, timeLogs: updatedLogs, isOnBreak: true });
      }
    });
  };

  const handleStopTimer = (task: Task) => {
    if (!currentUser) return;
    Swal.fire({
      title: 'پایان کار',
      text: "لطفا توضیحات مختصری در مورد کار انجام شده بنویسید:",
      input: 'textarea',
      inputPlaceholder: 'توضیحات انجام کار...',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'مرحله بعد',
      cancelButtonText: 'انصراف'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const description = result.value || ''; 
        const runningLog = getRunningLog(task);
        const subTaskId = runningLog?.subTaskId;
        const subTask = subTaskId ? task.subTasks.find(st => st.id === subTaskId) : null;
        let markSubtaskAsCompleted = false;

        if (subTask && !subTask.isCompleted) {
            const subtaskResult = await Swal.fire({
                title: 'تکمیل زیروظیفه',
                text: `آیا زیروظیفه «${subTask.title}» به طور کامل انجام شد؟`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                confirmButtonText: 'بله، تیک بخورد',
                cancelButtonText: 'خیر، فقط توقف'
            });
            if (subtaskResult.isConfirmed) markSubtaskAsCompleted = true;
        }

        let updatedLogs = task.timeLogs || [];
        if (runningLog) {
          updatedLogs = updatedLogs.map(log => log.id === runningLog.id ? { ...log, endTime: new Date().toISOString(), isBreakStart: false, description } : log);
        }

        let updatedSubTasks = task.subTasks;
        if (markSubtaskAsCompleted && subTaskId) {
            updatedSubTasks = task.subTasks.map(st => st.id === subTaskId ? { ...st, isCompleted: true } : st);
        }
        onUpdateTask({ ...task, timeLogs: updatedLogs, isOnBreak: false, subTasks: updatedSubTasks });
      }
    });
  };

  const handleCompleteTask = (task: Task) => {
    if (!currentUser) return;
    const runningLog = getRunningLog(task);
    const subTaskId = runningLog?.subTaskId;
    const subTaskName = subTaskId ? task.subTasks.find(st => st.id === subTaskId)?.title : null;
    const isSubTaskCompletion = Boolean(subTaskId && subTaskName);

    if (!isSubTaskCompletion && currentUser.role !== Role.ADMIN) {
         const isMainAssignee = (task.assigneeId === currentUser.id) || (task.assigneeType === AssigneeType.DEPARTMENT && currentUser.department === task.assigneeId);
         if (!isMainAssignee) {
             Swal.fire({ title: 'عدم دسترسی', text: 'تکمیل نهایی وظیفه بر عهده مسئول اصلی یا مدیر است.', icon: 'error' });
             return;
         }
    }

    Swal.fire({
      title: isSubTaskCompletion ? 'تکمیل و ثبت گزارش زیروظیفه' : 'تکمیل و ثبت گزارش نهایی',
      text: isSubTaskCompletion ? `لطفاً گزارش نهایی زیروظیفه «${subTaskName}» را وارد کنید:` : "لطفاً گزارش نهایی کار انجام شده را وارد کنید:",
      input: 'textarea',
      inputPlaceholder: 'توضیحات نهایی...',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'تکمیل و ثبت گزارش',
      cancelButtonText: 'انصراف'
    }).then((result) => {
        if (result.isConfirmed) {
            const reportDescription = result.value || '';
            let updatedLogs = [...(task.timeLogs || [])];
            
            if (runningLog) {
                updatedLogs = updatedLogs.map(log => log.id === runningLog.id ? { ...log, endTime: new Date().toISOString(), description: reportDescription } : log);
            } else {
                // Manual creation of completion log
                updatedLogs.push({
                    id: uuidv4(),
                    userId: currentUser.id,
                    startTime: new Date().toISOString(),
                    endTime: new Date().toISOString(),
                    description: reportDescription,
                    subTaskId: subTaskId || undefined
                });
            }

            let updatedSubTasks = [...task.subTasks];
            if (isSubTaskCompletion && subTaskId) {
                 updatedSubTasks = updatedSubTasks.map(st => st.id === subTaskId ? { ...st, isCompleted: true } : st);
            } else {
                 updatedSubTasks = task.subTasks.map(st => st.assigneeIds.includes(currentUser.id) ? { ...st, isCompleted: true } : st);
            }
            onUpdateTask({ 
              ...task, 
              status: isSubTaskCompletion ? task.status : TaskStatus.COMPLETED, 
              timeLogs: updatedLogs, 
              isOnBreak: false, 
              subTasks: updatedSubTasks 
            });

            Swal.fire({
              icon: 'success',
              title: 'ثبت شد!',
              text: 'گزارش نهایی و وضعیت با موفقیت بروزرسانی شد.',
              timer: 2000,
              showConfirmButton: false
            });
        }
    });
  };

  const handleSoftDeleteTask = (task: Task) => {
      // Rule: Completed tasks cannot be deleted
      if (task.status === TaskStatus.COMPLETED) {
          Swal.fire({
              title: 'خطا',
              text: 'وظایف تکمیل شده قابل حذف نیستند. می‌توانید آن‌ها را آرشیو کنید.',
              icon: 'error',
              confirmButtonText: 'باشه'
          });
          return;
      }

      Swal.fire({
          title: 'انتقال به وظایف حذف شده',
          text: "این وظیفه به لیست حذف شده‌ها منتقل خواهد شد. آیا مطمئن هستید؟",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#d33',
          confirmButtonText: 'بله، حذف شود',
          cancelButtonText: 'انصراف'
      }).then((result) => {
          if (result.isConfirmed) {
              onUpdateTask({ ...task, isDeleted: true });
              Swal.fire('حذف شد!', 'وظیفه به لیست حذف شده‌ها منتقل شد.', 'success');
          }
      });
  };

  const handleArchiveTask = (task: Task) => {
      // Rule: Only Completed tasks can be archived
      if (task.status !== TaskStatus.COMPLETED) {
          Swal.fire({
              title: 'خطا',
              text: 'فقط وظایف تکمیل شده قابل آرشیو هستند.',
              icon: 'error',
              confirmButtonText: 'باشه'
          });
          return;
      }

      if (!currentUser) return;

      // Logic: Only archive if I am assignee or admin. 
      // If Employee, I can only archive if I am the assignee.
      if (currentUser.role === Role.EMPLOYEE) {
         const isAssignee = (task.assigneeType === AssigneeType.USER && task.assigneeId === currentUser.id) ||
                            (task.assigneeType === AssigneeType.DEPARTMENT && task.assigneeId === currentUser.department) ||
                            (task.subTasks.some(st => st.assigneeIds.includes(currentUser.id)));
         
         if (!isAssignee) {
             Swal.fire({
                 title: 'خطا',
                 text: 'شما فقط می‌توانید وظایف مربوط به خودتان را آرشیو کنید.',
                 icon: 'error',
                 confirmButtonText: 'باشه'
             });
             return;
         }
      }

      Swal.fire({
          title: 'آرشیو وظیفه',
          text: "آیا می‌خواهید این وظیفه را به آرشیو منتقل کنید؟",
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#6366f1',
          cancelButtonColor: '#d33',
          confirmButtonText: 'بله، آرشیو کن',
          cancelButtonText: 'انصراف'
      }).then((result) => {
          if (result.isConfirmed) {
              // Add current user ID to archivedBy array
              const currentArchivedBy = task.archivedBy || [];
              const updatedArchivedBy = [...currentArchivedBy, currentUser.id];
              
              onUpdateTask({ ...task, archivedBy: updatedArchivedBy });
              Swal.fire('آرشیو شد!', 'وظیفه با موفقیت آرشیو شد.', 'success');
          }
      });
  };

  useEffect(() => { setCurrentPage(1); }, [filterStatus, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">مدیریت وظایف</h2>
        {currentUser?.role === Role.ADMIN && (
          <button onClick={() => handleOpenModal()} className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95">
            <Plus size={20} />
            <span>وظیفه جدید</span>
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center sticky top-0 z-20 backdrop-blur-xl bg-white/80">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="جستجو..." className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {['ALL', TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.OVERDUE].map((status) => (
            <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === status ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {status === 'ALL' ? 'همه' : status === TaskStatus.TODO ? 'برای انجام' : status === TaskStatus.IN_PROGRESS ? 'در حال انجام' : status === TaskStatus.COMPLETED ? 'تکمیل شده' : 'موعد گذشته'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedTasks.map((task) => {
            const isRunning = !!getRunningLog(task);
            const isOnBreak = task.isOnBreak;
            const assignee = task.assigneeType === AssigneeType.USER ? employees.find(e => e.id === task.assigneeId) : null;
            const isMainAssignee = currentUser?.id === task.assigneeId || (task.assigneeType === AssigneeType.DEPARTMENT && currentUser?.department === task.assigneeId);
            const canManage = currentUser?.role === Role.ADMIN || isMainAssignee;

            // Check if user is relevant (assignee or subtask assignee) to show Archive button
            const isRelevant = isMainAssignee || (task.subTasks && task.subTasks.some(st => st.assigneeIds.includes(currentUser?.id || ''))) || currentUser?.role === Role.ADMIN;


            return (
          <div key={task.id} className={`group bg-white rounded-2xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${isRunning ? 'ring-2 ring-primary shadow-lg shadow-primary/10' : isOnBreak ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/10' : 'border border-gray-100 shadow-sm hover:shadow-md'}`}>
            <div className="p-5 pb-0">
                <div className="flex justify-between items-start mb-3">
                     <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                             {getPriorityBadge(task.priority || TaskPriority.MEDIUM)}
                             {isRunning && <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 animate-pulse border border-red-100"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>در حال کار</span>}
                        </div>
                     </div>
                     <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${task.status === TaskStatus.COMPLETED ? 'bg-green-50 text-green-600' : task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{task.status === TaskStatus.COMPLETED ? 'تکمیل شده' : task.status === TaskStatus.IN_PROGRESS ? 'در حال انجام' : 'برای انجام'}</span>
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-1">{task.title}</h3>
                <p className="text-gray-500 text-sm line-clamp-2 mb-4 h-10">{task.description}</p>
                {task.subTasks.length > 0 && (
                    <div className="mb-4">
                         <div className="flex justify-between text-xs text-gray-400 mb-1">
                             <span>پیشرفت کل</span>
                             <span>{toPersianDigits(Math.round((task.subTasks.filter(st => st.isCompleted).length / task.subTasks.length) * 100))}%</span>
                         </div>
                         <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden"><div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${(task.subTasks.filter(st => st.isCompleted).length / task.subTasks.length) * 100}%` }}></div></div>
                    </div>
                )}
            </div>
            <div className="mt-auto">
                <div className="px-5 flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-2">
                        {assignee ? <UserAvatar src={assignee.avatar} name={assignee.name} className="w-6 h-6 rounded-full border border-gray-100" iconSize={14}/> : <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><Users size={12}/></div>}
                        <span className="truncate max-w-[80px]">{assignee ? assignee.name : task.assigneeId}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded"><Clock size={12} className="text-gray-400"/><span className="font-medium dir-ltr">{toPersianDigits(formatDuration(calculateTotalTime(task)))}</span></div>
                </div>
                <div className="p-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex items-center justify-between">
                     <div className="flex items-center gap-1 text-xs text-gray-400"><Calendar size={14} /><span>{toJalali(task.dueDate)}</span></div>
                     <div className="flex items-center gap-2">
                         {/* Share to Google Calendar */}
                        <button 
                             onClick={() => handleShareToGoogle(task)} 
                             className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors"
                             title="افزودن به تقویم گوگل"
                        >
                             <Share2 size={16} />
                        </button>
                        
                        {/* Actions */}
                        {currentUser?.role === Role.ADMIN && (
                            <button 
                                onClick={() => handleSoftDeleteTask(task)}
                                className={`p-1.5 rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50 ${task.status === TaskStatus.COMPLETED ? 'opacity-30 cursor-not-allowed' : ''}`}
                                title={task.status === TaskStatus.COMPLETED ? "وظایف تکمیل شده قابل حذف نیستند" : "انتقال به وظایف حذف شده"}
                                disabled={task.status === TaskStatus.COMPLETED}
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        
                        {/* Archive Button for everyone who is relevant to the task */}
                        {task.status === TaskStatus.COMPLETED && isRelevant && (
                            <button 
                                onClick={() => handleArchiveTask(task)}
                                className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-indigo-500 hover:bg-indigo-50"
                                title="آرشیو کردن (از دید من)"
                            >
                                <Archive size={16} />
                            </button>
                        )}
                        
                        {canManage && (
                            <button onClick={() => handleOpenModal(task)} className={`p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-xs font-bold flex items-center gap-1 ${currentUser?.role === Role.ADMIN ? 'text-primary' : 'text-blue-600'}`}>
                                <Settings2 size={16} />
                            </button>
                        )}

                        <button onClick={() => handleOpenHistory(task)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"><FileText size={16} /></button>
                        {task.status !== TaskStatus.COMPLETED && !isRunning && !isOnBreak && (
                            <button onClick={() => handleStartWork(task)} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover shadow-sm transition-all text-xs font-bold"><Play size={14} className="fill-current" /> شروع</button>
                        )}
                        {task.status !== TaskStatus.COMPLETED && (isRunning || isOnBreak) && (
                            <div className="flex gap-1">
                                <button onClick={() => isRunning ? handleTakeBreak(task) : handleStartWork(task)} className={`p-1.5 rounded-lg transition-colors ${isRunning ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>{isRunning ? <Coffee size={16} /> : <Play size={16} className="fill-current"/>}</button>
                                <button onClick={() => handleStopTimer(task)} className="p-1.5 bg-red-100 text-red-600 rounded-lg"><Square size={16} className="fill-current" /></button>
                            </div>
                        )}
                        {task.status !== TaskStatus.COMPLETED && <button onClick={() => handleCompleteTask(task)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckSquare size={18} /></button>}
                     </div>
                </div>
            </div>
          </div>
        );
        })}
      </div>

      {isModalOpen && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingTask(undefined); }}
          onSave={(task) => { if (editingTask) onUpdateTask(task); else onAddTask(task); setIsModalOpen(false); setEditingTask(undefined); }}
          employees={employees}
          initialData={editingTask}
          currentUser={currentUser}
        />
      )}
      {selectedHistoryTask && <TaskHistoryModal isOpen={isHistoryModalOpen} onClose={() => { setIsHistoryModalOpen(false); setSelectedHistoryTaskId(null); }} task={selectedHistoryTask} employees={employees} currentUser={currentUser} onAddComment={onAddComment} onEditComment={onEditComment} onDeleteComment={onDeleteComment} />}
    </div>
  );
};

export default Tasks;
