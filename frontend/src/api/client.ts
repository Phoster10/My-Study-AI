// study-ai/frontend/src/api/client.ts
import { supabase } from "../lib/supabase";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(await authHeader()),
    ...(init.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request to ${path} failed with status ${res.status}`);
  }

  return res.json();
}

export interface ExamQuestion {
  id: string;
  question: string;
  type: "mcq" | "short_answer";
  options?: Record<string, string>;
  answer?: string;
  correctAnswer?: string;
}

export interface QuestionResult {
  questionId: string;
  question: string;
  correct: boolean;
  confidence: number;
  userAnswer: string;
  correctAnswer: string;
  matchedConcepts: string[];
  missingConcepts: string[];
  contradictions: string[];
  explanation: string;
  gradedBy: string;
  needsManualReview: boolean;
}

export interface GradingReport {
  score: number;
  total: number;
  percentage: number;
  feedback: string;
  results: QuestionResult[];
  needsManualReview: boolean;
}

export interface SummaryListItem {
  id: string;
  title: string;
  summary_type: string;
  created_at: string;
}

export interface SavedSummary extends SummaryListItem {
  source_text: string;
  summary_text: string;
}

export interface GenerateExamOptions {
  count?: 5 | 10;
  mcqOnly?: boolean;
  weakTopics?: string[];
}

export const api = {
  ingestFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ text: string; source: string }>("/api/ingest", { method: "POST", body: form });
  },

  summarize: (text: string, type: string) =>
    request<{ summary: string; cards?: Array<{ front: string; back: string }> }>("/api/summarize", { method: "POST", body: JSON.stringify({ text, type }) }),

  generateExam: (text: string, options: GenerateExamOptions = {}) =>
    request<{ exam: ExamQuestion[] }>("/api/exam/generate", { method: "POST", body: JSON.stringify({ text, ...options }) }),

  gradeExam: (exam: ExamQuestion[], userAnswers: Record<string, string>) =>
    request<GradingReport>("/api/exam/grade", { method: "POST", body: JSON.stringify({ exam, userAnswers }) }),

  dueTopics: () => request<{ due: Array<{ topic: string; nextReviewDate: number }> }>("/api/review/due"),

  submitReview: (topic: string, isCorrect: boolean) =>
    request<{ topic: string }>("/api/review/submit", { method: "POST", body: JSON.stringify({ topic, isCorrect }) }),

  getXP: () => request<{ xp: number }>("/api/xp"),

  addXP: (amount: number) => request<{ success: boolean; xp: number }>("/api/xp/update", { method: "POST", body: JSON.stringify({ amount }) }),

  search: (query: string) => request<{ result: string }>("/api/search", { method: "POST", body: JSON.stringify({ query }) }),

  listSummaries: () => request<{ summaries: SummaryListItem[] }>("/api/summaries"),

  getSummary: (id: string) => request<SavedSummary>(`/api/summaries/${id}`),

  saveSummary: (params: { title: string; summaryType: string; sourceText: string; summaryText: string }) =>
    request<SummaryListItem>("/api/summaries", { method: "POST", body: JSON.stringify(params) }),

  deleteSummary: (id: string) => request<{ success: boolean }>(`/api/summaries/${id}`, { method: "DELETE" }),

  /** Validated server-side before anything reaches Supabase. */
  updateUsername: (username: string) =>
    request<{ success: boolean; username: string }>("/api/account/username", { method: "PATCH", body: JSON.stringify({ username }) }),

  updatePassword: (password: string, confirmPassword: string) =>
    request<{ success: boolean }>("/api/account/password", { method: "PATCH", body: JSON.stringify({ password, confirmPassword }) }),

  deleteAccount: () => request<{ success: boolean }>("/api/account", { method: "DELETE" }),
};