/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubjectMarks {
  marks: number | string; // e.g. 85 or "AB" for absent
  maxMarks: number;
  passingMarks: number;
}

export interface StudentResult {
  roll: string;        // Roll Number (String to preserve leading zeros if any)
  name: string;        // Candidate Name
  father: string;      // Father's Name
  mother: string;      // Mother's Name
  subjects: {          // Subject Name -> Marks
    [subjectName: string]: SubjectMarks;
  };
  totalMarks: number;
  maxMarks: number;
  status: 'PASS' | 'FAIL' | 'COMPARTMENT' | 'ABSENT';
  division?: 'FIRST' | 'SECOND' | 'THIRD' | 'DISTINCTION' | 'N/A';
  percentage?: number;
}

export interface ExamMetadata {
  id: string;          // E.g. "exam_2026_annual"
  name: string;        // E.g. "Annual Secondary School Examination 2026"
  year: string;        // E.g. "2026"
  total_students: number;
  subjects_list: string[]; // List of all unique subjects in this exam
  roll_min: string;
  roll_max: string;
}

export interface ExamsIndex {
  exams: ExamMetadata[];
}

// Name/Father search index item
export interface SearchIndexItem {
  r: string; // Roll number
  n: string; // Name (uppercase)
  f: string; // Father name (uppercase)
  s: string; // Status (PASS/FAIL/etc)
}

// Column mapping for Excel Generator
export interface ExcelColumnMapping {
  roll: string;
  name: string;
  father: string;
  mother: string;
  status?: string; // Optional: auto-calculated if not mapped
  subjects: {
    columnName: string;
    subjectName: string;
    maxMarks: number;
    passingMarks: number;
  }[];
}
