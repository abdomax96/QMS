import React, { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { ArrowPathIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const PermissionsDebug: React.FC = () => {
    const { profile } = useSupabaseAuth();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    const checkPermissions = async () => {
        if (!profile?.uid) return;
        setLoading(true);

        try {
            // 1. Get User Departments
            const { data: userDepts } = await supabase
                .from('user_departments')
                .select('department_id, is_active, departments(name, name_ar)')
                .eq('user_id', profile.uid);

            // 2. Get User Roles
            const { data: userRoles } = await supabase
                .from('user_roles')
                .select('role_id, roles(name, name_ar)')
                .eq('user_id', profile.uid);

            // 3. Get Module Access for these departments
            const deptIds = userDepts?.map(d => d.department_id) || [];

            let moduleAccess: any[] = [];
            if (deptIds.length > 0) {
                const { data: access } = await supabase
                    .from('department_module_access')
                    .select('*')
                    .in('department_id', deptIds);
                moduleAccess = access || [];
            }

            setData({
                userId: profile.uid,
                departments: userDepts || [],
                roles: userRoles || [],
                moduleAccess: moduleAccess,
                deptIds: deptIds
            });

        } catch (error) {
            console.error('Debug Error:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        checkPermissions();
    }, [profile?.uid]);

    if (!data) return null;

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 m-4 text-sm font-mono rtl:text-left" dir="ltr">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                    Permissions Diagnostic
                </h3>
                <button
                    onClick={checkPermissions}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    title="Refresh"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="space-y-4">
                {/* Departments Section */}
                <div>
                    <div className="font-semibold text-gray-500 mb-1">Assigned Departments (user_departments):</div>
                    {data.departments.length === 0 ? (
                        <div className="text-red-500 bg-red-50 p-2 rounded">
                            ❌ No departments assigned! You will not see department-scoped modules.
                        </div>
                    ) : (
                        <ul className="list-disc pl-5">
                            {data.departments.map((d: any) => (
                                <li key={d.department_id} className={d.is_active ? 'text-green-600' : 'text-red-500'}>
                                    {d.departments?.name} ({d.departments?.name_ar})
                                    {d.is_active ? ' [Active]' : ' [Inactive]'}
                                    <span className="text-gray-400 text-xs ml-2">{d.department_id}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Module Access Section */}
                <div>
                    <div className="font-semibold text-gray-500 mb-1">Module Access (department_module_access):</div>
                    {data.moduleAccess.length === 0 ? (
                        <div className="text-amber-500 bg-amber-50 p-2 rounded">
                            ⚠️ No module access records found for your departments.
                        </div>
                    ) : (
                        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700">
                                    <th className="border p-1">Module</th>
                                    <th className="border p-1">Dept ID</th>
                                    <th className="border p-1">Enabled</th>
                                    <th className="border p-1">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.moduleAccess.map((m: any) => (
                                    <tr key={m.id}>
                                        <td className="border p-1">{m.module_code}</td>
                                        <td className="border p-1 text-xs">{m.department_id.substring(0, 8)}...</td>
                                        <td className="border p-1">
                                            {m.is_enabled ? (
                                                <span className="text-green-600 flex items-center gap-1">
                                                    <CheckCircleIcon className="w-3 h-3" /> Yes
                                                </span>
                                            ) : (
                                                <span className="text-red-500">No</span>
                                            )}
                                        </td>
                                        <td className="border p-1 text-xs">{m.granted_actions?.join(', ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="text-xs text-center text-gray-400 mt-4">
                    User UUID: {data.userId}
                </div>
            </div>
        </div>
    );
};

export default PermissionsDebug;
