"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatRate } from "@/lib/formatters";
import type { PipelineNode, PipelineEdge, StageStatus } from "@/types/pipeline";

// ---- Static pipeline topology ----
function buildTopology(nodeStatuses: Record<string, StageStatus>, throughputs: Record<string, number>) {
  const nodes: PipelineNode[] = [
    { id: "producer", label: "Producer", type: "producer", status: nodeStatuses.producer ?? "healthy", throughput: throughputs.producer ?? 4000, x: 60, y: 200 },
    { id: "kafka-raw", label: "raw-events", type: "kafka", status: nodeStatuses["kafka-raw"] ?? "healthy", throughput: throughputs["kafka-raw"] ?? 3980, x: 220, y: 200 },
    { id: "validator", label: "Validator", type: "processor", status: nodeStatuses.validator ?? "healthy", throughput: throughputs.validator ?? 3900, x: 380, y: 200 },
    { id: "kafka-validated", label: "validated-events", type: "kafka", status: nodeStatuses["kafka-validated"] ?? "healthy", throughput: throughputs["kafka-validated"] ?? 3850, x: 540, y: 200 },
    { id: "flink", label: "Flink", type: "processor", status: nodeStatuses.flink ?? "healthy", throughput: throughputs.flink ?? 3800, x: 700, y: 200 },
    { id: "kafka-features", label: "computed-features", type: "kafka", status: nodeStatuses["kafka-features"] ?? "healthy", throughput: throughputs["kafka-features"] ?? 3750, x: 860, y: 200 },
    { id: "feast", label: "Feast Writer", type: "feast", status: nodeStatuses.feast ?? "healthy", throughput: throughputs.feast ?? 3700, x: 1020, y: 200 },
    { id: "redis", label: "Redis", type: "store", status: nodeStatuses.redis ?? "healthy", throughput: throughputs.redis ?? 3700, x: 1180, y: 120 },
    { id: "postgres", label: "PostgreSQL", type: "store", status: nodeStatuses.postgres ?? "degraded", throughput: throughputs.postgres ?? 3700, x: 1180, y: 280 },
    { id: "dlq", label: "Dead Letter Queue", type: "dlq", status: nodeStatuses.dlq ?? "healthy", throughput: throughputs.dlq ?? 12, x: 380, y: 340 },
  ];

  const edges: PipelineEdge[] = [
    { id: "e1", source: "producer", target: "kafka-raw" },
    { id: "e2", source: "kafka-raw", target: "validator" },
    { id: "e3", source: "validator", target: "kafka-validated" },
    { id: "e4", source: "validator", target: "dlq", label: "invalid" },
    { id: "e5", source: "kafka-validated", target: "flink" },
    { id: "e6", source: "flink", target: "kafka-features" },
    { id: "e7", source: "kafka-features", target: "feast" },
    { id: "e8", source: "feast", target: "redis" },
    { id: "e9", source: "feast", target: "postgres" },
  ];

  return { nodes, edges };
}

const NODE_W = 120;
const NODE_H = 48;

const typeColors: Record<string, string> = {
  producer: "border-blue-500 bg-blue-950/60",
  kafka: "border-purple-500 bg-purple-950/60",
  processor: "border-amber-500 bg-amber-950/60",
  feast: "border-emerald-500 bg-emerald-950/60",
  store: "border-teal-500 bg-teal-950/60",
  dlq: "border-rose-500 bg-rose-950/60",
};

function getNodeCenter(node: PipelineNode) {
  return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 };
}

function buildPath(sourceNode: PipelineNode, targetNode: PipelineNode) {
  const s = getNodeCenter(sourceNode);
  const t = getNodeCenter(targetNode);
  const dx = (t.x - s.x) / 2;
  return `M ${s.x + NODE_W / 2} ${s.y} C ${s.x + NODE_W / 2 + dx} ${s.y}, ${t.x - NODE_W / 2 - dx} ${t.y}, ${t.x - NODE_W / 2} ${t.y}`;
}

interface Particle {
  id: number;
  edgeId: string;
  progress: number;
}

interface PipelineFlowDiagramProps {
  nodeStatuses?: Record<string, StageStatus>;
  throughputs?: Record<string, number>;
  selectedNodeId?: string | null;
  onNodeSelect?: (id: string | null) => void;
}

