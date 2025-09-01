import React, { useState, useRef, useEffect } from 'react';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface CustomMonthPickerProps {
  value: string; // Format: "YYYY-MM"
  onChange: (monthYear: string) => void;
  placeholder?: string;
  className?: string;
  maxMonths?: number; // Maximum months from current month
}

const CustomMonthPicker: React.FC<CustomMonthPickerProps> = ({
  value,
  onChange,
  placeholder = "Select month",
  className = "",
  maxMonths = 12
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplayDate = (monthYear: string) => {
    if (!monthYear) return '';
    const [year, month] = monthYear.split('-');
    const monthIndex = parseInt(month) - 1;
    return `${months[monthIndex]} ${year}`;
  };

  const handleMonthSelect = (monthIndex: number, year: number) => {
    const monthYear = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    onChange(monthYear);
    setIsOpen(false);
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentYear(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  const isMonthDisabled = (monthIndex: number, year: number) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Calculate months from current month
    const monthsFromNow = (year - currentYear) * 12 + (monthIndex - currentMonth);
    
    // Disable if in the past or beyond maxMonths
    return monthsFromNow < 0 || monthsFromNow >= maxMonths;
  };

  const isMonthSelected = (monthIndex: number, year: number) => {
    if (!value) return false;
    const [selectedYear, selectedMonth] = value.split('-');
    return parseInt(selectedYear) === year && parseInt(selectedMonth) === monthIndex + 1;
  };

  const getMonthsFromNow = (monthIndex: number, year: number) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return (year - currentYear) * 12 + (monthIndex - currentMonth);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
          focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer
          flex items-center justify-between
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <FaCalendarAlt className="text-gray-400" />
      </div>

      {/* Month Picker Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <button
              type="button"
              onClick={() => navigateYear('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaChevronLeft className="text-gray-600" />
            </button>
            
            <h3 className="text-lg font-semibold text-gray-900">
              {currentYear}
            </h3>
            
            <button
              type="button"
              onClick={() => navigateYear('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaChevronRight className="text-gray-600" />
            </button>
          </div>

          {/* Months Grid */}
          <div className="grid grid-cols-3 gap-2 p-4">
            {months.map((month, monthIndex) => {
              const disabled = isMonthDisabled(monthIndex, currentYear);
              const selected = isMonthSelected(monthIndex, currentYear);
              const monthsFromNow = getMonthsFromNow(monthIndex, currentYear);

              return (
                <button
                  key={monthIndex}
                  type="button"
                  onClick={() => !disabled && handleMonthSelect(monthIndex, currentYear)}
                  disabled={disabled}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${disabled 
                      ? 'text-gray-300 cursor-not-allowed bg-gray-50' 
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }
                    ${selected 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : ''
                    }
                  `}
                >
                  <div className="text-center">
                    <div>{month.substring(0, 3)}</div>
                    {!disabled && monthsFromNow >= 0 && (
                      <div className="text-xs opacity-75">
                        +{monthsFromNow + 1}mo
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="text-xs text-gray-500">
              Max {maxMonths} months from now
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomMonthPicker;
