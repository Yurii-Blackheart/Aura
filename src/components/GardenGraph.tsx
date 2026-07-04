import React, { useState, useEffect, useRef } from 'react';
import { GARDEN_DATA } from '../data';
import { GardenNote } from '../types';
import { ZoomIn, ZoomOut, Maximize2, Move, HelpCircle, ChevronDown, ChevronUp, Check, Filter, Maximize, Minimize } from 'lucide-react';

interface GardenGraphProps {
  activeNoteId: string;
  onSelectNote: (noteId: string) => void;
  notes?: GardenNote[];
}

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

export default function GardenGraph({ activeNoteId, onSelectNote, notes = GARDEN_DATA }: GardenGraphProps) {
  const currentNotes = notes;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 420 });
  const [zoom, setZoom] = useState(1.0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Filter Categories State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'центр',
    'системне-мислення',
    'біохімія',
    'кібернетика',
    'філософія',
    'книги',
    'тренування'
  ]);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Physics simulation references to avoid state re-render lags
  const nodesRef = useRef<PhysicsNode[]>([]);
  const linksRef = useRef<PhysicsLink[]>([]);
  const animationRef = useRef<number | null>(null);

  // Interaction tracking
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isMovedRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Category Color Map (matches the visual identities of corresponding modules)
  const categoryColors: Record<string, { light: string; dark: string; name: string }> = {
    'центр': { light: '#1A73E8', dark: '#60a5fa', name: 'Мій Центр' },
    'філософія': { light: '#8338EC', dark: '#a78bfa', name: 'Філософія' },
    'книги': { light: '#FFB703', dark: '#fbbf24', name: 'Книги' },
    'тренування': { light: '#10B981', dark: '#34d399', name: 'Тренування' },
    'системне-мислення': { light: '#E63946', dark: '#f87171', name: 'Системне мислення' },
    'біохімія': { light: '#2A9D8F', dark: '#4ade80', name: 'Біохімія' },
    'кібернетика': { light: '#F4A261', dark: '#fb923c', name: 'Кібернетика' },
  };

  // 1. Initialize nodes and links
  useEffect(() => {
    const width = dimensions.width;
    const height = dimensions.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Build unique links
    const links: PhysicsLink[] = [];
    currentNotes.forEach(note => {
      note.connectedNotes.forEach(targetId => {
        const exists = links.some(
          l => (l.source === note.id && l.target === targetId) || (l.source === targetId && l.target === note.id)
        );
        if (!exists && currentNotes.some(n => n.id === targetId)) {
          links.push({ source: note.id, target: targetId });
        }
      });
    });

    // Create physics nodes, placing them in a structured tree around the center initially
    const nodes: PhysicsNode[] = currentNotes.map((note, index) => {
      const existing = nodesRef.current.find(n => n.id === note.id);
      
      // Determine base radius based on hub node type
      let baseRadius = 8;
      if (note.id === 'my-personality-center') {
        baseRadius = 20;
      } else if (note.id.startsWith('category-')) {
        baseRadius = 14;
      } else if (note.id === activeNoteId) {
        baseRadius = 12;
      }

      if (existing) {
        existing.radius = baseRadius;
        return existing;
      }

      // Calculate initial position dynamically to prevent overlap
      let initX = centerX;
      let initY = centerY;

      if (note.id === 'my-personality-center') {
        initX = centerX;
        initY = centerY;
      } else if (note.id.startsWith('category-')) {
        const catList = ['category-philosophy', 'category-books', 'category-health', 'category-systems', 'category-biochem', 'category-cybernetics'];
        const idx = catList.indexOf(note.id);
        const a = (idx >= 0 ? idx : index) / 6 * Math.PI * 2;
        initX = centerX + Math.cos(a) * 160;
        initY = centerY + Math.sin(a) * 160;
      } else {
        const catList = ['філософія', 'книги', 'тренування', 'системне-мислення', 'біохімія', 'кібернетика'];
        const idx = catList.indexOf(note.category);
        const a = (idx >= 0 ? idx : index) / 6 * Math.PI * 2;
        const offsetDist = 60 + Math.random() * 40;
        const leafAngle = a + (Math.random() - 0.5) * 0.4;
        initX = centerX + Math.cos(a) * 160 + Math.cos(leafAngle) * offsetDist;
        initY = centerY + Math.sin(a) * 160 + Math.sin(leafAngle) * offsetDist;
      }

      return {
        id: note.id,
        title: note.title,
        category: note.category,
        x: initX + (Math.random() - 0.5) * 20,
        y: initY + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        radius: baseRadius,
      };
    });

    nodesRef.current = nodes;
    linksRef.current = links;

    // Center view if first load
    if (panX === 0 && panY === 0) {
      setPanX(0);
      setPanY(0);
    }
  }, [dimensions, activeNoteId]);

  // 2. Setup ResizeObserver for fluid responsiveness
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 300),
          height: isFullScreen ? Math.max(height, 300) : 420,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [isFullScreen]);

  // Center / reset graph view when toggling full screen
  useEffect(() => {
    handleReset();
  }, [isFullScreen]);

  // 3. Direct wheel scroll listener on canvas to prevent full-page scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault(); // This blocks the page scroll reliably!
      const zoomFactor = 1.08;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoom(prevZoom => {
        const nextZoom = e.deltaY < 0
          ? Math.min(2.5, prevZoom * zoomFactor)
          : Math.max(0.4, prevZoom / zoomFactor);

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

  // Close dropdown on click outside
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

  // 4. Main Physics & Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const runFrame = () => {
      // Filter active nodes and links based on selected categories
      const activeNodes = nodesRef.current.filter(n => selectedCategories.includes(n.category));
      const activeLinks = linksRef.current.filter(link => {
        const u = nodesRef.current.find(n => n.id === link.source);
        const v = nodesRef.current.find(n => n.id === link.target);
        return u && v && selectedCategories.includes(u.category) && selectedCategories.includes(v.category);
      });

      // Build active secondary/dashed links
      const activeSecondaryLinks: PhysicsLink[] = [];
      currentNotes.forEach(note => {
        if (note.secondaryConnections && selectedCategories.includes(note.category)) {
          note.secondaryConnections.forEach(targetId => {
            const targetNote = currentNotes.find(n => n.id === targetId);
            if (targetNote && selectedCategories.includes(targetNote.category)) {
              const u = activeNodes.find(n => n.id === note.id);
              const v = activeNodes.find(n => n.id === targetId);
              if (u && v) {
                const exists = activeSecondaryLinks.some(
                  l => (l.source === note.id && l.target === targetId) || (l.source === targetId && l.target === note.id)
                );
                if (!exists) {
                  activeSecondaryLinks.push({ source: note.id, target: targetId });
                }
              }
            }
          });
        }
      });

      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      // --- PHYSICS SIMULATION ---
      // A. Repulsion (Active nodes push each other away; different categories repel more strongly)
      for (let i = 0; i < activeNodes.length; i++) {
        for (let j = i + 1; j < activeNodes.length; j++) {
          const u = activeNodes[i];
          const v = activeNodes[j];
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const isDiffCategory = u.category !== v.category;
          const minComfortDist = isDiffCategory ? 210 : 120;
          const repulsionStrength = isDiffCategory ? 0.22 : 0.08;

          if (dist < minComfortDist) {
            const force = (minComfortDist - dist) * repulsionStrength;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            u.vx -= fx;
            u.vy -= fy;
            v.vx += fx;
            v.vy += fy;
          }
        }
      }

      // B. Link attraction (Springs pull connected active nodes)
      activeLinks.forEach(link => {
        const u = activeNodes.find(n => n.id === link.source);
        const v = activeNodes.find(n => n.id === link.target);
        if (u && v) {
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredLen = 100;
          const strength = 0.05;

          const force = (dist - desiredLen) * strength;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          u.vx += fx;
          u.vy += fy;
          v.vx -= fx;
          v.vy -= fy;
        }
      });

      // C. Target-specific structures (gravitational pull to centers/hubs to form distinct islands)
      activeNodes.forEach(u => {
        if (u.id === 'my-personality-center') {
          // Anchored in the center
          const dx = centerX - u.x;
          const dy = centerY - u.y;
          u.vx += dx * 0.08;
          u.vy += dy * 0.08;
        } else if (u.id.startsWith('category-')) {
          // Category hubs are placed symmetrically in a ring
          const catList = ['category-philosophy', 'category-books', 'category-health', 'category-systems', 'category-biochem', 'category-cybernetics'];
          const idx = catList.indexOf(u.id);
          const angle = (idx >= 0 ? idx : 0) / 6 * Math.PI * 2;
          const targetX = centerX + Math.cos(angle) * 165;
          const targetY = centerY + Math.sin(angle) * 165;

          const dx = targetX - u.x;
          const dy = targetY - u.y;
          u.vx += dx * 0.05;
          u.vy += dy * 0.05;
        } else {
          // Leaf nodes are strongly pulled to their category hubs
          const hub = activeNodes.find(n => n.id === `category-${u.category}`);
          if (hub) {
            const dx = hub.x - u.x;
            const dy = hub.y - u.y;
            u.vx += dx * 0.025;
            u.vy += dy * 0.025;
          } else {
            // General pull to prevent drift
            const dx = centerX - u.x;
            const dy = centerY - u.y;
            u.vx += dx * 0.005;
            u.vy += dy * 0.005;
          }
        }
      });

      // D. Apply dragged node constraints (if it's in a selected category)
      if (draggedNodeId && selectedCategories.includes(nodesRef.current.find(n => n.id === draggedNodeId)?.category || '')) {
        const dragged = activeNodes.find(n => n.id === draggedNodeId);
        if (dragged) {
          // Inverse transform mouse coordinates to get node coordinates
          dragged.x = (mousePosRef.current.x - panX) / zoom;
          dragged.y = (mousePosRef.current.y - panY) / zoom;
          dragged.vx = 0;
          dragged.vy = 0;
        }
      }

      // E. Update positions & damping (friction)
      activeNodes.forEach(u => {
        u.x += u.vx;
        u.y += u.vy;
        u.vx *= 0.82;
        u.vy *= 0.82;
      });

      // --- RENDERING TO CANVAS ---
      const isDark = document.documentElement.classList.contains('dark');
      
      // Clear and draw background grid
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      ctx.fillStyle = isDark ? '#121824' : '#ffffff';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Save context for zooming/panning
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      // --- DYNAMIC INFINITE GRID COMPUTATION ---
      // Get exact coordinates of the viewport corners in graph coordinate space
      const leftEdge = -panX / zoom;
      const rightEdge = (dimensions.width - panX) / zoom;
      const topEdge = -panY / zoom;
      const bottomEdge = (dimensions.height - panY) / zoom;

      // Add a generous padding to render seamlessly past the edges
      const padding = 120 / zoom;
      const startX = leftEdge - padding;
      const endX = rightEdge + padding;
      const startY = topEdge - padding;
      const endY = bottomEdge + padding;

      const gridSize = 40;
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.025)';
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

      // F1. Draw Primary Links (Solid)
      activeLinks.forEach(link => {
        const u = activeNodes.find(n => n.id === link.source);
        const v = activeNodes.find(n => n.id === link.target);
        if (u && v) {
          const isActiveLink = u.id === activeNoteId || v.id === activeNoteId;
          
          ctx.beginPath();
          ctx.setLineDash([]); // Ensure solid line
          if (isActiveLink) {
            ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.75)' : 'rgba(26, 115, 232, 0.7)';
            ctx.lineWidth = 2.5 / zoom;
          } else {
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1.2 / zoom;
          }
          ctx.moveTo(u.x, u.y);
          ctx.lineTo(v.x, v.y);
          ctx.stroke();
        }
      });

      // F2. Draw Secondary Links (Dashed)
      activeSecondaryLinks.forEach(link => {
        const u = activeNodes.find(n => n.id === link.source);
        const v = activeNodes.find(n => n.id === link.target);
        if (u && v) {
          const isActiveLink = u.id === activeNoteId || v.id === activeNoteId;
          
          ctx.beginPath();
          ctx.setLineDash([4 / zoom, 4 / zoom]); // Perfect responsive dashed line
          if (isActiveLink) {
            ctx.strokeStyle = isDark ? 'rgba(147, 197, 253, 0.55)' : 'rgba(37, 99, 235, 0.5)';
            ctx.lineWidth = 1.8 / zoom;
          } else {
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
            ctx.lineWidth = 0.9 / zoom;
          }
          ctx.moveTo(u.x, u.y);
          ctx.lineTo(v.x, v.y);
          ctx.stroke();
        }
      });
      // Reset line dash for any subsequent renderings
      ctx.setLineDash([]);

      // G. Draw Nodes
      activeNodes.forEach(u => {
        const isCurrent = u.id === activeNoteId;
        const colorCfg = categoryColors[u.category] || { light: '#6B7280', dark: '#9CA3AF' };
        const nodeColor = isDark ? colorCfg.dark : colorCfg.light;

        if (u.id === 'my-personality-center') {
          // Gorgeous glowing, pulsating center hub
          ctx.save();
          ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.25)' : 'rgba(26, 115, 232, 0.15)';
          ctx.lineWidth = 1.5 / zoom;
          ctx.beginPath();
          ctx.arc(u.x, u.y, 28, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.45)' : 'rgba(26, 115, 232, 0.3)';
          ctx.beginPath();
          ctx.arc(u.x, u.y, 24, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 25;
          ctx.shadowColor = isDark ? '#60a5fa' : '#1A73E8';
          ctx.fillStyle = isDark ? '#3b82f6' : '#1A73E8';
          ctx.beginPath();
          ctx.arc(u.x, u.y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (u.id.startsWith('category-')) {
          // Highly styled category hub node
          ctx.save();
          ctx.shadowBlur = 15;
          ctx.shadowColor = nodeColor;
          ctx.fillStyle = nodeColor;
          ctx.beginPath();
          ctx.arc(u.x, u.y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.strokeStyle = isDark ? '#121824' : '#ffffff';
          ctx.lineWidth = 2 / zoom;
          ctx.stroke();

          ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
          ctx.lineWidth = 1 / zoom;
          ctx.beginPath();
          ctx.arc(u.x, u.y, 15, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Regular node
          if (isCurrent) {
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = nodeColor;
            ctx.fillStyle = nodeColor;
            ctx.beginPath();
            ctx.arc(u.x, u.y, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 2 / zoom;
            ctx.beginPath();
            ctx.arc(u.x, u.y, 13, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = nodeColor;
            ctx.beginPath();
            ctx.arc(u.x, u.y, 6.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = isDark ? '#121824' : '#ffffff';
            ctx.lineWidth = 1.2 / zoom;
            ctx.stroke();
          }
        }

        // H. Draw Node Labels
        const labelText = u.title;
        ctx.font = u.id === 'my-personality-center'
          ? `bold ${12}px sans-serif`
          : u.id.startsWith('category-')
            ? `bold ${11}px sans-serif`
            : isCurrent
              ? `bold ${10}px sans-serif`
              : `${9.5}px sans-serif`;
              
        const textWidth = ctx.measureText(labelText).width;
        const labelOffset = u.id === 'my-personality-center' ? 30 : u.id.startsWith('category-') ? 22 : isCurrent ? 18 : 14;

        // Draw small background for labels to stay super readable
        ctx.fillStyle = isDark ? 'rgba(18, 24, 36, 0.85)' : 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(u.x - textWidth / 2 - 4, u.y + labelOffset - 1, textWidth + 8, 14);

        ctx.fillStyle = u.id === 'my-personality-center'
          ? (isDark ? '#93c5fd' : '#1A73E8')
          : isCurrent 
            ? (isDark ? '#60a5fa' : '#2563eb') 
            : (isDark ? '#e2e8f0' : '#374151');
            
        ctx.textAlign = 'center';
        ctx.fillText(labelText, u.x, u.y + labelOffset + 10);
      });

      ctx.restore();

      animationRef.current = requestAnimationFrame(runFrame);
    };

    animationRef.current = requestAnimationFrame(runFrame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, panX, panY, zoom, activeNoteId, draggedNodeId, selectedCategories]);

  // 5. Mouse Event Handlers for Panning & Node Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    mousePosRef.current = { x: mouseX, y: mouseY };
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    isMovedRef.current = false;

    // Convert mouse position to graph coordinates to find clicked node
    const graphX = (mouseX - panX) / zoom;
    const graphY = (mouseY - panY) / zoom;

    // Check if clicked near any active node
    let foundNodeId: string | null = null;
    const activeNodes = nodesRef.current.filter(n => selectedCategories.includes(n.category));
    for (const u of activeNodes) {
      const dx = u.x - graphX;
      const dy = u.y - graphY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clickRadius = u.id === activeNoteId ? 22 : 16;
      
      if (dist < clickRadius) {
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
    // If we were dragging a node and the mouse didn't move much, it's a select/click!
    if (draggedNodeId && !isMovedRef.current) {
      onSelectNote(draggedNodeId);
    }
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  // 6. Utility Controls (UI buttons)
  const handleZoomIn = () => {
    const nextZoom = Math.min(2.5, zoom * 1.25);
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    setPanX(prev => centerX - (centerX - prev) * (nextZoom / zoom));
    setPanY(prev => centerY - (centerY - prev) * (nextZoom / zoom));
    setZoom(nextZoom);
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(0.4, zoom / 1.25);
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    setPanX(prev => centerX - (centerX - prev) * (nextZoom / zoom));
    setPanY(prev => centerY - (centerY - prev) * (nextZoom / zoom));
    setZoom(nextZoom);
  };

  const handleReset = () => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
    // Smoothly kick nodes to break stuck overlaps
    nodesRef.current.forEach(n => {
      n.vx += (Math.random() - 0.5) * 10;
      n.vy += (Math.random() - 0.5) * 10;
    });
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(catId)) {
        return prev.filter(c => c !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(['центр', 'системне-мислення', 'біохімія', 'кібернетика', 'філософія', 'книги', 'тренування']);
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  return (
    <div 
      id="obsidian-graph-frame" 
      className={`bg-white dark:bg-[#121824] border border-blue-100/50 dark:border-blue-900/30 rounded-3xl p-6 shadow-sm space-y-4 transition-all duration-300 ${
        isFullScreen 
          ? 'fixed inset-0 z-50 rounded-none p-6 flex flex-col h-screen w-screen overflow-hidden' 
          : 'relative'
      }`}
    >
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-gray-50 dark:border-gray-850">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/20 text-[#1A73E8] dark:text-[#60a5fa] font-bold px-2 py-0.5 rounded">
              Зв’язки
            </span>
            <h2 className="font-display font-bold text-base text-gray-900 dark:text-white tracking-tight">
              Інтерактивний фрактал знань (Obsidian Graph)
            </h2>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Візуалізація споріднених концепцій, їхнього тяжіння та переходів між нотатками в реальному часі
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setShowHelp(!showHelp)}
            title="Довідка"
            className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          
          <div className="h-4 w-[1px] bg-gray-100 dark:bg-gray-800 mx-0.5" />

          <button
            onClick={handleZoomIn}
            title="Наблизити"
            className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 transition cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Віддалити"
            className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 transition cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            title="Скинути фокус"
            className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 transition cursor-pointer flex items-center gap-1 text-[11px] font-medium"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Скинути</span>
          </button>

          <button
            id="fullscreen-toggle-btn"
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? "Згорнути" : "Розгорнути на весь екран"}
            className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 transition cursor-pointer flex items-center gap-1 text-[11px] font-medium"
          >
            {isFullScreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span>{isFullScreen ? "Згорнути" : "Повний екран"}</span>
          </button>
        </div>
      </div>

      {/* Info help block if toggled */}
      {showHelp && (
        <div className="p-3.5 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100/30 dark:border-blue-900/20 rounded-xl text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-sans flex items-start gap-2 animate-fade-in">
          <Move className="w-4 h-4 text-[#1A73E8] dark:text-[#60a5fa] shrink-0 mt-0.5" />
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Навігація</strong>: Клікніть на будь-яку нотатку, щоб перейти до її детального вивчення.</li>
            <li><strong>Тягання</strong>: Затисніть та тягніть окремий вузол лівою кнопкою миші, щоб переглянути його під іншим кутом.</li>
            <li><strong>Масштабування</strong>: Крутіть коліщатко миші або скористайтесь кнопками керування для зміни масштабу.</li>
            <li><strong>Панорамування</strong>: Затисніть ліву кнопку миші на порожньому тлі та пересувайте для подорожі графом.</li>
          </ul>
        </div>
      )}

      {/* Interactive Legend Dropdown Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-gray-50/50 dark:bg-gray-900/30 p-3 rounded-xl border border-gray-100/40 dark:border-gray-850">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-450 dark:text-gray-550" />
          <span className="font-semibold text-gray-500 dark:text-gray-400">Фільтрація знань:</span>
          <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono">
            {selectedCategories.length} з {Object.keys(categoryColors).length} категорій
          </span>
        </div>

        {/* Custom Multi-select Dropdown */}
        <div className="relative w-full sm:w-auto z-10" ref={dropdownRef}>
          <button
            id="legend-dropdown-btn"
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="w-full sm:w-56 flex items-center justify-between gap-2 px-3 py-1.5 bg-white dark:bg-[#1a2333] border border-gray-250 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-750 dark:text-gray-200 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition cursor-pointer"
          >
            <span className="truncate">
              {selectedCategories.length === 0 
                ? 'Усі приховані' 
                : selectedCategories.length === Object.keys(categoryColors).length
                  ? 'Усі категорії' 
                  : `Обрано: ${selectedCategories.length}`}
            </span>
            {isLegendOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {isLegendOpen && (
            <div className="absolute right-0 left-0 sm:left-auto sm:w-64 mt-1 bg-white dark:bg-[#1a2333] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg z-50 p-2.5 space-y-1 animate-fade-in">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-850 pb-2 mb-1.5 px-1">
                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Категорії</span>
                <div className="flex gap-2">
                  <button 
                    onClick={selectAllCategories}
                    className="text-[10px] text-[#1A73E8] dark:text-[#60a5fa] font-semibold hover:underline cursor-pointer"
                  >
                    Усі
                  </button>
                  <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>
                  <button 
                    onClick={clearAllCategories}
                    className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold hover:underline cursor-pointer"
                  >
                    Очистити
                  </button>
                </div>
              </div>

              {Object.entries(categoryColors).map(([catId, cfg]) => {
                const isSelected = selectedCategories.includes(catId);
                const color = document.documentElement.classList.contains('dark') ? cfg.dark : cfg.light;
                
                return (
                  <button
                    key={catId}
                    id={`filter-cat-${catId}`}
                    onClick={() => toggleCategory(catId)}
                    className="w-full flex items-center justify-between gap-2 p-1.5 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-gray-750 dark:text-gray-200 capitalize">{cfg.name}</span>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-[#1A73E8] dark:bg-blue-500 border-[#1A73E8] dark:border-blue-500 text-white' 
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

      {/* Live Graph Area */}
      <div 
        ref={containerRef} 
        className={`relative border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50 dark:bg-[#121824] shadow-inner select-none cursor-grab active:cursor-grabbing ${
          isFullScreen ? 'flex-1 min-h-0 w-full' : 'h-[420px]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="block"
        />

        {/* Small Instruction overlay */}
        <div className="absolute bottom-3 right-3 pointer-events-none bg-white/70 dark:bg-[#121824]/70 border border-gray-100/50 dark:border-gray-800/40 px-2 py-1 rounded text-[9px] font-mono text-gray-400 dark:text-gray-500 shadow-sm">
          drag node to move • scroll to zoom • click to read
        </div>
      </div>
    </div>
  );
}
