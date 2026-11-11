import * as THREE from 'three';

const VIEW_H: number = 9;

export class Stage{
    readonly scene = new THREE.Scene();
    readonly camera: THREE.OrthographicCamera;
    readonly renderer: THREE.WebGLRenderer;

    private readonly container: HTMLElement;
    private readonly observer: ResizeObserver;

    constructor(container: HTMLElement) {
        this.container = container;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true, // 抗锯齿
            powerPreference: 'high-performance',
        });
        container.appendChild(this.renderer.domElement)
        
        this.scene.background = new THREE.Color(0x212425);
        
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
        this.camera.position.z = 10;
        
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(container)
        this.resize();
    }
    
    get width() { return this.container.clientWidth; }
    get height() { return this.container.clientHeight; }

    private resize(): void {
        const w = Math.max(1, this.container.clientWidth);
        const h = Math.max(1, this.container.clientHeight);
        const aspect = w / h;
        
        this.camera.left = (-VIEW_H * aspect) / 2;
        this.camera.right = (VIEW_H * aspect) / 2;
        this.camera.top = VIEW_H / 2;
        this.camera.bottom = -VIEW_H / 2;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(w, h);
    }
    
    render(): void {
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose(): void {
        this.observer.disconnect();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

}

