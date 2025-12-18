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
                    {/* Gemini Spark */}
                    <div className="relative flex items-center justify-center">
                        <motion.div
                            className="w-16 h-8 rounded-full bg-linear-to-r from-blue-600 to-sky-400"
                            animate={{
                                scale: [1, 1.15, 1],
                                opacity: [0.75, 1, 0.75],
                                boxShadow: [
                                    "0 0 0 0px rgba(59, 130, 246, 0.25)",
                                    "0 0 0 12px rgba(59, 130, 246, 0)",
                                    "0 0 0 0px rgba(59, 130, 246, 0.25)"
                                ]
                            }}
                            transition={{
                                duration: 2.2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                        {[0, 1, 2].map((spark) => (
                            <motion.span
                                key={spark}
                                className="absolute h-2 w-2 rounded-full bg-sky-400"
                                animate={{
                                    y: [-6, -18, -6],
                                    x: [spark * 6 - 6, spark * 10 - 10, spark * 6 - 6],
                                    opacity: [0, 1, 0]
                                }}
                                transition={{
                                    duration: 1.6,
                                    delay: spark * 0.3,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}
                    </div>

                    {/* Progress Text */}
                    <motion.div
                        className="mt-8 font-mono text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-sky-400"
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
