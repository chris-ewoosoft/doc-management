export type DocumentLocaleCode = "en" | "vi" | "ko";

export const DOCUMENT_LOCALES: Array<{
  code: DocumentLocaleCode;
  label: string;
  flag: string;
}> = [
  { code: "en", label: "English", flag: "EN" },
  { code: "vi", label: "Tiếng Việt", flag: "VI" },
  { code: "ko", label: "한국어", flag: "KO" },
];

export type LocaleContent = Record<
  DocumentLocaleCode,
  { title: string; content: string }
>;

export const emptyLocaleContent = (): LocaleContent => ({
  en: { title: "", content: "" },
  vi: { title: "", content: "" },
  ko: { title: "", content: "" },
});

export interface EditorComment {
  id: number;
  content: string;
  authorId: number;
  position: number | null;
  selectionEnd: number | null;
  resolved: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EditorNote {
  id: number;
  documentId: number;
  locale: DocumentLocaleCode;
  authorId: number;
  position: number;
  content: string;
  noteNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EditorFileNote {
  id: number;
  documentId: number;
  locale: DocumentLocaleCode;
  authorId: number;
  embeddedId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  pageNumber: number;
  xPercent: number;
  yPercent: number;
  content: string;
  noteNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export function getNextNoteNumber(notes: { noteNumber: number }[]): number {
  if (notes.length === 0) return 1;
  return Math.max(...notes.map((n) => n.noteNumber)) + 1;
}
