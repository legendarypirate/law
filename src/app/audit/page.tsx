"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type User = { id: string; name: string; email: string };
type AuditLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  message: string | null;
  data: unknown;
  createdAt: string;
  user: User | null;
};

const ACTION_LABELS: Record<string, string> = {
  CASE_CREATED: "Хэрэг нээсэн",
  CASE_UPDATED: "Хэрэг шинэчилсэн",
  CASE_STEP_ADDED: "Алхам нэмсэн",
  CASE_STEP_SELECTION_SAVED: "Алхмын сонголт / тэмдэглэл хадгалсан",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 30;

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(page * limit));
    if (entityFilter !== "all") params.set("entityType", entityFilter);
    const res = await fetch(`/api/audit?${params}`);
    const data = await res.json();
    if (res.ok) {
      setLogs(data.logs);
      setTotal(data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, page]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Үйлдлийн бүртгэл
        </h1>
        <div className="flex items-center gap-2">
          <Select
            value={entityFilter}
            onValueChange={(v) => {
              // `Select` can return `null`; keep our state always as `string`.
              setEntityFilter(v ?? "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Төрөл" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүгд</SelectItem>
              <SelectItem value="case">Хэрэг</SelectItem>
              <SelectItem value="client">Харилцагч</SelectItem>
              <SelectItem value="user">Хэрэглэгч</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Бүх үйлдлийн бүртгэл
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Ачаалж байна…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Одоогоор audit бүртгэл алга.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Огноо</TableHead>
                    <TableHead className="w-24">Төрөл</TableHead>
                    <TableHead className="w-32">Үйлдэл</TableHead>
                    <TableHead>Тайлбар</TableHead>
                    <TableHead className="w-36">Хэрэглэгч</TableHead>
                    <TableHead className="w-24">ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("mn-MN", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-xs">{log.entityType}</TableCell>
                      <TableCell className="text-xs">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {log.message ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.user?.name ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.entityId.slice(0, 8)}…
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Нийт: {total} бүртгэл
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Өмнөх
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(page + 1) * limit >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Дараах
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
