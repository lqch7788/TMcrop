/**
 * Steps 步骤条
 * 展示分步流程，如审批流程
 */
import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StepsProps extends React.HTMLAttributes<HTMLDivElement> {
  currentStep?: number
  items?: { title: string; description?: string }[]
  variant?: 'default' | 'navigation'
}

const Steps = React.forwardRef<HTMLDivElement, StepsProps>(
  ({ currentStep = 0, items, children, variant = 'default', className, ...props }, ref) => {
    const steps = items || (React.Children.toArray(children) as React.ReactElement[]).map((child, index) => ({
      title: child.props.title || `Step ${index + 1}`,
      description: child.props.description
    }))

    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      >
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              {/* 步骤节点 */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors",
                    index < currentStep && "bg-emerald-600 border-emerald-600 text-white",
                    index === currentStep && "border-emerald-600 text-emerald-600 bg-white",
                    index > currentStep && "border-gray-400 text-gray-400 bg-white"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    "text-sm font-medium",
                    index <= currentStep ? "text-gray-900" : "text-gray-400"
                  )}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-0.5 max-w-[120px]">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* 连接线 */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mt-[-20px]">
                  <div
                    className={cn(
                      "h-full transition-colors",
                      index < currentStep ? "bg-emerald-600" : "bg-gray-200"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    )
  }
)
Steps.displayName = "Steps"

export interface StepsStepProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  icon?: React.ReactNode
}

const StepsStep = React.forwardRef<HTMLDivElement, StepsStepProps>(
  ({ title, description, icon, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col items-center", className)}
      {...props}
    >
      {icon}
      <span>{title}</span>
      {description && <span>{description}</span>}
    </div>
  )
)
StepsStep.displayName = "StepsStep"

export { Steps, StepsStep }
