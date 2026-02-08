import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn } from '../../utils';
import MathRenderer from './MathRenderer';
import {
    validateFormula,
    evaluateExpression,
    formatResult,
    getAvailableFunctions,
    getAvailableConstants,
    MATH_FUNCTIONS,
} from '../../utils/FormulaEngine';
import type { TableParameter, FormTemplate } from '../../types';
import { variableService } from '../../services/variableService';
import type { Variable } from '../../types/supabase';

// ============================================
// TYPES
// ============================================
interface AdvancedFormulaBuilderProps {
    formula: string;
    onChange: (formula: string) => void;
    currentTableId: string;
    currentTableName: string;
    currentParameters: TableParameter[];
    template: FormTemplate;
    customVariables?: Record<string, any>;
    onClose?: () => void;
}

interface ParameterOption {
    id: string;
    displayName: string;
    tableId: string;
    tableName: string;
    paramName: string;
    isCurrentTable: boolean;
}

// ============================================
// FUNCTION PALETTES
// ============================================
const SYMBOL_CATEGORIES = [
    {
        id: 'calculus',
        name: 'تفاضل وتكامل',
        icon: '∫',
        symbols: [
            { latex: '\\int', display: '∫', label: 'تكامل', calc: '' },
            { latex: '\\int_{a}^{b}', display: '∫ₐᵇ', label: 'تكامل محدود', calc: '' },
            { latex: '\\sum_{i=1}^{n}', display: 'Σ', label: 'مجموع', calc: 'SUM(' },
            { latex: '\\prod_{i=1}^{n}', display: '∏', label: 'جداء', calc: '' },
            { latex: '\\lim_{x \\to \\infty}', display: 'lim', label: 'نهاية', calc: '' },
            { latex: '\\frac{d}{dx}', display: 'd/dx', label: 'مشتقة', calc: '' },
            { latex: '\\partial', display: '∂', label: 'مشتقة جزئية', calc: '' },
            { latex: '\\nabla', display: '∇', label: 'نابلا', calc: '' },
        ],
    },
    {
        id: 'fractions',
        name: 'كسور وجذور',
        icon: '√',
        symbols: [
            { latex: '\\frac{a}{b}', display: 'a/b', label: 'كسر', calc: '(a)/(b)' },
            { latex: '\\sqrt{x}', display: '√x', label: 'جذر تربيعي', calc: 'sqrt(x)' },
            { latex: '\\sqrt[n]{x}', display: 'ⁿ√x', label: 'جذر نوني', calc: 'pow(x, 1/n)' },
            { latex: 'x^{n}', display: 'xⁿ', label: 'أس', calc: 'pow(x,n)' },
            { latex: 'x_{i}', display: 'xᵢ', label: 'مؤشر سفلي', calc: '' },
            { latex: 'x^{2}', display: 'x²', label: 'تربيع', calc: 'pow(x,2)' },
            { latex: 'x^{3}', display: 'x³', label: 'تكعيب', calc: 'pow(x,3)' },
        ],
    },
    {
        id: 'trig',
        name: 'مثلثية',
        icon: 'sin',
        symbols: [
            { latex: '\\sin', display: 'sin', label: 'جيب', calc: 'sin(' },
            { latex: '\\cos', display: 'cos', label: 'جيب التمام', calc: 'cos(' },
            { latex: '\\tan', display: 'tan', label: 'ظل', calc: 'tan(' },
            { latex: '\\cot', display: 'cot', label: 'ظل التمام', calc: 'cot(' },
            { latex: '\\sec', display: 'sec', label: 'قاطع', calc: 'sec(' },
            { latex: '\\csc', display: 'csc', label: 'قاطع التمام', calc: 'csc(' },
            { latex: '\\arcsin', display: 'arcsin', label: 'معكوس الجيب', calc: 'asin(' },
            { latex: '\\arccos', display: 'arccos', label: 'معكوس جيب التمام', calc: 'acos(' },
            { latex: '\\arctan', display: 'arctan', label: 'معكوس الظل', calc: 'atan(' },
        ],
    },
    {
        id: 'log',
        name: 'لوغاريتمية',
        icon: 'log',
        symbols: [
            { latex: '\\log', display: 'log', label: 'لوغاريتم', calc: 'log10(' },
            { latex: '\\ln', display: 'ln', label: 'لوغاريتم طبيعي', calc: 'ln(' },
            { latex: '\\log_{b}', display: 'logᵦ', label: 'لوغاريتم أساسي', calc: 'log(' },
            { latex: 'e^{x}', display: 'eˣ', label: 'أسي', calc: 'exp(' },
            { latex: '\\exp', display: 'exp', label: 'دالة أسية', calc: 'exp(' },
        ],
    },
    {
        id: 'greek',
        name: 'يونانية',
        icon: 'π',
        symbols: [
            { latex: '\\alpha', display: 'α', label: 'ألفا', calc: '' },
            { latex: '\\beta', display: 'β', label: 'بيتا', calc: '' },
            { latex: '\\gamma', display: 'γ', label: 'جاما', calc: '' },
            { latex: '\\delta', display: 'δ', label: 'دلتا', calc: '' },
            { latex: '\\epsilon', display: 'ε', label: 'إبسيلون', calc: '' },
            { latex: '\\theta', display: 'θ', label: 'ثيتا', calc: '' },
            { latex: '\\lambda', display: 'λ', label: 'لامدا', calc: '' },
            { latex: '\\mu', display: 'μ', label: 'مو', calc: '' },
            { latex: '\\pi', display: 'π', label: 'باي', calc: 'PI' },
            { latex: '\\sigma', display: 'σ', label: 'سيجما', calc: '' },
            { latex: '\\omega', display: 'ω', label: 'أوميجا', calc: '' },
            { latex: '\\phi', display: 'φ', label: 'فاي', calc: 'PHI' },
            { latex: '\\Delta', display: 'Δ', label: 'دلتا كبيرة', calc: '' },
            { latex: '\\Sigma', display: 'Σ', label: 'سيجما كبيرة', calc: '' },
            { latex: '\\Omega', display: 'Ω', label: 'أوميجا كبيرة', calc: '' },
        ],
    },
    {
        id: 'operators',
        name: 'عمليات',
        icon: '±',
        symbols: [
            { latex: '+', display: '+', label: 'جمع', calc: '+' },
            { latex: '-', display: '−', label: 'طرح', calc: '-' },
            { latex: '\\times', display: '×', label: 'ضرب', calc: '*' },
            { latex: '\\div', display: '÷', label: 'قسمة', calc: '/' },
            { latex: '\\pm', display: '±', label: 'موجب/سالب', calc: '' },
            { latex: '\\cdot', display: '·', label: 'ضرب نقطي', calc: '*' },
            { latex: '\\neq', display: '≠', label: 'لا يساوي', calc: '!=' },
            { latex: '\\leq', display: '≤', label: 'أصغر أو يساوي', calc: '<=' },
            { latex: '\\geq', display: '≥', label: 'أكبر أو يساوي', calc: '>=' },
            { latex: '\\approx', display: '≈', label: 'يساوي تقريباً', calc: '' },
            { latex: '\\infty', display: '∞', label: 'لا نهاية', calc: 'Infinity' },
        ],
    },
    {
        id: 'stats',
        name: 'إحصائية',
        icon: 'x̄',
        symbols: [
            { latex: '\\bar{x}', display: 'x̄', label: 'متوسط', calc: 'AVG(' },
            { latex: '\\hat{x}', display: 'x̂', label: 'مقدر', calc: '' },
            { latex: '\\tilde{x}', display: 'x̃', label: 'وسيط', calc: 'MEDIAN(' },
            { latex: 'n!', display: 'n!', label: 'مضروب', calc: 'FACTORIAL(' },
            { latex: '\\binom{n}{k}', display: 'C(n,k)', label: 'توافيق', calc: 'COMBIN(' },
            { latex: '\\sigma^2', display: 'σ²', label: 'تباين', calc: 'VAR(' },
        ],
    },

];

