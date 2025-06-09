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
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md cursor-pointer"
          onClick={handleClick}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-32 h-32 border border-border rounded-full"></div>
            <div className="absolute top-32 right-16 w-24 h-24 border border-border rounded-full"></div>
            <div className="absolute bottom-20 left-20 w-40 h-40 border border-border rounded-full"></div>
            <div className="absolute bottom-32 right-10 w-28 h-28 border border-border rounded-full"></div>
          </div>

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
                className="p-3 bg-primary/10 rounded-full"
                variants={iconVariants}
              >
                <GraduationCap className="w-8 h-8 text-primary" />
              </motion.div>
              <motion.div
                className="p-3 bg-primary/10 rounded-full"
                variants={iconVariants}
                transition={{ delay: 0.1 }}
              >
                <Users className="w-8 h-8 text-primary" />
              </motion.div>
              <motion.div
                className="p-3 bg-primary/10 rounded-full"
                variants={iconVariants}
                transition={{ delay: 0.2 }}
              >
                <MessageCircle className="w-8 h-8 text-primary" />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h1 
              className="text-4xl font-bold text-foreground mb-6 tracking-tight"
              variants={itemVariants}
            >
              {title}
            </motion.h1>

            {/* Description */}
            <motion.p 
              className="text-lg text-muted-foreground leading-relaxed mb-12 max-w-sm mx-auto"
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
              <div className="inline-flex items-center justify-center px-6 py-3 border-2 border-dashed border-primary/30 rounded-full bg-primary/5">
                <span className="text-sm font-medium text-primary">
                  {callToAction}
                </span>
              </div>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div
              className="absolute -top-4 -right-4 w-2 h-2 bg-primary rounded-full"
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
              className="absolute -bottom-4 -left-4 w-3 h-3 bg-primary/60 rounded-full"
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
      )}
    </AnimatePresence>
  );
};

export default IdleScreen; 