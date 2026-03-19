import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Briefcase, Shield, UserCog, FolderTree } from "lucide-react";

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        Самбар
      </h1>
      <p className="mb-8 text-muted-foreground">
        Хууль зүйн фирмийн дотоод систем — хэрэг, харилцагч, хэрэглэгч, эрхийг удирдах.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/cases">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center gap-2">
              <Briefcase className="size-5 text-primary" />
              <CardTitle>Хэргүүд</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Хэргүүдийг харах, удирдах</CardDescription>
            </CardContent>
          </Card>
        </Link>
        <Link href="/case-types">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center gap-2">
              <FolderTree className="size-5 text-primary" />
              <CardTitle>Хэргийн төрөл</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Хэргийн төрөл, ангилал</CardDescription>
            </CardContent>
          </Card>
        </Link>
        <Link href="/clients">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center gap-2">
              <Users className="size-5 text-primary" />
              <CardTitle>Харилцагчид</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Харилцагчийн жагсаалт</CardDescription>
            </CardContent>
          </Card>
        </Link>
        <Link href="/users">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center gap-2">
              <UserCog className="size-5 text-primary" />
              <CardTitle>Хэрэглэгчид</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Ажилтан ба эрх</CardDescription>
            </CardContent>
          </Card>
        </Link>
        <Link href="/roles">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center gap-2">
              <Shield className="size-5 text-primary" />
              <CardTitle>Эрх</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Роль, эрхийн тохиргоо</CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
