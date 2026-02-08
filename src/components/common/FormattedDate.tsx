/**
 * Formatted Date Component - مكون عرض التاريخ المنسق
 * يعرض التاريخ حسب إعدادات التطبيق
 */

import React from 'react';
import { useDateFormat } from '../../hooks/useDateFormat';

interface FormattedDateProps {
    date: string | Date | null | undefined;
    includeTime?: boolean;
    fallback?: string;
    className?: string;
}

/**
 * مكون لعرض التاريخ بتنسيق الإعدادات
 */
export const FormattedDate: React.FC<FormattedDateProps> = ({
    date,
    includeTime = false,
    fallback = '-',
    className
}) => {
    const { formatDate, formatDateTime } = useDateFormat();

    if (!date) return <span className={className}>{fallback}</span>;

    const formattedDate = includeTime ? formatDateTime(date) : formatDate(date);

    return <span className={className}>{formattedDate}</span>;
};

/**
 * مكون لعرض التاريخ والوقت
 */
export const FormattedDateTime: React.FC<Omit<FormattedDateProps, 'includeTime'>> = (props) => {
    return <FormattedDate {...props} includeTime={true} />;
};

export default FormattedDate;