export function PipelineFlowDiagram({
  nodeStatuses = {},
  throughputs = {},
  selectedNodeId,
  onNodeSelect,
}: PipelineFlowDiagramProps) {
  const { nodes, edges } = buildTopology(nodeStatuses, throughputs);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Animate particles along edges
  useEffect(() => {
    let active = true;

    function animate(ts: number) {
      if (!active) return;
      const dt = Math.min(ts - lastTimeRef.current, 50);
      lastTimeRef.current = ts;

      setParticles((prev) => {
        const updated = prev
          .map((p) => ({ ...p, progress: p.progress + dt * 0.0004 }))
          .filter((p) => p.progress < 1);

        // Spawn new particles periodically
        if (Math.random() < 0.08) {
          const edge = edges[Math.floor(Math.random() * edges.length)];
          updated.push({
            id: particleIdRef.current++,
            edgeId: edge.id,
            progress: 0,
          });
        }

        return updated.slice(-60); // cap at 60 particles
      });

      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [edges.length]);

  const svgWidth = 1340;
  const svgHeight = 420;

  function getParticlePos(particle: Particle) {
    const edge = edges.find((e) => e.id === particle.edgeId);
    if (!edge) return null;
    const src = nodes.find((n) => n.id === edge.source);
    const tgt = nodes.find((n) => n.id === edge.target);
    if (!src || !tgt) return null;

    // Cubic bezier interpolation
    const s = getNodeCenter(src);
    const t = getNodeCenter(tgt);
    const sx = s.x + NODE_W / 2;
    const sy = s.y;
    const tx = t.x - NODE_W / 2;
    const ty = t.y;
    const dx = (tx - sx) / 2;
    const c1x = sx + dx;
    const c1y = sy;
    const c2x = tx - dx;
    const c2y = ty;
    const u = particle.progress;
    const iu = 1 - u;
    const x = iu ** 3 * sx + 3 * iu ** 2 * u * c1x + 3 * iu * u ** 2 * c2x + u ** 3 * tx;
    const y = iu ** 3 * sy + 3 * iu ** 2 * u * c1y + 3 * iu * u ** 2 * c2y + u ** 3 * ty;
    return { x, y };
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-zinc-950 p-4 dark:border-zinc-800">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        aria-label="Pipeline flow diagram"
      >
        {/* Edges */}
        {edges.map((edge) => {
          const src = nodes.find((n) => n.id === edge.source)!;
          const tgt = nodes.find((n) => n.id === edge.target)!;
          return (
            <path
              key={edge.id}
              d={buildPath(src, tgt)}
              fill="none"
              stroke="#3f3f46"
              strokeWidth={2}
              strokeDasharray={edge.id === "e4" ? "6 3" : undefined}
            />
          );
        })}

        {/* Particles */}
        {particles.map((p) => {
          const pos = getParticlePos(p);
          if (!pos) return null;
          return (
            <circle
              key={p.id}
              cx={pos.x}
              cy={pos.y}
              r={3}
              fill="#3b82f6"
              opacity={0.85}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const colorClass = typeColors[node.type] ?? typeColors.processor;

          return (
            <g key={node.id}>
              <foreignObject
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
              >
                <button
                  onClick={() =>
                    onNodeSelect?.(isSelected ? null : node.id)
                  }
                  className={cn(
                    "h-full w-full rounded-lg border-2 px-2 py-1 text-left transition-all cursor-pointer",
                    colorClass,
                    isSelected
                      ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-zinc-950"
                      : "hover:brightness-110"
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-white truncate leading-tight">
                      {node.label}
                    </span>
                    <span className="text-[9px] text-zinc-400 tabular-nums">
                      {formatRate(node.throughput)}
                    </span>
                  </div>
                </button>
              </foreignObject>

              {/* Status dot */}
              <circle
                cx={node.x + NODE_W - 6}
                cy={node.y + 6}
                r={4}
                fill={
                  node.status === "healthy"
                    ? "#10b981"
                    : node.status === "degraded"
                    ? "#f59e0b"
                    : node.status === "error"
                    ? "#f43f5e"
                    : "#71717a"
                }
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
