import React, { useState } from 'react';
import { ExternalLink, Image as ImageIcon, Loader2, Search, AlertCircle } from 'lucide-react';

interface SearchSource {
  uri: string;
  title: string;
}

export const ClinicalStandardsSearchPanel: React.FC<{
  equipmentContext?: string;
  defaultQuery?: string;
}> = ({ equipmentContext, defaultQuery = '' }) => {
  const [query, setQuery] = useState(
    defaultQuery || 'IEC 60601 preventive maintenance electrical safety testing interval medical equipment'
  );
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, equipmentContext }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Search grounding request failed.');
      }
      setResultText(data.text || '');
      setSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to fetch standards guidance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Biomedical Standards & Regulatory Lookup
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Live Google Search grounding via gemini-4-hydrogen for current IEC/ISO testing protocols, recalls, and service references.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search IEC 60601 leakage limits, calibration intervals, or safety bulletins..."
          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search Standards
        </button>
      </form>

      {errorMsg && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {resultText && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {resultText}
          </div>
          {sources.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-600">Grounded Web Sources</div>
              <div className="flex flex-wrap gap-2">
                {sources.slice(0, 6).map((src, idx) => (
                  <a
                    key={`${src.uri}-${idx}`}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-md hover:bg-sky-100 transition-colors"
                  >
                    <span className="truncate max-w-[220px]">{src.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const TechnicalImageGeneratorPanel: React.FC<{
  defaultPrompt?: string;
}> = ({ defaultPrompt = '' }) => {
  const [prompt, setPrompt] = useState(
    defaultPrompt || 'Hospital 12-lead ECG machine mounted on mobile clinical cart with clean cable management'
  );
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<'4:3' | '16:9' | '1:1'>('4:3');
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageSize, aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Technical image generation failed.');
      }
      setGeneratedUrl(data.imageUrl);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to generate image. A billing-enabled API key in Settings > Secrets is required for gemini-3-pro-image-preview.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          SOP Technical Illustration Generator
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate high-resolution equipment reference visuals for biomedical SOP documentation using gemini-3-pro-image-preview.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Equipment Reference Prompt
          </label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the medical device configuration or inspection setup..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700">Resolution</span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                {(['1K', '2K', '4K'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setImageSize(sz)}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                      imageSize === sz
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700">Aspect</span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                {(['4:3', '16:9', '1:1'] as const).map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => setAspectRatio(ar)}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                      aspectRatio === ar
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            Generate Reference ({imageSize})
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          <div>
            <p className="font-medium">Image Generation Unavailable</p>
            <p className="mt-0.5 text-amber-800">{errorMsg}</p>
          </div>
        </div>
      )}

      {generatedUrl && (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
          <img
            src={generatedUrl}
            alt="Generated biomedical equipment reference illustration"
            referrerPolicy="no-referrer"
            className="w-full max-h-80 object-contain bg-slate-100"
          />
          <div className="px-3 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-mono tabular-nums">
              Model: gemini-3-pro-image-preview · {imageSize} · {aspectRatio}
            </span>
            <a
              href={generatedUrl}
              download={`bems-sop-visual-${imageSize}.png`}
              className="text-sky-700 font-medium hover:underline"
            >
              Download PNG
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
