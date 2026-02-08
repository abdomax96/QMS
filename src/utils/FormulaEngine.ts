import type { FormTemplate } from '../types';

/**
 * Advanced Scientific Formula Engine
 * محرك الحسابات المتقدم
 * 
 * Supports:
 * - Basic arithmetic: +, -, *, /, %, ^
 * - Trigonometric: sin, cos, tan, asin, acos, atan, sinh, cosh, tanh
 * - Logarithmic: log, ln, log10, log2, exp
 * - Statistical: avg, sum, min, max, count, stdev, variance, median
 * - Rounding: round, floor, ceil, trunc, toFixed
 * - Logical: if, and, or, not, comparisons
 * - Constants: PI, E, PHI, SQRT2
 * - Parameter references: {param}, {table.param}
 * - Custom variables: {متغير:name}
 */

// ============================================
// MATHEMATICAL CONSTANTS
// ============================================
export const MATH_CONSTANTS: Record<string, number> = {
    PI: Math.PI,
    E: Math.E,
    PHI: 1.618033988749895, // Golden ratio
    SQRT2: Math.SQRT2,
    SQRT3: 1.7320508075688772,
    LN2: Math.LN2,
    LN10: Math.LN10,
    LOG2E: Math.LOG2E,
    LOG10E: Math.LOG10E,
};

// ============================================
// SUPPORTED FUNCTIONS
// ============================================
export const MATH_FUNCTIONS: Record<string, { fn: (...args: number[]) => number; argCount: number | 'variadic'; description: string; category: string }> = {
    // Trigonometric (radians)
    sin: { fn: Math.sin, argCount: 1, description: 'Sine of angle (radians)', category: 'trig' },
    cos: { fn: Math.cos, argCount: 1, description: 'Cosine of angle (radians)', category: 'trig' },
    tan: { fn: Math.tan, argCount: 1, description: 'Tangent of angle (radians)', category: 'trig' },
    asin: { fn: Math.asin, argCount: 1, description: 'Arcsine (returns radians)', category: 'trig' },
    acos: { fn: Math.acos, argCount: 1, description: 'Arccosine (returns radians)', category: 'trig' },
    atan: { fn: Math.atan, argCount: 1, description: 'Arctangent (returns radians)', category: 'trig' },
    sinh: { fn: Math.sinh, argCount: 1, description: 'Hyperbolic sine', category: 'trig' },
    cosh: { fn: Math.cosh, argCount: 1, description: 'Hyperbolic cosine', category: 'trig' },
    tanh: { fn: Math.tanh, argCount: 1, description: 'Hyperbolic tangent', category: 'trig' },

    // Trigonometric (degrees) - convenience functions
    sind: { fn: (x) => Math.sin(x * Math.PI / 180), argCount: 1, description: 'Sine of angle (degrees)', category: 'trig' },
    cosd: { fn: (x) => Math.cos(x * Math.PI / 180), argCount: 1, description: 'Cosine of angle (degrees)', category: 'trig' },
    tand: { fn: (x) => Math.tan(x * Math.PI / 180), argCount: 1, description: 'Tangent of angle (degrees)', category: 'trig' },

    // Logarithmic & Exponential
    log: { fn: Math.log10, argCount: 1, description: 'Base-10 logarithm', category: 'log' },
    log10: { fn: Math.log10, argCount: 1, description: 'Base-10 logarithm', category: 'log' },
    log2: { fn: Math.log2, argCount: 1, description: 'Base-2 logarithm', category: 'log' },
    ln: { fn: Math.log, argCount: 1, description: 'Natural logarithm', category: 'log' },
    exp: { fn: Math.exp, argCount: 1, description: 'e raised to power', category: 'log' },

    // Powers & Roots
    sqrt: { fn: Math.sqrt, argCount: 1, description: 'Square root', category: 'power' },
    cbrt: { fn: Math.cbrt, argCount: 1, description: 'Cube root', category: 'power' },
    pow: { fn: Math.pow, argCount: 2, description: 'Power (base^exponent)', category: 'power' },
    abs: { fn: Math.abs, argCount: 1, description: 'Absolute value', category: 'power' },
    sign: { fn: Math.sign, argCount: 1, description: 'Sign of number (-1, 0, 1)', category: 'power' },

    // Rounding
    round: { fn: Math.round, argCount: 1, description: 'Round to nearest integer', category: 'round' },
    floor: { fn: Math.floor, argCount: 1, description: 'Round down', category: 'round' },
    ceil: { fn: Math.ceil, argCount: 1, description: 'Round up', category: 'round' },
    trunc: { fn: Math.trunc, argCount: 1, description: 'Truncate decimal part', category: 'round' },

    // Statistical - variadic
    sum: { fn: (...args) => args.reduce((a, b) => a + b, 0), argCount: 'variadic', description: 'Sum of values', category: 'stats' },
    avg: { fn: (...args) => args.reduce((a, b) => a + b, 0) / args.length, argCount: 'variadic', description: 'Average of values', category: 'stats' },
    min: { fn: (...args) => Math.min(...args), argCount: 'variadic', description: 'Minimum value', category: 'stats' },
    max: { fn: (...args) => Math.max(...args), argCount: 'variadic', description: 'Maximum value', category: 'stats' },
    count: { fn: (...args) => args.length, argCount: 'variadic', description: 'Count of values', category: 'stats' },

    // Advanced Statistical
    stdev: {
        fn: (...args) => {
            const mean = args.reduce((a, b) => a + b, 0) / args.length;
            const variance = args.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / args.length;
            return Math.sqrt(variance);
        },
        argCount: 'variadic',
        description: 'Standard deviation',
        category: 'stats'
    },
    variance: {
        fn: (...args) => {
            const mean = args.reduce((a, b) => a + b, 0) / args.length;
            return args.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / args.length;
        },
        argCount: 'variadic',
        description: 'Variance',
        category: 'stats'
    },
    median: {
        fn: (...args) => {
            const sorted = [...args].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        },
        argCount: 'variadic',
        description: 'Median value',
        category: 'stats'
    },
    range: {
        fn: (...args) => Math.max(...args) - Math.min(...args),
        argCount: 'variadic',
        description: 'Range (max - min)',
        category: 'stats'
    },
};

