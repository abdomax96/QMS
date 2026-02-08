/**
 * Formula Templates Library
 * Pre-built formulas for common calculations in quality control and manufacturing
 */

export interface FormulaTemplate {
    id: string;
    name: string;
    category: 'quality' | 'statistical' | 'production' | 'financial' | 'custom';
    description: string;
    formula: string;
    variables: string[];
    example?: string;
    unit?: string;
}

export const FORMULA_TEMPLATES: FormulaTemplate[] = [
    // Quality Control Formulas
    {
        id: 'defect_rate',
        name: 'Defect Rate',
        category: 'quality',
        description: 'معدل العيوب - Calculate the percentage of defective items',
        formula: '(${defects} / ${total}) * 100',
        variables: ['defects', 'total'],
        example: 'defects=5, total=100 → 5%',
        unit: '%'
    },
    {
        id: 'cpk',
        name: 'Process Capability Index (Cpk)',
        category: 'quality',
        description: 'مؤشر قدرة العملية - Process capability index',
        formula: 'MIN((${usl} - ${mean}) / (3 * ${stdev}), (${mean} - ${lsl}) / (3 * ${stdev}))',
        variables: ['usl', 'lsl', 'mean', 'stdev'],
        example: 'USL=10, LSL=0, mean=5, stdev=1 → Cpk',
        unit: ''
    },
    {
        id: 'yield',
        name: 'Production Yield',
        category: 'production',
        description: 'معدل الإنتاج - Calculate production yield percentage',
        formula: '(${output} / ${input}) * 100',
        variables: ['output', 'input'],
        example: 'output=950, input=1000 → 95%',
        unit: '%'
    },
    {
        id: 'efficiency',
        name: 'Overall Equipment Effectiveness (OEE)',
        category: 'production',
        description: 'فعالية المعدات الإجمالية',
        formula: '${availability} * ${performance} * ${quality} * 100',
        variables: ['availability', 'performance', 'quality'],
        example: 'availability=0.9, performance=0.95, quality=0.98 → 83.79%',
        unit: '%'
    },

    // Statistical Formulas
    {
        id: 'mean',
        name: 'Average (Mean)',
        category: 'statistical',
        description: 'المتوسط - Calculate arithmetic mean',
        formula: 'AVG(@column[values])',
        variables: ['values'],
        example: 'values=[10, 20, 30] → 20',
        unit: ''
    },
    {
        id: 'std_dev',
        name: 'Standard Deviation',
        category: 'statistical',
        description: 'الانحراف المعياري - Calculate standard deviation',
        formula: 'STDEV(@column[values])',
        variables: ['values'],
        example: 'values=[10, 20, 30] → σ',
        unit: ''
    },
    {
        id: 'range',
        name: 'Range',
        category: 'statistical',
        description: 'المدى - Difference between max and min',
        formula: 'MAX(@column[values]) - MIN(@column[values])',
        variables: ['values'],
        example: 'values=[10, 20, 30] → 20',
        unit: ''
    },
    {
        id: 'coefficient_variation',
        name: 'Coefficient of Variation',
        category: 'statistical',
        description: 'معامل الاختلاف - Relative variability',
        formula: '(STDEV(@column[values]) / AVG(@column[values])) * 100',
        variables: ['values'],
        example: 'values=[...] → CV%',
        unit: '%'
    },

    // Production Formulas
    {
        id: 'takt_time',
        name: 'Takt Time',
        category: 'production',
        description: 'وقت الإيقاع - Available time per unit',
        formula: '${available_time} / ${demand}',
        variables: ['available_time', 'demand'],
        example: 'available_time=480, demand=240 → 2 min/unit',
        unit: 'min/unit'
    },
    {
        id: 'cycle_time',
        name: 'Cycle Time',
        category: 'production',
        description: 'وقت الدورة - Time to complete one unit',
        formula: '${total_time} / ${units_produced}',
        variables: ['total_time', 'units_produced'],
        example: 'total_time=480, units=240 → 2 min/unit',
        unit: 'min/unit'
    },
    {
        id: 'throughput',
        name: 'Throughput',
        category: 'production',
        description: 'معدل الإنتاجية - Units produced per time',
        formula: '${units_produced} / ${time_period}',
        variables: ['units_produced', 'time_period'],
        example: 'units=1000, time=8 → 125 units/hr',
        unit: 'units/hr'
    },
    {
        id: 'scrap_rate',
        name: 'Scrap Rate',
        category: 'production',
        description: 'معدل الهدر - Percentage of scrapped items',
        formula: '(${scrapped} / ${total_produced}) * 100',
        variables: ['scrapped', 'total_produced'],
        example: 'scrapped=20, total=1000 → 2%',
        unit: '%'
    },

    // Weight & Packaging Formulas
    {
        id: 'net_weight',
        name: 'Net Weight',
        category: 'production',
        description: 'الوزن الصافي - Gross weight minus tare',
        formula: '${gross_weight} - ${tare_weight}',
        variables: ['gross_weight', 'tare_weight'],
        example: 'gross=1000g, tare=50g → 950g',
        unit: 'g'
    },
    {
        id: 'fill_rate',
        name: 'Fill Rate Accuracy',
        category: 'quality',
        description: 'دقة التعبئة - Accuracy of filling process',
        formula: '((${actual_weight} - ${target_weight}) / ${target_weight}) * 100',
        variables: ['actual_weight', 'target_weight'],
        example: 'actual=102g, target=100g → +2%',
        unit: '%'
    },
    {
        id: 'cartons_count',
        name: 'Total Cartons',
        category: 'production',
        description: 'عدد الكراتين - Calculate total cartons',
        formula: '${total_boxes} / ${boxes_per_carton}',
        variables: ['total_boxes', 'boxes_per_carton'],
        example: 'boxes=240, per_carton=24 → 10 cartons',
        unit: 'cartons'
    },

    // Financial/Cost Formulas
    {
        id: 'cost_per_unit',
        name: 'Cost Per Unit',
        category: 'financial',
        description: 'التكلفة لكل وحدة',
        formula: '${total_cost} / ${units_produced}',
        variables: ['total_cost', 'units_produced'],
        example: 'cost=10000, units=1000 → 10/unit',
        unit: ''
    },
    {
        id: 'waste_cost',
        name: 'Waste Cost',
        category: 'financial',
        description: 'تكلفة الهدر',
        formula: '${scrap_units} * ${cost_per_unit}',
        variables: ['scrap_units', 'cost_per_unit'],
        example: 'scrap=50, cost=10 → 500',
        unit: ''
    },

    // Cross-Table Formulas (NEW!)
    {
        id: 'batch_comparison',
        name: 'Batch Comparison',
        category: 'quality',
        description: 'مقارنة بين دفعتين - Compare two batches',
        formula: 'AVG(@table[batch1].column[weight]) - AVG(@table[batch2].column[weight])',
        variables: [],
        example: 'batch1 avg=100, batch2 avg=95 → 5',
        unit: ''
    },
    {
        id: 'multi_line_total',
        name: 'Multi-Line Total Production',
        category: 'production',
        description: 'إجمالي الإنتاج من خطوط متعددة',
        formula: 'SUM(@table[line1].column[output]) + SUM(@table[line2].column[output]) + SUM(@table[line3].column[output])',
        variables: [],
        example: 'line1=1000, line2=1200, line3=800 → 3000',
        unit: 'units'
    },
    {
        id: 'cross_table_defect_rate',
        name: 'Overall Defect Rate (Multi-Line)',
        category: 'quality',
        description: 'معدل العيوب الإجمالي من عدة خطوط',
        formula: '(SUM(@table[line1].column[defects]) + SUM(@table[line2].column[defects])) / (SUM(@table[line1].column[total]) + SUM(@table[line2].column[total])) * 100',
        variables: [],
        example: 'defects=50, total=2000 → 2.5%',
        unit: '%'
    },
    {
        id: 'shift_comparison',
        name: 'Shift Performance Comparison',
        category: 'production',
        description: 'مقارنة أداء الورديات',
        formula: 'AVG(@table[shift1].column[efficiency]) - AVG(@table[shift2].column[efficiency])',
        variables: [],
        example: 'shift1=95%, shift2=92% → 3%',
        unit: '%'
    },
    {
        id: 'total_inventory',
        name: 'Total Inventory (Multi-Location)',
        category: 'production',
        description: 'المخزون الإجمالي من مواقع متعددة',
        formula: 'SUM(@table[warehouse1].column[quantity]) + SUM(@table[warehouse2].column[quantity])',
        variables: [],
        example: 'wh1=500, wh2=300 → 800',
        unit: 'units'
    },
    {
        id: 'range_average',
        name: 'Range Average',
        category: 'statistical',
        description: 'متوسط نطاق محدد من القيم',
        formula: 'AVG(@range[0:10, values])',
        variables: [],
        example: 'First 10 values average',
        unit: ''
    },
    {
        id: 'cross_table_variance',
        name: 'Cross-Table Variance',
        category: 'statistical',
        description: 'التباين بين جدولين',
        formula: 'STDEV(@table[table1].column[values]) - STDEV(@table[table2].column[values])',
        variables: [],
        example: 'Compare variability between datasets',
        unit: ''
    },
    {
        id: 'weighted_average',
        name: 'Weighted Average (Two Tables)',
        category: 'statistical',
        description: 'المتوسط المرجح من جدولين',
        formula: '(SUM(@table[table1].column[value]) * ${weight1} + SUM(@table[table2].column[value]) * ${weight2}) / (${weight1} + ${weight2})',
        variables: ['weight1', 'weight2'],
        example: 'Weighted combination of two datasets',
        unit: ''
    },
    {
        id: 'table_cell_sum',
        name: 'Sum Specific Cells from Multiple Tables',
        category: 'custom',
        description: 'جمع خلايا محددة من جداول متعددة',
        formula: '@table[table1].cell[0,value] + @table[table2].cell[0,value] + @table[table3].cell[0,value]',
        variables: [],
        example: 'Sum first row values from 3 tables',
        unit: ''
    }
];

