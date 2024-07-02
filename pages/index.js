import { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import AttentivenessScore from '../components/AttentivenessScore';
import CameraFeed from '../components/CameraFeed';
import GameUI from '../components/GameUI';

export default function Home() {
  const [isAttentive, setIsAttentive] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [prevNoseX, setPrevNoseX] = useState(0);
const [prevNoseY, setPrevNoseY] = useState(0);

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
        updateScore(attentive);
      }
    }
    requestAnimationFrame(predictAttentiveness);
  }

  function isStudentAttentive(pose) {
    const nose = pose.keypoints.find(kp => kp.name === 'nose');
    const leftEye = pose.keypoints.find(kp => kp.name === 'left_eye');
    const rightEye = pose.keypoints.find(kp => kp.name === 'right_eye');
    
    if (nose && leftEye && rightEye) {
      // Check if face is visible
      const faceVisible = (nose.score > 0.5 && leftEye.score > 0.3 && rightEye.score > 0.3);
      
      // Check if face is oriented towards the camera (more lenient)
      const faceForward = Math.abs(leftEye.x - rightEye.x) > videoRef.current.width * 0.03;
      
      // Check if head is in a reasonable position (more lenient)
      const goodHeadPosition = (nose.y > videoRef.current.height * 0.1 && 
                                nose.y < videoRef.current.height * 0.9);
      
      return faceVisible && (faceForward || goodHeadPosition);
    }
    return false;
  }

  function updateScore(attentive) {
    if (attentive) {
      setScore(prevScore => Math.min(prevScore + 2, 100)); // Cap at 100
      setStreak(prevStreak => prevStreak + 1);
    } else {
      setScore(prevScore => Math.max(prevScore - 1, -50)); // Less punishing, minimum -50
      setStreak(0);
    }
    
    if (streak > 0 && streak % 10 === 0) {
      setLevel(prevLevel => prevLevel + 1);
      triggerConfetti();
    }
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
    return <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-purple-400 to-pink-500">
      <p className="text-2xl font-bold text-white">Loading Attention Booster...</p>
    </div>;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <h1 className="absolute top-6 left-0 right-0 text-5xl font-bold text-center text-white">Attention Booster</h1>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 h-3/4">
        <div className="relative w-full h-full">
          <CameraFeed videoRef={videoRef} onPlay={predictAttentiveness} />
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
        </div>
      </div>
      <GameUI isAttentive={isAttentive} score={score} streak={streak} level={level} />
    </div>
  );
}