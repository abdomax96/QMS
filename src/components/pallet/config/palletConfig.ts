export interface LayerPattern {
  rows: number;
  columns: number;
  rotation: 0 | 90;
  offsetX: number;
  offsetY: number;
  cartonWidth: number;
  cartonDepth: number;
}
export interface PalletDimensions {
  width: number;
  depth: number;
  height: number;
}
export interface CartonDimensions {
  width: number;
  depth: number;
  height: number;
}
export interface StackingConfiguration {
  pallet: PalletDimensions;
  carton: CartonDimensions;
  cartonsPerLayer: number;
  numberOfLayers: number;
  alternateLayers: boolean;
  layerPatterns?: LayerPattern[];
}