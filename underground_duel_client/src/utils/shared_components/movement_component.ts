import { IComponent } from "../ecs/component.ts"
import { Entity } from "../ecs/entity.ts"
import { Vector2D } from "../math/vector2d.ts"
import { AreaComponent } from "./area_component.ts"

export class MovementComponent implements IComponent {
	public entity: Entity
	public pixelPerfectArea_c: AreaComponent
	public actualArea_c: AreaComponent
	public prevMoveDirection: Vector2D = Vector2D.zero()
	public moveDirection: Vector2D = Vector2D.zero()
	public velocity: number = 0
	public moveSpeed: number
    public shouldLerp: boolean
	private setAnimationBasedOnDirection: (prevDirection: Vector2D) => void

	constructor(
		entity: Entity,
		area_c: AreaComponent,
		moveSpeed: number,
        shouldLerp: boolean,
		setAnimationBasedOnDirection: (prevDirection: Vector2D) => void
	) {
		this.entity = entity
		this.pixelPerfectArea_c = area_c
		this.actualArea_c = structuredClone(area_c)
		this.moveSpeed = moveSpeed
        this.shouldLerp = shouldLerp
		this.setAnimationBasedOnDirection = setAnimationBasedOnDirection
	}

    public getFacing(): Vector2D {
        if (Vector2D.isZero(this.moveDirection)) {
            return this.prevMoveDirection
        }
        return this.moveDirection
    }

	public addDirection(direction: Vector2D): void {
		this.prevMoveDirection = this.moveDirection
		this.moveDirection = Vector2D.add(this.moveDirection, direction)
        this.updateMovement()
	}

	public removeDirection(direction: Vector2D): void {
		this.prevMoveDirection = this.moveDirection
		this.moveDirection = Vector2D.subtract(this.moveDirection, direction)
        this.updateMovement()
	}

    public setDirection(direction: Vector2D): void {
		this.prevMoveDirection = this.moveDirection
        this.moveDirection = direction
        this.updateMovement()
    }

    private updateMovement(): void {
        this.clipDirection()
        if (Vector2D.areEqual(this.moveDirection, this.prevMoveDirection)) {
            return
        }
        this.roundWhenEnteringDiagonal()
        this.setVelocityBasedOnDirection()
        this.setAnimationBasedOnDirection.call(this.entity, this.prevMoveDirection)
    }

    private roundWhenEnteringDiagonal(): void {
        if (!this.isDiagonal(this.prevMoveDirection) && this.isDiagonal(this.moveDirection)) {
            this.actualArea_c.loc = Vector2D.round(this.actualArea_c.loc)
        }
    }

    private isDiagonal(direction: Vector2D) {
        return direction.X != 0 && direction.Y != 0
    }

	private setVelocityBasedOnDirection(): void {
		if (Vector2D.isZero(this.moveDirection)) {
			this.velocity = 0
		} else {
			this.velocity = this.moveSpeed
		}
	}

	private clipDirection(): void {
		if (this.moveDirection.X > 1) {
			this.moveDirection.X = 1
		}
		if (this.moveDirection.X < -1) {
			this.moveDirection.X = -1
		}
		if (this.moveDirection.Y > 1) {
			this.moveDirection.Y = 1
		}
		if (this.moveDirection.Y < -1) {
			this.moveDirection.Y = -1
		}
	}

	awake(): void {}
	sleep(): void {}
	update(deltaTime: number): void {
        const normDirection = Vector2D.normalize(this.moveDirection)
		this.actualArea_c.loc = Vector2D.add(
            this.actualArea_c.loc,
            Vector2D.multiply(normDirection, this.velocity * deltaTime)
        )
        if (this.shouldLerp) {
            const lerpAmt = (this.velocity == 0) ? 0.8 : 0.4
            this.pixelPerfectArea_c.loc = Vector2D.round(Vector2D.lerp(this.pixelPerfectArea_c.loc, this.actualArea_c.loc, lerpAmt))
        } else {
            this.pixelPerfectArea_c.loc = Vector2D.round(this.actualArea_c.loc)
        }
	}
}
