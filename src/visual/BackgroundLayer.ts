import * as THREE from "three";

const DEFAULT_DIM = 0.35;

// 全屏图片背景层
//
// 位于视觉对象之后（z = -5），cover 适配，默认暗化 35%。
export class BackgroundLayer {
  readonly object: THREE.Mesh;

  private readonly geometry = new THREE.PlaneGeometry(1, 1);
  private readonly material: THREE.MeshBasicMaterial;

  private texture: THREE.Texture | null = null;
  private imageAspect = 1;
  private dim = DEFAULT_DIM;

  private viewWidth = 16;
  private viewHeight = 9;

  // 丢弃过期的异步加载
  private loadToken = 0;

  constructor() {
    this.material = new THREE.MeshBasicMaterial({
      depthWrite: false,
      toneMapped: false,
    });

    this.object = new THREE.Mesh(this.geometry, this.material);
    this.object.position.z = -5;
    this.object.visible = false;

    this.applyColor();
  }

  setViewport(viewWidth: number, viewHeight: number): void {
    this.viewWidth = Math.max(1, viewWidth);
    this.viewHeight = Math.max(1, viewHeight);
    this.applyScale();
  }

  async setImage(file: File): Promise<void> {
    const token = ++this.loadToken;
    const url = URL.createObjectURL(file);

    try {
      const texture = await new THREE.TextureLoader().loadAsync(url);

      // 被更晚的加载或 clear() 取代
      if (token !== this.loadToken) {
        texture.dispose();
        return;
      }

      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      this.texture?.dispose();

      this.texture = texture;
      this.imageAspect = texture.image.width / texture.image.height;
      this.material.map = texture;
      this.material.needsUpdate = true;
      this.object.visible = true;
      this.applyScale();
    } finally {
      // 纹理已经持有解码后的图像，URL 可以立即释放
      URL.revokeObjectURL(url);
    }
  }

  setDim(value: number): void {
    this.dim = Math.min(1, Math.max(0, value));
    this.applyColor();
  }

  clear(): void {
    this.loadToken++;
    this.texture?.dispose();
    this.texture = null;
    this.material.map = null;
    this.material.needsUpdate = true;
    this.object.visible = false;
  }

  dispose(): void {
    this.clear();
    this.geometry.dispose();
    this.material.dispose();
    this.object.removeFromParent();
  }

  private applyColor(): void {
    this.material.color.setScalar(1 - this.dim);
  }

  private applyScale(): void {
    if (!this.texture) return;

    const viewAspect = this.viewWidth / this.viewHeight;

    if (viewAspect >= this.imageAspect) {
      // 视口更宽：按宽度铺满
      this.object.scale.set(
        this.viewWidth,
        this.viewWidth / this.imageAspect,
        1,
      );
    } else {
      // 视口更高：按高度铺满
      this.object.scale.set(
        this.viewHeight * this.imageAspect,
        this.viewHeight,
        1,
      );
    }
  }
}
