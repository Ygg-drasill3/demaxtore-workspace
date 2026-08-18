import { api } from "@/lib/api";
import type {
  OperationalTaskDto,
  OperationalTaskListResponse,
  OperationalTaskSummaryCounts,
  OperationalTaskCommentDto,
} from "@dmx/contracts/operational-task";

export const taskApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/tasks", { params }).then((r) => r.data as OperationalTaskListResponse),
  summary: () => api.get("/tasks/summary").then((r) => r.data as OperationalTaskSummaryCounts),
  get: (id: string) => api.get(`/tasks/${id}`).then((r) => r.data as OperationalTaskDto),
  create: (body: Record<string, unknown>) =>
    api.post("/tasks", body).then((r) => r.data as OperationalTaskDto),
  patch: (id: string, body: Record<string, unknown>) =>
    api.patch(`/tasks/${id}`, body).then((r) => r.data as OperationalTaskDto),
  assign: (id: string, assignedToId: string | null) =>
    api.post(`/tasks/${id}/assign`, { assignedToId }).then((r) => r.data as OperationalTaskDto),
  start: (id: string) => api.post(`/tasks/${id}/start`).then((r) => r.data as OperationalTaskDto),
  complete: (id: string) => api.post(`/tasks/${id}/complete`).then((r) => r.data as OperationalTaskDto),
  cancel: (id: string) => api.post(`/tasks/${id}/cancel`).then((r) => r.data as OperationalTaskDto),
  comments: (id: string) =>
    api.get(`/tasks/${id}/comments`).then((r) => r.data as OperationalTaskCommentDto[]),
  addComment: (id: string, message: string) =>
    api.post(`/tasks/${id}/comments`, { message }).then((r) => r.data as OperationalTaskCommentDto),
  forOrder: (orderId: string) =>
    api.get(`/orders/${orderId}/tasks`).then((r) => r.data as OperationalTaskListResponse),
};
