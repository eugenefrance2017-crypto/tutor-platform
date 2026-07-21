"use client";

import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import CountUp from "react-countup";

// 🎉 Конфетти при достижении
export function CelebrationConfetti({ show }: { show: boolean }) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      const handleResize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  if (!show || windowSize.width === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        colors={['#fbbf24', '#f59e0b', '#fcd34d', '#d97706', '#fde68a']}
        recycle={false}
        numberOfPieces={300}
        gravity={0.3}
        initialVelocityY={20}
        tweenDuration={5000}
      />
    </div>
  );
}

// ✨ Плавающие частицы на фоне
export function FloatingParticles({ count = 30 }: { count?: number }) {
  const particles = Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 10,
    duration: 10 + Math.random() * 20,
    size: 1 + Math.random() * 3,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-amber-400/20 animate-float"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size * 4}px`,
            height: `${p.size * 4}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// 💫 Glow карточка
export function GlowCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`group relative ${className}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500 bg-[length:200%_100%] animate-gradient" />
      <div className="relative bg-zinc-900 rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// 🔢 Анимированное число
export function AnimatedNumber({ 
  value, 
  duration = 2, 
  suffix = "", 
  className = "" 
}: { 
  value: number; 
  duration?: number; 
  suffix?: string;
  className?: string;
}) {
  return (
    <CountUp
      end={value}
      duration={duration}
      suffix={suffix}
      separator=","
      decimals={value % 1 !== 0 ? 1 : 0}
      className={className}
    />
  );
}

// ⚡ Shimmer эффект (скелетон загрузки)
export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-stone-800 rounded-xl ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent animate-shimmer" />
    </div>
  );
}

// 🎯 Прогресс-бар с эффектами
export function GoldenProgressBar({ progress, className = "" }: { progress: number; className?: string }) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  return (
    <div className={`relative h-3 bg-stone-800 rounded-full overflow-hidden ${className}`}>
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-[length:200%_100%] animate-gradient rounded-full shadow-lg shadow-amber-500/50 transition-all duration-1000"
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  );
}

// 🏆 Бейдж достижения
export function AchievementBadge({ 
  icon, 
  title, 
  unlocked = false 
}: { 
  icon: string; 
  title: string; 
  unlocked?: boolean;
}) {
  return (
    <div className={`relative group ${unlocked ? '' : 'opacity-50 grayscale'}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
        unlocked 
          ? 'bg-gradient-to-br from-amber-400 to-yellow-600 shadow-lg shadow-amber-500/50 animate-pulse-glow' 
          : 'bg-stone-800'
      }`}>
        {icon}
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        <span className="text-xs text-amber-400 font-bold bg-stone-900/90 px-2 py-1 rounded-lg">
          {title}
        </span>
      </div>
    </div>
  );
}

// 🔥 Streak (дни подряд)
export function StreakCounter({ days }: { days: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-3xl animate-pulse">🔥</span>
      <div>
        <p className="text-2xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
          {days}
        </p>
        <p className="text-xs text-amber-400/60 uppercase tracking-wide">дней подряд</p>
      </div>
    </div>
  );
}

// ⭐ XP бар
export function XPBar({ current, max }: { current: number; max: number }) {
  const percent = Math.round((current / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-amber-400 font-bold">⭐ {current} XP</span>
        <span className="text-amber-400/60">{max} XP</span>
      </div>
      <GoldenProgressBar progress={percent} />
    </div>
  );
}

// 🎬 Typewriter эффект
export function TypewriterText({ texts }: { texts: string[] }) {
  const [currentText, setCurrentText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (texts.length === 0) return;
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < texts[textIndex].length) {
          setCurrentText(texts[textIndex].substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (charIndex > 0) {
          setCurrentText(texts[textIndex].substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          setIsDeleting(false);
          setTextIndex((textIndex + 1) % texts.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex, texts]);

  return (
    <span className="text-amber-400 font-black">
      {currentText}
      <span className="animate-pulse">_</span>
    </span>
  );
}

// 🎨 Анимированный градиентный текст
export function GradientText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient ${className}`}>
      {children}
    </span>
  );
}

// 💎 Премиум карточка с hover эффектами
export function PremiumCard({ 
  children, 
  className = "",
  onClick
}: { 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className={`relative bg-gradient-to-br from-zinc-900 to-stone-900 rounded-2xl border border-amber-500/20 overflow-hidden transition-all duration-300 hover:border-amber-500/50 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/20 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">{children}</div>
    </div>
  );
}

// 📊 CSS анимации
export const reputationStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-20px) rotate(3deg); }
    66% { transform: translateY(-10px) rotate(-3deg); }
  }
  .animate-float {
    animation: float 10s ease-in-out infinite;
  }

  @keyframes gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .animate-gradient {
    animation: gradient 3s ease infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
    50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.6); }
  }
  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-slide-up {
    animation: slide-up 0.5s ease-out;
  }

  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-scale-in {
    animation: scale-in 0.3s ease-out;
  }
`;