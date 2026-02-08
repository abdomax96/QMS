import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { TrashIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

interface SignatureCaptureProps {
    value?: string;
    onChange: (signature: string) => void;
    label?: string;
    required?: boolean;
}

const SignatureCapture: React.FC<SignatureCaptureProps> = ({
    value,
    onChange,
    label = 'التوقيع',
    required = false
}) => {
    const sigPadRef = useRef<SignatureCanvas>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const [isSigned, setIsSigned] = useState(!!value);

    useEffect(() => {
        if (value && sigPadRef.current) {
            sigPadRef.current.fromDataURL(value);
            setIsEmpty(false);
            setIsSigned(true);
        }
    }, [value]);

    const handleClear = () => {
        if (sigPadRef.current) {
            sigPadRef.current.clear();
            setIsEmpty(true);
            setIsSigned(false);
            onChange('');
        }
    };

    const handleSave = () => {
        if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
            const dataURL = sigPadRef.current.toDataURL();
            onChange(dataURL);
            setIsSigned(true);
        }
    };

    const handleBegin = () => {
        setIsEmpty(false);
        setIsSigned(false);
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>

            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                <SignatureCanvas
                    ref={sigPadRef}
                    canvasProps={{
                        className: 'w-full h-40 touch-action-none',
                        style: { touchAction: 'none' }
                    }}
                    onBegin={handleBegin}
                    backgroundColor="rgb(255, 255, 255)"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={handleClear}
                    disabled={isEmpty && !value}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <TrashIcon className="w-4 h-4" />
                    مسح
                </button>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isEmpty || isSigned}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <CheckIcon className="w-4 h-4" />
                    حفظ التوقيع
                </button>

                {isSigned && (
                    <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckIcon className="w-4 h-4" />
                        تم الحفظ
                    </span>
                )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
                استخدم الماوس أو اللمس للتوقيع في المربع أعلاه
            </p>
        </div>
    );
};

export default SignatureCapture;
