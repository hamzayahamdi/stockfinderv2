import React from 'react';
import { motion } from 'framer-motion';
import { FiDatabase, FiServer, FiCpu } from 'react-icons/fi';

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = "Chargement des données...",
  progress 
}) => {
  const steps = [
    { icon: FiServer, label: "Connexion au serveur" },
    { icon: FiDatabase, label: "Chargement des données" },
    { icon: FiCpu, label: "Calcul des statistiques" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-50" />
        
        {/* Loading Pulse */}
        <div className="relative">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100" />
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-blue-500"
                style={{
                  borderRightColor: 'transparent',
                  borderBottomColor: 'transparent',
                }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  ease: "linear",
                  repeat: Infinity,
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="flex items-center gap-3 text-slate-600"
              >
                <step.icon className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">{step.label}</span>
                <div className="flex-1 h-[1px] bg-blue-100" />
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.3 + 0.5 }}
                  className="w-5 h-5 rounded-full border-2 border-blue-200 flex items-center justify-center"
                >
                  <motion.div
                    animate={{
                      scale: [1, 0.8, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-2 h-2 rounded-full bg-blue-500"
                  />
                </motion.div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <motion.p
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-sm text-blue-600 font-medium"
            >
              {message}
            </motion.p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
