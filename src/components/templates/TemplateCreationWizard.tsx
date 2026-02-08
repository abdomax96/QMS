import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import type { TemplateType, TemplateTypeConfig, Folder } from '../../types';

interface TemplateCreationWizardProps {
  folders: Folder[];
  templateTypes: TemplateTypeConfig[];
  onComplete: (templateData: any) => void;
  onCancel: () => void;
}

type WizardStep = 'type-selection' | 'folder-selection' | 'properties' | 'review';

const TemplateCreationWizard: React.FC<TemplateCreationWizardProps> = ({
  folders,
  templateTypes,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('type-selection');
  const [selectedType, setSelectedType] = useState<TemplateType | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [customProperties, setCustomProperties] = useState<Record<string, any>>({});

  const steps = [
    { id: 'type-selection', title: 'اختيار نوع النموذج', description: 'اختر نوع النموذج الذي تريد إنشاءه' },
    { id: 'folder-selection', title: 'اختيار المجلد', description: 'حدد المجلد الذي سيتم حفظ النموذج فيه' },
    { id: 'properties', title: 'خصائص النموذج', description: 'تحديد خصائص وإعدادات النموذج' },
    { id: 'review', title: 'مراجعة', description: 'مراجعة وتأكيد إنشاء النموذج' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const canGoNext = () => {
    switch (currentStep) {
      case 'type-selection':
        return selectedType !== null;
      case 'folder-selection':
        return selectedFolder !== null;
      case 'properties':
        return templateName.trim() !== '';
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 'review') {
      // Complete template creation
      const templateData = {
        name: templateName,
        type: selectedType,
        folder_id: selectedFolder,
        description: templateDescription,
        custom_properties: customProperties,
        template_type_config: templateTypes.find(t => t.id === selectedType)
      };
      onComplete(templateData);
    } else {
      const nextStep = steps[currentStepIndex + 1];
      setCurrentStep(nextStep.id as WizardStep);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1];
      setCurrentStep(prevStep.id as WizardStep);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'type-selection':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templateTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-4 rounded-lg border text-right transition-all ${
                  selectedType === type.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{type.icon}</span>
                  <div
                    className="w-4 h-4 rounded-full border-2"
                    style={{ borderColor: type.color }}
                  />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {type.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {type.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {type.available_tools.slice(0, 3).map((tool) => (
                    <span
                      key={tool.id}
                      className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                    >
                      {tool.name}
                    </span>
                  ))}
                  {type.available_tools.length > 3 && (
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      +{type.available_tools.length - 3}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        );

      case 'folder-selection':
        return (
          <div className="space-y-4">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full p-4 rounded-lg border text-right transition-all ${
                  selectedFolder === folder.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{folder.icon}</span>
                    <div className="text-right">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {folder.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {folder.path}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {folder.stats.form_templates_count} نماذج
                    </div>
                    <div
                      className="w-4 h-4 rounded-full border-2"
                      style={{ borderColor: folder.color }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        );

      case 'properties':
        const selectedTypeConfig = templateTypes.find(t => t.id === selectedType);
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اسم النموذج *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="أدخل اسم النموذج"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الوصف
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="وصف موجز للنموذج"
              />
            </div>

            {selectedTypeConfig && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  خصائص إضافية
                </h4>
                <div className="space-y-3">
                  {selectedTypeConfig.optional_properties.map((propId) => (
                    <div key={propId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {propId}
                      </span>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          setCustomProperties(prev => ({
                            ...prev,
                            [propId]: e.target.checked
                          }));
                        }}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'review':
        const typeConfig = templateTypes.find(t => t.id === selectedType);
        const folder = folders.find(f => f.id === selectedFolder);
        return (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  استعد لإنشاء النموذج
                </h3>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                جميع المعلومات المطلوبة مكتملة. انقر "إنشاء النموذج" للمتابعة.
              </p>
            </div>

            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  اسم النموذج
                </h4>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {templateName}
                </p>
              </div>

              <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  نوع النموذج
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{typeConfig?.icon}</span>
                  <p className="text-gray-900 dark:text-white">{typeConfig?.name}</p>
                </div>
              </div>

              <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  المجلد
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{folder?.icon}</span>
                  <p className="text-gray-900 dark:text-white">{folder?.name}</p>
                </div>
              </div>

              {templateDescription && (
                <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    الوصف
                  </h4>
                  <p className="text-gray-900 dark:text-white">{templateDescription}</p>
                </div>
              )}

              {Object.keys(customProperties).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    الخصائص المفعلة
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(customProperties)
                      .filter(([_, value]) => value)
                      .map(([key]) => (
                        <span
                          key={key}
                          className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                        >
                          {key}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            إنشاء نموذج جديد
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            إلغاء
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index <= currentStepIndex
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {index < currentStepIndex ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="hidden sm:block ml-3">
                <div className={`text-sm font-medium ${
                  index <= currentStepIndex
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {step.description}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`hidden sm:block w-12 h-0.5 mx-4 ${
                  index < currentStepIndex
                    ? 'bg-primary-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderStepContent()}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentStepIndex === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ChevronLeftIcon className="w-4 h-4" />
            السابق
          </button>

          <button
            onClick={handleNext}
            disabled={!canGoNext()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              canGoNext()
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {currentStep === 'review' ? 'إنشاء النموذج' : 'التالي'}
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateCreationWizard;
