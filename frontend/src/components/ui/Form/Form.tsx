import React, { forwardRef, useState, useCallback } from 'react';
import {
  TextField,
  TextFieldProps,
  FormControl,
  FormLabel,
  FormHelperText,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
  Autocomplete,
  Box,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Visibility, VisibilityOff, Clear } from '@mui/icons-material';
import { designTokens } from '../../../theme/design-tokens';

// Form field types
export type FieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'tel' 
  | 'url'
  | 'select'
  | 'autocomplete'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'textarea';

export interface FormFieldProps extends Omit<TextFieldProps, 'type'> {
  type?: FieldType;
  options?: Array<{ label: string; value: string | number }>;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
  clearable?: boolean;
  onClear?: () => void;
}

// Styled form components
const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiFormLabel-root': {
    fontWeight: 600,
    color: theme.palette.text.primary,
    marginBottom: designTokens.spacing[2],
    
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
    
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
  
  '& .MuiOutlinedInput-root': {
    borderRadius: designTokens.borderRadius.lg,
    transition: `all ${designTokens.animation.duration.fast} ${designTokens.animation.easing['ease-in-out']}`,
    
    '&:hover': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderWidth: '2px',
        borderColor: theme.palette.primary.light,
      },
    },
    
    '&.Mui-focused': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderWidth: '2px',
        borderColor: theme.palette.primary.main,
        boxShadow: `0 0 0 4px ${theme.palette.primary.main}20`,
      },
    },
    
    '&.Mui-error': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.error.main,
      },
      
      '&.Mui-focused': {
        '& .MuiOutlinedInput-notchedOutline': {
          boxShadow: `0 0 0 4px ${theme.palette.error.main}20`,
        },
      },
    },
  },
  
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    marginTop: designTokens.spacing[1],
    fontSize: designTokens.typography.fontSize['body-small'].size,
    
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-input': {
    fontSize: designTokens.typography.fontSize['body-medium'].size,
    padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
  },
  
  '& .MuiInputLabel-outlined': {
    transform: 'translate(14px, 16px) scale(1)',
    
    '&.MuiInputLabel-shrink': {
      transform: 'translate(14px, -9px) scale(0.75)',
    },
  },
}));

