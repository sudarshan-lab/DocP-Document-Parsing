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
  twoFactorEnabled?: boolean;
}

export interface LoginResult {
  userInfo?: UserInfo;
  twoFactorRequired?: boolean;
  userId?: string;
  email?: string;
  nudge2fa?: boolean;
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
  folderId?: string | null;
}

export interface FolderItem {
  _id: string;
  name: string;
  createdAt: string;
}

export interface SavedTableItem {
  _id: string;
  query: string;
  data: any;
  createdAt: string;
  fileId: { _id: string; fileName: string } | null;
  fileIds?: string[];
  folderId?: string | null;
  sourceLabel?: string;
  sourceFileNames?: string[];
}

export interface TableResultItem {
  _id: string;
  fileId: string;
  query: string;
  data: any;
  createdAt: string;
}

export const login = (userNameorEmail: string, password: string) =>
  api.post("/api/login", { userNameorEmail, password }).then((r) => r.data as LoginResult);

export const verifyOtp = (userId: string, otp: string) =>
  api.post("/api/login/verify-otp", { userId, otp }).then((r) => r.data.userInfo as UserInfo);

export const set2fa = (userId: string, enabled: boolean) =>
  api.post("/api/2fa", { userId, enabled }).then((r) => r.data.userInfo as UserInfo);

export const signup = (payload: {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
}) => api.post("/api/signup", payload).then((r) => r.data);

export const listFiles = (userId: string) =>
  api.get("/api/files", { params: { userId } }).then((r) => r.data as FileItem[]);

// One file per request (keeps each under the Vercel proxy body limit). Pass a
// folderId to drop it into an existing set.
export const uploadOne = (file: File, userId: string, folderId?: string) => {
  const fd = new FormData();
  fd.append("files", file);
  fd.append("userId", userId);
  if (folderId) fd.append("folderId", folderId);
  return api.post("/api/files", fd).then((r) => r.data);
};

export const createFolder = (userId: string, name: string) =>
  api.post("/api/folders", { userId, name }).then((r) => r.data as FolderItem);

export const listFolders = (userId: string) =>
  api.get("/api/folders", { params: { userId } }).then((r) => r.data as FolderItem[]);

export const deleteFolder = (id: string) =>
  api.delete(`/api/folders/${id}`).then((r) => r.data);

export const queryFiles = (fileIds: string[], query: string) =>
  api
    .post("/api/query", { fileIds, query })
    .then(
      (r) =>
        r.data as { query: string; data: any; filesUsed: number; skipped: string[] }
    );

export const saveMultiTable = (p: {
  userId: string;
  query: string;
  data: any;
  fileIds: string[];
  sourceLabel: string;
  folderId?: string;
}) => api.post("/api/tables", p).then((r) => r.data);

export const getFolder = (id: string) =>
  api.get(`/api/folders/${id}`).then(
    (r) => r.data as { folder: FolderItem; files: FileItem[]; tables: SavedTableItem[] }
  );

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

export const deleteTable = (tableId: string) =>
  api.delete(`/api/tables/${tableId}`).then((r) => r.data);

export const deleteFile = (id: string) =>
  api.delete(`/api/files/${id}`).then((r) => r.data);

export const updateFile = (id: string, patch: { fileName?: string; tags?: string[] }) =>
  api.patch(`/api/files/${id}`, patch).then((r) => r.data as FileItem);

export const listAllTables = (userId: string) =>
  api.get("/api/tables", { params: { userId } }).then((r) => r.data as SavedTableItem[]);

export default api;
