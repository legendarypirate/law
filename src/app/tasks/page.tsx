"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type User = { id: string; name: string; email: string };
type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  order: number;
  assignedToId: string | null;
  assignedTo: User | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_OPTIONS: { value: Task["status"]; label: string }[] = [
  { value: "TODO", label: "Хийгдэх" },
  { value: "IN_PROGRESS", label: "Хийж байна" },
  { value: "DONE", label: "Дууссан" },
];

const COLUMNS: { id: Task["status"]; title: string }[] = [
  { id: "TODO", title: "Хийгдэх" },
  { id: "IN_PROGRESS", title: "Хийж байна" },
  { id: "DONE", title: "Дууссан" },
];

function formatDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return d.toLocaleDateString("mn-MN", { day: "numeric", month: "short", year: "numeric" });
}

function TaskCard({
  task,
  users,
  onEdit,
  onDelete,
  onStatusChange,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  task: Task;
  users: User[];
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onStatusChange: (t: Task, status: Task["status"]) => void;
  onDragStart: (e: React.DragEvent, t: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: Task["status"]) => void;
  isDragging: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={() => {}}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-shadow",
        isDragging && "opacity-50 shadow-lg"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{task.title}</p>
            {task.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {task.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {task.assignedTo && (
                <span title={task.assignedTo.email}>{task.assignedTo.name}</span>
              )}
              {task.dueDate && (
                <span className="flex items-center gap-0.5">
                  <Calendar className="size-3" />
                  {formatDate(task.dueDate)}
                </span>
              )}
            </div>
            <div className={cn("mt-2 flex flex-wrap items-center gap-1", !showActions && "opacity-0")}>
              <Select
                value={task.status}
                onValueChange={(v) => onStatusChange(task, v as Task["status"])}
              >
                <SelectTrigger className="h-7 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(task)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(task)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Column({
  column,
  tasks,
  users,
  onEdit,
  onDelete,
  onStatusChange,
  onDragStart,
  onDragOver,
  onDrop,
  draggedTask,
}: {
  column: (typeof COLUMNS)[0];
  tasks: Task[];
  users: User[];
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onStatusChange: (t: Task, status: Task["status"]) => void;
  onDragStart: (e: React.DragEvent, t: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: Task["status"]) => void;
  draggedTask: Task | null;
}) {
  return (
    <div
      className="flex min-w-[280px] flex-1 flex-col rounded-lg border bg-muted/30"
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
        <h3 className="font-semibold text-foreground">{column.title}</h3>
        <span className="text-sm text-muted-foreground">{tasks.length}</span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 overflow-auto pb-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            users={users}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            isDragging={draggedTask?.id === task.id}
          />
        ))}
      </CardContent>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("TODO");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    if (res.ok) setTasks(data);
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (res.ok) setUsers(data);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchUsers()]).finally(() => setLoading(false));
  }, []);

  const byStatus = (s: Task["status"]) => tasks.filter((t) => t.status === s);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setStatus("TODO");
    setAssignedToId("");
    setDueDate("");
    setError("");
    setOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setTitle(t.title);
    setDescription(t.description ?? "");
    setStatus(t.status);
    setAssignedToId(t.assignedToId ?? "");
    setDueDate(t.dueDate ? t.dueDate.slice(0, 10) : "");
    setError("");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Гарчиг оруулна уу.");
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const res = await fetch(`/api/tasks/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            status,
            assignedToId: assignedToId || null,
            dueDate: dueDate || null,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Алдаа гарлаа");
        }
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            status,
            assignedToId: assignedToId || null,
            dueDate: dueDate || null,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Алдаа гарлаа");
        }
        const created = await res.json();
        setTasks((prev) => [...prev, created]);
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: Task["status"]) => {
    if (task.status === newStatus) return;
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm("Энэ даалгаврыг устгах уу?")) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Task["status"]) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setDraggedTask(null);
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === newStatus) return;
    await handleStatusChange(task, newStatus);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Уншиж байна...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Дотоод даалгавар
        </h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Даалгавар нэмэх
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-auto">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            column={col}
            tasks={byStatus(col.id)}
            users={users}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            draggedTask={draggedTask}
          />
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Даалгавар засах" : "Шинэ даалгавар"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="task-title">Гарчиг</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Даалгаврын гарчиг"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="task-desc">Тайлбар</Label>
              <Textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Дэлгэрэнгүй (заавал биш)"
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Төлөв</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Task["status"])}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Хариуцагч</Label>
              <Select value={assignedToId || "none"} onValueChange={(v) => setAssignedToId(v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Сонгох" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Хэн ч биш</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-due">Дуусах огноо</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Болих
              </Button>
              <Button type="submit" disabled={submitting}>
                {editing ? "Хадгалах" : "Нэмэх"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
