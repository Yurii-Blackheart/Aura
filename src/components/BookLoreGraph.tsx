import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, Move, HelpCircle, ChevronDown, ChevronUp, 
  Check, Filter, Sparkles, Compass, Star, MapPin, Ghost, Users, Calendar, 
  Award, BookOpen, Plus, Edit, Trash2, Save, X, Eye, EyeOff, ShieldAlert,
  Flame, BookMarked, ScrollText
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { BookLoreEntity } from '../types';
import { INITIAL_LORE_DATA } from '../loreData';

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

interface BookLoreGraphProps {
  canEdit?: boolean;
}

// Predefined configuration of common categories with their Ukrainian names, colors and icons
const CATEGORY_CONFIG: Record<string, { color: string; name: string; icon: React.ReactNode }> = {
  'center': { color: '#8338EC', name: 'Книга', icon: <Star className="w-3.5 h-3.5" /> },
  'character': { color: '#06D6A0', name: 'Персонаж', icon: <Users className="w-3.5 h-3.5" /> },
  'location': { color: '#3A86C8', name: 'Локація', icon: <MapPin className="w-3.5 h-3.5" /> },
  'event': { color: '#FFB703', name: 'Подія', icon: <Calendar className="w-3.5 h-3.5" /> },
  'faction': { color: '#8338EC', name: 'Фракція', icon: <BookMarked className="w-3.5 h-3.5" /> },
  'creature': { color: '#E63946', name: 'Істота/Монстр', icon: <Ghost className="w-3.5 h-3.5" /> },
  'magic': { color: '#FF006E', name: 'Магія/Спектри', icon: <Flame className="w-3.5 h-3.5" /> },
  'glossary': { color: '#355070', name: 'Глосарій', icon: <BookOpen className="w-3.5 h-3.5" /> },
  'artifact': { color: '#F15BB5', name: 'Артефакт', icon: <Award className="w-3.5 h-3.5" /> },
  'codex': { color: '#00F5D4', name: 'Кодекс', icon: <ScrollText className="w-3.5 h-3.5" /> },
  'chapter': { color: '#00BBF9', name: 'Розділ книги', icon: <Compass className="w-3.5 h-3.5" /> }
};

