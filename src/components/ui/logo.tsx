import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import logoWhite from '@/assets/logo-willflow-white.png';
import logoBlack from '@/assets/logo-willflow-black.png';
import logoPurple from '@/assets/logo-willflow-purple.png';
import logoIconCyan from '@/assets/logo-willflow-icon-cyan.png';
import logoIconPurple from '@/assets/logo-willflow-icon-purple.png';
import { cn } from '@/lib/utils';

export type LogoVariant = 'auto' | 'white' | 'black' | 'purple';

interface LogoProps {
  /** 
   * Logo variant to display:
   * - 'auto': Automatically selects based on theme (white for dark, black for light)
   * - 'white': Always shows white logo
   * - 'black': Always shows black logo
   * - 'purple': Always shows purple logo
   */
  variant?: LogoVariant;
  /** Custom className for the img element */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Show only the icon (dedicated icon image based on theme) */
  iconOnly?: boolean;
}

const logoMap = {
  white: logoWhite,
  black: logoBlack,
  purple: logoPurple,
} as const;

export const Logo = React.forwardRef<HTMLImageElement, LogoProps>(
  function Logo({ variant = 'auto', className, alt = 'WillFlow', iconOnly = false }, ref) {
    const { theme } = useTheme();
    
    const getLogo = () => {
      if (variant === 'auto') {
        return theme === 'dark' ? logoWhite : logoBlack;
      }
      return logoMap[variant];
    };

    // When iconOnly is true, show dedicated icon based on theme
    if (iconOnly) {
      const iconSrc = theme === 'dark' ? logoIconCyan : logoIconPurple;
      return (
        <img 
          ref={ref}
          src={iconSrc}
          alt={alt}
          className={cn('h-8 w-8 object-contain', className)}
        />
      );
    }

    return (
      <img 
        ref={ref}
        src={getLogo()} 
        alt={alt}
        width={225}
        height={40}
        className={cn('h-8 w-auto', className)} 
      />
    );
  }
);