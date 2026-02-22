/**
 * Custom sigma.js v3 node program — soft radial glow.
 * Bottom layer of a compound program for a sci-fi halo effect.
 * The glow renders at 3x node size with exponential alpha falloff.
 */
import { NodeProgram, type ProgramInfo } from "sigma/rendering";
import { floatColor } from "sigma/utils";
import type { NodeDisplayData, RenderParams } from "sigma/types";

const { UNSIGNED_BYTE, FLOAT, POINTS } = WebGLRenderingContext;

type GlowUniform = "u_sizeRatio" | "u_pixelRatio" | "u_matrix";

// language=GLSL
const VERTEX = /*glsl*/ `
attribute vec4 a_id;
attribute vec4 a_color;
attribute vec2 a_position;
attribute float a_size;

uniform float u_sizeRatio;
uniform float u_pixelRatio;
uniform mat3 u_matrix;

varying vec4 v_color;

const float bias = 255.0 / 254.0;

void main() {
  gl_Position = vec4(
    (u_matrix * vec3(a_position, 1)).xy,
    0,
    1
  );

  // Render 3x larger than the solid node
  gl_PointSize = a_size * 3.0 / u_sizeRatio * u_pixelRatio * 2.0;

  #ifdef PICKING_MODE
  v_color = a_id;
  #else
  v_color = a_color;
  #endif

  v_color.a *= bias;
}
`;

// language=GLSL
const FRAGMENT = /*glsl*/ `
precision mediump float;

varying vec4 v_color;

void main(void) {
  vec2 coord = gl_PointCoord - vec2(0.5, 0.5);
  float dist = length(coord);

  #ifdef PICKING_MODE
  if (dist > 0.16) discard;
  gl_FragColor = v_color;
  #else
  // Exponential falloff for soft halo (premultiplied alpha for blendFunc(ONE, ONE_MINUS_SRC_ALPHA))
  float intensity = exp(-dist * dist * 18.0) * 0.4;
  float alpha = v_color.a * intensity;
  gl_FragColor = vec4(v_color.rgb * alpha, alpha);
  #endif
}
`;

export class NodeGlowProgram extends NodeProgram<GlowUniform> {
  getDefinition() {
    return {
      VERTICES: 1 as const,
      VERTEX_SHADER_SOURCE: VERTEX,
      FRAGMENT_SHADER_SOURCE: FRAGMENT,
      METHOD: POINTS,
      UNIFORMS: ["u_sizeRatio", "u_pixelRatio", "u_matrix"] as const,
      ATTRIBUTES: [
        { name: "a_position", size: 2, type: FLOAT },
        { name: "a_size", size: 1, type: FLOAT },
        { name: "a_color", size: 4, type: UNSIGNED_BYTE, normalized: true },
        { name: "a_id", size: 4, type: UNSIGNED_BYTE, normalized: true },
      ],
    };
  }

  processVisibleItem(nodeIndex: number, startIndex: number, data: NodeDisplayData) {
    const array = this.array;
    array[startIndex++] = data.x;
    array[startIndex++] = data.y;
    array[startIndex++] = data.size;
    array[startIndex++] = floatColor(data.color);
    array[startIndex++] = nodeIndex;
  }

  setUniforms(params: RenderParams, { gl, uniformLocations }: ProgramInfo<GlowUniform>) {
    gl.uniform1f(uniformLocations.u_sizeRatio, params.sizeRatio);
    gl.uniform1f(uniformLocations.u_pixelRatio, params.pixelRatio);
    gl.uniformMatrix3fv(uniformLocations.u_matrix, false, params.matrix);
  }
}
