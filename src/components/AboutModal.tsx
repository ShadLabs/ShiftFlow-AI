import React from 'react';
import { X, Sparkles, Layers, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const skills = [
    'Generative AI',
    'Gemini 3.8 Flash',
    'Operations Management',
    'Process Improvement',
    'Operational Communication',
    'Data Analysis',
    'Prompt Engineering',
    'Human-in-the-Loop AI',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">About ShiftFlow AI</h3>
              <p className="text-[11px] text-slate-500">Portfolio & Engineering Overview</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 space-y-5 text-xs text-slate-700 leading-relaxed">
          {/* Core mission statement */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 font-medium">
            ShiftFlow AI explores how generative AI can improve communication and continuity
            between operational shifts by transforming unstructured information into structured,
            actionable handovers.
          </div>

          {/* Operational Continuity & Human-in-the-Loop AI */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Human-in-the-Loop Operational Design
            </h4>
            <p className="text-slate-600">
              Shift handovers in industrial, logistical, and high-tempo environments suffer from
              information decay, overlooked equipment tickets, and unstructured radio logs.
              ShiftFlow AI functions as an assistive decision-support tool — extracting factual
              data, categorizing severity, surfacing carryover items from preceding shifts, and
              proactively generating clarifying questions to eliminate assumptions.
            </p>
          </div>

          {/* Key Competencies Demonstrated */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Competencies & Skills Demonstrated
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {skills.map(skill => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Fictional Data Notice */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>Fictional Demonstration Notice:</strong> All shift logs, equipment stations,
              and operational metrics displayed in this project are simulated for portfolio
              demonstration purposes and do not represent proprietary data from any real
              organization.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">ShiftFlow AI v1.0.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
