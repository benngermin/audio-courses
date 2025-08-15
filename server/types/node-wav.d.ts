declare module 'node-wav' {
  export interface EncodeOptions {
    sampleRate: number;
    float: boolean;
    bitDepth: number;
  }

  export function encode(
    channelData: Float32Array[],
    options: EncodeOptions
  ): Buffer;

  export function decode(buffer: Buffer): {
    sampleRate: number;
    channelData: Float32Array[];
  };
}