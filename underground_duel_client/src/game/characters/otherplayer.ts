import { Vector2D } from "../../utils/math/vector2d.ts"
import { Settings } from "../../settings/settings.ts"
import { Character } from "./character.ts"
import { SpriteSheet } from "./sprite/spritesheet.ts"
import { TickTimingHistory } from "../tick_timing_history.ts"

export class OtherPlayer extends Character {
    private _lastAttackTickId: number = -1
    private _tickTimingHistory: TickTimingHistory

    constructor(playerSpriteSheet: SpriteSheet, playerData: any, tickTimingHistory: TickTimingHistory) {
		super(playerSpriteSheet, new Vector2D(0,0), Settings.player.moveSpeed, Settings.canvas.playerLayer, true, false)
        this._tickTimingHistory = tickTimingHistory
        this.updateData(playerData)
	}

    public updateData(playerData: any) {
        this.movement_c.actualArea_c.loc.X = playerData.MoveData.Loc.X
        this.movement_c.actualArea_c.loc.Y = playerData.MoveData.Loc.Y
        this.movement_c.setDirection(new Vector2D(playerData.MoveData.Dir.X, playerData.MoveData.Dir.Y))
        this.movement_c.prevMoveDirection.X = playerData.MoveData.PrevDir.X
        this.movement_c.prevMoveDirection.Y = playerData.MoveData.PrevDir.Y
        if (playerData.AttackData.Initialized && playerData.AttackData.TickId != this._lastAttackTickId) {
            this._lastAttackTickId = playerData.AttackData.TickId
            const attackDir = new Vector2D(playerData.AttackData.Dir.X, playerData.AttackData.Dir.Y)
            this.startAttackFromTime(this._tickTimingHistory.getTickTime(playerData.AttackData.TickId), attackDir)
        }
    }

	public update(deltaTime: number): void {
		super.update(deltaTime)
	}
}
