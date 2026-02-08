import { useState } from 'react';
import type { Pallet } from '../../types/pallet';
import { printService } from '../../services/printService';
import { Printer, X, FileText, QrCode, Barcode, Minimize } from 'lucide-react';

interface PrintDialogProps {
    isOpen: boolean;
    onClose: () => void;
    pallet: Pallet | null;
}

export default function PrintDialog({ isOpen, onClose, pallet }: PrintDialogProps) {
    const [labelType, setLabelType] = useState<'text' | 'barcode' | 'qr' | 'full'>('full');
    const [labelSize, setLabelSize] = useState<'a4' | 'thermal_100x150' | 'custom'>('thermal_100x150');
    const [copies, setCopies] = useState(1);

    if (!isOpen || !pallet) return null;

    const handlePrint = () => {
        printService.printBrowser(pallet, {
            labelType,
            labelSize,
            copies
        });
        // Optionally close dialog after print
        // onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Printer className="text-blue-600" size={24} />
                        <h2 className="text-lg font-bold text-gray-900">طباعة ملصق البالتة</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Pallet Info */}
                    <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">رقم البالتة</p>
                            <p className="font-bold text-lg text-blue-900" dir="ltr">{pallet.pallet_number}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">الكمية</p>
                            <p className="font-bold text-lg text-blue-900">{pallet.actual_cartons}</p>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-4">
                        {/* Label Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">نوع الملصق</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setLabelType('text')}
                                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${labelType === 'text' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <FileText size={20} />
                                    <span>بيانات فقط</span>
                                </button>
                                <button
                                    onClick={() => setLabelType('barcode')}
                                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${labelType === 'barcode' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <Barcode size={20} />
                                    <span>باركود</span>
                                </button>
                                <button
                                    onClick={() => setLabelType('qr')}
                                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${labelType === 'qr' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <QrCode size={20} />
                                    <span>QR Code</span>
                                </button>
                                <button
                                    onClick={() => setLabelType('full')}
                                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${labelType === 'full' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div className="flex gap-1"><Barcode size={18} /><QrCode size={18} /></div>
                                    <span>كامل</span>
                                </button>
                            </div>
                        </div>

                        {/* Size & Copies */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">حجم الملصق</label>
                                <select
                                    value={labelSize}
                                    onChange={(e) => setLabelSize(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="thermal_100x150">حراري 100×150</option>
                                    <option value="a4">A4 عادي</option>
                                    <option value="custom">مخصص</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">عدد النسخ</label>
                                <div className="flex items-center">
                                    <button
                                        onClick={() => setCopies(Math.max(1, copies - 1))}
                                        className="px-3 py-2 border border-gray-300 rounded-r-lg hover:bg-gray-50"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        value={copies}
                                        onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                                        className="w-full text-center border-t border-b border-gray-300 py-2 focus:ring-0"
                                    />
                                    <button
                                        onClick={() => setCopies(copies + 1)}
                                        className="px-3 py-2 border border-gray-300 rounded-l-lg hover:bg-gray-50"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-bold"
                    >
                        <Printer size={20} />
                        طباعة
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors text-gray-700 font-medium"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
}
