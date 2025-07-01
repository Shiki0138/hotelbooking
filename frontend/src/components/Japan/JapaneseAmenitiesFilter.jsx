import React, { useState } from 'react';
import { 
  FaHotTub, 
  FaSwimmingPool, 
  FaBed, 
  FaSmokingBan, 
  FaCoffee,
  FaHome,
  FaSpa
} from 'react-icons/fa';
import { MdOutlineHotel, MdRoomService } from 'react-icons/md';

const JapaneseAmenitiesFilter = ({ onFilterChange, selectedFilters = {} }) => {
  const [filters, setFilters] = useState({
    bathType: selectedFilters.bathType || [],
    roomType: selectedFilters.roomType || [],
    bedType: selectedFilters.bedType || [],
    smoking: selectedFilters.smoking || '',
    breakfast: selectedFilters.breakfast || [],
    ...selectedFilters
  });

  const handleFilterChange = (category, value) => {
    let newFilters = { ...filters };
    
    if (category === 'smoking') {
      newFilters[category] = filters[category] === value ? '' : value;
    } else {
      const currentValues = filters[category] || [];
      if (currentValues.includes(value)) {
        newFilters[category] = currentValues.filter(v => v !== value);
      } else {
        newFilters[category] = [...currentValues, value];
      }
    }
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const bathOptions = [
    { value: 'onsen', label: '温泉', icon: <FaHotTub /> },
    { value: 'publicBath', label: '大浴場', icon: <FaSwimmingPool /> },
    { value: 'openAirBath', label: '露天風呂', icon: <FaHotTub /> },
    { value: 'sauna', label: 'サウナ', icon: <FaSpa /> },
    { value: 'bedrockBath', label: '岩盤浴', icon: <FaSpa /> }
  ];

  const roomOptions = [
    { value: 'japanese', label: '和室', icon: <FaHome /> },
    { value: 'western', label: '洋室', icon: <MdOutlineHotel /> },
    { value: 'japaneseWestern', label: '和洋室', icon: <FaHome /> }
  ];

  const bedOptions = [
    { value: 'futon', label: '布団', icon: <FaBed /> },
    { value: 'bed', label: 'ベッド', icon: <FaBed /> }
  ];

  const smokingOptions = [
    { value: 'nonSmoking', label: '禁煙', icon: <FaSmokingBan /> },
    { value: 'smoking', label: '喫煙可', icon: <FaSmokingBan /> }
  ];

  const breakfastOptions = [
    { value: 'japanese', label: '和食', icon: <FaCoffee /> },
    { value: 'western', label: '洋食', icon: <FaCoffee /> },
    { value: 'buffet', label: 'バイキング', icon: <MdRoomService /> }
  ];

  const FilterSection = ({ title, options, category, multiSelect = true }) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {options.map(option => {
          const isSelected = multiSelect 
            ? (filters[category] || []).includes(option.value)
            : filters[category] === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => handleFilterChange(category, option.value)}
              className={`
                flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }
              `}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const clearAllFilters = () => {
    const clearedFilters = {
      bathType: [],
      roomType: [],
      bedType: [],
      smoking: '',
      breakfast: []
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== ''
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">設備・サービスで絞り込む</h2>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            すべてクリア
          </button>
        )}
      </div>

      <FilterSection 
        title="お風呂・温泉" 
        options={bathOptions} 
        category="bathType"
      />

      <FilterSection 
        title="部屋タイプ" 
        options={roomOptions} 
        category="roomType"
      />

      <FilterSection 
        title="寝具タイプ" 
        options={bedOptions} 
        category="bedType"
      />

      <FilterSection 
        title="喫煙・禁煙" 
        options={smokingOptions} 
        category="smoking"
        multiSelect={false}
      />

      <FilterSection 
        title="朝食タイプ" 
        options={breakfastOptions} 
        category="breakfast"
      />

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          選択した条件に合うホテルを表示します。
          複数選択可能な項目は、いずれかの条件を満たすホテルが表示されます。
        </p>
      </div>
    </div>
  );
};

export default JapaneseAmenitiesFilter;