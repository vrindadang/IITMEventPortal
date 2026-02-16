
import React, { useState } from 'react';
import { generateInsights, generateWeeklyReport } from '../services/geminiService.ts';
import { Category, Task } from '../types.ts';

interface AISmartInsightsProps {
  categories: Category[];
  tasks: Task[];
}

const AISmartInsights: React.FC<AISmartInsightsProps> = ({ categories, tasks }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'insights' | 'report' | null>(null);

  const handleGenerate = async (mode: 'insights' | 'report') => {
    setLoading(true);
    setType(mode);
    try {
      const res = mode === 'insights' 
        ? await generateInsights(categories, tasks)
        : await generateWeeklyReport(categories);
      setInsights(res || "No insights available.");
    } catch (e) {
      setInsights("Error generating response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-16 bg-white border border-slate-100 rounded-[3rem] p-10 md:p-14 shadow-[0_20px_60px_rgba(0,0,0,0.02)] animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-[#4361ee] flex items-center justify-center text-white text-3xl shadow-[0_15px_30px_rgba(67,97,238,0.2)]">
            ✨
          </div>
          <div>
            <h2 className="font-classy-serif text-[2.6rem] text-slate-900 tracking-tight leading-tight">Gemini Smart Insights</h2>
            <p className="text-slate-400 text-sm font-black uppercase tracking-widest mt-1">Leverage AI to optimize your strategy.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            disabled={loading}
            onClick={() => handleGenerate('insights')}
            className={`
              px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 border-b-4
              ${loading && type === 'insights' ? 'bg-slate-200 border-slate-300 text-slate-400' : 'bg-[#4361ee] text-white border-indigo-800 hover:bg-indigo-700'}
            `}
          >
            {loading && type === 'insights' ? 'Analyzing...' : 'Analyze Progress'}
          </button>
          <button 
            disabled={loading}
            onClick={() => handleGenerate('report')}
            className={`
              px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] transition-all border border-slate-200 active:scale-95 shadow-sm
              ${loading && type === 'report' ? 'bg-slate-50 text-slate-300' : 'bg-white text-slate-600 hover:bg-slate-50'}
            `}
          >
             {loading && type === 'report' ? 'Generating...' : 'Weekly Report'}
          </button>
        </div>
      </div>

      {insights ? (
        <div className="bg-[#fcfcfc] rounded-[2rem] p-10 border border-slate-100 shadow-sm animate-slideUp">
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
            <h3 className="font-classy-serif text-2xl text-slate-900 capitalize tracking-tight">{type} Analysis</h3>
            <button 
              onClick={() => setInsights(null)}
              className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
            >
              Clear Results
            </button>
          </div>
          <div className="text-slate-700 whitespace-pre-wrap leading-relaxed prose prose-indigo max-w-none prose-p:text-slate-600 prose-headings:font-classy-serif prose-headings:text-slate-900 prose-strong:text-slate-900 prose-strong:font-black">
            {insights}
          </div>
        </div>
      ) : !loading && (
        <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30">
           <div className="text-5xl mb-6 opacity-20">📊</div>
           <p className="text-slate-400 font-medium text-lg">Select an analysis mode above to activate Gemini Event Intelligence.</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-pulse">
          <div className="flex space-x-3">
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" />
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce [animation-delay:-.15s]" />
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-.3s]" />
          </div>
          <p className="text-[11px] font-black text-indigo-900 uppercase tracking-[0.3em]">Gemini is processing your request...</p>
        </div>
      )}
    </div>
  );
};

export default AISmartInsights;
