import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const recentActivity = [
  {
    id: 1,
    user: "Olivia Martin",
    email: "olivia.martin@email.com",
    amount: "+$1,999.00",
    status: "success",
    avatar: "/avatars/01.png",
  },
  {
    id: 2,
    user: "Jackson Lee",
    email: "jackson.lee@email.com",
    amount: "+$39.00",
    status: "success",
    avatar: "/avatars/02.png",
  },
  {
    id: 3,
    user: "Isabella Nguyen",
    email: "isabella.nguyen@email.com",
    amount: "+$299.00",
    status: "success",
    avatar: "/avatars/03.png",
  },
  {
    id: 4,
    user: "William Kim",
    email: "will@email.com",
    amount: "+$99.00",
    status: "pending",
    avatar: "/avatars/04.png",
  },
  {
    id: 5,
    user: "Sofia Davis",
    email: "sofia.davis@email.com",
    amount: "+$39.00",
    status: "success",
    avatar: "/avatars/05.png",
  },
]

export function RecentActivity() {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentActivity.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activity.avatar} alt={activity.user} />
                    <AvatarFallback>
                      {activity.user
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {activity.user}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activity.email}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    activity.status === "success" ? "default" : "secondary"
                  }
                >
                  {activity.status === "success" ? "Exitoso" : "Pendiente"}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {activity.amount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
