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
  /** Show only the icon (crop logo to show only the W symbol) */
  iconOnly?: boolean;
}

const logoMap = {
  white: logoWhite,
  black: logoBlack,
  purple: logoPurple,
} as const;

export function Logo({ variant = 'auto', className, alt = 'WillFlow', iconOnly = false }: LogoProps) {
  const { theme } = useTheme();
  
  const getLogo = () => {
    if (variant === 'auto') {
      return theme === 'dark' ? logoWhite : logoBlack;
    }
    return logoMap[variant];
  };

  // When iconOnly is true, we crop the logo to show only the icon part
  if (iconOnly) {
    return (
      <div 
        className={cn('overflow-hidden', className)}
        style={{ width: '32px', height: '32px' }}
      >
        <img 
          src={getLogo()} 
          alt={alt} 
          className="h-8 w-auto max-w-none"
          style={{ 
            // Crop to show only the left part (the W icon)
            // Adjust the negative margin to position the icon correctly
            marginLeft: '0px',
            clipPath: 'inset(0 75% 0 0)', // Crop 75% from the right
            transform: 'scale(1.2)', // Slightly enlarge
            transformOrigin: 'left center'
          }}
        />
      </div>
    );
  }

  return (
    <img 
      src={getLogo()} 
      alt={alt} 
      className={cn('h-8 w-auto', className)} 
    />
  );
}
