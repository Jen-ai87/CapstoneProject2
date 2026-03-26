import { useState, useRef } from 'react';
import { IonIcon } from '@ionic/react';
import { calendarOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import './DateSelector.css';

interface DateSelectorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onChange }) => {
  const [showCalendarOverlay, setShowCalendarOverlay] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date(selectedDate));
  const calendarButtonRef = useRef<HTMLButtonElement>(null);

  const formatDisplayDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    const diffTime = compareDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    
    // Format as "Friday, 20 Feb"
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const monthName = monthNames[date.getMonth()];
    
    return `${dayName}, ${day} ${monthName}`;
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    onChange(newDate);
  };

  const handleCalendarClick = () => {
    setCalendarDate(new Date(selectedDate));
    setShowCalendarOverlay(true);
  };

  const handleOverlayClick = () => {
    setShowCalendarOverlay(false);
  };

  const handleCalendarDateSelect = (date: Date) => {
    onChange(date);
    setShowCalendarOverlay(false);
  };

  const handleJumpToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    onChange(today);
  };

  const isToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(selectedDate);
    compareDate.setHours(0, 0, 0, 0);
    return today.getTime() === compareDate.getTime();
  };

  const shouldShowJumpToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(selectedDate);
    compareDate.setHours(0, 0, 0, 0);
    const diffTime = compareDate.getTime() - today.getTime();
    const diffDays = Math.abs(Math.round(diffTime / (1000 * 60 * 60 * 24)));
    return diffDays > 3;
  };

  // Get first day of month and number of days
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(calendarDate);
    const firstDay = getFirstDayOfMonth(calendarDate);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="calendar-picker">
        <div className="calendar-header">
          <button 
            className="calendar-month-nav"
            onClick={() => setCalendarDate(new Date(year, month - 1))}
            aria-label="Previous month"
          >
            <IonIcon icon={chevronBackOutline} />
          </button>
          <div className="calendar-month-year">
            {monthNames[month]} {year}
          </div>
          <button 
            className="calendar-month-nav"
            onClick={() => setCalendarDate(new Date(year, month + 1))}
            aria-label="Next month"
          >
            <IonIcon icon={chevronForwardOutline} />
          </button>
        </div>

        <div className="calendar-weekdays">
          {dayNames.map(day => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="calendar-day empty" />;
            }

            const dayDate = new Date(year, month, day);
            const isSelected = dayDate.toDateString() === selectedDate.toDateString();

            return (
              <button
                key={day}
                className={`calendar-day ${isSelected ? 'selected' : ''}`}
                onClick={() => handleCalendarDateSelect(dayDate)}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="date-selector">
      {shouldShowJumpToToday() && (
        <button className="jump-to-today-btn" onClick={handleJumpToToday}>
          Jump to Today
        </button>
      )}
      
      <div className="date-navigation">
        <button 
          ref={calendarButtonRef}
          className="calendar-picker-btn"
          onClick={handleCalendarClick}
          aria-label="Pick a date"
        >
          <IonIcon icon={calendarOutline} />
        </button>

        <button 
          className="date-nav-btn"
          onClick={handlePreviousDay}
          aria-label="Previous day"
        >
          <IonIcon icon={chevronBackOutline} />
        </button>
        
        <div className="current-date-display">
          {formatDisplayDate(selectedDate)}
        </div>
        
        <button 
          className="date-nav-btn"
          onClick={handleNextDay}
          aria-label="Next day"
        >
          <IonIcon icon={chevronForwardOutline} />
        </button>
      </div>

      {/* Calendar overlay and picker */}
      {showCalendarOverlay && (
        <>
          <div className="calendar-overlay" onClick={handleOverlayClick} />
          <div className="calendar-modal">
            {renderCalendar()}
          </div>
        </>
      )}
    </div>
  );
};

export default DateSelector;
