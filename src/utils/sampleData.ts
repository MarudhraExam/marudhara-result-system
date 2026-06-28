/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudentResult } from '../types';

const FIRST_NAMES = [
  'Amit', 'Rahul', 'Sanjay', 'Sunil', 'Vijay', 'Rajesh', 'Anil', 'Deepak', 'Arvind', 'Manoj',
  'Pooja', 'Neha', 'Jyoti', 'Anjali', 'Kiran', 'Preeti', 'Sunita', 'Aarti', 'Ritu', 'Priyanka',
  'Vikram', 'Ramesh', 'Suresh', 'Dinesh', 'Harish', 'Manish', 'Karan', 'Arjun', 'Rohan', 'Kunal',
  'Swati', 'Meena', 'Seema', 'Kavita', 'Sonia', 'Shalini', 'Renu', 'Divya', 'Nisha', 'Rashmi',
  'Abhishek', 'Aditya', 'Alok', 'Ashish', 'Gaurav', 'Nitin', 'Pankaj', 'Sachin', 'Sandeep', 'Sumit'
];

const MIDDLE_NAMES = ['', ' Kumar', ' Singh', ' Prasad', ' Chand', ' Sharma', ' Lal', ' Sen', ' Verma'];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Yadav', 'Mishra', 'Pandey', 'Patel', 'Joshi', 'Chauhan',
  'Kumar', 'Jha', 'Sinha', 'Choudhary', 'Rai', 'Prasad', 'Das', 'Roy', 'Sen', 'Dutta',
  'Mehta', 'Nair', 'Pillai', 'Rao', 'Reddy', 'Saxena', 'Srivastava', 'Trivedi', 'Vyas', 'Bhatt'
];

const MOTHER_NAMES = [
  'Sita Devi', 'Gita Devi', 'Kanti Devi', 'Meera Devi', 'Shanti Devi', 'Pushpa Devi', 'Suman Sharma',
  'Radha Yadav', 'Kamla Singh', 'Usha Pandey', 'Sarla Gupta', 'Maya Verma', 'Sunita Devi', 'Kusum Jha'
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(): string {
  const first = getRandomItem(FIRST_NAMES);
  const middle = getRandomItem(MIDDLE_NAMES);
  const last = getRandomItem(LAST_NAMES);
  return `${first}${middle} ${last}`.replace(/\s+/g, ' ').trim();
}

export function generateSampleStudents(count: number = 150, startRoll: number = 101001): StudentResult[] {
  const students: StudentResult[] = [];
  const subjectsConfig = [
    { name: 'English', max: 100, pass: 33 },
    { name: 'Mathematics', max: 100, pass: 33 },
    { name: 'Science', max: 100, pass: 33 },
    { name: 'Social Science', max: 100, pass: 33 },
    { name: 'Hindi', max: 100, pass: 33 }
  ];

  for (let i = 0; i < count; i++) {
    const roll = (startRoll + i).toString();
    const name = generateName();
    let father = generateName();
    // Ensure father and candidate have different first names
    while (father.split(' ')[0] === name.split(' ')[0]) {
      father = generateName();
    }
    const mother = getRandomItem(MOTHER_NAMES);

    // Subject marks
    const subjects: StudentResult['subjects'] = {};
    let totalMarks = 0;
    let maxMarks = 0;
    let failedSubjectsCount = 0;
    let isAbsent = Math.random() < 0.02; // 2% chance of being absent entirely

    subjectsConfig.forEach((sub) => {
      maxMarks += sub.max;
      if (isAbsent) {
        subjects[sub.name] = { marks: 'AB', maxMarks: sub.max, passingMarks: sub.pass };
      } else {
        const subAbsent = Math.random() < 0.01; // 1% chance of individual subject absence
        if (subAbsent) {
          subjects[sub.name] = { marks: 'AB', maxMarks: sub.max, passingMarks: sub.pass };
          failedSubjectsCount++;
        } else {
          // Normal marks distribution (bell curve-ish around passing)
          const rollScore = Math.random();
          let marks = 0;
          if (rollScore < 0.05) {
            marks = Math.floor(Math.random() * 30); // 5% fail heavily
          } else if (rollScore < 0.15) {
            marks = 30 + Math.floor(Math.random() * 15); // 10% near pass/borderline
          } else if (rollScore < 0.6) {
            marks = 45 + Math.floor(Math.random() * 30); // 45% average
          } else {
            marks = 75 + Math.floor(Math.random() * 25); // 40% high scorers
          }
          
          subjects[sub.name] = { marks, maxMarks: sub.max, passingMarks: sub.pass };
          totalMarks += marks;
          if (marks < sub.pass) {
            failedSubjectsCount++;
          }
        }
      }
    });

    let status: StudentResult['status'] = 'PASS';
    let division: StudentResult['division'] = 'N/A';
    const percentage = isAbsent ? 0 : Math.round((totalMarks / maxMarks) * 100);

    if (isAbsent) {
      status = 'ABSENT';
    } else if (failedSubjectsCount === 1) {
      status = 'COMPARTMENT';
    } else if (failedSubjectsCount > 1) {
      status = 'FAIL';
    } else {
      status = 'PASS';
      if (percentage >= 75) division = 'DISTINCTION';
      else if (percentage >= 60) division = 'FIRST';
      else if (percentage >= 45) division = 'SECOND';
      else division = 'THIRD';
    }

    students.push({
      roll,
      name,
      father,
      mother,
      subjects,
      totalMarks,
      maxMarks,
      status,
      division,
      percentage
    });
  }

  return students;
}