const FORMULA_TEMPLATES = [
    { name: 'متوسط (Average)', description: 'حساب المتوسط الحسابي', formula: 'AVG(' },
    { name: 'انحراف معياري (Std Dev)', description: 'الانحراف المعياري للعينة', formula: 'stdev(' },
    { name: 'CPK', description: 'مؤشر قدرة العملية', formula: 'min((USL - Mean) / (3 * StdDev), (Mean - LSL) / (3 * StdDev))' },
    { name: 'OEE', description: 'الفعالية الكلية للمعدات', formula: '(Availability * Performance * Quality)' },
    { name: 'Sigma Level', description: 'مستوى سيجما', formula: '(USL - LSL) / (6 * StdDev)' },
    { name: 'Z-Score', description: 'الدرجة المعيارية', formula: '(Value - Mean) / StdDev' },
    { name: 'نسبة مئوية', description: 'حساب النسبة', formula: '(Part / Total) * 100' },
    { name: 'CV (معامل الاختلاف)', description: 'معامل الاختلاف النسبي', formula: '(StdDev / Mean) * 100' }
];

// ============================================
// COMPONENT
// ============================================
const AdvancedFormulaBuilder: React.FC<AdvancedFormulaBuilderProps> = ({
    formula,
    onChange,
    currentTableId,
    currentTableName,
    currentParameters,
    template,
    customVariables = {},
    onClose,
}) => {
    const [inputFormula, setInputFormula] = useState(formula || '');
    const [displayFormula, setDisplayFormula] = useState(formula || '');
    const [activeTab, setActiveTab] = useState<'symbols' | 'params' | 'variables' | 'templates' | 'simulation'>('symbols');
    const [simulationValues, setSimulationValues] = useState<Record<string, number>>({});
    const [activeSymbolCategory, setActiveSymbolCategory] = useState('calculus');
    const [searchQuery, setSearchQuery] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [globalVariables, setGlobalVariables] = useState<Variable[]>([]);

    useEffect(() => {
        const fetchGlobalVars = async () => {
            try {
                const vars = await variableService.getVariables();
                // Ensure type compatibility for 'unit' (undefined -> null)
                setGlobalVariables(vars.map(v => ({
                    ...v,
                    unit: v.unit ?? null
                })) as Variable[]);
            } catch (err) {
                console.error("Error fetching global variables", err);
            }
        };
        fetchGlobalVars();
    }, []);

    // Convert input formula to LaTeX for display
    const convertToLatex = useCallback((input: string): string => {
        let latex = input;

        // 1. Protect Variables with temporary markers
        // {متغير:Name} -> §CUST§Name§
        // {Global:Name} -> §GLOB§Name§
        // {Name} -> §VAR§Name§
        latex = latex.replace(/\{متغير:([^}]+)\}/g, '§CUST§$1§');
        latex = latex.replace(/\{Global:([^}]+)\}/g, '§GLOB§$1§');
        latex = latex.replace(/\{([^}]+)\}/g, '§VAR§$1§');

        // 2. Complex functions
        latex = latex.replace(/pow\(([^,]+),\s*([^)]+)\)/g, '{$1}^{$2}');
        latex = latex.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
        latex = latex.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');

        // 3. Basic operations
        latex = latex.replace(/\*/g, ' \\times ');
        latex = latex.replace(/(?<!\\)\//g, ' \\div ');

        // 4. Functions
        const functions = ['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'abs'];
        functions.forEach(fn => {
            latex = latex.replace(new RegExp(`\\b${fn}\\b`, 'g'), `\\${fn}`);
        });

        // 5. Restore Variables with \text formatting
        latex = latex.replace(/§CUST§([^§]+)§/g, (_, name) => `\\textcolor{purple}{\\text{${name.replace(/_/g, '\\_')}}}`);
        latex = latex.replace(/§GLOB§([^§]+)§/g, (_, name) => `\\textcolor{teal}{\\text{[G:${name.replace(/_/g, '\\_')}]}}`);
        latex = latex.replace(/§VAR§([^§]+)§/g, (_, name) => `\\textcolor{blue}{\\text{[${name.replace(/_/g, '\\_')}]}}`);

        // 6. Handle plain powers
        latex = latex.replace(/\^(\d+)/g, '^{$1}');

        return latex;
    }, []);

    // Update display formula when input changes
    useEffect(() => {
        setDisplayFormula(convertToLatex(inputFormula));
    }, [inputFormula, convertToLatex]);

    // Smart Convert: LaTeX -> Formula
    const convertLatexToFormula = useCallback((latex: string): string => {
        let formula = latex;

        // 1. Fractions: \frac{a}{b} -> (a)/(b)
        // Run loop to handle nested levels
        for (let i = 0; i < 3; i++) {
            formula = formula.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
        }

        // 2. Square Root: \sqrt{x} -> sqrt(x)
        formula = formula.replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)');

        // 3. Powers: x^{y} -> x^y
        // Remove braces for single number powers effectively, keeps others safe
        formula = formula.replace(/\^\{([^{}]+)\}/g, '^$1');

        // 4. Multiply/Divide
        formula = formula.replace(/\\times/g, '*');
        formula = formula.replace(/\\div/g, '/');
        formula = formula.replace(/\\cdot/g, '*');

        // 5. Functions
        const functions = ['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'abs'];
        functions.forEach(fn => {
            formula = formula.replace(new RegExp(`\\\\${fn}`, 'g'), fn);
        });

        // 6. Greek/Symbols
        formula = formula.replace(/\\pi/g, 'PI');

        // 7. Remove left/right formatting
        formula = formula.replace(/\\left\(/g, '(');
        formula = formula.replace(/\\right\)/g, ')');
        formula = formula.replace(/\\left\[/g, '(');
        formula = formula.replace(/\\right\]/g, ')');

        return formula;
    }, []);

    const [showLatexAlert, setShowLatexAlert] = useState(false);

    // Detect LaTeX input
    useEffect(() => {
        const hasLatex = /\\(frac|sqrt|times|div|sin|cos|tan|log|ln|pi|left|right)/.test(inputFormula);
        if (hasLatex) {
            setShowLatexAlert(true);
        } else {
            setShowLatexAlert(false);
        }
    }, [inputFormula]);

    // Validation
    const validation = useMemo(() => {
        // Simple validation for now
        const openParens = (inputFormula.match(/\(/g) || []).length;
        const closeParens = (inputFormula.match(/\)/g) || []).length;
        const openBraces = (inputFormula.match(/\{/g) || []).length;
        const closeBraces = (inputFormula.match(/\}/g) || []).length;

        if (openParens !== closeParens) {
            return { valid: false, error: 'الأقواس () غير متطابقة' };
        }
        if (openBraces !== closeBraces) {
            return { valid: false, error: 'الأقواس {} غير متطابقة' };
        }
        return { valid: true };
    }, [inputFormula]);

    // Extract used variables for Simulation
    const usedVariables = useMemo(() => {
        const customWrapper = /\{متغير:([^}]+)\}/g;
        const globalWrapper = /\{Global:([^}]+)\}/g;
        const paramWrapper = /\{([^}:]+)\}/g;

        const vars = new Set<string>();
        let match;

        // Find custom variables
        while ((match = customWrapper.exec(inputFormula)) !== null) {
            vars.add(match[1]);
        }

        // Find global variables (add directly with syntax so we know it's global?) 
        // Or just add name? Let's add name but prefixed to distinguish
        while ((match = globalWrapper.exec(inputFormula)) !== null) {
            vars.add(`Global:${match[1]}`);
        }

        // Find parameters
        const temp = inputFormula.replace(customWrapper, '').replace(globalWrapper, '');
        while ((match = paramWrapper.exec(temp)) !== null) {
            vars.add(match[1]);
        }

        return Array.from(vars);
    }, [inputFormula]);

    // Preview result
    const previewResult = useMemo(() => {
        if (!validation.valid || !inputFormula.trim()) return null;

        try {
            // Replace variable references with values for preview
            let testFormula = inputFormula;

            // 1. Replace Custom Variables {متغير:Name}
            testFormula = testFormula.replace(/\{متغير:([^}]+)\}/g, (_, varName) => {
                if (activeTab === 'simulation' && simulationValues[varName] !== undefined) {
                    return String(simulationValues[varName]);
                }
                const value = customVariables[varName];
                return value !== undefined ? String(value) : '1';
            });

            // 1.5 Replace Global Variables {Global:Name}
            testFormula = testFormula.replace(/\{Global:([^}]+)\}/g, (_, varName) => {
                if (activeTab === 'simulation' && simulationValues[`Global:${varName}`] !== undefined) {
                    return String(simulationValues[`Global:${varName}`]);
                }
                const globalVar = globalVariables.find(v => v.name === varName);
                return globalVar ? String(globalVar.value) : '1';
            });

            // 2. Replace Parameters {ParamName}
            testFormula = testFormula.replace(/\{([^}]+)\}/g, (_, paramName) => {
                // Ignore if it starts with Global: (already handled above ideally, but regex in step 2 mimics greedy { ... })
                if (paramName.startsWith('Global:')) return '1'; // Should have been replaced

                if (activeTab === 'simulation' && simulationValues[paramName] !== undefined) {
                    return String(simulationValues[paramName]);
                }
                return '1';
            });

            const result = evaluateExpression(testFormula);
            return result;
        } catch {
            return null;
        }
    }, [inputFormula, validation.valid, customVariables, globalVariables, simulationValues, activeTab]);

    // Get all parameters
    const getAllParameters = useCallback((): ParameterOption[] => {
        const options: ParameterOption[] = [];

        currentParameters.forEach((param, index) => {
            options.push({
                id: `current_${index}_${param.name}`,
                displayName: param.name,
                tableId: currentTableId,
                tableName: currentTableName,
                paramName: param.name,
                isCurrentTable: true,
            });
        });

        Object.values(template.sections || {}).forEach((section: any) => {
            (section.tables || []).forEach((table: any) => {
                if (table.id !== currentTableId && table.type === 'parameters' && table.parameters) {
                    table.parameters.forEach((param: any, index: number) => {
                        options.push({
                            id: `${table.id}_${index}_${param.name}`,
                            displayName: param.name,
                            tableId: table.id,
                            tableName: table.name || table.id,
                            paramName: param.name,
                            isCurrentTable: false,
                        });
                    });
                }
            });
        });

        return options;
    }, [currentParameters, currentTableId, currentTableName, template]);

    const allParameters = getAllParameters();
    const allVariables = Object.entries(customVariables).map(([name, value]) => ({ name, value }));

    // Insert at cursor
    const insertAtCursor = (text: string) => {
        const input = inputRef.current;
        if (!input) {
            setInputFormula(prev => prev + text);
            return;
        }

        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const before = inputFormula.slice(0, start);
        const after = inputFormula.slice(end);

        setInputFormula(before + text + after);

        // Set cursor position after inserted text
        setTimeout(() => {
            input.focus();
            const newPos = start + text.length;
            input.setSelectionRange(newPos, newPos);
        }, 0);
    };

    // Add parameter
    const addParameter = (param: ParameterOption) => {
        const ref = param.isCurrentTable
            ? `{${param.paramName.replace(/\s+/g, '_')}}`
            : `{${param.tableName.replace(/\s+/g, '_')}.${param.paramName.replace(/\s+/g, '_')}}`;
        insertAtCursor(ref);
    };

    // Add variable
    const addVariable = (name: string) => {
        insertAtCursor(`{متغير:${name}}`);
    };

    // Add global variable
    const addGlobalVariable = (name: string) => {
        insertAtCursor(`{Global:${name}}`);
    };

    // Add symbol - use calc property for calculable formula, or latex as fallback
    const addSymbol = (calc: string, latex: string) => {
        // Use calc if available, otherwise use latex (for display-only symbols)
        insertAtCursor(calc || latex);
    };

    // Copy LaTeX
    const copyLatex = () => {
        navigator.clipboard.writeText(displayFormula);
    };

    // Save
    const handleSave = () => {
        if (validation.valid) {
            onChange(inputFormula);
            onClose?.();
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (validation.valid && inputFormula.trim() !== '') {
                    onChange(inputFormula);
                    onClose?.();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [validation.valid, inputFormula, onChange, onClose]);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">∫</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Advanced Formula Builder</h2>
                            <p className="text-sm text-gray-300">منشئ المعادلات المتقدم</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            ? مساعدة
                        </button>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-xl transition-colors text-xl"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Formula Area */}
                    <div className="flex-1 flex flex-col p-6 overflow-auto">
                        {/* Math Preview */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                📊 المعاينة الرياضية
                            </label>
                            <div id="formula-preview-container" className="min-h-[100px] p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 rounded-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                <MathRenderer
                                    formula={displayFormula}
                                    size="xl"
                                    className="text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Formula Input */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                📝 المعادلة
                            </label>

                            <div className="relative w-full h-32 group">
                                {/* Highlights Overlay */}
                                <div
                                    ref={(el) => {
                                        // keeping ref for sync scroll 
                                        if (el) (window as any)._highlightEl = el;
                                    }}
                                    className={cn(
                                        "absolute inset-0 w-full h-full px-4 py-3 rounded-xl border-2 border-transparent font-mono text-base resize-none pointer-events-none whitespace-pre-wrap break-words overflow-auto text-left",
                                        "text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                                    )}
                                    dir="ltr"
                                    aria-hidden="true"
                                >
                                    {inputFormula.split(/(\{.*?\})|(\b(?:sin|cos|tan|log|ln|sqrt|avg|sum|min|max|stdev)\b)|(\d+(\.\d+)?)/g).map((part, i) => {
                                        if (!part) return null;
                                        if (part.startsWith('{') && part.endsWith('}')) {
                                            const isGlobal = part.includes('Global:');
                                            return (
                                                <span key={i} className={cn(
                                                    "rounded-sm dir-ltr",
                                                    isGlobal
                                                        ? "bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300"
                                                        : "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                                                )}>
                                                    {part}
                                                </span>
                                            );
                                        }
                                        if (/^(sin|cos|tan|log|ln|sqrt|avg|sum|min|max|stdev)$/.test(part)) {
                                            return <span key={i} className="text-blue-600 dark:text-blue-400 font-bold">{part}</span>;
                                        }
                                        if (/^\d+(\.\d+)?$/.test(part)) {
                                            return <span key={i} className="text-green-600 dark:text-green-400">{part}</span>;
                                        }
                                        return <span key={i} className="text-gray-900 dark:text-white opacity-100">{part}</span>;
                                    })}
                                    {/* Add extra space for cursor at end */}
                                    <span className="invisible">|</span>
                                </div>

                                <textarea
                                    ref={inputRef}
                                    value={inputFormula}
                                    onScroll={(e) => {
                                        const overlay = (window as any)._highlightEl;
                                        if (overlay) overlay.scrollTop = e.currentTarget.scrollTop;
                                    }}
                                    onKeyDown={(e) => {
                                        // Atomic Deletion for Variables
                                        if (e.key === 'Backspace' || e.key === 'Delete') {
                                            const input = e.currentTarget;
                                            const start = input.selectionStart;
                                            const end = input.selectionEnd;
                                            const isSelection = start !== end;
                                            const formula = inputFormula;

                                            // Find all variable blocks
                                            let blocks: { start: number, end: number }[] = [];
                                            let match;
                                            const regex = /\{[^}]+\}/g;
                                            while ((match = regex.exec(formula)) !== null) {
                                                blocks.push({ start: match.index, end: match.index + match[0].length });
                                            }

                                            let deleteStart = start;
                                            let deleteEnd = end;
                                            let shouldBlockDelete = false;

                                            // Check intersections
                                            for (const block of blocks) {
                                                let isAffected = false;

                                                if (isSelection) {
                                                    // If selection overlaps even partially (intersection > 0)
                                                    if (Math.max(start, block.start) < Math.min(end, block.end)) {
                                                        isAffected = true;
                                                    }
                                                } else {
                                                    // Cursor logic
                                                    if (e.key === 'Backspace') {
                                                        // Inside block or at right edge
                                                        if (start > block.start && start <= block.end) {
                                                            isAffected = true;
                                                        }
                                                    } else if (e.key === 'Delete') {
                                                        // Inside block or at left edge
                                                        if (start >= block.start && start < block.end) {
                                                            isAffected = true;
                                                        }
                                                    }
                                                }

                                                if (isAffected) {
                                                    deleteStart = Math.min(deleteStart, block.start);
                                                    deleteEnd = Math.max(deleteEnd, block.end);
                                                    shouldBlockDelete = true;
                                                }
                                            }

                                            if (shouldBlockDelete) {
                                                e.preventDefault();
                                                const newVal = formula.slice(0, deleteStart) + formula.slice(deleteEnd);
                                                setInputFormula(newVal);
                                                // Move cursor to deleteStart
                                                setTimeout(() => input.setSelectionRange(deleteStart, deleteStart), 0);
                                            }
                                        }
                                    }}
                                    onChange={(e) => setInputFormula(e.target.value)}
                                    placeholder="اكتب المعادلة... مثال: sqrt(x^2 + y^2) أو \frac{a}{b}"
                                    className={cn(
                                        "absolute inset-0 w-full h-full px-4 py-3 rounded-xl border-2 font-mono text-base resize-none transition-all z-10 text-left",
                                        "bg-transparent text-transparent caret-gray-900 dark:caret-white selection:bg-blue-500/30 selection:text-transparent placeholder-gray-400",
                                        validation.valid
                                            ? "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                                            : "border-red-400 dark:border-red-500 bg-trasnparent"
                                    )}
                                    dir="ltr"
                                    spellCheck={false}
                                />
                            </div>

                            {/* Smart LaTeX Alert */}
                            {showLatexAlert && (
                                <div className="mt-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300">
                                            ✨
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                                تم اكتشاف صيغة LaTeX
                                            </p>
                                            <p className="text-xs text-blue-600 dark:text-blue-300">
                                                هل تريد تحويلها إلى صيغة حسابية؟
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const converted = convertLatexToFormula(inputFormula);
                                            setInputFormula(converted);
                                            setShowLatexAlert(false);
                                        }}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors font-medium shadow-sm"
                                    >
                                        تحويل الآن
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Validation & Preview */}
                        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                {inputFormula && (
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
                                        validation.valid
                                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                    )}>
                                        {validation.valid ? '✓ صيغة صحيحة' : `✗ ${validation.error}`}
                                    </div>
                                )}
                                {previewResult !== null && validation.valid && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                        <span>النتيجة:</span>
                                        <span className="font-mono font-bold">{formatResult(previewResult)}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={copyLatex}
                                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                📋 نسخ LaTeX
                            </button>
                        </div>

                        {/* Quick Operators */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {['+', '-', '×', '÷', '(', ')', '^', '\\frac{}{}', '\\sqrt{}'].map((op) => (
                                <button
                                    key={op}
                                    onClick={() => {
                                        let insert = op;
                                        if (op === '×') insert = '*';
                                        else if (op === '÷') insert = '/';
                                        else if (op === '\\frac{}{}') insert = '()/()';
                                        else if (op === '\\sqrt{}') insert = 'sqrt()';
                                        insertAtCursor(insert);
                                    }}
                                    className="w-10 h-10 flex items-center justify-center text-lg font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all border border-gray-300 dark:border-gray-600"
                                >
                                    {op.replace(/\\/g, '').replace(/\{|\}/g, '')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Palette */}
                    <div className="w-80 bg-gray-50 dark:bg-gray-850 border-l dark:border-gray-700 flex flex-col">
                        {/* Palette Tabs */}
                        <div className="flex border-b dark:border-gray-700">
                            {[
                                { id: 'symbols', label: 'رموز', icon: '∫' },
                                { id: 'params', label: 'معلمات', icon: '📊' },
                                { id: 'variables', label: 'متغيرات', icon: '📌' },
                                { id: 'templates', label: 'قوالب', icon: '✨' },
                                { id: 'simulation', label: 'محاكاة', icon: '🧪' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                    className={cn(
                                        "flex-1 py-3 text-sm font-medium transition-colors",
                                        activeTab === tab.id
                                            ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    )}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Palette Content */}
                        <div className="flex-1 overflow-auto p-3">
                            {/* Symbols Tab */}
                            {activeTab === 'symbols' && (
                                <div>
                                    {/* Symbol Categories */}
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {SYMBOL_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setActiveSymbolCategory(cat.id)}
                                                className={cn(
                                                    "px-2 py-1 text-xs rounded-lg transition-colors",
                                                    activeSymbolCategory === cat.id
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                )}
                                            >
                                                {cat.icon} {cat.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Symbols Grid */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {SYMBOL_CATEGORIES.find(c => c.id === activeSymbolCategory)?.symbols.map((sym) => (
                                            <button
                                                key={sym.latex}
                                                onClick={() => addSymbol(sym.calc, sym.latex)}
                                                className="p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all border border-gray-200 dark:border-gray-700 text-center group"
                                                title={sym.label}
                                            >
                                                <div className="text-lg font-medium text-gray-900 dark:text-white">
                                                    {sym.display}
                                                </div>
                                                <div className="text-[10px] text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                                    {sym.label}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Parameters Tab */}
                            {activeTab === 'params' && (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="🔍 بحث..."
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                                    />

                                    {/* Current Table */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                            {currentTableName}
                                        </h4>
                                        <div className="space-y-1">
                                            {allParameters.filter(p => p.isCurrentTable).map((param) => (
                                                <button
                                                    key={param.id}
                                                    onClick={() => addParameter(param)}
                                                    className="w-full px-3 py-2 text-sm text-right bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors"
                                                >
                                                    {param.displayName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Other Tables */}
                                    {allParameters.some(p => !p.isCurrentTable) && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                                جداول أخرى
                                            </h4>
                                            <div className="space-y-1">
                                                {allParameters.filter(p => !p.isCurrentTable).map((param) => (
                                                    <button
                                                        key={param.id}
                                                        onClick={() => addParameter(param)}
                                                        className="w-full px-3 py-2 text-sm text-right bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-800/40 transition-colors"
                                                    >
                                                        <span className="text-xs text-orange-500 mr-1">{param.tableName}:</span>
                                                        {param.displayName}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Variables Tab */}
                            {activeTab === 'variables' && (
                                <div className="space-y-4">
                                    {/* Global Variables */}
                                    {globalVariables.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                                متغيرات عامة (SOP)
                                            </h4>
                                            {globalVariables.map((v) => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => addGlobalVariable(v.name)}
                                                    className="w-full px-3 py-2 text-right bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-800/40 transition-colors"
                                                >
                                                    <div className="font-medium flex justify-between">
                                                        <span>{v.name}</span>
                                                        <span className="text-[10px] opacity-70 bg-white dark:bg-black/20 px-1 rounded">Global</span>
                                                    </div>
                                                    <div className="text-xs text-teal-600 dark:text-teal-400 font-mono mt-1 flex justify-between">
                                                        <span>= {v.value} {v.unit}</span>
                                                    </div>
                                                </button>
                                            ))}
                                            <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
                                        </div>
                                    )}

                                    {/* Local Variables */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                            متغيرات محلية
                                        </h4>
                                        {allVariables.length > 0 ? (
                                            allVariables.map((v) => (
                                                <button
                                                    key={v.name}
                                                    onClick={() => addVariable(v.name)}
                                                    className="w-full px-3 py-3 text-right bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800/40 transition-colors"
                                                >
                                                    <div className="font-medium">📌 {v.name}</div>
                                                    <div className="text-xs text-purple-500 font-mono">= {v.value}</div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                                <p className="text-sm">لا توجد متغيرات محلية</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Templates Tab */}
                            {activeTab === 'templates' && (
                                <div className="space-y-2 overflow-y-auto h-[400px] pr-2 custom-scrollbar">
                                    {FORMULA_TEMPLATES.map((tmpl) => (
                                        <button
                                            key={tmpl.name}
                                            onClick={() => insertAtCursor(tmpl.formula)}
                                            className="w-full text-right p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent dark:hover:from-blue-900/20 group transition-all"
                                        >
                                            <div className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                {tmpl.name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {tmpl.description}
                                            </div>
                                            <div className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-2 truncate bg-gray-50 dark:bg-gray-800 p-1 rounded direction-ltr text-left">
                                                {tmpl.formula}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Simulation Tab */}
                            {activeTab === 'simulation' && (
                                <div className="space-y-4">
                                    <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 leading-relaxed">
                                        🧪 <strong>وضع المحاكاة:</strong> قم بإدخال قيم تجريبية للمتغيرات لاختبار معادلتك فعلياً.
                                    </div>

                                    {usedVariables.length > 0 ? (
                                        <div className="space-y-3">
                                            {usedVariables.map((v) => (
                                                <div key={v} className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 truncate" title={v}>
                                                        {v}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={simulationValues[v] ?? ''}
                                                        onChange={(e) => setSimulationValues(prev => ({
                                                            ...prev,
                                                            [v]: parseFloat(e.target.value) || 0
                                                        }))}
                                                        placeholder="1"
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 outline-none transition-shadow"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 flex flex-col items-center justify-center text-gray-400">
                                            <span className="text-2xl mb-2">🤷‍♂️</span>
                                            <p className="text-sm">لا توجد متغيرات في المعادلة</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-850">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {inputFormula.length > 0 && `${inputFormula.length} حرف`}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!validation.valid || inputFormula.trim() === ''}
                            className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ✓ حفظ المعادلة
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedFormulaBuilder;
