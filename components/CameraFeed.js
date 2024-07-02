import { useEffect } from 'react';

export default function CameraFeed({ videoRef, onPlay }) {
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Error accessing the camera:", err));
    }
  }, [videoRef]);

  return (
    <video
      ref={videoRef}
      className="rounded-lg shadow-lg"
      autoPlay
      playsInline
      muted
      width="640"
      height="480"
      onLoadedData={onPlay}
    />
  );
}