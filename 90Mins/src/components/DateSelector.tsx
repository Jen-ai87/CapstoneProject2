import { IonIcon } from '@ionic/react';
import { calendarOutline } from 'ionicons/icons';
import './DateSelector.css';

type DateTab = 'yesterday' | 'today' | 'tomorrow';

interface DateSelectorProps {
  selected: DateTab;
  onChange: (tab: DateTab) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ selected, onChange }) => {
  return (
    <div className="date-selector">
      <div className="date-selector-label">
        <IonIcon icon={calendarOutline} className="date-selector-icon" />
        <span>Select Date</span>
      </div>
      <div className="date-tabs">
        <button
          className={`date-tab ${selected === 'yesterday' ? 'active' : ''}`}
          onClick={() => onChange('yesterday')}
        >
          Yesterday
        </button>
        <button
          className={`date-tab ${selected === 'today' ? 'active' : ''}`}
          onClick={() => onChange('today')}
        >
          Today
        </button>
        <button
          className={`date-tab ${selected === 'tomorrow' ? 'active' : ''}`}
          onClick={() => onChange('tomorrow')}
        >
          Tomorrow
        </button>
      </div>
    </div>
  );
};

export default DateSelector;
