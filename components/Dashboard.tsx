
import React, { useMemo, useState, useEffect } from 'react';
import { Task, TaskStatus, Employee, Role, AssigneeType, TimeLog, TaskPriority, RemoteLog, RemoteAttendance, RemoteWorkSettings } from '../types';
import { isOverdue, isNearDeadline, toJalali, toPersianDigits } from '../utils/dateUtils';
import { Activity, CheckCircle2, AlertTriangle, Clock, Calendar, PlayCircle, Play, Pause, Square, Timer, CheckSquare, Coffee, Eye, X, StopCircle, Check, AlertCircle, ListTodo, Monitor, Video, Radio, Power, Wifi, MousePointer2, Loader2, Globe, Laptop } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, Label } from 'recharts';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';
import UserAvatar from './UserAvatar';

interface DashboardProps {
  tasks: Task[];
  currentUser?: Employee | null;
  employees?: Employee[];
  onUpdateTask: (task: Task) => void;
  isRemoteModuleActive?: boolean;
  remoteLogs?: RemoteLog[];
  // New props for Remote Attendance
  remoteAttendanceSession?: RemoteAttendance | null;
  allRemoteAttendance?: RemoteAttendance[]; // For Admin View
  onRemoteAction?: {
      start: () => void;
      break: () => void;
      resume: () => void;
      end: () => void;
  };
  remoteSettings?: RemoteWorkSettings;
  isIdle?: boolean;
  isRemoteActionLoading?: boolean;
  monitoringType?: 'SYSTEM' | 'BROWSER'; // New Prop
}

// Memoized Chart Component to prevent re-renders on timer ticks
const DashboardStatsChart = React.memo(({ data, totalCount }: { data: any[], totalCount: number }) => {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
          return (
            <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100 text-xs text-right z-50 min-w-[120px]">
              <p className="font-bold mb-2 text-sm" style={{color: payload[0].payload.color}}>{payload[0].name}</p>
              <div className="flex justify-between items-center gap-4 text-gray-600 mb-1">
                 <span>تعداد:</span>
                 <span className="font-bold text-gray-800 text-sm">{toPersianDigits(payload[0].value)}</span>
              </div>
              <div className="flex justify-between items-center gap-4 text-gray-400">
                 <span>سهم:</span>
                 <span>{toPersianDigits(Math.round((payload[0].value / totalCount) * 100))}%</span>
              </div>
            </div>
          );
        }
        return null;
    };

    return (
        <div className="flex-1 min-h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                    <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="gradInProgress" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="gradTodo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="gradOverdue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
                    </linearGradient>
                </defs>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={5}
                    cornerRadius={6}
                    dataKey="value"
                    stroke="none"
                >
                    {data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.gradientUrl} />
                    ))}
                    <Label
                        content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                const { cx, cy } = viewBox;
                                return (
                                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                                        <tspan x={cx} y={cy} dy="-5" fontSize="36" fill="#1f2937" fontWeight="900" fontFamily="Vazirmatn">
                                            {toPersianDigits(totalCount)}
                                        </tspan>
                                        <tspan x={cx} y={cy} dy="24" fontSize="12" fill="#9ca3af" fontFamily="Vazirmatn">
                                            کل وظایف
                                        </tspan>
                                    </text>
                                );
                            }
                            return null;
                        }}
                        position="center"
                    />
                </Pie>
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value, entry: any) => (
                        <span className="text-xs text-gray-600 font-medium ml-2">{value}</span>
                    )}
                />
              </PieChart>
            </ResponsiveContainer>
        </div>
    );
});
DashboardStatsChart.displayName = 'DashboardStatsChart';

