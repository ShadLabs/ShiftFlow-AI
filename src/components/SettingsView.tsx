import React, { useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  Sparkles,
} from 'lucide-react';
import { exportAllData, importData, resetToDemoData } from '../utils/storage';

interface SettingsViewProps {
  onDataReset: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onDataReset }) => {
  const [importJson, setImportJson] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const handleExport = () => {
    const dataStr = exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shiftflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Operational data exported successfully.' });
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJson.trim()) return;
    const ok = importData(importJson);
    if (ok) {
      setMessage({ type: 'success', text: 'Data imported successfully.' });
      setImportJson('');
      onDataReset();
    } else {
      setMessage({ type: 'error', text: 'Invalid JSON format. Please verify file syntax.' });
    }
  };

  const handleReset = () => {
    resetToDemoData();
    onDataReset();
    setShowResetConfirm(false);
    setMessage({ type: 'success', text: 'Reset completed to demo records.' });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          System Settings & Data Management
        </h2>
        <p className="text-xs text-slate-500">
          Control operational persistence, backups, seed data, and AI configuration
        </p>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Persistence Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Demo Data & Storage Controls
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">LocalStorage Engine</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          ShiftFlow AI utilizes a browser storage layer paired with an Express backend for Gemini
          analysis. Resetting will restore sample shift handovers, active work orders, and carryover
          continuity links.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Archive</span>
          </button>

          {showResetConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-700 font-medium">Reset all records?</span>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs"
              >
                Yes, Reset Data
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-2.5 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Pristine Demo Data</span>
            </button>
          )}
        </div>
      </div>

      {/* JSON Import Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">Import Handover Archive</h3>
        </div>

        <form onSubmit={handleImport} className="space-y-3">
          <textarea
            rows={4}
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            placeholder="Paste raw JSON export archive here..."
            className="w-full p-3 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-slate-50/50"
          />

          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            Import Data
          </button>
        </form>
      </div>

      {/* Technical Architecture Information */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Architecture & Safety Profile</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-900 block">AI Integration Model:</span>
            <span>Gemini 3.8 Flash via Express server proxy (API key protected, never exposed client-side).</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-900 block">Human-in-the-Loop Governance:</span>
            <span>All AI action tracker conversions and status escalations require shift lead verification.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
