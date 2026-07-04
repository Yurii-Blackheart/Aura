import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move, HelpCircle, ChevronDown, ChevronUp, Check, Filter, Sparkles, Compass, Star, MapPin, Ghost, Users, Calendar, Award } from 'lucide-react';

export interface LoreNode {
  id: string;
  title: string;
  category: 'центр' | 'локації' | 'монстри' | 'персонажі' | 'події' | 'артефакти';
  description: string;
}

export interface LoreLink {
  source: string;
  target: string;
}

export const BOOK_LORE_DATA: LoreNode[] = [
  {
    id: 'lore-center',
    title: 'Світ Книги (Скляна Призма)',
    category: 'центр',
    description: 'Центральна ідея фентезійного всесвіту. Світ, де чисте світло є першоджерелом усього живого, матерії та магії, а темрява — лише його відсутність або викривлення.'
  },
  // Локації
  {
    id: 'loc-temple',
    title: 'Храм Світла',
    category: 'локації',
    description: 'Стародавнє величне святилище, збудоване навколо Білого Ядра. Тут навчаються послушники Ордену та зберігаються найцінніші знання про спектри.'
  },
  {
    id: 'loc-gardens',
    title: 'Спектральні Сади',
    category: 'локації',
    description: 'Флора цих садів живиться виключно кольоровими променями. Кожна секція саду має свій колір і унікальні магічні властивості рослин.'
  },
  // Монстри
  {
    id: 'mon-eaters',
    title: 'Пожирачі Тіней',
    category: 'монстри',
    description: 'Тваринні істоти, народжені з нестабільності спектральних меж. Вони полюють на залишки світлової енергії в темних куточках світу.'
  },
  {
    id: 'mon-gargoyles',
    title: 'Скляні Горгульї',
    category: 'монстри',
    description: 'Кам’яно-скляні конструкти, активовані древньою магією. Охороняють кордони залів Храму та прокидаються у разі небезпеки.'
  },
  // Персонажі
  {
    id: 'char-ald',
    title: 'Альд',
    category: 'персонажі',
    description: 'Молодий послушник Ордену Храму Світла, допитливий та чутливий до заломлених променів. Шукає своє справжнє покликання.'
  },
  {
    id: 'char-master',
    title: 'Майстер',
    category: 'персонажі',
    description: 'Мудрий і суворий хранитель Храму Світла. Володіє таємницями Тригранної Призми та навчає Альда розумінню природи спектра.'
  },
  // Події
  {
    id: 'evt-refraction',
    title: 'Перше Заломлення',
    category: 'події',
    description: 'Легендарна подія в історії, коли єдине біле світло вперше розкололося на кольоровий спектр, породивши сучасну різноманітність магії.'
  },
  {
    id: 'evt-shadow-night',
    title: 'Ніч Тіней',
    category: 'події',
    description: 'Періодична астрономічна подія, коли Біле Ядро тьмяніє на кілька годин, і тіні набувають фізичної форми та автономності.'
  },
  // Артефакти
  {
    id: 'art-prism',
    title: 'Тригранна Призма',
    category: 'артефакти',
    description: 'Унікальний фокусуючий артефакт, здатний перетворювати сире світло Білого Ядра на контрольовані стихійні магічні промені.'
  },
  {
    id: 'art-shard',
    title: 'Осколок Пам’яті',
    category: 'артефакти',
    description: 'Рідкісний кристалічний осколок, який може записувати та зберігати в собі ментальні відбитки, спогади чи голоси минулого.'
  }
];

export const BOOK_LORE_LINKS: LoreLink[] = [
  { source: 'lore-center', target: 'loc-temple' },
  { source: 'lore-center', target: 'char-master' },
  { source: 'lore-center', target: 'evt-refraction' },
  { source: 'lore-center', target: 'art-prism' },
  { source: 'loc-temple', target: 'loc-gardens' },
  { source: 'loc-temple', target: 'char-ald' },
  { source: 'loc-temple', target: 'mon-gargoyles' },
  { source: 'char-master', target: 'char-ald' },
  { source: 'char-master', target: 'art-prism' },
  { source: 'char-ald', target: 'art-shard' },
  { source: 'char-ald', target: 'evt-shadow-night' },
  { source: 'art-prism', target: 'evt-refraction' },
  { source: 'evt-shadow-night', target: 'mon-eaters' }
];

