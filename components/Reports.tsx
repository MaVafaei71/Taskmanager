
import React, { useMemo, useState } from 'react';
import { Task, TaskStatus, Role, Employee } from '../types';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, 
    RadialBarChart, RadialBar, Treemap
} from 'recharts';
import { toPersianDigits, toJalali, isOverdue } from '../utils/dateUtils';
import { Clock, Download, FileText, Filter, Calendar as CalendarIcon, User, ListTodo, Layers, CheckCircle2, AlertCircle, BarChart3, PieChart as PieIcon, Activity, Zap, ArrowLeft, Coffee, StopCircle } from 'lucide-react';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import EmployeeSelector from './EmployeeSelector';
import TaskSelector from './TaskSelector';
import UserAvatar from './UserAvatar';

interface ReportsProps {
  tasks: Task[];
  currentUser?: Employee | null;
  employees?: Employee[];
}

type ReportType = 'PERFORMANCE' | 'EMPLOYEE_LOGS' | 'PROJECT_TIME';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

// Custom Content for Treemap
const CustomizedTreemapContent = (props: any) => {
    const { x, y, width, height, payload, fill, name, hours } = props;
    
    // Only show text if box is big enough
    if (width < 60 || height < 40) return null;

    const safeFill = fill || payload?.fill || '#8884d8';
    const safeName = name || payload?.name || 'Unknown';
    const safeHours = hours || payload?.hours || 0;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: safeFill,
            stroke: '#fff',
            strokeWidth: 2,
            rx: 8, // Rounded corners
            ry: 8,
          }}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - 8}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight="bold"
          style={{ fontFamily: 'Vazirmatn' }}
        >
          {safeName.length > 15 ? safeName.substring(0, 15) + '...' : safeName}
        </text>
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          fill="rgba(255,255,255,0.9)"
          fontSize={10}
          style={{ fontFamily: 'Vazirmatn' }}
        >
          {toPersianDigits(safeHours)} ساعت
        </text>
      </g>
    );
};

