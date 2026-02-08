/**
 * Sample Test Data Creator
 * أداة إنشاء بيانات تجريبية
 * 
 * Run this script to create sample test data via Supabase
 */

import { supabase } from '../config/supabase';

export async function createSampleLabTestData() {
    try {
        console.log('🚀 Creating sample lab test data...');

        // Get current company
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');

        const { data: profile } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single();

        if (!profile?.company_id) throw new Error('No company found');

        const companyId = profile.company_id;

        // 1. Create Category
        console.log('📁 Creating category...');
        const { data: category, error: categoryError } = await supabase
            .from('lab_test_categories')
            .insert({
                code: 'finished_product',
                name: 'Finished Product Tests',
                name_ar: 'فحوصات المنتج التام',
                description: 'Quality tests for finished products',
                description_ar: 'فحوصات الجودة للمنتج النهائي',
                icon: 'Beaker',
                color: '#8B5CF6',
                display_order: 0,
                company_id: companyId,
            })
            .select()
            .single();

        if (categoryError) throw categoryError;
        console.log('✓ Category created:', category.name);

        // 2. Create Type
        console.log('📝 Creating test type...');
        const { data: type, error: typeError } = await supabase
            .from('lab_test_types')
            .insert({
                category_id: category.id,
                code: 'chemical',
                name: 'Chemical Tests',
                name_ar: 'فحوصات كيميائية',
                description: 'Chemical analysis tests',
                description_ar: 'تحاليل كيميائية',
                icon: 'TestTube2',
                color: '#3B82F6',
                display_order: 0,
                company_id: companyId,
            })
            .select()
            .single();

        if (typeError) throw typeError;
        console.log('✓ Test type created:', type.name);

        // 3. Create Test Config
        console.log('🧪 Creating test configuration...');
        const { data: config, error: configError } = await supabase
            .from('lab_tests_config')
            .insert({
                test_type_id: type.id,
                code: 'ph_test',
                name: 'PH Test',
                name_ar: 'فحص الحموضة',
                description: 'Measures acidity/alkalinity of the product',
                description_ar: 'قياس حموضة/قلوية المنتج',
                method: 'Digital pH meter',
                method_standard: 'ISO 10523:2008',
                equipment_required: ['pH meter', 'Buffer solutions', 'Beaker'],
                estimated_duration_minutes: 5,
                requires_approval: true,
                is_active: true,
                company_id: companyId,
            })
            .select()
            .single();

        if (configError) throw configError;
        console.log('✓ Test config created:', config.name);

        // 3.1 Create Equipment (New Registry)
        console.log('🛠️ Creating lab equipment...');
        const { data: equipmentData, error: equipmentError } = await supabase
            .from('lab_equipment')
            .insert([
                {
                    code: 'PH-METER-01',
                    name: 'pH Meter',
                    name_ar: 'جهاز قياس الحموضة',
                    location: 'Lab Bench A',
                    manufacturer: 'Hanna',
                    model: 'HI98190',
                    serial_number: 'PH-98190-001',
                    company_id: companyId
                },
                {
                    code: 'BAL-01',
                    name: 'Analytical Balance',
                    name_ar: 'ميزان تحليلي',
                    location: 'Lab Bench B',
                    manufacturer: 'Mettler Toledo',
                    model: 'MS204S',
                    serial_number: 'BAL-204S-001',
                    company_id: companyId
                }
            ])
            .select();

        if (equipmentError) throw equipmentError;
        console.log('✓ Equipment created:', equipmentData?.length || 0);

        // Link equipment to the test configuration
        if (equipmentData && equipmentData.length > 0) {
            const linkRows = equipmentData.map((eq: any) => ({
                test_config_id: config.id,
                equipment_id: eq.id
            }));
            const { error: linkError } = await supabase
                .from('lab_test_equipment')
                .insert(linkRows);

            if (linkError) throw linkError;
        }

        // 4. Create Fields
        console.log('📊 Creating test fields...');
        const { data: fields, error: fieldsError } = await supabase
            .from('lab_test_fields')
            .insert([
                {
                    test_config_id: config.id,
                    field_key: 'ph_reading',
                    label: 'PH Reading',
                    label_ar: 'قراءة الحموضة',
                    field_type: 'number',
                    display_order: 0,
                    is_required: true,
                    is_evaluable: true,
                    spec_min_value: 3.0,
                    spec_max_value: 4.5,
                    spec_unit: 'pH',
                    spec_evaluation_mode: 'range',
                    default_value: null,
                    field_options: {
                        step: 0.1,
                        placeholder: 'Enter pH value',
                    },
                },
                {
                    test_config_id: config.id,
                    field_key: 'temperature',
                    label: 'Temperature',
                    label_ar: 'درجة الحرارة',
                    field_type: 'number',
                    display_order: 1,
                    is_required: true,
                    is_evaluable: false,
                    spec_unit: '°C',
                    field_options: {
                        step: 0.5,
                        placeholder: 'Enter temperature',
                    },
                },
                {
                    test_config_id: config.id,
                    field_key: 'notes',
                    label: 'Notes',
                    label_ar: 'ملاحظات',
                    field_type: 'text',
                    display_order: 2,
                    is_required: false,
                    is_evaluable: false,
                    field_options: {
                        placeholder: 'Any additional observations...',
                    },
                },
            ])
            .select();

        if (fieldsError) throw fieldsError;
        console.log('✓ Fields created:', fields.length);

        // 5. Create a sample test run
        console.log('🔬 Creating sample test run...');
        const { data: testRun, error: runError } = await supabase
            .from('lab_test_runs')
            .insert({
                test_config_id: config.id,
                status: 'completed',
                performed_by: user.id,
                field_values: {
                    ph_reading: 3.8,
                    temperature: 25,
                    notes: 'Sample test - all parameters within specification',
                },
                company_id: companyId,
            })
            .select()
            .single();

        if (runError) throw runError;
        console.log('✓ Test run created:', testRun.run_number);

        // 6. Evaluate the test
        console.log('🎯 Evaluating test...');
        const { data: evalResult, error: evalError } = await supabase
            .rpc('evaluate_test_run', { p_run_id: testRun.id });

        if (evalError) throw evalError;
        console.log('✓ Test evaluated:', evalResult);

        console.log('\n🎉 Sample data created successfully!');
        console.log('-----------------------------------');
        console.log('Category:', category.name);
        console.log('Type:', type.name);
        console.log('Test Config:', config.name);
        console.log('Fields:', fields.length);
        console.log('Sample Run:', testRun.run_number);
        console.log('Result:', evalResult);
        console.log('-----------------------------------');
        console.log('\n✅ You can now:');
        console.log('1. Navigate to /lab/settings to see the configuration');
        console.log('2. Navigate to /lab/quick-entry to submit new tests');
        console.log('3. Navigate to /lab/tests to view results');

        return {
            category,
            type,
            config,
            fields,
            testRun,
            evalResult,
        };
    } catch (error) {
        console.error('❌ Error creating sample data:', error);
        throw error;
    }
}

/**
 * Usage:
 * 
 * 1. In browser console:
 *    import { createSampleLabTestData } from './utils/createSampleData';
 *    await createSampleLabTestData();
 * 
 * 2. Or create a button in your UI:
 *    <button onClick={createSampleLabTestData}>Create Sample Data</button>
 * 
 * 3. Or run once on app initialization (dev only):
 *    if (import.meta.env.DEV) {
 *      createSampleLabTestData();
 *    }
 */
