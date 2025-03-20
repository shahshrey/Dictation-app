import React, { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from './card';

interface StatsCardProps {
  className?: string;
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  iconClassName?: string;
  valueClassName?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  className,
  title,
  value,
  icon,
  description,
  iconClassName,
  valueClassName,
}) => {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground font-medium">{title}</div>

          <div className="flex items-center gap-2">
            <span className={cn('text-3xl font-bold', valueClassName)}>{value}</span>
            {icon && <span className={cn('text-primary', iconClassName)}>{icon}</span>}
          </div>

          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
