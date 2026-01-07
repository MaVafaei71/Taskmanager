
import React, { useState } from 'react';
import { Employee } from '../types';
import { Mail, Phone, Briefcase, ChevronRight, ChevronLeft } from 'lucide-react';
import { toPersianDigits } from '../utils/dateUtils';
import UserAvatar from './UserAvatar';

interface EmployeesProps {
  employees: Employee[];
}

const ITEMS_PER_PAGE = 6;

const Employees: React.FC<EmployeesProps> = ({ employees }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(employees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = employees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">لیست کارمندان</h2>
        <p className="text-gray-500 mt-1">مدیریت و مشاهده اعضای تیم</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedEmployees.map((emp) => (
          <div key={emp.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center hover:shadow-md transition-shadow">
            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-primary/10 flex items-center justify-center">
                <UserAvatar 
                    src={emp.avatar} 
                    name={emp.name} 
                    className="w-full h-full"
                    iconSize={48}
                />
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-1">{emp.name}</h3>
            <span className="bg-primary-light text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
                {emp.department}
            </span>

            <div className="w-full space-y-3">
                <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <Phone size={18} className="text-primary"/>
                    {/* Display Persian digits, but keep ltr direction for correct spacing/formatting if needed, though usually numbers are LTR */}
                    <span className="text-sm">{toPersianDigits(emp.mobile)}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <Briefcase size={18} className="text-primary"/>
                    <span className="text-sm">{emp.role === 'ADMIN' ? 'مدیر سیستم' : 'کارمند'}</span>
                </div>
            </div>
          </div>
        ))}
      </div>

       {/* Pagination Controls */}
       {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t border-gray-100">
            <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 disabled:opacity-50 hover:bg-gray-50"
            >
                <ChevronRight size={20} />
            </button>
            
            <span className="text-sm font-medium text-gray-600">
                صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages)}
            </span>

            <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 disabled:opacity-50 hover:bg-gray-50"
            >
                <ChevronLeft size={20} />
            </button>
        </div>
      )}
    </div>
  );
};

export default Employees;
