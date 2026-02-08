import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, FileText, User, Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';
import { labTestExecutionService } from '../../services/labTestExecutionService';
import type { LabTestRun, TestRunStatus } from '../../types/labTests';

interface TestRunDetailsModalProps {
    run: LabTestRun;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    canApprove: boolean;
}

const TestRunDetailsModal: React.FC<TestRunDetailsModalProps> = ({
    run,
    isOpen,
    onClose,
    onUpdate,
    canApprove
}) => {
    const [actionLoading, setActionLoading] = useState(false);
    const [note, setNote] = useState('');
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);

    if (!isOpen) return null;

    const handleAction = async () => {
        if (!action) return;

        setActionLoading(true);
        try {
            if (action === 'approve') {
                await labTestExecutionService.approveTestRun(run.id, { approval_notes: note });
            } else {
                await labTestExecutionService.rejectTestRun(run.id, { rejection_reason: note });
            }
            onUpdate();
            onClose();
            setAction(null);
            setNote('');
        } catch (error) {
            console.error(`Failed to ${action} run:`, error);
            alert(`Failed to ${action} test run`);
        } finally {
            setActionLoading(false);
        }
    };

    const getEvaluationStyle = (fieldKey: string, value: any) => {
        const failedFields = run.failed_fields || [];
        if (failedFields.includes(fieldKey)) {
            return 'bg-red-50 text-red-900 border-red-200';
        }
        return 'bg-gray-50 text-gray-900 border-gray-200';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${run.evaluation_result === 'pass' ? 'bg-green-100' :
                                run.evaluation_result === 'fail' ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                            {run.evaluation_result === 'pass' ? <CheckCircle className="h-6 w-6 text-green-600" /> :
                                run.evaluation_result === 'fail' ? <XCircle className="h-6 w-6 text-red-600" /> :
                                    <Clock className="h-6 w-6 text-gray-600" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {run.test_config?.name}
                            </h2>
                            <p className="text-sm text-gray-500">
                                #{run.run_number} • {new Date(run.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Status Banner */}
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium">Status:</span>
                            <span className={`px-2 py-1 rounded text-sm font-bold uppercase
                                ${run.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    run.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-blue-100 text-blue-800'}`}>
                                {run.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>Performed by: {run.performed_by_name || 'Unknown'}</span>
                        </div>
                    </div>

                    {/* Results Grid */}
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-500" />
                        Test Results
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {run.test_config?.fields?.map((field) => {
                            const value = run.field_values[field.field_key];
                            const isFailed = run.failed_fields?.includes(field.field_key);

                            return (
                                <div key={field.id} className={`p-4 rounded-lg border ${isFailed ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                                    }`}>
                                    <p className="text-sm font-medium text-gray-500 mb-1">
                                        {field.label}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <p className={`text-lg font-bold ${isFailed ? 'text-red-700' : 'text-gray-900'}`}>
                                            {value ?? '-'} <span className="text-sm font-normal text-gray-500">{field.spec_unit}</span>
                                        </p>
                                        {isFailed && (
                                            <AlertTriangle className="h-5 w-5 text-red-500" />
                                        )}
                                    </div>
                                    {field.is_evaluable && (
                                        <p className="text-xs text-gray-400 mt-2 border-t pt-1 border-gray-100">
                                            Target: {field.spec_min_value ?? field.spec_target_value ?? 'N/A'} - {field.spec_max_value ?? 'N/A'}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Timeline & Metadata */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-gray-500" />
                            Timeline & Meta
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Started At</p>
                                <p className="font-medium">{run.started_at ? new Date(run.started_at).toLocaleString() : '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Completed At</p>
                                <p className="font-medium">{run.completed_at ? new Date(run.completed_at).toLocaleString() : '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Batch ID</p>
                                <p className="font-medium">{run.linked_batch_id || '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Device/IP</p>
                                <p className="font-medium">-</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    {action ? (
                        <div className="space-y-3 animate-fadeIn">
                            <h4 className="font-bold text-gray-900">
                                {action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                            </h4>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={action === 'approve' ? "Add approval notes (optional)..." : "Reason for rejection (required)..."}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                rows={2}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAction}
                                    disabled={actionLoading || (action === 'reject' && !note.trim())}
                                    className={`px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2
                                        ${action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                                        disabled:opacity-50`}
                                >
                                    {actionLoading ? 'Processing...' : (action === 'approve' ? 'Confirm Approve' : 'Confirm Reject')}
                                </button>
                                <button
                                    onClick={() => { setAction(null); setNote(''); }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                                {run.status === 'completed' && canApprove
                                    ? 'Evaluation complete. Verification required.'
                                    : 'No actions available.'}
                            </span>
                            <div className="flex gap-3">
                                {canApprove && run.status === 'completed' && (
                                    <>
                                        <button
                                            onClick={() => setAction('reject')}
                                            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium flex items-center gap-2"
                                        >
                                            <XCircle className="h-5 w-5" />
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => setAction('approve')}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                                        >
                                            <ShieldCheck className="h-5 w-5" />
                                            Approve
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestRunDetailsModal;
