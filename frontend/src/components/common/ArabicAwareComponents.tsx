import React from 'react';
import { Input, Textarea, InputProps, TextareaProps, Box, Text } from '@chakra-ui/react';
import { getArabicTextStyles, validateArabicText, isArabic } from '../../utils/arabicSupport';

interface ArabicAwareInputProps extends InputProps {
  language?: string;
  showValidation?: boolean;
}

interface ArabicAwareTextareaProps extends TextareaProps {
  language?: string;
  showValidation?: boolean;
}

export const ArabicAwareInput: React.FC<ArabicAwareInputProps> = ({
  language = 'en',
  showValidation = false,
  value,
  onChange,
  ...props
}) => {
  const arabicStyles = getArabicTextStyles(language);
  const validation = showValidation && value ? validateArabicText(value as string) : null;

  return (
    <Box>
      <Input
        value={value}
        onChange={onChange}
        {...props}
        style={{
          ...arabicStyles,
          ...props.style,
        }}
        placeholder={isArabic(language) ? 'اكتب هنا...' : props.placeholder}
      />
      {validation && validation.issues.length > 0 && (
        <Box mt={1}>
          {validation.issues.map((issue, index) => (
            <Text key={index} fontSize="xs" color="yellow.400">
              ⚠️ {issue}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};

export const ArabicAwareTextarea: React.FC<ArabicAwareTextareaProps> = ({
  language = 'en',
  showValidation = false,
  value,
  onChange,
  ...props
}) => {
  const arabicStyles = getArabicTextStyles(language);
  const validation = showValidation && value ? validateArabicText(value as string) : null;

  return (
    <Box>
      <Textarea
        value={value}
        onChange={onChange}
        {...props}
        style={{
          ...arabicStyles,
          ...props.style,
        }}
        placeholder={isArabic(language) ? 'اكتب هنا...' : props.placeholder}
      />
      {validation && validation.issues.length > 0 && (
        <Box mt={1}>
          {validation.issues.map((issue, index) => (
            <Text key={index} fontSize="xs" color="yellow.400">
              ⚠️ {issue}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};

// Language-aware text display component
interface LanguageAwareTextProps {
  text: string;
  language: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export const LanguageAwareText: React.FC<LanguageAwareTextProps> = ({
  text,
  language,
  children,
  ...props
}) => {
  const styles = getArabicTextStyles(language);

  return (
    <Text
      {...props}
      style={{
        ...styles,
        ...props.style,
      }}
    >
      {text || children}
    </Text>
  );
};