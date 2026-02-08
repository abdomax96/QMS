/**
 * Quality View Page
 * Wrapper page for quality hold management component
 */

import QualityHoldManagement from '../../components/pallet/QualityHoldManagement';

export default function QualityView() {
    return (
        <div className="min-h-screen bg-gray-50">
            <QualityHoldManagement />
        </div>
    );
}
