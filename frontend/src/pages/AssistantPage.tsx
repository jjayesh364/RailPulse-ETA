import React from 'react';
import { RailPulseAssistant } from '../components/assistant/RailPulseAssistant';
import { Bot, HelpCircle, ShieldCheck, Zap } from 'lucide-react';

const AssistantPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">RailPulse AI Assistant</h1>
          </div>
          <p className="text-sm text-slate-600">
            Voice and conversational interface powered by Sarvam AI, grounded on real-time RailPulse telemetry and Gradient Boosting arrival predictions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Factual Verification Active</span>
          </div>
        </div>
      </div>

      {/* Main Assistant Widget */}
      <RailPulseAssistant />

      {/* Capabilities & Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Zap className="w-4 h-4 text-amber-600" />
            <span>Real-Time ETAs & Status</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Inquire about any train (e.g. 12951 Mumbai Rajdhani, 12301 Howrah Rajdhani) for current delay and next stop arrivals.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Bot className="w-4 h-4 text-red-600" />
            <span>Indian Language Support</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Communicate naturally in English, Hindi, and Hinglish. Supports speech input and voice playback via Sarvam Saaras & Bulbul.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Authoritative Source</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            All arrival estimates are computed by RailPulse's ML models. The assistant never fabricates timings or telemetry.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
