import { useState, useCallback, useMemo } from 'react';

type ValidationRule<T> = {
  validate: (value: T, formData?: Record<string, any>) => boolean;
  message: string;
};

type FieldValidation<T> = {
  rules: ValidationRule<T>[];
  required?: boolean;
  requiredMessage?: string;
};

type ValidationSchema = Record<string, FieldValidation<any>>;

type ValidationErrors = Record<string, string[]>;

interface UseFormValidationReturn<T extends Record<string, any>> {
  errors: ValidationErrors;
  isValid: boolean;
  validateField: (fieldName: keyof T, value: any) => string[];
  validateForm: (formData: T) => boolean;
  clearErrors: () => void;
  clearFieldErrors: (fieldName: keyof T) => void;
  setFieldError: (fieldName: keyof T, error: string) => void;
}

/**
 * Hook for form validation
 * @param schema - validation schema
 */
function useFormValidation<T extends Record<string, any>>(
  schema: ValidationSchema
): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = useCallback(
    (fieldName: keyof T, value: any, formData?: T): string[] => {
      const fieldSchema = schema[fieldName as string];
      if (!fieldSchema) return [];

      const fieldErrors: string[] = [];

      // Check required
      if (fieldSchema.required) {
        const isEmpty = value === undefined || value === null || value === '' || 
          (Array.isArray(value) && value.length === 0);
        
        if (isEmpty) {
          fieldErrors.push(fieldSchema.requiredMessage || 'هذا الحقل مطلوب');
          return fieldErrors;
        }
      }

      // Run validation rules
      for (const rule of fieldSchema.rules) {
        if (!rule.validate(value, formData)) {
          fieldErrors.push(rule.message);
        }
      }

      return fieldErrors;
    },
    [schema]
  );

  const validateForm = useCallback(
    (formData: T): boolean => {
      const newErrors: ValidationErrors = {};
      let isFormValid = true;

      for (const fieldName of Object.keys(schema)) {
        const fieldErrors = validateField(fieldName as keyof T, formData[fieldName], formData);
        if (fieldErrors.length > 0) {
          newErrors[fieldName] = fieldErrors;
          isFormValid = false;
        }
      }

      setErrors(newErrors);
      return isFormValid;
    },
    [schema, validateField]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldErrors = useCallback((fieldName: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName as string];
      return newErrors;
    });
  }, []);

  const setFieldError = useCallback((fieldName: keyof T, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: [error],
    }));
  }, []);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  return {
    errors,
    isValid,
    validateField,
    validateForm,
    clearErrors,
    clearFieldErrors,
    setFieldError,
  };
}

// Common validation rules
export const validationRules = {
  email: {
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'البريد الإلكتروني غير صالح',
  },
  phone: {
    validate: (value: string) => /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(value),
    message: 'رقم الهاتف غير صالح',
  },
  minLength: (min: number) => ({
    validate: (value: string) => value.length >= min,
    message: `يجب أن يكون على الأقل ${min} أحرف`,
  }),
  maxLength: (max: number) => ({
    validate: (value: string) => value.length <= max,
    message: `يجب ألا يتجاوز ${max} أحرف`,
  }),
  min: (min: number) => ({
    validate: (value: number) => value >= min,
    message: `يجب أن يكون على الأقل ${min}`,
  }),
  max: (max: number) => ({
    validate: (value: number) => value <= max,
    message: `يجب ألا يتجاوز ${max}`,
  }),
  pattern: (regex: RegExp, message: string) => ({
    validate: (value: string) => regex.test(value),
    message,
  }),
  numeric: {
    validate: (value: any) => !isNaN(value) && isFinite(value),
    message: 'يجب أن يكون رقماً',
  },
  positive: {
    validate: (value: number) => value > 0,
    message: 'يجب أن يكون رقماً موجباً',
  },
};

export default useFormValidation;
