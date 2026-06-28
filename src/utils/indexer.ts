/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudentResult, ExamMetadata, SearchIndexItem, ExamsIndex } from '../types';
import JSZip from 'jszip';

/**
 * Normalizes names by converting to uppercase, removing special characters, and collapsing whitespace.
 */
export function normalizeSearchString(val: string): string {
  if (!val) return '';
  return val
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gets a search prefix (first 3 letters of a string) for indexing.
 * E.g., "AMIT KUMAR" -> normalized "AMIT KUMAR" -> prefix "AMI"
 */
export function getSearchPrefix(normalizedStr: string): string {
  const clean = normalizedStr.replace(/[^A-Z]/g, ''); // letters only for index bucket keys
  if (clean.length < 3) return clean || 'OTH';
  return clean.substring(0, 3);
}

/**
 * Groups roll numbers into buckets of 1000 records.
 * E.g., roll "105234" -> bucket "105"
 */
export function getRollBucket(roll: string): string {
  // Extract digits from roll number
  const numPart = roll.replace(/[^0-9]/g, '');
  if (numPart.length === 0) return 'alpha';
  
  const rollVal = parseInt(numPart, 10);
  const bucketNum = Math.floor(rollVal / 1000);
  return bucketNum.toString();
}

export interface GeneratedDatabaseFiles {
  metadata: ExamMetadata;
  rollBuckets: { [bucketId: string]: { [roll: string]: StudentResult } };
  namePrefixBuckets: { [prefixId: string]: SearchIndexItem[] };
  fatherPrefixBuckets: { [prefixId: string]: SearchIndexItem[] };
}

/**
 * Core indexing engine. Processes student results and splits them into highly efficient indices.
 */
export function indexStudentResults(
  students: StudentResult[],
  examId: string,
  examName: string,
  examYear: string
): GeneratedDatabaseFiles {
  const rollBuckets: { [bucketId: string]: { [roll: string]: StudentResult } } = {};
  const namePrefixBuckets: { [prefixId: string]: SearchIndexItem[] } = {};
  const fatherPrefixBuckets: { [prefixId: string]: SearchIndexItem[] } = {};
  
  let rollMin = '';
  let rollMax = '';
  const subjectsSet = new Set<string>();

  students.forEach((student) => {
    const roll = student.roll;
    
    // Track min/max rolls
    if (!rollMin || roll < rollMin) rollMin = roll;
    if (!rollMax || roll > rollMax) rollMax = roll;

    // Track unique subjects
    Object.keys(student.subjects).forEach((sub) => subjectsSet.add(sub));

    // 1. Roll bucketing
    const rollBucket = getRollBucket(roll);
    if (!rollBuckets[rollBucket]) {
      rollBuckets[rollBucket] = {};
    }
    rollBuckets[rollBucket][roll] = student;

    // Standard normalized entries for search index
    const normName = normalizeSearchString(student.name);
    const normFather = normalizeSearchString(student.father);
    
    const searchItem: SearchIndexItem = {
      r: student.roll,
      n: student.name,
      f: student.father,
      s: student.status,
    };

    // 2. Name indexing (prefix-based, first 3 letters)
    const namePrefix = getSearchPrefix(normName);
    if (!namePrefixBuckets[namePrefix]) {
      namePrefixBuckets[namePrefix] = [];
    }
    namePrefixBuckets[namePrefix].push(searchItem);

    // 3. Father indexing (prefix-based, first 3 letters)
    const fatherPrefix = getSearchPrefix(normFather);
    if (!fatherPrefixBuckets[fatherPrefix]) {
      fatherPrefixBuckets[fatherPrefix] = [];
    }
    fatherPrefixBuckets[fatherPrefix].push(searchItem);
  });

  const metadata: ExamMetadata = {
    id: examId,
    name: examName,
    year: examYear,
    total_students: students.length,
    subjects_list: Array.from(subjectsSet),
    roll_min: rollMin,
    roll_max: rollMax,
  };

  return {
    metadata,
    rollBuckets,
    namePrefixBuckets,
    fatherPrefixBuckets,
  };
}

/**
 * Builds a ZIP file containing the complete static database files.
 */
export async function createDatabaseZip(
  indexResult: GeneratedDatabaseFiles,
  existingIndex: ExamsIndex | null = null
): Promise<Blob> {
  const zip = new JSZip();
  const examId = indexResult.metadata.id;

  // 1. Global index file (or update existing)
  const currentExams = existingIndex ? [...existingIndex.exams] : [];
  const existingExamIdx = currentExams.findIndex((e) => e.id === examId);
  if (existingExamIdx >= 0) {
    currentExams[existingExamIdx] = indexResult.metadata;
  } else {
    currentExams.push(indexResult.metadata);
  }

  const updatedGlobalIndex: ExamsIndex = { exams: currentExams };
  zip.file('results/index.json', JSON.stringify(updatedGlobalIndex, null, 2));

  // 2. Exam directory
  const examDir = zip.folder(`results/${examId}`);
  if (!examDir) throw new Error('Failed to create ZIP exam folder');

  // Exam metadata
  examDir.file('metadata.json', JSON.stringify(indexResult.metadata, null, 2));

  // Roll bucket files
  const rollFolder = examDir.folder('roll');
  if (rollFolder) {
    Object.keys(indexResult.rollBuckets).forEach((bucketId) => {
      rollFolder.file(`${bucketId}.json`, JSON.stringify(indexResult.rollBuckets[bucketId], null, 2));
    });
  }

  // Name prefix index files
  const nameFolder = examDir.folder('name');
  if (nameFolder) {
    Object.keys(indexResult.namePrefixBuckets).forEach((prefixId) => {
      nameFolder.file(`${prefixId}.json`, JSON.stringify(indexResult.namePrefixBuckets[prefixId], null, 2));
    });
  }

  // Father prefix index files
  const fatherFolder = examDir.folder('father');
  if (fatherFolder) {
    Object.keys(indexResult.fatherPrefixBuckets).forEach((prefixId) => {
      fatherFolder.file(`${prefixId}.json`, JSON.stringify(indexResult.fatherPrefixBuckets[prefixId], null, 2));
    });
  }

  // Generate blob
  return await zip.generateAsync({ type: 'blob' });
}
