import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { ArrowRightIcon, BuildingOffice2Icon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useNcrs } from '../../hooks/ncr/useNcrs';
import { useNcrSettings } from '../../hooks/ncr/useNcrSettings';
import { useAuth } from '../../hooks/ncr/useAuth';
import { useEnsureCompaniesLoaded } from '../../hooks/useEnsureCompaniesLoaded';
import type { CreateNcrPayload } from '../../services/ncr/ncrService';
import { FormSkeleton } from '../../components/common/LoadingStates';
import { requireNcrStagePermission, PermissionError } from '../../services/unifiedPermissionService';
import { useDefects } from '../../hooks/ncr/useDefects';
import type { DefectType } from '../../hooks/ncr/useDefects';

interface SupabaseUser {
    id: string;
    name?: string;
    email?: string;
    title?: string;
    department?: string;
}

interface DepartmentOption {
    id: string;
    label: string;
}

interface SelectOption {
    id: string;
    label: string;
}

interface DocumentOption {
    id: string;
    title: string;
    document_number?: string;
    department_id?: string | null;
    type?: 'sop' | 'work_instruction' | string;
}

const schema = z.object({
    date: z.string().min(1, 'التاريخ مطلوب'),
    shift: z.enum(['A', 'B', 'C']).optional(),
    department: z.string().min(1, 'القسم مطلوب'),
    severity: z.enum(['low', 'medium', 'high']),
    defectType: z.enum(['raw_material', 'product', 'process', 'other']),
    defectId: z.string().optional(),
    productId: z.string().optional(),
    productName: z.string().optional(),
    lineId: z.string().optional(),
    lineOrArea: z.string().optional(),
    materialReceivingId: z.string().optional(),
    reservedQty: z.string().optional(),
    reservedUnit: z.string().optional(),
    occurrence: z.string().optional(),
    detection: z.string().optional(),
    discoveredBy: z.string().min(1, 'اسم المكتشف مطلوب'),
    createdBy: z.string().optional(),
    description: z.string().min(10, 'الوصف يجب أن لا يقل عن 10 أحرف'),
    immediateAction: z.string().optional(),
    documentId: z.string().optional()
});

type FormData = z.infer<typeof schema>;

