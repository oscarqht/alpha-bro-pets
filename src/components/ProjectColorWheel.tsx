// Extracted from Raft's ProjectIconPicker; palette and bloom motion preserved.
import React, { useRef, useEffect, useState } from 'react';
import { PROJECT_ICON_PALETTE, type ProjectIconDefinition } from '../utils/projectIcons';

const PI = Math.PI;
const TAU = Math.PI * 2;
const WHEEL_SIZE = 176;
const WHEEL_INNER = 170;
const WHEEL_CENTER = WHEEL_INNER / 2;
const SPRING_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export function ProjectColorWheel({ currentDef, onSelectColor, onClose, defaultWheelOpen = false }: {
  currentDef: ProjectIconDefinition;
  onSelectColor: (color: string) => void;
  onClose: () => void;
  defaultWheelOpen?: boolean;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const wheelLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bloomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isWheelOpen, setIsWheelOpen] = useState(defaultWheelOpen);
  const [isBlooming, setIsBlooming] = useState(false);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [isTriggerHovered, setIsTriggerHovered] = useState(false);

  const openWheel = () => {
    if (wheelLeaveTimerRef.current !== null) {
      clearTimeout(wheelLeaveTimerRef.current);
      wheelLeaveTimerRef.current = null;
    }
    if (!isWheelOpen) {
      setIsWheelOpen(true);
      setIsBlooming(true);
      if (bloomTimerRef.current !== null) {
        clearTimeout(bloomTimerRef.current);
      }
      bloomTimerRef.current = setTimeout(() => {
        setIsBlooming(false);
      }, 650);
    }
  };

  const closeWheel = () => {
    if (wheelLeaveTimerRef.current !== null) {
      clearTimeout(wheelLeaveTimerRef.current);
      wheelLeaveTimerRef.current = null;
    }
    if (bloomTimerRef.current !== null) {
      clearTimeout(bloomTimerRef.current);
      bloomTimerRef.current = null;
    }
    setIsBlooming(false);
    setIsWheelOpen(false);
    setHoveredColor(null);
  };


  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) closeWheel();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isWheelOpen) closeWheel();
        else onClose();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      if (wheelLeaveTimerRef.current !== null) clearTimeout(wheelLeaveTimerRef.current);
      if (bloomTimerRef.current !== null) clearTimeout(bloomTimerRef.current);
    };
  }, [isWheelOpen, onClose]);

  const outerRingColors = PROJECT_ICON_PALETTE.filter((p) => p.ring === 0);
  const innerRingColors = PROJECT_ICON_PALETTE.filter((p) => p.ring === 1);
  const isCustomColor = !PROJECT_ICON_PALETTE.some(
    (p) => p.hex.toLowerCase() === currentDef.color.toLowerCase(),
  );

  return (
      <div
        ref={pickerRef}
        data-project-color-picker
        className="absolute top-3.5 right-3.5 w-11 h-11 z-30"
        onMouseEnter={openWheel}
        onMouseLeave={() => {
          if (
            typeof document !== 'undefined' &&
            customInputRef.current &&
            document.activeElement === customInputRef.current
          ) {
            return;
          }
          wheelLeaveTimerRef.current = setTimeout(() => {
            closeWheel();
          }, 240);
        }}
      >
        <button
          type="button"
          aria-label="Choose color"
          aria-expanded={isWheelOpen}
          title="Open color wheel"
          onClick={openWheel}
          onMouseEnter={() => setIsTriggerHovered(true)}
          onMouseLeave={() => setIsTriggerHovered(false)}
          style={{
            background:
              'conic-gradient(from 0deg, #ffb3b3, #ffe08a, #c9f08a, #9ff0c6, #9fe3f5, #b3c4ff, #d9b3ff, #ffb3e0, #ffb3b3)',
            transform: isWheelOpen
              ? 'scale(0.8)'
              : isTriggerHovered
                ? 'scale(1.08)'
                : 'scale(1)',
            opacity: isWheelOpen ? 0 : 1,
            transition: `transform 350ms ${SPRING_EASE}, opacity 200ms ease`,
          }}
          className="w-11 h-11 rounded-full p-[3px] border-0 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_24px_-12px_rgba(0,0,0,0.35)]"
        >
          <span
            className="block w-full h-full rounded-full transition-colors duration-300"
            style={{
              backgroundColor: currentDef.color,
              boxShadow: 'inset 0 0 0 3.5px #ffffff',
            }}
          />
        </button>

        {/* 2-Ring Flower Color Wheel with Bloom Transition */}
        <div
          data-project-color-wheel
          role="group"
          aria-label="Color wheel"
          aria-hidden={!isWheelOpen}
          style={{
            width: `${WHEEL_SIZE}px`,
            height: `${WHEEL_SIZE}px`,
            marginLeft: `${-WHEEL_SIZE / 2}px`,
            marginTop: `${-WHEEL_SIZE / 2}px`,
            background:
              'conic-gradient(from 0deg, #ffb3b3, #ffe08a, #c9f08a, #9ff0c6, #9fe3f5, #b3c4ff, #d9b3ff, #ffb3e0, #ffb3b3)',
            opacity: isWheelOpen ? 1 : 0,
            transform: isWheelOpen ? 'scale(1) rotate(0deg)' : 'scale(0.36) rotate(-160deg)',
            pointerEvents: isWheelOpen ? 'auto' : 'none',
            transition: isWheelOpen
              ? `transform 700ms ${SPRING_EASE}, opacity 200ms ease`
              : `transform 450ms ${SPRING_EASE}, opacity 180ms ease`,
          }}
          className="absolute left-1/2 top-1/2 z-40 rounded-full p-[3px] shadow-[0_2px_6px_rgba(0,0,0,0.12),0_18px_36px_-12px_rgba(0,0,0,0.35)]"
        >
          <div className="relative w-full h-full rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
            {/* Outer Ring (12 vivid flat circles) */}
            {outerRingColors.map((item, j) => {
              const th = (j / outerRingColors.length) * TAU;
              const r = 53;
              const dx = r * Math.sin(th);
              const dy = -r * Math.cos(th);
              const isPressed = item.hex.toLowerCase() === currentDef.color.toLowerCase();
              const isHovered = hoveredColor === item.hex;
              const petalScale = !isWheelOpen
                ? 0.4
                : isPressed && isHovered
                  ? 1.24
                  : isPressed
                    ? 1.16
                    : isHovered
                      ? 1.16
                      : 1;
              const delaySec = isWheelOpen && isBlooming && !isHovered ? j * 0.022 : 0;

              return (
                <button
                  key={item.hex}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-pressed={isPressed}
                  tabIndex={isWheelOpen ? 0 : -1}
                  onMouseEnter={() => setHoveredColor(item.hex)}
                  onMouseLeave={() => setHoveredColor((prev) => (prev === item.hex ? null : prev))}
                  onClick={() => {
                    onSelectColor(item.hex);
                    closeWheel();
                  }}
                  style={{
                    width: '44px',
                    height: '44px',
                    left: `${WHEEL_CENTER}px`,
                    top: `${WHEEL_CENTER}px`,
                    backgroundColor: item.hex,
                    zIndex: isPressed ? 50 : isHovered ? 45 : 1 + j,
                    transform: isWheelOpen
                      ? `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${petalScale})`
                      : 'translate(-50%, -50%) translate(0px, 0px) scale(0.4)',
                    transitionProperty: 'transform, box-shadow',
                    transitionDuration: isWheelOpen ? (isHovered ? '260ms, 200ms' : '600ms, 200ms') : '350ms, 200ms',
                    transitionTimingFunction: `${SPRING_EASE}, ease`,
                    transitionDelay: `${delaySec}s, 0s`,
                    boxShadow: isPressed
                      ? '0 0 0 3px #ffffff, 0 8px 16px -4px rgba(0,0,0,0.35)'
                      : isHovered
                        ? '0 4px 10px -2px rgba(0,0,0,0.22)'
                        : '0 1px 2px rgba(0,0,0,0.12)',
                  }}
                  className="absolute rounded-full border-0 p-0 cursor-pointer"
                />
              );
            })}

            {/* Inner Ring (6 neutral/pastel flat circles) */}
            {innerRingColors.map((item, j) => {
              const th = (j / innerRingColors.length) * TAU + PI / 6;
              const r = 27;
              const dx = r * Math.sin(th);
              const dy = -r * Math.cos(th);
              const isPressed = item.hex.toLowerCase() === currentDef.color.toLowerCase();
              const isHovered = hoveredColor === item.hex;
              const petalScale = !isWheelOpen
                ? 0.4
                : isPressed && isHovered
                  ? 1.24
                  : isPressed
                    ? 1.16
                    : isHovered
                      ? 1.16
                      : 1;
              const delaySec = isWheelOpen && isBlooming && !isHovered ? 0.14 + j * 0.03 : 0;

              return (
                <button
                  key={item.hex}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-pressed={isPressed}
                  tabIndex={isWheelOpen ? 0 : -1}
                  onMouseEnter={() => setHoveredColor(item.hex)}
                  onMouseLeave={() => setHoveredColor((prev) => (prev === item.hex ? null : prev))}
                  onClick={() => {
                    onSelectColor(item.hex);
                    closeWheel();
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    left: `${WHEEL_CENTER}px`,
                    top: `${WHEEL_CENTER}px`,
                    backgroundColor: item.hex,
                    zIndex: isPressed ? 50 : isHovered ? 45 : 20 + j,
                    transform: isWheelOpen
                      ? `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${petalScale})`
                      : 'translate(-50%, -50%) translate(0px, 0px) scale(0.4)',
                    transitionProperty: 'transform, box-shadow',
                    transitionDuration: isWheelOpen ? (isHovered ? '260ms, 200ms' : '600ms, 200ms') : '350ms, 200ms',
                    transitionTimingFunction: `${SPRING_EASE}, ease`,
                    transitionDelay: `${delaySec}s, 0s`,
                    boxShadow: isPressed
                      ? '0 0 0 3px #ffffff, 0 8px 16px -4px rgba(0,0,0,0.35)'
                      : isHovered
                        ? '0 4px 10px -2px rgba(0,0,0,0.22)'
                        : '0 1px 2px rgba(0,0,0,0.12)',
                  }}
                  className="absolute rounded-full border-0 p-0 cursor-pointer"
                />
              );
            })}

            {/* Center Custom Color Input Petal */}
            <label
              title="Custom color"
              onMouseEnter={() => setHoveredColor('__custom__')}
              onMouseLeave={() => setHoveredColor((prev) => (prev === '__custom__' ? null : prev))}
              style={{
                width: '38px',
                height: '38px',
                left: `${WHEEL_CENTER}px`,
                top: `${WHEEL_CENTER}px`,
                zIndex: hoveredColor === '__custom__' ? 48 : 40,
                transform: isWheelOpen
                  ? `translate(-50%, -50%) scale(${
                      hoveredColor === '__custom__' ? 1.15 : isCustomColor ? 1.12 : 1
                    })`
                  : 'translate(-50%, -50%) scale(0.4)',
                transitionProperty: 'transform, box-shadow',
                transitionDuration: isWheelOpen
                  ? hoveredColor === '__custom__'
                    ? '260ms, 200ms'
                    : '600ms, 200ms'
                  : '350ms, 200ms',
                transitionTimingFunction: `${SPRING_EASE}, ease`,
                transitionDelay:
                  isWheelOpen && isBlooming && hoveredColor !== '__custom__' ? '0.26s, 0s' : '0s, 0s',
                backgroundColor: isCustomColor ? currentDef.color : '#ffffff',
                boxShadow: isCustomColor
                  ? '0 0 0 3px #ffffff, 0 8px 16px -4px rgba(0,0,0,0.35)'
                  : '0 1px 3px rgba(0,0,0,0.2)',
              }}
              className="absolute rounded-full grid place-items-center cursor-pointer"
            >
              <span className="sr-only">Custom color</span>
              {!isCustomColor && (
                <span
                  className="w-[44%] h-[44%] rounded-full"
                  style={{
                    background:
                      'conic-gradient(#ff5a5a, #ffc20e, #5ccb77, #1ed8c0, #3f95f5, #9966ff, #ff5aa5, #ff5a5a)',
                    boxShadow: '0 0 0 2px #ffffff',
                  }}
                />
              )}
              <input
                ref={customInputRef}
                type="color"
                aria-label="Custom color"
                tabIndex={isWheelOpen ? 0 : -1}
                value={currentDef.color}
                onChange={(e) => onSelectColor(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer border-0 p-0 rounded-full"
              />
            </label>
          </div>
        </div>
      </div>

  );
}