export default function BookLoreGraph({ canEdit = true }: BookLoreGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Active book context
  const [activeBookId, setActiveBookId] = useState<string>(() => {
    return localStorage.getItem('prism_active_book_id') || 'glass-prism';
  });

  // Load active book name
  const getBookTitle = () => {
    if (activeBookId === 'glass-prism') return 'Скляна Призма';
    if (activeBookId === 'pulse-chronicles') return 'Хроніки Пульсу';
    if (activeBookId === 'cosmic-ether') return 'Космічний Ефір';
    return 'Світ Книги';
  };

  // Lore Entities State
  const [loreEntities, setLoreEntities] = useState<BookLoreEntity[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string>('lore-center');
  const [isSyncing, setIsSyncing] = useState(false);

  // Form states for creating/editing
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('character');
  const [formCustomType, setFormCustomType] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formLinks, setFormLinks] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'draft' | 'published' | 'hidden'>('published');

  // Interactive controls state
  const [dimensions, setDimensions] = useState({ width: 700, height: 400 });
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Category selection/filtering states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'center', 'character', 'location', 'event', 'faction', 'creature', 'magic', 'glossary', 'artifact', 'codex', 'chapter'
  ]);

  // Physics simulation references
  const nodesRef = useRef<PhysicsNode[]>([]);
  const linksRef = useRef<PhysicsLink[]>([]);
  const animationRef = useRef<number | null>(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const isMovedRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Get active book ID from localStorage periodically (in case of tab changes)
  useEffect(() => {
    const checkBookInterval = setInterval(() => {
      const currentBookId = localStorage.getItem('prism_active_book_id') || 'glass-prism';
      if (currentBookId !== activeBookId) {
        setActiveBookId(currentBookId);
        setActiveNodeId('lore-center');
      }
    }, 1000);
    return () => clearInterval(checkBookInterval);
  }, [activeBookId]);

  // Real-time Firestore sync with local storage fallback
  useEffect(() => {
    setIsSyncing(true);
    let unsubscribe: (() => void) | null = null;
    const path = 'book_lore';

    if (auth.currentUser) {
      try {
        const q = query(collection(db, path), where('book_id', '==', activeBookId));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const items: BookLoreEntity[] = [];
          snapshot.forEach((doc) => {
            items.push(doc.data() as BookLoreEntity);
          });

          if (items.length > 0) {
            // Apply filtering: do not show draft/hidden entities to non-admins
            const visibleItems = items.filter(e => {
              if (e.status === 'published') return true;
              return canEdit; // If admin/editor can edit, they can see drafts and hidden
            });
            setLoreEntities(visibleItems);
            localStorage.setItem(`prism_book_lore_${activeBookId}`, JSON.stringify(items));
          } else {
            // Seed initial data if database is empty for this book
            const seeded = INITIAL_LORE_DATA.filter(e => e.book_id === activeBookId);
            setLoreEntities(seeded);
            // Save seed to Firestore
            seeded.forEach(async (ent) => {
              await setDoc(doc(db, path, ent.id), ent);
            });
          }
          setIsSyncing(false);
        }, (err) => {
          console.warn("Firestore snapshot listener failed, falling back to local storage:", err);
          loadFromLocal();
        });
      } catch (error) {
        console.warn("Firestore collection reference failed, falling back to local storage:", error);
        loadFromLocal();
      }
    } else {
      loadFromLocal();
    }

    function loadFromLocal() {
      const saved = localStorage.getItem(`prism_book_lore_${activeBookId}`);
      if (saved) {
        const items = JSON.parse(saved) as BookLoreEntity[];
        const visibleItems = items.filter(e => {
          if (e.status === 'published') return true;
          return canEdit;
        });
        setLoreEntities(visibleItems);
      } else {
        const filtered = INITIAL_LORE_DATA.filter(e => e.book_id === activeBookId);
        setLoreEntities(filtered);
      }
      setIsSyncing(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeBookId, canEdit]);

  // Compute categories meta information dynamically
  const getCategoryMeta = (type: string) => {
    return CATEGORY_CONFIG[type] || { color: '#6C757D', name: type, icon: <Compass className="w-3.5 h-3.5" /> };
  };

  // Collect unique category IDs present in the current book's lore
  const getAvailableCategories = () => {
    const cats = new Set<string>();
    cats.add('center');
    loreEntities.forEach(e => {
      cats.add(e.type);
    });
    return Array.from(cats);
  };

  // Map lore entities into visual physics nodes and links
  const centerNode: BookLoreEntity = {
    id: 'lore-center',
    book_id: activeBookId,
    title: getBookTitle(),
    type: 'center',
    summary: 'Центральний фокус цього книжкового світу.',
    body: 'Усі сутності цього світу об’єднуються навколо цієї книги. Тут можна додавати нових персонажів, локації та артефакти.',
    tags: ['всесвіт', 'книга', 'призма'],
    links: [],
    status: 'published'
  };

  const getCombinedEntities = () => {
    return [centerNode, ...loreEntities];
  };

  const activeNode = getCombinedEntities().find(n => n.id === activeNodeId) || centerNode;

  // Derive links dynamically from entity connection IDs
  const computedLinks = (() => {
    const linksList: PhysicsLink[] = [];
    const entities = getCombinedEntities();

    entities.forEach(entity => {
      if (entity.id === 'lore-center') {
        // Automatically link first 3 entities to the center node to establish gravity structure
        entities.filter(e => e.id !== 'lore-center').slice(0, 4).forEach(child => {
          linksList.push({ source: 'lore-center', target: child.id });
        });
      }

      if (entity.links && Array.isArray(entity.links)) {
        entity.links.forEach(targetId => {
          if (entities.some(e => e.id === targetId)) {
            const alreadyExists = linksList.some(l => 
              (l.source === entity.id && l.target === targetId) ||
              (l.source === targetId && l.target === entity.id)
            );
            if (!alreadyExists) {
              linksList.push({ source: entity.id, target: targetId });
            }
          }
        });
      }
    });

    return linksList;
  })();

  // 1. Initialize nodes and links for physics loop
  useEffect(() => {
    const width = dimensions.width;
    const height = dimensions.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const entities = getCombinedEntities();

    const nodes: PhysicsNode[] = entities.map((entity, index) => {
      const existing = nodesRef.current.find(n => n.id === entity.id);
      
      let baseRadius = 10;
      if (entity.id === 'lore-center') {
        baseRadius = 18;
      } else if (entity.id === activeNodeId) {
        baseRadius = 13;
      } else {
        baseRadius = 10;
      }

      if (existing) {
        existing.radius = baseRadius;
        return existing;
      }

      // Initial layout circle distribution
      let initX = centerX;
      let initY = centerY;

      if (entity.id !== 'lore-center') {
        const angle = (index / (entities.length - 1)) * Math.PI * 2;
        const radiusDist = 120 + Math.random() * 40;
        initX = centerX + Math.cos(angle) * radiusDist;
        initY = centerY + Math.sin(angle) * radiusDist;
      }

      return {
        id: entity.id,
        title: entity.title,
        category: entity.type,
        x: initX + (Math.random() - 0.5) * 10,
        y: initY + (Math.random() - 0.5) * 10,
        vx: 0,
        vy: 0,
        radius: baseRadius,
      };
    });

    nodesRef.current = nodes;
    linksRef.current = computedLinks;
  }, [dimensions, activeNodeId, loreEntities]);

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
        const colorCfg = getCategoryMeta(u.category);
        const color = colorCfg.color;

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
  }, [dimensions, panX, panY, zoom, activeNodeId, draggedNodeId, selectedCategories, loreEntities]);

  // Handle mouse interactions on the Canvas
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
      setIsAdding(false);
      setIsEditing(false);
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

  // Reset form inputs
  const resetForm = () => {
    setFormTitle('');
    setFormType('character');
    setFormCustomType('');
    setFormSummary('');
    setFormBody('');
    setFormTags('');
    setFormLinks([]);
    setFormStatus('published');
    setEditingEntityId(null);
  };

  // Open Edit Form prefilled with current entity
  const handleOpenEdit = () => {
    if (activeNode.id === 'lore-center') return;
    setEditingEntityId(activeNode.id);
    setFormTitle(activeNode.title);
    
    const isStandardType = Object.keys(CATEGORY_CONFIG).includes(activeNode.type);
    if (isStandardType) {
      setFormType(activeNode.type);
      setFormCustomType('');
    } else {
      setFormType('custom');
      setFormCustomType(activeNode.type);
    }

    setFormSummary(activeNode.summary);
    setFormBody(activeNode.body);
    setFormTags(activeNode.tags.join(', '));
    setFormLinks(activeNode.links || []);
    setFormStatus(activeNode.status);
    setIsEditing(true);
    setIsAdding(false);
  };

  // Save new entity
  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newId = `lore-${Date.now()}`;
    const finalType = formType === 'custom' ? formCustomType.trim().toLowerCase() : formType;
    if (!finalType) return;

    const newEntity: BookLoreEntity = {
      id: newId,
      book_id: activeBookId,
      title: formTitle.trim(),
      type: finalType,
      summary: formSummary.trim(),
      body: formBody.trim(),
      tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
      links: formLinks,
      status: formStatus
    };

    const updated = [...loreEntities, newEntity];
    
    // Connect back from peer nodes synchronously to preserve graph bidirectional state
    const finalEntities = updated.map(ent => {
      if (formLinks.includes(ent.id) && !ent.links.includes(newId)) {
        return { ...ent, links: [...ent.links, newId] };
      }
      return ent;
    });

    try {
      if (auth.currentUser) {
        await setDoc(doc(db, 'book_lore', newId), newEntity);
        for (const peerId of formLinks) {
          const peer = finalEntities.find(p => p.id === peerId);
          if (peer) {
            await setDoc(doc(db, 'book_lore', peerId), peer);
          }
        }
      } else {
        localStorage.setItem(`prism_book_lore_${activeBookId}`, JSON.stringify(finalEntities));
      }

      setLoreEntities(finalEntities);
      setActiveNodeId(newId);
      setIsAdding(false);
      resetForm();
    } catch (err) {
      console.error("Failed to create lore entity:", err);
    }
  };

  // Update existing entity
  const handleUpdateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntityId || !formTitle.trim()) return;

    const finalType = formType === 'custom' ? formCustomType.trim().toLowerCase() : formType;
    if (!finalType) return;

    const updatedEntity: BookLoreEntity = {
      id: editingEntityId,
      book_id: activeBookId,
      title: formTitle.trim(),
      type: finalType,
      summary: formSummary.trim(),
      body: formBody.trim(),
      tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
      links: formLinks,
      status: formStatus
    };

    const updated = loreEntities.map(ent => ent.id === editingEntityId ? updatedEntity : ent);

    // Synchronize connected links back and forth
    const finalEntities = updated.map(ent => {
      // Linked to editing entity, insert reference if missing
      if (formLinks.includes(ent.id) && !ent.links.includes(editingEntityId)) {
        return { ...ent, links: [...ent.links, editingEntityId] };
      }
      // Stale link, discard reference
      if (!formLinks.includes(ent.id) && ent.links.includes(editingEntityId) && ent.id !== editingEntityId) {
        return { ...ent, links: ent.links.filter(l => l !== editingEntityId) };
      }
      return ent;
    });

    try {
      if (auth.currentUser) {
        await setDoc(doc(db, 'book_lore', editingEntityId), updatedEntity);
        for (const ent of finalEntities) {
          if (ent.id === editingEntityId) continue;
          const oldEnt = loreEntities.find(oe => oe.id === ent.id);
          if (JSON.stringify(oldEnt?.links) !== JSON.stringify(ent.links)) {
            await setDoc(doc(db, 'book_lore', ent.id), ent);
          }
        }
      } else {
        localStorage.setItem(`prism_book_lore_${activeBookId}`, JSON.stringify(finalEntities));
      }

      setLoreEntities(finalEntities);
      setActiveNodeId(editingEntityId);
      setIsEditing(false);
      resetForm();
    } catch (err) {
      console.error("Failed to update lore entity:", err);
    }
  };

  // Delete entity
  const handleDeleteEntity = async (idToDelete: string) => {
    if (!window.confirm("Ви дійсно хочете безповоротно видалити цю сутність лору?")) return;

    const remaining = loreEntities.filter(ent => ent.id !== idToDelete);
    const finalEntities = remaining.map(ent => {
      if (ent.links.includes(idToDelete)) {
        return { ...ent, links: ent.links.filter(l => l !== idToDelete) };
      }
      return ent;
    });

    try {
      if (auth.currentUser) {
        await deleteDoc(doc(db, 'book_lore', idToDelete));
        for (const ent of finalEntities) {
          const oldEnt = loreEntities.find(oe => oe.id === ent.id);
          if (oldEnt?.links.includes(idToDelete)) {
            await setDoc(doc(db, 'book_lore', ent.id), ent);
          }
        }
      } else {
        localStorage.setItem(`prism_book_lore_${activeBookId}`, JSON.stringify(finalEntities));
      }

      setLoreEntities(finalEntities);
      setActiveNodeId('lore-center');
    } catch (err) {
      console.error("Failed to delete lore entity:", err);
    }
  };

  // Parse basic markdown to styled HTML tags securely
  const parseMarkdown = (md: string) => {
    if (!md) return '';
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h4 class="font-bold text-xs text-gray-900 dark:text-white mt-4 mb-1.5 font-sans uppercase tracking-wider">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="font-bold text-sm text-gray-900 dark:text-white mt-5 mb-2 font-display">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="font-extrabold text-base text-gray-900 dark:text-white mt-5 mb-2.5 font-display border-b border-gray-100 dark:border-gray-800 pb-1">$1</h2>');

    // Bold/Italics
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

    // Quotes
    html = html.replace(/^>\s?(.*$)/gim, '<blockquote class="border-l-3 border-purple-500 pl-3.5 italic text-gray-500 dark:text-gray-400 my-3 bg-purple-500/[0.02] py-1.5 pr-2.5 rounded-r-xl">$1</blockquote>');

    // List items
    html = html.replace(/^\-\s?(.*$)/gim, '<li class="ml-4 list-disc text-xs text-gray-650 dark:text-gray-300 leading-relaxed">$1</li>');

    // Paragraph split
    const paragraphs = html.split(/\n\n+/);
    return paragraphs.map(p => {
      const trimmed = p.trim();
      if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<li')) {
        return trimmed;
      }
      return `<p class="text-xs text-gray-650 dark:text-gray-300 leading-relaxed mb-3.5 font-sans">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    }).join('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left side: Interactive Canvas & Categories Filter (Col span 8) */}
      <div className="lg:col-span-8 bg-white dark:bg-[#121824] border border-purple-100/50 dark:border-purple-900/20 rounded-3xl p-5 shadow-sm space-y-4">
        
        {/* Header containing Book title and Actions */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-50 dark:border-gray-850 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-display font-black text-gray-900 dark:text-white text-base flex items-center gap-2 tracking-tight">
              <Compass className="w-4.5 h-4.5 text-[#8338EC]" />
              <span>База Знань «{getBookTitle()}»</span>
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-mono tracking-tight flex items-center gap-1.5">
              <span>{getCombinedEntities().length - 1} активних лор-вузлів</span>
              {isSyncing && <span className="text-blue-500 animate-pulse">• синхронізація...</span>}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#8338EC] hover:bg-purple-50 dark:hover:bg-purple-950/20 border border-gray-150 dark:border-gray-800 transition cursor-pointer"
              title="Довідка про керування"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(Math.min(2.2, zoom * 1.2))}
              className="p-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#8338EC] border border-gray-150 dark:border-gray-800 transition cursor-pointer"
              title="Збільшити масштаб"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(Math.max(0.5, zoom / 1.2))}
              className="p-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-[#8338EC] border border-gray-150 dark:border-gray-800 transition cursor-pointer"
              title="Зменшити масштаб"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setZoom(1.0); setPanX(0); setPanY(0); }}
              className="p-1.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-550 hover:text-[#8338EC] border border-gray-150 dark:border-gray-800 transition cursor-pointer flex items-center gap-1.5 text-[10px] font-bold"
              title="Повернутися у центр"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Центр</span>
            </button>
          </div>
        </div>

        {/* Dynamic Help Text */}
        {showHelp && (
          <div className="p-3.5 bg-purple-500/[0.02] border border-purple-100 dark:border-purple-900/30 rounded-2xl text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-sans flex items-start gap-3.5 animate-fade-in shadow-inner">
            <Move className="w-4.5 h-4.5 text-[#8338EC] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-bold text-gray-800 dark:text-gray-200">Інструкція навігації по лору:</h5>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong>Масштаб</strong>: Використовуйте прокручування коліщатка миші на канвасі.</li>
                <li><strong>Панорамування</strong>: Натисніть ліву кнопку миші на фоні та перетягуйте для зміщення камери.</li>
                <li><strong>Вузли</strong>: Перетягуйте окремі елементи для зміни їх позиції у фізичному симуляторі.</li>
                <li><strong>Інспекція</strong>: Клацніть на будь-який вузол лору, щоб відкрити його повні деталі в правому інспекторі.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-gray-50/50 dark:bg-gray-900/30 p-2.5 rounded-2xl border border-gray-100/40 dark:border-gray-850">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="font-bold text-gray-500 dark:text-gray-400">Фільтрація вузлів:</span>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white dark:bg-[#1a2333] border border-gray-200 dark:border-gray-750 rounded-xl text-[11px] font-bold text-gray-700 dark:text-gray-200 shadow-sm cursor-pointer"
            >
              <span>Показати Категорії ({selectedCategories.length})</span>
              {isLegendOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isLegendOpen && (
              <div className="absolute right-0 mt-1.5 bg-white dark:bg-[#1a2333] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-50 p-2.5 space-y-1 w-56 animate-fade-in border-t-purple-500 border-t-2">
                {getAvailableCategories().map((catId) => {
                  const isSelected = selectedCategories.includes(catId);
                  const meta = getCategoryMeta(catId);
                  return (
                    <button
                      key={catId}
                      onClick={() => toggleCategory(catId)}
                      className="w-full flex items-center justify-between gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                        <span className="capitalize text-gray-700 dark:text-gray-200 font-semibold">{meta.name}</span>
                      </div>
                      <div className={`w-4.5 h-4.5 rounded-lg border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-[#8338EC] border-[#8338EC] text-white' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Canvas Element */}
        <div className="relative border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50 dark:bg-[#121824] shadow-inner select-none">
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
          <div className="absolute bottom-2.5 right-2.5 pointer-events-none bg-white/70 dark:bg-[#121824]/70 px-2 py-0.5 rounded-xl text-[8px] sm:text-[9px] font-mono text-gray-400 dark:text-gray-500">
            drag canvas • mousewheel to zoom • click node
          </div>
        </div>
      </div>

      {/* Right side: Lore inspector details, Add Form or Edit Form (Col span 4) */}
      <div className="lg:col-span-4 bg-white dark:bg-[#121824] border border-purple-100/50 dark:border-purple-900/20 rounded-3xl p-6 shadow-sm space-y-5">
        
        {/* State Tab Controllers */}
        <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-850 pb-2 flex-wrap gap-2">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-[#8338EC]" />
            <span>Інспектор Світу</span>
          </h4>

          {canEdit && !isAdding && !isEditing && (
            <button
              onClick={() => { resetForm(); setIsAdding(true); }}
              className="flex items-center gap-1 px-2.5 py-1 bg-purple-500 text-white font-bold text-[10px] rounded-xl hover:bg-purple-600 transition cursor-pointer shadow-sm shadow-purple-500/10 uppercase tracking-wider"
              title="Додати новий лор-елемент"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати</span>
            </button>
          )}
        </div>

        {/* TAB 1: ADD NEW ENTITY FORM */}
        {isAdding && (
          <form onSubmit={handleCreateEntity} className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                <Plus className="w-4 h-4" />
                <span>Нова лор-сутність</span>
              </span>
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); resetForm(); }}
                className="text-gray-400 hover:text-red-500 cursor-pointer p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                  Назва сутності
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-3 outline-none focus:bg-white text-gray-900 dark:text-gray-100"
                  placeholder="напр., Альд або Спектральні Сади"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                    Тип лору
                  </label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-2.5 outline-none text-gray-900 dark:text-gray-100"
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                  >
                    {Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== 'center').map(([key, meta]) => (
                      <option key={key} value={key}>{meta.name}</option>
                    ))}
                    <option value="custom">Свій тип...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                    Статус
                  </label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-2.5 outline-none text-gray-900 dark:text-gray-100"
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                  >
                    <option value="published">Опубліковано</option>
                    <option value="draft">Чернетка</option>
                    <option value="hidden">Приховано</option>
                  </select>
                </div>
              </div>

              {formType === 'custom' && (
                <div className="animate-fade-in">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                    Вкажіть свій тип (extensible)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-3 outline-none focus:bg-white text-gray-900 dark:text-gray-100 font-mono"
                    placeholder="напр., magic, faction, codex, etc."
                    value={formCustomType}
                    onChange={e => setFormCustomType(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                  Короткий опис (1–2 фрази)
                </label>
                <textarea
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-3 outline-none focus:bg-white text-gray-900 dark:text-gray-100"
                  rows={2}
                  placeholder="Коротка суть сутності у світі книги..."
                  value={formSummary}
                  onChange={e => setFormSummary(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                  Повна історія (Markdown)
                </label>
                <textarea
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-3 outline-none focus:bg-white text-gray-900 dark:text-gray-100 font-mono text-[11px]"
                  rows={6}
                  placeholder="### Історія персонажа&#10;**Альд** пройшов багато..."
                  value={formBody}
                  onChange={e => setFormBody(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                  Теги (через кому)
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-3 outline-none focus:bg-white text-gray-900 dark:text-gray-100 font-mono"
                  placeholder="персонаж, світло, маг"
                  value={formTags}
                  onChange={e => setFormTags(e.target.value)}
                />
              </div>

              {/* Related Peer links picker */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                  Зв’язати з іншими сутностями лору
                </label>
                <div className="max-h-24 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl p-2.5 space-y-1 bg-gray-50/[0.02]">
                  {loreEntities.map(ent => (
                    <label key={ent.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={formLinks.includes(ent.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormLinks([...formLinks, ent.id]);
                          } else {
                            setFormLinks(formLinks.filter(l => l !== ent.id));
                          }
                        }}
                        className="rounded text-purple-500 border-gray-300 dark:border-gray-700 focus:ring-purple-500"
                      />
                      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">{ent.title}</span>
                    </label>
                  ))}
                  {loreEntities.length === 0 && (
                    <span className="text-[10px] text-gray-400 italic block py-2">Спершу додайте інші сутності</span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-purple-500/10 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Зберегти сутність</span>
            </button>
          </form>
        )}

        {/* TAB 2: EDIT EXISTING ENTITY FORM */}
        {isEditing && (
          <form onSubmit={handleUpdateEntity} className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                <Edit className="w-4 h-4" />
                <span>Редагувати: {activeNode.title}</span>
              </span>
              <button 
                type="button" 
                onClick={() => { setIsEditing(false); resetForm(); }}
                className="text-gray-400 hover:text-red-500 cursor-pointer p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                  Назва сутності
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-3 outline-none focus:bg-white text-gray-900 dark:text-gray-100"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                    Тип лору
                  </label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-2.5 outline-none text-gray-900 dark:text-gray-100"
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                  >
                    {Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== 'center').map(([key, meta]) => (
                      <option key={key} value={key}>{meta.name}</option>
                    ))}
                    <option value="custom">Свій тип...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                    Статус
                  </label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-2.5 outline-none text-gray-900 dark:text-gray-100"
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                  >
                    <option value="published">Опубліковано</option>
                    <option value="draft">Чернетка</option>
                    <option value="hidden">Приховано</option>
                  </select>
                </div>
              </div>

              {formType === 'custom' && (
                <div className="animate-fade-in">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                    Вкажіть свій тип (extensible)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-3 outline-none focus:bg-white text-gray-900 dark:text-gray-100 font-mono"
                    value={formCustomType}
                    onChange={e => setFormCustomType(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                  Короткий опис (1–2 фрази)
                </label>
                <textarea
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-3 outline-none focus:bg-white text-gray-900 dark:text-gray-100"
                  rows={2}
                  value={formSummary}
                  onChange={e => setFormSummary(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                  Повна історія (Markdown)
                </label>
                <textarea
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-3 outline-none focus:bg-white text-gray-900 dark:text-gray-100 font-mono text-[11px]"
                  rows={6}
                  value={formBody}
                  onChange={e => setFormBody(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                  Теги (через кому)
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2 px-3 outline-none focus:bg-white text-gray-900 dark:text-gray-100 font-mono"
                  value={formTags}
                  onChange={e => setFormTags(e.target.value)}
                />
              </div>

              {/* Related Peer links picker */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase font-mono tracking-wider mb-1">
                  Зв’язати з іншими сутностями лору
                </label>
                <div className="max-h-24 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl p-2.5 space-y-1 bg-gray-50/[0.02]">
                  {loreEntities.filter(ent => ent.id !== editingEntityId).map(ent => (
                    <label key={ent.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={formLinks.includes(ent.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormLinks([...formLinks, ent.id]);
                          } else {
                            setFormLinks(formLinks.filter(l => l !== ent.id));
                          }
                        }}
                        className="rounded text-purple-500 border-gray-300 dark:border-gray-700 focus:ring-purple-500"
                      />
                      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">{ent.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setIsEditing(false); resetForm(); }}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold text-xs rounded-xl transition cursor-pointer text-gray-600 dark:text-gray-300"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-purple-500/10 flex items-center justify-center gap-1"
              >
                <Save className="w-4 h-4" />
                <span>Оновити</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: DEFAULT LORE NODE INSPECTOR */}
        {!isAdding && !isEditing && (
          <div className="space-y-4 animate-fade-in">
            {activeNode ? (
              <div className="space-y-4">
                
                {/* Meta details header */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center" style={{ backgroundColor: getCategoryMeta(activeNode.type).color }}>
                      {getCategoryMeta(activeNode.type).icon}
                    </span>
                    <div>
                      <h3 className="font-display font-black text-gray-900 dark:text-white text-base tracking-tight leading-none">
                        {activeNode.title}
                      </h3>
                      <span className="text-[10px] uppercase font-mono tracking-wider font-bold block mt-1.5" style={{ color: getCategoryMeta(activeNode.type).color }}>
                        {getCategoryMeta(activeNode.type).name}
                      </span>
                    </div>
                  </div>

                  {/* Status label indicators for draft/hidden items */}
                  {canEdit && activeNode.id !== 'lore-center' && (
                    <div className="flex items-center gap-1.5">
                      {activeNode.status === 'draft' && (
                        <span className="text-[8px] font-mono font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/10">ЧЕРНЕТКА</span>
                      )}
                      {activeNode.status === 'hidden' && (
                        <span className="text-[8px] font-mono font-bold bg-gray-500/10 text-gray-500 px-1.5 py-0.5 rounded border border-gray-500/10">ПРИХОВАНО</span>
                      )}
                      {activeNode.status === 'published' && (
                        <span className="text-[8px] font-mono font-bold bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/10">АКТИВНО</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 1-2 sentence summary */}
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-sans bg-gray-50 dark:bg-gray-900/40 p-3.5 rounded-2xl border border-gray-100/30 dark:border-gray-850 shadow-inner italic">
                  {activeNode.summary}
                </div>

                {/* Markdown body content */}
                <div className="text-xs leading-relaxed space-y-2 border-t border-gray-50 dark:border-gray-850 pt-4 text-gray-700 dark:text-gray-300">
                  <div 
                    className="prose prose-xs max-w-none dark:prose-invert font-sans"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(activeNode.body) }}
                  />
                </div>

                {/* Pills list of Tags */}
                {activeNode.tags && activeNode.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {activeNode.tags.map((tag, idx) => (
                      <span 
                        key={idx}
                        className="text-[10px] font-bold font-mono bg-purple-500/[0.04] text-[#8338EC] dark:text-[#a78bfa] border border-purple-500/10 px-2 py-0.5 rounded-lg"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Connected / sibling lore nodes navigation */}
                <div className="space-y-2 pt-3 border-t border-gray-50 dark:border-gray-850">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-gray-400 dark:text-gray-500 block font-bold">
                    Споріднені лор-зв’язки:
                  </span>
                  
                  <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {computedLinks.filter(l => l.source === activeNodeId || l.target === activeNodeId).map(link => {
                      const peerId = link.source === activeNodeId ? link.target : link.source;
                      const peerNode = getCombinedEntities().find(n => n.id === peerId);
                      if (!peerNode) return null;
                      return (
                        <button
                          key={peerId}
                          onClick={() => { setActiveNodeId(peerId); setIsAdding(false); setIsEditing(false); }}
                          className="w-full text-left p-2.5 rounded-xl border border-gray-100/40 dark:border-gray-850 hover:border-purple-200 dark:hover:border-purple-900/40 hover:bg-purple-50/10 dark:hover:bg-purple-950/10 text-xs text-gray-700 dark:text-gray-300 font-bold cursor-pointer transition flex items-center justify-between"
                        >
                          <span className="truncate">{peerNode.title}</span>
                          <span className="text-[8px] bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded-lg capitalize font-bold font-mono border border-purple-100/30" style={{ color: getCategoryMeta(peerNode.type).color }}>
                            {getCategoryMeta(peerNode.type).name}
                          </span>
                        </button>
                      );
                    })}

                    {computedLinks.filter(l => l.source === activeNodeId || l.target === activeNodeId).length === 0 && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-550 italic block py-2">
                        Окремий автономний вузол. Зв’язки відсутні.
                      </span>
                    )}
                  </div>
                </div>

                {/* Admin/Editor actions for Edit and Delete */}
                {canEdit && activeNode.id !== 'lore-center' && (
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-50 dark:border-gray-850">
                    <button
                      onClick={handleOpenEdit}
                      className="flex-1 py-2 bg-gray-50 dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-purple-950/10 text-gray-600 dark:text-gray-300 hover:text-[#8338EC] dark:hover:text-[#a78bfa] font-bold text-xs rounded-xl transition cursor-pointer border border-gray-100 dark:border-gray-850 flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Редагувати</span>
                    </button>
                    <button
                      onClick={() => handleDeleteEntity(activeNode.id)}
                      className="py-2 px-3 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white font-bold text-xs rounded-xl transition cursor-pointer border border-red-500/10 flex items-center justify-center gap-1.5"
                      title="Видалити безповоротно"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <p className="text-xs text-center text-gray-400 dark:text-gray-550 py-10 font-sans">
                Виберіть вузол на інтерактивній карті для перегляду деталей
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
