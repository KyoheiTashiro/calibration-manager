import { strokeIconProps, type IconProps } from '@/components/icons/base';
import type { ReactElement } from 'react';

/** 下向きシェブロンアイコン(セレクト等の開閉インジケータ) */
export const ChevronDownIcon = ({ className }: IconProps): ReactElement => (
  <svg {...strokeIconProps(className)}>
    <path d='m6 9 6 6 6-6' />
  </svg>
);