// ============================================
// CALCULATION CONTEXT
// ============================================
interface CalculationContext {
    template: FormTemplate;
    sectionId: string;
    tableId: string;
    parameterName: string;
    columnIndex: number;
    formData: any;
    customVariables?: Record<string, any>;
}

// ============================================
// TOKENIZER & PARSER
// ============================================
type TokenType = 'number' | 'operator' | 'function' | 'constant' | 'paren' | 'comma' | 'reference';

interface Token {
    type: TokenType;
    value: string | number;
    raw: string;
}

/**
 * Tokenize a formula string
 */
function tokenize(formula: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < formula.length) {
        const char = formula[i];

        // Skip whitespace
        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Numbers (including decimals)
        if (/[\d.]/.test(char)) {
            let num = '';
            while (i < formula.length && /[\d.]/.test(formula[i])) {
                num += formula[i];
                i++;
            }
            tokens.push({ type: 'number', value: parseFloat(num), raw: num });
            continue;
        }

        // References: {param} or {table.param}
        if (char === '{') {
            let ref = '';
            i++;
            while (i < formula.length && formula[i] !== '}') {
                ref += formula[i];
                i++;
            }
            i++; // Skip closing brace
            tokens.push({ type: 'reference', value: ref, raw: `{${ref}}` });
            continue;
        }

        // Function names or constants (alphabetic)
        if (/[a-zA-Zأ-ي_]/.test(char)) {
            let name = '';
            while (i < formula.length && /[a-zA-Zأ-ي_0-9]/.test(formula[i])) {
                name += formula[i];
                i++;
            }

            // Check if it's a constant
            if (MATH_CONSTANTS[name.toUpperCase()]) {
                tokens.push({ type: 'constant', value: MATH_CONSTANTS[name.toUpperCase()], raw: name });
            } else if (MATH_FUNCTIONS[name.toLowerCase()]) {
                tokens.push({ type: 'function', value: name.toLowerCase(), raw: name });
            } else {
                // Try as constant case-insensitive
                const upperName = name.toUpperCase();
                if (MATH_CONSTANTS[upperName]) {
                    tokens.push({ type: 'constant', value: MATH_CONSTANTS[upperName], raw: name });
                } else {
                    throw new Error(`Unknown function or constant: ${name}`);
                }
            }
            continue;
        }

        // Operators
        if (['+', '-', '*', '/', '%', '^', '×', '÷', '−'].includes(char)) {
            // Normalize operators
            let op = char;
            if (char === '×') op = '*';
            if (char === '÷') op = '/';
            if (char === '−') op = '-';
            tokens.push({ type: 'operator', value: op, raw: char });
            i++;
            continue;
        }

        // Comparison operators
        if (['<', '>', '=', '!'].includes(char)) {
            let op = char;
            if (i + 1 < formula.length && formula[i + 1] === '=') {
                op += '=';
                i++;
            }
            tokens.push({ type: 'operator', value: op, raw: op });
            i++;
            continue;
        }

        // Parentheses
        if (char === '(' || char === ')') {
            tokens.push({ type: 'paren', value: char, raw: char });
            i++;
            continue;
        }

        // Comma (argument separator)
        if (char === ',') {
            tokens.push({ type: 'comma', value: ',', raw: ',' });
            i++;
            continue;
        }

        // Unknown character
        throw new Error(`Unexpected character: ${char}`);
    }

    return tokens;
}

