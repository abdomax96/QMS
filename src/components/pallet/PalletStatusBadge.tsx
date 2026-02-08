/**
 * Pallet Status Badge Component
 * Displays visual status indicator for pallets
 */

import { PalletStatus, PALLET_STATUS_LABELS } from '../../types/pallet';
import { CheckCircle, Package, AlertTriangle, Truck, XCircle } from 'lucide-react';

interface PalletStatusBadgeProps {
  status: PalletStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  language?: 'ar' | 'en';
}

export default function PalletStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  showLabel = true,
  language = 'ar',
}: PalletStatusBadgeProps) {
  const statusInfo = PALLET_STATUS_LABELS[status];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const colorClasses = {
    orange: 'bg-orange-100 text-orange-700 border-orange-300',
    green: 'bg-green-100 text-green-700 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    blue: 'bg-blue-100 text-blue-700 border-blue-300',
    red: 'bg-red-100 text-red-700 border-red-300',
  };

  const getIcon = () => {
    const iconSize = iconSizes[size];
    switch (status) {
      case PalletStatus.COMPLETE:
        return <CheckCircle size={iconSize} />;
      case PalletStatus.PARTIAL:
        return <Package size={iconSize} />;
      case PalletStatus.HOLD:
      case PalletStatus.PARTIAL_HOLD:
        return <AlertTriangle size={iconSize} />;
      case PalletStatus.LOADED:
      case PalletStatus.PARTIAL_LOAD:
        return <Truck size={iconSize} />;
      case PalletStatus.SCRAPPED:
        return <XCircle size={iconSize} />;
      default:
        return <Package size={iconSize} />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses[size]} ${colorClasses[statusInfo.color as keyof typeof colorClasses]}`}
    >
      {showIcon && getIcon()}
      {showLabel && <span>{language === 'ar' ? statusInfo.ar : statusInfo.en}</span>}
    </span>
  );
}
