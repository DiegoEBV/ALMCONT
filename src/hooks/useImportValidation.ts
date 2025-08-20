import { useState, useCallback, useMemo } from 'react';
import { ValidationError, ValidationWarning, ValidationResult, ParsedData } from '../services/ImportService';

interface UseImportValidationProps {
  data: ParsedData | null;
  fieldMapping: Record<string, string>;
  targetTable: string;
}

interface ValidationRules {
  required: string[];
  numeric: string[];
  email: string[];
  phone: string[];
  date: string[];
  minLength: Record<string, number>;
  maxLength: Record<string, number>;
  pattern: Record<string, RegExp>;
  customValidators: Record<string, (value: any, row: any) => string | null>;
}

const TABLE_VALIDATION_RULES: Record<string, ValidationRules> = {
  productos: {
    required: ['nombre', 'precio'],
    numeric: ['precio', 'stock_minimo'],
    email: [],
    phone: [],
    date: [],
    minLength: { nombre: 2 },
    maxLength: { nombre: 100, descripcion: 500 },
    pattern: {},
    customValidators: {
      precio: (value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) return 'El precio debe ser un número positivo';
        return null;
      },
      stock_minimo: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 0) return 'El stock mínimo debe ser un número entero positivo';
        return null;
      }
    }
  },
  proveedores: {
    required: ['nombre'],
    numeric: [],
    email: ['email'],
    phone: ['telefono'],
    date: [],
    minLength: { nombre: 2 },
    maxLength: { nombre: 100, contacto: 100, direccion: 200 },
    pattern: {},
    customValidators: {}
  },
  categorias: {
    required: ['nombre'],
    numeric: [],
    email: [],
    phone: [],
    date: [],
    minLength: { nombre: 2 },
    maxLength: { nombre: 50, descripcion: 200 },
    pattern: {},
    customValidators: {}
  },
  ubicaciones: {
    required: ['codigo', 'nombre'],
    numeric: ['capacidad_maxima'],
    email: [],
    phone: [],
    date: [],
    minLength: { codigo: 2, nombre: 2 },
    maxLength: { codigo: 20, nombre: 100 },
    pattern: {
      codigo: /^[A-Z0-9-]+$/
    },
    customValidators: {
      tipo: (value) => {
        const validTypes = ['estanteria', 'piso', 'refrigerado', 'especial'];
        if (!validTypes.includes(value?.toLowerCase())) {
          return `Tipo debe ser uno de: ${validTypes.join(', ')}`;
        }
        return null;
      },
      capacidad_maxima: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num <= 0) return 'La capacidad máxima debe ser un número entero positivo';
        return null;
      }
    }
  },
  movimientos: {
    required: ['producto_id', 'tipo', 'cantidad'],
    numeric: ['producto_id', 'cantidad'],
    email: [],
    phone: [],
    date: ['fecha'],
    minLength: {},
    maxLength: { observaciones: 500 },
    pattern: {},
    customValidators: {
      tipo: (value) => {
        const validTypes = ['entrada', 'salida', 'transferencia', 'ajuste'];
        if (!validTypes.includes(value?.toLowerCase())) {
          return `Tipo debe ser uno de: ${validTypes.join(', ')}`;
        }
        return null;
      },
      cantidad: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num <= 0) return 'La cantidad debe ser un número entero positivo';
        return null;
      }
    }
  }
};

