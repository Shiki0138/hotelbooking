// Immersive 3D/VR experiences using CSS 3D and WebGL
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

// 3D Hotel Room Tour
export const HotelRoom3D = ({ roomData, className = "" }) => {
  const containerRef = useRef();
  const [currentView, setCurrentView] = useState(0);
  const [isVRMode, setIsVRMode] = useState(false);
  
  const views = [
    { name: '入口', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    { name: 'ベッドルーム', position: { x: -100, y: 0, z: 0 }, rotation: { x: 0, y: 90, z: 0 } },
    { name: 'バスルーム', position: { x: 0, y: 0, z: -100 }, rotation: { x: 0, y: 180, z: 0 } },
    { name: 'バルコニー', position: { x: 100, y: 0, z: 0 }, rotation: { x: 0, y: 270, z: 0 } }
  ];

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  }, [mouseX, mouseY]);

  const nextView = () => {
    setCurrentView((prev) => (prev + 1) % views.length);
  };

  const prevView = () => {
    setCurrentView((prev) => (prev - 1 + views.length) % views.length);
  };

  const toggleVR = () => {
    setIsVRMode(!isVRMode);
    if (!isVRMode && 'requestFullscreen' in document.documentElement) {
      containerRef.current.requestFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`hotel-room-3d ${className} ${isVRMode ? 'vr-mode' : ''}`}
      onMouseMove={handleMouseMove}
      style={{
        perspective: '1000px',
        perspectiveOrigin: '50% 50%',
        overflow: 'hidden',
        position: 'relative',
        height: '600px',
        background: 'radial-gradient(circle at center, #1a1a2e, #16213e)'
      }}
    >
      {/* 3D Scene Container */}
      <motion.div
        className="scene-container"
        style={{
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
          rotateX,
          rotateY
        }}
        animate={{
          rotateY: views[currentView].rotation.y,
          rotateX: views[currentView].rotation.x,
          x: views[currentView].position.x,
          z: views[currentView].position.z
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 20,
          duration: 1
        }}
      >
        {/* Room Walls */}
        <div className="room-cube">
          {/* Front Wall */}
          <motion.div
            className="room-face front"
            style={{
              position: 'absolute',
              width: '800px',
              height: '600px',
              background: `linear-gradient(135deg, 
                rgba(255,255,255,0.1) 0%, 
                rgba(255,255,255,0.05) 100%),
                url('https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: 'translateZ(400px)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="room-content">
              <h3>ホテルルーム - {views[currentView].name}</h3>
              <div className="room-features">
                <div className="feature-item">🛏️ キングサイズベッド</div>
                <div className="feature-item">🌊 オーシャンビュー</div>
                <div className="feature-item">🛁 スパバス</div>
                <div className="feature-item">📺 50インチTV</div>
              </div>
            </div>
          </motion.div>

          {/* Back Wall */}
          <motion.div
            className="room-face back"
            style={{
              position: 'absolute',
              width: '800px',
              height: '600px',
              background: `url('https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80')`,
              backgroundSize: 'cover',
              transform: 'translateZ(-400px) rotateY(180deg)'
            }}
          />

          {/* Left Wall */}
          <motion.div
            className="room-face left"
            style={{
              position: 'absolute',
              width: '800px',
              height: '600px',
              background: `url('https://images.unsplash.com/photo-1578898886595-11772a0c7ba6?w=800&q=80')`,
              backgroundSize: 'cover',
              transform: 'rotateY(-90deg) translateZ(400px)'
            }}
          />

          {/* Right Wall */}
          <motion.div
            className="room-face right"
            style={{
              position: 'absolute',
              width: '800px',
              height: '600px',
              background: `url('https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80')`,
              backgroundSize: 'cover',
              transform: 'rotateY(90deg) translateZ(400px)'
            }}
          />

          {/* Floor */}
          <motion.div
            className="room-face floor"
            style={{
              position: 'absolute',
              width: '800px',
              height: '800px',
              background: `repeating-linear-gradient(
                90deg,
                #8B4513 0px,
                #8B4513 100px,
                #A0522D 100px,
                #A0522D 200px
              )`,
              transform: 'rotateX(-90deg) translateZ(300px)'
            }}
          />

          {/* Ceiling */}
          <motion.div
            className="room-face ceiling"
            style={{
              position: 'absolute',
              width: '800px',
              height: '800px',
              background: 'radial-gradient(circle, #f0f0f0, #e0e0e0)',
              transform: 'rotateX(90deg) translateZ(300px)'
            }}
          />
        </div>

        {/* Floating furniture */}
        <FloatingFurniture />
      </motion.div>

      {/* Controls */}
      <div className="room-controls">
        <motion.button
          className="control-btn prev-btn"
          onClick={prevView}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          ←
        </motion.button>
        
        <div className="view-indicator">
          {views.map((view, index) => (
            <motion.div
              key={index}
              className={`view-dot ${index === currentView ? 'active' : ''}`}
              onClick={() => setCurrentView(index)}
              whileHover={{ scale: 1.2 }}
              animate={{
                scale: index === currentView ? 1.3 : 1,
                opacity: index === currentView ? 1 : 0.5
              }}
            />
          ))}
        </div>

        <motion.button
          className="control-btn next-btn"
          onClick={nextView}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          →
        </motion.button>

        <motion.button
          className="vr-btn"
          onClick={toggleVR}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isVRMode ? '🔙' : '🥽'} {isVRMode ? 'Exit VR' : 'VR Mode'}
        </motion.button>
      </div>

      {/* Room Info Overlay */}
      <motion.div
        className="room-info-overlay"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h4>{views[currentView].name}</h4>
        <p>マウスを動かして視点を変更</p>
      </motion.div>
    </div>
  );
};

// Floating furniture components
const FloatingFurniture = () => {
  return (
    <>
      {/* Bed */}
      <motion.div
        className="furniture bed"
        style={{
          position: 'absolute',
          width: '200px',
          height: '100px',
          background: '#8B4513',
          transform: 'translate3d(-100px, 200px, 100px)',
          borderRadius: '10px'
        }}
        animate={{
          y: [0, -10, 0],
          rotateY: [0, 5, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Table */}
      <motion.div
        className="furniture table"
        style={{
          position: 'absolute',
          width: '80px',
          height: '80px',
          background: '#654321',
          transform: 'translate3d(150px, 250px, 200px)',
          borderRadius: '5px'
        }}
        animate={{
          rotateY: [0, 360]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Lamp */}
      <motion.div
        className="furniture lamp"
        style={{
          position: 'absolute',
          width: '30px',
          height: '100px',
          background: 'linear-gradient(to top, #gold, #yellow)',
          transform: 'translate3d(150px, 150px, 200px)',
          borderRadius: '15px'
        }}
        animate={{
          opacity: [0.7, 1, 0.7],
          boxShadow: [
            '0 0 20px rgba(255,255,0,0.3)',
            '0 0 40px rgba(255,255,0,0.6)',
            '0 0 20px rgba(255,255,0,0.3)'
          ]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </>
  );
};

// AR Room Visualizer
export const ARRoomVisualizer = ({ className = "" }) => {
  const [isARActive, setIsARActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef();

  const startAR = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraStream(stream);
      setIsARActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.warn('AR not supported:', error);
      alert('ARカメラにアクセスできません。デスクトップでは制限があります。');
    }
  };

  const stopAR = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsARActive(false);
  };

  return (
    <div className={`ar-room-visualizer ${className}`}>
      {!isARActive ? (
        <motion.div
          className="ar-start-screen"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            padding: '40px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            color: 'white'
          }}
        >
          <motion.div
            className="ar-icon"
            animate={{
              rotateY: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity
            }}
            style={{ fontSize: '4rem', marginBottom: '20px' }}
          >
            🏠📱
          </motion.div>
          <h3>AR客室プレビュー</h3>
          <p>カメラを使って仮想的に客室を配置します</p>
          <motion.button
            className="ar-start-btn"
            onClick={startAR}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            ARを開始
          </motion.button>
        </motion.div>
      ) : (
        <div className="ar-active-view" style={{ position: 'relative' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '400px',
              objectFit: 'cover',
              borderRadius: '12px'
            }}
          />
          
          {/* AR Overlays */}
          <div className="ar-overlays" style={{ position: 'absolute', inset: 0 }}>
            <motion.div
              className="virtual-room"
              style={{
                position: 'absolute',
                bottom: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '200px',
                height: '150px',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }}
              animate={{
                y: [0, -10, 0],
                rotateY: [0, 5, -5, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity
              }}
            >
              <div style={{ padding: '10px', color: 'white', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem' }}>🏨</div>
                <div style={{ fontSize: '12px' }}>スイートルーム</div>
                <div style={{ fontSize: '10px' }}>¥25,000/泊</div>
              </div>
            </motion.div>

            {/* AR Controls */}
            <motion.button
              className="ar-stop-btn"
              onClick={stopAR}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,0,0,0.7)',
                border: 'none',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer'
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

// 360° Panorama Viewer
export const PanoramaViewer = ({ panoramaUrl, className = "" }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const containerRef = useRef();

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMouse.x;
    const deltaY = e.clientY - lastMouse.y;

    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x - deltaY * 0.5)),
      y: prev.y + deltaX * 0.5
    }));

    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={`panorama-viewer ${className}`}
      style={{
        width: '100%',
        height: '500px',
        perspective: '1000px',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        borderRadius: '12px',
        background: 'radial-gradient(circle, #1a1a2e, #16213e)'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <motion.div
        className="panorama-sphere"
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d'
        }}
        animate={{
          rotateX: rotation.x,
          rotateY: rotation.y
        }}
        transition={{ duration: 0.1 }}
      >
        <div
          className="panorama-surface"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${panoramaUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '12px',
            transform: 'translateZ(-250px) scale(2)'
          }}
        />
      </motion.div>

      {/* Panorama Controls */}
      <div 
        className="panorama-controls"
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px'
        }}
      >
        <motion.button
          onClick={() => setRotation({ x: 0, y: 0 })}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          リセット
        </motion.button>
        
        <motion.div
          style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'white',
            fontSize: '12px'
          }}
        >
          ドラッグして回転
        </motion.div>
      </div>
    </div>
  );
};

export default {
  HotelRoom3D,
  ARRoomVisualizer,
  PanoramaViewer
};