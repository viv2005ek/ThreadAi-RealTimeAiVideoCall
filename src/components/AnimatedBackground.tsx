import { motion } from 'framer-motion';

interface FloatingObject {
  id: number;
  size: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  color: string;
}

export default function AnimatedBackground({ showFloatingObjects = false }: { showFloatingObjects?: boolean }) {
  const floatingObjects: FloatingObject[] = [
    { id: 1, size: 60, x: 10, y: 20, delay: 0, duration: 25, color: 'rgba(59, 130, 246, 0.15)' },
    { id: 2, size: 40, x: 80, y: 30, delay: 2, duration: 22, color: 'rgba(6, 182, 212, 0.12)' },
    { id: 3, size: 50, x: 25, y: 70, delay: 4, duration: 28, color: 'rgba(139, 92, 246, 0.1)' },
    { id: 4, size: 35, x: 70, y: 60, delay: 1, duration: 24, color: 'rgba(59, 130, 246, 0.12)' },
    { id: 5, size: 45, x: 50, y: 40, delay: 3, duration: 26, color: 'rgba(6, 182, 212, 0.1)' },
    { id: 6, size: 30, x: 15, y: 50, delay: 5, duration: 23, color: 'rgba(59, 130, 246, 0.1)' },
    { id: 7, size: 55, x: 85, y: 80, delay: 2.5, duration: 27, color: 'rgba(139, 92, 246, 0.12)' },
  ];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

      <motion.div
        className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute bottom-0 left-0 w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, -80, 0],
          y: [0, -60, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
          filter: 'blur(70px)',
          x: '-50%',
          y: '-50%',
        }}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {showFloatingObjects && floatingObjects.map((obj) => (
        <motion.div
          key={obj.id}
          className="absolute rounded-full"
          style={{
            width: obj.size,
            height: obj.size,
            left: `${obj.x}%`,
            top: `${obj.y}%`,
            background: `radial-gradient(circle, ${obj.color} 0%, transparent 70%)`,
            filter: 'blur(25px)',
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, 50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: obj.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: obj.delay,
          }}
        />
      ))}

      <div className="absolute inset-0 cyber-grid opacity-20" />
    </div>
  );
}
