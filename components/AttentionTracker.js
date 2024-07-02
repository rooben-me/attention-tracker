import { useState, useRef, useEffect } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as posenet from '@tensorflow-models/posenet'

export default function Home() {
  const [attentivenessScore, setAttentivenessScore] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [message, setMessage] = useState("Let's focus!")
  const [isRunning, setIsRunning] = useState(false)
  const [debugInfo, setDebugInfo] = useState("Model not loaded")
  const [metrics, setMetrics] = useState({
    lookAways: 0,
    totalTime: 0,
    attentiveTime: 0,
  })
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const modelRef = useRef(null)

  useEffect(() => {
    loadModel()
    return () => stopTracking()
  }, [])

  useEffect(() => {
    console.log("Current state:", { attentivenessScore, totalScore, metrics })
  }, [attentivenessScore, totalScore, metrics])

  const loadModel = async () => {
    setDebugInfo("Loading model...")
    try {
      modelRef.current = await posenet.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        inputResolution: { width: 640, height: 480 },
        multiplier: 0.75
      })
      setDebugInfo("Model loaded successfully")
    } catch (error) {
      setDebugInfo(`Error loading model: ${error.message}`)
    }
  }

  const startTracking = async () => {
    if (!modelRef.current) {
      setDebugInfo("Model not loaded yet. Please wait.")
      return
    }

    setIsRunning(true)
    setMetrics({ lookAways: 0, totalTime: 0, attentiveTime: 0 })
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      videoRef.current.srcObject = stream
      streamRef.current = stream
      videoRef.current.play()

      const ctx = canvasRef.current.getContext('2d')
      let lastLookAwayTime = null

      const trackingLoop = async () => {
        if (!isRunning) return
      
        try {
          const pose = await modelRef.current.estimateSinglePose(videoRef.current)
          console.log("Pose detected:", pose)
          const isAttentive = checkAttentiveness(pose)
          updateScore(isAttentive)
          drawPose(pose, ctx)
          updateMetrics(isAttentive)
          setDebugInfo(`Pose detected. Confidence: ${pose.score.toFixed(2)}`)
        } catch (error) {
          setDebugInfo(`Error in tracking: ${error.message}`)
          console.error("Tracking error:", error)
        }
      
        requestAnimationFrame(trackingLoop)
      }

      trackingLoop()
    } catch (error) {
      setDebugInfo(`Error accessing camera: ${error.message}`)
    }
  }

  const checkAttentiveness = (pose) => {
    const nose = pose.keypoints.find(k => k.part === 'nose')
    const leftEye = pose.keypoints.find(k => k.part === 'leftEye')
    const rightEye = pose.keypoints.find(k => k.part === 'rightEye')
    
    const isFacingCamera = nose && leftEye && rightEye &&
      nose.score > 0.5 && leftEye.score > 0.5 && rightEye.score > 0.5

    const leftShoulder = pose.keypoints.find(k => k.part === 'leftShoulder')
    const rightShoulder = pose.keypoints.find(k => k.part === 'rightShoulder')
    const isUpright = leftShoulder && rightShoulder &&
      Math.abs(leftShoulder.position.y - rightShoulder.position.y) < 50

    return isFacingCamera && isUpright
  }

  const updateScore = (isAttentive) => {
    setAttentivenessScore(prev => {
      const newScore = isAttentive ? Math.min(prev + 2, 100) : Math.max(prev - 1, 0)
      console.log("Updating score:", newScore)
      setTotalScore(total => {
        const newTotal = total + (newScore / 100)
        console.log("New total score:", newTotal)
        return newTotal
      })
      updateMessage(newScore)
      return newScore
    })
  }
  
  const updateMetrics = (isAttentive) => {
    setMetrics(prev => {
      const newMetrics = {
        ...prev,
        totalTime: prev.totalTime + 1,
        attentiveTime: isAttentive ? prev.attentiveTime + 1 : prev.attentiveTime,
      }
      if (!isAttentive && prev.lookAways === 0) {
        newMetrics.lookAways = prev.lookAways + 1
      }
      console.log("Updated metrics:", newMetrics)
      return newMetrics
    })
  }

  const updateMessage = (score) => {
    if (score > 80) setMessage("Great focus! Keep it up!")
    else if (score > 50) setMessage("You're doing well. Stay focused!")
    else setMessage("Let's try to focus more!")
  }

  const drawPose = (pose, ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    const minPartConfidence = 0.5
    posenet.drawSkeleton(pose.keypoints, minPartConfidence, ctx)
    posenet.drawKeypoints(pose.keypoints, minPartConfidence, ctx)
  }

  const stopTracking = () => {
    setIsRunning(false)
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks()
      tracks.forEach(track => track.stop())
    }
    videoRef.current.srcObject = null
    setDebugInfo("Tracking stopped")
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Attention Hero</h1>
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 relative">
          <video ref={videoRef} className="w-full rounded-lg" />
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
        </div>
        <div className="p-4 bg-gray-100">
          <div className="mb-4">
            <div className="text-lg font-semibold text-gray-700 mb-2">Focus Meter</div>
            <div className="w-full bg-gray-300 rounded-full h-4">
              <div 
                className="bg-green-500 rounded-full h-4 transition-all duration-300 ease-out"
                style={{ width: `${attentivenessScore}%` }}
              ></div>
            </div>
          </div>
          <p className="text-xl font-bold text-center text-indigo-600 mb-4">{message}</p>
          <div className="grid grid-cols-2 gap-4 text-gray-700">
            <div>
              <p className="font-semibold">Total Score: {totalScore.toFixed(2)}</p>
              <p>Look Aways: {metrics.lookAways}</p>
            </div>
            <div>
              <p>Total Time: {metrics.totalTime}s</p>
              <p>Attentive Time: {metrics.attentiveTime}s</p>
            </div>
          </div>
          <p className="text-sm text-center text-gray-500 mt-2">Debug: {debugInfo}</p>
        </div>
      </div>
      <div className="text-center mt-8">
        {!isRunning ? (
          <button 
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full text-lg transition duration-300 ease-in-out transform hover:scale-105"
            onClick={startTracking}
          >
            Start Class
          </button>
        ) : (
          <button 
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full text-lg transition duration-300 ease-in-out transform hover:scale-105"
            onClick={stopTracking}
          >
            End Class
          </button>
        )}
      </div>
    </div>
  )
}