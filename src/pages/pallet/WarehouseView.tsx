/**
 * Warehouse View Page
 * Wrapper page for warehouse loading component
 */

import WarehouseLoading from '../../components/pallet/WarehouseLoading';

export default function WarehouseView() {
    return (
        <div className="min-h-screen bg-gray-50">
            <WarehouseLoading />
        </div>
    );
}
