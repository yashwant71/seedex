'use client';

export default function PlantingInfo({ result }) {
  if (!result) return null;

  const { planting, care, difficulty, zones, confidence, lifecycle, thingsToWatchOutFor } = result;

  const plantingItems = [
    { icon: '🗓️', label: 'Best Season', value: planting?.bestSeason },
    { icon: '🌤️', label: 'Ideal Climate', value: planting?.idealClimate },
    { icon: '🌸', label: 'Blooming Season', value: planting?.bloomingSeason },
    { icon: '☀️', label: 'Sunlight Requirements', value: planting?.sunlight },
    { icon: '⏱️', label: 'Sunlight Hours', value: planting?.sunlightHours },
    { icon: '💧', label: 'Water Needs', value: planting?.waterNeeds },
    { icon: '🌍', label: 'Soil Type', value: planting?.soilType },
    { icon: '📏', label: 'Spacing', value: planting?.spacing },
    { icon: '⬇️', label: 'Planting Depth', value: planting?.depth },
    { icon: '🌱', label: 'Germination', value: planting?.germination },
    { icon: '⏱️', label: 'Days to Flower', value: planting?.daysToFlower },
  ];

  const careItems = [
    { icon: '🧪', label: 'Fertilizer', value: care?.fertilizer },
    { icon: '🐛', label: 'Common Pests', value: care?.pests },
    { icon: '🦠', label: 'Diseases', value: care?.diseases },
  ];

  const difficultyClass = difficulty?.toLowerCase() || 'moderate';

  const getRatingColor = (rating) => {
    switch (rating?.toLowerCase()) {
      case 'ideal':
        return '#15803d'; // Greenest
      case 'good':
        return '#22c55e'; // Light green
      case 'okay':
        return '#f97316'; // Orange
      case 'avoid':
        return '#dc2626'; // Red
      default:
        return 'var(--text-muted)';
    }
  };

  return (
    <>
      {/* Quick Stats */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px', alignItems: 'center' }}>
        {difficulty && difficulty !== 'Unknown' && (
          <span className={`difficulty-badge ${difficultyClass}`}>
            {difficultyClass === 'easy' && '🟢'}
            {difficultyClass === 'moderate' && '🟡'}
            {difficultyClass === 'hard' && '🔴'}
            {difficulty} difficulty
          </span>
        )}
        {lifecycle && lifecycle !== 'Unknown' && (
          <span className="difficulty-badge moderate" style={{ background: 'var(--bg-card)', color: 'var(--accent-primary)' }}>
            🌱 {lifecycle}
          </span>
        )}
        {zones && zones !== 'Unknown' && (
          <span className="difficulty-badge moderate">
            🌡️ Zones {zones}
          </span>
        )}
        {confidence > 0 && (
          <div className="detail-confidence" style={{ margin: 0 }}>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="confidence-label">{confidence}% confidence</span>
          </div>
        )}
      </div>

      {/* Beginner Warning gotchas box */}
      {thingsToWatchOutFor && thingsToWatchOutFor !== 'Unknown' && thingsToWatchOutFor !== '' && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.05)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '32px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          fontSize: '0.88rem',
          color: 'var(--text-primary)'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '2px' }}>Beginner Warnings (Things to Watch Out For):</strong>
            {thingsToWatchOutFor}
          </div>
        </div>
      )}

      {/* Monthly Planting Spectrum */}
      {planting?.monthlyPlantingSpectrum && planting.monthlyPlantingSpectrum.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 className="section-title">📅 India Monthly Planting Spectrum</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '-12px' }}>
            Check the best months to sow this seed in India's monsoonal climate cycles.
          </p>
          <div className="spectrum-grid">
            {planting.monthlyPlantingSpectrum.map((item) => (
              <div
                key={item.month}
                className="spectrum-month-card"
                style={{ borderTopColor: getRatingColor(item.rating) }}
              >
                <div className="month-name">{item.month}</div>
                <div
                  className="month-rating-badge"
                  style={{ backgroundColor: getRatingColor(item.rating) }}
                >
                  {item.rating}
                </div>
                <p className="month-reason">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planting Guide */}
      <h2 className="section-title">🌱 Planting Guide</h2>
      <div className="info-grid" style={{ marginBottom: '20px' }}>
        {plantingItems.map((item) =>
          item.value && item.value !== 'Unknown' && item.value !== '' ? (
            <div key={item.label} className="info-card">
              <div className="icon">{item.icon}</div>
              <div className="label">{item.label}</div>
              <div className="value">{item.value}</div>
            </div>
          ) : null
        )}
      </div>

      {/* Avoid Planting Warning Box */}
      {planting?.avoidSeason && planting.avoidSeason !== 'Unknown' && planting.avoidSeason !== '' && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '32px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          fontSize: '0.88rem',
          color: 'var(--text-primary)'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: '2px' }}>Avoid Planting Warning:</strong>
            {planting.avoidSeason}
          </div>
        </div>
      )}

      {/* Care Section */}
      <div className="care-section">
        <h2 className="section-title">🩺 Care & Maintenance</h2>
        <div className="care-cards" style={{ marginBottom: '24px' }}>
          {careItems.map((item) =>
            item.value && item.value !== 'Unknown' && item.value !== '' ? (
              <div key={item.label} className="care-card">
                <div className="label">
                  {item.icon} {item.label}
                </div>
                <div className="value">{item.value}</div>
              </div>
            ) : null
          )}
          {care?.toxicity && care.toxicity !== 'Unknown' && care.toxicity !== '' && (
            <div className="care-card" style={{
              borderLeft: care.toxicity.toLowerCase().includes('toxic') && !care.toxicity.toLowerCase().includes('non-toxic')
                ? '4px solid var(--danger)'
                : '4px solid var(--success)'
            }}>
              <div className="label">⚠️ Toxicity Status</div>
              <div className="value">{care.toxicity}</div>
            </div>
          )}
        </div>

        {/* Companion Plants */}
        {care?.companionPlants && care.companionPlants.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '12px' }}>
              🤝 Companion Plants
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {care.companionPlants.map((plant, i) => (
                <span key={i} className="difficulty-badge easy" style={{ background: 'var(--bg-card)' }}>
                  🌿 {plant}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pro Tips */}
        {care?.tips && care.tips.length > 0 && (
          <>
            <h3 className="section-title" style={{ fontSize: '1rem', marginTop: '24px' }}>
              💡 Pro Tips for Beginners
            </h3>
            <ul className="tips-list">
              {care.tips.map((tip, i) => (
                <li key={i}>
                  <span className="tip-icon">✦</span>
                  {tip}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