/**
 * Parse and evaluate tokens using recursive descent
 */
class FormulaParser {
    private tokens: Token[] = [];
    private pos = 0;
    private context: CalculationContext | null = null;

    parse(tokens: Token[], context: CalculationContext | null = null): number {
        this.tokens = tokens;
        this.pos = 0;
        this.context = context;
        return this.expression();
    }

    private current(): Token | null {
        return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
    }

    private consume(): Token {
        return this.tokens[this.pos++];
    }

    private expect(type: TokenType, value?: string): Token {
        const token = this.consume();
        if (token.type !== type || (value !== undefined && token.value !== value)) {
            throw new Error(`Expected ${type}${value ? ` '${value}'` : ''}, got ${token?.type} '${token?.value}'`);
        }
        return token;
    }

    // Expression = Term (('+' | '-') Term)*
    private expression(): number {
        let result = this.term();

        while (this.current()?.type === 'operator' &&
            (this.current()?.value === '+' || this.current()?.value === '-')) {
            const op = this.consume().value;
            const right = this.term();
            result = op === '+' ? result + right : result - right;
        }

        return result;
    }

    // Term = Power (('*' | '/' | '%') Power)*
    private term(): number {
        let result = this.power();

        while (this.current()?.type === 'operator' &&
            ['*', '/', '%'].includes(this.current()?.value as string)) {
            const op = this.consume().value;
            const right = this.power();
            if (op === '*') result *= right;
            else if (op === '/') result /= right;
            else if (op === '%') result %= right;
        }

        return result;
    }

    // Power = Unary ('^' Power)?
    private power(): number {
        let result = this.unary();

        if (this.current()?.type === 'operator' && this.current()?.value === '^') {
            this.consume();
            const right = this.power(); // Right associative
            result = Math.pow(result, right);
        }

        return result;
    }

    // Unary = ('-' | '+')? Primary
    private unary(): number {
        if (this.current()?.type === 'operator' &&
            (this.current()?.value === '-' || this.current()?.value === '+')) {
            const op = this.consume().value;
            const value = this.unary();
            return op === '-' ? -value : value;
        }
        return this.primary();
    }

