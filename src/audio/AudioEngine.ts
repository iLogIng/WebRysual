export type EngineSnapshot = {
    playing: boolean;
    currentTime: number;
    duration: number;
    gain: number;
    trackName: string | null;
    ctxState: AudioContextState;
};

// 钳制 min <= v <= max
function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(v, max));
}

export class AudioEngine {
    // 解析器节点
    readonly analyser: AnalyserNode;
    // 音频上下文
    private ctx: AudioContext;
    // 音量节点
    private gainNode: GainNode;
    
    // 解码后的音频数据，表示尚未加载
    private buffer: AudioBuffer | null = null;
    // 当前正在播放的源节点，null表示没有活动的播放
    private source: AudioBufferSourceNode | null = null;
    
    // 当前曲目名称，null表示未加载
    private _trackName: string | null = null;
    
    // 播放起始的 AudioContext 时间锚点
    private startCtxTime = 0;
    // 上一次 start/seek 时指定的buffer内偏移
    private startOffset = 0;
    // 停止标记
    private paused = false;
    
    constructor() {
        this.ctx = new AudioContext();
        
        this.gainNode = this.ctx.createGain();
        this.analyser = this.ctx.createAnalyser();
        
        // gainNode -> analyser -> ctx.dest
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
    }
    
    // 创建并打开音频源文件
    private createAndStartSource(offset: number): void {
        if (!this.buffer)
            return;
        
        // src -> gainNode -> ...
        const src = this.ctx.createBufferSource();
        src.buffer = this.buffer;
        src.connect(this.gainNode);

        this.startCtxTime = this.ctx.currentTime;
        this.startOffset = offset;
        
        src.start(0, offset);
        
        src.onended = () => {
            if (this.source === src) {
                this.source == null;
                this.startOffset = 0;
                this.paused = false;
            }
        };

        this.source = src;
    }
    
    private stopSource(): void {
        if (this.source) {
            const s = this.source;
            this.source = null;
            s.onended = null;
            try {
                s.stop();
            } catch {

            }
            s.disconnect();
        }
    }
    
    private isPlaying(): boolean {
        return this.source !== null
            && this.ctx.state === 'running'
            && !this.paused;
    }
    
    // 当前的时间进度
    private currentTime(): number {
        if (!this.source || !this.buffer) {
            return this.startOffset;
        }
        // 已经经过的时间
        const elapsed = this.ctx.currentTime - this.startCtxTime;
        const current = Math.min(this.startOffset + elapsed, this.buffer.duration);
        return current;
    }

    async unlock(): Promise<void> {
        if (this.ctx.state == 'suspended') {
            await this.ctx.resume();
        }
    }

    async load(file: File): Promise<void> {
        if (!this.paused)
            this.pause();
        
        const arrayBuffer = await file.arrayBuffer();
        this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
        
        this._trackName = file.name;
        this.paused = false;
        this.startOffset = 0;
        this.startCtxTime = 0;
    }

    async play(): Promise<void> {
        if (!this.buffer)
            return;

        await this.unlock();
        
        if (this.source)
            return;
        this.createAndStartSource(this.startOffset);
        this.paused = false;
    }

    async toggle(): Promise<void> {
        if (!this.buffer)
            return;
        if (this.isPlaying()) {
            this.pause();
        } else {
            await this.play();
        }
    }

    pause(): void {
        if (!this.source || !this.buffer)
            return;
        this.startOffset = this.currentTime();
        this.stopSource();
        this.paused = true;
    }

    seekBy(seconds: number): void {
        if (!this.buffer)
            return;
        
        const wasPlaying = this.isPlaying();
        const target = clamp(
            this.currentTime() + seconds,
            0, this.buffer.duration,
        );
        
        this.stopSource();
        this.startOffset = target;
        
        if (wasPlaying) {
            this.createAndStartSource(target);
        } else {
            this.paused = true;
        }
    }

    changeGain(delta: number): void {
        this.gainNode.gain.value = clamp(
            this.gainNode.gain.value + delta,
            0, 1
        );
    }

    snapshot(): EngineSnapshot {
        return {
            playing: this.isPlaying(),
            currentTime: this.currentTime(),
            duration: this.buffer?.duration ?? 0,
            gain: this.gainNode.gain.value,
            trackName: this._trackName,
            ctxState: this.ctx.state,
        };
    }

    despose(): void {
        this.stopSource();
        void this.ctx.close();
        this.buffer = null;
        this._trackName = null;
    }

};