/**
 * Get formula templates by category
 */
export const getTemplatesByCategory = (category: FormulaTemplate['category']): FormulaTemplate[] => {
    return FORMULA_TEMPLATES.filter(t => t.category === category);
};

/**
 * Get formula template by ID
 */
export const getTemplateById = (id: string): FormulaTemplate | undefined => {
    return FORMULA_TEMPLATES.find(t => t.id === id);
};

/**
 * Search formula templates
 */
export const searchTemplates = (query: string): FormulaTemplate[] => {
    const lowercaseQuery = query.toLowerCase();
    return FORMULA_TEMPLATES.filter(t =>
        t.name.toLowerCase().includes(lowercaseQuery) ||
        t.description.toLowerCase().includes(lowercaseQuery) ||
        t.id.toLowerCase().includes(lowercaseQuery)
    );
};

/**
 * Get all formula categories
 */
export const getCategories = (): Array<{ id: FormulaTemplate['category']; name: string; icon: string }> => {
    return [
        { id: 'quality', name: 'Quality Control', icon: '✓' },
        { id: 'statistical', name: 'Statistical', icon: '📊' },
        { id: 'production', name: 'Production', icon: '🏭' },
        { id: 'financial', name: 'Financial', icon: '💰' },
        { id: 'custom', name: 'Custom', icon: '⚙️' }
    ];
};
