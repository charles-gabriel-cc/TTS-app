import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Users, MessageCircle } from 'lucide-react';

interface IdleScreenProps {
  isVisible?: boolean;
  onDismiss?: () => void;
  title?: string;
  description?: string;
  callToAction?: string;
}

const IdleScreen: React.FC<IdleScreenProps> = ({
  isVisible = true,
  onDismiss = () => {},
  title = "Welcome Back!",
  description = "Ask information about teachers from college faculty. Get instant access to faculty details, office hours, and contact information to enhance your academic experience.",
  callToAction = "Tap anywhere to continue"
}) => {
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowPulse(false);
      
      const timer = setTimeout(() => setShowPulse(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleClick = () => {
    onDismiss();
  };

  const containerVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.95
    },
    visible: { 
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        staggerChildren: 0.2
      }
    },
    exit: {
      opacity: 0,
      scale: 1.05,
      transition: {
        duration: 0.3,
        ease: "easeIn"
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0,
      y: 20
    },
    visible: { 
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };



  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md cursor-pointer overflow-hidden"
          onClick={handleClick}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Academic Background Pattern */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Gradient Background - MESMO ESQUEMA DO CHAT */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 via-cyan-500 via-purple-500 via-violet-500 to-pink-500 dark:from-green-600 dark:via-teal-700 dark:via-blue-700 dark:via-purple-700 dark:to-pink-600"></div>
            <div className="absolute inset-0 bg-gradient-to-tl from-green-400 via-emerald-500 via-teal-500 to-cyan-400 opacity-35"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-400 via-teal-400 via-blue-500 to-purple-600 opacity-25"></div>
            <div className="absolute inset-0 bg-gradient-to-bl from-purple-400 via-violet-500 via-fuchsia-500 to-pink-500 opacity-30"></div>
            
            {/* Mathematical Symbols - CORES IGUAIS AO CHAT */}
            <div className="absolute inset-0 opacity-25">
              <motion.div 
                className="absolute top-20 left-16 text-5xl font-bold text-yellow-300"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                style={{ willChange: 'transform' }}
              >
                ∫
              </motion.div>
              <motion.div 
                className="absolute top-40 right-20 text-4xl font-bold text-pink-400"
                animate={{ y: [0, -8, 8, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                style={{ willChange: 'transform' }}
              >
                π
              </motion.div>
              
              <motion.div 
                className="absolute bottom-32 left-24 text-4xl font-bold text-lime-400"
                animate={{ scale: [1, 1.05, 0.95, 1] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                style={{ willChange: 'transform' }}
              >
                E=mc²
              </motion.div>
              <motion.div 
                className="absolute bottom-20 right-32 text-3xl font-bold text-cyan-400"
                animate={{ rotate: [0, 6, -6, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                style={{ willChange: 'transform' }}
              >
                ⚛
              </motion.div>
            </div>
            
            {/* Geometric Patterns - CORES IGUAIS AO CHAT */}
            <div className="absolute inset-0 opacity-15">
              <motion.div 
                className="absolute top-16 right-16 w-24 h-24 border-2 border-cyan-300 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                style={{ willChange: 'transform' }}
              ></motion.div>
              <motion.div 
                className="absolute bottom-32 left-20 w-16 h-16 border-2 border-lime-400"
                animate={{ rotate: [0, 90, 180, 270, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{ willChange: 'transform' }}
              ></motion.div>
            </div>
            
            {/* Floating Particles - CORES IGUAIS AO CHAT */}
            <div className="absolute inset-0 opacity-50">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-cyan-400 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    willChange: 'transform, opacity'
                  }}
                  animate={{
                    y: [0, -25, 0],
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{
                    duration: 4 + Math.random() * 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>
            
            {/* Grid Pattern - IGUAL AO CHAT */}
            <div className="absolute inset-0 opacity-10">
              <div 
                className="w-full h-full"
                style={{
                  backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.2) 1px, transparent 1px)`,
                  backgroundSize: '60px 60px'
                }}
              ></div>
            </div>
          </div>

          {/* Main Content Container */}
          <div className="relative w-full h-full flex">
            {/* Welcome Content */}
            <motion.div 
              className="w-full flex items-center justify-center"
            >
              <motion.div 
                className="relative max-w-md mx-auto px-8 py-12 text-center"
                variants={containerVariants}
              >
                {/* Icon Group */}
                <motion.div 
                  className="flex justify-center items-center space-x-4 mb-8"
                  variants={itemVariants}
                >
                  <motion.div
                    className="p-3 bg-white/10 rounded-full"
                    variants={iconVariants}
                  >
                    <GraduationCap className="w-8 h-8 text-white" />
                  </motion.div>
                  <motion.div
                    className="p-3 bg-white/10 rounded-full"
                    variants={iconVariants}
                    transition={{ delay: 0.1 }}
                  >
                    <Users className="w-8 h-8 text-white" />
                  </motion.div>
                  <motion.div
                    className="p-3 bg-white/10 rounded-full"
                    variants={iconVariants}
                    transition={{ delay: 0.2 }}
                  >
                    <MessageCircle className="w-8 h-8 text-white" />
                  </motion.div>
                </motion.div>

                                 {/* Title */}
                 <motion.h1 
                   className="text-4xl font-bold text-white mb-6 tracking-tight"
                   variants={itemVariants}
                 >
                   {title}
                 </motion.h1>

                 {/* Description */}
                 <motion.p 
                   className="text-lg text-gray-200 leading-relaxed mb-12 max-w-sm mx-auto"
                   variants={itemVariants}
                 >
                   {description}
                 </motion.p>

                {/* Call to Action */}
                <motion.div
                  variants={itemVariants}
                  animate={showPulse ? "pulse" : "visible"}
                  {...(showPulse && { variants: pulseVariants })}
                >
                                     <div className="inline-flex items-center justify-center px-6 py-3 border-2 border-dashed border-white/40 rounded-full bg-white/10">
                     <span className="text-sm font-medium text-white">
                       {callToAction}
                     </span>
                   </div>
                </motion.div>

                                 {/* Decorative Elements - OTIMIZADO PARA PERFORMANCE */}
                 <motion.div
                   className="absolute -top-4 -right-4 w-2 h-2 bg-white rounded-full"
                   animate={{
                     opacity: [0.4, 0.8, 0.4]
                   }}
                   transition={{
                     duration: 4,
                     repeat: Infinity,
                     ease: "easeInOut"
                   }}
                   style={{ willChange: 'opacity' }}
                 />
                 <motion.div
                   className="absolute -bottom-4 -left-4 w-2 h-2 bg-white/50 rounded-full"
                   animate={{
                     opacity: [0.3, 0.6, 0.3]
                   }}
                   transition={{
                     duration: 5,
                     repeat: Infinity,
                     ease: "easeInOut",
                     delay: 1.5
                   }}
                   style={{ willChange: 'opacity' }}
                 />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IdleScreen; 