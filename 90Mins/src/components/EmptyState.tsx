import React from 'react';
import { IonIcon } from '@ionic/react';
import './EmptyState.css';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionText,
  onAction,
}) => {
  return (
    <div className="empty-state-container">
      <IonIcon icon={icon} className="empty-state-icon" />
      <h2 className="empty-state-title">{title}</h2>
      {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
      {actionText && onAction && (
        <button className="empty-state-button" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
