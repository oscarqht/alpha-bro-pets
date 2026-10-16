import React, { useRef, useEffect, useState } from 'react';
import {
  PROJECT_AVATAR_SHAPES,
  PROJECT_ICON_EXPRESSIONS,
  formatProjectIconId,
  getProjectIcon,
  hexToRgba,
} from '../utils/projectIcons';
import { ProjectIcon } from './ProjectIcon';
import { ProjectColorWheel } from './ProjectColorWheel';
import './ProjectIconPicker.css';

export interface ProjectIconPickerProps {
  selectedIcon?: string | null;
  onSelectIcon: (iconId: string) => void;
  onClose: () => void;
  className?: string;
  defaultWheelOpen?: boolean;
}

const PI = Math.PI;

const STAGE_WIDTH = 332;
const STAGE_HEIGHT = 250;
const RING_CX = STAGE_WIDTH / 2;
const RING_CY = 138;
const RING_RADIUS = 114;
const BUBBLE_SIZE = 29;

const ARC_SCALES = [1, 0.82, 0.74, 0.66, 0.6];
const ARC_OPACITIES = [1, 0.9, 0.6, 0.38, 0];

const SPRING_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export const ProjectIconPicker: React.FC<ProjectIconPickerProps> = ({
  selectedIcon,
  onSelectIcon,
  onClose,
  className = '',
  defaultWheelOpen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentDef = getProjectIcon(selectedIcon);
  const [hoveredExpr, setHoveredExpr] = useState<string | null>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSelectCombination = (next: {
    shapeId?: string;
    expressionId?: string;
    color?: string;
  }) => {
    const nextIconId = formatProjectIconId({
      shapeId: next.shapeId ?? currentDef.shapeId,
      expressionId: next.expressionId ?? currentDef.expressionId,
      color: next.color ?? currentDef.color,
    });
    onSelectIcon(nextIconId);
  };

  const shapeCount = PROJECT_AVATAR_SHAPES.length;
  const activeShapeIndex = Math.max(
    0,
    PROJECT_AVATAR_SHAPES.findIndex((sh) => sh.id === currentDef.shapeId),
  );

  const stepShape = (delta: number) => {
    const nextIdx = (activeShapeIndex + delta + shapeCount) % shapeCount;
    handleSelectCombination({ shapeId: PROJECT_AVATAR_SHAPES[nextIdx].id });
  };

  const exprCount = PROJECT_ICON_EXPRESSIONS.length;
  const activeExprIndex = Math.max(
    0,
    PROJECT_ICON_EXPRESSIONS.findIndex((ex) => ex.id === currentDef.expressionId),
  );

  const angleOfExpression = (idx: number) => -138 + (276 * idx) / (exprCount - 1);
  const activeAngleRad = (angleOfExpression(activeExprIndex) * PI) / 180;
  const indX = RING_CX + RING_RADIUS * Math.sin(activeAngleRad);
  const indY = RING_CY - RING_RADIUS * Math.cos(activeAngleRad);


  return (
    <div
      ref={containerRef}
      data-project-icon-picker
      style={{
        backgroundImage: 'radial-gradient(rgba(160, 160, 167, 0.28) 1.25px, transparent 1.25px)',
        backgroundSize: '18px 18px',
      }}
      className={`relative z-50 w-[356px] rounded-[28px] border border-[#E9E9E6] dark:border-white/10 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_30px_70px_-30px_rgba(24,24,27,0.28)] bg-white dark:bg-cozy-surface p-3.5 pb-4 flex flex-col items-center text-[#18181B] dark:text-cozy-text select-none ${className}`}
    >
      <ProjectColorWheel currentDef={currentDef} onSelectColor={(color) => handleSelectCombination({ color })} defaultWheelOpen={defaultWheelOpen} onClose={onClose} />

      {/* Stage: Center Large Preview + Expression Selection Ring */}
      <div
        className="relative shrink-0"
        style={{ width: `${STAGE_WIDTH}px`, height: `${STAGE_HEIGHT}px` }}
        role="radiogroup"
        aria-label="Expression"
        onKeyDown={(event) => {
          const delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1
            : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
          if (!delta && event.key !== 'Home' && event.key !== 'End') return;
          event.preventDefault();
          const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? exprCount - 1
            : (activeExprIndex + delta + exprCount) % exprCount;
          handleSelectCombination({ expressionId: PROJECT_ICON_EXPRESSIONS[nextIndex].id });
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
        }}
      >
        {/* Active Expression Halo Indicator */}
        <div
          aria-hidden="true"
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${BUBBLE_SIZE + 12}px`,
            height: `${BUBBLE_SIZE + 12}px`,
            left: `${indX}px`,
            top: `${indY}px`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: hexToRgba(currentDef.color, 0.3),
            boxShadow: `0 0 0 2px #ffffff, 0 10px 22px -8px ${hexToRgba(currentDef.color, 0.85)}`,
            transition:
              'left 260ms cubic-bezier(0.22, 1, 0.36, 1), top 260ms cubic-bezier(0.22, 1, 0.36, 1), background-color 200ms ease, box-shadow 200ms ease',
          }}
        />

        {/* 18 Expression Bubbles along the horseshoe arc (-138° to +138°) */}
        {PROJECT_ICON_EXPRESSIONS.map((expr, idx) => {
          const deg = angleOfExpression(idx);
          const rad = (deg * PI) / 180;
          const bx = RING_CX + RING_RADIUS * Math.sin(rad);
          const by = RING_CY - RING_RADIUS * Math.cos(rad);
          const isSelected = expr.id === currentDef.expressionId;
          const isHovered = hoveredExpr === expr.id;
          const bubbleScale = isHovered ? 1.15 : isSelected ? 1.1 : 1;
          const bubbleIconId = formatProjectIconId({
            shapeId: 'circle',
            expressionId: expr.id,
            color: currentDef.color,
          });

          return (
            <button
              key={expr.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              aria-label={expr.label}
              title={expr.label}
              onMouseEnter={() => setHoveredExpr(expr.id)}
              onMouseLeave={() => setHoveredExpr((prev) => (prev === expr.id ? null : prev))}
              onClick={() => handleSelectCombination({ expressionId: expr.id })}
              style={{
                width: `${BUBBLE_SIZE}px`,
                height: `${BUBBLE_SIZE}px`,
                left: `${bx}px`,
                top: `${by}px`,
                transform: `translate(-50%, -50%) scale(${bubbleScale})`,
                transition: `transform 300ms ${SPRING_EASE}`,
              }}
              className="absolute rounded-full p-0 border-0 bg-transparent cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181B]"
            >
              <ProjectIcon
                icon={bubbleIconId}
                viewBox="-1.02 -1.02 2.04 2.04"
                className="w-full h-full block rounded-full pointer-events-none"
              />
            </button>
          );
        })}

        {/* Center Large Avatar Preview */}
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            width: '132px',
            height: '132px',
            left: `${RING_CX}px`,
            top: `${RING_CY}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <ProjectIcon
            icon={currentDef.id}
            title={`Preview: ${currentDef.name}`}
            className="w-full h-full drop-shadow-[0_8px_18px_rgba(24,24,27,0.10)]"
          />
        </div>
      </div>

      {/* Curved Shape Carousel Arc below the preview */}
      <div
        role="radiogroup"
        aria-label="Shape"
        onKeyDown={(event) => {
          const delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1
            : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
          if (!delta && event.key !== 'Home' && event.key !== 'End') return;
          event.preventDefault();
          const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? shapeCount - 1
            : (activeShapeIndex + delta + shapeCount) % shapeCount;
          handleSelectCombination({ shapeId: PROJECT_AVATAR_SHAPES[nextIndex].id });
          const next = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex];
          requestAnimationFrame(() => next?.focus());
        }}
        onWheel={(e) => {
          e.preventDefault();
          const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          if (Math.abs(delta) > 4) {
            stepShape(delta > 0 ? 1 : -1);
          }
        }}
        className="relative w-full h-[94px] -mt-6 overflow-hidden outline-none"
      >
        {/* Center Active Slot Well */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[16px] w-[66px] h-[66px] -ml-[33px] rounded-[20px] bg-[#F5F5F3] dark:bg-white/10 shadow-[inset_0_0_0_1px_#E9E9E6] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] pointer-events-none"
        />

        {/* Fade only the moving shapes; leave dots, active slot and controls crisp. */}
        <div className="project-shape-track absolute inset-0">
          <div className="project-shape-track-items absolute inset-0">
        {PROJECT_AVATAR_SHAPES.map((shape, idx) => {
          let d = (((idx - activeShapeIndex) % shapeCount) + shapeCount) % shapeCount;
          if (d > shapeCount / 2) d -= shapeCount;
          const absD = Math.abs(d);
          const clampedD = Math.min(absD, 4);

          const spacing = 48;
          const tx = Math.sign(d) * clampedD * spacing;
          const ty = -clampedD * clampedD * 4.5;
          const rot = Math.sign(d) * clampedD * -10;
          const scale = ARC_SCALES[clampedD];
          const opacity = absD <= 3 ? ARC_OPACITIES[clampedD] : 0;
          const isSelected = idx === activeShapeIndex;
          const shapeIconId = formatProjectIconId({
            shapeId: shape.id,
            expressionId: currentDef.expressionId,
            color: currentDef.color,
          });

          return (
            <button
              key={shape.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={shape.label}
              title={shape.label}
              tabIndex={isSelected ? 0 : -1}
              aria-hidden={absD > 3}
              onClick={() => handleSelectCombination({ shapeId: shape.id })}
              style={{
                transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${scale})`,
                opacity,
                pointerEvents: absD <= 3 ? 'auto' : 'none',
                transition:
                  absD <= 4
                    ? 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease'
                    : 'none',
              }}
              className="absolute left-1/2 top-[16px] w-[66px] h-[66px] -ml-[33px] rounded-[20px] border-0 bg-transparent p-2.5 cursor-pointer grid place-items-center"
            >
              <ProjectIcon
                icon={shapeIconId}
                showFace={false}
                className="w-full h-full pointer-events-none"
              />
            </button>
          );
        })}
          </div>
        </div>

        {/* Previous / Next shape cycle triggers on the left/right edges */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Previous shape"
          title="Previous shape"
          onClick={() => stepShape(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/80 dark:bg-cozy-surface/80 border border-[#E9E9E6] dark:border-white/10 flex items-center justify-center text-[#66666E] hover:text-[#18181B] dark:hover:text-white cursor-pointer shadow-xs"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Next shape"
          title="Next shape"
          onClick={() => stepShape(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/80 dark:bg-cozy-surface/80 border border-[#E9E9E6] dark:border-white/10 flex items-center justify-center text-[#66666E] hover:text-[#18181B] dark:hover:text-white cursor-pointer shadow-xs"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 12l4-4-4-4" />
          </svg>
        </button>
      </div>

      {/* Active Shape Label */}
      <div
        data-testid="active-shape-label"
        className="text-xs font-semibold text-[#66666E] dark:text-cozy-muted text-center -mt-1.5"
      >
        {currentDef.shapeLabel}
      </div>
    </div>
  );
};
