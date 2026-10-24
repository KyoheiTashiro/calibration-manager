import { Badge } from '@/components/ui';
import {
  NOTIFICATION_TYPE_BADGE_CLASSES,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_LABELS,
} from '@/features/notifications/constants';
import type { NotificationType } from '@/store/types';
import type { ReactElement } from 'react';

type Props = {
  type: NotificationType;
};

/** 通知種別のバッジ(色 + アイコン + 日本語ラベル)。通知一覧・ダッシュボード・マニュアルで共通 */
export const NotificationTypeBadge = ({ type }: Props): ReactElement => {
  const TypeIcon = NOTIFICATION_TYPE_ICONS[type];
  return (
    <Badge className={NOTIFICATION_TYPE_BADGE_CLASSES[type]}>
      <TypeIcon className='mr-1 h-3.5 w-3.5' />
      {NOTIFICATION_TYPE_LABELS[type]}
    </Badge>
  );
};