interface PhysicsNode {
  id: string;
  title: string;
  category: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface PhysicsLink {
  source: string;
  target: string;
}

export default function BookLoreGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeNodeId, setActiveNodeId] = useState<string>('lore-center');
  const [dimensions, setDimensions] = useState({ width: 700, height: 400 });
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Filter Categories State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'центр',
    'локації',
    'монстри',
    'персонажі',
    'події',
    'артефакти'
  ]);

  // Physics simulation references
  const nodesRef = useRef<PhysicsNode[]>([]);
  const linksRef = useRef<PhysicsLink[]>([]);
  const animationRef = useRef<number | null>(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const isMovedRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Custom visual theme for lore categories using magical colors
  const categoryColors: Record<string, { light: string; dark: string; name: string; icon: React.ReactNode }> = {
    'центр': { light: '#8338EC', dark: '#a78bfa', name: 'Головна ідея', icon: <Star className="w-3.5 h-3.5" /> },
    'локації': { light: '#3A86C8', dark: '#60a5fa', name: 'Локації', icon: <MapPin className="w-3.5 h-3.5" /> },
    'монстри': { light: '#E63946', dark: '#f87171', name: 'Монстри', icon: <Ghost className="w-3.5 h-3.5" /> },
    'персонажі': { light: '#06D6A0', dark: '#34d399', name: 'Персонажі', icon: <Users className="w-3.5 h-3.5" /> },
    'події': { light: '#FFB703', dark: '#fbbf24', name: 'Події', icon: <Calendar className="w-3.5 h-3.5" /> },
    'артефакти': { light: '#FF006E', dark: '#f472b6', name: 'Предмети & Артефакти', icon: <Award className="w-3.5 h-3.5" /> }
  };

  const activeNode = BOOK_LORE_DATA.find(n => n.id === activeNodeId) || BOOK_LORE_DATA[0];

  // 1. Initialize nodes and links
  useEffect(() => {
    const width = dimensions.width;
    const height = dimensions.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const nodes: PhysicsNode[] = BOOK_LORE_DATA.map((note, index) => {
      const existing = nodesRef.current.find(n => n.id === note.id);
      
      let baseRadius = 8;
      if (note.id === 'lore-center') {
        baseRadius = 18;
      } else if (note.id === activeNodeId) {
        baseRadius = 12;
      } else {
        baseRadius = 10;
      }

      if (existing) {
        existing.radius = baseRadius;
        return existing;
      }

      // Initial layout ring distribution
      let initX = centerX;
      let initY = centerY;

      if (note.id === 'lore-center') {
        initX = centerX;
        initY = centerY;
      } else {
        const angle = (index / (BOOK_LORE_DATA.length - 1)) * Math.PI * 2;
        const radiusDist = 120 + Math.random() * 40;
        initX = centerX + Math.cos(angle) * radiusDist;
        initY = centerY + Math.sin(angle) * radiusDist;
      }

      return {
        id: note.id,
        title: note.title,
        category: note.category,
        x: initX + (Math.random() - 0.5) * 10,
        y: initY + (Math.random() - 0.5) * 10,
        vx: 0,
        vy: 0,
        radius: baseRadius,
      };
    });

    nodesRef.current = nodes;
    linksRef.current = BOOK_LORE_LINKS;

    if (panX === 0 && panY === 0) {
      setPanX(0);
      setPanY(0);
    }
  }, [dimensions, activeNodeId]);

  // 2. Setup ResizeObserver for responsive canvas
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 300),
          height: 380,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 3. Wheel scroll listener on canvas to prevent full-page scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1.08;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoom(prevZoom => {
        const nextZoom = e.deltaY < 0
          ? Math.min(2.2, prevZoom * zoomFactor)
          : Math.max(0.5, prevZoom / zoomFactor);

        setPanX(prevPanX => mouseX - (mouseX - prevPanX) * (nextZoom / prevZoom));
        setPanY(prevPanY => mouseY - (mouseY - prevPanY) * (nextZoom / prevZoom));

        return nextZoom;
      });
    };

    canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheelEvent);
    };
  }, []);

  // Click outside to close legend
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLegendOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 4. Physics and Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const runFrame = () => {
      const activeNodes = nodesRef.current.filter(n => selectedCategories.includes(n.category));
      const activeLinks = linksRef.current.filter(link => {
        const u = nodesRef.current.find(n => n.id === link.source);
        const v = nodesRef.current.find(n => n.id === link.target);
        return u && v && selectedCategories.includes(u.category) && selectedCategories.includes(v.category);
      });

      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      // --- Physics Forces ---
      // A. Repulsion
      for (let i = 0; i < activeNodes.length; i++) {
        for (let j = i + 1; j < activeNodes.length; j++) {
          const u = activeNodes[i];
          const v = activeNodes[j];
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minComfortDist = u.id === 'lore-center' || v.id === 'lore-center' ? 140 : 90;
          
          if (dist < minComfortDist) {
            const force = (minComfortDist - dist) * 0.08;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            u.vx -= fx;
            u.vy -= fy;
            v.vx += fx;
            v.vy += fy;
          }
        }
      }

      // B. Link springs
      activeLinks.forEach(link => {
        const u = activeNodes.find(n => n.id === link.source);
        const v = activeNodes.find(n => n.id === link.target);
        if (u && v) {
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredLen = u.id === 'lore-center' || v.id === 'lore-center' ? 120 : 80;
          const force = (dist - desiredLen) * 0.05;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          u.vx += fx;
          u.vy += fy;
          v.vx -= fx;
          v.vy -= fy;
        }
      });

      // C. Symmetrical pull to center
      activeNodes.forEach(u => {
        const dx = centerX - u.x;
        const dy = centerY - u.y;
        u.vx += dx * 0.01;
        u.vy += dy * 0.01;
      });

      // D. Handle dragging
      if (draggedNodeId && selectedCategories.includes(nodesRef.current.find(n => n.id === draggedNodeId)?.category || '')) {
        const dragged = activeNodes.find(n => n.id === draggedNodeId);
        if (dragged) {
          dragged.x = (mousePosRef.current.x - panX) / zoom;
          dragged.y = (mousePosRef.current.y - panY) / zoom;
          dragged.vx = 0;
          dragged.vy = 0;
        }
      }

      // E. Update coordinates
      activeNodes.forEach(u => {
        u.x += u.vx;
        u.y += u.vy;
        u.vx *= 0.82;
        u.vy *= 0.82;
      });

      // --- Draw Canvas ---
      const isDark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      ctx.fillStyle = isDark ? '#121824' : '#ffffff';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      // Grid
      const padding = 100 / zoom;
      const startX = -panX / zoom - padding;
      const endX = (dimensions.width - panX) / zoom + padding;
      const startY = -panY / zoom - padding;
      const endY = (dimensions.height - panY) / zoom + padding;
      const gridSize = 35;

      ctx.strokeStyle = isDark ? 'rgba(131, 56, 236, 0.04)' : 'rgba(131, 56, 236, 0.02)';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();

      // Draw Links
      activeLinks.forEach(link => {
        const u = activeNodes.find(n => n.id === link.source);
        const v = activeNodes.find(n => n.id === link.target);
        if (u && v) {
          const isHighlighted = u.id === activeNodeId || v.id === activeNodeId;
          ctx.beginPath();
          if (isHighlighted) {
            ctx.strokeStyle = isDark ? 'rgba(167, 139, 250, 0.7)' : 'rgba(131, 56, 236, 0.6)';
            ctx.lineWidth = 2.2 / zoom;
          } else {
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(131, 56, 236, 0.1)';
            ctx.lineWidth = 1 / zoom;
          }
          ctx.moveTo(u.x, u.y);
          ctx.lineTo(v.x, v.y);
          ctx.stroke();
        }
      });

      // Draw Nodes
      activeNodes.forEach(u => {
        const isCurrent = u.id === activeNodeId;
        const colorCfg = categoryColors[u.category] || { light: '#6B7280', dark: '#9CA3AF' };
        const color = isDark ? colorCfg.dark : colorCfg.light;

        if (u.id === 'lore-center') {
          // Center orb glowing purple
          ctx.save();
          ctx.strokeStyle = isDark ? 'rgba(167, 139, 250, 0.25)' : 'rgba(131, 56, 236, 0.15)';
          ctx.lineWidth = 1.5 / zoom;
          ctx.beginPath();
          ctx.arc(u.x, u.y, 25, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 20;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(u.x, u.y, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Normal nodes
          ctx.save();
          if (isCurrent) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(u.x, u.y, 9, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1.8 / zoom;
            ctx.beginPath();
            ctx.arc(u.x, u.y, 12, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(u.x, u.y, 6.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = isDark ? '#121824' : '#ffffff';
            ctx.lineWidth = 1 / zoom;
            ctx.stroke();
          }
          ctx.restore();
        }

        // Draw node labels
        ctx.font = u.id === 'lore-center'
          ? `bold ${11}px sans-serif`
          : isCurrent
            ? `bold ${10}px sans-serif`
            : `${9}px sans-serif`;

        const textWidth = ctx.measureText(u.title).width;
        const offset = u.id === 'lore-center' ? 25 : isCurrent ? 16 : 12;

        ctx.fillStyle = isDark ? 'rgba(18, 24, 36, 0.85)' : 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(u.x - textWidth / 2 - 4, u.y + offset - 1, textWidth + 8, 12);

        ctx.fillStyle = isCurrent 
          ? (isDark ? '#e9d5ff' : '#6b21a8') 
          : (isDark ? '#9ca3af' : '#4b5563');
        ctx.textAlign = 'center';
        ctx.fillText(u.title, u.x, u.y + offset + 9);
      });

      ctx.restore();
      animationRef.current = requestAnimationFrame(runFrame);
    };

    animationRef.current = requestAnimationFrame(runFrame);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [dimensions, panX, panY, zoom, activeNodeId, draggedNodeId, selectedCategories]);

  // Handle mouse dragging/panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    mousePosRef.current = { x: mouseX, y: mouseY };
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    isMovedRef.current = false;

    const graphX = (mouseX - panX) / zoom;
    const graphY = (mouseY - panY) / zoom;

    let foundNodeId: string | null = null;
    const activeNodes = nodesRef.current.filter(n => selectedCategories.includes(n.category));
    for (const u of activeNodes) {
      const dx = u.x - graphX;
      const dy = u.y - graphY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = u.id === activeNodeId ? 20 : 15;
      if (dist < radius) {
        foundNodeId = u.id;
        break;
      }
    }

    if (foundNodeId) {
      setDraggedNodeId(foundNodeId);
    } else {
      setIsPanning(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    mousePosRef.current = { x: mouseX, y: mouseY };

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isMovedRef.current = true;
    }

    if (isPanning) {
      setPanX(prev => prev + e.movementX);
      setPanY(prev => prev + e.movementY);
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeId && !isMovedRef.current) {
      setActiveNodeId(draggedNodeId);
    }
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left side: Interactive Canvas (Col span 8) */}
      <div className="lg:col-span-8 bg-white dark:bg-[#121824] border border-purple-100/50 dark:border-purple-900/20 rounded-3xl p-5 shadow-sm space-y-4">
        
        {/* Header of Graph */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-50 dark:border-gray-805 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#8338EC]" />
              <span>Інтерактивна Мапа Світу Призми</span>
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-550">
              Подорожуйте зв’язками між монстрами, подіями, персонажами та артефактами.
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#8338EC] hover:bg-purple-50 dark:hover:bg-purple-950/20 border border-gray-150 dark:border-gray-800 transition cursor-pointer"
              title="Довідка"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setZoom(Math.min(2.2, zoom * 1.25)); }}
              className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#8338EC] border border-gray-150 dark:border-gray-800 transition cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setZoom(Math.max(0.5, zoom / 1.25)); }}
              className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#8338EC] border border-gray-150 dark:border-gray-800 transition cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setZoom(1.0); setPanX(0); setPanY(0); }}
              className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#8338EC] border border-gray-150 dark:border-gray-800 transition cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Скинути</span>
            </button>
          </div>
        </div>

        {/* Instructions */}
        {showHelp && (
          <div className="p-3 bg-purple-500/5 border border-purple-150 dark:border-purple-900/30 rounded-xl text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-sans flex items-start gap-2 animate-fade-in">
            <Move className="w-3.5 h-3.5 text-[#8338EC] shrink-0 mt-0.5" />
            <ul className="list-disc pl-3.5 space-y-0.5">
              <li><strong>Переміщення</strong>: Перетягуйте мишкою тло графу для переміщення.</li>
              <li><strong>Перегляд</strong>: Клацніть на вузол, щоб прочитати його лор у правому блоці.</li>
              <li><strong>Інтеракція</strong>: Перетягуйте окремі вузли, щоб змінити конфігурацію графу.</li>
            </ul>
          </div>
        )}

        {/* Category Filters block */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs bg-gray-50/50 dark:bg-gray-900/30 p-2.5 rounded-xl border border-gray-100/40 dark:border-gray-850">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-gray-500 dark:text-gray-400">Фільтрація графу:</span>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className="flex items-center justify-between gap-2 px-3 py-1 bg-white dark:bg-[#1a2333] border border-gray-200 dark:border-gray-750 rounded-lg text-[11px] font-medium text-gray-700 dark:text-gray-200 shadow-sm cursor-pointer"
            >
              <span>Категорії лору</span>
              {isLegendOpen ? <ChevronUp className="w-3 h-3 text-gray-450" /> : <ChevronDown className="w-3 h-3 text-gray-450" />}
            </button>

            {isLegendOpen && (
              <div className="absolute right-0 mt-1 bg-white dark:bg-[#1a2333] border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg z-50 p-2 space-y-1 w-52 animate-fade-in">
                {Object.entries(categoryColors).map(([catId, cfg]) => {
                  const isSelected = selectedCategories.includes(catId);
                  const color = document.documentElement.classList.contains('dark') ? cfg.dark : cfg.light;
                  return (
                    <button
                      key={catId}
                      onClick={() => toggleCategory(catId)}
                      className="w-full flex items-center justify-between gap-1.5 p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-[11px] cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="capitalize text-gray-700 dark:text-gray-200 font-medium">{cfg.name}</span>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-[#8338EC] border-[#8338EC] text-white' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Canvas element */}
        <div 
          ref={containerRef}
          className="relative border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50 dark:bg-[#121824] shadow-inner select-none"
        >
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            className="block cursor-grab active:cursor-grabbing"
          />
          <div className="absolute bottom-2.5 right-2.5 pointer-events-none bg-white/70 dark:bg-[#121824]/70 px-1.5 py-0.5 rounded text-[8px] font-mono text-gray-400 dark:text-gray-500">
            drag to shift • scroll to zoom • click to inspect
          </div>
        </div>
      </div>

      {/* Right side: Lore inspector details (Col span 4) */}
      <div className="lg:col-span-4 bg-white dark:bg-[#121824] border border-purple-100/50 dark:border-purple-900/20 rounded-3xl p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-gray-50 dark:border-gray-850 pb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#8338EC]" />
          <span>Інспектор Енциклопедії</span>
        </h4>

        {activeNode ? (
          <div className="space-y-3.5 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-[#8338EC] dark:text-[#a78bfa]">
                {categoryColors[activeNode.category]?.icon || <Compass className="w-4 h-4" />}
              </span>
              <div>
                <h3 className="font-display font-extrabold text-gray-900 dark:text-white text-sm tracking-tight leading-none">
                  {activeNode.title}
                </h3>
                <span className="text-[10px] uppercase font-mono tracking-wider text-purple-600 dark:text-purple-400 font-bold block mt-1">
                  Категорія: {categoryColors[activeNode.category]?.name || activeNode.category}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed font-sans bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-2xl border border-gray-100/40 dark:border-gray-850">
              {activeNode.description}
            </p>

            {/* Backlink suggestions inside lore network */}
            <div className="space-y-2 pt-1.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 dark:text-gray-500 block">
                Споріднені лор-зв’язки:
              </span>
              <div className="flex flex-col gap-1.5">
                {BOOK_LORE_LINKS.filter(l => l.source === activeNodeId || l.target === activeNodeId).map(link => {
                  const peerId = link.source === activeNodeId ? link.target : link.source;
                  const peerNode = BOOK_LORE_DATA.find(n => n.id === peerId);
                  if (!peerNode) return null;
                  return (
                    <button
                      key={peerId}
                      onClick={() => setActiveNodeId(peerId)}
                      className="w-full text-left p-2.5 rounded-xl border border-gray-100/40 dark:border-gray-850 hover:border-purple-200 dark:hover:border-purple-900/40 hover:bg-purple-50/10 dark:hover:bg-purple-950/10 text-xs text-gray-700 dark:text-gray-300 font-medium cursor-pointer transition flex items-center justify-between"
                    >
                      <span className="truncate">{peerNode.title}</span>
                      <span className="text-[9px] bg-purple-50 dark:bg-purple-950/30 px-1.5 py-0.5 rounded capitalize text-[#8338EC] font-mono">
                        {categoryColors[peerNode.category]?.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-center text-gray-400 dark:text-gray-550 py-10 font-sans">
            Оберіть вузол на карті лору, щоб переглянути інформацію
          </p>
        )}
      </div>
    </div>
  );
}
