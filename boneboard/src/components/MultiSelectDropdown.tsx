import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options",
  className = "",
  disabled = false,
  id,
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCheckboxChange = (value: string) => {
    if (value === 'all') {
      // Handle "All" selection
      if (selectedValues.includes('all')) {
        onChange([]);
      } else {
        onChange(['all']);
      }
    } else {
      // Handle individual category selection
      const newValues = selectedValues.filter(v => v !== 'all');
      if (newValues.includes(value)) {
        const filtered = newValues.filter(v => v !== value);
        onChange(filtered.length === 0 ? ['all'] : filtered);
      } else {
        onChange([...newValues, value]);
      }
    }
  };

  const getDisplayText = () => {
    if (selectedValues.includes('all')) {
      return 'All Categories';
    } else if (selectedValues.length === 0) {
      return placeholder;
    } else if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option?.label || placeholder;
    } else {
      return `${selectedValues.length} categories selected`;
    }
  };

  return (
    <div className="relative" ref={selectRef}>
      <div
        id={id}
        className={`w-full h-[42px] pl-3 pr-8 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer flex items-center justify-between transition-all duration-200 hover:border-gray-400 hover:shadow-md text-sm ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''} ${className}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={`truncate ${selectedValues.length === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
          {getDisplayText()}
        </span>
        <FaChevronDown 
          className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto scrollbar-hide">
          <div className="py-2">
            {options.map((option, index) => (
              <label 
                key={option.value} 
                className={`flex items-center px-3 py-2 cursor-pointer transition-colors duration-150 text-sm ${
                  (option.value === 'all' ? selectedValues.includes('all') : selectedValues.includes(option.value) && !selectedValues.includes('all'))
                    ? 'bg-blue-100 text-blue-900 hover:bg-blue-50'
                    : 'text-gray-900 hover:bg-blue-50'
                } ${
                  index === 0 ? 'rounded-t-lg' : ''
                } ${
                  index === options.length - 1 ? 'rounded-b-lg' : ''
                }`}
              >
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      option.value === 'all' 
                        ? selectedValues.includes('all')
                        : selectedValues.includes(option.value) && !selectedValues.includes('all')
                    }
                    onChange={() => handleCheckboxChange(option.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 rounded transition-all duration-200 flex items-center justify-center ${
                    (option.value === 'all' ? selectedValues.includes('all') : selectedValues.includes(option.value) && !selectedValues.includes('all'))
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-gray-300 bg-white hover:border-blue-500'
                  }`}>
                    {(option.value === 'all' ? selectedValues.includes('all') : selectedValues.includes(option.value) && !selectedValues.includes('all')) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className={`ml-3 text-gray-700 ${option.value === 'all' ? 'font-medium' : ''}`}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Hidden select for form compatibility */}
      <select
        name={name}
        multiple
        value={selectedValues}
        onChange={() => {}} // Controlled by custom component
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default MultiSelectDropdown;
