
import React, { useState, useEffect, useMemo } from 'react';
import { Employee, RemoteWorkSettings, RemoteLog, RemoteAttendance } from '../types';
import { Monitor, Lock, Settings2, Globe, Clock, X, Save, RotateCcw, MousePointer2, LayoutGrid, List, AlertTriangle, User, Coffee, PlayCircle, CalendarClock, Wifi, Calendar as CalendarIcon, Filter, Eye, ArrowRight, Download, Building2, Slash, Timer, CloudUpload } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { saveRemoteGlobalSettings, loadRemoteGlobalSettings, saveRemoteEmployeeSettings, loadRemoteEmployeeSettings, saveRemoteModulePurchased } from '../utils/storage';
import { apiSaveAppSettings, apiFetchAppSettings } from '../utils/api';
import { toPersianDigits, toJalali } from '../utils/dateUtils';
import Swal from 'sweetalert2';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import EmployeeSelector from './EmployeeSelector';

interface RemoteWorkProps {
  currentView: string; 
  employees: Employee[];
  logs?: RemoteLog[];
  activeSessions?: RemoteAttendance[];
  isPurchased: boolean;
  onPurchase: () => void;
}

const DEFAULT_SETTINGS: RemoteWorkSettings = {
  isEnabled: false,
  checkInactivity: false,
  inactivityThreshold: 5,
};

const MonitoringCard: React.FC<{ session: RemoteAttendance, emp: Employee, isIdle: boolean }> = ({ session, emp, isIdle }) => {
    // Internal state to force re-render every minute for accurate duration
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const calculateDuration = () => {
        const start = new Date(session.startTime).getTime();
        
        let breakTime = 0;
        session.breaks.forEach(b => {
            const bStart = new Date(b.startTime).getTime();
            const bEnd = b.endTime ? new Date(b.endTime).getTime() : now;
            breakTime += (bEnd - bStart);
        });

        const diff = Math.max(0, now - start - breakTime);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        
        return `${hours} ساعت و ${mins} دقیقه`;
    };

    const isBreak = session.status === 'BREAK';
    const showIdleAlert = !isBreak && isIdle;

    return (
        <div className={`rounded-2xl border overflow-hidden shadow-sm transition-all hover:shadow-md 
            ${showIdleAlert ? 'bg-red-50 border-red-500 animate-pulse' : 
                isBreak ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`
        }>
            {/* Header Status */}
            <div className={`p-3 flex items-center justify-between border-b 
                ${showIdleAlert ? 'bg-red-500 border-red-500 text-white' : 
                    isBreak ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`
            }>
                    <div className="flex items-center gap-2 text-xs font-bold">
                        {showIdleAlert ? <AlertTriangle size={14} className="text-white"/> : (isBreak ? <Coffee size={14} /> : <PlayCircle size={14} />)}
                        {showIdleAlert ? 'عدم فعالیت!' : (isBreak ? 'در حال استراحت' : 'در حال کار')}
                    </div>
                    {!isBreak && !showIdleAlert && (
                        <div className="flex items-center gap-1.5 bg-white/50 px-2 py-0.5 rounded-full">
                            <div className={`w-2 h-2 rounded-full bg-green-500 animate-pulse`}></div>
                            <span className="text-[10px] opacity-70">آنلاین</span>
                        </div>
                    )}
                    {showIdleAlert && (
                        <div className="bg-white/20 px-2 py-0.5 rounded-full">
                            <span className="text-[10px] font-bold text-white">هشدار</span>
                        </div>
                    )}
            </div>

            <div className="p-5 flex flex-col items-center">
                    <div className="relative mb-3">
                    <UserAvatar src={emp.avatar} name={emp.name} className={`w-16 h-16 rounded-full border-4 shadow-sm ${showIdleAlert ? 'border-red-200' : 'border-white'}`} iconSize={28} />
                    {showIdleAlert && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white p-1.5 rounded-full border-2 border-white animate-bounce" title="هشدار عدم فعالیت">
                            <AlertTriangle size={14} />
                        </div>
                    )}
                    </div>
                    
                    <h4 className="font-bold text-gray-800 text-lg mb-1">{emp.name}</h4>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg mb-4">{emp.department}</span>
                    
                    <div className="w-full grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="bg-white/50 p-2 rounded-lg border border-gray-100">
                            <p className="text-gray-400 mb-1">شروع</p>
                            <p className="font-bold dir-ltr">{toPersianDigits(new Date(session.startTime).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}))}</p>
                        </div>
                        <div className="bg-white/50 p-2 rounded-lg border border-gray-100">
                            <p className="text-gray-400 mb-1">مدت مفید</p>
                            <p className="font-bold dir-ltr">{toPersianDigits(calculateDuration())}</p>
                        </div>
                    </div>
            </div>

            {/* Footer */}
            {!isBreak && (
                <div className={`px-4 py-2 border-t text-[10px] flex items-center justify-between
                    ${showIdleAlert ? 'bg-red-100 border-red-200 text-red-600 font-bold' : 'bg-gray-50 border-gray-100 text-gray-400'}`
                }>
                    <span className="flex items-center gap-1"><Wifi size={10}/> {showIdleAlert ? 'وضعیت: غیرفعال' : 'اتصال برقرار'}</span>
                    <span>Pars Task Agent</span>
                </div>
            )}
        </div>
    );
};

