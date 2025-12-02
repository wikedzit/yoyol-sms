import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "~/lib/utils"

interface AccordionContextValue {
  value: string | string[]
  onValueChange: (value: string) => void
  type: "single" | "multiple"
  collapsible?: boolean
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

function useAccordion() {
  const context = React.useContext(AccordionContext)
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion")
  }
  return context
}

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple"
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  collapsible?: boolean
}

function Accordion({
  type = "single",
  value: controlledValue,
  defaultValue,
  onValueChange,
  collapsible = false,
  className,
  children,
  ...props
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    defaultValue ?? (type === "multiple" ? [] : "")
  )

  const value = controlledValue !== undefined ? controlledValue : internalValue

  const handleValueChange = React.useCallback(
    (itemValue: string) => {
      let newValue: string | string[]

      if (type === "multiple") {
        const currentArray = Array.isArray(value) ? value : []
        if (currentArray.includes(itemValue)) {
          newValue = currentArray.filter((v) => v !== itemValue)
        } else {
          newValue = [...currentArray, itemValue]
        }
      } else {
        if (value === itemValue && collapsible) {
          newValue = ""
        } else {
          newValue = itemValue
        }
      }

      if (controlledValue === undefined) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [type, value, collapsible, controlledValue, onValueChange]
  )

  return (
    <AccordionContext.Provider
      value={{ value, onValueChange: handleValueChange, type, collapsible }}
    >
      <div data-slot="accordion" className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemContextValue {
  value: string
  isOpen: boolean
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null)

function useAccordionItem() {
  const context = React.useContext(AccordionItemContext)
  if (!context) {
    throw new Error("AccordionItem components must be used within an AccordionItem")
  }
  return context
}

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

function AccordionItem({ value, className, children, ...props }: AccordionItemProps) {
  const { value: accordionValue, type } = useAccordion()

  const isOpen =
    type === "multiple"
      ? Array.isArray(accordionValue) && accordionValue.includes(value)
      : accordionValue === value

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div
        data-slot="accordion-item"
        data-state={isOpen ? "open" : "closed"}
        className={cn("border-b last:border-b-0", className)}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionTriggerProps) {
  const { onValueChange } = useAccordion()
  const { value, isOpen } = useAccordionItem()

  return (
    <div className="flex">
      <button
        type="button"
        data-slot="accordion-trigger"
        data-state={isOpen ? "open" : "closed"}
        onClick={() => onValueChange(value)}
        className={cn(
          "flex flex-1 items-center justify-between py-4 text-left font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
          className
        )}
        aria-expanded={isOpen}
        {...props}
      >
        {children}
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </button>
    </div>
  )
}

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionContentProps) {
  const { isOpen } = useAccordionItem()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState<number | undefined>(0)

  React.useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0)
    }
  }, [isOpen])

  return (
    <div
      data-slot="accordion-content"
      data-state={isOpen ? "open" : "closed"}
      className="overflow-hidden text-sm transition-all duration-200 ease-in-out"
      style={{ height: height }}
      {...props}
    >
      <div ref={contentRef} className={cn("pb-4 pt-0", className)}>
        {children}
      </div>
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
