
import React, { useState } from 'react';
import { Correspondence, CorrespondenceStatus, Employee, Role } from '../types';
import { Plus, Search, FileText, CheckCircle2, XCircle, Clock, Eye, Download, Upload, X, Send } from 'lucide-react';
import { toJalali, toPersianDigits } from '../utils/dateUtils';
import UserAvatar from './UserAvatar';
import Swal from 'sweetalert2';
import { v4 as uuidv4 } from 'uuid';

interface CorrespondenceViewProps {
  items: Correspondence[];
  currentUser: Employee;
  employees: Employee[];
  onAdd: (item: Correspondence) => void;
  onUpdate: (item: Correspondence) => void;
}

const CorrespondenceView: React.FC<CorrespondenceViewProps> = ({ items, currentUser, employees, onAdd, onUpdate }) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Correspondence | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Manager Response State
  const [responseComment, setResponseComment] = useState('');

  const isAdmin = currentUser.role === Role.ADMIN;

  const filteredItems = items
    .filter(item => {
       if (!isAdmin && item.requesterId !== currentUser.id) return false;
       if (filter !== 'ALL' && item.status !== filter) return false;
       if (searchQuery && !item.title.includes(searchQuery)) return false;
       return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const selectedFile = e.target.files[0];
          if (selectedFile.size > 2 * 1024 * 1024) { // 2MB Limit
              Swal.fire('خطا', 'حجم فایل نباید بیشتر از ۲ مگابایت باشد.', 'error');
              return;
          }
          setFile(selectedFile);
      }
  };

  const convertToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  const handleSubmit = async () => {
      if (!title || !description) return;

      let attachmentBase64 = undefined;
      if (file) {
          try {
              attachmentBase64 = await convertToBase64(file);
          } catch (error) {
              console.error("Error converting file", error);
              return;
          }
      }

      const newItem: Correspondence = {
          id: uuidv4(),
          requesterId: currentUser.id,
          title,
          description,
          createdAt: new Date().toISOString(),
          status: CorrespondenceStatus.PENDING,
          attachment: attachmentBase64,
          attachmentName: file?.name,
          viewedByAdmin: false,
          viewedByUser: true,
      };

      onAdd(newItem);
      setIsModalOpen(false);
      resetForm();
      Swal.fire('ثبت شد', 'درخواست شما با موفقیت در کارتابل ثبت شد.', 'success');
  };

  const resetForm = () => {
      setTitle('');
      setDescription('');
      setFile(null);
  };

  const handleStatusChange = (status: CorrespondenceStatus) => {
      if (!selectedItem) return;

      onUpdate({
          ...selectedItem,
          status: status,
          managerResponse: responseComment,
          viewedByUser: false
      });

      setSelectedItem(null);
      setResponseComment('');
      Swal.fire(
          status === CorrespondenceStatus.APPROVED ? 'تایید شد' : 'رد شد',
          'وضعیت درخواست تغییر یافت.',
          status === CorrespondenceStatus.APPROVED ? 'success' : 'info'
      );
  };

  const getStatusBadge = (status: CorrespondenceStatus) => {
      switch (status) {
          case CorrespondenceStatus.APPROVED:
              return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 size={14} /> تایید شده</span>;
          case CorrespondenceStatus.REJECTED:
              return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={14} /> رد شده</span>;
          default:
              return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={14} /> در انتظار بررسی</span>;
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">کارتابل ارتباط</h2>
            <p className="text-gray-500 mt-1">مدیریت درخواست‌ها و مکاتبات داخلی</p>
        </div>
        {!isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>ایجاد موضوع جدید</span>
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="جستجو در موضوعات..." 
            className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>همه</button>
          <button onClick={() => setFilter('PENDING')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>در انتظار</button>
          <button onClick={() => setFilter('APPROVED')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>تایید شده</button>
          <button onClick={() => setFilter('REJECTED')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filter === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>رد شده</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredItems.length > 0 ? filteredItems.map(item => {
            const requester = employees.find(e => e.id === item.requesterId);
            return (
                <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 md:items-center">
                    <div className="flex items-center gap-4 flex-1">
                        <div className={`p-3 rounded-2xl ${item.status === CorrespondenceStatus.APPROVED ? 'bg-emerald-50 text-emerald-500' : item.status === CorrespondenceStatus.REJECTED ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg mb-1">{item.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                {isAdmin && (
                                    <div className="flex items-center gap-1">
                                        <UserAvatar src={requester?.avatar} name={requester?.name} className="w-5 h-5 rounded-full" iconSize={12}/>
                                        <span className="font-bold text-gray-700">{requester?.name || 'کاربر ناشناس'}</span>
                                        <span className="mx-1">•</span>
                                    </div>
                                )}
                                <span>{toJalali(item.createdAt)}</span>
                                <span className="mx-1">•</span>
                                <span className="dir-ltr">{toPersianDigits(new Date(item.createdAt).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}))}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                        {getStatusBadge(item.status)}
                        <button 
                            onClick={() => {
                                setSelectedItem(item);
                                setResponseComment(item.managerResponse || '');
                            }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                        >
                            <Eye size={18} />
                            <span>مشاهده</span>
                        </button>
                    </div>
                </div>
            );
        }) : (
            <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p>هیچ موردی یافت نشد.</p>
            </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-gray-800">ایجاد درخواست جدید</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">موضوع <span className="text-red-500">*</span></label>
                          <input 
                              type="text" 
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none"
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="عنوان درخواست..."
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">توضیحات <span className="text-red-500">*</span></label>
                          <textarea 
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none h-32 resize-none"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="شرح کامل درخواست..."
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">پیوست فایل (اختیاری)</label>
                          <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors group cursor-pointer">
                                <input 
                                    type="file" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf,.doc,.docx"
                                />
                                <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-primary transition-colors">
                                    <Upload size={32} />
                                    <span className="text-sm font-medium">{file ? file.name : 'برای آپلود فایل کلیک کنید یا فایل را اینجا رها کنید'}</span>
                                    <span className="text-xs text-gray-400">(حداکثر ۲ مگابایت)</span>
                                </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                      <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl text-gray-600 hover:bg-gray-200 font-bold text-sm">انصراف</button>
                      <button onClick={handleSubmit} disabled={!title || !description} className="px-8 py-3 rounded-xl bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/30 font-bold text-sm disabled:opacity-50">ثبت درخواست</button>
                  </div>
              </div>
          </div>
      )}

      {/* Detail / Review Modal */}
      {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-gray-800">{selectedItem.title}</h3>
                          {getStatusBadge(selectedItem.status)}
                      </div>
                      <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-red-500">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-6">
                      {isAdmin && (
                          <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                              <UserAvatar 
                                src={employees.find(e => e.id === selectedItem.requesterId)?.avatar} 
                                name={employees.find(e => e.id === selectedItem.requesterId)?.name} 
                                className="w-10 h-10 rounded-full"
                              />
                              <div>
                                  <p className="font-bold text-gray-800">{employees.find(e => e.id === selectedItem.requesterId)?.name}</p>
                                  <p className="text-xs text-gray-500">{employees.find(e => e.id === selectedItem.requesterId)?.department}</p>
                              </div>
                          </div>
                      )}

                      <div>
                          <h4 className="text-sm font-bold text-gray-500 mb-2">توضیحات:</h4>
                          <p className="text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                              {selectedItem.description}
                          </p>
                      </div>

                      {selectedItem.attachment && (
                          <div>
                              <h4 className="text-sm font-bold text-gray-500 mb-2">فایل پیوست:</h4>
                              {selectedItem.attachment.startsWith('data:image') ? (
                                  <img src={selectedItem.attachment} alt="Attachment" className="max-w-full h-auto max-h-64 rounded-xl border border-gray-200" />
                              ) : (
                                  <a href={selectedItem.attachment} download={selectedItem.attachmentName || 'download'} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl transition-colors w-fit">
                                      <Download size={20} />
                                      <span>دانلود فایل پیوست ({selectedItem.attachmentName})</span>
                                  </a>
                              )}
                          </div>
                      )}

                      {/* Response Section */}
                      {(isAdmin || selectedItem.managerResponse) && (
                          <div className="border-t border-gray-100 pt-6">
                              <h4 className="text-sm font-bold text-gray-500 mb-2">پاسخ مدیر:</h4>
                              {isAdmin && selectedItem.status === CorrespondenceStatus.PENDING ? (
                                  <textarea 
                                      className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all"
                                      placeholder="توضیحات تایید یا رد درخواست..."
                                      rows={3}
                                      value={responseComment}
                                      onChange={(e) => setResponseComment(e.target.value)}
                                  />
                              ) : (
                                  <div className={`p-4 rounded-xl border ${selectedItem.status === CorrespondenceStatus.APPROVED ? 'bg-emerald-50 border-emerald-100' : selectedItem.status === CorrespondenceStatus.REJECTED ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                      {selectedItem.managerResponse ? (
                                          <p className="text-gray-800">{selectedItem.managerResponse}</p>
                                      ) : (
                                          <p className="text-gray-400 italic">بدون توضیحات</p>
                                      )}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                      {isAdmin && selectedItem.status === CorrespondenceStatus.PENDING ? (
                          <>
                              <button onClick={() => handleStatusChange(CorrespondenceStatus.REJECTED)} className="px-6 py-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 font-bold text-sm transition-colors">رد درخواست</button>
                              <button onClick={() => handleStatusChange(CorrespondenceStatus.APPROVED)} className="px-6 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 font-bold text-sm transition-colors">تایید درخواست</button>
                          </>
                      ) : (
                          <button onClick={() => setSelectedItem(null)} className="px-8 py-3 rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold text-sm">بستن</button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CorrespondenceView;