// Validation hook
const useFieldValidation = (value: any, validation?: FormFieldProps['validation']) => {
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((val: any) => {
    if (!validation) {
      setError(null);
      return true;
    }

    // Required validation
    if (validation.required && (!val || val.toString().trim() === '')) {
      setError('This field is required');
      return false;
    }

    // Min length validation
    if (validation.minLength && val && val.toString().length < validation.minLength) {
      setError(`Minimum ${validation.minLength} characters required`);
      return false;
    }

    // Max length validation
    if (validation.maxLength && val && val.toString().length > validation.maxLength) {
      setError(`Maximum ${validation.maxLength} characters allowed`);
      return false;
    }

    // Pattern validation
    if (validation.pattern && val && !validation.pattern.test(val.toString())) {
      setError('Invalid format');
      return false;
    }

    // Custom validation
    if (validation.custom && val) {
      const customError = validation.custom(val);
      if (customError) {
        setError(customError);
        return false;
      }
    }

    setError(null);
    return true;
  }, [validation]);

  return { error, validate };
};

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({
    type = 'text',
    options = [],
    validation,
    clearable = false,
    onClear,
    value,
    onChange,
    label,
    helperText,
    error: externalError,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const { error: validationError, validate } = useFieldValidation(value, validation);
    
    const error = externalError || validationError;
    const isError = Boolean(error);

    const handleChange = (event: any) => {
      const newValue = event.target ? event.target.value : event;
      validate(newValue);
      if (onChange) {
        onChange(event);
      }
    };

    const handleBlur = () => {
      validate(value);
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const handleClear = () => {
      if (onClear) {
        onClear();
      }
      validate('');
    };

    // Common props
    const commonProps = {
      value,
      onChange: handleChange,
      onBlur: handleBlur,
      error: isError,
      helperText: error || helperText,
      fullWidth: true,
      ...props,
    };

    // Password field
    if (type === 'password') {
      return (
        <StyledFormControl fullWidth error={isError}>
          {label && <FormLabel>{label}</FormLabel>}
          <StyledTextField
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {clearable && value && (
                    <IconButton onClick={handleClear} edge="end" size="small">
                      <Clear />
                    </IconButton>
                  )}
                  <IconButton onClick={togglePasswordVisibility} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            {...commonProps}
          />
          {(error || helperText) && (
            <FormHelperText>{error || helperText}</FormHelperText>
          )}
        </StyledFormControl>
      );
    }

    // Select field
    if (type === 'select') {
      return (
        <StyledFormControl fullWidth error={isError}>
          {label && <FormLabel>{label}</FormLabel>}
          <Select
            value={value || ''}
            onChange={handleChange}
            displayEmpty
            sx={{
              borderRadius: designTokens.borderRadius.lg,
              '& .MuiSelect-select': {
                padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
              },
            }}
          >
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {(error || helperText) && (
            <FormHelperText>{error || helperText}</FormHelperText>
          )}
        </StyledFormControl>
      );
    }

    // Autocomplete field
    if (type === 'autocomplete') {
      return (
        <StyledFormControl fullWidth error={isError}>
          {label && <FormLabel>{label}</FormLabel>}
          <Autocomplete
            options={options}
            getOptionLabel={(option) => option.label}
            value={options.find(opt => opt.value === value) || null}
            onChange={(_, newValue) => {
              const event = {
                target: { value: newValue?.value || '' }
              };
              handleChange(event);
            }}
            renderInput={(params) => (
              <StyledTextField
                {...params}
                error={isError}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {clearable && value && (
                        <IconButton onClick={handleClear} edge="end" size="small">
                          <Clear />
                        </IconButton>
                      )}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: designTokens.borderRadius.lg,
              },
            }}
          />
          {(error || helperText) && (
            <FormHelperText>{error || helperText}</FormHelperText>
          )}
        </StyledFormControl>
      );
    }

    // Checkbox field
    if (type === 'checkbox') {
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(value)}
              onChange={handleChange}
              color="primary"
            />
          }
          label={label}
          sx={{
            '& .MuiFormControlLabel-label': {
              fontSize: designTokens.typography.fontSize['body-medium'].size,
            },
          }}
        />
      );
    }

    // Radio field
    if (type === 'radio') {
      return (
        <StyledFormControl error={isError}>
          {label && <FormLabel>{label}</FormLabel>}
          <RadioGroup
            value={value}
            onChange={handleChange}
            row={options.length <= 3}
          >
            {options.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio color="primary" />}
                label={option.label}
              />
            ))}
          </RadioGroup>
          {(error || helperText) && (
            <FormHelperText>{error || helperText}</FormHelperText>
          )}
        </StyledFormControl>
      );
    }

    // Switch field
    if (type === 'switch') {
      return (
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(value)}
              onChange={handleChange}
              color="primary"
            />
          }
          label={label}
          sx={{
            '& .MuiFormControlLabel-label': {
              fontSize: designTokens.typography.fontSize['body-medium'].size,
            },
          }}
        />
      );
    }

    // Textarea field
    if (type === 'textarea') {
      return (
        <StyledFormControl fullWidth error={isError}>
          {label && <FormLabel>{label}</FormLabel>}
          <StyledTextField
            ref={ref}
            multiline
            rows={4}
            InputProps={{
              endAdornment: clearable && value && (
                <InputAdornment position="end">
                  <IconButton onClick={handleClear} edge="end" size="small">
                    <Clear />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            {...commonProps}
          />
          {(error || helperText) && (
            <FormHelperText>{error || helperText}</FormHelperText>
          )}
        </StyledFormControl>
      );
    }

    // Default text field
    return (
      <StyledFormControl fullWidth error={isError}>
        {label && <FormLabel>{label}</FormLabel>}
        <StyledTextField
          ref={ref}
          type={type}
          InputProps={{
            endAdornment: clearable && value && (
              <InputAdornment position="end">
                <IconButton onClick={handleClear} edge="end" size="small">
                  <Clear />
                </IconButton>
              </InputAdornment>
            ),
          }}
          {...commonProps}
        />
        {(error || helperText) && (
          <FormHelperText>{error || helperText}</FormHelperText>
        )}
      </StyledFormControl>
    );
  }
);

FormField.displayName = 'FormField';

// Form container component
export interface FormProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  spacing?: number;
}

export const Form: React.FC<FormProps> = ({
  children,
  title,
  description,
  spacing = 3,
}) => {
  return (
    <Box component="form" sx={{ width: '100%' }}>
      {title && (
        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontWeight: 600,
            marginBottom: description ? designTokens.spacing[2] : designTokens.spacing[4],
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
      )}
      
      {description && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            marginBottom: designTokens.spacing[4],
          }}
        >
          {description}
        </Typography>
      )}
      
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: designTokens.spacing[spacing],
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default FormField;