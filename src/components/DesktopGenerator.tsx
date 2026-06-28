/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Settings, Download, AlertCircle, CheckCircle, RefreshCw, Plus, Trash2, HelpCircle, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExcelColumnMapping, StudentResult, SubjectMarks } from '../types';
import { indexStudentResults, createDatabaseZip } from '../utils/indexer';

interface DesktopGeneratorProps {
  onNavigateToSearch?: () => void;
}

interface SubjectMappingRow {
  columnName: string;
  subjectName: string;
  maxMarks: number;
  passingMarks: number;
}

export default function DesktopGenerator({ onNavigateToSearch }: DesktopGeneratorProps) {
  // Exam Info
  const [examId, setExamId] = useState<string>('exam_2026_annual');
  const [examName, setExamName] = useState<string>('Annual Secondary School Examination 2026');
  const [examYear, setExamYear] = useState<string>('2026');

  // File Upload State
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[][]>([]);
  const [fileName, setFileName] = useState<string>('');
  
  // Mapping States
  const [rollCol, setRollCol] = useState<string>('');
  const [nameCol, setNameCol] = useState<string>('');
  const [fatherCol, setFatherCol] = useState<string>('');
  const [motherCol, setMotherCol] = useState<string>('');
  const [subjectsMapping, setSubjectsMapping] = useState<SubjectMappingRow[]>([
    { columnName: '', subjectName: 'English', maxMarks: 100, passingMarks: 33 },
    { columnName: '', subjectName: 'Mathematics', maxMarks: 100, passingMarks: 33 }
  ]);

  // Execution States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [validationLog, setValidationLog] = useState<string[]>([]);
  const [stats, setStats] = useState<{ total: number; passed: number; compartment: number; failed: number; absent: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect mappings from headers
  const autoDetectColumns = (cols: string[]) => {
    cols.forEach((col) => {
      const cleanCol = col.toLowerCase().trim();
      if (cleanCol.includes('roll') || cleanCol === 'rno' || cleanCol === 'rollno' || cleanCol === 'roll_number') {
        setRollCol(col);
      } else if (cleanCol.includes('candidate') || cleanCol === 'name' || cleanCol.includes('student')) {
        setNameCol(col);
      } else if (cleanCol.includes('father') || cleanCol.includes('fname')) {
        setFatherCol(col);
      } else if (cleanCol.includes('mother') || cleanCol.includes('mname')) {
        setMotherCol(col);
      }
    });

    // Try to auto-detect subjects based on numerical columns that aren't mapped
    const guessedSubjects: SubjectMappingRow[] = [];
    cols.forEach((col) => {
      const cleanCol = col.toLowerCase().trim();
      const nonSubjectKeywords = ['roll', 'name', 'father', 'mother', 'status', 'total', 'percent', 'division', 'result', 'remarks', 'sno', 'id'];
      const isExempt = nonSubjectKeywords.some(kw => cleanCol.includes(kw));
      if (!isExempt) {
        guessedSubjects.push({
          columnName: col,
          subjectName: col.charAt(0).toUpperCase() + col.slice(1),
          maxMarks: 100,
          passingMarks: 33
        });
      }
    });

    if (guessedSubjects.length > 0) {
      setSubjectsMapping(guessedSubjects);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    setValidationLog([]);
    setStats(null);

    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse with header: 1 to get raw rows
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length === 0) {
          throw new Error('The uploaded spreadsheet appears to be empty.');
        }

        const sheetHeaders = rows[0].map(h => String(h).trim());
        setHeaders(sheetHeaders);
        setRawData(rows.slice(1)); // Save data rows
        
        // Run auto-detector
        autoDetectColumns(sheetHeaders);
        setValidationLog(prev => [...prev, `Uploaded "${file.name}" containing ${rows.length - 1} data rows.`]);
      } catch (err) {
        console.error(err);
        setErrorMsg(`Failed to parse spreadsheet: ${(err as Error).message}`);
      }
    };

    reader.readAsBinaryString(file);
  };

  const addSubjectMapping = () => {
    setSubjectsMapping(prev => [
      ...prev,
      { columnName: '', subjectName: `Subject ${prev.length + 1}`, maxMarks: 100, passingMarks: 33 }
    ]);
  };

  const removeSubjectMapping = (index: number) => {
    setSubjectsMapping(prev => prev.filter((_, i) => i !== index));
  };

  const updateSubjectMapping = (index: number, fields: Partial<SubjectMappingRow>) => {
    setSubjectsMapping(prev => prev.map((row, i) => i === index ? { ...row, ...fields } : row));
  };

  // Downloads a sample CSV Template
  const downloadSampleTemplate = () => {
    const csvContent = [
      'RollNumber,CandidateName,FatherName,MotherName,English,Mathematics,Science,SocialScience,Hindi',
      '102001,Amit Kumar Sharma,Ramesh Kumar Sharma,Sita Devi,85,92,78,88,82',
      '102002,Rahul Yadav,Suresh Singh Yadav,Gita Devi,42,30,55,62,48',
      '102003,Pooja Verma,Dinesh Verma,Maya Verma,78,85,90,82,88',
      '102004,Neha Gupta,Sachin Gupta,Sarla Gupta,31,55,42,50,45',
      '102005,Sachin Choudhary,Harish Choudhary,Shanti Devi,AB,AB,AB,AB,AB'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_results_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessAndDownload = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setValidationLog([]);
    setIsProcessing(true);

    const log: string[] = [];
    const rollIndex = headers.indexOf(rollCol);
    const nameIndex = headers.indexOf(nameCol);
    const fatherIndex = headers.indexOf(fatherCol);
    const motherIndex = headers.indexOf(motherCol);

    if (rollIndex === -1 || nameIndex === -1 || fatherIndex === -1 || motherIndex === -1) {
      setErrorMsg('Critical column mappings (Roll, Candidate Name, Father, Mother) must be completed.');
      setIsProcessing(false);
      return;
    }

    if (!examId.trim() || !/^[a-zA-Z0-9_]+$/.test(examId)) {
      setErrorMsg('Exam Database ID must contain only alphanumeric characters and underscores.');
      setIsProcessing(false);
      return;
    }

    log.push('Validating column mappings and checking subject config...');

    // Validate subjects mapping
    const validSubjects = subjectsMapping.filter(sub => sub.columnName && sub.subjectName);
    if (validSubjects.length === 0) {
      setErrorMsg('At least one valid subject column mapping must be provided.');
      setIsProcessing(false);
      return;
    }

    log.push(`Active subjects identified: ${validSubjects.map(s => s.subjectName).join(', ')}`);

    const students: StudentResult[] = [];
    const rollsSet = new Set<string>();
    
    let passCount = 0;
    let failCount = 0;
    let compCount = 0;
    let abCount = 0;

    log.push('Beginning row processing and calculation engine...');

    try {
      rawData.forEach((row, rowIndex) => {
        const roll = String(row[rollIndex] ?? '').trim();
        const name = String(row[nameIndex] ?? '').trim();
        const father = String(row[fatherIndex] ?? '').trim();
        const mother = String(row[motherIndex] ?? '').trim();

        if (!roll) {
          log.push(`[WARN] Skipping row ${rowIndex + 2}: Roll number is empty.`);
          return;
        }

        if (rollsSet.has(roll)) {
          log.push(`[WARN] Skipping row ${rowIndex + 2}: Duplicate Roll Number "${roll}" detected.`);
          return;
        }
        rollsSet.add(roll);

        if (!name) {
          log.push(`[WARN] Row ${rowIndex + 2} (Roll ${roll}): Candidate name is empty.`);
        }

        // Process subjects
        const subjects: StudentResult['subjects'] = {};
        let totalMarks = 0;
        let maxMarks = 0;
        let failedSubjectsCount = 0;
        let isFullyAbsent = true;

        validSubjects.forEach((subMap) => {
          const colIdx = headers.indexOf(subMap.columnName);
          const rawMarkVal = colIdx !== -1 ? String(row[colIdx] ?? '').trim().toUpperCase() : 'AB';
          
          maxMarks += subMap.maxMarks;

          if (rawMarkVal === 'AB' || rawMarkVal === 'ABSENT' || rawMarkVal === '') {
            subjects[subMap.subjectName] = {
              marks: 'AB',
              maxMarks: subMap.maxMarks,
              passingMarks: subMap.passingMarks
            };
            failedSubjectsCount++;
          } else {
            isFullyAbsent = false;
            const marksNum = parseFloat(rawMarkVal);
            if (isNaN(marksNum)) {
              // Invalid numerical value, treat as fail/0
              subjects[subMap.subjectName] = {
                marks: 0,
                maxMarks: subMap.maxMarks,
                passingMarks: subMap.passingMarks
              };
              failedSubjectsCount++;
            } else {
              subjects[subMap.subjectName] = {
                marks: marksNum,
                maxMarks: subMap.maxMarks,
                passingMarks: subMap.passingMarks
              };
              totalMarks += marksNum;
              if (marksNum < subMap.passingMarks) {
                failedSubjectsCount++;
              }
            }
          }
        });

        let status: StudentResult['status'] = 'PASS';
        let division: StudentResult['division'] = 'N/A';
        const percentage = isFullyAbsent ? 0 : Math.round((totalMarks / maxMarks) * 100);

        if (isFullyAbsent) {
          status = 'ABSENT';
          abCount++;
        } else if (failedSubjectsCount === 1) {
          status = 'COMPARTMENT';
          compCount++;
        } else if (failedSubjectsCount > 1) {
          status = 'FAIL';
          failCount++;
        } else {
          status = 'PASS';
          passCount++;
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
      });

      log.push(`Successfully calculated results for ${students.length} unique candidates.`);

      if (students.length === 0) {
        throw new Error('Zero valid student records processed. Unable to build index.');
      }

      // Generate Indices
      log.push('Running static partition indexing algorithms (bucketing roll numbers and alphabetical names)...');
      const indexedDatabase = indexStudentResults(students, examId, examName, examYear);
      
      log.push(`Partitioned database into ${Object.keys(indexedDatabase.rollBuckets).length} roll buckets.`);
      log.push(`Created ${Object.keys(indexedDatabase.namePrefixBuckets).length} candidate name search index files.`);
      log.push(`Created ${Object.keys(indexedDatabase.fatherPrefixBuckets).length} father name search index files.`);
      
      // Package as ZIP
      log.push('Packaging indexes into structured ZIP file (results/ folder)...');
      const zipBlob = await createDatabaseZip(indexedDatabase);

      // Trigger Browser Download
      const zipUrl = URL.createObjectURL(zipBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = zipUrl;
      downloadLink.download = `results_${examId}.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(zipUrl);

      // Save Stats
      setStats({
        total: students.length,
        passed: passCount,
        compartment: compCount,
        failed: failCount,
        absent: abCount
      });

      setSuccessMsg('Static Result Database indexed successfully! ZIP file downloaded.');
      log.push('SUCCESS: Zip compilation and download complete.');
    } catch (err) {
      console.error(err);
      setErrorMsg(`Index generation failed: ${(err as Error).message}`);
      log.push(`ERROR: ${(err as Error).message}`);
    } finally {
      setValidationLog(log);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" id="generator-root">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xs p-6 text-white relative overflow-hidden mb-8">
        <div className="absolute right-6 top-6 opacity-5">
          <Settings size={140} />
        </div>
        <div className="flex items-center gap-3 text-emerald-400 font-mono text-xs tracking-wider uppercase mb-2">
          <Settings size={14} className="animate-spin-slow" />
          <span>Offline Static Database Generator</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
          Excel to Static-Index DB compiler
        </h1>
        <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
          Compile millions of exam records from a single spreadsheet into segmented static files. Unpack the zip file in your GitHub Pages root, and the website's search engine will instantly serve results in less than 100 milliseconds with zero server overhead.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Parameters & File Import */}
        <div className="lg:col-span-2 space-y-6">
          {/* Exam configuration */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Settings size={16} className="text-slate-600" />
              <span>1. Exam Metadata Configuration</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Database ID (e.g. sec_2025)
                </label>
                <input
                  type="text"
                  value={examId}
                  onChange={(e) => setExamId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono rounded-lg px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  placeholder="lower_case_only"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Examination Year
                </label>
                <input
                  type="text"
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. 2026"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Official Exam Name
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. Annual Secondary School Examination 2026"
                />
              </div>
            </div>
          </div>

          {/* Excel / CSV Uploader */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-slate-600" />
                <span>2. Upload Student Spreadsheet</span>
              </h3>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="text-xs text-slate-600 hover:text-slate-950 flex items-center gap-1.5 font-medium underline cursor-pointer"
              >
                <FileDown size={14} />
                <span>Download Sample Template</span>
              </button>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/50 rounded-xl p-6 text-center cursor-pointer transition-all"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <Upload size={32} className="mx-auto text-slate-400 mb-3" />
              {fileName ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800">{fileName}</p>
                  <p className="text-xs text-slate-500">Click to replace file</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700">Drag & drop or Click to Upload Excel/CSV</p>
                  <p className="text-xs text-slate-400">Supports .xlsx, .xls, and .csv files</p>
                </div>
              )}
            </div>
          </div>

          {/* Column mapping selection */}
          {headers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Settings size={16} className="text-slate-600" />
                <span>3. Column Mapping Configuration</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Roll Column */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Roll Number Column</label>
                  <select
                    value={rollCol}
                    onChange={(e) => setRollCol(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 font-medium"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Candidate Name Column */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Candidate Name Column</label>
                  <select
                    value={nameCol}
                    onChange={(e) => setNameCol(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 font-medium"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Father Column */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Father's Name Column</label>
                  <select
                    value={fatherCol}
                    onChange={(e) => setFatherCol(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 font-medium"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Mother Column */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mother's Name Column</label>
                  <select
                    value={motherCol}
                    onChange={(e) => setMotherCol(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 font-medium"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* Subject Columns Mapping */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject Mark Columns</span>
                  <button
                    type="button"
                    onClick={addSubjectMapping}
                    className="text-xs text-slate-700 hover:text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Subject Column</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {subjectsMapping.map((sub, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      {/* Excel Column Select */}
                      <div className="col-span-4">
                        <select
                          value={sub.columnName}
                          onChange={(e) => updateSubjectMapping(idx, { columnName: e.target.value })}
                          className="w-full bg-white border border-slate-200 text-xs rounded-md p-1.5 font-medium"
                        >
                          <option value="">-- Column --</option>
                          {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Subject Name Input */}
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={sub.subjectName}
                          onChange={(e) => updateSubjectMapping(idx, { subjectName: e.target.value })}
                          className="w-full bg-white border border-slate-200 text-xs rounded-md p-1.5"
                          placeholder="Subject Name"
                        />
                      </div>

                      {/* Max Marks */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={sub.maxMarks}
                          onChange={(e) => updateSubjectMapping(idx, { maxMarks: parseInt(e.target.value, 10) || 100 })}
                          className="w-full bg-white border border-slate-200 text-xs rounded-md p-1.5 font-mono text-center"
                          placeholder="Max"
                        />
                      </div>

                      {/* Pass Marks */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={sub.passingMarks}
                          onChange={(e) => updateSubjectMapping(idx, { passingMarks: parseInt(e.target.value, 10) || 33 })}
                          className="w-full bg-white border border-slate-200 text-xs rounded-md p-1.5 font-mono text-center"
                          placeholder="Pass"
                        />
                      </div>

                      {/* Delete Button */}
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeSubjectMapping(idx)}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action trigger */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  id="process-download-btn"
                  onClick={handleProcessAndDownload}
                  disabled={isProcessing}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl py-3 px-6 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {isProcessing ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  <span>Compile & Download Index Database (ZIP)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Validation Logs, Stats & Help */}
        <div className="space-y-6">
          {/* Compiled Stats Dashboard */}
          {stats && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4" id="generator-stats-box">
              <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-1.5">
                <CheckCircle size={16} className="text-emerald-500" />
                <span>Compiler Stat Results</span>
              </h3>

              <div className="grid grid-cols-2 gap-3.5 text-center">
                <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3">
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">Total Students</span>
                  <span className="block text-lg font-bold font-mono text-slate-900">{stats.total}</span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
                  <span className="block text-[10px] font-semibold text-emerald-600 uppercase">Passed</span>
                  <span className="block text-lg font-bold font-mono text-emerald-700">{stats.passed}</span>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                  <span className="block text-[10px] font-semibold text-amber-600 uppercase">Compartment</span>
                  <span className="block text-lg font-bold font-mono text-amber-700">{stats.compartment}</span>
                </div>
                <div className="bg-red-50/50 border border-red-100 rounded-xl p-3">
                  <span className="block text-[10px] font-semibold text-red-600 uppercase">Failed</span>
                  <span className="block text-lg font-bold font-mono text-red-700">{stats.failed + stats.absent}</span>
                </div>
              </div>
            </div>
          )}

          {/* Validation Logs Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold text-white tracking-wider">Compiler Build Logs</span>
              <span className="text-[9px] font-mono text-slate-500">Strict mode</span>
            </div>
            <div className="p-4 bg-slate-950/45 min-h-[160px] text-left">
              {validationLog.length === 0 ? (
                <p className="text-[10px] font-mono text-slate-500">Awaiting Excel file import to log validation outputs...</p>
              ) : (
                <ul className="space-y-1.5 font-mono text-[10px] leading-relaxed text-slate-300">
                  {validationLog.map((log, idx) => (
                    <li key={idx} className={
                      log.startsWith('ERROR:') ? 'text-red-400' :
                      log.startsWith('WARN:') || log.includes('[WARN]') ? 'text-amber-400' :
                      log.startsWith('SUCCESS:') ? 'text-emerald-400' :
                      'text-slate-300'
                    }>
                      &gt; {log}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Setup Help Instructions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle size={14} className="text-slate-500" />
              <span>How to deploy to GitHub Pages</span>
            </h4>
            <ol className="text-xs text-slate-500 space-y-2 list-decimal pl-4 leading-relaxed">
              <li>Upload your master results Excel file in this tool and configure column maps.</li>
              <li>Click <strong>Compile & Download Index Database</strong>. A ZIP file (e.g. <code>results_exam_2026.zip</code>) containing a <code>results</code> folder structure will download.</li>
              <li>Extract this ZIP file in the root of your GitHub Pages repository.</li>
              <li>Your directory structure will now look like:
                <pre className="bg-slate-50 border border-slate-100 p-2 rounded-md font-mono text-[10px] text-slate-600 mt-1 block">
                  /results/index.json<br />
                  /results/exam_2026_annual/metadata.json<br />
                  /results/exam_2026_annual/roll/101.json
                </pre>
              </li>
              <li>Commit and push the new files. GitHub Pages will serve them as highly cacheable static assets!</li>
            </ol>
            {onNavigateToSearch && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onNavigateToSearch}
                  className="text-xs font-semibold text-slate-900 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Go to Result Portal Inquiry</span>
                  <span>&rarr;</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
