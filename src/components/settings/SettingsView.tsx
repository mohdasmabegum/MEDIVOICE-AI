import React, { useState } from 'react';
import { 
  Building2, 
  Cpu, 
  Save, 
  CheckCircle2, 
  XCircle,
  Radio,
  RefreshCw,
  PhoneCall,
  SlidersHorizontal
} from 'lucide-react';
import { apiService } from '../../services/api';

export const SettingsView: React.FC = () => {
  const [savedNotice, setSavedNotice] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    tested: boolean;
    online: boolean;
    latencyMs: number;
    version: string;
  } | null>(null);

  const [fastApiUrl, setFastApiUrl] = useState('http://localhost:8000/api');
  const [websocketUrl, setWebsocketUrl] = useState('ws://localhost:8000/ws/audio');
  const [voiceModel, setVoiceModel] = useState('pipecat-cartesia-gpt4o-mini');
  const [greetingText, setGreetingText] = useState(
    'Thank you for calling Metropolitan Health Clinic. I am MediVoice AI. How can I help you today?'
  );
  const [emergencyForwardPhone, setEmergencyForwardPhone] = useState('+1 (555) 911-0000');

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await apiService.checkPipecatBackendStatus();
      setConnectionResult({
        tested: true,
        online: res.online,
        latencyMs: res.latencyMs,
        version: res.version,
      });
    } catch {
      setConnectionResult({
        tested: true,
        online: false,
        latencyMs: 0,
        version: 'Unreachable',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
              System Settings & Backend Configuration
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200">
              HIPAA Compliant
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Configure clinical voice parameters, Pipecat connection pipeline, and clinic scheduling rules.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-medium text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings saved successfully. Pipecat connection parameters updated.</span>
        </div>
      )}

      {/* Backend & Voice Engine Settings */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200/60 flex items-center justify-center text-[#0D9488]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#172033]">Pipecat Voice Backend Integration</h3>
              <p className="text-xs text-[#64748B]">Telemetry endpoint and WebRTC gateway for Phase 2</p>
            </div>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50/70 hover:bg-teal-100/70 text-[#0D9488] text-xs font-semibold transition-all self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>{testingConnection ? 'Testing...' : 'Test Backend Connection'}</span>
          </button>
        </div>

        {connectionResult && connectionResult.tested && (
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            connectionResult.online 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {connectionResult.online ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>
                <strong>{connectionResult.online ? 'Pipecat Backend Ready' : 'Backend Standby'}:</strong> {connectionResult.version}
              </span>
            </div>
            <span className="font-mono text-[11px]">
              Round-trip: {connectionResult.latencyMs}ms
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#172033] mb-1.5">FastAPI Base Endpoint</label>
            <input
              type="text"
              value={fastApiUrl}
              onChange={(e) => setFastApiUrl(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] font-mono focus:outline-none focus:border-[#0D9488]"
            />
            <span className="text-[11px] text-[#64748B] mt-1 block">Local API server: http://localhost:8000/api</span>
          </div>

          <div>
            <label className="block font-semibold text-[#172033] mb-1.5">WebRTC / WebSocket Stream URL</label>
            <input
              type="text"
              value={websocketUrl}
              onChange={(e) => setWebsocketUrl(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] font-mono focus:outline-none focus:border-[#0D9488]"
            />
            <span className="text-[11px] text-[#64748B] mt-1 block">Real-time bi-directional audio transport</span>
          </div>

          <div>
            <label className="block font-semibold text-[#172033] mb-1.5">Voice Pipeline Model</label>
            <select
              value={voiceModel}
              onChange={(e) => setVoiceModel(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] font-medium focus:outline-none focus:border-[#0D9488]"
            >
              <option value="pipecat-cartesia-gpt4o-mini">Pipecat + Cartesia Sonic (Low Latency 24ms)</option>
              <option value="pipecat-elevenlabs">Pipecat + ElevenLabs Flash</option>
              <option value="pipecat-deepgram">Pipecat + Deepgram Nova-2</option>
            </select>
            <span className="text-[11px] text-[#64748B] mt-1 block">Ultra-low latency streaming voice stack</span>
          </div>

          <div>
            <label className="block font-semibold text-[#172033] mb-1.5">Emergency Triage Transfer Phone</label>
            <input
              type="text"
              value={emergencyForwardPhone}
              onChange={(e) => setEmergencyForwardPhone(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] font-mono focus:outline-none focus:border-[#0D9488]"
            />
            <span className="text-[11px] text-[#64748B] mt-1 block">Routing when caller reports severe chest pain / stroke</span>
          </div>
        </div>

        <div className="pt-2">
          <label className="block font-semibold text-xs text-[#172033] mb-1.5">Automated Initial Greeting Prompt</label>
          <textarea
            value={greetingText}
            onChange={(e) => setGreetingText(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] focus:outline-none focus:border-[#0D9488]"
          />
        </div>
      </div>

      {/* Facility Profile */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-card p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#172033]">Clinical Facility Details</h3>
            <p className="text-xs text-[#64748B]">Clinic location, operating hours, and routing policies</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="block font-semibold text-[#172033] mb-1">Facility Name</span>
            <input
              type="text"
              readOnly
              value="Metropolitan Health Clinic (Branch #04)"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033]"
            />
          </div>
          <div>
            <span className="block font-semibold text-[#172033] mb-1">Operating Hours</span>
            <input
              type="text"
              readOnly
              value="Monday – Saturday: 08:00 AM – 06:00 PM"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
