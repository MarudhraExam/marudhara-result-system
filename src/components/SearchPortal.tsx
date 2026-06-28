/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Printer, AlertTriangle, CheckCircle, XCircle, RefreshCw, BookOpen, User, Award, ArrowLeft } from 'lucide-react';
import { ExamMetadata, ExamsIndex, StudentResult, SearchIndexItem, SubjectMarks } from '../types';
import { getRollBucket, getSearchPrefix, normalizeSearchString } from '../utils/indexer';

interface SearchPortalProps {
  onNavigateToGenerator?: () => void;
}

export default function SearchPortal({ onNavigateToGenerator }: SearchPortalProps) {
  const [exams, setExams] = useState<ExamMetadata[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [searchType, setSearchType] = useState<'roll' | 'name' | 'father'>('roll');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchIndexItem[]>([]);
  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null);
  const [showResultDetail, setShowResultDetail] = useState<boolean>(false);
  const [debugLog, setDebugLog] = useState<string>('');

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Load available exams on mount
  useEffect(() => {
    async function loadExams() {
      try {
        setDebugLog(prev => prev + '\nFetching /results/index.json...');
        const res = await fetch('/results/index.json');
        if (!res.ok) {
          throw new Error(`Failed to load index (${res.status})`);
        }
        const data: ExamsIndex = await res.json();
        setExams(data.exams || []);
        if (data.exams && data.exams.length > 0) {
          setSelectedExamId(data.exams[0].id);
        }
        setDebugLog(prev => prev + `\nLoaded ${data.exams?.length || 0} exams successfully.`);
      } catch (err) {
        console.error('Error loading exams index:', err);
        setDebugLog(prev => prev + `\nFailed to load index: ${(err as Error).message}`);
        setSearchError('Could not load exams. If you just uploaded/created the database, make sure results/index.json is present in the public folder.');
      }
    }
    loadExams();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchResults([]);
    setSelectedResult(null);
    setShowResultDetail(false);

    const query = searchQuery.trim();
    if (!query) {
      setSearchError('Please enter a search query.');
      return;
    }

    if (!selectedExamId) {
      setSearchError('No examination selected.');
      return;
    }

    setIsLoading(true);
    const startTime = performance.now();
    setDebugLog(prev => prev + `\n\n--- Initiating search: [${searchType}] "${query}" ---`);

    try {
      if (searchType === 'roll') {
        // Roll Search
        const bucket = getRollBucket(query);
        const url = `/results/${selectedExamId}/roll/${bucket}.json`;
        setDebugLog(prev => prev + `\nRoll query. Fetching bucket ${bucket} from: ${url}`);
        
        const res = await fetch(url);
        if (res.status === 404) {
          setSearchError('No record found for the entered Roll Number. Please verify and try again.');
          setIsLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch roll bucket file (${res.status})`);
        }

        const bucketData: { [roll: string]: StudentResult } = await res.json();
        const record = bucketData[query];
        
        if (record) {
          const endTime = performance.now();
          const duration = Math.round(endTime - startTime);
          setDebugLog(prev => prev + `\nRecord found in ${duration}ms! Loading details...`);
          
          setSelectedResult(record);
          setShowResultDetail(true);
        } else {
          setSearchError('No record found for the entered Roll Number. Please verify and try again.');
        }

      } else {
        // Name or Father Search
        const normalized = normalizeSearchString(query);
        if (normalized.length < 2) {
          setSearchError('Search query must be at least 2 characters long for name search.');
          setIsLoading(false);
          return;
        }

        const prefix = getSearchPrefix(normalized);
        const folder = searchType === 'name' ? 'name' : 'father';
        const url = `/results/${selectedExamId}/${folder}/${prefix}.json`;
        setDebugLog(prev => prev + `\nName/Father query. Fetching prefix [${prefix}] from: ${url}`);

        const res = await fetch(url);
        if (res.status === 404) {
          setSearchError(`No candidates match "${query}".`);
          setIsLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch index file (${res.status})`);
        }

        const indexData: SearchIndexItem[] = await res.json();
        
        // Filter in-memory
        const filtered = indexData.filter(item => {
          const fieldToSearch = searchType === 'name' ? normalizeSearchString(item.n) : normalizeSearchString(item.f);
          return fieldToSearch.includes(normalized);
        });

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        setDebugLog(prev => prev + `\nMatched ${filtered.length} of ${indexData.length} records in index in ${duration}ms.`);

        if (filtered.length > 0) {
          setSearchResults(filtered);
        } else {
          setSearchError(`No candidates match "${query}".`);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setDebugLog(prev => prev + `\nSearch failed: ${(err as Error).message}`);
      setSearchError('An error occurred while fetching the result. The requested database indexes might not be fully generated yet.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFullResult = async (rollNum: string) => {
    setIsLoading(true);
    setSearchError('');
    const startTime = performance.now();
    
    try {
      const bucket = getRollBucket(rollNum);
      const url = `/results/${selectedExamId}/roll/${bucket}.json`;
      setDebugLog(prev => prev + `\nLoading full record details for Roll: ${rollNum} from: ${url}`);

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch roll bucket file (${res.status})`);
      }

      const bucketData: { [roll: string]: StudentResult } = await res.json();
      const record = bucketData[rollNum];

      if (record) {
        const endTime = performance.now();
        setDebugLog(prev => prev + `\nLoaded details in ${Math.round(endTime - startTime)}ms.`);
        setSelectedResult(record);
        setShowResultDetail(true);
      } else {
        setSearchError('Failed to load detailed marksheet for the selected candidate.');
      }
    } catch (err) {
      console.error('Detailed fetch error:', err);
      setSearchError('Failed to load detailed marksheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedExamDetails = exams.find(e => e.id === selectedExamId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" id="search-portal-root">
      {/* Search Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden mb-8">
        <div className="bg-slate-900 px-6 py-8 text-white relative">
          <div className="absolute right-6 top-6 opacity-10">
            <BookOpen size={120} />
          </div>
          <div className="flex items-center gap-3 text-emerald-400 font-mono text-xs tracking-wider uppercase mb-2">
            <Award size={14} className="animate-pulse" />
            <span>Official Examination Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-sans font-bold tracking-tight text-white mb-2">
            State Board Results Inquiry
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Access secure, high-performance, instantaneous digital examination records and official marksheet verification.
          </p>
        </div>

        {/* Search Tab & Controls */}
        <div className="p-6">
          {!showResultDetail ? (
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Exam Selection */}
              <div>
                <label htmlFor="exam-select" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Select Examination
                </label>
                {exams.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>No pre-seeded exams found in <code>/public/results/</code>. Please generate some using the Generator tab.</span>
                  </div>
                ) : (
                  <select
                    id="exam-select"
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer font-medium"
                  >
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name} ({exam.year})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Search Criteria Tabs */}
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Search Criteria
                </span>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl">
                  {(['roll', 'name', 'father'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      id={`btn-search-type-${type}`}
                      onClick={() => {
                        setSearchType(type);
                        setSearchQuery('');
                        setSearchError('');
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        searchType === type
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      {type === 'roll' && 'Roll Number'}
                      {type === 'name' && 'Candidate Name'}
                      {type === 'father' && "Father's Name"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Field */}
              <div className="relative">
                <label htmlFor="search-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {searchType === 'roll' && 'Enter 6-Digit Roll Number'}
                  {searchType === 'name' && "Enter Candidate's Name (e.g., Amit)"}
                  {searchType === 'father' && "Enter Father's Name"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    {searchType === 'roll' ? <FileText size={18} /> : <User size={18} />}
                  </div>
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchType === 'roll' ? 'e.g., 101001' : 'e.g., AMIT SHARMA'
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-24 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-all font-sans font-medium"
                    autoComplete="off"
                  />
                  <div className="absolute inset-y-1.5 right-1.5">
                    <button
                      type="submit"
                      id="search-submit-btn"
                      disabled={isLoading}
                      className="h-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg px-4 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Search size={14} />
                      )}
                      <span>Search</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Error messages */}
              {searchError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-center gap-2" id="search-error">
                  <XCircle size={16} className="shrink-0 text-red-500" />
                  <span>{searchError}</span>
                </div>
              )}
            </form>
          ) : (
            // Back to Search
            <div className="mb-4">
              <button
                type="button"
                id="back-to-search-btn"
                onClick={() => setShowResultDetail(false)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 py-1 cursor-pointer transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Result Inquiry</span>
              </button>
            </div>
          )}

          {/* Table of multiple matches for Name/Father Search */}
          {!showResultDetail && searchResults.length > 0 && (
            <div className="mt-8 border-t border-slate-100 pt-6" id="search-results-table">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">
                  Search Results ({searchResults.length} matches found)
                </h3>
                <span className="text-xs font-mono text-slate-400">Search processed statically</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No.</th>
                      <th className="p-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Name</th>
                      <th className="p-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Father Name</th>
                      <th className="p-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="p-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {searchResults.map((item) => (
                      <tr key={item.r} className="hover:bg-slate-50/75 transition-colors">
                        <td className="p-3.5 text-sm font-mono font-semibold text-slate-950">{item.r}</td>
                        <td className="p-3.5 text-sm font-medium text-slate-800 uppercase">{item.n}</td>
                        <td className="p-3.5 text-sm text-slate-500 uppercase">{item.f}</td>
                        <td className="p-3.5 text-xs font-semibold">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${
                            item.s === 'PASS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' :
                            item.s === 'COMPARTMENT' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' :
                            'bg-red-50 text-red-700 border border-red-200/50'
                          }`}>
                            {item.s}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => loadFullResult(item.r)}
                            className="bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                          >
                            View Result
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Marksheet (Highly Realistic / Official Board Marksheet styling) */}
      {showResultDetail && selectedResult && (
        <div className="space-y-6" id="marksheet-wrapper">
          {/* Printable container */}
          <div 
            ref={printAreaRef}
            className="bg-white border-2 border-slate-900 rounded-2xl shadow-sm p-6 md:p-10 space-y-8 relative overflow-hidden marksheet-print"
          >
            {/* Watermark Logo (visual only) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-3 pointer-events-none select-none">
              <Award size={400} className="text-slate-900" />
            </div>

            {/* Print Header */}
            <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6 relative z-10">
              <div className="flex justify-center mb-1">
                <div className="border-2 border-slate-900 rounded-full p-2 bg-slate-50">
                  <Award size={36} className="text-slate-900" />
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 uppercase font-sans">
                BOARD OF SECONDARY & HIGHER SECONDARY EDUCATION
              </h2>
              <p className="text-xs md:text-sm font-semibold uppercase text-slate-600 tracking-wider">
                {selectedExamDetails?.name || 'ANNUAL SECONDARY SCHOOL EXAMINATION'}
              </p>
              <div className="inline-flex items-center gap-4 text-xs font-mono bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-slate-600">
                <span>YEAR: {selectedExamDetails?.year || '2026'}</span>
                <span>•</span>
                <span>STATUS: CERTIFIED</span>
              </div>
            </div>

            {/* Candidate Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-sm border-b border-slate-200 pb-6 relative z-10">
              <div className="flex border-b border-slate-100 md:border-0 pb-2 md:pb-0">
                <span className="w-32 font-semibold text-slate-500 uppercase tracking-wider text-xs">Roll Number</span>
                <span className="font-mono font-bold text-slate-900">{selectedResult.roll}</span>
              </div>
              <div className="flex border-b border-slate-100 md:border-0 pb-2 md:pb-0">
                <span className="w-32 font-semibold text-slate-500 uppercase tracking-wider text-xs">Candidate Name</span>
                <span className="font-bold text-slate-900 uppercase">{selectedResult.name}</span>
              </div>
              <div className="flex border-b border-slate-100 md:border-0 pb-2 md:pb-0">
                <span className="w-32 font-semibold text-slate-500 uppercase tracking-wider text-xs">Father's Name</span>
                <span className="text-slate-800 uppercase">{selectedResult.father}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-semibold text-slate-500 uppercase tracking-wider text-xs">Mother's Name</span>
                <span className="text-slate-800 uppercase">{selectedResult.mother}</span>
              </div>
            </div>

            {/* Subject-Wise Marks Table */}
            <div className="relative z-10 overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-900 text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900">
                    <th className="p-3 font-semibold text-slate-800 border-r border-slate-900">Subject Description</th>
                    <th className="p-3 font-semibold text-slate-800 border-r border-slate-900 text-center w-24">Max Marks</th>
                    <th className="p-3 font-semibold text-slate-800 border-r border-slate-900 text-center w-24">Pass Marks</th>
                    <th className="p-3 font-semibold text-slate-800 text-center w-32">Marks Obtained</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {Object.entries(selectedResult.subjects).map(([subName, rawDetails]) => {
                    const subDetails = rawDetails as SubjectMarks;
                    const isFailed = typeof subDetails.marks === 'number' && subDetails.marks < subDetails.passingMarks;
                    const isAb = subDetails.marks === 'AB';
                    return (
                      <tr key={subName} className="hover:bg-slate-50/50">
                        <td className="p-3 font-medium border-r border-slate-900 text-slate-800">{subName}</td>
                        <td className="p-3 border-r border-slate-900 text-center font-mono text-slate-600">{subDetails.maxMarks}</td>
                        <td className="p-3 border-r border-slate-900 text-center font-mono text-slate-600">{subDetails.passingMarks}</td>
                        <td className={`p-3 text-center font-mono font-bold ${
                          isFailed || isAb ? 'text-red-600 bg-red-50/20' : 'text-slate-900'
                        }`}>
                          {subDetails.marks} {isFailed && <span className="text-[10px] font-sans font-semibold text-red-500 ml-1">F</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Marks & Status Aggregation Summary */}
            <div className="border border-slate-900 rounded-xl p-5 bg-slate-50/50 grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
              <div className="space-y-1">
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Aggregate Total</span>
                <span className="block text-xl font-bold font-mono text-slate-900">
                  {selectedResult.status === 'ABSENT' ? 'N/A' : `${selectedResult.totalMarks} / ${selectedResult.maxMarks}`}
                </span>
              </div>
              <div className="space-y-1 border-l border-slate-200 pl-4 md:pl-6">
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Percentage</span>
                <span className="block text-xl font-bold font-mono text-slate-900">
                  {selectedResult.status === 'ABSENT' ? '0%' : `${selectedResult.percentage}%`}
                </span>
              </div>
              <div className="space-y-1 border-l border-slate-200 pl-4 md:pl-6">
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Result Class</span>
                <span className="block text-xl font-bold text-slate-900">
                  {selectedResult.status === 'PASS' ? selectedResult.division : '—'}
                </span>
              </div>
              <div className="space-y-1 border-l border-slate-200 pl-4 md:pl-6">
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Final Status</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {selectedResult.status === 'PASS' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      <CheckCircle size={12} />
                      <span>PASS</span>
                    </span>
                  )}
                  {selectedResult.status === 'COMPARTMENT' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                      <AlertTriangle size={12} />
                      <span>COMPARTMENT</span>
                    </span>
                  )}
                  {selectedResult.status === 'FAIL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-red-50 text-red-700 border border-red-200 rounded-full">
                      <XCircle size={12} />
                      <span>FAIL</span>
                    </span>
                  )}
                  {selectedResult.status === 'ABSENT' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                      <XCircle size={12} />
                      <span>ABSENT</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Verification / Signatures Footer */}
            <div className="border-t border-dashed border-slate-300 pt-6 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10 text-xs">
              <div className="text-center md:text-left space-y-1 max-w-sm">
                <p className="font-semibold text-slate-800">Verify Marksheet Statically</p>
                <p className="text-slate-500 leading-normal">
                  This marksheet is compiled instantaneously using high-performance prefix static indices. No database write or central servers were queried.
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="h-10 w-36 mx-auto border-b border-slate-900 flex items-end justify-center font-mono italic text-slate-400">
                  [ digital_seal_bsc ]
                </div>
                <p className="font-semibold uppercase tracking-wider text-[10px] text-slate-600">Controller of Examinations</p>
              </div>
            </div>
          </div>

          {/* Action buttons (Print / PDF) */}
          <div className="flex justify-end gap-3 no-print">
            <button
              type="button"
              onClick={handlePrint}
              id="print-marksheet-btn"
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl py-3 px-5 inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs shadow-slate-950/10"
            >
              <Printer size={15} />
              <span>Print Official Marksheet</span>
            </button>
          </div>
        </div>
      )}

      {/* Static Search Diagnostics Console (Collapsible) */}
      <div className="mt-12 bg-slate-900 text-slate-300 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-950/75 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-mono font-semibold tracking-wider text-white">Statically-Indexed Search Diagnostics</span>
          </div>
          <button
            type="button"
            onClick={() => setDebugLog('')}
            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 underline cursor-pointer"
          >
            Clear Console
          </button>
        </div>
        <div className="p-4 bg-slate-950/40 text-left">
          <pre className="text-[10px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-48 scrollbar-thin">
            {debugLog || 'Awaiting query... Output will log prefix fetches, bucketing metrics, and static execution performance.'}
          </pre>
        </div>
        <div className="bg-slate-950/20 px-5 py-3 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500 font-mono">
          <span>Speed target: Roll &lt;100ms • Name/Father &lt;300ms</span>
          {onNavigateToGenerator && (
            <button
              type="button"
              onClick={onNavigateToGenerator}
              className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer hover:border-emerald-300"
            >
              Configure or Import New Exam Result Database &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
