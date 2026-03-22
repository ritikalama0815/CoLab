import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ListTodo } from "lucide-react"

export function TodoPlaceholder() {
  return (
    <Card className="h-full border-dashed border-border bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ListTodo className="h-4 w-4 text-primary" />
          To-Do
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ListTodo className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs text-muted-foreground">Coming soon</p>
        </div>
      </CardContent>
    </Card>
  )
}
