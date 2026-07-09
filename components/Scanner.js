'use client';

import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

export default function Scanner({ onCapture, isUploading }) {
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState(false);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: { ideal: facingMode },
  };

  const startCamera = useCallback(() => {
    setCameraActive(true);
    setCapturedImage(null);
    setCameraError(false);
  }, []);

  const stopCamera = useCallback(() => {
    setCameraActive(false);
  }, []);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedImage(imageSrc);
        setCameraActive(false);
      }
    }
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result);
      setCameraActive(false);
      setCameraError(false); // Clear camera error when user switches to file upload
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (capturedImage && onCapture) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  const reset = useCallback(() => {
    setCapturedImage(null);
    setCameraActive(false);
    setCameraError(false); // Clear error on reset
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        <div className="scanner-viewfinder">
          {cameraActive && !cameraError ? (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.85}
                videoConstraints={videoConstraints}
                onUserMediaError={() => setCameraError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div className="viewfinder-overlay">
                <div className="viewfinder-corners" />
                <div className="viewfinder-corners-bottom" />
              </div>
            </>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured seed" />
          ) : (
            <div className="scanner-placeholder">
              <div className="icon">{cameraError ? '⚠️' : '🌾'}</div>
              <p style={{ maxWidth: '80%', margin: '0 auto' }}>
                {cameraError
                  ? 'Camera permission denied or camera not found. Please check browser settings or upload a photo.'
                  : 'Open camera or upload a photo of your seed'}
              </p>
            </div>
          )}
        </div>

        <div className="scanner-controls">
          {capturedImage ? (
            <>
              <button className="btn btn-secondary" onClick={reset}>
                ↩ Retake
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Uploading...
                  </>
                ) : (
                  <>🔬 Analyze Seed</>
                )}
              </button>
            </>
          ) : cameraActive && !cameraError ? (
            <>
              <button
                className="btn btn-icon btn-secondary"
                onClick={switchCamera}
                title="Switch camera"
              >
                🔄
              </button>
              <button
                className="btn-capture"
                onClick={capture}
                title="Capture"
              >
                📸
              </button>
              <button
                className="btn btn-icon btn-secondary"
                onClick={stopCamera}
                title="Close camera"
              >
                ✕
              </button>
            </>
          ) : cameraError ? (
            <>
              <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Upload Photo
              </button>
              <button className="btn btn-secondary" onClick={reset}>
                ✕ Close
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={startCamera}>
                📷 Open Camera
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Upload Photo
              </button>
            </>
          )}
        </div>

        {!cameraActive && !capturedImage && (
          <div className="upload-zone">
            <div
              className="upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/')) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setCapturedImage(reader.result);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            >
              <div className="icon">📤</div>
              <p>Drag & drop a seed photo here, or click to browse</p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
