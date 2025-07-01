import React, { forwardRef } from 'react';
import { Box, BoxProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { designTokens } from '../../../theme/design-tokens';

// Grid types
export type GridBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type GridSpacing = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type GridDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type GridJustify = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
export type GridAlign = 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';

// Responsive grid props
export interface ResponsiveGridProps {
  xs?: GridColumns;
  sm?: GridColumns;
  md?: GridColumns;
  lg?: GridColumns;
  xl?: GridColumns;
  '2xl'?: GridColumns;
}

// Container props
export interface ContainerProps extends BoxProps {
  maxWidth?: GridBreakpoint | number | false;
  disableGutters?: boolean;
  fixed?: boolean;
  fluid?: boolean;
}

// Grid container props
export interface GridContainerProps extends BoxProps {
  container?: boolean;
  spacing?: GridSpacing | { xs?: GridSpacing; sm?: GridSpacing; md?: GridSpacing; lg?: GridSpacing; xl?: GridSpacing };
  direction?: GridDirection | { xs?: GridDirection; sm?: GridDirection; md?: GridDirection; lg?: GridDirection; xl?: GridDirection };
  justifyContent?: GridJustify;
  alignItems?: GridAlign;
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  children: React.ReactNode;
}

// Grid item props
export interface GridItemProps extends BoxProps, ResponsiveGridProps {
  item?: boolean;
  order?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  offset?: ResponsiveGridProps;
  children?: React.ReactNode;
}

// Breakpoint values
const breakpointValues = {
  xs: 0,
  sm: parseInt(designTokens.breakpoints.sm),
  md: parseInt(designTokens.breakpoints.md),
  lg: parseInt(designTokens.breakpoints.lg),
  xl: parseInt(designTokens.breakpoints.xl),
  '2xl': parseInt(designTokens.breakpoints['2xl']),
};

// Container max widths
const containerMaxWidths = {
  xs: '100%',
  sm: designTokens.breakpoints.sm,
  md: designTokens.breakpoints.md,
  lg: designTokens.breakpoints.lg,
  xl: designTokens.breakpoints.xl,
  '2xl': designTokens.breakpoints['2xl'],
};

// Styled components
const StyledContainer = styled(Box, {
  shouldForwardProp: (prop) => 
    prop !== 'maxWidth' && 
    prop !== 'disableGutters' && 
    prop !== 'fixed' && 
    prop !== 'fluid',
})<ContainerProps>(({ theme, maxWidth, disableGutters, fixed, fluid }) => {
  const getMaxWidth = () => {
    if (fluid) return '100%';
    if (maxWidth === false) return 'none';
    if (typeof maxWidth === 'number') return `${maxWidth}px`;
    if (maxWidth && containerMaxWidths[maxWidth]) {
      return containerMaxWidths[maxWidth];
    }
    return containerMaxWidths.lg; // default
  };

  return {
    width: '100%',
    maxWidth: getMaxWidth(),
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: disableGutters ? 0 : designTokens.spacing[4],
    paddingRight: disableGutters ? 0 : designTokens.spacing[4],
    
    ...(fixed && {
      position: 'relative',
      minHeight: '100vh',
    }),
    
    // Responsive padding
    [theme.breakpoints.up('sm')]: {
      paddingLeft: disableGutters ? 0 : designTokens.spacing[6],
      paddingRight: disableGutters ? 0 : designTokens.spacing[6],
    },
    
    [theme.breakpoints.up('md')]: {
      paddingLeft: disableGutters ? 0 : designTokens.spacing[8],
      paddingRight: disableGutters ? 0 : designTokens.spacing[8],
    },
  };
});

const StyledGridContainer = styled(Box, {
  shouldForwardProp: (prop) => 
    prop !== 'spacing' && 
    prop !== 'direction' && 
    prop !== 'justifyContent' && 
    prop !== 'alignItems' && 
    prop !== 'wrap',
})<GridContainerProps>(({ theme, spacing = 3, direction, justifyContent, alignItems, wrap }) => {
  const getSpacing = (breakpoint?: GridBreakpoint) => {
    if (typeof spacing === 'object' && spacing[breakpoint!]) {
      return `${parseInt(designTokens.spacing[spacing[breakpoint!]])}px`;
    }
    if (typeof spacing === 'number') {
      return `${parseInt(designTokens.spacing[spacing])}px`;
    }
    return `${parseInt(designTokens.spacing[3])}px`;
  };

  const getDirection = (dir?: GridDirection) => {
    if (typeof direction === 'object') return dir;
    return direction || 'row';
  };

  return {
    display: 'flex',
    flexWrap: wrap || 'wrap',
    flexDirection: getDirection(),
    justifyContent: justifyContent || 'flex-start',
    alignItems: alignItems || 'stretch',
    gap: getSpacing(),
    
    // Responsive spacing
    [theme.breakpoints.up('xs')]: {
      gap: getSpacing('xs'),
      flexDirection: typeof direction === 'object' ? direction.xs || 'row' : direction || 'row',
    },
    
    [theme.breakpoints.up('sm')]: {
      gap: getSpacing('sm'),
      flexDirection: typeof direction === 'object' ? direction.sm || direction.xs || 'row' : direction || 'row',
    },
    
    [theme.breakpoints.up('md')]: {
      gap: getSpacing('md'),
      flexDirection: typeof direction === 'object' ? direction.md || direction.sm || 'row' : direction || 'row',
    },
    
    [theme.breakpoints.up('lg')]: {
      gap: getSpacing('lg'),
      flexDirection: typeof direction === 'object' ? direction.lg || direction.md || 'row' : direction || 'row',
    },
    
    [theme.breakpoints.up('xl')]: {
      gap: getSpacing('xl'),
      flexDirection: typeof direction === 'object' ? direction.xl || direction.lg || 'row' : direction || 'row',
    },
  };
});

const StyledGridItem = styled(Box, {
  shouldForwardProp: (prop) => 
    prop !== 'xs' && 
    prop !== 'sm' && 
    prop !== 'md' && 
    prop !== 'lg' && 
    prop !== 'xl' && 
    prop !== '2xl' && 
    prop !== 'order' && 
    prop !== 'offset',
})<GridItemProps>(({ theme, xs, sm, md, lg, xl, order, offset }) => {
  const getWidth = (columns?: GridColumns) => {
    if (!columns) return 'auto';
    return `${(columns / 12) * 100}%`;
  };

  const getOrder = (orderValue?: number | object, breakpoint?: GridBreakpoint) => {
    if (typeof orderValue === 'object' && breakpoint && orderValue[breakpoint]) {
      return orderValue[breakpoint];
    }
    if (typeof orderValue === 'number') {
      return orderValue;
    }
    return 'initial';
  };

  const getOffset = (offsetValue?: ResponsiveGridProps, breakpoint?: GridBreakpoint) => {
    if (offsetValue && breakpoint && offsetValue[breakpoint]) {
      return `${(offsetValue[breakpoint]! / 12) * 100}%`;
    }
    return 0;
  };

  return {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: getWidth(xs),
    marginLeft: getOffset(offset, 'xs'),
    order: getOrder(order, 'xs'),
    
    [theme.breakpoints.up('sm')]: {
      width: getWidth(sm || xs),
      marginLeft: getOffset(offset, 'sm'),
      order: getOrder(order, 'sm'),
    },
    
    [theme.breakpoints.up('md')]: {
      width: getWidth(md || sm || xs),
      marginLeft: getOffset(offset, 'md'),
      order: getOrder(order, 'md'),
    },
    
    [theme.breakpoints.up('lg')]: {
      width: getWidth(lg || md || sm || xs),
      marginLeft: getOffset(offset, 'lg'),
      order: getOrder(order, 'lg'),
    },
    
    [theme.breakpoints.up('xl')]: {
      width: getWidth(xl || lg || md || sm || xs),
      marginLeft: getOffset(offset, 'xl'),
      order: getOrder(order, 'xl'),
    },
  };
});

// Container component
export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ children, ...props }, ref) => {
    return (
      <StyledContainer ref={ref} {...props}>
        {children}
      </StyledContainer>
    );
  }
);

