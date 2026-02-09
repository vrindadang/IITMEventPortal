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
    <div className="mt-12 bg-indigo-50 border border-indigo-100 rounded-2xl p-6 md:p-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg">
            ✨
          </div>
          <div>
            <h2 className="text-xl font-bold text-indigo-900">Gemini AI Smart Insights</h2>
            <p className="text-indigo-700/70 text-sm font-medium">Leverage AI to identify risks and optimize your event strategy.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            disabled={loading}
            onClick={() => handleGenerate('insights')}
            className={`
              px-5 py-2.5 rounded-xl font-bold text-sm transition-all
              ${loading && type === 'insights' ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'}
            `}
          >
            {loading && type === 'insights' ? 'Thinking...' : 'Analyze Progress'}
          </button>
          <button 
            disabled={loading}
            onClick={() => handleGenerate('report')}
            className={`
              px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-2
              ${loading && type === 'report' ? 'bg-slate-200 border-slate-200' : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50'}
            `}
          >
             {loading && type === 'report' ? 'Writing...' : 'Weekly Report'}
          </button>
        </div>
      </div>

      {insights ? (
        <div className="bg-white rounded-xl p-6 border border-indigo-100 shadow-sm prose prose-indigo max-w-none">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-indigo-50">
            <h3 className="text-indigo-900 font-bold m-0 capitalize">{type} Result</h3>
            <button 
              onClick={() => setInsights(null)}
              className="text-xs text-indigo-400 hover:text-indigo-600 font-bold"
            >
              Clear
            </button>
          </div>
          <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
            {insights}
          </div>
        </div>
      ) : !loading && (
        <div className="text-center py-12 border-2 border-dashed border-indigo-200 rounded-xl">
           <p className="text-indigo-400 font-medium">Click one of the buttons above to generate AI-driven event intelligence.</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" />
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce [animation-delay:-.15s]" />
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-.3s]" />
          </div>
          <p className="text-indigo-700 font-bold">Gemini is processing your request...</p>
        </div>
      )}
    </div>
  );
};

export default AISmartInsights;