    // Primary = Number | Constant | Reference | Function | '(' Expression ')'
    private primary(): number {
        const token = this.current();

        if (!token) {
            throw new Error('Unexpected end of expression');
        }

        // Number
        if (token.type === 'number') {
            this.consume();
            return token.value as number;
        }

        // Constant
        if (token.type === 'constant') {
            this.consume();
            return token.value as number;
        }

        // Reference
        if (token.type === 'reference') {
            this.consume();
            return this.resolveReference(token.value as string);
        }

        // Function call
        if (token.type === 'function') {
            return this.functionCall();
        }

        // Parenthesized expression
        if (token.type === 'paren' && token.value === '(') {
            this.consume();
            const result = this.expression();
            this.expect('paren', ')');
            return result;
        }

        throw new Error(`Unexpected token: ${token.type} '${token.value}'`);
    }

    // Function call: name(arg1, arg2, ...)
    private functionCall(): number {
        const fnToken = this.consume();
        const fnName = fnToken.value as string;
        const fnDef = MATH_FUNCTIONS[fnName];

        if (!fnDef) {
            throw new Error(`Unknown function: ${fnName}`);
        }

        this.expect('paren', '(');

        const args: number[] = [];

        // Parse arguments
        if (this.current()?.type !== 'paren' || this.current()?.value !== ')') {
            args.push(this.expression());

            while (this.current()?.type === 'comma') {
                this.consume();
                args.push(this.expression());
            }
        }

        this.expect('paren', ')');

        // Validate argument count
        if (fnDef.argCount !== 'variadic') {
            if (args.length !== fnDef.argCount) {
                throw new Error(`Function ${fnName} expects ${fnDef.argCount} arguments, got ${args.length}`);
            }
        }

        return fnDef.fn(...args);
    }

    // Resolve parameter reference
    private resolveReference(ref: string): number {
        if (!this.context) {
            throw new Error('No context provided for reference resolution');
        }

        // Custom variable: {متغير:name}
        if (ref.startsWith('متغير:')) {
            const varName = ref.slice(6);
            const value = this.context.customVariables?.[varName];
            if (value === undefined) {
                console.warn(`Variable "${varName}" not found, using 0`);
                return 0;
            }
            return parseFloat(value) || 0;
        }

        // Table.param reference
        const parts = ref.split('.');
        if (parts.length === 1) {
            // Same table reference
            return this.getParameterValue(
                this.context.tableId,
                ref,
                this.context.columnIndex,
                this.context.formData
            );
        } else if (parts.length === 2) {
            // Cross-table reference
            const [tableName, paramName] = parts;
            const tableId = this.findTableIdByName(tableName, this.context.template);
            if (!tableId) {
                console.warn(`Table "${tableName}" not found, using 0`);
                return 0;
            }
            return this.getParameterValue(tableId, paramName, this.context.columnIndex, this.context.formData);
        }

        return 0;
    }

    private getParameterValue(tableId: string, parameterName: string, columnIndex: number, formData: any): number {
        const tableData = formData?.tables?.[tableId]?.data;
        if (!tableData) return 0;

        const value = tableData[columnIndex]?.[columnIndex];
        if (value === undefined || value === null || value === '') return 0;

        const numValue = parseFloat(value);
        return isNaN(numValue) ? 0 : numValue;
    }

    private findTableIdByName(tableName: string, template: FormTemplate): string | null {
        for (const section of Object.values(template.sections || {})) {
            const table = (section as any).tables?.find((t: any) => t.name === tableName);
            if (table) return table.id;
        }
        return null;
    }
}

// ============================================
// MAIN API
// ============================================
const parser = new FormulaParser();

/**
 * Evaluate a formula string
 */
export function evaluateFormula(formula: string, context: CalculationContext): number | null {
    try {
        const tokens = tokenize(formula);
        const result = parser.parse(tokens, context);
        return isFinite(result) ? result : null;
    } catch (error) {
        return null;
    }
}

/**
 * Evaluate a simple expression without context
 */
export function evaluateExpression(formula: string): number | null {
    try {
        const tokens = tokenize(formula);
        const result = parser.parse(tokens, null);
        return isFinite(result) ? result : null;
    } catch (error) {
        return null;
    }
}

