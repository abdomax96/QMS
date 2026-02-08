/**
 * Unified Dashboard with Tabs
 * Combines Reports Dashboard, NCR Dashboard, Lab Dashboard, and Tasks Dashboard
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FolderIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
  ChartBarIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import useStore from '../store';
import { formatDate } from '../utils';
import { useNcrs } from '../hooks/ncr/useNcrs';
import { useLabStore } from '../store/labStore';
import { useTaskStore } from '../store/taskStore';
import { useMasterDataStore } from '../store/masterDataStore';
import type { NcrRecord } from '../types/ncr';
import dayjs from 'dayjs';
import { PageSkeleton } from '../components/common/LoadingStates';

type DashboardTab = 'reports' | 'ncr' | 'lab' | 'tasks';

const UnifiedDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('reports');

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          لوحة التحكم
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          نظرة عامة على النظام والإحصائيات المتكاملة
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-corporate-lg w-fit mb-6 flex-wrap shadow-inner-soft">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-corporate font-medium transition-all duration-250 ${activeTab === 'reports'
            ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-card'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
        >
          <ChartBarIcon className="w-5 h-5" />
          التقارير
        </button>
        <button
          onClick={() => setActiveTab('ncr')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-corporate font-medium transition-all duration-250 ${activeTab === 'ncr'
            ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-card'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
        >
          <ExclamationTriangleIcon className="w-5 h-5" />
          عدم المطابقة
        </button>
        <button
          onClick={() => setActiveTab('lab')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-corporate font-medium transition-all duration-250 ${activeTab === 'lab'
            ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-card'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
        >
          <BeakerIcon className="w-5 h-5" />
          المختبر
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-corporate font-medium transition-all duration-250 ${activeTab === 'tasks'
            ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-card'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
        >
          <ClipboardDocumentListIcon className="w-5 h-5" />
          المهام
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'reports' && <ReportsDashboard />}
      {activeTab === 'ncr' && <NcrDashboard />}
      {activeTab === 'lab' && <LabDashboard />}
      {activeTab === 'tasks' && <TasksDashboard />}
    </div>
  );
};

// ============ Reports Dashboard Tab ============

const ReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { folders, formTemplates, formInstances, fetchAllData, isLoading } = useStore();

  React.useEffect(() => {
    fetchAllData();
  }, []);

  const stats = useMemo(() => {
    const instances = Object.values(formInstances);
    return {
      totalFolders: Object.keys(folders).length,
      totalTemplates: Object.keys(formTemplates).length,
      totalReports: instances.length,
      pendingReports: instances.filter(i => i.status === 'draft').length,
      submittedReports: instances.filter(i => i.status === 'submitted').length,
      approvedReports: instances.filter(i => i.status === 'approved').length,
      rejectedReports: instances.filter(i => i.status === 'rejected').length,
    };
  }, [folders, formTemplates, formInstances]);

  const monthlyData = useMemo(() => {
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const now = new Date();
    const last6Months: { month: string; reports: number; templates: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();

      const reportsCount = Object.values(formInstances).filter(instance => {
        const createdDate = new Date(instance.created_at);
        return createdDate.getMonth() === monthIndex && createdDate.getFullYear() === year;
      }).length;

      const templatesCount = Object.values(formTemplates).filter(template => {
        const createdDate = new Date(template.created_at);
        return createdDate.getMonth() === monthIndex && createdDate.getFullYear() === year;
      }).length;

      last6Months.push({ month: monthNames[monthIndex], reports: reportsCount, templates: templatesCount });
    }

    return last6Months;
  }, [formInstances, formTemplates]);

  const statusData = [
    { name: 'معتمد', value: stats.approvedReports, color: '#10B981' },
    { name: 'مسودة', value: stats.pendingReports, color: '#F59E0B' },
    { name: 'مرفوض', value: stats.rejectedReports, color: '#EF4444' },
  ].filter(item => item.value > 0);

  const recentReports = Object.values(formInstances)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const statCards = [
    { title: 'المجلدات', value: stats.totalFolders, icon: FolderIcon, gradient: 'from-blue-500 to-blue-600', onClick: () => navigate('/forms&reports') },
    { title: 'القوالب', value: stats.totalTemplates, icon: DocumentTextIcon, gradient: 'from-emerald-500 to-emerald-600', onClick: () => navigate('/forms&reports') },
    { title: 'التقارير', value: stats.totalReports, icon: ClipboardDocumentCheckIcon, gradient: 'from-violet-500 to-violet-600', onClick: () => navigate('/forms&reports') },
  ];

  if (isLoading && Object.keys(formInstances).length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <button
            key={index}
            onClick={card.onClick}
            className="bg-white dark:bg-slate-800 rounded-corporate-lg p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 text-right w-full group"
          >
            <div className="flex items-center justify-between">
              <div className={`w-14 h-14 bg-gradient-to-br ${card.gradient} rounded-corporate-lg flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform duration-300`}>
                <card.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                <p className="text-slate-500 dark:text-slate-400">{card.title}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">النشاط الشهري</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="reports" stroke="#3B82F6" strokeWidth={2} name="التقارير" />
              <Line type="monotone" dataKey="templates" stroke="#10B981" strokeWidth={2} name="القوالب" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">توزيع الحالات</h3>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-500">
              لا توجد تقارير بعد
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={false}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            أحدث التقارير
          </h3>
          <Link to="/forms&reports" className="text-sm text-primary-600 hover:underline">عرض الكل</Link>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {recentReports.length === 0 ? (
            <p className="p-6 text-center text-gray-500">لا توجد تقارير بعد</p>
          ) : (
            recentReports.map(report => (
              <div key={report.instance_id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{report.name || 'بدون عنوان'}</p>
                  <p className="text-sm text-gray-500">{formatDate(report.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/report/${report.instance_id}`)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg">
                    <EyeIcon className="w-5 h-5 text-gray-500" />
                  </button>
                  <button onClick={() => navigate(`/report/${report.instance_id}/edit`)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg">
                    <PencilIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============ NCR Dashboard Tab ============

const NcrDashboard: React.FC = () => {
  const { ncrs, isLoading } = useNcrs();

  const stats = useMemo(() => {
    const total = ncrs.length;
    const open = ncrs.filter((n: NcrRecord) => n.status === 'open').length;
    const inProgress = ncrs.filter((n: NcrRecord) => n.status === 'analysis' || n.status === 'action').length;
    const closed = ncrs.filter((n: NcrRecord) => n.status === 'closed').length;
    const highSeverity = ncrs.filter((n: NcrRecord) => n.severity === 'high').length;

    const monthlyData: Record<string, number> = {};
    const now = dayjs();
    for (let i = 5; i >= 0; i--) {
      const month = now.subtract(i, 'month').format('YYYY-MM');
      monthlyData[month] = 0;
    }
    ncrs.forEach((n: NcrRecord) => {
      const month = dayjs(n.date).format('YYYY-MM');
      if (monthlyData[month] !== undefined) {
        monthlyData[month]++;
      }
    });

    const deptData: Record<string, number> = {};
    ncrs.forEach((n: NcrRecord) => {
      const dept = n.department || 'غير محدد';
      deptData[dept] = (deptData[dept] || 0) + 1;
    });

    const severityData = {
      high: ncrs.filter((n: NcrRecord) => n.severity === 'high').length,
      medium: ncrs.filter((n: NcrRecord) => n.severity === 'medium').length,
      low: ncrs.filter((n: NcrRecord) => n.severity === 'low').length
    };

    return { total, open, inProgress, closed, highSeverity, monthlyData, deptData, severityData };
  }, [ncrs]);

  const recentNcrs = useMemo(() => {
    return [...ncrs]
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
      .slice(0, 5);
  }, [ncrs]);

  const overdueNcrs = useMemo(() => {
    const sevenDaysAgo = dayjs().subtract(7, 'day');
    return ncrs.filter((n: NcrRecord) =>
      n.status !== 'closed' && dayjs(n.date).isBefore(sevenDaysAgo)
    );
  }, [ncrs]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  const statCards = [
    { label: 'إجمالي التقارير', value: stats.total, icon: DocumentTextIcon, bgColor: 'bg-blue-100 dark:bg-blue-900', textColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'مفتوحة', value: stats.open, icon: ClockIcon, bgColor: 'bg-yellow-100 dark:bg-yellow-900', textColor: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'قيد المعالجة', value: stats.inProgress, icon: ArrowTrendingUpIcon, bgColor: 'bg-purple-100 dark:bg-purple-900', textColor: 'text-purple-600 dark:text-purple-400' },
    { label: 'مغلقة', value: stats.closed, icon: CheckCircleIcon, bgColor: 'bg-green-100 dark:bg-green-900', textColor: 'text-green-600 dark:text-green-400' },
    { label: 'خطورة مرتفعة', value: stats.highSeverity, icon: ExclamationTriangleIcon, bgColor: 'bg-red-100 dark:bg-red-900', textColor: 'text-red-600 dark:text-red-400' }
  ];

  const monthLabels: Record<string, string> = {
    '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
    '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
    '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
  };

  const maxMonthlyValue = Math.max(...Object.values(stats.monthlyData), 1);

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
        <Link
          to="/ncr/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          تقرير جديد
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">التقارير الشهرية</h3>
          <div className="flex items-end gap-2 h-48">
            {Object.entries(stats.monthlyData).map(([month, count]) => {
              const monthNum = month.split('-')[1];
              const height = (count / maxMonthlyValue) * 100;
              return (
                <div key={month} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary-500 rounded-t transition-all duration-300 hover:bg-primary-600"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`${count} تقرير`}
                  />
                  <div className="text-xs text-gray-500 mt-2">{monthLabels[monthNum] || monthNum}</div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">توزيع الخطورة</h3>
          <div className="space-y-4">
            {[
              { label: 'مرتفع', value: stats.severityData.high, color: 'bg-red-500', textColor: 'text-red-600' },
              { label: 'متوسط', value: stats.severityData.medium, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
              { label: 'منخفض', value: stats.severityData.low, color: 'bg-green-500', textColor: 'text-green-600' }
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className={`text-sm font-medium ${item.textColor}`}>{item.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${item.color} h-3 rounded-full transition-all duration-300`}
                    style={{ width: `${stats.total ? (item.value / stats.total * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mt-6 mb-3">حسب القسم</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.deptData).slice(0, 5).map(([dept, count]) => (
              <span key={dept} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
                <span className="text-gray-700 dark:text-gray-300">{dept}</span>
                <span className="font-medium text-primary-600">{count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent NCRs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">أحدث التقارير</h3>
            <Link to="/ncr" className="text-sm text-primary-600 hover:underline">عرض الكل</Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentNcrs.length === 0 ? (
              <div className="p-4 text-center text-gray-500">لا توجد تقارير</div>
            ) : (
              recentNcrs.map((ncr: NcrRecord) => (
                <Link key={ncr.id} to={`/ncr/${ncr.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{ncr.number}</div>
                      <div className="text-sm text-gray-500">{ncr.department}</div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${ncr.severity === 'high' ? 'bg-red-100 text-red-800' :
                      ncr.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                      {ncr.severity === 'high' ? 'مرتفع' : ncr.severity === 'medium' ? 'متوسط' : 'منخفض'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{dayjs(ncr.date).format('YYYY-MM-DD')}</div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Overdue NCRs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
              تقارير متأخرة
              {overdueNcrs.length > 0 && (
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">
                  {overdueNcrs.length}
                </span>
              )}
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {overdueNcrs.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <CheckCircleIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                لا توجد تقارير متأخرة
              </div>
            ) : (
              overdueNcrs.slice(0, 5).map((ncr: NcrRecord) => (
                <Link key={ncr.id} to={`/ncr/${ncr.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{ncr.number}</div>
                      <div className="text-sm text-gray-500">{ncr.productName || ncr.department}</div>
                    </div>
                    <span className="text-xs text-orange-600">
                      {dayjs().diff(dayjs(ncr.date), 'day')} يوم
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ Lab Dashboard Tab ============

const LabDashboard: React.FC = () => {
  const { labTests, materials, getPendingLabTests, getPendingMaterials } = useLabStore();
  const { suppliers, getApprovedSuppliers } = useMasterDataStore();
  const { ncrs } = useNcrs();

  const stats = useMemo(() => {
    const pendingTests = getPendingLabTests().length;
    const completedTests = labTests.filter(t => t.status === 'completed' || t.status === 'approved').length;
    const rejectedTests = labTests.filter(t => t.status === 'rejected').length;
    const pendingMaterials = getPendingMaterials().length;
    const rejectedMaterials = materials.filter(m => m.status === 'rejected').length;
    const approvedSuppliers = getApprovedSuppliers().length;

    // NCRs generated from lab
    const autoNcrs = ncrs.filter(n => n.autoGeneratedFromLab).length;

    return {
      pendingTests,
      completedTests,
      rejectedTests,
      totalTests: labTests.length,
      pendingMaterials,
      rejectedMaterials,
      totalMaterials: materials.length,
      totalSuppliers: suppliers.length,
      approvedSuppliers,
      autoNcrs
    };
  }, [labTests, materials, suppliers, ncrs, getPendingLabTests, getPendingMaterials, getApprovedSuppliers]);

  const recentTests = labTests
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const statCards = [
    { label: 'فحوصات معلقة', value: stats.pendingTests, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900' },
    { label: 'فحوصات مكتملة', value: stats.completedTests, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900' },
    { label: 'فحوصات مرفوضة', value: stats.rejectedTests, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' },
    { label: 'مواد في الانتظار', value: stats.pendingMaterials, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
    { label: 'NCR تلقائي', value: stats.autoNcrs, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900' }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link to="/lab/receiving/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <TruckIcon className="w-5 h-5" />
          استلام جديد
        </Link>
        <Link to="/lab/quick-entry" className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <BeakerIcon className="w-5 h-5" />
          فحص جديد
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tests */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BeakerIcon className="w-5 h-5 text-primary-600" />
              أحدث الفحوصات
            </h3>
            <Link to="/lab/tests/results" className="text-sm text-primary-600 hover:underline">عرض الكل</Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentTests.length === 0 ? (
              <div className="p-4 text-center text-gray-500">لا توجد فحوصات</div>
            ) : (
              recentTests.map(test => (
                <Link key={test.id} to={`/lab/tests/results/${test.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{test.testNumber}</div>
                      <div className="text-sm text-gray-500">{test.sample.sourceName}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${test.status === 'approved' ? 'bg-green-100 text-green-800' :
                      test.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        test.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {test.status === 'approved' ? 'معتمد' :
                        test.status === 'rejected' ? 'مرفوض' :
                          test.status === 'in_progress' ? 'قيد الفحص' : 'معلق'}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Supplier Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-primary-600" />
              الموردين
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">إجمالي الموردين</span>
              <span className="font-bold text-gray-900 dark:text-white">{stats.totalSuppliers}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">موردين معتمدين</span>
              <span className="font-bold text-green-600">{stats.approvedSuppliers}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">إجمالي المواد المستلمة</span>
              <span className="font-bold text-blue-600">{stats.totalMaterials}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">مواد مرفوضة</span>
              <span className="font-bold text-red-600">{stats.rejectedMaterials}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ Tasks Dashboard Tab ============

const TasksDashboard: React.FC = () => {
  const { tasks, getFilteredTasks, getOverdueTasks, getTasksByStatus } = useTaskStore();

  const stats = useMemo(() => {
    const pending = getTasksByStatus('pending').length;
    const inProgress = getTasksByStatus('in_progress').length;
    const completed = getTasksByStatus('completed').length;
    const overdue = getOverdueTasks().length;

    // Tasks by category
    const byCategory: Record<string, number> = {};
    tasks.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    });

    return { total: tasks.length, pending, inProgress, completed, overdue, byCategory };
  }, [tasks, getTasksByStatus, getOverdueTasks]);

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const overdueTasks = getOverdueTasks().slice(0, 5);

  const categoryLabels: Record<string, string> = {
    general: 'عامة',
    ncr: 'عدم مطابقة',
    quality: 'جودة',
    maintenance: 'صيانة',
    safety: 'سلامة',
    training: 'تدريب',
    audit: 'تدقيق'
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex justify-end">
        <Link to="/tasks/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <PlusIcon className="w-5 h-5" />
          مهمة جديدة
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'الإجمالي', value: stats.total, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-700' },
          { label: 'معلقة', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900' },
          { label: 'قيد التنفيذ', value: stats.inProgress, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
          { label: 'مكتملة', value: stats.completed, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900' },
          { label: 'متأخرة', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' }
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">حسب الفئة</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byCategory).map(([cat, count]) => (
            <span key={cat} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
              <span className="text-gray-700 dark:text-gray-300">{categoryLabels[cat] || cat}</span>
              <span className="font-medium text-primary-600">{count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">أحدث المهام</h3>
            <Link to="/tasks" className="text-sm text-primary-600 hover:underline">عرض الكل</Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentTasks.length === 0 ? (
              <div className="p-4 text-center text-gray-500">لا توجد مهام</div>
            ) : (
              recentTasks.map(task => (
                <Link key={task.id} to={`/tasks/${task.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                      <div className="text-sm text-gray-500">{categoryLabels[task.category] || task.category}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {task.status === 'completed' ? 'مكتمل' :
                        task.status === 'in_progress' ? 'قيد التنفيذ' : 'معلق'}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
              مهام متأخرة
              {overdueTasks.length > 0 && (
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">
                  {overdueTasks.length}
                </span>
              )}
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {overdueTasks.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <CheckCircleIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                لا توجد مهام متأخرة
              </div>
            ) : (
              overdueTasks.map(task => (
                <Link key={task.id} to={`/tasks/${task.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                      <div className="text-sm text-gray-500">{task.dueDate && dayjs(task.dueDate).format('YYYY-MM-DD')}</div>
                    </div>
                    <span className="text-xs text-red-600">
                      {task.dueDate && dayjs().diff(dayjs(task.dueDate), 'day')} يوم تأخير
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedDashboard;
