import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface CompletionCelebrationProps {
    trigger: boolean;
    type?: 'lesson' | 'module' | 'course' | 'achievement';
    onComplete?: () => void;
}

/**
 * Confetti celebration animation for completions and achievements
 * 
 * @param trigger - When true, triggers the celebration
 * @param type - Type of celebration (affects intensity)
 * @param onComplete - Callback when animation completes
 */
export default function CompletionCelebration({
    trigger,
    type = 'lesson',
    onComplete,
}: CompletionCelebrationProps) {
    const hasTriggered = useRef(false);

    useEffect(() => {
        if (!trigger || hasTriggered.current) return;

        hasTriggered.current = true;

        const celebrate = async () => {
            const canvas = document.createElement('canvas');
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '9999';
            document.body.appendChild(canvas);

            const myConfetti = confetti.create(canvas, {
                resize: true,
                useWorker: true,
            });

            // Different celebration intensities based on type
            switch (type) {
                case 'lesson':
                    // Light celebration
                    await myConfetti({
                        particleCount: 50,
                        spread: 60,
                        origin: { y: 0.6 },
                        colors: ['#9333ea', '#a855f7', '#c084fc'],
                    });
                    break;

                case 'module':
                    // Medium celebration
                    await myConfetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#3b82f6', '#60a5fa', '#93c5fd'],
                    });
                    break;

                case 'course': {
                    // Heavy celebration with multiple bursts
                    const duration = 3000;
                    const end = Date.now() + duration;

                    const frame = () => {
                        myConfetti({
                            particleCount: 7,
                            angle: 60,
                            spread: 55,
                            origin: { x: 0 },
                            colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
                        });
                        myConfetti({
                            particleCount: 7,
                            angle: 120,
                            spread: 55,
                            origin: { x: 1 },
                            colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
                        });

                        if (Date.now() < end) {
                            requestAnimationFrame(frame);
                        }
                    };
                    frame();
                    break;
                }

                case 'achievement':
                    // Special celebration for achievements
                    await myConfetti({
                        particleCount: 150,
                        spread: 180,
                        origin: { y: 0.5 },
                        colors: ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#a855f7'],
                        shapes: ['star', 'circle'],
                        scalar: 1.2,
                    });
                    break;
            }

            // Clean up after animation
            setTimeout(() => {
                document.body.removeChild(canvas);
                hasTriggered.current = false;
                onComplete?.();
            }, 5000);
        };

        celebrate();
    }, [trigger, type, onComplete]);

    return null; // This component doesn't render anything visible
}
