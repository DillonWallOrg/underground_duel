import { AnimationModel } from "../../models/animation/animation_model.ts"
import { Entity } from "../ecs/entity.ts"

export class Animation extends Entity {
	public loop: boolean

	private _delays: number[]
	private _resetOnAwake: boolean
	private _frameImageIndecies: number[]
	// Calculated properties
	private _lengthFrames: number
	private _lengthTime: number
	private _elapsedTime: number
    private _currentFrame: number
	private _playing: boolean

	constructor(animationModel: AnimationModel, resetOnAwake: boolean = true) {
		super()

		this.loop = animationModel.loop

		this._delays = animationModel.delays
		this._frameImageIndecies = animationModel.frameImageIndecies
		this._resetOnAwake = resetOnAwake
		// Calculated properties
		this._lengthFrames = animationModel.delays.length
		this._lengthTime = this._delays.reduce((total, delay) => total + delay, 0)
		this._elapsedTime = 0
        this._currentFrame = 0
		this._playing = false
	}

	private findCurrentFrame(): number {
		let totalTime = 0
		for (let i = 0; i < this._delays.length; i++) {
			totalTime += this._delays[i]
			if (totalTime >= this._elapsedTime) {
				return i
			}
		}
		return this._lengthFrames - 1
	}

	public getFrameImageIdxFromFrame(frameIndex: number): number {
		return this._frameImageIndecies[frameIndex]
	}

	public getCurrentFrameImageIdx(): number {
		return this._frameImageIndecies[this._currentFrame]
	}

    public getElapsedTime(): number {
        return this._elapsedTime
    }

    public setElapsedTime(elapsedTime: number): void {
        console.log(this._lengthTime)
        if (elapsedTime < 0 || elapsedTime >= this._lengthTime) {
            throw new Error("Tried to set an invalid elapsed time.")
        }

        this._elapsedTime = elapsedTime
        this._currentFrame = this.findCurrentFrame()
    }

    public isPlaying(): boolean {
        return this._playing
    }

	public awake(): void {
		super.awake()

		if (this._resetOnAwake) {
			this._elapsedTime = 0
			this._currentFrame = 0
		}
		this._playing = true
	}

	public sleep(): void {
		super.sleep()

		this._playing = false
	}

	public update(deltaTime: number): void {
		super.update(deltaTime)

		if (!this._playing || this._lengthFrames === 0) {
			return
		}
		this._elapsedTime += deltaTime
		if (this._elapsedTime >= this._lengthTime) {
			if (this.loop) {
				this._elapsedTime = this._elapsedTime % this._lengthTime
			} else {
				this._elapsedTime = this._lengthTime
				this._playing = false
			}
		}
		this._currentFrame = this.findCurrentFrame()
	}
}
