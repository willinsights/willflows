import React from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { cn } from '@/lib/utils';

interface PrivacyBlurProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Wrapper that blurs and disables interaction with its content
 * whenever the workspace privacy mode is active. Use to cover entire
 * monetary cards/sections without rewriting every nested value.
 */
export const PrivacyBlur: React.FC<PrivacyBlurProps> = ({
  children,
  className,
  as: Tag = 'div',
}) => {
  const { isPrivacyMode } = usePrivacyMode();
  return React.createElement(
    Tag as any,
    {
      className: cn(
        'transition-all duration-200',
        isPrivacyMode && 'blur-sm select-none pointer-events-none',
        className,
      ),
      'aria-hidden': isPrivacyMode || undefined,
      'data-privacy': isPrivacyMode ? 'masked' : undefined,
    },
    children,
  );
};

export default PrivacyBlur;
