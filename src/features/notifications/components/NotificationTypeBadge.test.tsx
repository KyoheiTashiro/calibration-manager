import { NotificationTypeBadge } from '@/features/notifications/components/NotificationTypeBadge';
import {
  NOTIFICATION_TYPE_BADGE_CLASSES,
  NOTIFICATION_TYPE_LABELS,
} from '@/features/notifications/constants';
import { NOTIFICATION_TYPE } from '@/store/types';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';

describe('NotificationTypeBadge', () => {
  it.each(Object.values(NOTIFICATION_TYPE))(
    '%s の日本語ラベル・色クラス・アイコンを表示する',
    (type) => {
      render(<NotificationTypeBadge type={type} />);
      const badge = screen.getByText(NOTIFICATION_TYPE_LABELS[type]);
      expect(badge).toHaveClass(...NOTIFICATION_TYPE_BADGE_CLASSES[type].split(' '));
      expect(badge.querySelector('svg')).not.toBeNull();
    },
  );
});
