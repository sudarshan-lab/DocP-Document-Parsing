import axios from "axios";

// Same-origin requests. On Vercel these /api calls are proxied to the EC2
// backend (see client/vercel.json); when the backend serves the built UI
// directly, they hit it on the same origin.
const api = axios.create({ baseURL: "" });

export interface UserInfo {
  _id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
}

export type FileStatus = "processing" | "ready" | "failed";

export interface FileItem {
  _id: string;
  fileName: string;
  status: FileStatus;
  mimeType?: string;
  error?: string;
  createdAt: string;
  summary?: string;
  keyFacts?: { label: string; value: any }[];
  suggestedQuestions?: string[];
  tags?: string[];
}

export interface SavedTableItem {
  _id: string;
  query: string;
  data: any;
  createdAt: string;
  fileId: { _id: string; fileName: string } | null;
}

export interface TableResultItem {
  _id: string;
  fileId: string;
  query: string;
  data: any;
  createdAt: string;
}

export const login = (userNameorEmail: string, password: string) =>
  api
    .post("/api/login", { userNameorEmail, password })
    .then((r) => r.data.userInfo as UserInfo);

export const signup = (payload: {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
}) => api.post("/api/signup", payload).then((r) => r.data);

export const listFiles = (userId: string) =>
  api.get("/api/files", { params: { userId } }).then((r) => r.data as FileItem[]);

export const uploadFile = (file: File, userId: string) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("userId", userId);
  return api
    .post("/api/files", fd)
    .then((r) => r.data as { fileId: string; status: FileStatus });
};

export const getFile = (id: string) =>
  api.get(`/api/files/${id}`).then(
    (r) =>
      r.data as { file: FileItem; viewUrl: string; tables: TableResultItem[] }
  );

export const queryFile = (id: string, query: string) =>
  api
    .post(`/api/files/${id}/query`, { query })
    .then((r) => r.data as { query: string; data: any });

export const saveTable = (id: string, query: string, data: any) =>
  api
    .post(`/api/files/${id}/tables`, { query, data })
    .then((r) => r.data as TableResultItem);

export const deleteTable = (fileId: string, tableId: string) =>
  api.delete(`/api/files/${fileId}/tables/${tableId}`).then((r) => r.data);

export const deleteFile = (id: string) =>
  api.delete(`/api/files/${id}`).then((r) => r.data);

export const updateFile = (id: string, patch: { fileName?: string; tags?: string[] }) =>
  api.patch(`/api/files/${id}`, patch).then((r) => r.data as FileItem);

export const listAllTables = (userId: string) =>
  api.get("/api/tables", { params: { userId } }).then((r) => r.data as SavedTableItem[]);

export default api;
