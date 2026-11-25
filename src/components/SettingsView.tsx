import React, { useState } from 'react';
import { Cloud, RotateCcw, Save } from 'lucide-react';
import { User } from 'firebase/auth';

interface SettingsViewProps {
  firebaseUser: User | null;
  firestoreSynced: boolean;
  onSignInGoogle: () => void;
  onResetDemoWorkspace: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  firebaseUser,
  firestoreSynced,
  onSignInGoogle,
  onResetDemoWorkspace,
}) => {
  const [facilityLabel, setFacilityLabel] = useState('St. Jude Demonstration General Hospital (Fictional)');
  const [pmLeadDays, setPmLeadDays] = useState('14');
  const [requireEngineerSignOff, setRequireEngineerSignOff] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            Department & Compliance Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure preventive maintenance alert windows and engineering verification rules.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Demonstration Facility Label
            </label>
            <input
              type="text"
              value={facilityLabel}
              onChange={(e) => setFacilityLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Upcoming Inspection Alert Lead Time (Days)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={pmLeadDays}
              onChange={(e) => setPmLeadDays(e.target.value)}
              className="w-36 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg tabular-nums"
            />
          </div>

          <label className="flex items-start gap-3 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={requireEngineerSignOff}
              onChange={(e) => setRequireEngineerSignOff(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 accent-slate-900"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              <span className="font-semibold text-slate-900 block">
                Require Explicit Engineer Verification After Maintenance
              </span>
              Prevent maintenance closure from automatically setting equipment status to Operational; require manual engineer assessment.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs text-emerald-700 font-medium">
            {savedNotice ? 'Configuration updated in prototype session.' : ''}
          </span>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </form>

      {/* Firebase Cloud Sync & Demo Reset */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Cloud className="w-4 h-4 text-teal-700" />
              <span>Firebase Authentication & Cloud Firestore Persistence</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {firebaseUser
                ? `Signed in as ${firebaseUser.displayName || firebaseUser.email}. Your equipment registry, movements, faults, and maintenance history are ${
                    firestoreSynced ? 'synchronized with Firestore' : 'synchronizing'
                  }.`
                : 'Currently running in local fictional demonstration mode. Sign in with Google to persist your BEMS records across sessions in Cloud Firestore.'}
            </p>
          </div>

          {!firebaseUser && (
            <button
              type="button"
              onClick={onSignInGoogle}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Sign in with Google
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Reset local demonstration workspace to initial 16-asset baseline.
          </div>
          <button
            type="button"
            onClick={onResetDemoWorkspace}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Local Demo Data
          </button>
        </div>
      </div>
    </div>
  );
};
