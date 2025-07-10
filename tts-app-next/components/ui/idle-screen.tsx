import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Users, MessageCircle, ArrowLeft } from 'lucide-react';

interface IdleScreenProps {
  isVisible?: boolean;
  onDismiss?: () => void;
  title?: string;
  description?: string;
  callToAction?: string;
  demoGifUrl?: string;
}

const IdleScreen: React.FC<IdleScreenProps> = ({
  isVisible = true,
  onDismiss = () => {},
  title = "Welcome Back!",
  description = "Ask information about teachers from college faculty. Get instant access to faculty details, office hours, and contact information to enhance your academic experience.",
  callToAction = "Tap anywhere to continue",
  demoGifUrl = "https://i.pinimg.com/originals/71/fb/91/71fb9176f16357776802391df14b4e40.gif"
}) => {
  const [showPulse, setShowPulse] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Resetar para a primeira tela quando o IdleScreen reaparece
      setShowDemo(false);
      setShowPulse(false);
      
      const timer = setTimeout(() => setShowPulse(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleClick = () => {
    if (showDemo) {
      onDismiss();
    } else {
      setShowDemo(true);
    }
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDemo(false);
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

  const slideVariants = {
    center: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    left: {
      x: "-100%",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  };

  const demoVariants = {
    hidden: {
      x: "100%",
      opacity: 0
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
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
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 via-cyan-500 via-purple-500 via-violet-500 to-pink-500 dark:from-green-600 dark:via-teal-700 dark:via-blue-700 dark:via-purple-700 dark:to-pink-600"></div>
            <div className="absolute inset-0 bg-gradient-to-tl from-green-400 via-emerald-500 via-teal-500 to-cyan-400 opacity-35"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-400 via-teal-400 via-blue-500 to-purple-600 opacity-25"></div>
            <div className="absolute inset-0 bg-gradient-to-bl from-purple-400 via-violet-500 via-fuchsia-500 to-pink-500 opacity-30"></div>
            
            {/* Mathematical Symbols */}
            <div className="absolute inset-0 opacity-30">
              {/* Mathematics */}
              <motion.div 
                className="absolute top-20 left-16 text-6xl font-bold text-yellow-300 drop-shadow-lg"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              >
                ∫
              </motion.div>
              <motion.div 
                className="absolute top-40 right-20 text-4xl font-bold text-pink-400 drop-shadow-lg"
                animate={{ y: [0, -10, 10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                π
              </motion.div>
              
              {/* Physics */}
              <motion.div 
                className="absolute bottom-32 left-24 text-5xl font-bold text-lime-400 drop-shadow-lg"
                animate={{ scale: [1, 1.1, 0.9, 1] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              >
                E=mc²
              </motion.div>
              <motion.div 
                className="absolute top-60 left-1/4 text-3xl font-bold text-emerald-400 drop-shadow-lg"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              >
                ∆
              </motion.div>
              
              {/* Chemistry */}
              <motion.div 
                className="absolute bottom-20 right-32 text-4xl font-bold text-red-400 drop-shadow-lg"
                animate={{ x: [0, 15, -15, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              >
                H₂O
              </motion.div>
              <motion.div 
                className="absolute top-80 right-1/4 text-3xl font-bold text-orange-400 drop-shadow-lg"
                animate={{ y: [0, 8, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                ⚛
              </motion.div>
              
              {/* Statistics */}
              <motion.div 
                className="absolute bottom-60 left-1/3 text-4xl font-bold text-violet-400 drop-shadow-lg"
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
              >
                σ
              </motion.div>
              <motion.div 
                className="absolute top-32 left-1/2 text-3xl font-bold text-cyan-400 drop-shadow-lg"
                animate={{ scale: [1, 0.8, 1.2, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              >
                Σ
              </motion.div>
            </div>
            
            {/* Geometric Patterns */}
            <div className="absolute inset-0 opacity-20">
              <motion.div 
                className="absolute top-16 right-16 w-32 h-32 border-4 border-cyan-300 rounded-full shadow-lg"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              ></motion.div>
              <motion.div 
                className="absolute bottom-24 left-20 w-24 h-24 border-4 border-magenta-400 transform rotate-45 shadow-lg"
                animate={{ rotate: [45, 90, 135, 45] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              ></motion.div>
              <motion.div 
                className="absolute top-1/2 left-12 w-16 h-16 border-4 border-lime-400 shadow-lg"
                animate={{ rotate: [0, 180, 360] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              ></motion.div>
              <motion.div 
                className="absolute bottom-40 right-24 w-20 h-20 border-4 border-orange-400 rounded-full shadow-lg"
                animate={{ scale: [1, 1.2, 0.8, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              ></motion.div>
            </div>
            
            {/* Floating Particles */}
            <div className="absolute inset-0 opacity-60">
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 rounded-full shadow-lg"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -40, 0],
                    x: [0, Math.random() * 30 - 15, 0],
                    opacity: [0.4, 1, 0.4],
                    scale: [1, 1.5, 1],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-15">
              <div 
                className="w-full h-full"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(34, 197, 94, 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px'
                }}
              ></div>
            </div>
          </div>

          {/* Main Content Container */}
          <div className="relative w-full h-full flex">
            {/* Welcome Content */}
            <motion.div 
              className="w-full flex items-center justify-center"
              variants={slideVariants}
              animate={showDemo ? "left" : "center"}
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
                       {showDemo ? "Tap to continue" : callToAction}
                     </span>
                   </div>
                </motion.div>

                                 {/* Decorative Elements */}
                 <motion.div
                   className="absolute -top-4 -right-4 w-2 h-2 bg-white rounded-full"
                   animate={{
                     scale: [1, 1.5, 1],
                     opacity: [0.5, 1, 0.5]
                   }}
                   transition={{
                     duration: 3,
                     repeat: Infinity,
                     ease: "easeInOut"
                   }}
                 />
                 <motion.div
                   className="absolute -bottom-4 -left-4 w-3 h-3 bg-white/60 rounded-full"
                   animate={{
                     scale: [1, 1.3, 1],
                     opacity: [0.3, 0.8, 0.3]
                   }}
                   transition={{
                     duration: 4,
                     repeat: Infinity,
                     ease: "easeInOut",
                     delay: 1
                   }}
                 />
              </motion.div>
            </motion.div>

            {/* Demo Content */}
            <AnimatePresence>
              {showDemo && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  variants={demoVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                                     {/* Back Button */}
                   <motion.button
                     className="absolute top-8 left-8 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10"
                     onClick={handleBackClick}
                     whileHover={{ scale: 1.1 }}
                     whileTap={{ scale: 0.9 }}
                   >
                     <ArrowLeft className="w-6 h-6 text-white" />
                   </motion.button>

                  {/* Demo Content */}
                  <div className="max-w-2xl mx-auto px-8 text-center">
                                         <motion.h2 
                       className="text-3xl font-bold text-white mb-6"
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: 0.2 }}
                     >
                       See How It Works
                     </motion.h2>

                    <motion.div
                      className="relative rounded-2xl overflow-hidden shadow-2xl bg-card border border-border"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                    >
                      <img
                        src={demoGifUrl}
                        alt="App Demo"
                        className="w-full h-auto max-h-96 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </motion.div>

                                         <motion.p 
                       className="text-gray-200 mt-6 text-lg"
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: 0.6 }}
                     >
                       Experience seamless faculty information access with our intuitive interface
                     </motion.p>

                                         <motion.div
                       className="mt-8 inline-flex items-center justify-center px-6 py-3 border-2 border-dashed border-white/40 rounded-full bg-white/10"
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: 0.8 }}
                     >
                       <span className="text-sm font-medium text-white">
                         Tap anywhere to start using the app
                       </span>
                     </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IdleScreen; 