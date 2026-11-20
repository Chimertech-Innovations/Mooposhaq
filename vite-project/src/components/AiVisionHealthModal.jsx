import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  ArrowRight,
  X,
  RefreshCw,
  AlertTriangle,
  HeartPulse,
  Scale,
  Droplets,
  Wheat
} from 'lucide-react';
import { analyzeCowImageAndRecommendFeed } from '../services/nutritionApi';
import {
  DISEASE_PROTOCOLS,
  MASTITIS_OPTIONS,
  DISEASE_OPTIONS,
  calculateClientBcsEvaluation
} from '../utils/bcsHealthEngine';

const BCS_FINE_STEPS = [1.5, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5];

export default function AiVisionHealthModal({
  isOpen,
  onClose,
  targetCow = null, // { category: 'lactating', index: 0, data: {...} }
  onApplyToCow = null, // ({ bcs, mastitisStatus, healthDiagnosis, diseases, applyBcsConditioning, cowProfile }) => void
  selectedFeeds = [],
  selectedBreed = null,
  weather = null,
  currentLang = 'en'
}) {
  const fileInputRef = useRef(null);

  // Microservice Endpoint URLs (persisted in localStorage so user can connect their BCS/Mastitis/Disease microservices)
  const [showEndpointConfig, setShowEndpointConfig] = useState(false);
  const [bcsModelUrl, setBcsModelUrl] = useState(() => localStorage.getItem('mooposhaq_bcs_model_url') || '');
  const [mastitisModelUrl, setMastitisModelUrl] = useState(() => localStorage.getItem('mooposhaq_mastitis_model_url') || '');
  const [diseaseModelUrl, setDiseaseModelUrl] = useState(() => localStorage.getItem('mooposhaq_disease_model_url') || '');

  // Image & Cow Profile State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [category, setCategory] = useState('milkingCow');
  const [weight, setWeight] = useState(450);
  const [milkYield, setMilkYield] = useState(12);
  const [milkFat, setMilkFat] = useState(4.2);
  const [stage, setStage] = useState('Mid lactation');
  const [isFirstLactation, setIsFirstLactation] = useState(false);

  // Detected / Selected Model Outputs
  const [bcsScore, setBcsScore] = useState(2.25);
  const [mastitisStatus, setMastitisStatus] = useState('healthy');
  const [selectedDisease, setSelectedDisease] = useState('healthy');

  // Analysis Result & Loading State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Sync with targetCow when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (targetCow && targetCow.data) {
      const d = targetCow.data;
      const catMap = {
        lactating: 'milkingCow',
        dry: 'dryCow',
        pregnantFirst: 'pregnantCattle',
        pregnantRepeat: 'pregnantCattle',
        heifers: 'growingHeifer',
        bulls: 'bull'
      };
      setCategory(catMap[targetCow.category] || 'milkingCow');
      setWeight(Number(d.weight) || 450);
      setMilkYield(Number(d.milkYield) || 12);
      setMilkFat(Number(d.milkFat || d.fatPct) || 4.2);
      setStage(d.stage || 'Mid lactation');
      setIsFirstLactation(Boolean(d.isFirstLactation || d.lactationType === 'first_lactation'));
      setBcsScore(d.bcs !== undefined && d.bcs !== '' ? Number(d.bcs) : 2.25);
      setMastitisStatus(d.mastitisStatus || 'healthy');
      setSelectedDisease(d.healthDiagnosis || (Array.isArray(d.diseases) && d.diseases[0]) || 'healthy');
    }
  }, [isOpen, targetCow]);

  // Save microservice URLs
  const handleSaveEndpoints = () => {
    try {
      localStorage.setItem('mooposhaq_bcs_model_url', bcsModelUrl.trim());
      localStorage.setItem('mooposhaq_mastitis_model_url', mastitisModelUrl.trim());
      localStorage.setItem('mooposhaq_disease_model_url', diseaseModelUrl.trim());
    } catch (e) {}
    setShowEndpointConfig(false);
  };

  // Trigger Mooposhaq AI + Nutrition Engine analysis
  const runAnalysis = async (customOverrides = {}) => {
    setLoading(true);
    setErrorMsg(null);

    const activeFile = customOverrides.file !== undefined ? customOverrides.file : imageFile;
    const activeBcs = customOverrides.bcs !== undefined ? customOverrides.bcs : bcsScore;
    const activeMast = customOverrides.mastitis !== undefined ? customOverrides.mastitis : mastitisStatus;
    const activeDis = customOverrides.disease !== undefined ? customOverrides.disease : selectedDisease;

    try {
      const res = await analyzeCowImageAndRecommendFeed({
        file: activeFile,
        category,
        weight,
        milkYield,
        milkFat,
        stage,
        isFirstLactation,
        bcsModelUrl: bcsModelUrl.trim(),
        mastitisModelUrl: mastitisModelUrl.trim(),
        diseaseModelUrl: diseaseModelUrl.trim(),
        overrideBcs: customOverrides.letModelDetectImage ? null : activeBcs,
        overrideMastitis: customOverrides.letModelDetectImage ? null : activeMast,
        overrideDiseases: customOverrides.letModelDetectImage ? [] : (activeDis && activeDis !== 'healthy' ? [activeDis] : []),
        selectedFeeds,
        selectedBreed,
        weather
      });

      if (res && res.aiModelDetections) {
        const detBcs = res.aiModelDetections.bcs?.score;
        const detMast = res.aiModelDetections.mastitis?.status;
        const detDis = res.aiModelDetections.diseases?.detectedCodes?.[0];
        if (detBcs) setBcsScore(Number(detBcs));
        if (detMast) setMastitisStatus(detMast);
        if (detDis) setSelectedDisease(detDis);
      }
      setAnalysisResult(res);
    } catch (err) {
      // Fallback to client-side BCS & Disease synthesis if backend /api/ai/analyze-cow is not reachable
      const clientBcsPlan = calculateClientBcsEvaluation(activeBcs, weight, category, stage);
      const activeProts = [];
      if (activeMast && activeMast !== 'healthy' && DISEASE_PROTOCOLS[activeMast]) {
        activeProts.push(DISEASE_PROTOCOLS[activeMast]);
      }
      if (activeDis && activeDis !== 'healthy' && activeDis !== activeMast && DISEASE_PROTOCOLS[activeDis]) {
        activeProts.push(DISEASE_PROTOCOLS[activeDis]);
      }
      const supps = [];
      activeProts.forEach(p => {
        (p.supplements || []).forEach(s => supps.push({ ...s, forCondition: p.name }));
      });
      setAnalysisResult({
        success: true,
        usingDefaultFeedBasket: !selectedFeeds || selectedFeeds.length === 0,
        bcsEvaluation: clientBcsPlan,
        activeDiagnoses: activeProts,
        therapeuticSupplements: supps,
        farmSpecificFeedAdvice: clientBcsPlan.actionSteps,
        mooposhaqRationComparison: null
      });
    } finally {
      setLoading(false);
    }
  };

  // Automatically run when modal opens or parameters change
  useEffect(() => {
    if (isOpen) {
      runAnalysis();
    }
  }, [isOpen, bcsScore, mastitisStatus, selectedDisease, category, weight, milkYield, milkFat, stage]);

  if (!isOpen) return null;

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    // Run external model detection on the uploaded cow image
    runAnalysis({ file, letModelDetectImage: true });
  };

  const bcsEval = analysisResult?.bcsEvaluation || calculateClientBcsEvaluation(bcsScore, weight, category, stage);
  const activeDiagnoses = analysisResult?.activeDiagnoses || [];
  const rationComp = analysisResult?.mooposhaqRationComparison;
  const supplements = analysisResult?.therapeuticSupplements || [];
  const farmAdvice = analysisResult?.farmSpecificFeedAdvice || [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '980px',
          maxHeight: '92vh',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1.5px solid #cbd5e1'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #0284c7 100%)',
            color: '#ffffff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Camera size={22} color="#38bdf8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.2px' }}>
                  Mooposhaq AI Vision: BCS, Mastitis & Disease → Feed Engine
                </h2>
                <span
                  style={{
                    background: '#22c55e',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px'
                  }}
                >
                  NASEM 2021 Linked
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#bae6fd', marginTop: '2px' }}>
                Upload a cow picture or select BCS & diagnosis to get Mooposhaq feed recommendations for BCS recovery & disease support
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowEndpointConfig(!showEndpointConfig)}
              style={{
                background: showEndpointConfig ? '#38bdf8' : 'rgba(255,255,255,0.14)',
                color: showEndpointConfig ? '#0f172a' : '#ffffff',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '10px',
                padding: '6px 11px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Sliders size={14} />
              <span>Model API URLs</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.14)',
                border: 'none',
                color: '#ffffff',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Optional External Model Microservices Configuration Drawer */}
        {showEndpointConfig && (
          <div style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', padding: '14px 20px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Connect Your External BCS, Mastitis & Disease Detection Microservice Endpoints:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  BCS Scoring Model API URL (POST multipart/JSON):
                </label>
                <input
                  type="text"
                  value={bcsModelUrl}
                  onChange={(e) => setBcsModelUrl(e.target.value)}
                  placeholder="e.g. http://localhost:8001/predict/bcs"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  Mastitis Detection Model API URL:
                </label>
                <input
                  type="text"
                  value={mastitisModelUrl}
                  onChange={(e) => setMastitisModelUrl(e.target.value)}
                  placeholder="e.g. http://localhost:8002/predict/mastitis"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  Disease Detection Model API URL:
                </label>
                <input
                  type="text"
                  value={diseaseModelUrl}
                  onChange={(e) => setDiseaseModelUrl(e.target.value)}
                  placeholder="e.g. http://localhost:8003/predict/disease"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Mooposhaq sends the uploaded cow image to your endpoints and translates the predicted BCS & diagnoses into NASEM 2021 feed rations.
              </span>
              <button
                type="button"
                onClick={handleSaveEndpoints}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Save Endpoints
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
          {/* Quick Scenario Presets + Image Upload Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
              gap: '16px',
              marginBottom: '18px'
            }}
          >
            {/* Left: Cow Photo Upload Box */}
            <div
              style={{
                border: '2px dashed #38bdf8',
                borderRadius: '16px',
                background: '#f0f9ff',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '96px',
                    height: '82px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #bae6fd',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Uploaded Cow" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <Upload size={22} color="#0284c7" />
                      <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
                        Upload Photo
                      </span>
                    </>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>
                    1. Upload Cow Picture for BCS & Disease Scan
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.4, marginBottom: '8px' }}>
                    Upload a rear/side cow image (for BCS & LSD/FMD) or udder image (for Mastitis).
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Camera size={14} />
                      <span>{imageFile ? 'Change Cow Photo' : 'Choose Cow Photo'}</span>
                    </button>
                    {imageFile && (
                      <span style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 700, alignSelf: 'center' }}>
                        {imageFile.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Test Presets */}
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #bae6fd' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0369a1', marginBottom: '5px' }}>
                  Quick Test Diagnosis Scenarios:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {[
                    { label: 'Thin Cow (BCS 2.0) + Subclinical Mastitis', bcs: 2.0, mast: 'subclinical_mastitis', dis: 'healthy' },
                    { label: 'BCS 2.25 + Lumpy Skin Disease (LSD)', bcs: 2.25, mast: 'healthy', dis: 'lumpy_skin_disease' },
                    { label: 'Clinical Mastitis + BCS 2.5', bcs: 2.5, mast: 'clinical_mastitis', dis: 'healthy' },
                    { label: 'FMD Recovery (Soft Mash) + BCS 2.0', bcs: 2.0, mast: 'healthy', dis: 'fmd_recovery' },
                    { label: 'Heavy Cow (BCS 4.0) + Ketosis Risk', bcs: 4.0, mast: 'healthy', dis: 'ketosis' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setBcsScore(preset.bcs);
                        setMastitisStatus(preset.mast);
                        setSelectedDisease(preset.dis);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #7dd3fc',
                        color: '#0369a1',
                        borderRadius: '8px',
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Model Output & Diagnosis Controls */}
            <div
              style={{
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                background: '#ffffff',
                padding: '14px'
              }}
            >
              <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
                2. Detected / Active BCS, Mastitis & Disease Outputs
              </div>

              {/* BCS Score Selector (1.5 to 4.5) */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>
                  <span style={{ color: '#334155' }}>Detected BCS Score (1–5 Scale):</span>
                  <span style={{ color: bcsEval.needsImprovement ? '#dc2626' : '#16a34a' }}>
                    BCS {bcsScore.toFixed(2)} → Target {bcsEval.targetBcs.toFixed(2)} ({stage})
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {BCS_FINE_STEPS.map((val) => {
                    const isSel = Math.abs(bcsScore - val) < 0.05;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setBcsScore(val)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          border: `1.5px solid ${isSel ? '#0284c7' : '#e2e8f0'}`,
                          background: isSel ? '#0284c7' : '#f8fafc',
                          color: isSel ? '#ffffff' : '#334155',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mastitis Detection Output */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Mastitis Detection Model Diagnosis:
                </label>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {MASTITIS_OPTIONS.map((opt) => {
                    const isSel = mastitisStatus === opt.val;
                    const prot = DISEASE_PROTOCOLS[opt.val] || DISEASE_PROTOCOLS.healthy;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setMastitisStatus(opt.val)}
                        style={{
                          flex: '1 1 auto',
                          padding: '5px 9px',
                          borderRadius: '8px',
                          border: `1.5px solid ${isSel ? prot.color : '#e2e8f0'}`,
                          background: isSel ? prot.bgLight : '#ffffff',
                          color: isSel ? prot.color : '#475569',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Disease Detection Model Output */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Disease Detection Model Diagnosis (Infectious / Skin / Metabolic):
                </label>
                <select
                  value={selectedDisease}
                  onChange={(e) => setSelectedDisease(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#f8fafc'
                  }}
                >
                  {DISEASE_OPTIONS.map((opt) => (
                    <option key={opt.val} value={opt.val}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Compact Cow Weight / Milk Yield / Stage Context */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value) || 400)}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.76rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>Milk (L/day)</label>
                  <input
                    type="number"
                    value={milkYield}
                    onChange={(e) => setMilkYield(Number(e.target.value) || 0)}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.76rem', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    style={{ width: '100%', padding: '5px 6px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.74rem', fontWeight: 700 }}
                  >
                    <option value="Early lactation">Early (&lt;100d)</option>
                    <option value="Mid lactation">Mid (100-200d)</option>
                    <option value="Late lactation">Late (&gt;200d)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION A: MOOPOSHAQ BCS IMPROVEMENT FEED RECOMMENDATION */}
          <div
            style={{
              background: bcsEval.direction === 'gain' ? '#fff7ed' : bcsEval.direction === 'reduce' ? '#fef2f2' : '#f0fdf4',
              border: `1.5px solid ${bcsEval.direction === 'gain' ? '#fdba74' : bcsEval.direction === 'reduce' ? '#fca5a5' : '#86efac'}`,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={20} color={bcsEval.direction === 'gain' ? '#ea580c' : bcsEval.direction === 'reduce' ? '#dc2626' : '#16a34a'} />
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                  Mooposhaq BCS Improvement Feed Prescription
                </span>
              </div>
              <span
                style={{
                  background: bcsEval.direction === 'gain' ? '#ea580c' : bcsEval.direction === 'reduce' ? '#dc2626' : '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '999px'
                }}
              >
                {bcsEval.statusLabel}
              </span>
            </div>

            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', lineHeight: 1.45 }}>
              {bcsEval.headline}
            </div>

            {/* Key BCS Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                gap: '10px',
                marginBottom: '12px'
              }}
            >
              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>BCS Trajectory</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                  {bcsEval.currentBcs.toFixed(2)} → {bcsEval.targetBcs.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 700 }}>
                  {bcsEval.bcsDelta >= 0 ? `+${bcsEval.bcsDelta.toFixed(2)}` : bcsEval.bcsDelta.toFixed(2)} BCS ({bcsEval.targetTissueChangeKg >= 0 ? `+${bcsEval.targetTissueChangeKg}` : bcsEval.targetTissueChangeKg} kg)
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>Daily Energy Adjustment</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#ea580c' }}>
                  {bcsEval.extraMeMcalPerDay >= 0 ? `+${bcsEval.extraMeMcalPerDay}` : bcsEval.extraMeMcalPerDay} Mcal ME/d
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  ({bcsEval.extraNelMcalPerDay >= 0 ? `+${bcsEval.extraNelMcalPerDay}` : bcsEval.extraNelMcalPerDay} Mcal NEL/d)
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>Daily Protein Adjustment</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0284c7' }}>
                  +{bcsEval.extraCpGPerDay} g CP/day
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  For tissue & frame gain
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>Conditioning Timeline</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#15803d' }}>
                  {bcsEval.estimatedConditioningDays > 0 ? `~${bcsEval.estimatedConditioningDays} Days` : 'Maintain Daily'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  Safe acidosis-free rate
                </div>
              </div>
            </div>

            {/* Actionable BCS Feed Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(bcsEval.actionSteps || []).map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 600 }}>
                  <CheckCircle2 size={15} color="#16a34a" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION B: MASTITIS & DISEASE NUTRITIONAL INTERVENTION PROTOCOL */}
          {activeDiagnoses.length > 0 && (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #fca5a5',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <HeartPulse size={20} color="#dc2626" />
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#991b1b' }}>
                  Mooposhaq Therapeutic Feed Protocol for Detected Diagnosis ({activeDiagnoses.map(d => d.name).join(' + ')})
                </span>
              </div>

              {activeDiagnoses.map((diag, dIdx) => (
                <div
                  key={dIdx}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid #fecaca',
                    marginBottom: dIdx < activeDiagnoses.length - 1 ? '12px' : 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#b91c1c' }}>{diag.name}</strong>
                    <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                      Improves with Mooposhaq Therapeutic Ration
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#334155', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                    {diag.summary}
                  </p>

                  {/* Feed Modifications */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                      Required Mooposhaq Feed Modifications:
                    </div>
                    {(diag.feedAdjustments || []).map((adj, ai) => (
                      <div key={ai} style={{ fontSize: '0.78rem', color: '#1e293b', marginBottom: '4px', paddingLeft: '8px', borderLeft: '2.5px solid #ef4444' }}>
                        • {adj}
                      </div>
                    ))}
                  </div>

                  {/* Feeds to Increase vs Limit */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                    <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', marginBottom: '4px' }}>
                        Priority Feeds to Increase (From Mooposhaq):
                      </div>
                      {(diag.recommendedFeedsToIncrease || []).map((f, fi) => (
                        <div key={fi} style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 600 }}>✓ {f}</div>
                      ))}
                    </div>
                    <div style={{ background: '#fff1f2', padding: '8px 10px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9f1239', marginBottom: '4px' }}>
                        Feeds to Restrict / Avoid:
                      </div>
                      {(diag.feedsToLimit || []).map((f, fi) => (
                        <div key={fi} style={{ fontSize: '0.74rem', color: '#be123c', fontWeight: 600 }}>✕ {f}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Therapeutic Supplements Table */}
              {supplements.length > 0 && (
                <div style={{ marginTop: '12px', background: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
                    Prescribed Nutritional Supplements & Top-Dressing:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                    {supplements.map((s, si) => (
                      <div key={si} style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0369a1' }}>{s.name}</div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>Dose: {s.dosage}</div>
                        <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px' }}>{s.purpose}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION C: EXACT MOOPOSHAQ RATION SOLVER OUTPUT (BASELINE VS THERAPEUTIC BCS/DISEASE RATION) */}
          {rationComp && (
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #bae6fd',
                borderRadius: '16px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wheat size={19} color="#0284c7" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                    Mooposhaq Daily Ration Allocation (Baseline Ideal BCS vs BCS + Health Recovery Ration)
                  </span>
                </div>
                {analysisResult?.usingDefaultFeedBasket && (
                  <span style={{ fontSize: '0.7rem', color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    Calculated with Standard Farm Feeds (select feeds in Step 5 to customize)
                  </span>
                )}
              </div>

              {/* Farm-specific Feed Advice */}
              {farmAdvice.length > 0 && (
                <div style={{ background: '#e0f2fe', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
                  {farmAdvice.map((adv, ai) => (
                    <div key={ai} style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0c4a6e', marginBottom: ai < farmAdvice.length - 1 ? '4px' : 0 }}>
                      • {adv}
                    </div>
                  ))}
                </div>
              )}

              {/* Summary Comparison Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>Green Fodder</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#15803d' }}>
                    {rationComp.therapeuticRecommendedRation.greenFodderKg} kg/day
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#475569' }}>
                    {rationComp.therapeuticRecommendedRation.greenFodderDetails}
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>Concentrate & Mash</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0284c7' }}>
                    {rationComp.therapeuticRecommendedRation.concentrateKg} kg/day
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#475569' }}>
                    {rationComp.therapeuticRecommendedRation.concentrateDetails}
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>Dry Roughage</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#b45309' }}>
                    {rationComp.therapeuticRecommendedRation.dryFodderKg} kg/day
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#475569' }}>
                    {rationComp.therapeuticRecommendedRation.dryFodderDetails}
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>Mineral Mix & Salt</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#7c3aed' }}>
                    {rationComp.therapeuticRecommendedRation.mineralMixtureG}g Min + {rationComp.therapeuticRecommendedRation.saltG}g Salt
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    (Baseline: {rationComp.baselineRation.mineralMixtureG}g Min)
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>Clean Water</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0284c7' }}>
                    {rationComp.therapeuticRecommendedRation.waterLiters} L/day
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    (Baseline: {rationComp.baselineRation.waterLiters} L/d)
                  </div>
                </div>
              </div>

              {/* Ingredient-by-Ingredient Adjustment Table */}
              {rationComp.ingredientAdjustments?.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', background: '#ffffff', borderRadius: '10px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#e0f2fe', color: '#0369a1', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Mooposhaq Feed Ingredient</th>
                        <th style={{ padding: '8px 10px' }}>Category</th>
                        <th style={{ padding: '8px 10px' }}>Standard Ration (BCS {bcsEval.targetBcs})</th>
                        <th style={{ padding: '8px 10px' }}>Recommended BCS/Health Ration</th>
                        <th style={{ padding: '8px 10px' }}>Adjustment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rationComp.ingredientAdjustments.map((ing, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 800, color: '#0f172a' }}>{ing.name}</td>
                          <td style={{ padding: '7px 10px', color: '#64748b' }}>{ing.category}</td>
                          <td style={{ padding: '7px 10px', fontWeight: 600 }}>{ing.baselineIdealBcsKg} kg/day</td>
                          <td style={{ padding: '7px 10px', fontWeight: 900, color: '#0284c7' }}>{ing.recommendedTherapeuticKg} kg/day</td>
                          <td style={{ padding: '7px 10px', fontWeight: 800, color: ing.deltaKg > 0 ? '#16a34a' : ing.deltaKg < 0 ? '#dc2626' : '#64748b' }}>
                            {ing.deltaKg > 0 ? `+${ing.deltaKg} kg` : ing.deltaKg < 0 ? `${ing.deltaKg} kg` : 'No change'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1.5px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
            {loading ? 'Calculating Mooposhaq NASEM 2021 ration adjustments...' : 'Ready to apply BCS & diagnosis feed adjustments to your herd.'}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#475569',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            {onApplyToCow && (
              <button
                type="button"
                onClick={() => {
                  onApplyToCow({
                    bcs: bcsScore,
                    mastitisStatus,
                    healthDiagnosis: selectedDisease,
                    diseases: selectedDisease !== 'healthy' ? [selectedDisease] : [],
                    applyBcsConditioning: true,
                    weight,
                    milkYield,
                    milkFat,
                    stage,
                    category
                  });
                  onClose();
                }}
                style={{
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '8px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                }}
              >
                <Sparkles size={15} />
                <span>
                  {targetCow
                    ? `Apply BCS ${bcsScore} & Health Plan to Cow #${targetCow.index + 1}`
                    : `Apply Scanned Cow (BCS ${bcsScore}) to Herd Ration`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
