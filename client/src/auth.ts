import { UserInfo } from "./api";

const KEY = "docp_user";

export const setUser = (u: UserInfo) =>
  localStorage.setItem(KEY, JSON.stringify(u));

export const getUser = (): UserInfo | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  } catch {
    return null;
  }
};

export const logout = () => localStorage.removeItem(KEY);

export const isAuthed = () => !!getUser();
