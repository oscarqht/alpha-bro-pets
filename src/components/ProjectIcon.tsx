import React from 'react';
import {
  getProjectIcon,
  type ProjectAvatarBrowType,
  type ProjectAvatarEyeType,
} from '../utils/projectIcons';

export interface ProjectIconProps extends React.SVGProps<SVGSVGElement> {
  icon?: string | null;
  className?: string;
  title?: string;
  showFace?: boolean;
}

const FACE_SCALE = 1.45;
const PI = Math.PI;

function getEyeHalfHeight(eyeType: ProjectAvatarEyeType): number {
  switch (eyeType) {
    case 'toon':
      return 0.175;
    case 'pill':
    case 'ring':
      return 0.11;
    case 'dot':
      return 0.09;
    default:
      return 0.1;
  }
}

function renderSingleEye(
  eyeType: ProjectAvatarEyeType,
  side: -1 | 1,
  ink: string,
): React.ReactNode {
  const actualType = eyeType === 'wink' ? (side < 0 ? 'toon' : 'squint') : eyeType;

  switch (actualType) {
    case 'toon':
      return (
        <>
          <ellipse cx={0} cy={0} rx={0.14} ry={0.175} fill="#FFFFFF" />
          <ellipse className="project-icon-pupil" cx={-side * 0.012} cy={0.025} rx={0.085} ry={0.092} fill="#141416" />
        </>
      );
    case 'pill':
      return <rect x={-0.04} y={-0.11} width={0.08} height={0.22} rx={0.04} fill={ink} />;
    case 'dot':
      return <ellipse cx={0} cy={0} rx={0.085} ry={0.09} fill={ink} />;
    case 'ring':
      return (
        <ellipse
          cx={0}
          cy={0}
          rx={0.09}
          ry={0.105}
          fill="none"
          stroke={ink}
          strokeWidth={0.05}
        />
      );
    case 'happy':
      return (
        <path
          d="M -0.085 0.05 L 0 -0.07 L 0.085 0.05"
          fill="none"
          stroke={ink}
          strokeWidth={0.05}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'plus':
      return (
        <path
          d="M -0.1 0 L 0.1 0 M 0 -0.1 L 0 0.1"
          fill="none"
          stroke={ink}
          strokeWidth={0.055}
          strokeLinecap="round"
        />
      );
    case 'dash':
      // Keep the persisted eye ID while replacing the old dashes with crosses.
      return (
        <path
          d="M -0.085 -0.085 L 0.085 0.085 M -0.085 0.085 L 0.085 -0.085"
          fill="none"
          stroke={ink}
          strokeWidth={0.055}
          strokeLinecap="round"
        />
      );
    case 'slash':
      return (
        <path
          d="M -0.07 0.11 L 0.07 -0.11"
          fill="none"
          stroke={ink}
          strokeWidth={0.05}
          strokeLinecap="round"
        />
      );
    case 'squint':
      return (
        <path
          d={`M ${-side * 0.07} -0.08 L ${side * 0.07} 0 L ${-side * 0.07} 0.08`}
          fill="none"
          stroke={ink}
          strokeWidth={0.05}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    default:
      return <ellipse cx={0} cy={0} rx={0.085} ry={0.09} fill={ink} />;
  }
}

function renderBrows(
  eyeType: ProjectAvatarEyeType,
  brows: ProjectAvatarBrowType,
  eyeGap: number,
  ink: string,
): React.ReactNode {
  if (brows === 'none') return null;

  const hh = getEyeHalfHeight(eyeType === 'wink' ? 'toon' : eyeType);
  const by = -hh - 0.075;
  const bw = 0.2;
  const bh = 0.055;

  return ([-1, 1] as const).map((side) => {
    let rotRad = 0;
    let dy = 0;
    if (brows === 'angry') {
      rotRad = -side * 0.32;
    } else if (brows === 'worried') {
      rotRad = side * 0.28;
    } else if (brows === 'sceptic') {
      if (side < 0) {
        rotRad = 0.3;
      } else {
        dy = -0.05;
        rotRad = 0.06;
      }
    }
    const rotDeg = (rotRad * 180) / PI;
    return (
      <g
        key={side}
        transform={`translate(${side * eyeGap}, ${by + dy}) rotate(${rotDeg.toFixed(2)})`}
      >
        <rect x={-bw / 2} y={-bh / 2} width={bw} height={bh} rx={bh / 2} fill={ink} />
      </g>
    );
  });
}

export const ProjectIcon: React.FC<ProjectIconProps> = ({
  icon,
  className = 'w-5 h-5 shrink-0',
  title,
  showFace = true,
  ...svgProps
}) => {
  const iconDef = getProjectIcon(icon);
  const faceScale = iconDef.fs * FACE_SCALE;

  return (
    <svg
      viewBox="-1.18 -1.18 2.36 2.36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title || iconDef.name}
      {...svgProps}
    >
      {title && <title>{title}</title>}
      {iconDef.handle && (
        <rect
          x={iconDef.handle.x}
          y={iconDef.handle.y}
          width={iconDef.handle.w}
          height={iconDef.handle.h}
          rx={iconDef.handle.r}
          fill="none"
          stroke={iconDef.color}
          strokeWidth={iconDef.handle.lw}
        />
      )}
      <path
        fill={iconDef.color}
        d={iconDef.shapePath}
        style={{
          d: `path("${iconDef.shapePath}")`,
          transition: 'd 280ms cubic-bezier(0.22, 1, 0.36, 1), fill 200ms ease',
        }}
      />
      {showFace && (
        <g
          transform={`translate(0, ${iconDef.fy}) scale(${faceScale}, ${faceScale})`}
          style={{
            transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {([-1, 1] as const).map((side) => (
            <g key={side} transform={`translate(${side * iconDef.eyeGap}, 0)`}>
              <g className={`project-icon-eye project-icon-eye--${iconDef.eyes}`}>
                {renderSingleEye(iconDef.eyes, side, iconDef.ink)}
              </g>
            </g>
          ))}
          {renderBrows(iconDef.eyes, iconDef.brows, iconDef.eyeGap, iconDef.ink)}
        </g>
      )}
    </svg>
  );
};