const useImportValidation = ({ data, fieldMapping, targetTable }: UseImportValidationProps) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [realTimeErrors, setRealTimeErrors] = useState<Record<string, ValidationError[]>>({});

  const validationRules = useMemo(() => {
    return TABLE_VALIDATION_RULES[targetTable] || {
      required: [],
      numeric: [],
      email: [],
      phone: [],
      date: [],
      minLength: {},
      maxLength: {},
      pattern: {},
      customValidators: {}
    };
  }, [targetTable]);

  const validateField = useCallback((value: any, field: string, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    const rules = validationRules;

    // Verificar campos requeridos
    if (rules.required.includes(field) && (!value || String(value).trim() === '')) {
      errors.push({
        row: rowIndex + 1,
        field,
        message: 'Campo requerido',
        value,
        severity: 'error'
      });
      return errors; // Si es requerido y está vacío, no validar más
    }

    // Si el valor está vacío y no es requerido, no validar más
    if (!value || String(value).trim() === '') {
      return errors;
    }

    const stringValue = String(value).trim();

    // Validar campos numéricos
    if (rules.numeric.includes(field)) {
      const numValue = parseFloat(stringValue);
      if (isNaN(numValue)) {
        errors.push({
          row: rowIndex + 1,
          field,
          message: 'Debe ser un número válido',
          value,
          severity: 'error'
        });
      }
    }

    // Validar emails
    if (rules.email.includes(field)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue)) {
        errors.push({
          row: rowIndex + 1,
          field,
          message: 'Formato de email inválido',
          value,
          severity: 'error'
        });
      }
    }

    // Validar teléfonos
    if (rules.phone.includes(field)) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(stringValue) || stringValue.length < 7) {
        errors.push({
          row: rowIndex + 1,
          field,
          message: 'Formato de teléfono inválido',
          value,
          severity: 'error'
        });
      }
    }

    // Validar fechas
    if (rules.date.includes(field)) {
      const date = new Date(stringValue);
      if (isNaN(date.getTime())) {
        errors.push({
          row: rowIndex + 1,
          field,
          message: 'Formato de fecha inválido (use YYYY-MM-DD)',
          value,
          severity: 'error'
        });
      }
    }

    // Validar longitud mínima
    if (rules.minLength[field] && stringValue.length < rules.minLength[field]) {
      errors.push({
        row: rowIndex + 1,
        field,
        message: `Mínimo ${rules.minLength[field]} caracteres`,
        value,
        severity: 'error'
      });
    }

    // Validar longitud máxima
    if (rules.maxLength[field] && stringValue.length > rules.maxLength[field]) {
      errors.push({
        row: rowIndex + 1,
        field,
        message: `Máximo ${rules.maxLength[field]} caracteres`,
        value,
        severity: 'error'
      });
    }

    // Validar patrones
    if (rules.pattern[field] && !rules.pattern[field].test(stringValue)) {
      errors.push({
        row: rowIndex + 1,
        field,
        message: 'Formato inválido',
        value,
        severity: 'error'
      });
    }

    // Validadores personalizados
    if (rules.customValidators[field]) {
      const customError = rules.customValidators[field](value, data?.data[rowIndex]);
      if (customError) {
        errors.push({
          row: rowIndex + 1,
          field,
          message: customError,
          value,
          severity: 'error'
        });
      }
    }

    return errors;
  }, [validationRules, data]);

  const validateRow = useCallback((row: Record<string, any>, rowIndex: number): { errors: ValidationError[], warnings: ValidationWarning[] } => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar cada campo mapeado
    Object.entries(fieldMapping).forEach(([sourceField, targetField]) => {
      if (targetField && row[sourceField] !== undefined) {
        const fieldErrors = validateField(row[sourceField], targetField, rowIndex);
        errors.push(...fieldErrors);
      }
    });

    // Generar advertencias para campos no mapeados con datos
    Object.keys(row).forEach(sourceField => {
      if (!fieldMapping[sourceField] && row[sourceField] && String(row[sourceField]).trim() !== '') {
        warnings.push({
          row: rowIndex + 1,
          field: sourceField,
          message: 'Campo no mapeado con datos',
          value: row[sourceField],
          severity: 'warning'
        });
      }
    });

    return { errors, warnings };
  }, [fieldMapping, validateField]);

  const validateAllData = useCallback(async (): Promise<ValidationResult> => {
    if (!data || !data.data.length) {
      return {
        isValid: false,
        errors: [],
        warnings: [],
        totalRows: 0,
        validRows: 0,
        summary: {
          totalErrors: 0,
          totalWarnings: 0,
          errorsByField: {},
          warningsByField: {}
        }
      };
    }

    setIsValidating(true);

    try {
      const allErrors: ValidationError[] = [];
      const allWarnings: ValidationWarning[] = [];
      const errorRows = new Set<number>();
      const warningRows = new Set<number>();

      // Validar cada fila
      for (let i = 0; i < data.data.length; i++) {
        const row = data.data[i];
        const { errors, warnings } = validateRow(row, i);
        
        if (errors.length > 0) {
          allErrors.push(...errors);
          errorRows.add(i + 1);
        }
        
        if (warnings.length > 0) {
          allWarnings.push(...warnings);
          warningRows.add(i + 1);
        }

        // Simular procesamiento asíncrono para archivos grandes
        if (i % 100 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      // Validaciones adicionales a nivel de conjunto de datos
      const duplicateErrors = findDuplicates(data.data, fieldMapping);
      allErrors.push(...duplicateErrors);

      const result: ValidationResult = {
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        totalRows: data.data.length,
        validRows: data.data.length - errorRows.size,
        summary: {
          totalErrors: allErrors.length,
          totalWarnings: allWarnings.length,
          errorsByField: {},
          warningsByField: {}
        }
      };

      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [data, validateRow, fieldMapping]);

  const findDuplicates = useCallback((rows: Record<string, any>[], mapping: Record<string, string>): ValidationError[] => {
    const errors: ValidationError[] = [];
    const uniqueFields = ['codigo', 'nombre']; // Campos que deben ser únicos
    
    uniqueFields.forEach(field => {
      const sourceField = Object.keys(mapping).find(key => mapping[key] === field);
      if (!sourceField) return;

      const valueMap = new Map<string, number[]>();
      
      rows.forEach((row, index) => {
        const value = row[sourceField];
        if (value && String(value).trim() !== '') {
          const normalizedValue = String(value).trim().toLowerCase();
          if (!valueMap.has(normalizedValue)) {
            valueMap.set(normalizedValue, []);
          }
          valueMap.get(normalizedValue)!.push(index + 1);
        }
      });

      valueMap.forEach((rowNumbers, value) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            errors.push({
              row: rowNumber,
              field,
              message: `Valor duplicado encontrado en filas: ${rowNumbers.join(', ')}`,
              value,
              severity: 'error'
            });
          });
        }
      });
    });

    return errors;
  }, []);

  const validateFieldRealTime = useCallback((sourceField: string, value: any, rowIndex: number) => {
    const targetField = fieldMapping[sourceField];
    if (!targetField) return;

    const errors = validateField(value, targetField, rowIndex);
    
    setRealTimeErrors(prev => ({
      ...prev,
      [`${rowIndex}-${sourceField}`]: errors
    }));
  }, [fieldMapping, validateField]);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setRealTimeErrors({});
  }, []);

  const getFieldErrors = useCallback((sourceField: string, rowIndex: number): ValidationError[] => {
    return realTimeErrors[`${rowIndex}-${sourceField}`] || [];
  }, [realTimeErrors]);

  const hasFieldError = useCallback((sourceField: string, rowIndex: number): boolean => {
    const errors = getFieldErrors(sourceField, rowIndex);
    return errors.length > 0;
  }, [getFieldErrors]);

  return {
    validationResult,
    isValidating,
    validateAllData,
    validateFieldRealTime,
    clearValidation,
    getFieldErrors,
    hasFieldError,
    validationRules
  };
};

export default useImportValidation;