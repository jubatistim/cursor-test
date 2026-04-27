import { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

// Configuration constants
const PARTICLE_COUNT = 150;
const ANIMATION_DURATION_MS = 5000;
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD700'];

/**
 * Confetti component - renders animated celebration particles
 * Used for winner celebration effects on the end screen
 */
export function Confetti() {
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);
  const startTimeRef = useRef(null);

  const createParticles = useCallback((canvas) => {
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: Math.random() * 6 - 3,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 3 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        angle: Math.random() * 360,
        angleVelocity: Math.random() * 10 - 5
      });
    }
    return particles;
  }, []);

  const animate = useCallback((canvas, ctx, particles, onComplete) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let allOffScreen = true;
    
    // Update and draw particles
    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // gravity
      particle.angle += particle.angleVelocity;

      // Check if particle is still visible
      if (particle.y < canvas.height) {
        allOffScreen = false;
      }

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.angle * Math.PI / 180);
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 1.5);
      ctx.restore();
    });

    // Continue animation if particles still visible or within duration
    if (!allOffScreen && Date.now() - startTimeRef.current < ANIMATION_DURATION_MS) {
      animationIdRef.current = requestAnimationFrame(() => animate(canvas, ctx, particles, onComplete));
    } else {
      onComplete?.();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    // Create particles
    const particles = createParticles(canvas);
    startTimeRef.current = Date.now();

    // Initial render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Start animation
    animationIdRef.current = requestAnimationFrame(() => 
      animate(canvas, ctx, particles, () => {})
    );

    // Handle window resize - cancel and restart animation
    const handleResize = () => {
      // Cancel current animation
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      // Resize canvas
      const newDpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * newDpr;
      canvas.height = window.innerHeight * newDpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      // Restart animation with new particles
      startTimeRef.current = Date.now();
      const newParticles = createParticles(canvas);
      animationIdRef.current = requestAnimationFrame(() => 
        animate(canvas, ctx, newParticles, () => {})
      );
    };

    window.addEventListener('resize', handleResize);

    return () => {
      // Cleanup animation frame
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      // Cleanup event listener
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="confetti"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    />
  );
}

Confetti.propTypes = {
  // No props currently, but element accepts test ids
};
