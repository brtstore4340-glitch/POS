import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingScreen = ({ isLoading, progress }) => {
    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
                >
                    {/* Gemini-style Capsule Animation */}
                    <motion.div
                        className="w-16 h-8 rounded-full bg-linear-to-r from-purple-600 to-blue-500"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.8, 1, 0.8],
                            boxShadow: [
                                "0 0 0 0px rgba(139, 92, 246, 0.3)",
                                "0 0 0 10px rgba(59, 130, 246, 0)",
                                "0 0 0 0px rgba(139, 92, 246, 0.3)"
                            ]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    {/* Progress Text */}
                    <motion.div
                        className="mt-8 font-mono text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-600 to-blue-500"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {progress}%
                    </motion.div>

                    <p className="mt-2 text-slate-400 text-sm">Synchronizing Data...</p>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoadingScreen;
