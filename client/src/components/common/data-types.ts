import React from "react";

export interface AnnouncementDataType {
  key: React.Key;
  title: string;
  description: string;
  status: string;
  startTime: string;
  endTime: string;
  assignee: string;
}

export interface ContractDataType {
  key: React.Key;
  name: string;
  addedDate: string;
  description: string;
  modifiedDate: string;
  prompt: string;
}
export interface FaqDataType {
  key: React.Key;
  title: string;
  description: string;
  isHidden: boolean;
  createdAt: string;
  assignee: string;
  faqNumber: string;
  files: Array<string>;
}

export interface AnnouncementsStats {
  total: number;
  running: number;
  published: number;
  upcomming: number;
}

export interface CommentsDataType {
  id: number;
  parentId: number | null;
  text: string;
  author: string;
  children: null;
  commentTime: string;
}
export interface ticketDataType {
  ticketNumber: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  assignee: string;
  files: string;
  comments: CommentsDataType;
}