const Reports: React.FC<ReportsProps> = ({ tasks, currentUser, employees = [] }) => {
  const isEmployee = currentUser?.role === Role.EMPLOYEE;
  
  // --- States ---
  const [dateRange, setDateRange] = useState<any[]>([
      new Date(new Date().setDate(new Date().getDate() - 30)), // 30 days ago
      new Date() // Today
  ]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [reportType, setReportType] = useState<ReportType>('PERFORMANCE');
  const [isReportGenerated, setIsReportGenerated] = useState(false);

  // --- Helpers ---
  const formatDurationMs = (ms: number) => {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms / (1000 * 60)) % 60);
    if (h === 0) return `${toPersianDigits(m)} دقیقه`;
    return `${toPersianDigits(h)} ساعت و ${toPersianDigits(m)} دقیقه`;
  };

  // --- Calculation Logic ---
  const generatedData = useMemo(() => {
      if (!isReportGenerated) return null;

      const startDate = dateRange[0] ? new Date(dateRange[0]) : new Date(0);
      const endDate = dateRange[1] ? new Date(dateRange[1]) : new Date();
      endDate.setHours(23, 59, 59, 999);

      let totalDuration = 0;
      let filteredLogs: any[] = [];
      const activeUserIds = new Set<string>();
      const activeTaskIds = new Set<string>();

      const taskTimeMap = new Map<string, number>();
      const empTimeMap = new Map<string, number>();

      tasks.forEach(task => {
          if (selectedTaskIds.length > 0 && !selectedTaskIds.includes(task.id)) return;

          let taskTotalInPeriod = 0;

          task.timeLogs?.forEach(log => {
              const logStart = new Date(log.startTime);
              if (logStart < startDate || logStart > endDate) return;
              if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes(log.userId)) return;

              const logEnd = log.endTime ? new Date(log.endTime) : new Date();
              const duration = logEnd.getTime() - logStart.getTime();

              totalDuration += duration;
              taskTotalInPeriod += duration;
              activeUserIds.add(log.userId);

              empTimeMap.set(log.userId, (empTimeMap.get(log.userId) || 0) + duration);

              const subTask = log.subTaskId ? task.subTasks.find(st => st.id === log.subTaskId) : null;

              filteredLogs.push({
                  ...log,
                  taskTitle: task.title,
                  subTaskTitle: subTask?.title,
                  duration,
                  userName: employees.find(e => e.id === log.userId)?.name || 'ناشناس',
                  userAvatar: employees.find(e => e.id === log.userId)?.avatar
              });
          });

          if (taskTotalInPeriod > 0) {
              activeTaskIds.add(task.id);
              taskTimeMap.set(task.id, taskTotalInPeriod);
          }
      });

      // --- Prepare Charts Data ---

      // 1. Employee Radial Chart Data
      const employeeChartData = Array.from(empTimeMap.entries()).map(([uid, ms], index) => {
          const emp = employees.find(e => e.id === uid);
          return {
              name: emp ? emp.name : 'ناشناس',
              hours: Number((ms / (1000 * 60 * 60)).toFixed(1)),
              fill: COLORS[index % COLORS.length]
          };
      }).sort((a, b) => b.hours - a.hours); // Radial bar needs sorted data usually, but we keep generic sort

      // 2. Project Treemap Data
      const projectChartData = Array.from(taskTimeMap.entries()).map(([tid, ms], index) => {
          const t = tasks.find(tsk => tsk.id === tid);
          return {
              name: t ? t.title : 'Unknown',
              hours: Number((ms / (1000 * 60 * 60)).toFixed(1)),
              size: ms, // Treemap uses size
              fill: COLORS[index % COLORS.length]
          };
      }).sort((a, b) => b.size - a.size).slice(0, 15); // Top 15 for Treemap

      // 3. Status Counts
      const relevantTasks = tasks.filter(t => {
          if (selectedTaskIds.length > 0 && !selectedTaskIds.includes(t.id)) return false;
          if (selectedEmployeeIds.length === 0) return true;
          const isAssigned = (t.assigneeType === 'USER' && selectedEmployeeIds.includes(t.assigneeId));
          const hasLog = activeTaskIds.has(t.id);
          return isAssigned || hasLog;
      });

      const statusData = [
          { name: 'تکمیل شده', value: relevantTasks.filter(t => t.status === TaskStatus.COMPLETED).length, color: '#10b981' },
          { name: 'در حال انجام', value: relevantTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length, color: '#3b82f6' },
          { name: 'برای انجام', value: relevantTasks.filter(t => t.status === TaskStatus.TODO).length, color: '#f59e0b' },
          { name: 'موعد گذشته', value: relevantTasks.filter(t => t.status !== TaskStatus.COMPLETED && isOverdue(t.dueDate)).length, color: '#ef4444' },
      ].filter(d => d.value > 0);

      const insights = [];
      if (employeeChartData.length > 0) {
          insights.push(`پرتلاش‌ترین کارمند: **${employeeChartData[0].name}** با ${toPersianDigits(employeeChartData[0].hours)} ساعت کار.`);
      }
      if (projectChartData.length > 0) {
          insights.push(`وقت‌گیرترین پروژه: **${projectChartData[0].name}** (${toPersianDigits(projectChartData[0].hours)} ساعت).`);
      }
      const overdueCount = relevantTasks.filter(t => t.status !== TaskStatus.COMPLETED && isOverdue(t.dueDate)).length;
      if (overdueCount > 0) {
          insights.push(`توجه: **${toPersianDigits(overdueCount)}** وظیفه از موعد مقرر گذشته است.`);
      }

      return {
          totalDuration,
          activeUsersCount: activeUserIds.size,
          activeTasksCount: activeTaskIds.size,
          totalTasksCount: relevantTasks.length,
          filteredLogs: filteredLogs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
          employeeChartData,
          projectChartData,
          statusData,
          insights
      };

  }, [isReportGenerated, dateRange, selectedEmployeeIds, selectedTaskIds, tasks, employees]);


  const handleGenerate = () => {
      setIsReportGenerated(true);
  };

  const handlePrint = () => {
      window.print();
  };

  // --- Render Functions ---

  const renderPerformanceReport = (data: any) => (
      <div className="space-y-6 animate-in slide-in-from-bottom-5">
           {/* Summary Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                   <div>
                       <p className="text-gray-500 text-xs mb-1">کل وظایف</p>
                       <h3 className="text-2xl font-bold text-gray-800">{toPersianDigits(data.totalTasksCount)}</h3>
                   </div>
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Layers size={24}/></div>
               </div>
               <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                   <div>
                       <p className="text-gray-500 text-xs mb-1">تکمیل شده</p>
                       <h3 className="text-2xl font-bold text-emerald-600">
                           {toPersianDigits(data.statusData.find((d:any) => d.name === 'تکمیل شده')?.value || 0)}
                       </h3>
                   </div>
                   <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={24}/></div>
               </div>
               <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                   <div>
                       <p className="text-gray-500 text-xs mb-1">موعد گذشته</p>
                       <h3 className="text-2xl font-bold text-red-600">
                           {toPersianDigits(data.statusData.find((d:any) => d.name === 'موعد گذشته')?.value || 0)}
                       </h3>
                   </div>
                   <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertCircle size={24}/></div>
               </div>
               <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                   <div>
                       <p className="text-gray-500 text-xs mb-1">نرخ تکمیل</p>
                       <h3 className="text-2xl font-bold text-purple-600 dir-ltr">
                           {data.totalTasksCount > 0 ? toPersianDigits(Math.round(((data.statusData.find((d:any) => d.name === 'تکمیل شده')?.value || 0) / data.totalTasksCount) * 100)) : 0}%
                       </h3>
                   </div>
                   <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Activity size={24}/></div>
               </div>
           </div>

           {/* Chart & Analysis */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <PieIcon size={20} className="text-primary"/>
                        توزیع وضعیت وظایف
                    </h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.statusData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Vazirmatn'}}
                                />
                                <Legend 
                                    layout="vertical" 
                                    verticalAlign="middle" 
                                    align="right"
                                    iconType="circle"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6">
                     {/* Analysis Box */}
                    <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
                        <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <Zap size={20} className="text-yellow-500 fill-current"/>
                            تحلیل هوشمند
                        </h3>
                        <div className="space-y-3">
                            {data.insights.map((insight: string, idx: number) => (
                                <div key={idx} className="flex gap-3 items-start text-sm text-gray-700 leading-relaxed">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0"></div>
                                    <span dangerouslySetInnerHTML={{__html: insight}}></span>
                                </div>
                            ))}
                            {data.insights.length === 0 && <p className="text-gray-400 text-sm">اطلاعات کافی برای تحلیل وجود ندارد.</p>}
                        </div>
                    </div>
                </div>
           </div>
      </div>
  );

  const renderEmployeeReport = (data: any) => (
      <div className="space-y-6 animate-in slide-in-from-bottom-5">
           {/* Total Time Card */}
           <div className="bg-primary text-white p-6 rounded-2xl shadow-lg shadow-primary/20 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-full">
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="opacity-80 text-sm mb-1">مجموع ساعات کاری ثبت شده</p>
                        <h3 className="text-3xl font-black">{formatDurationMs(data.totalDuration)}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                    <User size={20} />
                    <span className="font-bold">{toPersianDigits(data.activeUsersCount)} نفر فعال</span>
                </div>
            </div>

            {/* Radial Bar Chart - Changed from Bar Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Activity size={20} className="text-primary"/>
                    رتبه‌بندی فعالیت پرسنل (حلقه‌های فعالیت)
                 </h3>
                 <div className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart 
                            innerRadius="15%" 
                            outerRadius="90%" 
                            data={data.employeeChartData} 
                            startAngle={180} 
                            endAngle={0}
                            barSize={30}
                        >
                            <RadialBar
                                label={{ position: 'insideStart', fill: '#fff', fontSize: 12, fontWeight: 'bold' }}
                                background
                                clockWise
                                dataKey="hours"
                                cornerRadius={20}
                            />
                            <Legend 
                                iconSize={10} 
                                layout="vertical" 
                                verticalAlign="middle" 
                                wrapperStyle={{
                                    top: '50%',
                                    right: 0,
                                    transform: 'translate(0, -50%)',
                                    lineHeight: '24px',
                                }}
                            />
                            <RechartsTooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Vazirmatn', direction: 'rtl'}}
                                formatter={(value: number) => [toPersianDigits(value) + ' ساعت', 'کارکرد']}
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>
                 </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-700 flex items-center gap-2">
                    <ListTodo size={18} />
                    ریز کارکرد پرسنل با جزئیات
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-4 w-16">#</th>
                                <th className="px-4 py-4 min-w-[150px]">کارمند</th>
                                <th className="px-4 py-4 min-w-[200px]">وظیفه / پروژه</th>
                                <th className="px-4 py-4 min-w-[180px]">زمان‌بندی</th>
                                <th className="px-4 py-4 min-w-[120px]">وضعیت خروج</th>
                                <th className="px-4 py-4 min-w-[100px] text-center">مدت</th>
                                <th className="px-4 py-4 min-w-[250px]">گزارش کار</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.filteredLogs.map((log: any, idx: number) => {
                                const isBreakEnd = log.isBreakStart;
                                return (
                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-4 text-gray-400">{toPersianDigits(idx + 1)}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar src={log.userAvatar} name={log.userName} className="w-8 h-8 rounded-full border border-gray-100" iconSize={16}/>
                                            <span className="font-bold text-gray-700">{log.userName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium text-gray-800 line-clamp-1" title={log.taskTitle}>{log.taskTitle}</span>
                                            {log.subTaskTitle && (
                                                <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md w-fit">
                                                    <ListTodo size={12}/>
                                                    <span>{log.subTaskTitle}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col text-xs text-gray-600 gap-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <CalendarIcon size={12} className="text-gray-400"/>
                                                <span>{toJalali(log.startTime)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 dir-ltr">
                                                 <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold">
                                                    {toPersianDigits(new Date(log.startTime).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}))}
                                                 </span>
                                                 <ArrowLeft size={10} className="text-gray-300"/>
                                                 {log.endTime ? (
                                                     <span className={`px-1.5 py-0.5 rounded font-bold ${isBreakEnd ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {toPersianDigits(new Date(log.endTime).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}))}
                                                     </span>
                                                 ) : (
                                                     <span className="text-green-600 font-bold animate-pulse text-[10px]">در حال کار...</span>
                                                 )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        {!log.endTime ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-bold">
                                                <Activity size={12} className="animate-spin" />
                                                فعال
                                            </span>
                                        ) : isBreakEnd ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">
                                                <Coffee size={12} />
                                                رفت به استراحت
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">
                                                <StopCircle size={12} />
                                                پایان کار
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="font-bold text-primary dir-ltr bg-primary/5 px-2 py-1 rounded-lg">
                                            {formatDurationMs(log.duration)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        {log.description ? (
                                            <div className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-2 rounded-lg border border-gray-100 max-w-[300px]">
                                                {log.description}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-300 italic">بدون گزارش</span>
                                        )}
                                    </td>
                                </tr>
                            )})}
                            {data.filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-400">
                                        هیچ لاگی در این بازه زمانی یافت نشد.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
      </div>
  );

  const renderProjectReport = (data: any) => (
      <div className="space-y-6 animate-in slide-in-from-bottom-5">
           {/* Summary */}
           <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between">
                <div>
                     <h3 className="text-xl font-bold mb-1">تحلیل زمانی پروژه‌ها</h3>
                     <p className="opacity-80 text-sm">زمان صرف شده روی {toPersianDigits(data.activeTasksCount)} تسک در این بازه</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl"><Layers size={32}/></div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Project Treemap - Changed from Bar Chart */}
               <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6">نقشه حرارتی زمان پروژه‌ها (Treemap)</h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <Treemap
                                data={data.projectChartData}
                                dataKey="size"
                                aspectRatio={4 / 3}
                                stroke="#fff"
                                content={<CustomizedTreemapContent />}
                            >
                                <RechartsTooltip 
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Vazirmatn', direction: 'rtl'}}
                                    formatter={(value: any, name: any, props: any) => [toPersianDigits(props?.payload?.hours ?? 0) + ' ساعت', props?.payload?.name ?? name]}
                                />
                            </Treemap>
                        </ResponsiveContainer>
                    </div>
               </div>

               {/* Top Projects List */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">جزئیات برترین‌ها</h3>
                    <div className="space-y-3">
                        {data.projectChartData.map((p: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span 
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                        style={{ backgroundColor: p.fill }}
                                    >
                                        {toPersianDigits(idx + 1)}
                                    </span>
                                    <span className="text-sm font-medium text-gray-700 truncate" title={p.name}>{p.name}</span>
                                </div>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded dir-ltr whitespace-nowrap">
                                    {toPersianDigits(p.hours)} h
                                </span>
                            </div>
                        ))}
                    </div>
               </div>
           </div>
      </div>
  );


  if (isEmployee) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">گزارش عملکرد شخصی</h2>
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
                این بخش برای دسترسی ادمین طراحی شده است. برای مشاهده کارکرد خود به داشبورد مراجعه کنید.
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">مرکز گزارش‌ها</h2>
                <p className="text-gray-500 mt-1">ساخت گزارش‌های تحلیلی و نموداری</p>
            </div>
            {isReportGenerated && (
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                    <Download size={20} />
                    <span>چاپ گزارش</span>
                </button>
            )}
        </div>

        {/* --- CONFIGURATION PANEL --- */}
        <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 print:hidden">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                <Filter className="text-primary" />
                <h3 className="font-bold text-lg text-gray-800">تنظیمات گزارش</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                {/* 1. Date Range */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                        <CalendarIcon size={16} /> بازه زمانی
                    </label>
                    <DatePicker
                        value={dateRange}
                        onChange={(dates) => { setDateRange(dates); setIsReportGenerated(false); }}
                        range
                        calendar={persian}
                        locale={persian_fa}
                        calendarPosition="bottom-right"
                        inputClass="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none cursor-pointer text-sm"
                        placeholder="انتخاب تاریخ..."
                    />
                </div>

                {/* 2. Report Type */}
                <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                        <FileText size={16} /> نوع گزارش
                    </label>
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                        <button 
                            onClick={() => { setReportType('PERFORMANCE'); setIsReportGenerated(false); }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${reportType === 'PERFORMANCE' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            عملکرد کلی
                        </button>
                        <button 
                            onClick={() => { setReportType('EMPLOYEE_LOGS'); setIsReportGenerated(false); }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${reportType === 'EMPLOYEE_LOGS' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            کارکرد پرسنل
                        </button>
                        <button 
                            onClick={() => { setReportType('PROJECT_TIME'); setIsReportGenerated(false); }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${reportType === 'PROJECT_TIME' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                             زمان پروژه‌ها
                        </button>
                    </div>
                </div>

                {/* 3. Task Filter (New) */}
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                        <ListTodo size={16} /> فیلتر وظایف (اختیاری)
                    </label>
                    <TaskSelector
                        selectedIds={selectedTaskIds}
                        tasks={tasks}
                        onChange={(ids) => { setSelectedTaskIds(ids); setIsReportGenerated(false); }}
                    />
                </div>

                {/* 4. Employee Filter (Optional) */}
                <div className="space-y-2 lg:col-start-4">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                        <User size={16} /> فیلتر کارمندان (اختیاری)
                    </label>
                    <EmployeeSelector 
                        selectedIds={selectedEmployeeIds}
                        employees={employees}
                        onChange={(ids) => { setSelectedEmployeeIds(ids); setIsReportGenerated(false); }}
                        multiple={true}
                        label="همه کارمندان"
                    />
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                <button 
                    onClick={handleGenerate}
                    className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-xl shadow-lg shadow-primary/30 font-bold flex items-center gap-2 transition-transform active:scale-95"
                >
                    <BarChart3 size={20} />
                    ایجاد گزارش و تحلیل
                </button>
            </div>
        </div>

        {/* --- REPORT CONTENT --- */}
        {isReportGenerated && generatedData ? (
            <div className="min-h-[400px]">
                {reportType === 'PERFORMANCE' && renderPerformanceReport(generatedData)}
                {reportType === 'EMPLOYEE_LOGS' && renderEmployeeReport(generatedData)}
                {reportType === 'PROJECT_TIME' && renderProjectReport(generatedData)}
            </div>
        ) : (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <BarChart3 size={40} className="text-gray-300" />
                </div>
                <h3 className="text-gray-500 font-bold text-lg">منتظر ایجاد گزارش...</h3>
                <p className="text-gray-400 text-sm mt-1">لطفاً پارامترهای بالا را تنظیم کرده و دکمه ایجاد گزارش را بزنید.</p>
            </div>
        )}
    </div>
  );
};

export default Reports;
