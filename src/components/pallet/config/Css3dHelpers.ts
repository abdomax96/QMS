export interface Dimensions {
    width: number;
    height: number;
    depth: number;
}

export interface Position3D {
    x: number;
    y: number;
    z: number;
}

/**
 * Generates the CSS transform string to position a cuboid in 3D space
 */
export const getCuboidTransform = (x: number, y: number, z: number) => {
    return `translate3d(${x}px, ${y}px, ${z}px)`;
};