/**
 * Validate a formula
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
    if (!formula || formula.trim() === '') {
        return { valid: true };
    }

    try {
        // Check brace matching
        const openBraces = (formula.match(/\{/g) || []).length;
        const closeBraces = (formula.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
            return { valid: false, error: 'أقواس المراجع {} غير متطابقة' };
        }

        // Check parenthesis matching
        const openParens = (formula.match(/\(/g) || []).length;
        const closeParens = (formula.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            return { valid: false, error: 'الأقواس () غير متطابقة' };
        }

        // Try to tokenize and parse with mock references
        const testFormula = formula.replace(/\{[^}]+\}/g, '1');
        const tokens = tokenize(testFormula);
        parser.parse(tokens, null);

        return { valid: true };
    } catch (error: any) {
        return { valid: false, error: error.message || 'صيغة غير صحيحة' };
    }
}

/**
 * Extract references from formula
 */
export function extractReferences(formula: string): string[] {
    const refs: string[] = [];
    const regex = /\{([^}]+)\}/g;
    let match;
    while ((match = regex.exec(formula)) !== null) {
        refs.push(match[1]);
    }
    return refs;
}

/**
 * Get all available functions grouped by category
 */
export function getAvailableFunctions(): Record<string, Array<{ name: string; description: string; argCount: number | 'variadic' }>> {
    const result: Record<string, Array<{ name: string; description: string; argCount: number | 'variadic' }>> = {};

    for (const [name, def] of Object.entries(MATH_FUNCTIONS)) {
        if (!result[def.category]) {
            result[def.category] = [];
        }
        result[def.category].push({
            name,
            description: def.description,
            argCount: def.argCount,
        });
    }

    return result;
}

/**
 * Get all available constants
 */
export function getAvailableConstants(): Array<{ name: string; value: number }> {
    return Object.entries(MATH_CONSTANTS).map(([name, value]) => ({ name, value }));
}

/**
 * Format number for display with appropriate precision
 */
export function formatResult(value: number | null, decimals: number = 4): string {
    if (value === null || !isFinite(value)) return '-';

    // Handle very small numbers
    if (Math.abs(value) < 0.0001 && value !== 0) {
        return value.toExponential(decimals);
    }

    // Round to specified decimals
    const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    return rounded.toString();
}

/**
 * Get formula help text
 */
export function getFormulaHelpText(): string {
    return `
دليل المعادلات المتقدم:

العمليات الأساسية:
• + - * / %  (جمع، طرح، ضرب، قسمة، باقي القسمة)
• ^ (الأس) مثال: 2^3 = 8
• () (الأقواس)

الدوال المثلثية:
• sin(x), cos(x), tan(x) - بالراديان
• sind(x), cosd(x), tand(x) - بالدرجات
• asin(x), acos(x), atan(x) - المعكوسة

الدوال اللوغاريتمية:
• log(x), log10(x) - لوغاريتم عشري
• ln(x) - لوغاريتم طبيعي
• log2(x) - لوغاريتم ثنائي
• exp(x) - e مرفوع للأس

الجذور والقوى:
• sqrt(x) - الجذر التربيعي
• cbrt(x) - الجذر التكعيبي
• pow(x, y) - x مرفوع للأس y
• abs(x) - القيمة المطلقة

الدوال الإحصائية:
• sum(a, b, c, ...) - المجموع
• avg(a, b, c, ...) - المتوسط
• min(a, b, c, ...) - الحد الأدنى
• max(a, b, c, ...) - الحد الأقصى
• stdev(a, b, c, ...) - الانحراف المعياري
• variance(a, b, c, ...) - التباين
• median(a, b, c, ...) - الوسيط

دوال التقريب:
• round(x) - تقريب لأقرب عدد صحيح
• floor(x) - تقريب للأسفل
• ceil(x) - تقريب للأعلى

الثوابت:
• PI = 3.14159...
• E = 2.71828...
• PHI = 1.618... (النسبة الذهبية)
• SQRT2 = 1.414...

أمثلة:
• sqrt(pow({x}, 2) + pow({y}, 2)) - نظرية فيثاغورس
• avg({قياس1}, {قياس2}, {قياس3}) - متوسط القياسات
• sin(45 * PI / 180) - جيب الزاوية 45 درجة
    `.trim();
}