Container.displayName = 'Container';

// Grid component (can be both container and item)
export const Grid = forwardRef<HTMLDivElement, GridContainerProps & GridItemProps>(
  ({ 
    container, 
    item, 
    children, 
    spacing,
    direction,
    justifyContent,
    alignItems,
    wrap,
    xs,
    sm,
    md,
    lg,
    xl,
    order,
    offset,
    ...props 
  }, ref) => {
    if (container) {
      return (
        <StyledGridContainer
          ref={ref}
          spacing={spacing}
          direction={direction}
          justifyContent={justifyContent}
          alignItems={alignItems}
          wrap={wrap}
          {...props}
        >
          {children}
        </StyledGridContainer>
      );
    }

    if (item) {
      return (
        <StyledGridItem
          ref={ref}
          xs={xs}
          sm={sm}
          md={md}
          lg={lg}
          xl={xl}
          order={order}
          offset={offset}
          {...props}
        >
          {children}
        </StyledGridItem>
      );
    }

    // Default to container if neither specified
    return (
      <StyledGridContainer
        ref={ref}
        spacing={spacing}
        direction={direction}
        justifyContent={justifyContent}
        alignItems={alignItems}
        wrap={wrap}
        {...props}
      >
        {children}
      </StyledGridContainer>
    );
  }
);

Grid.displayName = 'Grid';

// Utility hook for responsive values
export const useResponsiveValue = <T,>(
  values: {
    xs?: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
    '2xl'?: T;
  },
  defaultValue: T
): T => {
  const [currentValue, setCurrentValue] = React.useState(defaultValue);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateValue = () => {
      const width = window.innerWidth;
      
      if (width >= breakpointValues['2xl'] && values['2xl'] !== undefined) {
        setCurrentValue(values['2xl']);
      } else if (width >= breakpointValues.xl && values.xl !== undefined) {
        setCurrentValue(values.xl);
      } else if (width >= breakpointValues.lg && values.lg !== undefined) {
        setCurrentValue(values.lg);
      } else if (width >= breakpointValues.md && values.md !== undefined) {
        setCurrentValue(values.md);
      } else if (width >= breakpointValues.sm && values.sm !== undefined) {
        setCurrentValue(values.sm);
      } else if (values.xs !== undefined) {
        setCurrentValue(values.xs);
      } else {
        setCurrentValue(defaultValue);
      }
    };

    updateValue();
    window.addEventListener('resize', updateValue);
    
    return () => window.removeEventListener('resize', updateValue);
  }, [values, defaultValue]);

  return currentValue;
};

export default Grid;