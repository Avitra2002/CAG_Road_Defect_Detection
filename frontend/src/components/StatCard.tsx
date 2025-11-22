import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: number; isPositive: boolean } | string;
  variant?: 'default' | 'critical' | 'warning' | 'success';
  subtitle?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  subtitle,
  className,
}: StatCardProps) {
  const variantStyles = {
    default: 'border-border',
    critical: 'border-red-500 bg-red-50 dark:bg-red-950/20',
    warning: 'border-orange-500 bg-orange-50 dark:bg-orange-950/20',
    success: 'border-green-500 bg-green-50 dark:bg-green-950/20',
  };

  const renderTrend = () => {
    if (!trend) return null;
    if (typeof trend === 'string')
      return <p className="text-xs text-muted-foreground mt-1">{trend}</p>;
    return (
      <p
        className={`text-xs mt-1 ${
          trend.isPositive ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last period
      </p>
    );
  };

  return (
    <Card className={`${variantStyles[variant]} ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {renderTrend()}
      </CardContent>
    </Card>
  );
}
