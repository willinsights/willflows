import { useTheme } from '@/contexts/ThemeContext';
import logoWhite from '@/assets/logo-willflow-white.png';
import logoBlack from '@/assets/logo-willflow-black.png';
import logoPurple from '@/assets/logo-willflow-purple.png';
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
}

const logoMap = {
  white: logoWhite,
  black: logoBlack,
  purple: logoPurple,
} as const;

export function Logo({ variant = 'auto', className, alt = 'WillFlow' }: LogoProps) {
  const { theme } = useTheme();
  
  const getLogo = () => {
    if (variant === 'auto') {
      return theme === 'dark' ? logoWhite : logoBlack;
    }
    return logoMap[variant];
  };

  return (
    <img 
      src={getLogo()} 
      alt={alt} 
      className={cn('h-8 w-auto', className)} 
    />
  );
}