const SettingsForm = ({ 
    initialData, 
    onSave, 
    onCancel, 
    isGlobal,
    onReset,
    isSaving
  }: { 
    initialData: RemoteWorkSettings, 
    onSave: (s: RemoteWorkSettings) => void, 
    onCancel: () => void,
    isGlobal: boolean,
    onReset?: () => void,
    isSaving?: boolean
  }) => {
      const [formData, setFormData] = useState(initialData);

      // Sync form data if initial data changes (e.g. after fetching)
      useEffect(() => {
          setFormData(initialData);
      }, [initialData]);

      return (
          <div className="space-y-6">
              {/* Enable Toggle */}
              <div className={`p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-colors ${formData.isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                   onClick={() => setFormData({...formData, isEnabled: !formData.isEnabled})}
              >
                  <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                          <Monitor size={20} />
                      </div>
                      <div>
                          <h4 className="font-bold text-gray-800">فعال کردن دورکاری</h4>
                          <p className="text-xs text-gray-500">{formData.isEnabled ? 'ماژول برای کاربر فعال است' : 'دسترسی دورکاری غیرفعال است'}</p>
                      </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${formData.isEnabled ? 'translate-x-0' : '-translate-x-6'}`}></div>
                  </div>
              </div>

              <div className={`space-y-5 transition-opacity ${!formData.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  
                  {/* Mouse & Keyboard */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                          <MousePointer2 className="text-blue-500" size={20} />
                          <h4 className="font-bold text-gray-700">بررسی فعالیت (موس و کیبورد)</h4>
                      </div>
                      <div className="flex items-center gap-4">
                           <label className="flex items-center gap-2 cursor-pointer">
                               <input 
                                  type="checkbox" 
                                  checked={formData.checkInactivity} 
                                  onChange={(e) => setFormData({...formData, checkInactivity: e.target.checked})}
                                  className="w-5 h-5 text-primary rounded focus:ring-primary/50"
                               />
                               <span className="text-sm text-gray-600">ارسال هشدار عدم فعالیت</span>
                           </label>
                           {formData.checkInactivity && (
                               <div className="flex items-center gap-2 mr-auto bg-gray-50 px-3 py-1 rounded-lg">
                                   <span className="text-xs text-gray-500">حساسیت:</span>
                                   <input 
                                      type="number" 
                                      min="1" 
                                      max="60"
                                      value={formData.inactivityThreshold}
                                      onChange={(e) => setFormData({...formData, inactivityThreshold: parseInt(e.target.value) || 5})}
                                      className="w-12 text-center bg-white border border-gray-300 rounded text-sm p-1"
                                   />
                                   <span className="text-xs text-gray-500">دقیقه توقف</span>
                               </div>
                           )}
                      </div>
                  </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                  {onReset && (
                      <button onClick={onReset} className="px-4 py-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl font-medium text-sm flex items-center gap-2">
                          <RotateCcw size={16} />
                          بازنشانی
                      </button>
                  )}
                  <div className="flex-1"></div>
                  <button onClick={onCancel} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium text-sm">انصراف</button>
                  <button 
                    onClick={() => onSave(formData)} 
                    disabled={isSaving}
                    className="px-6 py-2 bg-primary text-white hover:bg-primary-hover rounded-xl font-medium text-sm shadow-lg shadow-primary/30 flex items-center gap-2 disabled:opacity-50"
                  >
                      {isSaving ? 'در حال ذخیره...' : (isGlobal ? 'ذخیره تنظیمات سراسری' : 'ذخیره تنظیمات فردی')}
                      {!isSaving && <CloudUpload size={16} />}
                  </button>
              </div>
          </div>
      );
};

const MonitoringView = ({ employees, activeSessions, logs }: { employees: Employee[], activeSessions: RemoteAttendance[], logs: RemoteLog[] }) => {
      // Force re-render every 10s to keep "Idle State" calculation fresh
      const [_, setTick] = useState(0);
      useEffect(() => {
          const timer = setInterval(() => setTick(t => t + 1), 10000);
          return () => clearInterval(timer);
      }, []);

      // Filter active sessions that are not completed
      const liveData = activeSessions.filter(s => s.status !== 'COMPLETED').map(session => {
          const emp = employees.find(e => e.id === session.userId);
          
          // Get the very last log for this user
          const userLogs = logs.filter(l => l.userId === session.userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          const lastLog = userLogs[0];
          
          // Logic: If the LAST log was an alert, they are idle. 
          // If the LAST log was RESUMED (or anything else recent), they are active.
          // We also keep the 2 minute buffer just in case the alert is very old (e.g. from yesterday's session that wasn't closed properly)
          const isIdle = lastLog && lastLog.type === 'ACTIVITY_ALERT' && (Date.now() - new Date(lastLog.timestamp).getTime() < 12 * 60 * 60 * 1000); // 12 hours max alert validity

          return { session, emp, isIdle };
      });

      return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in">
              {liveData.map(({ session, emp, isIdle }) => {
                  if (!emp) return null;
                  return <MonitoringCard key={session.id} session={session} emp={emp} isIdle={!!isIdle} />;
              })}

              {liveData.length === 0 && (
                  <div className="col-span-full text-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                      <User size={48} className="mx-auto mb-4 opacity-20" />
                      <p>هیچ کارمندی در حال حاضر آنلاین نیست.</p>
                  </div>
              )}
          </div>
      );
};

const ReportsView = ({ employees, activeSessions, logs }: { employees: Employee[], activeSessions: RemoteAttendance[], logs: RemoteLog[] }) => {
      // --- States ---
      const [viewStep, setViewStep] = useState<'FILTER' | 'LIST'>('FILTER');
      const [dateRange, setDateRange] = useState<any[]>([new Date(), new Date()]);
      const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
      const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);

      // --- Helpers ---
      const uniqueDepartments = useMemo(() => {
        const depts = new Set(employees.map(e => e.department));
        return Array.from(depts).filter(d => d && d !== 'نامشخص');
      }, [employees]);

      // --- Handlers ---
      const handleGetReport = () => {
          if (selectedEmpIds.length === 0) {
              Swal.fire('خطا', 'لطفا حداقل یک کارمند را انتخاب کنید', 'error');
              return;
          }
          setViewStep('LIST');
      };

      const handleShowDetails = (emp: Employee) => {
          setDetailEmployee(emp);
      };

      // --- Filtered Data Helpers ---
      const filteredEmployees = useMemo(() => {
          return employees.filter(e => selectedEmpIds.includes(e.id));
      }, [employees, selectedEmpIds]);

      const getEmployeeSessions = (empId: string) => {
          if (!dateRange || dateRange.length < 2) return [];
          const start = new Date(dateRange[0]);
          start.setHours(0,0,0,0);
          const end = new Date(dateRange[1]);
          end.setHours(23,59,59,999);

          return activeSessions.filter(s => {
              const sTime = new Date(s.startTime);
              return s.userId === empId && sTime >= start && sTime <= end;
          }).sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      };

      // Calculation Functions
      const getBreakDetails = (breaks: any[]) => {
          let total = 0;
          let periods: string[] = [];
          
          breaks.forEach(b => {
             const start = new Date(b.startTime);
             const end = b.endTime ? new Date(b.endTime) : new Date(); // If ongoing
             total += (end.getTime() - start.getTime());
             
             periods.push(`${toPersianDigits(start.toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'}))} تا ${toPersianDigits(end.toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'}))}`);
          });
          
          return { total, periods };
      };

      const getInactivityDetails = (session: RemoteAttendance) => {
          const sessionStart = new Date(session.startTime).getTime();
          const sessionEnd = session.endTime ? new Date(session.endTime).getTime() : Date.now();
          
          // Filter logs for this session
          const sessionLogs = logs.filter(l => {
              const t = new Date(l.timestamp).getTime();
              // Check if log belongs to this user and is within session bounds
              return l.userId === session.userId && t >= sessionStart && t <= sessionEnd;
          }).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          let totalIdle = 0;
          let periods: string[] = [];
          
          // Iterate to find Alert -> Resume pairs
          for(let i = 0; i < sessionLogs.length; i++) {
              if (sessionLogs[i].type === 'ACTIVITY_ALERT') {
                  const startIdle = new Date(sessionLogs[i].timestamp);
                  
                  // Find next resume or end of logs
                  let resumeLog = sessionLogs.slice(i + 1).find(l => l.type === 'ACTIVITY_RESUMED');
                  
                  // If no resume log found, assume idle until session end (or now if active)
                  let endIdleTime = resumeLog ? new Date(resumeLog.timestamp).getTime() : sessionEnd;
                  
                  // If resume log exists, update index to skip processed logs is optional but Resume logs are just markers
                  
                  // Calculate
                  const duration = endIdleTime - startIdle.getTime();
                  if (duration > 0) {
                      totalIdle += duration;
                      periods.push(`${toPersianDigits(startIdle.toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'}))} تا ${toPersianDigits(new Date(endIdleTime).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'}))}`);
                  }
              }
          }
          
          return { totalIdle, periods };
      };

      const formatMs = (ms: number) => {
          const h = Math.floor(ms / (1000 * 60 * 60));
          const m = Math.floor((ms / (1000 * 60)) % 60);
          if (h === 0 && m === 0) return '0';
          if (h === 0) return `${toPersianDigits(m)} دقیقه`;
          return `${toPersianDigits(h)} ساعت و ${toPersianDigits(m)} دقیقه`;
      };

      // --- VIEW: FILTER (Step 1) ---
      if (viewStep === 'FILTER') {
          return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5">
                  <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                          <Filter size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800">گزارش‌گیری دورکاری</h3>
                      <p className="text-gray-500 mt-2">برای مشاهده جزئیات تردد، بازه زمانی و کارمندان را انتخاب کنید</p>
                  </div>

                  <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                  <CalendarIcon size={16} /> از تاریخ
                              </label>
                              <DatePicker
                                  value={dateRange[0]}
                                  onChange={(date) => {
                                      const newRange = [...dateRange];
                                      newRange[0] = date;
                                      setDateRange(newRange);
                                  }}
                                  calendar={persian}
                                  locale={persian_fa}
                                  calendarPosition="bottom-right"
                                  inputClass="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none cursor-pointer text-sm font-medium"
                                  placeholder="انتخاب تاریخ شروع"
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                  <CalendarIcon size={16} /> تا تاریخ
                              </label>
                              <DatePicker
                                  value={dateRange[1]}
                                  onChange={(date) => {
                                      const newRange = [...dateRange];
                                      newRange[1] = date;
                                      setDateRange(newRange);
                                  }}
                                  calendar={persian}
                                  locale={persian_fa}
                                  calendarPosition="bottom-right"
                                  inputClass="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none cursor-pointer text-sm font-medium"
                                  placeholder="انتخاب تاریخ پایان"
                              />
                          </div>
                      </div>

                      {/* Department Select */}
                      <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                <Building2 size={16} /> انتخاب سریع دپارتمان
                            </label>
                            <select
                                onChange={(e) => {
                                    const dept = e.target.value;
                                    if(dept) {
                                        const ids = employees.filter(emp => emp.department === dept).map(e => e.id);
                                        setSelectedEmpIds(ids);
                                    }
                                }}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none text-sm appearance-none"
                            >
                                <option value="">انتخاب دپارتمان...</option>
                                {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                      </div>

                      <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                              <User size={16} /> انتخاب کارمندان
                          </label>
                          <EmployeeSelector 
                              selectedIds={selectedEmpIds}
                              employees={employees}
                              onChange={setSelectedEmpIds}
                              multiple={true}
                              label="جستجو و انتخاب کارمندان یا دپارتمان..."
                          />
                      </div>

                      <button 
                          onClick={handleGetReport}
                          className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
                      >
                          <List size={20} />
                          دریافت گزارش
                      </button>
                  </div>
              </div>
          );
      }

      // --- VIEW: LIST (Step 2) ---
      return (
          <div className="space-y-6 animate-in fade-in">
              {/* Header with Back Button */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                      <button onClick={() => setViewStep('FILTER')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                          <ArrowRight size={20} />
                      </button>
                      <div>
                          <h3 className="font-bold text-gray-800">آرشیو گزارشات انتخابی</h3>
                          <p className="text-xs text-gray-500">لیست پرسنل انتخاب شده برای مشاهده جزئیات</p>
                      </div>
                  </div>
                  <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                      {toPersianDigits(filteredEmployees.length)} نفر
                  </div>
              </div>

              {/* Employee Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredEmployees.map(emp => (
                      <div key={emp.id} className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-primary/50 hover:shadow-md transition-all group">
                          <div className="flex items-center justify-between mb-4">
                              <UserAvatar src={emp.avatar} name={emp.name} className="w-14 h-14 rounded-full border border-gray-100" />
                              <button 
                                  onClick={() => handleShowDetails(emp)}
                                  className="p-2.5 bg-gray-50 text-gray-400 group-hover:bg-primary group-hover:text-white rounded-xl transition-all shadow-sm"
                                  title="مشاهده جزئیات"
                              >
                                  <Eye size={20} />
                              </button>
                          </div>
                          <h4 className="font-bold text-gray-800 text-lg mb-1">{emp.name}</h4>
                          <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{emp.department}</span>
                              <span className="text-xs text-primary font-bold">
                                  {toPersianDigits(getEmployeeSessions(emp.id).length)} تردد
                              </span>
                          </div>
                      </div>
                  ))}
              </div>

              {/* DETAILS MODAL */}
              {detailEmployee && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                      <div className="bg-white w-full max-w-[95vw] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                          <div className="p-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <UserAvatar src={detailEmployee.avatar} name={detailEmployee.name} className="w-10 h-10 rounded-full" />
                                  <div>
                                      <h3 className="font-bold text-gray-800">جزئیات کارکرد: {detailEmployee.name}</h3>
                                      <p className="text-xs text-gray-500">لیست ترددها و جزئیات دقیق فعالیت</p>
                                  </div>
                              </div>
                              <button onClick={() => setDetailEmployee(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                                  <X size={24} />
                              </button>
                          </div>

                          <div className="flex-1 overflow-auto p-0">
                              <table className="w-full text-right text-xs md:text-sm">
                                  <thead className="bg-white text-gray-500 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                      <tr>
                                          <th className="p-3 bg-gray-50 w-24">تاریخ</th>
                                          <th className="p-3 bg-gray-50 w-20">شروع</th>
                                          <th className="p-3 bg-gray-50 w-20">پایان</th>
                                          <th className="p-3 bg-gray-50 text-center w-24">مدت کل</th>
                                          
                                          {/* Merged Columns */}
                                          <th className="p-3 bg-gray-50 w-40 text-center border-r border-gray-200">استراحت</th>
                                          <th className="p-3 bg-gray-50 w-40 text-center border-r border-gray-200">عدم فعالیت</th>
                                          
                                          <th className="p-3 bg-gray-50 w-28 text-center text-primary font-bold border-r border-gray-200">مفید کاری</th>
                                          <th className="p-3 bg-gray-50 w-24 text-center">وضعیت</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {getEmployeeSessions(detailEmployee.id).map(session => {
                                          const isActive = session.status !== 'COMPLETED';
                                          
                                          const breakData = getBreakDetails(session.breaks);
                                          const idleData = getInactivityDetails(session);
                                          
                                          // Calculate Gross Duration (Start to End/Now)
                                          const startMs = new Date(session.startTime).getTime();
                                          const endMs = session.endTime ? new Date(session.endTime).getTime() : Date.now();
                                          const grossDuration = endMs - startMs;
                                          
                                          // Useful = Gross - Break - Idle
                                          const usefulDuration = Math.max(0, grossDuration - breakData.total - idleData.totalIdle);

                                          return (
                                              <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                                                  {/* General Info */}
                                                  <td className="p-3 font-medium text-gray-700 whitespace-nowrap">
                                                      {toJalali(session.startTime)}
                                                  </td>
                                                  <td className="p-3 dir-ltr text-right text-gray-600 font-bold">
                                                      {toPersianDigits(new Date(session.startTime).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'}))}
                                                  </td>
                                                  <td className="p-3 dir-ltr text-right text-gray-600 font-bold">
                                                      {session.endTime ? toPersianDigits(new Date(session.endTime).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})) : <span className="text-green-500 animate-pulse text-[10px]">فعال</span>}
                                                  </td>
                                                  <td className="p-3 text-center text-gray-500 dir-ltr">
                                                      {formatMs(grossDuration)}
                                                  </td>

                                                  {/* Merged Break Info */}
                                                  <td className="p-3 text-center border-r border-gray-100 align-top">
                                                      <div className="flex flex-col items-center gap-1">
                                                          <span className={`font-bold px-2 py-0.5 rounded text-xs ${breakData.total > 0 ? 'text-amber-700 bg-amber-50' : 'text-gray-300'}`}>
                                                              {breakData.total > 0 ? formatMs(breakData.total) : '0'}
                                                          </span>
                                                          {breakData.periods.length > 0 && (
                                                              <div className="flex flex-col gap-1 mt-1 w-full">
                                                                  {breakData.periods.map((p, idx) => (
                                                                      <span key={idx} className="text-[10px] text-gray-500 bg-gray-50 rounded px-1 whitespace-nowrap border border-gray-100">
                                                                          {p}
                                                                      </span>
                                                                  ))}
                                                              </div>
                                                          )}
                                                      </div>
                                                  </td>

                                                  {/* Merged Inactivity Info */}
                                                  <td className="p-3 text-center border-r border-gray-100 align-top">
                                                      <div className="flex flex-col items-center gap-1">
                                                          <span className={`font-bold px-2 py-0.5 rounded text-xs ${idleData.totalIdle > 0 ? 'text-red-700 bg-red-50' : 'text-gray-300'}`}>
                                                              {idleData.totalIdle > 0 ? formatMs(idleData.totalIdle) : '0'}
                                                          </span>
                                                          {idleData.periods.length > 0 && (
                                                              <div className="flex flex-col gap-1 mt-1 w-full">
                                                                  {idleData.periods.map((p, idx) => (
                                                                      <span key={idx} className="text-[10px] text-gray-500 bg-gray-50 rounded px-1 whitespace-nowrap border border-gray-100">
                                                                          {p}
                                                                      </span>
                                                                  ))}
                                                              </div>
                                                          )}
                                                      </div>
                                                  </td>

                                                  {/* Useful Time */}
                                                  <td className="p-3 text-center font-black text-emerald-600 bg-emerald-50/20 border-r border-gray-100 text-sm dir-ltr">
                                                      {formatMs(usefulDuration)}
                                                  </td>

                                                  {/* Status */}
                                                  <td className="p-3 text-center">
                                                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                          {isActive ? 'در حال کار' : 'پایان یافته'}
                                                      </span>
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                      {getEmployeeSessions(detailEmployee.id).length === 0 && (
                                          <tr>
                                              <td colSpan={8} className="p-10 text-center text-gray-400">
                                                  هیچ ترددی در این بازه ثبت نشده است.
                                              </td>
                                          </tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
};

const RemoteWork: React.FC<RemoteWorkProps> = ({ currentView, employees, logs = [], activeSessions = [], isPurchased, onPurchase }) => {
  const [globalSettings, setGlobalSettings] = useState<RemoteWorkSettings>(DEFAULT_SETTINGS);
  const [employeeSettingsMap, setEmployeeSettingsMap] = useState<Record<string, RemoteWorkSettings>>({});
  
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  
  // Loading states for saving
  const [isSaving, setIsSaving] = useState(false);

  // Initialize data on mount from API
  useEffect(() => {
    const fetchData = async () => {
        try {
            const savedGlobal = await apiFetchAppSettings('remote_global');
            if (savedGlobal) {
                setGlobalSettings({ ...DEFAULT_SETTINGS, ...savedGlobal });
            }

            const savedEmp = await apiFetchAppSettings('remote_emp_settings');
            if (savedEmp) {
                setEmployeeSettingsMap(savedEmp);
            }
        } catch (e) {
            console.error("Failed to fetch settings", e);
        }
    };
    fetchData();
  }, []);

  // --- Logic Helpers ---
  const getEmployeeSettings = (empId: string): { settings: RemoteWorkSettings, isCustom: boolean } => {
      if (employeeSettingsMap[empId]) {
          return { settings: { ...DEFAULT_SETTINGS, ...employeeSettingsMap[empId] }, isCustom: true };
      }
      return { settings: globalSettings, isCustom: false };
  };

  // --- Save Handlers (Updated to use API) ---
  const handleSaveGlobalSettings = async (settings: RemoteWorkSettings) => {
      setIsSaving(true);
      try {
          setGlobalSettings(settings);
          // Save to server
          await apiSaveAppSettings('remote_global', settings);
          setIsGlobalModalOpen(false);
          Swal.fire({ icon: 'success', title: 'ذخیره شد', text: 'تنظیمات سراسری با موفقیت اعمال شد.', timer: 2000, showConfirmButton: false });
      } catch (error) {
          console.error("Failed to save global settings", error);
          Swal.fire('خطا', 'مشکلی در ذخیره تنظیمات روی سرور پیش آمد.', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const handleUpdateEmployeeSettings = async (empId: string, newSettings: RemoteWorkSettings | undefined) => {
      setIsSaving(true);
      try {
          const updatedMap = { ...employeeSettingsMap };
          if (newSettings === undefined) {
              delete updatedMap[empId];
          } else {
              updatedMap[empId] = newSettings;
          }
          setEmployeeSettingsMap(updatedMap);
          // Save all employee specific settings map to server
          await apiSaveAppSettings('remote_emp_settings', updatedMap);
          
          setEditingEmployeeId(null);
          Swal.fire({ 
              icon: 'success', 
              title: newSettings === undefined ? 'بازنشانی شد' : 'ذخیره شد', 
              text: newSettings === undefined ? 'تنظیمات کاربر به حالت سراسری بازگشت.' : 'تنظیمات اختصاصی کاربر ذخیره شد.',
              timer: 2000, 
              showConfirmButton: false 
          });
      } catch (error) {
          console.error("Failed to save employee settings", error);
          Swal.fire('خطا', 'مشکلی در ذخیره تنظیمات روی سرور پیش آمد.', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const handlePurchase = () => {
      Swal.fire({
            title: 'خرید ماژول',
            text: 'در حال انتقال به درگاه پرداخت...',
            icon: 'info',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            onPurchase();
            saveRemoteModulePurchased(true);
        });
  };
  
  // --- Purchase Lock Screen ---
  if (!isPurchased) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Lock size={48} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ماژول مدیریت دورکاری غیرفعال است</h2>
        <p className="text-gray-500 text-center max-w-md mb-8 leading-relaxed">
            این بخش جزو امکانات پیشرفته سیستم است. برای دسترسی به امکانات مانیتورینگ و مدیریت زمان دورکاری، لطفا اشتراک خود را ارتقا دهید.
        </p>
        <button 
            onClick={handlePurchase}
            className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/30 transition-all active:scale-95"
        >
            خرید و فعال‌سازی
        </button>
      </div>
    );
  }

  // --- Main Render based on currentView ---
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Dashboard / Overview */}
      {(currentView === 'remote-dashboard') && (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <Monitor size={48} className="text-primary mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">وضعیت سیستم</h3>
                    <p className="text-gray-500">
                        {globalSettings.isEnabled ? 'سیستم دورکاری فعال است' : 'سیستم دورکاری غیرفعال است'}
                    </p>
                </div>
                 <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <LayoutGrid size={48} className="text-indigo-500 mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">مانیتورینگ</h3>
                    <p className="text-gray-500">
                       مشاهده زنده فعالیت {employees.length} کارمند
                    </p>
                </div>
            </div>
        </>
      )}

      {/* Settings View */}
      {currentView === 'remote-settings' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-6 pb-0 flex justify-between items-center mb-6">
                  <div>
                      <h2 className="text-xl font-bold text-gray-800">تنظیمات و دسترسی‌ها</h2>
                      <p className="text-gray-500 text-sm">مدیریت مجوزهای دورکاری پرسنل</p>
                  </div>
                  <button 
                      onClick={() => setIsGlobalModalOpen(true)}
                      className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-xl hover:bg-gray-700 transition-all shadow-md text-sm"
                  >
                      <Globe size={16} />
                      <span>تنظیمات سراسری</span>
                  </button>
             </div>
             
             <div className="p-6 bg-gray-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {employees.map(emp => {
                        const { settings, isCustom } = getEmployeeSettings(emp.id);
                        return (
                            <div key={emp.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
                                <div className="p-5 flex flex-col items-center border-b border-gray-50 bg-gradient-to-b from-gray-50/50 to-white">
                                    <UserAvatar src={emp.avatar} name={emp.name} className="w-20 h-20 rounded-full border-4 border-white shadow-sm mb-3" iconSize={32} />
                                    <h3 className="font-bold text-gray-800 text-lg mb-0.5">{emp.name}</h3>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{emp.department}</span>
                                    
                                    <div className={`mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${settings.isEnabled ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                        <div className={`w-2 h-2 rounded-full ${settings.isEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        {settings.isEnabled ? 'دورکاری فعال' : 'غیرفعال'}
                                    </div>
                                </div>
                                
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><MousePointer2 size={14}/> حساسیت موس:</span>
                                        <span className={`font-bold ${settings.checkInactivity ? 'text-gray-800' : 'text-gray-300'}`}>
                                            {settings.checkInactivity ? `${toPersianDigits(settings.inactivityThreshold)} دقیقه` : 'غیرفعال'}
                                        </span>
                                    </div>
                                    
                                    {isCustom && (
                                        <div className="text-center">
                                            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100">تنظیمات اختصاصی</span>
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => setEditingEmployeeId(emp.id)}
                                        className="w-full mt-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Settings2 size={16} />
                                        مدیریت
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                  </div>
             </div>
          </div>
      )}

      {/* Monitoring View */}
      {currentView === 'remote-monitoring' && (
          <MonitoringView employees={employees} activeSessions={activeSessions} logs={logs} />
      )}

      {/* Reports View */}
      {currentView === 'remote-reports' && (
          <ReportsView employees={employees} activeSessions={activeSessions} logs={logs} />
      )}

      {/* Global Settings Modal */}
      {isGlobalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <Globe size={20} />
                          <h3 className="font-bold">تنظیمات سراسری دورکاری</h3>
                      </div>
                      <button onClick={() => setIsGlobalModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6">
                      <SettingsForm 
                          initialData={globalSettings}
                          isGlobal={true}
                          onSave={handleSaveGlobalSettings}
                          onCancel={() => setIsGlobalModalOpen(false)}
                          isSaving={isSaving}
                      />
                  </div>
              </div>
          </div>
      )}

      {/* Employee Specific Settings Modal */}
      {editingEmployeeId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <UserAvatar 
                            src={employees.find(e => e.id === editingEmployeeId)?.avatar} 
                            name={employees.find(e => e.id === editingEmployeeId)?.name} 
                            className="w-10 h-10 rounded-full border border-gray-100"
                          />
                          <div>
                              <h3 className="font-bold text-gray-800 text-sm">تنظیمات: {employees.find(e => e.id === editingEmployeeId)?.name}</h3>
                          </div>
                      </div>
                      <button onClick={() => setEditingEmployeeId(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6">
                      <SettingsForm 
                          initialData={getEmployeeSettings(editingEmployeeId).settings}
                          isGlobal={false}
                          onSave={(settings) => handleUpdateEmployeeSettings(editingEmployeeId, settings)}
                          onCancel={() => setEditingEmployeeId(null)}
                          onReset={() => handleUpdateEmployeeSettings(editingEmployeeId, undefined)}
                          isSaving={isSaving}
                      />
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default RemoteWork;
