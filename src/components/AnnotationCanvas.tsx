
import {
  forwardRef,
  type MouseEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import { getButtonStyle, inlineStyles } from "../styles/inline";

type Tool = "rectangle" | "arrow";

type Point = { x: number; y: number };

type Shape =
  | { kind: "rectangle"; start: Point; end: Point }
  | { kind: "arrow"; start: Point; end: Point };

export type AnnotationCanvasHandle = {
  exportBlob: () => Promise<Blob>;
  clear: () => void;
  hasAnnotations: () => boolean;
};

type AnnotationCanvasProps = {
  imageUrl: string;
};

function drawArrow(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
  const headLength = 14;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(function AnnotationCanvas(
  { imageUrl },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>("rectangle");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draftShape, setDraftShape] = useState<Shape | null>(null);
  const dragStartRef = useRef<Point | null>(null);

  const redraw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (!canvas || !image) {
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const toDraw = draftShape ? [...shapes, draftShape] : shapes;
      ctx.strokeStyle = "#ff3b30";
      ctx.fillStyle = "#ff3b30";
      ctx.lineWidth = 3;
      ctx.font = "16px sans-serif";

      toDraw.forEach((shape) => {
        if (shape.kind === "rectangle") {
          const x = Math.min(shape.start.x, shape.end.x);
          const y = Math.min(shape.start.y, shape.end.y);
          const width = Math.abs(shape.end.x - shape.start.x);
          const height = Math.abs(shape.end.y - shape.start.y);
          ctx.strokeRect(x, y, width, height);
        }

        if (shape.kind === "arrow") {
          drawArrow(ctx, shape.start, shape.end);
        }
      });
    },
    [draftShape, shapes]
  );

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      imageRef.current = image;
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      redraw(ctx);
    };
    image.src = imageUrl;
  }, [imageUrl, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    redraw(ctx);
  }, [redraw]);

  const getCoords = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }, []);

  const onMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
    const point = getCoords(event);
    dragStartRef.current = point;
  };

  const onMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    const start = dragStartRef.current;
    if (!start) {
      return;
    }

    const end = getCoords(event);
    if (tool === "rectangle") {
      setDraftShape({ kind: "rectangle", start, end });
    } else if (tool === "arrow") {
      setDraftShape({ kind: "arrow", start, end });
    }
  };

  const onMouseUp = (event: MouseEvent<HTMLCanvasElement>) => {
    const start = dragStartRef.current;
    if (!start) {
      return;
    }
    dragStartRef.current = null;
    const end = getCoords(event);

    if (tool === "rectangle") {
      setShapes((prev) => [...prev, { kind: "rectangle", start, end }]);
    } else if (tool === "arrow") {
      setShapes((prev) => [...prev, { kind: "arrow", start, end }]);
    }

    setDraftShape(null);
  };

  const canvasToBlob = useCallback(async (): Promise<Blob> => {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error("Annotation canvas unavailable.");
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    if (!blob) {
      throw new Error("Failed to create annotated screenshot.");
    }

    return blob;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      exportBlob: canvasToBlob,
      clear: () => setShapes([]),
      hasAnnotations: () => shapes.length > 0
    }),
    [canvasToBlob, shapes.length]
  );

  const toolButtons = useMemo(
    () => [
      { value: "rectangle", label: "Rectangle" },
      { value: "arrow", label: "Arrow" }
    ] as const,
    []
  );

  return (
    <div style={inlineStyles.annotation}>
      <div style={inlineStyles.annotationTools} role="toolbar" aria-label="Annotation tools">
        {toolButtons.map((option) => (
          <button
            key={option.value}
            type="button"
            style={getButtonStyle("secondary", { active: tool === option.value })}
            onClick={() => setTool(option.value)}
          >
            {option.label}
          </button>
        ))}
        <button type="button" style={getButtonStyle("secondary")} onClick={() => setShapes([])}>
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={inlineStyles.annotationCanvas}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        aria-label="Screenshot annotation canvas"
      />
    </div>
  );
});
