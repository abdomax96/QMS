/**
 * Production View Page
 * Wrapper page for production registration component
 */

import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductionRegistration from '../../components/pallet/ProductionRegistration';

export default function ProductionView() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-4 flex w-full" dir="rtl">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700"
                >
                    <ArrowRight size={16} />
                    رجوع
                </button>
            </div>
            <ProductionRegistration />
        </div>
    );
}
