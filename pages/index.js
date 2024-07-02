import { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import AttentivenessScore from '../components/AttentivenessScore';
import CameraFeed from '../components/CameraFeed';

export default function Home() {
  const [isAttentive, setIsAttentive] = useState(null);
  const [score, setScore] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeTensorFlowAndModel() {
      setIsLoading(true);
      try {
        await tf.ready();
        await tf.setBackend('webgl');
        const detectorConfig = {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING};
        const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
        setModel(detector);
      } catch (error) {
        console.error("Error initializing TensorFlow or loading model:", error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeTensorFlowAndModel();
  }, []);

  async function predictAttentiveness() {
    if (model && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.width;
      canvas.height = video.height;

      const poses = await model.estimatePoses(video);
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (poses.length > 0) {
        const pose = poses[0];
        drawKeypoints(ctx, pose.keypoints);
        drawSkeleton(ctx, pose.keypoints);
        
        const attentive = isStudentAttentive(pose);
        setIsAttentive(attentive);
        setScore(prevScore => attentive ? prevScore + 1 : Math.max(0, prevScore - 1));
      }
    }
    requestAnimationFrame(predictAttentiveness);
  }

  function isStudentAttentive(pose) {
    const nose = pose.keypoints.find(kp => kp.name === 'nose');
    const leftEye = pose.keypoints.find(kp => kp.name === 'left_eye');
    const rightEye = pose.keypoints.find(kp => kp.name === 'right_eye');
    
    if (nose && leftEye && rightEye) {
      const eyeMidpointY = (leftEye.y + rightEye.y) / 2;
      return nose.score > 0.9 && nose.y < eyeMidpointY && nose.y > videoRef.current.height * 0.2;
    }
    return false;
  }

  function drawKeypoints(ctx, keypoints) {
    keypoints.forEach(keypoint => {
      if (keypoint.score > 0.5) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
      }
    });
  }

  function drawSkeleton(ctx, keypoints) {
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['right_shoulder', 'right_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
    ];

    connections.forEach(([start, end]) => {
      const startPoint = keypoints.find(kp => kp.name === start);
      const endPoint = keypoints.find(kp => kp.name === end);
      if (startPoint && endPoint && startPoint.score > 0.5 && endPoint.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-2xl font-bold">Loading...</p>
    </div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Attentiveness Tracker</h1>
      <div className="relative">
        <CameraFeed videoRef={videoRef} onPlay={predictAttentiveness} />
        <canvas ref={canvasRef} className="absolute top-0 left-0" />
      </div>
      <AttentivenessScore isAttentive={isAttentive} score={score} />
    </div>
  );
}