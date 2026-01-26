// Re-export cn from utils for convenience
export { cn } from "./utils";

// Card style variants
export const cardStyles = {
  base: "rounded-lg border bg-card text-card-foreground shadow-sm",
  hover: "transition-shadow hover:shadow-md",
  interactive: "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg",
  flat: "rounded-lg bg-card text-card-foreground",
  outlined: "rounded-lg border-2 bg-transparent",
};

// Button style variants (extends shadcn button)
export const buttonStyles = {
  brand: "bg-brand-blue text-white hover:bg-brand-blue/90",
  brandSecondary: "bg-brand-purple-light text-white hover:bg-brand-purple",
  brandSuccess: "bg-brand-green text-white hover:bg-brand-green/90",
  brandOutline: "border-2 border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white",
};

// Section styles
export const sectionStyles = {
  header: "flex items-center justify-between mb-6",
  title: "text-2xl font-semibold tracking-tight",
  description: "text-sm text-muted-foreground",
  container: "space-y-6",
};

// Form styles
export const formStyles = {
  group: "space-y-2",
  label: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  input: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  error: "text-sm text-destructive",
  hint: "text-xs text-muted-foreground",
};

// Layout styles
export const layoutStyles = {
  pageContainer: "container mx-auto px-4 py-8",
  pageContainerNarrow: "container mx-auto max-w-4xl px-4 py-8",
  pageContainerWide: "container mx-auto max-w-7xl px-4 py-8",
  grid2: "grid grid-cols-1 md:grid-cols-2 gap-6",
  grid3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
  grid4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6",
  stack: "flex flex-col space-y-4",
  row: "flex flex-row items-center space-x-4",
};

// Status badge styles
export const badgeStyles = {
  default: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  success: "bg-brand-green/10 text-brand-green",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500",
  error: "bg-destructive/10 text-destructive",
  info: "bg-brand-blue/10 text-brand-blue",
  neutral: "bg-muted text-muted-foreground",
};

// Animation classes
export const animationStyles = {
  fadeIn: "animate-in fade-in duration-300",
  slideUp: "animate-in slide-in-from-bottom-4 duration-300",
  slideDown: "animate-in slide-in-from-top-4 duration-300",
  scaleIn: "animate-in zoom-in-95 duration-200",
  spin: "animate-spin",
  pulse: "animate-pulse",
};

// Table styles
export const tableStyles = {
  container: "relative w-full overflow-auto",
  table: "w-full caption-bottom text-sm",
  header: "border-b",
  headerRow: "[&_tr]:border-b",
  headerCell: "h-12 px-4 text-left align-middle font-medium text-muted-foreground",
  body: "[&_tr:last-child]:border-0",
  row: "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
  cell: "p-4 align-middle",
};

// Sidebar styles
export const sidebarStyles = {
  container: "flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground",
  header: "flex h-16 items-center border-b border-sidebar-border px-6",
  content: "flex-1 overflow-auto py-4",
  footer: "border-t border-sidebar-border p-4",
  item: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  itemActive: "bg-sidebar-accent text-sidebar-accent-foreground",
};

// Hero section styles
export const heroStyles = {
  container: "relative overflow-hidden bg-gradient-to-br from-brand-purple-dark to-brand-purple-darker py-20 text-white",
  content: "container mx-auto px-4 text-center",
  title: "text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl",
  subtitle: "mt-6 text-lg text-white/80 sm:text-xl",
  actions: "mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row",
};
