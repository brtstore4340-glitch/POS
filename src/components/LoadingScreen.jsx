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
                    {/* Brand Logo - Top */}
                    <motion.div
                        className="absolute top-8 left-8 flex items-center gap-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <img
                            src="https://store.boots.co.th/images/boots-logo.png"
                            alt="Boots"
                            className="h-8 w-auto"
                        />
                        <div className="text-sm font-bold text-slate-700">BOOTS POS</div>
                    </motion.div>

                    {/* Gemini Spark - 4-pointed star with gradient purple-blue */}
                    <div className="relative flex items-center justify-center mb-8">
                        {/* Center Core */}
                        <motion.div
                            className="absolute w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400"
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.8, 1, 0.8],
                            }}
                            transition={{
                                duration: 1.8,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />

                        {/* 4 Sparks at cardinal points */}
                        {[0, 90, 180, 270].map((angle) => (
                            <motion.div
                                key={angle}
                                className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-blue-400"
                                style={{
                                    transformOrigin: '0 0',
                                }}
                                animate={{
                                    x: Math.cos(angle * Math.PI / 180) * 24,
                                    y: Math.sin(angle * Math.PI / 180) * 24,
                                    scale: [0.3, 1, 0.3],
                                    opacity: [0, 1, 0],
                                }}
                                transition={{
                                    duration: 1.4,
                                    delay: angle / 180 * 0.2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}

                        {/* Outer Pulse Ring */}
                        <motion.div
                            className="absolute w-20 h-20 border-2 border-transparent rounded-full"
                            style={{
                                borderImage: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%) 1',
                            }}
                            animate={{
                                scale: [1, 1.4, 1],
                                opacity: [1, 0.2, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    </div>

                    {/* Progress Text */}
                    <motion.div
                        className="mt-8 font-mono text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-400"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {progress}%
                    </motion.div>

                    <p className="mt-3 text-slate-400 text-sm font-medium">กำลังโหลดข้อมูล...</p>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoadingScreen;
