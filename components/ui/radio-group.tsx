import * as React from "react";
import { cn } from "@/lib/utils";

type RadioGroupContextValue = {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

function RadioGroup({
  className,
  value,
  defaultValue,
  onValueChange,
  name,
  children,
  ...props
}: RadioGroupProps) {
  const generatedName = React.useId();
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const selectedValue = value ?? uncontrolledValue;
  const groupName = name ?? generatedName;

  return (
    <RadioGroupContext.Provider
      value={{
        name: groupName,
        value: selectedValue,
        onValueChange: (nextValue) => {
          if (value === undefined) setUncontrolledValue(nextValue);
          onValueChange?.(nextValue);
        },
      }}
    >
      <div role="radiogroup" className={cn("grid gap-2", className)} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "name" | "value"> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const group = React.useContext(RadioGroupContext);
    if (!group) throw new Error("RadioGroupItem must be used within RadioGroup");

    return (
      <input
        ref={ref}
        type="radio"
        name={group.name}
        value={value}
        checked={group.value === value}
        onChange={(event) => {
          if (event.target.checked) group.onValueChange?.(value);
          onChange?.(event);
        }}
        className={cn(
          "h-4 w-4 border border-primary text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
