const Joi = require('joi');

// Custom validation types
const customJoi = Joi.extend((joi) => ({
  type: 'uuid',
  base: joi.string(),
  messages: {
    'uuid.invalid': '{{#label}} must be a valid UUID'
  },
  validate(value, helpers) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return { value, errors: helpers.error('uuid.invalid') };
    }
  }
}));

// Convert simple schema to Joi schema
const createJoiSchema = (schema) => {
  const joiSchema = {};
  
  for (const [key, rules] of Object.entries(schema)) {
    let validator;
    
    switch (rules.type) {
      case 'string':
        validator = customJoi.string();
        if (rules.min) validator = validator.min(rules.min);
        if (rules.max) validator = validator.max(rules.max);
        break;
        
      case 'email':
        validator = customJoi.string().email();
        break;
        
      case 'number':
        validator = customJoi.number();
        if (rules.min) validator = validator.min(rules.min);
        if (rules.max) validator = validator.max(rules.max);
        break;
        
      case 'date':
        validator = customJoi.date();
        break;
        
      case 'uuid':
        validator = customJoi.uuid();
        break;
        
      case 'array':
        validator = customJoi.array();
        if (rules.items) {
          validator = validator.items(customJoi.object(createJoiSchema(rules.items)));
        }
        break;
        
      default:
        validator = customJoi.any();
    }
    
    if (rules.required) {
      validator = validator.required();
    } else if (rules.optional) {
      validator = validator.optional();
    }
    
    joiSchema[key] = validator;
  }
  
  return joiSchema;
};

// Validation middleware factory
const validateRequest = (schema) => {
  return (req, res, next) => {
    const validationSchema = {};
    
    if (schema.body) {
      validationSchema.body = customJoi.object(createJoiSchema(schema.body));
    }
    
    if (schema.query) {
      validationSchema.query = customJoi.object(createJoiSchema(schema.query));
    }
    
    if (schema.params) {
      validationSchema.params = customJoi.object(createJoiSchema(schema.params));
    }
    
    // Validate each part
    const errors = [];
    
    for (const [part, partSchema] of Object.entries(validationSchema)) {
      const { error, value } = partSchema.validate(req[part], { 
        abortEarly: false,
        stripUnknown: true 
      });
      
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `${part}.${detail.path.join('.')}`,
          message: detail.message
        })));
      } else {
        req[part] = value; // Replace with validated/cleaned data
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
};

// Common validation rules
const commonValidations = {
  email: customJoi.string().email().required(),
  password: customJoi.string().min(8).required(),
  uuid: customJoi.string().uuid().required(),
  pagination: {
    page: customJoi.number().integer().min(1).default(1),
    limit: customJoi.number().integer().min(1).max(100).default(10)
  },
  dateRange: {
    startDate: customJoi.date().iso().required(),
    endDate: customJoi.date().iso().greater(customJoi.ref('startDate')).required()
  }
};

module.exports = {
  validateRequest,
  customJoi,
  commonValidations
};