// --- New Remote Attendance Toolbar ---
const RemoteAttendanceToolbar = ({ 
    session, 
    actions,
    isIdle,
    isLoading,
    monitoringType
}: { 
    session: RemoteAttendance | null | undefined, 
    actions: { start: () => void, break: () => void, resume: () => void, end: () => void },
    isIdle?: boolean,
    isLoading?: boolean,
    monitoringType?: 'SYSTEM' | 'BROWSER'
}) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!session || session.status === 'COMPLETED') return;
        
        const calcTime = () => {
            const now = Date.now();
            const start = new Date(session.startTime).getTime();
            
            // Subtract break times
            let breakTime = 0;
            session.breaks.forEach(b => {
                const bStart = new Date(b.startTime).getTime();
                const bEnd = b.endTime ? new Date(b.endTime).getTime() : now;
                breakTime += (bEnd - bStart);
            });

            setElapsed(Math.max(0, now - start - breakTime));
        };

        calcTime();
        const interval = setInterval(calcTime, 1000);
        return () => clearInterval(interval);
    }, [session]);

    const formatTime = (ms: number) => {
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms / (1000 * 60)) % 60);
        const s = Math.floor((ms / 1000) % 60);
        return `${toPersianDigits(h)}:${toPersianDigits(m)}:${toPersianDigits(s)}`;
    };

    if (!session) {
        return (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between mb-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                        <Monitor size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-indigo-900">ثبت تردد دورکاری</h3>
                        <p className="text-xs text-indigo-600">برای شروع محاسبه ساعت کاری دکمه شروع را بزنید</p>
                    </div>
                </div>
                <button 
                    onClick={actions.start}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Power size={18} />}
                    {isLoading ? 'در حال ثبت...' : 'شروع کار'}
                </button>
            </div>
        );
    }

    const isBreak = session.status === 'BREAK';
    const showIdleAlert = !isBreak && isIdle;

    return (
        <div className={`rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between mb-6 shadow-sm border transition-colors duration-500 relative ${
            showIdleAlert ? 'bg-red-50 border-red-200 animate-pulse' :
            isBreak ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'
        }`}>
             <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                <div className={`p-3 rounded-xl ${
                    showIdleAlert ? 'bg-red-100 text-red-600' :
                    isBreak ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                }`}>
                    {showIdleAlert ? <AlertTriangle size={24} /> : (isBreak ? <Coffee size={24} /> : <Radio size={24} />)}
                </div>
                <div>
                    <h3 className={`font-bold ${
                        showIdleAlert ? 'text-red-900' :
                        isBreak ? 'text-amber-900' : 'text-indigo-900'
                    }`}>
                        {showIdleAlert ? 'هشدار: عدم فعالیت' : (isBreak ? 'وضعیت: استراحت' : 'وضعیت: در حال کار (دورکاری)')}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xl font-black dir-ltr ${
                             showIdleAlert ? 'text-red-600' :
                             isBreak ? 'text-amber-600' : 'text-indigo-600'
                        }`}>
                            {formatTime(elapsed)}
                        </span>
                        
                        {!isBreak && monitoringType && (
                            <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${monitoringType === 'SYSTEM' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                {monitoringType === 'SYSTEM' ? <Monitor size={10}/> : <Globe size={10}/>}
                                {monitoringType === 'SYSTEM' ? 'مانیتورینگ سیستم' : 'فقط تب مرورگر'}
                            </span>
                        )}
                    </div>
                    {showIdleAlert && (
                         <p className="text-[10px] text-red-600 mt-1 font-bold">
                             {monitoringType === 'SYSTEM' ? 'سیستم قفل شده یا بدون فعالیت است' : 'لطفاً به تب مرورگر برگردید و موس را حرکت دهید'}
                         </p>
                    )}
                    {!showIdleAlert && !isBreak && monitoringType === 'BROWSER' && (
                         <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-1.5 flex items-center gap-1.5">
                             <AlertTriangle size={12} className="text-orange-500 shrink-0" />
                             <p className="text-[10px] text-orange-700 font-medium">
                                 توجه: مانیتورینگ فقط در این تب فعال است. با تغییر تب، عدم فعالیت ثبت می‌شود.
                             </p>
                         </div>
                    )}
                </div>
             </div>

             <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                 {isBreak ? (
                     <button 
                        onClick={actions.resume}
                        disabled={isLoading}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                     >
                         {isLoading ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={18} />}
                         ادامه کار
                     </button>
                 ) : (
                     <button 
                        onClick={actions.break}
                        disabled={isLoading}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-100 text-amber-700 px-5 py-2.5 rounded-xl font-bold border border-amber-200 hover:bg-amber-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                     >
                         {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Coffee size={18} />}
                         استراحت
                     </button>
                 )}
                 <div className="w-px h-8 bg-gray-300 mx-1 hidden md:block"></div>
                 <button 
                    onClick={actions.end}
                    disabled={isLoading}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-100 text-red-600 px-5 py-2.5 rounded-xl font-bold border border-red-200 hover:bg-red-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                     {isLoading ? <Loader2 size={18} className="animate-spin" /> : <StopCircle size={18} />}
                     پایان کار
                 </button>
             </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ 
    tasks, 
    currentUser, 
    employees, 
    onUpdateTask, 
    isRemoteModuleActive, 
    remoteLogs = [],
    remoteAttendanceSession,
    allRemoteAttendance = [],
    onRemoteAction,
    remoteSettings,
    isIdle,
    isRemoteActionLoading,
    monitoringType
}) => {
  const isEmployee = currentUser?.role === Role.EMPLOYEE;
  const isAdmin = currentUser?.role === Role.ADMIN;
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [now, setNow] = useState(new Date());

  // State for Details Modal
  const [selectedActiveSession, setSelectedActiveSession] = useState<{emp: Employee, task: Task} | null>(null);

  // Update timer display every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter tasks based on role (Modified to include Subtask Assignments)
  const relevantTasks = useMemo(() => {
    if (!isEmployee || !currentUser) return tasks;
    return tasks.filter(task => 
      // 1. Direct Assignee
      (task.assigneeType === AssigneeType.USER && task.assigneeId === currentUser.id) ||
      // 2. Department Assignee
      (task.assigneeType === AssigneeType.DEPARTMENT && task.assigneeId === currentUser.department) ||
      // 3. Subtask Assignee (NEW)
      (task.subTasks && task.subTasks.some(st => st.assigneeIds.includes(currentUser.id)))
    );
  }, [tasks, currentUser, isEmployee]);

  // Find currently running task or task on break
  const activeTask = useMemo(() => {
    if (!currentUser) return null;
    return relevantTasks.find(task => 
        task.isOnBreak || 
        task.timeLogs?.some(log => !log.endTime && log.userId === currentUser.id)
    );
  }, [relevantTasks, currentUser]);

  // Tasks available to start (TODO or IN_PROGRESS but not currently running or on break)
  const availableToStartTasks = useMemo(() => {
     return relevantTasks.filter(task => 
        task.status !== TaskStatus.COMPLETED && task.id !== activeTask?.id
     );
  }, [relevantTasks, activeTask]);

  // Initialize selected task if empty
  useEffect(() => {
    if (!selectedTaskId && availableToStartTasks.length > 0) {
        setSelectedTaskId(availableToStartTasks[0].id);
    }
  }, [availableToStartTasks, selectedTaskId]);

  const stats = useMemo(() => {
    const active = relevantTasks.filter(t => t.status === TaskStatus.TODO || t.status === TaskStatus.IN_PROGRESS).length;
    const completed = relevantTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const overdue = relevantTasks.filter(t => t.status !== TaskStatus.COMPLETED && isOverdue(t.dueDate)).length;
    const near = relevantTasks.filter(t => t.status !== TaskStatus.COMPLETED && isNearDeadline(t.dueDate)).length;
    const inProgress = relevantTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;

    return { active, completed, overdue, near, inProgress };
  }, [relevantTasks]);

  const urgentTasks = useMemo(() => {
    return relevantTasks
      .filter(t => t.status !== TaskStatus.COMPLETED && (isOverdue(t.dueDate) || isNearDeadline(t.dueDate) || t.priority === TaskPriority.URGENT))
      .sort((a, b) => {
          // Priority Order: Urgent > High > Medium > Low
          const priorityOrder = { [TaskPriority.URGENT]: 0, [TaskPriority.HIGH]: 1, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 3 };
          const pA = priorityOrder[a.priority || TaskPriority.MEDIUM] ?? 2;
          const pB = priorityOrder[b.priority || TaskPriority.MEDIUM] ?? 2;
          if (pA !== pB) return pA - pB;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
      .slice(0, 5);
  }, [relevantTasks]);

  // --- Logic for Active Task Employees (Admin View) ---
  const activeEmployeeTaskSessions = useMemo(() => {
    if (!employees || !isAdmin) return [];
    const sessions: Array<{ emp: Employee, task: Task, status: 'WORKING' | 'BREAK', startTime?: string, subTaskTitle?: string }> = [];
    
    employees.forEach(emp => {
        // 1. Check if employee has a running timer (WORKING)
        // Find ANY task where this user has an open log
        const workingTask = tasks.find(t => 
            t.timeLogs?.some(l => l.userId === emp.id && !l.endTime)
        );
        
        if (workingTask) {
            const log = workingTask.timeLogs.find(l => l.userId === emp.id && !l.endTime);
            // Find subtask name if applicable
            const subTask = log?.subTaskId ? workingTask.subTasks.find(st => st.id === log.subTaskId) : undefined;
            
            sessions.push({ 
                emp, 
                task: workingTask, 
                status: 'WORKING',
                startTime: log?.startTime,
                subTaskTitle: subTask?.title
            });
            return; // Skip break check if working
        }

        // 2. Check if employee is ON BREAK
        const breakTask = tasks.find(t => 
            t.isOnBreak && 
            (
                (t.assigneeType === AssigneeType.USER && t.assigneeId === emp.id) ||
                (t.timeLogs?.length > 0 && t.timeLogs[t.timeLogs.length-1].userId === emp.id)
            )
        );

        if (breakTask) {
             const lastLog = breakTask.timeLogs[breakTask.timeLogs.length -1];
             const subTask = lastLog?.subTaskId ? breakTask.subTasks.find(st => st.id === lastLog.subTaskId) : undefined;
             sessions.push({ emp, task: breakTask, status: 'BREAK', subTaskTitle: subTask?.title });
        }
    });
    return sessions;
  }, [tasks, employees, isAdmin]);

  // --- Logic for Active Remote Sessions (Admin View) ---
  const activeRemoteSessions = useMemo(() => {
      if (!employees || !isAdmin || !isRemoteModuleActive) return [];
      
      const activeSessions = allRemoteAttendance?.filter(s => s.status !== 'COMPLETED') || [];
      
      return activeSessions.map(session => {
          const emp = employees.find(e => e.id === session.userId);
          if (!emp) return null;
          
          return {
              session,
              emp
          };
      }).filter(Boolean) as Array<{ session: RemoteAttendance, emp: Employee }>;
  }, [allRemoteAttendance, employees, isAdmin, isRemoteModuleActive]);

  // --- Handlers for Quick Actions ---

  const handleStartWork = async (taskId?: string) => {
    // ... (rest of function same as before)
    const idToStart = taskId || selectedTaskId;
    if (!currentUser || !idToStart) return;
    const task = tasks.find(t => t.id === idToStart);
    if (!task) return;

    // Detect User Subtasks
    const userSubtasks = task.subTasks.filter(st => st.assigneeIds.includes(currentUser.id) && !st.isCompleted);
    const isMainAssignee = task.assigneeId === currentUser.id;

    let selectedSubTaskId: string | undefined = undefined;

    if (userSubtasks.length > 0) {
        const options: Record<string, string> = {};
        if (isMainAssignee) {
             options['MAIN'] = 'تسک اصلی (کلی)';
        }
        userSubtasks.forEach(st => {
            options[st.id] = `زیروظیفه: ${st.title}`;
        });

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
        if (choice !== 'MAIN') {
            selectedSubTaskId = choice;
        }
    }

    const newLog: TimeLog = {
      id: uuidv4(),
      userId: currentUser.id,
      startTime: new Date().toISOString(),
      subTaskId: selectedSubTaskId
    };

    const updatedTask = {
      ...task,
      status: TaskStatus.IN_PROGRESS,
      isOnBreak: false,
      timeLogs: [...(task.timeLogs || []), newLog]
    };

    onUpdateTask(updatedTask);
    
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
    
    Toast.fire({
      icon: 'success',
      title: 'تایمر شروع شد'
    });
  };

  const handleTakeBreak = () => {
    // ... (rest of function same as before)
    if (!currentUser || !activeTask) return;

    Swal.fire({
      title: 'استراحت',
      text: "آیا می‌خواهید کار را موقتا متوقف کنید و به حالت استراحت بروید؟",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#d33',
      confirmButtonText: 'بله، استراحت',
      cancelButtonText: 'خیر'
    }).then((result) => {
      if (result.isConfirmed) {
        let updatedLogs = activeTask.timeLogs;
        const activeLog = activeTask.timeLogs.find(log => !log.endTime && log.userId === currentUser.id);
        
        if (activeLog) {
            updatedLogs = activeTask.timeLogs.map(log => {
                if (log.id === activeLog.id) {
                    return { ...log, endTime: new Date().toISOString(), isBreakStart: true };
                }
                return log;
            });
        }

        onUpdateTask({ 
            ...activeTask, 
            timeLogs: updatedLogs,
            isOnBreak: true 
        });

        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
          
          Toast.fire({
            icon: 'info',
            title: 'حالت استراحت فعال شد'
          });
      }
    });
  };

  const handleStopTimer = () => {
    // ... (rest of function same as before)
     if (!currentUser || !activeTask) return;

    Swal.fire({
      title: 'پایان کار',
      text: "لطفا توضیحات مختصری در مورد کار انجام شده بنویسید:",
      input: 'textarea',
      inputPlaceholder: 'مثلا: اصلاح باگ لاگین...',
      inputAttributes: {
        'aria-label': 'توضیحات انجام کار'
      },
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6b7280', 
      cancelButtonColor: '#d33',
      confirmButtonText: 'مرحله بعد',
      cancelButtonText: 'انصراف'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const description = result.value || '';
        const activeLog = activeTask.timeLogs.find(log => !log.endTime && log.userId === currentUser.id);
        const subTaskId = activeLog?.subTaskId;
        const subTask = subTaskId ? activeTask.subTasks.find(st => st.id === subTaskId) : null;

        let markSubtaskAsCompleted = false;

        if (subTask && !subTask.isCompleted) {
            const subtaskResult = await Swal.fire({
                title: 'تکمیل زیروظیفه',
                text: `آیا زیروظیفه «${subTask.title}» به طور کامل انجام شد؟`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                confirmButtonText: 'بله، تیک بخورد',
                cancelButtonText: 'خیر، فقط توقف تایمر'
            });
            if (subtaskResult.isConfirmed) {
                markSubtaskAsCompleted = true;
            }
        }

        let updatedLogs = activeTask.timeLogs;
        if (activeLog) {
          updatedLogs = activeTask.timeLogs.map(log => {
            if (log.id === activeLog.id) {
              return { 
                  ...log, 
                  endTime: new Date().toISOString(), 
                  isBreakStart: false,
                  description: description 
              };
            }
            return log;
          });
        }

        let updatedSubTasks = activeTask.subTasks;
        if (markSubtaskAsCompleted && subTaskId) {
            updatedSubTasks = activeTask.subTasks.map(st => 
                st.id === subTaskId ? { ...st, isCompleted: true } : st
            );
        }

        onUpdateTask({ 
            ...activeTask, 
            timeLogs: updatedLogs, 
            isOnBreak: false, 
            subTasks: updatedSubTasks 
        });
        
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
        
        Toast.fire({
          icon: 'success',
          title: 'کار متوقف و گزارش ثبت شد'
        });
      }
    });
  };

  const handleCompleteTask = () => {
    // ... (rest of function same as before)
    if (!currentUser) return;
    
    const taskToComplete = activeTask || tasks.find(t => t.id === selectedTaskId);
    if (!taskToComplete) return;

    const activeLog = taskToComplete.timeLogs.find(log => !log.endTime && log.userId === currentUser.id);
    const subTaskId = activeLog?.subTaskId;
    const subTaskName = subTaskId ? taskToComplete.subTasks.find(st => st.id === subTaskId)?.title : null;
    
    const isSubTaskCompletion = Boolean(subTaskId && subTaskName);

    if (!isSubTaskCompletion && currentUser.role !== Role.ADMIN) {
         const isMainAssignee = (taskToComplete.assigneeId === currentUser.id) ||
                                (taskToComplete.assigneeType === AssigneeType.DEPARTMENT && taskToComplete.assigneeId === currentUser.department);
         
         if (!isMainAssignee) {
             Swal.fire({
                 title: 'عدم دسترسی',
                 text: 'شما فقط مجاز به تکمیل زیروظیفه‌های خود هستید. تکمیل نهایی وظیفه بر عهده مسئول اصلی است.',
                 icon: 'error',
                 confirmButtonText: 'متوجه شدم'
             });
             return;
         }
    }

    let confirmText = "لطفاً گزارش نهایی کار انجام شده را وارد کنید:";
    let confirmBtnText = 'تکمیل و ثبت گزارش';

    if (isSubTaskCompletion) {
        confirmText = `لطفاً گزارش نهایی زیروظیفه «${subTaskName}» را وارد کنید:`;
        confirmBtnText = 'تکمیل زیروظیفه و ثبت';
    }

    Swal.fire({
      title: isSubTaskCompletion ? 'تکمیل و ثبت گزارش زیروظیفه' : 'تکمیل و ثبت گزارش نهایی',
      text: confirmText,
      input: 'textarea',
      inputPlaceholder: 'توضیحات نهایی کار...',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#d33',
      confirmButtonText: confirmBtnText,
      cancelButtonText: 'انصراف'
    }).then((result) => {
      if (result.isConfirmed) {
        const reportDescription = result.value || '';
        let updatedLogs = [...taskToComplete.timeLogs];

        if (activeLog) {
            updatedLogs = updatedLogs.map(log => {
            if (log.id === activeLog.id) {
              return { ...log, endTime: new Date().toISOString(), isBreakStart: false, description: reportDescription };
            }
            return log;
          });
        } else {
          updatedLogs.push({
            id: uuidv4(),
            userId: currentUser.id,
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            description: reportDescription,
            subTaskId: subTaskId || undefined
          });
        }

        let updatedSubTasks = [...taskToComplete.subTasks];
        if (isSubTaskCompletion && subTaskId) {
            updatedSubTasks = updatedSubTasks.map(st => 
                st.id === subTaskId ? { ...st, isCompleted: true } : st
            );
        } else {
             updatedSubTasks = updatedSubTasks.map(st => {
                if (st.assigneeIds.includes(currentUser.id)) {
                    return { ...st, isCompleted: true };
                }
                return st;
            });
        }

        let newStatus = taskToComplete.status;
        if (!isSubTaskCompletion) {
            newStatus = TaskStatus.COMPLETED;
        }

        onUpdateTask({ 
          ...taskToComplete, 
          status: newStatus, 
          timeLogs: updatedLogs, 
          isOnBreak: false, 
          subTasks: updatedSubTasks
        });

        Swal.fire({
            icon: 'success',
            title: 'ثبت شد!',
            text: isSubTaskCompletion ? 'زیروظیفه و گزارش با موفقیت ثبت شد.' : 'وظیفه و گزارش نهایی با موفقیت ثبت شد.',
            timer: 2000,
            showConfirmButton: false
        });
      }
    });
  };

  // Helper to calculate total accumulated time for the user on this task
  const getTotalUserDuration = (task: Task | null) => {
      if (!task || !currentUser) return 0;
      const userLogs = task.timeLogs?.filter(log => log.userId === currentUser.id) || [];
      
      return userLogs.reduce((acc, log) => {
          const start = new Date(log.startTime).getTime();
          // If no endTime, use 'now' (currently running)
          const end = log.endTime ? new Date(log.endTime).getTime() : now.getTime();
          return acc + (end - start);
      }, 0);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // --- Chart Data (Modern Donut with Vibrant Gradients) ---
  const pieChartData = useMemo(() => {
    // Distinct Categories
    const completed = relevantTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const overdue = relevantTasks.filter(t => t.status !== TaskStatus.COMPLETED && isOverdue(t.dueDate)).length;
    const inProgress = relevantTasks.filter(t => t.status === TaskStatus.IN_PROGRESS && !isOverdue(t.dueDate)).length;
    const todo = relevantTasks.filter(t => t.status === TaskStatus.TODO && !isOverdue(t.dueDate)).length;

    return [
      { name: 'تکمیل شده', value: completed, color: '#10b981', gradientUrl: 'url(#gradCompleted)' },
      { name: 'در حال انجام', value: inProgress, color: '#3b82f6', gradientUrl: 'url(#gradInProgress)' },
      { name: 'برای انجام', value: todo, color: '#f59e0b', gradientUrl: 'url(#gradTodo)' },
      { name: 'موعد گذشته', value: overdue, color: '#ef4444', gradientUrl: 'url(#gradOverdue)' },
    ].filter(item => item.value > 0);
  }, [relevantTasks]);

  const totalTasksCount = relevantTasks.length;

  // Helper to get active subtask name
  const getActiveSubTaskName = () => {
      if (!activeTask || !currentUser) return null;
      const activeLog = activeTask.timeLogs.find(log => !log.endTime && log.userId === currentUser.id);
      if (activeLog && activeLog.subTaskId) {
          const st = activeTask.subTasks.find(s => s.id === activeLog.subTaskId);
          return st ? st.title : null;
      }
      return null;
  };

  const activeSubTaskName = getActiveSubTaskName();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">داشبورد {isEmployee ? 'شخصی' : ''}</h2>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100 text-gray-600 text-sm">
            <Calendar size={16} className="text-primary"/>
            <span>امروز: {toJalali(new Date().toISOString())}</span>
        </div>
      </div>

      {/* --- REMOTE WORK ATTENDANCE TOOLBAR --- */}
      {isEmployee && remoteSettings?.isEnabled && onRemoteAction && (
          <RemoteAttendanceToolbar 
            session={remoteAttendanceSession} 
            actions={onRemoteAction} 
            isIdle={isIdle}
            isLoading={isRemoteActionLoading}
            monitoringType={monitoringType}
          />
      )}

      {/* --- MINIMAL QUICK ACTION MODULE --- */}
      {isEmployee && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 relative overflow-hidden">
            {activeTask ? (
                // STATE: Work In Progress OR On Break
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                        <div className={`relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 ${activeTask.isOnBreak ? 'bg-amber-50 text-amber-500 border border-amber-100' : 'bg-primary-light text-primary border border-primary/10'}`}>
                             {!activeTask.isOnBreak && <span className="absolute inline-flex h-full w-full rounded-2xl bg-primary opacity-10 animate-ping"></span>}
                             {activeTask.isOnBreak ? <Coffee size={28} /> : <Timer size={28} />}
                        </div>
                        <div className="min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${activeTask.isOnBreak ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                                    {activeTask.isOnBreak ? 'وضعیت: استراحت' : 'وضعیت: در حال کار'}
                                </span>
                                {/* Always show total duration to simulate resuming */}
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-md text-gray-500 font-bold tracking-wider">
                                    {toPersianDigits(formatDuration(getTotalUserDuration(activeTask)))}
                                </span>
                             </div>
                             <div className="flex items-center gap-2">
                                <h3 className="font-bold text-gray-800 truncate text-lg leading-tight mb-0.5">{activeTask.title}</h3>
                                {activeSubTaskName && (
                                    <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        <ListTodo size={12} className="ml-1"/>
                                        {activeSubTaskName}
                                    </div>
                                )}
                             </div>
                             <p className="text-xs text-gray-400 truncate">برای ثبت نهایی، دکمه تکمیل را بزنید</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end py-2 md:py-0">
                        {/* Break / Resume Button */}
                        {activeTask.isOnBreak ? (
                             <button 
                                onClick={() => handleStartWork(activeTask.id)}
                                className="group relative w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:scale-110 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200"
                                title="ادامه کار"
                            >
                                <Play size={24} className="fill-current ml-0.5" />
                            </button>
                        ) : (
                            <button 
                                onClick={handleTakeBreak}
                                className="group relative w-12 h-12 flex items-center justify-center rounded-full bg-amber-50 text-amber-500 border border-amber-100 hover:bg-amber-500 hover:text-white hover:border-amber-500 shadow-sm hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-200"
                                title="استراحت"
                            >
                                <Coffee size={22} />
                            </button>
                        )}
                        
                        <button 
                            onClick={handleStopTimer}
                            className="group relative w-12 h-12 flex items-center justify-center rounded-full bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-sm hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200"
                            title="توقف کار (ثبت گزارش)"
                        >
                            <Square size={20} className="fill-current" />
                        </button>

                        <div className="w-px h-8 bg-gray-200 mx-1"></div>

                        <button 
                            onClick={handleCompleteTask}
                            className="group relative w-12 h-12 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200"
                            title={activeSubTaskName ? "تکمیل و گزارش زیروظیفه" : "تکمیل و گزارش نهایی"}
                        >
                            <Check size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            ) : (
                // STATE: Select & Start (Minimal)
                <div className="flex flex-col md:flex-row items-center gap-4">
                     <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                        <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-gray-100 text-gray-400 border border-gray-200">
                             <PlayCircle size={24} />
                        </div>
                        <div className="flex-1">
                            {availableToStartTasks.length > 0 ? (
                                <select 
                                    value={selectedTaskId}
                                    onChange={(e) => setSelectedTaskId(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none text-sm transition-all"
                                >
                                    {availableToStartTasks.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.title} {t.subTasks.some(st => st.assigneeIds.includes(currentUser?.id || '')) ? '(دارای زیروظیفه)' : ''}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <span className="text-sm text-gray-400">هیچ وظیفه فعالی برای شروع وجود ندارد.</span>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={() => handleStartWork()}
                        disabled={availableToStartTasks.length === 0}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        <Play size={20} className="fill-current" />
                        <span>شروع کار</span>
                    </button>
                </div>
            )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={isEmployee ? "وظایف فعال من" : "تسک‌های فعال"}
          count={stats.active}
          icon={Activity}
          color="bg-blue-50 text-blue-600"
          borderColor="border-blue-200"
        />
        <StatCard
          title={isEmployee ? "تکمیل شده توسط من" : "تکمیل شده"}
          count={stats.completed}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600"
          borderColor="border-emerald-200"
        />
        <StatCard
          title="موعد گذشته"
          count={stats.overdue}
          icon={AlertTriangle}
          color="bg-red-50 text-red-600"
          borderColor="border-red-200"
        />
        <StatCard
          title={isEmployee ? "در حال انجام" : "نزدیک به اتمام"}
          count={isEmployee ? stats.inProgress : stats.near}
          icon={isEmployee ? PlayCircle : Clock}
          color="bg-amber-50 text-amber-600"
          borderColor="border-amber-200"
        />
      </div>

      {/* --- ADMIN ONLY: REMOTE PERSONNEL STATUS (NEW) --- */}
      {isAdmin && isRemoteModuleActive && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-indigo-50/50">
                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Monitor size={20} />
                </div>
                <h3 className="font-bold text-gray-800">وضعیت دورکاری پرسنل</h3>
                <span className="text-xs bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full">
                    {toPersianDigits(activeRemoteSessions.length)} نفر فعال
                </span>
            </div>

            <div className="p-4">
                {activeRemoteSessions.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {activeRemoteSessions.map(({session, emp}, idx) => {
                             const isBreak = session.status === 'BREAK';
                             
                             // Calculate Idle State based on latest log
                             const userLogs = remoteLogs.filter(l => l.userId === emp.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                             const lastLog = userLogs[0];
                             const isIdle = !isBreak && lastLog && lastLog.type === 'ACTIVITY_ALERT' && (Date.now() - new Date(lastLog.timestamp).getTime() < 12 * 60 * 60 * 1000);

                             return (
                                <div key={idx} className={`flex flex-col gap-3 p-3 rounded-xl border shadow-sm transition-all ${
                                    isIdle ? 'bg-red-50 border-red-200 animate-pulse' : 
                                    isBreak ? 'bg-amber-50 border-amber-200' : 
                                    'bg-indigo-50 border-indigo-200'
                                }`}>
                                     <div className="flex items-center gap-3">
                                         <UserAvatar 
                                            src={emp.avatar} 
                                            name={emp.name}
                                            className={`w-12 h-12 rounded-full border-2 shadow-sm ${isIdle ? 'border-red-100' : 'border-white'}`}
                                            iconSize={20}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-800 truncate">{emp.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                                    isIdle ? 'bg-red-100 text-red-700' :
                                                    !isBreak ? 'bg-indigo-100 text-indigo-700' : 
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {isIdle ? 'هشدار: عدم فعالیت' : (isBreak ? 'استراحت دورکاری' : 'در حال دورکاری')}
                                                </span>
                                                <span className="text-[10px] text-gray-500 dir-ltr">
                                                     {toPersianDigits(new Date(session.startTime).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}))}
                                                </span>
                                            </div>
                                        </div>
                                     </div>
                                </div>
                             );
                         })}
                     </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 text-sm flex flex-col items-center">
                        <Monitor size={32} className="mb-2 opacity-50" />
                        <p>در حال حاضر هیچ کارمندی در حالت دورکاری نیست.</p>
                    </div>
                )}
            </div>
          </div>
      )}

      {/* --- ADMIN ONLY: ACTIVE EMPLOYEES MONITORING (TASKS) --- */}
      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                    <Activity size={20} />
                </div>
                <h3 className="font-bold text-gray-800">وضعیت فعالیت روی تسک‌ها</h3>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {toPersianDigits(activeEmployeeTaskSessions.length)} نفر فعال
                </span>
            </div>
            
            <div className="p-4">
                {activeEmployeeTaskSessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeEmployeeTaskSessions.map((session, idx) => (
                            <div key={idx} className="flex flex-col gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <UserAvatar 
                                            src={session.emp.avatar} 
                                            name={session.emp.name}
                                            className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                                            iconSize={20}
                                        />
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${session.status === 'WORKING' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-gray-800 truncate">{session.emp.name}</h4>
                                        <p className="text-xs text-gray-500 truncate mb-1">{session.task.title}</p>
                                        {session.subTaskTitle && (
                                            <p className="text-[10px] text-gray-400 truncate mb-1 bg-gray-50 rounded px-1">↳ {session.subTaskTitle}</p>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${session.status === 'WORKING' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {session.status === 'WORKING' ? 'مشغول کار' : 'در حال استراحت'}
                                            </span>
                                            {session.status === 'WORKING' && session.startTime && (
                                                <span className="text-[10px] text-gray-400 dir-ltr">
                                                    {toPersianDigits(new Date(session.startTime).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}))}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedActiveSession(session)}
                                        className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                                        title="مشاهده جزئیات"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 text-sm flex flex-col items-center">
                        <Coffee size={32} className="mb-2 opacity-50" />
                        <p>در حال حاضر هیچ کارمندی روی تسکی فعال نیست.</p>
                    </div>
                )}
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart Section - Modern Donut Style */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-2">آمار کلی وظایف</h3>
          {/* Use Memoized Chart */}
          <DashboardStatsChart data={pieChartData} totalCount={totalTasksCount} />
        </div>

        {/* Urgent Tasks Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">نیاز به توجه فوری</h3>
          <div className="space-y-4">
            {urgentTasks.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <CheckCircle2 className="mx-auto mb-2 opacity-50" size={48} />
                <p>هیچ وظیفه فوری وجود ندارد. عالیه!</p>
              </div>
            ) : (
              urgentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-r-4 border-red-500 hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0 ml-4">
                    <div className="flex items-center gap-2 mb-1">
                        {task.priority === TaskPriority.URGENT && <AlertCircle size={14} className="text-red-500" />}
                        <h4 className="font-semibold text-gray-800 truncate">{task.title}</h4>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{toJalali(task.dueDate)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        isOverdue(task.dueDate) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isOverdue(task.dueDate) ? 'موعد گذشته' : 'نزدیک موعد'}
                      </span>
                      {task.priority === TaskPriority.URGENT && (
                          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">فوری</span>
                      )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- DETAILS MODAL --- */}
      {selectedActiveSession && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                 <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                     <h3 className="font-bold text-gray-800">جزئیات کارکرد امروز</h3>
                     <button onClick={() => setSelectedActiveSession(null)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                         <X size={20} />
                     </button>
                 </div>
                 <div className="p-6">
                     <div className="flex items-center gap-4 mb-6">
                         <UserAvatar 
                            src={selectedActiveSession.emp.avatar} 
                            name={selectedActiveSession.emp.name}
                            className="w-16 h-16 rounded-full border-4 border-gray-100"
                            iconSize={32}
                         />
                         <div>
                             <h4 className="font-bold text-lg text-gray-800">{selectedActiveSession.emp.name}</h4>
                             <p className="text-sm text-gray-500">{selectedActiveSession.task.title}</p>
                         </div>
                     </div>
                     
                     <div className="space-y-3">
                         <h5 className="text-sm font-bold text-gray-700 border-r-2 border-primary pr-2">تاریخچه زمان‌ها (تسک جاری)</h5>
                         <div className="max-h-60 overflow-y-auto pr-1">
                             {selectedActiveSession.task.timeLogs
                                ?.filter(l => l.userId === selectedActiveSession.emp.id)
                                .sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                                .map((log, i) => {
                                    const isBreakLog = log.isBreakStart;
                                    const subTaskName = log.subTaskId ? selectedActiveSession.task.subTasks.find(st => st.id === log.subTaskId)?.title : null;

                                    return (
                                    <div key={i} className="flex flex-col p-3 bg-gray-50 rounded-lg text-sm mb-2 last:mb-0 gap-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                                <span className="text-gray-600">شروع: {toPersianDigits(new Date(log.startTime).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'}))}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {log.endTime ? (
                                                    <>
                                                        <span className={`w-2 h-2 rounded-full ${isBreakLog ? 'bg-amber-400' : 'bg-gray-400'}`}></span>
                                                        <span className="text-gray-600">
                                                            {isBreakLog ? 'شروع استراحت:' : 'پایان:'} {toPersianDigits(new Date(log.endTime).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'}))}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs animate-pulse font-bold">در حال کار</span>
                                                )}
                                            </div>
                                        </div>
                                        {subTaskName && (
                                            <div className="text-xs text-blue-600 font-medium">↳ زیروظیفه: {subTaskName}</div>
                                        )}
                                        {log.description && (
                                            <div className="text-xs text-gray-500 bg-white p-2 rounded border border-gray-100">
                                                {log.description}
                                            </div>
                                        )}
                                    </div>
                                )})
                             }
                             {(!selectedActiveSession.task.timeLogs || selectedActiveSession.task.timeLogs.filter(l => l.userId === selectedActiveSession.emp.id).length === 0) && (
                                 <p className="text-gray-400 text-sm text-center">هیچ لاگی ثبت نشده است.</p>
                             )}
                         </div>
                     </div>
                 </div>
             </div>
        </div>
      )}

    </div>
  );
};

const StatCard = ({ title, count, icon: Icon, color, borderColor }: any) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border-b-4 ${borderColor} flex items-center justify-between transition-transform hover:-translate-y-1 duration-200`}>
    <div>
      <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{toPersianDigits(count)}</p>
    </div>
    <div className={`p-4 rounded-xl ${color}`}>
      <Icon size={24} />
    </div>
  </div>
);

export default Dashboard;
