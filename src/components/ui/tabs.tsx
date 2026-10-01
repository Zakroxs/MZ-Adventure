import * as React from 'react';
import { cn } from '../../lib/utils';

interface TabsContextValue { value: string; setValue: (v: string) => void }
const TabsCtx = React.createContext<TabsContextValue | null>(null);

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
  const [inner, setInner] = React.useState(defaultValue ?? '');
  const current = value ?? inner;
  const setValue = (v: string) => { if (value === undefined) setInner(v); onValueChange?.(v); };
  return (
    <TabsCtx.Provider value={{ value: current, setValue }}>
      <div ref={ref} className={cn('', className)} {...props}>{children}</div>
    </TabsCtx.Provider>
  );
});
Tabs.displayName = 'Tabs';

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('inline-flex h-9 items-center justify-center rounded-md border border-border bg-black/20 p-1 gap-1', className)} {...props} />
));
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { value: string }
const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(({ className, value, ...props }, ref) => {
  const ctx = React.useContext(TabsCtx)!;
  return (
    <button
      ref={ref}
      onClick={() => ctx.setValue(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-all font-body',
        ctx.value === value ? 'bg-primary text-primary-foreground shadow-gold' : 'text-muted-foreground hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> { value: string }
const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(({ className, value, ...props }, ref) => {
  const ctx = React.useContext(TabsCtx)!;
  if (ctx.value !== value) return null;
  return <div ref={ref} className={cn('mt-3 animate-fade-in', className)} {...props} />;
});
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
