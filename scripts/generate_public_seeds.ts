/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateSampleStudents } from '../src/utils/sampleData';
import { indexStudentResults } from '../src/utils/indexer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function writeJsonFile(filePath: string, data: any) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function run() {
  console.log('Generating seed students...');
  const students = generateSampleStudents(200, 101001);

  console.log('Indexing students...');
  const examId = 'sec_exam_2026';
  const indexedData = indexStudentResults(
    students,
    examId,
    'Annual Secondary School Examination 2026',
    '2026'
  );

  const publicDir = path.join(__dirname, '..', 'public');
  
  // 1. Write index.json
  const indexJsonPath = path.join(publicDir, 'results', 'index.json');
  const globalIndex = {
    exams: [indexedData.metadata]
  };
  writeJsonFile(indexJsonPath, globalIndex);
  console.log(`Wrote global index: ${indexJsonPath}`);

  // 2. Write exam metadata.json
  const examMetaPath = path.join(publicDir, 'results', examId, 'metadata.json');
  writeJsonFile(examMetaPath, indexedData.metadata);
  console.log(`Wrote exam metadata: ${examMetaPath}`);

  // 3. Write roll buckets
  Object.keys(indexedData.rollBuckets).forEach((bucketId) => {
    const bucketPath = path.join(publicDir, 'results', examId, 'roll', `${bucketId}.json`);
    writeJsonFile(bucketPath, indexedData.rollBuckets[bucketId]);
  });
  console.log(`Wrote ${Object.keys(indexedData.rollBuckets).length} roll buckets.`);

  // 4. Write name prefix buckets
  Object.keys(indexedData.namePrefixBuckets).forEach((prefixId) => {
    const prefixPath = path.join(publicDir, 'results', examId, 'name', `${prefixId}.json`);
    writeJsonFile(prefixPath, indexedData.namePrefixBuckets[prefixId]);
  });
  console.log(`Wrote ${Object.keys(indexedData.namePrefixBuckets).length} name prefix buckets.`);

  // 5. Write father prefix buckets
  Object.keys(indexedData.fatherPrefixBuckets).forEach((prefixId) => {
    const prefixPath = path.join(publicDir, 'results', examId, 'father', `${prefixId}.json`);
    writeJsonFile(prefixPath, indexedData.fatherPrefixBuckets[prefixId]);
  });
  console.log(`Wrote ${Object.keys(indexedData.fatherPrefixBuckets).length} father prefix buckets.`);

  console.log('Sample database pre-generation complete!');
}

run().catch((err) => {
  console.error('Error seeding public results folder:', err);
  process.exit(1);
});