const NcrNewPage = () => {
    const navigate = useNavigate();
    const { companies, selectedCompanyId, selectCompany } = useEnsureCompaniesLoaded();
    const { settings } = useNcrSettings();
    const { profile, loading: authLoading } = useAuth();
    const { createNcr } = useNcrs(selectedCompanyId);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Fetch users from Supabase
    const [users, setUsers] = useState<SupabaseUser[]>([]);
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [products, setProducts] = useState<SelectOption[]>([]);
    const [lines, setLines] = useState<SelectOption[]>([]);
    const [materials, setMaterials] = useState<SelectOption[]>([]);
    const [availableDocuments, setAvailableDocuments] = useState<DocumentOption[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, title, department');

            if (error) {
                console.error('Error fetching users:', error);
                return;
            }

            setUsers(data || []);
        };

        const fetchDepartments = async () => {
            const { data, error } = await supabase
                .from('departments')
                .select('id, name, name_ar, is_active')
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            if (error) {
                console.error('Error fetching departments:', error);
                return;
            }

            setDepartments(
                (data || []).map((d: any) => ({
                    id: d.id,
                    label: d.name_ar || d.name || d.id
                }))
            );
        };

        const fetchProducts = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, name_en, is_active')
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching products:', error);
                return;
            }

            setProducts(
                (data || []).map((p: any) => ({
                    id: p.id,
                    label: p.name || p.name_en || p.id
                }))
            );
        };

        const fetchLines = async () => {
            const { data, error } = await supabase
                .from('production_lines')
                .select('id, name, name_en, is_active')
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching production lines:', error);
                return;
            }

            setLines(
                (data || []).map((l: any) => ({
                    id: l.id,
                    label: l.name || l.name_en || l.id
                }))
            );
        };

        const fetchMaterials = async () => {
            const { data, error } = await supabase
                .from('material_receiving')
                .select('id, material_name, receiving_number, batch_number')
                .order('received_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('Error fetching material receiving:', error);
                return;
            }

            setMaterials(
                (data || []).map((m: any) => ({
                    id: m.id,
                    label: m.material_name || m.receiving_number || m.id
                }))
            );
        };

        fetchUsers();
        fetchDepartments();
        fetchProducts();
        fetchLines();
        fetchMaterials();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('users-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'users' },
                () => fetchUsers()
            )
            .subscribe();

        const departmentChannel = supabase
            .channel('departments-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'departments' },
                () => fetchDepartments()
            )
            .subscribe();

        const productsChannel = supabase
            .channel('products-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                () => fetchProducts()
            )
            .subscribe();

        const linesChannel = supabase
            .channel('production_lines-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'production_lines' },
                () => fetchLines()
            )
            .subscribe();

        const materialsChannel = supabase
            .channel('material_receiving-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'material_receiving' },
                () => fetchMaterials()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(departmentChannel);
            supabase.removeChannel(productsChannel);
            supabase.removeChannel(linesChannel);
            supabase.removeChannel(materialsChannel);
        };
    }, []);

    const {
        register,
        handleSubmit,
        watch,
        reset,
        setValue,
        formState: { errors }
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            severity: 'medium',
            defectType: 'product'
        }
    });

    const defectType = watch('defectType');
    const selectedDefectId = watch('defectId');
    const selectedProductId = watch('productId');
    const selectedLineId = watch('lineId');
    const selectedMaterialId = watch('materialReceivingId');
    const selectedDepartmentId = watch('department');
    const selectedDocumentId = watch('documentId');
    const severityValue = watch('severity');
    const occurrence = watch('occurrence');
    const detection = watch('detection');

    const { defects } = useDefects({
        defectType: defectType as DefectType,
        productId: selectedProductId,
        productionLineId: selectedLineId,
        materialReceivingId: selectedMaterialId
    });

    const departmentOptions: DepartmentOption[] = departments.length
        ? departments
        : (settings?.departments || []).map((label) => ({ id: label, label }));

    const selectedDefect = defects.find(d => d.id === selectedDefectId);
    const selectedProductLabel = products.find(p => p.id === selectedProductId)?.label;
    const selectedLineLabel = lines.find(l => l.id === selectedLineId)?.label;
    const selectedMaterialLabel = materials.find(m => m.id === selectedMaterialId)?.label;
    const selectedDocument = availableDocuments.find((doc) => doc.id === selectedDocumentId);

    const occ = Number(occurrence || 0);
    const det = Number(detection || 0);
    const severityWeight = severityValue === 'high' ? 10 : severityValue === 'medium' ? 5 : 2;
    const rpn = Math.max(0, severityWeight * occ * det);
    const riskBand = rpn >= 150 ? 'حرج' : rpn >= 100 ? 'مرتفع' : rpn >= 60 ? 'متوسط' : 'منخفض';

    useEffect(() => {
        if (profile?.name) {
            setValue('createdBy', profile.name);
        }
    }, [profile, setValue]);

    useEffect(() => {
        const fetchReferenceDocuments = async () => {
            if (!selectedCompanyId) {
                setAvailableDocuments([]);
                return;
            }

            const { data: userRes } = await supabase.auth.getUser();
            const currentUserId = userRes?.user?.id;

            const { data: docsData, error: docsError } = await supabase
                .from('documents')
                .select('id, title, document_number, department_id, type')
                .eq('company_id', selectedCompanyId)
                .eq('status', 'approved')
                .in('type', ['sop', 'work_instruction'])
                .order('title');

            if (docsError) {
                console.error('Error fetching reference documents:', docsError);
                setAvailableDocuments([]);
                return;
            }

            const { data: userDeptRows } = currentUserId
                ? await supabase
                    .from('user_departments')
                    .select('department_id')
                    .eq('user_id', currentUserId)
                    .eq('is_active', true)
                : { data: [] as { department_id: string }[] };

            const userDepartmentIds = new Set<string>(
                ((userDeptRows || []) as Array<{ department_id: string | null }>)
                    .map((row) => row.department_id)
                    .filter((value): value is string => typeof value === 'string' && value.length > 0)
            );

            const { data: userShares } = currentUserId
                ? await supabase
                    .from('document_shares')
                    .select('document_id')
                    .eq('shared_with_user_id', currentUserId)
                : { data: [] as { document_id: string }[] };

            const { data: deptShares } = userDepartmentIds.size > 0
                ? await supabase
                    .from('document_shares')
                    .select('document_id')
                    .in('shared_with_department_id', Array.from(userDepartmentIds))
                : { data: [] as { document_id: string }[] };

            const sharedDocumentIds = new Set<string>(
                [...(userShares || []), ...(deptShares || [])]
                    .map((row) => row.document_id as string)
                    .filter((value): value is string => typeof value === 'string' && value.length > 0)
            );

            const localDepartmentOptions: DepartmentOption[] = departments.length
                ? departments
                : (settings?.departments || []).map((label) => ({ id: label, label }));
            const selectedDepartmentOption = localDepartmentOptions.find((d) => d.id === selectedDepartmentId);
            const selectedDepartmentUuid = selectedDepartmentOption ? selectedDepartmentOption.id : null;
            const allowedDepartmentIds = new Set<string>([
                ...Array.from(userDepartmentIds),
                ...(selectedDepartmentUuid ? [selectedDepartmentUuid] : [])
            ]);

            const filteredDocs = (docsData || []).filter((doc: DocumentOption) => {
                const isGeneral = !doc.department_id;
                const inAllowedDepartment = !!doc.department_id && allowedDepartmentIds.has(doc.department_id);
                const isShared = sharedDocumentIds.has(doc.id);
                return isGeneral || inAllowedDepartment || isShared;
            });

            setAvailableDocuments(filteredDocs);
        };

        fetchReferenceDocuments();
    }, [departments, selectedCompanyId, selectedDepartmentId, settings?.departments]);

    const onSubmit = async (values: FormData) => {
        setIsSubmitting(true);
        setFeedback(null);
        try {
            // SECURITY: Backend permission enforcement
            await requireNcrStagePermission('initial_report', 'create');
            if (!selectedCompanyId) {
                setFeedback({ type: 'error', message: 'يرجى اختيار الشركة قبل إنشاء التقرير.' });
                return;
            }

            const defectLabel = selectedDefect?.name;
            const selectedDepartmentOption = departmentOptions.find((d) => d.id === values.department);

            const payload: CreateNcrPayload = {
                date: values.date,
                shift: values.shift,
                department: selectedDepartmentOption?.label || values.department,
                defectId: values.defectId || undefined,
                defectType: values.defectType as any,
                occurrence: occ || undefined,
                detection: det || undefined,
                rpn: rpn || undefined,
                riskBand: riskBand,
                productName: selectedProductLabel || values.productName,
                lineOrArea: selectedLineLabel || values.lineOrArea,
                reservedQty: values.reservedQty,
                reservedUnit: values.reservedUnit,
                severity: severityValue,
                standardDefect: defectLabel || undefined,
                customType: defectLabel ? undefined : undefined,
                discoveredBy: values.discoveredBy || 'Unknown',
                createdBy: values.createdBy || 'System',
                description: values.description,
                immediateAction: values.immediateAction,
                documentId: values.documentId || undefined,
                documentTitle: selectedDocument ? `${selectedDocument.document_number || ''} ${selectedDocument.title}`.trim() : undefined,
                relatedMaterialReceivingId: values.materialReceivingId || undefined,
                relatedMaterialName: selectedMaterialLabel || undefined,
                companyId: selectedCompanyId
            };
            await createNcr(payload);
            setFeedback({ type: 'success', message: 'تم حفظ التقرير بنجاح!' });
            setTimeout(() => navigate('/ncr'), 1500);
        } catch (err) {
            console.error(err);
            if (err instanceof PermissionError) {
                setFeedback({ type: 'error', message: err.message_ar || 'ليس لديك صلاحية لإنشاء تقارير عدم المطابقة.' });
            } else {
                setFeedback({ type: 'error', message: 'حدث خطأ أثناء حفظ التقرير، حاول مرة أخرى.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link to="/ncr" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-2 transition-colors">
                    <ArrowRightIcon className="w-4 h-4" />
                    <span>العودة للقائمة</span>
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إنشاء تقرير عدم مطابقة جديد</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">سيتم تخزين البيانات مباشرة وتتبع حالة التقرير</p>
            </div>

            {/* Feedback */}
            {feedback && (
                <div className={`mb-6 p-4 rounded-corporate flex items-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
                    }`}>
                    {feedback.type === 'success' && <CheckCircleIcon className="w-5 h-5" />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {authLoading ? (
                <FormSkeleton />
            ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white dark:bg-slate-800 rounded-corporate-lg border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-card">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">معلومات أساسية</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الشركة *</label>
                                <div className="relative">
                                    <BuildingOffice2Icon className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                                    <select
                                        value={selectedCompanyId || ''}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                selectCompany(e.target.value);
                                            }
                                        }}
                                        className="w-full pr-9 rounded-corporate border-slate-200 dark:border-slate-700 dark:bg-slate-900/50 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                                    >
                                        <option value="">اختر الشركة</option>
                                        {companies.map((company) => (
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التاريخ *</label>
                                <input type="date" {...register('date')} className="w-full rounded-corporate border-slate-200 dark:border-slate-700 dark:bg-slate-900/50 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                                {errors.date && <p className="text-rose-500 text-sm mt-1">{errors.date.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">القسم *</label>
                                <select {...register('department')} className="w-full rounded-corporate border-slate-200 dark:border-slate-700 dark:bg-slate-900/50 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
                                    <option value="">اختر القسم</option>
                                    {departmentOptions.map((dept) => (
                                        <option key={dept.id} value={dept.id}>{dept.label}</option>
                                    ))}
                                </select>
                                {errors.department && <p className="text-rose-500 text-sm mt-1">{errors.department.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الوردية</label>
                                <select {...register('shift')} className="w-full rounded-corporate border-slate-200 dark:border-slate-700 dark:bg-slate-900/50 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
                                    <option value="">اختياري</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                </select>
                            </div>
                            {/* Document Reference Field */}
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وثيقة مرجعية (SOP/WI)</label>
                                <select
                                    {...register('documentId')}
                                    className="w-full rounded-corporate border-slate-200 dark:border-slate-700 dark:bg-slate-900/50 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                                >
                                    <option value="">اختر وثيقة ذات صلَة (اختياري)</option>
                                    {availableDocuments.map((doc) => (
                                        <option key={doc.id} value={doc.id}>{doc.document_number} - {doc.title}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-1">يمكنك ربط هذا التقرير بوثيقة إجراء عمل قياسي أو تعليمات عمل.</p>
                            </div>
                        </div>
                    </div>

                    {/* Defect Details (Contextual) */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">تفاصيل العيب والتقييم</h2>
                        <div className="space-y-4">
                            {/* نوع العيب والمصدر */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع العيب</label>
                                    <select {...register('defectType')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700">
                                        <option value="raw_material">خامة مستلمة</option>
                                        <option value="product">منتج</option>
                                        <option value="process">عملية / خط</option>
                                        <option value="other">أخرى</option>
                                    </select>
                                </div>
                                {defectType === 'raw_material' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الخامة / الاستلام</label>
                                        <select {...register('materialReceivingId')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700">
                                            <option value="">اختياري</option>
                                            {materials.map((m) => (
                                                <option key={m.id} value={m.id}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {defectType === 'product' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المنتج المتأثر</label>
                                        <select {...register('productId')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700">
                                            <option value="">اختر المنتج</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {defectType === 'process' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الخط / العملية</label>
                                        <select {...register('lineId')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700">
                                            <option value="">اختر الخط</option>
                                            {lines.map((l) => (
                                                <option key={l.id} value={l.id}>{l.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* شدة الخطورة */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مستوى الخطورة *</label>
                                    <select {...register('severity')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700">
                                        <option value="low">منخفض</option>
                                        <option value="medium">متوسط</option>
                                        <option value="high">مرتفع</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الكمية المحجوزة</label>
                                    <input type="number" {...register('reservedQty')} placeholder="اختياري" className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوحدة</label>
                                    <select {...register('reservedUnit')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700">
                                        <option value="">اختياري</option>
                                        {settings?.units?.map((u) => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* اختيار العيب / إضافة جديد */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العيب</label>
                                <select {...register('defectId')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700">
                                    <option value="">اختر العيب</option>
                                    {defects.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name} — {d.severity === 'high' ? 'مرتفع' : d.severity === 'medium' ? 'متوسط' : 'منخفض'}</option>
                                    ))}
                                </select>
                                {errors.defectId && <p className="text-rose-500 text-sm mt-1">{errors.defectId.message}</p>}
                            </div>

                            {/* تقييم المخاطر */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تكرار الحدوث (1-10)</label>
                                    <input type="number" min="1" max="10" {...register('occurrence')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إمكانية الكشف (1-10)</label>
                                    <input type="number" min="1" max="10" {...register('detection')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <div className="text-xs text-gray-500">RPN</div>
                                    <div className="text-2xl font-bold text-primary-600">{rpn || 0}</div>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <div className="text-xs text-gray-500">تصنيف المخاطر</div>
                                    <div className="text-sm font-semibold">{riskBand}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">الوصف والإجراءات</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف التفصيلي *</label>
                                <textarea rows={4} {...register('description')} placeholder="اشرح تفاصيل عدم المطابقة" className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
                                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الإجراء الفوري المتخذ</label>
                                <textarea rows={3} {...register('immediateAction')} placeholder="الإجراءات التي تمت فوراً" className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* Responsibility */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">المسؤولية</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تم الاكتشاف بواسطة *</label>
                                <select {...register('discoveredBy')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700">
                                    <option value="">اختر المستخدم</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.name || user.email || user.id}>
                                            {user.name || user.email || user.id}{user.title ? ` – ${user.title}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.discoveredBy && <p className="text-red-500 text-sm mt-1">{errors.discoveredBy.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حرر بواسطة</label>
                                <div className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300">
                                    {profile?.name || profile?.email || 'غير محدد'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => reset()}
                            className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 rounded-corporate text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                        >
                            إلغاء /مسح
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedCompanyId}
                            className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-corporate hover:from-primary-700 hover:to-primary-600 transition-all duration-250 disabled:opacity-50 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 disabled:hover:translate-y-0"
                        >
                            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التقرير'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default NcrNewPage;
