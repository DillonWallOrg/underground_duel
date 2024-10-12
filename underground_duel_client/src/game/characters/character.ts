import { SpriteComponent } from "./sprite/sprite_component.ts"
import { AreaComponent } from "../../utils/shared_components/area_component.ts"
import { MovementComponent } from "../../utils/shared_components/movement_component.ts"
import { CharacterDrawComponent } from "./components/character_draw_component.ts"
import { Vector2D } from "../../utils/math/vector2d.ts"
import { SpriteSheet } from "./sprite/spritesheet.ts"
import { Entity } from "../../utils/ecs/entity.ts"

enum CharacterAnimationList {
	IdleDown = "Idle_Down",
	IdleRight = "Idle_Right",
	IdleUp = "Idle_Up",
	MoveDown = "Move_Down",
	MoveRight = "Move_Right",
	MoveUp = "Move_Up",
	AttackDown = "Attack_Down",
	AttackRight = "Attack_Right",
	AttackUp = "Attack_Up",
	Death = "Death",
}

export class Character extends Entity {
    public justAttacked: boolean = false
    public attackDir: Vector2D = Vector2D.zero()
	public movement_c: MovementComponent
	public pixelPerfectArea_c: AreaComponent
    public sprite_c: SpriteComponent
	public draw_c: CharacterDrawComponent
    // TODO: there should be some kind of state pattern here to track if we are
    // Idle, Moving, Attacking, etc.
    // In response to a change in state, we should change the animation accordingly

	constructor(
		spriteSheet: SpriteSheet,
		loc: Vector2D,
		moveSpeed: number,
		layer: number,
        shouldLerp: boolean = false,
		drawCenter: boolean = false,
	) {
		super()

        this.sprite_c = new SpriteComponent(spriteSheet)
        this.sprite_c.setAnimation(CharacterAnimationList.IdleDown)
		this.pixelPerfectArea_c = new AreaComponent(loc, spriteSheet.imageDivider.getSubVectorSize())
		this.movement_c = new MovementComponent(this, this.pixelPerfectArea_c, moveSpeed, shouldLerp, this.setAnimationBasedOnDirection)
		this.addUpdateComponent(this.pixelPerfectArea_c)
		this.addUpdateComponent(this.sprite_c)
		this.addUpdateComponent(this.movement_c)

		this.draw_c = new CharacterDrawComponent(this.sprite_c, this.pixelPerfectArea_c, layer, drawCenter)
		this.addDrawComponent(this.draw_c)
	}

	public setAnimationBasedOnDirection(prevDirection: Vector2D): void {
        if (this.isAttacking()) {
            return
        }

		let dir = this.movement_c.moveDirection
		if (Vector2D.isZero(dir)) {
            dir = prevDirection
		}
		if (this.movement_c.velocity > 0) {
			if (dir.Y == 1) {
				this.sprite_c.setAnimation(CharacterAnimationList.MoveDown, true)
				this.draw_c.flip = false
			} else if (dir.Y == -1) {
				this.sprite_c.setAnimation(CharacterAnimationList.MoveUp, true)
				this.draw_c.flip = false
			} else if (dir.X == 1) {
				this.sprite_c.setAnimation(CharacterAnimationList.MoveRight, true)
				this.draw_c.flip = false
			} else if (dir.X == -1) {
				this.sprite_c.setAnimation(CharacterAnimationList.MoveRight, true)
				this.draw_c.flip = true
			}
		} else {
			if (dir.Y == 1 || (dir.X == 0 && dir.Y == 0)) {
				this.sprite_c.setAnimation(CharacterAnimationList.IdleDown, true)
				this.draw_c.flip = false
			} else if (dir.Y == -1) {
				this.sprite_c.setAnimation(CharacterAnimationList.IdleUp, true)
				this.draw_c.flip = false
			} else if (dir.X == 1) {
				this.sprite_c.setAnimation(CharacterAnimationList.IdleRight, true)
				this.draw_c.flip = false
			} else if (dir.X == -1) {
				this.sprite_c.setAnimation(CharacterAnimationList.IdleRight, true)
				this.draw_c.flip = true
			}
		}
	}

    public startAttack(): void {
        if (this.isAttacking()) {
            return
        }

		let dir = this.movement_c.moveDirection
		if (Vector2D.isZero(dir)) {
            dir = this.movement_c.prevMoveDirection
		}
        if (dir.Y == 1 || (dir.X == 0 && dir.Y == 0)) {
            this.sprite_c.setAnimation(CharacterAnimationList.AttackDown)
            this.draw_c.flip = false
        } else if (dir.Y == -1) {
            this.sprite_c.setAnimation(CharacterAnimationList.AttackUp)
            this.draw_c.flip = false
        } else if (dir.X == 1) {
            this.sprite_c.setAnimation(CharacterAnimationList.AttackRight)
            this.draw_c.flip = false
        } else if (dir.X == -1) {
            this.sprite_c.setAnimation(CharacterAnimationList.AttackRight)
            this.draw_c.flip = true
        }

        this.justAttacked = true
        this.attackDir = { ...dir } // shallow copy so values dont change between now and websocket sending
    }

    public startAttackFromTime(time: number, dir: Vector2D) {
        if (dir.Y == 1 || (dir.X == 0 && dir.Y == 0)) {
            this.sprite_c.setAnimation(CharacterAnimationList.AttackDown)
            this.draw_c.flip = false
        } else if (dir.Y == -1) {
            this.sprite_c.setAnimation(CharacterAnimationList.AttackUp)
            this.draw_c.flip = false
        } else if (dir.X == 1) {
            this.sprite_c.setAnimation(CharacterAnimationList.AttackRight)
            this.draw_c.flip = false
        } else if (dir.X == -1) {
            this.sprite_c.setAnimation(CharacterAnimationList.AttackRight)
            this.draw_c.flip = true
        }

        const elapsedTimeSec = (Date.now() - time) / 1000
        console.log(elapsedTimeSec)
        this.sprite_c.currentAnimation!.setElapsedTime(elapsedTimeSec)
    }

    private isAttacking(): boolean {
        const key = this.sprite_c.currentAnimationKey
        const animationIsAttack = key === CharacterAnimationList.AttackUp
            || key === CharacterAnimationList.AttackDown
            || key === CharacterAnimationList.AttackRight
        const animationIsPlaying = this.sprite_c.currentAnimation!.isPlaying()
        return animationIsAttack && animationIsPlaying
    }

	public awake(): void {
		super.awake()
	}

    public update(deltaTime: number): void {
        super.update(deltaTime)

        // TODO: fix this with the state pattern
        const key = this.sprite_c.currentAnimationKey
        const animationIsAttack = key === CharacterAnimationList.AttackUp
            || key === CharacterAnimationList.AttackDown
            || key === CharacterAnimationList.AttackRight
        const animationIsPlaying = this.sprite_c.currentAnimation!.isPlaying()
        if (animationIsAttack && !animationIsPlaying) {
            this.setAnimationBasedOnDirection(this.movement_c.prevMoveDirection)
        }
    }
}
