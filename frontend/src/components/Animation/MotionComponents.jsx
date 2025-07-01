// World-class animation components using Framer Motion
import React from 'react';
import { motion, AnimatePresence, useSpring, useInView, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

// Premium entrance animations
export const PageEntranceAnimation = ({ children, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay
      }}
    >
      {children}
    </motion.div>
  );
};

// Staggered card animations
export const StaggeredContainer = ({ children, className = "" }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.15
      }
    }
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
};

export const StaggeredItem = ({ children, className = "" }) => {
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95 
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  return (
    <motion.div
      className={className}
      variants={itemVariants}
      whileHover={{ 
        scale: 1.02,
        y: -5,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
};

// Scroll-triggered animations
export const ScrollReveal = ({ children, direction = "up", distance = 60 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: distance };
      case 'down': return { y: -distance };
      case 'left': return { x: distance };
      case 'right': return { x: -distance };
      default: return { y: distance };
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0, 
        ...getInitialPosition()
      }}
      animate={isInView ? { 
        opacity: 1, 
        x: 0, 
        y: 0 
      } : {}}
      transition={{
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {children}
    </motion.div>
  );
};

// Premium hover effects
export const PremiumHoverCard = ({ children, className = "" }) => {
  return (
    <motion.div
      className={className}
      whileHover={{
        scale: 1.03,
        rotateY: 5,
        z: 50,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 10
        }
      }}
      whileTap={{ scale: 0.97 }}
      style={{
        transformPerspective: 1000,
        transformStyle: "preserve-3d"
      }}
    >
      <motion.div
        whileHover={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          y: -8
        }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// Floating elements
export const FloatingElement = ({ children, intensity = 1, duration = 3 }) => {
  const float = useSpring(0, {
    stiffness: 100,
    damping: 10
  });

  React.useEffect(() => {
    const animate = () => {
      float.set(intensity * 10);
      setTimeout(() => float.set(-intensity * 10), duration * 500);
    };

    const interval = setInterval(animate, duration * 1000);
    return () => clearInterval(interval);
  }, [float, intensity, duration]);

  return (
    <motion.div
      style={{ y: float }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 10
      }}
    >
      {children}
    </motion.div>
  );
};

// Morphing button
export const MorphingButton = ({ 
  children, 
  onClick, 
  className = "",
  disabled = false,
  variant = "primary"
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  const buttonVariants = {
    idle: {
      scale: 1,
      boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1)",
      background: variant === "primary" 
        ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
    },
    hover: {
      scale: 1.05,
      boxShadow: "0 20px 40px -3px rgba(0, 0, 0, 0.15)",
      background: variant === "primary"
        ? "linear-gradient(135deg, #764ba2 0%, #667eea 100%)"
        : "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)"
    },
    tap: {
      scale: 0.95,
      boxShadow: "0 5px 15px -3px rgba(0, 0, 0, 0.1)"
    }
  };

  return (
    <motion.button
      className={`morphing-button ${className}`}
      variants={buttonVariants}
      initial="idle"
      whileHover={!disabled ? "hover" : "idle"}
      whileTap={!disabled ? "tap" : "idle"}
      onClick={onClick}
      disabled={disabled}
      onTapStart={() => setIsPressed(true)}
      onTapCancel={() => setIsPressed(false)}
      onTap={() => setIsPressed(false)}
      style={{
        border: "none",
        borderRadius: "12px",
        padding: "12px 24px",
        color: "white",
        fontWeight: "600",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1
      }}
    >
      <motion.span
        animate={isPressed ? { scale: 0.9 } : { scale: 1 }}
        transition={{ duration: 0.1 }}
      >
        {children}
      </motion.span>
    </motion.button>
  );
};

// Parallax scrolling
export const ParallaxContainer = ({ children, speed = 0.5 }) => {
  const ref = useRef(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 1000 * speed]);

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className="parallax-container"
    >
      {children}
    </motion.div>
  );
};

// Loading transitions
export const LoadingTransition = ({ isLoading, children }) => {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="loading-container"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="loading-spinner"
          >
            ⭐
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Text reveal animation
export const TextReveal = ({ text, className = "" }) => {
  const words = text.split(" ");

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.1
      }
    }
  };

  const child = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={child}
          style={{ display: "inline-block", marginRight: "0.25em" }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

// Magnetic effect
export const MagneticElement = ({ children, strength = 0.3 }) => {
  const ref = useRef(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;
    
    setPosition({ x: deltaX, y: deltaY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: "inline-block" }}
    >
      {children}
    </motion.div>
  );
};

export default {
  PageEntranceAnimation,
  StaggeredContainer,
  StaggeredItem,
  ScrollReveal,
  PremiumHoverCard,
  FloatingElement,
  MorphingButton,
  ParallaxContainer,
  LoadingTransition,
  TextReveal,
  MagneticElement
};